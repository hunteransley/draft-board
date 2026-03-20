import { useState, useEffect, useRef } from "react";
import { getConsensusRank, getConsensusGrade } from "./consensusData.js";
import { getScoutingTraits } from "./scoutingData.js";
import { getCombineScores } from "./combineTraits.js";
import { getProspectStats } from "./prospectStats.js";
import { TEAM_SCHEME, TEAM_ABBR } from "./depthChartUtils.js";
import { NFL_TEAM_COLORS, NFL_TEAM_ESPN as NFL_TEAM_ESPN_IDS } from "./teamConfig.js";
import { POS_DRAFT_VALUE, RANK_OVERRIDES, GRADE_OVERRIDES, TEAM_PROFILES, SCHEME_INFLECTIONS, DRAFT_ORDER, getPickRound } from "./draftConfig.js";
import { TEAM_NEEDS_COUNTS, TEAM_NEEDS_SIMPLE } from "./teamNeedsData.js";
import { GM_PARAMS, generateSimNoise as gmGenerateSimNoise, generateAllBoards, pickFromBoard, normalizeAbbr } from "./gmBoardGenerator.js";

// ── STATIC DATA ──

const GEN_SUFFIXES=/^(Jr\.?|Sr\.?|II|III|IV|V|VI|VII|VIII)$/i;
function shortName(name){const p=name.split(" ");const last=p.pop()||"";return GEN_SUFFIXES.test(last)?(p.pop()||last)+" "+last:last;}


const JJ_VALUES={1:3000,2:2600,3:2200,4:1800,5:1700,6:1600,7:1500,8:1400,9:1350,10:1300,11:1250,12:1200,13:1150,14:1100,15:1050,16:1000,17:950,18:900,19:875,20:850,21:800,22:780,23:760,24:740,25:720,26:700,27:680,28:660,29:640,30:620,31:600,32:590,33:580,34:560,35:550,36:540,37:530,38:520,39:510,40:500,41:490,42:480,43:470,44:460,45:450,46:440,47:430,48:420,49:410,50:400,51:390,52:380,53:370,54:360,55:350,56:340,57:330,58:320,59:310,60:300,61:292,62:284,63:276,64:270,65:265,66:260,67:255,68:250,69:245,70:240,71:235,72:230,73:225,74:220,75:215,76:210,77:205,78:200,79:195,80:190,81:185,82:180,83:175,84:170,85:165,86:160,87:155,88:150,89:145,90:140,91:136,92:132,93:128,94:124,95:120,96:116,97:112,98:108,99:104,100:100};
function getPickValue(n){return JJ_VALUES[n]||Math.max(5,Math.round(100-((n-100)*0.72)));}

// POS_DRAFT_VALUE, RANK_OVERRIDES, GRADE_OVERRIDES, TEAM_PROFILES, SCHEME_INFLECTIONS imported from draftConfig.js
// TEAM_NEEDS_COUNTS, TEAM_NEEDS_SIMPLE imported from teamNeedsData.js

// (Old scoring functions removed — board generation now handled by gmBoardGenerator.js)

// TEAM_ABBR imported from depthChartUtils.js
// NFL_TEAM_COLORS, NFL_TEAM_ESPN_IDS imported from teamConfig.js

function nflLogoUrl(team){const id=NFL_TEAM_ESPN_IDS[team];return id?`https://a.espncdn.com/i/teamlogos/nfl/500/${id}.png`:null;}
function loadImg(src,timeout=3000){return new Promise((res,rej)=>{const img=new Image();img.crossOrigin="anonymous";img.onload=()=>res(img);img.onerror=()=>rej();setTimeout(rej,timeout);img.src=src;});}
function drawTrunc(ctx,text,x,y,maxW){let t=text;while(ctx.measureText(t).width>maxW&&t.length>1)t=t.slice(0,-1);if(t!==text)t=t.slice(0,-1)+'...';ctx.fillText(t,x,y);}
function rr(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();}

// TEAM_NEEDS → TEAM_NEEDS_SIMPLE (imported from teamNeedsData.js)
// TEAM_NEEDS_COUNTS (imported from teamNeedsData.js) replaces old TEAM_NEEDS_DETAILED

// ── PURE SIMULATION FUNCTIONS ──

function pureCpuPick(team, avail, pickNum, picks, recentPosCounts, prospectsMap, boards) {
  if(pickNum===1){const m=avail.find(id=>{const p=prospectsMap[id];return p&&p.name==="Fernando Mendoza";});if(m)return m;}
  const round=getPickRound(pickNum);
  const abbr=normalizeAbbr(TEAM_ABBR[team]||team);
  const board=boards[abbr];
  const gm=GM_PARAMS[abbr];
  if(!board||!gm)return avail[0];

  const availSet=new Set(avail);
  const teamPickHistory=picks.filter(pk=>pk.team===team).map(pk=>{const p=prospectsMap[pk.playerId];return p?{pos:p.gpos||p.pos,pick:pk.pick}:null;}).filter(Boolean);
  const posCounts={};teamPickHistory.forEach(h=>{posCounts[h.pos]=(posCounts[h.pos]||0)+1;});

  const result=pickFromBoard(board,gm,{
    available:availSet,round,currentPick:pickNum,
    alreadyDrafted:posCounts,recentPosCounts,
    teamNeeds:TEAM_NEEDS_SIMPLE[team],
    teamPickHistory,
  });
  return result?.id||avail[0];
}

