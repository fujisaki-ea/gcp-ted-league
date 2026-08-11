// ─────────────────────────────────────────
//  PLAYER COUNT & FORFEIT
// ─────────────────────────────────────────
const GALON_IDX    = [9, 14];
const SINGLES_IDX  = [4, 8, 10, 13];

let playerCount = 4;
let forfeitSinglesIdx = null;
let todayMembers = []; // 当日参加選手名の配列（4〜7人）

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
//  TODAY MEMBERS（当日参加メンバー選択）
// ─────────────────────────────────────────
function buildTodayMemberUI(){
  const myName = document.getElementById('s-my-team').value;
  const team   = D.teams.find(t=>t.name===myName);
  const allMembers = team ? (team.players||[]) : [];
  const wrap = document.getElementById('today-members-wrap');
  if(!wrap) return;

  if(!myName){
    wrap.innerHTML = '<div style="font-size:11px;color:var(--text2);padding:2px 0;">チームを選択後にメンバーが表示されます</div>';
    updateTodayMemberCount();
    return;
  }
  if(!allMembers.length){
    wrap.innerHTML = '<div style="font-size:11px;color:var(--text2);padding:2px 0;">メンバーが登録されていません</div>';
    updateTodayMemberCount();
    return;
  }

  wrap.innerHTML = allMembers.map(m=>{
    const sel = todayMembers.includes(m.name);
    return `<label style="display:inline-flex;align-items:center;padding:5px 11px;border:1px solid ${sel?'var(--accent)':'var(--border)'};border-radius:20px;font-size:12px;cursor:pointer;margin:2px;background:${sel?'var(--accent)':'transparent'};color:${sel?'#fff':'var(--text1)'};">
      <input type="checkbox" style="display:none;" value="${esc(m.name)}" ${sel?'checked':''} onchange="onTodayMemberChange(this)">
      ${esc(m.name)}
    </label>`;
  }).join('');
  updateTodayMemberCount();
}

function onTodayMemberChange(cb){
  const name = cb.value;
  if(cb.checked){
    if(todayMembers.length >= 7){
      toast('⚠️ 参加メンバーは最大7人です');
      todayMembers = todayMembers.filter(n=>n!==name);
    } else {
      if(!todayMembers.includes(name)) todayMembers.push(name);
    }
  } else {
    todayMembers = todayMembers.filter(n=>n!==name);
  }
  buildTodayMemberUI();
  setPlayerCount(Math.max(todayMembers.length, 1));
  populatePlayerDropdowns();
  saveScoreForm();
}

function updateTodayMemberCount(){
  const el = document.getElementById('today-member-count');
  if(!el) return;
  const n = todayMembers.length;
  const ok = n >= 4 && n <= 7;
  el.textContent = n > 0 ? `${n}人選択中` : '未選択';
  el.style.color = ok ? 'var(--win)' : (n > 0 ? 'var(--lose)' : 'var(--text2)');
}

// ─────────────────────────────────────────
//  SCORE INPUT
// ─────────────────────────────────────────
let gameResults = GAMES.map(()=>({winner:null, players:[],forfeit:false}));
let collapseOpen = {};
let _scoreFormRestored = false;

function saveScoreForm(){
  if(!currentUser || currentUser.isGuest) return;
  const state = {
    myTeam:  document.getElementById('s-my-team')?.value  || '',
    oppTeam: document.getElementById('s-opp-team')?.value || '',
    season:  document.getElementById('s-season')?.value   || '',
    gameResults, collapseOpen, playerCount, forfeitSinglesIdx, todayMembers
  };
  try{ localStorage.setItem('gcpScoreForm', JSON.stringify(state)); }catch(e){}
}

