import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-check.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyD-Li0Wdq11eWhkBzfFgOX2ZG9qzodv_94",
  authDomain: "gcp-league-677e9.firebaseapp.com",
  databaseURL: "https://gcp-league-677e9-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "gcp-league-677e9",
  storageBucket: "gcp-league-677e9.firebasestorage.app",
  messagingSenderId: "510463380108",
  appId: "1:510463380108:web:7e052df921d7a07b04c9a9"
};

const app = initializeApp(firebaseConfig);
initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider('6LfGL4osAAAAAK1MvNL5iwIgPmDrtTscgGLwJGOa'),
  isTokenAutoRefreshEnabled: true
});
const auth = getAuth(app);
signInAnonymously(auth).catch(e => console.error('Anonymous auth error:', e));
const db = getDatabase(app);
const dataRef = ref(db, 'gcpLeague');

// 書き込みは全てサーバーAPI経由。クライアントはgcpLeagueノードを直接書き換えない（読み取りのみ）。
const API_BASE = 'https://gcp-ted-league-api.vercel.app/api';

async function apiCall(action, payload) {
  const headers = { 'Content-Type': 'application/json' };
  if (window._sessionToken) headers['Authorization'] = `Bearer ${window._sessionToken}`;
  const res = await fetch(`${API_BASE}/db`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action, payload }),
  });
  const data = await res.json().catch(() => ({ ok: false }));
  if (!res.ok || !data.ok) {
    throw new Error((data && data.error) || `api ${action} failed: ${res.status}`);
  }
  return data;
}

// チームのみ部分更新（自チーム or 管理者のみサーバー側で許可）
window.fbSave = function(data) {
  if (data.teams === undefined) return Promise.resolve();
  return apiCall('saveTeams', { teams: data.teams })
    .then(() => {
      const badge = document.getElementById('sync-badge');
      if(badge){ badge.textContent='✅ 保存済み'; badge.className='sync-badge ok'; badge.style.opacity='1'; setTimeout(()=>{ badge.style.opacity='0'; }, 2000); }
    })
    .catch((e) => {
      console.error('fbSave error:', e);
      const badge = document.getElementById('sync-badge');
      if(badge){ badge.textContent='❌ 保存失敗'; badge.className='sync-badge err'; badge.style.opacity='1'; }
      throw e;
    });
};

// pendingMatches
window.fbPushPending = async function(record) {
  const clean = Object.fromEntries(Object.entries(record).filter(([k])=>k!=='_fbKey'));
  const { fbKey } = await apiCall('pushPending', { record: clean });
  return fbKey;
};
window.fbUpdatePending = function(fbKey, data) {
  return apiCall('updatePending', { fbKey, data });
};
window.fbRemovePending = function(fbKey) {
  return apiCall('removePending', { fbKey });
};

// pending解決系（相互一致照合・強制承認・72時間タイムアウト自動承認・却下）
window.fbSubmitOpponentResult = function(fbKey, submissionY) {
  return apiCall('submitOpponentResult', { fbKey, submissionY });
};
window.fbForceApprovePending = function(fbKey) {
  return apiCall('forceApprovePending', { fbKey });
};
window.fbResolveTimeoutPending = function(fbKey) {
  return apiCall('resolveTimeoutPending', { fbKey });
};
window.fbRejectPending = function(fbKey) {
  return apiCall('rejectPending', { fbKey });
};

// teamRenames
window.fbSaveTeamRenames = function(renames) {
  return apiCall('saveTeamRenames', { renames });
};

// schedule extras
window.fbSaveScheduleExtras = function(items) {
  return apiCall('saveSchedule', { items });
};

// matches（管理者専用）
window.fbPushMatch = async function(record) {
  const clean = Object.fromEntries(Object.entries(record).filter(([k])=>k!=='_fbKey'));
  const { fbKey } = await apiCall('pushMatch', { record: clean });
  return fbKey;
};
window.fbUpdateMatch = function(fbKey, data) {
  return apiCall('updateMatch', { fbKey, data });
};
window.fbRemoveMatch = function(fbKey) {
  return apiCall('removeMatch', { fbKey });
};
window.fbClearMatches = function() {
  return apiCall('clearMatches', {});
};

// rejectedNotifs
window.fbUpdateNotif = function(fbKey, data) {
  return apiCall('updateNotif', { fbKey, data });
};
window.fbRemoveNotif = function(fbKey) {
  return apiCall('dismissNotif', { fbKey });
};
window.fbRemoveNotifById = function(id) {
  return apiCall('dismissNotif', { id });
};

// onValueで初回データ取得 → オーバーレイを消す → 以降もリアルタイム同期
onValue(dataRef, (snapshot) => {
  const data = snapshot.exists() ? snapshot.val() : {};
  window._fbLatestData = data;

  // オーバーレイを消す（初回接続完了）
  const overlay = document.getElementById('fb-connecting-overlay');
  if(overlay) overlay.style.display = 'none';

  // すでにアプリが起動済みなら即反映
  if(window._appReady) {
    if(typeof applyFirebaseData === 'function') {
      applyFirebaseData(data);
      if(typeof checkAutoApproval === 'function') checkAutoApproval();
      renderRobin(); renderHistory(); renderSchedule();
      renderTeams(); refreshTeamSelects(); refreshStatsTeamSel(); renderHome();
    }
  }
}, (error) => {
  // 接続エラー時
  const overlay = document.getElementById('fb-connecting-overlay');
  const retryBtn = document.getElementById('fb-retry-btn');
  const divs = overlay ? overlay.querySelectorAll('div') : [];
  if(divs[0]) divs[0].textContent = '⚠️';
  if(divs[1]) divs[1].textContent = 'CONNECTION FAILED';
  if(divs[2]) divs[2].textContent = 'サーバーに接続できませんでした';
  if(retryBtn) retryBtn.style.display = 'inline-block';
});

// チーム名変更時にパスワードキーを付け替える（管理者パスワードでの認証が必要）
window.fbRenamePasswordKey = async function(oldTeam, newTeam) {
  const authPassword = window.prompt('パスワード引き継ぎのため、管理者パスワードを入力してください');
  if(!authPassword) return;
  try {
    const res = await fetch(`${API_BASE}/rename-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldTeam, newTeam, authPassword }),
    });
    const data = res.ok ? await res.json() : { ok: false };
    if(!data.ok && typeof toast === 'function') toast('⚠️ パスワードの引き継ぎに失敗しました（後で管理者パネルから再設定してください）');
  } catch(e) {
    console.error('fbRenamePasswordKey error:', e);
  }
};

// パスワード照合・保存はVercel API経由（passwordsノードはクライアントから直接読み書きしない）
window.fbCheckPassword = async function(team, password) {
  try {
    const res = await fetch(`${API_BASE}/check-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team, password }),
    });
    if(!res.ok) return false;
    const data = await res.json();
    if(data.ok && data.token) window._sessionToken = data.token;
    return !!data.ok;
  } catch(e) {
    console.error('Password check error:', e);
    return false;
  }
};

// authTeam/authPassword: 本人の現在パスワード、または管理者(__admin__)のパスワード
window.fbSavePassword = async function(team, newPassword, authTeam, authPassword) {
  try {
    const res = await fetch(`${API_BASE}/set-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team, newPassword, authTeam, authPassword }),
    });
    if(!res.ok) return false;
    const data = await res.json();
    return !!data.ok;
  } catch(e) {
    console.error('Password save error:', e);
    return false;
  }
};

window._firebaseReady = true;
document.dispatchEvent(new Event('firebaseReady'));
