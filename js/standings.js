// ─────────────────────────────────────────
//  ROBIN TABLE
// ─────────────────────────────────────────
function renderRobin(){
  const teams = D.teams.map(t=>t.name);
  if(teams.length<2 || D.matches.length===0){
    document.getElementById('robin-content').innerHTML =
      '<div class="empty-state"><div class="ico">🎯</div><p>まだ試合結果がありません。<br>スコアを入力して送信してください。</p></div>';
    return;
  }
  const stats = {};
  teams.forEach(t=>{
    stats[t]={wins:0,losses:0,lw:0,ll:0,vs:{}};
    teams.forEach(o=>{if(o!==t)stats[t].vs[o]=[];});
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
  const sorted = [...teams].sort((a,b)=>
    stats[b].wins!==stats[a].wins ? stats[b].wins-stats[a].wins : stats[b].lw-stats[a].lw
  );
  let h = '<div class="robin-wrap"><table class="robin-table"><thead><tr><th>TEAM</th>';
  sorted.forEach((t,i)=>{ h+=`<th>${["①","②","③","④"][i]}<br><small>${t}</small></th>`; });
  h += '<th>勝</th><th>負</th><th>LEG勝</th><th>LEG負</th><th>順位</th></tr></thead><tbody>';
  sorted.forEach((team,ri)=>{
    const s=stats[team]; const rank=ri+1;
    h += `<tr><td class="tn">${team}</td>`;
    sorted.forEach(opp=>{
      if(opp===team){h+='<td class="self-cell"></td>';return;}
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
  document.getElementById('robin-content').innerHTML = h;
}

// ─────────────────────────────────────────
//  STATS
// ─────────────────────────────────────────
const GAME_CATEGORIES = {
  'ゼロワン': [1,4,7,12,3,10],
  'クリケット': [2,6,8,13,9,14,15],
  'シングルス': [5,9,11,14],
  'ダブルス':   [1,2,4,6,7,8,12,13],
  'ガロン':     [10,15],
};

function statWrClass(r){ return r>=60?'high':r>=40?'mid':'low'; }
function statBar(r){
  const c=statWrClass(r);
  return `<span class="stat-bar-wrap"><span class="stat-bar-fill ${c}" style="width:${r}%"></span></span>`;
}

function refreshStatsTeamSel(){
  const sel = document.getElementById('stats-team-sel');
  const cur = sel.value;
  sel.innerHTML = '<option value="">チームを選択</option>';
  D.teams.forEach(t=>{
    const o=document.createElement('option'); o.value=t.name; o.textContent=t.name; sel.appendChild(o);
  });
  if(D.teams.find(t=>t.name===cur)) sel.value=cur;
}

function renderStats(){
  const teamName = document.getElementById('stats-team-sel').value;
  const c = document.getElementById('stats-content');
  if(!teamName){
    c.innerHTML='<div class="empty-state"><div class="ico">📊</div><p>チームを選択してください</p></div>';
    return;
  }
  const team = D.teams.find(t=>t.name===teamName);
  if(!team){
    c.innerHTML='<div class="empty-state"><div class="ico">👤</div><p>チームが見つかりません</p></div>';
    return;
  }

  const teamStat = { matchWins:0, matchLoses:0, matchDraws:0, gameWins:0, gameLoses:0,
    byCategory:{},
    vsOpponent:{},
  };
  const playerStats = {};
  team.players.filter(p=>p.name).forEach(p=>{
    playerStats[p.name]={name:p.name,currentRating:p.rating||'-',games:0,wins:0,byType:{},matchHistory:[],zeroStats:[],cricketStats:[]};
  });

  D.matches.forEach(m=>{
    const isA = m.teamA===teamName;
    const isB = m.teamB===teamName;
    if(!isA && !isB) return;
    const myScore  = isA ? m.scoreA : m.scoreB;
    const oppScore = isA ? m.scoreB : m.scoreA;
    const opp      = isA ? m.teamB  : m.teamA;

    if(myScore>oppScore)       teamStat.matchWins++;
    else if(myScore<oppScore)  teamStat.matchLoses++;
    else                       teamStat.matchDraws++;

    if(!teamStat.vsOpponent[opp]) teamStat.vsOpponent[opp]={wins:0,loses:0,gw:0,gl:0};
    const vs = teamStat.vsOpponent[opp];
    if(myScore>oppScore) vs.wins++; else if(myScore<oppScore) vs.loses++;

    (m.games||[]).forEach(g=>{
      if(!g.winner) return;
      const myWin = (isA && g.winner==='my') || (isB && g.winner==='opp');
      const isForfeit = !!g.forfeit;

      if(myWin) { teamStat.gameWins++; vs.gw++; }
      else       { teamStat.gameLoses++; vs.gl++; }

      if(!isForfeit){
        const cat = g.label.includes('クリケット') ? 'クリケット' : 'ゼロワン';
        const fmt = g.label.includes('シングルス') ? 'シングルス'
                  : g.label.includes('ダブルス')  ? 'ダブルス'
                  : g.label.includes('トリオス')  ? 'トリオス'
                  : g.label.includes('ガロン')    ? 'ガロン' : 'その他';
        [cat, fmt].forEach(key=>{
          if(!teamStat.byCategory[key]) teamStat.byCategory[key]={wins:0,games:0};
          teamStat.byCategory[key].games++;
          if(myWin) teamStat.byCategory[key].wins++;
        });

        (g.players||[]).forEach(p=>{
          if(!playerStats[p.name]) return;
          const ps=playerStats[p.name];
          ps.games++; if(myWin) ps.wins++;
          if(!ps.byType[g.label]) ps.byType[g.label]={games:0,wins:0};
          ps.byType[g.label].games++; if(myWin) ps.byType[g.label].wins++;
          if(p.rating){
            ps.currentRating=p.rating;
            const isC = g.label.includes('クリケット');
            if(isC) ps.cricketStats.push(parseFloat(p.rating));
            else    ps.zeroStats.push(parseFloat(p.rating));
          }
          let mhEntry = ps.matchHistory.find(e=>e.matchId===m.id);
          if(!mhEntry){
            mhEntry = {matchId:m.id, date:m.date, opp, myScore, oppScore, games:[]};
            ps.matchHistory.push(mhEntry);
          }
          mhEntry.games.push({game:g.game, label:g.label, win:myWin});
        });
      }
    });
  });

  const totalMatches = teamStat.matchWins+teamStat.matchLoses+teamStat.matchDraws;
  const matchWr = totalMatches>0 ? Math.round(teamStat.matchWins/totalMatches*100) : 0;
  const totalGames = teamStat.gameWins+teamStat.gameLoses;
  const gameWr = totalGames>0 ? Math.round(teamStat.gameWins/totalGames*100) : 0;

  if(totalMatches===0){
    c.innerHTML='<div class="empty-state"><div class="ico">📊</div><p>まだ試合データがありません</p></div>';
    return;
  }

  const mwc = statWrClass(matchWr);
  const gwc = statWrClass(gameWr);
  let html = `<div class="stat-player-card" style="border-color:var(--accent2);">
    <div class="stat-player-head" style="margin-bottom:10px;">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:2px;color:var(--accent2);">TEAM SUMMARY</div>
      <div style="font-size:11px;color:var(--text2)">${totalMatches}試合</div>
    </div>
    <div class="stat-grid" style="margin-bottom:10px;">
      <div class="stat-box">
        <div class="stat-box-val">${teamStat.matchWins}<span style="font-size:14px;">勝</span></div>
        <div class="stat-box-lbl">試合勝利</div>
      </div>
      <div class="stat-box">
        <div class="stat-box-val" style="color:var(--lose)">${teamStat.matchLoses}<span style="font-size:14px;">敗</span></div>
        <div class="stat-box-lbl">試合敗北</div>
      </div>
      <div class="stat-box">
        <div class="stat-box-val ${mwc}">${matchWr}%</div>
        <div class="stat-box-lbl">試合勝率</div>
      </div>
    </div>
    <div class="stat-grid">
      <div class="stat-box">
        <div class="stat-box-val">${teamStat.gameWins}</div>
        <div class="stat-box-lbl">ゲーム勝利</div>
      </div>
      <div class="stat-box">
        <div class="stat-box-val" style="color:var(--lose)">${teamStat.gameLoses}</div>
        <div class="stat-box-lbl">ゲーム敗北</div>
      </div>
      <div class="stat-box">
        <div class="stat-box-val ${gwc}">${gameWr}%</div>
        <div class="stat-box-lbl">ゲーム勝率</div>
      </div>
    </div>`;

  const catRows = Object.entries(teamStat.byCategory).map(([k,d])=>{
    const r=d.games>0?Math.round(d.wins/d.games*100):0;
    const cls=statWrClass(r);
    return `<div class="stat-game-type-row">
      <span class="stat-game-type-name">${k}</span>
      <span>
        <span class="stat-winrate ${cls}">${r}%</span>
        ${statBar(r)}
        <span style="font-size:10px;color:var(--text2);margin-left:4px;">${d.wins}勝${d.games-d.wins}敗</span>
      </span>
    </div>`;
  }).join('');
  if(catRows) html += `<div class="stat-game-types" style="margin-top:10px;border-top:1px solid var(--border);padding-top:8px;">${catRows}</div>`;

  const vsRows = Object.entries(teamStat.vsOpponent).map(([opp,d])=>{
    const total=d.wins+d.loses;
    const r=total>0?Math.round(d.wins/total*100):0;
    const cls=statWrClass(r);
    return `<div class="stat-game-type-row">
      <span class="stat-game-type-name">vs ${opp}</span>
      <span>
        <span class="stat-winrate ${cls}">${r}%</span>
        ${statBar(r)}
        <span style="font-size:10px;color:var(--text2);margin-left:4px;">${d.wins}勝${d.loses}敗</span>
      </span>
    </div>`;
  }).join('');
  if(vsRows) html += `<div class="stat-game-types" style="margin-top:10px;border-top:1px solid var(--border);padding-top:8px;">
    <div style="font-size:9px;color:var(--text2);letter-spacing:1px;margin-bottom:6px;">VS OPPONENT</div>
    ${vsRows}
  </div>`;

  html += '</div>';

  const players = Object.values(playerStats).sort((a,b)=>b.games-a.games);
  const safeId = name => name.replace(/[^a-zA-Z0-9]/g,'_');
  html += players.map(ps=>{
    const wr=ps.games>0?Math.round(ps.wins/ps.games*100):0;
    const wrClass=wr>=60?'green':wr>=40?'yellow':'';
    const typeRows=Object.entries(ps.byType).map(([label,d])=>{
      const r=d.games>0?Math.round(d.wins/d.games*100):0;
      const cls=statWrClass(r);
      return `<div class="stat-game-type-row">
        <span class="stat-game-type-name">${label}</span>
        <span>
          <span class="stat-winrate ${cls}">${r}%</span>
          ${statBar(r)}
          <span style="font-size:10px;color:var(--text2);margin-left:4px;">${d.wins}勝${d.games-d.wins}敗</span>
        </span>
      </div>`;
    }).join('');

    const histSorted = [...ps.matchHistory].sort((a,b)=>b.matchId-a.matchId);
    const histRows = histSorted.map(mh=>{
      const matchWon = mh.myScore > mh.oppScore;
      const gameRows = mh.games.map(g=>`
        <div style="display:flex;justify-content:space-between;padding:4px 8px;font-size:11px;border-bottom:1px solid var(--border);">
          <span style="color:var(--text2);">${g.game}G　${g.label}</span>
          <span style="font-weight:700;color:${g.win?'var(--win)':'var(--lose)'};">${g.win?'WIN':'LOSE'}</span>
        </div>`).join('');
      return `<div style="margin-bottom:8px;border:1px solid var(--border);border-radius:8px;overflow:hidden;">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 10px;background:var(--surface2);">
          <div>
            <span style="font-size:10px;color:var(--text2);">${mh.date}</span>
            <span style="font-size:12px;font-weight:700;margin-left:8px;">vs ${mh.opp}</span>
          </div>
          <span style="font-family:'Bebas Neue',sans-serif;font-size:16px;color:${matchWon?'var(--win)':'var(--lose)'};">${mh.myScore}-${mh.oppScore}</span>
        </div>
        ${gameRows}
      </div>`;
    }).join('');

    const pid = safeId(ps.name);
    return `<div class="stat-player-card">
      <div class="stat-player-head" onclick="togglePlayerDetail('pd-${pid}')" style="cursor:pointer;">
        <div class="stat-player-name">${ps.name}</div>
        <div style="display:flex;align-items:center;gap:10px;">
          ${(()=>{
            const avg = v => v.length ? (v.reduce((a,b)=>a+b,0)/v.length).toFixed(1) : null;
            const zA = avg(ps.zeroStats);
            const cA = avg(ps.cricketStats);
            const zF = zA ? getFlight(zA, false) : null;
            const cF = cA ? getFlight(cA, true)  : null;
            if(!zF && !cF) return `<div><div class="stat-rating-badge" style="color:var(--text2);font-size:14px;">-</div><div class="stat-rating-label">FLIGHT</div></div>`;
            const badges = [];
            if(zF) badges.push(`<div style="text-align:center"><div class="stat-rating-badge" style="background:${zF.bg};color:${zF.color};padding:2px 8px;border-radius:6px;">${zF.label}</div><div class="stat-rating-label">01</div></div>`);
            if(cF) badges.push(`<div style="text-align:center"><div class="stat-rating-badge" style="background:${cF.bg};color:${cF.color};padding:2px 8px;border-radius:6px;">${cF.label}</div><div class="stat-rating-label">CRT</div></div>`);
            return `<div style="display:flex;gap:6px;align-items:flex-end;">${badges.join('')}</div>`;
          })()}
          <span style="color:var(--text2);font-size:16px;" id="pd-arrow-${pid}">▶</span>
        </div>
      </div>
      <div class="stat-grid">
        <div class="stat-box"><div class="stat-box-val">${ps.games}</div><div class="stat-box-lbl">出場</div></div>
        <div class="stat-box"><div class="stat-box-val green">${ps.wins}</div><div class="stat-box-lbl">勝利</div></div>
        <div class="stat-box"><div class="stat-box-val ${wrClass}">${wr}%</div><div class="stat-box-lbl">勝率</div></div>
      </div>
      ${typeRows?`<div class="stat-game-types">${typeRows}</div>`:''}
      <div id="pd-${pid}" style="display:none;margin-top:10px;border-top:1px solid var(--border);padding-top:10px;">
        ${histRows || '<div style="color:var(--text2);font-size:12px;padding:6px 0;">試合データなし</div>'}
      </div>
    </div>`;
  }).join('');

  c.innerHTML = html;
}

function togglePlayerDetail(id){
  const el = document.getElementById(id);
  if(!el) return;
  const open = el.style.display === 'block';
  el.style.display = open ? 'none' : 'block';
  const arrowId = 'pd-arrow-' + id.replace('pd-','');
  const arrow = document.getElementById(arrowId);
  if(arrow) arrow.textContent = open ? '▶' : '▼';
}
