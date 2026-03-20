// ─────────────────────────────────────────
//  AUTH
// ─────────────────────────────────────────
async function doLogin(){
  const team = document.getElementById('login-team-sel').value;
  const pw   = document.getElementById('login-pw').value;
  const err  = document.getElementById('login-err');
  if(!team){ err.textContent='チームを選択してください'; return; }
  if(!pw)  { err.textContent='パスワードを入力してください'; return; }

  if(window._fbLatestData === undefined) {
    const overlay = document.getElementById('fb-login-overlay');
    if(overlay) overlay.style.display = 'flex';
    const waitAndLogin = setInterval(() => {
      if(window._fbLatestData !== undefined) {
        clearInterval(waitAndLogin);
        if(overlay) overlay.style.display = 'none';
        doLogin();
      }
    }, 300);
    return;
  }

  err.textContent = '🔄 確認中...';
  const loginBtn = document.querySelector('#login-screen button');
  if(loginBtn) loginBtn.disabled = true;

  let ok = false;
  if(window.fbCheckPassword) {
    ok = await window.fbCheckPassword(team, pw);
  }

  if(loginBtn) loginBtn.disabled = false;
  if(!ok){ err.textContent='パスワードが違います'; return; }
  err.textContent = '';
  const isAdmin = team === '__admin__';
  currentUser = {team: isAdmin ? null : team, isAdmin, isGuest: false};
  sessionStorage.setItem('gcpSession', JSON.stringify({team, isAdmin}));
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('hdr-login-btn').style.display = 'none';
  const badge = document.getElementById('hdr-login-badge');
  badge.textContent = isAdmin ? '管理者 ✕' : team + ' ✕';
  badge.style.display = 'inline-block';
  const teamsBtn = document.getElementById('hdr-teams-btn');
  if(teamsBtn) teamsBtn.style.display = 'inline-block';
  const sc2 = document.getElementById('stats-content');
  if(sc2) sc2.innerHTML = '<div class="empty-state"><div class="ico">📊</div><p>チームを選択してください</p></div>';
  const statsSel2 = document.getElementById('stats-team-sel');
  if(statsSel2) statsSel2.value = '';
  if(!isAdmin){
    lockMyTeam(team);
    document.getElementById('s-my-name').textContent = team;
  } else {
    document.getElementById('s-my-name').textContent = '管理者';
  }
  document.querySelectorAll('.nav-btn').forEach(b=>b.style.display='');
  renderTeams();
  const homeBtn = document.getElementById('nav-home');
  showView('home', homeBtn);
  showScoreResumeBanner();
}

function quickLogin(team){
  const m = document.getElementById('modal-quick-login');
  document.getElementById('ql-team-name').textContent = team;
  document.getElementById('ql-pw').value = '';
  document.getElementById('ql-err').textContent = '';
  m.classList.add('open');
  setTimeout(()=>document.getElementById('ql-pw').focus(), 200);
  window._quickLoginTeam = team;
}

async function quickLoginSubmit(){
  const team = window._quickLoginTeam;
  const pw = document.getElementById('ql-pw').value;
  const errEl = document.getElementById('ql-err');
  if(!pw){ errEl.textContent = 'パスワードを入力してください'; return; }
  errEl.textContent = '🔄 確認中...';
  const ok = window.fbCheckPassword ? await window.fbCheckPassword(team, pw) : false;
  if(!ok){
    errEl.textContent = 'パスワードが違います';
    return;
  }
  errEl.textContent = '';
  document.getElementById('modal-quick-login').classList.remove('open');
  currentUser = {team, isAdmin:false, isGuest:false};
  sessionStorage.setItem('gcpSession', JSON.stringify({team, isAdmin:false}));
  const badge = document.getElementById('hdr-login-badge');
  badge.textContent = team + ' ✕';
  badge.style.display = 'inline-block';
  document.getElementById('hdr-teams-btn').style.display = 'none';
  lockMyTeam(team);
  renderHome();
  fbSync();
}

function showLoginScreen(){
  const ls = document.getElementById('login-screen');
  if(ls) ls.style.display = 'flex';
}

function skipLogin(){
  currentUser = {team:null, isAdmin:false, isGuest:true};
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('hdr-login-btn').style.display = 'inline-block';
  const teamsBtnG = document.getElementById('hdr-teams-btn');
  if(teamsBtnG) teamsBtnG.style.display = 'none';
  document.querySelectorAll('.nav-btn').forEach(b=>{
    const v = b.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
    if(v==='score') b.style.display='none';
  });
  const homeBtnG = document.getElementById('nav-home');
  showView('home', homeBtnG);
}

