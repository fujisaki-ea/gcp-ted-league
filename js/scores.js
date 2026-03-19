// ─────────────────────────────────────────
//  PLAYER COUNT & FORFEIT
// ─────────────────────────────────────────
const GALON_IDX    = [9, 14];
const SINGLES_IDX  = [4, 8, 10, 13];

let playerCount = 4;
let forfeitSinglesIdx = null;

function setPlayerCount(n){
  playerCount = n;
  document.querySelectorAll('.player-count-btn').forEach(b=>{
    b.classList.toggle('active', parseInt(b.dataset.count)===n);
  });
  applyForfeitRules();
}

function applyForfeitRules(){
  const notice = document.getElementById('forfeit-notice');

  GAMES.forEach((gd, idx)=>{
    if(!gameResults[idx].forfeit) return;
    gameResults[idx].winner = null;
    gameResults[idx].forfeit = false;
    collapseOpen[idx] = true;
  });
  forfeitSinglesIdx = null;
  buildGames();
  updateLiveScore();

  if(playerCount >= 4){
    notice.style.display = 'none';
    updateProgress();
    return;
  }

  if(playerCount <= 2){
    GAMES.forEach((gd, idx)=>{
      setForfeit(idx);
    });
    notice.style.display = 'block';
    notice.innerHTML = '⚠️ 全試合不戦敗（相手チームWIN）';
    updateProgress();
    return;
  }

  // 3人: ガロン2試合 + シングルス1試合（選択式）
  GALON_IDX.forEach(idx => setForfeit(idx));

  notice.style.display = 'block';
  const singlesOptions = SINGLES_IDX.map(idx=>{
    const gd = GAMES[idx];
    return `<button class="singles-forfeit-btn" data-idx="${idx}" onclick="setSinglesForfeit(${idx})">${gd.g}G ${gd.label}</button>`;
  }).join('');
  notice.innerHTML = `⚠️ ガロン2試合（10G・15G）は自動で不戦敗です。<br>不戦敗にするシングルスを1つ選んでください：<br><div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:6px;">${singlesOptions}</div>`;
  updateProgress();
}

function setSinglesForfeit(idx){
  if(forfeitSinglesIdx !== null){
    clearForfeit(forfeitSinglesIdx);
  }
  forfeitSinglesIdx = idx;
  setForfeit(idx);
  document.querySelectorAll('.singles-forfeit-btn').forEach(b=>{
    b.classList.toggle('sf-active', parseInt(b.dataset.idx)===idx);
  });
}

function setForfeit(idx){
  gameResults[idx].winner = 'opp';
  gameResults[idx].forfeit = true;
  delete collapseOpen[idx];
  buildGames();
  updateLiveScore();
}

function clearForfeit(idx){
  gameResults[idx].winner = null;
  gameResults[idx].forfeit = false;
  collapseOpen[idx] = true;
  buildGames();
  updateLiveScore();
}

// ─────────────────────────────────────────
//  SCORE INPUT
// ─────────────────────────────────────────
let gameResults = GAMES.map(()=>({winner:null, players:[],forfeit:false}));
let collapseOpen = {};