function pureCpuTradeUp(currentIdx, available, picks, tradeMap, cpuTradeLog, prospectsMap, boards) {
  const fullDraftOrder = DRAFT_ORDER;
  const totalPicks = fullDraftOrder.length;
  const getPickTeam = (idx) => tradeMap[idx] || fullDraftOrder[idx]?.team;
  const currentTeam = getPickTeam(currentIdx);
  const currentPick = fullDraftOrder[currentIdx]?.pick;
  if(!currentPick || currentPick > 64) return null;

  const recentTraders = new Set(cpuTradeLog.filter(t => currentIdx - t.pickIdx < 8).map(t => t.fromTeam));
  const tradedPickIdxs = new Set(cpuTradeLog.flatMap(t => t.involvedPicks || [t.pickIdx]));

  // ── TRADE-DOWN EVALUATION: situational willingness ──
  const currentAbbr = normalizeAbbr(TEAM_ABBR[currentTeam]||currentTeam);
  const currentGm = GM_PARAMS[currentAbbr];
  if(!currentGm) return null;
  const currentBoard = boards[currentAbbr] || [];
  const availSet = new Set(available);
  let currentBest=null,currentSecond=null;
  for(const entry of currentBoard){
    if(!availSet.has(entry.id))continue;
    if(!currentBest)currentBest=entry;
    else if(!currentSecond){currentSecond=entry;break;}
  }
  if(!currentBest) return null;
  let clusterCount=0;
  if(currentBest){
    const threshold=currentBest.boardScore*0.92;
    for(const entry of currentBoard){
      if(!availSet.has(entry.id))continue;
      if(entry.boardScore>=threshold)clusterCount++;
      else break;
      if(clusterCount>=6)break;
    }
  }
  const slotExpectedGrade=96-currentPick*0.5;
  const disappointment=Math.max(0,(slotExpectedGrade-currentBest.grade)/10);
  const clusterBoost=clusterCount>=4?1.5:clusterCount>=3?1.25:1.0;
  const disappointmentBoost=1.0+disappointment*2.0;
  const situationalWillingness=Math.min(0.9,currentGm.tradeDownWillingness*clusterBoost*disappointmentBoost);
  if(Math.random()>situationalWillingness) return null;

  const candidateTeams = [];

  for(let i = currentIdx + 2; i < Math.min(currentIdx + 13, totalPicks); i++){
    if(tradedPickIdxs.has(i)) continue;
    const t = getPickTeam(i);
    if(!t || t === currentTeam) continue;
    const tAbbr=normalizeAbbr(TEAM_ABBR[t]||t);
    const gm=GM_PARAMS[tAbbr];
    if(!gm)continue;
    if(recentTraders.has(t)) continue;

    const board=boards[tAbbr]||[];
    let bestPlayer=null,bestScore=0,secondScore=0;
    for(const entry of board){
      if(!availSet.has(entry.id))continue;
      const score=entry.boardScore*(0.85+Math.random()*0.30);
      if(score>bestScore){secondScore=bestScore;bestScore=score;bestPlayer={id:entry.id,name:entry.name,grade:entry.grade,consRank:entry.consensusRank,pos:entry.pos,score};}
      else if(score>secondScore){secondScore=score;}
      if(secondScore>0&&bestScore/secondScore<1.10)break;
    }
    if(!bestPlayer||bestPlayer.grade<70)continue;
    const separation=secondScore>0?bestScore/secondScore:2.0;

    const theirPickNum = fullDraftOrder[i]?.pick;
    const currentVal = getPickValue(currentPick);
    const theirVal = getPickValue(theirPickNum);
    let sweetenerIdx = null, sweetenerVal = 0;
    for(let j = i + 1; j < totalPicks; j++){
      if(tradedPickIdxs.has(j)) continue;
      if(getPickTeam(j) === t){ sweetenerIdx = j; sweetenerVal = getPickValue(fullDraftOrder[j]?.pick || 999); break; }
    }
    const totalOffer = theirVal + sweetenerVal;
    if(totalOffer < currentVal) continue;

    const separationBoost=separation>=1.30?2.5:separation>=1.20?1.8:separation>=1.15?1.3:1.0;
    let prob=gm.tradeUpAggression*0.15*separationBoost;
    if(currentPick<=10)prob*=1.3;
    else if(currentPick<=20)prob*=1.15;
    prob=Math.min(0.35,prob);
    if(Math.random()>prob)continue;

    candidateTeams.push({
      team: t, theirPickIdx: i, theirPickNum, sweetenerIdx,
      sweetenerPick: sweetenerIdx !== null ? fullDraftOrder[sweetenerIdx]?.pick : null,
      sweetenerRound: sweetenerIdx !== null ? fullDraftOrder[sweetenerIdx]?.round : null,
      targetPlayer: bestPlayer, separation, totalOffer, currentVal
    });
  }

  if(candidateTeams.length === 0) return null;
  const weights = candidateTeams.map(c => Math.pow(c.separation, 2));
  const totalW = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * totalW;
  for(let ci = 0; ci < candidateTeams.length; ci++){ r -= weights[ci]; if(r <= 0) return candidateTeams[ci]; }
  return candidateTeams[0];
}

