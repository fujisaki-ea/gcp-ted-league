// ─────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────
const GAMES = [
  {g:1,  label:'ゼロワン(501)・ダブルス',  n:2},
  {g:2,  label:'クリケット・ダブルス',      n:2},
  {g:3,  label:'ゼロワン(701)・トリオス',   n:3},
  {g:4,  label:'ゼロワン(501)・ダブルス',  n:2},
  {g:5,  label:'ゼロワン(501)・シングルス', n:1},
  {g:6,  label:'クリケット・ダブルス',      n:2},
  {g:7,  label:'ゼロワン(501)・ダブルス',  n:2},
  {g:8,  label:'クリケット・ダブルス',      n:2},
  {g:9,  label:'クリケット・シングルス',    n:1},
  {g:10, label:'ゼロワン(901)・ガロン',    n:4},
  {g:11, label:'ゼロワン(501)・シングルス', n:1},
  {g:12, label:'ゼロワン(501)・ダブルス',  n:2},
  {g:13, label:'クリケット・ダブルス',      n:2},
  {g:14, label:'クリケット・シングルス',    n:1},
  {g:15, label:'クリケット・ガロン',        n:4},
];

// レーティング 1〜25 のオプション HTML（チーム管理用）
function ratingOptions(selected='') {
  let h = '<option value="">R</option>';
  for(let i=1;i<=25;i++){
    h += `<option value="${i}"${selected==i?' selected':''}>${i}</option>`;
  }
  return h;
}

// ─── フライト判定（スタッツ数値ベース）────────────────
const FLIGHT_COLORS = {
  C:  {bg:'#cceeff', color:'#005580'},
  CC: {bg:'#cceeff', color:'#005580'},
  B:  {bg:'#e8d5f5', color:'#6a0dad'},
  BB: {bg:'#e8d5f5', color:'#6a0dad'},
  A:  {bg:'#ffd9b3', color:'#b05000'},
  AA: {bg:'#ffd9b3', color:'#b05000'},
  SA: {bg:'#fffacd', color:'#a07800'},
};
const ZERO_FLIGHT = [
  {min:123.0, label:'SA'},
  {min:95.0,  label:'AA'},
  {min:80.0,  label:'A'},
  {min:70.0,  label:'BB'},
  {min:60.0,  label:'B'},
  {min:50.0,  label:'CC'},
  {min:40.0,  label:'C'},
];
const CRICKET_FLIGHT = [
  {min:4.50, label:'SA'},
  {min:3.50, label:'AA'},
  {min:2.90, label:'A'},
  {min:2.50, label:'BB'},
  {min:2.10, label:'B'},
  {min:1.70, label:'CC'},
  {min:1.30, label:'C'},
];
function getFlight(statsVal, isCricket) {
  const v = parseFloat(statsVal);
  if(isNaN(v) || v <= 0) return null;
  const table = isCricket ? CRICKET_FLIGHT : ZERO_FLIGHT;
  for(const f of table){
    if(v >= f.min) return {...FLIGHT_COLORS[f.label], label:f.label};
  }
  return null;
}
function flightBadge(statsVal, isCricket) {
  const f = getFlight(statsVal, isCricket);
  if(!f) return '';
  return `<span class="flight-badge" style="background:${f.bg};color:${f.color};">${f.label}</span>`;
}

// スタッツ入力欄HTML（ゼロワン/クリケット対応）
function statsInput(isCricket, savedVal='') {
  const ph = isCricket ? '0.00' : '0.0';
  const step = isCricket ? '0.01' : '0.1';
  return `<input type="number" inputmode="decimal" pattern="[0-9.]*" class="no-mb pe-rating pe-stats" data-cricket="${isCricket}" min="0" step="${step}" placeholder="${ph}" value="${savedVal}" style="width:70px;padding:8px 6px;text-align:center;font-size:12px;border:1px solid var(--border);border-radius:8px;background:var(--surface);">`;
}

// ─────────────────────────────────────────
//  DATA
// ─────────────────────────────────────────
let D = {teams:[], matches:[], pendingMatches:[], rejectedNotifs:[]};
let currentUser = null;  // {team, isAdmin, isGuest}

// パスワードはFirebaseにSHA-256ハッシュで保存・照合
const PASSWORDS = {}; // 平文パスワードは保持しない

// ── データ保存 ──
function updateSyncBadge(state){
  const badge = document.getElementById('sync-badge');
  if(!badge) return;
  if(state==='ok'){
    badge.textContent='✅ 保存済み'; badge.className='sync-badge ok';
    badge.style.opacity='1';
    setTimeout(()=>{ badge.style.opacity='0'; }, 2000);
  }
}
function save(){
  try{ sessionStorage.setItem('gcpLeague', JSON.stringify(D)); }catch(e){}
  if(window.fbSave) {
    // pendingMatches/matches/rejectedNotifs は個別操作で管理するため teams のみ送信
    window.fbSave({ teams: D.teams });
  } else {
    updateSyncBadge('ok');
  }
}