function buildGames(skipSave=false){
  if(!skipSave){
    gameResults.forEach((r,idx)=>{
      const pg = document.getElementById('pg-'+idx);
      if(!pg) return;
      const names   = [...pg.querySelectorAll('.pe-name')].map(s=>s.value);
      const ratings = [...pg.querySelectorAll('.pe-rating')].map(s=>s.value);
      r.players = names.map((n,i)=>({name:n,rating:ratings[i]||''}));
    });
  }
  const wrap = document.getElementById('games-wrap');
  wrap.innerHTML = '';
  GAMES.forEach((gd, idx) => {
    const r = gameResults[idx];
    const decided  = r.winner !== null;
    const isForfeit = !!r.forfeit;
    const collapsed = decided && !collapseOpen[idx];

    const isCricket = gd.label.includes('クリケット');
    let playerRows = '';
    for(let p=0; p<gd.n; p++){
      const saved = (gameResults[idx].players||[])[p] || {};
      const initFlight = getFlight(saved.rating||'', isCricket);
      const initBadgeStyle = initFlight ? `background:${initFlight.bg};color:${initFlight.color};` : 'background:transparent;';
      const initBadgeText = initFlight ? initFlight.label : '';
      playerRows += `<div class="player-entry" style="grid-template-columns:1fr 70px 36px;">
        <select class="no-mb pe-name" onchange="onPlayerChange(${idx})"><option value="">— 選手 ${p+1} —</option></select>
        ${statsInput(isCricket, saved.rating||'')}
        <span class="pe-flight-badge" style="${initBadgeStyle}">${initBadgeText}</span>
      </div>`;
    }

    let cls = 'game-row';
    if(isForfeit)            cls += ' is-forfeit';
    else if(r.winner==='my') cls += ' decided-win';
    else if(r.winner==='opp')cls += ' decided-lose';
    if(collapsed)            cls += ' done-collapsed';

    let badge = '';
    if(isForfeit)            badge = '<span class="game-done-badge f">不戦敗</span>';
    else if(r.winner==='my') badge = '<span class="game-done-badge w">MY WIN</span>';
    else if(r.winner==='opp')badge = '<span class="game-done-badge l">OPP WIN</span>';

    const div = document.createElement('div');
    div.className = cls; div.id = 'gr-'+idx;
    div.dataset.forfeit = isForfeit ? '1' : '0';
    div.innerHTML = `
      <div class="game-head" onclick="toggleGameCollapse(${idx})" style="cursor:pointer;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="game-num">${gd.g}G</span>
          <span class="game-type-lbl">${gd.label}</span>
        </div>
        <span id="gbadge-${idx}">${badge}</span>
      </div>
      <div class="game-players-grid" id="pg-${idx}">${playerRows}</div>
      <div class="win-btns">
        <button class="win-btn w ${r.winner==='my'?'sel':''}" onclick="event.stopPropagation();setWinner(${idx},'my')">MY WIN ✓</button>
        <div class="vs-mid">VS</div>
        <button class="win-btn l ${r.winner==='opp'?'sel':''}" onclick="event.stopPropagation();setWinner(${idx},'opp')">OPP WIN ✗</button>
      </div>`;
    wrap.appendChild(div);
  });
  refreshTeamSelects();
}

function setWinner(idx, who){
  const pg = document.getElementById('pg-'+idx);
  if(pg && who !== null){
    const namesSels   = [...pg.querySelectorAll('.pe-name')];
    const ratingSels  = [...pg.querySelectorAll('.pe-rating')];
    for(let i=0; i<namesSels.length; i++){
      if(!namesSels[i].value){
        toast('⚠️ 選手名を選択してください');
        return;
      }
      if(!ratingSels[i].value){
        toast('⚠️ 選手のスタッツを入力してください');
        ratingSels[i].style.borderColor = 'var(--lose)';
        ratingSels[i].focus();
        return;
      }
      ratingSels[i].style.borderColor = '';
    }
  }
  gameResults[idx].winner = (gameResults[idx].winner===who) ? null : who;
  if(gameResults[idx].winner !== null) delete collapseOpen[idx];
  else collapseOpen[idx] = true;
  buildGames();
  updateLiveScore(); updateProgress(); highlightUnentered();

  if(gameResults[idx].winner !== null){
    const next = gameResults.findIndex((r, i) => i > idx && r.winner === null && !r.forfeit);
    if(next !== -1){
      setTimeout(()=>{
        const el = document.getElementById('gr-' + next);
        if(el) el.scrollIntoView({behavior:'smooth', block:'center'});
      }, 150);
    }
  }
}

function updateGameBadge(idx){
  const badge = document.getElementById('gbadge-'+idx);
  if(!badge) return;
  const r = gameResults[idx];
  if(!r.winner){ badge.innerHTML=''; return; }
  const isForfeit = r.forfeit;
  if(isForfeit){
    badge.innerHTML = '<span class="game-done-badge f">不戦敗</span>';
  } else if(r.winner==='my'){
    badge.innerHTML = '<span class="game-done-badge w">MY WIN</span>';
  } else {
    badge.innerHTML = '<span class="game-done-badge l">OPP WIN</span>';
  }
}

function toggleGameCollapse(idx){
  if(gameResults[idx].winner === null && !gameResults[idx].forfeit) return;
  if(collapseOpen[idx]) delete collapseOpen[idx];
  else collapseOpen[idx] = true;
  buildGames();
}

function updateLiveScore(){
  const my  = gameResults.filter(r=>r.winner==='my').length;
  const opp = gameResults.filter(r=>r.winner==='opp').length;
  const el  = document.getElementById('s-my-score');
  el.textContent = my; el.classList.toggle('leading', my>opp);
  document.getElementById('s-opp-score').textContent = opp;
}
function updateProgress(){
  const done = gameResults.filter(r=>r.winner!==null).length;
  document.getElementById('prog-txt').textContent = `${done} / 15 ゲーム入力済み`;
  document.getElementById('prog-fill').style.width = (done/15*100)+'%';
}