function runSingleSim(board, prospectsMap, getGrade, schemeFits) {
  // Generate per-GM boards with variance for this sim iteration
  const prospectIds=board.map(p=>p.id);
  const{noise,wobbled}=gmGenerateSimNoise(prospectIds);
  const boards=generateAllBoards(board,noise,schemeFits);

  const fullDraftOrder = DRAFT_ORDER;
  const available = board.map(p => p.id);
  const picks = [];
  const tradeMap = {};
  const cpuTradeLog = [];
  const recentPosCounts = {};

  for(let idx = 0; idx < 32; idx++){
    const getPickTeam = (i) => tradeMap[i] || fullDraftOrder[i]?.team;
    const team = getPickTeam(idx);
    const pickNum = fullDraftOrder[idx]?.pick || (idx + 1);

    const trade = pureCpuTradeUp(idx, available, picks, tradeMap, cpuTradeLog, prospectsMap, boards);
    let actualTeam = team;
    let traded = false;
    let origTeam = team;

    if(trade){
      const tradingTeam = trade.team;
      tradeMap[idx] = tradingTeam;
      tradeMap[trade.theirPickIdx] = team;
      if(trade.sweetenerIdx !== null) tradeMap[trade.sweetenerIdx] = team;
      const involvedPicks=[idx,trade.theirPickIdx];
      if(trade.sweetenerIdx!==null)involvedPicks.push(trade.sweetenerIdx);
      cpuTradeLog.push({pickIdx: idx, fromTeam: tradingTeam, toTeam: team, involvedPicks});
      actualTeam = tradingTeam;
      traded = true;
      origTeam = team;
    }

    const playerId = pureCpuPick(actualTeam, available, pickNum, picks, recentPosCounts, prospectsMap, boards);
    const player = prospectsMap[playerId];
    const pos = player?.pos;

    picks.push({pick: pickNum, round: 1, team: actualTeam, playerId, traded, origTeam});

    // Remove from available
    const aIdx = available.indexOf(playerId);
    if(aIdx >= 0) available.splice(aIdx, 1);

    // Track recent position counts (last 5 picks)
    if(pos){
      const recentPicks = picks.slice(-5);
      const counts = {};
      recentPicks.forEach(pk => {
        const pp = prospectsMap[pk.playerId];
        if(pp) counts[pp.pos] = (counts[pp.pos] || 0) + 1;
      });
      Object.keys(recentPosCounts).forEach(k => delete recentPosCounts[k]);
      Object.assign(recentPosCounts, counts);
    }
  }

  return picks;
}

function runBatchAsync(board, prospectsMap, numSims, onProgress, getGrade, schemeFits) {
  return new Promise(resolve => {
    const allResults = [];
    let done = 0;
    const CHUNK = 5;

    function runChunk() {
      const end = Math.min(done + CHUNK, numSims);
      for(let i = done; i < end; i++){
        allResults.push(runSingleSim(board, prospectsMap, getGrade, schemeFits));
      }
      done = end;
      if(onProgress) onProgress(done, numSims);
      if(done < numSims) setTimeout(runChunk, 0);
      else resolve(allResults);
    }

    runChunk();
  });
}

// ── AGGREGATION ──

