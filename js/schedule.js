// ─────────────────────────────────────────
//  SCHEDULE
// ─────────────────────────────────────────
const HOLIDAYS = {
  '2026-04-29': '昭和の日',
  '2026-05-06': '振替休日',
  '2026-09-22': '秋分の日',
};

function renderSchedule(){
  const season = document.getElementById('schedule-season-sel')?.value || '2025';
  const c = document.getElementById('schedule-content');
  if(!c) return;

  const adminPanel = document.getElementById('schedule-admin-panel');
  if(adminPanel) adminPanel.style.display = (currentUser && currentUser.isAdmin) ? 'block' : 'none';

  ['sch-team-a','sch-team-b'].forEach(id=>{
    const sel = document.getElementById(id);
    if(!sel) return;
    const cur = sel.value;
    sel.innerHTML = '<option value="">選択</option>';
    D.teams.forEach(t=>{ const o=document.createElement('option');o.value=t.name;o.textContent=t.name;sel.appendChild(o); });
    if(cur) sel.value = cur;
  });

  const items = (D.schedule||[]).filter(s=>s.season===season)
    .sort((a,b)=>a.date.localeCompare(b.date));

  if(!items.length){
    c.innerHTML='<div class="empty-state"><div class="ico">📆</div><p>日程がまだ登録されていません</p></div>';
    return;
  }

  const today = todayStr();
  c.innerHTML = items.map(s=>{
    const isPast  = s.date < today;
    const isToday = s.date === today;
    const result = D.matches.find(m=>
      m.date===s.date && m.season===s.season &&
      ((m.teamA===s.teamA&&m.teamB===s.teamB)||(m.teamA===s.teamB&&m.teamB===s.teamA))
    );
    const cls = isToday ? 'sch-item today' : isPast ? 'sch-item past' + (result?' done':'') : 'sch-item';
    const dateDisp = s.date.replace(/(\d{4})-(\d{2})-(\d{2})/,'$1.$2.$3');
    const dayNames = ['日','月','火','水','木','金','土'];
    const dayOfWeek = dayNames[new Date(s.date).getDay()];
    const holiday = HOLIDAYS[s.date] ? ` ${HOLIDAYS[s.date]}🎌` : '';
    const delBtn = (currentUser && currentUser.isAdmin)
      ? `<button class="sch-del-btn" onclick="deleteScheduleItem('${s.id}')">🗑</button>` : '';
    const resultBadge = result
      ? `<span class="sch-result">${result.scoreA}-${result.scoreB} 済</span>` : '';
    const todayBadge = isToday
      ? `<span style="font-size:10px;font-weight:700;color:var(--accent);margin-left:6px;">TODAY</span>` : '';

    if(!s.teamA && !s.teamB && s.note && s.note.includes('決勝')){
      return `<div class="sch-item" style="border:2px solid var(--gold);background:rgba(170,136,0,0.07);">
        <div class="sch-date" style="font-weight:700;">${dateDisp}（${dayOfWeek}）${holiday}</div>
        <div style="font-size:18px;font-weight:700;color:var(--gold);padding:4px 0;letter-spacing:2px;">${s.note}</div>
        <div style="font-size:11px;color:var(--text2);margin-top:2px;">📍 ${s.venue||'GCP'}</div>
      </div>`;
    }
    if(!s.teamA && !s.teamB){
      return `<div class="sch-item" style="opacity:0.5;background:var(--bg2);">
        <div class="sch-date">${dateDisp}（${dayOfWeek}）${holiday}</div>
        <div style="font-size:14px;color:var(--text2);padding:4px 0;">${s.note||'😴 全チームお休み'}</div>
      </div>`;
    }
    const venueHtml = s.venue ? `<div style="font-size:11px;color:var(--text2);margin-top:2px;">🏠 ${s.home}　📍 ${s.venue}</div>` : '';
    return `<div class="${cls}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <div class="sch-date ${isPast?'past':''}">${dateDisp}（${dayOfWeek}）${holiday}${todayBadge}</div>
          <div class="sch-note" style="font-size:11px;color:var(--accent);margin-bottom:2px;">${s.note||''}</div>
          <div class="sch-teams">
            ${s.teamA} <span class="sch-vs">VS</span> ${s.teamB}
          </div>
          ${venueHtml}
          ${resultBadge}
        </div>
        ${delBtn}
      </div>
    </div>`;
  }).join('');
}

function updateSchPreview(){
  const teamA = document.getElementById('sch-team-a').value;
  const teamB = document.getElementById('sch-team-b').value;
  const preview = document.getElementById('sch-preview');
  if(!teamA && !teamB){ preview.style.display='none'; return; }
  const {home, venue} = calcHomeVenue(teamA, teamB);
  document.getElementById('sch-preview-home').textContent = home || '—';
  document.getElementById('sch-preview-venue').textContent = venue || '—';
  preview.style.display = 'block';
}

function calcHomeVenue(teamA, teamB){
  const BURGER = '¥500バーグ食堂';
  if(teamA === BURGER){
    return { home: BURGER, venue: BURGER };
  }
  return { home: teamA, venue: 'GCP' };
}

function addScheduleItem(){
  if(!currentUser || !currentUser.isAdmin){ toast('⚠️ 管理者のみ操作できます'); return; }
  const date   = document.getElementById('sch-date').value;
  const season = document.getElementById('sch-season').value;
  const teamA  = document.getElementById('sch-team-a').value;
  const teamB  = document.getElementById('sch-team-b').value;
  const note   = document.getElementById('sch-note').value.trim();
  if(!date)          { toast('日付を入力してください'); return; }
  if(!teamA||!teamB) { toast('チームを選択してください'); return; }
  if(teamA===teamB)  { toast('異なるチームを選択してください'); return; }

  if(!D.schedule) D.schedule = [];
  const {home, venue} = calcHomeVenue(teamA, teamB);
  D.schedule.push({ id: Date.now(), date, season, teamA, teamB, home, venue, note });
  save();
  renderSchedule();
  document.getElementById('sch-date').value = '';
  document.getElementById('sch-note').value = '';
  toast('日程を追加しました');
}

function deleteScheduleItem(id){
  if(!currentUser || !currentUser.isAdmin){ toast('⚠️ 管理者のみ操作できます'); return; }
  showConfirm('🗑️ 日程を削除', 'この日程を削除しますか？', ()=>{
    D.schedule = (D.schedule||[]).filter(s=>String(s.id)!==String(id));
    save(); renderSchedule();
    toast('日程を削除しました');
  }, '削除する');
}