function refreshTeamSelects(){
  // ログイン画面のチーム選択を動的に更新
  const loginSel = document.getElementById('login-team-sel');
  if(loginSel && D.teams && D.teams.length) {
    const cur = loginSel.value;
    loginSel.innerHTML = '<option value="">-- チームを選択 --</option>';
    D.teams.forEach(t => {
      const o = document.createElement('option');
      o.value = t.name; o.textContent = t.name;
      loginSel.appendChild(o);
    });
    const adminOpt = document.createElement('option');
    adminOpt.value = '__admin__'; adminOpt.textContent = '管理者';
    loginSel.appendChild(adminOpt);
    if(cur) loginSel.value = cur;
  }
  ['s-my-team','s-opp-team'].forEach(id=>{
    const sel=document.getElementById(id); if(!sel)return;
    const cur=sel.value;
    const myTeam = currentUser && !currentUser.isAdmin ? currentUser.team : null;
    sel.innerHTML='<option value="">選択してください</option>';
    D.teams.forEach(t=>{
      if(id==='s-opp-team' && myTeam && t.name===myTeam) return;
      const o=document.createElement('option');o.value=t.name;o.textContent=t.name;sel.appendChild(o);
    });
    if(D.teams.find(t=>t.name===cur)) sel.value=cur;
  });
  populatePlayerDropdowns();
  document.querySelectorAll('.pe-stats').forEach(input => {
    input.addEventListener('input', function(){
      const badge = this.closest('.player-entry')?.querySelector('.pe-flight-badge');
      if(!badge) return;
      const isCricket = this.dataset.cricket === 'true';
      const f = getFlight(this.value, isCricket);
      if(f){ badge.style.background=f.bg; badge.style.color=f.color; badge.textContent=f.label; }
      else { badge.style.background='transparent'; badge.style.color=''; badge.textContent=''; }
    });
  });
}

function onMyTeamChange(){
  document.getElementById('s-my-name').textContent = document.getElementById('s-my-team').value || 'MY TEAM';
  populatePlayerDropdowns();
}
function onOppTeamChange(){
  document.getElementById('s-opp-name').textContent = document.getElementById('s-opp-team').value || 'OPP';
}

function populatePlayerDropdowns(){
  const myName = document.getElementById('s-my-team').value;
  const team   = D.teams.find(t=>t.name===myName);
  const members = team ? team.players : [];

  const singlesIndices = GAMES.map((gd,i)=>gd.n===1?i:-1).filter(i=>i>=0);

  function getSinglesSelected(excludeIdx){
    const selected = new Set();
    singlesIndices.forEach(si=>{
      if(si===excludeIdx) return;
      const pg = document.getElementById('pg-'+si); if(!pg) return;
      const v = pg.querySelector('.pe-name')?.value;
      if(v) selected.add(v);
    });
    return selected;
  }

  GAMES.forEach((gd,idx)=>{
    const pg = document.getElementById('pg-'+idx); if(!pg) return;
    const isSingles = gd.n === 1;
    const allSels = [...pg.querySelectorAll('.pe-name')];
    allSels.forEach((sel, si)=>{
      const cur = sel.value;
      const otherSelected = allSels
        .filter((_,i)=>i!==si)
        .map(s=>s.value)
        .filter(Boolean);
      const singlesUsed = isSingles ? getSinglesSelected(idx) : new Set();

      sel.innerHTML = '<option value="">— 選手 —</option>';
      members.forEach(m=>{
        if(!m.name || otherSelected.includes(m.name)) return;
        const o = document.createElement('option');
        o.value = m.name;
        if(isSingles && singlesUsed.has(m.name)){
          o.textContent = m.name + '（シングルス出場済み）';
          o.disabled = true;
          o.style.color = 'var(--text2)';
        } else {
          o.textContent = m.name;
        }
        sel.appendChild(o);
      });
      const saved = (gameResults[idx]?.players||[])[si]?.name || '';
      const restoreVal = cur || saved;
      if(members.find(m=>m.name===restoreVal)) sel.value=restoreVal;
    });
  });
}

function onPlayerChange(idx){
  const pg = document.getElementById('pg-'+idx); if(!pg) return;
  populatePlayerDropdowns();
}