function restoreScoreForm(){
  const saved = localStorage.getItem('gcpScoreForm');
  if(!saved) return;
  try{
    const s = JSON.parse(saved);
    // 管理者以外は自チームのデータのみ復元可能
    if(currentUser && !currentUser.isAdmin && s.myTeam && s.myTeam !== currentUser.team){
      buildGames(true);
      updateLiveScore();
      updateProgress();
      return;
    }
    const myTeamSel  = document.getElementById('s-my-team');
    const oppTeamSel = document.getElementById('s-opp-team');
    if(myTeamSel && s.myTeam && [...myTeamSel.options].some(o=>o.value===s.myTeam)){
      myTeamSel.value = s.myTeam;
      document.getElementById('s-my-name').textContent = s.myTeam;
    }
    if(oppTeamSel && s.oppTeam && [...oppTeamSel.options].some(o=>o.value===s.oppTeam)){
      oppTeamSel.value = s.oppTeam;
      document.getElementById('s-opp-name').textContent = s.oppTeam;
    }
    const seasonSel = document.getElementById('s-season');
    if(seasonSel && s.season) seasonSel.value = s.season;
    gameResults       = s.gameResults || GAMES.map(()=>({winner:null,players:[],forfeit:false}));
    collapseOpen      = s.collapseOpen || {};
    playerCount       = s.playerCount  || 4;
    forfeitSinglesIdx = s.forfeitSinglesIdx ?? null;
    todayMembers      = s.todayMembers || [];
    document.querySelectorAll('.player-count-btn').forEach(b=>{
      b.classList.toggle('active', parseInt(b.dataset.count)===playerCount);
    });
    buildTodayMemberUI();
    buildGames(true);
    populatePlayerDropdowns();
    updateLiveScore();
    updateProgress();
  }catch(e){
    localStorage.removeItem('gcpScoreForm');
  }
}