function aggregateResults(allResults, prospectsMap) {
  const numSims = allResults.length;
  const slots = [];

  const assigned = new Set();

  for(let slotIdx = 0; slotIdx < 32; slotIdx++){
    // Count player frequency at this slot
    const playerCounts = {};
    const teamCounts = {};
    let tradeCount = 0;
    const origTeamCounts = {};

    allResults.forEach(simPicks => {
      const pick = simPicks[slotIdx];
      if(!pick) return;
      playerCounts[pick.playerId] = (playerCounts[pick.playerId] || 0) + 1;
      teamCounts[pick.team] = (teamCounts[pick.team] || 0) + 1;
      if(pick.traded) tradeCount++;
      if(pick.origTeam) origTeamCounts[pick.origTeam] = (origTeamCounts[pick.origTeam] || 0) + 1;
    });

    // Sort candidates by frequency desc
    const candidates = Object.entries(playerCounts)
      .map(([playerId, count]) => ({playerId, pct: Math.round(count / numSims * 100)}))
      .sort((a, b) => b.pct - a.pct);

    // Primary = first candidate NOT already assigned
    let primary = null;
    const alsoConsidered = [];
    for(const c of candidates){
      if(!primary && !assigned.has(c.playerId)){
        primary = c;
      } else {
        if(alsoConsidered.length < 4) alsoConsidered.push(c);
      }
    }
    // Fallback: if all candidates are assigned, take the most frequent one
    if(!primary && candidates.length > 0) primary = candidates[0];
    if(primary) assigned.add(primary.playerId);

    // Most common team
    const teamSorted = Object.entries(teamCounts).sort((a, b) => b[1] - a[1]);
    const mostCommonTeam = teamSorted[0]?.[0] || DRAFT_ORDER[slotIdx]?.team;
    const teamPct = teamSorted[0] ? Math.round(teamSorted[0][1] / numSims * 100) : 100;

    // Original team (when traded)
    const origTeamSorted = Object.entries(origTeamCounts).sort((a, b) => b[1] - a[1]);
    const origTeam = DRAFT_ORDER[slotIdx]?.team;
    const tradePct = Math.round(tradeCount / numSims * 100);
    const isTrade = false; // TODO: re-enable when aggregation logic can reliably detect trades

    // Determine filled need
    const player = primary ? prospectsMap[primary.playerId] : null;
    const pos = player?.pos;
    const dn = TEAM_NEEDS_COUNTS?.[mostCommonTeam] || {};
    const simpleNeeds = TEAM_NEEDS_SIMPLE[mostCommonTeam] || [];
    const filledNeed = pos && (dn[pos] >= 1 || simpleNeeds.includes(pos)) ? pos : null;

    // Consensus rank for context
    const consRank = player ? getConsensusRank(player.name) : 999;

    // Positional distribution at this slot
    const posByPos = {};
    allResults.forEach(simPicks => {
      const pick = simPicks[slotIdx];
      const p = pick ? prospectsMap[pick.playerId] : null;
      if(p) posByPos[p.gpos || p.pos] = (posByPos[p.gpos || p.pos] || 0) + 1;
    });

    slots.push({
      pickNum: slotIdx + 1,
      team: mostCommonTeam,
      teamPct,
      origTeam,
      isTrade,
      tradePct,
      primary: primary || {playerId: null, pct: 0},
      alsoConsidered,
      filledNeed,
      consRank,
      posByPos,
    });
  }

  return slots;
}

// ── REACT COMPONENT ──

