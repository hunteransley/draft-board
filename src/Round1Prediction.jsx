import { useState, useEffect, useRef } from "react";
import { getConsensusRank, getConsensusGrade } from "./consensusData.js";
import { getScoutingTraits } from "./scoutingData.js";
import { getCombineScores } from "./combineTraits.js";
import { getProspectStats } from "./prospectStats.js";
import { TEAM_SCHEME } from "./depthChartUtils.js";
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

const TEAM_ABBR={Raiders:"LV",Jets:"NYJ",Cardinals:"ARI",Titans:"TEN",Giants:"NYG",Browns:"CLE",Commanders:"WAS",Saints:"NO",Chiefs:"KC",Bengals:"CIN",Dolphins:"MIA",Cowboys:"DAL",Rams:"LAR",Falcons:"ATL",Ravens:"BAL",Buccaneers:"TB",Colts:"IND",Lions:"DET",Vikings:"MIN",Panthers:"CAR",Packers:"GB",Steelers:"PIT",Chargers:"LAC",Eagles:"PHI",Bears:"CHI","49ers":"SF",Texans:"HOU",Jaguars:"JAX",Seahawks:"SEA",Patriots:"NE",Broncos:"DEN",Bills:"BUF"};

const NFL_TEAM_COLORS={"49ers":"#AA0000",Raiders:"#A5ACAF",Jets:"#125740",Cardinals:"#97233F",Titans:"#4B92DB",Giants:"#0B2265",Browns:"#FF3C00",Commanders:"#5A1414",Saints:"#D3BC8D",Chiefs:"#E31837",Bengals:"#FB4F14",Dolphins:"#008E97",Cowboys:"#003594",Rams:"#003594",Falcons:"#A71930",Ravens:"#241773",Buccaneers:"#D50A0A",Colts:"#002C5F",Lions:"#0076B6",Vikings:"#4F2683",Panthers:"#0085CA",Packers:"#203731",Steelers:"#FFB612",Chargers:"#0080C6",Eagles:"#004C54",Bears:"#C83200",Bills:"#00338D",Texans:"#03202F",Broncos:"#FB4F14",Patriots:"#002244",Seahawks:"#69BE28",Jaguars:"#006778"};