function buildGames(skipSave=false){
  if(!skipSave){
    gameResults.forEach((r,idx)=>{
      const pg = document.getElementById('pg-'+idx);
      if(!pg) return;
      const names   = [...pg.querySelectorAll('.pe-name')].map(s=>s.value);
      const ratings = [...pg.querySelectorAll('.pe-rating')].map(s=>s.value);
      r.players = names.map((n,i)=>({name:n,rating:ratings[i]||''}));
    });
    saveScoreForm();
  }
  const wrap = document.getElementById('games-wrap');
  wrap.innerHTML = '';
  const myTeamVal  = document.getElementById('s-my-team')?.value;
  const oppTeamVal = document.getElementById('s-opp-team')?.value;
  const teamsReady = !!(oppTeamVal && todayMembers.length > 0);

  GAMES.forEach((gd, idx) => {
    const r = gameResults[idx];
    const decided  = r.winner !== null;
    const isForfeit = !!r.forfeit;
    const collapsed = decided && !collapseOpen[idx];

    // 選手入力：チーム・当日メンバーが揃えば全ゲーム入力可
    const playerLocked = !teamsReady;
    // WINボタン：前ゲームの勝敗が入力済みでないと押せない
    const prevPending = !isForfeit && gameResults.slice(0, idx).some(pr => pr.winner === null && !pr.forfeit);
    const btnLocked = !teamsReady || prevPending;

    const isCricket = gd.label.includes('クリケット');
    let playerRows = '';
    for(let p=0; p<gd.n; p++){
      const saved = (gameResults[idx].players||[])[p] || {};
      const initFlight = getFlight(saved.rating||'', isCricket);
      const initBadgeStyle = initFlight ? `background:${initFlight.bg};color:${initFlight.color};` : 'background:transparent;';
      const initBadgeText = initFlight ? initFlight.label : '';
      const disAttr = playerLocked ? 'disabled' : '';
      playerRows += `<div class="player-entry" style="grid-template-columns:1fr 70px 44px;">
        <select class="no-mb pe-name" onchange="onPlayerChange(${idx})" ${disAttr}><option value="">— 選手 ${p+1} —</option></select>
        ${statsInput(isCricket, saved.rating||'', playerLocked)}
        <span class="pe-flight-badge" style="${initBadgeStyle}">${initBadgeText}</span>
      </div>`;
    }

    let cls = 'game-row';
    if(isForfeit)            cls += ' is-forfeit';
    else if(r.winner==='my') cls += ' decided-win';
    else if(r.winner==='opp')cls += ' decided-lose';
    if(collapsed)            cls += ' done-collapsed';
    if(playerLocked && !decided && !isForfeit) cls += ' input-locked';

    let badge = '';
    if(isForfeit)            badge = '<span class="game-done-badge f">不戦敗</span>';
    else if(r.winner==='my') badge = '<span class="game-done-badge w">MY WIN</span>';
    else if(r.winner==='opp')badge = '<span class="game-done-badge l">OPP WIN</span>';

    const btnDis = btnLocked ? 'disabled' : '';
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
        <button class="win-btn w ${r.winner==='my'?'sel':''}" onclick="event.stopPropagation();setWinner(${idx},'my')" ${btnDis}>MY WIN ✓</button>
        <div class="vs-mid">VS</div>
        <button class="win-btn l ${r.winner==='opp'?'sel':''}" onclick="event.stopPropagation();setWinner(${idx},'opp')" ${btnDis}>OPP WIN ✗</button>
      </div>`;
    wrap.appendChild(div);
  });
  refreshTeamSelects();
}

function setWinner(idx, who){
  const oppTeam = document.getElementById('s-opp-team')?.value;
  if(!oppTeam){
    toast('⚠️ 対戦相手チームを選択してください');
    return;
  }
  // 前のゲームが未決定なら入力不可
  for(let i = 0; i < idx; i++){
    if(gameResults[i].winner === null && !gameResults[i].forfeit){
      toast(`⚠️ ${i+1}G の勝敗を先に入力してください`);
      return;
    }
  }
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
  const seasonSel = document.getElementById('s-season');
  if(seasonSel && !seasonSel._saveListenerAdded){
    seasonSel.addEventListener('change', saveScoreForm);
    seasonSel._saveListenerAdded = true;
  }
  if(!_scoreFormRestored && currentUser && !currentUser.isGuest){
    _scoreFormRestored = true;
    restoreScoreForm();
  }
}

function onMyTeamChange(skipSave=false){
  todayMembers = []; // チーム変更時はリセット
  document.getElementById('s-my-name').textContent = document.getElementById('s-my-team').value || 'MY TEAM';
  buildTodayMemberUI();
  populatePlayerDropdowns();
  if(!skipSave) saveScoreForm();
}
function onOppTeamChange(){
  document.getElementById('s-opp-name').textContent = document.getElementById('s-opp-team').value || 'OPP';
  saveScoreForm();
}

function populatePlayerDropdowns(){
  const myName = document.getElementById('s-my-team').value;
  const team   = D.teams.find(t=>t.name===myName);
  const allMembers = team ? (team.players||[]) : [];

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

  // ゲームごとの累積出場回数を事前計算（0〜idx のゲームだけカウント）
  // buildGames()はDOM→gameResultsを保存してからDOMを再構築するため
  // DOM再構築後はセレクトが空になるが、gameResultsには最新値が残っている
  const cumulativeCounts = []; // cumulativeCounts[idx][name] = そのゲームまでの出場数
  const running = {};
  GAMES.forEach((_, i) => {
    (gameResults[i].players||[]).forEach(p=>{
      if(p.name) running[p.name] = (running[p.name]||0) + 1;
    });
    cumulativeCounts[i] = {...running};
    console.log(`[DEBUG] cumulativeCounts[${i}]:`, JSON.stringify(cumulativeCounts[i]));
  });
  const circleNum = n => ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩'][n-1] || `(${n})`;

  GAMES.forEach((gd,idx)=>{
    const pg = document.getElementById('pg-'+idx); if(!pg) return;
    const isSingles = gd.n === 1;
    const allSels = [...pg.querySelectorAll('.pe-name')];
    const selectCount = cumulativeCounts[idx] || {};
    console.log(`[DEBUG] game${idx+1} selectCount:`, JSON.stringify(selectCount));
    allSels.forEach((sel, si)=>{
      const cur = sel.value;
      const otherSelected = allSels
        .filter((_,i)=>i!==si)
        .map(s=>s.value)
        .filter(Boolean);
      const singlesUsed = isSingles ? getSinglesSelected(idx) : new Set();

      sel.innerHTML = '<option value="">— 選手 —</option>';
      allMembers.forEach(m=>{
        if(!m.name || otherSelected.includes(m.name)) return;
        const isToday = todayMembers.length === 0 || todayMembers.includes(m.name);
        // 当日不参加メンバーは非表示
        if(!isToday) return;
        const o = document.createElement('option');
        o.value = m.name;
        const cnt = selectCount[m.name] || 0;
        const suffix = cnt > 0 ? ` ${circleNum(cnt)}` : '';
        if(isSingles && singlesUsed.has(m.name)){
          o.textContent = m.name + suffix + '（シングルス出場済み）';
          o.disabled = true;
          o.style.color = 'var(--text2)';
        } else {
          o.textContent = m.name + suffix;
        }
        sel.appendChild(o);
      });
      const saved = (gameResults[idx]?.players||[])[si]?.name || '';
      const restoreVal = cur || saved;
      // 当日メンバーの場合のみ値を復元
      const isRestoreOk = todayMembers.length === 0
        ? allMembers.some(m=>m.name===restoreVal)
        : todayMembers.includes(restoreVal);
      if(isRestoreOk) sel.value=restoreVal;
    });
  });
}

function onPlayerChange(idx){
  const pg = document.getElementById('pg-'+idx); if(!pg) return;
  // 変更されたゲームのDOMをgameResultsに先に同期してからカウント
  const names   = [...pg.querySelectorAll('.pe-name')].map(s=>s.value);
  const ratings = [...pg.querySelectorAll('.pe-rating')].map(s=>s.value);
  gameResults[idx].players = names.map((n,i)=>({name:n,rating:ratings[i]||''}));
  populatePlayerDropdowns();
}

function collectGameData(){
  return GAMES.map((gd,idx)=>{
    const pg = document.getElementById('pg-'+idx);
    const names   = pg ? [...pg.querySelectorAll('.pe-name')].map(s=>s.value) : [];
    const ratings = pg ? [...pg.querySelectorAll('.pe-rating')].map(s=>s.value) : [];
    const players = names.map((n,i)=>({name:n, rating:ratings[i]||''})).filter(p=>p.name);
    return {game:gd.g, label:gd.label, winner:gameResults[idx].winner, forfeit:!!gameResults[idx].forfeit, players};
  });
}

function submitScore(){
  if(!currentUser || currentUser.isGuest){
    toast('⚠️ 送信するにはログインが必要です'); return;
  }
  const myTeam  = document.getElementById('s-my-team').value;
  const oppTeam = document.getElementById('s-opp-team').value;
  const date    = document.getElementById('s-date').value || todayStr();
  const season  = document.getElementById('s-season').value || '2026';
  if(!myTeam||!oppTeam)               {toast('チームを選択してください');return;}
  if(myTeam===oppTeam)                 {toast('異なるチームを選択してください');return;}
  // 当日参加メンバー選択チェック（管理者はスキップ）
  if(!currentUser.isAdmin && todayMembers.length === 0){
    toast('⚠️ 当日参加メンバーを選択してください');return;
  }
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
  // 最低出場回数チェック（管理者以外、当日メンバー全員が不戦敗以外で4回以上）
  if(!currentUser.isAdmin && todayMembers.length > 0){
    const appearances = {};
    games.forEach(g=>{
      if(g.forfeit) return;
      (g.players||[]).forEach(p=>{ if(p.name) appearances[p.name]=(appearances[p.name]||0)+1; });
    });
    const underPlayed = todayMembers.filter(name=>(appearances[name]||0)<4);
    if(underPlayed.length > 0){
      toast(`⚠️ 出場回数が4回未満の選手がいます：${underPlayed.join('、')}`);return;
    }
  }

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
      async ()=>{
        try{
          if(window.fbPushMatch){
            const fbKey = await window.fbPushMatch(rec);
            rec._fbKey = fbKey;
          }
          D.matches.push(rec);
          try{ sessionStorage.setItem('gcpLeague', JSON.stringify(D)); }catch(e){}
          const gData = collectGameData();
          resetScoreForm();
          showResultSummary(myTeam, oppTeam, myWins, oppWins, gData);
        }catch(e){
          toast('❌ 送信に失敗しました。接続を確認して再度送信してください');
        }
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
      const submissionY = { scoreX: oppWins, scoreY: myWins, games: games };
      showConfirm('📤 試合結果を申請',
        `${myTeam}  ${myWins} - ${oppWins}  ${oppTeam}\n\n相手チームの申請と照合されます`,
        async ()=>{
          try{
            // 照合・確定はサーバー側で行う（クライアントの判定結果は信用しない）
            const result = await window.fbSubmitOpponentResult(existingPending._fbKey, submissionY);
            const gData = collectGameData();
            resetScoreForm();
            if(result.conflict){
              existingPending.submissionY = { ...submissionY, submittedAt: Date.now() };
              existingPending.status = 'conflict';
              toast('⚠️ スコアが一致しません。修正して再申請してください');
            } else {
              D.pendingMatches = D.pendingMatches.filter(p=>p.id!==existingPending.id);
              if(result.match && !D.matches.some(m=>m._fbKey===result.match._fbKey)){
                D.matches.push(result.match);
              }
              showResultSummary(myTeam, oppTeam, myWins, oppWins, gData);
            }
            try{ sessionStorage.setItem('gcpLeague', JSON.stringify(D)); }catch(e){}
            renderHome(); renderHistory();
          }catch(e){
            toast('❌ 送信に失敗しました。接続を確認して再度送信してください');
          }
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
    async ()=>{
      try{
        if(window.fbPushPending){
          const fbKey = await window.fbPushPending(pendingRec);
          pendingRec._fbKey = fbKey;
        }
        // onValueで既に追加されている場合は重複を避ける
        if(!pendingRec._fbKey || !D.pendingMatches.some(p=>p._fbKey===pendingRec._fbKey)){
          D.pendingMatches.push(pendingRec);
        }
        try{ sessionStorage.setItem('gcpLeague', JSON.stringify(D)); }catch(e){}
        const gData = collectGameData();
        resetScoreForm();
        toast('⏳ 申請しました。相手チームの確認をお待ちください');
        renderHome(); renderHistory();
      }catch(e){
        toast('❌ 送信に失敗しました。接続を確認して再度送信してください');
      }
    }, '申請する');
}

function clearScoreFormUI(){
  _scoreFormRestored = false;
  gameResults = GAMES.map(()=>({winner:null, players:[], forfeit:false}));
  collapseOpen = {};
  playerCount = 4;
  forfeitSinglesIdx = null;
  todayMembers = [];
  document.querySelectorAll('.player-count-btn').forEach(b=>{
    b.classList.toggle('active', b.dataset.count==='4');
  });
  document.getElementById('forfeit-notice').style.display='none';
  buildTodayMemberUI();
  buildGames(true);
  document.getElementById('s-my-score').textContent = '0';
  document.getElementById('s-opp-score').textContent = '0';
  updateProgress();
}
function resetScoreForm(){
  localStorage.removeItem('gcpScoreForm');
  clearScoreFormUI();
}

// ─────────────────────────────────────────
//  PENDING MATCHES (承認ワークフロー)
//  排他制御・期限判定・スコア照合は全てサーバー側(gcp-ted-league-api)で行う
// ─────────────────────────────────────────
const _autoApprovingIds = new Set();

// pending解決結果(match確定 or 何もしない)をローカル状態に反映する共通処理
function applyPendingResolution(pending, match){
  D.pendingMatches = D.pendingMatches.filter(p=>p.id!==pending.id);
  if(match && !D.matches.some(m=>m._fbKey===match._fbKey)){
    D.matches.push(match);
  }
  pending.status = 'approved';
}

async function checkAutoApproval(){
  if(!D.pendingMatches) D.pendingMatches = [];
  const now = Date.now();
  const limit72h = 72 * 60 * 60 * 1000;
  let changed = false;
  for(const p of [...D.pendingMatches]){
    if(p.status !== 'pending') continue;
    if(p.submissionY) continue;
    if(_autoApprovingIds.has(p.id)) continue;
    const age = now - (p.submissionX?.submittedAt || 0);
    if(age >= limit72h && p._fbKey){
      _autoApprovingIds.add(p.id);
      try{
        const result = await window.fbResolveTimeoutPending(p._fbKey);
        if(result.resolved){
          applyPendingResolution(p, result.match);
          changed = true;
        }
      }catch(e){
        console.error('タイムアウト自動承認に失敗:', e);
      }
      _autoApprovingIds.delete(p.id);
    }
  }
  if(changed) try{ sessionStorage.setItem('gcpLeague', JSON.stringify(D)); }catch(e){}
}

function cancelPending(id){
  if(!D.pendingMatches) D.pendingMatches = [];
  const p = D.pendingMatches.find(x=>x.id===id);
  if(!p){ toast('申請が見つかりません'); return; }
  const team = currentUser && currentUser.team;
  if(!team){ toast('ログインが必要です'); return; }
  if(p.teamX===team && !p.submissionY){
    showConfirm('🗑️ 申請を取り消す', `${p.date} ${p.teamX} vs ${p.teamY} の申請を取り消しますか？`, async ()=>{
      try{
        if(window.fbRemovePending && p._fbKey) await window.fbRemovePending(p._fbKey);
        D.pendingMatches = D.pendingMatches.filter(x=>x.id!==id);
        try{ sessionStorage.setItem('gcpLeague', JSON.stringify(D)); }catch(e){}
        renderHome(); renderHistory();
        toast('申請を取り消しました');
      }catch(e){
        toast('❌ 取り消しに失敗しました。接続を確認してください');
      }
    }, '取り消す');
  } else if(p.teamY===team && p.submissionY){
    showConfirm('🗑️ 申請を取り消す', `${p.date} ${p.teamX} vs ${p.teamY} の申請を取り消しますか？`, async ()=>{
      try{
        p.submissionY = null;
        p.status = 'pending';
        if(window.fbUpdatePending && p._fbKey) await window.fbUpdatePending(p._fbKey, {submissionY:null, status:'pending'});
        try{ sessionStorage.setItem('gcpLeague', JSON.stringify(D)); }catch(e){}
        renderHome(); renderHistory();
        toast('申請を取り消しました');
      }catch(e){
        p.submissionY = null;  // ローカルは巻き戻す
        toast('❌ 取り消しに失敗しました。接続を確認してください');
      }
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
  showConfirm('✅ 承認', confirmMsg, async ()=>{
    try{
      const result = await window.fbForceApprovePending(p._fbKey);
      applyPendingResolution(p, result.match);
      try{ sessionStorage.setItem('gcpLeague', JSON.stringify(D)); }catch(e){}
      renderHome(); renderHistory(); renderRobin();
      toast('✅ 承認しました');
    }catch(e){
      toast('❌ 承認に失敗しました。接続を確認してください');
    }
  }, '承認する');
}

function prefillScoreFormWithSubmission(myTeam, oppTeam, date, season, submission){
  localStorage.removeItem('gcpScoreForm');
  gameResults = GAMES.map((_,i)=>{
    const g = (submission.games||[])[i] || {};
    return {winner: g.winner||null, players: g.players||[], forfeit: !!g.forfeit};
  });
  collapseOpen = {};
  playerCount = 4;
  forfeitSinglesIdx = null;
  todayMembers = [];
  _scoreFormRestored = true;
  const navBtn = document.querySelector('.nav-btn[onclick*="\'score\'"]');
  showView('score', navBtn);
  setTimeout(()=>{
    const myTeamSel = document.getElementById('s-my-team');
    const oppTeamSel = document.getElementById('s-opp-team');
    const dateSel = document.getElementById('s-date');
    const seasonSel = document.getElementById('s-season');
    if(myTeamSel && [...myTeamSel.options].some(o=>o.value===myTeam)){
      myTeamSel.value = myTeam;
      onMyTeamChange(true);
      document.getElementById('s-my-name').textContent = myTeam;
    }
    if(oppTeamSel && [...oppTeamSel.options].some(o=>o.value===oppTeam)){
      oppTeamSel.value = oppTeam;
      document.getElementById('s-opp-name').textContent = oppTeam;
    }
    if(dateSel && date) dateSel.value = date;
    if(seasonSel && season) seasonSel.value = season;
    buildGames(true);
    populatePlayerDropdowns();
    updateLiveScore();
    updateProgress();
    saveScoreForm();
  }, 100);
}

async function resubmitConflict(id){
  if(!D.pendingMatches) return;
  const p = D.pendingMatches.find(x=>x.id===id);
  if(!p || !currentUser) return;
  const team = currentUser.team;

  if(p.teamX === team){
    showConfirm('✏️ 修正して再申請',
      `スコアを修正して再申請します。\n現在の申請は取り消され、相手チームも再申請が必要になります。`,
      async ()=>{
        try{
          const submission = p.submissionX;
          if(window.fbRemovePending && p._fbKey) await window.fbRemovePending(p._fbKey);
          D.pendingMatches = D.pendingMatches.filter(x=>x.id!==id);
          try{ sessionStorage.setItem('gcpLeague', JSON.stringify(D)); }catch(e){}
          renderHome();
          prefillScoreFormWithSubmission(team, p.teamY, p.date, p.season, submission);
        }catch(e){
          toast('❌ 操作に失敗しました。接続を確認してください');
        }
      }, '修正する');

  } else if(p.teamY === team){
    showConfirm('✏️ 修正して再申請',
      `スコアを修正して再申請します。`,
      async ()=>{
        try{
          const submission = p.submissionY;
          p.submissionY = null;
          p.status = 'pending';
          if(window.fbUpdatePending && p._fbKey){
            await window.fbUpdatePending(p._fbKey, {submissionY:null, status:'pending'});
          }
          try{ sessionStorage.setItem('gcpLeague', JSON.stringify(D)); }catch(e){}
          renderHome();
          prefillScoreFormWithSubmission(team, p.teamX, p.date, p.season, submission);
        }catch(e){
          p.submissionY = null;
          toast('❌ 操作に失敗しました。接続を確認してください');
        }
      }, '修正する');
  }
}

function rejectPending(id){
  if(!D.pendingMatches) D.pendingMatches = [];
  const p = D.pendingMatches.find(x=>x.id===id);
  if(!p){ toast('申請が見つかりません'); return; }
  if(!currentUser){ toast('ログインが必要です'); return; }
  const isAdmin = currentUser.isAdmin;
  const isOpp = currentUser.team === p.teamY;
  if(!isAdmin && !isOpp){ toast('操作できません'); return; }
  showConfirm('❌ 申請を却下', `${p.date} ${p.teamX} vs ${p.teamY} の申請を却下しますか？\n申請チームに通知されます`, async ()=>{
    try{
      if(!D.rejectedNotifs) D.rejectedNotifs = [];
      const { notif } = await window.fbRejectPending(p._fbKey);
      D.rejectedNotifs.push(notif);
      D.pendingMatches = D.pendingMatches.filter(x=>x.id!==id);
      try{ sessionStorage.setItem('gcpLeague', JSON.stringify(D)); }catch(e){}
      renderHome(); renderHistory();
      toast('❌ 却下しました');
    }catch(e){
      toast('❌ 操作に失敗しました。接続を確認してください');
    }
  }, '却下する');
}

async function dismissRejectedNotif(id){
  if(!D.rejectedNotifs) D.rejectedNotifs = [];
  const n = D.rejectedNotifs.find(x=>x.id===id);
  let removed = false;
  if(n && window.fbRemoveNotif && n._fbKey){
    try{ await window.fbRemoveNotif(n._fbKey); removed = true; }catch(e){ console.error('notif remove failed', e); }
  }
  if(!removed && window.fbRemoveNotifById){
    try{ await window.fbRemoveNotifById(id); }catch(e){ console.error('notif remove by id failed', e); }
  }
  D.rejectedNotifs = D.rejectedNotifs.filter(x=>x.id!==id);
  try{ sessionStorage.setItem('gcpLeague', JSON.stringify(D)); }catch(e){}
  renderHome();
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
      <div style="font-size:12px;color:var(--text2);margin-bottom:6px;">${esc(myTeam)} vs ${esc(oppTeam)}</div>
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
