import { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef, Fragment, memo } from "react";
import { supabase } from "./supabase.js";
import MockDraftSim from "./MockDraftSim.jsx";
import Round1Prediction from "./Round1Prediction.jsx";
import GmQuiz from "./GmQuiz.jsx";
import DraftBracket from "./DraftBracket.jsx";
import { CONSENSUS_BOARD, getConsensusRank, getConsensusGrade, getConsensusRound } from "./consensusData.js";
import { getProspectStats } from "./prospectStats.js";
import { getStatBasedTraits } from "./statTraits.js";
import { getScoutingTraits } from "./scoutingData.js";
import { getCombineData, formatHeight } from "./combineData.js";
import { getCombineScores } from "./combineTraits.js";
import PROSPECT_STATS_STRUCT from "./prospectStatsStructured.json";
import HISTORICAL_STAT_DIST from "./historicalStatDist.json";
import TEAM_NEEDS_RICH, { TEAM_NEEDS_SIMPLE, TEAM_NEEDS_COUNTS } from "./teamNeedsData.js";
import TEAM_FREE_AGENCY from "./teamFreeAgencyData.js";
import { FA_CONTRACTS } from "./faContractData.js";
import { DRAFT_ORDER, DRAFT_ORDER_R1, DRAFT_YEAR, ROUND_BOUNDS } from "./draftConfig.js";
import { POSITION_TRAITS, TRAIT_EMOJI, TRAIT_ABBREV, TRAIT_SHORT, TRAIT_WEIGHTS, TRAIT_TEACHABILITY, POSITION_GROUPS, POS_EMOJI, POS_COLORS } from "./positions.js";
import { NFL_TEAM_ABR, NFL_TEAM_ESPN, NFL_TEAM_COLORS, ABBR_TO_TEAM } from "./teamConfig.js";
import { PROSPECTS_RAW } from "./prospects.js";
import NFL_ROSTERS from "./nflRosters.js";
import FA_FLAGS from "./freeAgencyFlags.js";
import { TEAM_ABBR, TEAM_SCHEME, getFormationPos, getSchemeDepthGroups } from "./depthChartUtils.js";
import { ROSTER_BY_SLOT, ROSTER_BY_NAME, formatContract, formatTradeValue, TIER_COLORS, AVAILABILITY_DISPLAY } from "./rosterValueData.js";
import { computeAllSchemeFits, getTopTeamFits, getTeamSchemeFits, getPositionAvgFit, generateScoutReasoning, computeTeamScoutVision } from "./schemeFit.js";
import SCOUTING_NARRATIVES from "./scoutingNarratives.json";
import SCOUTING_RAW from "./scoutingTraits.json";
import ARCHETYPE_DATA from "./archetypeData.json";
import { MARCH_MADNESS_TEAMS, MADNESS_METRICS, REGION_COLORS, madnessLogo, MADNESS_SCHOOL_COLORS } from "./marchMadnessData.js";
import { MADNESS_ROSTERS } from "./marchMadnessRosters.js";

// Archetype display constants (shared with MockDraftSim)
const ARCHETYPE_DISPLAY={"Slot / Nickel":"Slot","All-Purpose / Three-Down":"All-Purpose","Thumper / Run Stuffer":"Thumper","Hybrid / Chess Piece":"Chess Piece","Box Safety / Run Support":"Box","Center Field / Free Safety":"Center Field","Versatile / Complete":"Complete","Gap / Power Scheme":"Gap/Power","H-Back / Versatile":"H-Back","Y / Inline":"Inline","F / Move":"Move","X / Boundary":"Boundary"};
const ARCHETYPE_EMOJI={"Pocket Passer":"🗽","Dual-Threat":"🎭","Game Manager":"👔","Gunslinger":"🔫","Power Back":"🐗","Speed Back":"🏁","Receiving Back":"🪃","All-Purpose / Three-Down":"♠️","X / Boundary":"🍿","Slot":"🎰","Deep Threat":"🐆","Possession":"🛟","YAC Weapon":"🦇","Y / Inline":"🐏","F / Move":"🏄","Receiving TE":"🎣","H-Back / Versatile":"🧰","Pass Protector":"🚧","Road Grader":"🦣","Athletic Tackle":"🦑","Zone Scheme":"↔️","Gap / Power Scheme":"⬆️","Versatile":"🔄","Speed Rusher":"🌪️","Power Rusher":"🦏","Versatile / Complete":"🐉","Run Defender":"🦍","Penetrating 3-Tech":"🦡","Nose Tackle":"🐘","Two-Gap":"🐊","Coverage LB":"☂️","Thumper / Run Stuffer":"🔨","Pass Rusher":"🦈","Sideline-to-Sideline":"🐺","Hybrid / Chess Piece":"👽","Press Man":"🧟","Zone Corner":"🕸️","Slot / Nickel":"🦎","Box Safety / Run Support":"🦂","Center Field / Free Safety":"🛸","Hybrid":"🎲"};
function getArchetypes(name,school){const n=(name||"").toLowerCase().replace(/\./g,"").replace(/\s+(jr|sr|ii|iii|iv|v)\s*$/i,"").replace(/\s+/g," ").trim();const s=(school||"").toLowerCase().trim();return ARCHETYPE_DATA[n+"|"+s]||[];}

// Suffix-aware short name: "Rueben Bain Jr." → "Bain Jr." not "Jr."
const GEN_SUFFIXES=/^(Jr\.?|Sr\.?|II|III|IV|V|VI|VII|VIII)$/i;
function shortName(name){const p=name.split(" ");const last=p.pop()||"";return GEN_SUFFIXES.test(last)?(p.pop()||last)+" "+last:last;}

if(!window.__bbl_session){
  window.__bbl_session='anon_'+Math.random().toString(36).substr(2,9)+'_'+Date.now();
}

// Fire-and-forget event tracking — never blocks UI, silently drops on error
function trackEvent(userId,event,metadata={}){
  try{supabase.from('events').insert({user_id:userId||null,event,metadata,session_id:window.__bbl_session||null}).then();}catch(e){}
}

// ============================================================
// DATA: All 2026 NFL Draft Prospects (450+)
// ============================================================
const PROSPECTS = PROSPECTS_RAW.map((p,i)=>({...p,id:`p${i}`,gpos:(getProspectStats(p.name,p.school)?.gpos)||p.pos}));
const SCHOOL_ESPN_ID={"Alabama":333,"Arizona State":9,"Arizona St.":9,"Arizona":12,"Arkansas":8,"Arkansas State":2032,"Arkansas St.":2032,"Auburn":2,"BYU":252,"Baylor":239,"Boise State":68,"Boise St.":68,"Boston College":103,"Boston Col.":103,"Bowling Green":189,"Buffalo":2084,"Ball State":2050,"Cal":25,"California":25,"Central Florida":2116,"Central Michigan":2117,"Charlotte":2429,"Cincinnati":2132,"Clemson":228,"Coastal Carolina":324,"Colorado":38,"Colorado State":36,"Colorado St.":36,"Connecticut":41,"Dartmouth":159,"Duke":150,"East Carolina":151,"Eastern Washington":331,"East. Washington":331,"Florida Atlantic":2226,"Florida International":2229,"Florida State":52,"Florida St.":52,"Florida":57,"Fresno State":278,"Georgia Southern":290,"Georgia State":2247,"Georgia Tech":59,"Georgia":61,"Grambling State":2755,"Hawaii":62,"Houston":248,"Howard":47,"Idaho":70,"Illinois":356,"Illinois State":2287,"Incarnate Word":2916,"Indiana":84,"Iowa State":66,"Iowa St.":66,"Iowa":2294,"Jackson State":2296,"Jacksonville State":55,"James Madison":256,"Kansas State":2306,"Kansas St.":2306,"Kansas":2305,"Kentucky":96,"LSU":99,"Louisiana St":99,"Louisiana Tech":2348,"Louisiana-Lafayette":309,"Louisiana":309,"Louisville":97,"Liberty":2335,"Marshall":276,"Maryland":120,"Massachusetts":113,"Memphis":235,"Miami":2390,"Miami (FL)":2390,"Miami (OH)":193,"Miami (Ohio)":193,"Michigan State":127,"Michigan St.":127,"Michigan":130,"Middle Tennessee State":2393,"Minnesota":135,"Mississippi State":344,"Mississippi St.":344,"Mississippi":145,"Missouri":142,"Montana":149,"Montana State":147,"N.C. State":152,"NC State":152,"North Carolina State":152,"North Carolina St.":152,"Navy":2426,"Nebraska":158,"Nevada":2440,"New Mexico":167,"North Carolina":153,"North Carolina A&T":2448,"North Dakota State":2449,"North Texas":249,"Northern Illinois":2459,"Northwestern":77,"Notre Dame":87,"Ohio":195,"Ohio State":194,"Ohio St.":194,"Oklahoma":201,"Oklahoma State":197,"Oklahoma St.":197,"Old Dominion":295,"Oregon":2483,"Oregon State":204,"Oregon St.":204,"Penn State":213,"Penn St.":213,"Pittsburgh":221,"Purdue":2509,"Rice":242,"Rutgers":164,"SMU":2567,"San Diego State":21,"San Diego St.":21,"San Jose State":23,"San Jose St.":23,"Slippery Rock":2596,"South Alabama":6,"South Carolina":2579,"South Carolina State":2569,"South Dakota State":2571,"South Florida":58,"Southeastern Louisiana":2545,"Southern Illinois":79,"Southern Miss":2572,"Stanford":24,"Stephen F. Austin":2617,"Syracuse":183,"TCU":2628,"Temple":218,"Tennessee":2633,"Tennessee State":2634,"Texas A&M":245,"Texas State":326,"Texas Tech":2641,"Texas":251,"Texas-El Paso":2638,"Toledo":2649,"Troy":2653,"Tulane":2655,"Tulsa":202,"UCF":2116,"UCLA":26,"UConn":41,"UNLV":2439,"USC":30,"UTSA":2636,"Utah":254,"Utah State":328,"Vanderbilt":238,"Virginia":258,"Virginia Tech":259,"Virginia Union":2762,"Wake Forest":154,"Washington":264,"Washington State":265,"Washington St.":265,"West Virginia":277,"West. Michigan":2711,"Western Kentucky":98,"Western Michigan":2711,"Air Force":2005,"Akron":2006,"Appalachian State":2026,"Appalachian St.":2026,"Wisconsin":275,"Wyoming":2751,"Ala-Birmingham":5,"UAB":5,"Tenn-Chattanooga":236,"Tennessee-Chattanooga":236,"NW State (LA)":2466,"Northwestern St. (LA)":2466,"Northwestern State":2466,"La-Monroe":2433,"Louisiana-Monroe":2433,"East. Kentucky":2198,"Eastern Kentucky":2198,"East. Illinois":2197,"Eastern Illinois":2197,"East. Michigan":2199,"Eastern Michigan":2199,"Ark-Pine Bluff":2029,"University of Arkansas at Pine Bluff":2029,"Richmond":257,"Weber State":2692,"Northern Iowa":2460,"Central Arkansas":2110,"Furman":231,"Portland State":2502,"Harvard":108,"Florida A&M":50,"West Texas A&M":2704,"William & Mary":2729,"New Mexico State":166,"Southern Utah":253,"Southern Utah St.":253,"Youngstown State":2754,"Kent State":2309,"Kent St.":2309,"Northern Arizona":2464,"Cal Poly":13,"Villanova":222,"Norfolk State":2450,"Princeton":163,"Samford":2535,"Maine":311,"Abilene Christian":2000,"Citadel":2643,"Cornell":172,"South Dakota":233,"South Dakota St.":2571,"North Dakota St.":2449,"North Dakota":2448,"Elon":2210,"Army":349,"New Hampshire":160,"Idaho State":304,"Fordham":2230,"Lehigh":2329,"Rhode Island":227,"California-Davis":302,"UC Davis":302,"Northwest Missouri State":138,"Indiana (PA)":2291,"Fresno St.":278,"SE Louisiana":2545,"Texas-San Antonio":2636,"West. Carolina":2717,"West. Illinois":2710,"Western Illinois":2710,"Murray State":2413,"Morgan State":2404,"Central Oklahoma":2085,"McNeese State":2377,"Nicholls State":2447,"Nicholls St.":2447,"Sacramento State":16,"Sacramento St.":16,"Stony Brook":2617,"North Carolina Central":2428};
function schoolLogo(s){const id=SCHOOL_ESPN_ID[s];return id?`https://a.espncdn.com/i/teamlogos/ncaa/500/${id}.png`:null;}
const MEASURABLE_EMOJI={"HT":"📏","WT":"🪨","ARM":"🦾","HND":"🖐️","WING":"🪽","40":"🔫","VRT":"🦘","BRD":"🏔️","3C":"🔻","SHT":"♻️","ATH":"🏅","SPD":"🛩️","AGI":"🐇","EXP":"🌋"};
const MEASURABLE_SHORT={"HT":"Height","WT":"Weight","ARM":"Arms","HND":"Hand","WING":"Wing","40":"40","VRT":"Vert","BRD":"Broad","3C":"3-Cone","SHT":"Shuttle","ATH":"Athletic Score","SPD":"Speed Score","AGI":"Agility Score","EXP":"Explosion Score"};
const MEASURABLE_DRILLS=["40","VRT","BRD","3C","SHT"];
const MEASURABLE_COMPOSITES=["ATH","SPD","AGI","EXP"];
const MEASURABLE_RAW=["HT","WT","ARM","HND","WING"];
const MEASURABLE_LIST=[...MEASURABLE_DRILLS,...MEASURABLE_COMPOSITES,...MEASURABLE_RAW];
const MEAS_GROUPS=[{keys:["HT","WT","ARM","HND","WING"],border:"#a3a3a3"},{keys:["40","VRT","BRD","3C","SHT"],border:"#14b8a6"},{keys:["ATH","SPD","AGI","EXP"],border:"#6366f1"}];
const MEASURABLE_KEY={"HT":"height","WT":"weight","40":"forty","VRT":"vertical","BRD":"broad","3C":"cone","SHT":"shuttle","ATH":"athleticScore","SPD":"speedScore","AGI":"agilityScore","EXP":"explosionScore","ARM":"arms","HND":"hands","WING":"wingspan"};
const STAT_CATEGORIES=[
  {label:"Passing",keys:["passing_YDS","passing_PCT","passing_TD","passing_INT","passing_TDINT","passing_YPA","passing_DOM","breakout_year"],border:"#1e3a5f",positions:["QB"]},
  {label:"Rushing",keys:["rushing_CAR","rushing_YDS","rushing_YPC","rushing_TD","rushing_DOM","breakout_year"],border:"#5b21b6",positions:["QB","RB"]},
  {label:"Receiving",keys:["receiving_REC","receiving_YDS","receiving_YPR","receiving_TD","receiving_DOM","breakout_year"],border:"#0d9488",positions:["RB","WR","TE"]},
  {label:"Defensive",keys:["defensive_TKL","defensive_TFL","defensive_SACKS","defensive_QBHUR","defensive_PD","defensive_INT","defensive_FF","defensive_FR","defensive_TD","defensive_DOM","breakout_year"],border:"#15803d",positions:["EDGE","DL","LB","CB","S"]},
];
const STAT_SHORT={"passing_YDS":"Pass Yds","passing_TD":"Pass TD","passing_INT":"INT","passing_COMP":"Comp","passing_ATT":"Att","passing_PCT":"Comp%","passing_YPA":"YPA","passing_TDINT":"TD:INT","passing_DOM":"Dominator","rushing_CAR":"Carries","rushing_YDS":"Rush Yds","rushing_TD":"Rush TD","rushing_YPC":"YPC","rushing_DOM":"Dominator","receiving_REC":"Rec","receiving_YDS":"Rec Yds","receiving_TD":"Rec TD","receiving_YPR":"Y/Rec","receiving_DOM":"Dominator","breakout_year":"Breakout Year","defensive_TKL":"Tackles","defensive_TFL":"TFL","defensive_SACKS":"Sacks","defensive_QBHUR":"QB Hurries","defensive_PD":"PD","defensive_INT":"Def INT","defensive_FF":"FF","defensive_FR":"FR","defensive_TD":"Def TD","defensive_DOM":"Dominator"};
const STAT_EMOJI={"passing_YDS":"🏈","passing_TD":"🎯","passing_INT":"🚨","passing_PCT":"📊","passing_YPA":"📐","passing_TDINT":"⚖️","passing_DOM":"👑","rushing_CAR":"🏃","rushing_YDS":"💨","rushing_TD":"🔥","rushing_YPC":"📏","rushing_DOM":"👑","receiving_REC":"🧤","receiving_YDS":"📡","receiving_TD":"🎯","receiving_YPR":"📐","receiving_DOM":"👑","breakout_year":"💥","defensive_TKL":"💪","defensive_TFL":"🚧","defensive_SACKS":"🌪️","defensive_QBHUR":"💥","defensive_PD":"🖐️","defensive_INT":"🧲","defensive_FF":"💣","defensive_FR":"🏈","defensive_TD":"🏈","defensive_DOM":"👑"};
const INVERTED_STATS=new Set(["passing_INT"]);
const DECIMAL_STATS=new Set(["passing_PCT","passing_YPA","passing_TDINT","rushing_YPC","receiving_YPR","passing_DOM","rushing_DOM","receiving_DOM","defensive_DOM","defensive_SACKS"]);
const SCHOOL_CONFERENCE={"Alabama":"SEC","Arizona":"Big 12","Arizona State":"Big 12","Arkansas":"SEC","Auburn":"SEC","Baylor":"Big 12","Boise State":"MWC","Boston College":"ACC","Buffalo":"MAC","BYU":"Big 12","Cal":"Big Ten","California":"Big Ten","Central Michigan":"MAC","Cincinnati":"Big 12","Clemson":"ACC","Dartmouth":"Ivy","Duke":"ACC","Florida":"SEC","Florida International":"CUSA","Florida State":"ACC","Georgia":"SEC","Georgia State":"Sun Belt","Georgia Tech":"ACC","Houston":"Big 12","Illinois":"Big Ten","Incarnate Word":"FCS","Indiana":"Big Ten","Iowa":"Big Ten","Iowa State":"Big 12","James Madison":"Sun Belt","John Carroll":"D3","Kansas":"Big 12","Kansas State":"Big 12","Kentucky":"SEC","Louisiana Tech":"CUSA","Louisiana-Lafayette":"Sun Belt","Louisville":"ACC","LSU":"SEC","Maryland":"Big Ten","Memphis":"AAC","Miami":"ACC","Miami (FL)":"ACC","Miami (OH)":"MAC","Michigan":"Big Ten","Michigan State":"Big Ten","Minnesota":"Big Ten","Mississippi":"SEC","Mississippi State":"SEC","Missouri":"SEC","Montana":"FCS","N.C. State":"ACC","NC State":"ACC","Navy":"AAC","Nebraska":"Big Ten","New Mexico":"MWC","North Carolina":"ACC","North Dakota State":"FCS","Northwestern":"Big Ten","Notre Dame":"Ind","Ohio State":"Big Ten","Oklahoma":"SEC","Oregon":"Big Ten","Oregon State":"Pac-12","Penn State":"Big Ten","Pittsburgh":"ACC","Rutgers":"Big Ten","San Diego State":"MWC","Slippery Rock":"D2","SMU":"ACC","South Alabama":"Sun Belt","South Carolina":"SEC","South Carolina State":"FCS","Southeastern Louisiana":"FCS","Southern Miss":"Sun Belt","Stanford":"ACC","Stephen F. Austin":"FCS","Syracuse":"ACC","TCU":"Big 12","Tennessee":"SEC","Texas":"SEC","Texas A&M":"SEC","Texas State":"Sun Belt","Texas Tech":"Big 12","Toledo":"MAC","UCF":"Big 12","UCLA":"Big Ten","UConn":"Ind","USC":"Big Ten","Utah":"Big 12","UTSA":"AAC","Vanderbilt":"SEC","Virginia":"ACC","Virginia Tech":"ACC","Virginia Union":"D2","Wake Forest":"ACC","Washington":"Big Ten","Western Michigan":"MAC","Wisconsin":"Big Ten","Wyoming":"MWC"};
const INITIAL_ELO=1500;
const BBL_LOGO_B64="data:image/png;base64,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993WusbZohb7HSPJo6Fjiee3xJD+8/H0A4HqYxqJpqiZ008r5ZHHLnvcXEn3JXWkae+qTyyEpZCIisIhSDslutqDa3UDq62BtXQVGG1lDK4hkwHmCP2XDyPPuCo+RYaUlhhPBfG33HZHfuOJzar9E6jDct6XCmrWH0BOWy8/P6d1kTpzfPQIMOmr5Q6xtDP2aa5tImA9AeoH5API9vJfn8xzmODmOLXDsQcEKTdA787n6NYynoNRy11EztSXEfaI8egLvvNHs1wUEpwWI7r0ZNT9SzlfuZQh5p9zNlqunkHDpY6JtREfclwGB9SvCNZ+GepJE1gjopPNgt8keD/owFptg8Ytxw2LUui6KpZj7z6OoLP+h4d/NbPD4pdqa5w/SWiq6MnuX0kEmPz5UNT40tfDJqSPczVfhlpf1rLLS1JHID7fJL+TsrIUW9GjKICn0DtrdLhM44jFNbmwxk+WXAEj8FjH+J3ZikYHUmk6x7/RlthYR+JWE1B4wrNBD06X0LMZP4qudsTfwYDn8Qj/AMrfyxqXqb5XUe9W6MBt92jodEafm4nZGS+plYe7Scknj06QfPK1HxMaw0rtrs8NotLVYqa+eL4EzBIHPgjc7re+QjgPeT+z/iPsoT154kt0NVRSUsd1isVG8YdFbGGJxHvISX/gQD6KH5pZZ5nzTSPkkeepz3uyXH1JPdSxKeNWyXZEJSzwfCIitIBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAf//Z";
function expectedScore(rA,rB){return 1/(1+Math.pow(10,(rB-rA)/400));}
function eloUpdate(rA,rB,aWon,k=32){const eA=expectedScore(rA,rB);return{newA:rA+k*((aWon?1:0)-eA),newB:rB+k*((aWon?0:1)-(1-eA))};}
function generateMatchups(ids,consensusRankFn){
  // Front-load matchups involving top consensus prospects
  const sorted=[...ids].sort((a,b)=>(consensusRankFn?.(a)||999)-(consensusRankFn?.(b)||999));
  const topN=sorted.slice(0,Math.min(15,Math.ceil(ids.length*0.3))); // top 30% or 15, whichever smaller
  const rest=sorted.slice(topN.length);
  // Phase 1: all pairs among top players (most important comparisons)
  const phase1=[];
  for(let i=0;i<topN.length;i++)for(let j=i+1;j<topN.length;j++)phase1.push([topN[i],topN[j]]);
  // Phase 2: top players vs rest (establishes boundary)
  const phase2=[];
  for(let i=0;i<topN.length;i++)for(let j=0;j<rest.length;j++)phase2.push([topN[i],rest[j]]);
  // Phase 3: rest vs rest (least important)
  const phase3=[];
  for(let i=0;i<rest.length;i++)for(let j=i+1;j<rest.length;j++)phase3.push([rest[i],rest[j]]);
  // Shuffle within each phase
  const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
  return[...shuffle(phase1),...shuffle(phase2),...shuffle(phase3)];
}
function getNextMatchup(mups,done,ratings,compCounts,consensusRankFn,lockedId){
  let rem=mups.filter(m=>!done.has(`${m[0]}-${m[1]}`));
  if(lockedId)rem=rem.filter(m=>m[0]===lockedId||m[1]===lockedId);
  if(!rem.length)return null;
  // Score each remaining matchup: prefer matchups involving top consensus players with few comparisons
  rem.forEach(m=>{
    const crA=consensusRankFn?.(m[0])||999;const crB=consensusRankFn?.(m[1])||999;
    const ccA=compCounts?.[m[0]]||0;const ccB=compCounts?.[m[1]]||0;
    // Priority: top consensus players who haven't been compared much
    // Lower score = higher priority
    const consensusBonus=(Math.min(crA,crB)<=5?-200:Math.min(crA,crB)<=10?-100:Math.min(crA,crB)<=15?-50:0);
    const undersampledBonus=-(Math.max(0,3-ccA)*40+Math.max(0,3-ccB)*40); // bonus for players under 3 comps
    const eloCloseness=Math.abs((ratings[m[0]]||1500)-(ratings[m[1]]||1500));
    m._score=consensusBonus+undersampledBonus+eloCloseness;
  });
  rem.sort((a,b)=>a._score-b._score);
  // Pick from top 3 candidates with slight randomness
  return rem[Math.floor(Math.random()*Math.min(3,rem.length))];
}
function nflLogo(team){const id=NFL_TEAM_ESPN[team];return id?`https://a.espncdn.com/i/teamlogos/nfl/500/${id}.png`:null;}
function NFLTeamLogo({team,size=20}){const[err,setErr]=useState(false);const url=nflLogo(team);if(!url||err)return<span style={{fontFamily:"monospace",fontSize:size*0.5,color:"#a3a3a3"}}>{NFL_TEAM_ABR[team]||team}</span>;return<img src={url} alt={team} width={size} height={size} onError={()=>setErr(true)} style={{objectFit:"contain",flexShrink:0}}/>;}
const MIN_COMPS=3;
// Sim remaining matchups using weighted consensus + user preference + randomness
function simRemainingMatchups(allMatchups,completedSet,currentRatings,ids,consensusRankFn){
  const r={...currentRatings};
  ids.forEach(id=>{if(!r[id])r[id]=INITIAL_ELO;});
  const remaining=allMatchups.filter(m=>!completedSet.has(`${m[0]}-${m[1]}`));
  const newCompleted=new Set(completedSet);
  remaining.forEach(([a,b])=>{
    const crA=consensusRankFn?.(a)||999;const crB=consensusRankFn?.(b)||999;
    // Consensus weight: lower rank = better
    const consensusFavorsA=crA<crB?0.65:crA>crB?0.35:0.5;
    // User preference weight: higher Elo = better
    const userFavorsA=expectedScore(r[a]||1500,r[b]||1500);
    // Blend: 60% consensus, 30% user preference, 10% random
    const blended=0.6*consensusFavorsA+0.3*userFavorsA+0.1*Math.random();
    const aWins=blended>0.5;
    // Use lower K for sim'd matchups (less impact per match)
    const{newA,newB}=eloUpdate(r[a]||1500,r[b]||1500,aWins,16);
    r[a]=newA;r[b]=newB;
    newCompleted.add(`${a}-${b}`);
  });
  return{ratings:r,completed:newCompleted};
}
const font=`'Literata',Georgia,serif`;const mono=`'DM Mono','Courier New',monospace`;const sans=`'DM Sans','Helvetica Neue',sans-serif`;

// ============================================================
// Components
// Trait value lookup: user traits → scouting → stat-derived → 50
function tv(userTraits,id,trait,name,school){return userTraits[id]?.[trait]??getScoutingTraits(name,school)?.[trait]??getStatBasedTraits(name,school)?.[trait]??50;}

function normStatName(n){return n.toLowerCase().replace(/\s+(jr\.?|sr\.?|ii|iii|iv|v)$/i,"").replace(/[^a-z\s]/g,"").trim();}
const _statNameCache={};function _statLookup(name,school){const key=normStatName(name)+"|"+school.toLowerCase();if(PROSPECT_STATS_STRUCT[key])return PROSPECT_STATS_STRUCT[key];const cacheKey=name+"|"+school;if(cacheKey in _statNameCache)return _statNameCache[cacheKey];const nn=normStatName(name);const match=Object.keys(PROSPECT_STATS_STRUCT).find(k=>k.split("|")[0]===nn);_statNameCache[cacheKey]=match?PROSPECT_STATS_STRUCT[match]:null;return _statNameCache[cacheKey];}
function getStatVal(name,school,statKey){return _statLookup(name,school)?.[statKey]??null;}
function getStatPercentile(name,school,statKey,group){const val=getStatVal(name,school,statKey);if(val==null)return null;const dist=HISTORICAL_STAT_DIST[group]?.[statKey];if(!dist||dist.length===0)return null;let lo=0,hi=dist.length;while(lo<hi){const mid=(lo+hi)>>1;if(dist[mid]<=val)lo=mid+1;else hi=mid;}const inverted=INVERTED_STATS.has(statKey);const pct=inverted?(1-lo/dist.length)*100:(lo/dist.length)*100;return Math.round(pct*10)/10;}

function getMeasRadarData(name,school){const cs=getCombineScores(name,school);if(!cs)return null;const axes=["40","VRT","BRD","3C","SHT","ATH","SPD","AGI","EXP"];const labels=[];const values=[];const proDay=new Set(cs.proDayFields||[]);const proDaySpokes=[];axes.forEach(m=>{const key=MEASURABLE_KEY[m];let v=null;if(MEASURABLE_DRILLS.includes(m)){v=cs.percentiles?.[key]??null;}else{v=cs[key]??null;}if(v!=null){labels.push(m);values.push(Math.round(v));if(proDay.has(key))proDaySpokes.push(m);}});return labels.length>=3?{labels,values,proDaySpokes}:null;}

// ============================================================
function SchoolLogo({school,size=32}){const[err,setErr]=useState(false);const url=schoolLogo(school);if(!url||err)return<div style={{width:size,height:size,borderRadius:"50%",background:"#f0f0f0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.4,fontWeight:700,color:"#a3a3a3",flexShrink:0,fontFamily:"system-ui"}}>{school.charAt(0)}</div>;return<img src={url} alt={school} width={size} height={size} onError={()=>setErr(true)} style={{objectFit:"contain",flexShrink:0}}/>;}

function TwitterFooter(){return<div style={{textAlign:"center",padding:"12px 24px 4px"}}><a href="https://x.com/bigboardlab" target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:6,textDecoration:"none",color:"#a3a3a3",fontFamily:"'SF Mono',SFMono-Regular,ui-monospace,monospace",fontSize:11,letterSpacing:0.3}} onMouseEnter={e=>e.currentTarget.style.color="#1DA1F2"} onMouseLeave={e=>e.currentTarget.style.color="#a3a3a3"}><svg width="14" height="14" viewBox="0 0 248 204" fill="currentColor"><path d="M221.95 51.29c.15 2.17.15 4.34.15 6.53 0 66.73-50.8 143.69-143.69 143.69v-.04A143.72 143.72 0 0 1 1 178.82a101.7 101.7 0 0 0 12.02.73c22.74.02 44.83-7.61 62.72-21.66-21.61-.41-40.56-14.5-47.18-35.07a50.34 50.34 0 0 0 22.8-.87c-23.56-4.76-40.51-25.46-40.51-49.5v-.64a50.18 50.18 0 0 0 22.92 6.32C11.58 63.31 4.74 33.79 18.14 10.71a143.33 143.33 0 0 0 104.08 52.76 50.53 50.53 0 0 1 14.61-48.25c20.34-19.12 52.13-18.14 71.25 2.19 11.31-2.23 22.15-6.38 32.07-12.26a50.69 50.69 0 0 1-22.2 27.93c10.01-1.2 19.79-3.86 29-7.95a102.6 102.6 0 0 1-25.2 26.16z"/></svg>@bigboardlab</a></div>;}

function RadarChart({traits,values,color,size=180,labelMap,proDaySpokes}){const cx=size/2,cy=size/2,pad=labelMap?32:24,r=size/2-pad,n=traits.length;const K=1.8;const curve=(v)=>Math.pow(v/100,K)*100;const FLOOR=curve(40);const angles=traits.map((_,i)=>(Math.PI*2*i)/n-Math.PI/2);const pdSet=new Set(proDaySpokes||[]);const pv=angles.map((a,i)=>{const raw=values[i]||50;const v=Math.max(0,(curve(raw)-FLOOR)/(100-FLOOR));return[cx+r*v*Math.cos(a),cy+r*v*Math.sin(a)];});return(<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}><style>{`@keyframes radarDraw{0%{transform:scale(0);opacity:0}60%{transform:scale(1.05);opacity:0.8}100%{transform:scale(1);opacity:1}}@keyframes radarFill{0%{fill-opacity:0}100%{fill-opacity:1}}@keyframes radarDots{0%{opacity:0;transform:scale(0)}100%{opacity:1;transform:scale(1)}}`}</style>{[50,60,70,80,90,100].map(lv=>{const frac=Math.max(0,(curve(lv)-FLOOR)/(100-FLOOR));return<polygon key={lv} points={angles.map(a=>`${cx+r*frac*Math.cos(a)},${cy+r*frac*Math.sin(a)}`).join(" ")} fill="none" stroke={lv===70?"#d4d4d4":"#e5e5e5"} strokeWidth={lv===70?"0.8":"0.5"}/>;})}{angles.map((a,i)=><line key={i} x1={cx} y1={cy} x2={cx+r*Math.cos(a)} y2={cy+r*Math.sin(a)} stroke="#e5e5e5" strokeWidth="0.5"/>)}<polygon points={pv.map(p=>p.join(",")).join(" ")} fill={`${color}18`} stroke={color} strokeWidth="2" style={{transformOrigin:`${cx}px ${cy}px`,animation:"radarDraw 700ms cubic-bezier(0.34,1.3,0.64,1) both, radarFill 400ms ease-out 300ms both"}}/>{pv.map((p,i)=>{const isPD=pdSet.has(traits[i]);return<circle key={i} cx={p[0]} cy={p[1]} r={isPD?3.5:3} fill={isPD?"#fff":color} stroke={isPD?color:"none"} strokeWidth={isPD?1.5:0} style={{transformOrigin:`${p[0]}px ${p[1]}px`,animation:`radarDots 300ms ease-out ${400+i*50}ms both`}}>{isPD&&<title>Pro Day</title>}</circle>;})}{traits.map((t,i)=>{const lr=r+(labelMap?20:14);const label=labelMap?labelMap[t]||t:t.split(" ").map(w=>w[0]).join("");return<text key={t} x={cx+lr*Math.cos(angles[i])} y={cy+lr*Math.sin(angles[i])} textAnchor="middle" dominantBaseline="middle" style={{fontSize:labelMap?"7px":"8px",fill:"#737373",fontFamily:"monospace",fontWeight:labelMap?600:400}}>{label}</text>;})}</svg>);}

function MiniRadar({values,color,size=28}){const cx=size/2,cy=size/2,r=size/2-1,n=values.length;if(n<3)return null;const K=1.8;const curve=(v)=>Math.pow(v/100,K)*100;const FLOOR=curve(40);const angles=values.map((_,i)=>(Math.PI*2*i)/n-Math.PI/2);const pts=angles.map((a,i)=>{const v=Math.max(0,(curve(values[i]||50)-FLOOR)/(100-FLOOR));return`${cx+r*v*Math.cos(a)},${cy+r*v*Math.sin(a)}`;}).join(" ");return<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mini-radar" style={{flexShrink:0}}><polygon points={angles.map(a=>`${cx+r*Math.cos(a)},${cy+r*Math.sin(a)}`).join(" ")} fill="none" stroke="#e5e5e5" strokeWidth="0.5"/><polygon points={pts} fill={`${color}20`} stroke={color} strokeWidth="1.2"/></svg>;}

// ============================================================
// Beeswarm Chart — Combine Explorer
// ============================================================
const EXPLORER_GROUPS=["QB","RB","WR","TE","OT","IOL","EDGE","DL","LB","CB","S"];
const INVERTED_MEAS=new Set(["40","3C","SHT"]);

const COMBO_DEFAULTS={EDGE:["defensive_SACKS","meas_40"],WR:["receiving_YDS","meas_SPD"],RB:["rushing_YDS","meas_SPD"],QB:["passing_YDS","passing_TDINT"],TE:["receiving_YDS","meas_ATH"],OT:["meas_ATH","meas_WT"],IOL:["meas_ATH","meas_WT"],DL:["defensive_TFL","meas_ATH"],LB:["defensive_TKL","meas_SPD"],CB:["meas_40","defensive_PD"],S:["meas_40","defensive_INT"]};

const COMBO_CAT_STYLE={M:{label:"MEAS",color:"#14b8a6"},S:{label:"SCORE",color:"#6366f1"},T:{label:"TRAIT",color:"#f59e0b"},P:{label:"PROD",color:"#ef4444"}};
function getComboMetrics(pos){
  const out=[];
  ["HT","WT","40","VRT","BRD","3C","SHT","ARM","HND","WING"].forEach(m=>{
    out.push({key:"meas_"+m,label:MEASURABLE_SHORT[m]||m,inverted:INVERTED_MEAS.has(m),unit:m==="HT"?"ht":m==="WT"?"lbs":(m==="ARM"||m==="HND"||m==="WING")?"in":(m==="40"||m==="3C"||m==="SHT")?"s":"",cat:"M"});
  });
  ["ATH","SPD","AGI","EXP"].forEach(m=>{
    out.push({key:"meas_"+m,label:MEASURABLE_SHORT[m]||m,inverted:false,unit:"score",cat:"S"});
  });
  (POSITION_TRAITS[pos]||[]).forEach(t=>{
    out.push({key:"trait_"+t,label:t,inverted:false,unit:"trait",cat:"T"});
  });
  STAT_CATEGORIES.forEach(cat=>{
    if(!cat.positions.includes(pos))return;
    cat.keys.forEach(k=>{
      if(k==="breakout_year")return;
      out.push({key:k,label:STAT_SHORT[k]||k,inverted:INVERTED_STATS.has(k),unit:"stat",cat:"P"});
    });
  });
  return out;
}

function getComboVal(name,school,id,metricKey,pos,userTraits){
  if(metricKey.startsWith("meas_")){
    const m=metricKey.slice(5);
    const rawKey=MEASURABLE_KEY[m];
    if(MEASURABLE_DRILLS.includes(m)||MEASURABLE_RAW.includes(m)){
      const cd=getCombineData(name,school);
      return cd?.[rawKey]??null;
    }
    // Composite scores (ATH, SPD, AGI, EXP)
    const cs=getCombineScores(name,school);
    return cs?.[rawKey]??null;
  }
  if(metricKey.startsWith("trait_")){
    const trait=metricKey.slice(6);
    return tv(userTraits,id,trait,name,school);
  }
  // Raw stat key
  return getStatVal(name,school,metricKey);
}

function beeswarmLayoutVertical(points,chartH,colW,dotR,globalMin,globalMax,inverted){
  if(!points.length||chartH<60)return[];
  const sorted=[...points].sort((a,b)=>a.val-b.val);
  const range=globalMax-globalMin||1;
  const pad=dotR*4;
  const usable=chartH-pad*2;
  const placed=[];
  for(const pt of sorted){
    const y=inverted?pad+((pt.val-globalMin)/range)*usable:pad+((globalMax-pt.val)/range)*usable;
    const cx=colW/2;
    let x=cx;
    let offset=0;
    let dir=1;
    let settled=false;
    while(!settled){
      settled=true;
      for(const other of placed){
        if(other.group!==pt.group)continue;
        const dx=x-other.x,dy=y-other.y;
        if(dx*dx+dy*dy<(dotR*2.2)*(dotR*2.2)){
          settled=false;
          offset+=dotR*1.1;
          dir=-dir;
          x=cx+(dir>0?1:-1)*offset;
          break;
        }
      }
    }
    placed.push({...pt,x,y});
  }
  return placed;
}

const BeeswarmChart=memo(function BeeswarmChart({data,width,myGuys,showMyGuys,showLogos,onHover,onTap,hoveredId}){
  const isMobile=width<600;
  const dotR=isMobile?3.5:4.5;
  const chartH=isMobile?320:400;
  const labelH=isMobile?28:32;
  const axisW=isMobile?32:40;
  const groups=data.groups;
  const colW=Math.floor((width-axisW)/groups.length);
  const totalW=axisW+colW*groups.length;
  const totalH=chartH+labelH;
  const myGuyNames=useMemo(()=>new Set((myGuys||[]).map(g=>g.name)),[myGuys]);

  const layoutR=showLogos?(isMobile?7:9):dotR;
  const laid=useMemo(()=>{
    const byGroup={};
    groups.forEach(g=>byGroup[g]=[]);
    data.points.forEach(pt=>{if(byGroup[pt.group])byGroup[pt.group].push(pt);});
    const all=[];
    groups.forEach(g=>{
      const pts=beeswarmLayoutVertical(byGroup[g],chartH,colW,layoutR,data.min,data.max,data.inverted);
      all.push(...pts);
    });
    return all;
  },[data.points,groups,chartH,colW,layoutR,data.min,data.max]);

  const axisVals=useMemo(()=>{
    const mn=data.min,mx=data.max,range=mx-mn||1;
    const step=range<=10?1:range<=50?5:range<=100?10:range<=200?25:50;
    const ticks=[];
    const start=Math.ceil(mn/step)*step;
    for(let v=start;v<=mx;v+=step)ticks.push(v);
    if(ticks.length>8){const keep=[];for(let i=0;i<ticks.length;i+=Math.ceil(ticks.length/6))keep.push(ticks[i]);return keep;}
    return ticks;
  },[data.min,data.max]);

  const pad=dotR*4;
  const usable=chartH-pad*2;
  const range=data.max-data.min||1;
  const valToY=(v)=>data.inverted?pad+((v-data.min)/range)*usable:pad+((data.max-v)/range)*usable;

  return(<svg width={totalW} height={totalH} viewBox={`0 0 ${totalW} ${totalH}`} style={{display:"block"}}>
    {/* Horizontal grid lines + Y-axis labels */}
    {axisVals.map(v=>{const y=valToY(v);return<g key={v}>
      <line x1={axisW} y1={y} x2={totalW} y2={y} stroke="#e5e5e5" strokeWidth="0.5"/>
      <text x={axisW-4} y={y} textAnchor="end" dominantBaseline="middle" style={{fontSize:"9px",fill:"#a3a3a3",fontFamily:"monospace"}}>{data.inverted?v.toFixed(2):v%1?v.toFixed(1):Math.round(v)}</text>
    </g>;})}
    {/* Column backgrounds + position labels at bottom */}
    {groups.map((g,i)=><g key={g}>
      {i%2===0&&<rect x={axisW+i*colW} y={0} width={colW} height={chartH} fill="#f5f5f4" rx="0"/>}
      <text x={axisW+i*colW+colW/2} y={chartH+labelH/2+2} textAnchor="middle" dominantBaseline="middle" style={{fontSize:isMobile?"9px":"11px",fill:POS_COLORS[g]||"#737373",fontFamily:"monospace",fontWeight:700}}>{g}</text>
    </g>)}
    {/* Dots / Logos */}
    {laid.map(pt=>{
      const gi=groups.indexOf(pt.group);
      const cx=axisW+gi*colW+pt.x;
      const cy=pt.y;
      const isMyGuy=showMyGuys&&myGuyNames.has(pt.name);
      const fade=showMyGuys&&myGuyNames.size>0&&!isMyGuy;
      const isHovered=hoveredId===pt.id;
      const color=POS_COLORS[pt.pos]||POS_COLORS[pt.group]||"#737373";
      const logoSize=isMobile?14:18;
      return<g key={pt.id} style={{cursor:"pointer"}}>
        <circle cx={cx} cy={cy} r={showLogos?logoSize/2+2:12} fill="transparent" stroke="none" style={{outline:"none"}}
          onPointerEnter={(e)=>onHover({...pt,cx:e.clientX,cy:e.clientY})}
          onPointerLeave={()=>onHover(null)}
          onClick={()=>onTap(pt)}/>
        {showLogos?(()=>{const logoUrl=schoolLogo(pt.school);return logoUrl?<image href={logoUrl} x={cx-logoSize/2} y={cy-logoSize/2} width={logoSize} height={logoSize} opacity={fade?0.25:1} style={{pointerEvents:"none"}}/>
          :<circle cx={cx} cy={cy} r={dotR} fill="#d4d4d4" opacity={fade?0.25:1} style={{pointerEvents:"none"}}/>;})()
        :<circle cx={cx} cy={cy} r={isMyGuy?dotR+1.5:dotR}
          fill={fade?"#d4d4d4":color}
          opacity={fade?0.3:1}
          stroke={isMyGuy?"#ec4899":isHovered?"#171717":"none"}
          strokeWidth={isMyGuy?2:isHovered?1.5:0}
          style={{transition:"cx 0.3s,cy 0.3s,opacity 0.2s",pointerEvents:"none"}}/>}
      </g>;
    })}
    {/* Y-axis label */}
    <text x={10} y={chartH/2} textAnchor="middle" dominantBaseline="middle" transform={`rotate(-90,10,${chartH/2})`} style={{fontSize:"10px",fill:"#a3a3a3",fontFamily:"monospace"}}>{data.label}</text>
  </svg>);
});

function BeeswarmChartWrapper({data,myGuys,showMyGuys,showLogos,onHover,onTap,hoveredId}){
  const ref=useRef(null);
  const[w,setW]=useState(800);
  useEffect(()=>{
    const el=ref.current;if(!el)return;
    setW(el.getBoundingClientRect().width);
    const ro=new ResizeObserver(entries=>{for(const e of entries)setW(e.contentRect.width);});
    ro.observe(el);return()=>ro.disconnect();
  },[]);
  return<div ref={ref}>{w>0&&<BeeswarmChart data={data} width={w} myGuys={myGuys} showMyGuys={showMyGuys} showLogos={showLogos} onHover={onHover} onTap={onTap} hoveredId={hoveredId}/>}</div>;
}

const ScatterChart=memo(function ScatterChart({points,width,xLabel,yLabel,xInverted,yInverted,posColor,showLogos,onHover,onTap,hoveredId,myGuys,showMyGuys,spotlightName}){
  const isMobile=width<600;
  const chartH=isMobile?300:380;
  const padT=16,padR=20,padB=36,padL=isMobile?42:50;
  const plotW=width-padL-padR;
  const plotH=chartH-padT-padB;

  const xs=points.map(p=>p.x),ys=points.map(p=>p.y);
  if(!xs.length)return null;
  const xRaw={min:Math.min(...xs),max:Math.max(...xs)};
  const yRaw={min:Math.min(...ys),max:Math.max(...ys)};
  const xPad=(xRaw.max-xRaw.min||1)*0.05;
  const yPad=(yRaw.max-yRaw.min||1)*0.05;
  const xMin=xRaw.min-xPad,xMax=xRaw.max+xPad;
  const yMin=yRaw.min-yPad,yMax=yRaw.max+yPad;

  const sx=v=>{const t=(v-xMin)/(xMax-xMin||1);return padL+(xInverted?plotW*(1-t):plotW*t);};
  const sy=v=>{const t=(v-yMin)/(yMax-yMin||1);return padT+(yInverted?plotH*t:plotH*(1-t));};

  const xMean=xs.reduce((a,b)=>a+b,0)/xs.length;
  const yMean=ys.reduce((a,b)=>a+b,0)/ys.length;

  // Least-squares regression + R²
  const n=xs.length;
  const sumX=xs.reduce((a,b)=>a+b,0),sumY=ys.reduce((a,b)=>a+b,0);
  const sumXY=points.reduce((a,p)=>a+p.x*p.y,0);
  const sumX2=xs.reduce((a,b)=>a+b*b,0),sumY2=ys.reduce((a,b)=>a+b*b,0);
  const denom=n*sumX2-sumX*sumX;
  const slope=denom?((n*sumXY-sumX*sumY)/denom):0;
  const intercept=(sumY-slope*sumX)/n;
  const ssRes=points.reduce((a,p)=>{const pred=slope*p.x+intercept;return a+(p.y-pred)**2;},0);
  const ssTot=ys.reduce((a,v)=>a+(v-yMean)**2,0);
  const r2=ssTot>0?1-ssRes/ssTot:0;

  const fmtTick=v=>Math.abs(v)<10?v.toFixed(2):Math.abs(v)<100?v.toFixed(1):Math.round(v).toString();
  const xTicks=[];const yTicks=[];
  for(let i=0;i<5;i++){xTicks.push(xMin+(xMax-xMin)*((i+0.5)/5));yTicks.push(yMin+(yMax-yMin)*((i+0.5)/5));}

  const logoSize=isMobile?14:18;
  const dotR=isMobile?4:5;
  const myGuyNames=useMemo(()=>new Set((myGuys||[]).map(g=>g.name)),[myGuys]);

  return(<svg width={width} height={chartH} viewBox={`0 0 ${width} ${chartH}`} style={{display:"block"}}>
    {/* Grid lines */}
    {xTicks.map((v,i)=><line key={"xg"+i} x1={sx(v)} y1={padT} x2={sx(v)} y2={padT+plotH} stroke="#f0f0f0" strokeWidth="0.5"/>)}
    {yTicks.map((v,i)=><line key={"yg"+i} x1={padL} y1={sy(v)} x2={padL+plotW} y2={sy(v)} stroke="#f0f0f0" strokeWidth="0.5"/>)}
    {/* Mean lines */}
    <line x1={sx(xMean)} y1={padT} x2={sx(xMean)} y2={padT+plotH} stroke="#a3a3a3" strokeDasharray="4 3" opacity={0.35}/>
    <line x1={padL} y1={sy(yMean)} x2={padL+plotW} y2={sy(yMean)} stroke="#a3a3a3" strokeDasharray="4 3" opacity={0.35}/>
    {/* Trend line */}
    {n>=4&&(()=>{
      const y1t=slope*xMin+intercept,y2t=slope*xMax+intercept;
      const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
      const ty1=clamp(y1t,yMin,yMax),ty2=clamp(y2t,yMin,yMax);
      const tx1=slope?(ty1-intercept)/slope:xMin,tx2=slope?(ty2-intercept)/slope:xMax;
      return<line x1={sx(clamp(tx1,xMin,xMax))} y1={sy(ty1)} x2={sx(clamp(tx2,xMin,xMax))} y2={sy(ty2)} stroke="#6366f1" strokeWidth="1.5" strokeDasharray="6 4" opacity={0.5}/>;
    })()}
    {/* R² label */}
    {n>=4&&<text x={padL+plotW-4} y={padT+plotH-6} textAnchor="end" style={{fontSize:"9px",fill:"#6366f1",fontFamily:"monospace",fontWeight:600,opacity:0.7}}>r²={r2.toFixed(2)}</text>}
    {/* Best label */}
    <text x={padL+plotW-4} y={padT+10} textAnchor="end" style={{fontSize:"9px",fill:"#16a34a",fontFamily:"monospace",fontWeight:700}}>★ best</text>
    {/* Tick labels */}
    {xTicks.map((v,i)=><text key={"xt"+i} x={sx(v)} y={padT+plotH+14} textAnchor="middle" style={{fontSize:"8px",fill:"#a3a3a3",fontFamily:"monospace"}}>{fmtTick(v)}</text>)}
    {yTicks.map((v,i)=><text key={"yt"+i} x={padL-4} y={sy(v)} textAnchor="end" dominantBaseline="middle" style={{fontSize:"8px",fill:"#a3a3a3",fontFamily:"monospace"}}>{fmtTick(v)}</text>)}
    {/* Contour density overlay */}
    {points.length>=8&&(()=>{
      const gridN=40;const bwX=(xMax-xMin)/8;const bwY=(yMax-yMin)/8;
      const grid=[];for(let j=0;j<gridN;j++){grid[j]=[];for(let i=0;i<gridN;i++){
        const gx=xMin+(xMax-xMin)*(i/(gridN-1));const gy=yMin+(yMax-yMin)*(j/(gridN-1));
        let d=0;for(const pt of points){const zx=(gx-pt.x)/bwX;const zy=(gy-pt.y)/bwY;d+=Math.exp(-0.5*(zx*zx+zy*zy));}
        grid[j][i]=d;
      }}
      const maxD=Math.max(...grid.flat());if(maxD===0)return null;
      // Marching squares for contour lines at 3 threshold levels
      const thresholds=[0.15,0.35,0.6];
      return thresholds.map((thr,ti)=>{
        const level=thr*maxD;const segs=[];
        for(let j=0;j<gridN-1;j++)for(let i=0;i<gridN-1;i++){
          const v=[grid[j][i],grid[j][i+1],grid[j+1][i+1],grid[j+1][i]];
          const idx=(v[0]>=level?8:0)|(v[1]>=level?4:0)|(v[2]>=level?2:0)|(v[3]>=level?1:0);
          if(idx===0||idx===15)continue;
          const lerp=(a,b)=>a===b?0.5:(level-a)/(b-a);
          const t=lerp(v[0],v[1]),r2=lerp(v[1],v[2]),b2=lerp(v[3],v[2]),l=lerp(v[0],v[3]);
          const px=(f,row)=>sx(xMin+(xMax-xMin)*((i+f)/(gridN-1)));
          const py=(f,col)=>sy(yMin+(yMax-yMin)*((j+f)/(gridN-1)));
          const edges=[[px(t),py(0)],[px(1),py(r2)],[px(b2),py(1)],[px(0),py(l)]];
          const cases={1:[[3,2]],2:[[2,1]],3:[[3,1]],4:[[1,0]],5:[[1,0],[3,2]],6:[[2,0]],7:[[3,0]],8:[[0,3]],9:[[0,2]],10:[[0,1],[2,3]],11:[[0,1]],12:[[1,3]],13:[[1,2]],14:[[2,3]]};
          (cases[idx]||[]).forEach(([a,b])=>segs.push(`M${edges[a][0]},${edges[a][1]}L${edges[b][0]},${edges[b][1]}`));
        }
        if(!segs.length)return null;
        const opacity=ti===0?0.08:ti===1?0.12:0.18;
        return<path key={ti} d={segs.join("")} fill="none" stroke={posColor||"#7c3aed"} strokeWidth={ti===2?1.5:1} opacity={opacity} style={{pointerEvents:"none"}}/>;
      });
    })()}
    {/* Axis titles */}
    <text x={padL+plotW/2} y={chartH-2} textAnchor="middle" style={{fontSize:"10px",fill:"#737373",fontFamily:"monospace"}}>{xLabel}</text>
    <text x={10} y={padT+plotH/2} textAnchor="middle" dominantBaseline="middle" transform={`rotate(-90,10,${padT+plotH/2})`} style={{fontSize:"10px",fill:"#737373",fontFamily:"monospace"}}>{yLabel}</text>
    {/* Dots / Logos */}
    {points.map(pt=>{
      const cx=sx(pt.x),cy=sy(pt.y);
      const isHovered=hoveredId===pt.id;
      const color=posColor||POS_COLORS[pt.pos]||"#737373";
      const isMyGuy=showMyGuys&&myGuyNames.has(pt.name);
      const isSpotlit=spotlightName&&pt.name===spotlightName;
      const fade=spotlightName?!isSpotlit:(showMyGuys&&myGuyNames.size>0&&!isMyGuy);
      const opacity=fade?(spotlightName?(showLogos?0.2:0.15):0.3):1;
      const r=isSpotlit?dotR*2.2:isMyGuy?dotR+1.5:isHovered?dotR+1:dotR;
      return<g key={pt.id} style={{cursor:"pointer"}}>
        <circle cx={cx} cy={cy} r={showLogos?logoSize/2+2:12} fill="transparent" stroke="none"
          onPointerEnter={e=>onHover({...pt,cx:e.clientX,cy:e.clientY})}
          onPointerLeave={()=>onHover(null)}
          onClick={()=>onTap(pt)}/>
        {isSpotlit&&<><defs><linearGradient id="spotGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#ec4899"/><stop offset="100%" stopColor="#7c3aed"/></linearGradient></defs><circle cx={cx} cy={cy} r={r+5} fill="none" stroke="url(#spotGrad)" strokeWidth={2.5} style={{pointerEvents:"none"}}/></>}
        {showLogos?(()=>{const logoUrl=schoolLogo(pt.school);return logoUrl?<image href={logoUrl} x={cx-logoSize/2} y={cy-logoSize/2} width={logoSize} height={logoSize} opacity={opacity} style={{pointerEvents:"none"}}/>
          :<circle cx={cx} cy={cy} r={dotR} fill="#d4d4d4" opacity={opacity} style={{pointerEvents:"none"}}/>;})()
        :<circle cx={cx} cy={cy} r={r}
          fill={fade&&!spotlightName?"#d4d4d4":color}
          opacity={opacity}
          stroke={isSpotlit?"#171717":isMyGuy?"#ec4899":isHovered?"#171717":"none"}
          strokeWidth={isSpotlit?2.5:isMyGuy?2:isHovered?1.5:0}
          style={{transition:"cx 0.3s,cy 0.3s,r 0.15s,stroke 0.15s,opacity 0.2s",pointerEvents:"none"}}/>}
        {isSpotlit&&<text x={cx} y={cy-r-6} textAnchor={cx>width*0.8?"end":cx<width*0.2?"start":"middle"} style={{fontSize:"10px",fontWeight:700,fill:"#171717",fontFamily:"sans-serif",pointerEvents:"none"}}>{pt.name}</text>}
      </g>;
    })}
  </svg>);
});

function ScatterChartWrapper(props){
  const ref=useRef(null);
  const[w,setW]=useState(800);
  useEffect(()=>{
    const el=ref.current;if(!el)return;
    setW(el.getBoundingClientRect().width);
    const ro=new ResizeObserver(entries=>{for(const e of entries)setW(e.contentRect.width);});
    ro.observe(el);return()=>ro.disconnect();
  },[]);
  return<div ref={ref}>{w>0&&<ScatterChart {...props} width={w}/>}</div>;
}

function ComboDropdown({value,options,onChange,openKey,onOpenChange}){
  const open=openKey!=null;
  const ref=useRef(null);
  const searchRef=useRef(null);
  const[search,setSearch]=useState("");
  const selected=options.find(m=>m.key===value);
  useEffect(()=>{
    if(!open)return;
    setSearch("");
    const handler=e=>{if(ref.current&&!ref.current.contains(e.target))onOpenChange(null);};
    document.addEventListener("pointerdown",handler);
    requestAnimationFrame(()=>searchRef.current?.focus());
    return()=>document.removeEventListener("pointerdown",handler);
  },[open]);
  const sc=selected?COMBO_CAT_STYLE[selected.cat]:null;
  const groups=[{cat:"M",title:"Measurables"},{cat:"S",title:"Scores"},{cat:"P",title:"Production"},{cat:"T",title:"Traits"}];
  const q=search.toLowerCase().trim();
  const filtered=q?options.filter(m=>m.label.toLowerCase().includes(q)||COMBO_CAT_STYLE[m.cat]?.label.toLowerCase().includes(q)):options;
  return<div ref={ref} style={{position:"relative",display:"inline-block"}}>
    <button onClick={()=>onOpenChange(open?null:true)} style={{fontFamily:sans,fontSize:12,fontWeight:600,padding:"6px 12px 6px 8px",borderRadius:10,border:"1px solid "+(open?"#a3a3a3":"#e5e5e5"),background:open?"#faf9f6":"#fff",color:"#171717",cursor:"pointer",display:"flex",alignItems:"center",gap:6,minWidth:140,transition:"border-color 0.15s"}}>
      {sc&&<span style={{fontFamily:mono,fontSize:8,fontWeight:700,letterSpacing:0.5,color:sc.color,background:sc.color+"14",padding:"2px 5px",borderRadius:4,border:`1px solid ${sc.color}22`,lineHeight:1,flexShrink:0}}>{sc.label}</span>}
      <span style={{flex:1,textAlign:"left",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{selected?.label||"Select"}</span>
      <svg width="10" height="6" viewBox="0 0 10 6" style={{flexShrink:0,opacity:0.4,transform:open?"rotate(180deg)":"none",transition:"transform 0.15s"}}><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
    </button>
    {open&&<div style={{position:"absolute",top:"calc(100% + 4px)",left:0,minWidth:220,maxHeight:360,overflowY:"auto",background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,boxShadow:"0 8px 24px rgba(0,0,0,0.12)",zIndex:100,padding:"4px 0",WebkitOverflowScrolling:"touch"}}>
      <div style={{padding:"6px 8px",position:"sticky",top:0,background:"#fff",zIndex:1}}>
        <input ref={searchRef} value={search} onChange={e=>setSearch(e.target.value)} placeholder="search metrics..." style={{fontFamily:sans,fontSize:11,padding:"6px 10px",borderRadius:8,border:"1px solid #e5e5e5",background:"#faf9f6",color:"#171717",width:"100%",boxSizing:"border-box",outline:"none"}} onKeyDown={e=>{if(e.key==="Escape"){onOpenChange(null);}else if(e.key==="Enter"&&filtered.length===1){onChange(filtered[0].key);onOpenChange(null);}}}/>
      </div>
      {groups.map(g=>{
        const items=filtered.filter(m=>m.cat===g.cat);
        if(!items.length)return null;
        const cs=COMBO_CAT_STYLE[g.cat];
        return<div key={g.cat}>
          <div style={{fontFamily:mono,fontSize:8,fontWeight:700,letterSpacing:1,color:"#a3a3a3",textTransform:"uppercase",padding:"8px 12px 4px",display:"flex",alignItems:"center",gap:5}}>
            <span style={{color:cs.color,background:cs.color+"14",padding:"1px 4px",borderRadius:3,border:`1px solid ${cs.color}22`}}>{cs.label}</span>
            <span>{g.title}</span>
          </div>
          {items.map(m=>{const active=m.key===value;return<div key={m.key} onClick={()=>{onChange(m.key);onOpenChange(null);}} style={{fontFamily:sans,fontSize:12,fontWeight:active?700:500,padding:"7px 12px 7px 24px",color:active?"#171717":"#525252",background:active?"#f5f5f4":"transparent",cursor:"pointer",transition:"background 0.1s"}} onMouseEnter={e=>{if(!active)e.currentTarget.style.background="#faf9f6";}} onMouseLeave={e=>{if(!active)e.currentTarget.style.background="transparent";}}>
            {m.label}
          </div>;})}
        </div>;
      })}
    </div>}
  </div>;
}

function getTraitBasedComps(player,allProspects,traits,count=5){
  const pos=player.gpos||player.pos;const posTraits=POSITION_TRAITS[pos]||POSITION_TRAITS[player.pos]||[];
  const myVals=posTraits.map(t=>tv(traits,player.id,t,player.name,player.school));
  const others=allProspects.filter(p=>(p.gpos||p.pos)===(player.gpos||player.pos)&&p.id!==player.id);
  const scored=others.map(p=>{
    const vals=posTraits.map(t=>tv(traits,p.id,t,p.name,p.school));
    const dist=Math.sqrt(posTraits.reduce((sum,_,i)=>sum+Math.pow(myVals[i]-vals[i],2),0));
    return{player:p,distance:dist};
  });
  scored.sort((a,b)=>a.distance-b.distance);
  return scored.slice(0,count).map(s=>({...s,type:"trait"}));
}

// Position-specific weights for historical comp matching
// Derived from getDrillTraitMap mappings + Speed/Athleticism raw overwrites + sensitivity tiers
// primary drill = 1.5, partial = 1.0, raw overwrite position = 1.5, unused/irrelevant = 0.3
const COMP_WEIGHTS={
  QB:{height:0.7,weight:0.7,forty:1.0,bench:0.3,vertical:0.3,broad:0.3,cone:0.3,shuttle:0.3,ath:1.0,agi:0.3,exp:0.3},
  RB:{height:0.5,weight:0.8,forty:1.5,bench:0.3,vertical:1.0,broad:1.3,cone:1.5,shuttle:1.3,ath:1.0,agi:1.3,exp:1.0},
  WR:{height:0.7,weight:0.5,forty:1.5,bench:0.3,vertical:1.0,broad:1.3,cone:1.0,shuttle:1.3,ath:1.0,agi:1.0,exp:1.0},
  TE:{height:0.7,weight:0.7,forty:1.3,bench:1.0,vertical:1.5,broad:1.0,cone:1.5,shuttle:0.5,ath:1.5,agi:1.0,exp:1.3},
  OT:{height:1.3,weight:1.3,forty:1.3,bench:1.3,vertical:0.5,broad:1.3,cone:1.0,shuttle:1.0,ath:1.3,agi:1.0,exp:0.8},
  IOL:{height:1.0,weight:1.3,forty:1.0,bench:1.0,vertical:0.3,broad:1.0,cone:1.0,shuttle:1.5,ath:1.0,agi:1.3,exp:0.5},
  EDGE:{height:0.7,weight:0.7,forty:1.0,bench:0.8,vertical:0.8,broad:1.5,cone:1.5,shuttle:1.0,ath:1.0,agi:1.3,exp:1.3},
  DL:{height:0.8,weight:1.3,forty:1.0,bench:1.0,vertical:0.5,broad:1.0,cone:1.3,shuttle:0.5,ath:1.0,agi:0.8,exp:0.8},
  LB:{height:0.5,weight:0.7,forty:1.0,bench:0.3,vertical:1.0,broad:1.0,cone:1.0,shuttle:1.5,ath:1.3,agi:1.3,exp:1.0},
  CB:{height:0.5,weight:0.3,forty:1.5,bench:0.3,vertical:1.3,broad:0.7,cone:1.5,shuttle:1.0,ath:1.3,agi:1.3,exp:1.0},
  S:{height:0.5,weight:0.5,forty:1.5,bench:0.3,vertical:1.3,broad:1.0,cone:1.0,shuttle:1.0,ath:1.0,agi:1.0,exp:1.0},
};

function getHistoricalComps(player,historicalData,count=5){
  const pos=player.gpos||player.pos;
  const pool=historicalData[pos];
  if(!pool)return[];
  const cs=getCombineScores(player.name,player.school);
  const cd=getCombineData(player.name,player.school);
  if(!cs&&!cd)return[];
  const myPct={};
  if(cs&&cs.percentiles){Object.entries(cs.percentiles).forEach(([k,v])=>{if(v!=null)myPct[k]=v;});}
  if(cs){
    if(cs.athleticScore!=null)myPct.ath=cs.athleticScore;
    if(cs.agilityScore!=null)myPct.agi=cs.agilityScore;
    if(cs.explosionScore!=null)myPct.exp=cs.explosionScore;
  }
  const myKeys=Object.keys(myPct);
  if(myKeys.length<5)return[];
  const posW=COMP_WEIGHTS[pos]||{};
  const scored=[];
  for(const hist of pool){
    const shared=[];
    for(const k of myKeys){
      const hv=hist.pct[k]!=null?hist.pct[k]:(k==="ath"?hist.ath:k==="agi"?hist.agi:k==="exp"?hist.exp:null);
      if(hv!=null)shared.push({k,my:myPct[k],his:hv});
    }
    if(shared.length<5)continue;
    const dist=Math.sqrt(shared.reduce((sum,{k,my,his})=>{const w=posW[k]||1.0;return sum+(w*Math.pow(my-his,2));},0)/shared.reduce((s,{k})=>s+(posW[k]||1.0),0));
    scored.push({name:hist.n,school:hist.s,year:hist.y,distance:dist,sharedFields:shared.length,type:"historical"});
  }
  scored.sort((a,b)=>a.distance-b.distance);
  return scored.slice(0,count);
}

function getSimilarPlayers(player,allProspects,traits,historicalData,count=5){
  const historical=getHistoricalComps(player,historicalData,count);
  if(historical.length>=count)return historical;
  const remaining=count-historical.length;
  const traitBased=getTraitBasedComps(player,allProspects,traits,remaining);
  return[...historical,...traitBased];
}

// Shared historical comps cache — lazy loaded once across all profile drawers
let _historicalCompsCache=null;
let _historicalCompsLoading=false;
let _historicalCompsListeners=[];
function loadHistoricalComps(cb){
  if(_historicalCompsCache){cb(_historicalCompsCache);return;}
  _historicalCompsListeners.push(cb);
  if(_historicalCompsLoading)return;
  _historicalCompsLoading=true;
  fetch(new URL('./historicalComps.json',import.meta.url)).then(r=>r.json()).then(data=>{
    _historicalCompsCache=data;
    _historicalCompsListeners.forEach(fn=>fn(data));
    _historicalCompsListeners=[];
  }).catch(()=>{_historicalCompsLoading=false;_historicalCompsListeners.forEach(fn=>fn({}));_historicalCompsListeners=[];});
}

function ProfileTeamFits({topFits,player,userTraits,schemeFits,allProspects,font,mono,sans}){
  const[expanded,setExpanded]=useState(null);
  const[showInfo,setShowInfo]=useState(false);
  const pos=player.gpos||player.pos;
  const sortedFits=useMemo(()=>{const withDiff=topFits.map(tf=>{const avg=getPositionAvgFit(pos,tf.team,schemeFits,allProspects);return{...tf,posAvg:avg,diff:avg!=null?tf.score-avg:0};});withDiff.sort((a,b)=>b.diff-a.diff);return withDiff.slice(0,5);},[topFits,pos,schemeFits,allProspects]);
  return<div style={{padding:"0 24px 16px"}}>
    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
      <div style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase"}}>top team fits</div>
      <span onClick={()=>setShowInfo(v=>!v)} style={{fontFamily:sans,fontSize:10,fontWeight:700,color:"#a3a3a3",background:"#f5f5f5",width:16,height:16,borderRadius:8,display:"inline-flex",alignItems:"center",justifyContent:"center",cursor:"pointer",border:"1px solid #e5e5e5",lineHeight:1,flexShrink:0}}>?</span>
    </div>
    {showInfo&&<div style={{fontFamily:sans,fontSize:11,color:"#525252",lineHeight:1.5,background:"#f9f9f6",border:"1px solid #e5e5e5",borderRadius:8,padding:"10px 12px",marginBottom:10}}>Scheme fit scores rate how well this prospect's traits, archetype, and athletic profile align with each team's offensive or defensive scheme. Tap a score to see the breakdown.</div>}
    <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:8,overflow:"hidden"}}>
      {sortedFits.map((tf,i)=>{const sc=tf.score;const scColor=sc>=80?"#16a34a":sc>=65?"#0d9488":sc>=50?"#d97706":"#a3a3a3";const isOpen=expanded===tf.team;
      const {posAvg,diff}=tf;
      const accent=NFL_TEAM_COLORS[tf.team]||"#6366f1";
      const svR=isOpen?generateScoutReasoning(player,tf.team,schemeFits[tf.team]?.[player.id],userTraits):null;
      return<div key={tf.team} style={{borderBottom:i<sortedFits.length-1?"1px solid #f5f5f5":"none",cursor:"pointer"}} onClick={()=>setExpanded(isOpen?null:tf.team)}>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px"}}>
          <NFLTeamLogo team={tf.team} size={24}/>
          <div style={{flex:1,minWidth:0}}>
            <span style={{fontFamily:sans,fontSize:13,fontWeight:600,color:"#171717"}}>{tf.team}</span>
            {tf.tags.length>0&&<div style={{display:"flex",gap:4,marginTop:2,flexWrap:"wrap"}}>{tf.tags.slice(0,2).map((t,j)=><span key={j} style={{fontFamily:mono,fontSize:8,color:"#737373",background:"#f5f5f5",padding:"2px 6px",borderRadius:4,whiteSpace:"nowrap"}}>{t}</span>)}</div>}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            {diff!=null&&<span style={{fontFamily:mono,fontSize:9,fontWeight:700,color:diff>0?"#16a34a":diff<-5?"#dc2626":"#a3a3a3"}}>{diff>0?"+":""}{diff}</span>}
            <span style={{fontFamily:mono,fontSize:13,fontWeight:800,color:scColor,background:`${scColor}11`,padding:"3px 10px",borderRadius:6,border:`1px solid ${scColor}22`,minWidth:32,textAlign:"center",display:"inline-block",transition:"opacity 0.15s",opacity:isOpen?1:0.85}}>{sc}</span>
          </div>
        </div>
        {isOpen&&svR&&<div style={{padding:"10px 14px 14px 58px",background:`${accent}04`,borderLeft:`3px solid ${accent}`}} onClick={e=>e.stopPropagation()}>
          <div style={{fontFamily:sans,fontSize:11,fontWeight:700,color:accent,marginBottom:4}}>{svR.headline}</div>
          <div style={{fontFamily:mono,fontSize:9,color:accent,marginBottom:4,opacity:0.8}}>{svR.roleLabel}</div>
          <div style={{fontFamily:sans,fontSize:11,color:"#404040",lineHeight:1.5,marginBottom:8}}>{svR.whyItFits}</div>
          {svR.prospectStrengths&&<div style={{fontFamily:mono,fontSize:9,color:"#737373",marginBottom:6}}>key traits: {svR.prospectStrengths}</div>}
          {svR.relevantInflection&&<div style={{fontFamily:sans,fontSize:10,color:accent,fontStyle:"italic",lineHeight:1.4,padding:"6px 8px",background:`${accent}06`,borderRadius:6,borderLeft:`2px solid ${accent}40`}}>{svR.relevantInflection}</div>}
        </div>}
        {isOpen&&!svR&&<div style={{padding:"10px 14px 14px 58px",background:"#faf9f6"}} onClick={e=>e.stopPropagation()}><span style={{fontFamily:sans,fontSize:11,color:"#a3a3a3",fontStyle:"italic"}}>no scout vision data available</span></div>}
      </div>;})}
    </div>
  </div>;
}

const PlayerProfile=memo(function PlayerProfile({player,traits,setTraits,notes,setNotes,allProspects,getGrade,onClose,onSelectPlayer,consensus,ratings,isGuest,onRequireAuth,schemeFits}){
  const[isOpen,setIsOpen]=useState(false);
  const[profileMeasMode,setProfileMeasMode]=useState(false);
  const[historicalData,setHistoricalData]=useState(_historicalCompsCache||null);
  const[localTraitOverrides,setLocalTraitOverrides]=useState({});
  const[eliteCombo,setEliteCombo]=useState(null);
  const debounceRef=useRef(null);
  useEffect(()=>{setTimeout(()=>setIsOpen(true),10);setProfileMeasMode(false);setLocalTraitOverrides({});setEliteCombo(null);return()=>setIsOpen(false);},[player.id]);
  useEffect(()=>{const pos=player.gpos||player.pos;if(pos==='K/P')return;setTimeout(()=>{const combos=getCachedSpotlight(player);const top=combos[0];if(top&&top.score>=75){const phrase=buildComboPhrase(top);if(phrase)setEliteCombo({phrase,xPct:Math.round(top.xPct),yPct:Math.round(top.yPct),xLabel:top.xMeta?.label,yLabel:top.yMeta?.label,pos});}},0);},[player.id]);
  useEffect(()=>{const prev=document.body.style.overflow;document.body.style.overflow="hidden";return()=>{document.body.style.overflow=prev;};},[]);
  useEffect(()=>{if(!historicalData)loadHistoricalComps(setHistoricalData);},[]);
  const handleClose=()=>{setIsOpen(false);setTimeout(onClose,300);};
  const c=POS_COLORS[player.gpos||player.pos]||POS_COLORS[player.pos];
  const posTraits=POSITION_TRAITS[player.gpos||player.pos]||POSITION_TRAITS[player.pos]||[];
  const ps=getProspectStats(player.name,player.school);
  const cd=getCombineData(player.name,player.school);
  const cs=getCombineScores(player.name,player.school);
  const grade=getGrade(player.id);
  const similar=getSimilarPlayers(player,allProspects,traits,historicalData||{},5);
  const gradeColor=grade>=75?"#16a34a":grade>=55?"#ca8a04":"#dc2626";
  const[displayGrade,setDisplayGrade]=useState(grade);
  const prevGradeRef=useRef(grade);
  useEffect(()=>{
    const from=prevGradeRef.current;const to=grade;prevGradeRef.current=grade;
    if(from===to){setDisplayGrade(to);return;}
    const start=performance.now();const dur=300;
    const tick=(now)=>{const t=Math.min((now-start)/dur,1);const eased=1-Math.pow(1-t,3);setDisplayGrade(Math.round(from+(to-from)*eased));if(t<1)requestAnimationFrame(tick);};
    requestAnimationFrame(tick);
  },[grade]);
  const[copiedProfile,setCopiedProfile]=useState(false);

  const shareProfile=async()=>{
    const W=1460,H=820,scale=2,pad=24,gap=12,mp=14;
    const leftW=500,centerW=456,rightW=432;
    const leftX=pad,centerX=pad+leftW+gap,rightX=centerX+centerW+gap;
    const canvas=document.createElement('canvas');canvas.width=W*scale;canvas.height=H*scale;
    const ctx=canvas.getContext('2d');ctx.scale(scale,scale);
    ctx.fillStyle='#faf9f6';ctx.fillRect(0,0,W,H);
    const rr=(x,y,w,h,r)=>{ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();};
    const mod=(x,y,w,h)=>{ctx.fillStyle='#fff';rr(x,y,w,h,12);ctx.fill();ctx.strokeStyle='#e5e5e5';ctx.lineWidth=1;rr(x,y,w,h,12);ctx.stroke();};
    const loadImg=(url,t=2000)=>{if(!url)return Promise.resolve(null);return new Promise(r=>{const i=new Image();i.crossOrigin='anonymous';i.onload=()=>r(i);i.onerror=()=>r(null);setTimeout(()=>r(null),t);i.src=url;});};
    const compSchools=[...new Set(similar.map(s=>s.type==='historical'?s.school:s.player?.school).filter(Boolean))];
    const[logoImg,schoolImg,...compImgs]=await Promise.all([loadImg('/logo.png'),loadImg(schoolLogo(player.school)),...compSchools.map(s=>loadImg(schoolLogo(s)))]);
    const compLogoMap={};compSchools.forEach((s,i)=>{if(compImgs[i])compLogoMap[s]=compImgs[i];});

    // Layout calculations — pre-compute drill/composite arrays to skip empty modules
    const hasCombine=!!cd;
    const drillItems=hasCombine?[cd.forty&&{l:'40',v:cd.forty+'s',p:cs?.percentiles?.forty},cd.vertical&&{l:'VJ',v:cd.vertical+'"',p:cs?.percentiles?.vertical},cd.broad&&{l:'BJ',v:Math.floor(cd.broad/12)+"'"+cd.broad%12+'"',p:cs?.percentiles?.broad},cd.bench&&{l:'BP',v:cd.bench,p:cs?.percentiles?.bench},cd.cone&&{l:'3C',v:cd.cone+'s',p:cs?.percentiles?.cone},cd.shuttle&&{l:'SH',v:cd.shuttle+'s',p:cs?.percentiles?.shuttle}].filter(Boolean):[];
    const compItems=cs?[cs.speedScore!=null&&{l:'SPD',v:Math.round(cs.speedScore)},cs.agilityScore!=null&&{l:'AGI',v:cs.agilityScore},cs.explosionScore!=null&&{l:'EXP',v:cs.explosionScore},cs.athleticScore!=null&&{l:'ATH',v:cs.athleticScore}].filter(Boolean):[];
    const m1H=140,m2H=62;
    const m3H=drillItems.length>0?72:0,m4H=compItems.length>0?58:0;
    const centerTopBot=pad+m2H+(m3H?gap+m3H:0)+(m4H?gap+m4H:0);
    const simCount=Math.min(similar.length,5);
    const m5H=Math.max(simCount*38+mp*2+22,80);
    const rightTopBot=pad+m5H;
    const eqModH=95;
    const eqTop=Math.max(centerTopBot,rightTopBot)+gap;
    const radarTop=eqTop+eqModH+gap;
    const radarH=H-radarTop-pad;
    const m6Y=pad+m1H+gap;
    const m6H=H-pad-m1H-gap-pad;

    // ====== MODULE 1: Identity ======
    mod(leftX,pad,leftW,m1H);
    ctx.textBaseline='top';ctx.textAlign='left';
    const logoSz=80;
    if(schoolImg)ctx.drawImage(schoolImg,leftX+mp,pad+mp,logoSz,logoSz);
    else{ctx.fillStyle='#f0f0f0';ctx.beginPath();ctx.arc(leftX+mp+40,pad+mp+40,40,0,Math.PI*2);ctx.fill();ctx.fillStyle='#a3a3a3';ctx.font=`bold 28px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(player.school.charAt(0),leftX+mp+40,pad+mp+40);ctx.textAlign='left';ctx.textBaseline='top';}
    const nX=leftX+mp+logoSz+14;
    ctx.fillStyle='#171717';ctx.font=`900 38px ${font}`;ctx.fillText(player.name,nX,pad+mp-2);
    ctx.fillStyle='#a3a3a3';ctx.font=`15px ${mono}`;ctx.fillText(player.school,nX,pad+mp+40);
    // Position pill + Round pill
    const posText=player.gpos||player.pos;
    ctx.font=`bold 10px ${mono}`;const ppW=ctx.measureText(posText).width+14;
    ctx.fillStyle=c+'18';rr(nX,pad+mp+60,ppW,20,4);ctx.fill();ctx.fillStyle=c;ctx.textBaseline='middle';ctx.fillText(posText,nX+7,pad+mp+70);
    const rd=getConsensusRound(player.name);ctx.font=`bold 10px ${mono}`;const rdW=ctx.measureText(rd.label).width+14;
    ctx.fillStyle=rd.bg;rr(nX+ppW+6,pad+mp+60,rdW,20,4);ctx.fill();ctx.fillStyle=rd.fg;ctx.fillText(rd.label,nX+ppW+6+7,pad+mp+70);
    ctx.textBaseline='top';
    // Thin separator within identity module
    ctx.fillStyle='#f0f0f0';ctx.fillRect(leftX+mp,pad+m1H-38,leftW-mp*2,1);
    // Stat line
    if(ps?.statLine){ctx.fillStyle='#525252';ctx.font=`14px ${mono}`;ctx.fillText(ps.statLine,leftX+mp,pad+m1H-mp-8);}

    // ====== MODULE 6: Traits ======
    mod(leftX,m6Y,leftW,m6H);
    let ty=m6Y+mp;
    ctx.fillStyle='#a3a3a3';ctx.font=`10px ${mono}`;ctx.letterSpacing='2px';
    ctx.fillText('TRAITS',leftX+mp,ty);ctx.letterSpacing='0px';
    ty+=24;
    const barW=leftW-mp*2-50;
    const traitStep=Math.min(65,Math.floor((m6H-mp*2-24)/posTraits.length));
    posTraits.forEach(trait=>{
      const val=tv(traits,player.id,trait,player.name,player.school);
      const emoji=TRAIT_EMOJI[trait]||'';
      const t0=val/100;const cr=Math.round(236+(124-236)*t0);const cg=Math.round(72+(58-72)*t0);const cb=Math.round(153+(237-153)*t0);
      ctx.fillStyle='#737373';ctx.font=`12px ${mono}`;ctx.fillText(trait,leftX+mp,ty+2);
      ctx.fillStyle=`rgb(${cr},${cg},${cb})`;ctx.font=`900 16px ${font}`;ctx.textAlign='right';ctx.fillText(String(val),leftX+leftW-mp,ty);ctx.textAlign='left';
      const bY=ty+22;
      ctx.fillStyle='#f0f0f0';rr(leftX+mp,bY,barW,7,3.5);ctx.fill();
      const fillW=barW*val/100;
      if(fillW>0){const bG=ctx.createLinearGradient(leftX+mp,0,leftX+mp+fillW,0);bG.addColorStop(0,'#ec4899');bG.addColorStop(1,'#7c3aed');ctx.fillStyle=bG;rr(leftX+mp,bY,fillW,7,3.5);ctx.fill();}
      if(emoji){ctx.font='16px serif';ctx.textAlign='center';ctx.fillText(emoji,leftX+mp+fillW,bY-7);ctx.textAlign='left';}
      ty+=traitStep;
    });

    // ====== MODULE 2: Raw Measurables ======
    mod(centerX,pad,centerW,m2H);
    const rawItems=[(cd?.height?{l:'HT',v:formatHeight(cd.height)}:ps?.height&&{l:'HT',v:ps.height}),(cd?.weight?{l:'WT',v:cd.weight+' lbs'}:ps?.weight&&{l:'WT',v:ps.weight+' lbs'}),ps?.cls&&{l:'YR',v:ps.cls},cd?.arms&&{l:'ARM',v:cd.arms+'"'},cd?.hands&&{l:'HAND',v:cd.hands+'"'},cd?.wingspan&&{l:'WING',v:cd.wingspan+'"'}].filter(Boolean);
    if(rawItems.length>0){
      const cW=Math.floor((centerW-mp*2-(rawItems.length-1)*8)/rawItems.length);
      rawItems.forEach((item,i)=>{
        const cx=centerX+mp+i*(cW+8),cy=pad+8;
        ctx.fillStyle='#faf9f6';rr(cx,cy,cW,m2H-16,8);ctx.fill();ctx.strokeStyle='#e5e5e5';ctx.lineWidth=0.5;rr(cx,cy,cW,m2H-16,8);ctx.stroke();
        ctx.fillStyle='#a3a3a3';ctx.font=`8px ${mono}`;ctx.textAlign='center';ctx.letterSpacing='1px';ctx.fillText(item.l,cx+cW/2,cy+8);ctx.letterSpacing='0px';
        ctx.fillStyle='#171717';ctx.font=`700 14px ${mono}`;ctx.fillText(String(item.v),cx+cW/2,cy+26);ctx.textAlign='left';
      });
    }

    // ====== MODULE 3: Drills (skip if empty) ======
    if(drillItems.length>0){
      const m3Y=pad+m2H+gap;
      mod(centerX,m3Y,centerW,m3H);
      const cW=Math.floor((centerW-mp*2-(drillItems.length-1)*8)/drillItems.length);
      drillItems.forEach((d,i)=>{
        const cx=centerX+mp+i*(cW+8),cy=m3Y+8;
        ctx.fillStyle='#f0fdf9';rr(cx,cy,cW,m3H-16,8);ctx.fill();ctx.strokeStyle='#99f6e4';ctx.lineWidth=0.5;rr(cx,cy,cW,m3H-16,8);ctx.stroke();
        ctx.fillStyle='#6b9bd2';ctx.font=`8px ${mono}`;ctx.textAlign='center';ctx.letterSpacing='1px';ctx.fillText(d.l,cx+cW/2,cy+8);ctx.letterSpacing='0px';
        ctx.fillStyle='#1e40af';ctx.font=`700 14px ${mono}`;ctx.fillText(String(d.v),cx+cW/2,cy+26);
        if(d.p!=null){ctx.fillStyle=d.p>=80?'#16a34a':d.p>=50?'#ca8a04':'#dc2626';ctx.font=`600 9px ${mono}`;ctx.fillText(d.p+'th',cx+cW/2,cy+44);}
        ctx.textAlign='left';
      });
    }
    // ====== MODULE 4: Composites (skip if empty) ======
    if(compItems.length>0){
      const m4Y=pad+m2H+(m3H?gap+m3H:0)+gap;
      mod(centerX,m4Y,centerW,m4H);
      const compSt={SPD:{c:'#7c3aed',bg:'#f5f3ff',bd:'#ddd6fe'},AGI:{c:'#0891b2',bg:'#ecfeff',bd:'#a5f3fc'},EXP:{c:'#0d9488',bg:'#f0fdfa',bd:'#99f6e4'},ATH:{c:'#ea580c',bg:'#fff7ed',bd:'#fed7aa'}};
      const cW=Math.floor((centerW-mp*2-(compItems.length-1)*8)/compItems.length);
      compItems.forEach((comp,i)=>{
        const cx=centerX+mp+i*(cW+8),cy=m4Y+8;const st=compSt[comp.l]||compSt.ATH;
        ctx.fillStyle=st.bg;rr(cx,cy,cW,m4H-16,8);ctx.fill();ctx.strokeStyle=st.bd;ctx.lineWidth=0.5;rr(cx,cy,cW,m4H-16,8);ctx.stroke();
        ctx.fillStyle=st.c;ctx.font=`8px ${mono}`;ctx.textAlign='center';ctx.letterSpacing='1px';ctx.fillText(comp.l,cx+cW/2,cy+8);ctx.letterSpacing='0px';
        ctx.font=`700 14px ${mono}`;ctx.fillText(String(comp.v),cx+cW/2,cy+26);ctx.textAlign='left';
      });
    }

    // ====== MODULE 5: Similar Profiles ======
    mod(rightX,pad,rightW,m5H);
    ctx.fillStyle='#a3a3a3';ctx.font=`10px ${mono}`;ctx.letterSpacing='2px';ctx.textAlign='left';
    ctx.fillText('SIMILAR PROFILES',rightX+mp,pad+mp);ctx.letterSpacing='0px';
    const simTop=pad+mp+22;
    const simRowH=simCount>0?Math.floor((m5H-mp*2-22)/simCount):36;
    similar.slice(0,5).forEach((comp,i)=>{
      const isHist=comp.type==='historical';
      const nm=isHist?comp.name:comp.player?.name||'';
      const sch=isHist?comp.school:comp.player?.school||'';
      const yr=isHist?comp.year:null;
      const ry=simTop+i*simRowH;
      if(i>0){ctx.fillStyle='#f5f5f5';ctx.fillRect(rightX+mp,ry,rightW-mp*2,1);}
      const sImg=compLogoMap[sch];const lx=rightX+mp,ly2=ry+Math.floor(simRowH/2)-10;
      if(sImg)ctx.drawImage(sImg,lx,ly2,20,20);
      else{ctx.fillStyle='#f0f0f0';ctx.beginPath();ctx.arc(lx+10,ly2+10,10,0,Math.PI*2);ctx.fill();ctx.fillStyle='#a3a3a3';ctx.font=`bold 8px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(sch.charAt(0),lx+10,ly2+10);ctx.textAlign='left';ctx.textBaseline='top';}
      ctx.fillStyle='#171717';ctx.font=`600 12px ${sans}`;ctx.fillText(nm,lx+28,ry+4);
      ctx.fillStyle='#a3a3a3';ctx.font=`9px ${mono}`;ctx.fillText(sch,lx+28,ry+18);
      if(yr){ctx.fillStyle='#525252';ctx.font=`700 11px ${mono}`;ctx.textAlign='right';ctx.fillText(String(yr),rightX+rightW-mp,ry+10);ctx.textAlign='left';}
    });

    // ====== RADAR SHARED ======
    const K=1.8;const curve=v=>Math.pow(v/100,K)*100;const FLOOR=curve(40);
    const drawRadar=(cx0,ry0,rad,labels,values,color,labelMap,proDaySpokes)=>{
      const n=labels.length;if(n<3)return;
      const angles=labels.map((_,i)=>(Math.PI*2*i/n)-Math.PI/2);
      const pt=(a,v)=>[cx0+rad*v*Math.cos(a),ry0+rad*v*Math.sin(a)];
      const gLvs=[50,60,70,80,90,100].map(lv=>Math.max(0,(curve(lv)-FLOOR)/(100-FLOOR)));
      gLvs.forEach((lv,li)=>{ctx.beginPath();angles.forEach((a,j)=>{const[px,py]=pt(a,lv);j===0?ctx.moveTo(px,py):ctx.lineTo(px,py);});ctx.closePath();ctx.strokeStyle=li===2?'#d4d4d4':'#e5e5e5';ctx.lineWidth=li===2?0.8:0.5;ctx.stroke();});
      angles.forEach(a=>{ctx.beginPath();ctx.moveTo(cx0,ry0);const[ex,ey]=pt(a,1);ctx.lineTo(ex,ey);ctx.strokeStyle='#e5e5e5';ctx.lineWidth=0.5;ctx.stroke();});
      const pdSet=new Set(proDaySpokes||[]);
      const pv=angles.map((a,i)=>{const raw=values[i]||50;const v=Math.max(0,(curve(raw)-FLOOR)/(100-FLOOR));return pt(a,v);});
      ctx.beginPath();pv.forEach(([px,py],i)=>i===0?ctx.moveTo(px,py):ctx.lineTo(px,py));ctx.closePath();
      ctx.fillStyle=color+'28';ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke();
      pv.forEach(([px,py],i)=>{const isPD=pdSet.has(labels[i]);ctx.beginPath();ctx.arc(px,py,3.5,0,Math.PI*2);ctx.fillStyle=isPD?'#fff':color;ctx.fill();if(isPD){ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.stroke();}});
      ctx.fillStyle='#737373';ctx.font=`bold 9px ${sans}`;ctx.textAlign='center';ctx.textBaseline='middle';
      angles.forEach((a,i)=>{const d=rad+16;const lx=cx0+d*Math.cos(a);const ly2=ry0+d*Math.sin(a);const label=labelMap?labelMap[labels[i]]||labels[i]:labels[i];ctx.fillText(label,lx,ly2);});
      ctx.textAlign='left';ctx.textBaseline='top';
    };
    const drawLabel=(x,y,text,color)=>{
      ctx.textBaseline='middle';ctx.textAlign='center';
      ctx.fillStyle=color;ctx.font=`bold 12px ${sans}`;ctx.fillText(text,x,y);
      rr(x-15,y+10,30,20,10);ctx.fillStyle=color;ctx.fill();
      ctx.fillStyle='#fff';ctx.font=`bold 9px ${mono}`;ctx.fillText(text==='Traits'?'T':'M',x,y+20);
      ctx.textBaseline='top';ctx.textAlign='left';
    };
    const measData=getMeasRadarData(player.name,player.school);
    // Shrink radar modules — cap at 380px height
    const maxRadarH=380;
    const actualRadarH=Math.min(radarH,maxRadarH);

    // ====== EQUALIZER MODULE — full width across center+right ======
    {const eqW=centerW+gap+rightW;
    mod(centerX,eqTop,eqW,eqModH);
    const eqTraits=posTraits.map(t=>({label:TRAIT_ABBREV[t]||t.split(" ").map(w=>w[0]).join(""),value:tv(traits,player.id,t,player.name,player.school),type:"trait"}));
    const eqMeasData=getMeasRadarData(player.name,player.school);
    const eqMeas=eqMeasData?eqMeasData.labels.map((l,i)=>({label:l,value:eqMeasData.values[i],type:"meas"})):[];
    const eqBars=[...eqTraits,...eqMeas];
    if(eqBars.length>=3){
      const eqBarW=Math.min(28,Math.floor((eqW-mp*2-20)/(eqBars.length+1)));const eqGap=3;
      const eqMaxBlocks=7;const eqBlockH=3;const eqBlockGap=1;const eqHalfH=eqMaxBlocks*(eqBlockH+eqBlockGap);
      const eqTotalBarW=eqBars.length*(eqBarW+eqGap)+8;
      const eqStartX=centerX+Math.floor((eqW-eqTotalBarW)/2);
      const eqMidY=eqTop+Math.floor(eqModH/2);
      eqBars.forEach((bar,i)=>{
        const nBlocks=Math.max(1,Math.round((bar.value/100)*eqMaxBlocks));
        const bx=eqStartX+i*(eqBarW+eqGap)+(bar.type==="meas"?10:0);
        for(let bi=0;bi<eqMaxBlocks;bi++){
          const active=bi<nBlocks;const t2=active?(bi/(eqMaxBlocks-1)):0;
          if(bar.type==="trait"){
            const cr=Math.round(236+(124-236)*t2),cg=Math.round(72+(58-72)*t2),cb=Math.round(153+(237-153)*t2);
            ctx.fillStyle=active?`rgb(${cr},${cg},${cb})`:'#f0eef3';
          }else{
            const cr=Math.round(160+(6-160)*t2),cg=Math.round(215+(182-215)*t2),cb=Math.round(220+(212-220)*t2);
            ctx.fillStyle=active?`rgb(${cr},${cg},${cb})`:'#edf7f9';
          }
          const uy=eqMidY-2-(bi+1)*(eqBlockH+eqBlockGap);
          rr(bx,uy,eqBarW,eqBlockH,1);ctx.fill();
          const dy=eqMidY+2+bi*(eqBlockH+eqBlockGap);
          rr(bx,dy,eqBarW,eqBlockH,1);ctx.fill();
        }
        ctx.fillStyle=bar.type==="trait"?"#a3a3a3":"#0891b2";ctx.font=`7px ${mono}`;ctx.textAlign='center';
        ctx.fillText(bar.label,bx+eqBarW/2,eqMidY+eqHalfH+8);ctx.textAlign='left';
      });
      ctx.fillStyle='#d4d4d4';ctx.fillRect(eqStartX-2,eqMidY,eqTotalBarW+4,0.5);
      // Title
      ctx.fillStyle='#a3a3a3';ctx.font=`10px ${mono}`;ctx.letterSpacing='2px';ctx.textAlign='left';
      ctx.fillText('EQUALIZER',centerX+mp,eqTop+mp);ctx.letterSpacing='0px';
      // Traits label left of bars, Measurables label right of bars — vertically centered
      ctx.textBaseline='middle';ctx.font=`bold 8px ${mono}`;
      ctx.fillStyle='#7c3aed';ctx.textAlign='right';ctx.fillText('TRAITS ◼',eqStartX-8,eqMidY);
      if(eqMeas.length>0){ctx.fillStyle='#0891b2';ctx.textAlign='left';ctx.fillText('◼ MEASURABLES',eqStartX+eqTotalBarW+8,eqMidY);}
      ctx.textAlign='left';ctx.textBaseline='top';
    }}

    // ====== MODULE 7: Traits Radar ======
    const labelZone=44;
    mod(centerX,radarTop,centerW,actualRadarH);
    const r7CX=centerX+centerW/2,r7CY=radarTop+labelZone+(actualRadarH-labelZone)/2;
    const radarRad7=Math.min(centerW,(actualRadarH-labelZone))/2-44;
    drawLabel(r7CX,radarTop+18,'Traits','#a855f7');
    const traitVals=posTraits.map(t=>tv(traits,player.id,t,player.name,player.school));
    drawRadar(r7CX,r7CY,radarRad7,posTraits,traitVals,c,TRAIT_ABBREV,[]);

    // ====== MODULE 8: Measurables Radar ======
    if(measData){
      mod(rightX,radarTop,rightW,actualRadarH);
      const r8CX=rightX+rightW/2,r8CY=radarTop+labelZone+(actualRadarH-labelZone)/2;
      const radarRad8=Math.min(rightW,(actualRadarH-labelZone))/2-44;
      drawLabel(r8CX,radarTop+18,'Measurables','#14b8a6');
      drawRadar(r8CX,r8CY,radarRad8,measData.labels,measData.values,c,null,measData.proDaySpokes);
    }

    // ====== BRANDING (no module) — centered between radar bottom and traits module bottom ======
    const radarBot=radarTop+actualRadarH;
    const traitsBot=m6Y+m6H;
    const brandCenterY=radarBot+Math.floor((traitsBot-radarBot)/2);
    ctx.textBaseline='middle';
    const logoH2=36,logoW2=logoImg?Math.round(logoImg.naturalWidth/logoImg.naturalHeight*logoH2):0;
    ctx.font=`800 24px ${font}`;const wmW2=ctx.measureText('big board lab').width;
    ctx.font=`12px ${mono}`;const tagW=ctx.measureText('draft smarter at bigboardlab.com').width;
    const totalFW=logoW2+(logoW2?8:0)+wmW2+20+tagW;
    const brandAreaX=centerX;const brandAreaW=centerW+gap+rightW;
    const fX=brandAreaX+brandAreaW/2-totalFW/2;
    if(logoImg)ctx.drawImage(logoImg,fX,brandCenterY-logoH2/2,logoW2,logoH2);
    ctx.fillStyle='#171717';ctx.font=`800 24px ${font}`;ctx.fillText('big board lab',fX+logoW2+(logoW2?8:0),brandCenterY);
    ctx.fillStyle='#a3a3a3';ctx.font=`12px ${mono}`;ctx.fillText('draft smarter at bigboardlab.com',fX+logoW2+(logoW2?8:0)+wmW2+20,brandCenterY);
    ctx.textBaseline='top';ctx.textAlign='left';

    // ====== EXPORT ======
    canvas.toBlob(async blob=>{
      if(!blob)return;
      const fname=`bigboardlab-${player.name.replace(/\s+/g,'-').toLowerCase()}.png`;
      const isMobile=/iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if(isMobile&&navigator.share&&navigator.canShare){try{const file=new File([blob],fname,{type:'image/png'});if(navigator.canShare({files:[file]})){await navigator.share({files:[file],title:`${player.name} — Big Board Lab`,text:`${player.name} prospect profile! Build your board at bigboardlab.com`});return;}}catch(e){}}
      try{await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);setCopiedProfile(true);setTimeout(()=>setCopiedProfile(false),1500);}
      catch(e){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=fname;document.body.appendChild(a);a.click();document.body.removeChild(a);setTimeout(()=>URL.revokeObjectURL(url),3000);}
    },'image/png');
  };

  return(
    <>
      <div onClick={handleClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.25)",zIndex:10000,opacity:isOpen?1:0,transition:"opacity 0.3s",cursor:"pointer"}}/>
      <div style={{position:"fixed",top:0,right:0,bottom:0,width:Math.min(460,window.innerWidth-24),background:"#faf9f6",zIndex:10001,boxShadow:"-8px 0 32px rgba(0,0,0,0.12)",transform:isOpen?"translateX(0)":"translateX(100%)",transition:"transform 0.3s cubic-bezier(0.16,1,0.3,1)",display:"flex",flexDirection:"column",overflowY:"auto",overflowX:"hidden"}}>
        <div style={{padding:"20px 24px 0",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <button onClick={handleClose} style={{fontFamily:sans,fontSize:12,color:"#a3a3a3",background:"none",border:"1px solid #e5e5e5",borderRadius:99,padding:"5px 14px",cursor:"pointer"}}>✕ close</button>
            <button onClick={shareProfile} style={{fontFamily:sans,fontSize:12,fontWeight:700,padding:"6px 14px",background:"transparent",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",display:"inline-flex",alignItems:"center",flexShrink:0,position:"relative"}}><span style={{visibility:copiedProfile?"hidden":"visible"}}><span className="shimmer-text">share prospect</span></span>{copiedProfile&&<span style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",color:"#a3a3a3",fontWeight:400}}>copied</span>}</button>
          </div>
          <span style={{fontFamily:mono,fontSize:10,fontWeight:500,color:c,background:`${c}0d`,padding:"4px 12px",borderRadius:4,border:`1px solid ${c}1a`}}>{player.gpos||player.pos}</span>
        </div>

        <div style={{padding:"24px 24px 0",textAlign:"center"}}>
          <SchoolLogo school={player.school} size={64}/>
          <div style={{fontFamily:font,fontSize:28,fontWeight:900,color:"#171717",marginTop:12,lineHeight:1.1}}>{player.name}</div>
          <div style={{fontFamily:mono,fontSize:13,color:"#a3a3a3",marginTop:4}}>{player.school}</div>
          <div style={{marginTop:16,display:"inline-flex",alignItems:"baseline",gap:6}}>
            <span style={{fontFamily:font,fontSize:48,fontWeight:900,color:gradeColor,lineHeight:1}}>{displayGrade}</span>
            <span style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase"}}>grade</span>
          </div>
        </div>

        {ps&&<div style={{padding:"0 24px 16px"}}>
          {(()=>{const cr=getConsensusRank(player.name);const ovr=cr<900?cr:null;return(ovr||ps.posRank)&&<div style={{textAlign:"center",marginBottom:8}}><span style={{fontFamily:mono,fontSize:11,color:"#a3a3a3"}}>{ovr?"#"+ovr+" overall":""}{ps.posRank?" · "+(player.gpos||player.pos)+" #"+ps.posRank:""}</span></div>;})()}
          {(ps.height||ps.weight||ps.cls||cd)&&<div style={{display:"flex",justifyContent:"center",gap:12,marginBottom:8,flexWrap:"wrap"}}>
            {[(cd?.height?{label:"HT",val:formatHeight(cd.height)}:ps.height&&{label:"HT",val:ps.height}),(cd?.weight?{label:"WT",val:cd.weight+" lbs"}:ps.weight&&{label:"WT",val:ps.weight+" lbs"}),ps.cls&&{label:"YR",val:ps.cls},cd?.arms&&{label:"ARM",val:cd.arms+'"'},cd?.hands&&{label:"HAND",val:cd.hands+'"'},cd?.wingspan&&{label:"WING",val:cd.wingspan+'"'}].filter(Boolean).map(({label,val})=>(
              <div key={label} style={{textAlign:"center",background:"#fff",border:"1px solid #e5e5e5",borderRadius:8,padding:"6px 12px",minWidth:60}}>
                <div style={{fontFamily:mono,fontSize:8,letterSpacing:1.5,color:"#a3a3a3",textTransform:"uppercase",marginBottom:2}}>{label}</div>
                <div style={{fontFamily:mono,fontSize:13,fontWeight:700,color:"#171717"}}>{val}</div>
              </div>
            ))}
          </div>}
          {cd&&(()=>{const pct=cs?.percentiles||{};const pdF=new Set(cs?.proDayFields||[]);const drills=[cd.forty&&{label:"40",val:cd.forty+"s",perc:pct.forty,pd:pdF.has("forty")},cd.vertical&&{label:"VJ",val:cd.vertical+'"',perc:pct.vertical,pd:pdF.has("vertical")},cd.broad&&{label:"BJ",val:Math.floor(cd.broad/12)+"'"+cd.broad%12+'"',perc:pct.broad,pd:pdF.has("broad")},cd.bench&&{label:"BP",val:cd.bench,perc:pct.bench,pd:pdF.has("bench")},cd.cone&&{label:"3C",val:cd.cone+"s",perc:pct.cone,pd:pdF.has("cone")},cd.shuttle&&{label:"SH",val:cd.shuttle+"s",perc:pct.shuttle,pd:pdF.has("shuttle")}].filter(Boolean);return drills.length>0&&<div style={{display:"flex",justifyContent:"center",gap:8,marginBottom:8,flexWrap:"wrap"}}>
            {drills.map(({label,val,perc,pd})=>(
              <div key={label} style={{textAlign:"center",background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:8,padding:"6px 10px",minWidth:48}}>
                <div style={{fontFamily:mono,fontSize:8,letterSpacing:1.5,color:"#6b9bd2",textTransform:"uppercase",marginBottom:2}}>{label}</div>
                <div style={{fontFamily:mono,fontSize:13,fontWeight:700,color:"#1e40af"}}>{val}</div>
                {perc!=null&&<div style={{fontFamily:mono,fontSize:9,fontWeight:600,color:perc>=80?"#16a34a":perc>=50?"#ca8a04":"#dc2626",marginTop:2}}>{perc}th</div>}
              </div>
            ))}
          </div>;})()}
          {cs&&(()=>{const composites=[cs.speedScore!=null&&{label:"SPD",val:Math.round(cs.speedScore),color:"#7c3aed",bg:"#f5f3ff",border:"#ddd6fe"},cs.agilityScore!=null&&{label:"AGI",val:cs.agilityScore,color:"#0891b2",bg:"#ecfeff",border:"#a5f3fc"},cs.explosionScore!=null&&{label:"EXP",val:cs.explosionScore,color:"#0d9488",bg:"#f0fdfa",border:"#99f6e4"},cs.athleticScore!=null&&{label:"ATH",val:cs.athleticScore,color:"#ea580c",bg:"#fff7ed",border:"#fed7aa"}].filter(Boolean);return composites.length>0&&<div style={{display:"flex",justifyContent:"center",gap:8,marginBottom:8,flexWrap:"wrap"}}>
            {composites.map(({label,val,color,bg,border})=>(
              <div key={label} style={{textAlign:"center",background:bg,border:`1px solid ${border}`,borderRadius:8,padding:"6px 10px",minWidth:48}}>
                <div style={{fontFamily:mono,fontSize:8,letterSpacing:1.5,color,textTransform:"uppercase",marginBottom:2}}>{label}</div>
                <div style={{fontFamily:mono,fontSize:13,fontWeight:700,color}}>{val}</div>
              </div>
            ))}
          </div>;})()}
          {ps.statLine&&<div style={{background:"#f9f9f6",border:"1px solid #f0f0f0",borderRadius:8,padding:"10px 14px",textAlign:"center"}}>
            <div style={{fontFamily:mono,fontSize:12,color:"#525252",lineHeight:1.4}}>{ps.statLine}</div>
            {ps.statExtra&&<div style={{fontFamily:mono,fontSize:11,color:"#a3a3a3",marginTop:4,lineHeight:1.4}}>{ps.statExtra}</div>}
          </div>}
        </div>}

        <div style={{padding:"24px",display:"flex",flexDirection:"column",alignItems:"center"}}>
          {(()=>{const measData=getMeasRadarData(player.name,player.school);return measData&&<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><span style={{fontFamily:mono,fontSize:10,fontWeight:700,color:profileMeasMode?"#a3a3a3":"#a855f7",transition:"color 0.2s"}}>Traits</span><button title={profileMeasMode?"Switch to traits":"Switch to measurables"} onClick={()=>setProfileMeasMode(v=>!v)} style={{width:40,height:22,borderRadius:11,border:"none",background:profileMeasMode?"linear-gradient(135deg,#00ffff,#1e3a5f)":"linear-gradient(135deg,#ec4899,#a855f7)",cursor:"pointer",position:"relative",transition:"background 0.2s"}}><div style={{width:16,height:16,borderRadius:8,background:"#fff",position:"absolute",top:3,left:profileMeasMode?21:3,transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontFamily:mono,fontSize:8,fontWeight:700,color:profileMeasMode?"#00ffff":"#a855f7",lineHeight:1}}>{profileMeasMode?"M":"T"}</span></div></button><span style={{fontFamily:mono,fontSize:10,fontWeight:700,color:profileMeasMode?"#00bcd4":"#a3a3a3",transition:"color 0.2s"}}>Measurables</span></div>;})()}
          {(()=>{const measData=getMeasRadarData(player.name,player.school);if(profileMeasMode&&measData)return<RadarChart traits={measData.labels} values={measData.values} color={c} size={200} proDaySpokes={measData.proDaySpokes}/>;return<RadarChart traits={posTraits} values={posTraits.map(t=>tv(traits,player.id,t,player.name,player.school))} color={c} size={200} labelMap={TRAIT_ABBREV}/>;})()}
        </div>

        {/* Equalizer — traits + measurables */}
        {(()=>{
          const traitVals=posTraits.map(t=>({label:TRAIT_ABBREV[t]||t.split(" ").map(w=>w[0]).join(""),value:tv(traits,player.id,t,player.name,player.school),type:"trait"}));
          const measData=getMeasRadarData(player.name,player.school);
          const measVals=measData?measData.labels.map((l,i)=>({label:l,value:measData.values[i],type:"meas"})):[];
          const allBars=[...traitVals,...measVals];
          if(allBars.length<3)return null;
          const barW=18;const gap=2;const totalW=allBars.length*(barW+gap)-gap;const maxBlocks=8;const blockH=4;const blockGap=1.5;const halfH=maxBlocks*(blockH+blockGap);
          return<div style={{padding:"0 24px 16px"}}>
            <style>{`@keyframes eqGrow{from{transform:scaleY(0)}to{transform:scaleY(1)}}`}</style>
            <div style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:8}}>equalizer</div>
            <div style={{display:"flex",justifyContent:"center"}}>
              <div style={{display:"flex",gap:gap,alignItems:"center"}}>
                {allBars.map((bar,i)=>{
                  const nBlocks=Math.max(1,Math.round((bar.value/100)*maxBlocks));
                  const isFirst=i===0;const isSep=i===traitVals.length&&measVals.length>0;
                  const colDelay=`${i*30}ms`;
                  return<Fragment key={i}>
                    {isSep&&<div style={{width:1,height:halfH*2+4,background:"#e5e5e5",margin:"0 4px",flexShrink:0}}/>}
                    <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:barW}}>
                      {/* Upper half (blocks going up from center) */}
                      <div style={{display:"flex",flexDirection:"column-reverse",gap:blockGap,height:halfH,transformOrigin:"center bottom",animation:`eqGrow 400ms ease-out ${colDelay} both`}}>
                        {Array.from({length:maxBlocks}).map((_,bi)=>{
                          const active=bi<nBlocks;
                          const t=active?(bi/(maxBlocks-1)):0;
                          const bg=bar.type==="trait"
                            ?`rgb(${Math.round(236+(124-236)*t)},${Math.round(72+(58-72)*t)},${Math.round(153+(237-153)*t)})`
                            :`rgb(${Math.round(160+(6-160)*t)},${Math.round(215+(182-215)*t)},${Math.round(220+(212-220)*t)})`;
                          return<div key={bi} style={{width:barW,height:blockH,borderRadius:1.5,background:active?bg:bar.type==="trait"?"#f3f0f8":"#edf7f9",transition:"background 0.2s"}}/>;
                        })}
                      </div>
                      {/* Center line */}
                      <div style={{width:barW,height:1,background:"#d4d4d4",margin:`${blockGap}px 0`}}/>
                      {/* Lower half (mirror) */}
                      <div style={{display:"flex",flexDirection:"column",gap:blockGap,height:halfH,transformOrigin:"center top",animation:`eqGrow 400ms ease-out ${colDelay} both`}}>
                        {Array.from({length:maxBlocks}).map((_,bi)=>{
                          const active=bi<nBlocks;
                          const t=active?(bi/(maxBlocks-1)):0;
                          const bg=bar.type==="trait"
                            ?`rgb(${Math.round(236+(124-236)*t)},${Math.round(72+(58-72)*t)},${Math.round(153+(237-153)*t)})`
                            :`rgb(${Math.round(160+(6-160)*t)},${Math.round(215+(182-215)*t)},${Math.round(220+(212-220)*t)})`;
                          return<div key={bi} style={{width:barW,height:blockH,borderRadius:1.5,background:active?bg:bar.type==="trait"?"#f3f0f8":"#edf7f9",transition:"background 0.2s"}}/>;
                        })}
                      </div>
                      {/* Label */}
                      <div style={{fontFamily:mono,fontSize:7,color:bar.type==="trait"?"#a3a3a3":"#0891b2",marginTop:4,textAlign:"center",lineHeight:1}}>{bar.label}</div>
                    </div>
                  </Fragment>;
                })}
              </div>
            </div>
            <div style={{display:"flex",justifyContent:"center",gap:16,marginTop:6}}>
              <span style={{fontFamily:mono,fontSize:8,color:"#7c3aed"}}>◼ traits</span>
              {measVals.length>0&&<span style={{fontFamily:mono,fontSize:8,color:"#0891b2"}}>◼ measurables</span>}
            </div>
          </div>;
        })()}

        <div style={{padding:"0 24px 16px"}}>
          {(()=>{const ceil=traits[player.id]?.__ceiling||getScoutingTraits(player.name,player.school)?.__ceiling||"normal";const tiers=[
            {key:"capped",icon:"🔒",label:"Capped",desc:"What you see is what you get",bg:"linear-gradient(135deg, #1e1e1e, #2d2d2d)",border:"#404040",glow:"rgba(100,100,100,.3)",text:"#a3a3a3"},
            {key:"normal",icon:"📊",label:"Normal",desc:"Standard projection",bg:"linear-gradient(135deg, #1a1a2e, #16213e)",border:"#334155",glow:"rgba(99,102,241,.25)",text:"#94a3b8"},
            {key:"high",icon:"🔥",label:"High",desc:"The tools are there",bg:"linear-gradient(135deg, #312e1c, #3d2e0a)",border:"#854d0e",glow:"rgba(234,179,8,.3)",text:"#fbbf24"},
            {key:"elite",icon:"⭐",label:"Elite",desc:"Generational upside",bg:"linear-gradient(135deg, #1a0a2e, #2d1248)",border:"#7c3aed",glow:"rgba(139,92,246,.35)",text:"#a78bfa"}
          ];return(
            <div style={{marginBottom:20,paddingBottom:18,borderBottom:"1px solid #f0f0f0"}}>
              <div style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:10}}>ceiling</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6}}>
                {tiers.map(t=>{const sel=ceil===t.key;return(
                  <button key={t.key} onClick={()=>{if(isGuest){onRequireAuth("want to edit traits and lock in your grades?");return;}setTraits(prev=>({...prev,[player.id]:{...prev[player.id],__ceiling:t.key}}));}}
                    style={{padding:"10px 6px 8px",background:sel?t.bg:"#fff",border:`1.5px solid ${sel?t.border:"#e5e5e5"}`,borderRadius:10,cursor:"pointer",textAlign:"center",transition:"all 0.2s",boxShadow:sel?`0 0 12px ${t.glow}, inset 0 1px 0 rgba(255,255,255,.05)`:"none",transform:sel?"scale(1.02)":"scale(1)",position:"relative",overflow:"hidden"}}
                    onMouseEnter={e=>{if(!sel){e.currentTarget.style.borderColor=t.border;e.currentTarget.style.transform="scale(1.02)";}}}
                    onMouseLeave={e=>{if(!sel){e.currentTarget.style.borderColor="#e5e5e5";e.currentTarget.style.transform="scale(1)";}}}>
                    <div style={{fontSize:18,lineHeight:1,marginBottom:4,filter:sel?"none":"grayscale(0.5) opacity(0.6)"}}>{t.icon}</div>
                    <div style={{fontFamily:sans,fontSize:11,fontWeight:700,color:sel?t.text:"#737373",lineHeight:1.1}}>{t.label}</div>
                    <div style={{fontFamily:mono,fontSize:8,color:sel?t.text:"#a3a3a3",opacity:sel?0.7:0.5,marginTop:2,lineHeight:1.2}}>{t.desc}</div>
                  </button>
                );})}
              </div>
            </div>
          );})()}
          <div style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:12}}>traits</div>
          {posTraits.map(trait=>{const base=tv(traits,player.id,trait,player.name,player.school);const val=localTraitOverrides[trait]!=null?localTraitOverrides[trait]:base;const emoji=TRAIT_EMOJI[trait]||"";const t=val/100;const r=Math.round(236+(124-236)*t);const g=Math.round(72+(58-72)*t);const b=Math.round(153+(237-153)*t);const barColor=`rgb(${r},${g},${b})`;return(
            <div key={trait} style={{marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontFamily:mono,fontSize:11,color:"#737373"}}>{trait}</span>
                <span style={{fontFamily:font,fontSize:14,fontWeight:900,color:barColor}}>{val}</span>
              </div>
              <div style={{position:"relative",height:24,display:"flex",alignItems:"center"}}>
                <div style={{position:"absolute",left:0,right:0,height:6,background:"#f0f0f0",borderRadius:3}}/>
                <div style={{position:"absolute",left:0,height:6,width:`${val}%`,background:"linear-gradient(90deg, #ec4899, #7c3aed)",borderRadius:3}}/>
                <div style={{position:"absolute",left:`${val}%`,transform:"translateX(-50%)",fontSize:18,lineHeight:1,pointerEvents:"none",zIndex:3,filter:"drop-shadow(0 1px 2px rgba(0,0,0,.15))"}}>{emoji}</div>
                <input type="range" min="0" max="100" value={val}
                  onChange={e=>{if(isGuest){onRequireAuth("want to edit traits and lock in your grades?");return;}const v=parseInt(e.target.value);setLocalTraitOverrides(prev=>({...prev,[trait]:v}));if(debounceRef.current)clearTimeout(debounceRef.current);debounceRef.current=setTimeout(()=>{setTraits(prev=>{const existing=prev[player.id]||{};if(!existing.__ceiling){const sc=getScoutingTraits(player.name,player.school);if(sc?.__ceiling)existing.__ceiling=sc.__ceiling;}return{...prev,[player.id]:{...existing,[trait]:v}};});setLocalTraitOverrides(prev=>{const next={...prev};delete next[trait];return next;});},150);}}
                  style={{position:"absolute",left:0,width:"100%",height:24,background:"transparent",cursor:isGuest?"default":"pointer",zIndex:4,opacity:0,margin:0}}/>
              </div>
            </div>
          );})}
        </div>

        <div style={{padding:"0 24px 16px"}}>
          <div style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:12}}>similar profiles</div>
          <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,overflow:"hidden"}}>
            {similar.map((comp,i)=>{
              const isHist=comp.type==="historical";
              if(isHist){
                return(
                  <div key={`${comp.name}-${comp.year}`} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderBottom:i<similar.length-1?"1px solid #f5f5f5":"none"}}>
                    <SchoolLogo school={comp.school} size={24}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontFamily:sans,fontSize:13,fontWeight:600,color:"#171717"}}>{comp.name}</div>
                      <div style={{fontFamily:mono,fontSize:10,color:"#a3a3a3"}}>{comp.school}</div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontFamily:mono,fontSize:12,fontWeight:700,color:"#525252"}}>{comp.year}</div>
                    </div>
                  </div>
                );
              }
              const sp=comp.player;const sg=getGrade(sp.id);
              return(
                <div key={sp.id} onClick={()=>onSelectPlayer(sp)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderBottom:i<similar.length-1?"1px solid #f5f5f5":"none",cursor:"pointer",transition:"background 0.1s"}}
                  onMouseEnter={e=>e.currentTarget.style.background=`${c}06`} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <SchoolLogo school={sp.school} size={24}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:sans,fontSize:13,fontWeight:600,color:"#171717"}}>{sp.name}</div>
                    <div style={{fontFamily:mono,fontSize:10,color:"#a3a3a3"}}>{sp.school}</div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontFamily:font,fontSize:14,fontWeight:900,color:sg>=75?"#16a34a":sg>=55?"#ca8a04":"#dc2626"}}>{sg}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {schemeFits&&player.pos!=="K/P"&&player.gpos!=="K/P"&&(()=>{const topFits=getTopTeamFits(player.id,schemeFits,10);if(!topFits.length)return null;return<ProfileTeamFits topFits={topFits} player={player} userTraits={traits} schemeFits={schemeFits} allProspects={allProspects} font={font} mono={mono} sans={sans}/>;})()}

        {(()=>{const cr=consensus?.find(x=>x.name===player.name);const hasUserRankings=Object.keys(ratings||{}).length>0;const userRank=hasUserRankings?[...allProspects].sort((a,b)=>{const d=getGrade(b.id)-getGrade(a.id);if(d!==0)return d;const r=(ratings?.[b.id]||1500)-(ratings?.[a.id]||1500);return r!==0?r:getConsensusRank(a.name)-getConsensusRank(b.name);}).findIndex(p=>p.id===player.id)+1:cr?.rank||999;return cr?(
          <div style={{padding:"0 24px 16px"}}>
            <div style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:8}}>vs consensus</div>
            <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:8,padding:"12px 14px",display:"flex",gap:20,justifyContent:"center"}}>
              <div style={{textAlign:"center"}}><div style={{fontFamily:mono,fontSize:9,color:"#a3a3a3",marginBottom:2}}>CONSENSUS</div><div style={{fontFamily:font,fontSize:22,fontWeight:900,color:"#171717"}}>#{cr.rank}</div></div>
              <div style={{textAlign:"center"}}><div style={{fontFamily:mono,fontSize:9,color:"#a3a3a3",marginBottom:2}}>YOUR RANK</div><div style={{fontFamily:font,fontSize:22,fontWeight:900,color:userRank<cr.rank?"#16a34a":userRank>cr.rank?"#dc2626":"#171717"}}>#{userRank}</div></div>
              <div style={{textAlign:"center"}}><div style={{fontFamily:mono,fontSize:9,color:"#a3a3a3",marginBottom:2}}>DIFF</div><div style={{fontFamily:font,fontSize:22,fontWeight:900,color:cr.rank-userRank>0?"#16a34a":cr.rank-userRank<0?"#dc2626":"#a3a3a3"}}>{cr.rank-userRank>0?"+":""}{cr.rank-userRank===0?"—":cr.rank-userRank}</div></div>
            </div>
          </div>
        ):null;})()}

        {(()=>{const pName=player.name?.toLowerCase()||"";const pSchool=player.school?.toLowerCase()||"";const norm=n=>n.replace(/\./g,"").replace(/\s+(jr|sr|ii|iii|iv|v|vi|vii|viii)$/i,"").replace(/\s+/g," ").trim();const schoolAlias={"uconn":"connecticut","miami":"miami","ole miss":"mississippi","nc state":"north carolina state","n.c. state":"north carolina state"};const pNorm=norm(pName);const pSchNorm=schoolAlias[pSchool]||pSchool;const nKey=`${pName}|${pSchool}`;let sn=SCOUTING_NARRATIVES[nKey];if(!sn){sn=Object.entries(SCOUTING_NARRATIVES).find(([k])=>{const[kn,ks]=k.split("|");const knNorm=norm(kn),ksNorm=ks||"";return(knNorm===pNorm||kn===pName)&&(ksNorm===pSchool||ksNorm===pSchNorm||ksNorm.includes(pSchNorm)||pSchNorm.includes(ksNorm));})?.[1];}if(!sn)return null;const blurb=sn.scouting_blurb||sn.synthesis_notes||null;let strs=sn.strengths,wks=sn.weaknesses;if((!strs?.length||!wks?.length)&&sn.trait_language){const tl=sn.trait_language;const scored=Object.entries(tl).map(([trait,sources])=>{const grades=Object.values(sources).map(s=>s.grade).filter(g=>typeof g==="number");const avg=grades.length?grades.reduce((a,b)=>a+b,0)/grades.length:null;const best=Object.values(sources).find(s=>s.language&&!/no\s+(explicit|direct|specific).*recovered|not\s+addressed/i.test(s.language));return{trait,avg,lang:best?.language||null};}).filter(t=>t.avg!==null&&t.lang);scored.sort((a,b)=>b.avg-a.avg);if(!strs?.length&&scored.length>=2)strs=scored.slice(0,Math.min(4,Math.ceil(scored.length*0.6))).map(t=>`${t.trait}: ${t.lang}`);if(!wks?.length&&scored.length>=2)wks=scored.slice(-Math.min(3,Math.floor(scored.length*0.4))).map(t=>`${t.trait}: ${t.lang}`);}if(!blurb&&!strs?.length&&!wks?.length)return null;const strip=t=>t?.replace(/\b(Zierlein|Jeremiah|Brugler|Kiper|McShay|Schrager|Miller|Rang|Emory|Cosell|NFL\.com|CBS Sports|ESPN|PFF)(?:'s?)?\b/gi,"").replace(/\s{2,}/g," ").trim();
          const traitKw=[["arm strength",/arm.?strength|rocket arm|cannon|throw.?power/i],["accuracy",/accurac|ball placement|on.?target|pinpoint/i],["pocket presence",/pocket.?(presence|poise|composure|awareness)|stand.?in.?the.?pocket/i],["mobility",/mobilit|scrambl|escapab|legs? as a runner|dual.?threat|extend.?plays/i],["decision making",/decision|process|progressions?|reads?\s+(coverage|defense)|pre.?snap.?(command|read|diagnos)/i],["leadership",/leader|captain|competitive|toughness|character|intangible/i],["vision",/vision|field.?vision|reads?\s+the\s+field/i],["contact balance",/contact.?balance|broken?\s+tackle|yards.?after.?contact/i],["power",/power|powerful|physicality|bull.?rush/i],["elusiveness",/elusiv|agil|juke|make.?miss|change.?of.?direction/i],["pass catching",/pass.?catch|receiving|catch.?radius/i],["route running",/route.?(runn|tree|crisp|precise)|break.*route|separat/i],["hands",/hands|catch|drops|body.?catch|plu[ck]/i],["yac ability",/yac|yards.?after|after.?the.?catch|run.?after/i],["speed",/speed|burst|fast|4\.\d+.*forty|deep.?threat|long.?speed/i],["contested catches",/contest/i],["blocking",/block(?!.?shed)/i],["run blocking",/run.?block|drive.?block|ground.?game|pulling/i],["pass protection",/pass.?prot|pass.?block|anchor|bull.?rush/i],["footwork",/footwork|feet|kick.?slide|lateral.?mov/i],["anchor",/anchor|base|hold.?point/i],["strength",/strength|strong|mass|frame.*(add|need|under)/i],["pass rush",/pass.?rush|rush.?(move|abilit)|get.?to.?the.?quarterback|sack|pressure/i],["bend",/bend|flexib|corner|dip/i],["first step",/first.?step|explos|get.?off|burst.?off/i],["hand usage",/hand.?(usage|combat|technique|fight|placement)|swipe|club|rip/i],["motor",/motor|effort|relentless|pursuit|hustle|plays?.?off/i],["run defense",/run.?def|gap.?integrit|set.?the.?edge|point.?of.?attack|stuff/i],["tackling",/tackl|wrap.?up|finish|hit/i],["man coverage",/man.?cover|shadow|mirror|press.?cover/i],["zone coverage",/zone.?cover|zone.?read|pattern.?match/i],["coverage",/cover|trail|underneath/i],["instincts",/instinct|antic|diagnos|read.?and.?react|awareness/i],["range",/range|sideline.?to.?sideline|clos.?speed/i],["ball skills",/ball.?skills?|intercept|turnover|ball.?hawk|ball.?track/i],["press",/press|jam|re.?route/i],["versatility",/versatil|position|align|multiple|flex/i],["release package",/release|compact|quick.?release|throwing.?motion/i],["durability",/durab|injur|miss|health|frame.*(concern|question|raises|track)/i]];
          const matchEmoji=(text)=>{const t=text.toLowerCase();for(const[trait,rx]of traitKw){if(rx.test(t))return TRAIT_EMOJI[trait.split(" ").map(w=>w[0].toUpperCase()+w.slice(1)).join(" ")]||null;}return null;};
          return<div style={{padding:"0 24px 20px"}}>
          <div style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:8}}>scouting report</div>
          {(()=>{const archs=getArchetypes(player.name,player.school);if(!archs.length)return null;return<div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>{archs.map(a=><span key={a} style={{fontFamily:mono,fontSize:10,fontWeight:600,color:"#171717",background:"#17171708",border:"1px solid #17171718",padding:"4px 10px",borderRadius:99,display:"inline-flex",alignItems:"center",gap:4}}><span>{ARCHETYPE_EMOJI[a]||""}</span>{ARCHETYPE_DISPLAY[a]||a}</span>)}</div>;})()}
          {eliteCombo&&<div style={{background:"linear-gradient(135deg,#fefce8,#fef9c3)",border:"1px solid #fbbf24",borderRadius:10,padding:"10px 14px",marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
              <span style={{fontSize:13}}>⚡</span>
              <span style={{fontFamily:mono,fontSize:8,fontWeight:700,color:"#92400e",textTransform:"uppercase",letterSpacing:1}}>elite combo</span>
            </div>
            <div style={{fontFamily:sans,fontSize:13,fontWeight:700,color:"#171717",lineHeight:1.4,marginBottom:6}}>{eliteCombo.phrase}</div>
            <div style={{display:"flex",gap:8}}>
              <span style={{fontFamily:mono,fontSize:9,color:"#78350f",background:"#fef3c7",padding:"2px 7px",borderRadius:4}}>{eliteCombo.xLabel} · {eliteCombo.xPct}th pctile</span>
              <span style={{fontFamily:mono,fontSize:9,color:"#78350f",background:"#fef3c7",padding:"2px 7px",borderRadius:4}}>{eliteCombo.yLabel} · {eliteCombo.yPct}th pctile</span>
            </div>
          </div>}
          {blurb&&<div style={{fontFamily:sans,fontSize:12,color:"#404040",lineHeight:1.6,marginBottom:12}}>{strip(blurb)}</div>}
          {strs?.length>0&&<div style={{marginBottom:10}}>
            <div style={{fontFamily:mono,fontSize:9,fontWeight:700,color:"#16a34a",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>strengths</div>
            {strs.map((s,i)=>{const em=matchEmoji(s);return<div key={i} style={{display:"flex",gap:6,marginBottom:4,alignItems:"flex-start"}}><span style={{fontSize:em?11:10,lineHeight:1.7,flexShrink:0,...(!em&&{color:"#16a34a"})}}>{em||"+"}</span><span style={{fontFamily:sans,fontSize:11,color:"#525252",lineHeight:1.5}}>{strip(s)}</span></div>;})}
          </div>}
          {wks?.length>0&&<div style={{marginBottom:10}}>
            <div style={{fontFamily:mono,fontSize:9,fontWeight:700,color:"#dc2626",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>weaknesses</div>
            {wks.map((w,i)=>{const em=matchEmoji(w);return<div key={i} style={{display:"flex",gap:6,marginBottom:4,alignItems:"flex-start"}}><span style={{fontSize:em?11:10,lineHeight:1.7,flexShrink:0,...(!em&&{color:"#dc2626"})}}>{em||"−"}</span><span style={{fontFamily:sans,fontSize:11,color:"#525252",lineHeight:1.5}}>{strip(w)}</span></div>;})}
          </div>}
          {sn.boom_bust_variance&&(()=>{
            const bb=sn.boom_bust_variance;
            const level=bb.level||"medium";
            const lvlCfg={low:{color:"#0891b2",label:"LOW VARIANCE",spread:11},medium:{color:"#f59e0b",label:"MED VARIANCE",spread:22},high:{color:"#ef4444",label:"HIGH VARIANCE",spread:33}}[level]||{color:"#f59e0b",label:"MED VARIANCE",spread:22};
            const tg=Math.max(5,Math.min(95,sn.talent_grade||50));
            const lo=Math.max(2,tg-lvlCfg.spread);
            const hi=Math.min(98,tg+lvlCfg.spread);
            const floorMatch=(blurb||bb.explanation||"").match(/floor\s+is\s+([^;.]{10,100})/i);
            const ceilMatch=(blurb||bb.explanation||"").match(/ceiling\s+is\s+([^;.]{10,100})/i);
            const floorText=floorMatch?.[1]?.trim();
            const ceilText=ceilMatch?.[1]?.trim();
            const zones=[{label:"BUST",p:8},{label:"BACKUP",p:27},{label:"STARTER",p:50},{label:"STAR",p:71},{label:"ELITE",p:90}];
            return<div style={{marginTop:14,paddingTop:12,borderTop:"1px solid #f0f0f0"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase"}}>outcome range</div>
                <span style={{fontFamily:mono,fontSize:8,fontWeight:700,color:lvlCfg.color,background:lvlCfg.color+"18",padding:"2px 7px",borderRadius:4,border:`1px solid ${lvlCfg.color}33`}}>{lvlCfg.label}</span>
              </div>
              <div style={{position:"relative",height:8,background:"#f0f0f0",borderRadius:99,marginBottom:6,overflow:"visible"}}>
                <div style={{position:"absolute",left:`${lo}%`,width:`${hi-lo}%`,top:0,bottom:0,background:lvlCfg.color,opacity:0.75,borderRadius:99}}/>
                <div style={{position:"absolute",left:`${tg}%`,top:-2,bottom:-2,width:3,background:"#fff",borderRadius:2,transform:"translateX(-50%)",boxShadow:`0 0 0 1.5px ${lvlCfg.color}`}}/>
              </div>
              <div style={{position:"relative",height:16,marginBottom:floorText||ceilText?10:0}}>
                {zones.map(z=><span key={z.label} style={{position:"absolute",left:`${z.p}%`,transform:"translateX(-50%)",fontFamily:mono,fontSize:7,color:"#c0c0c0",letterSpacing:0.3,whiteSpace:"nowrap"}}>{z.label}</span>)}
              </div>
              {(floorText||ceilText)&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                {floorText&&<div style={{background:"#fafafa",borderRadius:8,padding:"8px 10px",border:"1px solid #f0f0f0"}}>
                  <div style={{fontFamily:mono,fontSize:7,fontWeight:700,color:"#a3a3a3",textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>⬇ floor</div>
                  <div style={{fontFamily:sans,fontSize:10,color:"#737373",lineHeight:1.4}}>{floorText}</div>
                </div>}
                {ceilText&&<div style={{background:"#fafafa",borderRadius:8,padding:"8px 10px",border:"1px solid #f0f0f0"}}>
                  <div style={{fontFamily:mono,fontSize:7,fontWeight:700,color:"#16a34a",textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>⬆ ceiling</div>
                  <div style={{fontFamily:sans,fontSize:10,color:"#525252",lineHeight:1.4}}>{ceilText}</div>
                </div>}
              </div>}
              {!floorText&&!ceilText&&bb.explanation&&<div style={{fontFamily:sans,fontSize:11,color:"#737373",lineHeight:1.5}}>{bb.explanation}</div>}
            </div>;
          })()}
        </div>;})()}

        <div style={{padding:"0 24px 32px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase"}}>scouting notes</div>
            {notes?.[player.id]&&<div style={{fontFamily:mono,fontSize:9,color:"#22c55e",opacity:0.7}}>✓ saved</div>}
          </div>
          <textarea value={notes?.[player.id]||""} onChange={e=>setNotes(prev=>({...prev,[player.id]:e.target.value}))}
            readOnly={isGuest}
            placeholder="Add your scouting notes..."
            style={{width:"100%",minHeight:80,fontFamily:sans,fontSize:13,padding:"10px 12px",border:"1px solid #e5e5e5",borderRadius:8,background:"#fff",color:"#171717",resize:"vertical",outline:"none",lineHeight:1.5,boxSizing:"border-box"}}
            onFocus={e=>{if(isGuest){onRequireAuth("want to save scouting notes?");e.target.blur();return;}e.target.style.borderColor=c;}} onBlur={e=>e.target.style.borderColor="#e5e5e5"}/>
        </div>
      </div>
    </>
  );
});

// ============================================================
// Auth Modal (contextual sign-in prompt for guests)
// ============================================================
function AuthModal({message,onClose}){
  const[error,setError]=useState('');
  const handleGoogle=async()=>{
    const{error:err}=await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.href}});
    if(err)setError(err.message);
  };
  return(
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:10100}}/>
      <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",zIndex:10101,background:"#faf9f6",borderRadius:16,padding:window.innerWidth<480?"24px 16px 20px":"32px 28px 28px",width:"calc(100vw - 32px)",maxWidth:400,boxShadow:"0 20px 60px rgba(0,0,0,0.25)",textAlign:"center"}}>
        <button onClick={onClose} style={{position:"absolute",top:12,right:12,fontFamily:sans,fontSize:16,color:"#a3a3a3",background:"none",border:"none",cursor:"pointer"}}>✕</button>
        <img src="/logo.png" alt="Big Board Lab" style={{width:window.innerWidth<480?48:64,height:"auto",marginBottom:10}}/>
        <p style={{fontFamily:mono,fontSize:window.innerWidth<480?8:10,letterSpacing:3,color:"#a3a3a3",textTransform:"uppercase",margin:"0 0 6px"}}>2026 NFL Draft</p>
        <h2 style={{fontFamily:font,fontSize:window.innerWidth<480?22:28,fontWeight:900,lineHeight:0.95,color:"#171717",margin:"0 0 8px",letterSpacing:-1.5}}>big board lab</h2>
        <p style={{fontFamily:sans,fontSize:window.innerWidth<480?12:14,color:"#525252",lineHeight:1.4,margin:"0 0 16px"}}>{message}</p>
        <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:window.innerWidth<480?"14px 14px 12px":"20px 20px 16px"}}>
          <button onClick={handleGoogle}
            style={{width:"100%",fontFamily:sans,fontSize:window.innerWidth<480?12:14,fontWeight:700,padding:window.innerWidth<480?"10px":"14px",background:"#fff",color:"#171717",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"background 0.15s"}}
            onMouseEnter={e=>e.currentTarget.style.background="#f5f5f5"} onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            continue with Google
          </button>
          {error&&<p style={{fontFamily:sans,fontSize:12,color:"#dc2626",marginTop:8,marginBottom:0,textAlign:"center"}}>{error}</p>}
          <p style={{fontFamily:sans,fontSize:11,color:"#a3a3a3",margin:"10px 0 0"}}>free to use · no credit card required</p>
        </div>
      </div>
    </>
  );
}

// ============================================================
// Auth Screen
// ============================================================
function AuthScreen({onSignIn,onSkip,onOpenGuide}){
  const[error,setError]=useState('');
  const seedTicker=[
    // Risers (20)
    {name:"Carson Beck",pos:"QB",delta:3.4},{name:"Garrett Nussmeier",pos:"QB",delta:2.1},{name:"Carnell Tate",pos:"WR",delta:2.8},
    {name:"Jordyn Tyson",pos:"WR",delta:1.7},{name:"Denzel Boston",pos:"WR",delta:2.3},{name:"Kenyon Sadiq",pos:"TE",delta:1.9},
    {name:"Spencer Fano",pos:"OL",delta:2.6},{name:"Francis Mauigoa",pos:"OL",delta:1.4},{name:"Rueben Bain Jr.",pos:"DL",delta:3.1},
    {name:"T.J. Parker",pos:"DL",delta:1.8},{name:"Caleb Downs",pos:"DB",delta:2.5},{name:"Sonny Styles",pos:"LB",delta:1.6},
    {name:"Jeremiyah Love",pos:"RB",delta:2.2},{name:"Makai Lemon",pos:"WR",delta:1.3},{name:"Arvell Reese",pos:"LB",delta:1.9},
    {name:"Mansoor Delane",pos:"DB",delta:2.4},{name:"KC Concepcion",pos:"WR",delta:1.5},{name:"Eli Stowers",pos:"TE",delta:1.1},
    {name:"Peter Woods",pos:"DL",delta:1.7},{name:"Kadyn Proctor",pos:"OL",delta:1.2},
    // Fallers (20)
    {name:"Drew Allar",pos:"QB",delta:-2.9},{name:"Cade Klubnik",pos:"QB",delta:-1.7},{name:"Dillon Gabriel",pos:"QB",delta:-2.3},
    {name:"Avieon Terrell",pos:"DB",delta:-1.4},{name:"Blake Miller",pos:"OL",delta:-1.8},{name:"Gracen Halton",pos:"DL",delta:-1.1},
    {name:"Dillon Thieneman",pos:"DB",delta:-1.6},{name:"Harold Perkins Jr.",pos:"LB",delta:-2.1},{name:"Keldric Faulk",pos:"DL",delta:-1.3},
    {name:"Dani Dennis-Sutton",pos:"DL",delta:-1.5},{name:"Anthony Hill Jr.",pos:"LB",delta:-1.9},{name:"Jonah Coleman",pos:"RB",delta:-1.2},
    {name:"Chris Bell",pos:"WR",delta:-2.4},{name:"Omar Cooper Jr.",pos:"WR",delta:-1.1},{name:"Monroe Freeling",pos:"OL",delta:-1.7},
    {name:"CJ Allen",pos:"LB",delta:-1.4},{name:"Davison Igbinosun",pos:"DB",delta:-2.6},{name:"Malik Muhammad",pos:"DB",delta:-1.3},
    {name:"Kamari Ramsey",pos:"DB",delta:-1.8},{name:"Anthony Lucas",pos:"DL",delta:-1.5}
  ];
  const[tickerData,setTickerData]=useState(null);

  useEffect(()=>{
    supabase.from('public_adp').select('*').then(({data})=>{
      if(!data||data.length===0){setTickerData(seedTicker);return;}
      const movers=data.filter(d=>d.avg_pick_7d!=null&&d.avg_pick_prev_7d!=null).map(d=>({
        name:d.prospect_name,pos:d.prospect_pos,
        delta:Math.round((d.avg_pick_prev_7d-d.avg_pick_7d)*10)/10,
        picks:d.times_picked
      })).filter(d=>Math.abs(d.delta)>=1);
      setTickerData(movers.length>=5?movers:seedTicker);
    });
  },[]);

  const handleGoogle=async()=>{
    const{error:err}=await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.origin}});
    if(err)setError(err.message);
  };

  const demoPair=[PROSPECTS.find(p=>p.name==="Rueben Bain Jr."),PROSPECTS.find(p=>p.name==="David Bailey")].filter(Boolean);
  const demoQB=PROSPECTS.find(p=>p.name==="Garrett Nussmeier");
  const demoBoard=[PROSPECTS.find(p=>p.name==="Rueben Bain Jr."),PROSPECTS.find(p=>p.name==="Caleb Downs"),PROSPECTS.find(p=>p.name==="Francis Mauigoa")].filter(Boolean);
  const homeTeams=["Raiders","Jets","Cardinals","Titans","Giants","Browns","Commanders","Saints"];

  return(
    <div style={{minHeight:"100vh",background:"#faf9f6",fontFamily:font}}>
      {/* Hero */}
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"80px 24px 32px",textAlign:"center"}}>
        <img src="/logo.png" alt="Big Board Lab" style={{width:100,height:"auto",marginBottom:16}}/>
        <p style={{fontFamily:mono,fontSize:11,letterSpacing:3,color:"#a3a3a3",textTransform:"uppercase",margin:"0 0 12px"}}>2026 NFL Draft</p>
        <h1 style={{fontSize:48,fontWeight:900,lineHeight:0.95,color:"#171717",margin:"0 0 16px",letterSpacing:-2}}>big board lab</h1>
        <p style={{fontFamily:sans,fontSize:18,color:"#525252",lineHeight:1.5,maxWidth:480,margin:"0 auto"}}>Rank prospects. Grade them your way. Run the most realistic mock draft ever built.</p>
      </div>

      {/* Sign In */}
      <div style={{maxWidth:400,margin:"0 auto",padding:"0 24px 24px"}}>
        <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:16,padding:28}}>
          <button onClick={handleGoogle}
            style={{width:"100%",fontFamily:sans,fontSize:14,fontWeight:700,padding:"14px",background:"#fff",color:"#171717",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:12,transition:"background 0.15s"}}
            onMouseEnter={e=>e.currentTarget.style.background="#f5f5f5"} onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            continue with Google
          </button>
          {error&&<p style={{fontFamily:sans,fontSize:12,color:"#dc2626",marginBottom:8,textAlign:"center"}}>{error}</p>}
          {onSkip&&<button onClick={onSkip} style={{width:"100%",fontFamily:sans,fontSize:12,color:"#a3a3a3",background:"none",border:"none",cursor:"pointer",textAlign:"center",padding:"8px 0"}}>skip for now →</button>}
          <p style={{fontFamily:sans,fontSize:11,color:"#a3a3a3",margin:"8px 0 0",textAlign:"center"}}>free to use · no credit card required</p>
        </div>
      </div>

      {/* Prospect Stock Ticker — real ADP data from mock drafts */}
      {(()=>{
        const posColors={QB:"#ec4899",RB:"#22c55e",WR:"#7c3aed",TE:"#f97316",OT:"#3b82f6",IOL:"#3b82f6",OL:"#3b82f6",EDGE:"#06b6d4",DL:"#64748b",LB:"#1d4ed8",CB:"#eab308",S:"#eab308",K:"#a3a3a3",P:"#a3a3a3"};
        if(!tickerData)return null;
        const risers=tickerData.filter(d=>d.delta>0).sort((a,b)=>b.delta-a.delta).slice(0,20);
        const fallers=tickerData.filter(d=>d.delta<0).sort((a,b)=>a.delta-b.delta).slice(0,20);
        if(risers.length===0&&fallers.length===0)return null;
        const risersLoop=[...risers,...risers];
        const fallersLoop=[...fallers,...fallers];
        const ps=(d)=>({display:"inline-flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:99,flexShrink:0,background:d.delta>0?"rgba(34,197,94,0.08)":"rgba(239,68,68,0.08)",border:`1px solid ${d.delta>0?"rgba(34,197,94,0.15)":"rgba(239,68,68,0.15)"}`});
        return<div style={{maxWidth:780,margin:"0 auto",padding:"0 24px 24px"}}>
          <div style={{overflow:"hidden",borderRadius:12,background:"#fff",border:"1px solid #e5e5e5",padding:"10px 0"}}>
            {risers.length>0&&<div style={{overflow:"hidden",marginBottom:fallers.length>0?6:0}}>
              <div style={{display:"flex",gap:8,animation:"tickerRight 35s linear infinite",width:"max-content"}}>
                {risersLoop.map((d,i)=><div key={`r${i}`} style={ps(d)}>
                  <span style={{fontFamily:mono,fontSize:9,fontWeight:700,color:posColors[d.pos]||"#525252"}}>{d.pos}</span>
                  <span style={{fontFamily:sans,fontSize:11,fontWeight:600,color:"#171717"}}>{shortName(d.name)}</span>
                  <span style={{fontFamily:mono,fontSize:10,fontWeight:700,color:"#22c55e"}}>↑{Math.abs(d.delta)}</span>
                </div>)}
              </div>
            </div>}
            {fallers.length>0&&<div style={{overflow:"hidden"}}>
              <div style={{display:"flex",gap:8,animation:"tickerLeft 40s linear infinite",width:"max-content"}}>
                {fallersLoop.map((d,i)=><div key={`f${i}`} style={ps(d)}>
                  <span style={{fontFamily:mono,fontSize:9,fontWeight:700,color:posColors[d.pos]||"#525252"}}>{d.pos}</span>
                  <span style={{fontFamily:sans,fontSize:11,fontWeight:600,color:"#171717"}}>{shortName(d.name)}</span>
                  <span style={{fontFamily:mono,fontSize:10,fontWeight:700,color:"#ef4444"}}>↓{Math.abs(d.delta)}</span>
                </div>)}
              </div>
            </div>}
            <style>{`
              .trait-pills-scroll::-webkit-scrollbar{display:none;}
              @keyframes tickerRight{0%{transform:translateX(-50%)}100%{transform:translateX(0%)}}
              @keyframes tickerLeft{0%{transform:translateX(0%)}100%{transform:translateX(-50%)}}
            `}</style>
          </div>
        </div>;
      })()}

      {/* Features */}
      <div style={{maxWidth:780,margin:"0 auto",padding:"0 24px 40px",display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))",gap:12}}>

        {/* A1 — 32 AI GMs */}
        <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"20px 22px"}}>
          <div style={{marginBottom:12}}>
            <div style={{fontFamily:sans,fontSize:13,fontWeight:700,color:"#171717",marginBottom:4}}>32 AI GMs with real tendencies</div>
            <div style={{fontFamily:sans,fontSize:12,color:"#737373",lineHeight:1.45}}>Each CPU team drafts differently based on real needs and front office style.</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
            {homeTeams.map(t=><div key={t} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:4}}>
              <NFLTeamLogo team={t} size={20}/>
              <span style={{fontFamily:mono,fontSize:7,color:"#a3a3a3",fontWeight:600}}>{NFL_TEAM_ABR[t]}</span>
            </div>)}
          </div>
        </div>

        {/* B1 — Trait grading */}
        <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"20px 22px"}}>
          <div style={{marginBottom:12}}>
            <div style={{fontFamily:sans,fontSize:13,fontWeight:700,color:"#171717",marginBottom:4}}>Spider charts & trait grading</div>
            <div style={{fontFamily:sans,fontSize:12,color:"#737373",lineHeight:1.45}}>Dial in traits and watch radar charts and grades update in real time.</div>
          </div>
          {(()=>{if(!demoQB)return null;const pos=demoQB.gpos||demoQB.pos;const posTraits=POSITION_TRAITS[pos]||[];const c=POS_COLORS[pos];const vals=[82,75,68,72,78,65];
            return<div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{display:"flex",flexDirection:"column",gap:4,flex:1,minWidth:0}}>
                {posTraits.slice(0,4).map((t,i)=>{const v=vals[i]||60;return<div key={t} style={{display:"flex",alignItems:"center",gap:4}}>
                  <span style={{fontFamily:mono,fontSize:7,fontWeight:600,color:"#a3a3a3",width:24,textAlign:"right",flexShrink:0}}>{TRAIT_ABBREV[t]||t.slice(0,3).toUpperCase()}</span>
                  <div style={{flex:1,height:4,background:"#f0f0f0",borderRadius:99,overflow:"hidden"}}><div style={{width:`${v}%`,height:"100%",background:"linear-gradient(90deg,#ec4899,#7c3aed)",borderRadius:99}}/></div>
                  <span style={{fontFamily:mono,fontSize:7,fontWeight:700,color:"#525252",width:16,textAlign:"right"}}>{v}</span>
                </div>;})}
              </div>
              <RadarChart traits={posTraits} values={vals} color={c} size={90}/>
            </div>;
          })()}
        </div>

        {/* A2 — Trait filtering */}
        <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"20px 22px"}}>
          <div style={{marginBottom:12}}>
            <div style={{fontFamily:sans,fontSize:13,fontWeight:700,color:"#171717",marginBottom:4}}>Filter by elite traits</div>
            <div style={{fontFamily:sans,fontSize:12,color:"#737373",lineHeight:1.45}}>Find the best pass rushers, ball hawks, or route runners across every position.</div>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:4,justifyContent:"center",marginBottom:8}}>
            {["Pass Rush","Speed","Man Coverage","Hands"].map(t=><span key={t} style={{fontFamily:sans,fontSize:9,fontWeight:600,color:"#7c3aed",background:"#f5f3ff",border:"1px solid #ede9fe",borderRadius:99,padding:"3px 8px",display:"inline-flex",alignItems:"center",gap:3}}>
              <span style={{fontSize:9}}>{TRAIT_EMOJI[t]}</span>{t}
            </span>)}
          </div>
          <div style={{borderRadius:8,overflow:"hidden",border:"1px solid #f0f0f0"}}>
            {[{name:"Bain Jr.",pos:"EDGE",val:92},{name:"Parker",pos:"EDGE",val:88},{name:"Bailey",pos:"DL",val:85}].map((p,i)=>{const c=POS_COLORS[p.pos];return<div key={p.name} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 8px",borderBottom:i<2?"1px solid #f5f5f5":"none"}}>
              <span style={{fontFamily:mono,fontSize:8,fontWeight:700,color:c,background:`${c}0d`,padding:"1px 6px",borderRadius:99}}>{p.pos}</span>
              <span style={{fontFamily:sans,fontSize:11,fontWeight:600,color:"#171717",flex:1}}>{p.name}</span>
              <span style={{fontFamily:mono,fontSize:10,fontWeight:700,color:"#7c3aed"}}>{p.val}</span>
            </div>;})}
          </div>
        </div>

        {/* B2 — Big board */}
        <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"20px 22px"}}>
          <div style={{marginBottom:12}}>
            <div style={{fontFamily:sans,fontSize:13,fontWeight:700,color:"#171717",marginBottom:4}}>Your board builds itself</div>
            <div style={{fontFamily:sans,fontSize:12,color:"#737373",lineHeight:1.45}}>Rankings, grades, and radar charts — all in one view. Share it with one tap.</div>
          </div>
          <div style={{borderRadius:8,overflow:"hidden",border:"1px solid #f0f0f0"}}>
            {demoBoard.map((p,i)=>{const c=POS_COLORS[p.gpos||p.pos];const posTraits=POSITION_TRAITS[p.gpos||p.pos]||[];const vals=posTraits.map(t=>tv({},p.id,t,p.name,p.school));return<div key={p.id} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 8px",borderBottom:i<demoBoard.length-1?"1px solid #f5f5f5":"none"}}>
              <span style={{fontFamily:mono,fontSize:10,fontWeight:700,color:"#a3a3a3",width:16,textAlign:"right"}}>{i+1}</span>
              <span style={{fontFamily:mono,fontSize:8,fontWeight:700,color:c,background:`${c}0d`,padding:"1px 6px",borderRadius:99}}>{p.gpos||p.pos}</span>
              <SchoolLogo school={p.school} size={16}/>
              <span style={{fontFamily:sans,fontSize:11,fontWeight:600,color:"#171717",flex:1}}>{shortName(p.name)}</span>
              <MiniRadar values={vals} color={c} size={20}/>
            </div>;})}
          </div>
        </div>

        {/* A3 — Historical data */}
        <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"20px 22px"}}>
          <div style={{marginBottom:12}}>
            <div style={{fontFamily:sans,fontSize:13,fontWeight:700,color:"#171717",marginBottom:4}}>10 years of historical data</div>
            <div style={{fontFamily:sans,fontSize:12,color:"#737373",lineHeight:1.45}}>Combine measurables and college stats compared against a decade of FBS data. Dominator ratings and historical percentiles.</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{display:"flex",flexDirection:"column",gap:4,flex:1,minWidth:0}}>
              {[{label:"REC DOM",pct:92,val:"92nd"},{label:"SPD SCR",pct:85,val:"85th"},{label:"ATH SCR",pct:88,val:"88th"},{label:"40 YD",pct:78,val:"78th"}].map(row=><div key={row.label} style={{display:"flex",alignItems:"center",gap:4}}>
                <span style={{fontFamily:mono,fontSize:7,fontWeight:600,color:"#a3a3a3",width:40,textAlign:"right",flexShrink:0}}>{row.label}</span>
                <div style={{flex:1,height:4,background:"#f0f0f0",borderRadius:99,overflow:"hidden"}}><div style={{width:`${row.pct}%`,height:"100%",background:"linear-gradient(90deg,#7c3aed,#ec4899)",borderRadius:99}}/></div>
                <span style={{fontFamily:mono,fontSize:7,fontWeight:700,color:"#7c3aed",width:24,textAlign:"right"}}>{row.val}</span>
              </div>)}
            </div>
            <svg width={90} height={90} viewBox="0 0 90 90" style={{flexShrink:0}}>
              <line x1={15} y1={8} x2={15} y2={82} stroke="#f0f0f0" strokeWidth={0.5}/>
              <line x1={45} y1={8} x2={45} y2={82} stroke="#f0f0f0" strokeWidth={0.5}/>
              <line x1={75} y1={8} x2={75} y2={82} stroke="#f0f0f0" strokeWidth={0.5}/>
              {[
                [12,18,"#dc2626"],[18,30,"#dc2626"],[10,42,"#dc2626"],[16,55,"#dc2626"],[14,68,"#dc2626"],[20,22,"#dc2626"],[8,48,"#dc2626"],
                [42,14,"#7c3aed"],[48,24,"#7c3aed"],[38,36,"#7c3aed"],[44,46,"#7c3aed"],[50,56,"#7c3aed"],[40,66,"#7c3aed"],[46,72,"#7c3aed"],[52,38,"#7c3aed"],
                [72,20,"#2563eb"],[78,34,"#2563eb"],[70,48,"#2563eb"],[76,60,"#2563eb"],[74,72,"#2563eb"],[68,40,"#2563eb"],
              ].map((d,i)=><circle key={i} cx={d[0]} cy={d[1]} r={3.5} fill={d[2]} opacity={0.6}/>)}
              <text x={15} y={90} textAnchor="middle" style={{fontSize:"6px",fill:"#a3a3a3",fontFamily:"monospace"}}>RB</text>
              <text x={45} y={90} textAnchor="middle" style={{fontSize:"6px",fill:"#a3a3a3",fontFamily:"monospace"}}>WR</text>
              <text x={75} y={90} textAnchor="middle" style={{fontSize:"6px",fill:"#a3a3a3",fontFamily:"monospace"}}>TE</text>
            </svg>
          </div>
        </div>

        {/* B3 — Depth charts */}
        <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"20px 22px"}}>
          <div style={{marginBottom:12}}>
            <div style={{fontFamily:sans,fontSize:13,fontWeight:700,color:"#171717",marginBottom:4}}>Live depth chart updates</div>
            <div style={{fontFamily:sans,fontSize:12,color:"#737373",lineHeight:1.45}}>Every pick lands on the roster in real time. Watch starters get displaced.</div>
          </div>
          <div style={{borderRadius:8,overflow:"hidden",border:"1px solid #f0f0f0"}}>
            {[{slot:"QB1",name:"F. Mendoza",draft:true},{slot:"EDGE1",name:"K. Mack"},{slot:"CB2",name:"A. Terrell",draft:true}].map((r,i)=><div key={r.slot} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 8px",borderBottom:i<2?"1px solid #f5f5f5":"none",background:r.draft?"rgba(34,197,94,0.04)":"transparent"}}>
              <span style={{fontFamily:mono,fontSize:8,fontWeight:700,color:"#a3a3a3",width:36}}>{r.slot}</span>
              <span style={{fontFamily:sans,fontSize:11,fontWeight:r.draft?600:400,color:r.draft?"#171717":"#737373",flex:1}}>{r.name}</span>
              {r.draft&&<span style={{fontFamily:mono,fontSize:7,fontWeight:700,color:"#22c55e",background:"rgba(34,197,94,0.1)",padding:"1px 6px",borderRadius:99}}>NEW</span>}
            </div>)}
          </div>
        </div>

        {/* A4 — Pair ranking */}
        <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"20px 22px"}}>
          <div style={{marginBottom:12}}>
            <div style={{fontFamily:sans,fontSize:13,fontWeight:700,color:"#171717",marginBottom:4}}>Pair-by-pair prospect ranking</div>
            <div style={{fontFamily:sans,fontSize:12,color:"#737373",lineHeight:1.45}}>Choose between two players, head-to-head, until your board builds itself.</div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center",justifyContent:"center"}}>
            {(()=>{const cards=demoPair.map(p=>{const c=POS_COLORS[p.gpos||p.pos];return<div key={p.id} style={{flex:"0 0 auto",background:"#faf9f6",border:`1.5px solid ${c}22`,borderRadius:10,padding:"8px 12px",textAlign:"center",minWidth:0}}>
              <SchoolLogo school={p.school} size={24}/>
              <div style={{fontFamily:sans,fontSize:11,fontWeight:700,color:"#171717",marginTop:4,lineHeight:1.1}}>{shortName(p.name)}</div>
              <span style={{fontFamily:mono,fontSize:8,fontWeight:700,color:c,background:`${c}0d`,padding:"1px 6px",borderRadius:99,display:"inline-block",marginTop:3}}>{p.gpos||p.pos}</span>
            </div>;});return<>{cards[0]}<span style={{fontFamily:font,fontSize:14,fontWeight:900,color:"#d4d4d4"}}>vs</span>{cards[1]}</>;})()}
          </div>
        </div>

        {/* B4 — Community mock intelligence */}
        <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"20px 22px"}}>
          <div style={{marginBottom:12}}>
            <div style={{fontFamily:sans,fontSize:13,fontWeight:700,color:"#171717",marginBottom:4}}>Community-powered draft intelligence</div>
            <div style={{fontFamily:sans,fontSize:12,color:"#737373",lineHeight:1.45}}>See where prospects land across thousands of mock drafts. Real ADP and rising/falling trends from the community.</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            {[{pos:"EDGE",name:"Bain Jr.",delta:"+2.1",up:true},{pos:"QB",name:"Nussmeier",delta:"-1.4",up:false},{pos:"S",name:"Downs",delta:"+0.8",up:true}].map(row=>{const c=POS_COLORS[row.pos];return<div key={row.name} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 8px",borderRadius:8,background:"#faf9f6"}}>
              <span style={{fontFamily:mono,fontSize:8,fontWeight:700,color:c,background:`${c}0d`,padding:"1px 6px",borderRadius:99}}>{row.pos}</span>
              <span style={{fontFamily:sans,fontSize:11,fontWeight:600,color:"#171717",flex:1}}>{row.name}</span>
              <span style={{fontFamily:mono,fontSize:10,fontWeight:700,color:row.up?"#16a34a":"#dc2626"}}>{row.up?"↑":"↓"}{row.delta.replace(/[+-]/,"")}</span>
            </div>;})}
          </div>
        </div>
      </div>

      {/* Guide CTA */}
      <div style={{textAlign:"center",padding:"0 24px 32px"}}>
        <span onClick={onOpenGuide} style={{fontFamily:sans,fontSize:13,fontWeight:600,color:"#7c3aed",cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6}} onMouseEnter={e=>e.currentTarget.style.textDecoration="underline"} onMouseLeave={e=>e.currentTarget.style.textDecoration="none"}>
          see everything you can do →
        </span>
      </div>

      {/* Privacy */}
      <div style={{textAlign:"center",padding:"0 24px 16px"}}>
        <a href="/privacy.html" style={{fontFamily:mono,fontSize:10,color:"#a3a3a3",textDecoration:"none"}} onMouseEnter={e=>e.currentTarget.style.textDecoration="underline"} onMouseLeave={e=>e.currentTarget.style.textDecoration="none"}>privacy policy</a>
      </div>
      <TwitterFooter/>
      <div style={{textAlign:"center",padding:"0 24px 48px",fontFamily:mono,fontSize:10,color:"#d4d4d4",letterSpacing:0.5}}>© {new Date().getFullYear()} Big Board Lab, LLC. All rights reserved.</div>
    </div>
  );
}

// ============================================================
// SaveBar — fixed top nav bar (module-level to avoid remount)
// ============================================================
const SaveBar=memo(function SaveBar({navigate,mono,sans,isGuest,userEmail,showOnboarding,setShowOnboarding,saving,lastSaved,onRequireAuth,onSignOut}){
  return(<div style={{position:"fixed",top:0,left:0,right:0,zIndex:9999,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 16px",background:"#fff",borderBottom:"1px solid #f0f0f0"}}><div style={{display:"flex",alignItems:"center",gap:12}}><img src="/logo.png" alt="BBL" style={{height:24,cursor:"pointer"}} onClick={()=>navigate('/')}/><span style={{fontFamily:mono,fontSize:10,color:"#a3a3a3"}}>{isGuest?"guest":userEmail}</span></div><div style={{display:"flex",alignItems:"center",gap:8}}>{!showOnboarding&&<button onClick={()=>setShowOnboarding(true)} style={{fontFamily:sans,fontSize:10,color:"#a3a3a3",background:"none",border:"1px solid #e5e5e5",borderRadius:99,padding:"3px 8px",cursor:"pointer"}} title="How it works">?</button>}{!isGuest&&<span style={{fontFamily:mono,fontSize:10,color:saving?"#ca8a04":"#d4d4d4"}}>{saving?"saving...":lastSaved?`saved ${new Date(lastSaved).toLocaleTimeString()}`:""}</span>}<button onClick={isGuest?()=>onRequireAuth("sign in to save your progress"):onSignOut} style={{fontFamily:sans,fontSize:10,color:"#a3a3a3",background:"none",border:"1px solid #e5e5e5",borderRadius:99,padding:"3px 10px",cursor:"pointer"}}>{isGuest?"sign in":"sign out"}</button></div></div>);
});

// ============================================================
// Main Board App (post-auth)
// ============================================================
function DraftBoard({user,onSignOut,isGuest,onRequireAuth,onOpenGuide,gmQuizMockLaunch,onClearGmQuizMock,adminOverrides}){
  const[phase,setPhase]=useState("loading");
  const[activePos,setActivePos]=useState(null);
  const[ratings,setRatings]=useState({});
  const[completed,setCompleted]=useState({});
  const[matchups,setMatchups]=useState({});
  const[currentMatchup,setCurrentMatchup]=useState(null);
  const[traits,setTraits]=useState({});
  const traitsRef=useRef(traits);traitsRef.current=traits;
  const[debouncedTraits,setDebouncedTraits]=useState(traits);
  useEffect(()=>{const t=setTimeout(()=>setDebouncedTraits(traits),300);return()=>clearTimeout(t);},[traits]);
  const[rankedGroups,setRankedGroups]=useState(new Set());
  const[traitReviewedGroups,setTraitReviewedGroups]=useState(new Set());
  const[selectedPlayer,setSelectedPlayer]=useState(null);
  const[boardInitPos,setBoardInitPos]=useState(null);
  const[reconcileQueue,setReconcileQueue]=useState([]);
  const[reconcileIndex,setReconcileIndex]=useState(0);
  const[compCount,setCompCount]=useState({});
  const[winCount,setWinCount]=useState({});
  const[showConfidence,setShowConfidence]=useState(false);
  const[pendingWinner,setPendingWinner]=useState(null);
  const[compareList,setCompareList]=useState([]);
  const[saving,setSaving]=useState(false);
  const[lastSaved,setLastSaved]=useState(null);
  const[profilePlayer,setProfilePlayer]=useState(null);
  const profileTraitsSnapshot=useRef(null);
  const userIdRef=useRef(user?.id);userIdRef.current=user?.id;
  const openProfile=useCallback((p)=>{if(p)trackEvent(userIdRef.current,'profile_opened',{player:p.name,pos:p.pos});profileTraitsSnapshot.current=p?JSON.stringify(traitsRef.current[p.id]||{}):null;setProfilePlayer(p);},[]);
  const closeProfile=useCallback(()=>{
    if(profilePlayer){
      const before=profileTraitsSnapshot.current;
      const after=JSON.stringify(traitsRef.current[profilePlayer.id]||{});
      if(before!==after){
        const gpos=profilePlayer.gpos||profilePlayer.pos;
        const group=(gpos==="K"||gpos==="P"||gpos==="LS")?"K/P":gpos;
        if(!rankedGroups.has(group)){
          setBoardTab("my");
          const toast=document.createElement('div');toast.textContent='saved to your board';
          Object.assign(toast.style,{position:'fixed',bottom:'32px',left:'50%',transform:'translateX(-50%)',background:'#171717',color:'#fff',padding:'10px 24px',borderRadius:'99px',fontSize:'13px',fontWeight:'600',fontFamily:'-apple-system,system-ui,sans-serif',zIndex:'99999',boxShadow:'0 4px 12px rgba(0,0,0,0.15)',transition:'opacity 0.3s'});
          document.body.appendChild(toast);
          setTimeout(()=>{toast.style.opacity='0';setTimeout(()=>toast.remove(),300);},2000);
        }
      }
    }
    setProfilePlayer(null);
  },[profilePlayer,rankedGroups]);
  const[notes,setNotes]=useState({});
  const[partialProgress,setPartialProgress]=useState({}); // {pos: {matchups:[], completed:Set, ratings:{}}}
  const[communityBoard,setCommunityBoard]=useState(null);
  const[showMockDraft,setShowMockDraft]=useState(false);
  const[showRound1Prediction,setShowRound1Prediction]=useState(()=>window.location.pathname==='/r1');
  const[r1PredictionSlots,setR1PredictionSlots]=useState(null);
  const[showTier3Needs,setShowTier3Needs]=useState(false);
  const[expandedNeeds,setExpandedNeeds]=useState(new Set());
  const[schemeFitPos,setSchemeFitPos]=useState("ALL");
  const[schemeFitExpanded,setSchemeFitExpanded]=useState(false);
  const[trendsProspectTab,setTrendsProspectTab]=useState("scheme");
  const[expandedSchemeFitId,setExpandedSchemeFitId]=useState(null);
  const[schemeFitInfo,setSchemeFitInfo]=useState(false);
  const[mockLaunchTeam,setMockLaunchTeam]=useState(null);// Set of teams or null
  const[mockTeamPicker,setMockTeamPicker]=useState("");
  const[mockTeamSet,setMockTeamSet]=useState(new Set());
  const[mockRounds,setMockRounds]=useState(1);
  const[mockSpeed,setMockSpeed]=useState(50);
  const[mockCpuTrades,setMockCpuTrades]=useState(true);
  const[mockBoardMode,setMockBoardMode]=useState("consensus");
  useEffect(()=>{if(showMockDraft)trackEvent(user?.id,'mock_draft_started',{guest:!user});},[showMockDraft]);
  // Auto-launch mock from GM Quiz CTA
  useEffect(()=>{if(gmQuizMockLaunch){setMockLaunchTeam(new Set([gmQuizMockLaunch]));setMockRounds(7);setMockSpeed(50);setMockCpuTrades(true);setMockBoardMode("consensus");setShowMockDraft(true);if(onClearGmQuizMock)onClearGmQuizMock();}},[gmQuizMockLaunch]);
  const[boardTab,setBoardTab]=useState("consensus");
  const[boardFilter,setBoardFilter]=useState(new Set());
  const[boardShowAll,setBoardShowAll]=useState(false);
  const[boardTraitFilter,setBoardTraitFilter]=useState(new Set());
  const[boardArchetypeFilter,setBoardArchetypeFilter]=useState(new Set());
  const[boardMeasMode,setBoardMeasMode]=useState(false);
  const[boardRadarGrid,setBoardRadarGrid]=useState(false);
  useEffect(()=>{setBoardTraitFilter(new Set());setBoardArchetypeFilter(new Set());setBoardMeasMode(false);},[boardFilter]);
  useEffect(()=>{if(rankedGroups.size>0)setBoardTab("my");},[rankedGroups.size]);
  const[lockedPlayer,setLockedPlayer]=useState(null);
  const[showOnboarding,setShowOnboarding]=useState(()=>{try{return !localStorage.getItem('bbl_onboarded');}catch(e){return true;}});

  // Team needs for mock draft — sourced from agent data via teamNeedsData.js (TEAM_NEEDS_SIMPLE)

  // Load board from Supabase on mount
  useEffect(()=>{
    if(!user?.id){setPhase("home");return;}
    (async()=>{
      try{
        const{data}=await supabase.from('boards').select('board_data,updated_at').eq('user_id',user.id).single();
        if(data?.board_data){
          const d=data.board_data;
          // Migrate old position group keys (OL->OT/IOL, DL->EDGE/DL, DB->CB/S)
          let rg=d.rankedGroups||[];
          const OLD_TO_NEW={"OL":["OT","IOL"],"DB":["CB","S"]};
          let migrated=false;
          const newRg=[];
          rg.forEach(g=>{if(OLD_TO_NEW[g]){OLD_TO_NEW[g].forEach(n=>newRg.push(n));migrated=true;}else{newRg.push(g);}});
          if(migrated)rg=newRg;
          if(d.ratings)setRatings(d.ratings);
          if(d.traits)setTraits(d.traits);
          if(rg.length>0)setRankedGroups(new Set(rg));
          if(d.traitReviewedGroups)setTraitReviewedGroups(new Set(d.traitReviewedGroups));
          if(d.compCount)setCompCount(d.compCount);
          if(d.notes)setNotes(d.notes);
          if(d.partialProgress){
            // Restore partial progress — convert completed arrays back to Sets
            const pp={};
            Object.entries(d.partialProgress).forEach(([pos,data])=>{
              pp[pos]={matchups:data.matchups||[],completed:new Set(data.completed||[]),ratings:data.ratings||{}};
            });
            setPartialProgress(pp);
          }
          setLastSaved(data.updated_at);
          const path=window.location.pathname;
          if(path==='/board'||path.startsWith('/board/')){
            const posSlug=path.startsWith('/board/')?path.split('/')[2]:'';
            const search=new URLSearchParams(window.location.search);
            const raw=(posSlug||search.get('pos')||'').toUpperCase();
            const posNorm=raw==='K-P'?'K/P':raw;
            // Smart redirect: unranked pos → mark for /rank redirect
            if(posNorm&&POSITION_GROUPS.includes(posNorm)&&!new Set(rg).has(posNorm)){
              pendingRankRef.current='/rank/'+posToSlug(posNorm);
              setPhase(rg.length>0?"pick-position":"home");
            }else{
              if(posNorm&&POSITION_GROUPS.includes(posNorm))setBoardInitPos(posNorm);
              setPhase('board');
            }
          }else if(path.startsWith('/rank/')){
            pendingRankRef.current=path;
            setPhase(rg.length>0?"pick-position":"home");
          }else{
            setPhase(rg.length>0?"pick-position":"home");
          }
        }else{setPhase("home");}
      }catch(e){console.error('Board load error:',e);setPhase("home");}
    })();
  },[user?.id]);

  // Auto-save debounced
  const saveTimer=useRef(null);
  useEffect(()=>{
    if(!user?.id)return;
    if(phase==="loading")return;
    if(saveTimer.current)clearTimeout(saveTimer.current);
    saveTimer.current=setTimeout(async()=>{
      if(rankedGroups.size===0&&Object.keys(ratings).length===0&&!lastSaved)return;
      setSaving(true);
      try{
        const ppSerialized={};
        Object.entries(partialProgress).forEach(([pos,data])=>{
          ppSerialized[pos]={matchups:data.matchups||[],completed:[...(data.completed||[])],ratings:data.ratings||{}};
        });
        const boardData={ratings,traits,rankedGroups:[...rankedGroups],traitReviewedGroups:[...traitReviewedGroups],compCount,notes,partialProgress:ppSerialized};
        const{error}=await supabase.from('boards').upsert({user_id:user.id,board_data:boardData},{onConflict:'user_id'});
        if(!error)setLastSaved(new Date().toISOString());
        // Also save to community board for aggregation
        if(rankedGroups.size>0){
          try{
            const communityData={};
            PROSPECTS.filter(p=>{const g=p.gpos||p.pos;const group=(g==="K"||g==="P"||g==="LS")?"K/P":g;return rankedGroups.has(group);}).forEach(p=>{communityData[p.id]=ratings[p.id]||1500;});
            await supabase.from('community_boards').upsert({user_id:user.id,board_data:communityData},{onConflict:'user_id'});
          }catch(e){}
        }
      }catch(e){console.error('Board save error:',e);}
      setSaving(false);
    },2000);
    return()=>{if(saveTimer.current)clearTimeout(saveTimer.current);};
  },[ratings,traits,rankedGroups,traitReviewedGroups,compCount,notes,partialProgress,user?.id,phase]);

  // Pending rank route — set in data load callback, consumed by useLayoutEffect before paint
  const pendingRankRef=useRef(null);

  const prospectsMap=useMemo(()=>{const m={};PROSPECTS.forEach(p=>m[p.id]=p);return m;},[]);
  const byPos=useMemo(()=>{const m={};const seen=new Set();PROSPECTS.forEach(p=>{if(seen.has(p.id))return;seen.add(p.id);const g=p.gpos||p.pos;const group=(g==="K"||g==="P"||g==="LS")?"K/P":g;if(!m[group])m[group]=[];m[group].push(p);});return m;},[]);
  // Trait thresholds: per-position percentile cutoffs
  const traitThresholds=useMemo(()=>{const result={};Object.entries(POSITION_TRAITS).forEach(([pos,posTraits])=>{const players=byPos[pos]||[];if(!players.length)return;result[pos]={};posTraits.forEach(trait=>{const values=players.map(p=>tv(debouncedTraits,p.id,trait,p.name,p.school)).sort((a,b)=>a-b);const n=values.length;result[pos][trait]={p80:values[Math.floor(n*0.8)]||50,p90:values[Math.floor(n*0.9)]||50};});});return result;},[debouncedTraits,byPos]);
  const qualifiesForFilter=useCallback((id,pos,trait)=>{const p=prospectsMap[id];if(!p)return false;const th=traitThresholds[pos]?.[trait];if(!th)return false;const score=tv(debouncedTraits,id,trait,p.name,p.school);return score>=th.p80&&score>75;},[traitThresholds,debouncedTraits,prospectsMap]);
  const qualifiesForBadge=useCallback((id,pos,trait)=>{const p=prospectsMap[id];if(!p)return false;const th=traitThresholds[pos]?.[trait];if(!th)return false;const score=tv(debouncedTraits,id,trait,p.name,p.school);return score>=th.p90&&score>80;},[traitThresholds,debouncedTraits,prospectsMap]);
  const getMeasVal=useCallback((name,school,m)=>{const key=MEASURABLE_KEY[m];if(MEASURABLE_DRILLS.includes(m)){const cs=getCombineScores(name,school);return cs?.percentiles?.[key]??null;}if(MEASURABLE_RAW.includes(m)){const cd=getCombineData(name,school);return cd?.[key]??null;}const cs=getCombineScores(name,school);return cs?.[key]??null;},[]);
  const measurableThresholds=useMemo(()=>{const result={};POSITION_GROUPS.forEach(pos=>{const players=byPos[pos]||[];if(!players.length)return;result[pos]={};MEASURABLE_LIST.forEach(m=>{const values=players.map(p=>getMeasVal(p.name,p.school,m)).filter(v=>v!=null);if(values.length<3)return;values.sort((a,b)=>a-b);const n=values.length;result[pos][m]={p80:values[Math.floor(n*0.8)]||0,p90:values[Math.floor(n*0.9)]||0};});});return result;},[byPos,getMeasVal]);
  const qualifiesForMeasurableFilter=useCallback((id,pos,m)=>{const p=prospectsMap[id];if(!p)return false;const th=measurableThresholds[pos]?.[m];if(!th)return false;const val=getMeasVal(p.name,p.school,m);if(val==null)return false;const isRaw=MEASURABLE_RAW.includes(m);return val>=th.p80&&(isRaw||val>75);},[measurableThresholds,getMeasVal,prospectsMap]);
  const prospectBadges=useMemo(()=>{const badges={};PROSPECTS.forEach(p=>{const pos=p.gpos||p.pos;const pk=(pos==="K"||pos==="P"||pos==="LS")?"K/P":pos;const posTraits=POSITION_TRAITS[pk]||[];const qualifying=posTraits.filter(trait=>qualifiesForBadge(p.id,pk,trait)).map(trait=>({trait,emoji:TRAIT_EMOJI[trait]||"",score:tv(debouncedTraits,p.id,trait,p.name,p.school)})).sort((a,b)=>b.score-a.score).slice(0,5);if(qualifying.length>0)badges[p.id]=qualifying;});return badges;},[debouncedTraits,qualifiesForBadge]);
  const posRankFn=useCallback((id)=>{const p=prospectsMap[id];if(!p)return 999;const ps=getProspectStats(p.name,p.school);return ps?.posRank||getConsensusRank(p.name)||999;},[prospectsMap]);
  const startRanking=useCallback((pos,resume=false)=>{
    setLockedPlayer(null);
    trackEvent(user?.id,'ranking_started',{position:pos,resume,guest:!user});
    const ids=[...new Set((byPos[pos]||[]).map(p=>p.id))];
    const consensusRankFn=(id)=>{const p=prospectsMap[id];if(!p)return 999;const ps=getProspectStats(p.name,p.school);return ps?.posRank||getConsensusRank(p.name)||999;};
    let allM,doneSet,r,c;
    if(resume&&partialProgress[pos]){
      // Resume from saved state
      allM=partialProgress[pos].matchups;
      doneSet=new Set(partialProgress[pos].completed);
      r={...ratings,...partialProgress[pos].ratings};
      c={...compCount};
      ids.forEach(id=>{if(!r[id])r[id]=INITIAL_ELO;if(!c[id])c[id]=0;});
    }else{
      // Fresh start
      allM=generateMatchups(ids,consensusRankFn);
      doneSet=new Set();
      r={...ratings};c={...compCount};
      ids.forEach(id=>{if(!r[id])r[id]=INITIAL_ELO;if(!c[id])c[id]=0;});
    }
    setRatings(r);setCompCount(c);
    setCompleted(prev=>({...prev,[pos]:doneSet}));
    setMatchups(prev=>({...prev,[pos]:allM}));
    const next=getNextMatchup(allM,doneSet,r,c,posRankFn,null);
    if(!next){finishRanking(pos,r);return;}
    setCurrentMatchup(next);
    setActivePos(pos);setPhase("ranking");
  },[ratings,compCount,byPos,partialProgress,prospectsMap,posRankFn]);
  // Route /rank/* before browser paints — eliminates flash between loading pulse and ranking view
  useLayoutEffect(()=>{
    if(!pendingRankRef.current)return;
    const path=pendingRankRef.current;
    pendingRankRef.current=null;
    const posParam=posFromSlug(path.split('/')[2]);
    if(posParam&&POSITION_GROUPS.includes(posParam)){
      if(rankedGroups.has(posParam)){
        setBoardInitPos(posParam);setPhase('board');
        window.history.replaceState({},'','/board?pos='+posToSlug(posParam));
      }else{
        window.history.replaceState({},'','/rank/'+posToSlug(posParam));
        startRanking(posParam,!!partialProgress[posParam]);
      }
    }else{
      const first=POSITION_GROUPS.find(g=>!rankedGroups.has(g))||'QB';
      window.history.replaceState({},'','/rank/'+posToSlug(first));
      startRanking(first,!!partialProgress[first]);
    }
  });
  const handlePick=useCallback((winnerId,confidence=0.5)=>{if(!currentMatchup||!activePos)return;const[a,b]=currentMatchup;const aWon=winnerId===a;const k=24+(confidence*24);const{newA,newB}=eloUpdate(ratings[a]||1500,ratings[b]||1500,aWon,k);const ur={...ratings,[a]:newA,[b]:newB};setRatings(ur);const uc={...compCount,[a]:(compCount[a]||0)+1,[b]:(compCount[b]||0)+1};setCompCount(uc);setWinCount(prev=>({...prev,[winnerId]:(prev[winnerId]||0)+1}));const ns=new Set(completed[activePos]);ns.add(`${a}-${b}`);setCompleted(prev=>({...prev,[activePos]:ns}));
    // Save partial progress for resume
    setPartialProgress(prev=>({...prev,[activePos]:{matchups:matchups[activePos]||[],completed:ns,ratings:ur}}));
    const next=getNextMatchup(matchups[activePos],ns,ur,uc,posRankFn,lockedPlayer);if(!next){if(lockedPlayer){setLockedPlayer(null);const nextUnlocked=getNextMatchup(matchups[activePos],ns,ur,uc,posRankFn,null);if(!nextUnlocked)finishRanking(activePos,ur);else setCurrentMatchup(nextUnlocked);}else{finishRanking(activePos,ur);}}else setCurrentMatchup(next);setShowConfidence(false);setPendingWinner(null);},[currentMatchup,activePos,ratings,completed,matchups,compCount,posRankFn,lockedPlayer]);
  const canFinish=useMemo(()=>{if(!activePos||!byPos[activePos])return false;return byPos[activePos].every(p=>(compCount[p.id]||0)>=MIN_COMPS);},[activePos,byPos,compCount]);
  const canSim=useMemo(()=>{if(!activePos)return false;const doneCount=(completed[activePos]||new Set()).size;return doneCount>=20;},[activePos,completed]);
  const simAndFinish=useCallback((pos)=>{
    const ids=[...new Set((byPos[pos]||[]).map(p=>p.id))];
    const currentCompleted=completed[pos]||partialProgress[pos]?.completed||new Set();
    const currentMatchups=matchups[pos]||partialProgress[pos]?.matchups||[];
    const consensusRankFn=(id)=>{const p=prospectsMap[id];if(!p)return 999;const ps=getProspectStats(p.name,p.school);return ps?.posRank||getConsensusRank(p.name)||999;};
    // Get currently ranked top N (the ones user manually ranked)
    const manuallyRanked=[...ids].sort((a,b)=>(ratings[b]||1500)-(ratings[a]||1500));
    const topN=manuallyRanked.slice(0,Math.min(10,ids.filter(id=>(compCount[id]||0)>=MIN_COMPS).length||10));
    // Sim remaining matchups
    const result=simRemainingMatchups(currentMatchups,currentCompleted,ratings,ids,consensusRankFn);
    // Merge ratings but ensure manually-ranked top players stay on top
    const merged={...result.ratings};
    // Get max rating from sim'd results for unranked players
    const topRating=Math.max(...topN.map(id=>merged[id]||1500));
    // Ensure all manually-ranked top players are above all sim'd players
    topN.forEach((id,i)=>{merged[id]=topRating+100-i;});
    setRatings(prev=>({...prev,...merged}));
    setCompleted(prev=>({...prev,[pos]:result.completed}));
    // Clear partial progress for this position
    setPartialProgress(prev=>{const n={...prev};delete n[pos];return n;});
    finishRanking(pos,merged);
  },[byPos,completed,matchups,ratings,compCount,prospectsMap,partialProgress]);
  const getRanked=useCallback((pos)=>{const seen=new Set();return[...(byPos[pos]||[])].filter(p=>{if(seen.has(p.id))return false;seen.add(p.id);return true;}).sort((a,b)=>(ratings[b.id]||1500)-(ratings[a.id]||1500));},[byPos,ratings]);
  const movePlayer=useCallback((pos,fromIdx,toIdx)=>{
    if(fromIdx===toIdx)return;
    const ranked=getRanked(pos);
    const player=ranked[fromIdx];
    if(!player)return;
    // Set the moved player's rating to be between its new neighbors
    const newRatings={...ratings};
    if(toIdx===0){
      newRatings[player.id]=(newRatings[ranked[0].id]||1500)+10;
    }else if(toIdx>=ranked.length-1){
      newRatings[player.id]=(newRatings[ranked[ranked.length-1].id]||1500)-10;
    }else{
      const above=toIdx<fromIdx?ranked[toIdx]:ranked[toIdx+1];
      const below=toIdx<fromIdx?ranked[toIdx-1]:ranked[toIdx];
      newRatings[player.id]=((newRatings[above?.id]||1500)+(newRatings[below?.id]||1500))/2;
    }
    setRatings(newRatings);
  },[getRanked,ratings]);
  // Admin-aware scouting traits: scouting baseline → admin overrides merged on top
  const _normAdmin=(name)=>name.toLowerCase().replace(/\./g,"").replace(/\s+(jr|sr|ii|iii|iv|v)\s*$/i,"").replace(/\s+/g," ").trim();
  const _adminAliases={"marquarius white":"squirrel white"};
  const getAdminScoutingTraits=useCallback((name,school)=>{
    const sc=getScoutingTraits(name,school);
    if(!adminOverrides||!Object.keys(adminOverrides).length)return sc;
    const n=_adminAliases[_normAdmin(name)]||_normAdmin(name);
    const key=n+"|"+school.toLowerCase().replace(/\s+/g," ").trim();
    const ao=adminOverrides[key]||(()=>{for(const k in adminOverrides){if(k.startsWith(n+"|"))return adminOverrides[k];}return null;})();
    if(!ao)return sc;
    if(!sc)return ao.traits?{...(ao.traits),__ceiling:ao.ceiling||"normal"}:null;
    const merged={...sc,...(ao.traits||{})};
    if(ao.ceiling)merged.__ceiling=ao.ceiling;
    return merged;
  },[adminOverrides]);
  // Grade computation: user traits → scouting traits → fallback 50
  const gradeFromTraits=useCallback((traitObj,pos)=>{
    const weights=TRAIT_WEIGHTS[pos]||TRAIT_WEIGHTS["QB"];const posTraits=POSITION_TRAITS[pos]||[];
    let totalW=0,totalV=0;posTraits.forEach(trait=>{const w=weights[trait]||1/posTraits.length;const v=traitObj[trait]||50;totalW+=w;totalV+=v*w;});
    const raw=totalW>0?totalV/totalW:50;
    // Piecewise remap: top stays, bottom compresses
    if(raw>=90)return Math.min(99,Math.round(raw));
    if(raw>=80)return Math.round(70+(raw-80)*2);
    if(raw>=70)return Math.round(50+(raw-70)*2);
    return Math.max(1,Math.round(30+(raw-60)*2));
  },[]);
  const getGrade=useCallback((id)=>{const p=prospectsMap[id];if(!p)return 50;
    const pos=p.gpos||p.pos;const t=traits[id];
    // If user has set traits, use those (existing behavior with ceiling support)
    if(t&&Object.keys(t).length>0){const sc=getAdminScoutingTraits(p.name,p.school)||{};const st=getStatBasedTraits(p.name,p.school)||{};const merged={...st,...sc,...t};const grade=gradeFromTraits(merged,pos);const ceil=t.__ceiling;if(!ceil||ceil==="normal")return grade;const weights=TRAIT_WEIGHTS[pos]||TRAIT_WEIGHTS["QB"];const posTraits=POSITION_TRAITS[pos]||[];let rawW=0,rawV=0;posTraits.forEach(trait=>{const teach=TRAIT_TEACHABILITY[trait]??0.5;if(teach<0.4){const w=weights[trait]||1/posTraits.length;rawW+=w;rawV+=(merged[trait]||50)*w;}});const rawScore=rawW>0?rawV/rawW:grade;const gap=rawScore-grade;if(ceil==="high")return Math.max(1,Math.min(99,Math.round(grade+Math.max(gap*0.5,0)+4)));if(ceil==="elite")return Math.max(1,Math.min(99,Math.round(grade+Math.max(gap*0.7,0)+7)));if(ceil==="capped")return Math.max(1,Math.min(99,Math.round(grade-Math.max(-gap*0.3,0)-3)));return grade;}
    // No user traits — use scouting data with admin overrides (new effective baseline)
    const sc=getAdminScoutingTraits(p.name,p.school);
    if(sc){const grade=gradeFromTraits(sc,pos);const ceil=sc.__ceiling;if(!ceil||ceil==="normal")return grade;const weights=TRAIT_WEIGHTS[pos]||TRAIT_WEIGHTS["QB"];const posTraits=POSITION_TRAITS[pos]||[];let rawW=0,rawV=0;posTraits.forEach(trait=>{const teach=TRAIT_TEACHABILITY[trait]??0.5;if(teach<0.4){const w=weights[trait]||1/posTraits.length;rawW+=w;rawV+=(sc[trait]||50)*w;}});const rawScore=rawW>0?rawV/rawW:grade;const gap=rawScore-grade;if(ceil==="high")return Math.max(1,Math.min(99,Math.round(grade+Math.max(gap*0.5,0)+4)));if(ceil==="elite")return Math.max(1,Math.min(99,Math.round(grade+Math.max(gap*0.7,0)+7)));if(ceil==="capped")return Math.max(1,Math.min(99,Math.round(grade-Math.max(-gap*0.3,0)-3)));return grade;}
    return 50;
  },[traits,gradeFromTraits,prospectsMap,getAdminScoutingTraits]);
  // Scouting-only grade — immutable, never reads user traits. Used for consensus board.
  const getScoutingGrade=useCallback((id)=>{const p=prospectsMap[id];if(!p)return 50;
    const pos=p.gpos||p.pos;
    const sc=getAdminScoutingTraits(p.name,p.school);
    if(sc){const grade=gradeFromTraits(sc,pos);const ceil=sc.__ceiling;if(!ceil||ceil==="normal")return grade;const weights=TRAIT_WEIGHTS[pos]||TRAIT_WEIGHTS["QB"];const posTraits=POSITION_TRAITS[pos]||[];let rawW=0,rawV=0;posTraits.forEach(trait=>{const teach=TRAIT_TEACHABILITY[trait]??0.5;if(teach<0.4){const w=weights[trait]||1/posTraits.length;rawW+=w;rawV+=(sc[trait]||50)*w;}});const rawScore=rawW>0?rawV/rawW:grade;const gap=rawScore-grade;if(ceil==="high")return Math.max(1,Math.min(99,Math.round(grade+Math.max(gap*0.5,0)+4)));if(ceil==="elite")return Math.max(1,Math.min(99,Math.round(grade+Math.max(gap*0.7,0)+7)));if(ceil==="capped")return Math.max(1,Math.min(99,Math.round(grade-Math.max(-gap*0.3,0)-3)));return grade;}
    return 50;
  },[gradeFromTraits,prospectsMap,getAdminScoutingTraits]);
  const finishRanking=useCallback((pos)=>{
    setRankedGroups(prev=>new Set([...prev,pos]));
    setTraitReviewedGroups(prev=>new Set([...prev,pos]));
    setPartialProgress(prev=>{const n={...prev};delete n[pos];return n;});
    trackEvent(user?.id,'ranking_completed',{position:pos,guest:!user});
    const ranked=getRanked(pos);const byGrade=[...ranked].sort((a,b)=>getGrade(b.id)-getGrade(a.id));
    const conflicts=ranked.map((p,i)=>{const gi=byGrade.findIndex(x=>x.id===p.id);return Math.abs(i-gi)>=3?{player:p,pairRank:i+1,gradeRank:gi+1,grade:getGrade(p.id)}:null;}).filter(Boolean);
    if(conflicts.length){setReconcileQueue(conflicts);setReconcileIndex(0);setPhase("reconcile");}
    else{setBoardInitPos(pos);setPhase("board");window.history.replaceState({},'','/board');}
  },[user?.id,getRanked,getGrade]);
  // Consensus rankings for player profile drawer — directly from CSV-based CONSENSUS_BOARD
  const CONSENSUS=useMemo(()=>{
    return PROSPECTS.map(p=>({name:p.name,rank:getConsensusRank(p.name)}));
  },[]);
  const schemeFits=useMemo(()=>computeAllSchemeFits(PROSPECTS,debouncedTraits),[debouncedTraits]);
  const board=useMemo(()=>PROSPECTS.filter(p=>{const g=p.gpos||p.pos;const group=(g==="K"||g==="P"||g==="LS")?"K/P":g;const hasTraitEdits=traits[p.id]&&Object.keys(traits[p.id]).length>0;return rankedGroups.has(group)||hasTraitEdits;}).sort((a,b)=>{const d=getGrade(b.id)-getGrade(a.id);return d!==0?d:(ratings[b.id]||1500)-(ratings[a.id]||1500);}),[rankedGroups,getGrade,ratings,traits]);

  // Build mock draft board: consensus order for all 319, user rankings override when graded
  const mockDraftBoard=useMemo(()=>{
    // Sort ALL prospects by grade (same as big board), break ties with consensus rank
    return [...PROSPECTS].sort((a,b)=>getConsensusRank(a.name)-getConsensusRank(b.name));
  },[getConsensusRank]);




  // === MOCK DRAFT (check before phase returns to fix click bug) ===
  // My Guys state
  const[myGuys,setMyGuys]=useState([]);
  const[myGuysUpdated,setMyGuysUpdated]=useState(false);
  const myGuysInitialLoad=useRef(true);
  const[showMyGuys,setShowMyGuys]=useState(()=>window.location.pathname==='/my-guys');
  const isLabPath=p=>p==='/lab'||p==='/data-lab'||p.startsWith('/lab/')||p.startsWith('/data-lab/');
  const labSuffix=p=>{const m=p.match(/^\/(?:data-lab|lab)\/(.+)/);return m?m[1]:null;};
  const posFromSlug=(slug)=>{const upper=slug?.toUpperCase();return upper==='K-P'?'K/P':upper;};
  const posToSlug=(pos)=>pos==='K/P'?'k-p':pos.toLowerCase();
  const[showExplorer,setShowExplorer]=useState(()=>isLabPath(window.location.pathname));
  const[explorerMeas,setExplorerMeas]=useState("ATH");
  const[explorerMode,setExplorerMode]=useState(()=>{const s=labSuffix(window.location.pathname);return s==="madness"?"madness":s==="combo"?"combo":s==="scarcity"?"scarcity":s==="free-agency"?"free-agency":s==="measurables"?"measurables":s==="traits"?"traits":s==="stats"?"stats":"scheme-fit";});
  const[explorerTrait,setExplorerTrait]=useState("Speed");
  const[explorerMyGuys,setExplorerMyGuys]=useState(false);
  const[explorerAbsolute,setExplorerAbsolute]=useState(false);
  const[explorerStat,setExplorerStat]=useState("passing_YDS");
  const[explorerStatOpen,setExplorerStatOpen]=useState(()=>new Set(["Passing"]));
  const[explorerAvgInfo,setExplorerAvgInfo]=useState(false);
  const[explorerLogos,setExplorerLogos]=useState(()=>new URLSearchParams(window.location.search).get('logos')==='1');
  const[explorerLeaderPos,setExplorerLeaderPos]=useState(null);
  const[explorerLeaderInfo,setExplorerLeaderInfo]=useState(false);
  const[explorerHover,setExplorerHover]=useState(null);
  const[comboPos,setComboPos]=useState(()=>{const s=new URLSearchParams(window.location.search);return s.get('pos')||"EDGE";});
  const[comboX,setComboX]=useState(()=>{const s=new URLSearchParams(window.location.search);const pos=s.get('pos')||"EDGE";return s.get('x')||COMBO_DEFAULTS[pos]?.[0]||"defensive_SACKS";});
  const[comboY,setComboY]=useState(()=>{const s=new URLSearchParams(window.location.search);const pos=s.get('pos')||"EDGE";return s.get('y')||COMBO_DEFAULTS[pos]?.[1]||"meas_40";});
  const[comboSpotlightName,setComboSpotlightName]=useState(()=>{const s=new URLSearchParams(window.location.search);return s.get('player')||null;});
  const[comboDrop,setComboDrop]=useState(null); // null | "x" | "y"
  const[scarcityPick,setScarcityPick]=useState(0);
  const[scarcityTeam,setScarcityTeam]=useState(null);
  const[scarcityExpanded,setScarcityExpanded]=useState(null);
  const[faView,setFaView]=useState("position");
  const[faXAxis,setFaXAxis]=useState("count");
  const[faYAxis,setFaYAxis]=useState("aav");
  const[faPosFilter,setFaPosFilter]=useState(null);
  const[faTeamFilter,setFaTeamFilter]=useState(null);
  const[faDrop,setFaDrop]=useState(null);
  const[sfTeam,setSfTeam]=useState("49ers");
  const[sfPosFilter,setSfPosFilter]=useState("WR");
  const[sfArchetype,setSfArchetype]=useState(null);
  const[sfExpandedId,setSfExpandedId]=useState(null);
  const[sfPickSlider,setSfPickSlider]=useState(0);
  // March Madness Lab state
  const[madnessMode,setMadnessMode]=useState("combo");
  const[madnessX,setMadnessX]=useState("ortg");
  const[madnessY,setMadnessY]=useState("drtg");
  const[madnessRegion,setMadnessRegion]=useState("ALL");
  const[madnessTeamA,setMadnessTeamA]=useState(null);
  const[madnessTeamB,setMadnessTeamB]=useState(null);
  const[madnessUpsetSlider,setMadnessUpsetSlider]=useState(50);
  const[madnessHover,setMadnessHover]=useState(null);
  const[madnessMatchupDetail,setMadnessMatchupDetail]=useState(null);
  const[madnessSelectedTeam,setMadnessSelectedTeam]=useState(null);
  const sfVision=useMemo(()=>{if(!sfTeam)return new Map();try{return computeTeamScoutVision(sfTeam,PROSPECTS,schemeFits,debouncedTraits);}catch(e){console.error("sfVision error:",e);return new Map();}},[sfTeam,schemeFits,debouncedTraits]);
  const explorerTraitsKey=useMemo(()=>explorerMode==="traits"?traits:null,[explorerMode,traits]);
  const explorerData=useMemo(()=>{
    if(explorerMode==="combo"||explorerMode==="madness")return{points:[],min:0,max:0,groups:[],label:"",measCode:null,statCode:null,inverted:false};
    const points=[];
    const groupSet=new Set();
    if(explorerMode==="traits"){
      const applicablePositions=EXPLORER_GROUPS.filter(pos=>POSITION_TRAITS[pos]?.includes(explorerTrait));
      PROSPECTS.forEach(p=>{
        const gpos=p.gpos||p.pos;
        const group=(gpos==="K"||gpos==="P"||gpos==="LS")?"K/P":(gpos==="C"||gpos==="OG")?"IOL":gpos;
        if(!applicablePositions.includes(group))return;
        const val=tv(traits,p.id,explorerTrait,p.name,p.school);
        if(val==null)return;
        points.push({id:p.id,name:p.name,school:p.school,pos:gpos,group,val});
        groupSet.add(group);
      });
      const groups=EXPLORER_GROUPS.filter(g=>groupSet.has(g));
      const vals=points.map(pt=>pt.val);
      return{points,min:Math.min(...vals),max:Math.max(...vals),groups,label:explorerTrait,measCode:null,statCode:null,inverted:false};
    }else if(explorerMode==="measurables"){
      const m=explorerMeas;
      const inverted=INVERTED_MEAS.has(m);
      const isDrill=MEASURABLE_DRILLS.includes(m);
      const isRaw=MEASURABLE_RAW.includes(m);
      const rawKey=MEASURABLE_KEY[m];
      const useAbsolute=explorerAbsolute&&isDrill;
      PROSPECTS.forEach(p=>{
        const gpos=p.gpos||p.pos;
        const group=(gpos==="K"||gpos==="P"||gpos==="LS")?"K/P":(gpos==="C"||gpos==="OG")?"IOL":gpos;
        if(!EXPLORER_GROUPS.includes(group))return;
        const pctVal=getMeasVal(p.name,p.school,m);
        if(pctVal==null)return;
        const cd=getCombineData(p.name,p.school);
        const rawMeas=(isDrill||isRaw)&&cd&&cd[rawKey]!=null?cd[rawKey]:null;
        const val=useAbsolute&&rawMeas!=null?rawMeas:pctVal;
        const displayVal=rawMeas!=null?rawMeas:pctVal;
        points.push({id:p.id,name:p.name,school:p.school,pos:gpos,group,val,rawVal:pctVal,displayVal,measCode:m});
        groupSet.add(group);
      });
      const groups=EXPLORER_GROUPS.filter(g=>groupSet.has(g));
      const vals=points.map(pt=>pt.val);
      const mn=Math.min(...vals),mx=Math.max(...vals);
      const flipAxis=useAbsolute&&inverted;
      return{points,min:mn,max:mx,groups,label:MEASURABLE_SHORT[m]||m,measCode:m,statCode:null,inverted:flipAxis};
    }else{
      // Stats mode
      const stat=explorerStat;
      const isBreakout=stat==="breakout_year";
      const inverted=INVERTED_STATS.has(stat);
      const applicablePositions=[...new Set(STAT_CATEGORIES.filter(c=>c.keys.includes(stat)).flatMap(c=>c.positions))];
      const usePercentile=!explorerAbsolute&&!isBreakout;
      PROSPECTS.forEach(p=>{
        const gpos=p.gpos||p.pos;
        const group=(gpos==="K"||gpos==="P"||gpos==="LS")?"K/P":(gpos==="C"||gpos==="OG")?"IOL":gpos;
        if(!applicablePositions.includes(group))return;
        if(isBreakout){
          const raw=getStatVal(p.name,p.school,stat);
          if(raw==null)return;
          const classMap={"Fr":4,"So":3,"Jr":2,"Sr":1};
          const val=classMap[raw]||0;
          if(!val)return;
          points.push({id:p.id,name:p.name,school:p.school,pos:gpos,group,val,displayVal:raw,statCode:stat});
          groupSet.add(group);
        }else{
          const rawVal=getStatVal(p.name,p.school,stat);
          if(rawVal==null)return;
          const pctVal=usePercentile?getStatPercentile(p.name,p.school,stat,group):null;
          const val=usePercentile&&pctVal!=null?pctVal:rawVal;
          points.push({id:p.id,name:p.name,school:p.school,pos:gpos,group,val,rawVal:rawVal,displayVal:rawVal,statCode:stat});
          groupSet.add(group);
        }
      });
      const groups=EXPLORER_GROUPS.filter(g=>groupSet.has(g));
      const vals=points.map(pt=>pt.val);
      const mn=Math.min(...vals),mx=Math.max(...vals);
      const flipAxis=!isBreakout&&inverted&&explorerAbsolute;
      return{points,min:mn,max:mx,groups,label:STAT_SHORT[stat]||stat,measCode:null,statCode:stat,inverted:flipAxis};
    }
  },[explorerMode,explorerMeas,explorerTrait,explorerTraitsKey,getMeasVal,explorerAbsolute,explorerStat]);
  const comboMetrics=useMemo(()=>getComboMetrics(comboPos),[comboPos]);
  const comboData=useMemo(()=>{
    if(explorerMode!=="combo")return{points:[],xMeta:null,yMeta:null};
    const xMeta=comboMetrics.find(m=>m.key===comboX)||null;
    const yMeta=comboMetrics.find(m=>m.key===comboY)||null;
    if(!xMeta||!yMeta)return{points:[],xMeta,yMeta};
    const pts=[];
    (byPos[comboPos]||[]).forEach(p=>{
      const xv=getComboVal(p.name,p.school,p.id,comboX,comboPos,traits);
      const yv=getComboVal(p.name,p.school,p.id,comboY,comboPos,traits);
      if(xv==null||yv==null)return;
      pts.push({id:p.id,name:p.name,school:p.school,pos:p.gpos||p.pos,group:comboPos,x:xv,y:yv});
    });
    return{points:pts,xMeta,yMeta};
  },[explorerMode,comboPos,comboX,comboY,comboMetrics,byPos,traits]);
  const comboCorrelations=useMemo(()=>{
    if(explorerMode!=="combo")return[];
    const players=byPos[comboPos]||[];
    if(players.length<8)return[];
    const metrics=comboMetrics;
    // Static derived pairs: score ↔ measurable (always tautological)
    const DERIVED_STATIC=[["meas_SPD","meas_40"],["meas_SPD","meas_WT"],["meas_EXP","meas_VRT"],["meas_EXP","meas_BRD"],["meas_AGI","meas_3C"],["meas_AGI","meas_SHT"]];
    // Position-dependent trait overwrites
    const DERIVED_TRAIT_POS={trait_Speed:{keys:["meas_40","meas_SPD"],pos:["RB","WR","TE","CB","S"]},trait_Athleticism:{keys:["meas_ATH"],pos:["TE","OT","LB"]}};
    const isDerived=(ka,kb)=>{
      for(const[da,db] of DERIVED_STATIC){if((ka===da&&kb===db)||(ka===db&&kb===da))return true;}
      for(const[tk,cfg] of Object.entries(DERIVED_TRAIT_POS)){
        if(!cfg.pos.includes(comboPos))continue;
        for(const mk of cfg.keys){if((ka===tk&&kb===mk)||(ka===mk&&kb===tk))return true;}
      }
      return false;
    };
    // Precompute all values per metric
    const vals={};
    metrics.forEach(m=>{
      const arr=players.map(p=>({id:p.id,v:getComboVal(p.name,p.school,p.id,m.key,comboPos,traits)}));
      vals[m.key]=arr;
    });
    const pairs=[];
    for(let i=0;i<metrics.length;i++){
      for(let j=i+1;j<metrics.length;j++){
        const a=metrics[i],b=metrics[j];
        if(a.cat===b.cat)continue;
        if(isDerived(a.key,b.key))continue;
        // Build paired values where both non-null
        const xs=[],ys=[];
        for(let k=0;k<players.length;k++){
          const xv=vals[a.key][k].v,yv=vals[b.key][k].v;
          if(xv!=null&&yv!=null){xs.push(xv);ys.push(yv);}
        }
        if(xs.length<8)continue;
        const n=xs.length;
        const sx=xs.reduce((s,v)=>s+v,0),sy=ys.reduce((s,v)=>s+v,0);
        const sxy=xs.reduce((s,v,k)=>s+v*ys[k],0);
        const sx2=xs.reduce((s,v)=>s+v*v,0);
        const ym=sy/n;
        const den=n*sx2-sx*sx;
        if(!den)continue;
        const sl=(n*sxy-sx*sy)/den;
        const ic=(sy-sl*sx)/n;
        const ssRes=xs.reduce((s,v,k)=>{const p=sl*v+ic;return s+(ys[k]-p)**2;},0);
        const ssTot=ys.reduce((s,v)=>s+(v-ym)**2,0);
        const r2=ssTot>0?1-ssRes/ssTot:0;
        if(r2<0.35)continue;
        const dir=sl*(a.inverted?-1:1)*(b.inverted?-1:1)>=0?1:-1;
        pairs.push({a,b,r2,n:xs.length,dir});
      }
    }
    pairs.sort((a,b)=>b.r2-a.r2);
    return pairs.slice(0,8);
  },[explorerMode,comboPos,comboMetrics,byPos,traits]);
  const[mockCount,setMockCount]=useState(0);
  const[copiedShare,setCopiedShare]=useState(null);

  // === URL NAVIGATION ===
  const navigateRef=useRef(null);
  const setMetaTag=(sel,attr,val)=>{let el=document.querySelector(sel);if(!el){el=document.createElement('meta');const[a,v]=attr.split('=');el.setAttribute(a,v);document.head.appendChild(el);}el.setAttribute('content',val);};
  const updateRouteMeta=(title,desc,canonical)=>{
    document.title=title;
    setMetaTag('meta[name="description"]','name=description',desc);
    let link=document.querySelector('link[rel="canonical"]');if(!link){link=document.createElement('link');link.rel='canonical';document.head.appendChild(link);}
    link.setAttribute('href',canonical);
    setMetaTag('meta[property="og:title"]','property=og:title',title);
    setMetaTag('meta[property="og:description"]','property=og:description',desc);
    setMetaTag('meta[property="og:url"]','property=og:url',canonical);
    setMetaTag('meta[name="twitter:title"]','name=twitter:title',title);
    setMetaTag('meta[name="twitter:description"]','name=twitter:description',desc);
  };
  const applyRoute=useCallback((fullPath)=>{
    const raw=fullPath.split('?')[0];
    const p=raw.length>1?raw.replace(/\/+$/,''):raw;
    const search=new URLSearchParams(fullPath.includes('?')?fullPath.split('?')[1]:'');
    // Update meta tags per route
    if(isLabPath(p))updateRouteMeta('Data Lab — Big Board Lab','Explore 450+ NFL Draft prospects with interactive charts. Combine measurables, college stats, scheme fit analysis, scarcity maps, and free agency contract data.','https://bigboardlab.com/lab');
    else if(p==='/trends')updateRouteMeta('Team Insights — Big Board Lab','Deep-dive into every NFL team\'s draft strategy. Roster depth charts, free agency impact, positional needs, scheme fit analysis, and mock draft tendencies for all 32 teams.','https://bigboardlab.com/trends');
    else if(p==='/mock')updateRouteMeta('Mock Draft Simulator — Big Board Lab','Run realistic NFL mock drafts against 32 AI GMs with real team personalities, scheme preferences, and live trades. Every pick graded with depth chart updates.','https://bigboardlab.com/mock');
    else if(p==='/r1')updateRouteMeta('Round 1 Predictions — Big Board Lab','Monte Carlo simulation of the 2026 NFL Draft first round. 500 iterations predict where each prospect lands based on team needs, trade probability, and draft value.','https://bigboardlab.com/r1');
    else if(p==='/my-guys')updateRouteMeta('My Guys — Big Board Lab','Your most-drafted prospects across all mock draft simulations. Track which players you keep picking and share your favorites.','https://bigboardlab.com/my-guys');
    else if(p==='/board'||p.startsWith('/board/'))updateRouteMeta('Big Board — Big Board Lab','Your custom 2026 NFL Draft big board. Rank 450+ prospects with trait-based grading across every position. Consensus rankings and community data included.','https://bigboardlab.com/board');
    else if(p.startsWith('/rank'))updateRouteMeta('Rankings — Big Board Lab','Rank NFL Draft prospects head-to-head. Compare players side by side with stats, measurables, and trait profiles to build your positional rankings.','https://bigboardlab.com/rank');
    else updateRouteMeta('Big Board Lab — 2026 NFL Mock Draft Simulator & Board Builder','The most advanced 2026 NFL Draft tool. Build your big board with head-to-head rankings. Run mock drafts against 32 AI GMs with real team personalities, live trades, and depth charts. Combine explorer, college stats, dominator ratings, and historical percentiles. Every pick graded. Free.','https://bigboardlab.com');
    // Reset all DraftBoard-level overlays
    setShowExplorer(false);setShowTrends(false);setShowRound1Prediction(false);setShowMyGuys(false);setShowMockDraft(false);setMockLaunchTeam(null);
    if(isLabPath(p)){
      setShowExplorer(true);
      const s=labSuffix(p);
      const mode=s==="madness"?"madness":s==="combo"?"combo":s==="scarcity"?"scarcity":s==="free-agency"?"free-agency":s==="measurables"?"measurables":s==="traits"?"traits":s==="stats"?"stats":"scheme-fit";
      setExplorerMode(mode);
      if(mode==="combo"){const cp=search.get('pos'),cx=search.get('x'),cy=search.get('y'),cpl=search.get('player');if(cp)setComboPos(cp);if(cx)setComboX(cx);if(cy)setComboY(cy);setComboSpotlightName(cpl||null);}
      if(mode==="scheme-fit"&&!sfTeam)setSfTeam("49ers");
    }else if(p==='/trends'){
      setShowTrends(true);
      setTrendsTeam(search.get('team')||'Titans');
    }else if(p==='/r1'){
      setShowRound1Prediction(true);
    }else if(p==='/my-guys'){
      setShowMyGuys(true);
    }else if(p==='/board'||p.startsWith('/board/')){
      const posParam=posFromSlug(p.startsWith('/board/')?p.split('/')[2]:(search.get('pos')||''));
      if(posParam&&POSITION_GROUPS.includes(posParam)&&!rankedGroups.has(posParam)){
        navigateRef.current('/rank/'+posToSlug(posParam),{replace:true});return;
      }
      setPhase('board');
      if(posParam&&POSITION_GROUPS.includes(posParam))setBoardInitPos(posParam);
    }else if(p.startsWith('/rank')){
      const posParam=posFromSlug(p.split('/')[2]);
      if(posParam&&POSITION_GROUPS.includes(posParam)){
        if(rankedGroups.has(posParam)){navigateRef.current('/board?pos='+posToSlug(posParam),{replace:true});return;}
        startRanking(posParam,!!partialProgress[posParam]);
      }else{
        const firstUnranked=POSITION_GROUPS.find(g=>!rankedGroups.has(g));
        navigateRef.current('/rank/'+posToSlug(firstUnranked||'QB'),{replace:true});
      }
    }else if(p==='/mock'){
      setShowMockDraft(true);
    }else if(p==='/'){
      // Returning home — restore natural phase
      setPhase(rankedGroups.size>0?'pick-position':'home');
    }
  },[rankedGroups,partialProgress,startRanking]);

  const navigate=useCallback((path,opts)=>{
    const current=window.location.pathname+window.location.search;
    if(current===path)return;
    if(opts?.replace)window.history.replaceState({},'',path);
    else window.history.pushState({},'',path);
    applyRoute(path);
    if(!opts?.replace)trackEvent(userIdRef.current,'page_view',{path});
  },[applyRoute]);
  navigateRef.current=navigate;
  const saveBarProps={navigate,mono,sans,isGuest,userEmail:user?.email,showOnboarding,setShowOnboarding,saving,lastSaved,onRequireAuth,onSignOut};

  const openExplorer=useCallback((mode)=>{const target=mode?"/lab/"+mode:"/lab/scheme-fit";navigate(target);setShowExplorer(true);if(mode)setExplorerMode(mode);},[navigate]);
  const closeExplorer=useCallback(()=>{if(isLabPath(window.location.pathname))navigate('/');setShowExplorer(false);setExplorerHover(null);},[navigate]);

  // Consolidated popstate listener for all DraftBoard-level routes
  useEffect(()=>{
    const onPop=()=>applyRoute(window.location.pathname+window.location.search);
    window.addEventListener("popstate",onPop);
    return()=>window.removeEventListener("popstate",onPop);
  },[applyRoute]);

  // === TEAM MOCK TRENDS ===
  const[showTrends,setShowTrends]=useState(()=>window.location.pathname==='/trends');
  useEffect(()=>{window.scrollTo(0,0);},[phase,showMyGuys,showExplorer,showRound1Prediction,showTrends]);
  const[trendsTeam,setTrendsTeam]=useState(()=>{if(window.location.pathname==='/trends'){const p=new URLSearchParams(window.location.search);return p.get('team')||'Titans';}return'Titans';});
  const trendsVision=useMemo(()=>{if(!trendsTeam)return new Map();try{return computeTeamScoutVision(trendsTeam,PROSPECTS,schemeFits,debouncedTraits);}catch(e){console.error("trendsVision error:",e);return new Map();}},[trendsTeam,schemeFits,debouncedTraits]);
  const[trendsData,setTrendsData]=useState(null);
  const[trendsLoading,setTrendsLoading]=useState(false);
  const trendsCacheRef=useRef({});
  const TRENDS_TTL=5*60*1000;
  const allTeams=["Raiders","Jets","Cardinals","Titans","Giants","Browns","Commanders","Saints","Chiefs","Bengals","Dolphins","Cowboys","Rams","Ravens","Buccaneers","Lions","Vikings","Panthers","Steelers","Chargers","Eagles","Bears","Bills","49ers","Texans","Broncos","Patriots","Seahawks","Falcons","Colts","Jaguars","Packers"];

  const loadTrendsData=useCallback(async(teamName)=>{
    const cached=trendsCacheRef.current[teamName];
    if(cached&&Date.now()-cached.ts<TRENDS_TTL){setTrendsData(cached.data);return;}
    setTrendsLoading(true);
    try{
      const{data,error}=await supabase.rpc('get_team_community_picks',{team_name:teamName});
      if(error)throw error;
      const totalMocks=data?.total_mocks||0;
      const prospects=(data?.prospects||[]).map(p=>({...p,pct:totalMocks>0?Math.round((p.times_drafted/totalMocks)*100):0,isLock:totalMocks>0&&(p.times_drafted/totalMocks)>=0.6,isSleeper:totalMocks>0&&(p.times_drafted/totalMocks)<0.05}));
      const result={...data,prospects};
      trendsCacheRef.current[teamName]={data:result,ts:Date.now()};
      setTrendsData(result);
    }catch(e){console.error('Failed to load trends:',e);setTrendsData(null);}
    finally{setTrendsLoading(false);}
  },[]);

  const openTrends=useCallback((teamName)=>{
    const t=teamName||'Titans';
    navigate(`/trends?team=${encodeURIComponent(t)}`);
    setTrendsTeam(t);setShowTrends(true);loadTrendsData(t);
  },[navigate,loadTrendsData]);

  const closeTrends=useCallback(()=>{
    if(window.location.pathname==='/trends')navigate('/');
    setShowTrends(false);setTrendsData(null);
  },[navigate]);

  useEffect(()=>{if(showTrends&&trendsTeam)loadTrendsData(trendsTeam);},[showTrends,trendsTeam,loadTrendsData]);

  const ratingsRef=useRef(ratings);ratingsRef.current=ratings;
  const getGradeRef=useRef(getGrade);getGradeRef.current=getGrade;

  const loadMyGuys=useCallback(async()=>{
    if(!user?.id)return;
    try{
      const{data,error}=await supabase.from('mock_picks').select('prospect_name,prospect_pos,pick_number,is_user_pick,grade,mock_id').eq('user_id',user.id);
      if(error||!data)return;
      const uniqueMocks=new Set(data.map(d=>d.mock_id));
      setMockCount(uniqueMocks.size);
      const userPicks=data.filter(d=>d.is_user_pick);
      const pm={};
      userPicks.forEach(pk=>{
        if(!pm[pk.prospect_name])pm[pk.prospect_name]={name:pk.prospect_name,pos:pk.prospect_pos,picks:[],grades:[]};
        pm[pk.prospect_name].picks.push(pk.pick_number);
        if(pk.grade!=null)pm[pk.prospect_name].grades.push(pk.grade);
      });
      const totalMocks=uniqueMocks.size||1;
      const candidates=Object.values(pm).map(p=>{
        const avgPick=p.picks.reduce((a,b)=>a+b,0)/p.picks.length;
        const cr=getConsensusRank(p.name)||999;
        const delta=cr-avgPick;
        const avgGrade=p.grades.length>0?Math.round(p.grades.reduce((a,b)=>a+b,0)/p.grades.length):null;

        // Find prospect for grade lookup
        const prospect=PROSPECTS.find(x=>x.name===p.name);
        const hasUserInput=prospect&&(
          (traitsRef.current[prospect.id]&&Object.keys(traitsRef.current[prospect.id]).length>0)||
          (ratingsRef.current[prospect.id]&&ratingsRef.current[prospect.id]!==1500)
        );

        // Signal 1: User ranking vs consensus (0-100)
        let rankingSignal=50;
        if(hasUserInput&&prospect){
          const userGrade=getGradeRef.current(prospect.id);
          const consGrade=getConsensusGrade(p.name);
          rankingSignal=Math.max(0,Math.min(100,((userGrade-consGrade)+30)/60*100));
        }

        // Signal 2: Draft frequency (0-100)
        const frequencySignal=Math.min(100,(p.picks.length/totalMocks)*100);

        // Signal 3: Draft position vs consensus, clamped (0-100)
        const clampedDelta=Math.max(-50,Math.min(50,delta));
        const draftSignal=clampedDelta+50;

        // Weighted score — redistribute ranking weight if no user input
        const rw=hasUserInput?0.50:0;
        const fw=hasUserInput?0.30:0.55;
        const dw=hasUserInput?0.20:0.45;
        const score=rw*rankingSignal+fw*frequencySignal+dw*draftSignal;

        return{...p,avgPick:Math.round(avgPick*10)/10,consensusRank:cr,delta:Math.round(delta*10)/10,timesDrafted:p.picks.length,avgGrade,score:Math.round(score*10)/10};
      });
      const sorted=candidates.sort((a,b)=>b.score-a.score).slice(0,10);
      const prevNames=myGuys.map(g=>g.name).join(',');
      const newNames=sorted.map(g=>g.name).join(',');
      if(newNames&&newNames!==prevNames&&!myGuysInitialLoad.current)setMyGuysUpdated(true);
      myGuysInitialLoad.current=false;
      setMyGuys(sorted);
    }catch(e){console.error('Failed to load my guys:',e);}
  },[user?.id,getConsensusRank]);

  // Save mock draft picks to Supabase for ADP tracking and My Guys
  const saveMockPicks=useCallback(async(picks,userTeamCount)=>{
    if(!user?.id||!picks?.length)return;
    const draftMode=userTeamCount===1?'single':userTeamCount===32?'all32':'multi';
    try{
      const rows=picks.map(pk=>({
        user_id:user.id,
        mock_id:pk.mockId,
        prospect_name:pk.prospectName,
        prospect_pos:pk.prospectPos,
        team:pk.team,
        pick_number:pk.pickNumber,
        round:pk.round,
        is_user_pick:pk.isUserPick,
        grade:pk.grade,
        draft_mode:draftMode
      }));
      for(let i=0;i<rows.length;i+=50){
        await supabase.from('mock_picks').insert(rows.slice(i,i+50));
      }
      loadMyGuys();
    }catch(e){console.error('Failed to save mock picks:',e);}
  },[user?.id,loadMyGuys]);

  useEffect(()=>{loadMyGuys();},[loadMyGuys]);

  // Share my guys as branded image — defined before conditional returns so it can be passed as prop
  const shareMyGuys=useCallback(async()=>{
    const count=myGuys.length;if(count===0)return;
    const rows=Math.ceil(count/2)||1;const scale=2;
    const fp=(()=>{
      if(myGuys.length<5)return[];const pills=[];
      const guys=myGuys.map(g=>{const p=PROSPECTS.find(pr=>pr.name===g.name);return{...g,prospect:p,gpos:p?.gpos||g.pos,school:p?.school||"",id:p?.id};});
      const posCounts={};guys.forEach(g=>{const pos=g.gpos==="K"||g.gpos==="P"||g.gpos==="LS"?"K/P":g.gpos;posCounts[pos]=(posCounts[pos]||0)+1;});
      const topPos=Object.entries(posCounts).sort((a,b)=>b[1]-a[1]);
      if(topPos.length>0&&topPos[0][1]>=Math.ceil(guys.length*0.3)){const[pos,cnt]=topPos[0];pills.push({emoji:POS_EMOJI[pos]||"📋",text:`${pos} heavy`,detail:`${cnt}/${guys.length}`,color:POS_COLORS[pos]||"#525252"});}
      else if(topPos.length>=4&&topPos[0][1]-topPos[topPos.length-1][1]<=1){pills.push({emoji:"🔀",text:"balanced board",detail:"",color:"#525252"});}
      const traitCounts={};guys.forEach(g=>{if(!g.id)return;const badges=prospectBadges[g.id]||[];badges.forEach(b=>{traitCounts[b.trait]=(traitCounts[b.trait]||0)+1;});});
      const topTraits=Object.entries(traitCounts).filter(([,c])=>c>=3).sort((a,b)=>b[1]-a[1]).slice(0,2);
      topTraits.forEach(([trait,cnt])=>{const labels={"Pass Rush":"pass rush magnet","Speed":"speed obsessed","Man Coverage":"lockdown lean","Accuracy":"accuracy snob","Motor":"motor lovers","Ball Skills":"ball hawk bias","Tackling":"sure tacklers","Vision":"vision seekers","Hands":"reliable hands","First Step":"first step fanatic","Athleticism":"athletic bias"};pills.push({emoji:TRAIT_EMOJI[trait]||"⭐",text:labels[trait]||trait.toLowerCase(),detail:`${cnt}x`,color:"#7c3aed"});});
      const ceilCounts={elite:0,high:0,normal:0,capped:0};guys.forEach(g=>{const sc=getScoutingTraits(g.name,g.school);const c=sc?.__ceiling||"normal";ceilCounts[c]++;});
      const upside=ceilCounts.elite+ceilCounts.high;
      if(upside>=Math.ceil(guys.length*0.6)){pills.push({emoji:"⭐",text:"ceiling chaser",detail:`${upside}/${guys.length} high+`,color:"#ea580c"});}
      else if(ceilCounts.capped>=Math.ceil(guys.length*0.3)){pills.push({emoji:"🔒",text:"floor first",detail:`${ceilCounts.capped} capped`,color:"#64748b"});}
      const avgDelta=guys.reduce((s,g)=>s+g.delta,0)/guys.length;
      if(avgDelta<-10){pills.push({emoji:"📈",text:"value hunter",detail:`avg ${Math.round(Math.abs(avgDelta))} picks late`,color:"#16a34a"});}
      else if(avgDelta>5){pills.push({emoji:"🎲",text:"reach drafter",detail:`avg ${Math.round(avgDelta)} picks early`,color:"#dc2626"});}
      else{pills.push({emoji:"⚖️",text:"consensus aligned",detail:`±${Math.round(Math.abs(avgDelta))}`,color:"#525252"});}
      const confCounts={};guys.forEach(g=>{const conf=SCHOOL_CONFERENCE[g.school];if(conf&&conf!=="FCS"&&conf!=="D2"&&conf!=="D3"&&conf!=="Ind")confCounts[conf]=(confCounts[conf]||0)+1;});
      const topConf=Object.entries(confCounts).sort((a,b)=>b[1]-a[1]);
      if(topConf.length>0&&topConf[0][1]>=Math.ceil(guys.length*0.5)){pills.push({emoji:"🏈",text:`${topConf[0][0]} lean`,detail:`${topConf[0][1]}/${guys.length}`,color:"#0369a1"});}
      const schoolCounts={};guys.forEach(g=>{if(g.school)schoolCounts[g.school]=(schoolCounts[g.school]||0)+1;});
      const repeats=Object.entries(schoolCounts).filter(([,c])=>c>=2).sort((a,b)=>b[1]-a[1]);
      if(repeats.length>0){const[sch,cnt]=repeats[0];pills.push({emoji:"🏫",text:`${sch} pipeline`,detail:`${cnt}`,color:"#7c3aed"});}
      const scoreAccum={ath:[],exp:[],agi:[]};const armsByPos={};const guysArms=[];
      guys.forEach(g=>{const cs=getCombineScores(g.name,g.school);if(cs){if(cs.athleticScore!=null)scoreAccum.ath.push(cs.athleticScore);if(cs.explosionScore!=null)scoreAccum.exp.push(cs.explosionScore);if(cs.agilityScore!=null)scoreAccum.agi.push(cs.agilityScore);}const cd=getCombineData(g.name,g.school);if(cd&&cd.arms){const pos=g.gpos;if(!armsByPos[pos])armsByPos[pos]=[];armsByPos[pos].push(cd.arms);guysArms.push({pos,arms:cd.arms});}});
      const eliteThresh=85,minDataRatio=0.6;
      if(scoreAccum.ath.length>=3&&scoreAccum.ath.filter(s=>s>=eliteThresh).length>=Math.ceil(scoreAccum.ath.length*minDataRatio)){pills.push({emoji:"👽",text:"athletic freaks",detail:`avg ${Math.round(scoreAccum.ath.reduce((a,b)=>a+b,0)/scoreAccum.ath.length)}`,color:"#059669"});}
      if(scoreAccum.exp.length>=3&&scoreAccum.exp.filter(s=>s>=eliteThresh).length>=Math.ceil(scoreAccum.exp.length*minDataRatio)){pills.push({emoji:"💣",text:"explosives",detail:`avg ${Math.round(scoreAccum.exp.reduce((a,b)=>a+b,0)/scoreAccum.exp.length)}`,color:"#b45309"});}
      if(scoreAccum.agi.length>=3&&scoreAccum.agi.filter(s=>s>=eliteThresh).length>=Math.ceil(scoreAccum.agi.length*minDataRatio)){pills.push({emoji:"🐇",text:"agility bias",detail:`avg ${Math.round(scoreAccum.agi.reduce((a,b)=>a+b,0)/scoreAccum.agi.length)}`,color:"#7c3aed"});}
      if(guysArms.length>=3){const allCD=PROSPECTS.map(p=>({pos:p.gpos||p.pos,cd:getCombineData(p.name,p.school)})).filter(x=>x.cd&&x.cd.arms);const posAvg={};allCD.forEach(({pos,cd})=>{if(!posAvg[pos])posAvg[pos]={sum:0,n:0};posAvg[pos].sum+=cd.arms;posAvg[pos].n++;});Object.keys(posAvg).forEach(k=>{posAvg[k]=posAvg[k].sum/posAvg[k].n;});const aboveAvg=guysArms.filter(g=>posAvg[g.pos]&&g.arms>posAvg[g.pos]).length;if(aboveAvg>=Math.ceil(guysArms.length*minDataRatio)){pills.push({emoji:"🦒",text:"long limbs",detail:`${aboveAvg}/${guysArms.length}`,color:"#0369a1"});}}
      return pills.slice(0,6);
    })();
    const fpH=fp.length>0?36:0;
    const W=1200,headerH=90,footerH=52,cardGap=14,padX=32,padTop=16;
    const colW=(W-padX*2-cardGap)/2;const cardH=260;
    const gridH=rows*cardH+(rows-1)*cardGap;
    const H=headerH+fpH+padTop+gridH+padTop+footerH;
    const canvas=document.createElement('canvas');canvas.width=W*scale;canvas.height=H*scale;
    const ctx=canvas.getContext('2d');ctx.scale(scale,scale);
    ctx.fillStyle='#faf9f6';ctx.fillRect(0,0,W,H);
    const tGrad=ctx.createLinearGradient(0,0,W,0);tGrad.addColorStop(0,'#ec4899');tGrad.addColorStop(1,'#7c3aed');
    ctx.fillStyle=tGrad;ctx.fillRect(0,0,W,4);
    ctx.textBaseline='top';ctx.textAlign='left';
    ctx.fillStyle='#171717';ctx.font=`900 32px ${font}`;
    ctx.fillText('\ud83d\udc40 my guys',padX,22);
    // Logo + wordmark top-right, vertically centered with title
    let logoImg=null;try{logoImg=new Image();logoImg.crossOrigin='anonymous';logoImg.src='/logo.png';await new Promise((res,rej)=>{logoImg.onload=res;logoImg.onerror=rej;setTimeout(rej,2000);});}catch(e){logoImg=null;}
    const logoH=36,logoW=logoImg?Math.round(logoImg.naturalWidth/logoImg.naturalHeight*logoH):0;
    ctx.font=`800 28px ${font}`;
    const wmW=ctx.measureText('big board lab').width;
    const brandTotalW=logoW+(logoW?10:0)+wmW;
    const brandX=W-padX-brandTotalW;
    const brandMidY=38;
    if(logoImg)ctx.drawImage(logoImg,brandX,brandMidY-logoH/2,logoW,logoH);
    ctx.fillStyle='#171717';ctx.font=`800 28px ${font}`;
    ctx.textBaseline='middle';
    ctx.fillText('big board lab',brandX+(logoW?logoW+10:0),brandMidY);
    ctx.textBaseline='top';
    const sGrad=ctx.createLinearGradient(padX,0,W-padX,0);sGrad.addColorStop(0,'#ec4899');sGrad.addColorStop(1,'#7c3aed');
    ctx.fillStyle=sGrad;ctx.fillRect(padX,headerH-6,W-padX*2,2);
    const rr=(x,y,w,h,r)=>{ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();};
    if(fp.length>0){
      let fpX=padX;const fpY=headerH+6;ctx.font=`11px ${sans}`;
      fp.forEach(pill=>{const label=`${pill.emoji} ${pill.text}${pill.detail?' ('+pill.detail+')':''}`;const tw=ctx.measureText(label).width+16;ctx.fillStyle=pill.color+'18';rr(fpX,fpY,tw,22,11);ctx.fill();ctx.fillStyle=pill.color;ctx.font=`bold 11px ${sans}`;ctx.textBaseline='middle';ctx.fillText(label,fpX+8,fpY+11);fpX+=tw+8;});
      ctx.textBaseline='top';ctx.textAlign='left';
    }
    const logoCache={};const prospectMap={};
    myGuys.forEach(g=>{const p=PROSPECTS.find(pr=>pr.name===g.name);if(p)prospectMap[g.name]=p;});
    const schools=[...new Set(Object.values(prospectMap).map(p=>p.school).filter(Boolean))];
    await Promise.all(schools.map(async s=>{const url=schoolLogo(s);if(!url)return;try{const img=new Image();img.crossOrigin='anonymous';img.src=url;await new Promise((res,rej)=>{img.onload=res;img.onerror=rej;setTimeout(rej,2000);});logoCache[s]=img;}catch(e){}}));
    const drawCardRadar=(cx0,cy0,rad,traitNames,values,color)=>{const n=traitNames.length;if(n<3)return;const angles=traitNames.map((_,j)=>(Math.PI*2*j/n)-Math.PI/2);const pt=(a,v)=>[cx0+rad*v*Math.cos(a),cy0+rad*v*Math.sin(a)];const rK=1.8,rCurve=v=>Math.pow(v/100,rK)*100,rFLOOR=rCurve(40);const rGridLevels=[50,60,70,80,90,100].map(lv=>Math.max(0,(rCurve(lv)-rFLOOR)/(100-rFLOOR)));rGridLevels.forEach((lv,li)=>{ctx.beginPath();angles.forEach((a,j)=>{const[px,py]=pt(a,lv);j===0?ctx.moveTo(px,py):ctx.lineTo(px,py);});ctx.closePath();ctx.strokeStyle=li===2?'#d4d4d4':'#e5e5e5';ctx.lineWidth=li===rGridLevels.length-1?0.8:0.4;ctx.stroke();});ctx.fillStyle='#a3a3a3';ctx.font=`7px ${mono}`;ctx.textAlign='center';ctx.textBaseline='middle';angles.forEach((a,j)=>{const[lx,ly]=pt(a,1.22);ctx.fillText(traitNames[j].split(' ')[0],lx,ly);});ctx.beginPath();angles.forEach((a,j)=>{const v=Math.max(0.05,values[j]||0);const[px,py]=pt(a,v);j===0?ctx.moveTo(px,py):ctx.lineTo(px,py);});ctx.closePath();ctx.fillStyle=color+'20';ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=1.2;ctx.stroke();angles.forEach((a,j)=>{const v=Math.max(0.05,values[j]||0);const[px,py]=pt(a,v);ctx.beginPath();ctx.arc(px,py,2,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();});ctx.textAlign='left';ctx.textBaseline='top';};
    const TRAIT_MAP=POSITION_TRAITS;
    for(let i=0;i<count;i++){const col=i%2,row=Math.floor(i/2);const cx0=padX+col*(colW+cardGap);const cy0=headerH+fpH+padTop+row*(cardH+cardGap);const g=myGuys[i];const p=prospectMap[g.name];const c=POS_COLORS[g.pos]||'#525252';ctx.fillStyle='#ffffff';rr(cx0,cy0,colW,cardH,14);ctx.fill();ctx.strokeStyle='#e5e5e5';ctx.lineWidth=1;rr(cx0,cy0,colW,cardH,14);ctx.stroke();const tx=cx0+16,ty=cy0+16;ctx.fillStyle='#d4d4d4';ctx.font=`bold 22px ${sans}`;ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText(String(i+1),tx,ty);const logoX=tx+30;const school=p?.school;if(school&&logoCache[school])ctx.drawImage(logoCache[school],logoX,ty-2,28,28);const nameX=logoX+34;ctx.fillStyle='#171717';ctx.font=`bold 16px ${sans}`;const maxNameW=colW-16-30-34-60;ctx.save();ctx.beginPath();ctx.rect(nameX,ty,maxNameW,30);ctx.clip();ctx.fillText(g.name,nameX,ty);ctx.restore();ctx.fillStyle='#a3a3a3';ctx.font=`10px ${mono}`;ctx.fillText(school||'',nameX,ty+20);const posText=g.pos;ctx.font=`bold 10px ${mono}`;const pw=ctx.measureText(posText).width+14;const pillX=cx0+colW-16-pw;ctx.fillStyle=c+'18';rr(pillX,ty+2,pw,20,4);ctx.fill();ctx.fillStyle=c;ctx.fillText(posText,pillX+7,ty+7);const traitPos=g.pos==='DB'?(getProspectStats(g.name)?.gpos||'CB'):g.pos==='OL'?'OT':g.pos;const traitKeys=TRAIT_MAP[traitPos]||TRAIT_MAP['QB'];const cK=1.8,cCurve=v=>Math.pow(v/100,cK)*100,cFLOOR=cCurve(40);const traitVals=traitKeys.map(t=>{const raw=tv(traits,p?.id,t,g.name,p?.school||'');return Math.max(0,(cCurve(raw)-cFLOOR)/(100-cFLOOR));});drawCardRadar(cx0+colW/2,cy0+52+70,58,traitKeys,traitVals,c);const by=cy0+cardH-40;ctx.fillStyle='#f5f5f5';ctx.fillRect(cx0+16,by-6,colW-32,1);const grade=p?getGrade(p.id):null;if(grade){ctx.font=`bold 24px ${sans}`;ctx.fillStyle=grade>=75?'#16a34a':grade>=55?'#ca8a04':'#dc2626';ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText(String(grade),cx0+16,by);}const badges=p?prospectBadges[p.id]||[]:[];if(badges.length>0){ctx.font=`14px ${sans}`;ctx.textAlign='right';ctx.textBaseline='top';ctx.fillText(badges.map(b=>b.emoji).join(' '),cx0+colW-16,by+4);}ctx.textAlign='left';ctx.textBaseline='top';}
    const fy=H-footerH;
    ctx.fillStyle='#e5e5e5';ctx.fillRect(padX,fy,W-padX*2,1);
    ctx.textBaseline='middle';ctx.textAlign='center';
    ctx.fillStyle='#a3a3a3';ctx.font=`13px ${mono}`;
    ctx.fillText('draft smarter at bigboardlab.com',W/2,fy+footerH/2);
    ctx.textAlign='left';ctx.textBaseline='top';
    canvas.toBlob(async blob=>{if(!blob)return;const fname='bigboardlab-my-guys.png';const isMobile=/iPhone|iPad|iPod|Android/i.test(navigator.userAgent);if(isMobile&&navigator.share&&navigator.canShare){try{const file=new File([blob],fname,{type:'image/png'});if(navigator.canShare({files:[file]})){await navigator.share({files:[file],title:'My Guys \u2014 Big Board Lab',text:'My 2026 NFL Draft guys! Build yours at bigboardlab.com'});return;}}catch(e){}}try{await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);setCopiedShare("my-guys");setTimeout(()=>setCopiedShare(null),1500);}catch(e){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=fname;document.body.appendChild(a);a.click();document.body.removeChild(a);setTimeout(()=>URL.revokeObjectURL(url),3000);}trackEvent(user?.id,'share_triggered',{type:'my_guys',count:myGuys.length,guest:!user});},'image/png');
  },[myGuys,traits,getGrade,prospectBadges]);

  // Share top 10 (overall or position-specific) as branded image — matches My Guys layout
  const sharePositionTop10=useCallback(async(pos)=>{
    const singlePos=pos||null;
    const top10=(singlePos?board.filter(p=>(p.gpos||p.pos)===singlePos):board).slice(0,10);
    if(top10.length===0)return;

    const scale=2;
    const W=1200,padX=32,cardGap=14,padTop=16,headerH=90,footerH=52;
    const colW=(W-padX*2-cardGap)/2;const cardH=260;
    const rows=Math.ceil(top10.length/2)||1;
    const gridH=rows*cardH+(rows-1)*cardGap;
    const H=headerH+padTop+gridH+padTop+footerH;
    const canvas=document.createElement('canvas');canvas.width=W*scale;canvas.height=H*scale;
    const ctx=canvas.getContext('2d');ctx.scale(scale,scale);

    const rr=(x,y,w,h,r)=>{ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();};

    ctx.fillStyle='#faf9f6';ctx.fillRect(0,0,W,H);

    // Gradient top bar
    const tGrad=ctx.createLinearGradient(0,0,W,0);tGrad.addColorStop(0,'#ec4899');tGrad.addColorStop(1,'#7c3aed');
    ctx.fillStyle=tGrad;ctx.fillRect(0,0,W,4);

    // Title — left
    ctx.textBaseline='top';ctx.textAlign='left';
    ctx.fillStyle='#171717';ctx.font=`900 32px ${font}`;
    const title=singlePos?`\u{1f4cb} my top 10 ${singlePos.toLowerCase()}s`:'\u{1f4cb} my big board';
    ctx.fillText(title,padX,22);

    // Logo + wordmark — top-right
    let logoImg=null;try{logoImg=new Image();logoImg.crossOrigin='anonymous';logoImg.src='/logo.png';await new Promise((res,rej)=>{logoImg.onload=res;logoImg.onerror=rej;setTimeout(rej,2000);});}catch(e){logoImg=null;}
    const logoH=36,logoW=logoImg?Math.round(logoImg.naturalWidth/logoImg.naturalHeight*logoH):0;
    ctx.font=`800 28px ${font}`;
    const wmW=ctx.measureText('big board lab').width;
    const brandTotalW=logoW+(logoW?10:0)+wmW;
    const brandX=W-padX-brandTotalW;
    const brandMidY=38;
    if(logoImg)ctx.drawImage(logoImg,brandX,brandMidY-logoH/2,logoW,logoH);
    ctx.fillStyle='#171717';ctx.font=`800 28px ${font}`;ctx.textBaseline='middle';
    ctx.fillText('big board lab',brandX+(logoW?logoW+10:0),brandMidY);
    ctx.textBaseline='top';

    // Gradient separator
    const sGrad=ctx.createLinearGradient(padX,0,W-padX,0);sGrad.addColorStop(0,'#ec4899');sGrad.addColorStop(1,'#7c3aed');
    ctx.fillStyle=sGrad;ctx.fillRect(padX,headerH-6,W-padX*2,2);

    // Load school logos
    const logoCache={};
    const schools=[...new Set(top10.map(p=>p.school))];
    await Promise.all(schools.map(async s=>{const url=schoolLogo(s);if(!url)return;try{const img=new Image();img.crossOrigin='anonymous';img.src=url;await new Promise((res,rej)=>{img.onload=res;img.onerror=rej;setTimeout(rej,2000);});logoCache[s]=img;}catch(e){}}));

    // Radar chart helper
    const drawCardRadar=(cx0,cy0,rad,traitNames,values,color)=>{const n=traitNames.length;if(n<3)return;const angles=traitNames.map((_,j)=>(Math.PI*2*j/n)-Math.PI/2);const pt=(a,v)=>[cx0+rad*v*Math.cos(a),cy0+rad*v*Math.sin(a)];const rK=1.8,rCurve=v=>Math.pow(v/100,rK)*100,rFLOOR=rCurve(40);const rGridLevels=[50,60,70,80,90,100].map(lv=>Math.max(0,(rCurve(lv)-rFLOOR)/(100-rFLOOR)));rGridLevels.forEach((lv,li)=>{ctx.beginPath();angles.forEach((a,j)=>{const[px,py]=pt(a,lv);j===0?ctx.moveTo(px,py):ctx.lineTo(px,py);});ctx.closePath();ctx.strokeStyle=li===2?'#d4d4d4':'#e5e5e5';ctx.lineWidth=li===rGridLevels.length-1?0.8:0.4;ctx.stroke();});ctx.fillStyle='#a3a3a3';ctx.font=`7px ${mono}`;ctx.textAlign='center';ctx.textBaseline='middle';angles.forEach((a,j)=>{const[lx,ly]=pt(a,1.22);ctx.fillText(traitNames[j].split(' ')[0],lx,ly);});ctx.beginPath();angles.forEach((a,j)=>{const v=Math.max(0.05,values[j]||0);const[px,py]=pt(a,v);j===0?ctx.moveTo(px,py):ctx.lineTo(px,py);});ctx.closePath();ctx.fillStyle=color+'20';ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=1.2;ctx.stroke();angles.forEach((a,j)=>{const v=Math.max(0.05,values[j]||0);const[px,py]=pt(a,v);ctx.beginPath();ctx.arc(px,py,2,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();});ctx.textAlign='left';ctx.textBaseline='top';};

    // Cards — 2-column grid matching My Guys
    for(let i=0;i<top10.length;i++){
      const col=i%2,row=Math.floor(i/2);
      const cx0=padX+col*(colW+cardGap);
      const cy0=headerH+padTop+row*(cardH+cardGap);
      const p=top10[i];
      const grade=getGrade(p.id);
      const posKey=(p.gpos||p.pos)==='K'||(p.gpos||p.pos)==='P'||(p.gpos||p.pos)==='LS'?'K/P':(p.gpos||p.pos);
      const c=POS_COLORS[posKey]||POS_COLORS[p.pos]||'#525252';
      const posTraits=POSITION_TRAITS[p.pos]||POSITION_TRAITS[posKey]||[];
      const cK=1.8,cCurve=v=>Math.pow(v/100,cK)*100,cFLOOR=cCurve(40);
      const traitVals=posTraits.map(t=>{const raw=tv(traits,p.id,t,p.name,p.school);return Math.max(0,(cCurve(raw)-cFLOOR)/(100-cFLOOR));});

      // Card bg
      ctx.fillStyle='#ffffff';rr(cx0,cy0,colW,cardH,14);ctx.fill();
      ctx.strokeStyle='#e5e5e5';ctx.lineWidth=1;rr(cx0,cy0,colW,cardH,14);ctx.stroke();

      const tx=cx0+16,ty=cy0+16;

      // Rank number
      ctx.fillStyle='#d4d4d4';ctx.font=`bold 22px ${sans}`;ctx.textAlign='left';ctx.textBaseline='top';
      ctx.fillText(String(i+1),tx,ty);

      // School logo
      const logoX=tx+30;
      if(p.school&&logoCache[p.school])ctx.drawImage(logoCache[p.school],logoX,ty-2,28,28);

      // Player name
      const nameX=logoX+34;
      ctx.fillStyle='#171717';ctx.font=`bold 16px ${sans}`;
      const maxNameW=colW-16-30-34-60;
      ctx.save();ctx.beginPath();ctx.rect(nameX,ty,maxNameW,30);ctx.clip();
      ctx.fillText(p.name,nameX,ty);ctx.restore();

      // School text
      ctx.fillStyle='#a3a3a3';ctx.font=`10px ${mono}`;
      ctx.fillText(p.school||'',nameX,ty+20);

      // Position pill
      const posText=p.gpos||p.pos;
      ctx.font=`bold 10px ${mono}`;
      const pw=ctx.measureText(posText).width+14;
      const pillX=cx0+colW-16-pw;
      ctx.fillStyle=c+'18';rr(pillX,ty+2,pw,20,4);ctx.fill();
      ctx.fillStyle=c;ctx.fillText(posText,pillX+7,ty+7);

      // Radar chart
      drawCardRadar(cx0+colW/2,cy0+52+70,58,posTraits,traitVals,c);

      // Bottom divider + grade + badges
      const by=cy0+cardH-40;
      ctx.fillStyle='#f5f5f5';ctx.fillRect(cx0+16,by-6,colW-32,1);
      if(grade){ctx.font=`bold 24px ${sans}`;ctx.fillStyle=grade>=75?'#16a34a':grade>=55?'#ca8a04':'#dc2626';ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText(String(grade),cx0+16,by);}
      const badges=prospectBadges[p.id]||[];
      if(badges.length>0){ctx.font=`14px ${sans}`;ctx.textAlign='right';ctx.textBaseline='top';ctx.fillText(badges.map(b=>b.emoji).join(' '),cx0+colW-16,by+4);}
      ctx.textAlign='left';ctx.textBaseline='top';
    }

    // Footer — centered CTA
    const fy=H-footerH;
    ctx.fillStyle='#e5e5e5';ctx.fillRect(padX,fy,W-padX*2,1);
    ctx.textBaseline='middle';ctx.textAlign='center';
    ctx.fillStyle='#a3a3a3';ctx.font=`13px ${mono}`;
    ctx.fillText('draft smarter at bigboardlab.com',W/2,fy+footerH/2);
    ctx.textAlign='left';ctx.textBaseline='top';

    canvas.toBlob(async blob=>{
      if(!blob)return;
      const fname=singlePos?`bigboardlab-top10-${singlePos}.png`:'bigboardlab-top10.png';
      const isMobile=/iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if(isMobile&&navigator.share&&navigator.canShare){
        try{const file=new File([blob],fname,{type:'image/png'});if(navigator.canShare({files:[file]})){await navigator.share({files:[file],title:'My Big Board — Big Board Lab',text:'My 2026 NFL Draft Big Board! Build yours at bigboardlab.com'});return;}}catch(e){}
      }
      try{await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);
        setCopiedShare("top10");setTimeout(()=>setCopiedShare(null),1500);
      }catch(e){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=fname;a.click();URL.revokeObjectURL(url);}
      trackEvent(user?.id,'share_triggered',{type:singlePos?'position_top10':'board_top10',position:singlePos||'all',guest:!user});
    });
  },[board,getGrade,traits,prospectBadges]);

  if(phase==="loading")return(<div style={{minHeight:"100vh",background:"#faf9f6",display:"flex",alignItems:"center",justifyContent:"center"}}><img src="/logo.png" alt="" style={{height:48,animation:"pulse 1.5s ease-in-out infinite"}}/><style>{`@keyframes pulse{0%,100%{opacity:.3;transform:scale(.95)}50%{opacity:1;transform:scale(1)}}`}</style></div>);



  if(showRound1Prediction){return<><SaveBar {...saveBarProps}/><Round1Prediction board={mockDraftBoard} PROSPECTS={PROSPECTS} POS_COLORS={POS_COLORS} NFLTeamLogo={NFLTeamLogo} SchoolLogo={SchoolLogo} font={font} mono={mono} sans={sans} onClose={()=>{navigate('/');}} onResults={setR1PredictionSlots} trackEvent={trackEvent} userId={user?.id} getGrade={getGrade} schemeFits={schemeFits}/></>;}

  if(showMockDraft){const myBoard=[...PROSPECTS].sort((a,b)=>{const gA=(a.gpos==="K"||a.gpos==="P"||a.gpos==="LS")?"K/P":(a.gpos||a.pos);const gB=(b.gpos==="K"||b.gpos==="P"||b.gpos==="LS")?"K/P":(b.gpos||b.pos);const aRanked=rankedGroups.has(gA)||(traits[a.id]&&Object.keys(traits[a.id]).length>0);const bRanked=rankedGroups.has(gB)||(traits[b.id]&&Object.keys(traits[b.id]).length>0);if(aRanked&&!bRanked)return-1;if(!aRanked&&bRanked)return 1;if(aRanked&&bRanked){const d=getGrade(b.id)-getGrade(a.id);return d!==0?d:(ratings[b.id]||1500)-(ratings[a.id]||1500);}return getConsensusRank(a.name)-getConsensusRank(b.name);});return<MockDraftSim board={mockDraftBoard} myBoard={myBoard} getGrade={getGrade} teamNeeds={TEAM_NEEDS_SIMPLE} onClose={()=>{setShowMockDraft(false);setMockLaunchTeam(null);navigate('/');}} onMockComplete={saveMockPicks} myGuys={myGuys} myGuysUpdated={myGuysUpdated} setMyGuysUpdated={setMyGuysUpdated} mockCount={mockCount} allProspects={PROSPECTS} PROSPECTS={PROSPECTS} CONSENSUS={CONSENSUS} ratings={ratings} traits={traits} setTraits={setTraits} notes={notes} setNotes={setNotes} POS_COLORS={POS_COLORS} POSITION_TRAITS={POSITION_TRAITS} SchoolLogo={SchoolLogo} NFLTeamLogo={NFLTeamLogo} RadarChart={RadarChart} PlayerProfile={PlayerProfile} font={font} mono={mono} sans={sans} schoolLogo={schoolLogo} getConsensusRank={getConsensusRank} getConsensusGrade={getConsensusGrade} getConsensusRound={getConsensusRound} rankedGroups={rankedGroups} mockLaunchTeam={mockLaunchTeam} mockLaunchRounds={mockRounds} mockLaunchSpeed={mockSpeed} mockLaunchCpuTrades={mockCpuTrades} mockLaunchBoardMode={mockBoardMode} onRankPosition={(pos)=>{setShowMockDraft(false);setMockLaunchTeam(null);navigate('/rank/'+posToSlug(pos));}} isGuest={isGuest} onRequireAuth={onRequireAuth} trackEvent={trackEvent} userId={user?.id} isGuestUser={!user} traitThresholds={traitThresholds} qualifiesForFilter={qualifiesForFilter} prospectBadges={prospectBadges} TRAIT_ABBREV={TRAIT_ABBREV} TRAIT_EMOJI={TRAIT_EMOJI} SCHOOL_CONFERENCE={SCHOOL_CONFERENCE} POS_EMOJI={POS_EMOJI} onShareMyGuys={shareMyGuys} copiedShare={copiedShare} measurableThresholds={measurableThresholds} qualifiesForMeasurableFilter={qualifiesForMeasurableFilter} MEASURABLE_EMOJI={MEASURABLE_EMOJI} MEASURABLE_SHORT={MEASURABLE_SHORT} MEASURABLE_LIST={MEASURABLE_LIST} MEASURABLE_DRILLS={MEASURABLE_DRILLS} MEASURABLE_KEY={MEASURABLE_KEY} MEASURABLE_RAW={MEASURABLE_RAW} MEAS_GROUPS={MEAS_GROUPS} getMeasRadarData={getMeasRadarData} schemeFits={schemeFits} generateScoutReasoning={generateScoutReasoning} computeTeamScoutVision={computeTeamScoutVision}/>;}
  // === TEAM MOCK TRENDS PAGE ===
  if(showTrends){
    const switchTeam=(t)=>{setTrendsTeam(t);setShowTier3Needs(false);setExpandedNeeds(new Set());setSchemeFitPos("ALL");setSchemeFitExpanded(false);setTrendsProspectTab("scheme");setExpandedSchemeFitId(null);setSchemeFitInfo(false);window.history.replaceState({},'',`/trends?team=${encodeURIComponent(t)}`);loadTrendsData(t);};
    const totalMocks=trendsData?.total_mocks||0;
    const totalUsers=trendsData?.total_users||0;
    const prospects=trendsData?.prospects||[];
    const positions=trendsData?.positions||[];
    const totalPosPicks=positions.reduce((s,p)=>s+Number(p.pos_count),0);
    return(<div style={{position:"fixed",inset:0,background:"#faf9f6",zIndex:9000,overflow:"auto",WebkitOverflowScrolling:"touch"}}>
      <SaveBar {...saveBarProps}/>
      <div style={{maxWidth:960,margin:"0 auto",padding:"52px 16px 80px"}}>
        <style>{`@media(max-width:700px){.trends-grid{flex-direction:column!important;align-items:stretch!important;}}`}</style>
        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <h1 style={{fontFamily:font,fontSize:20,fontWeight:900,color:"#171717",margin:0}}>team insights</h1>
        </div>

        {/* Team switcher */}
        <div className="trait-pills-scroll" style={{display:"flex",gap:6,overflowX:"auto",WebkitOverflowScrolling:"touch",paddingBottom:12,scrollbarWidth:"none",marginBottom:16}}>
          {allTeams.sort().map(t=>{const sel=t===trendsTeam;const tc=NFL_TEAM_COLORS[t]||"#171717";return<button key={t} onClick={()=>switchTeam(t)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"6px 10px",background:sel?`${tc}15`:"transparent",border:sel?`2px solid ${tc}`:"2px solid transparent",borderRadius:10,cursor:"pointer",flexShrink:0,transition:"all 0.15s"}}><NFLTeamLogo team={t} size={28}/><span style={{fontFamily:mono,fontSize:8,color:sel?tc:"#a3a3a3",fontWeight:sel?700:500}}>{NFL_TEAM_ABR[t]}</span></button>;})}
        </div>

        {/* Loading state */}
        {trendsLoading&&<div style={{textAlign:"center",padding:"60px 24px"}}><div style={{fontFamily:sans,fontSize:14,color:"#a3a3a3"}}>loading trends...</div></div>}

        {/* Empty state */}
        {!trendsLoading&&totalMocks===0&&<div style={{textAlign:"center",padding:"60px 24px"}}>
          <div style={{fontSize:48,marginBottom:16}}>📊</div>
          <h3 style={{fontFamily:font,fontSize:20,fontWeight:900,color:"#171717",margin:"0 0 8px"}}>not enough data yet</h3>
          <p style={{fontFamily:sans,fontSize:14,color:"#737373",margin:"0 0 20px",lineHeight:1.5}}>draft as the {trendsTeam} to contribute!</p>
          <button onClick={()=>{closeTrends();setMockTeamSet(new Set([trendsTeam]));setMockTeamPicker(trendsTeam);}} style={{fontFamily:sans,fontSize:14,fontWeight:700,padding:"12px 28px",background:"linear-gradient(135deg,#ec4899,#7c3aed)",color:"#fff",border:"none",borderRadius:99,cursor:"pointer"}}>mock draft as {trendsTeam} →</button>
        </div>}

        {/* Data loaded */}
        {!trendsLoading&&totalMocks>0&&(()=>{
          // Community draft fingerprint — derived from aggregated picks
          const trendsPills=(()=>{
            if(prospects.length<3)return[];
            const pills=[];
            const guys=prospects.map(p=>{const pr=PROSPECTS.find(x=>x.name===p.prospect_name);return{...p,prospect:pr,gpos:pr?.gpos||p.prospect_pos,school:pr?.school||"",id:pr?.id};});

            // Position concentration
            const posCounts={};
            guys.forEach(g=>{const pos=g.gpos==="K"||g.gpos==="P"||g.gpos==="LS"?"K/P":g.gpos;posCounts[pos]=(posCounts[pos]||0)+1;});
            const topPos=Object.entries(posCounts).sort((a,b)=>b[1]-a[1]);
            if(topPos.length>0&&topPos[0][1]>=Math.ceil(guys.length*0.3)){
              const[pos,cnt]=topPos[0];
              pills.push({emoji:POS_EMOJI[pos]||"📋",text:`${pos} heavy`,detail:`${cnt}/${guys.length}`,color:POS_COLORS[pos]||"#525252"});
            }else if(topPos.length>=4&&topPos[0][1]-topPos[topPos.length-1][1]<=1){
              pills.push({emoji:"🔀",text:"balanced draft",detail:"",color:"#525252"});
            }

            // Trait clusters
            const traitCounts={};
            guys.forEach(g=>{if(!g.id)return;const badges=prospectBadges[g.id]||[];badges.forEach(b=>{traitCounts[b.trait]=(traitCounts[b.trait]||0)+1;});});
            const topTraits=Object.entries(traitCounts).filter(([,c])=>c>=2).sort((a,b)=>b[1]-a[1]).slice(0,2);
            const traitLabels={"Pass Rush":"pass rush magnet","Speed":"speed obsessed","Man Coverage":"lockdown lean","Accuracy":"accuracy snob","Motor":"motor lovers","Ball Skills":"ball hawk bias","Tackling":"sure tacklers","Vision":"vision seekers","Hands":"reliable hands","First Step":"first step fanatic","Athleticism":"athletic bias"};
            topTraits.forEach(([trait,cnt])=>{pills.push({emoji:TRAIT_EMOJI[trait]||"⭐",text:traitLabels[trait]||trait.toLowerCase(),detail:`${cnt}x`,color:"#7c3aed"});});

            // Ceiling tendency
            const ceilCounts={elite:0,high:0,normal:0,capped:0};
            guys.forEach(g=>{const sc=getScoutingTraits(g.prospect_name||g.prospect?.name,g.school);const c=sc?.__ceiling||"normal";ceilCounts[c]++;});
            const upside=ceilCounts.elite+ceilCounts.high;
            if(upside>=Math.ceil(guys.length*0.5)){
              pills.push({emoji:"⭐",text:"ceiling chaser",detail:`${upside}/${guys.length} high+`,color:"#ea580c"});
            }else if(ceilCounts.capped>=Math.ceil(guys.length*0.3)){
              pills.push({emoji:"🔒",text:"floor first",detail:`${ceilCounts.capped} capped`,color:"#64748b"});
            }

            // Conference lean
            const confCounts={};
            guys.forEach(g=>{const conf=SCHOOL_CONFERENCE[g.school];if(conf&&conf!=="FCS"&&conf!=="D2"&&conf!=="D3"&&conf!=="Ind")confCounts[conf]=(confCounts[conf]||0)+1;});
            const topConf=Object.entries(confCounts).sort((a,b)=>b[1]-a[1]);
            if(topConf.length>0&&topConf[0][1]>=Math.ceil(guys.length*0.4)){
              pills.push({emoji:"🏈",text:`${topConf[0][0]} lean`,detail:`${topConf[0][1]}/${guys.length}`,color:"#0369a1"});
            }

            // Athletic testing
            const scoreAccum={ath:[],exp:[],agi:[]};
            guys.forEach(g=>{const cs=getCombineScores(g.prospect_name||g.prospect?.name,g.school);if(cs){if(cs.athleticScore!=null)scoreAccum.ath.push(cs.athleticScore);if(cs.explosionScore!=null)scoreAccum.exp.push(cs.explosionScore);if(cs.agilityScore!=null)scoreAccum.agi.push(cs.agilityScore);}});
            if(scoreAccum.ath.length>=3&&scoreAccum.ath.filter(s=>s>=85).length>=Math.ceil(scoreAccum.ath.length*0.5)){
              pills.push({emoji:"👽",text:"athletic freaks",detail:`avg ${Math.round(scoreAccum.ath.reduce((a,b)=>a+b,0)/scoreAccum.ath.length)}`,color:"#059669"});
            }

            // School repeats
            const schoolCounts={};
            guys.forEach(g=>{if(g.school)schoolCounts[g.school]=(schoolCounts[g.school]||0)+1;});
            const repeats=Object.entries(schoolCounts).filter(([,c])=>c>=2).sort((a,b)=>b[1]-a[1]);
            if(repeats.length>0){const[sch,cnt]=repeats[0];pills.push({emoji:"🏫",text:`${sch} pipeline`,detail:`${cnt}`,color:"#7c3aed"});}

            return pills.slice(0,6);
          })();

          return<>
          {/* Team header */}
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:trendsPills.length>0?12:20}}>
            <NFLTeamLogo team={trendsTeam} size={40}/>
            <div>
              <h2 style={{fontFamily:font,fontSize:24,fontWeight:900,color:"#171717",margin:0}}>{trendsTeam}</h2>
              <p style={{fontFamily:mono,fontSize:11,color:"#a3a3a3",margin:0}}>community draft tendencies</p>
            </div>
          </div>

          {/* Community draft fingerprint */}
          {trendsPills.length>0&&<div style={{marginBottom:20}}>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {trendsPills.map((pill,i)=><span key={i} style={{fontFamily:sans,fontSize:11,fontWeight:600,color:pill.color,background:`${pill.color}0d`,border:`1px solid ${pill.color}22`,padding:"4px 10px",borderRadius:99,display:"inline-flex",alignItems:"center",gap:4,whiteSpace:"nowrap"}}>
                <span>{pill.emoji}</span>
                <span>{pill.text}</span>
                {pill.detail&&<span style={{fontFamily:mono,fontSize:9,opacity:0.7}}>({pill.detail})</span>}
              </span>)}
            </div>
          </div>}

          {/* Team Needs — full width */}
          {(()=>{const richData=TEAM_NEEDS_RICH[trendsTeam];const rosterAbbr=TEAM_ABBR[trendsTeam];const roster=NFL_ROSTERS[rosterAbbr];const accent=NFL_TEAM_COLORS[trendsTeam]||"#6366f1";const hasNeeds=richData&&richData.needs;const hasRoster=!!roster;

          const urgencyDot={critical:"#dc2626",important:"#f59e0b",moderate:"#a3a3a3"};
          const renderNeed=(n,i)=>{const c=POS_COLORS[n.position]||POS_COLORS[n.position==="IDL"?"DL":n.position]||"#525252";const nk=`${trendsTeam}-${n.position}-${i}`;const isExp=expandedNeeds.has(nk);return<div key={nk} style={{padding:"7px 0",borderBottom:"1px solid #f5f5f5"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontFamily:mono,fontSize:9,fontWeight:700,color:c,background:`${c}11`,padding:"2px 6px",borderRadius:4,border:`1px solid ${c}22`}}>{n.position}</span>
              <span style={{width:7,height:7,borderRadius:4,background:urgencyDot[n.urgency]||"#a3a3a3",flexShrink:0}} title={n.urgency}/>
              <span onClick={()=>{const next=new Set(expandedNeeds);if(isExp)next.delete(nk);else next.add(nk);setExpandedNeeds(next);}} style={{fontFamily:sans,fontSize:12,color:"#525252",flex:1,cursor:"pointer",overflow:"hidden",textOverflow:isExp?"unset":"ellipsis",whiteSpace:isExp?"normal":"nowrap"}}>{n.explanation}</span>
            </div>
            {n.current_starter&&<div style={{fontFamily:mono,fontSize:10,color:"#a3a3a3",marginTop:3,marginLeft:52}}>{n.current_starter}</div>}
          </div>;};

          const needsCard=hasNeeds&&(()=>{const needs=richData.needs;const tier1=needs.filter(n=>n.tier===1);const tier2=needs.filter(n=>n.tier===2);const tier3=needs.filter(n=>n.tier===3);return<div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"16px 20px",marginBottom:16}}>
            <div style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:12}}>team needs</div>
            {tier1.length>0&&<><div style={{fontFamily:mono,fontSize:8,letterSpacing:1.5,color:"#dc2626",textTransform:"uppercase",marginBottom:6,marginTop:4}}>tier 1 — critical</div>{tier1.map(renderNeed)}</>}
            {tier2.length>0&&<><div style={{fontFamily:mono,fontSize:8,letterSpacing:1.5,color:"#f59e0b",textTransform:"uppercase",marginBottom:6,marginTop:12}}>tier 2 — important</div>{tier2.map(renderNeed)}</>}
            {tier3.length>0&&<>{!showTier3Needs?<button onClick={()=>setShowTier3Needs(true)} style={{fontFamily:sans,fontSize:11,color:"#a3a3a3",background:"transparent",border:"1px solid #e5e5e5",borderRadius:99,padding:"4px 12px",cursor:"pointer",marginTop:12}}>show depth needs ({tier3.length})</button>:<><div style={{fontFamily:mono,fontSize:8,letterSpacing:1.5,color:"#a3a3a3",textTransform:"uppercase",marginBottom:6,marginTop:12}}>tier 3 — depth</div>{tier3.map(renderNeed)}</>}</>}
            {richData.roster_context&&<div style={{fontFamily:sans,fontSize:11,color:"#737373",lineHeight:1.5,marginTop:12,padding:"10px 12px",background:"#fafafa",borderRadius:8,border:"1px solid #f0f0f0"}}>{richData.roster_context}</div>}
          </div>;})();

          const faData=TEAM_FREE_AGENCY[trendsTeam];const faAdditions=faData?.key_additions||[];const faLosses=faData?.key_losses||[];const hasFa=faAdditions.length>0||faLosses.length>0;
          const renderFaEntry=(entry,i,prefix)=>{const c=POS_COLORS[entry.position]||POS_COLORS[entry.position==="IDL"?"DL":entry.position]||"#525252";const fk=`fa-${prefix}-${trendsTeam}-${i}`;const isExp=expandedNeeds.has(fk);return<div key={fk} style={{padding:"7px 0",borderBottom:"1px solid #f5f5f5"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontFamily:mono,fontSize:9,fontWeight:700,color:c,background:`${c}11`,padding:"2px 6px",borderRadius:4,border:`1px solid ${c}22`}}>{entry.position}</span>
              <span style={{fontFamily:sans,fontSize:12,fontWeight:700,color:"#171717"}}>{entry.player}</span>
              <span style={{fontFamily:mono,fontSize:10,color:"#737373",marginLeft:"auto",flexShrink:0}}>{entry.contract_summary}</span>
            </div>
            <div style={{fontFamily:sans,fontSize:11,color:"#a3a3a3",marginTop:2,marginLeft:52}}>{entry.previous_team||entry.new_team}</div>
            {entry.headline&&<div onClick={()=>{const next=new Set(expandedNeeds);if(isExp)next.delete(fk);else next.add(fk);setExpandedNeeds(next);}} style={{fontFamily:sans,fontSize:11,color:"#525252",marginTop:3,marginLeft:52,cursor:"pointer",overflow:"hidden",textOverflow:isExp?"unset":"ellipsis",whiteSpace:isExp?"normal":"nowrap"}}>{entry.headline}</div>}
          </div>;};
          const faCard=hasFa&&<div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"16px 20px",marginBottom:16}}>
            <div style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:12}}>free agency</div>
            {faAdditions.length>0&&<><div style={{fontFamily:mono,fontSize:8,letterSpacing:1.5,color:"#16a34a",textTransform:"uppercase",marginBottom:6,marginTop:4}}>key additions</div>{faAdditions.map((e,i)=>renderFaEntry(e,i,"add"))}</>}
            {faLosses.length>0&&<><div style={{fontFamily:mono,fontSize:8,letterSpacing:1.5,color:"#dc2626",textTransform:"uppercase",marginBottom:6,marginTop:faAdditions.length>0?12:4}}>key departures</div>{faLosses.map((e,i)=>renderFaEntry(e,i,"loss"))}</>}
          </div>;

          const depthCard=hasRoster&&(()=>{const groups=getSchemeDepthGroups(trendsTeam);const scheme=TEAM_SCHEME[trendsTeam];const schemeLabel=scheme?({34:"3-4",43:"4-3","425":"4-2-5 Nickel",w9:"Wide-9 4-2-5"}[scheme.def]||""):"";return<div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"16px 20px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase"}}>current roster</div>
              {schemeLabel&&<span style={{fontFamily:mono,fontSize:9,color:accent,background:`${accent}11`,padding:"2px 8px",borderRadius:4,border:`1px solid ${accent}22`}}>{schemeLabel}</span>}
            </div>
            {/* Formation SVG */}
            <svg viewBox="-2 -2 104 109" style={{width:"100%",maxWidth:360,margin:"0 auto",display:"block"}}>
              {[20,40,58,75,90].map(y=><line key={y} x1="2" y1={y} x2="98" y2={y} stroke="rgba(0,0,0,0.04)" strokeWidth="0.3"/>)}
              <line x1="2" y1="58" x2="98" y2="58" stroke={accent+"44"} strokeWidth="0.5" strokeDasharray="2,1.5"/>
              {Object.entries(getFormationPos(trendsTeam)).map(([slot,pos])=>{const name=roster[slot];if(!name&&pos.schemeOnly)return null;if(pos.altFor&&roster[pos.altFor])return null;const filled=!!name;const isFa=filled&&(FA_FLAGS[rosterAbbr]||[]).includes(name);const rvBySlot=ROSTER_BY_SLOT[trendsTeam]?.[slot];const rvByName=filled&&!rvBySlot?Object.values(ROSTER_BY_SLOT[trendsTeam]||{}).find(r=>r.name===name):null;const rv=rvBySlot||rvByName;const dotColor=rv?TIER_COLORS[rv.performanceTier]||"#a8a29e":filled?"#a8a29e":"#d4d4d4";return<g key={slot}>
                {isFa&&<circle cx={pos.x} cy={pos.y} r={3.2} fill="none" stroke="#f97316" strokeWidth="0.4"/>}
                <circle cx={pos.x} cy={pos.y} r={filled?2.4:1.6} fill={dotColor} stroke={filled?dotColor:"#a3a3a3"} strokeWidth="0.2"/>
                <text x={pos.x} y={pos.y-3} textAnchor="middle" fill="#a3a3a3" fontSize="1.8" fontFamily={mono}>{pos.label||slot.replace(/\d$/,'')}</text>
                {filled&&<text x={pos.x} y={pos.y+4.5} textAnchor="middle" fill="#525252" fontSize="1.8" fontFamily={sans}>{shortName(name)}</text>}
              </g>;})}
            </svg>
            {/* Depth list below formation */}
            <div style={{marginTop:8}}>
              {groups.map((group,gi)=>{const entries=group.slots.map(s=>({slot:s,name:roster[s]})).filter(x=>x.name);if(!entries.length)return null;return<div key={group.label} style={{marginBottom:6,...(gi>0?{paddingTop:5,borderTop:"1px solid #f5f5f5"}:{})}}>
                {entries.map(({slot,name})=>{const rv=ROSTER_BY_NAME[name]||ROSTER_BY_SLOT[trendsTeam]?.[slot];const dk=`depth-${trendsTeam}-${slot}`;const isExp=expandedNeeds.has(dk);const tc=rv?TIER_COLORS[rv.performanceTier]:null;return<div key={slot}>
                  <div onClick={rv?()=>{const next=new Set(expandedNeeds);if(isExp)next.delete(dk);else next.add(dk);setExpandedNeeds(next);}:undefined} style={{fontFamily:sans,fontSize:11,padding:"2px 0",display:"flex",alignItems:"center",gap:6,cursor:rv?"pointer":"default"}}>
                    <span style={{fontFamily:mono,color:"#d4d4d4",width:28,fontSize:9,flexShrink:0,textAlign:"right"}}>{group.slotLabels?.[slot]||slot}</span>
                    <span style={{color:"#525252"}}>{name}</span>
                    {tc&&<span style={{width:6,height:6,borderRadius:3,background:tc,flexShrink:0}} title={rv.performanceTier}/>}
                    {rv&&<span style={{fontFamily:mono,fontSize:9,color:"#a3a3a3",flexShrink:0}}>{formatContract(rv)}</span>}
                    {(FA_FLAGS[rosterAbbr]||[]).includes(name)&&<span style={{fontFamily:mono,fontSize:8,fontWeight:700,color:"#f97316",background:"rgba(249,115,22,0.08)",padding:"2px 6px",borderRadius:99}}>FA</span>}
                  </div>
                  {isExp&&rv&&<div style={{marginLeft:34,padding:"4px 0 6px",fontSize:11}}>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:3}}>
                      <span style={{fontFamily:mono,fontSize:8,fontWeight:700,color:tc,background:tc+"11",padding:"1px 6px",borderRadius:3,border:`1px solid ${tc}22`}}>{rv.performanceTier.replace(/_/g," ")}</span>
                      {AVAILABILITY_DISPLAY[rv.availability]&&<span style={{fontFamily:mono,fontSize:8,fontWeight:700,color:AVAILABILITY_DISPLAY[rv.availability].color,background:AVAILABILITY_DISPLAY[rv.availability].color+"11",padding:"1px 6px",borderRadius:3,border:`1px solid ${AVAILABILITY_DISPLAY[rv.availability].color}22`}}>{AVAILABILITY_DISPLAY[rv.availability].label}</span>}
                      <span style={{fontFamily:mono,fontSize:8,color:"#737373"}}>{formatTradeValue(rv)}</span>
                    </div>
                    {rv.performanceEvidence&&<div style={{fontFamily:sans,fontSize:10,color:"#737373",lineHeight:1.4,marginBottom:2}}>{rv.performanceEvidence.length>120&&!expandedNeeds.has(dk+"_full")?rv.performanceEvidence.slice(0,120)+"…":rv.performanceEvidence}{rv.performanceEvidence.length>120&&<span onClick={e=>{e.stopPropagation();const next=new Set(expandedNeeds);if(expandedNeeds.has(dk+"_full"))next.delete(dk+"_full");else next.add(dk+"_full");setExpandedNeeds(next);}} style={{color:"#a855f7",cursor:"pointer",marginLeft:4,fontSize:9}}>{expandedNeeds.has(dk+"_full")?"less":"more"}</span>}</div>}
                    {rv.injuryNotes&&<div style={{fontFamily:sans,fontSize:10,color:"#ea580c",lineHeight:1.4}}>⚠ {rv.injuryNotes}</div>}
                    {rv.tradeBuzz&&<div style={{fontFamily:sans,fontSize:10,color:"#525252",fontStyle:"italic",lineHeight:1.4}}>{rv.tradeBuzz}</div>}
                  </div>}
                </div>;})}
              </div>;})}
            </div>
            <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:6}}>
              {[["elite","ELT"],["pro_bowl","PRO"],["quality_starter","QS"],["starter","STR"],["rotational","ROT"],["backup","BKP"],["declining","DEC"]].map(([tier,label])=><span key={tier} style={{display:"inline-flex",alignItems:"center",gap:2}}><span style={{width:5,height:5,borderRadius:3,background:TIER_COLORS[tier]}}/><span style={{fontFamily:mono,fontSize:7,color:"#a3a3a3"}}>{label}</span></span>)}
            </div>
          </div>;})();

          const positionTendencyCard=positions.length>0&&(()=>{const needs=TEAM_NEEDS_COUNTS[trendsTeam]||{};const broadMap={EDGE:"DL",DT:"DL",IDL:"DL",NT:"DL",CB:"DB",S:"DB",OT:"OL",IOL:"OL"};const getNeed=(pos)=>needs[pos]||needs[broadMap[pos]]||0;return<div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"16px 20px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase"}}>position tendency</div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{display:"inline-flex",alignItems:"center",gap:3}}><span style={{width:6,height:6,borderRadius:3,background:"#dc2626",flexShrink:0}}/><span style={{fontFamily:mono,fontSize:8,color:"#a3a3a3"}}>big need</span></span>
                <span style={{display:"inline-flex",alignItems:"center",gap:3}}><span style={{width:6,height:6,borderRadius:3,background:"#f59e0b",flexShrink:0}}/><span style={{fontFamily:mono,fontSize:8,color:"#a3a3a3"}}>need</span></span>
              </div>
            </div>
            {positions.map(p=>{const pct=totalPosPicks>0?Math.round((Number(p.pos_count)/totalPosPicks)*100):0;const c=POS_COLORS[p.prospect_pos]||"#a3a3a3";const need=getNeed(p.prospect_pos);return<div key={p.prospect_pos} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <span style={{fontFamily:mono,fontSize:10,fontWeight:700,color:c,width:32,textAlign:"right"}}>{p.prospect_pos}</span>
              <div style={{flex:1,height:18,background:"#f5f5f5",borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:c,borderRadius:4,minWidth:pct>0?2:0,transition:"width 0.3s"}}/></div>
              <span style={{fontFamily:mono,fontSize:10,color:"#a3a3a3",width:28,textAlign:"right"}}>{pct}%</span>
              {need>=3?<span style={{width:8,height:8,borderRadius:4,background:"#dc2626",flexShrink:0}} title="Big need"/>:need>=2?<span style={{width:8,height:8,borderRadius:4,background:"#f59e0b",flexShrink:0}} title="Need"/>:<span style={{width:8,height:8,flexShrink:0}}/>}
            </div>;})}
          </div>;})();

          const schemeFitPills=["ALL","QB","RB","WR","TE","OT","IOL","EDGE","DL","LB","CB","S"];
          const sfList=getTeamSchemeFits(trendsTeam,schemeFits,PROSPECTS,schemeFitPos,65);
          const sfVisible=schemeFitExpanded?sfList:sfList.slice(0,12);

          // Scheme fits tab content
          const schemeFitsContent=<div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>{schemeFitPills.map(p=><button key={p} onClick={()=>{setSchemeFitPos(p);setSchemeFitExpanded(false);setExpandedSchemeFitId(null);}} style={{fontFamily:mono,fontSize:9,padding:"3px 10px",borderRadius:99,border:schemeFitPos===p?"1px solid "+accent:"1px solid #e5e5e5",background:schemeFitPos===p?accent+"11":"#fff",color:schemeFitPos===p?accent:"#a3a3a3",cursor:"pointer",fontWeight:schemeFitPos===p?700:400}}>{p}</button>)}</div>
            {sfVisible.map((sf,i)=>{const p=sf.prospect;const pos=p.gpos||p.pos;const pc=POS_COLORS[pos]||"#a3a3a3";const sc=sf.score;const scColor=sc>=80?"#16a34a":sc>=65?"#0d9488":sc>=50?"#d97706":"#a3a3a3";const isOpen=expandedSchemeFitId===p.id;const svR=trendsVision.get(p.id);
            return<div key={p.id} style={{borderBottom:i<sfVisible.length-1?"1px solid #f5f5f5":"none",cursor:"pointer"}} onClick={()=>setExpandedSchemeFitId(isOpen?null:p.id)}>
              <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0"}}>
                <span style={{fontFamily:font,fontSize:13,fontWeight:900,color:"#d4d4d4",width:22,textAlign:"right",flexShrink:0}}>{i+1}</span>
                <SchoolLogo school={p.school} size={24}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span onClick={e=>{e.stopPropagation();openProfile(p);}} style={{fontFamily:sans,fontSize:13,fontWeight:600,color:"#171717",cursor:"pointer",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} onMouseEnter={e=>e.currentTarget.style.textDecoration="underline"} onMouseLeave={e=>e.currentTarget.style.textDecoration="none"}>{p.name}</span>
                    <span style={{fontFamily:mono,fontSize:9,fontWeight:700,color:pc,background:`${pc}11`,padding:"1px 5px",borderRadius:4,border:`1px solid ${pc}22`,flexShrink:0}}>{pos}</span>
                  </div>
                  {sf.tags.length>0&&<div style={{display:"flex",gap:4,marginTop:3,flexWrap:"wrap"}}>{sf.tags.slice(0,2).map((t,j)=><span key={j} style={{fontFamily:mono,fontSize:8,color:"#737373",background:"#f5f5f5",padding:"2px 6px",borderRadius:4,whiteSpace:"nowrap"}}>{t}</span>)}</div>}
                </div>
                <span style={{fontFamily:mono,fontSize:12,fontWeight:800,color:scColor,background:`${scColor}11`,padding:"2px 8px",borderRadius:6,border:`1px solid ${scColor}22`,minWidth:28,textAlign:"center",transition:"opacity 0.15s",opacity:isOpen?1:0.85}}>{sc}</span>
                {sf.limitedFit&&<span style={{fontFamily:mono,fontSize:7,color:"#d97706",marginLeft:2}}>limited</span>}
                <span style={{fontFamily:mono,fontSize:10,color:"#a3a3a3",flexShrink:0}}>{isOpen?"−":"+"}</span>
              </div>
              {isOpen&&svR&&<div style={{padding:"10px 14px 14px 54px",background:`${accent}04`,borderLeft:`3px solid ${accent}`,borderRadius:"0 0 8px 0"}} onClick={e=>e.stopPropagation()}>
                <div style={{fontFamily:sans,fontSize:11,fontWeight:700,color:accent,marginBottom:4}}>{svR.headline}</div>
                <div style={{fontFamily:mono,fontSize:9,color:accent,marginBottom:4,opacity:0.8}}>{svR.roleLabel}</div>
                <div style={{fontFamily:sans,fontSize:11,color:"#404040",lineHeight:1.5,marginBottom:8}}>{svR.whyItFits}</div>
                {svR.prospectStrengths&&<div style={{fontFamily:mono,fontSize:9,color:"#737373",marginBottom:6}}>key traits: {svR.prospectStrengths}</div>}
                {svR.relevantInflection&&<div style={{fontFamily:sans,fontSize:10,color:accent,fontStyle:"italic",lineHeight:1.4,padding:"6px 8px",background:`${accent}06`,borderRadius:6,borderLeft:`2px solid ${accent}40`}}>{svR.relevantInflection}</div>}
              </div>}
              {isOpen&&!svR&&<div style={{padding:"10px 14px 14px 54px",background:"#faf9f6",borderBottom:i<sfVisible.length-1?"1px solid #f5f5f5":"none"}}><span style={{fontFamily:sans,fontSize:11,color:"#a3a3a3",fontStyle:"italic"}}>no scout vision data available</span></div>}
            </div>;})}
            {sfList.length>12&&!schemeFitExpanded&&<button onClick={()=>setSchemeFitExpanded(true)} style={{fontFamily:sans,fontSize:11,color:"#a3a3a3",background:"transparent",border:"1px solid #e5e5e5",borderRadius:99,padding:"4px 12px",cursor:"pointer",marginTop:8}}>show all ({sfList.length})</button>}
          </div>;

          // Community tab content: R1 prediction banner + most drafted + position tendency
          const r1TeamPicks=r1PredictionSlots?r1PredictionSlots.filter(s=>s.team===trendsTeam):[];
          const communityContent=<div>
            {r1TeamPicks.length>0&&<div style={{background:`${accent}06`,border:`1px solid ${accent}18`,borderRadius:8,padding:"10px 12px",marginBottom:14}}>
              <div style={{fontFamily:mono,fontSize:8,letterSpacing:1.5,color:accent,textTransform:"uppercase",marginBottom:6}}>round 1 simulation</div>
              {r1TeamPicks.map((slot,si)=>{const player=slot.primary?.playerId?PROSPECTS.find(p=>p.id===slot.primary.playerId):null;const pos=player?.gpos||player?.pos||"";const c=POS_COLORS[pos]||"#a3a3a3";const pct=slot.primary?.pct||0;const confColor=pct>=50?"#16a34a":pct>=30?"#d97706":"#dc2626";const also=slot.alsoConsidered||[];return<div key={slot.pickNum} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:si<r1TeamPicks.length-1?"1px solid "+accent+"10":"none"}}>
                <span style={{fontFamily:font,fontSize:14,fontWeight:900,color:"#d4d4d4",width:26,textAlign:"right",flexShrink:0}}>#{slot.pickNum}</span>
                {player&&<SchoolLogo school={player.school} size={22}/>}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:5}}>
                    {player?<span onClick={()=>setProfilePlayer(player)} style={{fontFamily:sans,fontSize:12,fontWeight:700,color:"#171717",cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.textDecoration="underline"} onMouseLeave={e=>e.currentTarget.style.textDecoration="none"}>{player.name}</span>:<span style={{fontFamily:sans,fontSize:12,color:"#a3a3a3"}}>—</span>}
                    {pos&&<span style={{fontFamily:mono,fontSize:8,fontWeight:700,color:c,background:`${c}11`,padding:"1px 5px",borderRadius:3}}>{pos}</span>}
                    <span style={{fontFamily:mono,fontSize:9,fontWeight:700,color:confColor}}>{pct}%</span>
                  </div>
                  {also.length>0&&<div style={{fontFamily:mono,fontSize:9,color:"#a3a3a3",marginTop:1}}>also: {also.slice(0,3).map(a=>{const ap=PROSPECTS.find(p=>p.id===a.playerId);return ap?`${shortName(ap.name)} ${a.pct}%`:null;}).filter(Boolean).join(", ")}</div>}
                </div>
              </div>;})}
            </div>}
            {prospects.map((p,i)=>{const c=POS_COLORS[p.prospect_pos]||"#a3a3a3";const prospect=PROSPECTS.find(pr=>pr.name===p.prospect_name);const cRank=prospect?getConsensusRank(prospect.name):null;return<div key={p.prospect_name} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:i<prospects.length-1?"1px solid #f5f5f5":"none"}}>
              <span style={{fontFamily:font,fontSize:13,fontWeight:900,color:"#d4d4d4",width:22,textAlign:"right",flexShrink:0}}>{i+1}</span>
              {prospect&&<SchoolLogo school={prospect.school} size={24}/>}
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span onClick={()=>{if(prospect)setProfilePlayer(prospect);}} style={{fontFamily:sans,fontSize:13,fontWeight:600,color:"#171717",cursor:prospect?"pointer":"default"}} onMouseEnter={e=>{if(prospect)e.currentTarget.style.textDecoration="underline";}} onMouseLeave={e=>e.currentTarget.style.textDecoration="none"}>{p.prospect_name}</span>
                  <span style={{fontFamily:mono,fontSize:9,fontWeight:700,color:c,background:`${c}11`,padding:"1px 5px",borderRadius:4,border:`1px solid ${c}22`}}>{p.prospect_pos}</span>
                  {p.isLock&&<span style={{fontFamily:mono,fontSize:8,fontWeight:700,color:"#16a34a",background:"#f0fdf4",padding:"1px 5px",borderRadius:4,border:"1px solid #bbf7d0"}}>LOCK</span>}
                  {p.isSleeper&&<span style={{fontFamily:mono,fontSize:8,fontWeight:700,color:"#ca8a04",background:"#fefce8",padding:"1px 5px",borderRadius:4,border:"1px solid #fef08a"}}>SLEEPER</span>}
                </div>
                <div style={{fontFamily:mono,fontSize:9,color:"#a3a3a3",marginTop:2}}>{p.pct}% of mocks · avg pick {p.avg_pick}{cRank?` · consensus #${cRank}`:""}</div>
              </div>
            </div>;})}
          </div>;

          // Unified prospect matches card
          const prospectTabs=[{key:"scheme",label:"Scheme Fits"},{key:"community",label:"Community Picks"}];
          const prospectMatchesCard=<div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"16px 20px",marginBottom:16}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
              <div style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",flexShrink:0}}>prospect matches</div>
              <span onClick={()=>setSchemeFitInfo(v=>!v)} style={{fontFamily:sans,fontSize:10,fontWeight:700,color:"#a3a3a3",background:"#f5f5f5",width:16,height:16,borderRadius:8,display:"inline-flex",alignItems:"center",justifyContent:"center",cursor:"pointer",border:"1px solid #e5e5e5",lineHeight:1,flexShrink:0}}>?</span>
              <div style={{display:"flex",gap:0,marginLeft:"auto",border:"1px solid #e5e5e5",borderRadius:6,overflow:"hidden"}}>{prospectTabs.map(t=><button key={t.key} onClick={()=>setTrendsProspectTab(t.key)} style={{fontFamily:mono,fontSize:9,padding:"4px 12px",background:trendsProspectTab===t.key?"#171717":"#fff",color:trendsProspectTab===t.key?"#fff":"#a3a3a3",border:"none",cursor:"pointer",fontWeight:trendsProspectTab===t.key?700:400}}>{t.label}</button>)}</div>
            </div>
            {schemeFitInfo&&<div style={{fontFamily:sans,fontSize:11,color:"#525252",lineHeight:1.5,background:"#f9f9f6",border:"1px solid #e5e5e5",borderRadius:8,padding:"10px 12px",marginBottom:12}}>{trendsProspectTab==="scheme"?"Scheme fit scores evaluate how well each prospect's traits, archetype, and athletic profile align with this team's offensive or defensive scheme. Tap a score to see the component breakdown.":"The most drafted prospects for this team across all user mock drafts on Big Board Lab, ranked by selection frequency."}</div>}
            {trendsProspectTab==="scheme"?schemeFitsContent:communityContent}
          </div>;

          return<>
          {needsCard}
          {faCard}
          {prospectMatchesCard}
          {/* Position Tendency + Depth Chart — side by side on desktop */}
          <div className="trends-grid" style={{display:"flex",gap:16,alignItems:"flex-start",marginBottom:16}}>
            {positionTendencyCard&&<div style={{flex:"1 1 0%",minWidth:0}}>{positionTendencyCard}</div>}
            {depthCard&&<div style={{flex:"1 1 0%",minWidth:0}}>{depthCard}</div>}
          </div>
          </>;})()}
        </>;})()}
      </div>
      {profilePlayer&&<PlayerProfile player={profilePlayer} traits={traits} setTraits={setTraits} notes={notes} setNotes={setNotes} allProspects={PROSPECTS} getGrade={getGrade} onClose={closeProfile} onSelectPlayer={setProfilePlayer} consensus={CONSENSUS} ratings={ratings} isGuest={isGuest} onRequireAuth={onRequireAuth} schemeFits={schemeFits}/>}
    </div>);
  }

  // === COMBINE EXPLORER ===
  if(showExplorer){
    const gateAuth=(fn)=>()=>{if(isGuest){onRequireAuth("want to play with the data? sign up free");return;}fn();};
    const allTraits=[...new Set(Object.values(POSITION_TRAITS).flat())].sort();
    const traitPosCounts={};
    allTraits.forEach(t=>{traitPosCounts[t]=EXPLORER_GROUPS.filter(pos=>POSITION_TRAITS[pos]?.includes(t)).length;});
    const _isDark=explorerMode==="madness";
    return(<div style={{position:"fixed",inset:0,background:_isDark?"#0f0f0f":"#faf9f6",zIndex:9000,overflow:"auto",WebkitOverflowScrolling:"touch",transition:"background 0.3s"}}>
      <SaveBar {...saveBarProps}/>
      <div style={{maxWidth:900,margin:"0 auto",padding:"52px 16px 80px"}}>
        {/* Header */}
        <div style={{marginBottom:12}}>
          <h2 style={{fontFamily:font,fontSize:22,fontWeight:900,color:_isDark?"#e5e5e5":"#171717",margin:0}}>{_isDark?"march madness lab":"data lab"}</h2>
          <p style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:explorerMode==="madness"?"#737373":"#a3a3a3",textTransform:"uppercase",margin:"2px 0 0"}}>{explorerMode==="madness"?"68 teams \u00b7 march madness 2026":explorerMode==="combo"?`${comboData.points.length} ${comboPos} players`:explorerMode==="scarcity"?"supply vs demand by position":explorerMode==="free-agency"?"2026 free agency contracts":explorerMode==="scheme-fit"?"scheme fit by team & position":`${explorerData.points.length} players · ${explorerData.groups.length} positions`}</p>
        </div>

        {/* Mode toggle */}
        <div style={{display:"flex",gap:6,marginBottom:12,overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none",paddingBottom:2,paddingTop:8}}>
          <button onClick={()=>{setExplorerMode("scheme-fit");setSfPosFilter(null);if(!sfTeam)setSfTeam("49ers");navigate('/lab/scheme-fit');}} style={{fontFamily:sans,fontSize:11,fontWeight:700,padding:"6px 14px",background:explorerMode==="scheme-fit"?"linear-gradient(135deg,#0891b2,#06b6d4)":"transparent",color:explorerMode==="scheme-fit"?"#fff":"#0891b2",border:explorerMode==="scheme-fit"?"1px solid #0891b2":"1px solid #0891b244",borderRadius:99,cursor:"pointer",boxShadow:explorerMode==="scheme-fit"?"0 2px 8px rgba(8,145,178,0.3)":"none",whiteSpace:"nowrap",flexShrink:0}}>🧬 scheme fit</button>
          <button onClick={()=>{setExplorerMode("combo");navigate('/lab/combo');}} style={{fontFamily:sans,fontSize:11,fontWeight:700,padding:"6px 14px",background:explorerMode==="combo"?"linear-gradient(135deg,#6366f1,#8b5cf6)":"transparent",color:explorerMode==="combo"?"#fff":"#7c3aed",border:explorerMode==="combo"?"1px solid #6366f1":"1px solid #7c3aed44",borderRadius:99,cursor:"pointer",boxShadow:explorerMode==="combo"?"0 2px 8px rgba(99,102,241,0.3)":"none",whiteSpace:"nowrap",flexShrink:0}}>⚡ combo</button>
          <button onClick={()=>{setExplorerMode("free-agency");setFaView("position");setFaPosFilter(null);setFaTeamFilter(null);navigate('/lab/free-agency');}} style={{fontFamily:sans,fontSize:11,fontWeight:700,padding:"6px 14px",background:explorerMode==="free-agency"?"linear-gradient(135deg,#d97706,#f59e0b)":"transparent",color:explorerMode==="free-agency"?"#fff":"#d97706",border:explorerMode==="free-agency"?"1px solid #d97706":"1px solid #d9770644",borderRadius:99,cursor:"pointer",boxShadow:explorerMode==="free-agency"?"0 2px 8px rgba(217,119,6,0.3)":"none",whiteSpace:"nowrap",flexShrink:0}}>💰 free agency</button>
          <button onClick={()=>{setExplorerMode("scarcity");navigate('/lab/scarcity');}} style={{fontFamily:sans,fontSize:11,fontWeight:700,padding:"6px 14px",background:explorerMode==="scarcity"?"linear-gradient(135deg,#059669,#10b981)":"transparent",color:explorerMode==="scarcity"?"#fff":"#059669",border:explorerMode==="scarcity"?"1px solid #059669":"1px solid #05966944",borderRadius:99,cursor:"pointer",boxShadow:explorerMode==="scarcity"?"0 2px 8px rgba(5,150,105,0.3)":"none",whiteSpace:"nowrap",flexShrink:0}}>🫥 scarcity</button>
          <button onClick={()=>{setExplorerMode("madness");setMadnessMode("combo");navigate('/lab/madness');}} style={{fontFamily:sans,fontSize:11,fontWeight:700,padding:"6px 14px",background:explorerMode==="madness"?"linear-gradient(135deg,#ea580c,#dc2626)":"transparent",color:explorerMode==="madness"?"#fff":"#ea580c",border:explorerMode==="madness"?"1px solid #ea580c":"1px dashed #ea580c88",borderRadius:99,cursor:"pointer",boxShadow:explorerMode==="madness"?"0 2px 8px rgba(234,88,12,0.3)":"none",whiteSpace:"nowrap",flexShrink:0,position:"relative"}}>{"\uD83C\uDFC0"} march madness<span style={{position:"absolute",top:-6,right:-4,fontFamily:mono,fontSize:7,fontWeight:900,letterSpacing:1,color:"#fff",background:"linear-gradient(135deg,#ea580c,#dc2626)",padding:"1px 5px",borderRadius:99,textTransform:"uppercase",lineHeight:"12px"}}>NEW</span></button>
          <div style={{width:1,height:20,background:"#e5e5e5",margin:"0 4px",flexShrink:0}}/>
          <button onClick={()=>{setExplorerMode("measurables");setExplorerAbsolute(false);setExplorerLeaderPos(null);navigate('/lab/measurables');}} style={{fontFamily:sans,fontSize:11,fontWeight:700,padding:"6px 14px",background:explorerMode==="measurables"?"#171717":"transparent",color:explorerMode==="measurables"?"#fff":"#737373",border:explorerMode==="measurables"?"1px solid #171717":"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>measurables</button>
          <button onClick={()=>{setExplorerMode("traits");setExplorerLeaderPos(null);navigate('/lab/traits');}} style={{fontFamily:sans,fontSize:11,fontWeight:700,padding:"6px 14px",background:explorerMode==="traits"?"#171717":"transparent",color:explorerMode==="traits"?"#fff":"#737373",border:explorerMode==="traits"?"1px solid #171717":"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>scouting traits</button>
          <button onClick={()=>{setExplorerMode("stats");setExplorerAbsolute(true);setExplorerLeaderPos(null);navigate('/lab/stats');}} style={{fontFamily:sans,fontSize:11,fontWeight:700,padding:"6px 14px",background:explorerMode==="stats"?"#171717":"transparent",color:explorerMode==="stats"?"#fff":"#737373",border:explorerMode==="stats"?"1px solid #171717":"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>college stats</button>
        </div>

        {/* Combo mode UI */}
        {explorerMode==="combo"&&<>
          {/* Position pills */}
          <div style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:8,WebkitOverflowScrolling:"touch",msOverflowStyle:"none",scrollbarWidth:"none"}}>
            {EXPLORER_GROUPS.map(pos=>{const c=POS_COLORS[pos]||"#525252";const active=comboPos===pos;return<button key={pos} onClick={gateAuth(()=>{setComboPos(pos);const d=COMBO_DEFAULTS[pos]||["meas_ATH","trait_"+((POSITION_TRAITS[pos]||[])[0]||"Speed")];setComboX(d[0]);setComboY(d[1]);})} style={{fontFamily:mono,fontSize:10,fontWeight:700,padding:"5px 12px",background:active?c:"transparent",color:active?"#fff":c,border:`1.5px solid ${active?c:c+"33"}`,borderRadius:99,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,transition:"all 0.15s"}}>{pos}</button>;})}
          </div>
          {/* Axis dropdowns */}
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,flexWrap:"wrap"}}>
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <span style={{fontFamily:mono,fontSize:9,letterSpacing:1,color:"#a3a3a3",textTransform:"uppercase"}}>X</span>
              <ComboDropdown value={comboX} options={comboMetrics} openKey={comboDrop==="x"?"x":null} onOpenChange={v=>setComboDrop(v?"x":null)} onChange={v=>{if(isGuest){onRequireAuth("want to play with the data? sign up free");return;}setComboX(v);}}/>
            </div>
            <button onClick={()=>{if(isGuest){onRequireAuth("want to play with the data? sign up free");return;}setComboX(comboY);setComboY(comboX);}} title="Swap axes" style={{fontSize:14,color:"#a3a3a3",background:"#f5f5f4",border:"1px solid #e5e5e5",borderRadius:8,padding:"3px 7px",cursor:"pointer",lineHeight:1,transition:"all 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.background="#e5e5e5";}} onMouseLeave={e=>{e.currentTarget.style.background="#f5f5f4";}}>🔀</button>
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <span style={{fontFamily:mono,fontSize:9,letterSpacing:1,color:"#a3a3a3",textTransform:"uppercase"}}>Y</span>
              <ComboDropdown value={comboY} options={comboMetrics} openKey={comboDrop==="y"?"y":null} onOpenChange={v=>setComboDrop(v?"y":null)} onChange={v=>{if(isGuest){onRequireAuth("want to play with the data? sign up free");return;}setComboY(v);}}/>
            </div>
          </div>
          {/* Sparse/empty warnings + scatter chart */}
          {comboData.points.length>0&&comboData.points.length<8&&<div style={{fontFamily:sans,fontSize:11,color:"#92400e",background:"#fef3c7",border:"1px solid #fcd34d",borderRadius:8,padding:"6px 12px",marginBottom:8}}>⚠️ sparse data — only {comboData.points.length} {comboPos} players have both metrics</div>}
          {comboData.points.length===0?(<div style={{textAlign:"center",padding:"60px 20px"}}><p style={{fontFamily:sans,fontSize:14,color:"#a3a3a3"}}>no {comboPos} players have both {comboData.xMeta?.label||"X"} and {comboData.yMeta?.label||"Y"}</p></div>):(
            <div style={{marginTop:4,position:"relative"}}>
              <ScatterChartWrapper points={comboData.points} xLabel={comboData.xMeta?.label||""} yLabel={comboData.yMeta?.label||""} xInverted={comboData.xMeta?.inverted||false} yInverted={comboData.yMeta?.inverted||false} posColor={POS_COLORS[comboPos]||"#737373"} showLogos={explorerLogos} onHover={setExplorerHover} onTap={(pt)=>{const p=PROSPECTS.find(pr=>pr.id===pt.id);if(p)openProfile(p);}} hoveredId={explorerHover?.id||null} myGuys={myGuys} showMyGuys={explorerMyGuys} spotlightName={comboSpotlightName}/>
              <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",display:"flex",alignItems:"center",gap:0,opacity:0.06,pointerEvents:"none"}}>
                <img src="/logo.png" alt="" style={{height:60,width:"auto"}}/>
                <span style={{fontFamily:font,fontSize:32,fontWeight:900,color:"#171717",letterSpacing:-1,marginLeft:-6}}>bigboardlab.com</span>
              </div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:6,paddingRight:4}}>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <button onClick={gateAuth(()=>setExplorerLogos(v=>!v))} style={{fontFamily:sans,fontSize:10,fontWeight:600,padding:"5px 10px",background:explorerLogos?"#17171710":"transparent",color:explorerLogos?"#171717":"#a3a3a3",border:explorerLogos?"1px solid #17171722":"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",transition:"all 0.2s"}}>{explorerLogos?"● dots":"🏫 logos"}</button>
                  {myGuys.length>0&&<button onClick={gateAuth(()=>setExplorerMyGuys(v=>!v))} style={{fontFamily:sans,fontSize:10,fontWeight:600,padding:"5px 10px",background:explorerMyGuys?"linear-gradient(135deg,#ec4899,#7c3aed)":"transparent",color:explorerMyGuys?"#fff":"#a3a3a3",border:explorerMyGuys?"1px solid transparent":"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",transition:"all 0.2s"}}>👀 my guys</button>}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:5}}>
                  <img src="/logo.png" alt="" style={{height:12,width:"auto"}}/>
                  <span style={{fontFamily:mono,fontSize:8,fontWeight:600,color:"#171717",letterSpacing:0.3}}>bigboardlab.com</span>
                </div>
              </div>
            </div>
          )}
          {/* Combo leaderboard + correlation key */}
          {comboData.points.length>=4&&(()=>{
            const xInv=comboData.xMeta?.inverted||false;
            const yInv=comboData.yMeta?.inverted||false;
            const pts=comboData.points;
            const xVals=pts.map(p=>p.x),yVals=pts.map(p=>p.y);
            const xMn=Math.min(...xVals),xMx=Math.max(...xVals),yMn=Math.min(...yVals),yMx=Math.max(...yVals);
            const xRange=xMx-xMn||1,yRange=yMx-yMn||1;
            const scored=pts.map(p=>{
              const xNorm=xInv?(xMx-p.x)/xRange:(p.x-xMn)/xRange;
              const yNorm=yInv?(yMx-p.y)/yRange:(p.y-yMn)/yRange;
              return{...p,combo:Math.round(((xNorm+yNorm)/2)*100)};
            }).sort((a,b)=>b.combo-a.combo);
            const top10=scored.slice(0,10);
            // R² + correlation description
            const n=pts.length;
            const sumX=xVals.reduce((a,b)=>a+b,0),sumY=yVals.reduce((a,b)=>a+b,0);
            const sumXY=pts.reduce((a,p)=>a+p.x*p.y,0);
            const sumX2=xVals.reduce((a,b)=>a+b*b,0);
            const yMean=sumY/n;
            const denom=n*sumX2-sumX*sumX;
            const slope=denom?((n*sumXY-sumX*sumY)/denom):0;
            const intercept=(sumY-slope*sumX)/n;
            const ssRes=pts.reduce((a,p)=>{const pred=slope*p.x+intercept;return a+(p.y-pred)**2;},0);
            const ssTot=yVals.reduce((a,v)=>a+(v-yMean)**2,0);
            const r2=ssTot>0?1-ssRes/ssTot:0;
            const posSlope=(xInv?-slope:slope)*(yInv?-1:1);
            const dir=posSlope>=0?"positive":"negative";
            const strength=r2>=0.7?"strong":r2>=0.4?"moderate":r2>=0.15?"weak":"negligible";
            const strengthColor=r2>=0.7?"#16a34a":r2>=0.4?"#6366f1":r2>=0.15?"#f59e0b":"#a3a3a3";
            const desc=strength==="negligible"
              ?`No meaningful correlation between ${comboData.xMeta?.label} and ${comboData.yMeta?.label} for this class — performance in one doesn't predict the other.`
              :strength==="weak"
              ?`Weak ${dir} trend — ${comboData.xMeta?.label} and ${comboData.yMeta?.label} are loosely related. Plenty of outliers on both sides.`
              :strength==="moderate"
              ?`Moderate ${dir} correlation — players who do well in ${comboData.xMeta?.label} tend to ${dir==="positive"?"also":"inversely"} perform in ${comboData.yMeta?.label}, but it's not a lock.`
              :`Strong ${dir} correlation — ${comboData.xMeta?.label} and ${comboData.yMeta?.label} move together consistently across this class.`;
            const fmtComboVal=(v,meta)=>{if(v==null||!meta)return"—";if(meta.unit==="s")return v.toFixed(2)+"s";if(meta.unit==="ht")return typeof formatHeight==="function"?formatHeight(v):v;if(meta.unit==="lbs")return Math.round(v)+" lbs";if(meta.unit==="in")return v+'"';if(meta.unit==="trait")return Math.round(v);return typeof v==="number"?(Math.abs(v)<10?v.toFixed(2):Math.abs(v)<100?v.toFixed(1):Math.round(v)):v;};
            return<div style={{display:"flex",gap:16,marginTop:16,flexWrap:"wrap",alignItems:"flex-start"}}>
              {/* Ranked list */}
              <div style={{flex:"1 1 320px",minWidth:280}}>
                <span style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",display:"block",marginBottom:8}}>top 10 · closest to ★ best</span>
                <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,overflow:"hidden"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderBottom:"1px solid #e5e5e5"}}>
                    <span style={{fontFamily:mono,fontSize:8,color:"#a3a3a3",width:18,textAlign:"right"}}>#</span>
                    <span style={{width:20}}/>
                    <span style={{fontFamily:mono,fontSize:8,color:"#a3a3a3",flex:1}}>PLAYER</span>
                    <span style={{fontFamily:mono,fontSize:8,color:"#a3a3a3"}}>{comboData.xMeta?.label||"X"}</span>
                    <span style={{fontFamily:mono,fontSize:8,color:"#d4d4d4"}}>·</span>
                    <span style={{fontFamily:mono,fontSize:8,color:"#a3a3a3"}}>{comboData.yMeta?.label||"Y"}</span>
                    <span style={{fontFamily:mono,fontSize:8,color:"#a3a3a3",width:32,textAlign:"right"}}>SCR</span>
                  </div>
                  {top10.map((pt,i)=>{const c=POS_COLORS[pt.pos]||POS_COLORS[comboPos]||"#525252";const p=PROSPECTS.find(pr=>pr.id===pt.id);
                    return<div key={pt.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 12px",borderBottom:i<9?"1px solid #f5f5f5":"none",cursor:"pointer"}} onClick={()=>{if(p)openProfile(p);}} onMouseEnter={e=>e.currentTarget.style.background="#faf9f6"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <span style={{fontFamily:mono,fontSize:10,color:i<3?"#171717":"#a3a3a3",fontWeight:i<3?700:400,width:18,textAlign:"right"}}>{i+1}</span>
                      <SchoolLogo school={pt.school} size={20}/>
                      <span style={{fontFamily:sans,fontSize:12,fontWeight:600,color:"#171717",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{pt.name}</span>
                      <span style={{fontFamily:mono,fontSize:9,color:"#a3a3a3"}}>{fmtComboVal(pt.x,comboData.xMeta)}</span>
                      <span style={{fontFamily:mono,fontSize:8,color:"#d4d4d4"}}>·</span>
                      <span style={{fontFamily:mono,fontSize:9,color:"#a3a3a3"}}>{fmtComboVal(pt.y,comboData.yMeta)}</span>
                      <span style={{fontFamily:mono,fontSize:10,fontWeight:700,color:"#171717",width:32,textAlign:"right"}}>{pt.combo}</span>
                    </div>;
                  })}
                </div>
              </div>
              {/* Correlation key */}
              <div style={{flex:"1 1 240px",minWidth:200}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
                  <span style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase"}}>correlation</span>
                  <span onClick={()=>setExplorerAvgInfo(v=>!v)} style={{fontFamily:sans,fontSize:9,color:"#a3a3a3",background:"#f5f5f4",borderRadius:99,width:14,height:14,display:"inline-flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,border:"1px solid #e5e5e5"}}>?</span>
                </div>
                {explorerAvgInfo&&<div style={{fontFamily:sans,fontSize:11,color:"#525252",background:"#faf9f6",border:"1px solid #e5e5e5",borderRadius:8,padding:"8px 12px",marginBottom:8,lineHeight:1.5}}>
                  R² measures how much of the variation in one metric is explained by the other. 1.0 = perfect correlation, 0.0 = no relationship. The dashed trend line on the chart shows the direction. A high R² means these two metrics tend to move together across this draft class.
                  <span onClick={()=>setExplorerAvgInfo(false)} style={{fontFamily:mono,fontSize:9,color:"#a3a3a3",cursor:"pointer",marginLeft:6}}>dismiss</span>
                </div>}
                <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"16px 20px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                    <span style={{fontFamily:mono,fontSize:22,fontWeight:900,color:strengthColor}}>{r2.toFixed(2)}</span>
                    <div>
                      <div style={{fontFamily:sans,fontSize:12,fontWeight:700,color:strengthColor,textTransform:"capitalize"}}>{strength} {dir}</div>
                      <div style={{fontFamily:mono,fontSize:9,color:"#a3a3a3"}}>R² · {n} players</div>
                    </div>
                  </div>
                  <p style={{fontFamily:sans,fontSize:11,color:"#525252",lineHeight:1.5,margin:0}}>{desc}</p>
                  {comboCorrelations.length>0&&<>
                    <div style={{borderTop:"1px solid #f0f0f0",marginTop:12,paddingTop:10}}>
                      <div style={{fontFamily:mono,fontSize:8,letterSpacing:1,color:"#a3a3a3",textTransform:"uppercase",marginBottom:6}}>top correlations · {comboPos}</div>
                      {comboCorrelations.map((pair,i)=>{
                        const active=((comboX===pair.a.key&&comboY===pair.b.key)||(comboX===pair.b.key&&comboY===pair.a.key));
                        const pairColor=pair.dir>0?"#7c3aed":"#ec4899";
                        const pairSign=pair.dir>0?"+":"−";
                        return<div key={i} onClick={gateAuth(()=>{setComboX(pair.a.key);setComboY(pair.b.key);})} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 8px",margin:"0 -8px",borderRadius:6,cursor:"pointer",background:active?"#6366f108":"transparent",transition:"background 0.1s"}} onMouseEnter={e=>{if(!active)e.currentTarget.style.background="#faf9f6";}} onMouseLeave={e=>{if(!active)e.currentTarget.style.background=active?"#6366f108":"transparent";}}>
                          <span style={{fontFamily:mono,fontSize:11,fontWeight:700,color:pairColor,width:30,flexShrink:0}}>{pairSign}{pair.r2.toFixed(2)}</span>
                          <span style={{fontFamily:sans,fontSize:11,color:active?"#171717":"#525252",fontWeight:active?600:400,flex:1,lineHeight:1.3}}>
                            <span style={{fontFamily:mono,fontSize:7,fontWeight:700,color:COMBO_CAT_STYLE[pair.a.cat]?.color,background:COMBO_CAT_STYLE[pair.a.cat]?.color+"14",padding:"1px 3px",borderRadius:2,marginRight:3}}>{COMBO_CAT_STYLE[pair.a.cat]?.label}</span>
                            {pair.a.label}
                            <span style={{color:"#a3a3a3",margin:"0 3px"}}>vs</span>
                            <span style={{fontFamily:mono,fontSize:7,fontWeight:700,color:COMBO_CAT_STYLE[pair.b.cat]?.color,background:COMBO_CAT_STYLE[pair.b.cat]?.color+"14",padding:"1px 3px",borderRadius:2,marginRight:3}}>{COMBO_CAT_STYLE[pair.b.cat]?.label}</span>
                            {pair.b.label}
                          </span>
                        </div>;
                      })}
                    </div>
                  </>}
                </div>
              </div>
            </div>;
          })()}
        </>}

        {/* Measurable / Trait picker */}
        {explorerMode!=="combo"&&explorerMode!=="scarcity"&&explorerMode!=="free-agency"&&explorerMode!=="scheme-fit"&&explorerMode!=="madness"&&(explorerMode==="measurables"?(<div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:8,WebkitOverflowScrolling:"touch",msOverflowStyle:"none",scrollbarWidth:"none"}}>
          {MEAS_GROUPS.map(grp=>grp.keys.map(k=><button key={k} onClick={gateAuth(()=>setExplorerMeas(k))} style={{fontFamily:mono,fontSize:10,fontWeight:explorerMeas===k?700:500,padding:"5px 10px",background:explorerMeas===k?grp.border+"18":"transparent",color:explorerMeas===k?grp.border:"#a3a3a3",border:`1.5px solid ${explorerMeas===k?grp.border:"#e5e5e5"}`,borderRadius:99,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,transition:"all 0.15s"}}>{MEASURABLE_EMOJI[k]} {MEASURABLE_SHORT[k]}</button>))}
        </div>):explorerMode==="stats"?(<div style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:8,WebkitOverflowScrolling:"touch",msOverflowStyle:"none",scrollbarWidth:"none",alignItems:"center"}}>
          {STAT_CATEGORIES.map(grp=>{const isOpen=explorerStatOpen.has(grp.label);const hasSelection=grp.keys.includes(explorerStat);return<Fragment key={grp.label}><button onClick={gateAuth(()=>{setExplorerStatOpen(prev=>{const next=new Set(prev);if(next.has(grp.label))next.delete(grp.label);else next.add(grp.label);return next;});})} style={{fontFamily:sans,fontSize:10,fontWeight:700,padding:"5px 12px",background:hasSelection?grp.border:isOpen?grp.border+"18":"transparent",color:hasSelection?"#fff":isOpen?grp.border:"#737373",border:`1.5px solid ${hasSelection||isOpen?grp.border:"#e5e5e5"}`,borderRadius:99,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,transition:"all 0.15s"}}>{isOpen?"− ":"+ "}{grp.label}</button>{isOpen&&grp.keys.map(k=><button key={k} onClick={gateAuth(()=>setExplorerStat(k))} style={{fontFamily:mono,fontSize:10,fontWeight:explorerStat===k?700:500,padding:"5px 10px",background:explorerStat===k?grp.border+"18":"transparent",color:explorerStat===k?grp.border:"#a3a3a3",border:`1.5px solid ${explorerStat===k?grp.border:"#e5e5e5"}`,borderRadius:99,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,transition:"all 0.15s"}}>{STAT_EMOJI[k]||""} {STAT_SHORT[k]||k}</button>)}</Fragment>;})}
        </div>):(<div style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:8,WebkitOverflowScrolling:"touch",flexWrap:"nowrap",msOverflowStyle:"none",scrollbarWidth:"none"}}>
          {allTraits.filter(t=>{const positions=EXPLORER_GROUPS.filter(pos=>POSITION_TRAITS[pos]?.includes(t));return!positions.every(pos=>pos==="K/P");}).map(t=><button key={t} onClick={gateAuth(()=>setExplorerTrait(t))} style={{fontFamily:sans,fontSize:10,fontWeight:explorerTrait===t?700:500,padding:"5px 10px",background:explorerTrait===t?"#6366f118":"transparent",color:explorerTrait===t?"#6366f1":"#a3a3a3",border:`1.5px solid ${explorerTrait===t?"#6366f1":"#e5e5e5"}`,borderRadius:99,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,transition:"all 0.15s"}}>{TRAIT_EMOJI[t]||""} {TRAIT_SHORT[t]||t} <span style={{fontSize:8,opacity:0.6}}>({traitPosCounts[t]})</span></button>)}
        </div>))}

        {/* Absolute/percentile toggle — drills only (measurables) */}
        {explorerMode==="measurables"&&MEASURABLE_DRILLS.includes(explorerMeas)&&<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
          <button title={explorerAbsolute?"Absolute — click for Position Percentile":"Position Percentile — click for Absolute"} onClick={gateAuth(()=>setExplorerAbsolute(v=>!v))} style={{width:40,height:22,borderRadius:11,border:"none",background:explorerAbsolute?"linear-gradient(135deg,#f59e0b,#dc2626)":"linear-gradient(135deg,#22c55e,#14b8a6)",cursor:"pointer",position:"relative",transition:"background 0.2s",flexShrink:0}}><div style={{width:16,height:16,borderRadius:8,background:"#fff",position:"absolute",top:3,left:explorerAbsolute?21:3,transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontFamily:mono,fontSize:8,fontWeight:700,color:explorerAbsolute?"#dc2626":"#14b8a6",lineHeight:1}}>{explorerAbsolute?"A":"P"}</span></div></button>
          <span style={{fontFamily:sans,fontSize:10,color:"#a3a3a3"}}>{explorerAbsolute?"absolute — compare across positions":"percentile within position"}</span>
        </div>}

        {/* Raw/percentile toggle — stats mode (not breakout year) */}
        {explorerMode==="stats"&&explorerStat!=="breakout_year"&&<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
          <button title={explorerAbsolute?"Raw stats — click for Historical Percentile":"Historical Percentile — click for Raw Stats"} onClick={gateAuth(()=>setExplorerAbsolute(v=>!v))} style={{width:40,height:22,borderRadius:11,border:"none",background:explorerAbsolute?"linear-gradient(135deg,#f59e0b,#dc2626)":"linear-gradient(135deg,#22c55e,#14b8a6)",cursor:"pointer",position:"relative",transition:"background 0.2s",flexShrink:0}}><div style={{width:16,height:16,borderRadius:8,background:"#fff",position:"absolute",top:3,left:explorerAbsolute?21:3,transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontFamily:mono,fontSize:8,fontWeight:700,color:explorerAbsolute?"#dc2626":"#14b8a6",lineHeight:1}}>{explorerAbsolute?"R":"P"}</span></div></button>
          <span style={{fontFamily:sans,fontSize:10,color:"#a3a3a3"}}>{explorerAbsolute?"raw stats":"historical percentile — vs 10 years of college data"}</span>
        </div>}

        {/* Sparse data warning */}
        {explorerMode!=="combo"&&explorerMode!=="scarcity"&&explorerMode!=="free-agency"&&explorerMode!=="scheme-fit"&&explorerMode!=="madness"&&explorerData.points.length>0&&explorerData.points.length<20&&<div style={{fontFamily:sans,fontSize:11,color:"#92400e",background:"#fef3c7",border:"1px solid #fcd34d",borderRadius:8,padding:"6px 12px",marginBottom:8}}>⚠️ sparse data — only {explorerData.points.length} players have this {explorerMode==="stats"?"stat":"measurement"}</div>}

        {/* Beeswarm */}
        {explorerMode!=="combo"&&explorerMode!=="scarcity"&&explorerMode!=="free-agency"&&explorerMode!=="scheme-fit"&&explorerMode!=="madness"&&(explorerData.points.length===0?(<div style={{textAlign:"center",padding:"60px 20px"}}><p style={{fontFamily:sans,fontSize:14,color:"#a3a3a3"}}>no data available for this {explorerMode==="stats"?"stat":"measurable"}</p></div>):(
          <div style={{marginTop:4,position:"relative"}}>
            <BeeswarmChartWrapper data={explorerData} myGuys={myGuys} showMyGuys={explorerMyGuys} showLogos={explorerLogos} onHover={setExplorerHover} onTap={(pt)=>{const p=PROSPECTS.find(pr=>pr.id===pt.id);if(p)openProfile(p);}} hoveredId={explorerHover?.id||null}/>
            <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",display:"flex",alignItems:"center",gap:0,opacity:0.06,pointerEvents:"none"}}>
              <img src="/logo.png" alt="" style={{height:60,width:"auto"}}/>
              <span style={{fontFamily:font,fontSize:32,fontWeight:900,color:"#171717",letterSpacing:-1,marginLeft:-6}}>bigboardlab.com</span>
            </div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:6,paddingRight:4}}>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <button onClick={gateAuth(()=>setExplorerLogos(v=>!v))} style={{fontFamily:sans,fontSize:10,fontWeight:600,padding:"5px 10px",background:explorerLogos?"#17171710":"transparent",color:explorerLogos?"#171717":"#a3a3a3",border:explorerLogos?"1px solid #17171722":"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",transition:"all 0.2s"}}>{explorerLogos?"● dots":"🏫 logos"}</button>
                {myGuys.length>0&&<button onClick={gateAuth(()=>setExplorerMyGuys(v=>!v))} style={{fontFamily:sans,fontSize:10,fontWeight:600,padding:"5px 10px",background:explorerMyGuys?"linear-gradient(135deg,#ec4899,#7c3aed)":"transparent",color:explorerMyGuys?"#fff":"#a3a3a3",border:explorerMyGuys?"1px solid transparent":"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",transition:"all 0.2s"}}>👀 my guys</button>}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:5}}>
                <img src="/logo.png" alt="" style={{height:12,width:"auto"}}/>
                <span style={{fontFamily:mono,fontSize:8,fontWeight:600,color:"#171717",letterSpacing:0.3}}>bigboardlab.com</span>
              </div>
            </div>
          </div>
        ))}

        {/* Leaderboard + Position Averages */}
        {explorerMode!=="combo"&&explorerMode!=="scarcity"&&explorerMode!=="free-agency"&&explorerMode!=="scheme-fit"&&explorerMode!=="madness"&&explorerData.points.length>=5&&(()=>{
          const mc=explorerData.measCode;
          const sc=explorerData.statCode;
          const inv=explorerData.inverted;
          const fmtVal=(pt)=>{const dv=pt.displayVal!=null?pt.displayVal:pt.val;if(sc){if(sc==="breakout_year")return dv;const suffix=sc.endsWith("_DOM")||sc.endsWith("_PCT")?"%":"";if(DECIMAL_STATS.has(sc))return(typeof dv==="number"?dv.toFixed(sc.endsWith("_PCT")||sc.endsWith("_DOM")?1:2):dv)+suffix;return(typeof dv==="number"?Math.round(dv):dv)+suffix;}if(!mc)return Math.round(dv);if(mc==="HT")return formatHeight(dv);if(mc==="WT")return dv+" lbs";if(mc==="ARM"||mc==="HND"||mc==="WING")return dv+'"';if(mc==="40"||mc==="3C"||mc==="SHT")return dv+"s";return Math.round(dv*10)/10;};
          const filtered=explorerLeaderPos?explorerData.points.filter(p=>p.group===explorerLeaderPos):explorerData.points;
          const sorted=[...filtered].sort((a,b)=>inv&&explorerAbsolute?a.val-b.val:b.val-a.val);
          const top10=sorted.slice(0,10);
          const posAvgs={};
          explorerData.groups.forEach(g=>{const pts=explorerData.points.filter(p=>p.group===g);if(pts.length)posAvgs[g]={avg:pts.reduce((s,p)=>s+p.val,0)/pts.length,count:pts.length};});
          const avgEntries=Object.entries(posAvgs).sort((a,b)=>inv&&explorerAbsolute?a[1].avg-b[1].avg:b[1].avg-a[1].avg);
          const allVals=avgEntries.map(([,v])=>v.avg);
          const barMin=Math.min(...allVals),barMax=Math.max(...allVals);
          const barRange=barMax-barMin||1;
          return<div style={{display:"flex",gap:16,marginTop:20,flexWrap:"wrap",alignItems:"flex-start"}}>
            {/* Leaderboard */}
            <div style={{flex:"1 1 320px",minWidth:280}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
                <span style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase"}}>top 10 · {explorerData.label}</span>
                <span onClick={()=>setExplorerLeaderInfo(v=>!v)} style={{fontFamily:sans,fontSize:9,color:"#a3a3a3",background:"#f5f5f4",borderRadius:99,width:14,height:14,display:"inline-flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,border:"1px solid #e5e5e5"}}>?</span>
              </div>
              {explorerLeaderInfo&&<div style={{fontFamily:sans,fontSize:11,color:"#525252",background:"#faf9f6",border:"1px solid #e5e5e5",borderRadius:8,padding:"8px 12px",marginBottom:8,lineHeight:1.5}}>
                {sc?sc==="breakout_year"?"Sorted by breakout year — earlier breakouts rank higher. Breakout = 20%+ dominator rating in a season.":explorerAbsolute?"Sorted by raw stat value.":"Sorted by historical percentile — how each player compares to 10 years of college data at their position.":!mc?"Sorted by scouting trait score — higher is better.":explorerAbsolute&&inv?"Sorted by raw time — fastest first.":explorerAbsolute?"Sorted by raw measurement.":"Sorted by position-relative percentile — how each player compares to historical combine data at their position. Toggle to absolute to see raw measurements."}
                <span onClick={()=>setExplorerLeaderInfo(false)} style={{fontFamily:mono,fontSize:9,color:"#a3a3a3",cursor:"pointer",marginLeft:6}}>dismiss</span>
              </div>}
              <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,overflow:"hidden"}}>
                <div style={{display:"flex",alignItems:"center",gap:4,padding:"8px 12px",borderBottom:"1px solid #f5f5f5",flexWrap:"wrap"}}>
                  <span onClick={gateAuth(()=>setExplorerLeaderPos(null))} style={{fontFamily:mono,fontSize:8,fontWeight:700,color:!explorerLeaderPos?"#fff":"#525252",background:!explorerLeaderPos?"#525252":"#f5f5f4",padding:"2px 6px",borderRadius:4,cursor:"pointer",transition:"all 0.15s"}}>ALL</span>
                  {explorerData.groups.map(g=>{const gc=POS_COLORS[g]||"#525252";const active=explorerLeaderPos===g;return<span key={g} onClick={gateAuth(()=>setExplorerLeaderPos(active?null:g))} style={{fontFamily:mono,fontSize:8,fontWeight:700,color:active?"#fff":gc,background:active?gc:gc+"0d",padding:"2px 5px",borderRadius:4,cursor:"pointer",border:`1px solid ${active?gc:gc+"22"}`,transition:"all 0.15s"}}>{g}</span>;})}
                </div>
                {top10.map((pt,i)=>{const c=POS_COLORS[pt.pos]||POS_COLORS[pt.group]||"#525252";const p=PROSPECTS.find(pr=>pr.id===pt.id);
                  return<div key={pt.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 12px",borderBottom:i<9?"1px solid #f5f5f5":"none",cursor:"pointer"}} onClick={()=>{if(p)openProfile(p);}} onMouseEnter={e=>e.currentTarget.style.background="#faf9f6"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <span style={{fontFamily:mono,fontSize:10,color:i<3?"#171717":"#a3a3a3",fontWeight:i<3?700:400,width:18,textAlign:"right"}}>{i+1}</span>
                    <SchoolLogo school={pt.school} size={20}/>
                    <span style={{fontFamily:sans,fontSize:12,fontWeight:600,color:"#171717",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{pt.name}</span>
                    <span style={{fontFamily:mono,fontSize:9,fontWeight:700,color:c,background:c+"0d",padding:"2px 6px",borderRadius:4}}>{pt.group}</span>
                    <span style={{fontFamily:mono,fontSize:12,fontWeight:700,color:"#171717",width:52,textAlign:"right"}}>{fmtVal(pt)}</span>
                  </div>;
                })}
              </div>
            </div>
            {/* Position Averages */}
            <div style={{flex:"1 1 280px",minWidth:240}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
                <span style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase"}}>{(mc||sc)&&!explorerAbsolute?"vs position history":"position averages"}</span>
                <span onClick={()=>setExplorerAvgInfo(v=>!v)} style={{fontFamily:sans,fontSize:9,color:"#a3a3a3",background:"#f5f5f4",borderRadius:99,width:14,height:14,display:"inline-flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,border:"1px solid #e5e5e5"}}>?</span>
              </div>
              {explorerAvgInfo&&<div style={{fontFamily:sans,fontSize:11,color:"#525252",background:"#faf9f6",border:"1px solid #e5e5e5",borderRadius:8,padding:"8px 12px",marginBottom:8,lineHeight:1.5}}>
                {sc?sc==="breakout_year"?"Average breakout year for each position group — earlier is better.":explorerAbsolute?"Average raw stat value for each position group.":"Average historical percentile for each position group — compared to 10 years of college data.":!mc?"Average scouting trait score for each position group.":mc&&!explorerAbsolute?"How this draft class compares to historical combine data at each position. 50 is average — bars to the right mean this class outperforms history, bars to the left mean they trail. Does not compare positions against each other.":explorerAbsolute&&inv?"Average raw time for each position group — lower is faster.":"Average measurement for each position group."}
                <span onClick={()=>setExplorerAvgInfo(false)} style={{fontFamily:mono,fontSize:9,color:"#a3a3a3",cursor:"pointer",marginLeft:6}}>dismiss</span>
              </div>}
              <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"12px 16px"}}>
                {(mc||sc)&&!explorerAbsolute&&<div style={{position:"relative",height:10,marginBottom:6}}>
                  <span style={{position:"absolute",left:"50%",top:-1,transform:"translateX(-50%)",fontFamily:mono,fontSize:7,color:"#a3a3a3"}}>50</span>
                </div>}
                {avgEntries.map(([pos,{avg,count}],i)=>{const c=POS_COLORS[pos]||"#525252";
                  const isDiverging=(mc||(sc&&sc!=="breakout_year"))&&!explorerAbsolute;
                  const delta=avg-50;
                  const barPct=isDiverging?Math.min(Math.abs(delta),50)/50*50:((avg-barMin)/barRange)*100;
                  const fmtAvg=sc?(sc==="breakout_year"?avg.toFixed(1):DECIMAL_STATS.has(sc)?avg.toFixed(sc.endsWith("_PCT")||sc.endsWith("_DOM")?1:2):Math.round(avg)):inv?avg.toFixed(2)+"s":mc&&explorerAbsolute?(mc==="VRT"||mc==="BRD"?avg.toFixed(1)+'"':avg.toFixed(2)+"s"):null;
                  return<div key={pos} style={{marginBottom:i<avgEntries.length-1?8:0}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <span style={{fontFamily:mono,fontSize:10,fontWeight:700,color:c}}>{pos}</span>
                        <span style={{fontFamily:mono,fontSize:8,color:"#a3a3a3"}}>{count}</span>
                      </div>
                      {isDiverging?<span style={{fontFamily:mono,fontSize:10,fontWeight:700,color:delta>=0?"#16a34a":"#dc2626"}}>{delta>=0?"+":""}{Math.round(delta)}</span>
                      :<span style={{fontFamily:mono,fontSize:10,fontWeight:700,color:"#171717"}}>{fmtAvg!=null?fmtAvg:Math.round(avg)}</span>}
                    </div>
                    {isDiverging?<div style={{height:6,background:"#f5f5f4",borderRadius:3,position:"relative"}}>
                      <div style={{position:"absolute",left:"50%",top:0,bottom:0,width:1,background:"#d4d4d4"}}/>
                      {delta>=0?<div style={{position:"absolute",left:"50%",top:0,height:"100%",width:`${barPct}%`,background:c,borderRadius:"0 3px 3px 0",transition:"width 0.3s"}}/>
                      :<div style={{position:"absolute",right:"50%",top:0,height:"100%",width:`${barPct}%`,background:c,borderRadius:"3px 0 0 3px",opacity:0.5,transition:"width 0.3s"}}/>}
                    </div>
                    :<div style={{height:6,background:"#f5f5f4",borderRadius:3,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${Math.max(8,barPct)}%`,background:c,borderRadius:3,transition:"width 0.3s"}}/>
                    </div>}
                  </div>;
                })}
              </div>
            </div>
          </div>;
        })()}



        {/* Tooltip — beeswarm modes */}
        {explorerMode!=="combo"&&explorerMode!=="scarcity"&&explorerMode!=="free-agency"&&explorerMode!=="scheme-fit"&&explorerMode!=="madness"&&explorerHover&&<div style={{position:"fixed",left:Math.min(explorerHover.cx+12,window.innerWidth-180),top:Math.max(explorerHover.cy-60,8),background:"#171717",color:"#fff",padding:"8px 12px",borderRadius:10,fontFamily:sans,fontSize:12,pointerEvents:"none",zIndex:9999,boxShadow:"0 4px 12px rgba(0,0,0,0.3)",maxWidth:200}}>
          <div style={{fontWeight:700}}>{explorerHover.name}</div>
          <div style={{fontSize:10,color:"#a3a3a3",marginTop:1}}>{explorerHover.school}</div>
          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:4}}>
            <span style={{fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:4,background:POS_COLORS[explorerHover.pos]||"#525252",color:"#fff"}}>{explorerHover.group}</span>
            <span style={{fontFamily:mono,fontSize:12,fontWeight:700}}>{(()=>{const mc=explorerHover.measCode;const sc=explorerHover.statCode;const dv=explorerHover.displayVal;if(sc){if(sc==="breakout_year")return dv;const suffix=sc.endsWith("_DOM")||sc.endsWith("_PCT")?"%":"";if(DECIMAL_STATS.has(sc))return(typeof dv==="number"?dv.toFixed(sc.endsWith("_PCT")||sc.endsWith("_DOM")?1:2):dv)+suffix;return(typeof dv==="number"?Math.round(dv):dv)+suffix;}if(!mc)return explorerHover.val;if(mc==="HT")return formatHeight(dv);if(mc==="WT")return dv+" lbs";if(mc==="ARM"||mc==="HND"||mc==="WING")return dv+'"';if(mc==="40"||mc==="3C"||mc==="SHT")return dv+"s";return dv!=null?dv:explorerHover.val;})()}</span>
            {explorerHover.statCode?.endsWith("_DOM")&&<div style={{fontSize:9,color:"#a3a3a3",marginTop:2}}>{(()=>{const sc=explorerHover.statCode;const g=explorerHover.group;if(sc==="passing_DOM")return"share of team passing yds + TDs";if(sc==="rushing_DOM")return"share of team rushing yds + TDs";if(sc==="receiving_DOM")return"share of team receiving yds + TDs";if(sc==="defensive_DOM"){if(g==="EDGE")return"pressure share (sacks + hurries)";if(g==="DL")return"TFL share of team";if(g==="LB")return"tackle impact (tkl + TFL + sacks)";if(g==="CB")return"coverage share (INT + PD)";if(g==="S")return"playmaker share (INT + PD + tkl)";}return"share of team production";})()}</div>}
          </div>
        </div>}
        {/* Tooltip — combo mode */}
        {explorerMode==="combo"&&explorerHover&&<div style={{position:"fixed",left:Math.min(explorerHover.cx+12,window.innerWidth-200),top:Math.max(explorerHover.cy-80,8),background:"#171717",color:"#fff",padding:"8px 12px",borderRadius:10,fontFamily:sans,fontSize:12,pointerEvents:"none",zIndex:9999,boxShadow:"0 4px 12px rgba(0,0,0,0.3)",maxWidth:220}}>
          <div style={{fontWeight:700}}>{explorerHover.name}</div>
          <div style={{fontSize:10,color:"#a3a3a3",marginTop:1}}>{explorerHover.school}</div>
          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:4}}>
            <span style={{fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:4,background:POS_COLORS[explorerHover.pos]||"#525252",color:"#fff"}}>{explorerHover.group}</span>
          </div>
          <div style={{marginTop:6,display:"flex",flexDirection:"column",gap:2}}>
            <div style={{display:"flex",justifyContent:"space-between",gap:8}}><span style={{fontSize:10,color:"#a3a3a3"}}>{comboData.xMeta?.label||"X"}</span><span style={{fontFamily:mono,fontSize:11,fontWeight:700}}>{(()=>{const v=explorerHover.x;return typeof v==="number"?(Math.abs(v)<10?v.toFixed(2):Math.abs(v)<100?v.toFixed(1):Math.round(v)):v;})()}</span></div>
            <div style={{display:"flex",justifyContent:"space-between",gap:8}}><span style={{fontSize:10,color:"#a3a3a3"}}>{comboData.yMeta?.label||"Y"}</span><span style={{fontFamily:mono,fontSize:11,fontWeight:700}}>{(()=>{const v=explorerHover.y;return typeof v==="number"?(Math.abs(v)<10?v.toFixed(2):Math.abs(v)<100?v.toFixed(1):Math.round(v)):v;})()}</span></div>
          </div>
        </div>}
        {/* Scarcity mode */}
        {explorerMode==="scarcity"&&(()=>{
          // --- Data computation with draft consumption ---
          const roundLabels=["Pre-Draft","After R1","After R2","After R3","After R4","After R5","After R6","After R7"];
          const teamPicks=scarcityTeam?DRAFT_ORDER.filter(d=>d.team===scarcityTeam):[];
          const maxStops=scarcityTeam?teamPicks.length:7;
          const clampedPick=Math.min(scarcityPick,maxStops);
          const consumeCount=scarcityTeam?(clampedPick===0?0:teamPicks[clampedPick-1].pick-1):(ROUND_BOUNDS[clampedPick]||0);
          const allSorted=[...PROSPECTS].sort((a,b)=>getConsensusRank(a.name)-getConsensusRank(b.name));
          const consumedSet=new Set(allSorted.slice(0,consumeCount).map(p=>p.id));

          const scarcityData=EXPLORER_GROUPS.map(pos=>{
            const allAtPos=byPos[pos]||[];
            const remaining=allAtPos.filter(p=>!consumedSet.has(p.id));
            const qualityCount=remaining.filter(p=>getScoutingGrade(p.id)>=60).length;
            // Demand is always league-wide (stable axes)
            let demandTeams=0,totalUrgency=0;
            const teamUrgencies=[];
            Object.entries(TEAM_NEEDS_COUNTS).forEach(([team,teamMap])=>{
              const u=teamMap[pos]||0;
              if(u>0){demandTeams++;totalUrgency+=u;teamUrgencies.push({team,u});}
            });
            teamUrgencies.sort((a,b)=>b.u-a.u);
            const teamUrgencyLevel=scarcityTeam?(TEAM_NEEDS_COUNTS[scarcityTeam]||{})[pos]||0:null;
            return{pos,supply:remaining.length,demandTeams,totalUrgency,qualityCount,topTeams:teamUrgencies.slice(0,3),teamUrgencyLevel,allAtPos,remaining};
          });

          const maxQ=Math.max(...scarcityData.map(d=>d.qualityCount),1);
          const maxD=Math.max(...scarcityData.map(d=>d.demandTeams),1);
          const meanQ=scarcityData.reduce((s,d)=>s+d.qualityCount,0)/scarcityData.length;
          const meanD=scarcityData.reduce((s,d)=>s+d.demandTeams,0)/scarcityData.length;
          const maxUrg=Math.max(...scarcityData.map(d=>d.totalUrgency),1);
          const W=Math.min(860,window.innerWidth-32),H=380;
          const pad={top:30,right:30,bottom:50,left:50};
          const cw=W-pad.left-pad.right,ch=H-pad.top-pad.bottom;
          const sx=d=>(d.qualityCount/maxQ)*cw;
          const sy=d=>ch-(d.demandTeams/maxD)*ch;
          const sr=d=>8+((d.totalUrgency/maxUrg)*18);
          const meanPxX=(meanQ/maxQ)*cw;
          const meanPxY=ch-(meanD/maxD)*ch;

          // Summary card sort
          const sorted=scarcityTeam
            ?[...scarcityData].filter(d=>d.teamUrgencyLevel>0).sort((a,b)=>b.teamUrgencyLevel-a.teamUrgencyLevel||(b.demandTeams/(b.qualityCount||1))-(a.demandTeams/(a.qualityCount||1)))
            :[...scarcityData].sort((a,b)=>(b.demandTeams/(b.qualityCount||1))-(a.demandTeams/(a.qualityCount||1)));
          const top3=sorted.slice(0,3);
          const teamColor=scarcityTeam?NFL_TEAM_COLORS[scarcityTeam]||"#171717":null;

          // Drill-down data
          const expandedData=scarcityExpanded?scarcityData.find(d=>d.pos===scarcityExpanded):null;

          return<>
            {/* Team Lens — scrollable pill row */}
            <div className="trait-pills-scroll" style={{display:"flex",gap:4,overflowX:"auto",WebkitOverflowScrolling:"touch",paddingBottom:4,scrollbarWidth:"none",marginBottom:8}}>
              {allTeams.sort().map(t=>{const sel=t===scarcityTeam;const tc=NFL_TEAM_COLORS[t]||"#171717";return<button key={t} onClick={gateAuth(()=>{setScarcityTeam(sel?null:t);setScarcityPick(0);setScarcityExpanded(null);})} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"4px 6px",background:sel?`${tc}15`:"transparent",border:sel?`2px solid ${tc}`:"2px solid transparent",borderRadius:8,cursor:"pointer",flexShrink:0,transition:"all 0.15s"}}><NFLTeamLogo team={t} size={22}/><span style={{fontFamily:mono,fontSize:7,color:sel?tc:"#a3a3a3",fontWeight:sel?700:500}}>{NFL_TEAM_ABR[t]}</span></button>;})}
            </div>

            {/* SVG chart wrapper */}
            <div style={{position:"relative",marginTop:4}}>
              <svg width={W} height={H} style={{display:"block"}}>
                <defs>
                  <pattern id="scarcity-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <line x1="0" y1="0" x2="0" y2="6" stroke="#dc262622" strokeWidth="1"/>
                  </pattern>
                </defs>
                {/* Quadrant backgrounds */}
                <rect x={pad.left} y={pad.top} width={meanPxX} height={meanPxY} fill="url(#scarcity-hatch)"/>
                {/* Quadrant labels */}
                <text x={pad.left+6} y={pad.top+14} style={{fontSize:9,fill:"#dc2626",fontFamily:"monospace",fontWeight:700,textTransform:"uppercase",letterSpacing:1}}>Scarce</text>
                <text x={pad.left+meanPxX+6} y={pad.top+14} style={{fontSize:9,fill:"#737373",fontFamily:"monospace",fontWeight:700,textTransform:"uppercase",letterSpacing:1}}>Competitive</text>
                <text x={pad.left+6} y={pad.top+meanPxY+14} style={{fontSize:9,fill:"#a3a3a3",fontFamily:"monospace",fontWeight:700,textTransform:"uppercase",letterSpacing:1}}>Niche</text>
                <text x={pad.left+meanPxX+6} y={pad.top+meanPxY+14} style={{fontSize:9,fill:"#059669",fontFamily:"monospace",fontWeight:700,textTransform:"uppercase",letterSpacing:1}}>Deep</text>
                {/* Mean lines */}
                <line x1={pad.left+meanPxX} y1={pad.top} x2={pad.left+meanPxX} y2={pad.top+ch} stroke="#d4d4d4" strokeWidth={1} strokeDasharray="4,3"/>
                <line x1={pad.left} y1={pad.top+meanPxY} x2={pad.left+cw} y2={pad.top+meanPxY} stroke="#d4d4d4" strokeWidth={1} strokeDasharray="4,3"/>
                {/* Axes */}
                <line x1={pad.left} y1={pad.top+ch} x2={pad.left+cw} y2={pad.top+ch} stroke="#e5e5e5" strokeWidth={1}/>
                <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top+ch} stroke="#e5e5e5" strokeWidth={1}/>
                {/* X-axis label */}
                <text x={pad.left+cw/2} y={H-6} textAnchor="middle" style={{fontSize:10,fill:"#737373",fontFamily:"monospace"}}>Draftable Prospects</text>
                {/* Y-axis label */}
                <text x={12} y={pad.top+ch/2} textAnchor="middle" transform={`rotate(-90,12,${pad.top+ch/2})`} style={{fontSize:10,fill:"#737373",fontFamily:"monospace"}}>Teams With Need</text>
                {/* X ticks */}
                {[0,0.25,0.5,0.75,1].map(f=>{const xp=pad.left+f*cw;const v=Math.round(f*maxQ);return<g key={f}><line x1={xp} y1={pad.top+ch} x2={xp} y2={pad.top+ch+4} stroke="#d4d4d4"/><text x={xp} y={pad.top+ch+16} textAnchor="middle" style={{fontSize:9,fill:"#a3a3a3",fontFamily:"monospace"}}>{v}</text></g>;})}
                {/* Y ticks */}
                {[0,0.25,0.5,0.75,1].map(f=>{const yp=pad.top+ch-f*ch;const v=Math.round(f*maxD);return<g key={f}><line x1={pad.left-4} y1={yp} x2={pad.left} y2={yp} stroke="#d4d4d4"/><text x={pad.left-8} y={yp+3} textAnchor="end" style={{fontSize:9,fill:"#a3a3a3",fontFamily:"monospace"}}>{v}</text></g>;})}
                {/* Bubbles */}
                {scarcityData.map(d=>{
                  const cx=pad.left+sx(d),cy=pad.top+sy(d),r=sr(d),c=POS_COLORS[d.pos]||"#525252";
                  const isNeed=scarcityTeam?d.teamUrgencyLevel>0:true;
                  const isExpanded=d.pos===scarcityExpanded;
                  const opacity=scarcityTeam?(isNeed?1:0.15):1;
                  const ringStyle=scarcityTeam&&isNeed?{stroke:teamColor,strokeWidth:3,strokeDasharray:d.teamUrgencyLevel>=3?"none":d.teamUrgencyLevel>=2?"6,3":"2,3"}:null;
                  return<g key={d.pos}
                    onClick={gateAuth(()=>setScarcityExpanded(prev=>prev===d.pos?null:d.pos))}
                    onMouseEnter={e=>setExplorerHover({pos:d.pos,qualityCount:d.qualityCount,demandTeams:d.demandTeams,totalUrgency:d.totalUrgency,topTeams:d.topTeams,teamUrgencyLevel:d.teamUrgencyLevel,cx:e.clientX,cy:e.clientY})}
                    onMouseLeave={()=>setExplorerHover(null)}
                    style={{cursor:"pointer",opacity,transition:"opacity 0.2s"}}>
                    {isExpanded&&<circle cx={cx} cy={cy} r={r+5} fill="none" stroke={c} strokeWidth={1.5} strokeDasharray="4,3"/>}
                    {ringStyle&&<circle cx={cx} cy={cy} r={r+3} fill="none" {...ringStyle}/>}
                    <circle cx={cx} cy={cy} r={r} fill={c+"22"} stroke={c} strokeWidth={2} style={{transition:"cx 0.3s,cy 0.3s,r 0.3s"}}/>
                    <text x={cx} y={cy+1} textAnchor="middle" dominantBaseline="middle" style={{fontSize:Math.max(8,r*0.7),fill:c,fontFamily:"monospace",fontWeight:700,pointerEvents:"none"}}>{d.pos}</text>
                  </g>;})}
              </svg>
              {/* Center watermark */}
              <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",display:"flex",alignItems:"center",gap:0,opacity:0.06,pointerEvents:"none"}}>
                <img src="/logo.png" alt="" style={{height:60,width:"auto"}}/>
                <span style={{fontFamily:font,fontSize:32,fontWeight:900,color:"#171717",letterSpacing:-1,marginLeft:-6}}>bigboardlab.com</span>
              </div>
              {/* Bottom-right logo */}
              <div style={{display:"flex",justifyContent:"flex-end",alignItems:"center",gap:5,marginTop:2,paddingRight:4}}>
                <img src="/logo.png" alt="" style={{height:12,width:"auto"}}/>
                <span style={{fontFamily:mono,fontSize:8,fontWeight:600,color:"#171717",letterSpacing:0.3}}>bigboardlab.com</span>
              </div>

              {/* Draft Progress Slider */}
              {(()=>{
                const handlePct=maxStops===0?0:(clampedPick/maxStops)*100;
                // Status label
                let statusLabel;
                if(scarcityTeam&&clampedPick>0){
                  const tp=teamPicks[clampedPick-1];
                  statusLabel=`OTC Rd ${tp.round} · Pick ${tp.pick}`;
                }else if(scarcityTeam){
                  statusLabel="Pre-Draft";
                }else{
                  statusLabel=roundLabels[clampedPick]+(consumeCount>0?` · ${consumeCount} picks`:"");
                }
                return<div style={{margin:"16px 0 4px",padding:"12px 16px",background:"#f9fafb",border:"1px solid #e5e5e5",borderRadius:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <span style={{fontSize:14}}>📋</span>
                      <span style={{fontFamily:mono,fontSize:11,fontWeight:900,letterSpacing:1,color:"#171717",textTransform:"uppercase"}}>Draft Simulator</span>
                    </div>
                    <span style={{fontFamily:mono,fontSize:12,fontWeight:700,color:"#059669",background:"#05966915",padding:"3px 10px",borderRadius:99}}>{statusLabel}</span>
                  </div>
                  <div style={{position:"relative",height:32,display:"flex",alignItems:"center",padding:"0 10px"}}>
                    {/* Track bg */}
                    <div style={{position:"absolute",left:10,right:10,height:8,background:"#e5e7eb",borderRadius:4}}/>
                    {/* Fill */}
                    <div style={{position:"absolute",left:10,right:10,height:8,borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",width:`${handlePct}%`,background:"linear-gradient(90deg, #059669, #34d399)",borderRadius:4,transition:"width 0.15s cubic-bezier(.4,1.3,.65,1)"}}/></div>
                    {/* Team pick dots — each is a stop */}
                    {scarcityTeam&&teamPicks.map((d,i)=>{const stopIdx=i+1;const pct=(stopIdx/maxStops)*100;const past=stopIdx<clampedPick;const current=stopIdx===clampedPick;return<div key={d.pick} style={{position:"absolute",left:`${pct}%`,top:"50%",transform:"translate(-50%,-50%)",width:current?0:past?6:10,height:current?0:past?6:10,borderRadius:"50%",background:past?"#059669":teamColor,border:past?"none":`2px solid ${teamColor}`,boxShadow:past?"none":"0 0 0 2px #fff",zIndex:2,pointerEvents:"none",transition:"all 0.15s cubic-bezier(.4,1.3,.65,1)"}} title={`Pick ${d.pick} (Rd ${d.round})${d.from?" from "+d.from:""}`}/>;
                    })}
                    {/* Round boundary ticks — no team mode */}
                    {!scarcityTeam&&[0,1,2,3,4,5,6,7].map(i=>{const pct=(i/7)*100;const past=i<clampedPick;const current=i===clampedPick;return<div key={i} style={{position:"absolute",left:`${pct}%`,top:"50%",width:current?0:past?6:8,height:current?0:past?6:8,borderRadius:"50%",background:past?"#059669":"#d4d4d4",transform:"translate(-50%,-50%)",pointerEvents:"none",zIndex:2,transition:"all 0.15s cubic-bezier(.4,1.3,.65,1)"}}/>;
                    })}
                    {/* Pre-draft dot */}
                    <div style={{position:"absolute",left:"0%",top:"50%",width:clampedPick===0?0:6,height:clampedPick===0?0:6,borderRadius:"50%",background:"#059669",transform:"translate(-50%,-50%)",pointerEvents:"none",zIndex:2,transition:"all 0.15s cubic-bezier(.4,1.3,.65,1)"}}/>
                    {/* Drag handle */}
                    <div style={{position:"absolute",left:`${handlePct}%`,top:"50%",transform:"translate(-50%,-50%)",width:22,height:22,borderRadius:"50%",background:"#fff",border:"3px solid #059669",boxShadow:"0 2px 8px rgba(0,0,0,0.18)",zIndex:3,pointerEvents:"none",transition:"left 0.15s cubic-bezier(.4,1.3,.65,1)"}}/>
                    {/* Invisible input */}
                    <input type="range" min="0" max={maxStops} step="1" value={clampedPick}
                      onChange={e=>{if(isGuest){onRequireAuth("want to play with the data? sign up free");return;}setScarcityPick(parseInt(e.target.value));setScarcityExpanded(null);}}
                      style={{position:"absolute",left:0,width:"100%",height:32,background:"transparent",cursor:"pointer",zIndex:5,opacity:0,margin:0}}/>
                  </div>
                  {/* Tick labels */}
                  {scarcityTeam?<div style={{display:"flex",justifyContent:"space-between",marginTop:4,padding:"0 10px"}}>
                    <span style={{fontFamily:mono,fontSize:9,color:clampedPick===0?"#059669":"#a3a3a3",fontWeight:clampedPick===0?700:400}}>Pre</span>
                    {teamPicks.length<=12?teamPicks.map((d,i)=>{const stopIdx=i+1;return<span key={d.pick} style={{fontFamily:mono,fontSize:8,color:stopIdx<=clampedPick?"#059669":"#a3a3a3",fontWeight:stopIdx===clampedPick?700:400,textAlign:"center"}}>{d.round}.{String(d.pick).slice(-2)}</span>;}):<div style={{flex:1,display:"flex",justifyContent:"space-between",marginLeft:8}}>
                      {[1,2,3,4,5,6,7].map(rd=>{const first=teamPicks.find(d=>d.round===rd);if(!first)return null;const stopIdx=teamPicks.indexOf(first)+1;return<span key={rd} style={{fontFamily:mono,fontSize:9,color:stopIdx<=clampedPick?"#059669":"#a3a3a3",fontWeight:400}}>R{rd}</span>;})}
                    </div>}
                  </div>:<div style={{display:"flex",justifyContent:"space-between",marginTop:4,padding:"0 10px"}}>
                    {["Pre","R1","R2","R3","R4","R5","R6","R7"].map((l,i)=><span key={l} style={{fontFamily:mono,fontSize:9,color:i<=clampedPick?"#059669":"#a3a3a3",fontWeight:i===clampedPick?700:400,textAlign:"center"}}>{l}</span>)}
                  </div>}
                  {scarcityTeam&&clampedPick>0&&<div style={{marginTop:6,fontFamily:mono,fontSize:9,color:"#a3a3a3"}}>
                    {teamPicks.length-clampedPick} picks remaining{clampedPick<teamPicks.length?` · next: pick ${teamPicks[clampedPick].pick}`:""}
                  </div>}
                </div>;
              })()}

              {/* Tooltip */}
              {explorerHover&&explorerHover.pos&&<div style={{position:"fixed",left:Math.min(explorerHover.cx+12,window.innerWidth-220),top:Math.max(explorerHover.cy-90,8),background:"#171717",color:"#fff",padding:"10px 14px",borderRadius:10,fontFamily:sans,fontSize:12,pointerEvents:"none",zIndex:9999,boxShadow:"0 4px 12px rgba(0,0,0,0.3)",maxWidth:220}}>
                <div style={{fontWeight:700,marginBottom:4}}>{POS_EMOJI[explorerHover.pos]} {explorerHover.pos}</div>
                <div style={{fontSize:11,color:"#d4d4d4",lineHeight:1.6}}>
                  <div>{explorerHover.qualityCount} draftable prospects{scarcityPick>0?" remaining":""}</div>
                  <div>{explorerHover.demandTeams} teams need it</div>
                  <div style={{fontSize:10,color:"#a3a3a3"}}>total urgency: {explorerHover.totalUrgency}</div>
                </div>
                {scarcityTeam&&explorerHover.teamUrgencyLevel!=null?<div style={{marginTop:6,borderTop:"1px solid #333",paddingTop:6}}>
                  <div style={{fontSize:10,color:"#d4d4d4"}}>{scarcityTeam}: {explorerHover.teamUrgencyLevel>=3?"Critical need":explorerHover.teamUrgencyLevel>=2?"Important":"Depth need"} <span style={{color:explorerHover.teamUrgencyLevel>=3?"#f87171":explorerHover.teamUrgencyLevel>=2?"#fbbf24":"#a3a3a3"}}>{"●".repeat(explorerHover.teamUrgencyLevel)}</span></div>
                </div>:explorerHover.topTeams.length>0&&<div style={{marginTop:6,borderTop:"1px solid #333",paddingTop:6}}>
                  <div style={{fontSize:9,color:"#a3a3a3",textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>Top Need</div>
                  {explorerHover.topTeams.map(t=><div key={t.team} style={{fontSize:10,color:"#d4d4d4"}}>{t.team} <span style={{color:t.u>=3?"#f87171":t.u>=2?"#fbbf24":"#a3a3a3"}}>{"●".repeat(t.u)}</span></div>)}
                </div>}
                <div style={{fontSize:9,color:"#525252",marginTop:4}}>tap to expand</div>
              </div>}
            </div>

            {/* Summary Cards */}
            <div style={{display:"flex",gap:10,marginTop:16,overflowX:"auto",paddingBottom:4}}>
              {top3.map((d,i)=>{
                const ratio=d.demandTeams/(d.qualityCount||1);
                const isActive=d.pos===scarcityExpanded;
                const c=POS_COLORS[d.pos]||"#525252";
                let tag,tagColor;
                if(scarcityTeam){
                  tag=d.teamUrgencyLevel>=3?"Critical need":d.teamUrgencyLevel>=2?"Important":"Depth need";
                  tagColor=d.teamUrgencyLevel>=3?"#dc2626":d.teamUrgencyLevel>=2?"#ca8a04":"#059669";
                }else{
                  tag=ratio>=2?"High scarcity":ratio>=1?"Moderate":"Well-stocked";
                  tagColor=ratio>=2?"#dc2626":ratio>=1?"#ca8a04":"#059669";
                }
                return<div key={d.pos} onClick={gateAuth(()=>setScarcityExpanded(prev=>prev===d.pos?null:d.pos))} style={{flex:"1 0 0",minWidth:140,background:"#fff",border:isActive?`2px solid ${c}`:"1px solid #e5e5e5",borderRadius:12,padding:"14px 16px",position:"relative",overflow:"hidden",cursor:"pointer",transition:"border 0.15s"}}>
                  <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:c}}/>
                  <div style={{fontFamily:mono,fontSize:14,fontWeight:900,color:c,marginBottom:4}}>{POS_EMOJI[d.pos]} {d.pos}</div>
                  <div style={{fontFamily:sans,fontSize:11,color:"#525252",lineHeight:1.5}}>{d.demandTeams} teams need · {d.qualityCount} draftable</div>
                  <div style={{marginTop:6}}><span style={{fontFamily:mono,fontSize:9,fontWeight:700,color:tagColor,background:tagColor+"18",border:`1px solid ${tagColor}44`,borderRadius:99,padding:"2px 8px",textTransform:"uppercase",letterSpacing:0.5}}>{tag}</span></div>
                </div>;})}
            </div>

            {/* Drill-Down Panel */}
            {expandedData&&(()=>{
              const allProspects=[...expandedData.allAtPos].sort((a,b)=>getConsensusRank(a.name)-getConsensusRank(b.name));
              const availableCount=expandedData.remaining.length;
              const draftedCount=expandedData.allAtPos.length-availableCount;
              const ec=POS_COLORS[scarcityExpanded]||"#525252";
              return<div style={{marginTop:12,background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,overflow:"hidden"}}>
                <div style={{position:"sticky",top:0,zIndex:2,background:"#fff",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",borderBottom:"1px solid #f0f0f0"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:16}}>{POS_EMOJI[scarcityExpanded]}</span>
                    <span style={{fontFamily:mono,fontSize:13,fontWeight:900,color:ec}}>{scarcityExpanded}</span>
                    <span style={{fontFamily:mono,fontSize:10,color:"#a3a3a3"}}>{availableCount} available{draftedCount>0?` · ${draftedCount} drafted`:""}</span>
                  </div>
                  <button onClick={()=>setScarcityExpanded(null)} style={{fontFamily:sans,fontSize:11,color:"#a3a3a3",background:"none",border:"1px solid #e5e5e5",borderRadius:99,padding:"2px 10px",cursor:"pointer"}}>close ✕</button>
                </div>
                <div style={{maxHeight:400,overflowY:"auto"}}>
                  {allProspects.map((p,i)=>{
                    const consumed=consumedSet.has(p.id);
                    const cr=getConsensusRound(p.name);
                    return<div key={p.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 14px",borderBottom:i<allProspects.length-1?"1px solid #f5f5f5":"none",opacity:consumed?0.35:1,textDecoration:consumed?"line-through":"none",cursor:consumed?"default":"pointer"}}
                      onClick={()=>{if(!consumed){const pr=PROSPECTS.find(x=>x.id===p.id);if(pr)openProfile(pr);}}}
                      onMouseEnter={e=>{if(!consumed)e.currentTarget.style.background="#faf9f6";}}
                      onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}>
                      <span style={{fontFamily:mono,fontSize:10,color:"#a3a3a3",width:20,textAlign:"right",flexShrink:0}}>#{i+1}</span>
                      <SchoolLogo school={p.school} size={20}/>
                      <span style={{fontFamily:sans,fontSize:12,fontWeight:600,color:"#171717",flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</span>
                      <span style={{fontFamily:mono,fontSize:8,fontWeight:700,padding:"2px 6px",borderRadius:4,background:cr.bg,color:cr.fg,flexShrink:0}}>{cr.label}</span>
                    </div>;
                  })}
                </div>
              </div>;
            })()}
          </>;
        })()}

        {/* Scheme Fit mode */}
        {explorerMode==="scheme-fit"&&(()=>{
          const SF_GROUPS=EXPLORER_GROUPS;
          const teamFits=sfTeam?schemeFits[sfTeam]:null;

          // Team logo row
          const teamRow=<div className="trait-pills-scroll" style={{display:"flex",gap:4,overflowX:"auto",WebkitOverflowScrolling:"touch",paddingBottom:4,scrollbarWidth:"none",marginBottom:8}}>
            {allTeams.sort().map(t=>{const sel=sfTeam===t;const tc=NFL_TEAM_COLORS[t]||"#171717";return<button key={t} onClick={gateAuth(()=>{setSfTeam(sel?null:t);setExplorerHover(null);})} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"4px 6px",background:sel?`${tc}15`:"transparent",border:sel?`2px solid ${tc}`:"2px solid transparent",borderRadius:8,cursor:"pointer",flexShrink:0}}><NFLTeamLogo team={t} size={22}/><span style={{fontFamily:mono,fontSize:7,color:sel?tc:"#a3a3a3",fontWeight:sel?700:500}}>{NFL_TEAM_ABR[t]||t}</span></button>;})}
          </div>;

          // Position pills
          const posPills=<div style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:6,WebkitOverflowScrolling:"touch",scrollbarWidth:"none",marginBottom:4}}>
            <button onClick={gateAuth(()=>{setSfPosFilter(null);setSfArchetype(null);setExplorerHover(null);})} style={{fontFamily:mono,fontSize:10,fontWeight:700,padding:"5px 12px",background:!sfPosFilter?"#171717":"transparent",color:!sfPosFilter?"#fff":"#737373",border:!sfPosFilter?"1px solid #171717":"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>ALL</button>
            {SF_GROUPS.map(pos=>{const c=POS_COLORS[pos]||"#525252";const active=sfPosFilter===pos;const needLevel=sfTeam?(TEAM_NEEDS_COUNTS[sfTeam]?.[pos]||0):0;const needDot=needLevel>=3?"#dc2626":needLevel>=2?"#f59e0b":null;return<button key={pos} onClick={gateAuth(()=>{setSfPosFilter(active?null:pos);setSfArchetype(null);setExplorerHover(null);})} style={{fontFamily:mono,fontSize:10,fontWeight:700,padding:"5px 12px",background:active?c:"transparent",color:active?"#fff":c,border:`1.5px solid ${active?c:c+"33"}`,borderRadius:99,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,display:"flex",alignItems:"center",gap:4}}>{needDot&&<span style={{width:5,height:5,borderRadius:"50%",background:active?"rgba(255,255,255,0.8)":needDot,flexShrink:0,display:"inline-block"}}/>}{pos}</button>;})}
          </div>;

          if(!sfTeam){
            return<>{teamRow}<div style={{textAlign:"center",padding:"60px 20px"}}><p style={{fontFamily:sans,fontSize:14,color:"#a3a3a3"}}>select a team to see scheme fit landscape</p></div></>;
          }

          if(!sfPosFilter){
            // === Aggregate Bubble View ===
            const agg=SF_GROUPS.map(pos=>{
              const atPos=PROSPECTS.filter(p=>{const g=p.gpos||p.pos;return g===pos&&g!=="K/P";});
              if(!atPos.length||!teamFits)return null;
              const scores=atPos.map(p=>({p,score:teamFits[p.id]?.score||0}));
              const fitCount=scores.filter(s=>s.score>=75).length;
              const avgScore=Math.round(scores.reduce((s,x)=>s+x.score,0)/scores.length);
              const best=scores.sort((a,b)=>b.score-a.score)[0];
              return{pos,count:fitCount,total:atPos.length,avgScore,topScore:best.score,topName:best.p.name,pctFit:Math.round((fitCount/atPos.length)*100)};
            }).filter(Boolean);

            const xVals=agg.map(d=>d.count);
            const yVals=agg.map(d=>d.avgScore);
            const xMin=Math.min(...xVals),xMax=Math.max(...xVals,1);
            const yMin=Math.min(...yVals),yMax=Math.max(...yVals,1);
            const xRange=xMax-xMin||1,yRange=yMax-yMin||1;
            const meanX=xVals.reduce((s,v)=>s+v,0)/agg.length;
            const meanY=yVals.reduce((s,v)=>s+v,0)/agg.length;
            const W=Math.min(860,window.innerWidth-32),H=380;
            const pad={top:30,right:30,bottom:50,left:60};
            const cw=W-pad.left-pad.right,ch=H-pad.top-pad.bottom;
            const sx=d=>((d.count-xMin)/xRange)*cw;
            const sy=d=>ch-((d.avgScore-yMin)/yRange)*ch;
            const sr=d=>8+((d.count/Math.max(...xVals,1))*16);
            const meanPxX=((meanX-xMin)/xRange)*cw;
            const meanPxY=ch-((meanY-yMin)/yRange)*ch;
            const top3=[...agg].sort((a,b)=>b.count-a.count).slice(0,3);
            const tc=NFL_TEAM_COLORS[sfTeam]||"#6366f1";

            return<>
              {teamRow}
              {posPills}
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
                <NFLTeamLogo team={sfTeam} size={20}/>
                <span style={{fontFamily:sans,fontSize:13,fontWeight:700,color:tc}}>{sfTeam}</span>
                <span style={{fontFamily:mono,fontSize:10,color:"#a3a3a3"}}>scheme fit landscape</span>
              </div>
              <div style={{position:"relative",marginTop:4}}>
                <svg width={W} height={H} style={{display:"block"}}>
                  <defs>
                    <pattern id="sf-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                      <line x1="0" y1="0" x2="0" y2="6" stroke={tc+"22"} strokeWidth="1"/>
                    </pattern>
                  </defs>
                  {/* Top-right quadrant highlight */}
                  <rect x={pad.left+meanPxX} y={pad.top} width={cw-meanPxX} height={meanPxY} fill="url(#sf-hatch)"/>
                  {/* Mean crosshairs */}
                  <line x1={pad.left+meanPxX} y1={pad.top} x2={pad.left+meanPxX} y2={pad.top+ch} stroke="#d4d4d4" strokeWidth={1} strokeDasharray="4,3"/>
                  <line x1={pad.left} y1={pad.top+meanPxY} x2={pad.left+cw} y2={pad.top+meanPxY} stroke="#d4d4d4" strokeWidth={1} strokeDasharray="4,3"/>
                  {/* Axes */}
                  <line x1={pad.left} y1={pad.top+ch} x2={pad.left+cw} y2={pad.top+ch} stroke="#e5e5e5" strokeWidth={1}/>
                  <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top+ch} stroke="#e5e5e5" strokeWidth={1}/>
                  {/* X-axis label */}
                  <text x={pad.left+cw/2} y={H-6} textAnchor="middle" style={{fontSize:10,fill:"#737373",fontFamily:"monospace"}}>Prospects ≥70 Fit (Depth)</text>
                  {/* Y-axis label */}
                  <text x={14} y={pad.top+ch/2} textAnchor="middle" transform={`rotate(-90,14,${pad.top+ch/2})`} style={{fontSize:10,fill:"#737373",fontFamily:"monospace"}}>Avg Scheme Fit</text>
                  {/* X ticks */}
                  {[0,0.25,0.5,0.75,1].map(f=>{const xp=pad.left+f*cw;const v=xMin+f*xRange;return<g key={f}><line x1={xp} y1={pad.top+ch} x2={xp} y2={pad.top+ch+4} stroke="#d4d4d4"/><text x={xp} y={pad.top+ch+16} textAnchor="middle" style={{fontSize:9,fill:"#a3a3a3",fontFamily:"monospace"}}>{Math.round(v)}</text></g>;})}
                  {/* Y ticks */}
                  {[0,0.25,0.5,0.75,1].map(f=>{const yp=pad.top+ch-f*ch;const v=yMin+f*yRange;return<g key={f}><line x1={pad.left-4} y1={yp} x2={pad.left} y2={yp} stroke="#d4d4d4"/><text x={pad.left-8} y={yp+3} textAnchor="end" style={{fontSize:9,fill:"#a3a3a3",fontFamily:"monospace"}}>{Math.round(v)}</text></g>;})}
                  {/* Bubbles */}
                  {agg.map(d=>{
                    const cx=pad.left+sx(d),cy=pad.top+sy(d),r=sr(d),c=POS_COLORS[d.pos]||"#525252";
                    return<g key={d.pos}
                      onClick={gateAuth(()=>setSfPosFilter(d.pos))}
                      onMouseEnter={e=>setExplorerHover({sfBubble:d,cx:e.clientX,cy:e.clientY})}
                      onMouseLeave={()=>setExplorerHover(null)}
                      style={{cursor:"pointer"}}>
                      <circle cx={cx} cy={cy} r={r} fill={c+"38"} stroke={c} strokeWidth={2}/>
                      <text x={cx} y={cy+1} textAnchor="middle" dominantBaseline="middle" style={{fontSize:Math.max(8,r*0.7),fill:c,fontFamily:"monospace",fontWeight:700,pointerEvents:"none"}}>{d.pos}</text>
                    </g>;})}
                </svg>
                {/* Center watermark */}
                <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",display:"flex",alignItems:"center",gap:0,opacity:0.06,pointerEvents:"none"}}>
                  <img src="/logo.png" alt="" style={{height:60,width:"auto"}}/>
                  <span style={{fontFamily:font,fontSize:32,fontWeight:900,color:"#171717",letterSpacing:-1,marginLeft:-6}}>bigboardlab.com</span>
                </div>
                {/* Bottom-right logo */}
                <div style={{display:"flex",justifyContent:"flex-end",alignItems:"center",gap:5,marginTop:2,paddingRight:4}}>
                  <img src="/logo.png" alt="" style={{height:12,width:"auto"}}/>
                  <span style={{fontFamily:mono,fontSize:8,fontWeight:600,color:"#171717",letterSpacing:0.3}}>bigboardlab.com</span>
                </div>

                {/* Bubble tooltip */}
                {explorerHover&&explorerHover.sfBubble&&(()=>{
                  const d=explorerHover.sfBubble;
                  return<div style={{position:"fixed",left:Math.min(explorerHover.cx+12,window.innerWidth-260),top:Math.max(explorerHover.cy-100,8),background:"#171717",color:"#fff",padding:"10px 14px",borderRadius:10,fontFamily:sans,fontSize:12,pointerEvents:"none",zIndex:9999,boxShadow:"0 4px 12px rgba(0,0,0,0.3)",maxWidth:260}}>
                    <div style={{fontWeight:700,marginBottom:4}}>{POS_EMOJI[d.pos]||""} {d.pos}</div>
                    <div style={{fontSize:11,color:"#d4d4d4",lineHeight:1.6}}>
                      <div>{d.count} of {d.total} fit ({d.pctFit}%)</div>
                      <div>Avg score: {d.avgScore}</div>
                      <div>Best: {d.topName} ({d.topScore})</div>
                    </div>
                    <div style={{fontSize:9,color:"#525252",marginTop:4}}>tap to drill down</div>
                  </div>;
                })()}
              </div>

              {/* Summary Cards — Top 3 by count */}
              <div style={{display:"flex",gap:10,marginTop:16,overflowX:"auto",paddingBottom:4}}>
                {top3.map((d,i)=>{
                  const c=POS_COLORS[d.pos]||"#525252";
                  return<div key={d.pos} onClick={gateAuth(()=>setSfPosFilter(d.pos))} style={{flex:"1 0 0",minWidth:140,background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"14px 16px",position:"relative",overflow:"hidden",cursor:"pointer",transition:"border 0.15s"}}>
                    <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:c}}/>
                    <div style={{fontFamily:mono,fontSize:14,fontWeight:900,color:c,marginBottom:4}}>{POS_EMOJI[d.pos]||""} {d.pos}</div>
                    <div style={{fontFamily:sans,fontSize:11,color:"#525252",lineHeight:1.5}}>{d.count} of {d.total} prospects fit · avg {d.avgScore}</div>
                    <div style={{marginTop:6}}><span style={{fontFamily:mono,fontSize:9,fontWeight:700,color:"#6366f1",background:"#6366f118",border:"1px solid #6366f144",borderRadius:99,padding:"2px 8px",textTransform:"uppercase",letterSpacing:0.5}}>best: {d.topName} ({d.topScore})</span></div>
                  </div>;})}
              </div>
            </>;
          }

          // === Individual Prospect Scatter View ===
          const atPos=PROSPECTS.filter(p=>{const g=p.gpos||p.pos;return g===sfPosFilter&&g!=="K/P";});
          const points=atPos.map(p=>{const fit=teamFits?.[p.id];const rank=getConsensusRank(p.name)||999;const sv=sfVision.get(p.id);return{...p,fit:fit?.score||0,tags:fit?.tags||[],rank,sv};});
          const xMin=50,xMax=100;
          const rankedPts=points.filter(d=>d.rank<900);
          const yMin2=1,yMax2=rankedPts.length?Math.max(...rankedPts.map(d=>d.rank)):300;
          const yRange2=yMax2-yMin2||1;
          const W=Math.min(860,window.innerWidth-32),H=380;
          const pad={top:20,right:20,bottom:50,left:60};
          const cw=W-pad.left-pad.right,ch=H-pad.top-pad.bottom;
          const tc=NFL_TEAM_COLORS[sfTeam]||"#0891b2";
          const pc=POS_COLORS[sfPosFilter]||"#525252";
          const dotX=d=>pad.left+((d.fit-xMin)/(xMax-xMin))*cw;
          const dotY=d=>pad.top+((d.rank-yMin2)/yRange2)*ch; // rank 1 at top
          const dotR=d=>d.rank<50?8:d.rank<150?6:4;
          const top10=[...points].sort((a,b)=>b.fit-a.fit).slice(0,10);
          const sfTeamPicks=sfTeam?DRAFT_ORDER.filter(d=>d.team===sfTeam):[];
          const sfClampedSlider=Math.min(sfPickSlider,sfTeamPicks.length);
          const sfCutoffPick=sfClampedSlider>0?(sfTeamPicks[sfClampedSlider-1]?.pick||999):999;

          // Archetype pills for scheme fit scatter (single-select)
          const sfArchPills=(()=>{
            const archTagCounts={};atPos.forEach(p=>{getArchetypes(p.name,p.school).forEach(t=>{archTagCounts[t]=(archTagCounts[t]||0)+1;});});
            const archTags=Object.entries(archTagCounts).sort((a,b)=>b[1]-a[1]).map(([t])=>t);
            if(!archTags.length)return null;
            return<div className="trait-pills-scroll" style={{display:"flex",gap:4,overflowX:"auto",WebkitOverflowScrolling:"touch",flexWrap:"nowrap",scrollbarWidth:"none",alignItems:"center",marginBottom:8}}>
              {archTags.map(tag=>{const active=sfArchetype===tag;return<button key={tag} onClick={()=>setSfArchetype(active?null:tag)} style={{fontFamily:mono,fontSize:9,padding:"3px 8px",background:active?"#171717":"transparent",color:active?"#faf9f6":"#525252",border:"1px solid "+(active?"#171717":"#d4d4d4"),borderRadius:99,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",gap:3,whiteSpace:"nowrap"}}><span>{ARCHETYPE_EMOJI[tag]||""}</span><span>{ARCHETYPE_DISPLAY[tag]||tag}</span><span style={{fontSize:8,opacity:0.7}}>({archTagCounts[tag]})</span></button>;})}
            </div>;
          })();

          return<>
            {teamRow}
            {posPills}
            {sfArchPills}
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
              <NFLTeamLogo team={sfTeam} size={20}/>
              <span style={{fontFamily:sans,fontSize:13,fontWeight:700,color:tc}}>{sfTeam}</span>
              <span style={{fontFamily:mono,fontSize:10,fontWeight:700,color:pc,background:pc+"0d",padding:"2px 8px",borderRadius:4,border:`1px solid ${pc}22`}}>{POS_EMOJI[sfPosFilter]||""} {sfPosFilter}</span>
              <span style={{fontFamily:mono,fontSize:10,color:"#a3a3a3"}}>{points.length} prospects</span>
            </div>

            {points.length===0?<div style={{textAlign:"center",padding:"60px 20px"}}><p style={{fontFamily:sans,fontSize:14,color:"#a3a3a3"}}>no {sfPosFilter} prospects available</p></div>:(
              <div style={{position:"relative",marginTop:4}}>
                <svg width={W} height={H} style={{display:"block"}}>
                  {/* Vertical threshold line at 65 */}
                  <line x1={pad.left+((75-xMin)/(xMax-xMin))*cw} y1={pad.top} x2={pad.left+((75-xMin)/(xMax-xMin))*cw} y2={pad.top+ch} stroke="#0891b2" strokeWidth={1} strokeDasharray="6,4" opacity={0.4}/>
                  <text x={pad.left+((75-xMin)/(xMax-xMin))*cw} y={pad.top-6} textAnchor="middle" style={{fontSize:8,fill:"#0891b2",fontFamily:"monospace",opacity:0.6}}>fit threshold (75)</text>
                  {/* Axes */}
                  <line x1={pad.left} y1={pad.top+ch} x2={pad.left+cw} y2={pad.top+ch} stroke="#e5e5e5" strokeWidth={1}/>
                  <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top+ch} stroke="#e5e5e5" strokeWidth={1}/>
                  {/* X-axis label */}
                  <text x={pad.left+cw/2} y={H-6} textAnchor="middle" style={{fontSize:10,fill:"#737373",fontFamily:"monospace"}}>Scheme Fit Score</text>
                  {/* Y-axis label */}
                  <text x={14} y={pad.top+ch/2} textAnchor="middle" transform={`rotate(-90,14,${pad.top+ch/2})`} style={{fontSize:10,fill:"#737373",fontFamily:"monospace"}}>Consensus Rank (↑ better)</text>
                  {/* X ticks */}
                  {[50,60,70,80,90,100].map(v=>{const xp=pad.left+((v-xMin)/(xMax-xMin))*cw;return<g key={v}><line x1={xp} y1={pad.top+ch} x2={xp} y2={pad.top+ch+4} stroke="#d4d4d4"/><text x={xp} y={pad.top+ch+16} textAnchor="middle" style={{fontSize:9,fill:"#a3a3a3",fontFamily:"monospace"}}>{v}</text></g>;})}
                  {/* Y ticks — rank 1 at top, higher ranks at bottom */}
                  {[0,0.25,0.5,0.75,1].map(f=>{const yp=pad.top+f*ch;const v=Math.round(yMin2+f*yRange2);return<g key={f}><line x1={pad.left-4} y1={yp} x2={pad.left} y2={yp} stroke="#d4d4d4"/><text x={pad.left-8} y={yp+3} textAnchor="end" style={{fontSize:9,fill:"#a3a3a3",fontFamily:"monospace"}}>#{v}</text></g>;})}
                  {/* Dots / Logos */}
                  {(()=>{const myGuySet=new Set(myGuys.map(g=>g.name));return rankedPts.map((d,i)=>{
                    const cx=dotX(d),cy=dotY(d),r=dotR(d);
                    const isFit=d.fit>=75;
                    const isMyGuy=explorerMyGuys&&myGuySet.has(d.name);
                    const dimmed=explorerMyGuys&&myGuySet.size>0&&!isMyGuy;
                    const taken=sfClampedSlider>0&&d.rank<900&&d.rank<=sfCutoffPick;
                    const archMatch=sfArchetype?getArchetypes(d.name,d.school).includes(sfArchetype):true;
                    const baseOpacity=taken?0.06:(isFit?1:0.4);
                    const opacity=dimmed?0.1:(!archMatch?0.1:baseOpacity);
                    const logoUrl=explorerLogos?schoolLogo(d.school):null;
                    const handlers={onMouseEnter:e=>setExplorerHover({sfDot:d,cx:e.clientX,cy:e.clientY}),onMouseLeave:()=>setExplorerHover(null),onClick:()=>{const p=PROSPECTS.find(pr=>pr.id===d.id);if(p)openProfile(p);}};
                    if(logoUrl){const sz=isMyGuy?28:20;return<g key={d.id} {...handlers} style={{cursor:"pointer"}}><image href={logoUrl} x={cx-sz/2} y={cy-sz/2} width={sz} height={sz} opacity={opacity}/>{isMyGuy&&<circle cx={cx} cy={cy} r={sz/2+2} fill="none" stroke="#ec4899" strokeWidth={2} opacity={0.8}/>}</g>;}
                    return<g key={d.id}>{isMyGuy&&<circle cx={cx} cy={cy} r={r+3} fill="none" stroke="#ec4899" strokeWidth={2} opacity={0.8} style={{transition:"cx 0.3s,cy 0.3s"}}/>}<circle cx={cx} cy={cy} r={r} fill={(isFit?tc:pc)+(isFit?"55":"1a")} stroke={isFit?tc:pc} strokeWidth={isFit?1.5:1} opacity={opacity} {...handlers} style={{cursor:"pointer",transition:"cx 0.3s,cy 0.3s,opacity 0.2s"}}/></g>;
                  });})()}
                </svg>
                {/* Center watermark */}
                <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",display:"flex",alignItems:"center",gap:0,opacity:0.06,pointerEvents:"none"}}>
                  <img src="/logo.png" alt="" style={{height:60,width:"auto"}}/>
                  <span style={{fontFamily:font,fontSize:32,fontWeight:900,color:"#171717",letterSpacing:-1,marginLeft:-6}}>bigboardlab.com</span>
                </div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:6,paddingRight:4}}>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    <button onClick={gateAuth(()=>setExplorerLogos(v=>!v))} style={{fontFamily:sans,fontSize:10,fontWeight:600,padding:"5px 10px",background:explorerLogos?"#17171710":"transparent",color:explorerLogos?"#171717":"#a3a3a3",border:explorerLogos?"1px solid #17171722":"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",transition:"all 0.2s"}}>{explorerLogos?"● dots":"🏫 logos"}</button>
                    {myGuys.length>0&&<button onClick={gateAuth(()=>setExplorerMyGuys(v=>!v))} style={{fontFamily:sans,fontSize:10,fontWeight:600,padding:"5px 10px",background:explorerMyGuys?"linear-gradient(135deg,#ec4899,#7c3aed)":"transparent",color:explorerMyGuys?"#fff":"#a3a3a3",border:explorerMyGuys?"1px solid transparent":"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",transition:"all 0.2s"}}>👀 my guys</button>}
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:5}}>
                    <img src="/logo.png" alt="" style={{height:12,width:"auto"}}/>
                    <span style={{fontFamily:mono,fontSize:8,fontWeight:600,color:"#171717",letterSpacing:0.3}}>bigboardlab.com</span>
                  </div>
                </div>

                {/* Dot tooltip */}
                {explorerHover&&explorerHover.sfDot&&(()=>{
                  const d=explorerHover.sfDot;
                  const isFit=d.fit>=75;
                  const sv=d.sv;
                  const hlColor=isFit?"#06b6d4":d.fit>=55?"#fbbf24":"#f87171";
                  return<div style={{position:"fixed",left:Math.min(explorerHover.cx+12,window.innerWidth-320),top:Math.max(explorerHover.cy-140,8),background:"#171717",color:"#fff",padding:"12px 16px",borderRadius:12,fontFamily:sans,fontSize:12,pointerEvents:"none",zIndex:9999,boxShadow:"0 4px 16px rgba(0,0,0,0.4)",maxWidth:320}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:2}}>
                      <span style={{fontWeight:700,fontSize:13}}>{d.name}</span>
                      <span style={{fontFamily:"monospace",fontSize:13,fontWeight:800,color:hlColor}}>{d.fit}</span>
                    </div>
                    <div style={{fontSize:10,color:"#737373",marginBottom:4}}>{d.pos} · {d.school} · #{d.rank}</div>
                    {sv&&<div style={{fontSize:10,fontWeight:600,color:hlColor,marginBottom:6}}>{sv.headline}</div>}
                    {sv&&sv.whyItFits&&<div style={{fontSize:10,color:"#d4d4d4",lineHeight:1.5,marginBottom:4}}>{(()=>{if(sv.whyItFits.length<=300)return sv.whyItFits;const dot=sv.whyItFits.lastIndexOf(". ",300);return dot>120?sv.whyItFits.substring(0,dot+1):sv.whyItFits.substring(0,300).replace(/[,;\s]+$/,"")+".";})()}</div>}
                    {!sv&&<div style={{fontSize:10,color:"#737373",fontStyle:"italic"}}>no scout vision data available</div>}
                  </div>;
                })()}
              </div>
            )}

            {/* Available at Pick slider */}
            {sfTeamPicks.length>0&&(()=>{
              const handlePct=(sfClampedSlider/sfTeamPicks.length)*100;
              const currentPick=sfClampedSlider>0?sfTeamPicks[sfClampedSlider-1]:null;
              const availableGems=sfClampedSlider>0?points.filter(d=>(d.rank>sfCutoffPick||d.rank>=900)&&d.fit>=75).length:null;
              const statusLabel=sfClampedSlider===0?"all rounds":`R${currentPick.round} · Pick #${currentPick.pick}${availableGems!==null?` · ${availableGems} fit gem${availableGems!==1?"s":""} available`:""}`;
              const showDots=sfTeamPicks.length<=14;
              return<div style={{margin:"16px 0 4px",padding:"12px 16px",background:`${tc}08`,border:`1px solid ${tc}33`,borderRadius:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <NFLTeamLogo team={sfTeam} size={16}/>
                    <span style={{fontFamily:mono,fontSize:11,fontWeight:900,letterSpacing:1,color:"#171717",textTransform:"uppercase"}}>Available at Pick</span>
                  </div>
                  <span style={{fontFamily:mono,fontSize:12,fontWeight:700,color:tc,background:tc+"15",padding:"3px 10px",borderRadius:99}}>{statusLabel}</span>
                </div>
                <div style={{position:"relative",height:32,display:"flex",alignItems:"center",padding:"0 10px"}}>
                  <div style={{position:"absolute",left:10,right:10,height:8,background:`${tc}1a`,borderRadius:4}}/>
                  <div style={{position:"absolute",left:10,right:10,height:8,borderRadius:4,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${handlePct}%`,background:`linear-gradient(90deg,${tc},${tc}bb)`,borderRadius:4,transition:"width 0.15s cubic-bezier(.4,1.3,.65,1)"}}/>
                  </div>
                  {showDots?sfTeamPicks.map((d,i)=>{
                    const stopIdx=i+1;const pct=(stopIdx/sfTeamPicks.length)*100;
                    const past=stopIdx<sfClampedSlider;const current=stopIdx===sfClampedSlider;
                    return<div key={d.pick} style={{position:"absolute",left:`${pct}%`,top:"50%",transform:"translate(-50%,-50%)",width:current?0:past?6:10,height:current?0:past?6:10,borderRadius:"50%",background:tc,border:past?"none":`2px solid ${tc}`,boxShadow:past?"none":"0 0 0 2px #fff",zIndex:2,pointerEvents:"none",transition:"all 0.15s cubic-bezier(.4,1.3,.65,1)"}} title={`Pick ${d.pick} (R${d.round})${d.from?" from "+d.from:""}`}/>;
                  }):[1,2,3,4,5,6,7].map(rd=>{
                    const first=sfTeamPicks.find(d=>d.round===rd);if(!first)return null;
                    const idx=sfTeamPicks.indexOf(first);const pct=((idx+1)/sfTeamPicks.length)*100;const past=idx<sfClampedSlider;
                    return<div key={rd} style={{position:"absolute",left:`${pct}%`,top:"50%",width:past?6:8,height:past?6:8,borderRadius:"50%",background:past?tc:"#d4d4d4",transform:"translate(-50%,-50%)",pointerEvents:"none",zIndex:2,transition:"all 0.15s"}}/>;
                  })}
                  <div style={{position:"absolute",left:`${handlePct}%`,top:"50%",transform:"translate(-50%,-50%)",width:22,height:22,borderRadius:"50%",background:"#fff",border:`3px solid ${tc}`,boxShadow:"0 2px 8px rgba(0,0,0,0.18)",zIndex:3,pointerEvents:"none",transition:"left 0.15s cubic-bezier(.4,1.3,.65,1)"}}/>
                  <input type="range" min="0" max={sfTeamPicks.length} step="1" value={sfClampedSlider} onChange={e=>setSfPickSlider(parseInt(e.target.value))} style={{position:"absolute",left:0,width:"100%",height:32,background:"transparent",cursor:"pointer",zIndex:5,opacity:0,margin:0}}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:4,padding:"0 10px"}}>
                  <span style={{fontFamily:mono,fontSize:9,color:sfClampedSlider===0?tc:"#a3a3a3",fontWeight:sfClampedSlider===0?700:400}}>All</span>
                  {showDots?sfTeamPicks.map((d,i)=>{const stopIdx=i+1;return<span key={d.pick} style={{fontFamily:mono,fontSize:8,color:stopIdx<=sfClampedSlider?tc:"#a3a3a3",fontWeight:stopIdx===sfClampedSlider?700:400}}>R{d.round}</span>;}):
                  [1,2,3,4,5,6,7].map(rd=>{const first=sfTeamPicks.find(d=>d.round===rd);if(!first)return null;const stopIdx=sfTeamPicks.indexOf(first)+1;return<span key={rd} style={{fontFamily:mono,fontSize:9,color:stopIdx<=sfClampedSlider?tc:"#a3a3a3",fontWeight:400}}>R{rd}</span>;})}
                </div>
              </div>;
            })()}

            {/* Top-10 Leaderboard */}
            {top10.length>0&&<div style={{marginTop:16,background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,overflow:"hidden"}}>
              <div style={{padding:"10px 14px",borderBottom:"1px solid #f0f0f0",display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:14}}>🏆</span>
                <span style={{fontFamily:mono,fontSize:11,fontWeight:900,letterSpacing:1,color:"#171717",textTransform:"uppercase"}}>Top 10 by Scheme Fit</span>
              </div>
              {top10.map((d,i)=>{
                const isOpen=sfExpandedId===d.id;
                const svR=d.sv;
                const fitColor=d.fit>=75?"#0891b2":d.fit>=55?"#d97706":"#a3a3a3";
                const lbTaken=sfClampedSlider>0&&d.rank<900&&d.rank<=sfCutoffPick;
                return<div key={d.id} style={{opacity:lbTaken?0.35:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,padding:"7px 14px",borderBottom:isOpen?"none":i<top10.length-1?"1px solid #f5f5f5":"none",cursor:"pointer"}}
                  onClick={gateAuth(()=>setSfExpandedId(isOpen?null:d.id))}
                  onMouseEnter={e=>{e.currentTarget.style.background="#faf9f6";}}
                  onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}>
                  <span style={{fontFamily:mono,fontSize:10,color:i<3?"#171717":"#a3a3a3",fontWeight:i<3?700:400,width:20,textAlign:"right",flexShrink:0}}>#{i+1}</span>
                  <SchoolLogo school={d.school} size={20}/>
                  <div style={{flex:1,minWidth:0,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}><span style={{fontFamily:sans,fontSize:12,fontWeight:600,color:"#171717",cursor:"pointer"}} onClick={e=>{e.stopPropagation();const p=PROSPECTS.find(pr=>pr.id===d.id);if(p)openProfile(p);}} onMouseEnter={e=>e.currentTarget.style.textDecoration="underline"} onMouseLeave={e=>e.currentTarget.style.textDecoration="none"}>{d.name}</span></div>
                  {lbTaken&&<span style={{fontFamily:mono,fontSize:8,fontWeight:700,color:"#a3a3a3",background:"#f0f0f0",borderRadius:3,padding:"1px 5px",flexShrink:0}}>gone</span>}
                  <span style={{fontFamily:mono,fontSize:9,fontWeight:700,color:pc,background:pc+"18",border:`1px solid ${pc}44`,borderRadius:99,padding:"2px 8px",flexShrink:0}}>{sfPosFilter}</span>
                  <span style={{fontFamily:mono,fontSize:12,fontWeight:700,color:fitColor,flexShrink:0,minWidth:36,textAlign:"right"}}>{d.fit}</span>
                  <span style={{fontFamily:mono,fontSize:10,color:"#525252",flexShrink:0,minWidth:40,textAlign:"right"}}>#{d.rank}</span>
                  <span style={{fontFamily:mono,fontSize:10,color:"#a3a3a3",flexShrink:0}}>{isOpen?"−":"+"}</span>
                </div>
                {isOpen&&svR&&<div style={{padding:"10px 14px 14px 54px",background:"rgba(8,145,178,0.04)",borderLeft:"3px solid #0891b2",borderBottom:i<top10.length-1?"1px solid rgba(8,145,178,0.12)":"none",borderRadius:"0 0 8px 0"}} onClick={e=>e.stopPropagation()}>
                  <div style={{fontFamily:sans,fontSize:11,fontWeight:700,color:"#0891b2",marginBottom:4}}>{svR.headline}</div>
                  <div style={{fontFamily:mono,fontSize:9,color:"#0891b2",marginBottom:4,opacity:0.8}}>{svR.roleLabel}</div>
                  <div style={{fontFamily:sans,fontSize:11,color:"#404040",lineHeight:1.5,marginBottom:8}}>{svR.whyItFits}</div>
                  {svR.prospectStrengths&&<div style={{fontFamily:mono,fontSize:9,color:"#737373",marginBottom:6}}>key traits: {svR.prospectStrengths}</div>}
                  {svR.relevantInflection&&<div style={{fontFamily:sans,fontSize:10,color:"#0891b2",fontStyle:"italic",lineHeight:1.4,padding:"6px 8px",background:"rgba(8,145,178,0.06)",borderRadius:6,borderLeft:"2px solid rgba(8,145,178,0.4)"}}>{svR.relevantInflection}</div>}
                </div>}
                {isOpen&&!svR&&<div style={{padding:"10px 14px 14px 54px",background:"#faf9f6",borderBottom:i<top10.length-1?"1px solid #f5f5f5":"none"}}><span style={{fontFamily:sans,fontSize:11,color:"#a3a3a3",fontStyle:"italic"}}>no scout vision data available</span></div>}
                </div>;
              })}
            </div>}
          </>;
        })()}
        {explorerMode==="free-agency"&&(()=>{
          const FA_POS_GROUPS=["QB","RB","WR","TE","OT","IOL","EDGE","DL","LB","CB","S","K/P"];
          const FA_AXIS_OPTIONS=[
            {key:"aav",label:"AAV"},
            {key:"totalValue",label:"Total Value"},
            {key:"guaranteed",label:"Guaranteed"},
            {key:"guaranteedPct",label:"Gtd %"},
            {key:"years",label:"Years"},
            {key:"age",label:"Age"},
          ];
          const FA_POS_AXIS_OPTIONS=[
            {key:"count",label:"# Signings"},
            ...FA_AXIS_OPTIONS,
          ];
          const fmtDollars=v=>{if(v>=1e6)return`$${(v/1e6).toFixed(1)}M`;if(v>=1e3)return`$${(v/1e3).toFixed(0)}K`;return`$${v}`;};
          const fmtAxis=(key,v)=>key==="guaranteedPct"?`${(v*100).toFixed(0)}%`:key==="years"||key==="age"||key==="count"?String(Math.round(v)):fmtDollars(v);
          const axisLabel=key=>FA_AXIS_OPTIONS.find(o=>o.key===key)?.label||key;

          const FaDrop=({value,options,dropKey,onChange})=>{const open=faDrop===dropKey;const sel=options.find(o=>o.key===value);const ref=useRef(null);useEffect(()=>{if(!open)return;const h=e=>{if(ref.current&&!ref.current.contains(e.target))setFaDrop(null);};document.addEventListener("pointerdown",h);return()=>document.removeEventListener("pointerdown",h);},[open]);return<div ref={ref} style={{position:"relative",display:"inline-block"}}>
            <button onClick={()=>setFaDrop(open?null:dropKey)} style={{fontFamily:sans,fontSize:12,fontWeight:600,padding:"6px 12px 6px 10px",borderRadius:10,border:"1px solid "+(open?"#a3a3a3":"#e5e5e5"),background:open?"#faf9f6":"#fff",color:"#171717",cursor:"pointer",display:"flex",alignItems:"center",gap:6,minWidth:120,transition:"border-color 0.15s"}}>
              <span style={{flex:1,textAlign:"left",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{sel?.label||"Select"}</span>
              <svg width="10" height="6" viewBox="0 0 10 6" style={{flexShrink:0,opacity:0.4,transform:open?"rotate(180deg)":"none",transition:"transform 0.15s"}}><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
            </button>
            {open&&<div style={{position:"absolute",top:"calc(100% + 4px)",left:0,minWidth:160,background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,boxShadow:"0 8px 24px rgba(0,0,0,0.12)",zIndex:100,padding:"4px 0"}}>
              {options.map(o=>{const active=o.key===value;return<div key={o.key} onClick={()=>{onChange(o.key);setFaDrop(null);}} style={{fontFamily:sans,fontSize:12,fontWeight:active?700:500,padding:"7px 12px 7px 16px",color:active?"#171717":"#525252",background:active?"#f5f5f4":"transparent",cursor:"pointer",transition:"background 0.1s"}} onMouseEnter={e=>{if(!active)e.currentTarget.style.background="#faf9f6";}} onMouseLeave={e=>{if(!active)e.currentTarget.style.background="transparent";}}>{o.label}</div>;})}
            </div>}
          </div>;};

          // Sub-view toggle
          const viewToggle=<div style={{display:"flex",gap:4,marginBottom:10}}>
            <button onClick={()=>{setFaView("position");setFaPosFilter(null);setFaTeamFilter(null);setExplorerHover(null);}} style={{fontFamily:sans,fontSize:11,fontWeight:700,padding:"6px 14px",background:faView==="position"?"#171717":"transparent",color:faView==="position"?"#fff":"#737373",border:faView==="position"?"1px solid #171717":"1px solid #e5e5e5",borderRadius:99,cursor:"pointer"}}>by position</button>
            <button onClick={()=>{setFaView("contracts");setExplorerHover(null);}} style={{fontFamily:sans,fontSize:11,fontWeight:700,padding:"6px 14px",background:faView==="contracts"?"#171717":"transparent",color:faView==="contracts"?"#fff":"#737373",border:faView==="contracts"?"1px solid #171717":"1px solid #e5e5e5",borderRadius:99,cursor:"pointer"}}>by player</button>
          </div>;

          if(faView==="position"){
            // === Position Aggregate Bubble Chart ===
            const agg=FA_POS_GROUPS.map(pg=>{
              const contracts=FA_CONTRACTS.filter(c=>c.posGroup===pg);
              if(contracts.length===0)return null;
              const n=contracts.length;
              const totalSpend=contracts.reduce((s,c)=>s+c.aav,0);
              return{pos:pg,count:n,totalValue:totalSpend,aav:totalSpend/n,guaranteed:contracts.reduce((s,c)=>s+c.guaranteed,0)/n,guaranteedPct:contracts.reduce((s,c)=>s+c.guaranteedPct,0)/n,years:contracts.reduce((s,c)=>s+c.years,0)/n,age:contracts.reduce((s,c)=>s+c.age,0)/n,maxAAV:Math.max(...contracts.map(c=>c.aav))};
            }).filter(Boolean);

            const posVal=(d,key)=>d[key]||0;
            const posAxisLabel=key=>{const o=FA_POS_AXIS_OPTIONS.find(a=>a.key===key);if(!o)return key;return key==="count"||key==="totalValue"?o.label:"Avg "+o.label;};
            const xValsP=agg.map(d=>posVal(d,faXAxis));
            const yValsP=agg.map(d=>posVal(d,faYAxis));
            const xMinP=Math.min(...xValsP),xMaxP=Math.max(...xValsP,1);
            const yMinP=Math.min(...yValsP),yMaxP=Math.max(...yValsP,1);
            const xRangeP=xMaxP-xMinP||1,yRangeP=yMaxP-yMinP||1;
            const meanXP=xValsP.reduce((s,v)=>s+v,0)/agg.length;
            const meanYP=yValsP.reduce((s,v)=>s+v,0)/agg.length;
            // Bubble size by whichever axis is NOT used (prefer totalValue)
            const sizeKey=faXAxis!=="totalValue"&&faYAxis!=="totalValue"?"totalValue":faXAxis!=="aav"&&faYAxis!=="aav"?"aav":"count";
            const sizeVals=agg.map(d=>posVal(d,sizeKey));
            const sizeMax=Math.max(...sizeVals,1);
            const W=Math.min(860,window.innerWidth-32),H=380;
            const pad={top:30,right:30,bottom:50,left:60};
            const cw=W-pad.left-pad.right,ch=H-pad.top-pad.bottom;
            const sx=d=>((posVal(d,faXAxis)-xMinP)/xRangeP)*cw;
            const sy=d=>ch-((posVal(d,faYAxis)-yMinP)/yRangeP)*ch;
            const sr=d=>8+((posVal(d,sizeKey)/sizeMax)*16);
            const meanPxX=((meanXP-xMinP)/xRangeP)*cw;
            const meanPxY=ch-((meanYP-yMinP)/yRangeP)*ch;
            const top3=[...agg].sort((a,b)=>posVal(b,faYAxis)-posVal(a,faYAxis)).slice(0,3);

            return<>
              {viewToggle}
              {/* Axis dropdowns */}
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,flexWrap:"wrap"}}>
                <div style={{display:"flex",alignItems:"center",gap:5}}>
                  <span style={{fontFamily:mono,fontSize:9,letterSpacing:1,color:"#a3a3a3",textTransform:"uppercase"}}>X</span>
                  <FaDrop value={faXAxis} options={FA_POS_AXIS_OPTIONS} dropKey="px" onChange={v=>{if(isGuest){onRequireAuth("want to play with the data? sign up free");return;}setFaXAxis(v);}}/>
                </div>
                <button onClick={()=>{if(isGuest){onRequireAuth("want to play with the data? sign up free");return;}const tmp=faXAxis;setFaXAxis(faYAxis);setFaYAxis(tmp);}} title="Swap axes" style={{fontSize:14,color:"#a3a3a3",background:"#f5f5f4",border:"1px solid #e5e5e5",borderRadius:8,padding:"3px 7px",cursor:"pointer",lineHeight:1,transition:"all 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.background="#e5e5e5";}} onMouseLeave={e=>{e.currentTarget.style.background="#f5f5f4";}}>🔀</button>
                <div style={{display:"flex",alignItems:"center",gap:5}}>
                  <span style={{fontFamily:mono,fontSize:9,letterSpacing:1,color:"#a3a3a3",textTransform:"uppercase"}}>Y</span>
                  <FaDrop value={faYAxis} options={FA_POS_AXIS_OPTIONS} dropKey="py" onChange={v=>{if(isGuest){onRequireAuth("want to play with the data? sign up free");return;}setFaYAxis(v);}}/>
                </div>
              </div>
              <div style={{position:"relative",marginTop:4}}>
                <svg width={W} height={H} style={{display:"block"}}>
                  <defs>
                    <pattern id="fa-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                      <line x1="0" y1="0" x2="0" y2="6" stroke="#d9770622" strokeWidth="1"/>
                    </pattern>
                  </defs>
                  {/* Quadrant backgrounds */}
                  <rect x={pad.left} y={pad.top} width={meanPxX} height={meanPxY} fill="url(#fa-hatch)"/>
                  {/* Mean crosshairs */}
                  <line x1={pad.left+meanPxX} y1={pad.top} x2={pad.left+meanPxX} y2={pad.top+ch} stroke="#d4d4d4" strokeWidth={1} strokeDasharray="4,3"/>
                  <line x1={pad.left} y1={pad.top+meanPxY} x2={pad.left+cw} y2={pad.top+meanPxY} stroke="#d4d4d4" strokeWidth={1} strokeDasharray="4,3"/>
                  {/* Axes */}
                  <line x1={pad.left} y1={pad.top+ch} x2={pad.left+cw} y2={pad.top+ch} stroke="#e5e5e5" strokeWidth={1}/>
                  <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top+ch} stroke="#e5e5e5" strokeWidth={1}/>
                  {/* X-axis label */}
                  <text x={pad.left+cw/2} y={H-6} textAnchor="middle" style={{fontSize:10,fill:"#737373",fontFamily:"monospace"}}>{posAxisLabel(faXAxis)}</text>
                  {/* Y-axis label */}
                  <text x={14} y={pad.top+ch/2} textAnchor="middle" transform={`rotate(-90,14,${pad.top+ch/2})`} style={{fontSize:10,fill:"#737373",fontFamily:"monospace"}}>{posAxisLabel(faYAxis)}</text>
                  {/* X ticks */}
                  {[0,0.25,0.5,0.75,1].map(f=>{const xp=pad.left+f*cw;const v=xMinP+f*xRangeP;return<g key={f}><line x1={xp} y1={pad.top+ch} x2={xp} y2={pad.top+ch+4} stroke="#d4d4d4"/><text x={xp} y={pad.top+ch+16} textAnchor="middle" style={{fontSize:9,fill:"#a3a3a3",fontFamily:"monospace"}}>{fmtAxis(faXAxis,v)}</text></g>;})}
                  {/* Y ticks */}
                  {[0,0.25,0.5,0.75,1].map(f=>{const yp=pad.top+ch-f*ch;const v=yMinP+f*yRangeP;return<g key={f}><line x1={pad.left-4} y1={yp} x2={pad.left} y2={yp} stroke="#d4d4d4"/><text x={pad.left-8} y={yp+3} textAnchor="end" style={{fontSize:9,fill:"#a3a3a3",fontFamily:"monospace"}}>{fmtAxis(faYAxis,v)}</text></g>;})}
                  {/* Bubbles */}
                  {agg.map(d=>{
                    const cx=pad.left+sx(d),cy=pad.top+sy(d),r=sr(d),c=POS_COLORS[d.pos]||"#525252";
                    return<g key={d.pos}
                      onClick={gateAuth(()=>{setFaView("contracts");setFaPosFilter(d.pos);})}
                      onMouseEnter={e=>setExplorerHover({faPos:d.pos,totalSpend:d.totalSpend,avgAAV:d.avgAAV,maxAAV:d.maxAAV,count:d.count,cx:e.clientX,cy:e.clientY})}
                      onMouseLeave={()=>setExplorerHover(null)}
                      style={{cursor:"pointer"}}>
                      <circle cx={cx} cy={cy} r={r} fill={c+"22"} stroke={c} strokeWidth={2} style={{transition:"cx 0.3s,cy 0.3s,r 0.3s"}}/>
                      <text x={cx} y={cy+1} textAnchor="middle" dominantBaseline="middle" style={{fontSize:Math.max(8,r*0.7),fill:c,fontFamily:"monospace",fontWeight:700,pointerEvents:"none"}}>{d.pos}</text>
                    </g>;})}
                </svg>
                {/* Center watermark */}
                <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",display:"flex",alignItems:"center",gap:0,opacity:0.06,pointerEvents:"none"}}>
                  <img src="/logo.png" alt="" style={{height:60,width:"auto"}}/>
                  <span style={{fontFamily:font,fontSize:32,fontWeight:900,color:"#171717",letterSpacing:-1,marginLeft:-6}}>bigboardlab.com</span>
                </div>
                {/* Bottom-right logo */}
                <div style={{display:"flex",justifyContent:"flex-end",alignItems:"center",gap:5,marginTop:2,paddingRight:4}}>
                  <img src="/logo.png" alt="" style={{height:12,width:"auto"}}/>
                  <span style={{fontFamily:mono,fontSize:8,fontWeight:600,color:"#171717",letterSpacing:0.3}}>bigboardlab.com</span>
                </div>

                {/* Position aggregate tooltip */}
                {explorerHover&&explorerHover.faPos&&<div style={{position:"fixed",left:Math.min(explorerHover.cx+12,window.innerWidth-240),top:Math.max(explorerHover.cy-100,8),background:"#171717",color:"#fff",padding:"10px 14px",borderRadius:10,fontFamily:sans,fontSize:12,pointerEvents:"none",zIndex:9999,boxShadow:"0 4px 12px rgba(0,0,0,0.3)",maxWidth:240}}>
                  <div style={{fontWeight:700,marginBottom:4}}>{POS_EMOJI[explorerHover.faPos]||""} {explorerHover.faPos}</div>
                  <div style={{fontSize:11,color:"#d4d4d4",lineHeight:1.6}}>
                    <div>Total spend: {fmtDollars(explorerHover.totalSpend)}</div>
                    <div>Avg AAV: {fmtDollars(explorerHover.avgAAV)}</div>
                    <div>Max contract: {fmtDollars(explorerHover.maxAAV)}</div>
                    <div>{explorerHover.count} signings</div>
                  </div>
                  <div style={{fontSize:9,color:"#525252",marginTop:4}}>tap to view contracts</div>
                </div>}
              </div>

              {/* Summary Cards — Top 3 by Y-axis */}
              <div style={{display:"flex",gap:10,marginTop:16,overflowX:"auto",paddingBottom:4}}>
                {top3.map((d,i)=>{
                  const c=POS_COLORS[d.pos]||"#525252";
                  return<div key={d.pos} onClick={gateAuth(()=>{setFaView("contracts");setFaPosFilter(d.pos);})} style={{flex:"1 0 0",minWidth:140,background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"14px 16px",position:"relative",overflow:"hidden",cursor:"pointer",transition:"border 0.15s"}}>
                    <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:c}}/>
                    <div style={{fontFamily:mono,fontSize:14,fontWeight:900,color:c,marginBottom:4}}>{POS_EMOJI[d.pos]||""} {d.pos}</div>
                    <div style={{fontFamily:sans,fontSize:11,color:"#525252",lineHeight:1.5}}>{d.count} signings · avg {fmtDollars(d.aav)}</div>
                    <div style={{marginTop:6}}><span style={{fontFamily:mono,fontSize:9,fontWeight:700,color:"#d97706",background:"#d9770618",border:"1px solid #d9770644",borderRadius:99,padding:"2px 8px",textTransform:"uppercase",letterSpacing:0.5}}>{posAxisLabel(faYAxis)}: {fmtAxis(faYAxis,posVal(d,faYAxis))}</span></div>
                  </div>;})}
              </div>
            </>;
          }

          // === Individual Contracts Scatter View ===
          const cXAxis=faXAxis==="count"?"aav":faXAxis;
          const cYAxis=faYAxis==="count"?"aav":faYAxis;
          const filtered=FA_CONTRACTS.filter(c=>{
            if(faPosFilter&&c.posGroup!==faPosFilter)return false;
            if(faTeamFilter&&c.team!==faTeamFilter)return false;
            return true;
          });
          const getVal=(c,key)=>c[key]||0;
          const xVals=filtered.map(c=>getVal(c,cXAxis));
          const yVals=filtered.map(c=>getVal(c,cYAxis));
          const dataMin=k=>k==="age"||k==="years"?Math.min(...(k===cXAxis?xVals:yVals))-1:0;
          const xMin=dataMin(cXAxis),xMax=Math.max(...xVals,xMin+1);
          const yMin=dataMin(cYAxis),yMax=Math.max(...yVals,yMin+1);
          const maxAAVAll=Math.max(...filtered.map(c=>c.aav),1);
          const W=Math.min(860,window.innerWidth-32),H=380;
          const pad={top:20,right:20,bottom:50,left:60};
          const cw=W-pad.left-pad.right,ch=H-pad.top-pad.bottom;
          const xRange=xMax-xMin||1,yRange=yMax-yMin||1;
          const dotX=c=>pad.left+((getVal(c,cXAxis)-xMin)/xRange)*cw;
          const dotY=c=>pad.top+ch-((getVal(c,cYAxis)-yMin)/yRange)*ch;
          const dotR=c=>4+((c.aav/maxAAVAll)*10);
          const useTeamColor=faTeamFilter&&faPosFilter;

          // Top-10 leaderboard by current Y axis
          const top10=[...filtered].sort((a,b)=>getVal(b,cYAxis)-getVal(a,cYAxis)).slice(0,10);

          return<>
            {viewToggle}

            {/* Active filters */}
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
              {faPosFilter&&<span style={{fontFamily:mono,fontSize:11,fontWeight:700,color:POS_COLORS[faPosFilter]||"#525252"}}>{POS_EMOJI[faPosFilter]||""} {faPosFilter}</span>}
              {faTeamFilter&&<span style={{display:"flex",alignItems:"center",gap:4}}><NFLTeamLogo team={ABBR_TO_TEAM[faTeamFilter]||faTeamFilter} size={16}/><span style={{fontFamily:mono,fontSize:11,fontWeight:700,color:NFL_TEAM_COLORS[ABBR_TO_TEAM[faTeamFilter]]||"#171717"}}>{faTeamFilter}</span></span>}
            </div>

            {/* Position pills */}
            <div style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:6,WebkitOverflowScrolling:"touch",scrollbarWidth:"none",marginBottom:4}}>
              <button onClick={gateAuth(()=>setFaPosFilter(null))} style={{fontFamily:mono,fontSize:10,fontWeight:700,padding:"5px 12px",background:!faPosFilter?"#171717":"transparent",color:!faPosFilter?"#fff":"#737373",border:!faPosFilter?"1px solid #171717":"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>ALL</button>
              {FA_POS_GROUPS.map(pg=>{const c=POS_COLORS[pg]||"#525252";const active=faPosFilter===pg;return<button key={pg} onClick={gateAuth(()=>setFaPosFilter(prev=>prev===pg?null:pg))} style={{fontFamily:mono,fontSize:10,fontWeight:700,padding:"5px 12px",background:active?c:"transparent",color:active?"#fff":c,border:`1.5px solid ${active?c:c+"33"}`,borderRadius:99,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>{pg}</button>;})}
            </div>

            {/* Team logo row */}
            <div className="trait-pills-scroll" style={{display:"flex",gap:4,overflowX:"auto",WebkitOverflowScrolling:"touch",paddingBottom:4,scrollbarWidth:"none",marginBottom:8}}>
              <button onClick={gateAuth(()=>setFaTeamFilter(null))} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"4px 6px",background:!faTeamFilter?"#17171710":"transparent",border:!faTeamFilter?"2px solid #171717":"2px solid transparent",borderRadius:8,cursor:"pointer",flexShrink:0}}><img src="/nfl.png" alt="NFL" width={22} height={22} style={{objectFit:"contain"}}/><span style={{fontFamily:mono,fontSize:7,color:!faTeamFilter?"#171717":"#a3a3a3",fontWeight:!faTeamFilter?700:500}}>ALL</span></button>
              {allTeams.sort().map(t=>{const abbr=NFL_TEAM_ABR[t];const sel=abbr===faTeamFilter;const tc=NFL_TEAM_COLORS[t]||"#171717";return<button key={t} onClick={gateAuth(()=>{setFaTeamFilter(sel?null:abbr);})} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"4px 6px",background:sel?`${tc}15`:"transparent",border:sel?`2px solid ${tc}`:"2px solid transparent",borderRadius:8,cursor:"pointer",flexShrink:0}}><NFLTeamLogo team={t} size={22}/><span style={{fontFamily:mono,fontSize:7,color:sel?tc:"#a3a3a3",fontWeight:sel?700:500}}>{abbr}</span></button>;})}
            </div>

            {/* Axis dropdowns */}
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,flexWrap:"wrap"}}>
              <div style={{display:"flex",alignItems:"center",gap:5}}>
                <span style={{fontFamily:mono,fontSize:9,letterSpacing:1,color:"#a3a3a3",textTransform:"uppercase"}}>X</span>
                <FaDrop value={cXAxis} options={FA_AXIS_OPTIONS} dropKey="cx" onChange={v=>{if(isGuest){onRequireAuth("want to play with the data? sign up free");return;}setFaXAxis(v);}}/>
              </div>
              <button onClick={()=>{if(isGuest){onRequireAuth("want to play with the data? sign up free");return;}const tmp=cXAxis;setFaXAxis(cYAxis);setFaYAxis(tmp);}} title="Swap axes" style={{fontSize:14,color:"#a3a3a3",background:"#f5f5f4",border:"1px solid #e5e5e5",borderRadius:8,padding:"3px 7px",cursor:"pointer",lineHeight:1,transition:"all 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.background="#e5e5e5";}} onMouseLeave={e=>{e.currentTarget.style.background="#f5f5f4";}}>🔀</button>
              <div style={{display:"flex",alignItems:"center",gap:5}}>
                <span style={{fontFamily:mono,fontSize:9,letterSpacing:1,color:"#a3a3a3",textTransform:"uppercase"}}>Y</span>
                <FaDrop value={cYAxis} options={FA_AXIS_OPTIONS} dropKey="cy" onChange={v=>{if(isGuest){onRequireAuth("want to play with the data? sign up free");return;}setFaYAxis(v);}}/>
              </div>
              <span style={{fontFamily:mono,fontSize:10,color:"#a3a3a3"}}>{filtered.length} contracts</span>
            </div>

            {filtered.length===0?<div style={{textAlign:"center",padding:"60px 20px"}}><p style={{fontFamily:sans,fontSize:14,color:"#a3a3a3"}}>no contracts match filters</p></div>:(
              <div style={{position:"relative",marginTop:4}}>
                <svg width={W} height={H} style={{display:"block"}}>
                  {/* Axes */}
                  <line x1={pad.left} y1={pad.top+ch} x2={pad.left+cw} y2={pad.top+ch} stroke="#e5e5e5" strokeWidth={1}/>
                  <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top+ch} stroke="#e5e5e5" strokeWidth={1}/>
                  {/* X-axis label */}
                  <text x={pad.left+cw/2} y={H-6} textAnchor="middle" style={{fontSize:10,fill:"#737373",fontFamily:"monospace"}}>{axisLabel(cXAxis)}</text>
                  {/* Y-axis label */}
                  <text x={14} y={pad.top+ch/2} textAnchor="middle" transform={`rotate(-90,14,${pad.top+ch/2})`} style={{fontSize:10,fill:"#737373",fontFamily:"monospace"}}>{axisLabel(cYAxis)}</text>
                  {/* X ticks */}
                  {[0,0.25,0.5,0.75,1].map(f=>{const xp=pad.left+f*cw;const v=xMin+f*xRange;return<g key={f}><line x1={xp} y1={pad.top+ch} x2={xp} y2={pad.top+ch+4} stroke="#d4d4d4"/><text x={xp} y={pad.top+ch+16} textAnchor="middle" style={{fontSize:9,fill:"#a3a3a3",fontFamily:"monospace"}}>{fmtAxis(cXAxis,v)}</text></g>;})}
                  {/* Y ticks */}
                  {[0,0.25,0.5,0.75,1].map(f=>{const yp=pad.top+ch-f*ch;const v=yMin+f*yRange;return<g key={f}><line x1={pad.left-4} y1={yp} x2={pad.left} y2={yp} stroke="#d4d4d4"/><text x={pad.left-8} y={yp+3} textAnchor="end" style={{fontSize:9,fill:"#a3a3a3",fontFamily:"monospace"}}>{fmtAxis(cYAxis,v)}</text></g>;})}
                  {/* Dots */}
                  {filtered.map((c,i)=>{
                    const cx=dotX(c),cy=dotY(c),r=dotR(c);
                    const color=useTeamColor?(NFL_TEAM_COLORS[c.teamName]||"#737373"):(POS_COLORS[c.posGroup]||"#737373");
                    return<circle key={i} cx={cx} cy={cy} r={r} fill={color+"44"} stroke={color} strokeWidth={1.5}
                      onMouseEnter={e=>setExplorerHover({faContract:c,cx:e.clientX,cy:e.clientY})}
                      onMouseLeave={()=>setExplorerHover(null)}
                      style={{cursor:"pointer",transition:"r 0.15s"}}/>;
                  })}
                </svg>
                {/* Center watermark */}
                <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",display:"flex",alignItems:"center",gap:0,opacity:0.06,pointerEvents:"none"}}>
                  <img src="/logo.png" alt="" style={{height:60,width:"auto"}}/>
                  <span style={{fontFamily:font,fontSize:32,fontWeight:900,color:"#171717",letterSpacing:-1,marginLeft:-6}}>bigboardlab.com</span>
                </div>
                {/* Bottom-right logo */}
                <div style={{display:"flex",justifyContent:"flex-end",alignItems:"center",gap:5,marginTop:2,paddingRight:4}}>
                  <img src="/logo.png" alt="" style={{height:12,width:"auto"}}/>
                  <span style={{fontFamily:mono,fontSize:8,fontWeight:600,color:"#171717",letterSpacing:0.3}}>bigboardlab.com</span>
                </div>

                {/* Contract tooltip */}
                {explorerHover&&explorerHover.faContract&&(()=>{
                  const c=explorerHover.faContract;
                  return<div style={{position:"fixed",left:Math.min(explorerHover.cx+12,window.innerWidth-260),top:Math.max(explorerHover.cy-130,8),background:"#171717",color:"#fff",padding:"10px 14px",borderRadius:10,fontFamily:sans,fontSize:12,pointerEvents:"none",zIndex:9999,boxShadow:"0 4px 12px rgba(0,0,0,0.3)",maxWidth:260}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                      <NFLTeamLogo team={c.teamName} size={18}/>
                      <span style={{fontWeight:700}}>{c.player}</span>
                      <span style={{fontFamily:mono,fontSize:9,fontWeight:700,color:POS_COLORS[c.posGroup]||"#a3a3a3",background:(POS_COLORS[c.posGroup]||"#a3a3a3")+"22",padding:"1px 6px",borderRadius:4}}>{c.position}</span>
                    </div>
                    <div style={{fontSize:11,color:"#d4d4d4",lineHeight:1.6}}>
                      <div>AAV: {fmtDollars(c.aav)}</div>
                      <div>Total: {fmtDollars(c.totalValue)} · {c.years}yr</div>
                      <div>Guaranteed: {fmtDollars(c.guaranteed)} ({(c.guaranteedPct*100).toFixed(0)}%)</div>
                      <div>Age: {c.age} · {c.marketTier}</div>
                    </div>
                  </div>;
                })()}
              </div>
            )}

            {/* Top-10 Leaderboard */}
            {top10.length>0&&<div style={{marginTop:16,background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,overflow:"hidden"}}>
              <div style={{padding:"10px 14px",borderBottom:"1px solid #f0f0f0",display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:14}}>🏆</span>
                <span style={{fontFamily:mono,fontSize:11,fontWeight:900,letterSpacing:1,color:"#171717",textTransform:"uppercase"}}>Top 10 by {axisLabel(cYAxis)}</span>
              </div>
              {top10.map((c,i)=>{
                const pc=POS_COLORS[c.posGroup]||"#525252";
                return<div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 14px",borderBottom:i<top10.length-1?"1px solid #f5f5f5":"none"}}
                  onMouseEnter={e=>{e.currentTarget.style.background="#faf9f6";}}
                  onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}>
                  <span style={{fontFamily:mono,fontSize:10,color:"#a3a3a3",width:20,textAlign:"right",flexShrink:0}}>#{i+1}</span>
                  <NFLTeamLogo team={c.teamName} size={20}/>
                  <span style={{fontFamily:sans,fontSize:12,fontWeight:600,color:"#171717",flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.player}</span>
                  <span style={{fontFamily:mono,fontSize:9,fontWeight:700,color:pc,background:pc+"18",border:`1px solid ${pc}44`,borderRadius:99,padding:"2px 8px",flexShrink:0}}>{c.position}</span>
                  <span style={{fontFamily:mono,fontSize:11,fontWeight:700,color:"#171717",flexShrink:0,minWidth:60,textAlign:"right"}}>{fmtAxis(cYAxis,getVal(c,cYAxis))}</span>
                  <span style={{fontFamily:mono,fontSize:9,color:"#a3a3a3",flexShrink:0,minWidth:50,textAlign:"right"}}>{fmtDollars(c.aav)}/yr</span>
                </div>;
              })}
            </div>}
          </>;
        })()}
        {explorerMode==="madness"&&(()=>{
          const MM_REGIONS=["ALL","East","South","West","Midwest"];
          const filtered=madnessRegion==="ALL"?MARCH_MADNESS_TEAMS:MARCH_MADNESS_TEAMS.filter(t=>t.region===madnessRegion);
          const xMeta=MADNESS_METRICS.find(m=>m.key===madnessX)||MADNESS_METRICS[0];
          const yMeta=MADNESS_METRICS.find(m=>m.key===madnessY)||MADNESS_METRICS[1];
          const svgW=860,svgH=440,pad={t:30,r:30,b:50,l:60};
          const plotW=svgW-pad.l-pad.r,plotH=svgH-pad.t-pad.b;
          const teamAbbr=t=>{const n=t.team;return n.length<=4?n:n.replace(/^(North |South |East |West |Northern |Southern |Eastern |Western |Central )/,'').slice(0,4).toUpperCase();};

          // Build first-round matchups by pairing seeds within each region
          const buildMatchups=()=>{
            const matchups=[];
            const pairs=[[1,16],[2,15],[3,14],[4,13],[5,12],[6,11],[7,10],[8,9]];
            ["East","South","West","Midwest"].forEach(region=>{
              const regionTeams=MARCH_MADNESS_TEAMS.filter(t=>t.region===region);
              pairs.forEach(([hi,lo])=>{
                const higher=regionTeams.find(t=>t.seed===hi);
                const lower=regionTeams.find(t=>t.seed===lo);
                if(higher&&lower)matchups.push({higher,lower,region,seedDiff:lo-hi,ratingGap:Math.abs((higher.netRtg||0)-(lower.netRtg||0)),srsGap:Math.abs((higher.srs||0)-(lower.srs||0))});
              });
            });
            return matchups;
          };

          const winProb=(teamSrs,oppSrs)=>{const diff=teamSrs-oppSrs;const p=0.5+diff*0.02;return Math.max(0.1,Math.min(0.9,p));};

          // Sub-mode tabs
          const subModes=[{key:"combo",label:"Scatter",icon:"\u2B50"},{key:"matchup",label:"Matchup",icon:"\u2694\uFE0F"},{key:"upset",label:"Upset Finder",icon:"\uD83D\uDD25"},{key:"weight",label:"BBL Weight",icon:"\u2696\uFE0F"}];

          return<div style={{marginTop:4}}>
            {/* Sub-mode tabs */}
            <div style={{display:"flex",gap:6,marginBottom:16}}>
              {subModes.map(sm=>{const active=madnessMode===sm.key;return<button key={sm.key} onClick={()=>{setMadnessMode(sm.key);setMadnessHover(null);setMadnessMatchupDetail(null);}} style={{fontFamily:sans,fontSize:12,fontWeight:700,padding:"8px 18px",background:active?"linear-gradient(135deg,#ea580c,#dc2626)":"#1a1a1a",color:active?"#fff":"#a3a3a3",border:active?"1px solid #ea580c":"1px solid #2a2a2a",borderRadius:10,cursor:"pointer",transition:"all 0.15s"}}>{sm.icon} {sm.label}</button>;})}
            </div>

            {/* COMBO MODE */}
            {madnessMode==="combo"&&(()=>{
              const validPts=filtered.filter(t=>t[madnessX]!=null&&t[madnessY]!=null);
              if(validPts.length===0)return<div style={{textAlign:"center",padding:"60px 20px"}}><p style={{fontFamily:sans,fontSize:14,color:"#737373"}}>no data available for this metric combination</p></div>;
              const xVals=validPts.map(t=>t[madnessX]);
              const yVals=validPts.map(t=>t[madnessY]);
              const xMin=Math.min(...xVals),xMax=Math.max(...xVals);
              const yMin=Math.min(...yVals),yMax=Math.max(...yVals);
              const xRange=xMax-xMin||1,yRange=yMax-yMin||1;
              const xPad=xRange*0.08,yPad=yRange*0.08;
              const sx=v=>{const norm=(v-(xMin-xPad))/(xRange+2*xPad);return pad.l+(xMeta.inverted?(1-norm):norm)*plotW;};
              const sy=v=>{const norm=(v-(yMin-yPad))/(yRange+2*yPad);return pad.t+(yMeta.inverted?norm:(1-norm))*plotH;};

              // "best corner" distance for leaderboard
              const bestX=xMeta.inverted?xMin:xMax;
              const bestY=yMeta.inverted?yMin:yMax;
              const dist=(t)=>{const dx=(t[madnessX]-bestX)/(xRange||1);const dy=(t[madnessY]-bestY)/(yRange||1);return Math.sqrt(dx*dx+dy*dy);};
              const ranked=[...validPts].sort((a,b)=>dist(a)-dist(b));

              return<>
                {/* Region pills */}
                <div style={{display:"flex",gap:5,marginBottom:10}}>
                  {MM_REGIONS.map(r=>{const active=madnessRegion===r;const c=r==="ALL"?"#e5e5e5":REGION_COLORS[r];return<button key={r} onClick={()=>setMadnessRegion(r)} style={{fontFamily:mono,fontSize:10,fontWeight:700,padding:"5px 12px",background:active?c:"transparent",color:active?(r==="ALL"||r==="South"?"#171717":"#fff"):c,border:`1.5px solid ${active?c:c+"44"}`,borderRadius:99,cursor:"pointer",transition:"all 0.15s"}}>{r}</button>;})}
                </div>
                {/* Axis dropdowns */}
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,flexWrap:"wrap"}}>
                  <div style={{display:"flex",alignItems:"center",gap:5}}>
                    <span style={{fontFamily:mono,fontSize:9,letterSpacing:1,color:"#737373",textTransform:"uppercase"}}>X</span>
                    <select value={madnessX} onChange={e=>setMadnessX(e.target.value)} style={{fontFamily:sans,fontSize:12,fontWeight:600,padding:"6px 10px",borderRadius:8,border:"1px solid #2a2a2a",background:"#1a1a1a",color:"#e5e5e5",cursor:"pointer"}}>
                      {MADNESS_METRICS.map(m=><option key={m.key} value={m.key}>{m.label}</option>)}
                    </select>
                  </div>
                  <button onClick={()=>{setMadnessX(madnessY);setMadnessY(madnessX);}} style={{fontSize:14,color:"#737373",background:"#1a1a1a",border:"1px solid #2a2a2a",borderRadius:8,padding:"3px 7px",cursor:"pointer",lineHeight:1}}>{"\uD83D\uDD00"}</button>
                  <div style={{display:"flex",alignItems:"center",gap:5}}>
                    <span style={{fontFamily:mono,fontSize:9,letterSpacing:1,color:"#737373",textTransform:"uppercase"}}>Y</span>
                    <select value={madnessY} onChange={e=>setMadnessY(e.target.value)} style={{fontFamily:sans,fontSize:12,fontWeight:600,padding:"6px 10px",borderRadius:8,border:"1px solid #2a2a2a",background:"#1a1a1a",color:"#e5e5e5",cursor:"pointer"}}>
                      {MADNESS_METRICS.map(m=><option key={m.key} value={m.key}>{m.label}</option>)}
                    </select>
                  </div>
                </div>
                {/* SVG scatter */}
                <div style={{background:"#1a1a1a",border:"1px solid #2a2a2a",borderRadius:14,padding:12,marginBottom:16,overflow:"hidden"}}>
                  <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} style={{display:"block"}}>
                    {/* Grid lines */}
                    {Array.from({length:6}).map((_,i)=>{const x=pad.l+(plotW/5)*i;return<line key={`gx${i}`} x1={x} y1={pad.t} x2={x} y2={pad.t+plotH} stroke="#2a2a2a" strokeWidth={1}/>;})}
                    {Array.from({length:6}).map((_,i)=>{const y=pad.t+(plotH/5)*i;return<line key={`gy${i}`} x1={pad.l} y1={y} x2={pad.l+plotW} y2={y} stroke="#2a2a2a" strokeWidth={1}/>;})}
                    {/* Axis labels */}
                    <text x={pad.l+plotW/2} y={svgH-6} textAnchor="middle" style={{fontFamily:sans,fontSize:11,fill:"#737373"}}>{xMeta.label} →</text>
                    <text x={14} y={pad.t+plotH/2} textAnchor="middle" transform={`rotate(-90,14,${pad.t+plotH/2})`} style={{fontFamily:sans,fontSize:11,fill:"#737373"}}>{yMeta.label} →</text>
                    {/* Tick labels */}
                    {Array.from({length:6}).map((_,i)=>{const frac=i/5;const v=xMeta.inverted?(xMax+xPad-(xRange+2*xPad)*frac):(xMin-xPad+(xRange+2*xPad)*frac);return<text key={`tx${i}`} x={pad.l+(plotW/5)*i} y={pad.t+plotH+16} textAnchor="middle" style={{fontFamily:mono,fontSize:9,fill:"#525252"}}>{v.toFixed(1)}</text>;})}
                    {Array.from({length:6}).map((_,i)=>{const frac=i/5;const v=yMeta.inverted?(yMin-yPad+(yRange+2*yPad)*frac):(yMax+yPad-(yRange+2*yPad)*frac);return<text key={`ty${i}`} x={pad.l-8} y={pad.t+(plotH/5)*i+4} textAnchor="end" style={{fontFamily:mono,fontSize:9,fill:"#525252"}}>{v.toFixed(1)}</text>;})}
                    {/* Dots */}
                    {validPts.map((t,i)=>{
                      const cx=sx(t[madnessX]),cy=sy(t[madnessY]);
                      const rc=REGION_COLORS[t.region]||"#737373";
                      const isHov=madnessHover?.team===t.team;
                      const logoUrl=madnessLogo(t.team);
                      const logoR=isHov?12:10;
                      return<g key={i} onMouseEnter={e=>setMadnessHover({...t,cx:e.clientX,cy:e.clientY})} onMouseLeave={()=>setMadnessHover(null)} onClick={()=>setMadnessSelectedTeam(t)} style={{cursor:"pointer"}}>
                        <circle cx={cx} cy={cy} r={logoR+1} fill="transparent" stroke="none"/>
                        <circle cx={cx} cy={cy} r={logoR} fill="#f5f5f5" stroke={rc} strokeWidth={isHov?2.5:1.5}/>
                        {logoUrl?<image href={logoUrl} x={cx-logoR+3} y={cy-logoR+3} width={(logoR-3)*2} height={(logoR-3)*2} style={{pointerEvents:"none"}}/>
                        :<text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" style={{fontFamily:mono,fontSize:7,fontWeight:700,fill:rc,pointerEvents:"none"}}>{teamAbbr(t)}</text>}
                        {isHov&&<text x={cx} y={cy-logoR-4} textAnchor="middle" style={{fontFamily:mono,fontSize:8,fontWeight:700,fill:"#e5e5e5",pointerEvents:"none"}}>{t.team}</text>}
                      </g>;
                    })}
                  </svg>
                </div>
                {/* Hover tooltip */}
                {madnessHover&&<div style={{position:"fixed",left:Math.min(madnessHover.cx+16,window.innerWidth-250),top:Math.max(madnessHover.cy-80,8),background:"#1a1a1a",color:"#e5e5e5",padding:"10px 14px",borderRadius:12,fontFamily:sans,fontSize:12,pointerEvents:"none",zIndex:9999,boxShadow:"0 4px 16px rgba(0,0,0,0.5)",border:"1px solid #2a2a2a",maxWidth:240}}>
                  <div style={{fontWeight:700,fontSize:14,marginBottom:4}}><span style={{color:REGION_COLORS[madnessHover.region]}}>{"\u25CF"}</span> {madnessHover.team}</div>
                  <div style={{fontFamily:mono,fontSize:10,color:"#a3a3a3",marginBottom:4}}>({madnessHover.seed}) {madnessHover.region} · {madnessHover.record} · {madnessHover.conf}</div>
                  <div style={{fontFamily:mono,fontSize:11}}>{xMeta.label}: <b>{madnessHover[madnessX]!=null?madnessHover[madnessX].toFixed(2):"N/A"}</b></div>
                  <div style={{fontFamily:mono,fontSize:11}}>{yMeta.label}: <b>{madnessHover[madnessY]!=null?madnessHover[madnessY].toFixed(2):"N/A"}</b></div>
                  <div style={{fontFamily:mono,fontSize:10,color:"#a3a3a3",marginTop:2}}>SRS: {madnessHover.srs?.toFixed(1)} · Net: {madnessHover.netRtg?.toFixed(1)}</div>
                </div>}
                {/* Region legend */}
                <div style={{display:"flex",gap:12,marginBottom:12,justifyContent:"center"}}>
                  {["East","South","West","Midwest"].map(r=><div key={r} style={{display:"flex",alignItems:"center",gap:4}}>
                    <div style={{width:10,height:10,borderRadius:99,background:REGION_COLORS[r]}}/>
                    <span style={{fontFamily:mono,fontSize:10,color:"#a3a3a3"}}>{r}</span>
                  </div>)}
                </div>
                {/* Leaderboard: top 10 closest to "best" corner */}
                <div style={{background:"#1a1a1a",border:"1px solid #2a2a2a",borderRadius:12,overflow:"hidden"}}>
                  <div style={{padding:"10px 14px",borderBottom:"1px solid #2a2a2a",display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:14}}>{"\uD83C\uDFC6"}</span>
                    <span style={{fontFamily:mono,fontSize:11,fontWeight:900,letterSpacing:1,color:"#e5e5e5",textTransform:"uppercase"}}>Best Corner — {xMeta.label} vs {yMeta.label}</span>
                  </div>
                  {ranked.slice(0,10).map((t,i)=>{const rc=REGION_COLORS[t.region]||"#525252";return<div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 14px",borderBottom:i<9?"1px solid #1f1f1f":"none"}}
                    onMouseEnter={e=>{e.currentTarget.style.background="#222";}}
                    onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}>
                    <span style={{fontFamily:mono,fontSize:10,color:"#525252",width:20,textAlign:"right",flexShrink:0}}>#{i+1}</span>
                    <div style={{width:10,height:10,borderRadius:99,background:rc,flexShrink:0}}/>
                    <span style={{fontFamily:sans,fontSize:12,fontWeight:600,color:"#e5e5e5",flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.team}</span>
                    <span style={{fontFamily:mono,fontSize:9,fontWeight:700,color:rc,background:rc+"22",border:`1px solid ${rc}44`,borderRadius:99,padding:"2px 8px",flexShrink:0}}>({t.seed}) {t.region}</span>
                    <span style={{fontFamily:mono,fontSize:11,fontWeight:700,color:"#e5e5e5",flexShrink:0,minWidth:50,textAlign:"right"}}>{t[madnessX]!=null?t[madnessX].toFixed(1):"-"}</span>
                    <span style={{fontFamily:mono,fontSize:11,fontWeight:700,color:"#a3a3a3",flexShrink:0,minWidth:50,textAlign:"right"}}>{t[madnessY]!=null?t[madnessY].toFixed(1):"-"}</span>
                  </div>;})}
                </div>
              </>;
            })()}

            {/* MATCHUP MODE */}
            {madnessMode==="matchup"&&(()=>{
              const allTeams=[...MARCH_MADNESS_TEAMS].sort((a,b)=>a.team.localeCompare(b.team));
              const tA=madnessTeamA?MARCH_MADNESS_TEAMS.find(t=>t.team===madnessTeamA):null;
              const tB=madnessTeamB?MARCH_MADNESS_TEAMS.find(t=>t.team===madnessTeamB):null;
              // Metrics for comparison — use the non-style metrics
              const compMetrics=MADNESS_METRICS.filter(m=>m.key!=="seed");
              return<>
                {/* Team dropdowns */}
                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16,flexWrap:"wrap"}}>
                  <select value={madnessTeamA||""} onChange={e=>{setMadnessTeamA(e.target.value||null);}} style={{fontFamily:sans,fontSize:13,fontWeight:600,padding:"8px 14px",borderRadius:10,border:"1px solid #2a2a2a",background:"#1a1a1a",color:"#e5e5e5",cursor:"pointer",minWidth:180}}>
                    <option value="">Select Team A</option>
                    {allTeams.map(t=><option key={t.team} value={t.team}>({t.seed}) {t.team} — {t.region}</option>)}
                  </select>
                  <span style={{fontFamily:font,fontSize:18,fontWeight:900,color:"#525252"}}>vs</span>
                  <select value={madnessTeamB||""} onChange={e=>{setMadnessTeamB(e.target.value||null);}} style={{fontFamily:sans,fontSize:13,fontWeight:600,padding:"8px 14px",borderRadius:10,border:"1px solid #2a2a2a",background:"#1a1a1a",color:"#e5e5e5",cursor:"pointer",minWidth:180}}>
                    <option value="">Select Team B</option>
                    {allTeams.map(t=><option key={t.team} value={t.team}>({t.seed}) {t.team} — {t.region}</option>)}
                  </select>
                </div>
                {tA&&tB&&(()=>{
                  const sameRegion=tA.region===tB.region;
                  const colorA=sameRegion?"#ec4899":(REGION_COLORS[tA.region]||"#dc2626");
                  const colorB=sameRegion?"#7c3aed":(REGION_COLORS[tB.region]||"#2563eb");
                  let winsA=0,winsB=0;
                  compMetrics.forEach(m=>{
                    const vA=tA[m.key],vB=tB[m.key];
                    if(vA==null||vB==null)return;
                    const better=m.inverted?(vA<vB?"A":"B"):(vA>vB?"A":"B");
                    if(better==="A")winsA++;else if(vA!==vB)winsB++;
                  });
                  const probA=winProb(tA.srs||0,tB.srs||0);
                  const probB=1-probA;
                  return<div style={{background:"#1a1a1a",border:"1px solid #2a2a2a",borderRadius:14,padding:"16px 20px"}}>
                    {/* Header with team names and win prob */}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                      <div style={{textAlign:"left"}}>
                        <div style={{fontFamily:font,fontSize:18,fontWeight:900,color:colorA}}>{tA.team}</div>
                        <div style={{fontFamily:mono,fontSize:10,color:"#737373"}}>({tA.seed}) {tA.region} · {tA.record}</div>
                      </div>
                      <div style={{textAlign:"center"}}>
                        <div style={{fontFamily:mono,fontSize:11,color:"#525252",marginBottom:2}}>win probability</div>
                        <div style={{display:"flex",gap:8,alignItems:"baseline"}}>
                          <span style={{fontFamily:mono,fontSize:22,fontWeight:900,color:colorA}}>{(probA*100).toFixed(0)}%</span>
                          <span style={{fontFamily:mono,fontSize:12,color:"#525252"}}>—</span>
                          <span style={{fontFamily:mono,fontSize:22,fontWeight:900,color:colorB}}>{(probB*100).toFixed(0)}%</span>
                        </div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontFamily:font,fontSize:18,fontWeight:900,color:colorB}}>{tB.team}</div>
                        <div style={{fontFamily:mono,fontSize:10,color:"#737373"}}>({tB.seed}) {tB.region} · {tB.record}</div>
                      </div>
                    </div>
                    {/* Win prob bar */}
                    <div style={{display:"flex",height:6,borderRadius:99,overflow:"hidden",marginBottom:16,background:"#0f0f0f"}}>
                      <div style={{width:`${probA*100}%`,background:colorA,transition:"width 0.3s"}}/>
                      <div style={{width:`${probB*100}%`,background:colorB,transition:"width 0.3s"}}/>
                    </div>
                    {/* Edge count */}
                    <div style={{textAlign:"center",marginBottom:14}}>
                      <span style={{fontFamily:mono,fontSize:12,color:winsA>winsB?colorA:winsB>winsA?colorB:"#737373",fontWeight:700}}>
                        {winsA>winsB?`${tA.team} wins ${winsA} metrics`:winsB>winsA?`${tB.team} wins ${winsB} metrics`:`tied at ${winsA} metrics`}
                      </span>
                      <span style={{fontFamily:mono,fontSize:11,color:"#525252"}}> ({winsA} — {winsB})</span>
                    </div>
                    {/* Metric bars */}
                    {compMetrics.map(m=>{
                      const vA=tA[m.key],vB=tB[m.key];
                      if(vA==null||vB==null)return<div key={m.key} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid #1f1f1f"}}>
                        <span style={{fontFamily:mono,fontSize:10,color:"#525252",width:110,textAlign:"center",flexShrink:0}}>{m.label}</span>
                        <span style={{fontFamily:sans,fontSize:11,color:"#525252",flex:1,textAlign:"center"}}>N/A</span>
                      </div>;
                      const better=m.inverted?(vA<vB?"A":vA>vB?"B":"tie"):(vA>vB?"A":vA<vB?"B":"tie");
                      const allVals=MARCH_MADNESS_TEAMS.map(t=>t[m.key]).filter(v=>v!=null);
                      const mMin=Math.min(...allVals),mMax=Math.max(...allVals);
                      const mRange=mMax-mMin||1;
                      const pctA=((vA-mMin)/mRange)*100;
                      const pctB=((vB-mMin)/mRange)*100;
                      const norm=mRange?(Math.abs(vA-vB)/mRange):0;const barPct=Math.min(norm*100,50);
                      return<div key={m.key} style={{display:"flex",alignItems:"center",gap:0,padding:"5px 0",borderBottom:"1px solid #1f1f1f"}}>
                        {/* Team A value */}
                        <span style={{fontFamily:mono,fontSize:11,fontWeight:better==="A"?900:500,color:better==="A"?colorA:"#525252",width:55,textAlign:"right",flexShrink:0}}>{typeof vA==="number"?vA.toFixed(vA<1&&vA>-1?3:1):vA}</span>
                        {/* Center-out bar */}
                        <div style={{flex:1,display:"flex",alignItems:"center",height:20,margin:"0 8px",position:"relative"}}>
                          <div style={{position:"absolute",left:0,right:0,top:"50%",height:2,background:"#2a2a2a",transform:"translateY(-50%)"}}/>
                          <div style={{position:"absolute",left:"50%",top:0,width:1,height:20,background:"#333"}}/>
                          {better==="A"&&<><div style={{position:"absolute",right:"50%",top:"50%",height:6,width:`${barPct}%`,background:colorA,borderRadius:"3px 0 0 3px",transform:"translateY(-50%)",transition:"width 0.3s"}}/><div style={{position:"absolute",right:`${50+barPct}%`,top:"50%",transform:"translate(50%,-50%)",width:10,height:10,borderRadius:99,background:colorA,border:"2px solid #fff",zIndex:2}}/></>}
                          {better==="B"&&<><div style={{position:"absolute",left:"50%",top:"50%",height:6,width:`${barPct}%`,background:colorB,borderRadius:"0 3px 3px 0",transform:"translateY(-50%)",transition:"width 0.3s"}}/><div style={{position:"absolute",left:`${50+barPct}%`,top:"50%",transform:"translate(-50%,-50%)",width:10,height:10,borderRadius:99,background:colorB,border:"2px solid #fff",zIndex:2}}/></>}
                          {better==="tie"&&<div style={{position:"absolute",left:"50%",top:"50%",transform:"translate(-50%,-50%)",width:6,height:6,borderRadius:99,background:"#525252"}}/>}
                        </div>
                        {/* Team B value */}
                        <span style={{fontFamily:mono,fontSize:11,fontWeight:better==="B"?900:500,color:better==="B"?colorB:"#525252",width:55,textAlign:"left",flexShrink:0}}>{typeof vB==="number"?vB.toFixed(vB<1&&vB>-1?3:1):vB}</span>
                        {/* Label */}
                        <span style={{fontFamily:mono,fontSize:9,color:"#525252",width:100,textAlign:"right",flexShrink:0,marginLeft:4}}>{m.label}</span>
                      </div>;
                    })}
                  </div>;
                })()}
                {(!tA||!tB)&&<div style={{textAlign:"center",padding:"60px 20px"}}>
                  <p style={{fontFamily:sans,fontSize:16,color:"#525252",marginBottom:6}}>select two teams to compare</p>
                  <p style={{fontFamily:mono,fontSize:11,color:"#3a3a3a"}}>head-to-head statistical breakdown + win probability</p>
                </div>}
              </>;
            })()}

            {/* UPSET FINDER MODE */}
            {madnessMode==="upset"&&(()=>{
              const matchups=buildMatchups();
              const upsetW=860,upsetH=440,uPad={t:30,r:30,b:50,l:60};
              const uPlotW=upsetW-uPad.l-uPad.r,uPlotH=upsetH-uPad.t-uPad.b;

              // X = seed difference, Y = SRS gap (closer = better upset candidate)
              const maxSeedDiff=Math.max(...matchups.map(m=>m.seedDiff));
              const maxSrsGap=Math.max(...matchups.map(m=>m.srsGap));
              const uxMin=0,uxMax=maxSeedDiff+1;
              const uyMin=0,uyMax=maxSrsGap+2;
              const usx=v=>uPad.l+((v-uxMin)/(uxMax-uxMin))*uPlotW;
              const usy=v=>uPad.t+((v-uyMin)/(uyMax-uyMin))*uPlotH; // lower SRS gap = top of chart (inverted for "best upsets at top-left")

              // Upset score: high seed diff + low SRS gap = juicy upset
              // Normalize both 0-100 and combine
              const upsetScore=(m)=>{
                const seedNorm=(m.seedDiff/(maxSeedDiff||1))*100;
                const srsNorm=(1-(m.srsGap/(maxSrsGap||1)))*100;
                return seedNorm*0.4+srsNorm*0.6;
              };
              const threshold=madnessUpsetSlider;
              const scoredMatchups=matchups.map(m=>({...m,score:upsetScore(m)}));
              const highlighted=scoredMatchups.filter(m=>m.score>=threshold);

              // Filter by region if needed
              const regionFiltered=madnessRegion==="ALL"?scoredMatchups:scoredMatchups.filter(m=>m.region===madnessRegion);

              return<>
                {/* Region pills */}
                <div style={{display:"flex",gap:5,marginBottom:10}}>
                  {MM_REGIONS.map(r=>{const active=madnessRegion===r;const c=r==="ALL"?"#e5e5e5":REGION_COLORS[r];return<button key={r} onClick={()=>setMadnessRegion(r)} style={{fontFamily:mono,fontSize:10,fontWeight:700,padding:"5px 12px",background:active?c:"transparent",color:active?(r==="ALL"||r==="South"?"#171717":"#fff"):c,border:`1.5px solid ${active?c:c+"44"}`,borderRadius:99,cursor:"pointer",transition:"all 0.15s"}}>{r}</button>;})}
                </div>
                {/* Upset aggressiveness slider */}
                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
                  <span style={{fontFamily:mono,fontSize:10,color:"#737373",textTransform:"uppercase",letterSpacing:1}}>upset threshold</span>
                  <input type="range" min={0} max={80} value={madnessUpsetSlider} onChange={e=>setMadnessUpsetSlider(Number(e.target.value))} style={{flex:1,maxWidth:300,accentColor:"#ea580c"}}/>
                  <span style={{fontFamily:mono,fontSize:11,color:"#ea580c",fontWeight:700}}>{highlighted.length} upset{highlighted.length!==1?"s":""}</span>
                </div>
                {/* SVG scatter */}
                <div style={{background:"#1a1a1a",border:"1px solid #2a2a2a",borderRadius:14,padding:12,marginBottom:16,overflow:"hidden"}}>
                  <svg width="100%" viewBox={`0 0 ${upsetW} ${upsetH}`} style={{display:"block"}}>
                    {/* Grid */}
                    {Array.from({length:6}).map((_,i)=>{const x=uPad.l+(uPlotW/5)*i;return<line key={`ugx${i}`} x1={x} y1={uPad.t} x2={x} y2={uPad.t+uPlotH} stroke="#2a2a2a" strokeWidth={1}/>;})}
                    {Array.from({length:6}).map((_,i)=>{const y=uPad.t+(uPlotH/5)*i;return<line key={`ugy${i}`} x1={uPad.l} y1={y} x2={uPad.l+uPlotW} y2={y} stroke="#2a2a2a" strokeWidth={1}/>;})}
                    {/* "Upset Zone" highlight area — top left */}
                    <rect x={uPad.l} y={uPad.t} width={uPlotW*0.4} height={uPlotH*0.4} fill="#ea580c" opacity={0.06} rx={8}/>
                    <text x={uPad.l+10} y={uPad.t+18} style={{fontFamily:mono,fontSize:9,fill:"#ea580c",opacity:0.5}}>UPSET ZONE</text>
                    {/* Axis labels */}
                    <text x={uPad.l+uPlotW/2} y={upsetH-6} textAnchor="middle" style={{fontFamily:sans,fontSize:11,fill:"#737373"}}>Seed Difference (larger = bigger upset)</text>
                    <text x={14} y={uPad.t+uPlotH/2} textAnchor="middle" transform={`rotate(-90,14,${uPad.t+uPlotH/2})`} style={{fontFamily:sans,fontSize:11,fill:"#737373"}}>SRS Gap (smaller = more vulnerable)</text>
                    {/* Tick labels */}
                    {Array.from({length:6}).map((_,i)=>{const v=uxMin+(uxMax-uxMin)*(i/5);return<text key={`utx${i}`} x={uPad.l+(uPlotW/5)*i} y={uPad.t+uPlotH+16} textAnchor="middle" style={{fontFamily:mono,fontSize:9,fill:"#525252"}}>{Math.round(v)}</text>;})}
                    {Array.from({length:6}).map((_,i)=>{const v=uyMin+(uyMax-uyMin)*(i/5);return<text key={`uty${i}`} x={uPad.l-8} y={uPad.t+(uPlotH/5)*i+4} textAnchor="end" style={{fontFamily:mono,fontSize:9,fill:"#525252"}}>{v.toFixed(1)}</text>;})}
                    {/* Matchup dots */}
                    {regionFiltered.map((m,i)=>{
                      const cx=usx(m.seedDiff);
                      const cy=usy(m.srsGap);
                      const rc=REGION_COLORS[m.region]||"#737373";
                      const hot=m.score>=threshold;
                      const isHov=madnessHover?.key===`${m.higher.team}-${m.lower.team}`;
                      return<g key={i} onMouseEnter={e=>setMadnessHover({...m,key:`${m.higher.team}-${m.lower.team}`,cx:e.clientX,cy:e.clientY})} onMouseLeave={()=>setMadnessHover(null)} onClick={()=>setMadnessMatchupDetail(m)} style={{cursor:"pointer"}}>
                        <circle cx={cx} cy={cy} r={isHov?10:hot?8:6} fill={hot?rc:"#3a3a3a"} opacity={hot?0.95:0.4} stroke={isHov?"#fff":hot?"#fff":"none"} strokeWidth={isHov?2:hot?1:0}/>
                        {(isHov||hot)&&<text x={cx} y={cy-12} textAnchor="middle" style={{fontFamily:mono,fontSize:7,fontWeight:700,fill:hot?"#e5e5e5":"#737373",pointerEvents:"none"}}>{m.lower.seed}v{m.higher.seed}</text>}
                      </g>;
                    })}
                  </svg>
                </div>
                {/* Hover tooltip */}
                {madnessHover&&madnessHover.higher&&<div style={{position:"fixed",left:Math.min((madnessHover.cx||200)+16,window.innerWidth-280),top:Math.max((madnessHover.cy||200)-100,8),background:"#1a1a1a",color:"#e5e5e5",padding:"12px 16px",borderRadius:12,fontFamily:sans,fontSize:12,pointerEvents:"none",zIndex:9999,boxShadow:"0 4px 16px rgba(0,0,0,0.5)",border:"1px solid #2a2a2a",maxWidth:280}}>
                  <div style={{fontWeight:700,fontSize:14,marginBottom:4}}><span style={{color:REGION_COLORS[madnessHover.region]}}>{"\u25CF"}</span> ({madnessHover.higher.seed}) {madnessHover.higher.team} vs ({madnessHover.lower.seed}) {madnessHover.lower.team}</div>
                  <div style={{fontFamily:mono,fontSize:10,color:"#a3a3a3",marginBottom:4}}>{madnessHover.region} Region</div>
                  <div style={{fontFamily:mono,fontSize:11}}>Seed gap: {madnessHover.seedDiff} · SRS gap: {madnessHover.srsGap.toFixed(1)}</div>
                  <div style={{fontFamily:mono,fontSize:11}}>Net rating gap: {madnessHover.ratingGap.toFixed(1)}</div>
                  <div style={{fontFamily:mono,fontSize:10,color:"#ea580c",fontWeight:700,marginTop:4}}>Upset score: {madnessHover.score.toFixed(0)}/100</div>
                </div>}
                {/* Matchup detail card */}
                {madnessMatchupDetail&&(()=>{
                  const md=madnessMatchupDetail;
                  const colorH=REGION_COLORS[md.higher.region]||"#2563eb";
                  const colorL=REGION_COLORS[md.lower.region]||"#dc2626";
                  const probH=winProb(md.higher.srs||0,md.lower.srs||0);
                  return<div style={{background:"#1a1a1a",border:"1px solid #2a2a2a",borderRadius:14,padding:"16px 20px",marginBottom:16}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                      <div><div style={{fontFamily:font,fontSize:16,fontWeight:900,color:colorH}}>({md.higher.seed}) {md.higher.team}</div><div style={{fontFamily:mono,fontSize:10,color:"#525252"}}>{md.higher.record} · SRS {md.higher.srs?.toFixed(1)}</div></div>
                      <div style={{textAlign:"center"}}>
                        <div style={{fontFamily:mono,fontSize:9,color:"#525252",marginBottom:2}}>upset probability</div>
                        <div style={{fontFamily:mono,fontSize:20,fontWeight:900,color:"#ea580c"}}>{((1-probH)*100).toFixed(0)}%</div>
                      </div>
                      <div style={{textAlign:"right"}}><div style={{fontFamily:font,fontSize:16,fontWeight:900,color:colorL}}>({md.lower.seed}) {md.lower.team}</div><div style={{fontFamily:mono,fontSize:10,color:"#525252"}}>{md.lower.record} · SRS {md.lower.srs?.toFixed(1)}</div></div>
                    </div>
                    <div style={{display:"flex",gap:12,flexWrap:"wrap",fontFamily:mono,fontSize:11,color:"#a3a3a3"}}>
                      <span>Seed diff: <b style={{color:"#e5e5e5"}}>{md.seedDiff}</b></span>
                      <span>SRS gap: <b style={{color:"#e5e5e5"}}>{md.srsGap.toFixed(1)}</b></span>
                      <span>Net Rtg gap: <b style={{color:"#e5e5e5"}}>{md.ratingGap.toFixed(1)}</b></span>
                      <span>Upset score: <b style={{color:"#ea580c"}}>{md.score.toFixed(0)}/100</b></span>
                    </div>
                    <button onClick={()=>setMadnessMatchupDetail(null)} style={{fontFamily:sans,fontSize:10,color:"#525252",background:"transparent",border:"none",cursor:"pointer",marginTop:8,padding:0}}>dismiss</button>
                  </div>;
                })()}
                {/* Ranked upset list */}
                <div style={{background:"#1a1a1a",border:"1px solid #2a2a2a",borderRadius:12,overflow:"hidden"}}>
                  <div style={{padding:"10px 14px",borderBottom:"1px solid #2a2a2a",display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:14}}>{"\uD83D\uDD25"}</span>
                    <span style={{fontFamily:mono,fontSize:11,fontWeight:900,letterSpacing:1,color:"#e5e5e5",textTransform:"uppercase"}}>Best Upset Picks</span>
                  </div>
                  {regionFiltered.sort((a,b)=>b.score-a.score).slice(0,10).map((m,i)=>{
                    const rc=REGION_COLORS[m.region]||"#525252";
                    const hot=m.score>=threshold;
                    return<div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 14px",borderBottom:i<9?"1px solid #1f1f1f":"none",opacity:hot?1:0.5,cursor:"pointer"}} onClick={()=>setMadnessMatchupDetail(m)}
                      onMouseEnter={e=>{e.currentTarget.style.background="#222";}}
                      onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}>
                      <span style={{fontFamily:mono,fontSize:10,color:"#525252",width:20,textAlign:"right",flexShrink:0}}>#{i+1}</span>
                      <div style={{width:8,height:8,borderRadius:99,background:rc,flexShrink:0}}/>
                      <span style={{fontFamily:sans,fontSize:12,fontWeight:600,color:"#e5e5e5",flex:1,minWidth:0}}>({m.lower.seed}) {m.lower.team} over ({m.higher.seed}) {m.higher.team}</span>
                      <span style={{fontFamily:mono,fontSize:9,color:rc,flexShrink:0}}>{m.region}</span>
                      <span style={{fontFamily:mono,fontSize:11,fontWeight:700,color:m.score>=60?"#ea580c":"#737373",flexShrink:0,minWidth:40,textAlign:"right"}}>{m.score.toFixed(0)}</span>
                    </div>;
                  })}
                </div>
              </>;
            })()}

            {/* BBL WEIGHT MODE */}
            {madnessMode==="weight"&&(()=>{
              const allTeams=[...MARCH_MADNESS_TEAMS].sort((a,b)=>a.team.localeCompare(b.team));
              const tA=madnessTeamA?MARCH_MADNESS_TEAMS.find(t=>t.team===madnessTeamA):null;
              const tB=madnessTeamB?MARCH_MADNESS_TEAMS.find(t=>t.team===madnessTeamB):null;
              const rosterA=madnessTeamA?MADNESS_ROSTERS.find(r=>r.team===madnessTeamA):null;
              const rosterB=madnessTeamB?MADNESS_ROSTERS.find(r=>r.team===madnessTeamB):null;

              // Year to numeric for experience scoring
              const yrVal=y=>{const l=(y||"").toLowerCase();return l.includes("senior")||l==="sr"?4:l.includes("junior")||l==="jr"?3:l.includes("sophomore")||l==="so"?2:l.includes("freshman")||l==="fr"?1:l.includes("redshirt")?3:2;};
              const yrAbbr=y=>{const v=yrVal(y);return v===4?"SR":v===3?"JR":v===2?"SO":"FR";};
              const yrColor=v=>v>=4?"#a855f7":v>=3?"#3b82f6":v>=2?"#fbbf24":"#f87171";

              // Parse height string to inches
              const htInches=h=>{if(!h)return 0;const m=h.match(/(\d+)['\u2032]\s*(\d+)/);if(m)return parseInt(m[1])*12+parseInt(m[2]);const m2=h.match(/(\d+)-(\d+)/);if(m2)return parseInt(m2[1])*12+parseInt(m2[2]);return 0;};

              // BBL Weight comparison metrics
              const weightMetrics=[
                {key:"ortg",label:"Off. Efficiency",desc:"Points per 100 possessions",higher:"better",source:"team"},
                {key:"drtg",label:"Def. Efficiency",desc:"Opponent points per 100 possessions",higher:"worse",inverted:true,source:"team"},
                {key:"threePPct",label:"3PT%",desc:"Three-point shooting percentage",higher:"better",source:"roster",fmt:v=>(v*100).toFixed(1)+"%"},
                {key:"opp3PPct",label:"Opp 3PT%",desc:"Opponent three-point percentage",higher:"worse",inverted:true,source:"roster",fmt:v=>(v*100).toFixed(1)+"%"},
                {key:"ftPct",label:"FT%",desc:"Free throw percentage",higher:"better",source:"roster",fmt:v=>(v*100).toFixed(1)+"%"},
                {key:"benchAvgMin",label:"Bench Avg Min",desc:"Average minutes per bench player",higher:"deeper",source:"roster",fmt:v=>v.toFixed(1)},
                {key:"last10",label:"Last 10",desc:"Record in last 10 games",higher:"better",source:"roster",fmt:v=>v,isLast10:true},
              ];

              const getVal=(team,roster,m)=>{
                if(m.isLast10){const v=roster?.last10;if(!v)return null;return parseInt(v);}
                if(m.source==="roster"&&roster)return roster[m.key];
                return team?team[m.key]:null;
              };

              // Compute BBL Weight score
              const norm=(val,arr,inverted)=>{const min=Math.min(...arr),max=Math.max(...arr),range=max-min||1;return inverted?((max-val)/range)*100:((val-min)/range)*100;};
              const computeWeight=(team,roster)=>{
                if(!team||!roster)return null;
                const starters=roster.starters||[];
                // Experience: avg class year (4=senior,1=fr), normalized 0-100
                const avgYr=starters.length>0?starters.reduce((s,p)=>s+yrVal(p.year),0)/starters.length:2;
                const expScore=((avgYr-1)/3)*100;
                // Offensive efficiency
                const offScore=norm(team.ortg,MARCH_MADNESS_TEAMS.map(t=>t.ortg),false);
                // Defensive efficiency (lower is better)
                const defScore=norm(team.drtg,MARCH_MADNESS_TEAMS.map(t=>t.drtg),true);
                // 3PT shooting
                const shootScore=roster.threePPct!=null?norm(roster.threePPct,MADNESS_ROSTERS.map(r=>r.threePPct).filter(v=>v!=null),false):50;
                // Opp 3PT defense (lower is better)
                const opp3Score=roster.opp3PPct!=null?norm(roster.opp3PPct,MADNESS_ROSTERS.map(r=>r.opp3PPct).filter(v=>v!=null),true):50;
                // FT Rate (FTA/FGA — how often you get to the line)
                const ftScore=norm(team.ftr,MARCH_MADNESS_TEAMS.map(t=>t.ftr),false);
                // Size: avg height of starters in inches
                const avgHt=starters.length>0?starters.reduce((s,p)=>s+htInches(p.height),0)/starters.length:76;
                const sizeScore=Math.min(100,Math.max(0,((avgHt-72)/(82-72))*100));
                // Bench depth (higher avg bench min = deeper bench)
                const benchScore=roster.benchAvgMin!=null?Math.min(100,Math.max(0,(roster.benchAvgMin/20)*100)):50;
                // Last 10 momentum
                const l10w=roster.last10?parseInt(roster.last10):5;
                const l10Score=(l10w/10)*100;
                // Weighted composite
                const total=expScore*0.12+offScore*0.12+defScore*0.14+shootScore*0.12+opp3Score*0.10+ftScore*0.08+sizeScore*0.10+benchScore*0.06+l10Score*0.08+((team.srs||0)>0?5:0);
                return {
                  total,exp:expScore,off:offScore,def:defScore,shoot:shootScore,opp3:opp3Score,ft:ftScore,size:sizeScore,bench:benchScore,l10:l10Score,
                  avgYr,avgHt
                };
              };

              const wA=computeWeight(tA,rosterA);
              const wB=computeWeight(tB,rosterB);
              const edge=wA&&wB?(wA.total-wB.total):0;
              const edgeLabel=Math.abs(edge)<3?"Coin Flip":Math.abs(edge)<8?"Slight Edge":Math.abs(edge)<15?"Clear Edge":"Strong Edge";
              const favored=edge>0?tA:edge<0?tB:null;

              return<>
                {/* Team dropdowns */}
                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16,flexWrap:"wrap"}}>
                  <select value={madnessTeamA||""} onChange={e=>{setMadnessTeamA(e.target.value||null);}} style={{fontFamily:sans,fontSize:13,fontWeight:600,padding:"8px 14px",borderRadius:10,border:"1px solid #2a2a2a",background:"#1a1a1a",color:"#e5e5e5",cursor:"pointer",minWidth:180}}>
                    <option value="">Select Team A</option>
                    {allTeams.map(t=><option key={t.team} value={t.team}>({t.seed}) {t.team} — {t.region}</option>)}
                  </select>
                  <span style={{fontFamily:font,fontSize:18,fontWeight:900,color:"#525252"}}>vs</span>
                  <select value={madnessTeamB||""} onChange={e=>{setMadnessTeamB(e.target.value||null);}} style={{fontFamily:sans,fontSize:13,fontWeight:600,padding:"8px 14px",borderRadius:10,border:"1px solid #2a2a2a",background:"#1a1a1a",color:"#e5e5e5",cursor:"pointer",minWidth:180}}>
                    <option value="">Select Team B</option>
                    {allTeams.map(t=><option key={t.team} value={t.team}>({t.seed}) {t.team} — {t.region}</option>)}
                  </select>
                </div>

                {tA&&tB&&rosterA&&rosterB&&(()=>{
                  const colorA=MADNESS_SCHOOL_COLORS[tA.team]||"#dc2626";
                  const colorB=MADNESS_SCHOOL_COLORS[tB.team]||"#2563eb";
                  const logoA=madnessLogo(tA.team);
                  const logoB=madnessLogo(tB.team);
                  // Light-mode palette
                  const bg="#fff",bg2="#faf9f6",border1="#e5e5e5",border2="#f0f0f0",txt="#171717",txt2="#525252",txt3="#a3a3a3";

                  // Percentile rank helper: where does val sit among sorted arr? (0-100, higher=better)
                  const pctRank=(val,arr,inv)=>{if(!arr.length)return 50;const sorted=[...arr].sort((a,b)=>a-b);const below=sorted.filter(v=>v<val).length;const equal=sorted.filter(v=>v===val).length;const raw=(below+equal*0.5)/sorted.length*100;return inv?100-raw:raw;};

                  // Build field arrays once for percentile computation
                  const fieldOrtg=MARCH_MADNESS_TEAMS.map(t=>t.ortg);
                  const fieldDrtg=MARCH_MADNESS_TEAMS.map(t=>t.drtg);
                  const fieldFtr=MARCH_MADNESS_TEAMS.map(t=>t.ftr);
                  const field3P=MADNESS_ROSTERS.map(r=>r.threePPct).filter(v=>v!=null);
                  const fieldOpp3=MADNESS_ROSTERS.map(r=>r.opp3PPct).filter(v=>v!=null);
                  const fieldBench=MADNESS_ROSTERS.map(r=>r.benchAvgMin).filter(v=>v!=null);
                  const fieldL10=MADNESS_ROSTERS.map(r=>r.last10?parseInt(r.last10):null).filter(v=>v!=null);
                  const fieldAvgYr=MADNESS_ROSTERS.map(r=>{const s=r.starters||[];return s.length?s.reduce((sum,p)=>sum+yrVal(p.year),0)/s.length:2;});
                  const fieldAvgHt=MADNESS_ROSTERS.map(r=>{const s=r.starters||[];return s.length?s.reduce((sum,p)=>sum+htInches(p.height),0)/s.length:76;});

                  const avgYrA=wA?.avgYr||2,avgYrB=wB?.avgYr||2;
                  const avgHtA=wA?.avgHt||76,avgHtB=wB?.avgHt||76;
                  const fmtHt=h=>`${Math.floor(h/12)}'${Math.round(h%12)}"`;

                  const allMetrics=[
                    {key:"avgYr",label:"Avg Class Year",vA:avgYrA,vB:avgYrB,fA:avgYrA.toFixed(1),fB:avgYrB.toFixed(1),pctA:pctRank(avgYrA,fieldAvgYr),pctB:pctRank(avgYrB,fieldAvgYr)},
                    {key:"avgHt",label:"Avg Height",vA:avgHtA,vB:avgHtB,fA:fmtHt(avgHtA),fB:fmtHt(avgHtB),pctA:pctRank(avgHtA,fieldAvgHt),pctB:pctRank(avgHtB,fieldAvgHt)},
                    {key:"ortg",label:"Off. Efficiency",vA:tA.ortg,vB:tB.ortg,pctA:pctRank(tA.ortg,fieldOrtg),pctB:pctRank(tB.ortg,fieldOrtg)},
                    {key:"drtg",label:"Def. Efficiency",vA:tA.drtg,vB:tB.drtg,inv:true,pctA:pctRank(tA.drtg,fieldDrtg,true),pctB:pctRank(tB.drtg,fieldDrtg,true)},
                    {key:"threePPct",label:"3PT%",vA:rosterA.threePPct,vB:rosterB.threePPct,pct:true,pctA:pctRank(rosterA.threePPct,field3P),pctB:pctRank(rosterB.threePPct,field3P)},
                    {key:"opp3PPct",label:"Opp 3PT%",vA:rosterA.opp3PPct,vB:rosterB.opp3PPct,inv:true,pct:true,pctA:pctRank(rosterA.opp3PPct,fieldOpp3,true),pctB:pctRank(rosterB.opp3PPct,fieldOpp3,true)},
                    {key:"ftr",label:"FT Rate",vA:tA.ftr,vB:tB.ftr,pct:true,pctA:pctRank(tA.ftr,fieldFtr),pctB:pctRank(tB.ftr,fieldFtr)},
                    {key:"benchAvgMin",label:"Bench Avg Min",vA:rosterA.benchAvgMin,vB:rosterB.benchAvgMin,pctA:pctRank(rosterA.benchAvgMin||0,fieldBench),pctB:pctRank(rosterB.benchAvgMin||0,fieldBench)},
                    {key:"last10",label:"Last 10",vA:rosterA.last10?parseInt(rosterA.last10):null,vB:rosterB.last10?parseInt(rosterB.last10):null,fA:rosterA.last10,fB:rosterB.last10,pctA:pctRank(rosterA.last10?parseInt(rosterA.last10):5,fieldL10),pctB:pctRank(rosterB.last10?parseInt(rosterB.last10):5,fieldL10)},
                  ];

                  return<div style={{display:"flex",flexDirection:"column",gap:16}}>
                    {/* ── VERDICT BANNER ── */}
                    <div style={{background:bg,border:`1px solid ${border1}`,borderRadius:14,padding:"20px 24px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                        <div style={{display:"flex",alignItems:"center",gap:10}}>
                          {logoA&&<img src={logoA} alt="" style={{width:36,height:36,objectFit:"contain"}}/>}
                          <div>
                            <div style={{fontFamily:font,fontSize:18,fontWeight:900,color:colorA}}>{tA.team}</div>
                            <div style={{fontFamily:mono,fontSize:10,color:txt3}}>({tA.seed}) {tA.region} · {tA.record}{rosterA.last10?` · L10: ${rosterA.last10}`:""}</div>
                          </div>
                        </div>
                        <div style={{textAlign:"center"}}>
                          <div style={{fontFamily:mono,fontSize:9,letterSpacing:1,color:txt3,textTransform:"uppercase",marginBottom:2}}>BBL Weight</div>
                          {wA&&wB?<>
                            <div style={{fontFamily:font,fontSize:28,fontWeight:900,color:Math.abs(edge)<3?txt3:edge>0?colorA:colorB,lineHeight:1}}>{edgeLabel}</div>
                            <div style={{fontFamily:mono,fontSize:11,color:Math.abs(edge)<3?txt2:edge>0?colorA:colorB,marginTop:2}}>{favored?favored.team:"—"} {Math.abs(edge)>=3?`+${Math.abs(edge).toFixed(0)}`:"~"}</div>
                          </>:<div style={{fontFamily:mono,fontSize:12,color:txt2}}>calculating...</div>}
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:10,justifyContent:"flex-end"}}>
                          <div style={{textAlign:"right"}}>
                            <div style={{fontFamily:font,fontSize:18,fontWeight:900,color:colorB}}>{tB.team}</div>
                            <div style={{fontFamily:mono,fontSize:10,color:txt3}}>({tB.seed}) {tB.region} · {tB.record}{rosterB.last10?` · L10: ${rosterB.last10}`:""}</div>
                          </div>
                          {logoB&&<img src={logoB} alt="" style={{width:36,height:36,objectFit:"contain"}}/>}
                        </div>
                      </div>
                      {wA&&wB&&<div style={{display:"flex",height:6,borderRadius:99,overflow:"hidden",background:border1}}>
                        <div style={{width:`${Math.max(10,Math.min(90,(wA.total/(wA.total+wB.total))*100))}%`,background:colorA,transition:"width 0.3s"}}/>
                        <div style={{flex:1,background:colorB,transition:"width 0.3s"}}/>
                      </div>}
                      {wA&&wB&&<div style={{display:"flex",gap:6,marginTop:10,flexWrap:"wrap",justifyContent:"center"}}>
                        {[
                          {label:"Experience",a:wA.exp,b:wB.exp},
                          {label:"Off. Efficiency",a:wA.off,b:wB.off},
                          {label:"Def. Efficiency",a:wA.def,b:wB.def},
                          {label:"3PT Shooting",a:wA.shoot,b:wB.shoot},
                          {label:"3PT Defense",a:wA.opp3,b:wB.opp3},
                          {label:"FT Rate",a:wA.ft,b:wB.ft},
                          {label:"Size",a:wA.size,b:wB.size},
                          {label:"Bench Depth",a:wA.bench,b:wB.bench},
                          {label:"Last 10",a:wA.l10,b:wB.l10},
                        ].map(f=>{const winner=f.a>f.b?"A":f.b>f.a?"B":"tie";const wc=winner==="A"?colorA:winner==="B"?colorB:txt3;return<div key={f.label} style={{fontFamily:mono,fontSize:9,padding:"3px 8px",borderRadius:99,border:`1px solid ${wc}44`,background:wc+"0d",color:wc,fontWeight:700}}>{f.label}</div>;})}
                      </div>}
                    </div>

                    {/* ── STARTING 5 DEPTH CHART ── */}
                    <div style={{background:bg,border:`1px solid ${border1}`,borderRadius:14,padding:"16px 20px"}}>
                      <div style={{fontFamily:mono,fontSize:10,letterSpacing:1,color:txt3,textTransform:"uppercase",marginBottom:12}}>Starting 5</div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 60px 1fr",gap:0}}>
                        <div style={{fontFamily:mono,fontSize:9,color:colorA,fontWeight:700,textAlign:"right",padding:"0 8px 6px",borderBottom:`1px solid ${border1}`}}>{tA.team}</div>
                        <div style={{fontFamily:mono,fontSize:9,color:txt3,textAlign:"center",padding:"0 4px 6px",borderBottom:`1px solid ${border1}`}}>POS</div>
                        <div style={{fontFamily:mono,fontSize:9,color:colorB,fontWeight:700,padding:"0 8px 6px",borderBottom:`1px solid ${border1}`}}>{tB.team}</div>
                        {Array.from({length:5}).map((_,i)=>{
                          const pA=(rosterA.starters||[])[i]||{};
                          const pB=(rosterB.starters||[])[i]||{};
                          const htA=htInches(pA.height);const htB=htInches(pB.height);
                          const wtA=pA.weight||0;const wtB=pB.weight||0;
                          const yrA=yrVal(pA.year);const yrB=yrVal(pB.year);
                          const htWin=htA>htB?"A":htB>htA?"B":"tie";
                          const wtWin=wtA>wtB?"A":wtB>wtA?"B":"tie";
                          const yrWin=yrA>yrB?"A":yrB>yrA?"B":"tie";
                          return<Fragment key={i}>
                            <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:6,padding:"8px 8px",borderBottom:i<4?`1px solid ${border2}`:"none"}}>
                              <div style={{textAlign:"right"}}>
                                <div style={{fontFamily:sans,fontSize:11,fontWeight:600,color:txt}}>{pA.name||"—"}</div>
                                <div style={{display:"flex",gap:4,justifyContent:"flex-end",marginTop:2}}>
                                  <span style={{fontFamily:mono,fontSize:9,color:yrWin==="A"?colorA:txt3,fontWeight:yrWin==="A"?700:400}}>{yrAbbr(pA.year)}</span>
                                  <span style={{fontFamily:mono,fontSize:9,color:htWin==="A"?colorA:txt3,fontWeight:htWin==="A"?700:400}}>{pA.height||"—"}</span>
                                  <span style={{fontFamily:mono,fontSize:9,color:wtWin==="A"?colorA:txt3,fontWeight:wtWin==="A"?700:400}}>{pA.weight?pA.weight+"lb":"—"}</span>
                                </div>
                              </div>
                              <div style={{width:6,height:6,borderRadius:99,background:yrColor(yrA),flexShrink:0}}/>
                            </div>
                            <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"8px 4px",borderBottom:i<4?`1px solid ${border2}`:"none"}}>
                              <span style={{fontFamily:mono,fontSize:11,fontWeight:900,color:txt3}}>{pA.pos||pB.pos||"—"}</span>
                            </div>
                            <div style={{display:"flex",alignItems:"center",gap:6,padding:"8px 8px",borderBottom:i<4?`1px solid ${border2}`:"none"}}>
                              <div style={{width:6,height:6,borderRadius:99,background:yrColor(yrB),flexShrink:0}}/>
                              <div>
                                <div style={{fontFamily:sans,fontSize:11,fontWeight:600,color:txt}}>{pB.name||"—"}</div>
                                <div style={{display:"flex",gap:4,marginTop:2}}>
                                  <span style={{fontFamily:mono,fontSize:9,color:yrWin==="B"?colorB:txt3,fontWeight:yrWin==="B"?700:400}}>{yrAbbr(pB.year)}</span>
                                  <span style={{fontFamily:mono,fontSize:9,color:htWin==="B"?colorB:txt3,fontWeight:htWin==="B"?700:400}}>{pB.height||"—"}</span>
                                  <span style={{fontFamily:mono,fontSize:9,color:wtWin==="B"?colorB:txt3,fontWeight:wtWin==="B"?700:400}}>{pB.weight?pB.weight+"lb":"—"}</span>
                                </div>
                              </div>
                            </div>
                          </Fragment>;
                        })}
                      </div>
                      {wA&&wB&&<div style={{display:"flex",gap:12,marginTop:12,justifyContent:"center",fontFamily:mono,fontSize:10}}>
                        <span style={{color:txt3}}>Avg Class: <b style={{color:colorA}}>{wA.avgYr.toFixed(1)}</b> vs <b style={{color:colorB}}>{wB.avgYr.toFixed(1)}</b></span>
                        <span style={{color:txt3}}>Avg Height: <b style={{color:colorA}}>{fmtHt(avgHtA)}</b> vs <b style={{color:colorB}}>{fmtHt(avgHtB)}</b></span>
                      </div>}
                    </div>

                    {/* ── STAT COMPARISON BARS ── */}
                    <div style={{background:bg,border:`1px solid ${border1}`,borderRadius:14,padding:"16px 20px"}}>
                      <div style={{fontFamily:mono,fontSize:10,letterSpacing:1,color:txt3,textTransform:"uppercase",marginBottom:12}}>Statistical Comparison</div>
                      {allMetrics.map(m=>{
                        const vA=m.vA,vB=m.vB;
                        if(vA==null||vB==null)return<div key={m.key} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:`1px solid ${border2}`}}>
                          <span style={{fontFamily:mono,fontSize:10,color:txt3,width:110,textAlign:"center",flexShrink:0}}>{m.label}</span>
                          <span style={{fontFamily:sans,fontSize:11,color:txt3,flex:1,textAlign:"center"}}>N/A</span>
                        </div>;
                        // Bar = percentile advantage over opponent. Scaled so typical gaps are visible.
                        const better=m.pctA>m.pctB?"A":m.pctB>m.pctA?"B":"tie";
                        const pctGap=Math.abs(m.pctA-m.pctB);
                        const barPct=Math.min(pctGap*0.48,48); // straight percentile gap → bar width, no inflation
                        const fA=m.fA||(m.pct?(vA*100).toFixed(1)+"%":typeof vA==="number"?vA.toFixed(1):vA);
                        const fB=m.fB||(m.pct?(vB*100).toFixed(1)+"%":typeof vB==="number"?vB.toFixed(1):vB);
                        return<div key={m.key} style={{display:"flex",alignItems:"center",gap:0,padding:"5px 0",borderBottom:`1px solid ${border2}`}}>
                          <span style={{fontFamily:mono,fontSize:11,fontWeight:better==="A"?900:500,color:better==="A"?colorA:txt3,width:55,textAlign:"right",flexShrink:0,position:"relative",zIndex:3}}>{fA}</span>
                          <div style={{flex:1,display:"flex",alignItems:"center",height:20,margin:"0 8px",position:"relative"}}>
                            <div style={{position:"absolute",left:0,right:0,top:"50%",height:2,background:border1,transform:"translateY(-50%)"}}/>
                            <div style={{position:"absolute",left:"50%",top:0,width:1,height:20,background:border1}}/>
                            {better==="A"&&<><div style={{position:"absolute",right:"50%",top:"50%",height:8,width:`${barPct}%`,background:colorA,borderRadius:"4px 0 0 4px",transform:"translateY(-50%)",transition:"width 0.3s",border:`1px solid ${colorA}`,boxShadow:`0 0 4px ${colorA}33`}}/><div style={{position:"absolute",right:`${50+barPct}%`,top:"50%",transform:"translate(50%,-50%)",width:12,height:12,borderRadius:99,background:colorA,border:`2px solid ${bg}`,zIndex:2,boxShadow:`0 1px 4px rgba(0,0,0,0.2)`}}/></>}
                            {better==="B"&&<><div style={{position:"absolute",left:"50%",top:"50%",height:8,width:`${barPct}%`,background:colorB,borderRadius:"0 4px 4px 0",transform:"translateY(-50%)",transition:"width 0.3s",border:`1px solid ${colorB}`,boxShadow:`0 0 4px ${colorB}33`}}/><div style={{position:"absolute",left:`${50+barPct}%`,top:"50%",transform:"translate(-50%,-50%)",width:12,height:12,borderRadius:99,background:colorB,border:`2px solid ${bg}`,zIndex:2,boxShadow:`0 1px 4px rgba(0,0,0,0.2)`}}/></>}
                            {better==="tie"&&<div style={{position:"absolute",left:"50%",top:"50%",transform:"translate(-50%,-50%)",width:6,height:6,borderRadius:99,background:txt3}}/>}
                          </div>
                          <span style={{fontFamily:mono,fontSize:11,fontWeight:better==="B"?900:500,color:better==="B"?colorB:txt3,width:55,textAlign:"left",flexShrink:0,position:"relative",zIndex:3}}>{fB}</span>
                          <span style={{fontFamily:mono,fontSize:9,color:txt3,width:110,textAlign:"right",flexShrink:0,marginLeft:4}}>{m.label}</span>
                        </div>;
                      })}
                    </div>
                  </div>;
                })()}

                {(!tA||!tB)&&<div style={{textAlign:"center",padding:"60px 20px"}}>
                  <p style={{fontFamily:sans,fontSize:16,color:"#525252",marginBottom:6}}>select two teams to compare</p>
                  <p style={{fontFamily:mono,fontSize:11,color:"#a3a3a3"}}>depth chart + efficiency + shooting + experience — who has the edge?</p>
                </div>}
              </>;
            })()}
          </div>;
        })()}
        {_isDark&&<div style={{textAlign:"center",padding:"8px 24px 4px",fontFamily:mono,fontSize:9,color:"#3a3a3a"}}>Data via <a href="https://www.sports-reference.com/cbb/seasons/men/2026-advanced-school-stats.html" target="_blank" rel="noopener noreferrer" style={{color:"#525252",textDecoration:"underline"}}>Sports Reference</a></div>}
        <TwitterFooter/>
        <div style={{textAlign:"center",padding:"4px 24px 16px",fontFamily:mono,fontSize:10,color:_isDark?"#3a3a3a":"#d4d4d4",letterSpacing:0.5}}>{"\u00A9"} {new Date().getFullYear()} Big Board Lab, LLC. All rights reserved.</div>
      </div>
      {madnessSelectedTeam&&(()=>{
        const t=madnessSelectedTeam;const logoUrl=madnessLogo(t.team);
        const ranks={};MADNESS_METRICS.forEach(m=>{
          if(m.key==="seed")return;const vals=MARCH_MADNESS_TEAMS.map(tm=>tm[m.key]).filter(v=>v!=null).sort((a,b)=>m.inverted?(a-b):(b-a));
          const idx=vals.indexOf(t[m.key]);ranks[m.key]={rank:idx>=0?idx+1:"-",total:vals.length,pctile:idx>=0?Math.round(((vals.length-idx)/vals.length)*100):0};
        });
        return<>
          <div onClick={()=>setMadnessSelectedTeam(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:10000}}/>
          <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",zIndex:10001,background:"#1a1a1a",border:"1px solid #2a2a2a",borderRadius:16,padding:"24px",width:"calc(100vw - 32px)",maxWidth:420,maxHeight:"80vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.5)"}}>
            <button onClick={()=>setMadnessSelectedTeam(null)} style={{position:"absolute",top:12,right:12,fontFamily:sans,fontSize:16,color:"#737373",background:"none",border:"none",cursor:"pointer"}}>✕</button>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
              {logoUrl&&<img src={logoUrl} alt={t.team} style={{width:48,height:48,objectFit:"contain"}}/>}
              <div>
                <div style={{fontFamily:font,fontSize:22,fontWeight:900,color:"#e5e5e5"}}>{t.team}</div>
                <div style={{fontFamily:mono,fontSize:11,color:"#737373"}}>({t.seed}) {t.region} · {t.record} · {t.conf}</div>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
              <div style={{background:"#111",borderRadius:10,padding:"10px 12px",textAlign:"center"}}>
                <div style={{fontFamily:mono,fontSize:8,letterSpacing:1,color:"#525252",textTransform:"uppercase"}}>Net Rating</div>
                <div style={{fontFamily:font,fontSize:24,fontWeight:900,color:t.netRtg>=30?"#22c55e":t.netRtg>=20?"#f59e0b":"#e5e5e5"}}>{t.netRtg?.toFixed(1)}</div>
              </div>
              <div style={{background:"#111",borderRadius:10,padding:"10px 12px",textAlign:"center"}}>
                <div style={{fontFamily:mono,fontSize:8,letterSpacing:1,color:"#525252",textTransform:"uppercase"}}>SRS</div>
                <div style={{fontFamily:font,fontSize:24,fontWeight:900,color:t.srs>=25?"#22c55e":t.srs>=15?"#f59e0b":"#e5e5e5"}}>{t.srs?.toFixed(1)}</div>
              </div>
            </div>
            {MADNESS_METRICS.filter(m=>m.key!=="seed").map(m=>{
              const v=t[m.key];if(v==null)return null;
              const r=ranks[m.key];const pct=r?.pctile||0;
              const barColor=pct>=80?"#22c55e":pct>=60?"#f59e0b":pct>=40?"#525252":"#dc2626";
              return<div key={m.key} style={{marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:2}}>
                  <span style={{fontFamily:mono,fontSize:10,color:"#a3a3a3"}}>{m.label}</span>
                  <span style={{fontFamily:mono,fontSize:10,color:"#737373"}}>#{r?.rank}/{r?.total}</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{flex:1,height:6,background:"#111",borderRadius:99,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${pct}%`,background:barColor,borderRadius:99,transition:"width 0.3s"}}/>
                  </div>
                  <span style={{fontFamily:mono,fontSize:12,fontWeight:700,color:barColor,minWidth:40,textAlign:"right"}}>{typeof v==="number"?v.toFixed(v<1&&v>-1?3:1):v}</span>
                </div>
              </div>;
            })}
            <div style={{display:"flex",gap:6,marginTop:12}}>
              <button onClick={()=>{setMadnessTeamA(t.team);setMadnessMode("matchup");setMadnessSelectedTeam(null);}} style={{flex:1,fontFamily:sans,fontSize:11,fontWeight:700,padding:"8px",background:"#222",color:"#e5e5e5",border:"1px solid #333",borderRadius:8,cursor:"pointer"}}>Set as Team A</button>
              <button onClick={()=>{setMadnessTeamB(t.team);setMadnessMode("matchup");setMadnessSelectedTeam(null);}} style={{flex:1,fontFamily:sans,fontSize:11,fontWeight:700,padding:"8px",background:"#222",color:"#e5e5e5",border:"1px solid #333",borderRadius:8,cursor:"pointer"}}>Set as Team B</button>
            </div>
          </div>
        </>;
      })()}
      {profilePlayer&&<PlayerProfile player={profilePlayer} traits={traits} setTraits={setTraits} notes={notes} setNotes={setNotes} allProspects={PROSPECTS} getGrade={getGrade} onClose={closeProfile} onSelectPlayer={setProfilePlayer} consensus={CONSENSUS} ratings={ratings} isGuest={isGuest} onRequireAuth={onRequireAuth} schemeFits={schemeFits}/>}
    </div>);
  }
  // === HOME ===
  // My Guys page — full screen overlay
  if(showMyGuys){
    const TRAIT_MAP=POSITION_TRAITS;
    const emptySlots=Array.from({length:Math.max(0,10-myGuys.length)});

    // Scouting Fingerprint — generate insight pills from My Guys data
    const fingerprint=(()=>{
      if(myGuys.length<5)return[];
      const pills=[];
      const guys=myGuys.map(g=>{const p=PROSPECTS.find(pr=>pr.name===g.name);return{...g,prospect:p,gpos:p?.gpos||g.pos,school:p?.school||"",id:p?.id};});

      // 1. Position concentrations
      const posCounts={};
      guys.forEach(g=>{const pos=g.gpos==="K"||g.gpos==="P"||g.gpos==="LS"?"K/P":g.gpos;posCounts[pos]=(posCounts[pos]||0)+1;});
      const topPos=Object.entries(posCounts).sort((a,b)=>b[1]-a[1]);
      if(topPos.length>0&&topPos[0][1]>=Math.ceil(guys.length*0.3)){
        const[pos,cnt]=topPos[0];
        pills.push({emoji:POS_EMOJI[pos]||"📋",text:`${pos} heavy`,detail:`${cnt}/${guys.length}`,color:POS_COLORS[pos]||"#525252"});
      }else if(topPos.length>=4&&topPos[0][1]-topPos[topPos.length-1][1]<=1){
        pills.push({emoji:"🔀",text:"balanced board",detail:"",color:"#525252"});
      }

      // 2. Trait clusters — aggregate badge traits
      const traitCounts={};
      guys.forEach(g=>{if(!g.id)return;const badges=prospectBadges[g.id]||[];badges.forEach(b=>{traitCounts[b.trait]=(traitCounts[b.trait]||0)+1;});});
      const topTraits=Object.entries(traitCounts).filter(([,c])=>c>=3).sort((a,b)=>b[1]-a[1]).slice(0,2);
      topTraits.forEach(([trait,cnt])=>{
        const labels={"Pass Rush":"pass rush magnet","Speed":"speed obsessed","Man Coverage":"lockdown lean","Accuracy":"accuracy snob","Motor":"motor lovers","Ball Skills":"ball hawk bias","Tackling":"sure tacklers","Vision":"vision seekers","Hands":"reliable hands","First Step":"first step fanatic","Athleticism":"athletic bias"};
        pills.push({emoji:TRAIT_EMOJI[trait]||"⭐",text:labels[trait]||trait.toLowerCase(),detail:`${cnt}x`,color:"#7c3aed"});
      });

      // 3. Ceiling tendency
      const ceilCounts={elite:0,high:0,normal:0,capped:0};
      guys.forEach(g=>{const sc=getScoutingTraits(g.name,g.school);const c=sc?.__ceiling||"normal";ceilCounts[c]++;});
      const upside=ceilCounts.elite+ceilCounts.high;
      if(upside>=Math.ceil(guys.length*0.6)){
        pills.push({emoji:"⭐",text:"ceiling chaser",detail:`${upside}/${guys.length} high+`,color:"#ea580c"});
      }else if(ceilCounts.capped>=Math.ceil(guys.length*0.3)){
        pills.push({emoji:"🔒",text:"floor first",detail:`${ceilCounts.capped} capped`,color:"#64748b"});
      }

      // 4. Draft behavior (delta-based)
      const avgDelta=guys.reduce((s,g)=>s+g.delta,0)/guys.length;
      if(avgDelta>10){
        pills.push({emoji:"📈",text:"value hunter",detail:`+${Math.round(avgDelta)} avg`,color:"#16a34a"});
      }else if(avgDelta<-5){
        pills.push({emoji:"🎲",text:"reach drafter",detail:`${Math.round(avgDelta)} avg`,color:"#dc2626"});
      }else{
        pills.push({emoji:"⚖️",text:"consensus aligned",detail:`${avgDelta>0?"+":""}${Math.round(avgDelta)}`,color:"#525252"});
      }

      // 5. Conference leans
      const confCounts={};
      guys.forEach(g=>{const conf=SCHOOL_CONFERENCE[g.school];if(conf&&conf!=="FCS"&&conf!=="D2"&&conf!=="D3"&&conf!=="Ind")confCounts[conf]=(confCounts[conf]||0)+1;});
      const topConf=Object.entries(confCounts).sort((a,b)=>b[1]-a[1]);
      if(topConf.length>0&&topConf[0][1]>=Math.ceil(guys.length*0.5)){
        pills.push({emoji:"🏈",text:`${topConf[0][0]} lean`,detail:`${topConf[0][1]}/${guys.length}`,color:"#0369a1"});
      }

      // 6. School repeats
      const schoolCounts={};
      guys.forEach(g=>{if(g.school)schoolCounts[g.school]=(schoolCounts[g.school]||0)+1;});
      const repeats=Object.entries(schoolCounts).filter(([,c])=>c>=2).sort((a,b)=>b[1]-a[1]);
      if(repeats.length>0){
        const[sch,cnt]=repeats[0];
        pills.push({emoji:"🏫",text:`${sch} pipeline`,detail:`${cnt}`,color:"#7c3aed"});
      }

      // 7. Combine / athletic testing pills
      const scoreAccum={ath:[],exp:[],agi:[]};
      const armsByPos={};const guysArms=[];
      guys.forEach(g=>{
        const cs=getCombineScores(g.name,g.school);
        if(cs){
          if(cs.athleticScore!=null)scoreAccum.ath.push(cs.athleticScore);
          if(cs.explosionScore!=null)scoreAccum.exp.push(cs.explosionScore);
          if(cs.agilityScore!=null)scoreAccum.agi.push(cs.agilityScore);
        }
        const cd=getCombineData(g.name,g.school);
        if(cd&&cd.arms){
          const pos=g.gpos;
          if(!armsByPos[pos])armsByPos[pos]=[];
          armsByPos[pos].push(cd.arms);
          guysArms.push({pos,arms:cd.arms});
        }
      });
      const eliteThresh=85,minDataRatio=0.6;
      if(scoreAccum.ath.length>=3&&scoreAccum.ath.filter(s=>s>=eliteThresh).length>=Math.ceil(scoreAccum.ath.length*minDataRatio)){
        pills.push({emoji:"👽",text:"athletic freaks",detail:`avg ${Math.round(scoreAccum.ath.reduce((a,b)=>a+b,0)/scoreAccum.ath.length)}`,color:"#059669"});
      }
      if(scoreAccum.exp.length>=3&&scoreAccum.exp.filter(s=>s>=eliteThresh).length>=Math.ceil(scoreAccum.exp.length*minDataRatio)){
        pills.push({emoji:"💣",text:"explosives",detail:`avg ${Math.round(scoreAccum.exp.reduce((a,b)=>a+b,0)/scoreAccum.exp.length)}`,color:"#b45309"});
      }
      if(scoreAccum.agi.length>=3&&scoreAccum.agi.filter(s=>s>=eliteThresh).length>=Math.ceil(scoreAccum.agi.length*minDataRatio)){
        pills.push({emoji:"🐇",text:"agility bias",detail:`avg ${Math.round(scoreAccum.agi.reduce((a,b)=>a+b,0)/scoreAccum.agi.length)}`,color:"#7c3aed"});
      }
      // Long limbs — compute position averages from all combine data, check if guy's arms are above avg
      if(guysArms.length>=3){
        const allCD=PROSPECTS.map(p=>({pos:p.gpos||p.pos,cd:getCombineData(p.name,p.school)})).filter(x=>x.cd&&x.cd.arms);
        const posAvg={};
        allCD.forEach(({pos,cd})=>{if(!posAvg[pos])posAvg[pos]={sum:0,n:0};posAvg[pos].sum+=cd.arms;posAvg[pos].n++;});
        Object.keys(posAvg).forEach(k=>{posAvg[k]=posAvg[k].sum/posAvg[k].n;});
        const aboveAvg=guysArms.filter(g=>posAvg[g.pos]&&g.arms>posAvg[g.pos]).length;
        if(aboveAvg>=Math.ceil(guysArms.length*minDataRatio)){
          pills.push({emoji:"🦒",text:"long limbs",detail:`${aboveAvg}/${guysArms.length}`,color:"#0369a1"});
        }
      }

      return pills.slice(0,6);
    })();

    return(<div style={{minHeight:"100vh",background:"#faf9f6",fontFamily:font}}>
      <SaveBar {...saveBarProps}/>
      <div style={{maxWidth:720,margin:"0 auto",padding:"52px 24px 60px"}}>
        <div style={{marginBottom:8}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <h1 style={{fontSize:32,fontWeight:900,color:"#171717",margin:0,letterSpacing:-1}}>my guys</h1>
            {myGuys.length>0&&<button onClick={shareMyGuys} style={{fontFamily:sans,fontSize:12,fontWeight:700,padding:"6px 14px",background:"transparent",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",display:"inline-flex",alignItems:"center",flexShrink:0,position:"relative"}}><span style={{visibility:copiedShare==="my-guys"?"hidden":"visible"}}><span className="shimmer-text">share my guys</span></span>{copiedShare==="my-guys"&&<span style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",color:"#a3a3a3",fontWeight:400}}>copied</span>}</button>}
          </div>
          <p style={{fontFamily:sans,fontSize:13,color:"#737373",margin:"4px 0 0",lineHeight:1.5}}>the prospects you bang the table for every time you mock</p>
        </div>
        <p style={{fontFamily:mono,fontSize:10,letterSpacing:1.5,color:"#a3a3a3",textTransform:"uppercase",margin:"0 0 12px"}}>{mockCount} mock{mockCount!==1?"s":""} completed · {myGuys.length}/10 guys identified</p>

        {/* Scouting Fingerprint */}
        {fingerprint.length>0&&<div style={{marginBottom:16}}>
          <div style={{fontFamily:mono,fontSize:9,letterSpacing:1.5,color:"#a3a3a3",textTransform:"uppercase",marginBottom:8}}>scouting fingerprint</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {fingerprint.map((pill,i)=><span key={i} style={{fontFamily:sans,fontSize:11,fontWeight:600,color:pill.color,background:`${pill.color}0d`,border:`1px solid ${pill.color}22`,padding:"4px 10px",borderRadius:99,display:"inline-flex",alignItems:"center",gap:4,whiteSpace:"nowrap"}}>
              <span>{pill.emoji}</span>
              <span>{pill.text}</span>
              {pill.detail&&<span style={{fontFamily:mono,fontSize:9,opacity:0.7}}>({pill.detail})</span>}
            </span>)}
          </div>
        </div>}

        {/* 2x5 grid */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))",gap:12}}>
          {myGuys.map((g,i)=>{
            const c=POS_COLORS[g.pos]||"#525252";
            const prospect=PROSPECTS.find(p=>p.name===g.name);
            const traitPos=g.pos==="DB"?(getProspectStats(g.name)?.gpos||"CB"):g.pos==="OL"?"OT":g.pos;
            const traitKeys=TRAIT_MAP[traitPos]||TRAIT_MAP["QB"];
            const K=1.8,curve=v=>Math.pow(v/100,K)*100,FLOOR=curve(40);
            const traitVals=traitKeys.map(t=>{const raw=tv(traits,prospect?.id,t,g.name,prospect?.school||"");return Math.max(0,(curve(raw)-FLOOR)/(100-FLOOR));});
            // Spider chart SVG
            const cx=60,cy=60,r=45,n=traitKeys.length;
            const points=(vals)=>vals.map((v,j)=>{const a=(Math.PI*2*j/n)-Math.PI/2;return[cx+r*v*Math.cos(a),cy+r*v*Math.sin(a)];});
            const poly=(pts)=>pts.map(p=>p.join(",")).join(" ");
            const gridLevels=[50,60,70,80,90,100].map(lv=>Math.max(0,(curve(lv)-FLOOR)/(100-FLOOR)));

            return<div key={g.name} style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:14,padding:16,cursor:"pointer",transition:"border-color 0.15s"}} onClick={()=>{if(prospect){openProfile(prospect);}}} onMouseEnter={e=>e.currentTarget.style.borderColor=c} onMouseLeave={e=>e.currentTarget.style.borderColor="#e5e5e5"}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <span style={{fontFamily:font,fontSize:18,fontWeight:900,color:"#d4d4d4"}}>{i+1}</span>
                <SchoolLogo school={prospect?.school||""} size={24}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontFamily:sans,fontSize:14,fontWeight:700,color:"#171717",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{g.name}</div>
                  <div style={{fontFamily:mono,fontSize:10,color:"#a3a3a3"}}>{prospect?.school||""}</div>
                </div>
                <span style={{fontFamily:mono,fontSize:10,fontWeight:600,color:c,background:`${c}0d`,padding:"2px 8px",borderRadius:4}}>{g.pos}</span>
              </div>

              {/* Spider chart */}
              <svg viewBox="0 0 120 120" style={{width:"100%",maxWidth:160,margin:"0 auto",display:"block"}}>
                {gridLevels.map((lv,li)=><polygon key={li} points={poly(points(traitKeys.map(()=>lv)))} fill="none" stroke={li===2?"#d4d4d4":"#e5e5e5"} strokeWidth={li===gridLevels.length-1?0.8:0.4}/>)}
                {traitKeys.map((t,j)=>{const a=(Math.PI*2*j/n)-Math.PI/2;const lx=cx+r*1.18*Math.cos(a);const ly=cy+r*1.18*Math.sin(a);return<text key={t} x={lx} y={ly} textAnchor="middle" dominantBaseline="central" style={{fontSize:3.5,fill:"#a3a3a3",fontFamily:mono}}>{t.split(" ")[0]}</text>;})}
                <polygon points={poly(points(traitVals))} fill={`${c}20`} stroke={c} strokeWidth={1.2}/>
                {points(traitVals).map(([px,py],j)=><circle key={j} cx={px} cy={py} r={1.5} fill={c}/>)}
              </svg>

              {/* Stats row */}
              <div style={{display:"flex",justifyContent:"space-between",marginTop:8,padding:"8px 0 0",borderTop:"1px solid #f5f5f5"}}>
                <div style={{textAlign:"center"}}>
                  <div style={{fontFamily:mono,fontSize:8,color:"#a3a3a3",textTransform:"uppercase",letterSpacing:1}}>you pick</div>
                  <div style={{fontFamily:font,fontSize:16,fontWeight:900,color:"#171717"}}>{g.avgPick}</div>
                </div>
                <div style={{textAlign:"center"}}>
                  <div style={{fontFamily:mono,fontSize:8,color:"#a3a3a3",textTransform:"uppercase",letterSpacing:1}}>consensus</div>
                  <div style={{fontFamily:font,fontSize:16,fontWeight:900,color:"#a3a3a3"}}>{g.consensusRank}</div>
                </div>
                <div style={{textAlign:"center"}}>
                  <div style={{fontFamily:mono,fontSize:8,color:"#a3a3a3",textTransform:"uppercase",letterSpacing:1}}>score</div>
                  <div style={{fontFamily:font,fontSize:16,fontWeight:900,color:"#171717"}}>{g.score}</div>
                </div>
                <div style={{textAlign:"center"}}>
                  <div style={{fontFamily:mono,fontSize:8,color:"#a3a3a3",textTransform:"uppercase",letterSpacing:1}}>drafted</div>
                  <div style={{fontFamily:font,fontSize:16,fontWeight:900,color:"#171717"}}>{g.timesDrafted}x</div>
                </div>
              </div>
            </div>;
          })}

          {/* Empty slots */}
          {emptySlots.map((_,i)=><div key={`empty${i}`} style={{background:"#faf9f6",border:"2px dashed #e5e5e5",borderRadius:14,padding:16,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:200}}>
            <div style={{fontFamily:font,fontSize:24,fontWeight:900,color:"#e5e5e5"}}>{myGuys.length+i+1}</div>
            <div style={{fontFamily:sans,fontSize:11,color:"#d4d4d4",textAlign:"center",marginTop:4}}>mock more to discover</div>
          </div>)}
        </div>

        {myGuys.length>0&&<div style={{textAlign:"center",marginTop:24}}>
          <button onClick={shareMyGuys} style={{fontFamily:sans,fontSize:13,fontWeight:700,padding:"10px 24px",background:"transparent",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",display:"inline-flex",alignItems:"center",position:"relative"}}><span style={{visibility:copiedShare==="my-guys"?"hidden":"visible"}}><span className="shimmer-text">share my guys</span></span>{copiedShare==="my-guys"&&<span style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",color:"#a3a3a3",fontWeight:400}}>copied</span>}</button>
        </div>}
        <TwitterFooter/>
        <div style={{textAlign:"center",padding:"4px 24px 24px",fontFamily:mono,fontSize:10,color:"#d4d4d4",letterSpacing:0.5}}>© {new Date().getFullYear()} Big Board Lab, LLC. All rights reserved.</div>
      </div>
      {profilePlayer&&<PlayerProfile player={profilePlayer} traits={traits} setTraits={setTraits} notes={notes} setNotes={setNotes} allProspects={PROSPECTS} getGrade={getGrade} onClose={closeProfile} onSelectPlayer={setProfilePlayer} consensus={CONSENSUS} ratings={ratings} isGuest={isGuest} onRequireAuth={onRequireAuth} schemeFits={schemeFits}/>}
    </div>);
  }

  if(phase==="home"||phase==="pick-position"){
    const hasBoardData=rankedGroups.size>0||Object.keys(partialProgress).length>0;
    const hasStaleData=!hasBoardData&&Object.keys(ratings).length>0&&!sessionStorage.getItem('bbl_stale_dismissed');
    const dismissStale=()=>{sessionStorage.setItem('bbl_stale_dismissed','1');setRatings({});setTraits({});setCompCount({});setWinCount({});};
    const dismissOnboarding=()=>{setShowOnboarding(false);try{localStorage.setItem('bbl_onboarded','1');}catch(e){}};

    // Consensus big board — all prospects sorted by consensus rank
    const consensusBoard=[...PROSPECTS].sort((a,b)=>getConsensusRank(a.name)-getConsensusRank(b.name));
    // User big board
    const userBoard=board;

    // Board toggle state
    const showBoard=boardTab==="my"?userBoard:consensusBoard;
    let filteredBoard=boardFilter.size>0?showBoard.filter(p=>{const g=(p.gpos||p.pos)==="K"||(p.gpos||p.pos)==="P"||(p.gpos||p.pos)==="LS"?"K/P":(p.gpos||p.pos);return boardFilter.has(g);}):showBoard;
    if(boardArchetypeFilter.size>0)filteredBoard=filteredBoard.filter(p=>{const archs=getArchetypes(p.name,p.school);return[...boardArchetypeFilter].some(t=>archs.includes(t));});

    return(<div style={{minHeight:"100vh",background:"#faf9f6",fontFamily:font}}><SaveBar {...saveBarProps}/><div style={{maxWidth:720,margin:"0 auto",padding:"52px 24px 60px"}}>

    {/* First-visit banner — differentiators, not flow */}
    {showOnboarding&&<div style={{background:"linear-gradient(135deg,#ec4899,#7c3aed)",borderRadius:13,padding:2,marginBottom:20}}>
      <div style={{background:"#fff",borderRadius:11,padding:"14px 20px",display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12}}>
        <div style={{fontFamily:sans,fontSize:13,color:"#525252",margin:0,lineHeight:1.7}}>
          <span style={{fontWeight:700,color:"#171717"}}>welcome to BBL</span><br/>
          <span>⚖️ rank & grade 450+ prospects by pair rankings and sliding trait scores</span><br/>
          <span>🏈 mock draft against AI GMs with real team tendencies and trade logic</span><br/>
          <span>📊 view depth chart updates post-draft and share your results</span><br/>
          <span onClick={onOpenGuide} style={{color:"#7c3aed",cursor:"pointer",fontWeight:600}}>see everything you can do →</span>
        </div>
        <button onClick={dismissOnboarding} style={{fontFamily:sans,fontSize:14,color:"#a3a3a3",background:"none",border:"none",cursor:"pointer",flexShrink:0,padding:"4px",marginTop:-2}}>✕</button>
      </div>
    </div>}

    {/* Header */}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:16}}>
      <div>
        <h1 style={{fontSize:"clamp(28px,6vw,40px)",fontWeight:900,color:"#171717",margin:"0 0 2px",letterSpacing:-1.5}}>big board lab</h1>
        <p style={{fontFamily:mono,fontSize:8,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",margin:0}}>2026 NFL Draft · April 23–25</p>
      </div>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <button onClick={()=>{if(isGuest){onRequireAuth("want to see and share the guys you draft more than others?");return;}navigate('/my-guys');setMyGuysUpdated(false);}} style={{fontFamily:sans,fontSize:12,fontWeight:600,padding:"6px 14px",background:"transparent",color:"#a3a3a3",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",whiteSpace:"nowrap",transition:"all 0.2s",position:"relative"}}>
          👀 my guys
          {myGuysUpdated&&<span style={{position:"absolute",top:-2,right:-2,width:8,height:8,borderRadius:4,background:"#ec4899",border:"2px solid #faf9f6"}}/>}
        </button>
        <button onClick={()=>{openExplorer();trackEvent(user?.id,'explorer_opened',{guest:!user});}} style={{fontFamily:sans,fontSize:12,fontWeight:600,padding:"8px 16px",background:"#171717",color:"#fff",border:"none",borderRadius:99,cursor:"pointer",whiteSpace:"nowrap",transition:"all 0.2s",display:"flex",alignItems:"center",gap:5}}>🧪 <span className="shimmer-text">data lab</span></button>
      </div>
    </div>

    {/* Stale data warning */}
    {hasStaleData&&<div style={{background:"#fef3c7",border:"1px solid #fcd34d",borderRadius:12,padding:"12px 16px",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <span style={{fontFamily:sans,fontSize:13,color:"#92400e"}}>You have rankings from an old session. Reset to start fresh.</span>
      <button onClick={dismissStale} style={{fontFamily:sans,fontSize:11,fontWeight:700,padding:"6px 14px",background:"#171717",color:"#faf9f6",border:"none",borderRadius:99,cursor:"pointer",flexShrink:0,marginLeft:12}}>reset</button>
    </div>}

    {/* Mock Draft Launcher — primary CTA for new and returning users */}
    {(()=>{
      const topTeams=["Raiders","Jets","Cardinals","Titans","Giants","Browns","Commanders","Saints","Chiefs","Bengals","Dolphins","Cowboys","Rams","Ravens","Buccaneers","Lions","Vikings","Panthers","Steelers","Chargers","Eagles","Bears","Bills","49ers","Texans","Broncos","Patriots","Seahawks","Falcons","Colts","Packers","Jaguars"];
      const launchMock=()=>{
        document.title="Mock Draft — Big Board Lab";
        window.history.pushState({},'','/mock');
        setShowMockDraft(true);
        setMockLaunchTeam(mockTeamSet);
        trackEvent(user?.id,'mock_draft_cta_click',{teams:[...mockTeamSet].join(','),rounds:mockRounds,speed:mockSpeed,guest:!user});
      };
      return <div style={{background:"linear-gradient(135deg,#0f172a,#1e293b)",borderRadius:16,overflow:"hidden",marginBottom:24,position:"relative"}}>
        <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,#ec4899,#7c3aed)"}}/>
        <div style={{padding:"24px 24px 20px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
            <div>
              <div style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"#64748b",textTransform:"uppercase",marginBottom:4}}>mock draft simulator</div>
              <h2 style={{fontFamily:font,fontSize:22,fontWeight:900,color:"#f8fafc",margin:0,lineHeight:1.1}}>run your war room</h2>
              <p style={{fontFamily:sans,fontSize:12,color:"#94a3b8",margin:"6px 0 0",lineHeight:1.4}}>32 AI GMs with real personalities. Live trades. Depth charts. Every pick graded.</p>
            </div>
            <span style={{fontSize:28,flexShrink:0,marginTop:4}}>🏈</span>
          </div>

          {/* Team picker — always visible, multi-select */}
          <div style={{marginBottom:mockTeamSet.size>0?16:0}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div style={{fontFamily:mono,fontSize:9,letterSpacing:1.5,color:"#64748b",textTransform:"uppercase"}}>{mockTeamSet.size>0?"your team"+(mockTeamSet.size>1?"s":""):"pick your team"}</div>
              <div style={{display:"flex",gap:4}}>
                <button onClick={()=>{setMockTeamSet(new Set(topTeams));setMockTeamPicker(topTeams[0]);}} style={{fontFamily:sans,fontSize:9,padding:"3px 8px",background:"transparent",border:"1px solid rgba(255,255,255,0.1)",borderRadius:99,cursor:"pointer",color:"#64748b"}}>select all</button>
                <button onClick={()=>{setMockTeamSet(new Set());setMockTeamPicker("");}} style={{fontFamily:sans,fontSize:9,padding:"3px 8px",background:"transparent",border:"1px solid rgba(255,255,255,0.1)",borderRadius:99,cursor:"pointer",color:"#64748b"}}>clear</button>
              </div>
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
              {topTeams.sort().map(t=>{const sel=mockTeamSet.has(t);return<button key={t} onClick={()=>{const ns=new Set(mockTeamSet);if(ns.has(t))ns.delete(t);else ns.add(t);setMockTeamSet(ns);setMockTeamPicker(ns.size>0?[...ns][0]:"");}} style={{fontFamily:sans,fontSize:10,fontWeight:sel?700:600,padding:"5px 10px",background:sel?"rgba(236,72,153,0.2)":"rgba(255,255,255,0.06)",color:sel?"#f9a8d4":"#cbd5e1",border:sel?"1px solid rgba(236,72,153,0.4)":"1px solid rgba(255,255,255,0.08)",borderRadius:8,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:5,transition:"all 0.15s"}} onMouseEnter={e=>{if(!sel){e.currentTarget.style.background="rgba(255,255,255,0.12)";e.currentTarget.style.color="#f1f5f9";}}} onMouseLeave={e=>{if(!sel){e.currentTarget.style.background="rgba(255,255,255,0.06)";e.currentTarget.style.color="#cbd5e1";}}}><NFLTeamLogo team={t} size={14}/>{t}</button>;})}
            </div>
          </div>

          {/* Options accordion — appears after team selected */}
          {mockTeamSet.size>0&&<div style={{animation:"fadeIn 0.2s ease"}}>
            {/* Rounds + Speed row */}
            <div style={{display:"flex",gap:12,marginBottom:12,flexWrap:"wrap"}}>
              <div style={{flex:"1 1 180px"}}>
                <div style={{fontFamily:mono,fontSize:9,letterSpacing:1.5,color:"#64748b",textTransform:"uppercase",marginBottom:6}}>rounds</div>
                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                  {[1,2,3,4,5,6,7].map(r=><button key={r} onClick={()=>setMockRounds(r)} style={{fontFamily:sans,fontSize:11,fontWeight:mockRounds===r?700:400,padding:"6px 12px",background:mockRounds===r?"rgba(255,255,255,0.15)":"rgba(255,255,255,0.04)",color:mockRounds===r?"#f1f5f9":"#94a3b8",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,cursor:"pointer"}}>{r}</button>)}
                </div>
              </div>
              <div style={{flex:"1 1 180px"}}>
                <div style={{fontFamily:mono,fontSize:9,letterSpacing:1.5,color:"#64748b",textTransform:"uppercase",marginBottom:6}}>speed</div>
                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                  {[["slow",1200],["med",600],["fast",200],["instant",50]].map(([label,ms])=><button key={label} onClick={()=>setMockSpeed(ms)} style={{fontFamily:sans,fontSize:11,fontWeight:mockSpeed===ms?700:400,padding:"6px 12px",background:mockSpeed===ms?"rgba(255,255,255,0.15)":"rgba(255,255,255,0.04)",color:mockSpeed===ms?"#f1f5f9":"#94a3b8",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,cursor:"pointer"}}>{label}</button>)}
                </div>
              </div>
            </div>

            {/* CPU Trades + Board Mode row */}
            <div style={{display:"flex",gap:12,marginBottom:16,flexWrap:"wrap"}}>
              <div style={{flex:"1 1 180px",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8}}>
                <div>
                  <div style={{fontFamily:mono,fontSize:9,letterSpacing:1.5,color:"#64748b",textTransform:"uppercase"}}>cpu trades</div>
                  <div style={{fontFamily:sans,fontSize:10,color:"#64748b",marginTop:2}}>AI teams trade up for elite players</div>
                </div>
                <button onClick={()=>setMockCpuTrades(prev=>!prev)} style={{width:40,height:22,borderRadius:11,border:"none",background:mockCpuTrades?"linear-gradient(135deg,#a855f7,#ec4899)":"#475569",cursor:"pointer",position:"relative",transition:"background 0.2s",flexShrink:0}}><div style={{width:16,height:16,borderRadius:8,background:"#fff",position:"absolute",top:3,left:mockCpuTrades?21:3,transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}}/></button>
              </div>
              <div style={{flex:"1 1 180px"}}>
                <div style={{fontFamily:mono,fontSize:9,letterSpacing:1.5,color:"#64748b",textTransform:"uppercase",marginBottom:6}}>draft board</div>
                <div style={{display:"flex",gap:4}}>
                  {[["consensus","Consensus"],["my","My Board"]].map(([mode,label])=><button key={mode} onClick={()=>setMockBoardMode(mode)} style={{flex:1,fontFamily:sans,fontSize:11,fontWeight:mockBoardMode===mode?700:400,padding:"6px 12px",background:mockBoardMode===mode?"rgba(255,255,255,0.15)":"rgba(255,255,255,0.04)",color:mockBoardMode===mode?"#f1f5f9":"#94a3b8",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,cursor:"pointer"}}>{label}</button>)}
                </div>
              </div>
            </div>

            <button onClick={launchMock} style={{width:"100%",fontFamily:sans,fontSize:14,fontWeight:700,padding:"12px 20px",background:"linear-gradient(135deg,#ec4899,#7c3aed)",color:"#fff",border:"none",borderRadius:99,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              {mockTeamSet.size===1?<><NFLTeamLogo team={[...mockTeamSet][0]} size={18}/> draft as {[...mockTeamSet][0]} →</>:
               mockTeamSet.size>1?<>start draft ({mockTeamSet.size} teams) →</>:null}
            </button>
          </div>}
        </div>
      </div>;
    })()}

    {/* Big Board Module */}
    <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:16,overflow:"hidden",marginBottom:24}}>
      {/* Toggle tabs */}
      <div style={{display:"flex",borderBottom:"1px solid #f0f0f0"}}>
        <button onClick={()=>setBoardTab("consensus")} style={{flex:1,fontFamily:sans,fontSize:13,fontWeight:boardTab==="consensus"?700:500,padding:"14px 16px",background:"transparent",border:"none",borderBottom:boardTab==="consensus"?"2px solid #171717":"2px solid transparent",color:boardTab==="consensus"?"#171717":"#a3a3a3",cursor:"pointer"}}>consensus big board</button>
        <button onClick={()=>setBoardTab("my")} style={{flex:1,fontFamily:sans,fontSize:13,fontWeight:boardTab==="my"?700:500,padding:"14px 16px",background:"transparent",border:"none",borderBottom:boardTab==="my"?"2px solid #171717":"2px solid transparent",color:boardTab==="my"?"#171717":"#a3a3a3",cursor:"pointer"}}>my big board{rankedGroups.size>0&&<span style={{fontFamily:mono,fontSize:10,color:"#22c55e",marginLeft:6}}>{rankedGroups.size}/{POSITION_GROUPS.length}</span>}</button>
      </div>

      {/* Position filter pills */}
      <div style={{padding:"10px 16px 6px",display:"flex",gap:5,flexWrap:"wrap"}}>
        <button onClick={()=>setBoardFilter(new Set())} style={{fontFamily:mono,fontSize:10,padding:"3px 10px",background:boardFilter.size===0?"#171717":"transparent",color:boardFilter.size===0?"#faf9f6":"#a3a3a3",border:"1px solid "+(boardFilter.size===0?"#171717":"#e5e5e5"),borderRadius:99,cursor:"pointer"}}>all</button>
        {POSITION_GROUPS.map(pos=>{const active=boardFilter.has(pos);const c=POS_COLORS[pos];return<button key={pos} onClick={()=>setBoardFilter(prev=>{const n=new Set(prev);if(n.has(pos))n.delete(pos);else n.add(pos);return n;})} style={{fontFamily:mono,fontSize:10,padding:"3px 10px",background:active?`${c}11`:"transparent",color:active?c:"#a3a3a3",border:`1px solid ${active?c+"33":"#e5e5e5"}`,borderRadius:99,cursor:"pointer"}}>{pos}</button>;})}
      </div>
      {boardFilter.size===1&&(()=>{const rawPos=[...boardFilter][0];const posTraits=POSITION_TRAITS[rawPos]||[];if(!posTraits.length)return null;const c=POS_COLORS[rawPos]||"#525252";const relevantIds=filteredBoard.map(p=>p.id);const measPills=MEASURABLE_LIST.filter(m=>measurableThresholds[rawPos]?.[m]);const allBoardProspects=boardFilter.size>0?showBoard.filter(p=>{const g=(p.gpos||p.pos)==="K"||(p.gpos||p.pos)==="P"||(p.gpos||p.pos)==="LS"?"K/P":(p.gpos||p.pos);return boardFilter.has(g);}):showBoard;const archTagCounts={};allBoardProspects.forEach(p=>{getArchetypes(p.name,p.school).forEach(t=>{archTagCounts[t]=(archTagCounts[t]||0)+1;});});const archTags=Object.entries(archTagCounts).sort((a,b)=>b[1]-a[1]).map(([t])=>t);const archButtons=archTags.map(tag=>{const active=boardArchetypeFilter.has(tag);return<button key={"arch-"+tag} onClick={()=>setBoardArchetypeFilter(prev=>{const n=new Set(prev);n.has(tag)?n.delete(tag):n.add(tag);return n;})} style={{fontFamily:mono,fontSize:9,padding:"3px 8px",background:active?"#171717":"transparent",color:active?"#faf9f6":"#525252",border:"1px solid "+(active?"#171717":"#d4d4d4"),borderRadius:99,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",gap:3,whiteSpace:"nowrap"}}><span>{ARCHETYPE_EMOJI[tag]||""}</span><span>{ARCHETYPE_DISPLAY[tag]||tag}</span><span style={{fontSize:8,opacity:0.7}}>({archTagCounts[tag]})</span></button>;});return<div style={{display:"flex",alignItems:"center",gap:6,padding:"0 16px 6px"}}><button title={boardMeasMode?"Measurables mode — click for Traits":"Traits mode — click for Measurables"} onClick={()=>{setBoardMeasMode(v=>!v);setBoardTraitFilter(new Set());}} style={{width:40,height:22,borderRadius:11,border:"none",background:boardMeasMode?"linear-gradient(135deg,#00ffff,#1e3a5f)":"linear-gradient(135deg,#ec4899,#a855f7)",cursor:"pointer",position:"relative",transition:"background 0.2s",flexShrink:0}}><div style={{width:16,height:16,borderRadius:8,background:"#fff",position:"absolute",top:3,left:boardMeasMode?21:3,transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontFamily:mono,fontSize:8,fontWeight:700,color:boardMeasMode?"#00ffff":"#a855f7",lineHeight:1}}>{boardMeasMode?"M":"T"}</span></div></button><div className="trait-pills-scroll" style={{display:"flex",gap:4,overflowX:"auto",WebkitOverflowScrolling:"touch",flexWrap:"nowrap",scrollbarWidth:"none",alignItems:"center",flex:1,minWidth:0}}>{!boardMeasMode?posTraits.map(trait=>{const active=boardTraitFilter.has(trait);const count=relevantIds.filter(id=>qualifiesForFilter(id,rawPos,trait)).length;return<button key={trait} onClick={()=>setBoardTraitFilter(prev=>{const n=new Set(prev);n.has(trait)?n.delete(trait):n.add(trait);return n;})} style={{fontFamily:mono,fontSize:9,padding:"3px 8px",background:active?c+"18":"transparent",color:active?"#171717":"#525252",border:"1px solid "+(active?c+"44":c+"25"),borderRadius:99,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",gap:3,whiteSpace:"nowrap"}}><span>{TRAIT_EMOJI[trait]}</span><span>{TRAIT_SHORT[trait]||trait}</span><span style={{fontSize:8,opacity:0.7}}>({count})</span></button>;}):(()=>{const groups=MEAS_GROUPS.map(g=>({...g,pills:g.keys.filter(m=>measPills.includes(m))})).filter(g=>g.pills.length>0);return groups.flatMap((g,gi)=>{const divider=gi>0?[<span key={"d"+gi} style={{color:"#d4d4d4",fontSize:10,flexShrink:0,padding:"0 1px",lineHeight:1}}>·</span>]:[];return[...divider,...g.pills.map(m=>{const active=boardTraitFilter.has(m);const count=relevantIds.filter(id=>qualifiesForMeasurableFilter(id,rawPos,m)).length;return<button key={m} onClick={()=>setBoardTraitFilter(prev=>{const n=new Set(prev);n.has(m)?n.delete(m):n.add(m);return n;})} style={{fontFamily:mono,fontSize:9,padding:"3px 8px",background:active?g.border+"18":"transparent",color:active?"#171717":"#525252",border:"1px solid "+(active?g.border+"66":g.border+"30"),borderRadius:99,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",gap:3,whiteSpace:"nowrap"}}><span>{MEASURABLE_EMOJI[m]}</span><span>{MEASURABLE_SHORT[m]}</span><span style={{fontSize:8,opacity:0.7}}>({count})</span></button>;})];});})()}{archButtons.length>0&&<><span style={{color:"#d4d4d4",fontSize:12,flexShrink:0,padding:"0 2px"}}>|</span>{archButtons}</>}</div></div>;})()}

      {/* Small Multiples Radar Grid */}
      {boardFilter.size===1&&(()=>{const rawPos=[...boardFilter][0];const posTraits=POSITION_TRAITS[rawPos]||[];if(!posTraits.length)return null;const c=POS_COLORS[rawPos]||"#525252";const topProspects=filteredBoard.slice(0,16);if(topProspects.length<2)return null;
        return<div style={{borderBottom:"1px solid #f0f0f0"}}>
          <button onClick={()=>setBoardRadarGrid(v=>!v)} style={{display:"flex",alignItems:"center",gap:6,width:"100%",padding:"8px 16px",background:"transparent",border:"none",cursor:"pointer",textAlign:"left"}}>
            <span style={{fontFamily:mono,fontSize:9,letterSpacing:1.5,color:"#a3a3a3",textTransform:"uppercase"}}>{boardRadarGrid?"hide":"show"} trait profiles</span>
            <span style={{fontSize:10,color:"#a3a3a3",transform:boardRadarGrid?"rotate(180deg)":"rotate(0deg)",transition:"transform 0.2s"}}>▼</span>
          </button>
          {boardRadarGrid&&<><style>{`@media(max-width:600px){.eq-grid{grid-template-columns:repeat(2,1fr)!important;}}@keyframes eqGrowGrid{from{transform:scaleY(0)}to{transform:scaleY(1)}}`}</style><div className="eq-grid" style={{padding:"4px 12px 16px",display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>

            {topProspects.map(p=>{
              const traitVals=posTraits.map(t=>({label:TRAIT_ABBREV[t]||t.split(" ").map(w=>w[0]).join(""),value:tv(traits,p.id,t,p.name,p.school),type:"trait"}));
              const measData=getMeasRadarData(p.name,p.school);
              const measVals=measData?measData.labels.map((l,i)=>({label:l,value:measData.values[i],type:"meas"})):[];
              const allBars=[...traitVals,...measVals];
              const barW=8;const bGap=1.5;const maxBlocks=6;const blockH=3;const blockGap=1;const halfH=maxBlocks*(blockH+blockGap);
              return<div key={p.id} style={{background:"#faf9f6",borderRadius:10,padding:"8px 6px 6px",textAlign:"center",cursor:"pointer",border:"1px solid #f0f0f0",transition:"border-color 0.15s"}} onClick={()=>openProfile(p)} onMouseEnter={e=>e.currentTarget.style.borderColor=c} onMouseLeave={e=>e.currentTarget.style.borderColor="#f0f0f0"}>
                <div style={{fontFamily:sans,fontSize:11,fontWeight:700,color:"#171717",lineHeight:1.2,marginBottom:4}}>{shortName(p.name)}</div>
                <div style={{display:"flex",justifyContent:"center"}}>
                  <div style={{display:"flex",gap:bGap,alignItems:"center"}}>
                    {allBars.map((bar,i)=>{
                      const nBlocks=Math.max(1,Math.round((bar.value/100)*maxBlocks));
                      const isSep=bar.type==="meas"&&i===traitVals.length;
                      return<Fragment key={i}>
                        {isSep&&<div style={{width:1,height:halfH*2+2,background:"#e5e5e5",margin:"0 2px",flexShrink:0}}/>}
                        <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:barW}}>
                          <div style={{display:"flex",flexDirection:"column-reverse",gap:blockGap,height:halfH,transformOrigin:"center bottom",animation:`eqGrowGrid 400ms ease-out ${i*30}ms both`}}>
                            {Array.from({length:maxBlocks}).map((_,bi)=>{
                              const active=bi<nBlocks;const t0=active?(bi/(maxBlocks-1)):0;
                              const bg=bar.type==="trait"
                                ?`rgb(${Math.round(236+(124-236)*t0)},${Math.round(72+(58-72)*t0)},${Math.round(153+(237-153)*t0)})`
                                :`rgb(${Math.round(160+(6-160)*t0)},${Math.round(215+(182-215)*t0)},${Math.round(220+(212-220)*t0)})`;
                              return<div key={bi} style={{width:barW,height:blockH,borderRadius:1,background:active?bg:bar.type==="trait"?"#f3f0f8":"#edf7f9"}}/>;
                            })}
                          </div>
                          <div style={{width:barW,height:0.5,background:"#d4d4d4",margin:`${blockGap}px 0`}}/>
                          <div style={{display:"flex",flexDirection:"column",gap:blockGap,height:halfH,transformOrigin:"center top",animation:`eqGrowGrid 400ms ease-out ${i*30}ms both`}}>
                            {Array.from({length:maxBlocks}).map((_,bi)=>{
                              const active=bi<nBlocks;const t0=active?(bi/(maxBlocks-1)):0;
                              const bg=bar.type==="trait"
                                ?`rgb(${Math.round(236+(124-236)*t0)},${Math.round(72+(58-72)*t0)},${Math.round(153+(237-153)*t0)})`
                                :`rgb(${Math.round(160+(6-160)*t0)},${Math.round(215+(182-215)*t0)},${Math.round(220+(212-220)*t0)})`;
                              return<div key={bi} style={{width:barW,height:blockH,borderRadius:1,background:active?bg:bar.type==="trait"?"#f3f0f8":"#edf7f9"}}/>;
                            })}
                          </div>
                        </div>
                      </Fragment>;
                    })}
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:4,marginTop:4}}>
                  <span style={{fontFamily:mono,fontSize:9,color:c}}>{p.gpos||p.pos}</span>
                  {(()=>{const rd=getConsensusRound(p.name);return<span style={{fontFamily:mono,fontSize:8,fontWeight:700,color:rd.fg,background:rd.bg,padding:"1px 6px",borderRadius:3}}>{rd.label}</span>;})()}
                </div>
              </div>;
            })}
          </div></>}
        </div>;
      })()}

      {/* Board content */}
      {boardTab==="my"&&userBoard.length===0?(
        /* My Big Board empty state — inline CTA */
        <div style={{padding:"40px 24px",textAlign:"center"}}>
          <div style={{fontSize:40,marginBottom:12}}>⚖️</div>
          <h3 style={{fontFamily:font,fontSize:20,fontWeight:900,color:"#171717",margin:"0 0 8px"}}>build your board</h3>
          {(()=>{const targetPos=boardFilter.size===1?[...boardFilter][0]:POSITION_GROUPS.find(pos=>!rankedGroups.has(pos))||"QB";return<>
          <p style={{fontFamily:sans,fontSize:14,color:"#737373",margin:"0 0 6px",maxWidth:380,marginLeft:"auto",marginRight:"auto",lineHeight:1.5}}>
            pick A or B in head-to-head matchups to rank prospects your way. start with {targetPos}s — it only takes a few minutes.
          </p>
          {rankedGroups.size>0&&<p style={{fontFamily:mono,fontSize:11,color:"#22c55e",margin:"0 0 16px"}}>{rankedGroups.size} position{rankedGroups.size!==1?"s":""} ranked so far</p>}
          <button onClick={()=>navigate('/rank/'+posToSlug(targetPos))} style={{fontFamily:sans,fontSize:14,fontWeight:700,padding:"12px 28px",background:"#171717",color:"#faf9f6",border:"none",borderRadius:99,cursor:"pointer"}}>rank {targetPos}s →</button>
          <p style={{fontFamily:sans,fontSize:11,color:"#a3a3a3",margin:"12px 0 0"}}>or pick any position below</p>
          </>;})()}
        </div>
      ):(
        /* Board list */
        <div style={boardShowAll?{}:{maxHeight:480,overflowY:"auto"}}>
          {(boardShowAll?filteredBoard:filteredBoard.slice(0,100)).map((p,i)=>{
            const grade=boardTab==="consensus"?getScoutingGrade(p.id):getGrade(p.id);
            const c=POS_COLORS[p.gpos||p.pos]||POS_COLORS[p.pos]||"#525252";
            const rank=i+1;
            const gpos=(p.gpos||p.pos)==="K"||(p.gpos||p.pos)==="P"||(p.gpos||p.pos)==="LS"?"K/P":(p.gpos||p.pos);
            const isGrayed=boardTraitFilter.size>0&&boardFilter.size===1&&(boardMeasMode?![...boardTraitFilter].some(m=>qualifiesForMeasurableFilter(p.id,[...boardFilter][0],m)):![...boardTraitFilter].some(t=>qualifiesForFilter(p.id,[...boardFilter][0],t)));
            return<div key={p.id} style={{display:"flex",alignItems:"center",padding:"8px 16px",borderBottom:"1px solid #f8f8f6",cursor:"pointer",opacity:isGrayed?0.3:1,transition:"opacity 0.15s"}} onClick={()=>openProfile(p)} onMouseEnter={e=>e.currentTarget.style.background="#faf9f6"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{width:80,flexShrink:0,display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontFamily:mono,fontSize:11,color:"#d4d4d4",width:22,textAlign:"right",flexShrink:0}}>{rank}</span>
                <span style={{fontFamily:mono,fontSize:9,fontWeight:600,color:c,background:`${c}0d`,padding:"2px 7px",borderRadius:4}}>{p.gpos||p.pos}</span>
              </div>
              <SchoolLogo school={p.school} size={20}/>
              <div style={{flex:1,minWidth:0,marginLeft:10,display:"flex",alignItems:"center",gap:4}}>
                <span style={{fontFamily:sans,fontSize:13,fontWeight:700,color:"#171717"}}>{p.name}</span>
                <span style={{fontFamily:mono,fontSize:10,color:"#a3a3a3",marginLeft:6}}>{p.school}</span>
                {(()=>{
                  const MAX_PILLS=5;const pills=[];
                  if(boardArchetypeFilter.size>0){const archs=getArchetypes(p.name,p.school);[...boardArchetypeFilter].forEach(t=>{if(archs.includes(t)&&pills.length<MAX_PILLS)pills.push({key:"arch-"+t,emoji:ARCHETYPE_EMOJI[t]||"",label:ARCHETYPE_DISPLAY[t]||t,type:"arch"});});}
                  if(boardTraitFilter.size>0&&boardMeasMode){[...boardTraitFilter].forEach(t=>{if(pills.length<MAX_PILLS&&qualifiesForMeasurableFilter(p.id,(p.gpos||p.pos)==="IDL"?"DL":(p.gpos||p.pos),t))pills.push({key:"meas-"+t,emoji:MEASURABLE_EMOJI[t]||"",label:t,type:"meas"});});}
                  const traitBadges=prospectBadges[p.id]||[];
                  traitBadges.forEach(b=>{if(pills.length<MAX_PILLS)pills.push({key:"trait-"+b.trait,emoji:b.emoji,label:b.trait+" "+b.score,type:"trait"});});
                  return pills.map(pl=><span key={pl.key} title={pl.label} className={pills.length<=traitBadges.length&&!boardArchetypeFilter.size&&!boardTraitFilter.size?"board-badge":""} style={{fontFamily:mono,fontSize:7,fontWeight:700,color:pl.type==="arch"?"#171717":pl.type==="meas"?"#0d9488":c,background:pl.type==="arch"?"#17171712":pl.type==="meas"?"#0d948812":c+"0d",padding:"2px 4px",borderRadius:3,flexShrink:0}}>{pl.emoji}</span>);
                })()}
              </div>
              {boardTab==="my"?grade&&<span style={{fontFamily:font,fontSize:14,fontWeight:900,color:grade>=75?"#16a34a":grade>=55?"#ca8a04":"#dc2626",flexShrink:0}}>{grade}</span>:(()=>{const rd=getConsensusRound(p.name);return<span style={{fontFamily:mono,fontSize:10,fontWeight:700,color:rd.fg,background:rd.bg,padding:"2px 8px",borderRadius:4,flexShrink:0}}>{rd.label}</span>;})()}
            </div>;
          })}
          <div style={{padding:"12px 16px",textAlign:"center"}}><button onClick={()=>setBoardShowAll(v=>!v)} style={{fontFamily:mono,fontSize:10,color:"#525252",background:"none",border:"1px solid #e5e5e5",borderRadius:99,padding:"5px 14px",cursor:"pointer"}}>{boardShowAll?`show less`:`view all ${filteredBoard.length} prospects`}</button></div>
        </div>
      )}
      <style>{`@media(max-width:600px){.board-badge{display:none!important;}}`}</style>

      {/* Board footer */}
      {boardTab==="my"&&userBoard.length>0&&(()=>{
        const filterArr=boardFilter.size>0?POSITION_GROUPS.filter(pos=>boardFilter.has(pos)):POSITION_GROUPS;
        const contPos=filterArr.find(pos=>!rankedGroups.has(pos)&&partialProgress[pos])||POSITION_GROUPS.find(pos=>!rankedGroups.has(pos)&&partialProgress[pos]);
        const nextPos=filterArr.find(pos=>!rankedGroups.has(pos)&&!partialProgress[pos])||POSITION_GROUPS.find(pos=>!rankedGroups.has(pos)&&!partialProgress[pos]);
        return<div style={{padding:"10px 16px",borderTop:"1px solid #f0f0f0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontFamily:mono,fontSize:10,color:"#a3a3a3"}}>{rankedGroups.size}/{POSITION_GROUPS.length} positions · {userBoard.length} prospects</span>
          <div style={{display:"flex",gap:8}}>
            {rankedGroups.size>=POSITION_GROUPS.length?
              <button onClick={()=>navigate('/board')} style={{fontFamily:sans,fontSize:11,fontWeight:700,color:"#171717",background:"none",border:"1px solid #e5e5e5",borderRadius:99,padding:"5px 14px",cursor:"pointer"}}>full board view →</button>
            :contPos?
              <button onClick={()=>navigate('/rank/'+posToSlug(contPos))} style={{fontFamily:sans,fontSize:11,fontWeight:700,color:"#faf9f6",background:"#171717",border:"none",borderRadius:99,padding:"5px 14px",cursor:"pointer"}}>continue {contPos}s →</button>
            :nextPos?
              <button onClick={()=>navigate('/rank/'+posToSlug(nextPos))} style={{fontFamily:sans,fontSize:11,fontWeight:700,color:"#faf9f6",background:"#171717",border:"none",borderRadius:99,padding:"5px 14px",cursor:"pointer"}}>rank {nextPos}s →</button>
            :null}
          </div>
        </div>;
      })()}
      {boardTab==="consensus"&&<div style={{padding:"10px 16px",borderTop:"1px solid #f0f0f0",display:"flex",justifyContent:"center",alignItems:"center"}}>
        <span style={{fontFamily:sans,fontSize:11,color:"#a3a3a3"}}>disagree? <button onClick={()=>setBoardTab("my")} style={{fontFamily:sans,fontSize:11,fontWeight:700,color:"#171717",background:"none",border:"none",cursor:"pointer",textDecoration:"underline",padding:0}}>build your own rankings</button></span>
      </div>}
    </div>

    {/* Position Grid */}
    <h2 style={{fontFamily:font,fontSize:18,fontWeight:900,color:"#171717",margin:"0 0 4px",letterSpacing:-0.5}}>{hasBoardData?"edit positions":"rank by position"}</h2>
    <p style={{fontFamily:sans,fontSize:13,color:"#a3a3a3",margin:"0 0 14px"}}>rank each group to build your board</p>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))",gap:12}}>{POSITION_GROUPS.map(pos=>{const ct=(byPos[pos]||[]).length;const done=rankedGroups.has(pos);const partial=!!partialProgress[pos];const reviewed=traitReviewedGroups.has(pos);const c=POS_COLORS[pos];
      const completedCount=partial?(partialProgress[pos].completed?.size||0):0;
      const totalMatchups=partial?(partialProgress[pos].matchups?.length||0):0;
      return(<div key={pos} style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"18px 20px",position:"relative"}}>
        {done&&<span style={{position:"absolute",top:12,right:14,fontSize:10,fontFamily:mono,color:"#22c55e"}}>✓ ranked</span>}
        {partial&&!done&&<span style={{position:"absolute",top:12,right:14,fontSize:10,fontFamily:mono,color:"#ca8a04"}}>{completedCount}/{totalMatchups}</span>}
        <div style={{fontFamily:font,fontSize:28,fontWeight:900,color:c,marginBottom:2}}>{pos}</div>
        <div style={{fontFamily:mono,fontSize:11,color:"#a3a3a3",marginBottom:14}}>{ct} prospects</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {!done&&!partial&&<button onClick={()=>navigate('/rank/'+posToSlug(pos))} style={{fontFamily:sans,fontSize:12,fontWeight:700,padding:"7px 18px",background:"#171717",color:"#faf9f6",border:"none",borderRadius:99,cursor:"pointer"}}>{POS_EMOJI[pos]||""} rank</button>}
          {partial&&!done&&<>
            <button onClick={()=>{setBoardInitPos(pos);navigate('/board');}} style={{fontFamily:sans,fontSize:12,fontWeight:700,padding:"7px 18px",background:`${c}11`,color:c,border:`1px solid ${c}33`,borderRadius:99,cursor:"pointer"}}>✓ rankings</button>
            <button onClick={()=>navigate('/rank/'+posToSlug(pos))} style={{fontFamily:sans,fontSize:11,padding:"7px 14px",background:"#171717",color:"#faf9f6",border:"none",borderRadius:99,cursor:"pointer"}}>continue</button>
          </>}
          {done&&<>
            <button onClick={()=>{setBoardInitPos(pos);navigate('/board');}} style={{fontFamily:sans,fontSize:12,fontWeight:700,padding:"7px 18px",background:reviewed?`${c}11`:"#171717",color:reviewed?c:"#faf9f6",border:reviewed?`1px solid ${c}33`:"none",borderRadius:99,cursor:"pointer"}}>{reviewed?"✓ rankings":"rankings"}</button>
          </>}
        </div>
      </div>);})}</div>
    {rankedGroups.size>0&&<div style={{textAlign:"center",marginTop:32}}><button onClick={()=>navigate('/board')} style={{fontFamily:sans,fontSize:14,fontWeight:700,padding:"14px 36px",background:"#171717",color:"#faf9f6",border:"none",borderRadius:99,cursor:"pointer"}}>view big board ({rankedGroups.size}/{POSITION_GROUPS.length})</button></div>}

    {/* Team Mock Trends */}
    <div style={{marginTop:32}}>
      <h2 style={{fontFamily:font,fontSize:18,fontWeight:900,color:"#171717",margin:"0 0 4px",letterSpacing:-0.5}}>team insights</h2>
      <p style={{fontFamily:sans,fontSize:13,color:"#a3a3a3",margin:"0 0 14px"}}>see what the community drafts for each team</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(8, 1fr)",gap:8}}>
        {allTeams.sort().map(t=>{const tc=NFL_TEAM_COLORS[t]||"#171717";return<button key={t} onClick={()=>openTrends(t)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"10px 4px",background:"#fff",border:"1px solid #e5e5e5",borderRadius:10,cursor:"pointer",transition:"all 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=tc;e.currentTarget.style.background=`${tc}08`;}} onMouseLeave={e=>{e.currentTarget.style.borderColor="#e5e5e5";e.currentTarget.style.background="#fff";}}><NFLTeamLogo team={t} size={24}/><span style={{fontFamily:mono,fontSize:7,color:"#a3a3a3",fontWeight:600}}>{NFL_TEAM_ABR[t]}</span></button>;})}
      </div>
    </div>

    {/* Round 1 Prediction CTA */}
    <button onClick={()=>{navigate('/r1');trackEvent(user?.id,'round1_prediction_cta_click',{guest:!user});}} style={{width:"100%",padding:"14px 20px",marginTop:32,background:"linear-gradient(135deg,#1e293b,#0f172a)",color:"#94a3b8",border:"1px solid rgba(255,255,255,0.1)",borderRadius:12,cursor:"pointer",marginBottom:24,display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:sans,fontSize:14,fontWeight:600}}>
      🔮 simulate round 1
    </button>

    <TwitterFooter/>
    <div style={{textAlign:"center",padding:"4px 24px 24px",fontFamily:mono,fontSize:10,color:"#d4d4d4",letterSpacing:0.5}}>© {new Date().getFullYear()} Big Board Lab, LLC. All rights reserved.</div>
    </div>{profilePlayer&&<PlayerProfile player={profilePlayer} traits={traits} setTraits={setTraits} notes={notes} setNotes={setNotes} allProspects={PROSPECTS} getGrade={getGrade} onClose={closeProfile} onSelectPlayer={setProfilePlayer} consensus={CONSENSUS} ratings={ratings} isGuest={isGuest} onRequireAuth={onRequireAuth} schemeFits={schemeFits}/>}</div>);
  }

  // === RANKING ===
  if(phase==="ranking"&&currentMatchup&&activePos){const[aId,bId]=currentMatchup;const pA=prospectsMap[aId],pB=prospectsMap[bId];const c=POS_COLORS[activePos];const totalM=(matchups[activePos]||[]).length;const doneM=(completed[activePos]||new Set()).size;const ranked=getRanked(activePos);return(<div style={{minHeight:"100vh",background:"#faf9f6",fontFamily:font}}><SaveBar {...saveBarProps}/><div style={{maxWidth:720,margin:"0 auto",padding:"52px 24px 40px"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><h1 style={{fontSize:28,fontWeight:900,color:c,margin:0}}>rank {activePos}s</h1><div style={{display:"flex",gap:6}}>
    {canFinish&&<button onClick={()=>finishRanking(activePos,ratings)} style={{fontFamily:sans,fontSize:12,fontWeight:700,padding:"8px 20px",background:"#22c55e",color:"#fff",border:"none",borderRadius:99,cursor:"pointer"}}>✓ done</button>}
    {canSim&&<button onClick={()=>simAndFinish(activePos)} style={{fontFamily:sans,fontSize:11,padding:"8px 16px",background:"linear-gradient(135deg,#ec4899,#7c3aed)",color:"#fff",border:"none",borderRadius:99,cursor:"pointer"}}>sim rest ⚡</button>}
    <button onClick={()=>{setLockedPlayer(null);const done=completed[activePos]||new Set();if(done.size>0){setPartialProgress(prev=>({...prev,[activePos]:{matchups:matchups[activePos]||[],completed:done,ratings}}));}navigate('/');}} style={{fontFamily:sans,fontSize:11,padding:"8px 14px",background:"transparent",color:"#a3a3a3",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer"}}>save & exit</button>
  </div></div><p style={{fontFamily:sans,fontSize:13,color:"#a3a3a3",margin:"0 0 8px"}}>who's the better prospect?</p>{(()=>{
  const simThreshold=20;
  const simPct=30; // sim marker sits at 30% of bar visually
  const rawPct=doneM/totalM;
  // Compress: 0-simThreshold maps to 0-simPct%, simThreshold-totalM maps to simPct-100%
  const visualPct=doneM<=simThreshold?(doneM/simThreshold)*simPct:simPct+((doneM-simThreshold)/(totalM-simThreshold))*(100-simPct);
  const pastSim=doneM>=simThreshold;
  return<div style={{marginBottom:28}}>
    <div style={{position:"relative",height:6,background:"#e5e5e5",borderRadius:3}}>
      {/* Fill bar */}
      <div style={{position:"absolute",left:0,top:0,height:"100%",width:`${Math.min(visualPct,100)}%`,background:pastSim?`linear-gradient(90deg,${c},#22c55e)`:c,borderRadius:3,transition:"width 0.3s"}}/>
      {/* Sim threshold marker */}
      <div style={{position:"absolute",left:`${simPct}%`,top:-4,width:2,height:14,background:pastSim?"#22c55e":"#a3a3a3",borderRadius:1}}/>
    </div>
    <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>
      <div style={{position:"relative",left:`${simPct}%`,transform:"translateX(-50%)"}}>
        <span style={{fontFamily:mono,fontSize:9,color:pastSim?"#22c55e":"#a3a3a3"}}>{pastSim?"✓ ":""}sim & save{!pastSim?` (${simThreshold-doneM} left)`:""}</span>
      </div>
      <span style={{fontFamily:mono,fontSize:9,color:"#d4d4d4"}}>{doneM}/{totalM}</span>
    </div>
  </div>;
})()}<div style={{display:"flex",gap:12,marginBottom:24,alignItems:"stretch",position:"relative"}}><div style={{position:"absolute",left:"50%",top:"50%",transform:"translate(-50%,-50%)",zIndex:2,fontFamily:font,fontSize:16,fontWeight:900,color:"#d4d4d4",background:"#faf9f6",padding:"4px 10px",borderRadius:99,border:"1px solid #e5e5e5"}}>vs</div>{[{p:pA,id:aId},{p:pB,id:bId}].map(({p,id})=>{const ps=getProspectStats(p.name,p.school);return<button key={id} onClick={()=>{if(showConfidence)return;if(isGuest){onRequireAuth("sign in to vote and build your big board");return;}setPendingWinner(id);setShowConfidence(true);}} style={{flex:1,padding:"24px 16px 20px",background:pendingWinner===id?`${c}08`:"#fff",border:pendingWinner===id?`2px solid ${c}`:"1px solid #e5e5e5",borderRadius:16,cursor:showConfidence?"default":"pointer",textAlign:"center",transition:"all 0.15s",display:"flex",flexDirection:"column",alignItems:"center",gap:4}} onMouseEnter={e=>{if(!showConfidence)e.currentTarget.style.borderColor=c;}} onMouseLeave={e=>{if(!showConfidence&&pendingWinner!==id)e.currentTarget.style.borderColor="#e5e5e5";}}><SchoolLogo school={p.school} size={44}/><div style={{fontFamily:font,fontSize:20,fontWeight:900,color:"#171717",lineHeight:1.1,marginTop:2}}>{p.name}</div><div style={{fontFamily:mono,fontSize:11,color:"#a3a3a3"}}>{p.school}</div><div style={{display:"flex",gap:6,alignItems:"center",marginTop:2}}><span style={{fontFamily:mono,fontSize:10,fontWeight:500,color:c,background:`${c}0d`,padding:"3px 10px",borderRadius:4,border:`1px solid ${c}1a`}}>{p.gpos||p.pos}</span>{(()=>{const cr=getConsensusRank(p.name);const ovr=cr<900?cr:null;return<span style={{fontFamily:mono,fontSize:10,color:"#a3a3a3"}}>{ovr?"#"+ovr+" ovr":"NR"}{ps?.posRank?" · "+(p.gpos||p.pos)+ps.posRank:""}</span>;})()}</div>{ps&&(ps.height||ps.weight)&&<div style={{fontFamily:mono,fontSize:10,color:"#a3a3a3",marginTop:2}}>{[ps.height,ps.weight?ps.weight+"lbs":"",ps.cls?("yr "+ps.cls):""].filter(Boolean).join(" · ")}</div>}{ps&&ps.statLine&&<div style={{fontFamily:mono,fontSize:10,color:"#525252",marginTop:4,lineHeight:1.3,background:"#f9f9f6",padding:"4px 8px",borderRadius:6,border:"1px solid #f0f0f0",maxWidth:"100%"}}>{ps.statLine}{ps.statExtra&&<><br/><span style={{color:"#a3a3a3"}}>{ps.statExtra}</span></>}</div>}{(compCount[id]||0)>=2&&<div style={{fontFamily:mono,fontSize:9,color:"#a3a3a3",marginTop:4}}>{Math.round(((winCount[id]||0)/(compCount[id]))*100)}% pick rate</div>}</button>})}</div>{showConfidence&&<div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"20px 24px",marginBottom:24,textAlign:"center"}}><p style={{fontFamily:sans,fontSize:13,fontWeight:700,color:"#171717",margin:"0 0 4px"}}>how confident?</p><p style={{fontFamily:sans,fontSize:12,color:"#a3a3a3",margin:"0 0 16px"}}>higher = bigger rating swing</p><div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>{[["coin flip",.2],["leaning",.5],["confident",.75],["lock",1]].map(([label,val])=><button key={label} onClick={()=>handlePick(pendingWinner,val)} style={{fontFamily:sans,fontSize:12,fontWeight:600,padding:"8px 16px",background:val>=.75?"#171717":"transparent",color:val>=.75?"#faf9f6":"#525252",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer"}} onMouseEnter={e=>{e.currentTarget.style.background="#171717";e.currentTarget.style.color="#faf9f6";}} onMouseLeave={e=>{if(val<.75){e.currentTarget.style.background="transparent";e.currentTarget.style.color="#525252";}}}>{label}</button>)}</div><button onClick={()=>{setShowConfidence(false);setPendingWinner(null);}} style={{fontFamily:sans,fontSize:11,color:"#a3a3a3",background:"none",border:"none",cursor:"pointer",marginTop:10}}>← pick again</button></div>}<div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"16px 20px",marginBottom:16}}>{lockedPlayer&&(()=>{const lp=prospectsMap[lockedPlayer];const remLocked=(matchups[activePos]||[]).filter(m=>!((completed[activePos]||new Set()).has(`${m[0]}-${m[1]}`))&&(m[0]===lockedPlayer||m[1]===lockedPlayer));return<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",marginBottom:12,background:"linear-gradient(135deg,#fef3c7,#fef9c3)",border:"1px solid #fbbf24",borderRadius:8}}><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:14}}>🎯</span><span style={{fontFamily:sans,fontSize:12,fontWeight:700,color:"#92400e"}}>{lp?.name} focus mode</span><span style={{fontFamily:mono,fontSize:10,color:"#b45309"}}>{remLocked.length} left</span></div><button onClick={()=>{setLockedPlayer(null);const ns=completed[activePos]||new Set();const next=getNextMatchup(matchups[activePos],ns,ratings,compCount,posRankFn,null);if(next)setCurrentMatchup(next);}} style={{fontFamily:sans,fontSize:10,fontWeight:600,padding:"4px 10px",background:"#fff",color:"#92400e",border:"1px solid #fbbf24",borderRadius:99,cursor:"pointer"}}>unlock</button></div>;})()}<p style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",margin:"0 0 10px"}}>live rankings</p><div style={{maxHeight:400,overflowY:"auto"}}>{ranked.map((p,i)=>{const isLocked=lockedPlayer===p.id;return<div key={p.id} className="rank-row" style={{display:"flex",alignItems:"center",gap:10,padding:"5px 0",borderBottom:i<ranked.length-1?"1px solid #f5f5f5":"none",background:isLocked?"#fef9c3":"transparent",borderRadius:isLocked?4:0,margin:isLocked?"0 -4px":"0",padding:isLocked?"5px 4px":"5px 0"}}><span style={{fontFamily:mono,fontSize:11,color:"#d4d4d4",width:20,textAlign:"right"}}>{i+1}</span><SchoolLogo school={p.school} size={20}/><span style={{fontFamily:sans,fontSize:13,fontWeight:600,color:"#171717",flex:1,cursor:"pointer",textDecoration:"none"}} onClick={e=>{e.stopPropagation();setProfilePlayer(p);}} onMouseEnter={e=>e.currentTarget.style.textDecoration="underline"} onMouseLeave={e=>e.currentTarget.style.textDecoration="none"}>{p.name}</span><span style={{fontFamily:mono,fontSize:11,color:"#a3a3a3"}}>{Math.round(ratings[p.id]||1500)}</span><button onClick={e=>{e.stopPropagation();if(isLocked){setLockedPlayer(null);const ns=completed[activePos]||new Set();const next=getNextMatchup(matchups[activePos],ns,ratings,compCount,posRankFn,null);if(next)setCurrentMatchup(next);}else{setLockedPlayer(p.id);const ns=completed[activePos]||new Set();const next=getNextMatchup(matchups[activePos],ns,ratings,compCount,posRankFn,p.id);if(next)setCurrentMatchup(next);else setLockedPlayer(null);}}} title={isLocked?"Unlock":"Focus matchups on this player"} style={{fontSize:12,background:"none",border:"none",cursor:"pointer",padding:"2px 4px",opacity:isLocked?1:0,transition:"opacity 0.15s",flexShrink:0}} className="lock-btn">{isLocked?"🎯":"📌"}</button></div>;})}</div><style>{`.rank-row:hover .lock-btn{opacity:1!important;}@media(max-width:768px){.lock-btn{display:none!important;}.reorder-hint-desktop{display:none!important;}.reorder-hint-mobile{display:inline!important;}}`}</style></div><button onClick={()=>{setLockedPlayer(null);const done=completed[activePos]||new Set();if(done.size>0){setPartialProgress(prev=>({...prev,[activePos]:{matchups:matchups[activePos]||[],completed:done,ratings}}));}navigate('/');}} style={{fontFamily:sans,fontSize:12,color:"#a3a3a3",background:"none",border:"1px solid #e5e5e5",borderRadius:99,padding:"8px 20px",cursor:"pointer"}}>← save & exit</button></div>{profilePlayer&&<PlayerProfile player={profilePlayer} traits={traits} setTraits={setTraits} notes={notes} setNotes={setNotes} allProspects={PROSPECTS} getGrade={getGrade} onClose={closeProfile} onSelectPlayer={setProfilePlayer} consensus={CONSENSUS} ratings={ratings} isGuest={isGuest} onRequireAuth={onRequireAuth} schemeFits={schemeFits}/>}</div>);}

  // === RECONCILE ===
  if(phase==="reconcile"&&reconcileQueue.length>0){const item=reconcileQueue[Math.min(reconcileIndex,reconcileQueue.length-1)];const c=POS_COLORS[item.player.pos];const dir=item.gradeRank<item.pairRank?"higher":"lower";return(<div style={{minHeight:"100vh",background:"#faf9f6",fontFamily:font}}><SaveBar {...saveBarProps}/><div style={{maxWidth:500,margin:"0 auto",padding:"52px 24px"}}><p style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",margin:"0 0 4px"}}>reconcile · {reconcileIndex+1} of {reconcileQueue.length}</p><div style={{height:3,background:"#e5e5e5",borderRadius:2,marginBottom:28,overflow:"hidden"}}><div style={{height:"100%",width:`${((reconcileIndex+1)/reconcileQueue.length)*100}%`,background:c,borderRadius:2}}/></div><div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:16,padding:32,textAlign:"center"}}><SchoolLogo school={item.player.school} size={56}/><div style={{fontFamily:font,fontSize:28,fontWeight:900,color:c,marginBottom:4,marginTop:8}}>{item.player.name}</div><div style={{fontFamily:mono,fontSize:12,color:"#a3a3a3",marginBottom:24}}>{item.player.school}</div><div style={{display:"flex",justifyContent:"center",gap:32,marginBottom:24}}>{[["gut rank",`#${item.pairRank}`,"#171717"],["grade rank",`#${item.gradeRank}`,dir==="higher"?"#16a34a":"#dc2626"],["composite",`${item.grade}`,"#171717"]].map(([label,val,col])=><div key={label}><div style={{fontFamily:mono,fontSize:9,letterSpacing:1.5,color:"#a3a3a3",textTransform:"uppercase",marginBottom:4}}>{label}</div><div style={{fontFamily:font,fontSize:28,fontWeight:900,color:col}}>{val}</div></div>)}</div><p style={{fontFamily:sans,fontSize:14,color:"#737373",lineHeight:1.5,marginBottom:24}}>your traits suggest this player should rank <strong style={{color:dir==="higher"?"#16a34a":"#dc2626"}}>{dir}</strong> than your gut. accept?</p><div style={{display:"flex",gap:10,justifyContent:"center"}}><button onClick={()=>{const pos=item.player.pos;const rk=getRanked(pos);const ti=item.gradeRank-1;const tp=rk[ti];if(tp)setRatings(prev=>({...prev,[item.player.id]:(prev[tp.id]||1500)+(dir==="higher"?1:-1)}));reconcileIndex>=reconcileQueue.length-1?(setBoardInitPos(activePos),setPhase("board"),window.history.replaceState({},'','/board')):setReconcileIndex(reconcileIndex+1);}} style={{fontFamily:sans,fontSize:13,fontWeight:700,padding:"10px 24px",background:"#171717",color:"#faf9f6",border:"none",borderRadius:99,cursor:"pointer"}}>accept</button><button onClick={()=>reconcileIndex>=reconcileQueue.length-1?(setBoardInitPos(activePos),setPhase("board"),window.history.replaceState({},'','/board')):setReconcileIndex(reconcileIndex+1)} style={{fontFamily:sans,fontSize:13,padding:"10px 24px",background:"transparent",color:"#737373",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer"}}>keep my rank</button></div></div></div></div>);}

  // === BIG BOARD ===
  if(phase==="board")return(<div><SaveBar {...saveBarProps}/><div style={{paddingTop:32}}><BoardView board={board} getGrade={getGrade} rankedGroups={rankedGroups} setPhase={setPhase} navigate={navigate} setSelectedPlayer={setSelectedPlayer} setActivePos={setActivePos} traits={traits} compareList={compareList} setCompareList={setCompareList} setProfilePlayer={setProfilePlayer} setShowMockDraft={setShowMockDraft} communityBoard={communityBoard} setCommunityBoard={setCommunityBoard} ratings={ratings} byPos={byPos} traitThresholds={traitThresholds} qualifiesForFilter={qualifiesForFilter} prospectBadges={prospectBadges} sharePositionTop10={sharePositionTop10} copiedShare={copiedShare} measurableThresholds={measurableThresholds} qualifiesForMeasurableFilter={qualifiesForMeasurableFilter} initialPos={boardInitPos} onClearInitPos={()=>setBoardInitPos(null)} movePlayer={movePlayer} getRanked={getRanked} isGuest={isGuest} onRequireAuth={onRequireAuth} setRankedGroups={setRankedGroups} setTraitReviewedGroups={setTraitReviewedGroups} setRatings={setRatings} setTraits={setTraits} setCompCount={setCompCount} setPartialProgress={setPartialProgress}/></div><TwitterFooter/><div style={{textAlign:"center",padding:"4px 24px 24px",fontFamily:mono,fontSize:10,color:"#d4d4d4",letterSpacing:0.5}}>© {new Date().getFullYear()} Big Board Lab, LLC. All rights reserved.</div>{profilePlayer&&<PlayerProfile player={profilePlayer} traits={traits} setTraits={setTraits} notes={notes} setNotes={setNotes} allProspects={PROSPECTS} getGrade={getGrade} onClose={closeProfile} onSelectPlayer={setProfilePlayer} consensus={CONSENSUS} ratings={ratings} isGuest={isGuest} onRequireAuth={onRequireAuth} schemeFits={schemeFits}/>}</div>);

  return(<>{profilePlayer&&<PlayerProfile player={profilePlayer} traits={traits} setTraits={setTraits} notes={notes} setNotes={setNotes} allProspects={PROSPECTS} getGrade={getGrade} onClose={closeProfile} onSelectPlayer={setProfilePlayer} consensus={CONSENSUS} ratings={ratings} isGuest={isGuest} onRequireAuth={onRequireAuth} schemeFits={schemeFits}/>}</>);
}

const DraggableRankList=memo(function DraggableRankList({ranked,activePos,cur,c,getGrade,setSelectedPlayer,movePlayer,setProfilePlayer,font,mono,sans,isGuest,onRequireAuth}){
  const[dragIdx,setDragIdx]=useState(null);
  const[overIdx,setOverIdx]=useState(null);
  // Touch long-press drag support
  const touchState=useRef({timer:null,dragging:false,startIdx:null,startY:0,currentIdx:null});
  const listRef=useRef(null);
  const handleDragStart=(e,i)=>{if(isGuest){e.preventDefault();onRequireAuth("sign in to reorder your rankings");return;}setDragIdx(i);e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',i);};
  const handleDragOver=(e,i)=>{e.preventDefault();e.dataTransfer.dropEffect='move';setOverIdx(i);};
  const handleDrop=(e,i)=>{e.preventDefault();if(dragIdx!==null&&dragIdx!==i)movePlayer(activePos,dragIdx,i);setDragIdx(null);setOverIdx(null);};
  const handleDragEnd=()=>{setDragIdx(null);setOverIdx(null);};
  const getIdxFromY=(y)=>{if(!listRef.current)return null;const rows=listRef.current.children;for(let i=0;i<rows.length;i++){const r=rows[i].getBoundingClientRect();if(y>=r.top&&y<=r.bottom)return i;}return null;};
  const handleTouchStart=(e,i)=>{if(isGuest)return;const ts=touchState.current;ts.startY=e.touches[0].clientY;ts.startIdx=i;ts.timer=setTimeout(()=>{ts.dragging=true;setDragIdx(i);if(navigator.vibrate)navigator.vibrate(30);},400);};
  const handleTouchMove=(e)=>{const ts=touchState.current;if(!ts.dragging){if(ts.timer&&Math.abs(e.touches[0].clientY-ts.startY)>8){clearTimeout(ts.timer);ts.timer=null;}return;}e.preventDefault();const idx=getIdxFromY(e.touches[0].clientY);if(idx!==null&&idx!==ts.currentIdx){ts.currentIdx=idx;setOverIdx(idx);}};
  const handleTouchEnd=()=>{const ts=touchState.current;if(ts.timer){clearTimeout(ts.timer);ts.timer=null;}if(ts.dragging&&ts.startIdx!==null&&ts.currentIdx!==null&&ts.startIdx!==ts.currentIdx){movePlayer(activePos,ts.startIdx,ts.currentIdx);}ts.dragging=false;ts.startIdx=null;ts.currentIdx=null;setDragIdx(null);setOverIdx(null);};
  return(
    <div style={{flex:"1 1 260px",minWidth:220,maxWidth:400,background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,overflow:"hidden"}}>
      <div style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",padding:"12px 16px 4px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span>rankings</span>{!isGuest&&<><span className="reorder-hint-desktop" style={{fontSize:9,letterSpacing:1,color:"#d4d4d4",fontWeight:400}}>drag to reorder</span><span className="reorder-hint-mobile" style={{fontSize:9,letterSpacing:1,color:"#d4d4d4",fontWeight:400,display:"none"}}>hold to reorder</span></>}
      </div>
      <div ref={listRef} style={{maxHeight:480,overflowY:"auto"}}>
        {ranked.map((p,i)=>{const grade=getGrade(p.id);return(
          <div key={p.id} draggable={!isGuest} onDragStart={e=>handleDragStart(e,i)} onDragOver={e=>handleDragOver(e,i)} onDrop={e=>handleDrop(e,i)} onDragEnd={handleDragEnd}
            onTouchStart={e=>handleTouchStart(e,i)} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
            onClick={()=>setSelectedPlayer(p)}
            style={{display:"flex",alignItems:"center",gap:6,padding:"7px 12px 7px 8px",borderLeft:cur?.id===p.id?`3px solid ${c}`:"3px solid transparent",background:dragIdx===i?"#f0f0f0":overIdx===i&&dragIdx!==null?`${c}0a`:cur?.id===p.id?`${c}06`:"transparent",cursor:isGuest?"pointer":"grab",userSelect:"none",borderBottom:overIdx===i&&dragIdx!==null?`2px solid ${c}`:"1px solid transparent",transition:"background 0.1s",opacity:dragIdx===i?0.5:1}}>
            {!isGuest&&<span style={{fontFamily:mono,fontSize:9,color:"#d4d4d4",cursor:"grab",padding:"0 2px",flexShrink:0}}>⠿</span>}
            <span style={{fontFamily:mono,fontSize:11,color:"#d4d4d4",width:16,textAlign:"right",flexShrink:0}}>{i+1}</span>
            <SchoolLogo school={p.school} size={18}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:sans,fontSize:11,fontWeight:600,color:"#171717",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",cursor:"pointer"}} onClick={e=>{e.stopPropagation();setProfilePlayer(p);}} onMouseEnter={e=>e.currentTarget.style.textDecoration="underline"} onMouseLeave={e=>e.currentTarget.style.textDecoration="none"}>{p.name}</div>
            </div>
            <span style={{fontFamily:font,fontSize:12,fontWeight:900,color:grade>=75?"#16a34a":grade>=55?"#ca8a04":"#dc2626",flexShrink:0}}>{grade}</span>
          </div>
        );})}
      </div>
    </div>
  );
});

const BoardView=memo(function BoardView({board,getGrade,rankedGroups,setPhase,navigate,setSelectedPlayer,setActivePos,traits,compareList,setCompareList,setProfilePlayer,setShowMockDraft,communityBoard,setCommunityBoard,ratings,byPos,traitThresholds,qualifiesForFilter,prospectBadges,sharePositionTop10,copiedShare,measurableThresholds,qualifiesForMeasurableFilter,initialPos,onClearInitPos,movePlayer,getRanked,isGuest,onRequireAuth,setRankedGroups,setTraitReviewedGroups,setRatings,setTraits,setCompCount,setPartialProgress}){
  const[filterPos,setFilterPos]=useState(new Set());const[traitFilter,setTraitFilter]=useState(new Set());const[measMode,setMeasMode]=useState(false);useEffect(()=>{setTraitFilter(new Set());setMeasMode(false);},[filterPos]);const[showCommunity,setShowCommunity]=useState(false);
  // 6a: consume initialPos on mount
  useEffect(()=>{if(initialPos){setFilterPos(new Set([initialPos]));onClearInitPos();}},[initialPos]);
  // 6b: drag-to-reorder state
  const[dragIdx,setDragIdx]=useState(null);const[overIdx,setOverIdx]=useState(null);const touchState=useRef({timer:null,dragging:false,startIdx:null,startY:0,currentIdx:null});const listRef=useRef(null);let display=filterPos.size>0?board.filter(p=>filterPos.has(p.gpos||p.pos)):board;if(traitFilter.size>0&&filterPos.size===1){const pos=[...filterPos][0];display=display.filter(p=>measMode?[...traitFilter].some(m=>qualifiesForMeasurableFilter(p.id,pos,m)):[...traitFilter].some(t=>qualifiesForFilter(p.id,pos,t)));}
  // When single ranked position filtered, show in ranking order
  const activeSingleRanked=filterPos.size===1&&rankedGroups.has([...filterPos][0])?[...filterPos][0]:null;
  const canDrag=!!activeSingleRanked&&traitFilter.size===0;
  if(activeSingleRanked){const ranked=getRanked(activeSingleRanked);const displayIds=new Set(display.map(p=>p.id));display=ranked.filter(p=>displayIds.has(p.id));}
  // drag handlers
  const getIdxFromY=(y)=>{if(!listRef.current)return null;const rows=listRef.current.children;for(let i=0;i<rows.length;i++){const r=rows[i].getBoundingClientRect();if(y>=r.top&&y<=r.bottom)return i;}return null;};
  const handleDragStart=(e,i)=>{if(!canDrag)return;if(isGuest){e.preventDefault();onRequireAuth("sign in to reorder your rankings");return;}setDragIdx(i);e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',i);};
  const handleDragOver=(e,i)=>{if(!canDrag)return;e.preventDefault();e.dataTransfer.dropEffect='move';setOverIdx(i);};
  const handleDrop=(e,i)=>{if(!canDrag)return;e.preventDefault();if(dragIdx!==null&&dragIdx!==i)movePlayer(activeSingleRanked,dragIdx,i);setDragIdx(null);setOverIdx(null);};
  const handleDragEnd=()=>{setDragIdx(null);setOverIdx(null);};
  const handleTouchStart=(e,i)=>{if(!canDrag||isGuest)return;const ts=touchState.current;ts.startY=e.touches[0].clientY;ts.startIdx=i;ts.timer=setTimeout(()=>{ts.dragging=true;setDragIdx(i);if(navigator.vibrate)navigator.vibrate(30);},400);};
  const handleTouchMove=(e)=>{const ts=touchState.current;if(!ts.dragging){if(ts.timer&&Math.abs(e.touches[0].clientY-ts.startY)>8){clearTimeout(ts.timer);ts.timer=null;}return;}e.preventDefault();const idx=getIdxFromY(e.touches[0].clientY);if(idx!==null&&idx!==ts.currentIdx){ts.currentIdx=idx;setOverIdx(idx);}};
  const handleTouchEnd=()=>{const ts=touchState.current;if(ts.timer){clearTimeout(ts.timer);ts.timer=null;}if(ts.dragging&&ts.startIdx!==null&&ts.currentIdx!==null&&ts.startIdx!==ts.currentIdx){movePlayer(activeSingleRanked,ts.startIdx,ts.currentIdx);}ts.dragging=false;ts.startIdx=null;ts.currentIdx=null;setDragIdx(null);setOverIdx(null);};
  const compPlayers=compareList.map(id=>board.find(p=>p.id===id)).filter(Boolean);
  const samePos=compPlayers.length>=2&&compPlayers.every(p=>p.pos===compPlayers[0].pos);
  const compColors=["#2563eb","#dc2626","#16a34a","#f59e0b"];
  const[compareMeasMode,setCompareMeasMode]=useState(false);
  useEffect(()=>{setCompareMeasMode(false);},[compareList.length]);
  const allCompHaveMeas=compPlayers.length>=2&&compPlayers.every(p=>getMeasRadarData(p.name,p.school)!=null);
  const[showCompareTip,setShowCompareTip]=useState(()=>{try{return!localStorage.getItem('bbl_compare_tip_seen');}catch(e){return true;}});
  const dismissCompareTip=()=>{setShowCompareTip(false);try{localStorage.setItem('bbl_compare_tip_seen','1');}catch(e){}};

  // Load community board
  const loadCommunity=useCallback(async()=>{
    try{
      const{data}=await supabase.from('community_boards').select('board_data');
      if(data&&data.length>0){
        const agg={};let count=0;
        data.forEach(row=>{count++;const bd=row.board_data;Object.entries(bd).forEach(([pid,rating])=>{if(!agg[pid])agg[pid]={total:0,count:0};agg[pid].total+=rating;agg[pid].count++;});});
        const avg={};const voterCount={};Object.entries(agg).forEach(([pid,{total,count:c}])=>{avg[pid]=total/c;voterCount[pid]=c;});
        setCommunityBoard({ratings:avg,totalUsers:count,voterCount});
        setShowCommunity(true);
      }
    }catch(e){console.error(e);}
  },[]);

  const activeSinglePos=filterPos.size===1?[...filterPos][0]:null;
  return(<div style={{minHeight:"100vh",background:"#faf9f6",fontFamily:font}}><div style={{maxWidth:800,margin:"0 auto",padding:"40px 24px"}}><div style={{display:"flex",alignItems:"center",gap:12,marginBottom:6,minWidth:0}}><h1 style={{fontSize:36,fontWeight:900,color:activeSinglePos?(POS_COLORS[activeSinglePos]||"#171717"):"#171717",margin:0,letterSpacing:-1,whiteSpace:"nowrap"}}>{activeSinglePos?<><span>{activeSinglePos}</span><span className="hide-mobile"> rankings</span></>:"big board"}</h1>{filterPos.size<=1&&display.length>0&&<button onClick={()=>sharePositionTop10(activeSinglePos)} style={{fontFamily:sans,fontSize:12,fontWeight:700,padding:"6px 14px",background:"transparent",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",display:"inline-flex",alignItems:"center",flexShrink:0,position:"relative"}}><span style={{visibility:copiedShare==="top10"?"hidden":"visible"}}><span className="shimmer-text">share top 10</span></span>{copiedShare==="top10"&&<span style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",color:"#a3a3a3",fontWeight:400}}>copied</span>}</button>}</div><p style={{fontFamily:sans,fontSize:13,color:"#a3a3a3",margin:"0 0 12px"}}>{display.length} prospects ranked by you</p>

    {showCommunity&&communityBoard&&<div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"16px 20px",marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div><span style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase"}}>community consensus</span><span style={{fontFamily:mono,fontSize:10,color:"#d4d4d4",marginLeft:8}}>{communityBoard.totalUsers} users</span></div>
        <button onClick={()=>setShowCommunity(false)} style={{fontFamily:sans,fontSize:10,color:"#a3a3a3",background:"none",border:"1px solid #e5e5e5",borderRadius:99,padding:"3px 10px",cursor:"pointer"}}>hide</button>
      </div>
      {/* Overall top 25 */}
      <div style={{fontFamily:mono,fontSize:8,letterSpacing:1.5,color:"#a3a3a3",textTransform:"uppercase",marginBottom:6}}>overall top 25</div>
      {PROSPECTS.filter(p=>communityBoard.ratings[p.id]).sort((a,b)=>(communityBoard.ratings[b.id]||0)-(communityBoard.ratings[a.id]||0)).slice(0,25).map((p,i)=>{
        const userIdx=board.findIndex(x=>x.id===p.id);const diff=userIdx>=0?i-userIdx:null;const c=POS_COLORS[p.gpos||p.pos]||POS_COLORS[p.pos];const voters=communityBoard.voterCount?.[p.id]||0;
        return<div key={p.id} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 0",borderBottom:i<24?"1px solid #f8f8f8":"none"}}>
          <span style={{fontFamily:mono,fontSize:10,color:"#d4d4d4",width:20,textAlign:"right"}}>{i+1}</span>
          <span style={{fontFamily:mono,fontSize:9,color:c,width:32}}>{p.gpos||p.pos}</span>
          <SchoolLogo school={p.school} size={16}/>
          <span style={{fontFamily:sans,fontSize:12,fontWeight:600,color:"#171717",flex:1}}>{p.name}</span>
          {voters>1&&<span style={{fontFamily:mono,fontSize:8,color:"#a3a3a3"}}>{voters} votes</span>}
          {diff!==null&&<span style={{fontFamily:mono,fontSize:9,color:diff>0?"#16a34a":diff<0?"#dc2626":"#a3a3a3"}}>{diff>0?`↑${diff}`:diff<0?`↓${Math.abs(diff)}`:"="}</span>}
        </div>;
      })}
      {/* Per-position top 5 */}
      <div style={{fontFamily:mono,fontSize:8,letterSpacing:1.5,color:"#a3a3a3",textTransform:"uppercase",marginTop:16,marginBottom:8}}>by position</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))",gap:8}}>
        {POSITION_GROUPS.filter(g=>g!=="K/P").map(gpos=>{
          const posPlayers=PROSPECTS.filter(p=>(p.gpos||p.pos)===gpos&&communityBoard.ratings[p.id]).sort((a,b)=>(communityBoard.ratings[b.id]||0)-(communityBoard.ratings[a.id]||0)).slice(0,5);
          if(posPlayers.length===0)return null;const c=POS_COLORS[gpos]||"#737373";
          return<div key={gpos} style={{background:"#f9f9f7",borderRadius:8,padding:"8px 10px"}}>
            <div style={{fontFamily:font,fontSize:14,fontWeight:900,color:c,marginBottom:4}}>{gpos}</div>
            {posPlayers.map((p,i)=>{
              const myRank=byPos[gpos]?[...byPos[gpos]].sort((a,b)=>(ratings[b.id]||1500)-(ratings[a.id]||1500)).findIndex(x=>x.id===p.id)+1:-1;
              return<div key={p.id} style={{display:"flex",alignItems:"center",gap:4,padding:"2px 0"}}>
                <span style={{fontFamily:mono,fontSize:9,color:"#d4d4d4",width:14,textAlign:"right"}}>{i+1}</span>
                <span style={{fontFamily:sans,fontSize:11,fontWeight:500,color:"#171717",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</span>
                {myRank>0&&rankedGroups.has(gpos)&&<span style={{fontFamily:mono,fontSize:8,color:myRank<=i+1?"#16a34a":"#dc2626"}}>you: #{myRank}</span>}
              </div>;
            })}
          </div>;
        })}
      </div>
    </div>}

    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:filterPos.size===1?6:20}}><button onClick={()=>setFilterPos(new Set())} style={{fontFamily:mono,fontSize:11,padding:"5px 14px",background:filterPos.size===0?"#171717":"transparent",color:filterPos.size===0?"#faf9f6":"#a3a3a3",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer"}}>all</button>{POSITION_GROUPS.filter(p=>rankedGroups.has(p)).map(pos=>{const active=filterPos.has(pos);return<button key={pos} onClick={()=>setFilterPos(prev=>{const n=new Set(prev);if(n.has(pos))n.delete(pos);else n.add(pos);return n;})} style={{fontFamily:mono,fontSize:11,padding:"5px 14px",background:active?`${POS_COLORS[pos]}11`:"transparent",color:active?POS_COLORS[pos]:"#a3a3a3",border:`1px solid ${active?POS_COLORS[pos]+"33":"#e5e5e5"}`,borderRadius:99,cursor:"pointer"}}>{pos}</button>;})}</div>
    {filterPos.size===1&&(()=>{const rawPos=[...filterPos][0];const posTraits=POSITION_TRAITS[rawPos]||[];if(!posTraits.length)return null;const c=POS_COLORS[rawPos]||"#525252";const relevantIds=board.map(p=>p.id);const measPills=MEASURABLE_LIST.filter(m=>measurableThresholds[rawPos]?.[m]);return<div style={{display:"flex",alignItems:"center",gap:6,padding:"0 0 12px"}}><button title={measMode?"Measurables mode — click for Traits":"Traits mode — click for Measurables"} onClick={()=>{setMeasMode(v=>!v);setTraitFilter(new Set());}} style={{width:40,height:22,borderRadius:11,border:"none",background:measMode?"linear-gradient(135deg,#00ffff,#1e3a5f)":"linear-gradient(135deg,#ec4899,#a855f7)",cursor:"pointer",position:"relative",transition:"background 0.2s",flexShrink:0}}><div style={{width:16,height:16,borderRadius:8,background:"#fff",position:"absolute",top:3,left:measMode?21:3,transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontFamily:mono,fontSize:8,fontWeight:700,color:measMode?"#00ffff":"#a855f7",lineHeight:1}}>{measMode?"M":"T"}</span></div></button><div className="trait-pills-scroll" style={{display:"flex",gap:4,overflowX:"auto",WebkitOverflowScrolling:"touch",flexWrap:"nowrap",scrollbarWidth:"none",alignItems:"center",flex:1,minWidth:0}}>{!measMode?posTraits.map(trait=>{const active=traitFilter.has(trait);const count=relevantIds.filter(id=>qualifiesForFilter(id,rawPos,trait)).length;return<button key={trait} onClick={()=>setTraitFilter(prev=>{const n=new Set(prev);n.has(trait)?n.delete(trait):n.add(trait);return n;})} style={{fontFamily:mono,fontSize:9,padding:"3px 8px",background:active?c+"18":"transparent",color:active?"#171717":"#525252",border:"1px solid "+(active?c+"44":c+"25"),borderRadius:99,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",gap:3,whiteSpace:"nowrap"}}><span>{TRAIT_EMOJI[trait]}</span><span>{TRAIT_SHORT[trait]||trait}</span><span style={{fontSize:8,opacity:0.7}}>({count})</span></button>;}):(()=>{const groups=MEAS_GROUPS.map(g=>({...g,pills:g.keys.filter(m=>measPills.includes(m))})).filter(g=>g.pills.length>0);return groups.flatMap((g,gi)=>{const divider=gi>0?[<span key={"d"+gi} style={{color:"#d4d4d4",fontSize:10,flexShrink:0,padding:"0 1px",lineHeight:1}}>·</span>]:[];return[...divider,...g.pills.map(m=>{const active=traitFilter.has(m);const count=relevantIds.filter(id=>qualifiesForMeasurableFilter(id,rawPos,m)).length;return<button key={m} onClick={()=>setTraitFilter(prev=>{const n=new Set(prev);n.has(m)?n.delete(m):n.add(m);return n;})} style={{fontFamily:mono,fontSize:9,padding:"3px 8px",background:active?g.border+"18":"transparent",color:active?"#171717":"#525252",border:"1px solid "+(active?g.border+"66":g.border+"30"),borderRadius:99,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",gap:3,whiteSpace:"nowrap"}}><span>{MEASURABLE_EMOJI[m]}</span><span>{MEASURABLE_SHORT[m]}</span><span style={{fontSize:8,opacity:0.7}}>({count})</span></button>;})];});})()}</div></div>;})()}
    {showCompareTip&&compareList.length===0&&<div style={{background:"linear-gradient(135deg,#fdf4ff,#f5f3ff)",border:"1px solid #e9d5ff",borderRadius:12,padding:"12px 16px",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between"}}><span style={{fontFamily:sans,fontSize:13,color:"#7c3aed"}}>💡 Click rows to compare up to 4 prospects head-to-head on traits</span><button onClick={dismissCompareTip} style={{fontFamily:sans,fontSize:11,color:"#a3a3a3",background:"none",border:"none",cursor:"pointer",flexShrink:0}}>✕</button></div>}{compareList.length>0&&<div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:16,marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <span style={{fontFamily:mono,fontSize:10,color:"#a3a3a3",letterSpacing:1,textTransform:"uppercase"}}>compare {compareList.length} player{compareList.length!==1?"s":""}</span>
        <button onClick={()=>setCompareList([])} style={{fontFamily:sans,fontSize:11,color:"#a3a3a3",background:"none",border:"1px solid #e5e5e5",borderRadius:99,padding:"4px 12px",cursor:"pointer"}}>clear</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:`repeat(${compPlayers.length},1fr)`,gap:16}}>
        {compPlayers.map((p,ci)=>{const c=compColors[ci];const grade=getGrade(p.id);return<div key={p.id} style={{textAlign:"center",borderLeft:ci>0?"1px solid #f5f5f5":"none",paddingLeft:ci>0?16:0}}>
          <div style={{width:8,height:8,borderRadius:99,background:c,margin:"0 auto 6px"}}/>
          <SchoolLogo school={p.school} size={28}/>
          <div style={{fontFamily:sans,fontSize:13,fontWeight:700,color:"#171717",marginTop:4,cursor:"pointer"}} onClick={()=>setProfilePlayer(p)} onMouseEnter={e=>e.currentTarget.style.textDecoration="underline"} onMouseLeave={e=>e.currentTarget.style.textDecoration="none"}>{p.name}</div>
          <div style={{fontFamily:mono,fontSize:10,color:"#a3a3a3"}}>{p.gpos||p.pos} · {p.school}</div>
          <div style={{fontFamily:font,fontSize:24,fontWeight:900,color:grade>=75?"#16a34a":grade>=55?"#ca8a04":"#dc2626",marginTop:4}}>{grade}</div>
          <button onClick={()=>setCompareList(prev=>prev.filter(id=>id!==p.id))} style={{fontFamily:mono,fontSize:9,color:"#d4d4d4",background:"none",border:"none",cursor:"pointer",marginTop:4}}>remove</button>
        </div>;})}
      </div>
      {compPlayers.length>=2&&<>
        {allCompHaveMeas&&<div style={{display:"flex",justifyContent:"center",marginTop:12}}><button title={compareMeasMode?"Switch to traits":"Switch to measurables"} onClick={()=>setCompareMeasMode(v=>!v)} style={{width:40,height:22,borderRadius:11,border:"none",background:compareMeasMode?"linear-gradient(135deg,#00ffff,#1e3a5f)":"linear-gradient(135deg,#ec4899,#a855f7)",cursor:"pointer",position:"relative",transition:"background 0.2s"}}><div style={{width:16,height:16,borderRadius:8,background:"#fff",position:"absolute",top:3,left:compareMeasMode?21:3,transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontFamily:mono,fontSize:8,fontWeight:700,color:compareMeasMode?"#00ffff":"#a855f7",lineHeight:1}}>{compareMeasMode?"M":"T"}</span></div></button></div>}
        <div style={{display:"flex",justifyContent:"center",gap:8,marginTop:allCompHaveMeas?8:16,flexWrap:"wrap"}}>
          {compPlayers.map((p,ci)=>{if(compareMeasMode){const md=getMeasRadarData(p.name,p.school);return<div key={p.id} style={{position:"relative",display:"flex",flexDirection:"column",alignItems:"center"}}><RadarChart traits={md.labels} values={md.values} color={compColors[ci]} size={160} proDaySpokes={md.proDaySpokes}/><div style={{fontFamily:mono,fontSize:9,color:compColors[ci],whiteSpace:"nowrap",marginTop:-4}}>{shortName(p.name)}</div></div>;}const posTraits=POSITION_TRAITS[p.gpos||p.pos]||POSITION_TRAITS[p.pos]||[];return<div key={p.id} style={{position:"relative",display:"flex",flexDirection:"column",alignItems:"center"}}>
            <RadarChart traits={posTraits} values={posTraits.map(t=>tv(traits,p.id,t,p.name,p.school))} color={compColors[ci]} size={160}/>
            <div style={{fontFamily:mono,fontSize:9,color:compColors[ci],whiteSpace:"nowrap",marginTop:-4}}>{shortName(p.name)}</div>
          </div>;})}
        </div>
        <div style={{marginTop:12}}>
          {compareMeasMode?(()=>{const allAxes=[...new Set(compPlayers.flatMap(p=>{const md=getMeasRadarData(p.name,p.school);return md?md.labels:[];}))];const axisOrder=["40","VRT","BRD","3C","SHT","ATH","SPD","AGI","EXP"];allAxes.sort((a,b)=>axisOrder.indexOf(a)-axisOrder.indexOf(b));return allAxes.map(m=><div key={m} style={{display:"grid",gridTemplateColumns:`100px repeat(${compPlayers.length},1fr)`,gap:8,padding:"4px 0",borderBottom:"1px solid #f8f8f8",alignItems:"center"}}><span style={{fontFamily:mono,fontSize:10,color:"#a3a3a3"}}>{m}</span>{compPlayers.map((p,ci)=>{const md=getMeasRadarData(p.name,p.school);const idx=md?md.labels.indexOf(m):-1;const val=idx>=0?md.values[idx]:null;const vals=compPlayers.map(cp=>{const d=getMeasRadarData(cp.name,cp.school);const i=d?d.labels.indexOf(m):-1;return i>=0?d.values[i]:null;}).filter(v=>v!=null);const best=vals.length?Math.max(...vals):null;const worst=vals.length?Math.min(...vals):null;return<div key={p.id} style={{textAlign:"center"}}><span style={{fontFamily:font,fontSize:13,fontWeight:700,color:val==null?"#d4d4d4":compPlayers.length>1&&val===best&&best!==worst?compColors[ci]:compPlayers.length>1&&val===worst&&best!==worst?"#d4d4d4":"#525252"}}>{val!=null?val:"—"}</span></div>;})}</div>);})():samePos?(POSITION_TRAITS[compPlayers[0].pos]||[]).map(trait=><div key={trait} style={{display:"grid",gridTemplateColumns:`100px repeat(${compPlayers.length},1fr)`,gap:8,padding:"4px 0",borderBottom:"1px solid #f8f8f8",alignItems:"center"}}>
            <span style={{fontFamily:mono,fontSize:10,color:"#a3a3a3"}}>{trait}</span>
            {compPlayers.map((p,ci)=>{const val=tv(traits,p.id,trait,p.name,p.school);const best=Math.max(...compPlayers.map(cp=>tv(traits,cp.id,trait,cp.name,cp.school)));const worst=Math.min(...compPlayers.map(cp=>tv(traits,cp.id,trait,cp.name,cp.school)));return<div key={p.id} style={{textAlign:"center"}}>
              <span style={{fontFamily:font,fontSize:13,fontWeight:700,color:compPlayers.length>1&&val===best&&best!==worst?compColors[ci]:compPlayers.length>1&&val===worst&&best!==worst?"#d4d4d4":"#525252"}}>{val}</span>
            </div>;})}
          </div>):<div style={{fontFamily:sans,fontSize:11,color:"#a3a3a3",textAlign:"center",fontStyle:"italic"}}>trait-by-trait comparison available for same-position players</div>}
        </div>
      </>}
    </div>}<div ref={listRef} style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,overflow:"hidden"}}>{display.map((p,i)=>{const grade=getGrade(p.id);const c=POS_COLORS[p.gpos||p.pos]||POS_COLORS[p.pos];const cIdx=compareList.indexOf(p.id);const isC=cIdx>=0;return<div key={p.id} draggable={canDrag&&!isGuest} onDragStart={e=>handleDragStart(e,i)} onDragOver={e=>handleDragOver(e,i)} onDrop={e=>handleDrop(e,i)} onDragEnd={handleDragEnd} onTouchStart={e=>handleTouchStart(e,i)} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 16px",borderBottom:i<display.length-1?(overIdx===i&&dragIdx!==null?`2px solid ${c}`:"1px solid #f5f5f5"):"none",cursor:canDrag?"grab":"pointer",background:dragIdx===i?"#f0f0f0":isC?`${compColors[cIdx]}08`:"transparent",opacity:dragIdx===i?0.5:1,userSelect:canDrag?"none":"auto"}} onMouseEnter={e=>{if(!isC&&dragIdx===null)e.currentTarget.style.background=`${c}06`;}} onMouseLeave={e=>{if(!isC&&dragIdx===null)e.currentTarget.style.background="transparent";}} onClick={()=>{if(showCompareTip)dismissCompareTip();if(isC)setCompareList(prev=>prev.filter(id=>id!==p.id));else if(compareList.length<4)setCompareList(prev=>[...prev,p.id]);}} onDoubleClick={()=>setProfilePlayer(p)}>{canDrag&&!isGuest&&<span style={{fontFamily:mono,fontSize:9,color:"#d4d4d4",cursor:"grab",padding:"0 2px",flexShrink:0}}>⠿</span>}{isC&&<div style={{width:6,height:6,borderRadius:99,background:compColors[cIdx],flexShrink:0}}/>}<div style={{width:84,flexShrink:0,display:"flex",alignItems:"center",gap:8}}><span style={{fontFamily:mono,fontSize:12,color:"#d4d4d4",width:24,textAlign:"right",flexShrink:0}}>{i+1}</span><span style={{fontFamily:mono,fontSize:10,fontWeight:500,color:c,background:`${c}0d`,padding:"2px 8px",borderRadius:4}}>{p.gpos||p.pos}</span></div><SchoolLogo school={p.school} size={24}/><div style={{flex:1,minWidth:0,marginLeft:10,display:"flex",alignItems:"center",gap:4,overflow:"hidden"}}><span style={{fontFamily:sans,fontSize:13,fontWeight:700,color:"#171717",cursor:"pointer",whiteSpace:"nowrap"}} onClick={e=>{e.stopPropagation();setProfilePlayer(p);}} onMouseEnter={e=>e.currentTarget.style.textDecoration="underline"} onMouseLeave={e=>e.currentTarget.style.textDecoration="none"}>{p.name}</span><span style={{fontFamily:mono,fontSize:10,color:"#a3a3a3",whiteSpace:"nowrap"}}>{p.school}</span>{(traitFilter.size>0?(prospectBadges[p.id]||[]).filter(b=>traitFilter.has(b.trait)):(prospectBadges[p.id]||[])).map(b=><span key={b.trait} title={b.trait+" "+b.score} className={traitFilter.size>0?"":"board-badge"} style={{fontFamily:mono,fontSize:7,fontWeight:700,color:c,background:c+"0d",padding:"2px 4px",borderRadius:3,flexShrink:0}}>{b.emoji}</span>)}</div>{(()=>{const pk=(p.gpos||p.pos)==="K"||(p.gpos||p.pos)==="P"||(p.gpos||p.pos)==="LS"?"K/P":(p.gpos||p.pos);const pt=POSITION_TRAITS[pk]||[];return pt.length>=3?<MiniRadar values={pt.map(t=>tv(traits,p.id,t,p.name,p.school))} color={c} size={28}/>:null;})()}<span style={{fontFamily:font,fontSize:14,fontWeight:900,color:grade>=75?"#16a34a":grade>=55?"#ca8a04":"#dc2626",width:24,textAlign:"right",flexShrink:0}}>{grade}</span></div>;})}</div>{activeSingleRanked&&<div style={{display:"flex",gap:10,marginTop:12,justifyContent:"center"}}><button onClick={()=>{if(window.confirm(`Reset ${activeSingleRanked} rankings? This will clear all pair comparisons and traits for this position.`)){const posIds=new Set((byPos[activeSingleRanked]||[]).map(p=>p.id));setRatings(prev=>{const n={...prev};posIds.forEach(id=>delete n[id]);return n;});setTraits(prev=>{const n={...prev};posIds.forEach(id=>delete n[id]);return n;});setCompCount(prev=>{const n={...prev};posIds.forEach(id=>delete n[id]);return n;});setRankedGroups(prev=>{const n=new Set(prev);n.delete(activeSingleRanked);return n;});setTraitReviewedGroups(prev=>{const n=new Set(prev);n.delete(activeSingleRanked);return n;});setPartialProgress(prev=>{const n={...prev};delete n[activeSingleRanked];return n;});setFilterPos(new Set());}}} style={{fontFamily:sans,fontSize:11,padding:"7px 14px",background:"transparent",color:"#dc2626",border:"1px solid #fecaca",borderRadius:99,cursor:"pointer"}}>reset {activeSingleRanked}</button></div>}<p style={{fontFamily:sans,fontSize:11,color:"#a3a3a3",textAlign:"center",marginTop:16}}>click name for profile · click row to compare (up to 4) · double-click for profile{canDrag?<><span className="reorder-hint-desktop"> · drag to reorder</span><span className="reorder-hint-mobile" style={{display:"none"}}> · hold to reorder</span></>:null}</p><style>{`@media(max-width:600px){.board-badge{display:none!important;}.mini-radar{display:none!important;}.reorder-hint-desktop{display:none!important;}.reorder-hint-mobile{display:inline!important;}}`}</style></div></div>);
});

// ============================================================
// Content Ideas — Tweet Engine Generators
// ============================================================
const TWEET_CATEGORIES=[
  {key:'combine_outlier',label:'Combine Outlier',color:'#14b8a6',tier:1,weight:18},
  {key:'size_athleticism',label:'Size/Athleticism',color:'#8b5cf6',tier:1,weight:14},
  {key:'class_depth',label:'Class Depth',color:'#3b82f6',tier:1,weight:14},
  {key:'draft_value_gap',label:'Draft Value Gap',color:'#f59e0b',tier:1,weight:12},
  {key:'conference',label:'Conference',color:'#22c55e',tier:1,weight:10},
  {key:'historical',label:'Historical',color:'#dc2626',tier:1,weight:10},
  {key:'radar_spotlight',label:'Radar Spotlight',color:'#a855f7',tier:2,weight:9},
  {key:'ceiling_tags',label:'Ceiling Tags',color:'#ec4899',tier:2,weight:8},
  {key:'team_mock',label:'Team/Mock',color:'#64748b',tier:2,weight:5},
  {key:'college_stats',label:'College Stats',color:'#f97316',tier:1,weight:14},
];
function _pick(arr){return arr[Math.floor(Math.random()*arr.length)];}
function _shuffle(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function _spice(tier,isRare,isTop50){return Math.min(5,2+(tier===1?1:0)+(isRare?1:0)+(isTop50?1:0));}
function _fmt(p){return`${p.name} (${p.gpos||p.pos}, ${p.school})`;}
function _tag(text){return text.length<=240?text:text.slice(0,237)+'...';}
function _posPlayers(pos){return PROSPECTS.filter(p=>(p.gpos||p.pos)===pos);}
function _withCombine(players){return players.map(p=>({...p,cs:getCombineScores(p.name,p.school),cd:getCombineData(p.name,p.school)})).filter(x=>x.cs);}

function genCombineOutlier(){
  const positions=_shuffle(["QB","RB","WR","TE","OT","IOL","EDGE","DL","LB","CB","S"]);
  const sub=Math.floor(Math.random()*5);
  for(const pos of positions){
    const guys=_withCombine(_posPlayers(pos));
    if(!guys.length)continue;
    if(sub===0){
      const sorted=[...guys].filter(g=>g.cs.athleticScore!=null).sort((a,b)=>b.cs.athleticScore-a.cs.athleticScore);
      if(sorted.length<2)continue;
      const p=sorted[0];const score=Math.round(p.cs.athleticScore);const rank=getConsensusRank(p.name);
      return{category:'combine_outlier',spice:_spice(1,score>=95,rank<=50),
        tweet:_tag(`${score} Athletic Score — ${_fmt(p)} leads all ${pos}s at the combine. Elite explosion + agility.\n\n📊 bigboardlab.com`),
        image:`Combine Explorer → ${pos} → Athletic Score`,hook:`Best pure athlete at ${pos}`,player:p.name};
    }
    if(sub===1){
      const drills=[["forty","40-yard dash","40"],["vertical","Vertical","VRT"],["broad","Broad jump","BRD"],["cone","3-cone","3C"],["shuttle","Shuttle","SHT"]];
      const[key,label,abbr]=_pick(drills);
      const sorted=[...guys].filter(g=>g.cs.percentiles?.[key]!=null).sort((a,b)=>(b.cs.percentiles[key]||0)-(a.cs.percentiles[key]||0));
      if(sorted.length<2)continue;
      const p=sorted[0];const pct=Math.round(p.cs.percentiles[key]);
      if(pct<85)continue;
      const rank=getConsensusRank(p.name);
      return{category:'combine_outlier',spice:_spice(1,pct>=97,rank<=50),
        tweet:_tag(`${pct}th percentile ${label} — ${_fmt(p)} posted the best ${abbr} among all ${pos}s at the combine.\n\n📊 bigboardlab.com`),
        image:`Combine Explorer → ${pos} → ${abbr}`,hook:`${label} leader at ${pos}`,player:p.name};
    }
    if(sub===2){
      const multi=guys.filter(g=>{
        let ct=0;
        if((g.cs.athleticScore||0)>=90)ct++;if((g.cs.speedScore||0)>=90)ct++;
        if((g.cs.agilityScore||0)>=90)ct++;if((g.cs.explosionScore||0)>=90)ct++;
        return ct>=2;
      });
      if(!multi.length)continue;
      const p=_pick(multi);
      const scores=[];
      if((p.cs.athleticScore||0)>=90)scores.push(`${Math.round(p.cs.athleticScore)} ATH`);
      if((p.cs.speedScore||0)>=90)scores.push(`${Math.round(p.cs.speedScore)} SPD`);
      if((p.cs.agilityScore||0)>=90)scores.push(`${Math.round(p.cs.agilityScore)} AGI`);
      if((p.cs.explosionScore||0)>=90)scores.push(`${Math.round(p.cs.explosionScore)} EXP`);
      const rank=getConsensusRank(p.name);
      return{category:'combine_outlier',spice:_spice(1,scores.length>=3,rank<=50),
        tweet:_tag(`Multi-elite combine: ${_fmt(p)} — ${scores.join(', ')}. That's ${scores.length} composite scores ≥90.\n\n📊 bigboardlab.com`),
        image:`Combine Explorer → ${pos} → Athletic Score`,hook:`${scores.length}-category elite`,player:p.name};
    }
    if(sub===3){
      const drills=["forty","vertical","broad","cone","shuttle"];
      for(const d of _shuffle(drills)){
        const elite=guys.filter(g=>(g.cs.percentiles?.[d]||0)>=99);
        if(!elite.length)continue;
        const p=_pick(elite);const rank=getConsensusRank(p.name);
        const label={"forty":"40-yard dash","vertical":"Vertical","broad":"Broad jump","cone":"3-cone","shuttle":"Shuttle"}[d];
        return{category:'combine_outlier',spice:_spice(1,true,rank<=50),
          tweet:_tag(`99th percentile ${label} — ${_fmt(p)} is in the 1% club among ${pos}s.\n\n📊 bigboardlab.com`),
          image:`Combine Explorer → ${pos} → ${{"forty":"40","vertical":"VRT","broad":"BRD","cone":"3C","shuttle":"SHT"}[d]}`,hook:`Top 1% drill performance`,player:p.name};
      }
    }
    if(sub===4){
      const metric=_pick(["speedScore","explosionScore"]);
      const label=metric==="speedScore"?"Speed Score":"Explosion Score";
      const sorted=[...guys].filter(g=>g.cs[metric]!=null).sort((a,b)=>(b.cs[metric]||0)-(a.cs[metric]||0));
      if(sorted.length<3)continue;
      const p=sorted[0];const val=Math.round(p.cs[metric]);const rank=getConsensusRank(p.name);
      return{category:'combine_outlier',spice:_spice(1,val>=95,rank<=50),
        tweet:_tag(`${val} ${label} — ${_fmt(p)} is the ${metric==="speedScore"?"fastest":"most explosive"} ${pos} in this class.\n\n📊 bigboardlab.com`),
        image:`Combine Explorer → ${pos} → ${metric==="speedScore"?"SPD":"EXP"}`,hook:`Position ${label} leader`,player:p.name};
    }
  }
  return null;
}

function genSizeAthleticismMismatch(){
  const sub=Math.floor(Math.random()*5);
  const allWithData=PROSPECTS.map(p=>({...p,cd:getCombineData(p.name,p.school),cs:getCombineScores(p.name,p.school)})).filter(x=>x.cd);
  if(sub===0){
    const heavy=allWithData.filter(g=>g.cd.weight&&g.cd.weight>=250&&g.cs?.speedScore).sort((a,b)=>(b.cs.speedScore||0)-(a.cs.speedScore||0));
    if(heavy.length){const p=heavy[0];const rank=getConsensusRank(p.name);
      return{category:'size_athleticism',spice:_spice(1,p.cs.speedScore>=85,rank<=50),
        tweet:_tag(`${p.cd.weight} lbs with a ${Math.round(p.cs.speedScore)} Speed Score — ${_fmt(p)} is the fastest 250+ lb prospect in the class.\n\n📊 bigboardlab.com`),
        image:`Combine Explorer → ${p.gpos||p.pos} → SPD`,hook:`Heavy + fast mismatch`,player:p.name};}
  }
  if(sub===1){
    const positions=["CB","S","WR","RB"];
    for(const pos of _shuffle(positions)){
      const guys=allWithData.filter(g=>(g.gpos||g.pos)===pos&&g.cd.height&&g.cd.arms);
      if(guys.length<5)continue;
      const avgHt=guys.reduce((s,g)=>s+g.cd.height,0)/guys.length;
      const short=guys.filter(g=>g.cd.height<avgHt-1).sort((a,b)=>(b.cd.arms||0)-(a.cd.arms||0));
      if(!short.length)continue;
      const p=short[0];const rank=getConsensusRank(p.name);
      return{category:'size_athleticism',spice:_spice(1,false,rank<=50),
        tweet:_tag(`${formatHeight(p.cd.height)} but ${p.cd.arms}" arms — ${_fmt(p)} is undersized but has elite length for a ${pos}.\n\n📊 bigboardlab.com`),
        image:`Combine Explorer → ${pos} → ARM`,hook:`Short + long arms`,player:p.name};
    }
  }
  if(sub===2){
    const light=allWithData.filter(g=>g.cd.weight&&g.cd.weight<=200&&g.cs?.explosionScore).sort((a,b)=>(b.cs.explosionScore||0)-(a.cs.explosionScore||0));
    if(light.length){const p=light[0];const rank=getConsensusRank(p.name);
      return{category:'size_athleticism',spice:_spice(1,p.cs.explosionScore>=90,rank<=50),
        tweet:_tag(`Only ${p.cd.weight} lbs but a ${Math.round(p.cs.explosionScore)} Explosion Score — ${_fmt(p)} packs a punch.\n\n📊 bigboardlab.com`),
        image:`Combine Explorer → ${p.gpos||p.pos} → EXP`,hook:`Light + explosive`,player:p.name};}
  }
  if(sub===3){
    const tall=allWithData.filter(g=>g.cd.height&&g.cd.height>=76&&g.cs?.agilityScore).sort((a,b)=>(b.cs.agilityScore||0)-(a.cs.agilityScore||0));
    if(tall.length){const p=tall[0];const rank=getConsensusRank(p.name);
      return{category:'size_athleticism',spice:_spice(1,p.cs.agilityScore>=85,rank<=50),
        tweet:_tag(`${formatHeight(p.cd.height)} with a ${Math.round(p.cs.agilityScore)} Agility Score — ${_fmt(p)} moves like a much smaller player.\n\n📊 bigboardlab.com`),
        image:`Combine Explorer → ${p.gpos||p.pos} → AGI`,hook:`Tall + agile mismatch`,player:p.name};}
  }
  if(sub===4){
    const positions=["QB","WR","TE","RB"];
    for(const pos of _shuffle(positions)){
      const guys=allWithData.filter(g=>(g.gpos||g.pos)===pos&&g.cd.hands).sort((a,b)=>(b.cd.hands||0)-(a.cd.hands||0));
      if(guys.length<3)continue;
      const p=guys[0];const rank=getConsensusRank(p.name);
      return{category:'size_athleticism',spice:_spice(1,false,rank<=50),
        tweet:_tag(`${p.cd.hands}" hands — ${_fmt(p)} has the biggest mitts among ${pos}s in this class.\n\n📊 bigboardlab.com`),
        image:`Combine Explorer → ${pos} → HND`,hook:`Biggest hands at ${pos}`,player:p.name};
    }
  }
  return null;
}

function genClassDepth(){
  const sub=Math.floor(Math.random()*4);
  const allRanked=PROSPECTS.map(p=>({...p,rank:getConsensusRank(p.name)}));
  if(sub===0){
    const top100=allRanked.filter(p=>p.rank<=100);
    const counts={};top100.forEach(p=>{const pos=p.gpos||p.pos;counts[pos]=(counts[pos]||0)+1;});
    const sorted=Object.entries(counts).sort((a,b)=>b[1]-a[1]);
    if(sorted.length){const[pos,ct]=sorted[0];
      return{category:'class_depth',spice:_spice(1,ct>=15,true),
        tweet:_tag(`${ct} ${pos}s in the top 100 — this is the deepest position in the 2026 draft class. Expect Day 2 steals.\n\n📊 bigboardlab.com`),
        image:`Rankings → filter by ${pos}`,hook:`Deepest position group`,player:null};}
  }
  if(sub===1){
    const top32=allRanked.filter(p=>p.rank<=32);
    const counts={};top32.forEach(p=>{const pos=p.gpos||p.pos;counts[pos]=(counts[pos]||0)+1;});
    const all=["QB","RB","WR","TE","OT","IOL","EDGE","DL","LB","CB","S"];
    const scarce=all.map(pos=>[pos,counts[pos]||0]).sort((a,b)=>a[1]-b[1]);
    if(scarce.length){const[pos,ct]=scarce[0];
      return{category:'class_depth',spice:_spice(1,ct<=1,true),
        tweet:_tag(`Only ${ct} ${pos}${ct!==1?'s':''} projected in Round 1 — ${pos} is the scarcest position at the top of this draft.\n\n📊 bigboardlab.com`),
        image:`Rankings → top 32`,hook:`Position scarcity in Rd 1`,player:null};}
  }
  if(sub===2){
    const top20=allRanked.filter(p=>p.rank<=20);
    const confCounts={};top20.forEach(p=>{const conf=SCHOOL_CONFERENCE[p.school];if(conf&&conf!=="Ind")confCounts[conf]=(confCounts[conf]||0)+1;});
    const sorted=Object.entries(confCounts).sort((a,b)=>b[1]-a[1]);
    if(sorted.length){const[conf,ct]=sorted[0];
      return{category:'class_depth',spice:_spice(1,ct>=8,true),
        tweet:_tag(`${ct} of the top 20 prospects are from the ${conf} — conference dominance at the top of the 2026 draft.\n\n📊 bigboardlab.com`),
        image:`Rankings → top 20`,hook:`Conference controls the top`,player:null};}
  }
  if(sub===3){
    const positions=["QB","RB","WR","TE","OT","IOL","EDGE","DL","LB","CB","S"];
    const combCounts={};
    positions.forEach(pos=>{combCounts[pos]=_withCombine(_posPlayers(pos)).length;});
    const sorted=Object.entries(combCounts).sort((a,b)=>b[1]-a[1]);
    if(sorted.length&&sorted[0][1]>0){const[pos,ct]=sorted[0];
      return{category:'class_depth',spice:_spice(1,ct>=30,false),
        tweet:_tag(`${ct} ${pos}s tested at the combine — more than any other position. Evaluators have plenty of data to work with.\n\n📊 bigboardlab.com`),
        image:`Combine Explorer → ${pos}`,hook:`Most combine data at ${pos}`,player:null};}
  }
  return null;
}

function genDraftValueGap(){
  const sub=Math.floor(Math.random()*3);
  if(sub===0){
    const guys=PROSPECTS.map(p=>({...p,cs:getCombineScores(p.name,p.school),rank:getConsensusRank(p.name)})).filter(g=>g.cs?.athleticScore>=90&&g.rank>=150);
    if(guys.length){const p=_pick(guys.slice(0,5));
      return{category:'draft_value_gap',spice:_spice(1,true,false),
        tweet:_tag(`${Math.round(p.cs.athleticScore)} Athletic Score but ranked #${p.rank} — ${_fmt(p)} is one of the biggest combine vs. draft position gaps in this class.\n\n📊 bigboardlab.com`),
        image:`Combine Explorer → ${p.gpos||p.pos} → ATH`,hook:`Elite athlete, late-round projection`,player:p.name};}
  }
  if(sub===1){
    const guys=PROSPECTS.map(p=>({...p,cs:getCombineScores(p.name,p.school),rank:getConsensusRank(p.name)})).filter(g=>g.rank<=50&&g.cs&&g.cs.athleticScore!=null&&g.cs.athleticScore<40);
    if(guys.length){const p=_pick(guys);
      return{category:'draft_value_gap',spice:_spice(1,false,true),
        tweet:_tag(`Ranked #${p.rank} overall but only a ${Math.round(p.cs.athleticScore)} Athletic Score — ${_fmt(p)} is a film-over-measurables prospect.\n\n📊 bigboardlab.com`),
        image:`Combine Explorer → ${p.gpos||p.pos} → ATH`,hook:`High rank, low athleticism`,player:p.name};}
  }
  if(sub===2){
    const positions=_shuffle(["QB","RB","WR","TE","OT","IOL","EDGE","DL","LB","CB","S"]);
    for(const pos of positions){
      const guys=_withCombine(_posPlayers(pos)).map(g=>({...g,rank:getConsensusRank(g.name)}));
      if(guys.length<5)continue;
      const rankedByAthletic=[...guys].sort((a,b)=>(b.cs.athleticScore||0)-(a.cs.athleticScore||0));
      const athRank={};rankedByAthletic.forEach((g,i)=>{athRank[g.id]=i+1;});
      const rankedByConsensus=[...guys].sort((a,b)=>a.rank-b.rank);
      const consRank={};rankedByConsensus.forEach((g,i)=>{consRank[g.id]=i+1;});
      let best=null,bestGap=0;
      guys.forEach(g=>{const gap=Math.abs((consRank[g.id]||0)-(athRank[g.id]||0));if(gap>bestGap){bestGap=gap;best=g;}});
      if(best&&bestGap>=8){
        const athPos=athRank[best.id];const consPos=consRank[best.id];
        const direction=athPos<consPos?"better athlete than his draft stock suggests":"drafted higher than his combine numbers";
        return{category:'draft_value_gap',spice:_spice(1,bestGap>=15,best.rank<=50),
          tweet:_tag(`#${athPos} in combine scores but #${consPos} in consensus rank among ${pos}s — ${_fmt(best)} is ${direction}.\n\n📊 bigboardlab.com`),
          image:`Combine Explorer → ${pos} → ATH`,hook:`Biggest combine-rank mismatch at ${pos}`,player:best.name};}
    }
  }
  return null;
}

function genConferenceBreakdown(){
  const sub=Math.floor(Math.random()*3);
  const allRanked=PROSPECTS.map(p=>({...p,rank:getConsensusRank(p.name)}));
  if(sub===0){
    const positions=_shuffle(["QB","RB","WR","TE","OT","IOL","EDGE","DL","LB","CB","S"]);
    for(const pos of positions){
      const guys=allRanked.filter(p=>(p.gpos||p.pos)===pos).sort((a,b)=>a.rank-b.rank).slice(0,10);
      const confCounts={};guys.forEach(g=>{const conf=SCHOOL_CONFERENCE[g.school];if(conf&&conf!=="Ind")confCounts[conf]=(confCounts[conf]||0)+1;});
      const sorted=Object.entries(confCounts).sort((a,b)=>b[1]-a[1]);
      if(sorted.length&&sorted[0][1]>=5){const[conf,ct]=sorted[0];
        return{category:'conference',spice:_spice(1,ct>=7,true),
          tweet:_tag(`${ct} of the top 10 ${pos}s come from the ${conf} — total conference dominance at the position.\n\n📊 bigboardlab.com`),
          image:`Rankings → filter by ${pos}`,hook:`${conf} owns ${pos}`,player:null};}
    }
  }
  if(sub===1){
    const p5=new Set(["SEC","Big Ten","Big 12","ACC"]);
    const nonP5=allRanked.filter(p=>p.rank<=100&&!p5.has(SCHOOL_CONFERENCE[p.school]||""));
    if(nonP5.length){const p=_pick(nonP5);const conf=SCHOOL_CONFERENCE[p.school]||"non-P4";
      return{category:'conference',spice:_spice(1,p.rank<=50,p.rank<=50),
        tweet:_tag(`${_fmt(p)} — ranked #${p.rank} from the ${conf}. One of ${nonP5.length} non-Power 4 prospects in the top 100.\n\n📊 bigboardlab.com`),
        image:`Player Profile → ${p.name}`,hook:`Small-school standout`,player:p.name};}
  }
  if(sub===2){
    const top32=allRanked.filter(p=>p.rank<=32);
    const confCounts={};top32.forEach(p=>{const conf=SCHOOL_CONFERENCE[p.school];if(conf&&conf!=="Ind")confCounts[conf]=(confCounts[conf]||0)+1;});
    const sorted=Object.entries(confCounts).sort((a,b)=>b[1]-a[1]);
    if(sorted.length>=2){const[conf1,ct1]=sorted[0];const[conf2,ct2]=sorted[1];
      return{category:'conference',spice:_spice(1,ct1>=12,true),
        tweet:_tag(`${conf1}: ${ct1} first-rounders. ${conf2}: ${ct2}. The gap between conferences is ${ct1>=ct2*2?"massive":"real"} in this class.\n\n📊 bigboardlab.com`),
        image:`Rankings → top 32`,hook:`Conference Rd 1 breakdown`,player:null};}
  }
  return null;
}

function genHistoricalComparison(historicalData){
  if(!historicalData||!Object.keys(historicalData).length)return null;
  const sub=Math.floor(Math.random()*2);
  const positions=_shuffle(Object.keys(historicalData));
  for(const pos of positions){
    const pool=historicalData[pos];
    if(!pool||pool.length<20)continue;
    const currentGuys=_withCombine(_posPlayers(pos));
    if(!currentGuys.length)continue;
    if(sub===0){
      for(const p of _shuffle(currentGuys).slice(0,10)){
        const ath=p.cs.athleticScore;
        if(ath==null||ath<85)continue;
        const better=pool.filter(h=>h.ath>=ath).length;
        const pct=((better/pool.length)*100).toFixed(1);
        if(parseFloat(pct)>5)continue;
        const years=DRAFT_YEAR-(pool[0]?.y||2000);
        const rank=getConsensusRank(p.name);
        return{category:'historical',spice:_spice(1,parseFloat(pct)<2,rank<=50),
          tweet:_tag(`Only ${better} ${pos}s in ${years} years of combine data posted an Athletic Score ≥${Math.round(ath)}. ${_fmt(p)} is one of them.\n\n📊 bigboardlab.com`),
          image:`Combine Explorer → ${pos} → ATH`,hook:`Historic athletic rarity`,player:p.name};
      }
    }
    if(sub===1){
      for(const p of _shuffle(currentGuys).slice(0,10)){
        const spd=p.cs.speedScore;const agi=p.cs.agilityScore;
        if(spd==null||agi==null||spd<80||agi<80)continue;
        const matching=pool.filter(h=>h.spd>=spd&&h.agi>=agi).length;
        if(matching>10||matching===0)continue;
        const years=DRAFT_YEAR-(pool[0]?.y||2000);
        const rank=getConsensusRank(p.name);
        return{category:'historical',spice:_spice(1,matching<=3,rank<=50),
          tweet:_tag(`Only ${matching} ${pos}s in ${years} years matched ${Math.round(spd)}+ Speed Score AND ${Math.round(agi)}+ Agility Score. ${p.name} just did it.\n\n📊 bigboardlab.com`),
          image:`Combine Explorer → ${pos} → SPD`,hook:`Speed+agility rarity`,player:p.name};
      }
    }
  }
  return null;
}

function genRadarSpotlight(){
  const sub=Math.floor(Math.random()*3);
  const positions=_shuffle(["QB","RB","WR","TE","OT","IOL","EDGE","DL","LB","CB","S"]);
  for(const pos of positions){
    const guys=_posPlayers(pos);
    if(guys.length<5)continue;
    const posTraits=POSITION_TRAITS[pos]||[];
    if(posTraits.length<4)continue;
    const scored=guys.map(p=>{
      const vals=posTraits.map(t=>tv({},p.id,t,p.name,p.school));
      const avg=vals.reduce((s,v)=>s+v,0)/vals.length;
      const spread=Math.max(...vals)-Math.min(...vals);
      const maxTrait=posTraits[vals.indexOf(Math.max(...vals))];
      return{...p,vals,avg,spread,maxTrait,maxVal:Math.max(...vals)};
    });
    if(sub===0){
      const balanced=[...scored].filter(s=>s.avg>=65).sort((a,b)=>a.spread-b.spread);
      if(!balanced.length)continue;
      const p=balanced[0];const rank=getConsensusRank(p.name);
      return{category:'radar_spotlight',spice:_spice(2,false,rank<=50),
        tweet:_tag(`Per scouting profiles, ${_fmt(p)} has one of the most balanced trait radars at ${pos} — no holes, all scores within ${Math.round(p.spread)} pts.\n\n📊 bigboardlab.com`),
        image:`Player Profile → ${p.name} → Radar`,hook:`Balanced radar — no weaknesses`,player:p.name};
    }
    if(sub===1){
      const spiky=[...scored].sort((a,b)=>b.spread-a.spread);
      if(!spiky.length||spiky[0].spread<20)continue;
      const p=spiky[0];const rank=getConsensusRank(p.name);
      return{category:'radar_spotlight',spice:_spice(2,p.maxVal>=90,rank<=50),
        tweet:_tag(`Per scouting profiles, ${_fmt(p)} has a massive ${p.maxTrait} spike (${Math.round(p.maxVal)}) with a ${Math.round(p.spread)}-pt gap to his floor. Specialist shape.\n\n📊 bigboardlab.com`),
        image:`Player Profile → ${p.name} → Radar`,hook:`Specialist radar shape`,player:p.name};
    }
    if(sub===2){
      if(scored.length<6)continue;
      let bestPair=null,bestDist=Infinity;
      for(let i=0;i<Math.min(scored.length,20);i++){
        for(let j=i+1;j<Math.min(scored.length,20);j++){
          const dist=scored[i].vals.reduce((s,v,k)=>s+Math.abs(v-scored[j].vals[k]),0);
          if(dist<bestDist){bestDist=dist;bestPair=[scored[i],scored[j]];}
        }
      }
      if(bestPair&&bestDist<40){
        const[a,b]=bestPair;
        return{category:'radar_spotlight',spice:_spice(2,false,getConsensusRank(a.name)<=50||getConsensusRank(b.name)<=50),
          tweet:_tag(`Per scouting profiles, ${a.name} and ${b.name} have nearly identical ${pos} radar shapes — avg trait diff of just ${Math.round(bestDist/posTraits.length)} pts.\n\n📊 bigboardlab.com`),
          image:`Compare → ${a.name} vs ${b.name}`,hook:`Twin radar profiles`,player:a.name};
      }
    }
  }
  return null;
}

function genCeilingTags(){
  const sub=Math.floor(Math.random()*3);
  if(sub===0){
    const positions=["QB","RB","WR","TE","OT","IOL","EDGE","DL","LB","CB","S"];
    const ceilCounts={};
    positions.forEach(pos=>{
      ceilCounts[pos]=_posPlayers(pos).filter(p=>{const sc=getScoutingTraits(p.name,p.school);return sc?.__ceiling==="elite";}).length;
    });
    const sorted=Object.entries(ceilCounts).filter(([,c])=>c>0).sort((a,b)=>b[1]-a[1]);
    if(sorted.length){const[pos,ct]=sorted[0];
      return{category:'ceiling_tags',spice:_spice(2,ct>=5,true),
        tweet:_tag(`${ct} ${pos}s carry an elite ceiling tag per scouting profiles — more than any other position in this class.\n\n📊 bigboardlab.com`),
        image:`Rankings → filter by ${pos} → sort by ceiling`,hook:`Elite ceiling concentration`,player:null};}
  }
  if(sub===1){
    const guys=PROSPECTS.map(p=>({...p,sc:getScoutingTraits(p.name,p.school),cs:getCombineScores(p.name,p.school)})).filter(g=>g.sc?.__ceiling==="elite"&&g.cs?.athleticScore>=85);
    if(guys.length){const p=_pick(guys);const rank=getConsensusRank(p.name);
      return{category:'ceiling_tags',spice:_spice(2,true,rank<=50),
        tweet:_tag(`Elite ceiling + ${Math.round(p.cs.athleticScore)} Athletic Score — ${_fmt(p)} has both the projection and the measurables.\n\n📊 bigboardlab.com`),
        image:`Player Profile → ${p.name}`,hook:`Ceiling meets athleticism`,player:p.name};}
  }
  if(sub===2){
    const guys=PROSPECTS.map(p=>({...p,sc:getScoutingTraits(p.name,p.school),rank:getConsensusRank(p.name)})).filter(g=>g.rank<=50&&(g.sc?.__ceiling==="capped"||g.sc?.__ceiling==="limited"));
    if(guys.length){const p=_pick(guys);
      return{category:'ceiling_tags',spice:_spice(2,false,true),
        tweet:_tag(`${_fmt(p)} is ranked #${p.rank} but carries a "${p.sc.__ceiling}" ceiling tag per scouting profiles. Safe floor, lower upside.\n\n📊 bigboardlab.com`),
        image:`Player Profile → ${p.name}`,hook:`Top-50 with capped ceiling`,player:p.name};}
  }
  return null;
}

function genTeamMockAlignment(){
  if(!TEAM_NEEDS_COUNTS||!Object.keys(TEAM_NEEDS_COUNTS).length)return null;
  const sub=Math.floor(Math.random()*2);
  if(sub===0){
    const top10=DRAFT_ORDER_R1.slice(0,10);
    const allRanked=PROSPECTS.map(p=>({...p,rank:getConsensusRank(p.name)})).sort((a,b)=>a.rank-b.rank);
    for(const pick of _shuffle(top10)){
      const needs=TEAM_NEEDS_COUNTS[pick.team];
      if(!needs)continue;
      const topNeed=Object.entries(needs).sort((a,b)=>b[1]-a[1])[0];
      if(!topNeed)continue;
      const needPos=topNeed[0];
      const posMap={QB:["QB"],WR:["WR"],RB:["RB"],TE:["TE"],OL:["OT","IOL"],DL:["DL","EDGE"],DB:["CB","S"],LB:["LB"]};
      const matchPositions=posMap[needPos]||[needPos];
      const bestAtNeed=allRanked.filter(p=>matchPositions.includes(p.gpos||p.pos))[0];
      if(bestAtNeed){
        return{category:'team_mock',spice:_spice(2,false,bestAtNeed.rank<=50),
          tweet:_tag(`The ${pick.team} pick #${pick.pick} — biggest need: ${needPos}. Best available: ${_fmt(bestAtNeed)} (ranked #${bestAtNeed.rank}).\n\n📊 bigboardlab.com`),
          image:`Mock Draft Sim → ${pick.team}`,hook:`Need vs. BPA at pick ${pick.pick}`,player:bestAtNeed.name};
      }
    }
  }
  if(sub===1){
    const needTotals={};
    Object.values(TEAM_NEEDS_COUNTS).forEach(needs=>{
      Object.entries(needs).forEach(([pos,ct])=>{needTotals[pos]=(needTotals[pos]||0)+ct;});
    });
    const sorted=Object.entries(needTotals).sort((a,b)=>b[1]-a[1]);
    if(sorted.length){const[pos,ct]=sorted[0];
      const teamCount=Object.values(TEAM_NEEDS_COUNTS).filter(n=>n[pos]).length;
      return{category:'team_mock',spice:_spice(2,ct>=20,true),
        tweet:_tag(`${teamCount} NFL teams need ${pos} help — that's the most in-demand position group heading into the 2026 draft.\n\n📊 bigboardlab.com`),
        image:`Mock Draft Sim`,hook:`League-wide need`,player:null};}
  }
  return null;
}

function genCollegeStats(){
  const sub=Math.floor(Math.random()*5);
  const STAT_POSITIONS={QB:["passing_DOM","passing_PCT","passing_YPA","passing_TDINT"],RB:["rushing_DOM","rushing_YPC"],WR:["receiving_DOM","receiving_YPR"],TE:["receiving_DOM","receiving_YPR"],EDGE:["defensive_DOM"],DL:["defensive_DOM"],LB:["defensive_DOM"],CB:["defensive_DOM"],S:["defensive_DOM"]};
  const DOM_LABELS={passing_DOM:"passing dominator",rushing_DOM:"rushing dominator",receiving_DOM:"receiving dominator",defensive_DOM:"production share"};
  const DOM_CONTEXT={passing_DOM:"share of team passing production",rushing_DOM:"share of team rushing production",receiving_DOM:"share of team receiving production",defensive_DOM:"share of team defensive production"};

  // Variant 0: Individual dominator rarity
  if(sub===0){
    const positions=_shuffle(["QB","RB","WR","TE","EDGE","DL","LB","CB","S"]);
    for(const pos of positions){
      const guys=_posPlayers(pos);
      for(const p of _shuffle(guys).slice(0,10)){
        const stats=_statLookup(p.name,p.school);
        if(!stats)continue;
        const domKeys=(STAT_POSITIONS[pos]||[]).filter(k=>k.endsWith("_DOM"));
        for(const dk of domKeys){
          const val=stats[dk];
          if(val==null||val<20)continue;
          const pct=getStatPercentile(p.name,p.school,dk,pos);
          if(pct==null||pct<90)continue;
          const dist=HISTORICAL_STAT_DIST[pos]?.[dk];
          if(!dist||dist.length<50)continue;
          const above=dist.filter(v=>v>=val).length;
          const rank=getConsensusRank(p.name);
          const rarityStr=above===0?`No ${pos} in 10 years of college data has posted a ${DOM_LABELS[dk]||"dominator"} rating this high.`:`Only ${above} of ${dist.length} ${pos}s in the last 10 years hit that mark.`;
          return{category:'college_stats',spice:_spice(1,pct>=97,rank<=50),
            tweet:_tag(`${p.name} posted a ${val.toFixed(1)}% ${DOM_LABELS[dk]||"dominator"} rating — ${DOM_CONTEXT[dk]}. That's ${pct>=99?"99th":Math.round(pct)+"th"} percentile historically. ${rarityStr}\n\n📊 bigboardlab.com`),
            image:`Combine Explorer → college stats → ${pos} → Dominator`,hook:`Elite dominator rating`,player:p.name};
        }
      }
    }
  }

  // Variant 1: Breakout year highlight
  if(sub<=1){
    const positions=_shuffle(["WR","TE","RB","QB","EDGE","DL","LB","CB","S"]);
    for(const pos of positions){
      const guys=_posPlayers(pos);
      const withBreakout=guys.filter(p=>{const s=_statLookup(p.name,p.school);return s?.breakout_year==="Fr";});
      if(!withBreakout.length)continue;
      const p=_pick(withBreakout);
      const stats=_statLookup(p.name,p.school);
      const allWithData=guys.filter(g=>_statLookup(g.name,g.school)?.breakout_year);
      const frCount=guys.filter(g=>_statLookup(g.name,g.school)?.breakout_year==="Fr").length;
      const rank=getConsensusRank(p.name);
      const domKey=pos==="QB"?"passing_DOM":pos==="RB"?"rushing_DOM":["WR","TE"].includes(pos)?"receiving_DOM":"defensive_DOM";
      const domVal=stats?.[domKey];
      const domStr=domVal?` with a ${domVal.toFixed(1)}% ${DOM_LABELS[domKey]||"dominator"} rating`:"";
      return{category:'college_stats',spice:_spice(1,frCount<=2,rank<=50),
        tweet:_tag(`${p.name} broke out as a true freshman${domStr}. ${frCount===1?`The only ${pos} in this class to do it.`:`Only ${frCount} of ${allWithData.length} ${pos}s in this class broke out that early.`}\n\n📊 bigboardlab.com`),
        image:`Combine Explorer → college stats → Breakout Year`,hook:`Freshman breakout`,player:p.name};
    }
  }

  // Variant 2: Class-level breakout depth
  if(sub<=2){
    const positions=_shuffle(["WR","RB","EDGE","LB","CB","S","TE","DL","QB"]);
    for(const pos of positions){
      const guys=_posPlayers(pos);
      const withBreakout=guys.filter(p=>{const s=_statLookup(p.name,p.school);return s?.breakout_year==="Fr"||s?.breakout_year==="So";});
      const allWithData=guys.filter(g=>_statLookup(g.name,g.school)?.breakout_year);
      if(allWithData.length<5||withBreakout.length<3)continue;
      const pct=Math.round(withBreakout.length/allWithData.length*100);
      if(pct<40)continue;
      return{category:'college_stats',spice:_spice(1,pct>=70,true),
        tweet:_tag(`${withBreakout.length} of ${allWithData.length} ${pos}s in this draft class broke out by their sophomore year (${pct}%). Early production is the best predictor of NFL success at the position.\n\n📊 bigboardlab.com`),
        image:`Combine Explorer → college stats → Breakout Year`,hook:`Class breakout depth`,player:null};
    }
  }

  // Variant 3: Dominator + combine combo
  if(sub<=3){
    const positions=_shuffle(["WR","TE","RB","QB","EDGE"]);
    for(const pos of positions){
      const guys=_withCombine(_posPlayers(pos));
      for(const p of _shuffle(guys).slice(0,10)){
        const stats=_statLookup(p.name,p.school);
        if(!stats)continue;
        const domKey=pos==="QB"?"passing_DOM":pos==="RB"?"rushing_DOM":["WR","TE"].includes(pos)?"receiving_DOM":"defensive_DOM";
        const dom=stats[domKey];
        const ath=p.cs.athleticScore;
        if(dom==null||dom<25||ath==null||ath<80)continue;
        const domPct=getStatPercentile(p.name,p.school,domKey,pos);
        if(domPct==null||domPct<75)continue;
        const athPctRaw=p.cs.athleticPct;
        if(athPctRaw==null||athPctRaw<75)continue;
        const rank=getConsensusRank(p.name);
        const breakout=stats.breakout_year;
        const breakoutStr=breakout==="Fr"||breakout==="So"?` Broke out as a ${breakout==="Fr"?"freshman":"sophomore"}.`:"";
        return{category:'college_stats',spice:_spice(1,domPct>=90&&athPctRaw>=90,rank<=50),
          tweet:_tag(`${p.name}: ${Math.round(domPct)}th percentile ${DOM_LABELS[domKey]||"dominator"} + ${Math.round(athPctRaw)}th percentile Athletic Score.${breakoutStr} Production AND athleticism.\n\n📊 bigboardlab.com`),
          image:`Combine Explorer → college stats → Dominator`,hook:`Dominator + athlete combo`,player:p.name};
      }
    }
  }

  // Variant 4: Stat percentile outlier (non-dominator)
  if(sub<=4){
    const HIGHLIGHT_STATS={QB:["passing_YDS","passing_PCT","passing_TDINT"],RB:["rushing_YDS","rushing_YPC"],WR:["receiving_YDS","receiving_YPR"],TE:["receiving_YDS"]};
    const STAT_LABELS={passing_YDS:"passing yards",passing_PCT:"completion percentage",passing_TDINT:"TD-to-INT ratio",rushing_YDS:"rushing yards",rushing_YPC:"yards per carry",receiving_YDS:"receiving yards",receiving_YPR:"yards per reception"};
    const positions=_shuffle(Object.keys(HIGHLIGHT_STATS));
    for(const pos of positions){
      const guys=_posPlayers(pos);
      for(const p of _shuffle(guys).slice(0,10)){
        const stats=_statLookup(p.name,p.school);
        if(!stats)continue;
        const statKeys=HIGHLIGHT_STATS[pos];
        for(const sk of _shuffle(statKeys)){
          const val=stats[sk];
          if(val==null)continue;
          const pct=getStatPercentile(p.name,p.school,sk,pos);
          if(pct==null||pct<95)continue;
          const dist=HISTORICAL_STAT_DIST[pos]?.[sk];
          if(!dist||dist.length<100)continue;
          const above=dist.filter(v=>v>=val).length;
          const rank=getConsensusRank(p.name);
          const fmtVal=DECIMAL_STATS.has(sk)?val.toFixed(sk.endsWith("_PCT")?1:2):Math.round(val);
          const unit=sk.endsWith("_PCT")?"%":"";
          const statRarity=above===0?`No qualifying ${pos} in 10 years has posted a number this high.`:`Only ${above} of ${dist.length} qualifying ${pos}s hit that number.`;
          return{category:'college_stats',spice:_spice(1,pct>=99,rank<=50),
            tweet:_tag(`${p.name} posted ${fmtVal}${unit} ${STAT_LABELS[sk]||sk} this season — ${Math.round(pct)}th percentile over the last 10 years of college football. ${statRarity}\n\n📊 bigboardlab.com`),
            image:`Combine Explorer → college stats → ${STAT_SHORT[sk]||sk}`,hook:`Elite college production`,player:p.name};
        }
      }
    }
  }

  return null;
}

function generateTweetCards(lastCategories,historicalData){
  const generators={
    combine_outlier:()=>genCombineOutlier(),
    size_athleticism:()=>genSizeAthleticismMismatch(),
    class_depth:()=>genClassDepth(),
    draft_value_gap:()=>genDraftValueGap(),
    conference:()=>genConferenceBreakdown(),
    historical:()=>genHistoricalComparison(historicalData),
    radar_spotlight:()=>genRadarSpotlight(),
    ceiling_tags:()=>genCeilingTags(),
    team_mock:()=>genTeamMockAlignment(),
    college_stats:()=>genCollegeStats(),
  };
  const excluded=new Set(lastCategories||[]);
  const available=TWEET_CATEGORIES.filter(c=>!excluded.has(c.key));
  const cards=[];
  const usedCategories=[];
  const usedKeys=new Set();
  let tier1Count=0;
  const maxAttempts=30;
  let attempts=0;
  while(cards.length<3&&attempts<maxAttempts){
    attempts++;
    const pool=available.filter(c=>!usedKeys.has(c.key));
    if(!pool.length)break;
    const needsTier1=cards.length<2&&tier1Count<2&&(3-cards.length)<=(2-tier1Count);
    const filtered=needsTier1?pool.filter(c=>c.tier===1):pool;
    const pick=filtered.length?filtered:pool;
    const totalWeight=pick.reduce((s,c)=>s+c.weight,0);
    let r=Math.random()*totalWeight;
    let chosen=pick[0];
    for(const c of pick){r-=c.weight;if(r<=0){chosen=c;break;}}
    const result=generators[chosen.key]?.();
    if(!result){continue;}
    cards.push({...result,catMeta:chosen});
    usedKeys.add(chosen.key);
    usedCategories.push(chosen.key);
    if(chosen.tier===1)tier1Count++;
  }
  return{cards,newLastCategories:usedCategories};
}

// ============================================================
// AdminLineChart — reusable SVG line chart for admin
// ============================================================
function AdminLineChart({series,labels,height=110,normalize=false}){
  const[hovIdx,setHovIdx]=useState(null);
  const W=860,padL=4,padR=4,padT=8,padB=20;
  const chartW=W-padL-padR,chartH=height-padT-padB;
  const n=labels.length;
  if(n<2)return null;
  // normalize=true: each series scaled to its own max so all lines are visible
  const plotSeries=normalize
    ?series.map(s=>{const mx=Math.max(...s.data,1);return{...s,plot:s.data.map(v=>v/mx*100)};})
    :series.map(s=>({...s,plot:s.data}));
  const maxV=normalize?100:Math.max(...plotSeries.flatMap(s=>s.plot),1);
  const xp=i=>padL+(i/(n-1))*chartW;
  const yp=v=>padT+chartH-Math.max(0,v/maxV)*chartH;
  const labelStep=Math.max(1,Math.ceil(n/8));
  return(
    <div style={{position:'relative'}} onMouseLeave={()=>setHovIdx(null)}>
      <svg viewBox={`0 0 ${W} ${height}`} style={{width:'100%',height:height,display:'block',overflow:'visible'}}>
        {[0.25,0.5,0.75,1].map(f=><line key={f} x1={padL} x2={W-padR} y1={padT+chartH*(1-f)} y2={padT+chartH*(1-f)} stroke="#f5f5f5" strokeWidth={1}/>)}
        {plotSeries.map(s=>{
          const pts=s.plot.map((v,i)=>`${xp(i)},${yp(v)}`).join(' ');
          return<g key={s.label}>
            <polygon points={`${xp(0)},${padT+chartH} ${pts} ${xp(n-1)},${padT+chartH}`} fill={s.color} fillOpacity={0.08} stroke="none"/>
            <polyline points={pts} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"/>
          </g>;
        })}
        {hovIdx!=null&&<>
          <line x1={xp(hovIdx)} x2={xp(hovIdx)} y1={padT} y2={padT+chartH} stroke="#e5e5e5" strokeWidth={1}/>
          {plotSeries.map(s=><circle key={s.label} cx={xp(hovIdx)} cy={yp(s.plot[hovIdx])} r={4} fill={s.color} stroke="#fff" strokeWidth={2}/>)}
        </>}
        {labels.map((l,i)=>{
          if(i%labelStep!==0&&i!==n-1)return null;
          return<text key={i} x={xp(i)} y={height-2} textAnchor={i===0?'start':i===n-1?'end':'middle'} fontSize={9} fontFamily="monospace" fill="#c4c4c4">{l}</text>;
        })}
        {Array.from({length:n},(_,i)=><rect key={i} x={i===0?xp(0):xp(i)-chartW/(n-1)/2} y={padT} width={chartW/(n-1)} height={chartH} fill="transparent" style={{cursor:'default'}} onMouseEnter={()=>setHovIdx(i)}/>)}
      </svg>
      {hovIdx!=null&&<div style={{position:'absolute',top:4,left:`${Math.min(Math.max(xp(hovIdx)/W*100-5,0),62)}%`,background:'#171717',borderRadius:6,padding:'6px 10px',pointerEvents:'none',zIndex:20,minWidth:90}}>
        <div style={{fontFamily:'monospace',fontSize:8,color:'#737373',marginBottom:3}}>{labels[hovIdx]}</div>
        {series.map(s=><div key={s.label} style={{display:'flex',alignItems:'center',gap:5,lineHeight:1.4}}>
          <span style={{display:'inline-block',width:8,height:8,borderRadius:'50%',background:s.color,flexShrink:0}}/>
          <span style={{fontFamily:'monospace',fontSize:11,fontWeight:700,color:'#fff'}}>{s.data[hovIdx].toLocaleString()}</span>
          <span style={{fontFamily:'monospace',fontSize:9,color:'#737373'}}>{s.label}</span>
        </div>)}
      </div>}
    </div>
  );
}

// ============================================================
// Player Spotlight — admin combo finder
// ============================================================
const SPOTLIGHT_REDUNDANCY_GROUPS=[
  ["meas_40","meas_SPD","meas_ATH","trait_Speed"],
  ["meas_3C","meas_SHT","meas_AGI","trait_Agility","trait_Quickness"],
  ["meas_VRT","meas_BRD","meas_EXP","trait_Explosiveness"],
  ["meas_HT","meas_WT","meas_WING","meas_ARM","meas_HND"],
  ["passing_YDS","passing_ATT","passing_COMP","passing_TD","passing_DOM"],
  ["rushing_YDS","rushing_CAR","rushing_TD","rushing_DOM"],
  ["receiving_YDS","receiving_REC","receiving_TD","receiving_DOM"],
  ["defensive_TKL","defensive_TFL","defensive_SACKS","defensive_QBHUR","defensive_DOM"],
];
function computeSpotlightCombos(player){
  const pos=player.gpos||player.pos;
  const peers=PROSPECTS.filter(p=>(p.gpos||p.pos)===pos);
  const metrics=getComboMetrics(pos);
  const metricPcts={};
  const metricVals={};
  metrics.forEach(m=>{
    const val=getComboVal(player.name,player.school,player.id,m.key,pos,{});
    if(val==null)return;
    metricVals[m.key]=val;
    const allVals=peers.map(p=>getComboVal(p.name,p.school,p.id,m.key,pos,{})).filter(v=>v!=null);
    if(allVals.length<4)return;
    const sorted=[...allVals].sort((a,b)=>a-b);
    const lo=sorted.filter(v=>v<val).length;
    const rawPct=lo/sorted.length*100;
    metricPcts[m.key]=m.inverted?100-rawPct:rawPct;
  });
  const redundancyMap={};
  SPOTLIGHT_REDUNDANCY_GROUPS.forEach((group,gi)=>group.forEach(key=>{redundancyMap[key]=gi;}));
  const validKeys=Object.keys(metricPcts);
  const pairs=[];
  for(let i=0;i<validKeys.length;i++){
    for(let j=i+1;j<validKeys.length;j++){
      const xKey=validKeys[i],yKey=validKeys[j];
      if(redundancyMap[xKey]!=null&&redundancyMap[xKey]===redundancyMap[yKey])continue;
      const xPct=metricPcts[xKey],yPct=metricPcts[yKey];
      const score=(xPct+yPct)/2;
      const xMeta=metrics.find(m=>m.key===xKey);
      const yMeta=metrics.find(m=>m.key===yKey);
      pairs.push({xKey,yKey,xMeta,yMeta,xPct,yPct,score,xVal:metricVals[xKey],yVal:metricVals[yKey]});
    }
  }
  return pairs.sort((a,b)=>b.score-a.score).slice(0,5);
}
const _spotlightCache=new Map();
function getCachedSpotlight(player){
  if(_spotlightCache.has(player.id))return _spotlightCache.get(player.id);
  const result=computeSpotlightCombos(player);
  _spotlightCache.set(player.id,result);
  return result;
}
function buildComboPhrase(combo){
  const{xMeta,yMeta,xPct,yPct}=combo;
  if(xMeta?.cat==='T'&&yMeta?.cat==='T')return null;
  const[a,b]=xPct>=yPct?[xMeta,yMeta]:[yMeta,xMeta];
  const aLabel=(a?.label||'').toLowerCase();
  const bLabel=(b?.label||'').toLowerCase();
  const aIsP=a?.cat==='P',bIsP=b?.cat==='P';
  if(aIsP&&bIsP)return`Dominant ${aLabel} and ${bLabel}`;
  if(bIsP)return`Elite ${aLabel} backed by dominant ${bLabel}`;
  if(aIsP)return`Dominant ${aLabel} with elite ${bLabel}`;
  return`Elite ${aLabel} paired with elite ${bLabel}`;
}

// ============================================================
// Admin Dashboard (gated by email)
// ============================================================
const ADMIN_EMAILS=["hunteransley@gmail.com"];
function AdminDashboard({user,onBack,onOpenCombo}){
  const[rawData,setRawData]=useState(null);
  const[loading,setLoading]=useState(true);
  const[excludeAdmin,setExcludeAdmin]=useState(true);
  const[showEventLog,setShowEventLog]=useState(false);
  const[expandedUser,setExpandedUser]=useState(null);
  const[tweetCards,setTweetCards]=useState([]);
  const[lastTweetCategories,setLastTweetCategories]=useState([]);
  const[tweetHistorical,setTweetHistorical]=useState(_historicalCompsCache||null);
  const[tweetCopied,setTweetCopied]=useState(null);
  const[spotlightQuery,setSpotlightQuery]=useState('');
  const[spotlightPlayer,setSpotlightPlayer]=useState(null);
  const[spotlightResults,setSpotlightResults]=useState([]);
  const[spotlightSuggestions,setSpotlightSuggestions]=useState([]);
  useEffect(()=>{if(!tweetHistorical)loadHistoricalComps(setTweetHistorical);},[]);
  useEffect(()=>{
    (async()=>{
      try{
        const fourteenAgo=new Date(Date.now()-14*86400000).toISOString();
        const[boardsRes,communityRes,,authCountRes,authUsersRes]=await Promise.all([
          supabase.rpc('get_all_boards_summary'),
          supabase.from('community_boards').select('user_id,board_data'),
          null, // events fetched via pagination below
          supabase.rpc('get_auth_user_count'),
          supabase.rpc('get_auth_users_summary'),
        ]);
        const pageSize=1000;
        let heatmapAll=[];
        for(let page=0;;page++){
          const{data}=await supabase.from('events').select('created_at,user_id,session_id').gte('created_at',fourteenAgo).order('created_at',{ascending:false}).range(page*pageSize,(page+1)*pageSize-1);
          if(!data||data.length===0)break;
          heatmapAll=heatmapAll.concat(data);
          if(data.length<pageSize)break;
        }
        let allEventsData=[];
        for(let page=0;;page++){
          const{data}=await supabase.from('events').select('*').order('created_at',{ascending:false}).range(page*pageSize,(page+1)*pageSize-1);
          if(!data||data.length===0)break;
          allEventsData=allEventsData.concat(data);
          if(data.length<pageSize)break;
        }
        setRawData({
          boards:boardsRes.data||[],
          community:communityRes.data||[],
          allEventsData,
          totalUsers:authCountRes.data||0,
          authUsers:authUsersRes.data||[],
          heatmapAll,
        });
      }catch(e){console.error('Admin fetch error:',e);setRawData(null);}
      setLoading(false);
    })();
  },[]);

  // Derive ALL stats reactively from raw data + excludeAdmin toggle
  const adminId=user?.id;
  const computed=useMemo(()=>{
    if(!rawData)return null;
    const{boards,community,allEventsData,totalUsers,authUsers,heatmapAll}=rawData;
    const allEventsFiltered=excludeAdmin&&adminId?allEventsData.filter(e=>e.user_id!==adminId):allEventsData;
    // Deduplicate signups — keep only earliest signup per user, discard duplicates
    const seenSignupUser=new Set();
    const allEvents=[];
    for(let i=allEventsFiltered.length-1;i>=0;i--){
      const e=allEventsFiltered[i];
      if(e.event==='signup'){
        if(seenSignupUser.has(e.user_id))continue;
        seenSignupUser.add(e.user_id);
      }
      allEvents.push(e);
    }
    allEvents.reverse();

    const now=new Date();
    const signupsToday=authUsers.filter(u=>(now-new Date(u.created_at))<86400000).length;
    const signupsWeek=authUsers.filter(u=>(now-new Date(u.created_at))<604800000).length;
    // Use event timestamps for active users (more accurate than last_sign_in_at which fires on any auth)
    const activeUserIds1d=new Set(allEventsFiltered.filter(e=>e.user_id&&(now-new Date(e.created_at))<86400000).map(e=>e.user_id));
    const activeUserIds7d=new Set(allEventsFiltered.filter(e=>e.user_id&&(now-new Date(e.created_at))<604800000).map(e=>e.user_id));
    const activeToday=activeUserIds1d.size;
    const activeWeek=activeUserIds7d.size;

    const eventCounts={};
    allEvents.forEach(e=>{eventCounts[e.event]=(eventCounts[e.event]||0)+1;});
    const uniqueEventUsers={};
    allEvents.forEach(e=>{if(!uniqueEventUsers[e.event])uniqueEventUsers[e.event]=new Set();uniqueEventUsers[e.event].add(e.user_id);});

    const mockDrafts=allEvents.filter(e=>e.event==='mock_draft_started').length;
    const mockDraftUsers=new Set(allEvents.filter(e=>e.event==='mock_draft_started').map(e=>e.user_id)).size;
    const rankingsCompleted=allEvents.filter(e=>e.event==='ranking_completed').length;

    const posStats={};
    const partialCount={};
    let hasNotes=0;
    const boardMap=new Map(boards.map(b=>[b.user_id,b]));
    boards.forEach(b=>{
      const d=b.board_data||{};
      const rg=d.rankedGroups||[];
      const pp=d.partialProgress?Object.keys(d.partialProgress):[];
      if(d.notes&&Object.keys(d.notes).length>0)hasNotes++;
      rg.forEach(pos=>{posStats[pos]=(posStats[pos]||0)+1;});
      pp.forEach(pos=>{partialCount[pos]=(partialCount[pos]||0)+1;});
    });

    const userDetails=authUsers.map(au=>{
      const b=boardMap.get(au.id);
      const d=b?.board_data||{};
      const rg=d.rankedGroups||[];
      const pp=d.partialProgress?Object.keys(d.partialProgress):[];
      const noteCount=d.notes?Object.keys(d.notes).length:0;
      const userEvts=allEvents.filter(e=>e.user_id===au.id);
      const mockCount=userEvts.filter(e=>e.event==='mock_draft_completed').length;
      const shareCount=userEvts.filter(e=>e.event==='share_results'||e.event==='share_triggered').length;
      const rankingsStartedU=userEvts.filter(e=>e.event==='ranking_started').length;
      const rankingsCompletedU=userEvts.filter(e=>e.event==='ranking_completed').length;
      const lastEvent=userEvts[0];
      const lastActivity=new Date(Math.max(
        au.last_sign_in_at?new Date(au.last_sign_in_at):0,
        b?new Date(b.updated_at):0,
        lastEvent?new Date(lastEvent.created_at):0
      ));
      return{
        userId:au.id,email:au.email||'',createdAt:au.created_at,
        updatedAt:lastActivity.toISOString(),
        rankedPositions:rg.length,rankedGroups:rg,
        partialPositions:pp.length,partialGroups:pp,noteCount,
        eventCount:userEvts.length,mockCount,shareCount,
        rankingsStartedU,rankingsCompletedU,hasBoard:!!b,
      };
    }).sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));

    const anonEvtsAll=allEvents.filter(e=>e.user_id===null||e.user_id===undefined||e.metadata?.guest===true);
    if(anonEvtsAll.length>0){
      const anonMocks=anonEvtsAll.filter(e=>e.event==='mock_draft_completed').length;
      const anonShares=anonEvtsAll.filter(e=>e.event==='share_results'||e.event==='share_triggered').length;
      const anonRankStarted=anonEvtsAll.filter(e=>e.event==='ranking_started').length;
      const anonRankCompleted=anonEvtsAll.filter(e=>e.event==='ranking_completed').length;
      const anonLast=anonEvtsAll[0];
      const anonSessions=new Set(anonEvtsAll.map(e=>e.session_id).filter(Boolean)).size;
      userDetails.unshift({
        userId:'__anonymous__',
        email:`anonymous visitors (${anonSessions} sessions)`,
        createdAt:anonEvtsAll[anonEvtsAll.length-1]?.created_at,
        updatedAt:anonLast?anonLast.created_at:null,
        rankedPositions:0,rankedGroups:[],partialPositions:0,partialGroups:[],noteCount:0,
        eventCount:anonEvtsAll.length,
        mockCount:anonMocks,shareCount:anonShares,
        rankingsStartedU:anonRankStarted,rankingsCompletedU:anonRankCompleted,
        hasBoard:false,isAnon:true,
      });
    }

    const rankers=userDetails.filter(u=>u.rankedPositions>0);
    const avgPositions=rankers.length>0?(rankers.reduce((s,u)=>s+u.rankedPositions,0)/rankers.length).toFixed(1):0;

    const localDateStr=(dt)=>{const x=new Date(dt);return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');};
    const dayMap={};
    heatmapAll.forEach(e=>{const d=localDateStr(e.created_at);dayMap[d]=(dayMap[d]||0)+1;});
    const heatmap=Array.from({length:14},(_,i)=>{const d=localDateStr(new Date(now-(13-i)*86400000));return{date:d,count:dayMap[d]||0};});

    const signupDayMap={};
    const fourteenAgoLocal=localDateStr(new Date(now-14*86400000));
    authUsers.forEach(u=>{if(u.created_at){const d=localDateStr(u.created_at);if(d>=fourteenAgoLocal)signupDayMap[d]=(signupDayMap[d]||0)+1;}});
    const signupHeatmap=Array.from({length:14},(_,i)=>{const d=localDateStr(new Date(now-(13-i)*86400000));return{date:d,count:signupDayMap[d]||0};});

    // Per-day mock + share counts for sparklines
    const mockDayMap={};const shareDayMap={};const activeDayMap={};
    allEvents.forEach(e=>{
      const d=localDateStr(e.created_at);if(d<fourteenAgoLocal)return;
      if(e.event==='mock_draft_completed')mockDayMap[d]=(mockDayMap[d]||0)+1;
      if(e.event==='share_triggered'||e.event==='share_results')shareDayMap[d]=(shareDayMap[d]||0)+1;
      if(e.user_id){if(!activeDayMap[d])activeDayMap[d]=new Set();activeDayMap[d].add(e.user_id);}
    });
    const mockHeatmap=Array.from({length:14},(_,i)=>{const d=localDateStr(new Date(now-(13-i)*86400000));return{date:d,count:mockDayMap[d]||0};});
    const shareHeatmap=Array.from({length:14},(_,i)=>{const d=localDateStr(new Date(now-(13-i)*86400000));return{date:d,count:shareDayMap[d]||0};});
    const activeHeatmap=Array.from({length:14},(_,i)=>{const d=localDateStr(new Date(now-(13-i)*86400000));return{date:d,count:activeDayMap[d]?activeDayMap[d].size:0};});

    // Cumulative user growth (90 days)
    const growthDays=90;
    const cutoffGrowth=new Date(now-growthDays*86400000);
    const baseUsers=authUsers.filter(u=>new Date(u.created_at)<cutoffGrowth).length;
    const signupsByDay90={};
    authUsers.filter(u=>new Date(u.created_at)>=cutoffGrowth).forEach(u=>{const d=localDateStr(u.created_at);signupsByDay90[d]=(signupsByDay90[d]||0)+1;});
    let runningTotal=baseUsers;
    const growthChart=Array.from({length:growthDays},(_,i)=>{const d=localDateStr(new Date(now-(growthDays-1-i)*86400000));runningTotal+=signupsByDay90[d]||0;return{date:d,count:runningTotal};});

    const anonSessionDayMap={};
    heatmapAll.filter(e=>!e.user_id).forEach(e=>{const d=localDateStr(e.created_at);if(!anonSessionDayMap[d])anonSessionDayMap[d]=new Set();if(e.session_id)anonSessionDayMap[d].add(e.session_id);});
    const anonSessionHeatmap=Array.from({length:14},(_,i)=>{const d=localDateStr(new Date(now-(13-i)*86400000));return{date:d,count:anonSessionDayMap[d]?anonSessionDayMap[d].size:0};});

    const rankingsStarted=allEvents.filter(e=>e.event==='ranking_started').length;
    const mocksStarted=allEvents.filter(e=>e.event==='mock_draft_sim_started'||e.event==='mock_draft_started').length;
    const mocksCompleted=allEvents.filter(e=>e.event==='mock_draft_completed').length;
    const mockCompletedEvents=allEvents.filter(e=>e.event==='mock_draft_completed');
    const singleTeamMocks=mockCompletedEvents.filter(e=>{const t=e.metadata?.team||'';return t&&!t.includes(',');}).length;
    const multiTeamMocks=mockCompletedEvents.filter(e=>{const t=e.metadata?.team||'';return t&&t.includes(',');}).length;
    const allTeamMocks=mockCompletedEvents.filter(e=>{const t=e.metadata?.team||'';return t&&t.split(',').length>=32;}).length;
    const shareEvents=allEvents.filter(e=>e.event==='share_results'||e.event==='share_triggered');
    const totalShares=shareEvents.length;
    const shareUsers=new Set(shareEvents.map(e=>e.user_id)).size;
    const shareByType={};
    shareEvents.forEach(e=>{const t=e.metadata?.type||'mock_single';shareByType[t]=(shareByType[t]||0)+1;});
    const noteUsers=boards.filter(b=>{const d=b.board_data||{};return d.notes&&Object.keys(d.notes).length>0;}).length;

    const anonEvents=allEvents.filter(e=>e.user_id===null||e.user_id===undefined||e.metadata?.guest===true);
    const weekAgo=new Date(now-604800000);
    const anonWeek=anonEvents.filter(e=>new Date(e.created_at)>=weekAgo);
    const guestMocksStarted=anonEvents.filter(e=>e.event==='mock_draft_sim_started'||e.event==='mock_draft_started').length;
    const guestMocksCompleted=anonEvents.filter(e=>e.event==='mock_draft_completed').length;
    const guestShares=anonEvents.filter(e=>e.event==='share_results').length;
    const guestMocksWeek=anonWeek.filter(e=>e.event==='mock_draft_sim_started'||e.event==='mock_draft_started').length;
    const guestTeams={};
    anonEvents.filter(e=>e.event==='mock_draft_sim_started'||e.event==='mock_draft_started').forEach(e=>{
      const t=e.metadata?.team||e.metadata?.teams;if(t){guestTeams[t]=(guestTeams[t]||0)+1;}
    });
    const guestTopTeams=Object.entries(guestTeams).sort((a,b)=>b[1]-a[1]).slice(0,5);

    const signupFlows={};
    const signupEventsArr=allEvents.filter(e=>e.event==='signup');
    signupEventsArr.forEach(se=>{
      const source=se.metadata?.source;
      if(source){signupFlows[source]=(signupFlows[source]||0)+1;return;}
      // Use same-session page_view to infer entry point (populates as page_view events accumulate)
      const sessionPageViews=se.session_id?allEvents.filter(e=>e.session_id===se.session_id&&e.event==='page_view'):[];
      if(sessionPageViews.length>0){
        const path=sessionPageViews[0].metadata?.path||'';
        const flow=path.includes('/mock')||path.includes('/r1')?'mock draft':path.startsWith('/rank')||path.startsWith('/board')?'pair rank':path.startsWith('/lab')?'data lab':'homepage';
        signupFlows[flow]=(signupFlows[flow]||0)+1;
      } else {
        signupFlows['unknown']=(signupFlows['unknown']||0)+1;
      }
    });

    const funnelSignedUp=totalUsers;
    const funnelRankedPos=new Set([...allEvents.filter(e=>e.event==='ranking_completed'&&e.user_id).map(e=>e.user_id),...boards.filter(b=>(b.board_data?.rankedGroups||[]).length>0).map(b=>b.user_id)]).size;
    const funnelRanMock=new Set(allEvents.filter(e=>e.event==='mock_draft_started'||e.event==='mock_draft_completed').filter(e=>e.user_id).map(e=>e.user_id)).size;
    const funnelShared=new Set(allEvents.filter(e=>e.event==='share_triggered'||e.event==='share_results').filter(e=>e.user_id).map(e=>e.user_id)).size;

    // Session depth + duration
    const sessionCounts={};const sessionTimes={};
    allEvents.forEach(e=>{
      if(!e.session_id)return;
      sessionCounts[e.session_id]=(sessionCounts[e.session_id]||0)+1;
      const t=new Date(e.created_at).getTime();
      if(!sessionTimes[e.session_id])sessionTimes[e.session_id]={min:t,max:t};
      else{if(t<sessionTimes[e.session_id].min)sessionTimes[e.session_id].min=t;if(t>sessionTimes[e.session_id].max)sessionTimes[e.session_id].max=t;}
    });
    const sessionArr=Object.values(sessionCounts);
    const avgSessionDepth=sessionArr.length>0?+(sessionArr.reduce((s,v)=>s+v,0)/sessionArr.length).toFixed(1):0;
    const totalSessions=sessionArr.length;
    const CAP_MS=45*60000;
    const durationArr=Object.values(sessionTimes).map(s=>Math.min(s.max-s.min,CAP_MS)).filter(d=>d>0).sort((a,b)=>a-b);
    const medianDurationMs=durationArr.length>0?durationArr[Math.floor(durationArr.length/2)]:0;
    const avgSessionDurationMin=medianDurationMs>0?+(medianDurationMs/60000).toFixed(1):0;

    // Retention (event-based)
    const sevenDaysMs=604800000;const thirtyDaysMs=30*86400000;
    const eligibleFor7d=authUsers.filter(u=>u.id!==adminId&&(now-new Date(u.created_at))>=sevenDaysMs);
    const eligibleFor30d=authUsers.filter(u=>u.id!==adminId&&(now-new Date(u.created_at))>=thirtyDaysMs);
    const userEventMap={};
    allEventsFiltered.filter(e=>e.user_id).forEach(e=>{if(!userEventMap[e.user_id])userEventMap[e.user_id]=[];userEventMap[e.user_id].push(new Date(e.created_at));});
    const retained7d=eligibleFor7d.filter(u=>{const signup=new Date(u.created_at);return(userEventMap[u.id]||[]).some(t=>t>signup&&(t-signup)<sevenDaysMs);}).length;
    const retained30d=eligibleFor30d.filter(u=>{const signup=new Date(u.created_at);return(userEventMap[u.id]||[]).some(t=>t>signup&&(t-signup)<thirtyDaysMs);}).length;
    const retention7dRate=eligibleFor7d.length>0?Math.round(retained7d/eligibleFor7d.length*100):null;
    const retention30dRate=eligibleFor30d.length>0?Math.round(retained30d/eligibleFor30d.length*100):null;
    const retention7dLabel=eligibleFor7d.length>0?`${retained7d}/${eligibleFor7d.length} eligible`:null;
    const retention30dLabel=eligibleFor30d.length>0?`${retained30d}/${eligibleFor30d.length} eligible`:null;

    return{
      stats:{totalUsers,activeToday,activeWeek,posStats,partialCount,avgPositions,hasNotes,
        communityUsers:community.length,eventCounts,uniqueEventUsers,signupsToday,signupsWeek,
        mockDrafts,mockDraftUsers,rankingsCompleted,
        heatmap,signupHeatmap,anonSessionHeatmap,mockHeatmap,shareHeatmap,activeHeatmap,growthChart,rankingsStarted,mocksStarted,mocksCompleted,singleTeamMocks,multiTeamMocks,allTeamMocks,totalShares,shareUsers,shareByType,noteUsers,
        guestMocksStarted,guestMocksCompleted,guestShares,guestMocksWeek,guestTopTeams,
        signupFlows,
        funnelSignedUp,funnelRankedPos,funnelRanMock,funnelShared,
        avgSessionDepth,totalSessions,avgSessionDurationMin,retention7dRate,retention30dRate,retention7dLabel,retention30dLabel,
      },
      users:userDetails,
      displayEvents:allEvents.slice(0,50),
      allEventsRaw:allEventsFiltered,
    };
  },[rawData,excludeAdmin,adminId]);
  const stats=computed?.stats||null;
  const users=computed?.users||[];
  const displayEvents=computed?.displayEvents||[];
  const displayEventCounts=useMemo(()=>{
    if(!computed)return{counts:{},unique:{}};
    return{counts:stats.eventCounts,unique:stats.uniqueEventUsers};
  },[computed,stats]);

  if(loading)return<div style={{minHeight:"100vh",background:"#faf9f6",display:"flex",alignItems:"center",justifyContent:"center"}}><p style={{fontFamily:sans,fontSize:14,color:"#a3a3a3"}}>loading admin...</p></div>;
  if(!stats)return<div style={{minHeight:"100vh",background:"#faf9f6",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12}}><p style={{fontFamily:sans,fontSize:14,color:"#dc2626"}}>failed to load admin data</p><button onClick={onBack} style={{fontFamily:sans,fontSize:13,padding:"8px 20px",background:"#171717",color:"#faf9f6",border:"none",borderRadius:99,cursor:"pointer"}}>← back</button></div>;

  // Compute user status tags
  const tagUser=(u)=>{
    if(u.isAnon)return{label:"anonymous",color:"#737373",bg:"#f5f5f5"};
    const hasMocks=u.mockCount>0;
    if(u.rankedPositions>0&&hasMocks)return{label:"power user",color:"#16a34a",bg:"#f0fdf4"};
    if(hasMocks)return{label:"drafter",color:"#f59e0b",bg:"#fffbeb"};
    if(u.rankedPositions>0)return{label:"ranker",color:"#3b82f6",bg:"#eff6ff"};
    if(u.eventCount>2)return{label:"explorer",color:"#ca8a04",bg:"#fefce8"};
    return{label:"one-visit",color:"#d4d4d4",bg:"#fafafa"};
  };

  const downloadCSV=(rows,filename)=>{
    const csv=rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
  };
  const exportUsersCSV=()=>{
    const rows=[['email','status','signup_date','last_active','ranked_positions','mock_count','share_count','note_count','event_count'],...users.filter(u=>!u.isAnon).map(u=>[u.email,tagUser(u).label,u.createdAt?new Date(u.createdAt).toISOString().slice(0,10):'',u.updatedAt?new Date(u.updatedAt).toISOString().slice(0,16).replace('T',' '):'',u.rankedPositions,u.mockCount,u.shareCount,u.noteCount,u.eventCount])];
    downloadCSV(rows,`bbl-users-${new Date().toISOString().slice(0,10)}.csv`);
  };
  const exportEventsCSV=()=>{
    const emailMap=Object.fromEntries(users.filter(u=>!u.isAnon).map(u=>[u.userId,u.email]));
    const rows=[['date','event','user_email','session_id','metadata'],...(computed?.allEventsRaw||[]).slice(0,20000).map(e=>[new Date(e.created_at).toISOString().slice(0,16).replace('T',' '),e.event,emailMap[e.user_id]||'',e.session_id||'',JSON.stringify(e.metadata||{})])];
    downloadCSV(rows,`bbl-events-${new Date().toISOString().slice(0,10)}.csv`);
  };

  return(
    <div style={{minHeight:"100vh",background:"#faf9f6",fontFamily:font}}>
      <div style={{position:"fixed",top:0,left:0,right:0,zIndex:100,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 16px",background:"#171717",borderBottom:"1px solid #333"}}>
        <span style={{fontFamily:mono,fontSize:11,color:"#faf9f6",letterSpacing:2}}>⚙️ ADMIN DASHBOARD</span>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}>
            <input type="checkbox" checked={excludeAdmin} onChange={e=>setExcludeAdmin(e.target.checked)} style={{accentColor:"#22c55e"}}/>
            <span style={{fontFamily:mono,fontSize:9,color:excludeAdmin?"#22c55e":"#737373"}}>exclude admin</span>
          </label>
          <button onClick={exportUsersCSV} style={{fontFamily:mono,fontSize:9,color:"#a3a3a3",background:"none",border:"1px solid #444",borderRadius:99,padding:"3px 10px",cursor:"pointer"}}>↓ users.csv</button>
          <button onClick={exportEventsCSV} style={{fontFamily:mono,fontSize:9,color:"#a3a3a3",background:"none",border:"1px solid #444",borderRadius:99,padding:"3px 10px",cursor:"pointer"}}>↓ events.csv</button>
          <button onClick={onBack} style={{fontFamily:sans,fontSize:11,color:"#a3a3a3",background:"none",border:"1px solid #444",borderRadius:99,padding:"3px 12px",cursor:"pointer"}}>← back to app</button>
        </div>
      </div>
      <style>{`
        .admin-kpi{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
        .admin-2col{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px}
        .admin-table-head,.admin-table-row{display:grid;grid-template-columns:1fr 80px 70px 60px 100px;gap:4px}
        .admin-event-row{display:grid;grid-template-columns:110px 1fr 1fr 120px;gap:6px}
        @media(max-width:700px){
          .admin-kpi{grid-template-columns:repeat(2,1fr)}
          .admin-2col{grid-template-columns:1fr}
          .admin-table-head,.admin-table-row{grid-template-columns:1fr 60px 50px 40px}
          .admin-table-hide{display:none}
          .admin-event-row{grid-template-columns:90px 1fr 90px}
          .admin-event-meta{display:none}
        }
      `}</style>
      <div style={{maxWidth:920,margin:"0 auto",padding:"52px 24px 60px"}}>

        {/* SECTION 1: KPI Strip — 4 cards with sparklines */}
        {(()=>{
          const kpis=[
            {label:"Users (all-time)",value:stats.totalUsers,sub:`+${stats.signupsWeek} this week`,color:"#171717",spark:stats.signupHeatmap},
            {label:"Active (7d)",value:stats.activeWeek,sub:`${stats.activeToday} today`,color:"#3b82f6",spark:stats.activeHeatmap},
            {label:"Mocks Run (all-time)",value:stats.mocksCompleted,sub:`${stats.mockDraftUsers} users`,color:"#f59e0b",spark:stats.mockHeatmap},
            {label:"Shared (all-time)",value:stats.totalShares,sub:`${stats.shareUsers} users`,color:"#22c55e",spark:stats.shareHeatmap},
          ];
          return<div className="admin-kpi">
            {kpis.map(c=>{
              const sparkMax=Math.max(...(c.spark||[]).map(d=>d.count),1);
              const sparkH=28,sparkW=80;
              return<div key={c.label} style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:10,padding:"14px 16px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <div style={{fontFamily:font,fontSize:26,fontWeight:900,color:c.color,lineHeight:1}}>{c.value}</div>
                    <div style={{fontFamily:mono,fontSize:7,letterSpacing:1.5,color:"#a3a3a3",textTransform:"uppercase",marginTop:5}}>{c.label}</div>
                    <div style={{fontFamily:mono,fontSize:10,color:"#737373",marginTop:3}}>{c.sub}</div>
                  </div>
                  {c.spark&&<svg viewBox={`0 0 ${sparkW} ${sparkH}`} style={{width:sparkW,height:sparkH,flexShrink:0}}>
                    {(()=>{
                      const pts=(c.spark||[]).map((d,i)=>`${(i/(c.spark.length-1))*sparkW},${sparkH-Math.max(0,d.count/sparkMax)*(sparkH-2)-1}`).join(' ');
                      return<>
                        <polygon points={`0,${sparkH} ${pts} ${sparkW},${sparkH}`} fill={c.color} fillOpacity={0.12} stroke="none"/>
                        <polyline points={pts} fill="none" stroke={c.color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round"/>
                      </>;
                    })()}
                  </svg>}
                </div>
              </div>;
            })}
          </div>;
        })()}

        {/* SECTION 1b: Session & Retention KPIs */}
        <div className="admin-kpi">
          {[
            {label:"Total Sessions",value:stats.totalSessions,sub:`avg ${stats.avgSessionDepth} events · ${stats.avgSessionDurationMin}min median`,color:"#8b5cf6"},
            {label:"7-day Retention",value:stats.retention7dRate!=null?stats.retention7dRate+"%":"—",sub:stats.retention7dLabel||"not enough data",color:stats.retention7dRate==null?"#d4d4d4":stats.retention7dRate>=30?"#22c55e":stats.retention7dRate>=15?"#f59e0b":"#dc2626"},
            {label:"30-day Retention",value:stats.retention30dRate!=null?stats.retention30dRate+"%":"—",sub:stats.retention30dLabel||"not enough data",color:stats.retention30dRate==null?"#d4d4d4":stats.retention30dRate>=20?"#22c55e":stats.retention30dRate>=10?"#f59e0b":"#dc2626"},
            {label:"Avg Positions Ranked",value:stats.avgPositions,sub:`among rankers`,color:"#3b82f6"},
          ].map(c=>(
            <div key={c.label} style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:10,padding:"16px 18px",textAlign:"center"}}>
              <div style={{fontFamily:font,fontSize:28,fontWeight:900,color:c.color,lineHeight:1}}>{c.value}</div>
              <div style={{fontFamily:mono,fontSize:8,letterSpacing:1.5,color:"#a3a3a3",textTransform:"uppercase",marginTop:6}}>{c.label}</div>
              <div style={{fontFamily:mono,fontSize:10,color:"#737373",marginTop:4}}>{c.sub}</div>
            </div>
          ))}
        </div>

        {/* User Growth Chart */}
        {stats.growthChart&&<div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"16px 20px",marginBottom:24}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:12}}>
            <div style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase"}}>user growth — 90 days</div>
            <div style={{fontFamily:font,fontSize:13,fontWeight:900,color:"#171717"}}>{stats.totalUsers.toLocaleString()} total</div>
          </div>
          <AdminLineChart
            series={[{label:"users",data:stats.growthChart.map(d=>d.count),color:"#171717"}]}
            labels={stats.growthChart.map((d,i)=>i%15===0||i===stats.growthChart.length-1?new Date(d.date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}):'')}
            height={120}
          />
        </div>}

        {/* SECTION 2: Conversion Funnel — step-over-step */}
        {(()=>{
          const steps=[
            {label:"Signed Up",count:stats.funnelSignedUp,color:"#171717"},
            {label:"Ranked a Position",count:stats.funnelRankedPos,color:"#3b82f6"},
            {label:"Ran a Mock Draft",count:stats.funnelRanMock,color:"#f59e0b"},
            {label:"Shared Results",count:stats.funnelShared,color:"#22c55e"},
          ];
          const topCount=steps[0].count||1;
          return<div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"20px 24px",marginBottom:24}}>
            <div style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:16}}>conversion funnel (all-time)</div>
            {steps.map((step,i)=>{
              const prevCount=i>0?steps[i-1].count:step.count;
              const convPct=prevCount>0?Math.round(step.count/prevCount*100):0;
              const barW=topCount>0?Math.max(step.count/topCount*100,step.count>0?2:0):0;
              return<div key={step.label}>
                {i>0&&<div style={{fontFamily:mono,fontSize:10,color:"#a3a3a3",padding:"2px 0 2px 8px"}}>↓ {convPct}%</div>}
                <div style={{marginBottom:i<steps.length-1?4:0}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:3}}>
                    <span style={{fontFamily:sans,fontSize:13,fontWeight:600,color:"#171717"}}>{step.label}</span>
                    <span style={{fontFamily:mono,fontSize:13,fontWeight:900,color:step.color}}>{step.count}</span>
                  </div>
                  <div style={{height:6,background:"#f5f5f5",borderRadius:99,overflow:"hidden"}}>
                    <div style={{height:"100%",width:barW+"%",background:step.color,borderRadius:99,transition:"width 0.3s"}}/>
                  </div>
                </div>
              </div>;
            })}
          </div>;
        })()}

        {/* 14-day combined activity chart */}
        {stats.heatmap&&<div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"16px 20px",marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:12}}>
            <div style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase"}}>activity — last 14 days</div>
            <div style={{display:"flex",gap:12,alignItems:"center"}}>
              {[{label:"events",color:"#22c55e"},{label:"signups",color:"#7c3aed"},{label:"anon sessions",color:"#f97316"}].map(s=>(
                <span key={s.label} style={{fontFamily:mono,fontSize:8,color:s.color,display:"flex",alignItems:"center",gap:4}}>
                  <span style={{display:"inline-block",width:12,height:2,background:s.color,borderRadius:1}}/>
                  {s.label}
                </span>
              ))}
              <span style={{fontFamily:mono,fontSize:7,color:"#d4d4d4"}}>relative scale</span>
            </div>
          </div>
          <AdminLineChart
            series={[
              {label:"events",data:stats.heatmap.map(d=>d.count),color:"#22c55e"},
              {label:"signups",data:stats.signupHeatmap.map(d=>d.count),color:"#7c3aed"},
              {label:"anon sessions",data:stats.anonSessionHeatmap.map(d=>d.count),color:"#f97316"},
            ]}
            labels={stats.heatmap.map(d=>new Date(d.date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}))}
            height={110}
            normalize={true}
          />
        </div>}

        {/* SECTION 3: Activity Heatmap — last 14 days */}
        {stats.heatmap&&<div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"16px 20px",marginBottom:24}}>
          <div style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:12}}>activity — last 14 days</div>
          <div style={{display:"flex",gap:4}}>
            {(()=>{
              const maxC=Math.max(...stats.heatmap.map(d=>d.count),1);
              return stats.heatmap.map(d=>{
                const intensity=d.count/maxC;
                const bg=d.count===0?"#f5f5f5":`rgba(34,197,94,${0.15+intensity*0.85})`;
                const dayLabel=new Date(d.date+'T12:00:00').toLocaleDateString('en-US',{weekday:'narrow'});
                const dateLabel=new Date(d.date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});
                return<div key={d.date} style={{flex:1,textAlign:"center"}} title={`${dateLabel}: ${d.count} events`}>
                  <div style={{height:36,background:bg,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:3}}>
                    <span style={{fontFamily:mono,fontSize:d.count>0?11:9,fontWeight:700,color:d.count===0?"#d4d4d4":intensity>0.5?"#fff":"#166534"}}>{d.count||"·"}</span>
                  </div>
                  <div style={{fontFamily:mono,fontSize:8,color:"#a3a3a3"}}>{dayLabel}</div>
                </div>;
              });
            })()}
          </div>
        </div>}

        {stats.signupHeatmap&&<div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"16px 20px",marginBottom:24}}>
          <div style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:12}}>signups — last 14 days</div>
          <div style={{display:"flex",gap:4}}>
            {(()=>{
              const maxC=Math.max(...stats.signupHeatmap.map(d=>d.count),1);
              return stats.signupHeatmap.map(d=>{
                const intensity=d.count/maxC;
                const bg=d.count===0?"#f5f5f5":`rgba(124,58,237,${0.15+intensity*0.85})`;
                const dayLabel=new Date(d.date+'T12:00:00').toLocaleDateString('en-US',{weekday:'narrow'});
                const dateLabel=new Date(d.date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});
                return<div key={d.date} style={{flex:1,textAlign:"center"}} title={`${dateLabel}: ${d.count} signups`}>
                  <div style={{height:36,background:bg,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:3}}>
                    <span style={{fontFamily:mono,fontSize:d.count>0?11:9,fontWeight:700,color:d.count===0?"#d4d4d4":intensity>0.5?"#fff":"#5b21b6"}}>{d.count||"·"}</span>
                  </div>
                  <div style={{fontFamily:mono,fontSize:8,color:"#a3a3a3"}}>{dayLabel}</div>
                </div>;
              });
            })()}
          </div>
        </div>}

        {stats.anonSessionHeatmap&&<div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"16px 20px",marginBottom:24}}>
          <div style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:12}}>anonymous visits — last 14 days</div>
          <div style={{display:"flex",gap:4}}>
            {(()=>{
              const maxC=Math.max(...stats.anonSessionHeatmap.map(d=>d.count),1);
              return stats.anonSessionHeatmap.map(d=>{
                const intensity=d.count/maxC;
                const bg=d.count===0?"#f5f5f5":`rgba(249,115,22,${0.15+intensity*0.85})`;
                const dayLabel=new Date(d.date+'T12:00:00').toLocaleDateString('en-US',{weekday:'narrow'});
                const dateLabel=new Date(d.date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});
                return<div key={d.date} style={{flex:1,textAlign:"center"}} title={`${dateLabel}: ${d.count} sessions`}>
                  <div style={{height:36,background:bg,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:3}}>
                    <span style={{fontFamily:mono,fontSize:d.count>0?11:9,fontWeight:700,color:d.count===0?"#d4d4d4":intensity>0.5?"#fff":"#9a3412"}}>{d.count||"·"}</span>
                  </div>
                  <div style={{fontFamily:mono,fontSize:8,color:"#a3a3a3"}}>{dayLabel}</div>
                </div>;
              });
            })()}
          </div>
        </div>}

        {/* Guest Activity + Signup Flows — side by side */}
        <div className="admin-2col">
          <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"16px 20px"}}>
            <div style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:10}}>guest activity (all-time)</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {[["Mocks Started",stats.guestMocksStarted,"#737373"],["Mocks Completed",stats.guestMocksCompleted,"#525252"],["Shares",stats.guestShares,"#22c55e"]].map(([l,v,c])=>(
                <div key={l} style={{padding:"6px 12px",background:"#f9f9f7",borderRadius:6,textAlign:"center",minWidth:80}}>
                  <div style={{fontFamily:font,fontSize:18,fontWeight:900,color:c}}>{v}</div>
                  <div style={{fontFamily:mono,fontSize:8,color:"#a3a3a3"}}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{fontFamily:mono,fontSize:9,color:"#a3a3a3",marginTop:8}}>{stats.guestMocksWeek} guest mocks this week</div>
            {stats.guestTopTeams?.length>0&&<div style={{marginTop:8}}>
              <div style={{fontFamily:mono,fontSize:8,color:"#a3a3a3",marginBottom:4}}>popular guest teams</div>
              <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                {stats.guestTopTeams.map(([team,count])=>(
                  <span key={team} style={{fontFamily:mono,fontSize:9,padding:"2px 6px",background:"#f5f5f5",borderRadius:4,color:"#525252"}}>{team} ({count})</span>
                ))}
              </div>
            </div>}
          </div>
          <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"16px 20px"}}>
            <div style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:10}}>signup flows (all-time)</div>
            {Object.keys(stats.signupFlows||{}).length>0?<div style={{display:"flex",flexDirection:"column",gap:6}}>
              {Object.entries(stats.signupFlows).sort((a,b)=>b[1]-a[1]).map(([flow,count])=>{
                const total=Object.values(stats.signupFlows).reduce((s,v)=>s+v,0);
                const pct=total>0?Math.round(count/total*100):0;
                return<div key={flow} style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                      <span style={{fontFamily:sans,fontSize:12,fontWeight:600,color:"#171717"}}>{flow}</span>
                      <span style={{fontFamily:mono,fontSize:11,color:"#525252"}}>{count} <span style={{fontSize:9,color:"#a3a3a3"}}>{pct}%</span></span>
                    </div>
                    <div style={{height:4,background:"#f5f5f5",borderRadius:99,overflow:"hidden"}}>
                      <div style={{height:"100%",width:pct+"%",background:"#8b5cf6",borderRadius:99}}/>
                    </div>
                  </div>
                </div>;
              })}
            </div>:<div style={{fontFamily:sans,fontSize:12,color:"#a3a3a3"}}>no signup events tracked yet</div>}
          </div>
        </div>

        {/* SECTION 4: Engagement Breakdown — two panels */}
        <div className="admin-2col">
          {/* Left: Positions Ranked */}
          <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"16px 20px"}}>
            <div style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:10}}>positions ranked <span style={{color:"#d4d4d4"}}>of {stats.totalUsers} users</span></div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {POSITION_GROUPS.map(pos=>{
                const full=stats.posStats[pos]||0;
                const partial=stats.partialCount[pos]||0;
                const c=POS_COLORS[pos];
                return<div key={pos} style={{textAlign:"center",padding:"6px 10px",background:`${c}08`,borderRadius:6,minWidth:55}}>
                  <div style={{fontFamily:font,fontSize:13,fontWeight:900,color:c}}>{pos}</div>
                  <div style={{fontFamily:mono,fontSize:13,fontWeight:900,color:"#171717"}}>{full}{partial>0&&<span style={{fontSize:10,color:"#ca8a04"}}>+{partial}</span>}</div>
                </div>;
              })}
            </div>
          </div>
          {/* Right: Feature Usage */}
          <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"16px 20px"}}>
            <div style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:10}}>feature usage (all-time)</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {(()=>{const rate=stats.rankingsStarted>0?Math.round(stats.rankingsCompleted/stats.rankingsStarted*100):0;
                return<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 10px",background:"#f9f9f7",borderRadius:6}}>
                  <span style={{fontFamily:sans,fontSize:12,fontWeight:600,color:"#171717"}}>Rankings</span>
                  <span style={{fontFamily:mono,fontSize:11,color:"#3b82f6"}}>{stats.rankingsCompleted} <span style={{color:"#a3a3a3",fontSize:10}}>completed</span> / {stats.rankingsStarted} <span style={{color:"#a3a3a3",fontSize:10}}>started</span> <span style={{fontWeight:700,color:"#3b82f6"}}>{rate}%</span></span>
                </div>;
              })()}
              {(()=>{const rate=stats.mocksStarted>0?Math.round(stats.mocksCompleted/stats.mocksStarted*100):0;
                return<div style={{padding:"6px 10px",background:"#f9f9f7",borderRadius:6}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontFamily:sans,fontSize:12,fontWeight:600,color:"#171717"}}>Mocks</span>
                    <span style={{fontFamily:mono,fontSize:11,color:"#f59e0b"}}>{stats.mocksCompleted} <span style={{color:"#a3a3a3",fontSize:10}}>completed</span> / {stats.mocksStarted} <span style={{color:"#a3a3a3",fontSize:10}}>started</span> <span style={{fontWeight:700,color:"#f59e0b"}}>{rate}%</span></span>
                  </div>
                  <div style={{fontFamily:mono,fontSize:10,color:"#a3a3a3",marginTop:3,textAlign:"right"}}>{stats.singleTeamMocks} <span style={{fontSize:9}}>1-team</span> · {stats.multiTeamMocks-stats.allTeamMocks} <span style={{fontSize:9}}>multi</span> · {stats.allTeamMocks} <span style={{fontSize:9}}>32-team</span></div>
                </div>;
              })()}
              {stats.shareByType&&Object.keys(stats.shareByType).length>0&&<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 10px",background:"#f9f9f7",borderRadius:6}}>
                <span style={{fontFamily:sans,fontSize:12,fontWeight:600,color:"#171717"}}>Share Breakdown</span>
                <span style={{fontFamily:mono,fontSize:11,color:"#22c55e"}}>{Object.entries(stats.shareByType).sort((a,b)=>b[1]-a[1]).map(([t,c])=><span key={t}>{c} <span style={{color:"#a3a3a3",fontSize:10}}>{t.replace(/_/g,' ')}</span></span>).reduce((a,b)=>[a,' · ',b])}</span>
              </div>}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 10px",background:"#f9f9f7",borderRadius:6}}>
                <span style={{fontFamily:sans,fontSize:12,fontWeight:600,color:"#171717"}}>Notes Written</span>
                <span style={{fontFamily:mono,fontSize:11,color:"#8b5cf6"}}>{stats.noteUsers} <span style={{color:"#a3a3a3",fontSize:10}}>users</span></span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 10px",background:"#f9f9f7",borderRadius:6}}>
                <span style={{fontFamily:sans,fontSize:12,fontWeight:600,color:"#171717"}}>Community Boards</span>
                <span style={{fontFamily:mono,fontSize:11,color:"#171717"}}>{stats.communityUsers} <span style={{color:"#a3a3a3",fontSize:10}}>published</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* All Events — compact pills */}
        <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"16px 20px",marginBottom:24}}>
          <div style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:10}}>all events by type (all-time)</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {Object.entries(displayEventCounts.counts||{}).sort((a,b)=>b[1]-a[1]).map(([evt,count])=>{
              const uu=displayEventCounts.unique?.[evt]?.size||0;
              return<div key={evt} style={{padding:"5px 10px",background:"#f9f9f7",borderRadius:6,textAlign:"center",minWidth:70}}>
                <div style={{fontFamily:mono,fontSize:14,fontWeight:900,color:"#171717"}}>{count}<span style={{fontSize:9,fontWeight:400,color:"#a3a3a3",marginLeft:3}}>{uu}u</span></div>
                <div style={{fontFamily:mono,fontSize:7,color:"#a3a3a3"}}>{evt.replace(/_/g,' ')}</div>
              </div>;
            })}
          </div>
        </div>

        {/* Feature & Page Popularity */}
        {(()=>{
          const features=[
            {label:'Profile Drawer Opens',evt:'profile_opened',color:'#8b5cf6'},
            {label:'Data Lab Opened',evt:'explorer_opened',color:'#06b6d4'},
            {label:'R1 Predictor Started',evt:'round1_prediction_started',color:'#f59e0b'},
            {label:'R1 Predictor CTA Click',evt:'round1_prediction_cta_click',color:'#fbbf24'},
            {label:'Guide Views',evt:'guide_viewed',color:'#22c55e'},
            {label:'R1 Share',evt:'round1_prediction_share',color:'#10b981'},
          ].map(f=>({...f,count:stats.eventCounts[f.evt]||0,users:stats.uniqueEventUsers[f.evt]?.size||0})).filter(f=>f.count>0).sort((a,b)=>b.count-a.count);
          const pageViewCount=stats.eventCounts['page_view']||0;
          const pageViewUsers=stats.uniqueEventUsers['page_view']?.size||0;
          if(features.length===0&&pageViewCount===0)return null;
          const maxCount=Math.max(...features.map(f=>f.count),pageViewCount,1);
          return<div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"16px 20px",marginBottom:24}}>
            <div style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:12}}>feature & page usage</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {pageViewCount>0&&<div>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                  <span style={{fontFamily:sans,fontSize:12,fontWeight:600,color:"#171717"}}>Page Views (all routes)</span>
                  <span style={{fontFamily:mono,fontSize:11,color:"#3b82f6"}}>{pageViewCount} <span style={{fontSize:9,color:"#a3a3a3"}}>{pageViewUsers}u</span></span>
                </div>
                <div style={{height:4,background:"#f5f5f5",borderRadius:99,overflow:"hidden"}}><div style={{height:"100%",width:Math.round(pageViewCount/maxCount*100)+"%",background:"#3b82f6",borderRadius:99}}/></div>
              </div>}
              {features.map(f=><div key={f.evt}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                  <span style={{fontFamily:sans,fontSize:12,fontWeight:600,color:"#171717"}}>{f.label}</span>
                  <span style={{fontFamily:mono,fontSize:11,color:f.color}}>{f.count} <span style={{fontSize:9,color:"#a3a3a3"}}>{f.users}u</span></span>
                </div>
                <div style={{height:4,background:"#f5f5f5",borderRadius:99,overflow:"hidden"}}><div style={{height:"100%",width:Math.round(f.count/maxCount*100)+"%",background:f.color,borderRadius:99}}/></div>
              </div>)}
            </div>
          </div>;
        })()}

        {/* SECTION 5: Users Table */}
        <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,overflow:"hidden",marginBottom:24}}>
          <div style={{padding:"14px 16px",borderBottom:"1px solid #f0f0f0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontFamily:font,fontSize:18,fontWeight:900,color:"#171717"}}>users ({users.filter(u=>!u.isAnon).length})</span>
            <span style={{fontFamily:mono,fontSize:9,color:"#a3a3a3"}}>{users.filter(u=>tagUser(u).label==="power user").length} power · {users.filter(u=>tagUser(u).label==="drafter").length} drafters · {users.filter(u=>tagUser(u).label==="ranker").length} rankers</span>
          </div>
          <div className="admin-table-head" style={{padding:"8px 16px",background:"#f9f9f7",borderBottom:"1px solid #e5e5e5"}}>
            {["Email","Status","Ranked","Activity"].map(h=><span key={h} style={{fontFamily:mono,fontSize:8,letterSpacing:1,color:"#a3a3a3",textTransform:"uppercase"}}>{h}</span>)}
            <span className="admin-table-hide" style={{fontFamily:mono,fontSize:8,letterSpacing:1,color:"#a3a3a3",textTransform:"uppercase"}}>Last Active</span>
          </div>
          <div style={{maxHeight:500,overflowY:"auto"}}>
            {users.map((u,i)=>{
              const tag=tagUser(u);
              const isExp=expandedUser===u.userId;
              return<div key={u.userId}>
                <div className="admin-table-row" onClick={()=>setExpandedUser(isExp?null:u.userId)} style={{padding:"7px 16px",borderBottom:isExp?"none":i<users.length-1?"1px solid #f8f8f6":"none",alignItems:"center",cursor:"pointer"}}>
                  <span style={{fontFamily:mono,fontSize:10,color:"#525252",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.email||u.userId.slice(0,12)+'…'}</span>
                  <span style={{fontFamily:mono,fontSize:8,fontWeight:700,color:tag.color,background:tag.bg,padding:"2px 6px",borderRadius:4,textAlign:"center"}}>{tag.label}</span>
                  <span style={{fontFamily:mono,fontSize:11,fontWeight:700,color:u.rankedPositions>0?"#22c55e":"#e5e5e5",textAlign:"center"}}>{u.rankedPositions}/{POSITION_GROUPS.length}</span>
                  <span style={{fontFamily:mono,fontSize:11,fontWeight:700,textAlign:"center"}}><span style={{color:u.mockCount>0?"#f59e0b":"#e5e5e5"}}>{u.mockCount}m</span> <span style={{color:u.rankedPositions>0?"#3b82f6":"#e5e5e5"}}>{u.rankedPositions}r</span>{u.eventCount>0&&<span style={{fontSize:9,color:"#d4d4d4",marginLeft:2}}>{u.eventCount}e</span>}</span>
                  <span className="admin-table-hide" style={{fontFamily:mono,fontSize:9,color:"#a3a3a3"}}>{u.updatedAt?new Date(u.updatedAt).toLocaleDateString('en-US',{month:'short',day:'numeric'})+" "+new Date(u.updatedAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):""}</span>
                </div>
                {isExp&&(()=>{
                  const userEvtList=(computed?.allEventsRaw||[]).filter(e=>u.isAnon?(e.user_id===null||e.user_id===undefined||e.metadata?.guest===true):e.user_id===u.userId);
                  const ue={};userEvtList.forEach(e=>{ue[e.event]=(ue[e.event]||0)+1;});
                  const evtColor=ev=>ev==='signup'||ev==='login'?"#22c55e":ev.includes('mock_draft')?"#f59e0b":ev.includes('ranking')?"#3b82f6":ev.includes('share')?"#22c55e":ev==='session_return'?"#a3a3a3":"#8b5cf6";
                  return<div style={{padding:"8px 16px 12px",background:"#f9f9f7",borderBottom:i<users.length-1?"1px solid #e5e5e5":"none"}}>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
                    {Object.entries(ue).sort((a,b)=>b[1]-a[1]).map(([evt,count])=><div key={evt} style={{padding:"4px 8px",background:"#fff",borderRadius:6,textAlign:"center",minWidth:50,border:"1px solid #e5e5e5"}}>
                      <div style={{fontFamily:mono,fontSize:13,fontWeight:900,color:evtColor(evt)}}>{count}</div>
                      <div style={{fontFamily:mono,fontSize:7,color:"#a3a3a3"}}>{evt.replace(/_/g,' ')}</div>
                    </div>)}
                    {u.noteCount>0&&<div style={{padding:"4px 8px",background:"#fff",borderRadius:6,textAlign:"center",minWidth:50,border:"1px solid #e5e5e5"}}>
                      <div style={{fontFamily:mono,fontSize:13,fontWeight:900,color:"#8b5cf6"}}>{u.noteCount}</div>
                      <div style={{fontFamily:mono,fontSize:7,color:"#a3a3a3"}}>notes</div>
                    </div>}
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:6}}>
                    {u.rankedGroups.length>0&&<div style={{display:"flex",alignItems:"center",gap:4,flexWrap:"wrap"}}>
                      <span style={{fontFamily:mono,fontSize:8,color:"#a3a3a3"}}>ranked:</span>
                      {u.rankedGroups.map(pos=><span key={pos} style={{fontFamily:mono,fontSize:9,fontWeight:700,color:POS_COLORS[pos]||"#525252",background:`${POS_COLORS[pos]||"#525252"}0d`,padding:"1px 5px",borderRadius:3}}>{pos}</span>)}
                    </div>}
                    {u.partialGroups.length>0&&<div style={{display:"flex",alignItems:"center",gap:4,flexWrap:"wrap"}}>
                      <span style={{fontFamily:mono,fontSize:8,color:"#a3a3a3"}}>in progress:</span>
                      {u.partialGroups.map(pos=><span key={pos} style={{fontFamily:mono,fontSize:9,color:"#ca8a04",background:"#fefce8",padding:"1px 5px",borderRadius:3}}>{pos}</span>)}
                    </div>}
                  </div>
                  <div style={{display:"flex",gap:12,fontFamily:mono,fontSize:9,color:"#a3a3a3"}}>
                    <span>{u.isAnon?"first seen":"signed up"} {u.createdAt?new Date(u.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):""}</span>
                    <span>last active {u.updatedAt?new Date(u.updatedAt).toLocaleDateString('en-US',{month:'short',day:'numeric'})+" "+new Date(u.updatedAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):""}</span>
                  </div>
                  {userEvtList.length>0&&<div style={{marginTop:8,borderTop:"1px solid #f0f0f0",paddingTop:8}}>
                    <div style={{fontFamily:mono,fontSize:8,color:"#a3a3a3",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>recent activity</div>
                    <div style={{display:"flex",flexDirection:"column",gap:2}}>
                      {userEvtList.slice(0,12).map((e,ei)=>{
                        const metaPairs=e.metadata?Object.entries(e.metadata).filter(([k,v])=>v!=null&&v!==false&&v!=='').map(([k,v])=>`${k}: ${v}`).join(' · '):'';
                        return<div key={ei} style={{display:"flex",gap:6,alignItems:"baseline"}}>
                          <span style={{fontFamily:mono,fontSize:8,color:"#d4d4d4",whiteSpace:"nowrap",minWidth:50}}>{new Date(e.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span>
                          <span style={{fontFamily:mono,fontSize:9,fontWeight:700,color:evtColor(e.event)}}>{e.event.replace(/_/g,' ')}</span>
                          {metaPairs&&<span style={{fontFamily:mono,fontSize:8,color:"#a3a3a3",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{metaPairs}</span>}
                        </div>;
                      })}
                      {userEvtList.length>12&&<div style={{fontFamily:mono,fontSize:8,color:"#d4d4d4"}}>+{userEvtList.length-12} more events</div>}
                    </div>
                  </div>}
                </div>})()}
              </div>;
            })}
          </div>
        </div>

        {/* SECTION 6: Recent Events — collapsible */}
        <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,overflow:"hidden"}}>
          <div style={{padding:"14px 16px",borderBottom:showEventLog?"1px solid #f0f0f0":"none",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}} onClick={()=>setShowEventLog(v=>!v)}>
            <span style={{fontFamily:font,fontSize:18,fontWeight:900,color:"#171717"}}>event log</span>
            <button style={{fontFamily:mono,fontSize:10,color:"#a3a3a3",background:"#f5f5f5",border:"1px solid #e5e5e5",borderRadius:6,padding:"4px 10px",cursor:"pointer"}}>{showEventLog?"hide":"show"}</button>
          </div>
          {showEventLog&&<div style={{maxHeight:350,overflowY:"auto"}}>
            {displayEvents.map((e,i)=>{
              const evtColor=e.event==='signup'?"#22c55e":e.event.includes('mock_draft')?"#f59e0b":e.event==='ranking_completed'?"#3b82f6":e.event==='ranking_started'?"#8b5cf6":e.event==='share_results'?"#22c55e":"#a3a3a3";
              const eu=users.find(u=>u.userId===e.user_id);
              return<div key={e.id} className="admin-event-row" style={{padding:"5px 16px",borderBottom:i<displayEvents.length-1?"1px solid #fafaf8":"none",fontSize:10,fontFamily:mono,alignItems:"center"}}>
                <span style={{color:evtColor,fontWeight:700}}>{e.event.replace(/_/g,' ')}</span>
                <span style={{color:"#525252",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{eu?.email||e.session_id||e.user_id?.slice(0,12)+'…'}</span>
                <span className="admin-event-meta" style={{color:"#a3a3a3",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.metadata&&Object.keys(e.metadata).length>0?JSON.stringify(e.metadata):""}</span>
                <span style={{color:"#d4d4d4"}}>{new Date(e.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric'})} {new Date(e.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>
              </div>;
            })}
          </div>}
        </div>

        {/* SECTION 7: Content Ideas — Tweet Engine */}
        <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,overflow:"hidden",marginTop:12}}>
          <div style={{padding:"14px 16px",borderBottom:"1px solid #f0f0f0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontFamily:font,fontSize:18,fontWeight:900,color:"#171717"}}>content ideas</span>
            <button onClick={()=>{const{cards:c,newLastCategories:nl}=generateTweetCards(lastTweetCategories,tweetHistorical);setTweetCards(c);setLastTweetCategories(nl);setTweetCopied(null);}} disabled={!tweetHistorical} style={{fontFamily:mono,fontSize:10,color:tweetHistorical?"#fff":"#a3a3a3",background:tweetHistorical?"#171717":"#e5e5e5",border:"none",borderRadius:6,padding:"6px 14px",cursor:tweetHistorical?"pointer":"default",fontWeight:700}}>{tweetHistorical?(tweetCards.length?"regenerate":"generate"):"loading data..."}</button>
          </div>
          {tweetCards.length>0&&<div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:12}}>
            {tweetCards.map((card,i)=>{const cat=card.catMeta;return<div key={i} style={{border:"1px solid #e5e5e5",borderRadius:10,overflow:"hidden"}}>
              <div style={{padding:"10px 14px",display:"flex",alignItems:"center",gap:8,borderBottom:"1px solid #f5f5f5",background:"#faf9f6"}}>
                <span style={{fontFamily:mono,fontSize:9,fontWeight:700,color:"#fff",background:cat.color,borderRadius:99,padding:"2px 8px",textTransform:"uppercase",letterSpacing:0.5}}>{cat.label}</span>
                <span style={{fontSize:12}} title={`Spice level ${card.spice}/5`}>{"🔥".repeat(card.spice)}</span>
                {cat.tier===1&&<span style={{fontFamily:mono,fontSize:8,color:"#a3a3a3",marginLeft:"auto"}}>TIER 1</span>}
                {cat.tier===2&&<span style={{fontFamily:mono,fontSize:8,color:"#d4d4d4",marginLeft:"auto"}}>TIER 2</span>}
              </div>
              <div style={{padding:"12px 14px"}}>
                <div style={{fontFamily:sans,fontSize:13,color:"#171717",lineHeight:1.5,whiteSpace:"pre-wrap",marginBottom:8}}>{card.tweet}</div>
                <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
                  <button onClick={()=>{navigator.clipboard.writeText(card.tweet).then(()=>{setTweetCopied(i);setTimeout(()=>setTweetCopied(null),2000);});}} style={{fontFamily:mono,fontSize:9,color:tweetCopied===i?"#22c55e":"#525252",background:tweetCopied===i?"#f0fdf4":"#f5f5f5",border:`1px solid ${tweetCopied===i?"#bbf7d0":"#e5e5e5"}`,borderRadius:6,padding:"4px 10px",cursor:"pointer",fontWeight:600}}>{tweetCopied===i?"copied!":"copy"}</button>
                  <span style={{fontFamily:mono,fontSize:9,color:card.tweet.length>240?"#dc2626":"#a3a3a3"}}>{card.tweet.length}/240</span>
                </div>
                <div style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:6,padding:"8px 10px",marginBottom:6}}>
                  <div style={{fontFamily:mono,fontSize:9,color:"#64748b",fontWeight:700,marginBottom:2,textTransform:"uppercase"}}>screenshot</div>
                  <div style={{fontFamily:sans,fontSize:11,color:"#334155"}}>{card.image}</div>
                </div>
                <div style={{fontFamily:sans,fontSize:11,color:"#737373",fontStyle:"italic"}}>{card.hook}</div>
              </div>
            </div>;})}
          </div>}
        </div>

        {/* SECTION 8: Player Spotlight — best combo finder */}
        <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,marginTop:12}}>
          <div style={{padding:"14px 16px",borderBottom:"1px solid #f0f0f0"}}>
            <div style={{fontFamily:font,fontSize:18,fontWeight:900,color:"#171717",marginBottom:4}}>player spotlight</div>
            <div style={{fontFamily:mono,fontSize:10,color:"#a3a3a3"}}>find the best combo chart pairings for a player — skip self-correlated axes</div>
          </div>
          <div style={{padding:"16px 20px"}}>
            {/* Search input */}
            <div style={{position:"relative",marginBottom:16}}>
              <input
                value={spotlightQuery}
                onChange={e=>{
                  const q=e.target.value;
                  setSpotlightQuery(q);
                  setSpotlightPlayer(null);
                  setSpotlightResults([]);
                  if(q.length<2){setSpotlightSuggestions([]);return;}
                  const ql=q.toLowerCase();
                  setSpotlightSuggestions(PROSPECTS.filter(p=>p.name.toLowerCase().includes(ql)).slice(0,8));
                }}
                placeholder="Type a player name..."
                style={{width:"100%",fontFamily:sans,fontSize:14,padding:"10px 14px",border:"1px solid #e5e5e5",borderRadius:8,outline:"none",boxSizing:"border-box",background:"#fafaf8",color:"#171717"}}
              />
              {spotlightSuggestions.length>0&&!spotlightPlayer&&(
                <div style={{position:"absolute",top:"100%",left:0,right:0,background:"#fff",border:"1px solid #e5e5e5",borderRadius:8,boxShadow:"0 4px 16px rgba(0,0,0,0.08)",zIndex:100,overflow:"hidden",marginTop:2}}>
                  {spotlightSuggestions.map(p=>(
                    <div key={p.id} onClick={()=>{
                      setSpotlightQuery(p.name);
                      setSpotlightPlayer(p);
                      setSpotlightSuggestions([]);
                      setSpotlightResults(computeSpotlightCombos(p));
                    }} style={{padding:"10px 14px",cursor:"pointer",borderBottom:"1px solid #f5f5f5",display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontFamily:mono,fontSize:10,fontWeight:700,color:POS_COLORS[p.gpos||p.pos]||"#525252",background:`${POS_COLORS[p.gpos||p.pos]||"#525252"}15`,padding:"2px 6px",borderRadius:3,minWidth:32,textAlign:"center"}}>{p.gpos||p.pos}</span>
                      <span style={{fontFamily:sans,fontSize:13,fontWeight:600,color:"#171717"}}>{p.name}</span>
                      <span style={{fontFamily:mono,fontSize:10,color:"#a3a3a3"}}>{p.school}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Results */}
            {spotlightPlayer&&spotlightResults.length>0&&(
              <div>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
                  <span style={{fontFamily:sans,fontSize:16,fontWeight:800,color:"#171717"}}>{spotlightPlayer.name}</span>
                  <span style={{fontFamily:mono,fontSize:10,fontWeight:700,color:POS_COLORS[spotlightPlayer.gpos||spotlightPlayer.pos]||"#525252",background:`${POS_COLORS[spotlightPlayer.gpos||spotlightPlayer.pos]||"#525252"}15`,padding:"3px 8px",borderRadius:4}}>{spotlightPlayer.gpos||spotlightPlayer.pos}</span>
                  <span style={{fontFamily:mono,fontSize:10,color:"#a3a3a3"}}>{spotlightPlayer.school}</span>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {spotlightResults.map((combo,i)=>{
                    const xCat=COMBO_CAT_STYLE[combo.xMeta?.cat]||{label:"?",color:"#a3a3a3"};
                    const yCat=COMBO_CAT_STYLE[combo.yMeta?.cat]||{label:"?",color:"#a3a3a3"};
                    const pos=spotlightPlayer.gpos||spotlightPlayer.pos;
                    return<div key={i} style={{border:"1px solid #e5e5e5",borderRadius:10,padding:"12px 14px",background:i===0?"#fffbeb":"#fafaf8"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                        <span style={{fontFamily:mono,fontSize:11,fontWeight:900,color:"#a3a3a3"}}>#{i+1}</span>
                        <span style={{fontFamily:mono,fontSize:11,fontWeight:700,color:"#171717"}}>score {Math.round(combo.score)}th pctile avg</span>
                        {i===0&&<span style={{fontFamily:mono,fontSize:9,fontWeight:700,color:"#d97706",background:"#fef3c7",padding:"2px 6px",borderRadius:4,marginLeft:"auto"}}>BEST</span>}
                        <button onClick={()=>window.open(`/lab/combo?pos=${encodeURIComponent(pos)}&x=${encodeURIComponent(combo.xKey)}&y=${encodeURIComponent(combo.yKey)}&player=${encodeURIComponent(spotlightPlayer.name)}&logos=1`,'_blank')} style={{fontFamily:mono,fontSize:9,color:"#3b82f6",background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:6,padding:"3px 8px",cursor:"pointer",fontWeight:600,marginLeft:i===0?"0":"auto"}}>open in lab ↗</button>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                        {[{axis:"X",meta:combo.xMeta,pct:combo.xPct,val:combo.xVal,cat:xCat},{axis:"Y",meta:combo.yMeta,pct:combo.yPct,val:combo.yVal,cat:yCat}].map(({axis,meta,pct,val,cat})=>(
                          <div key={axis} style={{background:"#fff",borderRadius:8,padding:"10px 12px",border:"1px solid #f0f0f0"}}>
                            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                              <span style={{fontFamily:mono,fontSize:8,color:"#a3a3a3"}}>{axis}-axis</span>
                              <span style={{fontFamily:mono,fontSize:8,fontWeight:700,color:"#fff",background:cat.color,padding:"1px 5px",borderRadius:3}}>{cat.label}</span>
                            </div>
                            <div style={{fontFamily:sans,fontSize:13,fontWeight:700,color:"#171717",marginBottom:6}}>{meta?.label}</div>
                            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                              <div style={{flex:1,height:6,background:"#f0f0f0",borderRadius:99,overflow:"hidden"}}>
                                <div style={{height:"100%",width:Math.round(pct)+"%",background:pct>=80?"#22c55e":pct>=60?"#f59e0b":"#e5e5e5",borderRadius:99}}/>
                              </div>
                              <span style={{fontFamily:mono,fontSize:12,fontWeight:900,color:pct>=80?"#22c55e":pct>=60?"#f59e0b":"#a3a3a3",minWidth:36,textAlign:"right"}}>{Math.round(pct)}th</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>;
                  })}
                </div>
              </div>
            )}
            {spotlightPlayer&&spotlightResults.length===0&&(
              <div style={{fontFamily:mono,fontSize:12,color:"#a3a3a3",textAlign:"center",padding:"20px 0"}}>not enough data to rank combos for this player</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Admin Grades — baseline trait & ceiling editor
// ============================================================
function AdminGrades({onBack,onSave}){
  const NAME_ALIASES={"marquarius white":"squirrel white"};
  const normName=(name)=>{const n=name.toLowerCase().replace(/\./g,"").replace(/\s+(jr|sr|ii|iii|iv|v)\s*$/i,"").replace(/\s+/g," ").trim();return NAME_ALIASES[n]||n;};
  const scoutKey=(name,school)=>{
    const n=normName(name);const k=n+"|"+school.toLowerCase().replace(/\s+/g," ").trim();
    if(SCOUTING_RAW[k])return k;
    for(const key in SCOUTING_RAW){if(key.startsWith(n+"|"))return key;}
    return k; // fallback to constructed key even if missing
  };

  // Grade math (mirrors gradeFromTraits in DraftBoard)
  const rawGrade=(traitObj,pos)=>{
    const weights=TRAIT_WEIGHTS[pos]||TRAIT_WEIGHTS["QB"];const posTraits=POSITION_TRAITS[pos]||[];
    let totalW=0,totalV=0;posTraits.forEach(t=>{const w=weights[t]||1/posTraits.length;const v=traitObj[t]??50;totalW+=w;totalV+=v*w;});
    return totalW>0?totalV/totalW:50;
  };
  const remapGrade=(raw)=>{
    if(raw>=90)return Math.min(99,Math.round(raw));
    if(raw>=80)return Math.round(70+(raw-80)*2);
    if(raw>=70)return Math.round(50+(raw-70)*2);
    return Math.max(1,Math.round(30+(raw-60)*2));
  };
  const inverseRemap=(grade)=>{
    if(grade>=90)return grade;
    if(grade>=70)return 80+(grade-70)/2;
    if(grade>=50)return 70+(grade-50)/2;
    return 60+(grade-30)/2;
  };
  const applyCeiling=(grade,traitObj,pos,ceil)=>{
    if(!ceil||ceil==="normal")return grade;
    const weights=TRAIT_WEIGHTS[pos]||TRAIT_WEIGHTS["QB"];const posTraits=POSITION_TRAITS[pos]||[];
    let rawW=0,rawV=0;posTraits.forEach(t=>{const teach=TRAIT_TEACHABILITY[t]??0.5;if(teach<0.4){const w=weights[t]||1/posTraits.length;rawW+=w;rawV+=(traitObj[t]||50)*w;}});
    const rawScore=rawW>0?rawV/rawW:grade;const gap=rawScore-grade;
    if(ceil==="high")return Math.max(1,Math.min(99,Math.round(grade+Math.max(gap*0.5,0)+4)));
    if(ceil==="elite")return Math.max(1,Math.min(99,Math.round(grade+Math.max(gap*0.7,0)+7)));
    if(ceil==="capped")return Math.max(1,Math.min(99,Math.round(grade-Math.max(-gap*0.3,0)-3)));
    return grade;
  };
  const fullGrade=(traitObj,pos,ceil)=>{
    const g=remapGrade(rawGrade(traitObj,pos));
    return applyCeiling(g,traitObj,pos,ceil);
  };

  // Build prospect list with scouting keys
  const prospectList=useMemo(()=>PROSPECTS.map(p=>{
    const pos=p.gpos||p.pos;const key=scoutKey(p.name,p.school);
    const base=SCOUTING_RAW[key]||{};const posTraits=POSITION_TRAITS[pos]||[];
    // Only include prospects that have scouting data
    if(!posTraits.some(t=>base[t]!=null))return null;
    const baseCeil=base.__ceiling||"normal";
    const baseGrade=fullGrade(base,pos,baseCeil);
    return{...p,pos,key,baseTraits:base,baseCeil,baseGrade};
  }).filter(Boolean),[]);

  const[search,setSearch]=useState("");
  const[posFilter,setPosFilter]=useState("ALL");
  const[sortBy,setSortBy]=useState("grade");
  const[sortDir,setSortDir]=useState(-1);
  const[editKey,setEditKey]=useState(null);
  const[pendingEdits,setPendingEdits]=useState({}); // {scoutKey: {traits:{...}, ceiling:"..."}}
  const[saveStatus,setSaveStatus]=useState("idle");
  const[savedOverrides,setSavedOverrides]=useState({}); // what's currently in Supabase

  // Load existing admin overrides from Supabase on mount
  useEffect(()=>{supabase.from('admin_overrides').select('overrides').eq('id',1).single().then(({data})=>{
    if(data?.overrides&&Object.keys(data.overrides).length){setSavedOverrides(data.overrides);setPendingEdits(data.overrides);}
  });},[]);

  const positions=useMemo(()=>{const s=new Set();prospectList.forEach(p=>s.add(p.pos));return["ALL",...[...s].sort()];},[prospectList]);

  const filtered=useMemo(()=>{
    let list=prospectList;
    if(search){const q=search.toLowerCase();list=list.filter(p=>p.name.toLowerCase().includes(q));}
    if(posFilter!=="ALL")list=list.filter(p=>p.pos===posFilter);
    list=[...list];
    const getEditedGrade=(p)=>{const ed=pendingEdits[p.key];if(!ed)return p.baseGrade;const merged={...p.baseTraits,...(ed.traits||{})};const ceil=ed.ceiling||p.baseCeil;return fullGrade(merged,p.pos,ceil);};
    if(sortBy==="name")list.sort((a,b)=>sortDir*a.name.localeCompare(b.name));
    else if(sortBy==="pos")list.sort((a,b)=>sortDir*a.pos.localeCompare(b.pos));
    else if(sortBy==="grade")list.sort((a,b)=>sortDir*(getEditedGrade(a)-getEditedGrade(b)));
    else if(sortBy==="delta")list.sort((a,b)=>{const da=getEditedGrade(a)-a.baseGrade;const db=getEditedGrade(b)-b.baseGrade;return sortDir*(da-db);});
    return list;
  },[prospectList,search,posFilter,sortBy,sortDir,pendingEdits]);

  const editingPlayer=editKey?prospectList.find(p=>p.key===editKey):null;
  const editData=editKey?pendingEdits[editKey]:null;
  const editTraits=editingPlayer?{...editingPlayer.baseTraits,...(editData?.traits||{})}:null;
  const editCeil=editData?.ceiling||editingPlayer?.baseCeil||"normal";
  const editPos=editingPlayer?.pos;
  const editPosTraits=editPos?POSITION_TRAITS[editPos]||[]:[];
  const editGrade=editingPlayer?fullGrade(editTraits,editPos,editCeil):0;
  const editBaseGrade=editingPlayer?.baseGrade||0;
  const editNarr=editingPlayer?SCOUTING_NARRATIVES[editingPlayer.key]:null;

  const setTrait=(trait,val)=>{
    setPendingEdits(prev=>{const existing=prev[editKey]||{};return{...prev,[editKey]:{...existing,traits:{...(existing.traits||{}),[trait]:val}}};});
  };
  const setCeiling=(ceil)=>{
    setPendingEdits(prev=>{const existing=prev[editKey]||{};return{...prev,[editKey]:{...existing,ceiling:ceil}};});
  };
  const setTargetGrade=(target)=>{
    if(!editingPlayer)return;
    // Compute uniform delta to reach target pre-ceiling grade
    const currentTraits={...editingPlayer.baseTraits,...(editData?.traits||{})};
    const currentRaw=rawGrade(currentTraits,editPos);
    const targetRaw=inverseRemap(target);
    const delta=targetRaw-currentRaw;
    const newTraits={};
    editPosTraits.forEach(t=>{
      const base=editingPlayer.baseTraits[t]??50;
      newTraits[t]=Math.max(1,Math.min(99,Math.round(base+delta)));
    });
    setPendingEdits(prev=>{const existing=prev[editKey]||{};return{...prev,[editKey]:{...existing,traits:newTraits}};});
  };
  const resetPlayer=()=>{
    setPendingEdits(prev=>{const next={...prev};if(savedOverrides[editKey])next[editKey]=savedOverrides[editKey];else delete next[editKey];return next;});
  };

  const hasUnsaved=JSON.stringify(pendingEdits)!==JSON.stringify(savedOverrides);

  const handleSave=async()=>{
    setSaveStatus("saving");
    // Clean up: remove entries with no actual changes from file baseline
    const clean={};
    for(const[key,ed] of Object.entries(pendingEdits)){
      const hasTraits=ed.traits&&Object.keys(ed.traits).length>0;
      const baseCeil=SCOUTING_RAW[key]?.__ceiling||"normal";
      const hasCeilingChange=ed.ceiling&&ed.ceiling!==baseCeil;
      if(hasTraits||hasCeilingChange)clean[key]=ed;
    }
    try{
      console.log('Admin save:',Object.keys(clean).length,'overrides',clean);
      const{data,error}=await supabase.from('admin_overrides').update({overrides:clean,updated_at:new Date().toISOString()}).eq('id',1).select();
      console.log('Admin save result:',{data,error});
      if(error)throw error;
      if(!data||data.length===0)throw new Error('RLS blocked update — 0 rows affected');
      setSavedOverrides(clean);setPendingEdits(clean);
      if(onSave)onSave(clean);
      setSaveStatus("saved");setTimeout(()=>setSaveStatus("idle"),3000);
    }catch(e){console.error('Admin save error:',e);setSaveStatus("error");setTimeout(()=>setSaveStatus("idle"),3000);}
  };

  const gradeColor=(g)=>g>=75?"#22c55e":g>=55?"#f59e0b":"#ef4444";
  const deltaColor=(d)=>d>0?"#22c55e":d<0?"#ef4444":"#a3a3a3";
  const fmtDelta=(d)=>d>0?`+${d}`:d<0?`${d}`:"0";

  const sortHeader=(label,key)=>(
    <span onClick={()=>{if(sortBy===key)setSortDir(d=>-d);else{setSortBy(key);setSortDir(key==="name"||key==="pos"?1:-1);}}} style={{cursor:"pointer",userSelect:"none"}}>
      {label}{sortBy===key?(sortDir>0?" ▲":" ▼"):""}
    </span>
  );

  const ceilTiers=[
    {key:"capped",label:"Capped",color:"#737373"},
    {key:"normal",label:"Normal",color:"#6366f1"},
    {key:"high",label:"High",color:"#f59e0b"},
    {key:"elite",label:"Elite",color:"#8b5cf6"},
  ];

  return(
    <div style={{position:"fixed",inset:0,background:"#faf9f6",zIndex:9000,overflow:"auto",WebkitOverflowScrolling:"touch"}}>
      {/* Top bar */}
      <div style={{position:"sticky",top:0,zIndex:100,background:"#171717",padding:"0 16px",height:44,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={onBack} style={{fontFamily:mono,fontSize:11,color:"#a3a3a3",background:"none",border:"none",cursor:"pointer"}}>← back</button>
          <span style={{fontFamily:mono,fontSize:11,fontWeight:700,color:"#fff",letterSpacing:1}}>ADMIN / GRADES</span>
          <button onClick={()=>{window.location.hash="#admin";}} style={{fontFamily:mono,fontSize:9,color:"#525252",background:"#2a2a2a",border:"1px solid #404040",borderRadius:4,padding:"3px 8px",cursor:"pointer"}}>dashboard</button>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          {hasUnsaved&&<span style={{fontFamily:mono,fontSize:10,color:"#f59e0b"}}>unsaved changes</span>}
          {saveStatus==="saved"&&<span style={{fontFamily:mono,fontSize:10,color:"#22c55e"}}>saved!</span>}
          {saveStatus==="error"&&<span style={{fontFamily:mono,fontSize:10,color:"#ef4444"}}>save failed</span>}
          <button onClick={handleSave} disabled={!hasUnsaved||saveStatus==="saving"} style={{fontFamily:mono,fontSize:10,fontWeight:700,color:hasUnsaved?"#fff":"#525252",background:hasUnsaved?"#22c55e":"#2a2a2a",border:"none",borderRadius:6,padding:"6px 14px",cursor:hasUnsaved?"pointer":"default"}}>{saveStatus==="saving"?"saving...":"save"}</button>
        </div>
      </div>

      <div style={{display:"flex",height:"calc(100vh - 44px)"}}>
        {/* Left: prospect list */}
        <div style={{width:editKey?420:undefined,flex:editKey?undefined:1,borderRight:editKey?"1px solid #e5e5e5":"none",display:"flex",flexDirection:"column",minWidth:0}}>
          {/* Filters */}
          <div style={{padding:"12px 16px",borderBottom:"1px solid #e5e5e5",display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name..." style={{fontFamily:sans,fontSize:13,padding:"6px 12px",border:"1px solid #e5e5e5",borderRadius:6,outline:"none",width:180,background:"#fff"}}/>
            <select value={posFilter} onChange={e=>setPosFilter(e.target.value)} style={{fontFamily:mono,fontSize:11,padding:"6px 8px",border:"1px solid #e5e5e5",borderRadius:6,background:"#fff",cursor:"pointer"}}>
              {positions.map(p=><option key={p} value={p}>{p}</option>)}
            </select>
            <span style={{fontFamily:mono,fontSize:10,color:"#a3a3a3",marginLeft:"auto"}}>{filtered.length} prospects</span>
          </div>
          {/* Header */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 50px 50px 50px",gap:4,padding:"6px 16px",borderBottom:"1px solid #f0f0f0",background:"#f9f9f7"}}>
            <span style={{fontFamily:mono,fontSize:8,letterSpacing:1,color:"#a3a3a3",textTransform:"uppercase"}}>{sortHeader("Name","name")}</span>
            <span style={{fontFamily:mono,fontSize:8,letterSpacing:1,color:"#a3a3a3",textTransform:"uppercase",textAlign:"center"}}>{sortHeader("Pos","pos")}</span>
            <span style={{fontFamily:mono,fontSize:8,letterSpacing:1,color:"#a3a3a3",textTransform:"uppercase",textAlign:"center"}}>{sortHeader("Grade","grade")}</span>
            <span style={{fontFamily:mono,fontSize:8,letterSpacing:1,color:"#a3a3a3",textTransform:"uppercase",textAlign:"center"}}>{sortHeader("Δ","delta")}</span>
          </div>
          {/* Rows */}
          <div style={{flex:1,overflowY:"auto"}}>
            {filtered.map(p=>{
              const ed=pendingEdits[p.key];
              const merged=ed?{...p.baseTraits,...(ed.traits||{})}:p.baseTraits;
              const ceil=ed?.ceiling||p.baseCeil;
              const grade=ed?fullGrade(merged,p.pos,ceil):p.baseGrade;
              const delta=grade-p.baseGrade;
              const isSel=editKey===p.key;
              return<div key={p.key} onClick={()=>setEditKey(isSel?null:p.key)} style={{display:"grid",gridTemplateColumns:"1fr 50px 50px 50px",gap:4,padding:"7px 16px",borderBottom:"1px solid #f8f8f6",cursor:"pointer",background:isSel?"#f0f4ff":ed?"#fffbeb":"transparent",alignItems:"center"}}>
                <div style={{overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>
                  <span style={{fontFamily:sans,fontSize:12,fontWeight:600,color:"#171717"}}>{p.name}</span>
                  <span style={{fontFamily:mono,fontSize:9,color:"#a3a3a3",marginLeft:6}}>{p.school}</span>
                </div>
                <span style={{fontFamily:mono,fontSize:10,fontWeight:700,color:POS_COLORS[p.pos]||"#525252",textAlign:"center"}}>{p.pos}</span>
                <span style={{fontFamily:font,fontSize:13,fontWeight:900,color:gradeColor(grade),textAlign:"center"}}>{grade}</span>
                <span style={{fontFamily:mono,fontSize:10,fontWeight:700,color:deltaColor(delta),textAlign:"center"}}>{delta!==0?fmtDelta(delta):""}</span>
              </div>;
            })}
          </div>
        </div>

        {/* Right: edit panel */}
        {editingPlayer&&<div style={{flex:1,overflowY:"auto",padding:"20px 24px",minWidth:0}}>
          {/* Header */}
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
            <span style={{fontFamily:mono,fontSize:11,fontWeight:700,color:POS_COLORS[editPos]||"#525252",background:`${POS_COLORS[editPos]||"#525252"}15`,padding:"4px 10px",borderRadius:6}}>{editPos}</span>
            <span style={{fontFamily:font,fontSize:20,fontWeight:900,color:"#171717"}}>{editingPlayer.name}</span>
            <span style={{fontFamily:mono,fontSize:11,color:"#a3a3a3"}}>{editingPlayer.school}</span>
            {editData&&<button onClick={resetPlayer} style={{fontFamily:mono,fontSize:9,color:"#ef4444",background:"#fef2f2",border:"1px solid #fecaca",borderRadius:6,padding:"4px 10px",cursor:"pointer",marginLeft:"auto"}}>reset</button>}
          </div>

          {/* Grade display + grade slider */}
          <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"16px 20px",marginBottom:16}}>
            <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:12}}>
              <div>
                <div style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase"}}>grade</div>
                <div style={{fontFamily:font,fontSize:32,fontWeight:900,color:gradeColor(editGrade),lineHeight:1}}>{editGrade}</div>
              </div>
              <div>
                <div style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase"}}>baseline</div>
                <div style={{fontFamily:font,fontSize:20,fontWeight:700,color:"#a3a3a3",lineHeight:1}}>{editBaseGrade}</div>
              </div>
              {editGrade!==editBaseGrade&&<div>
                <div style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase"}}>delta</div>
                <div style={{fontFamily:font,fontSize:20,fontWeight:900,color:deltaColor(editGrade-editBaseGrade),lineHeight:1}}>{fmtDelta(editGrade-editBaseGrade)}</div>
              </div>}
              <div style={{marginLeft:"auto"}}>
                <div style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:4}}>ceiling</div>
                <div style={{display:"flex",gap:4}}>
                  {ceilTiers.map(t=>{const sel=editCeil===t.key;return<button key={t.key} onClick={()=>setCeiling(t.key)} style={{fontFamily:mono,fontSize:9,fontWeight:sel?700:500,color:sel?"#fff":t.color,background:sel?t.color:"transparent",border:`1px solid ${sel?t.color:"#e5e5e5"}`,borderRadius:6,padding:"4px 8px",cursor:"pointer"}}>{t.label}</button>;})}
                </div>
              </div>
            </div>
            <div style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:6}}>target grade (moves all traits)</div>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <input type="range" min="1" max="99" value={remapGrade(rawGrade(editTraits,editPos))} onChange={e=>setTargetGrade(parseInt(e.target.value))} style={{flex:1,cursor:"pointer",accentColor:"#7c3aed"}}/>
              <span style={{fontFamily:mono,fontSize:12,fontWeight:700,color:"#525252",minWidth:28,textAlign:"right"}}>{remapGrade(rawGrade(editTraits,editPos))}</span>
            </div>
            <div style={{fontFamily:mono,fontSize:8,color:"#a3a3a3",marginTop:2}}>pre-ceiling grade · ceiling adds {editCeil==="high"?"+bonus":editCeil==="elite"?"+big bonus":editCeil==="capped"?"penalty":"nothing"}</div>
          </div>

          {/* Traits */}
          <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"16px 20px",marginBottom:16}}>
            <div style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:12}}>traits</div>
            {editPosTraits.map(trait=>{
              const baseVal=editingPlayer.baseTraits[trait]??50;
              const val=editTraits[trait]??50;
              const delta=val-baseVal;
              const weight=TRAIT_WEIGHTS[editPos]?.[trait]||(1/editPosTraits.length);
              const weightPct=Math.round(weight*100);
              const emoji=TRAIT_EMOJI[trait]||"";
              const t=val/100;const r=Math.round(236+(124-236)*t);const g=Math.round(72+(58-72)*t);const b=Math.round(153+(237-153)*t);const barColor=`rgb(${r},${g},${b})`;
              return<div key={trait} style={{marginBottom:14}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                  <span style={{fontSize:14}}>{emoji}</span>
                  <span style={{fontFamily:mono,fontSize:11,color:"#737373",flex:1}}>{trait}</span>
                  <span style={{fontFamily:mono,fontSize:8,color:"#a3a3a3",background:"#f5f5f5",padding:"2px 5px",borderRadius:3}}>{weightPct}%</span>
                  <span style={{fontFamily:font,fontSize:14,fontWeight:900,color:barColor,minWidth:28,textAlign:"right"}}>{val}</span>
                  {delta!==0&&<span style={{fontFamily:mono,fontSize:10,fontWeight:700,color:deltaColor(delta),minWidth:30,textAlign:"right"}}>{fmtDelta(delta)}</span>}
                  {delta===0&&<span style={{minWidth:30}}/>}
                </div>
                <div style={{position:"relative",height:22,display:"flex",alignItems:"center"}}>
                  <div style={{position:"absolute",left:0,right:0,height:5,background:"#f0f0f0",borderRadius:3}}/>
                  <div style={{position:"absolute",left:0,height:5,width:`${val}%`,background:`linear-gradient(90deg, #ec4899, #7c3aed)`,borderRadius:3}}/>
                  {/* Baseline marker */}
                  <div style={{position:"absolute",left:`${baseVal}%`,top:0,width:1.5,height:22,background:"#d4d4d4",zIndex:2}}/>
                  <input type="range" min="1" max="99" value={val} onChange={e=>setTrait(trait,parseInt(e.target.value))} style={{position:"absolute",left:0,width:"100%",height:22,background:"transparent",cursor:"pointer",zIndex:4,opacity:0,margin:0}}/>
                </div>
              </div>;
            })}
          </div>

          {/* Scouting writeup */}
          {editNarr&&<div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"16px 20px",marginBottom:16}}>
            <div style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:10}}>scouting report</div>
            {editNarr.scouting_blurb&&<div style={{fontFamily:sans,fontSize:12,color:"#525252",lineHeight:1.6,marginBottom:12}}>{editNarr.scouting_blurb}</div>}
            {editNarr.strengths&&editNarr.strengths.length>0&&<div style={{marginBottom:10}}>
              <div style={{fontFamily:mono,fontSize:8,letterSpacing:1,color:"#22c55e",textTransform:"uppercase",marginBottom:4}}>strengths</div>
              {editNarr.strengths.map((s,i)=><div key={i} style={{fontFamily:sans,fontSize:11,color:"#525252",lineHeight:1.5,marginBottom:3}}>
                <span style={{color:"#22c55e",marginRight:4}}>+</span>{typeof s==="string"?s:(s.description||s.text||JSON.stringify(s))}
              </div>)}
            </div>}
            {editNarr.weaknesses&&editNarr.weaknesses.length>0&&<div>
              <div style={{fontFamily:mono,fontSize:8,letterSpacing:1,color:"#ef4444",textTransform:"uppercase",marginBottom:4}}>weaknesses</div>
              {editNarr.weaknesses.map((s,i)=><div key={i} style={{fontFamily:sans,fontSize:11,color:"#525252",lineHeight:1.5,marginBottom:3}}>
                <span style={{color:"#ef4444",marginRight:4}}>−</span>{typeof s==="string"?s:(s.description||s.text||JSON.stringify(s))}
              </div>)}
            </div>}
          </div>}
        </div>}
      </div>
    </div>
  );
}

// ============================================================
// Guide Page: /guide — how to use Big Board Lab
// ============================================================
function GuidePage({onBack}){
  useEffect(()=>{trackEvent(null,'guide_viewed');},[]);
  useEffect(()=>{
    const guideTitle='How to Use Big Board Lab | 2026 NFL Draft Board Builder & Data Lab Guide';
    const guideDesc='Learn how to rank prospects, grade traits, run AI mock drafts, explore combine data, compare college stats with historical percentiles, and build your 2026 NFL big board.';
    const guideUrl='https://bigboardlab.com/guide';
    // Save originals
    const origTitle=document.title;
    const saveMeta=(sel)=>{const el=document.querySelector(sel);return el?el.getAttribute('content'):null;};
    const origDesc=saveMeta('meta[name="description"]');
    const origCanonical=document.querySelector('link[rel="canonical"]')?.getAttribute('href');
    const origOgTitle=saveMeta('meta[property="og:title"]');
    const origOgDesc=saveMeta('meta[property="og:description"]');
    const origOgUrl=saveMeta('meta[property="og:url"]');
    const origTwTitle=saveMeta('meta[name="twitter:title"]');
    const origTwDesc=saveMeta('meta[name="twitter:description"]');
    // Helper to set or create a meta tag
    const setMeta=(sel,attr,val)=>{let el=document.querySelector(sel);if(!el){el=document.createElement('meta');const[a,v]=attr.split('=');el.setAttribute(a,v);document.head.appendChild(el);}el.setAttribute('content',val);return el;};
    // Set guide meta
    document.title=guideTitle;
    setMeta('meta[name="description"]','name=description',guideDesc);
    let canonical=document.querySelector('link[rel="canonical"]');
    if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.appendChild(canonical);}
    canonical.setAttribute('href',guideUrl);
    // OG tags
    setMeta('meta[property="og:title"]','property=og:title',guideTitle);
    setMeta('meta[property="og:description"]','property=og:description',guideDesc);
    setMeta('meta[property="og:url"]','property=og:url',guideUrl);
    // Twitter tags
    setMeta('meta[name="twitter:title"]','name=twitter:title',guideTitle);
    setMeta('meta[name="twitter:description"]','name=twitter:description',guideDesc);
    // JSON-LD HowTo
    const ld=document.createElement('script');ld.type='application/ld+json';
    ld.textContent=JSON.stringify({"@context":"https://schema.org","@type":"HowTo","name":"How to Use Big Board Lab","description":"Build your own 2026 NFL draft big board with pair rankings, trait grading, AI mock drafts, and more.","step":[
      {"@type":"HowToStep","name":"Mock Draft Against 32 AI GMs","text":"Simulate a full 7-round NFL draft with realistic team tendencies and trade logic."},
      {"@type":"HowToStep","name":"Grade Every Trait","text":"Slide trait scores to evaluate arm strength, speed, coverage, and more."},
      {"@type":"HowToStep","name":"Filter by Standout Traits","text":"Rank and browse by individual traits like Pass Rush, Speed, or Man Coverage."},
      {"@type":"HowToStep","name":"Build Your Big Board","text":"View your ranked board filtered by position with grades and radar charts."},
      {"@type":"HowToStep","name":"Explore Combine Measurables","text":"Compare 40-yard dash, speed score, athletic score and more against 26 years of combine history with beeswarm visualizations."},
      {"@type":"HowToStep","name":"College Stats & Historical Percentiles","text":"View raw college production and compare against 10 years of FBS data with historical percentile rankings."},
      {"@type":"HowToStep","name":"Dominator Ratings & Breakout Year","text":"See what share of team production each prospect commanded and identify their earliest breakout season."},
      {"@type":"HowToStep","name":"Live Depth Chart Updates","text":"Every pick lands on the team's actual roster in real time with starter displacement tracking."},
      {"@type":"HowToStep","name":"Rank Prospects Head-to-Head","text":"Compare two players side by side and pick a winner to build Elo rankings."},
      {"@type":"HowToStep","name":"Team Specific Draft Trends","text":"Track where prospects are getting drafted across the Big Board Lab community with aggregate ADP and team-specific draft patterns."},
      {"@type":"HowToStep","name":"Compare Players Side by Side","text":"Pin up to 4 players and compare radar charts and trait values."},
      {"@type":"HowToStep","name":"Track Your Guys","text":"See which prospects you draft most often and your scouting fingerprint."},
      {"@type":"HowToStep","name":"Share Your Board","text":"Generate a shareable image of your big board or mock draft results."},
      {"@type":"HowToStep","name":"Player Profiles","text":"Dive deep into any prospect with stats, combine data, and trait radar."},
      {"@type":"HowToStep","name":"Drag to Reorder","text":"Fine-tune your board by dragging players into your preferred order."}
    ]});
    document.head.appendChild(ld);
    // Cleanup: restore originals
    return()=>{
      document.title=origTitle;
      if(origDesc)setMeta('meta[name="description"]','name=description',origDesc);
      if(origCanonical)canonical.setAttribute('href',origCanonical);else canonical.remove();
      if(origOgTitle)setMeta('meta[property="og:title"]','property=og:title',origOgTitle);
      if(origOgDesc)setMeta('meta[property="og:description"]','property=og:description',origOgDesc);
      if(origOgUrl)setMeta('meta[property="og:url"]','property=og:url',origOgUrl);
      if(origTwTitle)setMeta('meta[name="twitter:title"]','name=twitter:title',origTwTitle);
      if(origTwDesc)setMeta('meta[name="twitter:description"]','name=twitter:description',origTwDesc);
      ld.remove();
    };
  },[]);

  const scrollTo=(id)=>{const el=document.getElementById(id);if(el)el.scrollIntoView({behavior:'smooth',block:'start'});};

  // Demo data
  const demoProspects=[
    PROSPECTS.find(p=>p.name==="Rueben Bain Jr."),
    PROSPECTS.find(p=>p.name==="David Bailey"),
    PROSPECTS.find(p=>p.name==="Caleb Downs"),
    PROSPECTS.find(p=>p.name==="Garrett Nussmeier"),
    PROSPECTS.find(p=>p.name==="Francis Mauigoa"),
  ].filter(Boolean);
  const compProspects=[
    PROSPECTS.find(p=>p.name==="Garrett Nussmeier"),
    PROSPECTS.find(p=>p.name==="Cade Klubnik"),
    PROSPECTS.find(p=>p.name==="Drew Allar"),
  ].filter(Boolean);
  const compColors=["#2563eb","#dc2626","#16a34a"];
  const boardProspects=[
    PROSPECTS.find(p=>p.name==="Rueben Bain Jr."),
    PROSPECTS.find(p=>p.name==="Caleb Downs"),
    PROSPECTS.find(p=>p.name==="Francis Mauigoa"),
    PROSPECTS.find(p=>p.name==="Garrett Nussmeier"),
    PROSPECTS.find(p=>p.name==="Jordyn Tyson"),
  ].filter(Boolean);
  const consensusDemo=[
    {name:"Rueben Bain Jr.",pos:"EDGE",rank:1,prev:3},
    {name:"Caleb Downs",pos:"S",rank:2,prev:2},
    {name:"Francis Mauigoa",pos:"OT",rank:3,prev:5},
    {name:"Garrett Nussmeier",pos:"QB",rank:4,prev:1},
    {name:"David Bailey",pos:"DL",rank:5,prev:7},
  ];
  const mockTeams=["Raiders","Jets","Cardinals","Titans","Giants","Browns","Commanders","Saints"];

  const sections=[
    {id:"mock",num:"01",title:"Mock Draft Against 32 AI GMs"},
    {id:"scheme-fits",num:"02",title:"Scheme Fits & Scout Vision"},
    {id:"grade",num:"03",title:"Grade Every Trait"},
    {id:"traits",num:"04",title:"Filter by Standout Traits"},
    {id:"board",num:"05",title:"Build Your Big Board"},
    {id:"combine",num:"06",title:"Explore Combine Measurables"},
    {id:"college-stats",num:"07",title:"College Stats & Historical Percentiles"},
    {id:"dominator",num:"08",title:"Dominator Ratings & Breakout Year"},
    {id:"depth",num:"09",title:"Live Depth Chart Updates"},
    {id:"rank",num:"10",title:"Rank Prospects Head-to-Head"},
    {id:"mock-trends",num:"11",title:"Team Specific Draft Trends"},
    {id:"compare",num:"12",title:"Compare Players Side by Side"},
    {id:"track",num:"13",title:"Track Your Guys"},
    {id:"share",num:"14",title:"Share Your Board"},
    {id:"profiles",num:"15",title:"Player Profiles"},
    {id:"reorder",num:"16",title:"Drag to Reorder"},
    {id:"glossary",num:"17",title:"Glossary"},
  ];

  const card={background:"#fff",border:"1px solid #e5e5e5",borderRadius:16,padding:"28px 24px",maxWidth:720,margin:"0 auto 24px"};
  const sectionNum=(n)=>({fontFamily:mono,fontSize:11,fontWeight:700,letterSpacing:3,background:"linear-gradient(135deg,#ec4899,#7c3aed)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",textTransform:"uppercase"});
  const h2s={fontFamily:font,fontSize:28,fontWeight:900,color:"#171717",margin:"8px 0 12px",lineHeight:1.15};
  const desc={fontFamily:sans,fontSize:14,color:"#525252",lineHeight:1.65,margin:"0 0 16px"};
  const tip={fontFamily:sans,fontSize:12,color:"#7c3aed",background:"#f5f3ff",border:"1px solid #ede9fe",borderRadius:10,padding:"10px 14px",margin:"12px 0 0",textWrap:"pretty"};

  return(<div style={{minHeight:"100vh",background:"#faf9f6",fontFamily:font}}>
    <style>{`
      .guide-toc-pill:hover{background:#f5f3ff!important;border-color:#c4b5fd!important;color:#7c3aed!important;}
      .guide-card:hover{box-shadow:0 4px 24px rgba(0,0,0,0.06);}
      @media(max-width:600px){
        .guide-pair-row{flex-direction:column!important;gap:12px!important;}
        .guide-compare-radars{flex-direction:column!important;align-items:center!important;}
        .guide-team-grid{grid-template-columns:repeat(4,1fr)!important;}
        .guide-hero-h1{font-size:36px!important;}
      }
    `}</style>

    {/* Nav */}
    <div style={{position:"fixed",top:0,left:0,right:0,zIndex:100,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 16px",background:"#fff",borderBottom:"1px solid #f0f0f0"}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <img src="/logo.png" alt="Big Board Lab" style={{height:24,cursor:"pointer"}} onClick={onBack}/>
        <span style={{fontFamily:mono,fontSize:10,color:"#a3a3a3"}}>guide</span>
      </div>
      <button onClick={onBack} style={{fontFamily:sans,fontSize:10,color:"#a3a3a3",background:"none",border:"1px solid #e5e5e5",borderRadius:99,padding:"3px 10px",cursor:"pointer"}}>← back to app</button>
    </div>

    {/* Hero */}
    <div style={{textAlign:"center",padding:"80px 24px 32px",maxWidth:720,margin:"0 auto"}}>
      <p style={{fontFamily:mono,fontSize:10,letterSpacing:4,color:"#a3a3a3",textTransform:"uppercase",margin:"0 0 8px"}}>how to use</p>
      <h1 className="guide-hero-h1" style={{fontFamily:font,fontSize:"clamp(32px,7vw,52px)",fontWeight:900,color:"#171717",margin:"0 0 12px",lineHeight:1,letterSpacing:-2}}>big board lab</h1>
      <p style={{fontFamily:sans,fontSize:16,color:"#737373",lineHeight:1.6,maxWidth:520,margin:"0 auto 24px"}}>Everything you need to rank, grade, and mock draft the 2026 NFL class — in one place.</p>
      <div style={{width:120,height:3,background:"linear-gradient(90deg,#ec4899,#7c3aed)",borderRadius:99,margin:"0 auto"}}/>
    </div>

    {/* TOC */}
    <div style={{maxWidth:720,margin:"0 auto 32px",padding:"0 24px"}}>
      <div style={{display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center"}}>
        {sections.map(s=>(
          <button key={s.id} className="guide-toc-pill" onClick={()=>scrollTo(`guide-${s.id}`)} style={{fontFamily:sans,fontSize:11,fontWeight:600,color:"#525252",background:"#fff",border:"1px solid #e5e5e5",borderRadius:99,padding:"6px 14px",cursor:"pointer",transition:"all 0.15s",whiteSpace:"nowrap"}}>
            <span style={{fontFamily:mono,fontSize:9,color:"#a3a3a3",marginRight:6}}>{s.num}</span>{s.title}
          </button>
        ))}
      </div>
    </div>

    {/* === SECTIONS === */}
    <div style={{maxWidth:720,margin:"0 auto",padding:"0 24px"}}>

      {/* 01 — Mock Draft Against 32 AI GMs */}
      <div id="guide-mock" className="guide-card" style={{...card,scrollMarginTop:70,transition:"box-shadow 0.2s"}}>
        <div style={sectionNum("01")}>01</div>
        <div style={{width:"100%",height:1,background:"linear-gradient(90deg,#ec4899,#7c3aed,transparent)",margin:"4px 0 12px"}}/>
        <h2 style={h2s}>Mock Draft Against 32 AI GMs</h2>
        <p style={desc}>Pick your team and draft against 31 AI-controlled GMs that follow real team tendencies, positional needs, and trade logic.</p>
        <div className="guide-team-grid" style={{display:"grid",gridTemplateColumns:"repeat(8,1fr)",gap:8,margin:"16px 0"}}>
          {mockTeams.map(t=><div key={t} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:6,background:"#faf9f6",borderRadius:8,border:"1px solid #f0f0f0"}}>
            <NFLTeamLogo team={t} size={24}/>
            <span style={{fontFamily:mono,fontSize:8,color:"#a3a3a3",fontWeight:600}}>{NFL_TEAM_ABR[t]}</span>
          </div>)}
        </div>
        <div style={{display:"flex",gap:12,alignItems:"center",justifyContent:"center",marginBottom:12}}>
          {[{label:"Rounds",val:"1–7"},{label:"Speed",val:"instant"}].map(({label,val})=><div key={label} style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:8,padding:"6px 14px",textAlign:"center"}}>
            <div style={{fontFamily:mono,fontSize:8,letterSpacing:1.5,color:"#a3a3a3",textTransform:"uppercase"}}>{label}</div>
            <div style={{fontFamily:sans,fontSize:13,fontWeight:700,color:"#171717"}}>{val}</div>
          </div>)}
        </div>
        <div style={{textAlign:"center"}}>
          <div style={{display:"inline-block",fontFamily:sans,fontSize:13,fontWeight:700,color:"#fff",background:"linear-gradient(135deg,#ec4899,#7c3aed)",borderRadius:99,padding:"10px 28px"}}>start draft</div>
        </div>
        <div style={tip}>💡 Each AI GM has unique tendencies — the Ravens take BPA, the Saints reach for need, and the Eagles take the guy everyone else let fall for some reason.</div>
      </div>

      {/* 02 — Scheme Fits & Scout Vision */}
      <div id="guide-scheme-fits" className="guide-card" style={{...card,scrollMarginTop:70,transition:"box-shadow 0.2s"}}>
        <div style={sectionNum("02")}>02</div>
        <div style={{width:"100%",height:1,background:"linear-gradient(90deg,#ec4899,#7c3aed,transparent)",margin:"4px 0 12px"}}/>
        <h2 style={h2s}>Scheme Fits & Scout Vision</h2>
        <p style={desc}>Every prospect is scored against every team's offensive or defensive scheme. The same player can be a perfect fit for one team and a poor fit for another.</p>

        {/* Mock Scout Vision available list */}
        <div style={{margin:"16px 0",background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,overflow:"hidden"}}>
          <div style={{padding:"8px 12px",background:"rgba(99,102,241,0.04)",borderBottom:"1px solid rgba(99,102,241,0.1)",display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:32,height:18,borderRadius:9,background:"linear-gradient(135deg,#4f46e5,#7c3aed,#a855f7)",position:"relative"}}><div style={{width:13,height:13,borderRadius:7,background:"#fff",position:"absolute",top:2.5,left:17,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontFamily:mono,fontSize:6,fontWeight:700,color:"#6366f1"}}>SV</span></div></div>
            <span style={{fontFamily:mono,fontSize:8,letterSpacing:1,color:"#6366f1",textTransform:"uppercase"}}>scout vision — 49ers</span>
          </div>
          {[
            {name:"David Bailey",pos:"EDGE",score:92,fit:"Elite 40 paired with elite pass rush",tags:["NEED","FIT"]},
            {name:"Keldric Faulk",pos:"EDGE",score:84,fit:"3-4 Stand-Up Edge",tags:["NEED","FIT"]},
            {name:"Carnell Tate",pos:"WR",score:78,fit:"Timing Route Runner",tags:["FIT"]},
            {name:"Arvell Reese",pos:"LB",score:61,fit:"Run & Chase LB",tags:[]},
          ].map((d,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderBottom:i<3?"1px solid #f8f8f8":"none"}}>
            <span style={{fontFamily:mono,fontSize:8,color:POS_COLORS[d.pos]||"#525252",width:30}}>{d.pos}</span>
            <span style={{fontFamily:sans,fontSize:12,fontWeight:600,color:"#171717",flex:1}}>{d.name}</span>
            <span style={{fontFamily:mono,fontSize:8,color:"#6366f1",maxWidth:100,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.fit}</span>
            {d.tags.map(t=><span key={t} style={{fontFamily:mono,fontSize:6,fontWeight:700,color:t==="NEED"?"#16a34a":t==="FIT"?"#0891b2":"#737373",background:t==="NEED"?"rgba(34,197,94,0.08)":t==="FIT"?"rgba(8,145,178,0.08)":"#f5f5f5",padding:"1px 4px",borderRadius:2,border:`1px solid ${t==="NEED"?"rgba(34,197,94,0.15)":t==="FIT"?"rgba(8,145,178,0.15)":"#e5e5e5"}`}}>{t}</span>)}
            <span style={{fontFamily:mono,fontSize:10,fontWeight:700,color:"#fff",background:"linear-gradient(135deg,#6366f1,#a855f7)",padding:"2px 6px",borderRadius:4,flexShrink:0}}>{d.score}</span>
          </div>)}
        </div>

        {/* Mini scatter plot */}
        <div style={{margin:"16px 0",position:"relative"}}>
          <svg width="100%" viewBox="0 0 400 160" style={{display:"block"}}>
            <line x1={50} y1={140} x2={380} y2={140} stroke="#e5e5e5" strokeWidth={1}/>
            <line x1={50} y1={10} x2={50} y2={140} stroke="#e5e5e5" strokeWidth={1}/>
            <line x1={250} y1={10} x2={250} y2={140} stroke="#0891b2" strokeWidth={1} strokeDasharray="4,3" opacity={0.4}/>
            <text x={250} y={8} textAnchor="middle" style={{fontSize:7,fill:"#0891b2",fontFamily:"monospace"}}>fit threshold</text>
            <text x={215} y={155} textAnchor="middle" style={{fontSize:8,fill:"#a3a3a3",fontFamily:"monospace"}}>Scheme Fit Score →</text>
            <text x={15} y={80} textAnchor="middle" style={{fontSize:8,fill:"#a3a3a3",fontFamily:"monospace"}} transform="rotate(-90,15,80)">Consensus Rank ↑</text>
            {[{x:340,y:20,r:7,fit:true},{x:310,y:35,r:6,fit:true},{x:290,y:25,r:7,fit:true},{x:270,y:50,r:5,fit:true},{x:260,y:40,r:6,fit:true},
              {x:320,y:65,r:5,fit:true},{x:280,y:70,r:5,fit:true},{x:300,y:80,r:4,fit:true},{x:260,y:90,r:4,fit:true},
              {x:220,y:45,r:5,fit:false},{x:200,y:60,r:5,fit:false},{x:180,y:55,r:4,fit:false},{x:160,y:75,r:4,fit:false},
              {x:140,y:85,r:3,fit:false},{x:120,y:95,r:3,fit:false},{x:100,y:110,r:3,fit:false},{x:80,y:120,r:3,fit:false},
              {x:190,y:100,r:3,fit:false},{x:150,y:115,r:3,fit:false},{x:110,y:130,r:3,fit:false},
            ].map((d,i)=><circle key={i} cx={d.x} cy={d.y} r={d.r} fill={d.fit?"#0891b244":"#0d948815"} stroke={d.fit?"#0891b2":"#0d9488"} strokeWidth={d.fit?1.5:0.8} opacity={d.fit?1:0.4}/>)}
          </svg>
          <div style={{position:"absolute",top:8,right:12,background:"#171717",color:"#fff",fontFamily:sans,fontSize:10,padding:"6px 10px",borderRadius:8,maxWidth:160,lineHeight:1.4}}>
            <div style={{fontWeight:700,marginBottom:2}}>David Bailey</div>
            <div style={{fontFamily:mono,fontSize:8,color:"#22c55e"}}>Strong fit — PR 94 + 1ST 91</div>
          </div>
        </div>

        <p style={{fontFamily:sans,fontSize:12,color:"#737373",lineHeight:1.6,margin:"0 0 12px"}}>In the <strong>Data Lab</strong>, the scheme fit scatter shows every prospect at a position plotted against a team's scheme. Filter by archetype to spotlight speed rushers, zone corners, or any role. Swap teams and the whole landscape shifts.</p>

        <div style={tip}>💡 Scheme fit explains why the same prospect might be a top-10 pick for one team and a day-two value for another. It's not just about talent — it's about fit.</div>
      </div>

      {/* 03 — Grade Every Trait */}
      <div id="guide-grade" className="guide-card" style={{...card,scrollMarginTop:70,transition:"box-shadow 0.2s"}}>
        <div style={sectionNum("03")}>03</div>
        <div style={{width:"100%",height:1,background:"linear-gradient(90deg,#ec4899,#7c3aed,transparent)",margin:"4px 0 12px"}}/>
        <h2 style={h2s}>Grade Every Trait</h2>
        <p style={desc}>Slide trait scores from 0–100 for position-specific attributes. Watch radar charts and overall grades update in real time.</p>
        {(()=>{const p=demoProspects[3];if(!p)return null;const pos=p.gpos||p.pos;const posTraits=POSITION_TRAITS[pos]||[];const c=POS_COLORS[pos];
          const demoVals=[82,75,68,72,78,65];
          return<div style={{margin:"16px 0"}}>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
              {posTraits.slice(0,4).map((t,i)=>{const v=demoVals[i]||60;return<div key={t} style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontFamily:sans,fontSize:11,fontWeight:600,color:"#525252",width:100,textAlign:"right",flexShrink:0}}>{TRAIT_SHORT[t]||t}</span>
                <div style={{flex:1,height:6,background:"#f0f0f0",borderRadius:99,overflow:"hidden"}}><div style={{width:`${v}%`,height:"100%",background:`linear-gradient(90deg,${c},${c}aa)`,borderRadius:99}}/></div>
                <span style={{fontFamily:mono,fontSize:11,fontWeight:700,color:c,width:28,textAlign:"right"}}>{v}</span>
              </div>;})}
            </div>
            <div style={{display:"flex",justifyContent:"center"}}>
              <RadarChart traits={posTraits} values={demoVals} color={c} size={160}/>
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"center",marginTop:12}}>
              {["Capped","Normal","High","Elite"].map((label,i)=>{const colors=["#a3a3a3","#525252","#2563eb","#7c3aed"];return<span key={label} style={{fontFamily:sans,fontSize:10,fontWeight:600,color:colors[i],background:`${colors[i]}0d`,border:`1px solid ${colors[i]}1a`,borderRadius:99,padding:"4px 12px"}}>{label}</span>;})}
            </div>
          </div>;
        })()}
        <div style={tip}>💡 <strong>Ceiling grades</strong> factor in how teachable each trait is — raw athleticism matters more than technique for upside.</div>
      </div>

      {/* 05 — Filter by Standout Traits */}
      <div id="guide-traits" className="guide-card" style={{...card,scrollMarginTop:70,transition:"box-shadow 0.2s"}}>
        <div style={sectionNum("04")}>04</div>
        <div style={{width:"100%",height:1,background:"linear-gradient(90deg,#ec4899,#7c3aed,transparent)",margin:"4px 0 12px"}}/>
        <h2 style={h2s}>Filter by Standout Traits</h2>
        <p style={desc}>Most tools only let you filter by position. BBL lets you rank, mock draft, and browse by individual traits — want to only rank the best pass rushers? Tap the 🚀 Pass Rush pill and pair-rank just the elite rushers across EDGE and DL. Running a mock? Filter the draft board by Speed to see who your team should target.</p>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14,justifyContent:"center"}}>
          {["Pass Rush","Man Coverage","Route Running","Speed","Accuracy"].map(t=>{const emoji=TRAIT_EMOJI[t];return<span key={t} style={{fontFamily:sans,fontSize:11,fontWeight:600,color:"#7c3aed",background:"#f5f3ff",border:"1px solid #ede9fe",borderRadius:99,padding:"5px 12px",display:"inline-flex",alignItems:"center",gap:4}}>
            <span style={{fontSize:12}}>{emoji}</span>{t}
          </span>;})}
        </div>
        <div style={{border:"1px solid #e5e5e5",borderRadius:10,overflow:"hidden"}}>
          <div style={{fontFamily:mono,fontSize:9,letterSpacing:1.5,color:"#a3a3a3",textTransform:"uppercase",padding:"8px 12px",borderBottom:"1px solid #f0f0f0",display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:10}}>🚀</span> ranking by: pass rush
          </div>
          {[
            {name:"Rueben Bain Jr.",pos:"EDGE",val:92},
            {name:"T.J. Parker",pos:"EDGE",val:88},
            {name:"David Bailey",pos:"DL",val:85},
          ].map((p,i)=>{const c=POS_COLORS[p.pos];return<div key={p.name} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderBottom:i<2?"1px solid #f5f5f5":"none"}}>
            <span style={{fontFamily:mono,fontSize:9,fontWeight:700,color:c,background:`${c}0d`,padding:"2px 8px",borderRadius:99}}>{p.pos}</span>
            <span style={{fontFamily:sans,fontSize:13,fontWeight:600,color:"#171717",flex:1}}>{p.name}</span>
            <span style={{fontFamily:mono,fontSize:11,fontWeight:700,color:"#7c3aed"}}>{p.val}</span>
          </div>;})}
        </div>
        <div style={tip}>💡 Trait filters work everywhere — on the big board, during pair ranking, and in mock drafts. Select "Speed" and you'll see the fastest WRs, RBs, and CBs all in one view.</div>
      </div>

      {/* 05 — Build Your Big Board */}
      <div id="guide-board" className="guide-card" style={{...card,scrollMarginTop:70,transition:"box-shadow 0.2s"}}>
        <div style={sectionNum("05")}>05</div>
        <div style={{width:"100%",height:1,background:"linear-gradient(90deg,#ec4899,#7c3aed,transparent)",margin:"4px 0 12px"}}/>
        <h2 style={h2s}>Build Your Big Board</h2>
        <p style={desc}>As you rank and grade, your big board assembles itself. Filter by position, toggle between your board and consensus, and see grades at a glance.</p>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:16,justifyContent:"center"}}>
          {POSITION_GROUPS.map(g=><span key={g} style={{fontFamily:mono,fontSize:9,fontWeight:700,color:POS_COLORS[g],background:`${POS_COLORS[g]}0d`,border:`1px solid ${POS_COLORS[g]}1a`,borderRadius:99,padding:"4px 10px"}}>{g}</span>)}
        </div>
        <div style={{border:"1px solid #e5e5e5",borderRadius:10,overflow:"hidden"}}>
          {boardProspects.map((p,i)=>{const c=POS_COLORS[p.gpos||p.pos];const posTraits=POSITION_TRAITS[p.gpos||p.pos]||[];const vals=posTraits.map(t=>tv({},p.id,t,p.name,p.school));return<div key={p.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderBottom:i<boardProspects.length-1?"1px solid #f5f5f5":"none",background:i%2===0?"#fff":"#faf9f6"}}>
            <span style={{fontFamily:mono,fontSize:11,fontWeight:700,color:"#a3a3a3",width:24,textAlign:"right"}}>{i+1}</span>
            <span style={{fontFamily:mono,fontSize:9,fontWeight:700,color:c,background:`${c}0d`,padding:"2px 8px",borderRadius:99}}>{p.gpos||p.pos}</span>
            <SchoolLogo school={p.school} size={20}/>
            <span style={{fontFamily:sans,fontSize:13,fontWeight:600,color:"#171717",flex:1}}>{p.name}</span>
            <MiniRadar values={vals} color={c} size={24}/>
          </div>;})}
        </div>
        <div style={{display:"flex",gap:0,marginTop:12,justifyContent:"center"}}>
          {["my board","consensus"].map((label,i)=><div key={label} style={{fontFamily:sans,fontSize:11,fontWeight:600,padding:"6px 16px",background:i===0?"#171717":"#fff",color:i===0?"#fff":"#a3a3a3",border:"1px solid #e5e5e5",borderRadius:i===0?"99px 0 0 99px":"0 99px 99px 0",cursor:"default"}}>{label}</div>)}
        </div>
      </div>

      {/* 06 — Explore Combine Measurables */}
      <div id="guide-combine" className="guide-card" style={{...card,scrollMarginTop:70,transition:"box-shadow 0.2s"}}>
        <div style={sectionNum("06")}>06</div>
        <div style={{width:"100%",height:1,background:"linear-gradient(90deg,#ec4899,#7c3aed,transparent)",margin:"4px 0 12px"}}/>
        <h2 style={h2s}>Explore Combine Measurables</h2>
        <p style={desc}>See how every prospect's 40-yard dash, speed score, athletic score, and more compare — both across this class and against 26 years of combine history.</p>
        <div style={{background:"#faf9f6",borderRadius:14,border:"1px solid #f0f0f0",padding:"16px 20px"}}>
          <div style={{display:"flex",gap:6,marginBottom:12,justifyContent:"center"}}>
            {["Raw","Percentile"].map((label,i)=><span key={label} style={{fontFamily:sans,fontSize:10,fontWeight:600,color:i===0?"#fff":"#525252",background:i===0?"#171717":"#fff",border:"1px solid #e5e5e5",borderRadius:99,padding:"4px 12px"}}>{label}</span>)}
          </div>
          <svg width="100%" viewBox="0 0 320 150" style={{display:"block"}}>
            {/* Grid lines */}
            {[30,75,120].map(x=><line key={x} x1={x} y1={12} x2={x} y2={128} stroke="#e5e5e5" strokeWidth={0.5}/>)}
            {[40,70,100].map(y=><line key={y} x1={5} y1={y} x2={145} y2={y} stroke="#f0f0f0" strokeWidth={0.5} strokeDasharray="2,2"/>)}
            {/* QB column */}
            {[[24,22],[36,28],[28,38],[32,48],[20,55],[30,65],[26,75],[34,82],[22,92],[38,100],[30,110]].map((d,i)=><circle key={`q${i}`} cx={d[0]} cy={d[1]} r={4.5} fill={POS_COLORS["QB"]} opacity={i===2?1:0.5}/>)}
            {/* RB column */}
            {[[70,18],[80,26],[72,34],[76,44],[68,52],[82,60],[74,68],[78,78],[66,86],[80,94],[72,104],[76,114]].map((d,i)=><circle key={`r${i}`} cx={d[0]} cy={d[1]} r={4.5} fill={POS_COLORS["RB"]} opacity={i===1?1:0.5}/>)}
            {/* WR column */}
            {[[116,20],[124,30],[118,40],[122,50],[114,58],[126,66],[120,74],[112,82],[128,90],[118,98],[124,108]].map((d,i)=><circle key={`w${i}`} cx={d[0]} cy={d[1]} r={4.5} fill={POS_COLORS["WR"]} opacity={i===0?1:0.5}/>)}
            {/* Position labels */}
            <text x={30} y={142} textAnchor="middle" style={{fontSize:"9px",fill:POS_COLORS["QB"],fontFamily:"monospace",fontWeight:700}}>QB</text>
            <text x={75} y={142} textAnchor="middle" style={{fontSize:"9px",fill:POS_COLORS["RB"],fontFamily:"monospace",fontWeight:700}}>RB</text>
            <text x={120} y={142} textAnchor="middle" style={{fontSize:"9px",fill:POS_COLORS["WR"],fontFamily:"monospace",fontWeight:700}}>WR</text>
            {/* Right side: highlighted player card */}
            <rect x={160} y={20} width={150} height={100} rx={10} fill="#fff" stroke="#e5e5e5" strokeWidth={1}/>
            <rect x={160} y={20} width={150} height={3} rx={1.5} fill="url(#guideGrad)"/>
            <defs><linearGradient id="guideGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#ec4899"/><stop offset="100%" stopColor="#7c3aed"/></linearGradient></defs>
            <text x={172} y={42} style={{fontSize:"8px",fill:"#a3a3a3",fontFamily:"monospace",letterSpacing:"1px"}}>SPEED SCORE</text>
            <rect x={172} y={48} width={120} height={5} rx={2.5} fill="#f0f0f0"/>
            <rect x={172} y={48} width={102} height={5} rx={2.5} fill="#7c3aed" opacity={0.8}/>
            <text x={296} y={53} textAnchor="end" style={{fontSize:"9px",fill:"#7c3aed",fontFamily:"monospace",fontWeight:700}}>85th</text>
            <text x={172} y={72} style={{fontSize:"8px",fill:"#a3a3a3",fontFamily:"monospace",letterSpacing:"1px"}}>ATHLETIC SCORE</text>
            <rect x={172} y={78} width={120} height={5} rx={2.5} fill="#f0f0f0"/>
            <rect x={172} y={78} width={96} height={5} rx={2.5} fill="#ec4899" opacity={0.8}/>
            <text x={296} y={83} textAnchor="end" style={{fontSize:"9px",fill:"#ec4899",fontFamily:"monospace",fontWeight:700}}>80th</text>
            <text x={172} y={102} style={{fontSize:"8px",fill:"#a3a3a3",fontFamily:"monospace",letterSpacing:"1px"}}>40-YARD DASH</text>
            <rect x={172} y={108} width={120} height={5} rx={2.5} fill="#f0f0f0"/>
            <rect x={172} y={108} width={94} height={5} rx={2.5} fill="#2563eb" opacity={0.8}/>
            <text x={296} y={113} textAnchor="end" style={{fontSize:"9px",fill:"#2563eb",fontFamily:"monospace",fontWeight:700}}>78th</text>
          </svg>
        </div>
        <div style={tip}>💡 Toggle between raw times and position percentiles to see who's truly elite relative to their position.</div>
      </div>

      {/* 07 — College Stats & Historical Percentiles */}
      <div id="guide-college-stats" className="guide-card" style={{...card,scrollMarginTop:70,transition:"box-shadow 0.2s"}}>
        <div style={sectionNum("07")}>07</div>
        <div style={{width:"100%",height:1,background:"linear-gradient(90deg,#ec4899,#7c3aed,transparent)",margin:"4px 0 12px"}}/>
        <h2 style={h2s}>College Stats & Historical Percentiles</h2>
        <p style={desc}>Raw college production — passing yards, rushing yards, receptions, tackles — compared against 10 years of FBS data. See exactly where each prospect ranks historically.</p>
        <div style={{background:"#faf9f6",borderRadius:14,border:"1px solid #f0f0f0",padding:"16px 20px"}}>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12,justifyContent:"center"}}>
            {[{label:"Passing",color:"#1e3a5f",expanded:true},{label:"Rushing",color:"#5b21b6"},{label:"Receiving",color:"#0d9488"},{label:"Defensive",color:"#15803d"}].map(cat=><div key={cat.label} style={{display:"flex",flexDirection:"column",gap:4}}>
              <span style={{fontFamily:sans,fontSize:10,fontWeight:700,color:"#fff",background:cat.color,borderRadius:99,padding:"4px 12px",cursor:"default"}}>{cat.label}</span>
              {cat.expanded&&<div style={{display:"flex",gap:4,paddingLeft:4}}>
                {["Pass Yds","Comp%","Pass TD"].map(sub=><span key={sub} style={{fontFamily:mono,fontSize:8,fontWeight:600,color:cat.color,background:`${cat.color}12`,border:`1px solid ${cat.color}22`,borderRadius:99,padding:"2px 8px"}}>{sub}</span>)}
              </div>}
            </div>)}
          </div>
          <div style={{border:"1px solid #e5e5e5",borderRadius:8,overflow:"hidden",background:"#fff"}}>
            {[{stat:"Pass Yds",val:"4,238",pct:87},{stat:"Comp%",val:"68.2%",pct:76},{stat:"Pass TD",val:"34",pct:91}].map((row,i)=><div key={row.stat} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 12px",borderBottom:i<2?"1px solid #f5f5f5":"none"}}>
              <span style={{fontFamily:mono,fontSize:9,color:"#737373",width:60}}>{row.stat}</span>
              <div style={{flex:1,height:5,background:"#f0f0f0",borderRadius:99,overflow:"hidden"}}><div style={{width:`${row.pct}%`,height:"100%",background:"linear-gradient(90deg,#1e3a5f,#1e3a5faa)",borderRadius:99}}/></div>
              <span style={{fontFamily:mono,fontSize:10,fontWeight:700,color:"#1e3a5f",width:42,textAlign:"right"}}>{row.val}</span>
              <span style={{fontFamily:mono,fontSize:9,fontWeight:700,color:"#7c3aed",width:32,textAlign:"right"}}>{row.pct}th</span>
            </div>)}
          </div>
        </div>
        <div style={tip}>💡 Switch between raw stats and historical percentile to see if a player's numbers are truly elite or just volume.</div>
      </div>

      {/* 08 — Dominator Ratings & Breakout Year */}
      <div id="guide-dominator" className="guide-card" style={{...card,scrollMarginTop:70,transition:"box-shadow 0.2s"}}>
        <div style={sectionNum("08")}>08</div>
        <div style={{width:"100%",height:1,background:"linear-gradient(90deg,#ec4899,#7c3aed,transparent)",margin:"4px 0 12px"}}/>
        <h2 style={h2s}>Dominator Ratings & Breakout Year</h2>
        <p style={desc}>Dominator rating measures what share of their team's production a player commanded. Breakout year identifies the earliest season a player crossed that threshold — a strong predictor of NFL success.</p>
        <div style={{border:"1px solid #e5e5e5",borderRadius:10,overflow:"hidden"}}>
          {[
            {name:"Tetairoa McMillan",pos:"WR",dom:"38.2% Rec Dom",breakout:"So"},
            {name:"Rueben Bain",pos:"EDGE",dom:"14.8% Pressure",breakout:"Fr"},
            {name:"Fernando Mendoza",pos:"QB",dom:"90.8% Pass Dom",breakout:"Jr"},
          ].map((row,i)=>{const c=POS_COLORS[row.pos];return<div key={row.name} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderBottom:i<2?"1px solid #f5f5f5":"none"}}>
            <span style={{fontFamily:mono,fontSize:9,fontWeight:700,color:c,background:`${c}0d`,padding:"2px 8px",borderRadius:99}}>{row.pos}</span>
            <span style={{fontFamily:sans,fontSize:12,fontWeight:600,color:"#171717",flex:1}}>{row.name}</span>
            <span style={{fontFamily:mono,fontSize:10,color:"#525252"}}>{row.dom}</span>
            <span style={{fontFamily:mono,fontSize:9,fontWeight:700,color:"#16a34a",background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:99,padding:"2px 8px"}}>{row.breakout}</span>
          </div>;})}
        </div>
        <div style={tip}>💡 Freshman breakout + elite dominator is the most predictive combination for NFL receivers. Filter by Breakout Year in the Data Lab to find them.</div>
      </div>

      {/* 09 — Live Depth Chart Updates */}
      <div id="guide-depth" className="guide-card" style={{...card,scrollMarginTop:70,transition:"box-shadow 0.2s"}}>
        <div style={sectionNum("09")}>09</div>
        <div style={{width:"100%",height:1,background:"linear-gradient(90deg,#ec4899,#7c3aed,transparent)",margin:"4px 0 12px"}}/>
        <h2 style={h2s}>Live Depth Chart Updates</h2>
        <p style={desc}>Every pick in the mock draft lands on the team's actual roster in real time. Watch starters get displaced, needs get filled, and see exactly where each rookie slots into the depth chart as the draft unfolds.</p>
        <div style={{border:"1px solid #e5e5e5",borderRadius:10,overflow:"hidden"}}>
          <div style={{fontFamily:mono,fontSize:9,letterSpacing:1.5,color:"#a3a3a3",textTransform:"uppercase",padding:"8px 12px",borderBottom:"1px solid #f0f0f0",display:"flex",alignItems:"center",gap:6}}>
            <NFLTeamLogo team="Raiders" size={16}/> raiders depth chart
          </div>
          {[
            {slot:"QB1",name:"Fernando Mendoza",draft:true,displaced:"Aidan O'Connell"},
            {slot:"EDGE1",name:"Khalil Mack",draft:false},
            {slot:"WR1",name:"Jakobi Meyers",draft:false},
            {slot:"CB2",name:"Avieon Terrell",draft:true,displaced:"Brandon Facyson"},
          ].map((row,i)=><div key={row.slot} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderBottom:i<3?"1px solid #f5f5f5":"none",background:row.draft?"rgba(34,197,94,0.04)":"transparent"}}>
            <span style={{fontFamily:mono,fontSize:9,fontWeight:700,color:"#a3a3a3",width:40}}>{row.slot}</span>
            <span style={{fontFamily:sans,fontSize:13,fontWeight:row.draft?700:500,color:row.draft?"#171717":"#737373",flex:1}}>{row.name}</span>
            {row.draft&&<span style={{fontFamily:mono,fontSize:8,fontWeight:700,color:"#22c55e",background:"rgba(34,197,94,0.1)",padding:"2px 8px",borderRadius:99}}>DRAFTED</span>}
            {row.displaced&&<span style={{fontFamily:mono,fontSize:8,color:"#ef4444",background:"rgba(239,68,68,0.06)",padding:"2px 8px",borderRadius:99}}>→ {row.displaced}</span>}
          </div>)}
        </div>
        <div style={tip}>💡 Depth charts update after every single pick, so you always know which needs are still open and which starters just got replaced.</div>
      </div>

      {/* 10 — Rank Prospects Head-to-Head */}
      <div id="guide-rank" className="guide-card" style={{...card,scrollMarginTop:70,transition:"box-shadow 0.2s"}}>
        <div style={sectionNum("10")}>10</div>
        <div style={{width:"100%",height:1,background:"linear-gradient(90deg,#ec4899,#7c3aed,transparent)",margin:"4px 0 12px"}}/>
        <h2 style={h2s}>Rank Prospects Head-to-Head</h2>
        <p style={desc}>Pick a position, and we'll serve up two prospects at a time. Choose who you'd draft first — your picks feed an Elo algorithm that builds your rankings automatically.</p>
        <div className="guide-pair-row" style={{display:"flex",gap:20,justifyContent:"center",alignItems:"center",margin:"16px 0"}}>
          {(()=>{const cards=demoProspects.slice(0,2).map(p=>{const c=POS_COLORS[p.gpos||p.pos];return<div key={p.id} style={{flex:"0 0 auto",background:"#faf9f6",border:`2px solid ${c}22`,borderRadius:14,padding:"16px 20px",textAlign:"center",minWidth:140}}>
            <SchoolLogo school={p.school} size={40}/>
            <div style={{fontFamily:font,fontSize:16,fontWeight:800,color:"#171717",marginTop:8}}>{p.name}</div>
            <span style={{fontFamily:mono,fontSize:10,fontWeight:700,color:c,background:`${c}0d`,padding:"3px 10px",borderRadius:99,display:"inline-block",marginTop:6}}>{p.gpos||p.pos}</span>
          </div>;});return<>{cards[0]}<div style={{fontFamily:font,fontSize:20,fontWeight:900,color:"#d4d4d4",flexShrink:0}}>vs</div>{cards[1]}</>;})()}
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
          {[{label:"coin flip",k:16},{label:"leaning",k:24},{label:"confident",k:32},{label:"lock",k:40}].map(({label,k},i)=>(
            <div key={label} style={{fontFamily:sans,fontSize:10,fontWeight:600,background:k>=32?"#171717":"#fff",color:k>=32?"#faf9f6":"#525252",border:`1px solid ${k>=32?"#171717":"#e5e5e5"}`,borderRadius:99,padding:"5px 12px"}}>{label}</div>
          ))}
        </div>
        <div style={tip}>💡 <strong>Focus mode:</strong> tap the 📌 icon next to any player in the live rankings sidebar to lock matchups on them. Every comparison will include that player until you unlock, so you can place them precisely on your board.</div>
      </div>

      {/* 11 — Team Specific Draft Trends */}
      <div id="guide-mock-trends" className="guide-card" style={{...card,scrollMarginTop:70,transition:"box-shadow 0.2s"}}>
        <div style={sectionNum("11")}>11</div>
        <div style={{width:"100%",height:1,background:"linear-gradient(90deg,#ec4899,#7c3aed,transparent)",margin:"4px 0 12px"}}/>
        <h2 style={h2s}>Team Specific Draft Trends</h2>
        <p style={desc}>See where prospects are getting drafted across the entire Big Board Lab community. ADP, positional trends, and team-level draft patterns — all aggregated in real time.</p>
        <div style={{border:"1px solid #e5e5e5",borderRadius:10,overflow:"hidden"}}>
          {[
            {rank:1,name:"Rueben Bain Jr.",pos:"EDGE",adp:"1.3",team:"Raiders"},
            {rank:2,name:"Caleb Downs",pos:"S",adp:"2.7",team:"Jets"},
            {rank:3,name:"Garrett Nussmeier",pos:"QB",adp:"4.1",team:"Cardinals"},
          ].map((row,i)=>{const c=POS_COLORS[row.pos];return<div key={row.name} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderBottom:i<2?"1px solid #f5f5f5":"none"}}>
            <span style={{fontFamily:mono,fontSize:11,fontWeight:700,color:"#a3a3a3",width:20,textAlign:"right"}}>{row.rank}</span>
            <NFLTeamLogo team={row.team} size={20}/>
            <span style={{fontFamily:mono,fontSize:9,fontWeight:700,color:c,background:`${c}0d`,padding:"2px 8px",borderRadius:99}}>{row.pos}</span>
            <span style={{fontFamily:sans,fontSize:12,fontWeight:600,color:"#171717",flex:1}}>{row.name}</span>
            <span style={{fontFamily:mono,fontSize:10,fontWeight:700,color:"#7c3aed"}}>ADP: {row.adp}</span>
          </div>;})}
        </div>
        <div style={tip}>💡 Use community ADP to spot where your evaluations diverge from the crowd — that's where you find your edge.</div>
      </div>

      {/* 12 — Compare Players Side by Side */}
      <div id="guide-compare" className="guide-card" style={{...card,scrollMarginTop:70,transition:"box-shadow 0.2s"}}>
        <div style={sectionNum("12")}>12</div>
        <div style={{width:"100%",height:1,background:"linear-gradient(90deg,#ec4899,#7c3aed,transparent)",margin:"4px 0 12px"}}/>
        <h2 style={h2s}>Compare Players Side by Side</h2>
        <p style={desc}>Pin up to 4 players from the same position and compare radar charts, individual trait scores, and overall grades in one view.</p>
        {(()=>{const pos=compProspects[0]?.gpos||compProspects[0]?.pos||"QB";const posTraits=POSITION_TRAITS[pos]||[];
          return<div>
            <div className="guide-compare-radars" style={{display:"flex",gap:16,justifyContent:"center",margin:"16px 0"}}>
              {compProspects.map((p,ci)=>{const vals=posTraits.map(t=>tv({},p.id,t,p.name,p.school));return<div key={p.id} style={{textAlign:"center"}}>
                <RadarChart traits={posTraits} values={vals} color={compColors[ci]} size={120}/>
                <div style={{fontFamily:mono,fontSize:10,fontWeight:600,color:compColors[ci],marginTop:-2}}>{shortName(p.name)}</div>
              </div>;})}
            </div>
            <div style={{border:"1px solid #e5e5e5",borderRadius:10,overflow:"hidden"}}>
              {posTraits.slice(0,4).map((t,ti)=>{const vals=compProspects.map(p=>tv({},p.id,t,p.name,p.school));const best=Math.max(...vals);const worst=Math.min(...vals);
                return<div key={t} style={{display:"flex",alignItems:"center",padding:"6px 12px",borderBottom:ti<3?"1px solid #f5f5f5":"none"}}>
                  <span style={{fontFamily:sans,fontSize:11,color:"#737373",width:100,flexShrink:0}}>{TRAIT_SHORT[t]||t}</span>
                  <div style={{flex:1,display:"flex",gap:12,justifyContent:"center"}}>
                    {vals.map((v,vi)=><span key={vi} style={{fontFamily:font,fontSize:13,fontWeight:700,color:v===best&&best!==worst?compColors[vi]:v===worst&&best!==worst?"#d4d4d4":"#525252",width:36,textAlign:"center"}}>{v}</span>)}
                  </div>
                </div>;
              })}
            </div>
          </div>;
        })()}
      </div>

      {/* 13 — Track Your Guys */}
      <div id="guide-track" className="guide-card" style={{...card,scrollMarginTop:70,transition:"box-shadow 0.2s"}}>
        <div style={sectionNum("13")}>13</div>
        <div style={{width:"100%",height:1,background:"linear-gradient(90deg,#ec4899,#7c3aed,transparent)",margin:"4px 0 12px"}}/>
        <h2 style={h2s}>Track Your Guys</h2>
        <p style={desc}>After running mock drafts, see which prospects you keep drafting. Your scouting fingerprint reveals the trait patterns you gravitate toward.</p>
        <div style={{display:"flex",flexDirection:"column",gap:8,margin:"16px 0"}}>
          {[{emoji:"🎯",text:"Prioritizes accuracy over arm strength"},{emoji:"🏎️",text:"Prefers speed at receiver"},{emoji:"🧱",text:"Values blocking tight ends"}].map((f,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,background:"#f5f3ff",border:"1px solid #ede9fe",borderRadius:10,padding:"8px 14px"}}>
              <span style={{fontSize:16}}>{f.emoji}</span>
              <span style={{fontFamily:sans,fontSize:12,color:"#525252"}}>{f.text}</span>
            </div>
          ))}
        </div>
        <div style={{border:"1px solid #e5e5e5",borderRadius:10,overflow:"hidden"}}>
          <div style={{fontFamily:mono,fontSize:9,letterSpacing:1.5,color:"#a3a3a3",textTransform:"uppercase",padding:"8px 12px",borderBottom:"1px solid #f0f0f0"}}>your top guys</div>
          {demoProspects.slice(0,3).map((p,i)=>{const c=POS_COLORS[p.gpos||p.pos];return<div key={p.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderBottom:i<2?"1px solid #f5f5f5":"none"}}>
            <SchoolLogo school={p.school} size={20}/>
            <span style={{fontFamily:sans,fontSize:12,fontWeight:600,color:"#171717",flex:1}}>{p.name}</span>
            <span style={{fontFamily:mono,fontSize:10,color:c,fontWeight:700}}>{p.gpos||p.pos}</span>
            <span style={{fontFamily:mono,fontSize:10,color:"#a3a3a3"}}>3× drafted</span>
          </div>;})}
        </div>
      </div>

      {/* 14 — Share Your Board */}
      <div id="guide-share" className="guide-card" style={{...card,scrollMarginTop:70,transition:"box-shadow 0.2s"}}>
        <div style={sectionNum("14")}>14</div>
        <div style={{width:"100%",height:1,background:"linear-gradient(90deg,#ec4899,#7c3aed,transparent)",margin:"4px 0 12px"}}/>
        <h2 style={h2s}>Share Your Results</h2>
        <p style={desc}>Share your big board, mock draft results, or your "My Guys" list — each generates a branded image card you can download and post to Twitter, Discord, or your group chat.</p>
        <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap",margin:"16px 0"}}>
          {["big board","mock results","my guys"].map((label,i)=>{const icons=["📋","🏈","👀"];return<div key={label} style={{display:"inline-flex",alignItems:"center",gap:6,fontFamily:sans,fontSize:11,fontWeight:600,color:i===0?"#7c3aed":"#525252",background:i===0?"#f5f3ff":"#fff",border:`1px solid ${i===0?"#ede9fe":"#e5e5e5"}`,borderRadius:99,padding:"6px 14px"}}>
            <span style={{fontSize:12}}>{icons[i]}</span>{label}
          </div>;})}
        </div>
        <div style={{display:"flex",gap:12,flexDirection:"column"}}>
          <div style={{background:"#fff",borderRadius:12,padding:"16px 20px",position:"relative",overflow:"hidden",border:"1px solid #e5e5e5"}}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,#ec4899,#7c3aed)"}}/>
            <div style={{fontFamily:font,fontSize:14,fontWeight:900,color:"#171717",marginBottom:6}}>my 2026 big board</div>
            {[{w:100,c:"#7c3aed"},{w:85,c:"#a855f7"},{w:70,c:"#c084fc"}].map((b,i)=><div key={i} style={{height:5,background:`linear-gradient(90deg,${b.c},${b.c}44)`,borderRadius:99,marginBottom:4,width:`${b.w}%`}}/>)}
            <div style={{fontFamily:mono,fontSize:7,color:"#d4d4d4",marginTop:6}}>bigboardlab.com</div>
          </div>
          <div style={{background:"#fff",borderRadius:12,padding:"16px 20px",position:"relative",overflow:"hidden",border:"1px solid #e5e5e5"}}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,#22c55e,#3b82f6)"}}/>
            <div style={{fontFamily:font,fontSize:14,fontWeight:900,color:"#171717",marginBottom:6}}>mock draft results</div>
            <div style={{display:"flex",gap:8}}>
              {["LV","NYJ","ARI"].map((t,i)=><div key={t} style={{display:"flex",alignItems:"center",gap:4}}>
                <span style={{fontFamily:mono,fontSize:8,color:"#a3a3a3"}}>{i+1}.</span>
                <span style={{fontFamily:mono,fontSize:9,color:"#171717",fontWeight:600}}>{t}</span>
              </div>)}
              <span style={{fontFamily:mono,fontSize:8,color:"#d4d4d4"}}>…</span>
            </div>
            <div style={{fontFamily:mono,fontSize:7,color:"#d4d4d4",marginTop:8}}>bigboardlab.com</div>
          </div>
        </div>
      </div>

      {/* 15 — Player Profiles */}
      <div id="guide-profiles" className="guide-card" style={{...card,scrollMarginTop:70,transition:"box-shadow 0.2s"}}>
        <div style={sectionNum("15")}>15</div>
        <div style={{width:"100%",height:1,background:"linear-gradient(90deg,#ec4899,#7c3aed,transparent)",margin:"4px 0 12px"}}/>
        <h2 style={h2s}>Player Profiles</h2>
        <p style={desc}>Tap any prospect to open a detailed profile with school logo, measurables, combine data, trait radar chart, and similar player comps.</p>
        {(()=>{const p=demoProspects[0];if(!p)return null;const pos=p.gpos||p.pos;const posTraits=POSITION_TRAITS[pos]||[];const c=POS_COLORS[pos];const vals=posTraits.map(t=>tv({},p.id,t,p.name,p.school));
          return<div style={{background:"#faf9f6",borderRadius:14,border:"1px solid #f0f0f0",padding:"20px",textAlign:"center"}}>
            <SchoolLogo school={p.school} size={48}/>
            <div style={{fontFamily:font,fontSize:20,fontWeight:900,color:"#171717",marginTop:8}}>{p.name}</div>
            <div style={{fontFamily:mono,fontSize:11,color:"#a3a3a3",marginTop:2}}>{p.school}</div>
            <div style={{marginTop:8,display:"inline-flex",alignItems:"baseline",gap:4}}>
              <span style={{fontFamily:font,fontSize:32,fontWeight:900,color:"#16a34a"}}>78</span>
              <span style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase"}}>grade</span>
            </div>
            <div style={{display:"flex",justifyContent:"center",gap:8,marginTop:8,flexWrap:"wrap"}}>
              {[{label:"HT",val:"6'3\""},{label:"WT",val:"245"}].map(({label,val})=>(
                <div key={label} style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:8,padding:"4px 12px",textAlign:"center"}}>
                  <div style={{fontFamily:mono,fontSize:7,letterSpacing:1.5,color:"#a3a3a3",textTransform:"uppercase"}}>{label}</div>
                  <div style={{fontFamily:mono,fontSize:12,fontWeight:700,color:"#171717"}}>{val}</div>
                </div>
              ))}
            </div>
            <div style={{display:"flex",justifyContent:"center",marginTop:12}}>
              <RadarChart traits={posTraits} values={vals} color={c} size={140}/>
            </div>
          </div>;
        })()}
      </div>

      {/* 16 — Drag to Reorder */}
      <div id="guide-reorder" className="guide-card" style={{...card,scrollMarginTop:70,transition:"box-shadow 0.2s"}}>
        <div style={sectionNum("16")}>16</div>
        <div style={{width:"100%",height:1,background:"linear-gradient(90deg,#ec4899,#7c3aed,transparent)",margin:"4px 0 12px"}}/>
        <h2 style={h2s}>Drag to Reorder</h2>
        <p style={desc}>Not happy with where someone landed? Grab the drag handle and move any prospect up or down your board to fine-tune your rankings.</p>
        <div style={{border:"1px solid #e5e5e5",borderRadius:10,overflow:"hidden"}}>
          {boardProspects.map((p,i)=>{const c=POS_COLORS[p.gpos||p.pos];const isHighlighted=i===2;return<div key={p.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderBottom:i<boardProspects.length-1?"1px solid #f5f5f5":"none",background:isHighlighted?"#f5f3ff":"#fff",borderLeft:isHighlighted?`3px solid #7c3aed`:"3px solid transparent"}}>
            <span style={{fontFamily:mono,fontSize:14,color:isHighlighted?"#7c3aed":"#d4d4d4",cursor:"grab",userSelect:"none"}}>⠿</span>
            <span style={{fontFamily:mono,fontSize:11,fontWeight:700,color:"#a3a3a3",width:20,textAlign:"right"}}>{i+1}</span>
            <span style={{fontFamily:mono,fontSize:9,fontWeight:700,color:c,background:`${c}0d`,padding:"2px 8px",borderRadius:99}}>{p.gpos||p.pos}</span>
            <SchoolLogo school={p.school} size={20}/>
            <span style={{fontFamily:sans,fontSize:13,fontWeight:600,color:"#171717",flex:1}}>{p.name}</span>
          </div>;})}
        </div>
        <div style={tip}>💡 Your reordering persists — drag changes are saved and reflected in your exported board.</div>
      </div>

      {/* FAQ Section */}
      <style>{`
        .guide-faq-item{border:none;margin:0 0 8px;}
        .guide-faq-item[open]{margin:0 0 8px;}
        .guide-faq-item summary{cursor:pointer;list-style:none;display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:10px;background:#fff;border:1px solid #e5e5e5;transition:all 0.15s;}
        .guide-faq-item summary:hover{border-color:#c4b5fd;background:#faf5ff;}
        .guide-faq-item summary::-webkit-details-marker{display:none;}
        .guide-faq-item[open] summary{border-color:#c4b5fd;background:#f5f3ff;}
        .guide-faq-item .faq-arrow{transition:transform 0.2s;flex-shrink:0;}
        .guide-faq-item[open] .faq-arrow{transform:rotate(90deg);}
      `}</style>
      <div className="guide-card" style={{...card,scrollMarginTop:70,transition:"box-shadow 0.2s",marginTop:32}}>
        <div style={{marginBottom:16}}>
          <div style={{fontFamily:font,fontSize:22,fontWeight:900,color:"#171717",lineHeight:1.1}}>Frequently Asked Questions</div>
        </div>
        <div style={{width:"100%",height:1,background:"linear-gradient(90deg,#ec4899,#7c3aed,transparent)",margin:"0 0 16px"}}/>

        {[
          {q:"What is a dominator rating?",a:"It measures what share of their team's total production a player owned — yards + TDs, divided by two. The standard WR/TE eval metric. We extend it to every position: passing dominance for QBs, rushing share for RBs, pressure rate for EDGE."},
          {q:"What is breakout year?",a:"The earliest college season a player crossed a dominator threshold. Freshman breakouts are the strongest NFL predictor — dominate early, translate at the next level. We compute it for every position, not just receivers."},
          {q:"How does the Data Lab work?",a:"Every prospect's athletic measurables displayed in beeswarm charts — compare across this class or against 26 years of combine history. Toggle raw values vs position percentiles. The college stats tab compares production against 10 years of FBS data. The scarcity map shows supply vs demand for each position group."},
          {q:"How are historical percentiles calculated?",a:"We compare each prospect's college stats against every FBS player at their position over the last 10 seasons. 90th percentile in receiving yards = out-produced 90% of all FBS players at that position."},
          {q:"Is Big Board Lab free?",a:"Completely. No paywall, no credit card, no signup. Rankings, trait grading, mock drafts, data lab, college stats, community trends — all of it, every user, zero cost."},
        ].map((faq,i)=><details key={i} className="guide-faq-item">
          <summary>
            <span className="faq-arrow" style={{fontFamily:mono,fontSize:10,color:"#7c3aed",fontWeight:700}}>›</span>
            <span style={{fontFamily:sans,fontSize:14,fontWeight:700,color:"#171717"}}>{faq.q}</span>
          </summary>
          <div style={{padding:"10px 14px 4px 34px"}}>
            <p style={{fontFamily:sans,fontSize:13,color:"#525252",lineHeight:1.6,margin:0}}>{faq.a}</p>
          </div>
        </details>)}
      </div>
    </div>

    {/* Glossary Section */}
    <div id="glossary" style={{maxWidth:720,margin:"40px auto",padding:"0 24px"}}>
      <h2 style={{fontFamily:font,fontSize:24,fontWeight:900,color:"#171717",marginBottom:4}}>Glossary</h2>
      <p style={{fontFamily:sans,fontSize:13,color:"#a3a3a3",marginBottom:16}}>Everything you see on Big Board Lab — what it means and how to read it.</p>
      <div className="trait-pills-scroll" style={{display:"flex",gap:5,marginBottom:24,overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none",paddingBottom:4}}>
        {[{id:"g-archetypes",label:"Archetypes"},{id:"g-traits",label:"Traits"},{id:"g-measurables",label:"Measurables"},{id:"g-ui",label:"UI & Tools"},{id:"g-positions",label:"Positions"},{id:"g-depth",label:"Depth Chart"}].map(n=><a key={n.id} href={"#"+n.id} style={{fontFamily:mono,fontSize:10,padding:"5px 12px",background:"#171717",color:"#faf9f6",borderRadius:99,textDecoration:"none",whiteSpace:"nowrap",flexShrink:0}}>{n.label}</a>)}
      </div>

      <div id="g-archetypes"/>
      <div style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:12}}>player archetypes</div>
      <p style={{fontFamily:sans,fontSize:12,color:"#737373",marginBottom:16,lineHeight:1.6}}>Archetypes describe what kind of player a prospect is. A player can have multiple. These appear as dark pills on the available player list and scouting reports.</p>
      {[
        {pos:"QB",items:[["🗽","Pocket Passer"],["🎭","Dual-Threat"],["👔","Game Manager"],["🔫","Gunslinger"]]},
        {pos:"RB",items:[["🐗","Power Back"],["🏁","Speed Back"],["🪃","Receiving Back"],["♠️","All-Purpose"]]},
        {pos:"WR",items:[["🍿","Boundary / X"],["🎰","Slot"],["🐆","Deep Threat"],["🛟","Possession"],["🦇","YAC Weapon"]]},
        {pos:"TE",items:[["🐏","Inline / Y"],["🏄","Move / F"],["🎣","Receiving TE"],["🧰","H-Back"]]},
        {pos:"OT",items:[["🚧","Pass Protector"],["🦣","Road Grader"],["🦑","Athletic Tackle"]]},
        {pos:"IOL",items:[["↔️","Zone Scheme"],["⬆️","Gap / Power"],["🔄","Versatile"]]},
        {pos:"EDGE",items:[["🌪️","Speed Rusher"],["🦏","Power Rusher"],["🐉","Complete"],["🦍","Run Defender"]]},
        {pos:"DL",items:[["🦡","Penetrating 3-Tech"],["🐘","Nose Tackle"],["🐊","Two-Gap"]]},
        {pos:"LB",items:[["☂️","Coverage"],["🔨","Thumper"],["🦈","Pass Rusher"],["🐺","Sideline-to-Sideline"],["👽","Chess Piece"]]},
        {pos:"CB",items:[["🧟","Press Man"],["🕸️","Zone Corner"],["🦎","Slot"]]},
        {pos:"S",items:[["🦂","Box Safety"],["🛸","Center Field"],["🎲","Hybrid"]]},
      ].map(({pos,items})=><div key={pos} style={{marginBottom:12}}>
        <span style={{fontFamily:mono,fontSize:9,fontWeight:700,color:POS_COLORS[pos]||"#525252",letterSpacing:1}}>{POS_EMOJI[pos]||""} {pos}</span>
        <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:4}}>{items.map(([emoji,label])=><span key={label} style={{fontFamily:mono,fontSize:9,color:"#171717",background:"#17171708",border:"1px solid #17171718",padding:"3px 8px",borderRadius:99,display:"inline-flex",alignItems:"center",gap:3}}>{emoji} {label}</span>)}</div>
      </div>)}

      <div id="g-ui" style={{marginTop:28}}/>
      <div style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:12}}>ui elements</div>
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:28}}>
        {[
          {el:<div style={{width:40,height:22,borderRadius:11,background:"linear-gradient(135deg,#4f46e5,#7c3aed,#a855f7)",position:"relative",flexShrink:0}}><div style={{width:16,height:16,borderRadius:8,background:"#fff",position:"absolute",top:3,left:21,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontFamily:mono,fontSize:7,fontWeight:700,color:"#6366f1"}}>SV</span></div></div>,label:"Scout Vision",desc:"Reorders prospects by scheme fit for the team on the clock."},
          {el:<span style={{fontFamily:mono,fontSize:7,fontWeight:700,color:"#a855f7",background:"rgba(168,85,247,0.08)",padding:"2px 5px",borderRadius:3}}>🔄 TRD</span>,label:"Trade",desc:"Pick was involved in a trade. Hover for details."},
          {el:<span style={{fontFamily:mono,fontSize:7,fontWeight:700,color:"#16a34a",background:"rgba(34,197,94,0.08)",padding:"2px 5px",borderRadius:3,border:"1px solid rgba(34,197,94,0.15)"}}>NEED</span>,label:"Need",desc:"Team on the clock needs this position."},
          {el:<span style={{fontFamily:mono,fontSize:7,fontWeight:700,color:"#dc2626",background:"rgba(239,68,68,0.08)",padding:"2px 5px",borderRadius:3,border:"1px solid rgba(239,68,68,0.15)"}}>RIVAL</span>,label:"Rival",desc:"A divisional rival picks soon and might take this player."},
          {el:<span style={{fontFamily:mono,fontSize:7,fontWeight:700,color:"#ca8a04",background:"rgba(234,179,8,0.08)",padding:"2px 5px",borderRadius:3,border:"1px solid rgba(234,179,8,0.15)"}}>SLIDE</span>,label:"Slide",desc:"Prospect has fallen past their consensus rank. Value opportunity."},
          {el:<span style={{fontFamily:mono,fontSize:7,fontWeight:700,color:"#0891b2",background:"rgba(8,145,178,0.08)",padding:"2px 5px",borderRadius:3,border:"1px solid rgba(8,145,178,0.15)"}}>FIT</span>,label:"Scheme Fit",desc:"Prospect fits the team's scheme above the fit threshold."},
          {el:<span style={{fontFamily:mono,fontSize:8,fontWeight:700,color:"#f97316",background:"rgba(249,115,22,0.08)",padding:"2px 6px",borderRadius:99}}>FA</span>,label:"Free Agent",desc:"Player acquired in free agency or via trade this offseason."},
          {el:<div style={{display:"flex",gap:1,alignItems:"flex-end"}}>{[70,85,55,90,75,60,80,65,72,88].map((v,i)=><div key={i} style={{width:3,height:v/5,background:i<5?"#a855f7":"#0d9488",borderRadius:1}}/>)}</div>,label:"Equalizer",desc:"Bar chart on player profiles. Purple = trait scores, teal = measurables. A visual fingerprint at a glance."},
          {el:<svg width={28} height={28} viewBox="0 0 28 28"><polygon points="14,3 25,9 23,22 5,22 3,9" fill="rgba(168,85,247,0.12)" stroke="#a855f7" strokeWidth={1.2}/><polygon points="14,6 21,14 18,22 10,22 7,14" fill="rgba(13,148,136,0.12)" stroke="#0d9488" strokeWidth={1.2}/></svg>,label:"Spider Chart",desc:"Radar chart on player profiles. Purple polygon = traits, teal polygon = measurables. Shows the shape of strengths and weaknesses."},
        ].map(({el,label,desc})=><div key={label} style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{flexShrink:0,width:50,display:"flex",justifyContent:"center"}}>{el}</div>
          <span style={{fontFamily:sans,fontSize:12,color:"#525252"}}><strong>{label}</strong> — {desc}</span>
        </div>)}
      </div>

      <div id="g-traits" style={{marginTop:28}}/>
      <div style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:8}}>scouting traits</div>
      <p style={{fontFamily:sans,fontSize:12,color:"#737373",marginBottom:12,lineHeight:1.6}}>1-100 grades for each skill area at every position. Emoji badges appear when a prospect ranks in the 90th percentile.</p>
      <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:28}}>{Object.entries(TRAIT_EMOJI).filter(([t])=>!["Leg Strength","Consistency","Clutch","Directional Control","Hang Time"].includes(t)).map(([trait,emoji])=><span key={trait} title={trait} style={{fontFamily:mono,fontSize:9,color:"#525252",background:"#f5f5f5",padding:"3px 8px",borderRadius:99,display:"inline-flex",alignItems:"center",gap:3}}>{emoji} {TRAIT_SHORT[trait]||trait}</span>)}</div>

      <div id="g-measurables" style={{marginTop:28}}/>
      <div style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:8}}>combine measurables</div>
      <p style={{fontFamily:sans,fontSize:12,color:"#737373",marginBottom:12,lineHeight:1.6}}>Athletic testing from the NFL Combine and pro days. Shown as position percentiles.</p>
      <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:28}}>{Object.entries(MEASURABLE_EMOJI).map(([code,emoji])=><span key={code} title={MEASURABLE_SHORT[code]||code} style={{fontFamily:mono,fontSize:9,color:"#525252",background:"#f5f5f5",padding:"3px 8px",borderRadius:99,display:"inline-flex",alignItems:"center",gap:3}}>{emoji} {MEASURABLE_SHORT[code]||code}</span>)}</div>

      <div id="g-positions" style={{marginTop:28}}/>
      <div style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:8}}>position groups</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:28}}>{POSITION_GROUPS.map(pos=><span key={pos} style={{fontFamily:mono,fontSize:10,fontWeight:700,color:POS_COLORS[pos],background:POS_COLORS[pos]+"11",border:`1px solid ${POS_COLORS[pos]}33`,padding:"4px 12px",borderRadius:99}}>{POS_EMOJI[pos]} {pos}</span>)}</div>

      <div id="g-depth" style={{marginTop:28}}/>
      <div style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:8}}>depth chart & formation</div>
      <p style={{fontFamily:sans,fontSize:12,color:"#737373",marginBottom:12,lineHeight:1.6}}>During mock drafts, every pick slots into the team's real depth chart. The formation view shows starters as dots in their on-field positions.</p>
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
        {[
          {el:<svg width={20} height={20}><circle cx={10} cy={10} r={6} fill="#d4d4d4" stroke="#a3a3a3" strokeWidth={0.5}/></svg>,label:"Empty slot",desc:"No current starter at this position."},
          {el:<svg width={20} height={20}><circle cx={10} cy={10} r={6} fill="#a8a29e" stroke="#a8a29e" strokeWidth={0.5}/></svg>,label:"Rostered player",desc:"A current NFL player filling this depth chart slot."},
          {el:<svg width={20} height={20}><circle cx={10} cy={10} r={6} fill="#7c3aed" stroke="#7c3aed" strokeWidth={1}/><polygon transform="translate(10,10)" points="0,-3 0.7,-1 2.8,-0.9 1.1,0.4 1.7,2.4 0,1.2 -1.7,2.4 -1.1,0.4 -2.8,-0.9 -0.7,-1" fill="white"/></svg>,label:"Drafted player",desc:"A prospect you just drafted, shown with a purple dot and star."},
          {el:<svg width={20} height={20}><circle cx={10} cy={10} r={5} fill="none" stroke="#f97316" strokeWidth={1}/><circle cx={10} cy={10} r={3} fill="#a8a29e"/></svg>,label:"Free agent acquisition",desc:"Player with an orange ring was signed or traded for this offseason."},
          {el:<div style={{display:"flex",gap:2}}><div style={{width:6,height:6,borderRadius:3,background:"#6d28d9"}}/><div style={{width:6,height:6,borderRadius:3,background:"#8b5cf6"}}/><div style={{width:6,height:6,borderRadius:3,background:"#a78bfa"}}/><div style={{width:6,height:6,borderRadius:3,background:"#78716c"}}/><div style={{width:6,height:6,borderRadius:3,background:"#d6d3d1"}}/></div>,label:"Performance tier dots",desc:"Purple-scale dots next to depth chart names indicating player caliber. Dark purple = elite, medium = pro bowl, light = quality starter, gray = starter/rotational, faded = backup."},
        ].map(({el,label,desc})=><div key={label} style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{flexShrink:0,width:50,display:"flex",justifyContent:"center"}}>{el}</div>
          <span style={{fontFamily:sans,fontSize:12,color:"#525252"}}><strong>{label}</strong> — {desc}</span>
        </div>)}
      </div>
      <div style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:8,marginTop:20}}>defensive schemes</div>
      <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:28}}>
        <div style={{fontFamily:sans,fontSize:12,color:"#525252"}}><strong>3-4</strong> — Three down linemen, four linebackers. OLBs rush the edge.</div>
        <div style={{fontFamily:sans,fontSize:12,color:"#525252"}}><strong>4-3</strong> — Four down linemen, three linebackers. DEs rush the edge.</div>
        <div style={{fontFamily:sans,fontSize:12,color:"#525252"}}><strong>4-2-5 / Wide 9</strong> — Nickel-heavy with five defensive backs. Modern passing-game defense.</div>
      </div>
    </div>

    {/* Bottom CTA */}
    <div style={{maxWidth:720,margin:"40px auto",padding:"0 24px"}}>
      <div style={{background:"linear-gradient(135deg,#0f172a,#1e293b)",borderRadius:16,padding:"32px 28px",textAlign:"center",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,#ec4899,#7c3aed)"}}/>
        <h2 style={{fontFamily:font,fontSize:24,fontWeight:900,color:"#fff",margin:"0 0 12px"}}>ready to build your board?</h2>
        <p style={{fontFamily:sans,fontSize:14,color:"rgba(255,255,255,0.6)",margin:"0 0 20px"}}>450+ prospects. Every trait. The most realistic mock draft ever built.</p>
        <button onClick={onBack} style={{fontFamily:sans,fontSize:14,fontWeight:700,color:"#fff",background:"linear-gradient(135deg,#ec4899,#7c3aed)",border:"none",borderRadius:99,padding:"12px 32px",cursor:"pointer"}}>start now →</button>
      </div>
    </div>

    {/* Footer */}
    <TwitterFooter/>
    <div style={{textAlign:"center",padding:"4px 24px 40px",display:"flex",justifyContent:"center",gap:20}}>
      <a href="/privacy.html" style={{fontFamily:mono,fontSize:10,color:"#a3a3a3",textDecoration:"none"}}>privacy</a>
      <a href="/terms.html" style={{fontFamily:mono,fontSize:10,color:"#a3a3a3",textDecoration:"none"}}>terms</a>
    </div>
  </div>);
}

// ============================================================
// OG Preview: renders a 1200x630 composite for Open Graph image capture
// ============================================================
function OGRadar({traits,values,color,size=200}){
  // Like RadarChart but with full trait labels
  const cx=size/2,cy=size/2,r=size/2-32,n=traits.length;
  const angles=traits.map((_,i)=>(Math.PI*2*i)/n-Math.PI/2);
  const pv=angles.map((a,i)=>{const v=(values[i]||50)/100;return[cx+r*v*Math.cos(a),cy+r*v*Math.sin(a)];});
  return(<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
    {[.25,.5,.75,1].map(lv=><polygon key={lv} points={angles.map(a=>`${cx+r*lv*Math.cos(a)},${cy+r*lv*Math.sin(a)}`).join(" ")} fill="none" stroke="#e5e5e5" strokeWidth="0.5"/>)}
    {angles.map((a,i)=><line key={i} x1={cx} y1={cy} x2={cx+r*Math.cos(a)} y2={cy+r*Math.sin(a)} stroke="#e5e5e5" strokeWidth="0.5"/>)}
    <polygon points={pv.map(p=>p.join(",")).join(" ")} fill={`${color}18`} stroke={color} strokeWidth="2"/>
    {pv.map((p,i)=><circle key={i} cx={p[0]} cy={p[1]} r="3" fill={color}/>)}
    {traits.map((t,i)=>{const lr=r+22;const x=cx+lr*Math.cos(angles[i]);const y=cy+lr*Math.sin(angles[i]);
      return<text key={t} x={x} y={y} textAnchor="middle" dominantBaseline="middle" style={{fontSize:"7.5px",fill:"#737373",fontFamily:"'DM Sans',sans-serif",fontWeight:500}}>{t}</text>;
    })}
  </svg>);
}
function OGPreview(){
  const ref=useRef(null);
  const download=async()=>{
    const html2canvas=(await import("html2canvas")).default;
    const canvas=await html2canvas(ref.current,{width:1200,height:630,scale:2,backgroundColor:"#faf9f6",useCORS:true});
    const a=document.createElement("a");a.href=canvas.toDataURL("image/png");a.download="og-image.png";a.click();
  };

  const ogProspects=[
    PROSPECTS.find(p=>p.name==="Rueben Bain Jr."),
    PROSPECTS.find(p=>p.name==="Caleb Downs"),
    PROSPECTS.find(p=>p.name==="Francis Mauigoa"),
    PROSPECTS.find(p=>p.name==="Garrett Nussmeier"),
    PROSPECTS.find(p=>p.name==="Jordyn Tyson"),
    PROSPECTS.find(p=>p.name==="David Bailey"),
    PROSPECTS.find(p=>p.name==="Arvell Reese"),
  ].filter(Boolean);

  const pairA=PROSPECTS.find(p=>p.name==="Rueben Bain Jr.");
  const pairB=PROSPECTS.find(p=>p.name==="David Bailey");
  const profileP=PROSPECTS.find(p=>p.name==="Garrett Nussmeier");
  const teamLogos=["Raiders","Jets","Cardinals","Titans","Giants","Browns","Commanders","Saints","Chiefs","Bengals","Dolphins","Cowboys","Rams","Ravens","Buccaneers","Lions"];

  return(
    <div style={{minHeight:"100vh",background:"#1a1a1a",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:24,padding:40}}>
      <div style={{fontFamily:sans,fontSize:14,color:"#a3a3a3"}}>OG Image Preview — 1200 x 630</div>
      <div ref={ref} style={{width:1200,height:630,background:"#faf9f6",overflow:"hidden",display:"flex",flexDirection:"column"}}>

        {/* ===== CONTENT ===== */}
        <div style={{flex:1,display:"flex",padding:32,gap:24}}>

          {/* LEFT — Hero + Big Board */}
          <div style={{width:420,display:"flex",flexDirection:"column",gap:20,flexShrink:0}}>
            {/* Hero */}
            <div>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                <img src="/logo.png" alt="" style={{width:75,height:"auto"}}/>
                <div>
                  <div style={{fontFamily:mono,fontSize:8,letterSpacing:3,color:"#a3a3a3",textTransform:"uppercase"}}>2026 NFL Draft</div>
                  <div style={{fontFamily:font,fontSize:32,fontWeight:900,color:"#171717",lineHeight:1,letterSpacing:-1.5}}>big board lab</div>
                </div>
              </div>
              <div style={{fontFamily:sans,fontSize:13,color:"#737373",lineHeight:1.5}}>Rank prospects. Grade every trait. Run the most realistic mock draft ever built.</div>
              <div style={{width:80,height:3,background:"linear-gradient(90deg,#ec4899,#7c3aed)",borderRadius:99,marginTop:10}}/>
            </div>

            {/* Mini Big Board */}
            <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,overflow:"hidden",flex:1}}>
              <div style={{padding:"10px 14px",borderBottom:"1px solid #f0f0f0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontFamily:font,fontSize:13,fontWeight:900,color:"#171717"}}>Big Board</div>
                <div style={{display:"flex",gap:4}}>
                  {["QB","WR","EDGE","OT","S"].map(g=><span key={g} style={{fontFamily:mono,fontSize:7,fontWeight:700,color:POS_COLORS[g],background:`${POS_COLORS[g]}0d`,padding:"2px 6px",borderRadius:99}}>{g}</span>)}
                </div>
              </div>
              {ogProspects.map((p,i)=>{const c=POS_COLORS[p.gpos||p.pos];const posTraits=POSITION_TRAITS[p.gpos||p.pos]||[];const vals=posTraits.map(t=>tv({},p.id,t,p.name,p.school));return<div key={p.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 14px",borderBottom:i<ogProspects.length-1?"1px solid #f5f5f5":"none"}}>
                <span style={{fontFamily:mono,fontSize:11,fontWeight:700,color:"#d4d4d4",width:18,textAlign:"right"}}>{i+1}</span>
                <span style={{fontFamily:mono,fontSize:8,fontWeight:700,color:c,background:`${c}0d`,padding:"2px 7px",borderRadius:99}}>{p.gpos||p.pos}</span>
                <SchoolLogo school={p.school} size={20}/>
                <span style={{fontFamily:sans,fontSize:12,fontWeight:600,color:"#171717",flex:1}}>{p.name}</span>
                <MiniRadar values={vals} color={c} size={22}/>
              </div>;})}
            </div>
          </div>

          {/* RIGHT — 2x2 feature cards */}
          <div style={{flex:1,display:"grid",gridTemplateColumns:"1fr 1fr",gridTemplateRows:"1fr 1fr",gap:16}}>

            {/* Card 1 — Pair Ranking */}
            <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:16,display:"flex",flexDirection:"column"}}>
              <div style={{fontFamily:sans,fontSize:11,fontWeight:700,color:"#171717",marginBottom:4}}>Head-to-Head Rankings</div>
              <div style={{fontFamily:sans,fontSize:9,color:"#a3a3a3",marginBottom:10}}>Pick who you'd draft first</div>
              <div style={{flex:1,display:"flex",gap:10,alignItems:"center",justifyContent:"center"}}>
                {pairA&&pairB&&(()=>{const cA=POS_COLORS[pairA.gpos||pairA.pos];const cB=POS_COLORS[pairB.gpos||pairB.pos];
                  const card=(p,pc,sel)=><div style={{background:sel?`${pc}06`:"#faf9f6",border:sel?`2px solid ${pc}`:`1.5px solid ${pc}22`,borderRadius:10,padding:"10px 14px",textAlign:"center"}}>
                    <SchoolLogo school={p.school} size={28}/>
                    <div style={{fontFamily:font,fontSize:12,fontWeight:800,color:"#171717",marginTop:4,lineHeight:1.1}}>{shortName(p.name)}</div>
                    <span style={{fontFamily:mono,fontSize:8,fontWeight:700,color:pc,background:`${pc}0d`,padding:"1px 6px",borderRadius:99,display:"inline-block",marginTop:4}}>{p.gpos||p.pos}</span>
                  </div>;
                  return<>{card(pairA,cA,true)}<span style={{fontFamily:font,fontSize:14,fontWeight:900,color:"#d4d4d4"}}>vs</span>{card(pairB,cB,false)}</>;
                })()}
              </div>
              <div style={{display:"flex",gap:5,justifyContent:"center",marginTop:8}}>
                {["coin flip","leaning","confident","lock"].map((l,i)=><span key={l} style={{fontFamily:sans,fontSize:7,fontWeight:600,background:i>=2?"#171717":"#fff",color:i>=2?"#faf9f6":"#525252",border:`1px solid ${i>=2?"#171717":"#e5e5e5"}`,borderRadius:99,padding:"2px 8px"}}>{l}</span>)}
              </div>
            </div>

            {/* Card 2 — Trait Grading */}
            <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:16,display:"flex",flexDirection:"column"}}>
              <div style={{fontFamily:sans,fontSize:11,fontWeight:700,color:"#171717",marginBottom:4}}>Spider Charts & Trait Grading</div>
              <div style={{fontFamily:sans,fontSize:9,color:"#a3a3a3",marginBottom:10}}>Slide traits, watch grades update</div>
              {(()=>{if(!profileP)return null;const pos=profileP.gpos||profileP.pos;const posTraits=POSITION_TRAITS[pos]||[];const c=POS_COLORS[pos];const vals=[82,75,68,72,78,65];
                return<div style={{flex:1,display:"flex",alignItems:"center",gap:10}}>
                  <div style={{display:"flex",flexDirection:"column",gap:4,flex:1}}>
                    {posTraits.map((t,i)=>{const v=vals[i]||60;return<div key={t} style={{display:"flex",alignItems:"center",gap:4}}>
                      <span style={{fontFamily:mono,fontSize:7,fontWeight:600,color:"#a3a3a3",width:22,textAlign:"right",flexShrink:0}}>{TRAIT_ABBREV[t]||t.slice(0,3).toUpperCase()}</span>
                      <div style={{flex:1,height:4,background:"#f0f0f0",borderRadius:99,overflow:"hidden"}}><div style={{width:`${v}%`,height:"100%",background:"linear-gradient(90deg,#ec4899,#7c3aed)",borderRadius:99}}/></div>
                      <span style={{fontFamily:mono,fontSize:7,fontWeight:700,color:"#525252",width:14,textAlign:"right"}}>{v}</span>
                    </div>;})}
                  </div>
                  <OGRadar traits={posTraits} values={vals} color={c} size={150}/>
                </div>;
              })()}
            </div>

            {/* Card 3 — 32 AI GMs */}
            <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:16,display:"flex",flexDirection:"column"}}>
              <div style={{fontFamily:sans,fontSize:11,fontWeight:700,color:"#171717",marginBottom:4}}>Mock Draft vs 32 AI GMs</div>
              <div style={{fontFamily:sans,fontSize:9,color:"#a3a3a3",marginBottom:10}}>Real team tendencies & trade logic</div>
              <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",gap:8}}>
                <div style={{display:"grid",gridTemplateColumns:"repeat(8,1fr)",gap:6}}>
                  {teamLogos.map(t=><div key={t} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                    <NFLTeamLogo team={t} size={22}/>
                    <span style={{fontFamily:mono,fontSize:6,color:"#a3a3a3",fontWeight:600}}>{NFL_TEAM_ABR[t]}</span>
                  </div>)}
                </div>
                <div style={{textAlign:"center"}}>
                  <span style={{fontFamily:sans,fontSize:10,fontWeight:700,color:"#fff",background:"linear-gradient(135deg,#ec4899,#7c3aed)",borderRadius:99,padding:"5px 18px",display:"inline-block"}}>start draft</span>
                </div>
              </div>
            </div>

            {/* Card 4 — Filter by Traits + Depth Charts */}
            <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:16,display:"flex",flexDirection:"column"}}>
              <div style={{fontFamily:sans,fontSize:11,fontWeight:700,color:"#171717",marginBottom:4}}>Filter by Elite Traits</div>
              <div style={{fontFamily:sans,fontSize:9,color:"#a3a3a3",marginBottom:8}}>Rank & draft by specific skills</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:10}}>
                {["Pass Rush","Speed","Man Coverage","Route Running","Accuracy","Hands"].map(t=><span key={t} style={{fontFamily:sans,fontSize:7,fontWeight:600,color:"#7c3aed",background:"#f5f3ff",border:"1px solid #ede9fe",borderRadius:99,padding:"2px 7px",display:"inline-flex",alignItems:"center",gap:2}}>
                  <span style={{fontSize:7}}>{TRAIT_EMOJI[t]}</span>{t}
                </span>)}
              </div>
              <div style={{flex:1,borderRadius:8,overflow:"hidden",border:"1px solid #f0f0f0"}}>
                <div style={{fontFamily:mono,fontSize:7,letterSpacing:1,color:"#a3a3a3",textTransform:"uppercase",padding:"5px 8px",borderBottom:"1px solid #f0f0f0",display:"flex",alignItems:"center",gap:4}}>
                  <span style={{fontSize:8}}>🚀</span> ranking by: pass rush
                </div>
                {[{name:"Bain Jr.",pos:"EDGE",val:92},{name:"Parker",pos:"EDGE",val:88},{name:"Bailey",pos:"DL",val:85},{name:"Halton",pos:"DL",val:82}].map((p,i)=>{const c=POS_COLORS[p.pos];return<div key={p.name} style={{display:"flex",alignItems:"center",gap:5,padding:"3px 8px",borderBottom:i<3?"1px solid #f8f8f8":"none"}}>
                  <span style={{fontFamily:mono,fontSize:7,fontWeight:700,color:c,background:`${c}0d`,padding:"1px 5px",borderRadius:99}}>{p.pos}</span>
                  <span style={{fontFamily:sans,fontSize:9,fontWeight:600,color:"#171717",flex:1}}>{p.name}</span>
                  <span style={{fontFamily:mono,fontSize:9,fontWeight:700,color:"#7c3aed"}}>{p.val}</span>
                </div>;})}
              </div>
            </div>
          </div>
        </div>

        {/* ===== BOTTOM STRIP ===== */}
        <div style={{height:36,background:"#171717",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 32px",flexShrink:0,position:"relative"}}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,#ec4899,#7c3aed)"}}/>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <img src="/logo.png" alt="" style={{height:16,filter:"brightness(0) invert(1)"}}/>
            <span style={{fontFamily:font,fontSize:13,fontWeight:900,color:"#fff",letterSpacing:"-0.02em"}}>bigboardlab.com</span>
          </div>
          <div style={{display:"flex",gap:16}}>
            {["450+ Prospects","Trait Grading","32 AI GMs","Live Depth Charts","Share Results"].map(t=><span key={t} style={{fontFamily:sans,fontSize:10,color:"#737373"}}>{t}</span>)}
          </div>
        </div>
      </div>

      <button onClick={download} style={{fontFamily:sans,fontSize:14,fontWeight:700,color:"#fff",background:"#7c3aed",border:"none",padding:"12px 32px",borderRadius:8,cursor:"pointer"}}>Download as PNG</button>
    </div>
  );
}

// ============================================================
// Root App: handles auth state
// ============================================================
export default function App(){
  // Strip trailing slashes from URL so all path checks work (e.g. /board/ → /board)
  if(window.location.pathname.length>1&&window.location.pathname.endsWith('/'))window.history.replaceState({},'',window.location.pathname.replace(/\/+$/,'')+window.location.search+window.location.hash);
  const[user,setUser]=useState(null);
  const[loading,setLoading]=useState(true);
  const[showAdmin,setShowAdmin]=useState(()=>{const h=window.location.hash;return h==="#admin"?"dashboard":h==="#admin/grades"?"grades":null;});
  const[showOG,setShowOG]=useState(()=>window.location.hash==="#og-preview");
  const[showGuide,setShowGuide]=useState(()=>window.location.pathname==='/guide');
  const[showGlossary,setShowGlossary]=useState(()=>window.location.pathname==='/glossary');
  const[showGmQuiz,setShowGmQuiz]=useState(()=>window.location.pathname==='/gm'||window.location.pathname==='/which-gm-are-you');
  const[showDraftBracket,setShowDraftBracket]=useState(()=>window.location.pathname==='/draft-bracket');
  const[gmQuizMockLaunch,setGmQuizMockLaunch]=useState(null);// {team} from quiz CTA
  const[isGuest,setIsGuest]=useState(false);
  const[authPrompt,setAuthPrompt]=useState(null);
  const[adminOverrides,setAdminOverrides]=useState({});
  const authSourceRef=useRef(null);
  if(authSourceRef.current===null){try{const s=sessionStorage.getItem('authSource');if(s)authSourceRef.current=s;}catch(e){}}

  useEffect(()=>{
    const onHash=()=>{const h=window.location.hash;setShowAdmin(h==="#admin"?"dashboard":h==="#admin/grades"?"grades":null);setShowOG(h==="#og-preview");};
    window.addEventListener("hashchange",onHash);
    return()=>window.removeEventListener("hashchange",onHash);
  },[]);

  useEffect(()=>{
    const onPop=()=>{setShowGuide(window.location.pathname==='/guide');setShowGlossary(window.location.pathname==='/glossary');setShowGmQuiz(window.location.pathname==='/gm'||window.location.pathname==='/which-gm-are-you');setShowDraftBracket(window.location.pathname==='/draft-bracket');};
    window.addEventListener("popstate",onPop);
    return()=>window.removeEventListener("popstate",onPop);
  },[]);

  const navigateToGuide=useCallback(()=>{window.history.pushState({},'','/guide');setShowGuide(true);},[]);

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      setUser(session?.user||null);
      if(session?.user)trackEvent(session.user.id,'session_return');
      setLoading(false);
    });
    const{data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{
      setUser(session?.user||null);
      if(session?.user&&event==='SIGNED_IN'){const created=new Date(session.user.created_at);const isNew=(Date.now()-created.getTime())<10000;const src=authSourceRef.current||'homepage';trackEvent(session.user.id,isNew?'signup':'login',isNew?{source:src}:{});authSourceRef.current=null;try{sessionStorage.removeItem('authSource')}catch(e){}}
    });
    return()=>subscription.unsubscribe();
  },[]);

  useEffect(()=>{supabase.from('admin_overrides').select('overrides').eq('id',1).single().then(({data})=>{if(data?.overrides)setAdminOverrides(data.overrides);});},[]);
  const signOut=async()=>{try{await supabase.auth.signOut();}catch(e){}setUser(null);};

  if(loading)return<div style={{minHeight:"100vh",background:"#faf9f6",display:"flex",alignItems:"center",justifyContent:"center"}}><p style={{fontFamily:"'DM Sans',sans-serif",fontSize:14,color:"#a3a3a3"}}>loading...</p></div>;
  if(showGuide)return<GuidePage onBack={()=>{window.history.back();}}/>;
  if(showGlossary){
    const glossSec=(title,subtitle,items)=><div style={{marginBottom:36}}>
      <div style={{fontFamily:font,fontSize:20,fontWeight:900,color:"#171717",marginBottom:2}}>{title}</div>
      {subtitle&&<div style={{fontFamily:sans,fontSize:12,color:"#a3a3a3",marginBottom:12}}>{subtitle}</div>}
      <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:14,overflow:"hidden"}}>
        {items.map(([emoji,label,desc],i)=><div key={label} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 14px",borderBottom:i<items.length-1?"1px solid #f5f5f5":"none"}}>
          <span style={{fontSize:18,flexShrink:0,width:24,textAlign:"center",marginTop:1}}>{emoji}</span>
          <div style={{flex:1,minWidth:0}}><div style={{fontFamily:sans,fontSize:13,fontWeight:700,color:"#171717"}}>{label}</div><div style={{fontFamily:sans,fontSize:12,color:"#737373",lineHeight:1.5}}>{desc}</div></div>
        </div>)}
      </div>
    </div>;
    const glossNav=[{id:"archetypes",label:"Archetypes"},{id:"traits",label:"Traits"},{id:"measurables",label:"Measurables"},{id:"ui",label:"UI & Tools"},{id:"positions",label:"Positions"},{id:"depth",label:"Depth Chart"}];
    return(
    <div style={{minHeight:"100vh",background:"#faf9f6",fontFamily:sans}}>
      <div style={{position:"fixed",top:0,left:0,right:0,zIndex:100,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 16px",background:"#fff",borderBottom:"1px solid #f0f0f0"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}} onClick={()=>window.history.back()}>
          <img src="/logo.png" alt="" style={{height:20}}/>
          <span style={{fontFamily:font,fontSize:16,fontWeight:900,color:"#171717"}}>glossary</span>
        </div>
        <button onClick={()=>window.history.back()} style={{fontFamily:sans,fontSize:11,color:"#a3a3a3",background:"none",border:"1px solid #e5e5e5",borderRadius:99,padding:"4px 12px",cursor:"pointer"}}>← back</button>
      </div>
      <div style={{maxWidth:700,margin:"0 auto",padding:"60px 20px 80px"}}>
        <h1 style={{fontFamily:font,fontSize:28,fontWeight:900,color:"#171717",marginBottom:4}}>Glossary</h1>
        <p style={{fontFamily:sans,fontSize:13,color:"#a3a3a3",marginBottom:16}}>Everything you see on Big Board Lab — what it means and how to read it.</p>
        <div className="trait-pills-scroll" style={{display:"flex",gap:5,marginBottom:32,overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none",paddingBottom:4}}>
          {glossNav.map(n=><a key={n.id} href={"#"+n.id} style={{fontFamily:mono,fontSize:10,padding:"5px 12px",background:"#171717",color:"#faf9f6",borderRadius:99,textDecoration:"none",whiteSpace:"nowrap",flexShrink:0}}>{n.label}</a>)}
        </div>

        <div id="archetypes"/>
        <div style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:16}}>player archetypes</div>
        <p style={{fontFamily:sans,fontSize:12,color:"#737373",marginBottom:20,lineHeight:1.6}}>Archetypes describe what kind of player a prospect is — how scouts and GMs categorize them within a position. A player can have multiple archetypes. These appear as dark pills on the available player list and on scouting reports.</p>
        {[
          {pos:"QB",items:[["🗽","Pocket Passer","Classic drop-back passer. Wins from the pocket with arm talent, processing, and anticipation."],["🎭","Dual-Threat","Genuine running ability combined with passing. Creates with legs when the pocket breaks down."],["👔","Game Manager","High-floor, smart decision-maker. Limits turnovers, moves the chains, won't lose you the game."],["🔫","Gunslinger","Big arm, aggressive mentality. Makes throws others won't attempt. High reward, higher risk."]]},
          {pos:"RB",items:[["🐗","Power Back","Wins between the tackles with physicality, contact balance, and leg drive. Punishes defenders."],["🏁","Speed Back","Home-run threat. Explosive long speed, takes it to the house from anywhere on the field."],["🪃","Receiving Back","Pass-catching weapon out of the backfield. Runs routes, works in screens, dual-threat in the passing game."],["♠️","All-Purpose","Does everything well. No glaring weakness. Can stay on the field for all three downs."]]},
          {pos:"WR",items:[["🍿","Boundary / X","Plays outside. Wins at the catch point, beats press coverage, works the sideline. Typically bigger-framed."],["🎰","Slot","Works from the inside. Quick-twitch, route craft, finds soft spots in zone coverage."],["🐆","Deep Threat","Vertical specialist. Speed is the defining trait. Stretches the field and forces safety help over the top."],["🛟","Possession","Reliable hands, chain-mover. Catches everything thrown his way. The quarterback's security blanket."],["🦇","YAC Weapon","Dangerous after the catch. Turns short throws into big gains with elusiveness and open-field ability."]]},
          {pos:"TE",items:[["🐏","Inline / Y","Traditional tight end. Blocks first, receives second. Lines up attached to the formation."],["🏄","Move / F","Flexes out, lines up in the slot, motions across the formation. More receiver than blocker."],["🎣","Receiving TE","Primary threat in the passing game. Targeted as a matchup weapon against linebackers and safeties."],["🧰","H-Back","Does multiple things — blocks, catches, lines up everywhere. Swiss army knife."]]},
          {pos:"OT",items:[["🚧","Pass Protector","Elite in pass protection. Footwork, mirror ability, and anchor. Built to protect the quarterback."],["🦣","Road Grader","Dominant run blocker. Moves people at the point of attack. Physical finisher."],["🦑","Athletic Tackle","Wins with movement skills. Lateral agility, reach blocks. Excels in zone schemes."]]},
          {pos:"IOL",items:[["↔️","Zone Scheme","Light-footed, reach blocks, works at angles. Built for outside zone and wide zone concepts."],["⬆️","Gap / Power","Anchor, drive blocks, pulls. Built for man/gap concepts and downhill running."],["🔄","Versatile","Can play multiple interior spots. Guard-center flexibility. Scheme-adaptable."]]},
          {pos:"EDGE",items:[["🌪️","Speed Rusher","Wins with first step, bend, and closing speed. Gets around the corner and finishes at the quarterback."],["🦏","Power Rusher","Wins with bull rush, long arms, and strength at the point of attack. Collapses the pocket."],["🐉","Complete","Has both speed and power moves. Full pass-rush repertoire. The total package."],["🦍","Run Defender","Primary value is setting the edge and stopping the run. Disciplined and physical."]]},
          {pos:"DL",items:[["🦡","Penetrating 3-Tech","Quick first step, gets into the backfield. Interior pass-rush threat who disrupts from the inside."],["🐘","Nose Tackle","Anchors the middle. Eats double teams, frees up linebackers. Space-eater."],["🐊","Two-Gap","Holds the point of attack and controls two gaps. Versatile run defender."]]},
          {pos:"LB",items:[["☂️","Coverage","Ranges in space, mirrors running backs and tight ends, drops into zones effectively."],["🔨","Thumper","Downhill, physical, fills gaps, stacks and sheds blocks. Old-school run stuffer."],["🦈","Pass Rusher","Blitzes effectively. Edge-setting or interior blitz threat from the linebacker position."],["🐺","Sideline-to-Sideline","Elite range and athleticism. Gets to the ball from anywhere on the field."],["👽","Chess Piece","Defies traditional linebacker classification. Part safety, part edge, part LB. Used creatively by defensive coordinators."]]},
          {pos:"CB",items:[["🧟","Press Man","Physical at the line of scrimmage. Jams receivers, mirrors in man coverage. Built for man-heavy schemes."],["🕸️","Zone Corner","Reads the quarterback's eyes, breaks on the ball, patrols areas. Pattern-matching and instincts."],["🦎","Slot","Works inside. Handles quick slot receivers and tight ends. May play some safety."]]},
          {pos:"S",items:[["🦂","Box Safety","Plays near the line of scrimmage. Physical tackler, run support, blitzer. An extra defender in the box."],["🛸","Center Field","Ranges deep. Ball hawk. Covers ground sideline to sideline from the back end."],["🎲","Hybrid","Plays multiple roles. Lines up at linebacker, slot, deep safety. A versatile chess piece."]]},
        ].map(({pos,items})=><div key={pos} style={{marginBottom:20}}>
          <div style={{fontFamily:mono,fontSize:10,fontWeight:700,letterSpacing:2,color:POS_COLORS[pos]||"#525252",textTransform:"uppercase",marginBottom:8}}>{POS_EMOJI[pos]||""} {pos}</div>
          <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,overflow:"hidden"}}>
            {items.map(([emoji,label,desc],i)=><div key={label} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 14px",borderBottom:i<items.length-1?"1px solid #f5f5f5":"none"}}>
              <span style={{fontSize:18,flexShrink:0,width:24,textAlign:"center",marginTop:1}}>{emoji}</span>
              <div><span style={{fontFamily:sans,fontSize:13,fontWeight:700,color:"#171717"}}>{label}</span><span style={{fontFamily:sans,fontSize:12,color:"#737373",marginLeft:6}}> — {desc}</span></div>
            </div>)}
          </div>
        </div>)}

        <div id="traits" style={{marginTop:40}}/>
        {glossSec("Scouting Traits","Trait grades are 1-100 scores for each skill area at every position. Emoji badges appear next to prospect names when they rank in the 90th percentile.",[
          ["💪","Arm Strength","Raw throwing power. Ability to drive the ball into tight windows and push it downfield."],
          ["🎯","Accuracy","Ball placement and precision. Hitting receivers in stride at every level of the field."],
          ["🧊","Pocket Presence","Composure and awareness under pressure. Feeling the rush without seeing it."],
          ["🏃","Mobility","Ability to move, scramble, and create outside the pocket."],
          ["🧠","Decision Making","Processing speed, reading coverage, going through progressions."],
          ["👑","Leadership","Intangibles. Commanding the huddle, competitive fire, elevating teammates."],
          ["👁️","Vision","Seeing the field. Finding creases, reading blocks, anticipating lanes."],
          ["⚖️","Contact Balance","Staying upright through contact. Yards after first hit."],
          ["🦬","Power","Physical strength at the point of contact. Breaking tackles, driving piles."],
          ["💨","Elusiveness","Making defenders miss in space. Lateral agility and change of direction."],
          ["✂️","Route Running","Precision, tempo, and craft in running routes. Manipulating defenders."],
          ["👻","Separation","Creating space from defensive backs at every level of the route."],
          ["🤲","Hands","Catch reliability. Plucking the ball, hands away from the body, no drops."],
          ["🔥","YAC Ability","Yards after catch. What a player does with the ball once they have it."],
          ["🏎️","Speed","Straight-line speed. Ability to run past coverage or chase down ball carriers."],
          ["🏈","Contested Catches","Winning 50/50 balls. High-pointing, body control, strength at the catch point."],
          ["🪽","Release Package","Getting off the line of scrimmage. Beating press coverage at the snap."],
          ["🛡️","Pass Protection","Keeping the quarterback clean. Technique, positioning, and anchor in pass sets."],
          ["🚜","Run Blocking","Moving defenders in the run game. Drive blocks, reach blocks, second level."],
          ["👟","Footwork","Technique and precision with the feet. Kick slides, lateral movement, balance."],
          ["⚓","Anchor","Holding the point of attack against power. Not giving ground."],
          ["🏋️","Strength","Raw physical strength. Bench press, functional power, play strength."],
          ["🚂","Pulling","Pulling across the formation on run plays. Getting to the second level."],
          ["🃏","Versatility","Ability to play multiple positions or roles. Scheme flexibility."],
          ["🚀","Pass Rush","Ability to get to the quarterback. Moves, counters, finishing."],
          ["🐍","Bend","Flexibility to flatten around the edge. Dip and rip, cornering ability."],
          ["⚡","First Step","Explosiveness off the snap. The initial burst that puts blockers on their heels."],
          ["🤚","Hand Usage","Technical hand fighting. Swipes, clubs, rips, and placement."],
          ["🔥","Motor","Effort and hustle. Playing hard every snap, chasing plays from behind."],
          ["🧱","Run Defense","Stopping the run. Gap integrity, edge setting, point of attack strength."],
          ["💥","Tackling","Finishing plays. Wrapping up, driving through ball carriers, reliability."],
          ["🪂","Coverage","Dropping into coverage from the linebacker position. Matching routes, zone discipline."],
          ["💡","Instincts","Football IQ in action. Anticipation, diagnosis, being in the right place."],
          ["📡","Range","Sideline-to-sideline pursuit. Closing speed and ability to cover ground."],
          ["🧲","Ball Skills","Tracking and catching the ball in the air. Interceptions, deflections, ball-hawking."],
          ["🔒","Man Coverage","Locking up receivers one-on-one. Mirroring, hip fluidity, staying in phase."],
          ["🗺️","Zone Coverage","Reading the quarterback's eyes and breaking on the ball from zone. Pattern recognition."],
          ["✋","Press","Disrupting receivers at the line of scrimmage. Physical jamming and re-routing."],
          ["🪙","Nickel","Slot coverage ability. Handling quick, shifty receivers in the middle of the field."],
          ["🪓","Block Shedding","Getting off blocks to make plays. Hands, leverage, and violence at the point."],
          ["🔮","Pre-Snap Diagnosis","Reading the offense before the snap. Identifying formations, motions, and tendencies."],
        ])}

        <div id="measurables" style={{marginTop:40}}/>
        {glossSec("Combine & Pro Day Measurables","Athletic testing data from the NFL Combine and college pro days. Displayed as percentiles relative to the prospect's position group.",[
          ["🔫","40-Yard Dash","Straight-line speed over 40 yards. The signature combine event."],
          ["🦘","Vertical Jump","Standing vertical leap. Measures lower-body explosiveness."],
          ["🏔️","Broad Jump","Standing long jump. Another measure of lower-body power and explosion."],
          ["🔻","3-Cone Drill","Agility and change-of-direction in a tight space. L-shaped cone drill."],
          ["♻️","Shuttle","20-yard shuttle. Lateral quickness and change-of-direction ability."],
          ["📏","Height","Listed height in cleats at the combine."],
          ["🪨","Weight","Listed weight at the combine."],
          ["🦾","Arm Length","Length from shoulder to fingertip. Critical for offensive and defensive linemen."],
          ["🖐️","Hand Size","Measured hand span. Important for ball security and hand fighting."],
          ["🪽","Wingspan","Fingertip to fingertip. Total length measurement."],
          ["🏅","Athletic Score","Composite athletic score blending all drills. Position-adjusted."],
          ["🛩️","Speed Score","Size-adjusted speed metric. Heavier players with fast 40s score higher."],
          ["🐇","Agility Score","Composite of 3-cone and shuttle. Change-of-direction ability."],
          ["🌋","Explosion Score","Composite of vertical and broad jump. Lower-body power."],
        ])}

        <div id="ui" style={{marginTop:40}}/>
        <div style={{marginBottom:36}}>
          <div style={{fontFamily:font,fontSize:20,fontWeight:900,color:"#171717",marginBottom:2}}>UI & Tools</div>
          <div style={{fontFamily:sans,fontSize:12,color:"#a3a3a3",marginBottom:12}}>Features, indicators, and tools you'll see across Big Board Lab.</div>
          <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:14,overflow:"hidden"}}>
            {[
              {el:<div style={{width:40,height:22,borderRadius:11,background:"linear-gradient(135deg,#4f46e5,#7c3aed,#a855f7)",position:"relative",flexShrink:0}}><div style={{width:16,height:16,borderRadius:8,background:"#fff",position:"absolute",top:3,left:21,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontFamily:mono,fontSize:7,fontWeight:700,color:"#6366f1"}}>SV</span></div></div>,label:"Scout Vision",desc:"Toggle that reorders the available player list by scheme fit for the team on the clock. Shows how well each prospect fits that team's offensive or defensive system."},
              {el:<div style={{display:"flex",gap:1,alignItems:"flex-end"}}>{[70,85,60,90,75].map((v,i)=><div key={i} style={{width:4,height:v/5,background:i<3?"#a855f7":"#0d9488",borderRadius:1}}/>)}</div>,label:"Equalizer",desc:"The bar chart on player profiles showing trait scores (purple) and measurable scores (teal) side by side. A quick visual fingerprint of a prospect's profile."},
              {el:<svg width={28} height={28} viewBox="0 0 28 28"><polygon points="14,2 26,10 22,24 6,24 2,10" fill="rgba(168,85,247,0.15)" stroke="#a855f7" strokeWidth={1.5}/></svg>,label:"Spider Chart",desc:"The radar/polygon chart on player profiles. Traits on the left, measurables on the right. Shows the shape of a prospect's strengths and weaknesses."},
              {el:<span style={{fontFamily:mono,fontSize:10,fontWeight:700,color:"#fff",background:"linear-gradient(135deg,#6366f1,#a855f7)",padding:"2px 6px",borderRadius:4}}>82</span>,label:"Scheme Fit Score",desc:"A 0-100 score measuring how well a prospect fits a specific team's scheme. Appears in Scout Vision mode. Higher = better fit."},
              {el:<span style={{fontFamily:mono,fontSize:9,fontWeight:700,color:"#16a34a",background:"#dcfce7",padding:"2px 6px",borderRadius:4,border:"1px solid rgba(34,197,94,0.2)"}}>RD 1</span>,label:"Round Pill",desc:"Projected draft round based on consensus rank. Green = Round 1, yellow = Round 2, orange = Round 3+."},
              {el:<span style={{fontFamily:mono,fontSize:7,fontWeight:700,color:"#a855f7",background:"rgba(168,85,247,0.08)",padding:"2px 5px",borderRadius:3}}>🔄 TRD</span>,label:"Trade Pill",desc:"Purple indicator on picks in the mock draft. Hover to see the full trade details — who traded what to whom."},
              {el:<span style={{fontFamily:mono,fontSize:7,fontWeight:700,color:"#16a34a",background:"rgba(34,197,94,0.08)",padding:"2px 5px",borderRadius:3,border:"1px solid rgba(34,197,94,0.15)"}}>NEED</span>,label:"Need Pill",desc:"Appears next to available players when the team on the clock has that position as a draft need."},
              {el:<span style={{fontFamily:mono,fontSize:7,fontWeight:700,color:"#dc2626",background:"rgba(239,68,68,0.08)",padding:"2px 5px",borderRadius:3,border:"1px solid rgba(239,68,68,0.15)"}}>RIVAL</span>,label:"Rival Pill",desc:"A divisional rival picks in the next few slots and might take this player before you."},
              {el:<span style={{fontFamily:mono,fontSize:7,fontWeight:700,color:"#ca8a04",background:"rgba(234,179,8,0.08)",padding:"2px 5px",borderRadius:3,border:"1px solid rgba(234,179,8,0.15)"}}>SLIDE</span>,label:"Slide Pill",desc:"This prospect has fallen significantly past their consensus rank. Potential value pick."},
              {el:<span style={{fontFamily:mono,fontSize:7,fontWeight:700,color:"#0891b2",background:"rgba(8,145,178,0.08)",padding:"2px 5px",borderRadius:3,border:"1px solid rgba(8,145,178,0.15)"}}>FIT</span>,label:"Scheme Fit Pill",desc:"This prospect scores above the scheme fit threshold for the team on the clock. Visible when Scout Vision is on."},
              {el:<span style={{fontFamily:mono,fontSize:8,fontWeight:700,color:"#f97316",background:"rgba(249,115,22,0.08)",padding:"2px 6px",borderRadius:99}}>FA</span>,label:"Free Agent Pill",desc:"Orange tag on depth chart players who were acquired in free agency or via trade this offseason."},
              {el:<span style={{fontFamily:mono,fontSize:9,fontWeight:700,color:"#171717",background:"#17171708",border:"1px solid #17171718",padding:"3px 8px",borderRadius:99,display:"inline-flex",alignItems:"center",gap:3}}><span>🌪️</span>Speed Rusher</span>,label:"Archetype Pill",desc:"Dark pills showing a prospect's archetype classification. Appear on scouting reports and in the available player list when archetype filters are active."},
              {el:<span style={{fontFamily:font,fontSize:14,fontWeight:900,color:"#171717"}}>87</span>,label:"Overall Grade",desc:"Your personal grade for a prospect, computed from the trait scores you've set or accepted. Reflects your evaluation, not consensus."},
            ].map(({el,label,desc},i)=><div key={label} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"12px 14px",borderBottom:i<11?"1px solid #f5f5f5":"none"}}>
              <div style={{flexShrink:0,width:40,display:"flex",alignItems:"center",justifyContent:"center",marginTop:2}}>{el}</div>
              <div style={{flex:1,minWidth:0}}><span style={{fontFamily:sans,fontSize:13,fontWeight:700,color:"#171717"}}>{label}</span><span style={{fontFamily:sans,fontSize:12,color:"#737373",marginLeft:6}}> — {desc}</span></div>
            </div>)}
          </div>
        </div>

        <div id="positions" style={{marginTop:40}}/>
        {glossSec("Position Groups","How Big Board Lab categorizes the 11 position groups.",[
          ["🎯","QB — Quarterback","The passer. Evaluated on arm talent, processing, mobility, and leadership."],
          ["🏃","RB — Running Back","Ball carriers. Evaluated on vision, speed, power, and receiving ability."],
          ["🧤","WR — Wide Receiver","Pass catchers who line up outside or in the slot. Route running, hands, speed."],
          ["🦾","TE — Tight End","Hybrid players who block and catch. Inline, move, and receiving variants."],
          ["🛡️","OT — Offensive Tackle","Protect the edges of the offensive line. Pass protection and run blocking."],
          ["🧱","IOL — Interior O-Line","Guards and centers. Includes C (center) and OG (guard) sub-positions."],
          ["🌪️","EDGE — Edge Rusher","Pass rushers who line up on the edge. DEs in 4-3, OLBs in 3-4."],
          ["🦬","DL — Defensive Line","Interior defenders. Includes IDL (interior DL), DT, and NT."],
          ["💥","LB — Linebacker","Second-level defenders. Coverage, run-stopping, and blitzing."],
          ["🏝️","CB — Cornerback","Cover the opposing receivers. Man, zone, and slot variants."],
          ["🦅","S — Safety","Last line of defense. Box, center field, and hybrid variants."],
        ])}

        <div id="depth" style={{marginTop:40}}/>
        {glossSec("Depth Chart & Formation","What you see on the team depth chart and formation view during mock drafts.",[
          ["⚪","Empty Dot","An unfilled roster spot. No current starter at that position on the depth chart."],
          ["🟤","Filled Dot","A rostered player occupying a depth chart slot. Color indicates performance tier."],
          ["🟣","Draft Dot (Pulsing)","A player you just drafted, shown with a purple pulse animation on the formation view."],
          ["⭐","Star Icon","Appears on drafted players in the formation view to distinguish them from existing roster."],
          ["🏗️","3-4 Defense","Three down linemen, four linebackers. OLBs rush the edge. Used by ~half the NFL."],
          ["🏟️","4-3 Defense","Four down linemen, three linebackers. DEs rush the edge. Traditional front."],
          ["🎲","4-2-5 / Wide 9","Nickel-heavy defense with five defensive backs. Modern passing-game defense."],
        ])}

        <TwitterFooter/>
      </div>
    </div>
  );}
  if(showOG)return<OGPreview/>;
  if(showGmQuiz)return<GmQuiz user={user} NFLTeamLogo={NFLTeamLogo} SchoolLogo={SchoolLogo} trackEvent={trackEvent} userId={user?.id} onLaunchMock={(team)=>{setGmQuizMockLaunch(team);setShowGmQuiz(false);window.history.pushState({},'','/');}} onHome={()=>{setShowGmQuiz(false);window.history.pushState({},'','/');window.dispatchEvent(new PopStateEvent("popstate"));}}/>;
  if(showDraftBracket)return<DraftBracket SchoolLogo={SchoolLogo} onHome={()=>{setShowDraftBracket(false);window.history.pushState({},'','/');window.dispatchEvent(new PopStateEvent("popstate"));}}/>;
  if(!user&&!isGuest&&!(window.location.pathname==='/lab'||window.location.pathname==='/data-lab'||window.location.pathname.startsWith('/lab/')||window.location.pathname.startsWith('/data-lab/'))&&window.location.pathname!=='/trends')return<AuthScreen onSkip={()=>{const p=window.location.pathname;if(p==='/board'||p.startsWith('/rank')||p==='/r1'||p==='/my-guys')window.history.replaceState({},'','/');setIsGuest(true);}} onOpenGuide={navigateToGuide}/>;
  if(showAdmin==="dashboard"&&user&&ADMIN_EMAILS.includes(user.email))return<AdminDashboard user={user} onBack={()=>{window.location.hash="";setShowAdmin(null);}}/>;
  if(showAdmin==="grades"&&user&&ADMIN_EMAILS.includes(user.email))return<AdminGrades onBack={()=>{window.location.hash="";setShowAdmin(null);}} onSave={setAdminOverrides}/>;

  return<>
    <DraftBoard user={user} onSignOut={user?signOut:()=>setIsGuest(false)} isGuest={!user} onOpenGuide={navigateToGuide} gmQuizMockLaunch={gmQuizMockLaunch} onClearGmQuizMock={()=>setGmQuizMockLaunch(null)} adminOverrides={adminOverrides} onRequireAuth={(msg)=>{
      const src=msg.includes('play with the data')?'data-lab':msg.includes('vote')||msg.includes('big board')?'pair rank':msg.includes('trait')||msg.includes('grade')||msg.includes('slider')?'sliders':msg.includes('mock')||msg.includes('draft')?'mock draft':msg.includes('reorder')?'pair rank':msg.includes('note')?'notes':msg.includes('guys')?'my guys':msg.includes('share')?'share':msg.includes('save')?'save':'homepage';
      authSourceRef.current=src;
      try{sessionStorage.setItem('authSource',src)}catch(e){}
      setAuthPrompt(msg);
    }}/>
    {authPrompt&&<AuthModal message={authPrompt} onClose={()=>setAuthPrompt(null)}/>}
  </>;
}
