import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, set, onValue, get } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-check.js";

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
const db = getDatabase(app);
const dataRef = ref(db, 'gcpLeague');
const pwRef = ref(db, 'passwords');

// Firebase保存
window.fbSave = function(data) {
  set(dataRef, data)
    .then(() => {
      const badge = document.getElementById('sync-badge');
      if(badge){ badge.textContent='✅ 保存済み'; badge.className='sync-badge ok'; badge.style.opacity='1'; setTimeout(()=>{ badge.style.opacity='0'; }, 2000); }
    })
    .catch(() => {
      const badge = document.getElementById('sync-badge');
      if(badge){ badge.textContent='❌ 保存失敗'; badge.className='sync-badge err'; badge.style.opacity='1'; }
    });
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

// パスワードをSHA-256でハッシュ化
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'gcp-ted-salt-2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Firebaseからパスワードハッシュを取得して照合
window.fbCheckPassword = async function(team, password) {
  try {
    const snapshot = await get(pwRef);
    if(!snapshot.exists()) return false;
    const passwords = snapshot.val();
    const storedHash = passwords[team];
    if(!storedHash) return false;
    const inputHash = await hashPassword(password);
    return inputHash === storedHash;
  } catch(e) {
    console.error('Password check error:', e);
    return false;
  }
};

// パスワードをハッシュ化してFirebaseに保存
window.fbSavePassword = async function(team, password) {
  try {
    const hash = await hashPassword(password);
    const snapshot = await get(pwRef);
    const current = snapshot.exists() ? snapshot.val() : {};
    current[team] = hash;
    await set(pwRef, current);
    return true;
  } catch(e) {
    console.error('Password save error:', e);
    return false;
  }
};

// 初回：ソースコードのパスワードをFirebaseに移行
window.fbMigratePasswords = async function(passwords) {
  try {
    const snapshot = await get(pwRef);
    if(snapshot.exists()) return; // 既に移行済み
    const hashed = {};
    for(const [team, pw] of Object.entries(passwords)) {
      hashed[team] = await hashPassword(pw);
    }
    await set(pwRef, hashed);
    console.log('Passwords migrated to Firebase');
  } catch(e) {
    console.error('Migration error:', e);
  }
};

window._firebaseReady = true;
document.dispatchEvent(new Event('firebaseReady'));