function collectGameData(){
  return GAMES.map((gd,idx)=>{
    const pg = document.getElementById('pg-'+idx);
    const names   = pg ? [...pg.querySelectorAll('.pe-name')].map(s=>s.value) : [];
    const ratings = pg ? [...pg.querySelectorAll('.pe-rating')].map(s=>s.value) : [];
    const players = names.map((n,i)=>({name:n, rating:ratings[i]||''})).filter(p=>p.name);
    return {game:gd.g, label:gd.label, winner:gameResults[idx].winner, players};
  });
}

function submitScore(){
  if(!currentUser || currentUser.isGuest){
    toast('⚠️ 送信するにはログインが必要です'); return;
  }
  const myTeam  = document.getElementById('s-my-team').value;
  const oppTeam = document.getElementById('s-opp-team').value;
  const date    = document.getElementById('s-date').value || todayStr();
  const season  = document.getElementById('s-season').value || '2025';
  if(!myTeam||!oppTeam)               {toast('チームを選択してください');return;}
  if(myTeam===oppTeam)                 {toast('異なるチームを選択してください');return;}
  const unentered = gameResults.filter(r=>!r.winner).length;
  if(unentered > 0){
    toast(`あと ${unentered} ゲームの勝敗を入力してください`);return;
  }
  if(playerCount === 3 && forfeitSinglesIdx === null){
    toast('不戦敗にするシングルスを選んでください');return;
  }
  const myWins  = gameResults.filter(r=>r.winner==='my').length;
  const oppWins = gameResults.filter(r=>r.winner==='opp').length;
  const games   = collectGameData();

  const ei = D.matches.findIndex(m=>
    m.date===date &&
    ((m.teamA===myTeam&&m.teamB===oppTeam)||(m.teamA===oppTeam&&m.teamB===myTeam))
  );
  if(ei >= 0){
    toast(`⚠️ ${date} の ${myTeam} vs ${oppTeam} は既に登録済みです`);
    return;
  }

  // 管理者：即時反映
  if(currentUser.isAdmin){
    const rec = {id:Date.now(), date, season, teamA:myTeam, teamB:oppTeam, scoreA:myWins, scoreB:oppWins, games};
    showConfirm('🎯 試合結果を送信',
      `${myTeam}  ${myWins} - ${oppWins}  ${oppTeam}\n\nロビン表へ即時反映されます`,
      ()=>{
        D.matches.push(rec);
        save();
        const gData = collectGameData();
        resetScoreForm();
        showResultSummary(myTeam, oppTeam, myWins, oppWins, gData);
      }, '送信する');
    return;
  }

  // 一般チーム：pendingMatches に保存
  if(!D.pendingMatches) D.pendingMatches = [];

  const existingPending = D.pendingMatches.find(p=>
    p.date===date &&
    ((p.teamX===myTeam&&p.teamY===oppTeam)||(p.teamX===oppTeam&&p.teamY===myTeam))
  );

  if(existingPending){
    if(existingPending.teamX===oppTeam && existingPending.teamY===myTeam && !existingPending.submissionY){
      const submissionY = {
        scoreX: oppWins,
        scoreY: myWins,
        games: games,
        submittedAt: Date.now()
      };
      showConfirm('📤 試合結果を申請',
        `${myTeam}  ${myWins} - ${oppWins}  ${oppTeam}\n\n相手チームの申請と照合されます`,
        ()=>{
          existingPending.submissionY = submissionY;
          if(existingPending.submissionX.scoreX === submissionY.scoreX &&
             existingPending.submissionX.scoreY === submissionY.scoreY){
            autoApprovePending(existingPending);
          } else {
            existingPending.status = 'conflict';
          }
          save();
          const gData = collectGameData();
          resetScoreForm();
          if(existingPending.status === 'conflict'){
            toast('⚠️ スコアが一致しません。管理者が確認します');
          } else {
            showResultSummary(myTeam, oppTeam, myWins, oppWins, gData);
          }
          renderHome(); renderHistory();
        }, '申請する');
    } else if(existingPending.teamX===myTeam && existingPending.teamY===oppTeam){
      toast(`⚠️ ${date} の ${myTeam} vs ${oppTeam} は既に申請中です`);
    } else {
      toast(`⚠️ ${date} の ${myTeam} vs ${oppTeam} は既に申請中です`);
    }
    return;
  }

  const submissionX = {
    scoreX: myWins,
    scoreY: oppWins,
    games: games,
    submittedAt: Date.now()
  };
  const pendingRec = {
    id: Date.now(),
    date, season,
    teamX: myTeam,
    teamY: oppTeam,
    submissionX,
    submissionY: null,
    status: 'pending'
  };
  showConfirm('📤 試合結果を申請',
    `${myTeam}  ${myWins} - ${oppWins}  ${oppTeam}\n\n相手チームの確認後にロビン表へ反映されます\n（3日以内に相手が未申請の場合は自動承認）`,
    ()=>{
      D.pendingMatches.push(pendingRec);
      save();
      const gData = collectGameData();
      resetScoreForm();
      toast('⏳ 申請しました。相手チームの確認をお待ちください');
      renderHome(); renderHistory();
    }, '申請する');
}