const NFL_TEAM_ESPN_IDS={Raiders:13,Jets:20,Cardinals:22,Titans:10,Giants:19,Browns:5,Commanders:28,Saints:18,Chiefs:12,Bengals:4,Dolphins:15,Cowboys:6,Rams:14,Ravens:33,Buccaneers:27,Lions:8,Vikings:16,Panthers:29,Steelers:23,Chargers:24,Eagles:21,Bears:3,Bills:2,"49ers":25,Texans:34,Broncos:7,Patriots:17,Seahawks:26,Falcons:1,Colts:11,Jaguars:30,Packers:9};

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
  const candidateTeams = [];
  const availSet=new Set(available);

  for(let i = currentIdx + 2; i < Math.min(currentIdx + 13, totalPicks); i++){
    if(tradedPickIdxs.has(i)) continue;
    const t = getPickTeam(i);
    if(!t || t === currentTeam) continue;
    const tAbbr=normalizeAbbr(TEAM_ABBR[t]||t);
    const gm=GM_PARAMS[tAbbr];
    if(!gm)continue;
    if(recentTraders.has(t)) continue;

    // Recipient must be willing to trade down
    if(Math.random()>gm.tradeDownWillingness) continue;

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
    if(totalOffer < currentVal * 0.78) continue;

    let prob=gm.tradeUpAggression*0.08;
    if(separation>=1.30)prob+=0.10;
    else if(separation>=1.15)prob+=0.04;
    if(currentPick<=10)prob*=1.3;
    else if(currentPick<=20)prob*=1.15;
    prob=Math.min(0.25,prob);
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
  board, PROSPECTS, POS_COLORS, NFLTeamLogo, SchoolLogo,
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

  // ── CANVAS SHARE ──
  const shareImage = async () => {
    if(trackEvent) trackEvent(userId, 'round1_prediction_share', {});
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const scale = 2;
    const W = 1200, H = 750;
    canvas.width = W * scale; canvas.height = H * scale;
    ctx.scale(scale, scale);

    // Background
    ctx.fillStyle = '#faf9f6'; ctx.fillRect(0, 0, W, H);

    // Top gradient bar
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, '#ec4899'); grad.addColorStop(1, '#7c3aed');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, 4);

    // Header
    const pad = 24;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center'; ctx.fillStyle = '#171717';
    ctx.font = 'bold 18px -apple-system,system-ui,sans-serif';
    ctx.fillText('2026 NFL DRAFT \u2014 ROUND 1 PREDICTION', W / 2, 14);
    ctx.fillStyle = '#a3a3a3'; ctx.font = '11px ui-monospace,monospace';
    ctx.fillText('AI-POWERED MOCK SIMULATION', W / 2, 36);
    ctx.textAlign = 'left';

    // Separator
    ctx.fillStyle = '#e5e5e5'; ctx.fillRect(pad, 52, W - pad * 2, 1);
    const sepGrad = ctx.createLinearGradient(pad, 0, W - pad, 0);
    sepGrad.addColorStop(0, '#ec4899'); sepGrad.addColorStop(1, '#7c3aed');
    ctx.fillStyle = sepGrad; ctx.fillRect(pad, 53, W - pad * 2, 2);

    const bodyY = 62, cols = 4, rows = 8;
    const colW = (W - pad * 2 - ((cols - 1) * 10)) / cols;
    const rowH = 74;

    // Load logos
    const logoCache = {};
    const uniqueTeams = [...new Set(slots.map(s => s.team))];
    await Promise.all(uniqueTeams.map(async t => {
      try { logoCache[t] = await loadImg(nflLogoUrl(t), 2000); } catch(e) {}
    }));

    for(let i = 0; i < Math.min(slots.length, 32); i++){
      const slot = slots[i];
      const player = slot.primary?.playerId ? prospectsMap[slot.primary.playerId] : null;
      if(!player) continue;
      const col = Math.floor(i / rows), row = i % rows;
      const x = pad + col * (colW + 10), y = bodyY + row * rowH;
      const tAccent = NFL_TEAM_COLORS[slot.team] || '#6366f1';

      ctx.fillStyle = '#fff'; rr(ctx, x, y, colW, rowH - 6, 5); ctx.fill();
      ctx.strokeStyle = '#f0f0f0'; ctx.lineWidth = 0.5; ctx.stroke();
      ctx.fillStyle = tAccent; ctx.fillRect(x, y + 2, 3, rowH - 10);

      // Pick number
      ctx.fillStyle = '#a3a3a3'; ctx.font = 'bold 12px ui-monospace,monospace'; ctx.textAlign = 'left';
      ctx.fillText('#' + (i + 1), x + 10, y + 14);

      // Team logo
      if(logoCache[slot.team]) ctx.drawImage(logoCache[slot.team], x + 38, y + 5, 24, 24);

      // Team name
      ctx.fillStyle = '#737373'; ctx.font = '10px -apple-system,system-ui,sans-serif';
      drawTrunc(ctx, TEAM_ABBR[slot.team] || slot.team, x + 66, y + 10, colW - 76);

      // Trade badge
      if(slot.isTrade){
        const tradeTxt = 'via ' + (TEAM_ABBR[slot.origTeam] || slot.origTeam);
        ctx.fillStyle = 'rgba(168,85,247,0.08)';
        const tw = ctx.measureText(tradeTxt).width + 8;
        rr(ctx, x + 66, y + 18, tw, 12, 3); ctx.fill();
        ctx.fillStyle = '#a855f7'; ctx.font = 'bold 7px ui-monospace,monospace';
        ctx.fillText(tradeTxt, x + 70, y + 24);
      }

      // Position
      const posKey = player.gpos || player.pos;
      const c = POS_COLORS[posKey] || POS_COLORS[player.pos] || '#737373';
      ctx.fillStyle = c; ctx.font = 'bold 10px ui-monospace,monospace';
      ctx.fillText(posKey, x + 10, y + 38);

      // Player name
      ctx.fillStyle = '#171717'; ctx.font = 'bold 13px -apple-system,system-ui,sans-serif';
      drawTrunc(ctx, player.name, x + 48, y + 38, colW - 56);

      // School
      ctx.fillStyle = '#a3a3a3'; ctx.font = '10px -apple-system,system-ui,sans-serif';
      drawTrunc(ctx, player.school || '', x + 48, y + 54, colW - 80);

      // Confidence %
      const pctTxt = slot.primary.pct + '%';
      ctx.fillStyle = '#64748b'; ctx.font = 'bold 10px ui-monospace,monospace';
      ctx.textAlign = 'right';
      ctx.fillText(pctTxt, x + colW - 8, y + 54);
      ctx.textAlign = 'left';
    }

    // Dark footer
    const footerH = 48;
    ctx.fillStyle = '#111111'; ctx.fillRect(0, H - footerH, W, footerH);
    let logo = null;
    try { logo = await loadImg('/logo.png', 2000); } catch(e) {}
    const logoH = 32, logoW = logo ? Math.round(logo.naturalWidth / logo.naturalHeight * logoH) : 0;
    const lo = logo ? logoW + 4 : 0;
    if(logo) ctx.drawImage(logo, pad, H - footerH + 8, logoW, logoH);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 13px -apple-system,system-ui,sans-serif'; ctx.textBaseline = 'top';
    ctx.fillText('bigboardlab.com', pad + lo + 4, H - footerH + 10);
    ctx.fillStyle = '#737373'; ctx.font = '10px -apple-system,system-ui,sans-serif';
    ctx.fillText('AI-powered Round 1 prediction', pad + lo + 4, H - footerH + 26);
    const bGrad = ctx.createLinearGradient(0, 0, W, 0);
    bGrad.addColorStop(0, '#ec4899'); bGrad.addColorStop(1, '#7c3aed');
    ctx.fillStyle = bGrad; ctx.fillRect(0, H - 3, W, 3);

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
        <style>{`@media(max-width:700px){.r1p-cols{flex-direction:column!important;}}`}</style>
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
                          {(()=>{let cum=0;return donutSegs.map(([pos,cnt],si)=>{const frac=cnt/donutTotal;const len=frac*DONUT_CIRC;const off=-cum;cum+=len;const sc=PURPLE_SCALE[Math.min(si,PURPLE_SCALE.length-1)];return<circle key={pos} cx={24} cy={24} r={DONUT_R} fill="none" stroke={sc} strokeWidth={6} strokeDasharray={`${len} ${DONUT_CIRC}`} strokeDashoffset={off} transform="rotate(-90 24 24)"/>;});})()}
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