const DEFAULT_SCHEDULE_2026 = [
  {id:20260001, season:'2026', date:'2026-04-08', teamA:'ふじさき',    teamB:'デイリー',      home:'ふじさき',    venue:'GCP',         note:'第1試合'},
  {id:20260002, season:'2026', date:'2026-04-08', teamA:'¥500バーグ食堂', teamB:'ハッチ',    home:'¥500バーグ食堂', venue:'¥500バーグ食堂', note:'第2試合'},
  {id:20260003, season:'2026', date:'2026-04-15', teamA:'¥500バーグ食堂', teamB:'ふじさき', home:'¥500バーグ食堂', venue:'¥500バーグ食堂', note:'第3試合'},
  {id:20260004, season:'2026', date:'2026-04-15', teamA:'デイリー',    teamB:'ハッチ',        home:'デイリー',    venue:'GCP',         note:'第4試合'},
  {id:20260005, season:'2026', date:'2026-04-22', teamA:'ふじさき',    teamB:'ハッチ',        home:'ふじさき',    venue:'GCP',         note:'第5試合'},
  {id:20260006, season:'2026', date:'2026-04-29', teamA:'¥500バーグ食堂', teamB:'デイリー', home:'¥500バーグ食堂', venue:'¥500バーグ食堂', note:'第6試合'},
  {id:20260007, season:'2026', date:'2026-05-06', teamA:'', teamB:'', home:'', venue:'', note:'😴 GW休み'},
  {id:20260008, season:'2026', date:'2026-05-13', teamA:'デイリー',    teamB:'ふじさき',      home:'デイリー',    venue:'GCP',         note:'第7試合'},
  {id:20260009, season:'2026', date:'2026-05-20', teamA:'ハッチ',      teamB:'¥500バーグ食堂', home:'ハッチ',    venue:'GCP',         note:'第8試合'},
  {id:20260010, season:'2026', date:'2026-05-27', teamA:'ふじさき',    teamB:'¥500バーグ食堂', home:'ふじさき',  venue:'GCP',         note:'第9試合'},
  {id:20260011, season:'2026', date:'2026-06-03', teamA:'', teamB:'', home:'', venue:'', note:'😴 全チームお休み'},
  {id:20260012, season:'2026', date:'2026-06-10', teamA:'ハッチ',      teamB:'デイリー',      home:'ハッチ',      venue:'GCP',         note:'第10試合'},
  {id:20260013, season:'2026', date:'2026-06-17', teamA:'ハッチ',      teamB:'ふじさき',      home:'ハッチ',      venue:'GCP',         note:'第11試合'},
  {id:20260014, season:'2026', date:'2026-06-24', teamA:'デイリー',    teamB:'¥500バーグ食堂', home:'デイリー',  venue:'GCP',         note:'第12試合'},
  {id:20260015, season:'2026', date:'2026-07-01', teamA:'', teamB:'', home:'', venue:'', note:'😴 全チームお休み'},
  {id:20260016, season:'2026', date:'2026-07-08', teamA:'ふじさき',    teamB:'デイリー',      home:'ふじさき',    venue:'GCP',         note:'第13試合'},
  {id:20260017, season:'2026', date:'2026-07-08', teamA:'¥500バーグ食堂', teamB:'ハッチ',    home:'¥500バーグ食堂', venue:'¥500バーグ食堂', note:'第14試合'},
  {id:20260018, season:'2026', date:'2026-07-15', teamA:'¥500バーグ食堂', teamB:'ふじさき', home:'¥500バーグ食堂', venue:'¥500バーグ食堂', note:'第15試合'},
  {id:20260019, season:'2026', date:'2026-07-15', teamA:'デイリー',    teamB:'ハッチ',        home:'デイリー',    venue:'GCP',         note:'第16試合'},
  {id:20260020, season:'2026', date:'2026-07-22', teamA:'', teamB:'', home:'', venue:'', note:'😴 全チームお休み'},
  {id:20260021, season:'2026', date:'2026-07-29', teamA:'ふじさき',    teamB:'ハッチ',        home:'ふじさき',    venue:'GCP',         note:'第17試合'},
  {id:20260022, season:'2026', date:'2026-07-29', teamA:'¥500バーグ食堂', teamB:'デイリー', home:'¥500バーグ食堂', venue:'¥500バーグ食堂', note:'第18試合'},
  {id:20260023, season:'2026', date:'2026-08-12', teamA:'', teamB:'', home:'', venue:'', note:'😴 お盆休み'},
  {id:20260024, season:'2026', date:'2026-08-05', teamA:'デイリー',    teamB:'ふじさき',      home:'デイリー',    venue:'GCP',         note:'第19試合'},
  {id:20260025, season:'2026', date:'2026-08-19', teamA:'ハッチ',      teamB:'¥500バーグ食堂', home:'ハッチ',    venue:'GCP',         note:'第20試合'},
  {id:20260026, season:'2026', date:'2026-08-26', teamA:'ふじさき',    teamB:'¥500バーグ食堂', home:'ふじさき',  venue:'GCP',         note:'第21試合'},
  {id:20260027, season:'2026', date:'2026-09-02', teamA:'ハッチ',      teamB:'デイリー',      home:'ハッチ',      venue:'GCP',         note:'第22試合'},
  {id:20260028, season:'2026', date:'2026-09-09', teamA:'ハッチ',      teamB:'ふじさき',      home:'ハッチ',      venue:'GCP',         note:'第23試合'},
  {id:20260029, season:'2026', date:'2026-09-16', teamA:'', teamB:'', home:'', venue:'', note:'😴 全チームお休み'},
  {id:20260030, season:'2026', date:'2026-09-23', teamA:'デイリー',    teamB:'¥500バーグ食堂', home:'デイリー',  venue:'GCP',         note:'第24試合'},
  {id:20260031, season:'2026', date:'2026-09-30', teamA:'', teamB:'', home:'', venue:'GCP',         note:'🏆 決勝戦'},
];

function load(){
  try{
    const s=sessionStorage.getItem('gcpLeague');
    if(s) D=JSON.parse(s);
  }catch(e){}
  if(!D.schedule) D.schedule = [];
  const extra2026 = D.schedule.filter(s=>s.season==='2026' && !DEFAULT_SCHEDULE_2026.some(d=>d.id===s.id));
  D.schedule = [...D.schedule.filter(s=>s.season!=='2026'), ...DEFAULT_SCHEDULE_2026, ...extra2026];
  if(!D.pendingMatches) D.pendingMatches = [];
  if(!D.rejectedNotifs) D.rejectedNotifs = [];
}

function toArray(val, withKey=false) {
  if(!val) return [];
  if(Array.isArray(val)) return val;
  return Object.entries(val).map(([k,v]) => withKey ? {...v, _fbKey:k} : v);
}

function applyFirebaseData(data) {
  if(!data) return;
  if(data.teams)   D.teams   = toArray(data.teams).map(t => ({...t, players: toArray(t.players)}));
  if(data.matches) D.matches = toArray(data.matches, true);
  if(data.schedule) {
    const sched = toArray(data.schedule);
    const extra2026 = sched.filter(s=>s.season==='2026' && !DEFAULT_SCHEDULE_2026.some(d=>d.id===s.id));
    D.schedule = [...sched.filter(s=>s.season!=='2026'), ...DEFAULT_SCHEDULE_2026, ...extra2026];
  }
  D.pendingMatches = toArray(data.pendingMatches, true);
  D.rejectedNotifs = toArray(data.rejectedNotifs, true);
  try{ sessionStorage.setItem('gcpLeague', JSON.stringify(D)); }catch(e){}
}

function fbSync(){
  if(!D.teams || !D.teams.length){
    D.teams=[
      {name:'ふじさき',       players:[{name:'',rating:''},{name:'',rating:''},{name:'',rating:''},{name:'',rating:''}]},
      {name:'ハッチ',         players:[{name:'',rating:''},{name:'',rating:''},{name:'',rating:''},{name:'',rating:''}]},
      {name:'¥500バーグ食堂', players:[{name:'',rating:''},{name:'',rating:''},{name:'',rating:''},{name:'',rating:''}]},
      {name:'デイリー',       players:[{name:'',rating:''},{name:'',rating:''},{name:'',rating:''},{name:'',rating:''}]},
    ];
  }
  if(!D.pendingMatches) D.pendingMatches = [];
  if(!D.rejectedNotifs) D.rejectedNotifs = [];
  checkAutoApproval();
  renderRobin(); renderHistory(); renderSchedule();
  renderTeams();
  refreshTeamSelects(); refreshStatsTeamSel();
  renderHome();
}

// ─────────────────────────────────────────
//  NAV
// ─────────────────────────────────────────
function showView(name, btn){
  if((name==='score'||name==='teams') && (!currentUser || currentUser.isGuest)){
    toast('⚠️ ログインが必要です'); return;
  }
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('view-'+name).classList.add('active');
  if(btn) btn.classList.add('active');
  if(currentUser && !currentUser.isGuest) sessionStorage.setItem('gcpView', name);
  if(name==='home')     renderHome();
  if(name==='robin')    renderRobin();
  if(name==='history')  renderHistory();
  if(name==='teams')    renderTeams();
  if(name==='score')    refreshTeamSelects();
  if(name==='stats')    { refreshStatsTeamSel(); renderStats(); }
  if(name==='schedule') renderSchedule();
}