function resetScoreForm(){
  gameResults = GAMES.map(()=>({winner:null, players:[], forfeit:false}));
  collapseOpen = {};
  playerCount = 4;
  forfeitSinglesIdx = null;
  document.querySelectorAll('.player-count-btn').forEach(b=>{
    b.classList.toggle('active', b.dataset.count==='4');
  });
  document.getElementById('forfeit-notice').style.display='none';
  buildGames(true);
  document.getElementById('s-my-score').textContent = '0';
  document.getElementById('s-opp-score').textContent = '0';
  updateProgress();
}

// ─────────────────────────────────────────
//  PENDING MATCHES (承認ワークフロー)
// ─────────────────────────────────────────
function autoApprovePending(pending){
  if(!D.pendingMatches) D.pendingMatches = [];
  const sx = pending.submissionX;
  const sy = pending.submissionY;

  let mergedGames = sx.games || [];
  if(sy && sy.games && sy.games.length){
    mergedGames = sx.games.map((gx, i)=>{
      const gy = (sy.games||[])[i] || {};
      const combinedPlayers = [...(gx.players||[]), ...(gy.players||[])];
      return { ...gx, players: combinedPlayers };
    });
  }

  const matchRec = {
    id: Date.now(),
    date: pending.date,
    season: pending.season,
    teamA: pending.teamX,
    teamB: pending.teamY,
    scoreA: sx.scoreX,
    scoreB: sx.scoreY,
    games: mergedGames
  };
  D.matches.push(matchRec);
  D.pendingMatches = D.pendingMatches.filter(p=>p.id!==pending.id);
  pending.status = 'approved';
}

function checkAutoApproval(){
  if(!D.pendingMatches) D.pendingMatches = [];
  const now = Date.now();
  const limit72h = 72 * 60 * 60 * 1000;
  let changed = false;
  D.pendingMatches.forEach(p=>{
    if(p.status !== 'pending') return;
    if(p.submissionY) return;
    const age = now - (p.submissionX?.submittedAt || 0);
    if(age >= limit72h){
      autoApprovePending(p);
      changed = true;
    }
  });
  if(changed) save();
}

function cancelPending(id){
  if(!D.pendingMatches) D.pendingMatches = [];
  const p = D.pendingMatches.find(x=>x.id===id);
  if(!p){ toast('申請が見つかりません'); return; }
  const team = currentUser && currentUser.team;
  if(!team){ toast('ログインが必要です'); return; }
  if(p.teamX===team && !p.submissionY){
    showConfirm('🗑️ 申請を取り消す', `${p.date} ${p.teamX} vs ${p.teamY} の申請を取り消しますか？`, ()=>{
      D.pendingMatches = D.pendingMatches.filter(x=>x.id!==id);
      save(); renderHome(); renderHistory();
      toast('申請を取り消しました');
    }, '取り消す');
  } else if(p.teamY===team && p.submissionY){
    showConfirm('🗑️ 申請を取り消す', `${p.date} ${p.teamX} vs ${p.teamY} の申請を取り消しますか？`, ()=>{
      p.submissionY = null;
      p.status = 'pending';
      save(); renderHome(); renderHistory();
      toast('申請を取り消しました');
    }, '取り消す');
  } else {
    toast('取り消せません');
  }
}