function doLogout(){
  showConfirm('ログアウト', 'ログアウトしますか？', ()=>{
    sessionStorage.removeItem('gcpSession');
    sessionStorage.removeItem('gcpView');
    clearScoreFormUI();
    const sc = document.getElementById('stats-content');
    if(sc) sc.innerHTML = '<div class="empty-state"><div class="ico">📊</div><p>チームを選択してください</p></div>';
    const statsSel = document.getElementById('stats-team-sel');
    if(statsSel) statsSel.value = '';
    currentUser = null;
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('login-pw').value = '';
    document.getElementById('login-err').textContent = '';
    document.getElementById('hdr-login-badge').style.display = 'none';
    document.getElementById('hdr-login-btn').style.display = 'none';
    const teamsBtnL = document.getElementById('hdr-teams-btn');
    if(teamsBtnL) teamsBtnL.style.display = 'none';
    document.querySelectorAll('.nav-btn').forEach(b=>b.style.display='');
    showView('score', document.querySelector('.nav-btn'));
  }, 'ログアウト');
}

function lockMyTeam(team){
  const sel = document.getElementById('s-my-team');
  if(!sel) return;
  if(![...sel.options].some(o=>o.value===team)){
    const opt = document.createElement('option');
    opt.value = opt.textContent = team;
    sel.appendChild(opt);
  }
  sel.value = team;
  onMyTeamChange(true);
}

function quickView(team){
  currentUser = {team: team, isAdmin: false, isGuest: true};
  document.getElementById('login-screen').style.display = 'none';
  document.querySelectorAll('.nav-btn').forEach(b=>{
    const v = b.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
    if(v==='score') b.style.display='none';
  });
  const homeBtn = document.getElementById('nav-home');
  showView('home', homeBtn);
  renderHome();
}

// ── パスワード変更（管理者） ──
function changePassword(teamName, idx){
  const input = document.getElementById('pw-input-' + idx);
  if(!input || !input.value){ toast('新しいパスワードを入力してください'); return; }
  const newPw = input.value.trim();
  if(newPw.length < 4){ toast('パスワードは4文字以上にしてください'); return; }
  const label = teamName==='__admin__' ? '管理者' : teamName;
  showConfirm('🔐 パスワード変更', `${label} のパスワードを変更しますか？`, async ()=>{
    if(window.fbSavePassword) {
      const ok = await window.fbSavePassword(teamName, newPw);
      if(!ok) { toast('❌ 保存に失敗しました'); return; }
    }
    toast(`${label} のパスワードを変更しました`); input.value='';
  }, '変更する');
}

function togglePwSelf(){
  const body  = document.getElementById('pw-self-body');
  const arrow = document.getElementById('pw-self-arrow');
  if(!body) return;
  const open = body.style.display === 'none';
  body.style.display  = open ? 'block' : 'none';
  arrow.textContent   = open ? '▲ 閉じる' : '▼ 開く';
}

async function changeSelfPassword(){
  if(!currentUser || currentUser.isAdmin || currentUser.isGuest) return;
  const team    = currentUser.team;
  const current = document.getElementById('pw-current').value;
  const newPw   = document.getElementById('pw-new').value.trim();
  const newPw2  = document.getElementById('pw-new2').value.trim();
  const err     = document.getElementById('pw-self-err');
  err.textContent = '';

  if(!current)         { err.textContent = '現在のパスワードを入力してください'; return; }
  if(!newPw)           { err.textContent = '新しいパスワードを入力してください'; return; }
  if(newPw.length < 4) { err.textContent = '4文字以上で入力してください'; return; }
  if(newPw !== newPw2) { err.textContent = '新しいパスワードが一致しません'; return; }

  err.textContent = '🔄 確認中...';
  const currentOk = window.fbCheckPassword ? await window.fbCheckPassword(team, current) : false;
  err.textContent = '';
  if(!currentOk) { err.textContent = '現在のパスワードが違います'; return; }
  if(newPw === current) { err.textContent = '現在と同じパスワードは使えません'; return; }

  showConfirm('🔑 パスワード変更', `${team} のパスワードを変更しますか？`, async ()=>{
    if(window.fbSavePassword) {
      const ok = await window.fbSavePassword(team, newPw);
      if(!ok) { toast('❌ 保存に失敗しました'); return; }
    }
    document.getElementById('pw-current').value = '';
    document.getElementById('pw-new').value = '';
    document.getElementById('pw-new2').value = '';
    toast('✅ パスワードを変更しました');
  }, '変更する');
}