// ─────────────────────────────────────────
//  HOME
// ─────────────────────────────────────────
function renderHome(){
  const c = document.getElementById('home-content');
  if(!c) return;
  const team = currentUser ? currentUser.team : '';
  const now = new Date();
  const dateStr = now.toLocaleDateString('ja-JP',{year:'numeric',month:'long',day:'numeric',weekday:'short'});

  // ── 順位計算 ──
  const standing = D.teams.map(t=>{
    const matches = D.matches.filter(m=>m.teamA===t.name||m.teamB===t.name);
    let w=0,l=0;
    matches.forEach(m=>{
      const isA = m.teamA===t.name;
      const tw = isA ? m.scoreA : m.scoreB;
      const ow = isA ? m.scoreB : m.scoreA;
      if(tw>ow) w++; else l++;
    });
    return {name:t.name, w, l, total:matches.length};
  }).sort((a,b)=> b.w-a.w || a.l-b.l);

  const rankRows = standing.map((s,i)=>{
    const isMe = s.name===team;
    return `<div style="display:grid;grid-template-columns:28px 1fr auto;align-items:center;padding:8px 0;
      border-bottom:1px solid var(--border);${isMe?'font-weight:700;color:var(--accent);':''}">
      <span style="font-size:13px;">${i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1+'位'}</span>
      <span style="font-size:14px;">${s.name}</span>
      <span style="font-size:13px;color:var(--text2);">${s.w}勝${s.l}敗</span>
    </div>`;
  }).join('');

  // ── 次の試合 ──
  const todayStr2 = now.toISOString().slice(0,10);
  const upcomingAll = (D.schedule||[])
    .filter(s=> s.date >= todayStr2 && s.teamA && s.teamB)
    .sort((a,b)=>a.date.localeCompare(b.date));
  const nearestDate = upcomingAll.length ? upcomingAll[0].date : null;
  const nearestMatches = nearestDate ? upcomingAll.filter(s=>s.date===nearestDate) : [];
  const nearestDateStr = nearestDate ? new Date(nearestDate).toLocaleDateString('ja-JP',{month:'long',day:'numeric',weekday:'short'}) : null;

  const nextHtml = nearestMatches.length
    ? `<div style="padding:8px 0;">
        <div style="font-size:16px;font-weight:900;color:var(--accent);margin-bottom:8px;">📅 ${nearestDateStr}</div>
        ${nearestMatches.map(s=>{
          const isMe = team && (s.teamA===team||s.teamB===team);
          return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);${isMe?'font-weight:700;color:var(--accent);':''}">
            <span style="font-size:13px;">${s.teamA}</span>
            <span style="font-size:11px;color:var(--text2);">VS</span>
            <span style="font-size:13px;">${s.teamB}</span>
            ${s.venue?`<span style="font-size:11px;color:var(--text2);margin-left:auto;">📍${s.venue}</span>`:''}
          </div>`;
        }).join('')}
      </div>`
    : `<div style="padding:12px 0;color:var(--text2);font-size:13px;">次の試合は未定です</div>`;

  // ── 最新の試合結果 ──
  const myMatches = team ? D.matches
    .filter(m=>m.teamA===team||m.teamB===team)
    .sort((a,b)=>b.date.localeCompare(a.date))
    .slice(0,3) : [];

  let resultsHtml = '';
  if(!team){
    resultsHtml = `<div style="color:var(--text2);font-size:13px;padding:12px 0;">ログインするとチームの試合結果が表示されます</div>`;
  } else if(myMatches.length){
    resultsHtml = myMatches.map(m=>{
      const isA = m.teamA===team;
      const myW = isA?m.scoreA:m.scoreB;
      const opW = isA?m.scoreB:m.scoreA;
      const oppName = isA?m.teamB:m.teamA;
      const win = myW>opW;
      const dObj = new Date(m.date);
      const dStr = dObj.toLocaleDateString('ja-JP',{month:'long',day:'numeric'});
      return `<div style="display:grid;grid-template-columns:80px 1fr auto;align-items:center;
        padding:8px 0;border-bottom:1px solid var(--border);">
        <span style="font-size:12px;color:var(--text2);">${dStr}</span>
        <span style="font-size:13px;">vs ${oppName}</span>
        <span style="font-size:13px;font-weight:700;color:${win?'var(--win)':'var(--lose)'};">
          ${myW}-${opW} ${win?'●WIN':'●LOSE'}
        </span>
      </div>`;
    }).join('');
  } else {
    resultsHtml = `<div style="color:var(--text2);font-size:13px;padding:12px 0;">まだ試合がありません</div>`;
  }

  // ── ロビン表HTML生成 ──
  let robinHtml = '';
  const rTeams = D.teams.map(t=>t.name);
  if(rTeams.length>=2 && D.matches.length>0){
    const stats = {};
    rTeams.forEach(t=>{
      stats[t]={wins:0,losses:0,lw:0,ll:0,vs:{}};
      rTeams.forEach(o=>{if(o!==t)stats[t].vs[o]=[];});
    });
    D.matches.forEach(m=>{
      const a=m.teamA, b=m.teamB; if(!stats[a]||!stats[b]) return;
      if(m.scoreA>m.scoreB){stats[a].wins++;stats[b].losses++;}
      else if(m.scoreB>m.scoreA){stats[b].wins++;stats[a].losses++;}
      stats[a].lw+=m.scoreA; stats[a].ll+=m.scoreB;
      stats[b].lw+=m.scoreB; stats[b].ll+=m.scoreA;
      if(stats[a].vs[b]!==undefined) stats[a].vs[b].push({my:m.scoreA,op:m.scoreB});
      if(stats[b].vs[a]!==undefined) stats[b].vs[a].push({my:m.scoreB,op:m.scoreA});
    });
    const sorted = [...rTeams].sort((a,b)=>
      stats[b].wins!==stats[a].wins ? stats[b].wins-stats[a].wins : stats[b].lw-stats[a].lw
    );
    let h = '<div class="robin-wrap"><table class="robin-table"><thead><tr><th>TEAM</th>';
    sorted.forEach((t,i)=>{ h+=`<th>${["①","②","③","④","⑤","⑥","⑦","⑧","⑨","⑩","⑪","⑫","⑬","⑭","⑮","⑯","⑰","⑱","⑲","⑳"][i]||i+1}<br><small>${t}</small></th>`; });
    h += '<th>勝</th><th>負</th><th>LEG勝</th><th>LEG負</th><th>順位</th></tr></thead><tbody>';
    sorted.forEach((t2,ri)=>{
      const s=stats[t2]; const rank=ri+1;
      h += `<tr><td class="tn">${t2}</td>`;
      sorted.forEach(opp=>{
        if(opp===t2){h+='<td class="self-cell"></td>';return;}
        const ms=s.vs[opp]||[];
        if(!ms.length){h+='<td style="color:var(--text2)">-</td>';return;}
        h+='<td>';
        ms.forEach(m=>{const win=m.my>m.op; h+=`<span class="match-score${win?' hl':''}">${m.my} - ${m.op}</span>`;});
        h+='</td>';
      });
      const rc=rank===1?'r1':rank===2?'r2':rank===3?'r3':'rx';
      h+=`<td class="cw">${s.wins}</td><td class="cl">${s.losses}</td><td>${s.lw}</td><td style="color:var(--text2)">${s.ll}</td><td><span class="rank-dot ${rc}">${rank}</span></td></tr>`;
    });
    h += '</tbody></table></div>';
    robinHtml = h;
  } else {
    robinHtml = '<div style="color:var(--text2);font-size:13px;padding:8px 0;">まだ試合結果がありません</div>';
  }

  // ── 承認待ち・却下通知カード ──
  let pendingCardHtml = '';
  if(currentUser && !currentUser.isGuest){
    const pending = D.pendingMatches || [];
    const notifs = D.rejectedNotifs || [];
    const myTeam = team;
    const isAdmin = currentUser.isAdmin;

    const myNotifs = isAdmin ? [] : notifs.filter(n=>n.teamX===myTeam||n.teamY===myTeam);
    const notifsHtml = myNotifs.map(n=>`
      <div style="background:rgba(240,51,85,.08);border:1px solid rgba(240,51,85,.3);border-radius:8px;padding:10px 12px;margin-bottom:8px;">
        <div style="font-size:12px;font-weight:700;color:var(--lose);">❌ 申請が却下されました</div>
        <div style="font-size:12px;margin-top:4px;">${n.date}　${n.teamX} vs ${n.teamY}</div>
        <button onclick="dismissRejectedNotif(${n.id})" style="margin-top:8px;padding:6px 12px;background:transparent;border:1px solid var(--border);border-radius:6px;color:var(--text2);font-size:11px;cursor:pointer;font-family:'Noto Sans JP',sans-serif;">確認しました</button>
      </div>`).join('');

    let myPendings = [];
    if(isAdmin){
      myPendings = pending;
    } else if(myTeam){
      myPendings = pending.filter(p=>p.teamX===myTeam||p.teamY===myTeam);
    }

    const pendingsHtml = myPendings.map(p=>{
      const isMySubmission = !isAdmin && p.teamX===myTeam;
      const isOppSubmission = !isAdmin && p.teamY===myTeam;
      const sx = p.submissionX;
      const sy = p.submissionY;
      const dObj = new Date(p.date);
      const dStr = dObj.toLocaleDateString('ja-JP',{month:'long',day:'numeric'});

      let statusHtml = '';
      if(p.status==='conflict'){
        statusHtml = `<div style="color:var(--lose);font-size:12px;font-weight:700;margin-top:6px;">⚠️ スコアが一致しません。管理者が確認中です</div>`;
        if(isAdmin){
          statusHtml += `<div style="font-size:11px;color:var(--text2);margin-top:4px;">${p.teamX}申請: ${sx.scoreX}-${sx.scoreY}　${p.teamY}申請: ${sy.scoreX}-${sy.scoreY}</div>
          <div style="display:flex;gap:6px;margin-top:8px;">
            <button onclick="forceApprovePending(${p.id})" style="padding:7px 12px;background:var(--win);color:#fff;border:none;border-radius:7px;font-size:12px;cursor:pointer;font-family:'Noto Sans JP',sans-serif;font-weight:700;">✅ ${p.teamX}の申請で承認</button>
            <button onclick="rejectPending(${p.id})" style="padding:7px 12px;background:transparent;border:1px solid var(--lose);color:var(--lose);border-radius:7px;font-size:12px;cursor:pointer;font-family:'Noto Sans JP',sans-serif;">❌ 却下</button>
          </div>`;
        }
      } else if(isMySubmission && !sy){
        const subAt = sx.submittedAt ? new Date(sx.submittedAt) : null;
        const expAt = subAt ? new Date(subAt.getTime()+72*60*60*1000) : null;
        const expStr = expAt ? expAt.toLocaleDateString('ja-JP',{month:'long',day:'numeric',hour:'numeric',minute:'numeric'}) : '';
        statusHtml = `<div style="font-size:11px;color:var(--text2);margin-top:6px;">申請スコア: ${sx.scoreX} - ${sx.scoreY}${expStr?'<br>自動承認: '+expStr:''}</div>
          <button onclick="cancelPending(${p.id})" style="margin-top:8px;padding:6px 12px;background:transparent;border:1px solid var(--border);border-radius:6px;color:var(--text2);font-size:11px;cursor:pointer;font-family:'Noto Sans JP',sans-serif;">取り消す</button>`;
      } else if(isOppSubmission && !sy){
        statusHtml = `<div style="font-size:11px;color:var(--text2);margin-top:6px;">⏳ あなたのスコア送信待ちです<br>${p.teamX}申請スコア: ${sx.scoreX} - ${sx.scoreY}</div>`;
      } else if(isAdmin && !sy){
        const subAt = sx.submittedAt ? new Date(sx.submittedAt) : null;
        const expAt = subAt ? new Date(subAt.getTime()+72*60*60*1000) : null;
        const expStr = expAt ? expAt.toLocaleDateString('ja-JP',{month:'long',day:'numeric',hour:'numeric',minute:'numeric'}) : '';
        statusHtml = `<div style="font-size:11px;color:var(--text2);margin-top:4px;">${p.teamX}申請: ${sx.scoreX}-${sx.scoreY}${expStr?'　自動承認: '+expStr:''}</div>
          <div style="display:flex;gap:6px;margin-top:8px;">
            <button onclick="forceApprovePending(${p.id})" style="padding:7px 12px;background:var(--win);color:#fff;border:none;border-radius:7px;font-size:12px;cursor:pointer;font-family:'Noto Sans JP',sans-serif;font-weight:700;">✅ 強制承認</button>
            <button onclick="rejectPending(${p.id})" style="padding:7px 12px;background:transparent;border:1px solid var(--lose);color:var(--lose);border-radius:7px;font-size:12px;cursor:pointer;font-family:'Noto Sans JP',sans-serif;">❌ 却下</button>
          </div>`;
      }

      return `<div style="border:1px solid var(--border);border-radius:8px;padding:10px 12px;margin-bottom:8px;">
        <div style="font-size:10px;color:var(--text2);">${dStr}　${p.season||''} G.C.P LEAGUE</div>
        <div style="font-size:14px;font-weight:700;margin-top:2px;">${p.teamX} <span style="color:var(--text2);font-weight:400">vs</span> ${p.teamY}</div>
        ${statusHtml}
      </div>`;
    }).join('');

    if(notifsHtml || pendingsHtml){
      pendingCardHtml = `<div class="card" style="margin-bottom:12px;">
        <div class="card-label">⏳ 承認待ち</div>
        ${notifsHtml}
        ${pendingsHtml || '<div style="font-size:12px;color:var(--text2);padding:4px 0;">承認待ちの試合はありません</div>'}
      </div>`;
    }
  }

  c.innerHTML = `
    <div style="padding:4px 0 12px;">
      <div style="font-size:16px;font-weight:900;color:var(--accent);">${team ? '👋 おかえり、'+team+'！' : '🏆 GCP T.E.D. LEAGUE'}</div>
      <div style="font-size:12px;color:var(--text2);margin-top:2px;">${dateStr}</div>
    </div>

    ${pendingCardHtml}

    <div class="card" style="margin-bottom:12px;">
      <div class="card-label">🏆 現在の順位</div>
      ${rankRows}
    </div>

    <div class="card" style="margin-bottom:12px;">
      <div class="card-label">📅 次の試合</div>
      ${nextHtml}
    </div>

    <div class="card" style="margin-bottom:12px;">
      <div class="card-label">🎯 ロビン表</div>
      <div style="overflow-x:auto;">
        ${robinHtml}
      </div>
    </div>

    <div class="card">
      <div class="card-label">📋 最新の試合結果</div>
      ${resultsHtml}
    </div>
  `;
}

function toggleHomeRobin(){
  const body = document.getElementById('home-robin-body');
  const arrow = document.getElementById('home-robin-arrow');
  if(!body) return;
  const open = body.style.display === 'block';
  body.style.display = open ? 'none' : 'block';
  if(arrow) arrow.style.transform = open ? '' : 'rotate(180deg)';
}

// ─────────────────────────────────────────
//  HISTORY
// ─────────────────────────────────────────
function renderHistory(){
  const c = document.getElementById('history-content');

  const pending = D.pendingMatches || [];
  let pendingSectionHtml = '';
  if(pending.length){
    const isAdmin = currentUser && currentUser.isAdmin;
    const myTeam = currentUser && !currentUser.isGuest ? currentUser.team : null;
    const rows = pending.map(p=>{
      const sx = p.submissionX;
      const sy = p.submissionY;
      const dObj = new Date(p.date);
      const dStr = dObj.toLocaleDateString('ja-JP',{month:'long',day:'numeric'});
      let statusText = '';
      let actionHtml = '';
      if(p.status==='conflict'){
        statusText = '⚠️ スコア不一致・管理者確認中';
        if(isAdmin){
          actionHtml = `<div style="display:flex;gap:6px;margin-top:6px;">
            <button onclick="forceApprovePending(${p.id})" style="padding:5px 10px;background:var(--win);color:#fff;border:none;border-radius:6px;font-size:11px;cursor:pointer;font-family:'Noto Sans JP',sans-serif;">✅ 承認</button>
            <button onclick="rejectPending(${p.id})" style="padding:5px 10px;background:transparent;border:1px solid var(--lose);color:var(--lose);border-radius:6px;font-size:11px;cursor:pointer;font-family:'Noto Sans JP',sans-serif;">❌ 却下</button>
          </div>`;
        }
      } else {
        statusText = '⏳ 承認待ち';
        if(sx && !sy) statusText += `（${p.teamX}が申請済み）`;
        if(isAdmin){
          actionHtml = `<div style="display:flex;gap:6px;margin-top:6px;">
            <button onclick="forceApprovePending(${p.id})" style="padding:5px 10px;background:var(--win);color:#fff;border:none;border-radius:6px;font-size:11px;cursor:pointer;font-family:'Noto Sans JP',sans-serif;">✅ 承認</button>
            <button onclick="rejectPending(${p.id})" style="padding:5px 10px;background:transparent;border:1px solid var(--lose);color:var(--lose);border-radius:6px;font-size:11px;cursor:pointer;font-family:'Noto Sans JP',sans-serif;">❌ 却下</button>
          </div>`;
        } else if(myTeam){
          if(p.teamX===myTeam && !sy){
            actionHtml = `<button onclick="cancelPending(${p.id})" style="margin-top:6px;padding:5px 10px;background:transparent;border:1px solid var(--border);border-radius:6px;color:var(--text2);font-size:11px;cursor:pointer;font-family:'Noto Sans JP',sans-serif;">取り消す</button>`;
          } else if(p.teamY===myTeam && !sy){
            actionHtml = `<div style="font-size:11px;color:var(--text2);margin-top:6px;">⏳ あなたのスコア送信待ちです</div>`;
          }
        }
      }
      const scoreDisp = sx ? `${sx.scoreX} - ${sx.scoreY}` : '-';
      return `<div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div>
            <div style="font-size:10px;color:var(--text2);">${dStr}　${p.season||''} G.C.P LEAGUE</div>
            <div style="font-size:14px;font-weight:700;margin-top:2px;">${p.teamX} <span style="color:var(--text2);font-weight:400">vs</span> ${p.teamY}</div>
          </div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:var(--text2);">${scoreDisp}</div>
        </div>
        <div style="font-size:11px;color:var(--accent);margin-top:4px;">${statusText}</div>
        ${actionHtml}
      </div>`;
    }).join('');

    pendingSectionHtml = `<div style="margin-bottom:16px;">
      <div class="card-label" style="margin-bottom:8px;">⏳ 承認待ちの試合</div>
      ${rows}
    </div>`;
  }

  if(!D.matches.length && !pending.length){
    c.innerHTML='<div class="empty-state"><div class="ico">📅</div><p>試合履歴がありません。</p></div>';
    return;
  }
  const sorted = [...D.matches].sort((a,b)=>b.id-a.id);
  const matchesHtml = sorted.length ? sorted.map(m=>{
    const won = m.scoreA > m.scoreB;
    const detailRows = (m.games||[]).filter(g=>g.winner).map(g=>{
      const isCr = (g.label||"").includes("クリケット");
      const chips = (g.players||[]).map(p=>{
        const rPart = p.rating
          ? `${flightBadge(p.rating, isCr)}<span class="chip-rating">${p.rating}</span>`
          : `<span class="chip-no-rating">未入力</span>`;
        return `<span class="player-chip"><span class="chip-name">${p.name}</span>${rPart}</span>`;
      }).join('');
      return `<div class="detail-game-row">
        <div class="detail-game-top">
          <span class="detail-gnum">${g.game}G</span>
          <span class="detail-gtype">${g.label}</span>
          <span class="detail-result ${g.winner==='my'?'w':'l'}">${g.winner==='my'?'WIN':'LOSE'}</span>
        </div>
        <div class="player-chips">${chips||'<span style="color:var(--text2);font-size:11px;">選手未入力</span>'}</div>
      </div>`;
    }).join('');
    return `<div class="history-card" onclick="toggleDetail(${m.id})">
      <div class="hist-top">
        <div>
          <div class="hist-date">${m.date}　${m.season||''} G.C.P LEAGUE</div>
          <div class="hist-teams">${m.teamA} <span style="color:var(--text2);font-weight:400">vs</span> ${m.teamB}</div>
        </div>
        <div style="text-align:right">
          <div class="hist-score ${won?'w':'l'}">${m.scoreA} - ${m.scoreB}</div>
          <div><span class="hist-badge ${won?'w':'l'}">${won?'WIN':'LOSE'}</span></div>
        </div>
      </div>
      <div class="detail-panel" id="dp-${m.id}">
        ${detailRows||'<div style="color:var(--text2);font-size:12px;padding:6px 0">詳細データなし</div>'}
        ${(currentUser && currentUser.isAdmin) ? `<button class="hist-del" onclick="deleteMatch(event,${m.id})">この試合を削除</button>` : ''}
      </div>
    </div>`;
  }).join('') : '<div class="empty-state"><div class="ico">📅</div><p>試合履歴がありません。</p></div>';

  c.innerHTML = pendingSectionHtml + matchesHtml;
}

function toggleDetail(id){
  const dp=document.getElementById('dp-'+id); if(dp) dp.classList.toggle('open');
}
function resetMatchHistory(){
  if(!currentUser || !currentUser.isAdmin){ toast('⚠️ 管理者のみ操作できます'); return; }
  if(!confirm('⚠️ 試合履歴をすべて削除します。\nこの操作は取り消せません。続けますか？')) return;
  D.matches = [];
  if(window.fbClearMatches) window.fbClearMatches();
  try{ sessionStorage.setItem('gcpLeague', JSON.stringify(D)); }catch(e){}
  renderHistory();
  renderRobin();
  toast('✅ 試合履歴をリセットしました');
}
function deleteMatch(e,id){
  e.stopPropagation();
  if(!currentUser || !currentUser.isAdmin){
    toast('⚠️ 試合削除は管理者のみできます'); return;
  }
  showConfirm('🗑️ 削除確認', 'この試合を削除しますか？\n\n削除すると元に戻せません。', async ()=>{
    const m = D.matches.find(x=>x.id===id);
    if(m && window.fbRemoveMatch && m._fbKey) await window.fbRemoveMatch(m._fbKey);
    D.matches = D.matches.filter(m=>m.id!==id);
    try{ sessionStorage.setItem('gcpLeague', JSON.stringify(D)); }catch(e){}
    renderHistory();
  }, '削除する');
}

// ─────────────────────────────────────────
//  TEAMS
// ─────────────────────────────────────────
let inlineEditing = null;
let deleteModeTeamIdx = null;

function renderTeams(){
  const c = document.getElementById('teams-content');
  if(!D.teams || !D.teams.length){
    c.innerHTML='<div class="empty-state"><div class="ico">⚙️</div><p>チームがありません。</p></div>';
    return;
  }
  const teamsToShow = (currentUser && currentUser.isAdmin)
    ? D.teams
    : D.teams.filter(t => currentUser && currentUser.team === t.name);
  const teamIndices = (currentUser && currentUser.isAdmin)
    ? D.teams.map((_,i)=>i)
    : D.teams.map((t,i)=>i).filter(i => currentUser && D.teams[i].name === currentUser.team);

  const addBtn = (currentUser && currentUser.isAdmin)
    ? `<div style="margin-bottom:12px;"><button onclick="openAddTeamModal()" style="width:100%;padding:12px;background:var(--accent);color:#fff;font-weight:700;font-size:14px;border:none;border-radius:10px;cursor:pointer;font-family:'Noto Sans JP',sans-serif;">＋ チームを追加</button></div>`
    : '';
  c.innerHTML = addBtn + teamsToShow.map((t, idx)=>{
    const i = teamIndices[idx];
    const isDeleteMode = deleteModeTeamIdx === i;
    const members = (t.players || []).map((p,pi)=>{
      const isEditing = inlineEditing && inlineEditing.teamIdx===i && inlineEditing.playerIdx===pi;
      if(isEditing){
        return `<div class="member-row editing" id="inline-row-${i}-${pi}" style="display:block;">
          <div style="display:grid;grid-template-columns:1fr 80px;gap:8px;align-items:center;">
            <input class="inline-name-input" id="inline-name-${i}-${pi}" value="${p.name}" placeholder="選手${pi+1}">
            <select class="inline-rating-sel" id="inline-rating-${i}-${pi}">${ratingOptions(p.rating)}</select>
          </div>
          <button class="inline-save-btn" onclick="saveInlineEdit(${i},${pi})">✓ 保存</button>
        </div>`;
      }
      const delBtn = isDeleteMode
        ? `<button class="inline-del-btn" onclick="deletePlayer(${i},${pi})">✕</button>`
        : '';
      if(!p.name){
        return `<div class="member-row" onclick="${isDeleteMode?'':(`startInlineEdit(${i},${pi})`)}" style="opacity:0.4;${isDeleteMode?'grid-template-columns:28px 1fr 70px;':''}">
          ${delBtn}
          <span class="member-name" style="color:var(--text2);">選手${pi+1}</span>
          <span class="member-no-rating">未登録</span>
        </div>`;
      }
      return `<div class="member-row" onclick="${isDeleteMode?'':(`startInlineEdit(${i},${pi})`)}" style="${isDeleteMode?'grid-template-columns:28px 1fr 70px;':''}">
        ${delBtn}
        <span class="member-name">${p.name}</span>
        <span style="display:flex;align-items:center;gap:5px;justify-content:flex-end;">
          ${p.rating ? `<span class="member-rating-val">Rt.${p.rating}</span>` : '<span class="member-no-rating">未登録</span>'}
        </span>
      </div>`;
    }).join('');

    const editLabel = isDeleteMode ? '✕ 完了' : '✏️ 編集';
    const editStyle = isDeleteMode ? 'border-color:var(--lose);color:var(--lose);' : '';

    return `<div class="team-card">
      <div class="team-card-head">
        <div class="team-card-name">${t.name}</div>
        <div style="display:flex;gap:6px;">
          ${(currentUser && (currentUser.isAdmin || (currentUser.team===t.name))) ? `
          <button class="edit-btn" onclick="addPlayerInline(${i})">＋ 追加</button>
          <button class="edit-btn" style="${editStyle}" onclick="toggleDeleteMode(${i})">${editLabel}</button>
        ` : ''}
        </div>
      </div>
      <div class="member-list">${members}</div>
    </div>`;
  }).join('');

  const pwSection = document.getElementById('pw-change-section');
  if(pwSection){
    if(currentUser && currentUser.isAdmin){
      pwSection.style.display = 'block';
      renderPwChangeRows();
    } else {
      pwSection.style.display = 'none';
    }
  }
  const pwSelf = document.getElementById('pw-self-section');
  if(pwSelf){
    if(currentUser && !currentUser.isAdmin && !currentUser.isGuest){
      pwSelf.style.display = 'block';
    } else {
      pwSelf.style.display = 'none';
    }
  }
}

function renderPwChangeRows(){
  const wrap = document.getElementById('pw-change-rows');
  if(!wrap) return;
  const teams = [...D.teams.map(t=>t.name), '__admin__'];
  const savedValues = {};
  wrap.querySelectorAll('input[id^="pw-input-"]').forEach(inp => {
    if(inp.value) savedValues[inp.id] = inp.value;
  });
  wrap.innerHTML = teams.map((name, idx)=>{
    const label = name==='__admin__' ? '管理者' : name;
    return `<div style="display:grid;grid-template-columns:1fr 1fr 80px;gap:6px;align-items:center;">
      <div style="font-size:12px;font-weight:700;">${label}</div>
      <input type="password" class="no-mb" placeholder="新しいパスワード" id="pw-input-${idx}" style="font-size:13px;">
      <button class="edit-btn" style="font-size:11px;" onclick="changePassword('${name}', ${idx})">変更</button>
    </div>`;
  }).join('');
  Object.entries(savedValues).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if(el) el.value = val;
  });
}

function toggleDeleteMode(teamIdx){
  deleteModeTeamIdx = (deleteModeTeamIdx === teamIdx) ? null : teamIdx;
  inlineEditing = null;
  renderTeams();
}

function deletePlayer(teamIdx, playerIdx){
  const p = D.teams[teamIdx].players[playerIdx];
  const name = p.name || `選手${playerIdx+1}`;
  showConfirm('🗑️ 選手を削除', `${name} を削除しますか？`, ()=>{
    D.teams[teamIdx].players.splice(playerIdx, 1);
    save(); renderTeams(); refreshTeamSelects(); refreshStatsTeamSel();
    toast(`${name} を削除しました`);
  }, '削除する');
}

function addPlayerInline(teamIdx){
  inlineEditing = null;
  deleteModeTeamIdx = null;
  D.teams[teamIdx].players.push({name:'', rating:''});
  const newIdx = D.teams[teamIdx].players.length - 1;
  inlineEditing = {teamIdx, playerIdx: newIdx};
  renderTeams();
  setTimeout(()=>{
    const el = document.getElementById(`inline-name-${teamIdx}-${newIdx}`);
    if(el){ el.focus(); el.scrollIntoView({behavior:'smooth', block:'center'}); }
  }, 50);
}

function startInlineEdit(teamIdx, playerIdx){
  const t = D.teams[teamIdx];
  if(!currentUser || currentUser.isGuest){ toast('⚠️ ログインが必要です'); return; }
  if(!currentUser.isAdmin && currentUser.team !== t.name){ toast('⚠️ 自チームのみ編集できます'); return; }
  if(inlineEditing !== null){
    const {teamIdx:ti, playerIdx:pi} = inlineEditing;
    const nameEl   = document.getElementById(`inline-name-${ti}-${pi}`);
    const ratingEl = document.getElementById(`inline-rating-${ti}-${pi}`);
    if(nameEl){
      const origName   = D.teams[ti].players[pi].name;
      const origRating = D.teams[ti].players[pi].rating;
      const changed = nameEl.value !== origName || ratingEl.value !== origRating;
      if(changed){
        showConfirm('⚠️ 編集中のデータがあります',
          `${origName} の変更が保存されていません。\n破棄して別の選手を編集しますか？`,
          ()=>{ inlineEditing = {teamIdx, playerIdx}; renderTeams(); },
          '破棄する'
        );
        return;
      }
    }
  }
  inlineEditing = {teamIdx, playerIdx};
  renderTeams();
  setTimeout(()=>{
    const el = document.getElementById(`inline-name-${teamIdx}-${playerIdx}`);
    if(el) el.focus();
  }, 50);
}

function saveInlineEdit(teamIdx, playerIdx){
  const nameEl   = document.getElementById(`inline-name-${teamIdx}-${playerIdx}`);
  const ratingEl = document.getElementById(`inline-rating-${teamIdx}-${playerIdx}`);
  if(!nameEl) return;
  const name = nameEl.value.trim();
  if(!name){ toast('選手名を入力してください'); return; }
  D.teams[teamIdx].players[playerIdx].name   = name;
  D.teams[teamIdx].players[playerIdx].rating = ratingEl.value;
  inlineEditing = null;
  save();
  renderTeams();
  refreshTeamSelects();
  refreshStatsTeamSel();
  toast(`${name} を更新しました`);
}

// ── チームモーダル ──
let editingTeamIdx = null;
const DEFAULT_MEMBERS = ()=>[
  {name:'',rating:''},{name:'',rating:''},
  {name:'',rating:''},{name:'',rating:''}
];

function openAddTeamModal(){
  editingTeamIdx = null;
  document.getElementById('mt-title').textContent = 'チームを追加';
  document.getElementById('mt-name').value = '';
  renderMemberRows(DEFAULT_MEMBERS());
  document.getElementById('modal-team').classList.add('open');
}
function openEditTeamModal(idx){
  inlineEditing = null;
  deleteModeTeamIdx = null;
  editingTeamIdx = idx;
  const t = D.teams[idx];
  document.getElementById('mt-title').textContent = `${t.name} を編集`;
  document.getElementById('mt-name').value = t.name;
  const base = t.players.length ? [...t.players] : [];
  while(base.length < 4) base.push({name:'',rating:''});
  renderMemberRows(base);
  document.getElementById('modal-team').classList.add('open');
}
function renderMemberRows(members){
  document.getElementById('mt-members').innerHTML = members.map((m, i)=>{
    const isDefault = !m.name || /^選手\d+$/.test(m.name);
    const val = isDefault ? '' : m.name;
    const ph  = isDefault ? (m.name || `選手${i+1}`) : '選手名';
    return `<div class="modal-member-row">
      <input  type="text" class="no-mb mm-name"   value="${val}" placeholder="${ph}">
      <select class="no-mb mm-rating">${ratingOptions(m.rating||'')}</select>
      <button class="del-member-btn" onclick="removeMemberRow(this)">×</button>
    </div>`;
  }).join('');
}
function addMemberRow(){
  const c   = document.getElementById('mt-members');
  const div = document.createElement('div');
  div.className = 'modal-member-row';
  const n = c.children.length + 1;
  div.innerHTML = `
    <input  type="text" class="no-mb mm-name"   placeholder="選手${n}">
    <select class="no-mb mm-rating">${ratingOptions()}</select>
    <button class="del-member-btn" onclick="removeMemberRow(this)">×</button>`;
  c.appendChild(div);
}
function removeMemberRow(btn){
  const c=document.getElementById('mt-members');
  if(c.children.length>1) btn.closest('.modal-member-row').remove();
}
function saveTeamModal(){
  const name = document.getElementById('mt-name').value.trim();
  if(!name){toast('チーム名を入力してください');return;}
  const players = [...document.querySelectorAll('#mt-members .modal-member-row')].map(r=>({
    name:   r.querySelector('.mm-name').value.trim(),
    rating: r.querySelector('.mm-rating').value
  })).filter(p=>p.name);
  if(editingTeamIdx===null){
    if(D.teams.find(t=>t.name===name)){toast('同じ名前のチームが既にあります');return;}
    D.teams.push({name,players});
    // 新チームの初期パスワードを設定
    if(window.fbSavePassword) {
      window.fbSavePassword(name, '123456').then(()=>{
        toast(`${name} を追加しました（初期パスワード: 123456）`);
      });
    } else {
      toast(`${name} を追加しました（初期パスワード: 123456）`);
    }
  } else {
    D.teams[editingTeamIdx]={name,players}; toast(`${name} を更新しました`);
  }
  inlineEditing = null;
  deleteModeTeamIdx = null;
  save(); closeModal('modal-team'); renderTeams(); refreshTeamSelects();
}
function closeModal(id){ document.getElementById(id).classList.remove('open'); }

// ─────────────────────────────────────────
//  CONFIRM MODAL
// ─────────────────────────────────────────
function showConfirm(title, msg, onOk, okLabel='はい'){
  document.getElementById('mc-title').textContent = title;
  document.getElementById('mc-body').textContent  = msg;
  const btn = document.getElementById('mc-ok-btn');
  btn.textContent = okLabel;
  btn.onclick = ()=>{ closeModal('modal-confirm'); onOk(); };
  document.getElementById('modal-confirm').classList.add('open');
}

// ─────────────────────────────────────────
//  NUMPAD
// ─────────────────────────────────────────
let _numpadTarget = null;
let _numpadVal = '';

function openNumpad(input) {
  _numpadTarget = input;
  _numpadVal = input.value || '';
  const display = document.getElementById('numpad-display');
  const label   = document.getElementById('numpad-label');
  const isCricket = input.dataset.cricket === 'true';
  label.textContent = isCricket ? 'クリケット STATS（例: 3.50）' : 'ゼロワン STATS（例: 85.5）';
  display.textContent = _numpadVal || '0';
  document.getElementById('numpad-overlay').classList.add('open');
}
function npInput(ch) {
  if(ch === '.' && _numpadVal.includes('.')) return;
  if(_numpadVal === '0' && ch !== '.') _numpadVal = '';
  _numpadVal += ch;
  document.getElementById('numpad-display').textContent = _numpadVal || '0';
}
function npDelete() {
  _numpadVal = _numpadVal.slice(0, -1);
  document.getElementById('numpad-display').textContent = _numpadVal || '0';
}
function confirmNumpad() {
  if(_numpadTarget) {
    _numpadTarget.value = _numpadVal;
    _numpadTarget.dispatchEvent(new Event('input', {bubbles:true}));
    _numpadTarget.dispatchEvent(new Event('change', {bubbles:true}));
  }
  closeNumpad();
}
function closeNumpad() {
  document.getElementById('numpad-overlay').classList.remove('open');
  _numpadTarget = null;
}

// ─────────────────────────────────────────
//  UTILS
// ─────────────────────────────────────────
function toast(msg){
  const el=document.getElementById('toast');
  el.textContent=msg; el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'), 2600);
}
function todayStr(){
  const d=new Date();
  const mm=String(d.getMonth()+1).padStart(2,'0');
  const dd=String(d.getDate()).padStart(2,'0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}
function retryFbConnect(){ location.reload(); }

// ─────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────
async function init(){
  const ls = document.getElementById('login-screen');
  if(ls) ls.style.display = 'flex';
  load();
  const d=new Date();
  document.getElementById('hdr-date').textContent = `${d.getMonth()+1}/${d.getDate()}`;
  document.getElementById('s-date').value = todayStr();

  if(!D.teams.length){
    D.teams=[
      {name:'ふじさき',       players:[{name:'',rating:''},{name:'',rating:''},{name:'',rating:''},{name:'',rating:''}]},
      {name:'ハッチ',         players:[{name:'',rating:''},{name:'',rating:''},{name:'',rating:''},{name:'',rating:''}]},
      {name:'¥500バーグ食堂', players:[{name:'',rating:''},{name:'',rating:''},{name:'',rating:''},{name:'',rating:''}]},
      {name:'デイリー',       players:[{name:'',rating:''},{name:'',rating:''},{name:'',rating:''},{name:'',rating:''}]},
    ];
  }

  buildGames();
  refreshTeamSelects();
  renderRobin(); renderHistory();
  document.getElementById('modal-team').addEventListener('click',function(e){
    if(e.target===this) closeModal('modal-team');
  });
  document.getElementById('modal-confirm').addEventListener('click',function(e){
    if(e.target===this) closeModal('modal-confirm');
  });
  refreshStatsTeamSel();
  renderHome();

  const startSync = () => {
    window._appReady = true;
    if(window.fbMigratePasswords) {
      window.fbMigratePasswords(PASSWORDS);
    }
    if(window._fbLatestData !== undefined) {
      const overlay = document.getElementById('fb-connecting-overlay');
      if(overlay) overlay.style.display = 'none';
      if(window._fbLatestData && Object.keys(window._fbLatestData).length > 0) {
        applyFirebaseData(window._fbLatestData);
        checkAutoApproval();
        renderRobin(); renderHistory(); renderSchedule();
        renderTeams(); refreshTeamSelects(); refreshStatsTeamSel(); renderHome();
      }
    }
    // セッション復元（リロード後の自動ログイン）
    const savedSession = sessionStorage.getItem('gcpSession');
    if(savedSession) {
      try {
        const {team, isAdmin} = JSON.parse(savedSession);
        currentUser = {team: isAdmin ? null : team, isAdmin, isGuest: false};
        const overlay = document.getElementById('fb-connecting-overlay');
        if(overlay) overlay.style.display = 'none';
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('hdr-login-btn').style.display = 'none';
        const badge = document.getElementById('hdr-login-badge');
        badge.textContent = isAdmin ? '管理者 ✕' : team + ' ✕';
        badge.style.display = 'inline-block';
        const teamsBtn = document.getElementById('hdr-teams-btn');
        if(teamsBtn) teamsBtn.style.display = 'inline-block';
        if(!isAdmin){ lockMyTeam(team); document.getElementById('s-my-name').textContent = team; }
        else { document.getElementById('s-my-name').textContent = '管理者'; }
        document.querySelectorAll('.nav-btn').forEach(b=>b.style.display='');
        renderTeams();
        const savedView = sessionStorage.getItem('gcpView') || 'home';
        const navBtn = document.querySelector(`.nav-btn[onclick*="'${savedView}'"]`);
        showView(savedView, navBtn);
      } catch(e) {
        sessionStorage.removeItem('gcpSession');
        sessionStorage.removeItem('gcpView');
      }
    }
    fbSync();
  };

  if(window._firebaseReady) {
    startSync();
  } else {
    document.addEventListener('firebaseReady', startSync, { once: true });
    setTimeout(() => {
      if(!window._firebaseReady) {
        document.addEventListener('firebaseReady', startSync, { once: true });
      }
    }, 1000);
  }

  // 全角数字→半角 グローバル変換
  document.addEventListener('input', function(e){
    const el = e.target;
    if(el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') return;
    if(el.type === 'password') return;
    const before = el.value;
    const after = before
      .replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
      .replace(/[．。]/g, '.')
      .replace(/,/g, '.');
    if(before !== after){
      const pos = el.selectionStart;
      el.value = after;
      try{ el.setSelectionRange(pos, pos); }catch(e){}
      el.dispatchEvent(new Event('input', {bubbles:false}));
    }
  }, true);
}
document.addEventListener("DOMContentLoaded", init);