function forceApprovePending(id){
  if(!currentUser){ toast('ログインが必要です'); return; }
  if(!D.pendingMatches) D.pendingMatches = [];
  const p = D.pendingMatches.find(x=>x.id===id);
  if(!p){ toast('申請が見つかりません'); return; }
  const isAdmin = currentUser.isAdmin;
  const isOpp = currentUser.team === p.teamY;
  if(!isAdmin && !isOpp){ toast('承認できません'); return; }
  const confirmMsg = isAdmin
    ? `${p.date} ${p.teamX} vs ${p.teamY} を強制承認しますか？`
    : `${p.date} ${p.teamX} vs ${p.teamY} の結果を承認しますか？`;
  showConfirm('✅ 承認', confirmMsg, ()=>{
    if(!p.submissionY){
      p.submissionY = {
        scoreX: p.submissionX.scoreX,
        scoreY: p.submissionX.scoreY,
        games: [],
        submittedAt: Date.now()
      };
    }
    autoApprovePending(p);
    save(); renderHome(); renderHistory(); renderRobin();
    toast('✅ 承認しました');
  }, '承認する');
}

function rejectPending(id){
  if(!D.pendingMatches) D.pendingMatches = [];
  const p = D.pendingMatches.find(x=>x.id===id);
  if(!p){ toast('申請が見つかりません'); return; }
  if(!currentUser){ toast('ログインが必要です'); return; }
  const isAdmin = currentUser.isAdmin;
  const isOpp = currentUser.team === p.teamY;
  if(!isAdmin && !isOpp){ toast('操作できません'); return; }
  showConfirm('❌ 申請を却下', `${p.date} ${p.teamX} vs ${p.teamY} の申請を却下しますか？\n申請チームに通知されます`, ()=>{
    if(!D.rejectedNotifs) D.rejectedNotifs = [];
    D.rejectedNotifs.push({
      id: Date.now(),
      pendingId: p.id,
      teamX: p.teamX,
      teamY: p.teamY,
      date: p.date,
      rejectedAt: Date.now(),
      rejectedBy: isAdmin ? '__admin__' : currentUser.team
    });
    D.pendingMatches = D.pendingMatches.filter(x=>x.id!==id);
    save(); renderHome(); renderHistory();
    toast('❌ 却下しました');
  }, '却下する');
}

function dismissRejectedNotif(id){
  if(!D.rejectedNotifs) D.rejectedNotifs = [];
  D.rejectedNotifs = D.rejectedNotifs.filter(n=>n.id!==id);
  save(); renderHome();
}

// ─────────────────────────────────────────
//  RESULT SUMMARY MODAL
// ─────────────────────────────────────────
function showResultSummary(myTeam, oppTeam, myWins, oppWins, games){
  const won = myWins > oppWins;

  const rows = games.map(g=>{
    if(!g.winner) return '';
    const isForfeit = !!g.forfeit;
    const myWin = g.winner === 'my';
    const color = myWin ? 'var(--win)' : 'var(--lose)';
    const label = isForfeit ? '不戦敗' : (myWin ? 'MY WIN' : 'OPP WIN');
    return `<div style="display:flex;justify-content:space-between;align-items:center;
        padding:5px 0;border-bottom:1px solid var(--border);font-size:12px;">
      <span style="color:var(--text2);">${g.game}G　${g.label}</span>
      <span style="font-weight:700;color:${color};font-size:11px;letter-spacing:1px;">${label}</span>
    </div>`;
  }).join('');

  document.getElementById('mc-title').innerHTML = won
    ? '<span style="color:var(--win)">🏆 試合終了</span>'
    : '<span style="color:var(--lose)">試合終了</span>';
  document.getElementById('mc-body').innerHTML = `
    <div class="result-summary">
      <div style="font-size:12px;color:var(--text2);margin-bottom:6px;">${myTeam} vs ${oppTeam}</div>
      <div class="result-summary-score ${won?'won':'lost'}">${myWins} - ${oppWins}</div>
      <div class="result-summary-label ${won?'won':'lost'}">${won?'WIN！':'LOSE'}</div>
    </div>
    <div style="margin-top:10px;">${rows}</div>`;
  document.getElementById('mc-ok-btn').textContent = '閉じる';
  document.getElementById('mc-ok-btn').onclick = ()=>closeModal('modal-confirm');
  document.getElementById('modal-confirm').classList.add('open');
}

// ─────────────────────────────────────────
//  HIGHLIGHT UNENTERED GAMES
// ─────────────────────────────────────────
function highlightUnentered(){
  GAMES.forEach((gd,idx)=>{
    const row = document.getElementById('gr-'+idx);
    if(!row) return;
    const isForfeit = row.dataset.forfeit === '1';
    const entered   = gameResults[idx].winner !== null;
    row.classList.toggle('unentered-highlight', !entered && !isForfeit);
  });
}