export default function Round1Prediction({
  board, PROSPECTS, POS_COLORS, NFLTeamLogo, SchoolLogo, schoolLogo,
  font, mono, sans, onClose, onResults, trackEvent, userId, getGrade, schemeFits
}) {
  const [phase, setPhase] = useState("loading");
  const [progress, setProgress] = useState(0);
  const [slots, setSlots] = useState([]);
  const [expanded, setExpanded] = useState(new Set(Array.from({length:32},(_,i)=>i)));
  const [allExpanded, setAllExpanded] = useState(true);
  const canvasRef = useRef(null);

  const prospectsMap = {};
  PROSPECTS.forEach(p => { prospectsMap[p.id] = p; });

  useEffect(() => {
    if(trackEvent) trackEvent(userId, 'round1_prediction_started', {});
    let cancelled = false;
    runBatchAsync(board, prospectsMap, 100, (done, total) => {
      if(!cancelled) setProgress(Math.round(done / total * 100));
    }, getGrade, schemeFits).then(allResults => {
      if(cancelled) return;
      const agg = aggregateResults(allResults, prospectsMap);
      setSlots(agg);
      if(onResults) onResults(agg);
      setPhase("results");
      if(trackEvent) trackEvent(userId, 'round1_prediction_complete', {});
    });
    return () => { cancelled = true; };
  }, []);

  const toggleSlot = (idx) => {
    setExpanded(prev => {
      const n = new Set(prev);
      if(n.has(idx)) n.delete(idx); else n.add(idx);
      return n;
    });
  };

  const toggleAll = () => {
    if(allExpanded){
      setExpanded(new Set());
      setAllExpanded(false);
    } else {
      setExpanded(new Set(slots.map((_, i) => i)));
      setAllExpanded(true);
    }
  };

  // ── CANVAS SHARE (matches all-32 mock draft style) ──
  const shareImage = async () => {
    if(trackEvent) trackEvent(userId, 'round1_prediction_share', {});
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const scale = 2;
    const W = 1200;
    const pad = 24, colGap = 10, numCols = 3;
    const colW = (W - pad * 2 - (numCols - 1) * colGap) / numCols;
    const rowH = 47, numRows = 11;
    const gridY = 16;
    const gridH = numRows * rowH;
    const H = gridY + gridH + 16;
    const colPicks = [11, 11, 10];

    canvas.width = W * scale; canvas.height = H * scale;
    ctx.scale(scale, scale);
    ctx.fillStyle = '#faf9f6'; ctx.fillRect(0, 0, W, H);

    function rrLocal(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath(); }

    // Load logos
    const logoCache = {}, schoolCache = {};
    const uniqueTeams = [...new Set(slots.map(s => s.team))];
    const uniqueSchools = [...new Set(slots.map(s => { const p = s.primary?.playerId ? prospectsMap[s.primary.playerId] : null; return p?.school; }).filter(Boolean))];
    let siteLogo = null;
    try { siteLogo = await loadImg('/logo.png', 2000); } catch(e) {}
    await Promise.all([
      ...uniqueTeams.map(async t => { try { logoCache[t] = await loadImg(nflLogoUrl(t), 2000); } catch(e) {} }),
      ...uniqueSchools.map(async s => { const url = schoolLogo(s); if (!url) return; try { schoolCache[s] = await loadImg(url, 2000); } catch(e) {} })
    ]);

    let pickIdx = 0;
    for (let c = 0; c < numCols; c++) {
      const cx = pad + c * (colW + colGap);
      const nPicks = colPicks[c];
      const colH = nPicks * rowH;

      // Column container
      ctx.fillStyle = '#fff'; rrLocal(cx, gridY, colW, colH, 12); ctx.fill();
      ctx.strokeStyle = '#e5e5e5'; ctx.lineWidth = 1; rrLocal(cx, gridY, colW, colH, 12); ctx.stroke();

      for (let r = 0; r < nPicks; r++) {
        const i = pickIdx + r;
        if (i >= Math.min(slots.length, 32)) break;
        const slot = slots[i];
        const player = slot.primary?.playerId ? prospectsMap[slot.primary.playerId] : null;
        if (!player) continue;
        const ry = gridY + r * rowH;
        const midY = ry + rowH / 2;

        // Row separator
        if (r < nPicks - 1) { ctx.fillStyle = '#f5f5f5'; ctx.fillRect(cx + 1, ry + rowH - 0.5, colW - 2, 1); }

        ctx.textBaseline = 'middle';

        // Pick #
        ctx.fillStyle = '#d4d4d4'; ctx.font = '12px ui-monospace,monospace'; ctx.textAlign = 'right';
        ctx.fillText(String(i + 1), cx + 28, midY); ctx.textAlign = 'left';

        // NFL team logo
        if (logoCache[slot.team]) ctx.drawImage(logoCache[slot.team], cx + 34, midY - 10, 20, 20);

        // Position
        const posKey = player.gpos || player.pos;
        const posColor = POS_COLORS[posKey] || POS_COLORS[player.pos] || '#737373';
        ctx.fillStyle = posColor; ctx.font = 'bold 10px ui-monospace,monospace';
        ctx.fillText(posKey, cx + 60, midY);

        // School logo
        const slx = cx + 100;
        if (schoolCache[player.school]) {
          ctx.drawImage(schoolCache[player.school], slx, midY - 10, 20, 20);
        } else {
          ctx.fillStyle = '#f0f0f0'; ctx.beginPath(); ctx.arc(slx + 10, midY, 10, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#a3a3a3'; ctx.font = 'bold 8px -apple-system,system-ui,sans-serif'; ctx.textAlign = 'center';
          ctx.fillText((player.school || '?').charAt(0), slx + 10, midY); ctx.textAlign = 'left';
        }

        // Player name + school + confidence
        const nameX = slx + 26;
        const rowEnd = cx + colW - 10;

        ctx.font = '11px ui-monospace,monospace';
        const schoolStr = player.school || '';
        const schoolW = ctx.measureText(schoolStr).width;

        // Confidence % + trade badge
        const pctTxt = slot.primary.pct + '%';
        ctx.font = 'bold 9px ui-monospace,monospace';
        const pctW = ctx.measureText(pctTxt).width + 8;

        let tradeW = 0, tradeTxt = '';
        if (slot.isTrade) {
          tradeTxt = 'via ' + (TEAM_ABBR[slot.origTeam] || slot.origTeam);
          ctx.font = 'bold 7px ui-monospace,monospace';
          tradeW = ctx.measureText(tradeTxt).width + 8;
        }

        const reservedRight = schoolW + 8 + pctW + 4 + (tradeW ? tradeW + 6 : 0);
        const nameMaxW = rowEnd - nameX - reservedRight;

        ctx.fillStyle = '#171717'; ctx.font = 'bold 13px -apple-system,system-ui,sans-serif';
        const fullNameW = ctx.measureText(player.name).width;
        const nameDrawW = Math.min(fullNameW, Math.max(nameMaxW, 60));
        drawTrunc(ctx, player.name, nameX, midY, nameDrawW);

        const schoolX = nameX + nameDrawW + 8;
        ctx.fillStyle = '#a3a3a3'; ctx.font = '11px ui-monospace,monospace';
        const availSchoolW = rowEnd - schoolX - pctW - 4 - (tradeW ? tradeW + 6 : 0);
        if (availSchoolW > 20) drawTrunc(ctx, schoolStr, schoolX, midY, availSchoolW);

        // Confidence pill
        ctx.fillStyle = 'rgba(100,116,139,0.08)';
        rrLocal(rowEnd - pctW, midY - 7, pctW, 14, 3); ctx.fill();
        ctx.fillStyle = '#64748b'; ctx.font = 'bold 9px ui-monospace,monospace'; ctx.textAlign = 'center';
        ctx.fillText(pctTxt, rowEnd - pctW / 2, midY); ctx.textAlign = 'left';

        // Trade badge
        if (slot.isTrade) {
          const pillX = rowEnd - pctW - tradeW - 6;
          ctx.fillStyle = 'rgba(168,85,247,0.08)'; rrLocal(pillX, midY - 7, tradeW, 14, 2); ctx.fill();
          ctx.fillStyle = '#a855f7'; ctx.font = 'bold 7px ui-monospace,monospace';
          ctx.fillText(tradeTxt, pillX + 4, midY);
        }

        ctx.textBaseline = 'top';
      }

      // Branding module below column 3
      if (c === 2) {
        const brandY = gridY + colH + 6;
        const brandH = rowH;
        ctx.fillStyle = '#fff'; rrLocal(cx, brandY, colW, brandH, 12); ctx.fill();
        ctx.strokeStyle = '#e5e5e5'; ctx.lineWidth = 1; rrLocal(cx, brandY, colW, brandH, 12); ctx.stroke();

        const brandMidY = brandY + brandH / 2;
        ctx.textBaseline = 'middle';

        let bx = cx + 12;
        if (siteLogo) {
          const bLogoH = 24, bLogoW = Math.round(siteLogo.naturalWidth / siteLogo.naturalHeight * bLogoH);
          ctx.drawImage(siteLogo, bx, brandMidY - bLogoH / 2, bLogoW, bLogoH);
          bx += bLogoW + 8;
        }

        ctx.fillStyle = '#171717'; ctx.font = "bold 14px 'Literata',Georgia,serif";
        ctx.fillText('big board lab', bx, brandMidY);
        bx += ctx.measureText('big board lab').width + 10;

        ctx.fillStyle = '#a3a3a3'; ctx.font = '10px ui-monospace,monospace';
        ctx.fillText('R1 prediction at bigboardlab.com', bx, brandMidY);

        ctx.textBaseline = 'top';
      }

      pickIdx += nPicks;
    }

    // Export
    canvas.toBlob(async blob => {
      if(!blob) return;
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if(isMobile && navigator.share && navigator.canShare){
        try {
          const file = new File([blob], 'bigboardlab-round1-prediction.png', {type: 'image/png'});
          if(navigator.canShare({files: [file]})){ await navigator.share({files: [file], title: 'Round 1 Prediction \u2014 Big Board Lab', text: 'AI-powered Round 1 prediction at bigboardlab.com'}); return; }
        } catch(e) {}
      }
      try {
        await navigator.clipboard.write([new ClipboardItem({'image/png': blob})]);
        setShareToast(true); setTimeout(() => setShareToast(false), 2000);
      } catch(e) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'bigboardlab-round1-prediction.png'; a.click();
        URL.revokeObjectURL(url);
      }
    }, 'image/png');
  };

  const [shareToast, setShareToast] = useState(false);

  // ── LOADING UI ──
  if(phase === "loading"){
    return (
      <div style={{position:"fixed",inset:0,background:"#faf9f6",zIndex:9000,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:font}}>
        <style>{`@keyframes bbl-pulse{0%,100%{opacity:.3;transform:scale(.95)}50%{opacity:1;transform:scale(1)}}`}</style>
        <img src="/logo.png" style={{height:48,animation:"bbl-pulse 1.5s ease-in-out infinite"}} alt=""/>
        <div style={{fontFamily:mono,fontSize:11,letterSpacing:2,textTransform:"uppercase",color:"#a3a3a3",marginTop:16}}>seeing the future...</div>
        <button onClick={onClose} style={{marginTop:32,fontFamily:sans,fontSize:11,padding:"7px 14px",background:"transparent",color:"#dc2626",border:"1px solid #fecaca",borderRadius:99,cursor:"pointer"}}>cancel</button>
      </div>
    );
  }

  // ── RESULTS UI ──
  return (
    <div style={{position:"fixed",inset:0,background:"#faf9f6",zIndex:9000,overflow:"auto",WebkitOverflowScrolling:"touch"}}>
      <div style={{maxWidth:900,margin:"0 auto",padding:"52px 16px 80px"}}>
        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
          <button onClick={onClose} style={{fontFamily:sans,fontSize:12,color:"#a3a3a3",background:"none",border:"1px solid #e5e5e5",borderRadius:99,padding:"5px 14px",cursor:"pointer"}}>{"\u2715 close"}</button>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <span style={{fontFamily:mono,fontSize:10,fontWeight:700,color:allExpanded?"#a855f7":"#a3a3a3"}}>expanded</span>
            <button onClick={toggleAll} style={{width:40,height:22,borderRadius:11,border:"none",background:allExpanded?"linear-gradient(135deg,#ec4899,#a855f7)":"#e5e5e5",cursor:"pointer",position:"relative",transition:"background 0.2s",padding:0}}>
              <div style={{width:16,height:16,borderRadius:8,background:"#fff",position:"absolute",top:3,left:allExpanded?3:21,transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}/>
            </button>
            <span style={{fontFamily:mono,fontSize:10,fontWeight:700,color:allExpanded?"#a3a3a3":"#525252"}}>collapsed</span>
            <button onClick={shareImage} style={{fontFamily:sans,fontSize:12,fontWeight:700,padding:"6px 14px",background:"transparent",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",display:"inline-flex",alignItems:"center",flexShrink:0,position:"relative"}}>
              <span className="shimmer-text">share mock sim</span>
            </button>
          </div>
        </div>

        {/* Title */}
        <div style={{textAlign:"center",marginBottom:24}}>
          <h1 style={{fontFamily:mono,fontSize:14,letterSpacing:3,textTransform:"uppercase",color:"#171717",margin:"0 0 4px",fontWeight:700}}>Round 1 Prediction</h1>
          <div style={{fontFamily:mono,fontSize:11,color:"#a3a3a3"}}>ai-powered mock simulation</div>
        </div>

        {/* Toast */}
        {shareToast && <div style={{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",fontFamily:sans,fontSize:12,fontWeight:600,color:"#fff",background:"#171717",padding:"8px 20px",borderRadius:99,zIndex:9999}}>Copied to clipboard</div>}

        {/* Two-column layout */}
        <style>{`@media(max-width:700px){.r1p-cols{flex-direction:column!important;}}
@keyframes donutFill{from{stroke-dashoffset:${2*Math.PI*18}}}`}</style>
        {(()=>{
          const renderCard = (slot, i) => {
            const player = slot.primary?.playerId ? prospectsMap[slot.primary.playerId] : null;
            if(!player) return null;
            const posKey = player.gpos || player.pos;
            const c = POS_COLORS[posKey] || POS_COLORS[player.pos] || '#737373';
            const isOpen = expanded.has(i);

            // Donut chart segments (purple gradient, sorted by count desc)
            const donutSegs = slot.posByPos ? Object.entries(slot.posByPos).sort((a,b)=>b[1]-a[1]) : [];
            const donutTotal = donutSegs.reduce((s,e)=>s+e[1],0);
            const DONUT_R = 18;
            const DONUT_CIRC = 2 * Math.PI * DONUT_R;
            const PURPLE_SCALE = ['#7c3aed','#a78bfa','#c4b5fd','#ddd6fe','#ede9fe','#f5f3ff'];

            return (
              <div key={i} style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,overflow:"hidden",cursor:"pointer"}} onClick={() => toggleSlot(i)}>
                <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px"}}>
                  <div style={{fontFamily:mono,fontSize:12,fontWeight:700,color:"#a3a3a3",width:28,textAlign:"right",flexShrink:0}}>#{slot.pickNum}</div>
                  <NFLTeamLogo team={slot.team} size={24}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <span style={{fontFamily:sans,fontSize:13,fontWeight:700,color:"#171717",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{player.name}</span>
                      <span style={{fontFamily:mono,fontSize:10,fontWeight:600,color:c,background:`${c}0d`,padding:"1px 6px",borderRadius:4,flexShrink:0}}>{posKey}</span>
                    </div>
                    <div style={{fontFamily:mono,fontSize:10,color:"#a3a3a3",marginTop:1}}>
                      {slot.team}{slot.isTrade ? <span style={{color:"#a855f7",marginLeft:4}}>via {TEAM_ABBR[slot.origTeam] || slot.origTeam}</span> : null}
                    </div>
                  </div>
                  <div style={{fontFamily:mono,fontSize:11,fontWeight:700,color:slot.primary.pct>=50?"#16a34a":slot.primary.pct>=30?"#ca8a04":"#dc2626",background:slot.primary.pct>=50?"#dcfce7":slot.primary.pct>=30?"#fef9c3":"#fef2f2",padding:"2px 8px",borderRadius:99,flexShrink:0}}>{slot.primary.pct}%</div>
                  {slot.isTrade && <div style={{fontFamily:mono,fontSize:8,fontWeight:700,color:"#a855f7",background:"rgba(168,85,247,0.08)",padding:"2px 6px",borderRadius:4,flexShrink:0}}>TRADE</div>}
                  <span style={{fontSize:10,color:"#d4d4d4",flexShrink:0,transition:"transform 0.15s",transform:isOpen?"rotate(180deg)":"rotate(0deg)"}}>{"\u25BC"}</span>
                </div>

                {isOpen && (
                  <div style={{padding:"0 14px 12px",borderTop:"1px solid #f5f5f5"}} onClick={e => e.stopPropagation()}>
                    {slot.alsoConsidered.length > 0 && (
                      <div style={{marginTop:8}}>
                        <div style={{fontFamily:mono,fontSize:9,letterSpacing:1,textTransform:"uppercase",color:"#a3a3a3",marginBottom:4}}>also considered</div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                          {slot.alsoConsidered.map((alt, j) => {
                            const ap = prospectsMap[alt.playerId];
                            if(!ap) return null;
                            const aPos = ap.gpos || ap.pos;
                            const aC = POS_COLORS[aPos] || POS_COLORS[ap.pos] || '#737373';
                            return (
                              <div key={j} style={{fontFamily:sans,fontSize:11,color:"#525252",display:"flex",alignItems:"center",gap:4,background:"#f9f9f6",padding:"3px 8px",borderRadius:6,border:"1px solid #f0f0f0"}}>
                                <span style={{fontFamily:mono,fontSize:9,fontWeight:600,color:aC}}>{aPos}</span>
                                <span>{ap.name}</span>
                                <span style={{fontFamily:mono,fontSize:10,color:"#a3a3a3"}}>({alt.pct}%)</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:8}}>
                      {slot.filledNeed && (
                        <div style={{fontFamily:mono,fontSize:10,color:"#16a34a",background:"#dcfce7",padding:"2px 8px",borderRadius:4}}>Filled need at {slot.filledNeed}</div>
                      )}
                      {slot.consRank < 900 && (
                        <div style={{fontFamily:mono,fontSize:10,color:"#525252",background:"#f5f5f5",padding:"2px 8px",borderRadius:4}}>Consensus #{slot.consRank}</div>
                      )}
                      {slot.isTrade && slot.tradePct > 0 && (
                        <div style={{fontFamily:mono,fontSize:10,color:"#a855f7",background:"rgba(168,85,247,0.06)",padding:"2px 8px",borderRadius:4}}>Traded up in {slot.tradePct}% of sims</div>
                      )}
                    </div>
                    {/* Position distribution donut */}
                    <div style={{marginTop:10}}>
                      <div style={{fontFamily:mono,fontSize:9,letterSpacing:1,textTransform:"uppercase",color:"#a3a3a3",marginBottom:6}}>position distribution</div>
                      <div style={{display:"flex",alignItems:"center",gap:12}}>
                        <svg width={48} height={48} viewBox="0 0 48 48" style={{flexShrink:0}}>
                          {(()=>{let cum=0;return donutSegs.map(([pos,cnt],si)=>{const frac=cnt/donutTotal;const len=frac*DONUT_CIRC;const off=-cum;cum+=len;const sc=PURPLE_SCALE[Math.min(si,PURPLE_SCALE.length-1)];return<circle key={pos} cx={24} cy={24} r={DONUT_R} fill="none" stroke={sc} strokeWidth={6} strokeDasharray={`${len} ${DONUT_CIRC}`} strokeDashoffset={off} transform="rotate(-90 24 24)" style={{animation:`donutFill 0.8s ${si*0.15}s ease-out both`}}/>;});})()}
                        </svg>
                        <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                          {donutSegs.map(([pos,cnt],si)=>{const pct=Math.round(cnt/donutTotal*100);const bg=PURPLE_SCALE[Math.min(si,PURPLE_SCALE.length-1)];const textColor=si<2?"#fff":"#525252";return(
                            <div key={pos} style={{fontFamily:mono,fontSize:10,fontWeight:600,color:textColor,background:bg,padding:"2px 8px",borderRadius:4}}>{pos} {pct}%</div>
                          );})}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          };
          const allOpen = expanded.size >= slots.length;
          if(allOpen){
            // Single column when expanded — variable heights, full width
            return (
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                {slots.map((slot, i) => renderCard(slot, i))}
              </div>
            );
          }
          // Two independent flex columns (desktop), one column on mobile
          const leftCol = slots.slice(0, 16);
          const rightCol = slots.slice(16, 32);
          return (
            <div className="r1p-cols" style={{display:"flex",gap:12}}>
              <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",gap:12}}>
                {leftCol.map((slot, i) => renderCard(slot, i))}
              </div>
              <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",gap:12}}>
                {rightCol.map((slot, i) => renderCard(slot, i + 16))}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
