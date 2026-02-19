import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { track } from "./track.js";
import NFL_ROSTERS from "./nflRosters.js";
// html2canvas loaded dynamically in shareDraft to avoid 40KB bundle bloat at page load

const DRAFT_ORDER_2026=[
{pick:1,round:1,team:"Raiders"},{pick:2,round:1,team:"Jets"},{pick:3,round:1,team:"Cardinals"},{pick:4,round:1,team:"Titans"},
{pick:5,round:1,team:"Giants"},{pick:6,round:1,team:"Browns"},{pick:7,round:1,team:"Commanders"},{pick:8,round:1,team:"Saints"},
{pick:9,round:1,team:"Chiefs"},{pick:10,round:1,team:"Bengals"},{pick:11,round:1,team:"Dolphins"},{pick:12,round:1,team:"Cowboys"},
{pick:13,round:1,team:"Rams",from:"Falcons"},{pick:14,round:1,team:"Ravens"},{pick:15,round:1,team:"Buccaneers"},{pick:16,round:1,team:"Jets",from:"Colts"},
{pick:17,round:1,team:"Lions"},{pick:18,round:1,team:"Vikings"},{pick:19,round:1,team:"Panthers"},{pick:20,round:1,team:"Cowboys",from:"Packers"},
{pick:21,round:1,team:"Steelers"},{pick:22,round:1,team:"Chargers"},{pick:23,round:1,team:"Eagles"},{pick:24,round:1,team:"Browns",from:"Jaguars"},
{pick:25,round:1,team:"Bears"},{pick:26,round:1,team:"Bills"},{pick:27,round:1,team:"49ers"},{pick:28,round:1,team:"Texans"},
{pick:29,round:1,team:"Rams"},{pick:30,round:1,team:"Broncos"},{pick:31,round:1,team:"Patriots"},{pick:32,round:1,team:"Seahawks"},
{pick:33,round:2,team:"Jets"},{pick:34,round:2,team:"Cardinals"},{pick:35,round:2,team:"Titans"},{pick:36,round:2,team:"Raiders"},
{pick:37,round:2,team:"Giants"},{pick:38,round:2,team:"Texans",from:"Commanders"},{pick:39,round:2,team:"Browns"},{pick:40,round:2,team:"Chiefs"},
{pick:41,round:2,team:"Bengals"},{pick:42,round:2,team:"Saints"},{pick:43,round:2,team:"Dolphins"},{pick:44,round:2,team:"Jets",from:"Cowboys"},
{pick:45,round:2,team:"Ravens"},{pick:46,round:2,team:"Buccaneers"},{pick:47,round:2,team:"Colts"},{pick:48,round:2,team:"Falcons"},
{pick:49,round:2,team:"Vikings"},{pick:50,round:2,team:"Lions"},{pick:51,round:2,team:"Panthers"},{pick:52,round:2,team:"Packers"},
{pick:53,round:2,team:"Steelers"},{pick:54,round:2,team:"Eagles"},{pick:55,round:2,team:"Chargers"},{pick:56,round:2,team:"Jaguars"},
{pick:57,round:2,team:"Bears"},{pick:58,round:2,team:"49ers"},{pick:59,round:2,team:"Texans"},{pick:60,round:2,team:"Bills"},
{pick:61,round:2,team:"Rams"},{pick:62,round:2,team:"Broncos"},{pick:63,round:2,team:"Patriots"},{pick:64,round:2,team:"Seahawks"},
{pick:65,round:3,team:"Cardinals"},{pick:66,round:3,team:"Titans"},{pick:67,round:3,team:"Raiders"},{pick:68,round:3,team:"Eagles",from:"Jets"},
{pick:69,round:3,team:"Texans",from:"Giants"},{pick:70,round:3,team:"Browns"},{pick:71,round:3,team:"Commanders"},{pick:72,round:3,team:"Bengals"},
{pick:73,round:3,team:"Saints"},{pick:74,round:3,team:"Chiefs"},{pick:75,round:3,team:"Dolphins"},{pick:76,round:3,team:"Steelers",from:"Cowboys"},
{pick:77,round:3,team:"Buccaneers"},{pick:78,round:3,team:"Colts"},{pick:79,round:3,team:"Falcons"},{pick:80,round:3,team:"Ravens"},
{pick:81,round:3,team:"Jaguars",from:"Lions"},{pick:82,round:3,team:"Vikings"},{pick:83,round:3,team:"Panthers"},{pick:84,round:3,team:"Packers"},
{pick:85,round:3,team:"Steelers"},{pick:86,round:3,team:"Chargers"},{pick:87,round:3,team:"Dolphins",from:"Eagles"},{pick:88,round:3,team:"Jaguars"},
{pick:89,round:3,team:"Bears"},{pick:90,round:3,team:"Dolphins",from:"Texans"},{pick:91,round:3,team:"Bills"},{pick:92,round:3,team:"49ers"},
{pick:93,round:3,team:"Rams"},{pick:94,round:3,team:"Broncos"},{pick:95,round:3,team:"Patriots"},{pick:96,round:3,team:"Seahawks"},
{pick:97,round:3,team:"Vikings"},{pick:98,round:3,team:"Eagles"},{pick:99,round:3,team:"Steelers"},{pick:100,round:3,team:"Jaguars",from:"Lions"},
{pick:101,round:4,team:"Titans"},{pick:102,round:4,team:"Raiders"},{pick:103,round:4,team:"Jets"},{pick:104,round:4,team:"Cardinals"},
{pick:105,round:4,team:"Giants"},{pick:106,round:4,team:"Texans",from:"Commanders"},{pick:107,round:4,team:"Browns"},{pick:108,round:4,team:"Broncos",from:"Saints"},
{pick:109,round:4,team:"Chiefs"},{pick:110,round:4,team:"Bengals"},{pick:111,round:4,team:"Dolphins"},{pick:112,round:4,team:"Cowboys"},
{pick:113,round:4,team:"Colts"},{pick:114,round:4,team:"Falcons"},{pick:115,round:4,team:"Ravens"},{pick:116,round:4,team:"Buccaneers"},
{pick:117,round:4,team:"Raiders",from:"Vikings"},{pick:118,round:4,team:"Lions"},{pick:119,round:4,team:"Panthers"},{pick:120,round:4,team:"Packers"},
{pick:121,round:4,team:"Steelers"},{pick:122,round:4,team:"Eagles"},{pick:123,round:4,team:"Chargers"},{pick:124,round:4,team:"Jaguars"},
{pick:125,round:4,team:"Patriots",from:"Bears"},{pick:126,round:4,team:"Bills"},{pick:127,round:4,team:"49ers"},{pick:128,round:4,team:"Texans"},
{pick:129,round:4,team:"Bears",from:"Rams"},{pick:130,round:4,team:"Broncos"},{pick:131,round:4,team:"Patriots"},{pick:132,round:4,team:"Saints",from:"Seahawks"},
{pick:133,round:4,team:"49ers"},{pick:134,round:4,team:"Raiders"},{pick:135,round:4,team:"Steelers"},{pick:136,round:4,team:"Saints"},
{pick:137,round:4,team:"Eagles"},{pick:138,round:4,team:"49ers"},
{pick:139,round:5,team:"Browns",from:"Raiders"},{pick:140,round:5,team:"Titans",from:"Jets"},{pick:141,round:5,team:"Cardinals"},{pick:142,round:5,team:"Titans"},
{pick:143,round:5,team:"Giants"},{pick:144,round:5,team:"Browns"},{pick:145,round:5,team:"Commanders"},{pick:146,round:5,team:"Chiefs"},
{pick:147,round:5,team:"Browns",from:"Bengals"},{pick:148,round:5,team:"Saints"},{pick:149,round:5,team:"Dolphins"},{pick:150,round:5,team:"Cowboys"},
{pick:151,round:5,team:"Eagles",from:"Falcons"},{pick:152,round:5,team:"Ravens"},{pick:153,round:5,team:"Buccaneers"},{pick:154,round:5,team:"Colts"},
{pick:155,round:5,team:"Lions"},{pick:156,round:5,team:"Panthers",from:"Vikings"},{pick:157,round:5,team:"Panthers"},{pick:158,round:5,team:"Packers"},
{pick:159,round:5,team:"Steelers"},{pick:160,round:5,team:"Ravens",from:"Chargers"},{pick:161,round:5,team:"Vikings",from:"Eagles"},{pick:162,round:5,team:"Jaguars"},
{pick:163,round:5,team:"Bears"},{pick:164,round:5,team:"Jaguars",from:"49ers"},{pick:165,round:5,team:"Texans"},{pick:166,round:5,team:"Bills"},
{pick:167,round:5,team:"Rams"},{pick:168,round:5,team:"Broncos"},{pick:169,round:5,team:"Patriots"},{pick:170,round:5,team:"Saints",from:"Seahawks"},
{pick:171,round:5,team:"49ers"},{pick:172,round:5,team:"Ravens"},{pick:173,round:5,team:"Ravens"},{pick:174,round:5,team:"Raiders"},
{pick:175,round:5,team:"Jets"},{pick:176,round:5,team:"Chiefs"},{pick:177,round:5,team:"Cowboys"},{pick:178,round:5,team:"Jets"},
{pick:179,round:5,team:"Eagles"},{pick:180,round:5,team:"Lions"},
{pick:181,round:6,team:"Raiders",from:"Jets"},{pick:182,round:6,team:"Cardinals"},{pick:183,round:6,team:"Titans"},{pick:184,round:6,team:"Raiders"},
{pick:185,round:6,team:"Giants"},{pick:186,round:6,team:"Commanders"},{pick:187,round:6,team:"Lions",from:"Browns"},{pick:188,round:6,team:"Bengals"},
{pick:189,round:6,team:"Saints"},{pick:190,round:6,team:"Patriots",from:"Chiefs"},{pick:191,round:6,team:"Giants",from:"Dolphins"},{pick:192,round:6,team:"Giants",from:"Cowboys"},
{pick:193,round:6,team:"Jets",from:"Ravens"},{pick:194,round:6,team:"Buccaneers"},{pick:195,round:6,team:"Vikings",from:"Colts"},{pick:196,round:6,team:"Falcons"},
{pick:197,round:6,team:"Commanders",from:"Vikings"},{pick:198,round:6,team:"Bengals",from:"Lions"},{pick:199,round:6,team:"Panthers"},{pick:200,round:6,team:"Packers"},
{pick:201,round:6,team:"Patriots",from:"Steelers"},{pick:202,round:6,team:"Jaguars",from:"Eagles"},{pick:203,round:6,team:"Chargers"},{pick:204,round:6,team:"Lions",from:"Jaguars"},
{pick:205,round:6,team:"Browns",from:"Bears"},{pick:206,round:6,team:"Rams",from:"Texans"},{pick:207,round:6,team:"Jets",from:"Bills"},{pick:208,round:6,team:"Patriots",from:"49ers"},
{pick:209,round:6,team:"Rams"},{pick:210,round:6,team:"Ravens",from:"Broncos"},{pick:211,round:6,team:"Patriots"},{pick:212,round:6,team:"Seahawks"},
{pick:213,round:6,team:"Steelers"},{pick:214,round:6,team:"Chargers"},{pick:215,round:6,team:"Steelers"},{pick:216,round:6,team:"Cowboys"},
{pick:217,round:6,team:"Colts"},
{pick:218,round:7,team:"Cardinals"},{pick:219,round:7,team:"Jets",from:"Titans"},{pick:220,round:7,team:"Raiders"},{pick:221,round:7,team:"Bills",from:"Jets"},
{pick:222,round:7,team:"Cowboys",from:"Giants"},{pick:223,round:7,team:"Lions",from:"Browns"},{pick:224,round:7,team:"Commanders"},{pick:225,round:7,team:"Steelers",from:"Saints"},
{pick:226,round:7,team:"Cowboys",from:"Chiefs"},{pick:227,round:7,team:"Bengals"},{pick:228,round:7,team:"Dolphins"},{pick:229,round:7,team:"Bills",from:"Cowboys"},
{pick:230,round:7,team:"Buccaneers"},{pick:231,round:7,team:"Colts"},{pick:232,round:7,team:"Falcons"},{pick:233,round:7,team:"Rams",from:"Ravens"},
{pick:234,round:7,team:"Jaguars",from:"Lions"},{pick:235,round:7,team:"Vikings"},{pick:236,round:7,team:"Panthers"},{pick:237,round:7,team:"Packers"},
{pick:238,round:7,team:"Steelers"},{pick:239,round:7,team:"Titans",from:"Chargers"},{pick:240,round:7,team:"Bears",from:"Eagles"},{pick:241,round:7,team:"Vikings",from:"Jaguars"},
{pick:242,round:7,team:"Bears"},{pick:243,round:7,team:"Jets",from:"Bills"},{pick:244,round:7,team:"Texans",from:"49ers"},{pick:245,round:7,team:"Texans"},
{pick:246,round:7,team:"Jaguars",from:"Rams"},{pick:247,round:7,team:"Broncos"},{pick:248,round:7,team:"Patriots"},{pick:249,round:7,team:"Browns",from:"Seahawks"},
{pick:250,round:7,team:"Ravens"},{pick:251,round:7,team:"Rams"},{pick:252,round:7,team:"Ravens"},{pick:253,round:7,team:"Colts"},
{pick:254,round:7,team:"Packers"},{pick:255,round:7,team:"Broncos"},{pick:256,round:7,team:"Rams"},{pick:257,round:7,team:"Packers"},
];

const JJ_VALUES={1:3000,2:2600,3:2200,4:1800,5:1700,6:1600,7:1500,8:1400,9:1350,10:1300,11:1250,12:1200,13:1150,14:1100,15:1050,16:1000,17:950,18:900,19:875,20:850,21:800,22:780,23:760,24:740,25:720,26:700,27:680,28:660,29:640,30:620,31:600,32:590,33:580,34:560,35:550,36:540,37:530,38:520,39:510,40:500,41:490,42:480,43:470,44:460,45:450,46:440,47:430,48:420,49:410,50:400,51:390,52:380,53:370,54:360,55:350,56:340,57:330,58:320,59:310,60:300,61:292,62:284,63:276,64:270,65:265,66:260,67:255,68:250,69:245,70:240,71:235,72:230,73:225,74:220,75:215,76:210,77:205,78:200,79:195,80:190,81:185,82:180,83:175,84:170,85:165,86:160,87:155,88:150,89:145,90:140,91:136,92:132,93:128,94:124,95:120,96:116,97:112,98:108,99:104,100:100};
function getPickValue(n){return JJ_VALUES[n]||Math.max(5,Math.round(100-((n-100)*0.72)));}

// Pure grade function — no hooks, callable anywhere
function scoreTeamPicks(teamPicks,team,prospectsMap,getConsensusRank,liveNeeds,TEAM_NEEDS_DETAILED){
  if(!teamPicks||teamPicks.length===0)return null;
  let totalRatio=0,counted=0;
  teamPicks.forEach(pk=>{
    const p=prospectsMap[pk.playerId];if(!p)return;
    const rank=getConsensusRank?getConsensusRank(p.name):pk.pick;
    const playerVal=getPickValue(rank<900?rank:pk.pick);
    const slotVal=getPickValue(pk.pick);
    if(slotVal>0){totalRatio+=playerVal/slotVal;counted++;}
  });
  if(counted===0)return null;
  const avgRatio=totalRatio/counted;
  const base=TEAM_NEEDS_DETAILED?.[team]||{};
  const totalNeeds=Object.values(base).reduce((s,v)=>s+v,0);
  let needsBonus=0;
  if(totalNeeds>0){
    const remaining=liveNeeds[team]||{};
    const remainingTotal=Object.values(remaining).reduce((s,v)=>s+v,0);
    needsBonus=((totalNeeds-remainingTotal)/totalNeeds)*0.15;
  }
  const score=avgRatio+needsBonus;
  if(score>=1.6)return{grade:"A+",color:"#16a34a"};
  if(score>=1.4)return{grade:"A",color:"#16a34a"};
  if(score>=1.2)return{grade:"B+",color:"#22c55e"};
  if(score>=1.05)return{grade:"B",color:"#22c55e"};
  if(score>=0.95)return{grade:"B-",color:"#ca8a04"};
  if(score>=0.85)return{grade:"C+",color:"#ca8a04"};
  if(score>=0.75)return{grade:"C",color:"#ca8a04"};
  if(score>=0.65)return{grade:"D",color:"#dc2626"};
  return{grade:"F",color:"#dc2626"};
}

const DEPTH_GROUPS=[
  {label:"QB",slots:["QB1","QB2"],posMatch:"QB"},
  {label:"RB",slots:["RB1","RB2"],posMatch:"RB"},
  {label:"WR",slots:["WR1","WR2","WR3","WR4"],posMatch:"WR"},
  {label:"TE",slots:["TE1","TE2"],posMatch:"TE"},
  {label:"OL",slots:["LT","LG","C","RG","RT"],posMatch:"OL"},
  {label:"DL",slots:["DE1","DT1","DT2","DE2"],posMatch:"DL"},
  {label:"LB",slots:["LB1","LB2","LB3"],posMatch:"LB"},
  {label:"DB",slots:["CB1","CB2","SS","FS"],posMatch:"DB"},
  {label:"K",slots:["K"],posMatch:"K/P"},
];
const ALL_SLOTS=DEPTH_GROUPS.flatMap(g=>g.slots);

const FORMATION_POS={
  QB1:{x:50,y:78},RB1:{x:50,y:88},WR1:{x:5,y:65},WR2:{x:95,y:65},WR3:{x:22,y:65},TE1:{x:80,y:68},
  LT:{x:32,y:68},LG:{x:40,y:68},C:{x:50,y:68},RG:{x:60,y:68},RT:{x:68,y:68},
  DE1:{x:28,y:48},DT1:{x:42,y:48},DT2:{x:58,y:48},DE2:{x:72,y:48},
  LB1:{x:30,y:38},LB2:{x:50,y:38},LB3:{x:70,y:38},
  CB1:{x:10,y:25},CB2:{x:90,y:25},SS:{x:65,y:18},FS:{x:35,y:18},K:{x:50,y:96}
};

const POS_DRAFT_VALUE={QB:1.08,OL:1.05,DL:1.06,WR:1.04,DB:1.03,TE:0.98,LB:0.97,RB:0.96,"K/P":0.7};

// Override consensus ranks for players the board data may undervalue
// These represent realistic draft range ceilings/floors based on current intel
const BBL_LOGO_B64="data:image/png;base64,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";

// RANK_OVERRIDES: force consensus rank used by CPU to be higher (lower number = picked earlier)
// Use for players whose real-world buzz clearly exceeds their positional consensus slot
const RANK_OVERRIDES={"Sonny Styles":8,"Kenyon Sadiq":20,"Jeremiyah Love":5};

// GRADE_OVERRIDES: force a minimum grade for specific elite prospects
// Use sparingly — only for players who are clearly mis-valued by the generic grade system
// This does NOT affect other players at their position, only the named individual
const GRADE_OVERRIDES={"Jeremiyah Love":91,"Sonny Styles":89};

// === TEAM PERSONALITY PROFILES ===
// bpaLean: 0-1, how much team trusts BPA (1.0=pure BPA like CIN, 0.3=heavy need like NO)
// posBoost: positions this regime values above market rate
// posPenalty: positions this regime avoids early
// stage: "rebuild"|"retool"|"contend"|"dynasty"
// reachTolerance: 0-1, willingness to reach for 'their guy'
// variance: regime scouting divergence from consensus
const TEAM_PROFILES={
  Raiders:{bpaLean:0.55,posBoost:["QB","OL","WR"],posPenalty:[],stage:"rebuild",reachTolerance:0.3,variance:2},
  Jets:{bpaLean:0.5,posBoost:["QB","DL","DB"],posPenalty:["RB"],stage:"rebuild",reachTolerance:0.4,variance:3},
  Cardinals:{bpaLean:0.45,posBoost:["OL","DL","RB"],posPenalty:["QB"],stage:"rebuild",reachTolerance:0.3,variance:2},
  Titans:{bpaLean:0.75,posBoost:["DL","DB","WR"],posPenalty:[],stage:"rebuild",reachTolerance:0.15,variance:1},
  Giants:{bpaLean:0.6,posBoost:["OL","DL","LB","DB"],posPenalty:["QB"],stage:"rebuild",reachTolerance:0.25,variance:2},
  Browns:{bpaLean:0.55,posBoost:["OL","WR","QB"],posPenalty:["DL","LB"],stage:"rebuild",reachTolerance:0.35,variance:3},
  Commanders:{bpaLean:0.65,posBoost:["OL","WR"],posPenalty:[],stage:"contend",reachTolerance:0.3,variance:1},
  Saints:{bpaLean:0.35,posBoost:["WR","DB","RB"],posPenalty:[],stage:"retool",reachTolerance:0.5,variance:4},
  Chiefs:{bpaLean:0.5,posBoost:["WR","DB","RB"],posPenalty:["QB"],stage:"dynasty",reachTolerance:0.5,variance:3},
  Bengals:{bpaLean:0.8,posBoost:["DL","OL","DB"],posPenalty:[],stage:"contend",reachTolerance:0.1,variance:1},
  Dolphins:{bpaLean:0.65,posBoost:["OL","DL","DB"],posPenalty:[],stage:"rebuild",reachTolerance:0.2,variance:2},
  Cowboys:{bpaLean:0.7,posBoost:["DL","DB","LB"],posPenalty:[],stage:"retool",reachTolerance:0.2,variance:2},
  Colts:{bpaLean:0.65,posBoost:["OL","DL","WR"],posPenalty:[],stage:"retool",reachTolerance:0.2,variance:1},
  Steelers:{bpaLean:0.55,posBoost:["WR","QB","OL","DL"],posPenalty:[],stage:"retool",reachTolerance:0.35,variance:2},
  Texans:{bpaLean:0.5,posBoost:["OL","DL","DB"],posPenalty:["QB"],stage:"contend",reachTolerance:0.4,variance:2},
  Jaguars:{bpaLean:0.7,posBoost:["DL","DB","OL"],posPenalty:[],stage:"rebuild",reachTolerance:0.2,variance:2},
  Patriots:{bpaLean:0.6,posBoost:["OL","WR","DL"],posPenalty:[],stage:"rebuild",reachTolerance:0.3,variance:2},
  Broncos:{bpaLean:0.55,posBoost:["WR","OL","TE"],posPenalty:["QB"],stage:"contend",reachTolerance:0.4,variance:2},
  Panthers:{bpaLean:0.5,posBoost:["OL","DL"],posPenalty:[],stage:"rebuild",reachTolerance:0.35,variance:3},
  Bears:{bpaLean:0.6,posBoost:["WR","DB","DL"],posPenalty:[],stage:"contend",reachTolerance:0.3,variance:2},
  Falcons:{bpaLean:0.6,posBoost:["OL","DL","DB"],posPenalty:[],stage:"retool",reachTolerance:0.25,variance:2},
  Eagles:{bpaLean:0.5,posBoost:["OL","DL","DB"],posPenalty:[],stage:"dynasty",reachTolerance:0.45,variance:3},
  Chargers:{bpaLean:0.6,posBoost:["OL","DL","TE"],posPenalty:["QB"],stage:"contend",reachTolerance:0.3,variance:1},
  "49ers":{bpaLean:0.55,posBoost:["WR","OL","DB","DL"],posPenalty:[],stage:"contend",reachTolerance:0.5,variance:3},
  Packers:{bpaLean:0.75,posBoost:["DB","WR","DL"],posPenalty:[],stage:"contend",reachTolerance:0.15,variance:1},
  Lions:{bpaLean:0.6,posBoost:["DL","DB","OL","WR"],posPenalty:[],stage:"dynasty",reachTolerance:0.45,variance:3},
  Rams:{bpaLean:0.45,posBoost:["OL","DL","QB","WR"],posPenalty:[],stage:"contend",reachTolerance:0.6,variance:4},
  Seahawks:{bpaLean:0.65,posBoost:["OL","DL","DB"],posPenalty:[],stage:"dynasty",reachTolerance:0.3,variance:3},
  Buccaneers:{bpaLean:0.55,posBoost:["OL","DL","DB"],posPenalty:[],stage:"contend",reachTolerance:0.3,variance:2},
  Vikings:{bpaLean:0.4,posBoost:["OL","QB","WR"],posPenalty:[],stage:"retool",reachTolerance:0.4,variance:4},
  Ravens:{bpaLean:0.7,posBoost:["OL","WR","DB"],posPenalty:[],stage:"contend",reachTolerance:0.35,variance:2},
};

function pickVerdict(pickNum,consRank,grade){
  if(consRank>=900)return{text:"UNKNOWN",color:"#737373",bg:"#f5f5f5"};
  const playerVal=getPickValue(consRank);
  const slotVal=getPickValue(pickNum);

  // Grade modifier: elite players picked slightly early isn't really a reach.
  const g=grade||50;
  const picksEarly=consRank-pickNum; // positive = picked before consensus slot
  const gradeForgivePicks=Math.max(0,(g-70)/2);
  const forgivenRank=picksEarly>0?Math.min(picksEarly,gradeForgivePicks):0;
  const effectiveRank=Math.max(1,consRank-Math.round(forgivenRank));
  const effectiveVal=getPickValue(effectiveRank);
  const adjRatio=effectiveVal/slotVal;

  // Round-aware thresholds: JJP curve flattens after pick 64, so tighten bands
  const round=pickNum<=32?1:pickNum<=64?2:pickNum<=100?3:pickNum<=144?4:7;
  const fairHi=round<=1?1.15:round<=2?1.12:1.08;
  const fairLo=round<=1?0.85:round<=2?0.88:0.92;
  const stealHi=round<=1?1.50:round<=2?1.35:1.20;
  const reachLo=round<=1?0.55:round<=2?0.65:0.75;

  // Pick-difference floor: can't be "fair" if you're 15+ picks from consensus
  const pickDiff=Math.abs(pickNum-effectiveRank);
  const diffOverride=pickDiff>=20;

  if(adjRatio>=stealHi)return{text:"HUGE STEAL",color:"#16a34a",bg:"#dcfce7"};
  if(adjRatio>=fairHi)return{text:"GREAT VALUE",color:"#22c55e",bg:"#f0fdf4"};
  if(adjRatio>=fairLo&&(!diffOverride||pickDiff<15))return{text:"FAIR PICK",color:"#ca8a04",bg:"#fefce8"};
  if(adjRatio>=reachLo)return{text:"REACH",color:"#ea580c",bg:"#fff7ed"};
  return{text:"BIG REACH",color:"#dc2626",bg:"#fef2f2"};
}

export default function MockDraftSim({board,myBoard,getGrade,teamNeeds,draftOrder,onClose,allProspects,PROSPECTS,CONSENSUS,ratings,traits,setTraits,notes,setNotes,POS_COLORS,POSITION_TRAITS,SchoolLogo,NFLTeamLogo,RadarChart,PlayerProfile,font,mono,sans,schoolLogo,getConsensusRank,getConsensusGrade,TEAM_NEEDS_DETAILED,rankedGroups}){
  const ALL_TEAMS=useMemo(()=>[...new Set(DRAFT_ORDER_2026.map(d=>d.team))],[]);
  const[boardMode,setBoardMode]=useState("consensus");
  const activeBoard=boardMode==="my"&&myBoard?myBoard:board;
  const[setupDone,setSetupDone]=useState(false);
  const[userTeams,setUserTeams]=useState(new Set());
  const[isMobile,setIsMobile]=useState(typeof window!=='undefined'&&window.innerWidth<768);
  const[mobilePanel,setMobilePanel]=useState("board"); // "board" | "picks" | "depth"
  useEffect(()=>{const h=()=>setIsMobile(window.innerWidth<768);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h);},[]);
  const[numRounds,setNumRounds]=useState(1);
  const[speed,setSpeed]=useState(50);
  const[picks,setPicks]=useState([]);
  const[available,setAvailable]=useState([]);
  const[paused,setPaused]=useState(false);
  const[filterPos,setFilterPos]=useState(new Set());
  const[profilePlayer,setProfilePlayer]=useState(null);
  const[compareList,setCompareList]=useState([]);
  const[showCompare,setShowCompare]=useState(false);
  const[showDepth,setShowDepth]=useState(true);
  const[tradeOffer,setTradeOffer]=useState(null);
  const[showResults,setShowResults]=useState(false);
  const[lastVerdict,setLastVerdict]=useState(null);
  const[tradeMap,setTradeMap]=useState({});
  const[showTradeUp,setShowTradeUp]=useState(false);
  const[tradeTarget,setTradeTarget]=useState([]); // array of picks user wants to GET
  const[tradeUserPicks,setTradeUserPicks]=useState([]);
  const[tradePartner,setTradePartner]=useState(null);
  const[depthTeamIdx,setDepthTeamIdx]=useState(0);
  const[tradeValueDelta,setTradeValueDelta]=useState(0); // net JJP value from all trades
  const tradeDeclinedRef=useRef(0);

  const prospectsMap=useMemo(()=>{const m={};PROSPECTS.forEach(p=>m[p.id]=p);return m;},[PROSPECTS]);
  const activeGrade=useCallback((id)=>{if(boardMode==="my")return getGrade(id);const p=prospectsMap[id];return p?getConsensusGrade(p.name):50;},[boardMode,getGrade,prospectsMap,getConsensusGrade]);

  // Position run tracker: count how many of each pos drafted in last 8 picks
  const recentPosCounts=useMemo(()=>{
    const recent=picks.slice(-8);
    const counts={};
    recent.forEach(pk=>{const p=prospectsMap[pk.playerId];if(p)counts[p.pos]=(counts[p.pos]||0)+1;});
    return counts;
  },[picks,prospectsMap]);

  const gradeMap=useMemo(()=>{const m={};activeBoard.forEach(p=>m[p.id]=activeGrade(p.id));return m;},[activeBoard,activeGrade]);
  const positions=["QB","RB","WR","TE","OL","DL","LB","DB","K/P"];

  const fullDraftOrder=useMemo(()=>{
    return DRAFT_ORDER_2026.filter(d=>d.round<=numRounds);
  },[numRounds]);
  const totalPicks=fullDraftOrder.length;
  const getPickTeam=useCallback((idx)=>tradeMap[idx]||fullDraftOrder[idx]?.team,[tradeMap,fullDraftOrder]);

  const getTeamFuturePicks=useCallback((team)=>{
    const r=[];for(let i=picks.length;i<totalPicks;i++){if(getPickTeam(i)===team)r.push({idx:i,...fullDraftOrder[i]});}return r;
  },[picks,totalPicks,getPickTeam,fullDraftOrder]);

  const startDraft=useCallback(()=>{
    setAvailable(activeBoard.map(p=>p.id));setPicks([]);setSetupDone(true);setShowResults(false);
    setTradeMap({});setLastVerdict(null);setTradeOffer(null);setShowTradeUp(false);setTradeValueDelta(0);
    track("mock_draft_started",{rounds:numRounds,teams:[...userTeams],board_mode:boardMode});
  },[activeBoard,numRounds,userTeams,boardMode]);

  const cpuPick=useCallback((team,avail,pickNum)=>{
    const needs=teamNeeds[team]||["QB","WR","DL"];
    const dn=TEAM_NEEDS_DETAILED?.[team]||{};
    const prof=TEAM_PROFILES[team]||{bpaLean:0.55,posBoost:[],posPenalty:[],stage:"retool",reachTolerance:0.3,variance:2};
    if(pickNum===1){const m=avail.find(id=>{const p=prospectsMap[id];return p&&p.name==="Fernando Mendoza";});if(m)return m;}
    const round=pickNum<=32?1:pickNum<=64?2:pickNum<=100?3:pickNum<=144?4:pickNum<=180?5:pickNum<=220?6:7;
    // Team-specific BPA/need blend instead of one-size-fits-all
    const bpaW=0.6+prof.bpaLean*0.8; // CIN 1.24, NO 0.88
    const needW=1.15-prof.bpaLean;    // CIN 0.35, NO 0.80
    // Round shifts: all teams get more need-heavy later, but personality sets the baseline
    const roundNeedShift=round<=2?0:round<=4?0.15:0.3;
    const roundBpaShift=round<=2?0:round<=4?-0.1:-0.2;
    const finalBpaW=Math.max(0.3,bpaW+roundBpaShift);
    const finalNeedW=Math.max(0.2,needW+roundNeedShift);

    // Track positions already drafted this draft
    const teamDrafted=picks.filter(pk=>pk.team===team).map(pk=>{const p=prospectsMap[pk.playerId];return p?p.pos:null;}).filter(Boolean);
    const posCounts={};teamDrafted.forEach(pos=>{posCounts[pos]=(posCounts[pos]||0)+1;});

    // Score every available player
    const scored=[];
    avail.forEach(id=>{
      const p=prospectsMap[id];if(!p)return;
      const pos=p.pos;
      const baseGrade=getConsensusGrade?getConsensusGrade(p.name):(gradeMap[id]||50);
      const grade=GRADE_OVERRIDES[p.name]?Math.max(baseGrade,GRADE_OVERRIDES[p.name]):baseGrade;
      const rawRank=getConsensusRank?getConsensusRank(p.name):999;
      const consRank=RANK_OVERRIDES[p.name]||rawRank;
      const nc=dn[pos]||0;const ni=needs.indexOf(pos);
      const nm=nc>=3?18:nc>=2?12:nc===1?8:ni>=0&&ni<3?5:ni>=0?2:(round>=3?-6:0);
      // Elite-grade players (88+) transcend positional value — their rarity at that
      // talent level makes them premium picks regardless of position (Saquon at 2, Bijan at 8).
      // Scale: grade 88 → 1.0, grade 91 → 1.075, grade 95 → 1.175
      const rawPm=POS_DRAFT_VALUE[pos]||1.0;
      const pm=grade>=88?Math.max(rawPm,1.0+(grade-88)*0.025):rawPm;
      const base=Math.pow(Math.max(grade,10),1.3);

      const isBoosted=prof.posBoost.includes(pos);
      const isPenalized=prof.posPenalty.includes(pos);
      const teamPosBoost=isBoosted?1.12:isPenalized&&round<=3?0.75:1.0;

      const isOverride=!!RANK_OVERRIDES[p.name];
      const slide=consRank<900?(pickNum-consRank):0;
      const gradeSlideMultiplier=grade>=88?6:grade>=80?4.5:3;
      // RANK_OVERRIDE players trigger slide panic at 3 picks past their override rank (not 6)
      const slideThreshold=isOverride?3:6;
      const slideBoost=slide>slideThreshold?Math.pow(slide-slideThreshold,1.5)*gradeSlideMultiplier:0;
      const reachThreshold=Math.round(12+prof.reachTolerance*15);
      const reachPenalty=slide<-reachThreshold&&round<=3?Math.abs(slide+reachThreshold)*1.5:0;

      const alreadyAtPos=posCounts[pos]||0;
      const dimReturn=alreadyAtPos>=3?0.4:alreadyAtPos>=2?0.65:alreadyAtPos>=1?0.85:1.0;

      const recentRun=recentPosCounts[pos]||0;
      const runPenalty=recentRun>=4?0.72:recentRun>=3?0.84:recentRun>=2?0.93:1.0;

      const isTopNeed=nc>=2||(ni===0);
      const isSliding=slide>4&&grade>=70;
      const urgencyBoost=isTopNeed&&isSliding?1.18:1.0;

      if(pos==="K/P"&&round<=4)return;
      const rbPen=(pos==="RB"&&round===1&&grade<85)?0.72:1.0;
      const qbMod=pos==="QB"?(nc>=2?1.3:nc>=1?1.1:ni>=0?0.9:0.5):1.0;

      let stageMod=1.0;
      if(prof.stage==="dynasty"||prof.stage==="contend"){if(nc>=2)stageMod=1.1;if(prof.stage==="dynasty"&&isBoosted&&nc>=1)stageMod=1.12;}

      // RANK_OVERRIDE players get a proportional star bonus: the bigger the override jump,
      // the more the CPU "knows" this player is special. Caps at ~12% to avoid rigidity.
      const overrideGap=isOverride?Math.max(0,rawRank-consRank):0;
      const starBonus=isOverride?1.0+Math.min(0.12,overrideGap*0.003):1.0;

      const bpaComponent=base*finalBpaW*pm*rbPen*qbMod*teamPosBoost;
      const needComponent=nm*finalNeedW*12;
      const score=(bpaComponent+needComponent+slideBoost-reachPenalty)*dimReturn*stageMod*runPenalty*urgencyBoost*starBonus;
      scored.push({id,score,grade,consRank});
    });

    if(scored.length===0)return avail[0];

    // Apply score jitter scaled by team variance for run-to-run diversity.
    // variance 1 (Bengals) → ±3% jitter. variance 4 (Saints) → ±12% jitter.
    const jitterPct=prof.variance*0.03;
    scored.forEach(s=>{s.score*=1+(Math.random()*2-1)*jitterPct;});

    // Sort by score descending
    scored.sort((a,b)=>b.score-a.score);

    // ── WEIGHTED RANDOM SELECTION ──
    // Use softmax over a tier of close competitors. Tier width is score-difference based,
    // influenced by round (tighter in rd1) and team variance (wider for volatile teams).
    const topScore=scored[0].score;
    const topGrade=scored[0].grade||50;

    // Tier window: how close must a player be to compete?
    // Team variance widens the tier: variance 1 → baseTierPct, variance 4 → baseTierPct * 1.6
    const baseTierPct=round<=1?0.08:round<=2?0.13:round<=3?0.18:round<=5?0.24:0.32;
    const varianceMult=1.0+(prof.variance-1)*0.2; // variance 1→1.0, 2→1.2, 3→1.4, 4→1.6
    // If top scorer is elite grade, compress tier so they win more often
    const eliteCompress=topGrade>=88?0.6:1.0;
    const tierPct=baseTierPct*varianceMult*eliteCompress;
    const pool=scored.filter(s=>s.score>=topScore*(1-tierPct));

    if(pool.length===1)return pool[0].id;

    // Softmax: top scorer wins most often but tier has real competition
    const temp=round<=1?2.5:round<=3?1.8:1.2;
    const weights=pool.map(s=>Math.exp(s.score/topScore/temp));
    const totalW=weights.reduce((a,b)=>a+b,0);
    let r=Math.random()*totalW;
    for(let i=0;i<pool.length;i++){
      r-=weights[i];
      if(r<=0)return pool[i].id;
    }
    return pool[0].id;
  },[teamNeeds,prospectsMap,gradeMap,getConsensusGrade,getConsensusRank,TEAM_NEEDS_DETAILED,picks,recentPosCounts]);

  const isUserPick=useMemo(()=>{
    return picks.length<totalPicks&&userTeams.has(getPickTeam(picks.length));
  },[picks,userTeams,totalPicks,getPickTeam]);

  const makePick=useCallback((playerId,opts={})=>{
    const n=picks.length;if(n>=totalPicks)return;
    const team=getPickTeam(n);const{round,pick}=fullDraftOrder[n];
    const isUser=userTeams.has(team)&&!opts.traded;
    const np=[...picks,{pick,round,team,playerId,traded:opts.traded||false,isUser}];
    setPicks(np);setAvailable(prev=>prev.filter(id=>id!==playerId));
    // Making a pick dismisses any pending trade offer or trade panel
    if(isUser){setTradeOffer(null);setShowTradeUp(false);}
    if(isUser&&getConsensusRank){
      const p=prospectsMap[playerId];
      if(p){const rank=getConsensusRank(p.name);const g2=getConsensusGrade?getConsensusGrade(p.name):50;const v=pickVerdict(pick,rank,g2);setLastVerdict({...v,player:p.name,pick,rank});setTimeout(()=>setLastVerdict(null),3500);}
    }
    if(np.length>=totalPicks){setShowResults(true);track("mock_draft_completed",{rounds:numRounds,total_picks:np.length,teams:[...userTeams],trades:Object.keys(tradeMap).length});}
  },[picks,fullDraftOrder,totalPicks,userTeams,prospectsMap,getConsensusRank,getPickTeam]);

  const undo=useCallback(()=>{
    if(picks.length===0)return;
    let li=-1;for(let i=picks.length-1;i>=0;i--){if(picks[i].isUser){li=i;break;}}
    if(li===-1)return;
    const kp=picks.slice(0,li);const ki=new Set(kp.map(p=>p.playerId));
    setPicks(kp);setAvailable(activeBoard.map(p=>p.id).filter(id=>!ki.has(id)));
    setLastVerdict(null);setShowResults(false);setTradeOffer(null);
  },[picks,activeBoard]);

  // CPU auto-pick — pauses when trade offer or trade panel is open
  useEffect(()=>{
    if(!setupDone||picks.length>=totalPicks||paused||tradeOffer||showTradeUp)return;
    const n=picks.length;const team=getPickTeam(n);
    if(userTeams.has(team))return;
    const timer=setTimeout(()=>{const pid=cpuPick(team,available,fullDraftOrder[n].pick);if(pid)makePick(pid);},speed);
    return()=>clearTimeout(timer);
  },[picks,paused,available,userTeams,cpuPick,makePick,speed,setupDone,fullDraftOrder,totalPicks,getPickTeam,tradeOffer,showTradeUp]);

  // CPU trade offers — only when it's actually the user's turn and no offer exists
  useEffect(()=>{
    if(!isUserPick||tradeOffer||showTradeUp||picks.length>=totalPicks)return;
    if(Date.now()-tradeDeclinedRef.current<3000)return;
    const idx=picks.length;
    // Double-check this is still a user pick (guard against stale state)
    if(!userTeams.has(getPickTeam(idx)))return;
    const uv=getPickValue(fullDraftOrder[idx].pick);
    const cands=[];
    for(let i=idx+3;i<Math.min(idx+16,totalPicks);i++){const t=getPickTeam(i);if(t&&!userTeams.has(t)&&fullDraftOrder[i]?.round<=3)cands.push({idx:i,team:t,...fullDraftOrder[i]});}
    if(cands.length>0&&Math.random()<0.30){
      const tr=cands[Math.floor(Math.random()*cands.length)];
      const tv=getPickValue(tr.pick);const fp=Math.min(tr.pick+64,totalPicks);const fr=Math.min(tr.round+2,7);
      const ov=tv+getPickValue(fp);
      if(ov>=uv*0.92)setTradeOffer({fromTeam:tr.team,traderIdx:tr.idx,theirPick:tr.pick,theirRound:tr.round,futurePick:fp,futureRound:fr,userPickIdx:idx,userPick:fullDraftOrder[idx].pick,userVal:uv,offerVal:Math.round(ov)});
    }
  },[isUserPick,picks,tradeOffer,showTradeUp,totalPicks,fullDraftOrder,userTeams,getPickTeam]);

  const acceptTrade=useCallback(()=>{
    if(!tradeOffer)return;
    const ct=tradeOffer.fromTeam;const ui=tradeOffer.userPickIdx;const ci=tradeOffer.traderIdx;const ut=getPickTeam(ui);
    setTradeMap(prev=>({...prev,[ui]:ct,[ci]:ut}));
    // Track JJP value delta: they give offerVal, we give userVal
    setTradeValueDelta(prev=>prev+(tradeOffer.offerVal-tradeOffer.userVal));
    const pid=cpuPick(ct,available,fullDraftOrder[ui].pick);
    if(pid){const{round,pick}=fullDraftOrder[ui];setPicks(prev=>[...prev,{pick,round,team:ct,playerId:pid,traded:true,isUser:false}]);setAvailable(prev=>prev.filter(id=>id!==pid));}
    setTradeOffer(null);
  },[tradeOffer,cpuPick,available,fullDraftOrder,getPickTeam]);

  const declineTrade=()=>{tradeDeclinedRef.current=Date.now();setTradeOffer(null);};
  const openTradeUp=()=>{setShowTradeUp(true);setTradeTarget([]);setTradeUserPicks([]);setTradePartner(null);};
  const closeTradeUp=()=>{setShowTradeUp(false);setTradeTarget([]);setTradeUserPicks([]);setTradePartner(null);};

  // All CPU teams for trade partner selection
  const allCpuTeams=useMemo(()=>{
    return ALL_TEAMS.filter(t=>!userTeams.has(t)).sort();
  },[ALL_TEAMS,userTeams]);

  // Get a trade partner's available assets: remaining picks this draft + future year picks
  const partnerAssets=useMemo(()=>{
    if(!tradePartner)return{thisDraft:[],futurePicks:[]};
    // Remaining picks this draft
    const thisDraft=[];
    for(let i=picks.length;i<totalPicks;i++){
      if(getPickTeam(i)===tradePartner)thisDraft.push({idx:i,...fullDraftOrder[i],type:"current",label:`Rd${fullDraftOrder[i].round} #${fullDraftOrder[i].pick}`,value:getPickValue(fullDraftOrder[i].pick)});
    }
    // Future picks: 2027 & 2028, rounds 1-7 (estimated values)
    const futurePicks=[];
    for(let yr=2027;yr<=2028;yr++){
      for(let rd=1;rd<=7;rd++){
        const estPick=rd*32-16; // mid-round estimate
        futurePicks.push({year:yr,round:rd,type:"future",label:`${yr} Rd${rd}`,value:Math.round(getPickValue(estPick)*0.85)}); // future picks worth ~85%
      }
    }
    return{thisDraft,futurePicks};
  },[tradePartner,picks,totalPicks,getPickTeam,fullDraftOrder]);

  // User's tradable picks (current draft + future)
  const userAllPicks=useMemo(()=>{
    const ut=[...userTeams][0];if(!ut)return{thisDraft:[],futurePicks:[]};
    const thisDraft=[];
    for(let i=picks.length;i<totalPicks;i++){
      if(getPickTeam(i)===ut)thisDraft.push({idx:i,...fullDraftOrder[i],type:"current",label:`Rd${fullDraftOrder[i].round} #${fullDraftOrder[i].pick}`,value:getPickValue(fullDraftOrder[i].pick)});
    }
    const futurePicks=[];
    for(let yr=2027;yr<=2028;yr++){
      for(let rd=1;rd<=7;rd++){
        const estPick=rd*32-16;
        futurePicks.push({year:yr,round:rd,type:"future",label:`${yr} Rd${rd}`,value:Math.round(getPickValue(estPick)*0.85)});
      }
    }
    return{thisDraft,futurePicks};
  },[userTeams,picks,totalPicks,getPickTeam,fullDraftOrder]);

  const executeTradeUp=useCallback(()=>{
    if(tradeTarget.length===0||tradeUserPicks.length===0||!tradePartner)return;
    const tv=tradeTarget.reduce((s,p)=>s+(p.value||0),0);
    const ov=tradeUserPicks.reduce((s,p)=>s+(p.value||0),0);
    if(ov<tv*1.05)return;
    const ut=[...userTeams][0];const nm={...tradeMap};
    // Reassign their current-draft picks to user
    tradeTarget.filter(p=>p.type==="current"&&p.idx!=null).forEach(p=>{nm[p.idx]=ut;});
    // Reassign user's current-draft picks to the partner
    tradeUserPicks.filter(p=>p.type==="current"&&p.idx!=null).forEach(p=>{nm[p.idx]=tradePartner;});
    setTradeMap(nm);closeTradeUp();
  },[tradeTarget,tradeUserPicks,tradeMap,userTeams,tradePartner]);

  const toggleTeam=(t)=>setUserTeams(prev=>{const n=new Set(prev);n.has(t)?n.delete(t):n.add(t);return n;});
  const toggleCompare=(p)=>{setCompareList(prev=>{const e=prev.find(x=>x.id===p.id);if(e)return prev.filter(x=>x.id!==p.id);if(prev.length>=4)return prev;return[...prev,p];});};

  // Depth chart: NFL roster + drafted players overlay — round-aware slotting
  const depthChart=useMemo(()=>{
    const chart={};
    [...userTeams].forEach(team=>{
      chart[team]={};const roster=NFL_ROSTERS[team]||{};
      // Start with roster in slots
      DEPTH_GROUPS.forEach(g=>{
        g.slots.forEach(s=>{if(roster[s])chart[team][s]={name:roster[s],isRoster:true};});
      });
      // Slot drafted players based on round and grade
      const teamPicks=picks.filter(pk=>pk.team===team);
      teamPicks.forEach(pk=>{
        const p=prospectsMap[pk.playerId];if(!p)return;
        const group=DEPTH_GROUPS.find(g=>g.posMatch===p.pos);if(!group)return;
        const grade=getConsensusGrade?getConsensusGrade(p.name):(gradeMap[pk.playerId]||50);
        const entry={name:p.name,isDraft:true};
        if(pk.round===1||grade>=85){
          // Day 1 starter or elite grade: take slot 0, shift everyone down
          for(let i=group.slots.length-1;i>0;i--){
            if(chart[team][group.slots[i-1]])chart[team][group.slots[i]]=chart[team][group.slots[i-1]];
          }
          chart[team][group.slots[0]]=entry;
        }else if(pk.round<=3&&grade>=70){
          // Quality day 2 pick: target slot 1, shift slot 1+ down
          const tgt=Math.min(1,group.slots.length-1);
          for(let i=group.slots.length-1;i>tgt;i--){
            if(chart[team][group.slots[i-1]])chart[team][group.slots[i]]=chart[team][group.slots[i-1]];
          }
          chart[team][group.slots[tgt]]=entry;
        }else{
          // Late round / low grade: find first empty slot, no shifting
          const emptyIdx=group.slots.findIndex(s=>!chart[team][s]);
          if(emptyIdx>=0){
            chart[team][group.slots[emptyIdx]]=entry;
          }else{
            // All full — take last slot (replaces deepest backup)
            chart[team][group.slots[group.slots.length-1]]=entry;
          }
        }
      });
    });
    return chart;
  },[picks,userTeams,prospectsMap,getConsensusGrade,gradeMap]);

  const liveNeeds=useMemo(()=>{
    const needs={};
    [...userTeams].forEach(team=>{
      const base=TEAM_NEEDS_DETAILED?.[team]||{};const rem={...base};
      picks.filter(pk=>pk.team===team).forEach(pk=>{const p=prospectsMap[pk.playerId];if(!p)return;if(rem[p.pos]>0)rem[p.pos]--;});
      needs[team]=rem;
    });
    return needs;
  },[picks,userTeams,prospectsMap,TEAM_NEEDS_DETAILED]);

  const filteredAvailable=useMemo(()=>{
    if(filterPos.size===0)return available;
    return available.filter(id=>{const p=prospectsMap[id];return p&&filterPos.has(p.pos);});
  },[available,filterPos,prospectsMap]);

  // Grade wrapper — calls pure function with current hook values
  const gradeTeamPicks=useCallback((teamPicks,team)=>{
    return scoreTeamPicks(teamPicks,team,prospectsMap,getConsensusRank,liveNeeds,TEAM_NEEDS_DETAILED);
  },[prospectsMap,getConsensusRank,liveNeeds,TEAM_NEEDS_DETAILED]);

  // Overall draft grade — null for all-32 (prediction mode, not graded)
  const draftGrade=useMemo(()=>{
    if(picks.length<totalPicks)return null;
    if(userTeams.size===32)return null;
    const up=picks.filter(pk=>pk.isUser);if(up.length===0)return null;
    if(userTeams.size===1){
      return scoreTeamPicks(up,[...userTeams][0],prospectsMap,getConsensusRank,liveNeeds,TEAM_NEEDS_DETAILED);
    }
    // Multi-team: best overall score across all teams
    let totalScore=0,count=0;
    [...userTeams].forEach(team=>{
      const tp=up.filter(pk=>pk.team===team);if(!tp.length)return;
      let tr=0,c2=0;
      tp.forEach(pk=>{
        const p=prospectsMap[pk.playerId];if(!p)return;
        const rank=getConsensusRank?getConsensusRank(p.name):pk.pick;
        const sv=getPickValue(pk.pick);if(!sv)return;
        tr+=getPickValue(rank<900?rank:pk.pick)/sv;c2++;
      });
      if(c2>0){totalScore+=tr/c2;count++;}
    });
    if(!count)return null;
    const avg=totalScore/count;
    if(avg>=1.6)return{grade:"A+",color:"#16a34a"};
    if(avg>=1.4)return{grade:"A",color:"#16a34a"};
    if(avg>=1.2)return{grade:"B+",color:"#22c55e"};
    if(avg>=1.05)return{grade:"B",color:"#22c55e"};
    if(avg>=0.95)return{grade:"B-",color:"#ca8a04"};
    if(avg>=0.85)return{grade:"C+",color:"#ca8a04"};
    if(avg>=0.75)return{grade:"C",color:"#ca8a04"};
    if(avg>=0.65)return{grade:"D",color:"#dc2626"};
    return{grade:"F",color:"#dc2626"};
  },[picks,prospectsMap,getConsensusRank,totalPicks,userTeams,liveNeeds,TEAM_NEEDS_DETAILED]);

  const resultsRef=useRef(null);
  const shareRef=useRef(null);

  const shareDraft=useCallback(async()=>{
    const up=picks.filter(pk=>pk.isUser);
    if(up.length===0)return;
    const isSingleTeam=userTeams.size===1;
    const isAllTeams=userTeams.size===32;
    if(!isSingleTeam&&!isAllTeams)return;
    track("share_triggered",{type:isSingleTeam?"single_team":"all_teams",teams:[...userTeams],picks:up.length});

    const node=shareRef.current;
    if(!node){alert('Share card not ready');return;}

    // Briefly make the share card visible for capture
    node.style.position='fixed';
    node.style.left='0';
    node.style.top='0';
    node.style.zIndex='-1';
    node.style.opacity='1';
    node.style.pointerEvents='none';

    // Draw hero radar chart if present
    const heroCanvas=node.querySelector('canvas[data-hero-radar]');
    if(heroCanvas){
      const up=picks.filter(pk=>pk.isUser);
      const tp=up.filter(pk=>pk.team===[...userTeams][0]);
      const rd1=tp.find(pk=>pk.round===1);
      if(rd1){
        const hp=prospectsMap[rd1.playerId];
        if(hp){
          const hc=POS_COLORS[hp.pos]||'#737373';
          const ctx=heroCanvas.getContext('2d');
          ctx.clearRect(0,0,160,160);
          drawRadarChart(ctx,hp,80,80,160,hc);
        }
      }
    }

    // Wait for paint
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));

    try{
      const {default:html2canvas}=await import("html2canvas");
      const canvas=await html2canvas(node,{
        scale:2,
        useCORS:true,
        allowTaint:true,
        backgroundColor:'#faf9f6',
        logging:false,
        width:node.offsetWidth,
        height:node.offsetHeight,
      });

      const teams=[...userTeams];
      const label=isSingleTeam?teams[0]:'mock-draft';

      canvas.toBlob(blob=>{
        if(!blob){alert('Could not generate image');return;}
        if(navigator.share&&navigator.canShare&&navigator.canShare({files:[new File([blob],'draft.png',{type:'image/png'})]})){
          navigator.share({
            files:[new File([blob],`bigboardlab-${label}.png`,{type:'image/png'})],
            title:'My Mock Draft — Big Board Lab',
            text:'Build yours at bigboardlab.com'
          }).catch(()=>{});
        }else{
          const url=URL.createObjectURL(blob);
          const a=document.createElement('a');a.href=url;
          a.download=`bigboardlab-${label}.png`;
          document.body.appendChild(a);a.click();document.body.removeChild(a);
          setTimeout(()=>URL.revokeObjectURL(url),3000);
        }
      },'image/png');
    }catch(e){
      console.error('share error',e);
      const isSafari=/^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      alert(isSafari?'Share failed — try using Chrome for best results.':'Share failed: '+e.message);
    }finally{
      // Hide the share card again
      node.style.position='absolute';
      node.style.left='-9999px';
      node.style.top='-9999px';
      node.style.zIndex='-1';
      node.style.opacity='0';
    }
  },[picks,userTeams,prospectsMap,activeGrade,getConsensusRank,getConsensusGrade,draftGrade,gradeTeamPicks]);

  // === SHARE CARD (rendered off-screen, captured by html2canvas) ===
  const ShareCard=useMemo(()=>{
    const isSingleTeam=userTeams.size===1;
    const isAllTeams=userTeams.size===32;
    if(!isSingleTeam&&!isAllTeams)return null;
    const userPicks=picks.filter(pk=>pk.isUser);
    if(userPicks.length===0)return null;

    // All-32 mode: 4x8 first-round grid
    if(isAllTeams){
      const rd1=picks.filter(pk=>pk.round===1);
      return(
        <div ref={shareRef} style={{position:"absolute",left:-9999,top:-9999,zIndex:-1,opacity:0,width:520,background:"#faf9f6",padding:"20px 16px",fontFamily:font}}>
          {/* Header with logo */}
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
            <img src={BBL_LOGO_B64} alt="BBL" style={{width:36,height:36,borderRadius:8}} crossOrigin="anonymous"/>
            <div>
              <div style={{fontFamily:font,fontSize:16,fontWeight:900,color:"#171717"}}>2026 NFL Draft</div>
              <div style={{fontFamily:mono,fontSize:9,color:"#a3a3a3",letterSpacing:1}}>FIRST ROUND PREDICTIONS</div>
            </div>
          </div>
          {/* 4-column grid */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:"3px 6px"}}>
            {rd1.map((pk,i)=>{const p=prospectsMap[pk.playerId];if(!p)return null;const c=POS_COLORS[p.pos];
              return<div key={i} style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:6,padding:"4px 6px",display:"flex",alignItems:"center",gap:4}}>
                <span style={{fontFamily:mono,fontSize:7,color:"#d4d4d4",width:14,textAlign:"right",flexShrink:0}}>{pk.pick}</span>
                <NFLTeamLogo team={pk.team} size={12}/>
                <div style={{flex:1,minWidth:0,overflow:"hidden"}}>
                  <div style={{fontFamily:sans,fontSize:8,fontWeight:600,color:"#171717",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.name.split(" ").pop()}</div>
                  <div style={{fontFamily:mono,fontSize:6,color:c}}>{p.gpos||p.pos}</div>
                </div>
              </div>;
            })}
          </div>
          {/* Footer */}
          <div style={{marginTop:10,paddingTop:8,borderTop:"1px solid #e5e5e5",textAlign:"center"}}>
            <div style={{fontFamily:sans,fontSize:11,fontWeight:700,color:"#171717"}}>bigboardlab.com</div>
            <div style={{fontFamily:mono,fontSize:8,color:"#a3a3a3"}}>build your own mock draft</div>
          </div>
        </div>
      );
    }

    // Single-team mode: picks list + hero radar for pick 1 + grade + logo
    const team=[...userTeams][0];
    const tp=userPicks.filter(pk=>pk.team===team);
    const rd1Pick=tp.find(pk=>pk.round===1);
    const heroPlayer=rd1Pick?prospectsMap[rd1Pick.playerId]:null;
    const heroPos=heroPlayer?(heroPlayer.gpos||heroPlayer.pos):null;
    const heroTraits=heroPlayer&&heroPos?(POSITION_TRAITS[heroPos]||POSITION_TRAITS[heroPlayer.pos]||[]):[];
    const heroColor=heroPlayer?(POS_COLORS[heroPlayer.pos]||"#737373"):"#737373";
    const heroGrade=heroPlayer?activeGrade(rd1Pick.playerId):0;

    return(
      <div ref={shareRef} style={{position:"absolute",left:-9999,top:-9999,zIndex:-1,opacity:0,width:420,background:"#faf9f6",padding:"20px 16px",fontFamily:font}}>
        {/* Header with logo */}
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
          <img src={BBL_LOGO_B64} alt="BBL" style={{width:36,height:36,borderRadius:8}} crossOrigin="anonymous"/>
          <div style={{flex:1}}>
            <div style={{fontFamily:font,fontSize:16,fontWeight:900,color:"#171717"}}>2026 Mock Draft</div>
            <div style={{fontFamily:mono,fontSize:9,color:"#a3a3a3",letterSpacing:1}}>WAR ROOM RESULTS</div>
          </div>
          {draftGrade&&<div style={{textAlign:"center",padding:"6px 16px",border:"2px solid "+draftGrade.color,borderRadius:10,background:"#fff"}}>
            <div style={{fontFamily:mono,fontSize:7,letterSpacing:1,color:"#a3a3a3"}}>GRADE</div>
            <div style={{fontFamily:font,fontSize:28,fontWeight:900,color:draftGrade.color,lineHeight:1}}>{draftGrade.grade}</div>
          </div>}
        </div>
        {/* Team header */}
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8,marginTop:8}}>
          <NFLTeamLogo team={team} size={18}/>
          <span style={{fontFamily:sans,fontSize:13,fontWeight:700,color:"#171717"}}>{team}</span>
          <span style={{fontFamily:mono,fontSize:9,color:"#a3a3a3"}}>{tp.length} pick{tp.length!==1?"s":""}</span>
        </div>
        {/* HERO: first-round pick with radar chart + trait bars */}
        {heroPlayer&&heroTraits.length>0&&<div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:10,padding:"12px 14px",marginBottom:8,display:"flex",gap:12,alignItems:"center"}}>
          <canvas data-hero-radar="1" width={160} height={160} style={{width:140,height:140,flexShrink:0}}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontFamily:mono,fontSize:8,color:heroColor,letterSpacing:1,marginBottom:2}}>{heroPos} · Rd{rd1Pick.round} #{rd1Pick.pick}</div>
            <div style={{fontFamily:font,fontSize:18,fontWeight:900,color:"#171717",lineHeight:1.1,marginBottom:2}}>{heroPlayer.name}</div>
            <div style={{fontFamily:sans,fontSize:10,color:"#a3a3a3",marginBottom:8}}>{heroPlayer.school}</div>
            <div style={{fontFamily:font,fontSize:32,fontWeight:900,color:heroGrade>=75?"#16a34a":heroGrade>=55?"#ca8a04":"#dc2626",lineHeight:1,marginBottom:8}}>{heroGrade}</div>
            {/* Trait bars */}
            <div style={{display:"flex",flexDirection:"column",gap:3}}>
              {heroTraits.slice(0,5).map(t=>{
                const val=traits[heroPlayer.id]?.[t]||50;
                return<div key={t} style={{display:"flex",alignItems:"center",gap:4}}>
                  <span style={{fontFamily:mono,fontSize:7,color:"#a3a3a3",width:28,textAlign:"right",flexShrink:0}}>{t.split(' ').map(w=>w[0]).join('')}</span>
                  <div style={{flex:1,height:4,background:"#e5e5e5",borderRadius:2,overflow:"hidden"}}>
                    <div style={{height:"100%",width:val+"%",background:val>=75?heroColor:val>=50?heroColor+"88":"#d4d4d4",borderRadius:2}}/>
                  </div>
                  <span style={{fontFamily:font,fontSize:8,fontWeight:900,color:val>=75?heroColor:"#a3a3a3",width:16,textAlign:"right"}}>{val}</span>
                </div>;
              })}
            </div>
          </div>
        </div>}
        {/* Picks list */}
        <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:10,overflow:"hidden",marginBottom:10}}>
          {tp.map((pk,i)=>{const p=prospectsMap[pk.playerId];if(!p)return null;const c=POS_COLORS[p.pos];const g=activeGrade(pk.playerId);const rank=getConsensusRank?getConsensusRank(p.name):pk.pick;const g2=getConsensusGrade?getConsensusGrade(p.name):g;const v=pickVerdict(pk.pick,rank,g2);
            return<div key={i} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 10px",borderBottom:i<tp.length-1?"1px solid #f5f5f5":"none"}}>
              <span style={{fontFamily:mono,fontSize:9,color:"#d4d4d4",width:42}}>Rd{pk.round} #{pk.pick}</span>
              <span style={{fontFamily:mono,fontSize:9,color:c,width:24}}>{p.gpos||p.pos}</span>
              <SchoolLogo school={p.school} size={14}/>
              <span style={{fontFamily:sans,fontSize:11,fontWeight:600,color:"#171717",flex:1}}>{p.name}</span>
              <span style={{fontFamily:mono,fontSize:6,padding:"1px 4px",background:v.bg,color:v.color,borderRadius:3}}>{v.text}</span>
              <span style={{fontFamily:font,fontSize:11,fontWeight:900,color:g>=75?"#16a34a":g>=55?"#ca8a04":"#dc2626",width:22,textAlign:"right"}}>{g}</span>
            </div>;
          })}
        </div>
        {/* Footer */}
        <div style={{paddingTop:8,borderTop:"1px solid #e5e5e5",textAlign:"center"}}>
          <div style={{fontFamily:sans,fontSize:11,fontWeight:700,color:"#171717"}}>bigboardlab.com</div>
          <div style={{fontFamily:mono,fontSize:8,color:"#a3a3a3"}}>build your own mock draft · 2026 NFL Draft</div>
        </div>
      </div>
    );
  },[picks,userTeams,prospectsMap,activeGrade,getConsensusRank,getConsensusGrade,draftGrade,POS_COLORS,font,mono,sans,traits,POSITION_TRAITS]);

  // Canvas helper: rounded rectangle path
  function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();}

  // Canvas radar chart — mirrors the SVG RadarChart component
  function drawRadarChart(ctx,player,cy,cx,size,color){
    const pos=player.gpos||player.pos;
    const posTraits=POSITION_TRAITS[pos]||POSITION_TRAITS[player.pos]||[];
    if(posTraits.length===0)return;
    const r=size/2-28;const n=posTraits.length;
    const angles=posTraits.map((_,i)=>(Math.PI*2*i)/n-Math.PI/2);
    const vals=posTraits.map(t=>traits[player.id]?.[t]||50);

    // Grid rings
    [0.25,0.5,0.75,1].forEach(lv=>{
      ctx.beginPath();
      angles.forEach((a,i)=>{const px=cx+r*lv*Math.cos(a);const py=cy+r*lv*Math.sin(a);i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);});
      ctx.closePath();ctx.strokeStyle='#e5e5e5';ctx.lineWidth=0.75;ctx.stroke();
    });
    // Axes
    angles.forEach(a=>{
      ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+r*Math.cos(a),cy+r*Math.sin(a));
      ctx.strokeStyle='#e5e5e5';ctx.lineWidth=0.75;ctx.stroke();
    });
    // Fill polygon
    ctx.beginPath();
    angles.forEach((a,i)=>{const v=(vals[i]||50)/100;const px=cx+r*v*Math.cos(a);const py=cy+r*v*Math.sin(a);i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);});
    ctx.closePath();ctx.fillStyle=color+'28';ctx.fill();
    ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke();
    // Dots
    angles.forEach((a,i)=>{const v=(vals[i]||50)/100;ctx.beginPath();ctx.arc(cx+r*v*Math.cos(a),cy+r*v*Math.sin(a),3.5,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();});
    // Labels — abbreviated like the SVG version
    ctx.fillStyle='#737373';ctx.font='9px monospace';ctx.textAlign='center';
    posTraits.forEach((t,i)=>{
      const lr=r+16;const lx=cx+lr*Math.cos(angles[i]);const ly=cy+lr*Math.sin(angles[i]);
      const abbr=t.split(' ').map(w=>w[0]).join('');
      ctx.fillText(abbr,lx,ly+3);
    });
    ctx.textAlign='left';
  }

  const userPickCount=useMemo(()=>picks.filter(p=>p.isUser).length,[picks]);

  // Sub-components
  const renderFormation=useCallback((team)=>{
    const chart=depthChart[team]||{};
    return(<svg viewBox="0 0 100 105" style={{width:"100%",maxWidth:280}}>
      <rect x="0" y="0" width="100" height="105" rx="4" fill="#faf9f6" stroke="#e5e5e5" strokeWidth="0.5"/>
      {[20,40,58,75,90].map(y=><line key={y} x1="2" y1={y} x2="98" y2={y} stroke="rgba(0,0,0,0.04)" strokeWidth="0.3"/>)}
      <line x1="2" y1="58" x2="98" y2="58" stroke="rgba(124,58,237,0.3)" strokeWidth="0.5" strokeDasharray="2,1.5"/>
      {Object.entries(FORMATION_POS).map(([slot,pos])=>{
        const entry=chart[slot];const filled=!!entry;const isDraft=entry?.isDraft;const isOff=pos.y>58;
        const dotColor=isDraft?"#7c3aed":filled?(isOff?"#3b82f6":"#60a5fa"):"#d4d4d4";
        const lastName=entry?entry.name.split(" ").pop():"";
        return(<g key={slot}>
          <circle cx={pos.x} cy={pos.y} r={filled?2.4:1.6} fill={dotColor} stroke={isDraft?"#7c3aed":"#a3a3a3"} strokeWidth={isDraft?"0.5":"0.2"}/>
          <text x={pos.x} y={pos.y-3} textAnchor="middle" fill="#a3a3a3" fontSize="1.8" fontFamily="monospace">{slot.replace(/\d$/,'')}</text>
          {filled&&<text x={pos.x} y={pos.y+4.5} textAnchor="middle" fill={isDraft?"#7c3aed":"#525252"} fontSize={isDraft?"2.2":"1.8"} fontWeight={isDraft?"bold":"normal"} fontFamily="sans-serif">{lastName}</text>}
        </g>);
      })}
    </svg>);
  },[depthChart]);

  const renderDepthList=useCallback((team,dark=true)=>{
    const chart=depthChart[team]||{};
    const slotColor="#a3a3a3";
    const nameColor="#525252";
    const draftColor="#7c3aed";
    return(<div style={{marginTop:4}}>
      {DEPTH_GROUPS.map(group=>{
        const entries=group.slots.map(s=>({slot:s,entry:chart[s]})).filter(x=>x.entry);
        const extras=Object.entries(chart).filter(([k])=>k.startsWith(group.slots[group.slots.length-1]+"_d")).map(([k,v])=>({slot:k,entry:v}));
        if(entries.length===0&&extras.length===0)return null;
        return(<div key={group.label} style={{marginBottom:2}}>
          {entries.map(({slot,entry})=>(<div key={slot} style={{fontFamily:sans,fontSize:9,padding:"1px 0",display:"flex",gap:4}}>
            <span style={{color:slotColor,width:16,fontSize:7}}>{slot}</span>
            <span style={{fontWeight:entry.isDraft?700:400,color:entry.isDraft?draftColor:nameColor}}>{entry.name}{entry.isDraft?" ★":""}</span>
          </div>))}
          {extras.map(({slot,entry})=>(<div key={slot} style={{fontFamily:sans,fontSize:9,padding:"1px 0",display:"flex",gap:4}}>
            <span style={{color:slotColor,width:16,fontSize:7}}>+</span>
            <span style={{fontWeight:entry.isDraft?700:400,color:entry.isDraft?draftColor:nameColor}}>{entry.name}{entry.isDraft?" ★":""}</span>
          </div>))}
        </div>);
      })}
    </div>);
  },[depthChart,sans]);

  const renderLiveNeeds=useCallback((team)=>{
    const needs=liveNeeds[team]||{};const entries=Object.entries(needs).filter(([,v])=>v>0);
    const base=TEAM_NEEDS_DETAILED?.[team]||{};const filled=Object.entries(base).filter(([k])=>!needs[k]||needs[k]===0);
    return(<div style={{marginTop:4}}>
      <div style={{fontFamily:mono,fontSize:7,letterSpacing:1.5,color:"rgba(255,255,255,0.3)",textTransform:"uppercase",marginBottom:2}}>needs</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:2}}>
        {entries.map(([pos,count])=>(<span key={pos} style={{fontFamily:mono,fontSize:7,padding:"1px 4px",background:"rgba(239,68,68,0.2)",color:"#fca5a5",border:"1px solid rgba(239,68,68,0.25)",borderRadius:3}}>{pos}{count>1?" ×"+count:""}</span>))}
        {filled.map(([pos])=>(<span key={pos} style={{fontFamily:mono,fontSize:7,padding:"1px 4px",background:"rgba(34,197,94,0.15)",color:"#86efac",borderRadius:3,textDecoration:"line-through",opacity:0.5}}>{pos} ✓</span>))}
      </div>
    </div>);
  },[liveNeeds,TEAM_NEEDS_DETAILED,mono]);

  // === SETUP SCREEN ===
  if(!setupDone)return(
    <div style={{minHeight:"100vh",background:"#faf9f6",fontFamily:font}}>
      <div style={{position:"fixed",top:0,left:0,right:0,zIndex:100,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 16px",background:"#fff",borderBottom:"1px solid #f0f0f0"}}>
        <span style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3"}}>WAR ROOM</span>
        <button onClick={onClose} style={{fontFamily:sans,fontSize:10,color:"#a3a3a3",background:"none",border:"1px solid #e5e5e5",borderRadius:99,padding:"3px 10px",cursor:"pointer"}}>✕ exit</button>
      </div>
      <div style={{maxWidth:600,margin:"0 auto",padding:"52px 24px 40px"}}>
        <h1 style={{fontSize:28,fontWeight:900,color:"#171717",margin:"0 0 4px"}}>war room</h1>
        <p style={{fontFamily:sans,fontSize:13,color:"#737373",margin:"0 0 24px"}}>Draft as any team. Compare players, make trades, fill your depth chart.</p>
        <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"20px 24px",marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase"}}>your team(s)</div>
            <div style={{display:"flex",gap:4}}>
              <button onClick={()=>setUserTeams(new Set(ALL_TEAMS))} style={{fontFamily:sans,fontSize:10,padding:"3px 10px",background:"transparent",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",color:"#a3a3a3"}}>select all</button>
              <button onClick={()=>setUserTeams(new Set())} style={{fontFamily:sans,fontSize:10,padding:"3px 10px",background:"transparent",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",color:"#a3a3a3"}}>clear</button>
            </div>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {ALL_TEAMS.sort().map(t=><button key={t} onClick={()=>toggleTeam(t)} style={{fontFamily:sans,fontSize:11,padding:"5px 12px",background:userTeams.has(t)?"#171717":"transparent",color:userTeams.has(t)?"#faf9f6":"#737373",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6}}><NFLTeamLogo team={t} size={16}/>{t}</button>)}
          </div>
        </div>
        <div style={{display:"flex",gap:12,marginBottom:16}}>
          <div style={{flex:1,background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"20px 24px"}}>
            <div style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:12}}>rounds</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {[1,2,3,4,5,6,7].map(r=><button key={r} onClick={()=>setNumRounds(r)} style={{fontFamily:sans,fontSize:13,fontWeight:numRounds===r?700:400,padding:"8px 14px",background:numRounds===r?"#171717":"transparent",color:numRounds===r?"#faf9f6":"#737373",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer"}}>{r}</button>)}
            </div>
          </div>
          <div style={{flex:1,background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"20px 24px"}}>
            <div style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:12}}>cpu speed</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {[["slow",1200],["med",600],["fast",200],["instant",50]].map(([label,ms])=><button key={label} onClick={()=>setSpeed(ms)} style={{fontFamily:sans,fontSize:13,fontWeight:speed===ms?700:400,padding:"8px 14px",background:speed===ms?"#171717":"transparent",color:speed===ms?"#faf9f6":"#737373",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer"}}>{label}</button>)}
            </div>
          </div>
        </div>
        <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"20px 24px",marginBottom:16}}>
          <div style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:12}}>draft board</div>
          <div style={{display:"flex",gap:6}}>
            {[["consensus","Consensus Board"],["my","My Board"]].map(([mode,label])=><button key={mode} onClick={()=>setBoardMode(mode)} style={{flex:1,fontFamily:sans,fontSize:13,fontWeight:boardMode===mode?700:400,padding:"10px 14px",background:boardMode===mode?"#171717":"transparent",color:boardMode===mode?"#faf9f6":"#737373",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer"}}>{label}</button>)}
          </div>
          <p style={{fontFamily:sans,fontSize:11,color:"#a3a3a3",margin:"8px 0 0"}}>{boardMode==="consensus"?"Industry consensus rankings & grades":"Your pair-ranked positions first, then consensus for unranked groups"}</p>
        </div>
        <button onClick={startDraft} disabled={userTeams.size===0} style={{width:"100%",fontFamily:sans,fontSize:14,fontWeight:700,padding:"14px",background:userTeams.size>0?"#171717":"#d4d4d4",color:"#faf9f6",border:"none",borderRadius:99,cursor:userTeams.size>0?"pointer":"default"}}>
          start draft ({numRounds} round{numRounds>1?"s":""} · {userTeams.size} team{userTeams.size!==1?"s":""})
        </button>
      </div>
    </div>
  );

  const currentPickIdx=picks.length;
  const currentRound=currentPickIdx<totalPicks?fullDraftOrder[currentPickIdx].round:numRounds;
  const currentTeam=currentPickIdx<totalPicks?getPickTeam(currentPickIdx):"";

  // === RESULTS SCREEN ===
  if(showResults&&picks.length>=totalPicks){
    const userPicks=picks.filter(pk=>pk.isUser);
    return(
      <div style={{minHeight:"100vh",background:"#faf9f6",fontFamily:font}}>
        <div style={{position:"fixed",top:0,left:0,right:0,zIndex:100,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 16px",background:"#fff",borderBottom:"1px solid #f0f0f0"}}>
          <span style={{fontFamily:mono,fontSize:10,color:"#a3a3a3"}}>draft complete</span>
          <button onClick={onClose} style={{fontFamily:sans,fontSize:10,color:"#a3a3a3",background:"none",border:"1px solid #e5e5e5",borderRadius:99,padding:"3px 10px",cursor:"pointer"}}>✕ exit</button>
        </div>
        <div ref={resultsRef} style={{maxWidth:900,margin:"0 auto",padding:"52px 24px 40px",textAlign:"center"}}>
          <h1 style={{fontSize:36,fontWeight:900,color:"#171717",margin:"0 0 8px"}}>draft complete!</h1>
          {/* Overall grade — single team only, shown prominently at top */}
          {draftGrade&&userTeams.size===1&&<div style={{display:"inline-block",padding:"12px 32px",background:"#fff",border:"2px solid "+draftGrade.color,borderRadius:16,marginBottom:24}}>
            <div style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase"}}>draft grade</div>
            <div style={{fontFamily:font,fontSize:56,fontWeight:900,color:draftGrade.color,lineHeight:1}}>{draftGrade.grade}</div>
            {tradeValueDelta!==0&&<div style={{fontFamily:mono,fontSize:10,color:tradeValueDelta>0?"#16a34a":"#dc2626",marginTop:4}}>trade surplus: {tradeValueDelta>0?"+":""}{tradeValueDelta} pts</div>}
          </div>}
          {/* All-32: no grade, just a label */}
          {userTeams.size===32&&<div style={{fontFamily:mono,fontSize:11,color:"#a3a3a3",marginBottom:24,letterSpacing:1}}>2026 NFL DRAFT · FIRST ROUND PREDICTIONS</div>}
          <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:24}}>
            {(userTeams.size===1||userTeams.size===32)&&<button onClick={shareDraft} style={{fontFamily:sans,fontSize:12,fontWeight:600,padding:"8px 20px",background:"#171717",color:"#faf9f6",border:"none",borderRadius:99,cursor:"pointer"}}>🔮 share results</button>}
            <button onClick={()=>{setSetupDone(false);setPicks([]);setShowResults(false);setTradeMap({});}} style={{fontFamily:sans,fontSize:12,padding:"8px 20px",background:"transparent",color:"#525252",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer"}}>draft again</button>
          </div>
          {[...userTeams].map(team=>{
            const tp=userPicks.filter(pk=>pk.team===team);if(tp.length===0)return null;
            const teamGrade=userTeams.size!==32?gradeTeamPicks(tp,team):null;
            return(<div key={team} style={{marginBottom:32,textAlign:"left"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,justifyContent:"center"}}>
                <NFLTeamLogo team={team} size={20}/>
                <span style={{fontFamily:sans,fontSize:14,fontWeight:700,color:"#171717"}}>{team}</span>
                {teamGrade&&<span style={{fontFamily:font,fontSize:18,fontWeight:900,color:teamGrade.color,marginLeft:4}}>{teamGrade.grade}</span>}
              </div>
              <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,overflow:"hidden",marginBottom:12}}>
                {tp.map((pk,i)=>{const p=prospectsMap[pk.playerId];if(!p)return null;const c=POS_COLORS[p.pos];const g=activeGrade(pk.playerId);const rank=getConsensusRank?getConsensusRank(p.name):pk.pick;const g2=getConsensusGrade?getConsensusGrade(p.name):activeGrade(pk.playerId);const v=pickVerdict(pk.pick,rank,g2);
                  return<div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderBottom:"1px solid #f5f5f5"}}>
                    <span style={{fontFamily:mono,fontSize:10,color:"#d4d4d4",width:44}}>Rd{pk.round} #{pk.pick}</span>
                    <span style={{fontFamily:mono,fontSize:10,color:c,width:28}}>{p.gpos||p.pos}</span>
                    <SchoolLogo school={p.school} size={16}/>
                    <span style={{fontFamily:sans,fontSize:12,fontWeight:600,color:"#171717",flex:1}}>{p.name}</span>
                    <span style={{fontFamily:mono,fontSize:7,padding:"1px 5px",background:v.bg,color:v.color,borderRadius:3}}>{v.text}</span>
                    <span style={{fontFamily:font,fontSize:12,fontWeight:900,color:g>=75?"#16a34a":g>=55?"#ca8a04":"#dc2626"}}>{g}</span>
                  </div>;
                })}
              </div>
              <div style={{display:"flex",gap:16,alignItems:"flex-start"}}>
                <div style={{flex:"0 0 320px",background:"#fff",borderRadius:12,padding:"16px"}}>
                  {renderFormation(team)}
                </div>
                <div style={{flex:1,background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"12px 16px"}}>
                  <div style={{fontFamily:mono,fontSize:8,letterSpacing:1.5,color:"#a3a3a3",textTransform:"uppercase",marginBottom:6}}>depth chart</div>
                  {renderDepthList(team,false)}
                </div>
              </div>
            </div>);
          })}
          {/* URL footer — always visible in screenshot */}
          <div style={{marginTop:32,paddingTop:20,borderTop:"2px solid #e5e5e5",textAlign:"center",background:"#fff",borderRadius:12,padding:"16px 24px"}}>
            <div style={{fontFamily:sans,fontSize:15,fontWeight:700,color:"#171717",marginBottom:2}}>bigboardlab.com</div>
            <div style={{fontFamily:mono,fontSize:11,color:"#a3a3a3",letterSpacing:0.5}}>build your own mock draft · 2026 NFL Draft</div>
          </div>
        </div>
        {/* Off-screen share card for html2canvas capture */}
        {ShareCard}
      </div>
    );
  }

  // === MAIN DRAFT SCREEN ===
  const picksPanel=(<div style={{maxHeight:isMobile?"none":"calc(100vh - 60px)",overflowY:"auto"}}>
    <div style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:6,padding:"0 4px"}}>picks</div>
    <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,overflow:"hidden"}}>
      {picks.map((pick,i)=>{const p=prospectsMap[pick.playerId];if(!p)return null;const c=POS_COLORS[p.pos];const isU=pick.isUser;
        const showRound=i===0||pick.round!==picks[i-1].round;
        return<div key={i}>{showRound&&<div style={{padding:"5px 10px",background:"#f5f5f5",fontFamily:mono,fontSize:8,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase"}}>round {pick.round}</div>}<div style={{display:"flex",alignItems:"center",gap:5,padding:"5px 10px",borderBottom:"1px solid #f8f8f8",background:isU?"rgba(34,197,94,0.02)":"transparent"}}>
          <span style={{fontFamily:mono,fontSize:9,color:"#d4d4d4",width:18,textAlign:"right"}}>{pick.pick}</span>
          <NFLTeamLogo team={pick.team} size={13}/>
          <span style={{fontFamily:mono,fontSize:8,color:c}}>{p.gpos||p.pos}</span>
          <span style={{fontFamily:sans,fontSize:10,fontWeight:isU?600:400,color:isU?"#171717":"#737373",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</span>
          {pick.traded&&<span style={{fontFamily:mono,fontSize:7,color:"#a855f7",background:"rgba(168,85,247,0.03)",padding:"1px 4px",borderRadius:2}}>TRD</span>}
        </div></div>;
      })}
      {picks.length<totalPicks&&<div style={{padding:"8px 10px",display:"flex",alignItems:"center",gap:5}}>
        <NFLTeamLogo team={currentTeam} size={13}/>
        <span style={{fontFamily:mono,fontSize:9,color:"#a3a3a3"}}>#{picks.length+1} {currentTeam}...</span>
      </div>}
    </div>
  </div>);

  const depthPanel=showDepth&&(<div style={{maxHeight:isMobile?"none":"calc(100vh - 60px)",overflowY:"auto"}}>
    {userTeams.size>1&&<div style={{display:"flex",gap:3,marginBottom:6}}>
      {[...userTeams].map((team,i)=>(
        <button key={team} onClick={()=>setDepthTeamIdx(i)} style={{flex:1,fontFamily:sans,fontSize:10,fontWeight:depthTeamIdx===i?700:400,padding:"4px 6px",background:depthTeamIdx===i?"#171717":"#f5f5f5",color:depthTeamIdx===i?"#faf9f6":"#737373",border:"1px solid #e5e5e5",borderRadius:6,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:3}}>
          <NFLTeamLogo team={team} size={12}/>{team}
        </button>
      ))}
    </div>}
    {(()=>{const teamsArr=[...userTeams];const team=teamsArr[Math.min(depthTeamIdx,teamsArr.length-1)]||teamsArr[0];if(!team)return null;
      return(
        <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"10px"}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
            <NFLTeamLogo team={team} size={16}/>
            <span style={{fontFamily:sans,fontSize:12,fontWeight:700,color:"#171717"}}>{team}</span>
            <span style={{fontFamily:mono,fontSize:8,color:"#a3a3a3",marginLeft:"auto"}}>{picks.filter(pk=>pk.team===team).length} drafted</span>
          </div>
          {renderFormation(team)}
          {renderDepthList(team)}
          {renderLiveNeeds(team)}
        </div>
      );
    })()}
  </div>);

  const centerPanel=null; // centerPanel is inlined below for desktop; mobile has its own layout

  // === MOBILE DRAFT SCREEN ===
  if(isMobile){
    const userPicks=picks.filter(pk=>pk.isUser);
    const needs=liveNeeds[currentTeam]||{};const needEntries=Object.entries(needs).filter(([,v])=>v>0);
    const base=TEAM_NEEDS_DETAILED?.[currentTeam]||{};const filled=Object.entries(base).filter(([k])=>!needs[k]||needs[k]===0);
    return(
      <div style={{minHeight:"100vh",background:"#faf9f6",fontFamily:font,display:"flex",flexDirection:"column"}}>
        {/* Sticky top: round/pick + actions */}
        <div style={{position:"sticky",top:0,zIndex:100,background:"#fff",borderBottom:"1px solid #e5e5e5"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <NFLTeamLogo team={currentTeam} size={20}/>
              <div>
                <div style={{fontFamily:font,fontSize:14,fontWeight:900,color:"#171717"}}>Rd {currentRound} · Pick #{Math.min(picks.length+1,totalPicks)}</div>
                {isUserPick&&<div style={{fontFamily:sans,fontSize:10,fontWeight:700,color:"#22c55e"}}>YOUR PICK</div>}
              </div>
            </div>
            <div style={{display:"flex",gap:4}}>
              {userPickCount>0&&<button onClick={undo} style={{fontFamily:sans,fontSize:10,padding:"4px 8px",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",background:"#fef3c7",color:"#92400e"}}>↩</button>}

              {isUserPick&&<button onClick={openTradeUp} style={{fontFamily:sans,fontSize:10,padding:"4px 8px",border:"1px solid #a855f7",borderRadius:99,cursor:"pointer",background:"rgba(168,85,247,0.03)",color:"#a855f7"}}>📞</button>}
              <button onClick={()=>setPaused(!paused)} style={{fontFamily:sans,fontSize:10,padding:"4px 8px",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",background:paused?"#fef3c7":"transparent",color:paused?"#92400e":"#a3a3a3"}}>{paused?"▶":"⏸"}</button>
              <button onClick={onClose} style={{fontFamily:sans,fontSize:10,color:"#a3a3a3",background:"none",border:"1px solid #e5e5e5",borderRadius:99,padding:"4px 8px",cursor:"pointer"}}>✕</button>
            </div>
          </div>
          {/* Position filter — horizontal scroll */}
          <div style={{display:"flex",gap:4,padding:"0 12px 8px",overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
            <button onClick={()=>setFilterPos(new Set())} style={{fontFamily:mono,fontSize:10,padding:"4px 10px",background:filterPos.size===0?"#171717":"transparent",color:filterPos.size===0?"#faf9f6":"#a3a3a3",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",flexShrink:0}}>all</button>
            {positions.map(pos=><button key={pos} onClick={()=>setFilterPos(prev=>{const n=new Set(prev);if(n.has(pos))n.delete(pos);else n.add(pos);return n;})} style={{fontFamily:mono,fontSize:10,padding:"4px 10px",background:filterPos.has(pos)?POS_COLORS[pos]:"transparent",color:filterPos.has(pos)?"#fff":POS_COLORS[pos],border:"1px solid "+(filterPos.has(pos)?POS_COLORS[pos]:"#e5e5e5"),borderRadius:99,cursor:"pointer",flexShrink:0}}>{pos}</button>)}
          </div>
        </div>

        {/* Verdict toast */}
        {lastVerdict&&<div style={{position:"fixed",top:70,left:"50%",transform:"translateX(-50%)",zIndex:200,padding:"6px 14px",background:lastVerdict.bg,border:"2px solid "+lastVerdict.color,borderRadius:99,display:"flex",alignItems:"center",gap:6,boxShadow:"0 4px 12px rgba(0,0,0,0.1)",maxWidth:"90vw",fontSize:11}}>
          <span style={{fontFamily:sans,fontWeight:700,color:lastVerdict.color}}>{lastVerdict.text}</span>
          <span style={{fontFamily:sans,color:"#525252"}}>{lastVerdict.player}</span>
        </div>}

        {/* Trade panels */}
        {tradeOffer&&<div style={{margin:"8px 12px",background:"rgba(168,85,247,0.03)",border:"2px solid #a855f7",borderRadius:12,padding:"10px 12px"}}>
          <p style={{fontFamily:sans,fontSize:12,fontWeight:700,color:"#171717",margin:"0 0 4px"}}>📞 Trade offer from {tradeOffer.fromTeam}</p>
          <p style={{fontFamily:sans,fontSize:10,color:"#525252",margin:"0 0 6px"}}>Want your #{tradeOffer.userPick}. Offering: Rd{tradeOffer.theirRound} #{tradeOffer.theirPick} + Rd{tradeOffer.futureRound} #{tradeOffer.futurePick}</p>
          <div style={{display:"flex",gap:8}}>
            <button onClick={acceptTrade} style={{fontFamily:sans,fontSize:11,fontWeight:700,padding:"5px 14px",background:"#a855f7",color:"#fff",border:"none",borderRadius:99,cursor:"pointer"}}>accept</button>
            <button onClick={declineTrade} style={{fontFamily:sans,fontSize:11,padding:"5px 14px",background:"transparent",color:"#737373",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer"}}>decline</button>
          </div>
        </div>}
        {showTradeUp&&<div style={{margin:"8px 12px",background:"rgba(168,85,247,0.03)",border:"2px solid #a855f7",borderRadius:12,padding:"10px 12px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <p style={{fontFamily:sans,fontSize:12,fontWeight:700,color:"#171717",margin:0}}>📞 Propose a trade</p>
            <button onClick={closeTradeUp} style={{fontFamily:sans,fontSize:10,color:"#a3a3a3",background:"none",border:"1px solid #e5e5e5",borderRadius:99,padding:"3px 8px",cursor:"pointer"}}>cancel</button>
          </div>
          <div style={{fontFamily:mono,fontSize:8,color:"#a3a3a3",marginBottom:4}}>TRADE WITH:</div>
          <div style={{display:"flex",gap:3,flexWrap:"wrap",marginBottom:6}}>
            {allCpuTeams.map(t=>(<button key={t} onClick={()=>{setTradePartner(t);setTradeTarget([]);setTradeUserPicks([]);}} style={{fontFamily:sans,fontSize:9,padding:"3px 6px",background:tradePartner===t?"#a855f7":"#fff",color:tradePartner===t?"#fff":"#737373",border:"1px solid "+(tradePartner===t?"#a855f7":"#e5e5e5"),borderRadius:5,cursor:"pointer"}}><NFLTeamLogo team={t} size={10}/></button>))}
          </div>
          {tradePartner&&tradeTarget.length>0&&tradeUserPicks.length>0&&(()=>{
            const tv=tradeTarget.reduce((s,p)=>s+(p.value||0),0);const ov=tradeUserPicks.reduce((s,p)=>s+(p.value||0),0);const enough=ov>=tv*1.05;
            return<div style={{marginTop:6}}>
              <div style={{fontFamily:mono,fontSize:8,color:enough?"#16a34a":"#dc2626"}}>{enough?"OFFER SUFFICIENT":"NEED MORE (~5% OVERPAY)"}</div>
              <button onClick={executeTradeUp} disabled={!enough} style={{marginTop:4,fontFamily:sans,fontSize:11,fontWeight:700,padding:"5px 14px",background:enough?"#a855f7":"#d4d4d4",color:"#fff",border:"none",borderRadius:99,cursor:enough?"pointer":"default"}}>execute trade</button>
            </div>;
          })()}
        </div>}

        {/* Available players — main scrollable area */}
        <div style={{flex:1,overflowY:"auto",padding:"0 8px"}}>
          <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,overflow:"hidden"}}>
            <div style={{padding:"6px 10px",background:"#f9f9f7",borderBottom:"1px solid #e5e5e5",display:"flex",justifyContent:"space-between"}}>
              <span style={{fontFamily:mono,fontSize:8,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase"}}>available ({filteredAvailable.length})</span>
            </div>
            {filteredAvailable.map(id=>{const p=prospectsMap[id];if(!p)return null;const g=activeGrade(id);const c=POS_COLORS[p.pos];const rank=getConsensusRank?getConsensusRank(p.name):null;
              return<div key={id} style={{display:"flex",alignItems:"center",gap:5,padding:"8px 10px",borderBottom:"1px solid #f8f8f8"}}>
                {rank&&rank<500?<span style={{fontFamily:mono,fontSize:8,color:"#d4d4d4",width:20,textAlign:"right"}}>#{rank}</span>:<span style={{fontFamily:mono,fontSize:8,color:"#e5e5e5",width:20,textAlign:"right"}}>—</span>}
                <span style={{fontFamily:mono,fontSize:9,color:c,width:32}}>{p.gpos||p.pos}</span>
                <SchoolLogo school={p.school} size={18}/>
                <span style={{fontFamily:sans,fontSize:12,fontWeight:600,color:"#171717",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} onClick={()=>setProfilePlayer(p)}>{p.name}</span>
                <span style={{fontFamily:font,fontSize:13,fontWeight:900,color:g>=75?"#16a34a":g>=55?"#ca8a04":"#dc2626",width:24,textAlign:"right"}}>{g}</span>
                {isUserPick&&<button onClick={()=>makePick(id)} style={{fontFamily:sans,fontSize:10,fontWeight:700,padding:"4px 10px",background:"#22c55e",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",flexShrink:0}}>draft</button>}
              </div>;
            })}
          </div>
        </div>

        {/* Sticky bottom: needs + your picks */}
        <div style={{position:"sticky",bottom:0,zIndex:100,background:"#fff",borderTop:"1px solid #e5e5e5",padding:"8px 12px"}}>
          {/* Needs row */}
          <div style={{marginBottom:userPicks.length>0?6:0}}>
            <div style={{fontFamily:mono,fontSize:7,letterSpacing:1.5,color:"#a3a3a3",textTransform:"uppercase",marginBottom:3}}>needs</div>
            <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
              {needEntries.map(([pos,count])=>(<span key={pos} style={{fontFamily:mono,fontSize:8,padding:"2px 6px",background:(POS_COLORS[pos]||"#737373")+"12",color:POS_COLORS[pos]||"#737373",borderRadius:4,border:"1px solid "+(POS_COLORS[pos]||"#737373")+"25"}}>{pos}{count>1?" ×"+count:""}</span>))}
              {filled.map(([pos])=>(<span key={pos} style={{fontFamily:mono,fontSize:8,padding:"2px 6px",background:"#dcfce7",color:"#16a34a",borderRadius:4,textDecoration:"line-through",opacity:0.5}}>{pos} ✓</span>))}
            </div>
          </div>
          {/* Your picks row */}
          {userPicks.length>0&&<div>
            <div style={{fontFamily:mono,fontSize:7,letterSpacing:1.5,color:"#a3a3a3",textTransform:"uppercase",marginBottom:3}}>your picks</div>
            <div style={{display:"flex",gap:4,overflowX:"auto",WebkitOverflowScrolling:"touch",paddingBottom:2}}>
              {userPicks.map((pk,i)=>{const p=prospectsMap[pk.playerId];if(!p)return null;const c=POS_COLORS[p.pos];
                return<div key={i} style={{display:"flex",alignItems:"center",gap:4,padding:"3px 8px",background:`${c}08`,border:`1px solid ${c}20`,borderRadius:6,flexShrink:0}}>
                  <span style={{fontFamily:mono,fontSize:8,color:c}}>{p.gpos||p.pos}</span>
                  <span style={{fontFamily:sans,fontSize:10,fontWeight:600,color:"#171717",whiteSpace:"nowrap"}}>{p.name.split(" ").pop()}</span>
                  <span style={{fontFamily:mono,fontSize:7,color:"#a3a3a3"}}>#{pk.pick}</span>
                </div>;
              })}
            </div>
          </div>}
        </div>

        {/* Profile overlay */}
        {profilePlayer&&<PlayerProfile player={profilePlayer} traits={traits} setTraits={setTraits} notes={notes} setNotes={setNotes} allProspects={allProspects} getGrade={getGrade} onClose={()=>setProfilePlayer(null)} onSelectPlayer={setProfilePlayer} consensus={CONSENSUS} ratings={ratings}/>}
        {/* Compare overlay */}
        {showCompare&&compareList.length>=2&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setShowCompare(false)}>
          <div style={{background:"#faf9f6",borderRadius:16,padding:16,width:"95%",maxHeight:"80vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"grid",gridTemplateColumns:"1fr",gap:12}}>
              {compareList.map(p=>{const c=POS_COLORS[p.pos];const g=activeGrade(p.id);
                return<div key={p.id} style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:12,display:"flex",alignItems:"center",gap:10}}>
                  <SchoolLogo school={p.school} size={32}/>
                  <div style={{flex:1}}><div style={{fontFamily:font,fontSize:14,fontWeight:900,color:"#171717"}}>{p.name}</div><div style={{fontFamily:mono,fontSize:9,color:c}}>{p.gpos||p.pos} · {p.school}</div></div>
                  <div style={{fontFamily:font,fontSize:20,fontWeight:900,color:g>=75?"#16a34a":g>=55?"#ca8a04":"#dc2626"}}>{g}</div>
                  {isUserPick&&<button onClick={()=>{makePick(p.id);setShowCompare(false);setCompareList([]);}} style={{fontFamily:sans,fontSize:10,fontWeight:700,padding:"4px 10px",background:"#22c55e",color:"#fff",border:"none",borderRadius:6,cursor:"pointer"}}>draft</button>}
                </div>;
              })}
            </div>
            <button onClick={()=>setShowCompare(false)} style={{width:"100%",marginTop:8,fontFamily:sans,fontSize:12,padding:"8px",background:"transparent",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",color:"#a3a3a3"}}>close</button>
          </div>
        </div>}
      </div>
    );
  }

  // === DESKTOP DRAFT SCREEN ===
  return(
    <div style={{minHeight:"100vh",background:"#faf9f6",fontFamily:font}}>
      {/* Top bar */}
      <div style={{position:"fixed",top:0,left:0,right:0,zIndex:100,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 16px",background:"#fff",borderBottom:"1px solid #f0f0f0"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontFamily:mono,fontSize:10,color:"#a3a3a3"}}>round {currentRound} · pick {Math.min(picks.length+1,totalPicks)}/{totalPicks}</span>
          {isUserPick&&<span style={{fontFamily:sans,fontSize:10,fontWeight:700,color:"#22c55e"}}>YOUR PICK</span>}
          {tradeValueDelta!==0&&<span style={{fontFamily:mono,fontSize:9,padding:"2px 8px",borderRadius:99,background:tradeValueDelta>0?"rgba(34,197,94,0.1)":"rgba(239,68,68,0.1)",color:tradeValueDelta>0?"#16a34a":"#dc2626",border:"1px solid "+(tradeValueDelta>0?"rgba(34,197,94,0.3)":"rgba(239,68,68,0.3)")}}>trades: {tradeValueDelta>0?"+":""}{tradeValueDelta} pts</span>}
        </div>
        <div style={{display:"flex",gap:6}}>
          {userPickCount>0&&<button onClick={undo} style={{fontFamily:sans,fontSize:10,padding:"3px 10px",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",background:"#fef3c7",color:"#92400e"}}>↩ undo</button>}

          {isUserPick&&<button onClick={openTradeUp} style={{fontFamily:sans,fontSize:10,padding:"3px 10px",border:"1px solid #a855f7",borderRadius:99,cursor:"pointer",background:"rgba(168,85,247,0.03)",color:"#a855f7"}}>📞 trade</button>}
          <button onClick={()=>setShowDepth(!showDepth)} style={{fontFamily:sans,fontSize:10,padding:"3px 10px",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",background:showDepth?"#171717":"transparent",color:showDepth?"#faf9f6":"#a3a3a3"}}>formation</button>
          <button onClick={()=>setPaused(!paused)} style={{fontFamily:sans,fontSize:10,padding:"3px 10px",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",background:paused?"#fef3c7":"transparent",color:paused?"#92400e":"#a3a3a3"}}>{paused?"▶ resume":"⏸ pause"}</button>
          <button onClick={onClose} style={{fontFamily:sans,fontSize:10,color:"#a3a3a3",background:"none",border:"1px solid #e5e5e5",borderRadius:99,padding:"3px 10px",cursor:"pointer"}}>✕ exit</button>
        </div>
      </div>

      {/* Verdict toast */}
      {lastVerdict&&<div style={{position:"fixed",top:44,left:"50%",transform:"translateX(-50%)",zIndex:200,padding:"8px 20px",background:lastVerdict.bg,border:"2px solid "+lastVerdict.color,borderRadius:99,display:"flex",alignItems:"center",gap:8,boxShadow:"0 4px 12px rgba(0,0,0,0.1)"}}>
        <span style={{fontFamily:sans,fontSize:13,fontWeight:700,color:lastVerdict.color}}>{lastVerdict.text}</span>
        <span style={{fontFamily:sans,fontSize:11,color:"#525252"}}>{lastVerdict.player} — consensus #{lastVerdict.rank} at pick #{lastVerdict.pick}</span>
      </div>}

      <div style={{display:"flex",gap:12,maxWidth:1400,margin:"0 auto",padding:"44px 12px 20px"}}>
        {/* LEFT: Pick history */}
        <div style={{width:280,flexShrink:0,maxHeight:"calc(100vh - 60px)",overflowY:"auto"}}>{picksPanel}</div>

        {/* CENTER */}
        <div style={{flex:1,minWidth:0}}>
    {/* CPU trade offer */}
    {tradeOffer&&<div style={{background:"rgba(168,85,247,0.03)",border:"2px solid #a855f7",borderRadius:12,padding:"12px 16px",marginBottom:10}}>
      <p style={{fontFamily:sans,fontSize:13,fontWeight:700,color:"#171717",margin:"0 0 4px"}}>📞 Trade offer from {tradeOffer.fromTeam}</p>
      <p style={{fontFamily:sans,fontSize:11,color:"#525252",margin:"0 0 6px"}}>They want your pick #{tradeOffer.userPick}. Offering: Rd{tradeOffer.theirRound} #{tradeOffer.theirPick} + Rd{tradeOffer.futureRound} #{tradeOffer.futurePick}</p>
      <div style={{marginBottom:6}}>
        <div style={{display:"flex",justifyContent:"space-between",fontFamily:mono,fontSize:8,color:"#a3a3a3",marginBottom:2}}>
          <span>your pick: {tradeOffer.userVal} pts</span><span>their offer: {tradeOffer.offerVal} pts</span>
        </div>
        <div style={{height:6,background:"#e5e5e5",borderRadius:3,overflow:"hidden"}}>
          <div style={{height:"100%",width:Math.min(100,tradeOffer.offerVal/tradeOffer.userVal*100)+"%",background:tradeOffer.offerVal>=tradeOffer.userVal?"#22c55e":tradeOffer.offerVal>=tradeOffer.userVal*0.9?"#eab308":"#ef4444",borderRadius:3}}/>
        </div>
        <div style={{fontFamily:mono,fontSize:8,color:tradeOffer.offerVal>=tradeOffer.userVal?"#16a34a":"#ca8a04",marginTop:1}}>{tradeOffer.offerVal>=tradeOffer.userVal?"FAIR OR BETTER":"SLIGHT UNDERPAY"}</div>
      </div>
      <div style={{display:"flex",gap:8}}>
        <button onClick={acceptTrade} style={{fontFamily:sans,fontSize:11,fontWeight:700,padding:"5px 14px",background:"#a855f7",color:"#fff",border:"none",borderRadius:99,cursor:"pointer"}}>accept</button>
        <button onClick={declineTrade} style={{fontFamily:sans,fontSize:11,padding:"5px 14px",background:"transparent",color:"#737373",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer"}}>decline</button>
      </div>
    </div>}

    {/* User trade panel */}
    {showTradeUp&&<div style={{background:"rgba(168,85,247,0.03)",border:"2px solid #a855f7",borderRadius:12,padding:"14px 16px",marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <p style={{fontFamily:sans,fontSize:13,fontWeight:700,color:"#171717",margin:0}}>📞 Propose a trade</p>
        <button onClick={closeTradeUp} style={{fontFamily:sans,fontSize:10,color:"#a3a3a3",background:"none",border:"1px solid #e5e5e5",borderRadius:99,padding:"3px 10px",cursor:"pointer"}}>cancel</button>
      </div>
            {/* Step 1: Pick a team */}
            <div style={{marginBottom:8}}>
              <div style={{fontFamily:mono,fontSize:8,color:"#a3a3a3",letterSpacing:1,marginBottom:4}}>TRADE WITH:</div>
              <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
                {allCpuTeams.map(t=>(
                  <button key={t} onClick={()=>{setTradePartner(t);setTradeTarget([]);setTradeUserPicks([]);}} style={{fontFamily:sans,fontSize:9,padding:"3px 8px",background:tradePartner===t?"#a855f7":"#fff",color:tradePartner===t?"#fff":"#737373",border:"1px solid "+(tradePartner===t?"#a855f7":"#e5e5e5"),borderRadius:5,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:3}}>
                    <NFLTeamLogo team={t} size={11}/>{t}
                  </button>
                ))}
              </div>
            </div>
            {/* Step 2: Select what you want from them (multi-select) */}
            {tradePartner&&<div style={{marginBottom:8}}>
              <div style={{fontFamily:mono,fontSize:8,color:"#a3a3a3",letterSpacing:1,marginBottom:4}}>YOU GET:</div>
              {[{year:2026,label:"2026 (this draft)",picks:partnerAssets.thisDraft},{year:2027,label:"2027",picks:partnerAssets.futurePicks.filter(p=>p.year===2027)},{year:2028,label:"2028",picks:partnerAssets.futurePicks.filter(p=>p.year===2028)}].map(yr=>(
                yr.picks.length>0&&<div key={yr.year} style={{marginBottom:4}}>
                  <div style={{fontFamily:mono,fontSize:7,color:"#d4d4d4",marginBottom:2}}>{yr.label}</div>
                  <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
                    {yr.picks.map((p,i)=>{const uid=p.type+"-"+p.label;const sel=tradeTarget.some(x=>(x.type+"-"+x.label)===uid);
                      return<button key={uid+i} onClick={()=>{setTradeTarget(prev=>{const already=prev.some(x=>(x.type+"-"+x.label)===uid);return already?prev.filter(x=>(x.type+"-"+x.label)!==uid):[...prev,p];});}} style={{fontFamily:sans,fontSize:9,padding:"3px 8px",background:sel?"#a855f7":"#fff",color:sel?"#fff":"#525252",border:"1px solid "+(sel?"#a855f7":"#e5e5e5"),borderRadius:5,cursor:"pointer"}}>{p.type==="current"?p.label:`Rd${p.round}`} <span style={{fontSize:7,color:sel?"#e9d5ff":"#a3a3a3"}}>({p.value}pts)</span></button>;
                    })}
                  </div>
                </div>
              ))}
            </div>}
            {/* Step 3: Select what you give up (multi-select) */}
            {tradeTarget.length>0&&<div style={{marginBottom:8}}>
              <div style={{fontFamily:mono,fontSize:8,color:"#a3a3a3",letterSpacing:1,marginBottom:4}}>YOU GIVE:</div>
              {[{year:2026,label:"2026 (this draft)",picks:userAllPicks.thisDraft},{year:2027,label:"2027",picks:userAllPicks.futurePicks.filter(p=>p.year===2027)},{year:2028,label:"2028",picks:userAllPicks.futurePicks.filter(p=>p.year===2028)}].map(yr=>(
                yr.picks.length>0&&<div key={yr.year} style={{marginBottom:4}}>
                  <div style={{fontFamily:mono,fontSize:7,color:"#d4d4d4",marginBottom:2}}>{yr.label}</div>
                  <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
                    {yr.picks.map((p,i)=>{const uid=p.type+"-"+p.label;const sel=tradeUserPicks.some(x=>(x.type+"-"+x.label)===uid);
                      return<button key={uid+i} onClick={()=>{setTradeUserPicks(prev=>{const already=prev.some(x=>(x.type+"-"+x.label)===uid);return already?prev.filter(x=>(x.type+"-"+x.label)!==uid):[...prev,p];});}} style={{fontFamily:sans,fontSize:9,padding:"3px 8px",background:sel?"#171717":"#fff",color:sel?"#faf9f6":"#525252",border:"1px solid #e5e5e5",borderRadius:5,cursor:"pointer"}}>{p.type==="current"?p.label:`Rd${p.round}`} <span style={{fontSize:7,color:sel?"#a3a3a3":"#d4d4d4"}}>({p.value}pts)</span></button>;
                    })}
                  </div>
                </div>
              ))}
            </div>}
            {/* Value bar + execute */}
            {tradeTarget.length>0&&tradeUserPicks.length>0&&(()=>{
              const tv=tradeTarget.reduce((s,p)=>s+(p.value||0),0);const ov=tradeUserPicks.reduce((s,p)=>s+(p.value||0),0);const enough=ov>=tv*1.05;
              return(<div style={{marginTop:6}}>
                <div style={{display:"flex",justifyContent:"space-between",fontFamily:mono,fontSize:8,color:"#a3a3a3",marginBottom:2}}>
                  <span>you get: {tv} pts</span><span>you give: {ov} pts</span>
                </div>
                <div style={{height:6,background:"#e5e5e5",borderRadius:3,overflow:"hidden"}}>
                  <div style={{height:"100%",width:Math.min(100,ov/(tv*1.05)*100)+"%",background:enough?"#22c55e":"#ef4444",borderRadius:3}}/>
                </div>
                <div style={{fontFamily:mono,fontSize:8,color:enough?"#16a34a":"#dc2626",marginTop:1}}>{enough?"OFFER SUFFICIENT — CPU will accept":"NEED MORE (~5% OVERPAY REQUIRED)"}</div>
                <button onClick={executeTradeUp} disabled={!enough} style={{marginTop:6,fontFamily:sans,fontSize:11,fontWeight:700,padding:"6px 16px",background:enough?"#a855f7":"#d4d4d4",color:"#fff",border:"none",borderRadius:99,cursor:enough?"pointer":"default"}}>execute trade</button>
              </div>);
            })()}
          </div>}

          {/* On the clock */}
          {isUserPick&&!showTradeUp&&picks.length<totalPicks&&<div style={{background:"rgba(34,197,94,0.03)",border:"2px solid #22c55e",borderRadius:12,padding:"10px 14px",marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <NFLTeamLogo team={currentTeam} size={22}/>
              <div>
                <p style={{fontFamily:sans,fontSize:13,fontWeight:700,color:"#171717",margin:0}}>You're on the clock — Rd {currentRound} Pick #{picks.length+1}</p>
                <div style={{display:"flex",gap:3,marginTop:3}}>
                  {Object.entries(liveNeeds[currentTeam]||{}).filter(([,v])=>v>0).map(([pos,count])=>(
                    <span key={pos} style={{fontFamily:mono,fontSize:8,padding:"1px 5px",background:(POS_COLORS[pos]||"#737373")+"15",color:POS_COLORS[pos]||"#737373",borderRadius:3,border:"1px solid "+(POS_COLORS[pos]||"#737373")+"30"}}>{pos}{count>1?" ×"+count:""}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>}

          {/* Position filter */}
          <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:6}}>
            <button onClick={()=>setFilterPos(new Set())} style={{fontFamily:mono,fontSize:10,padding:"4px 10px",background:filterPos.size===0?"#171717":"transparent",color:filterPos.size===0?"#faf9f6":"#a3a3a3",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer"}}>all</button>
            {positions.map(pos=><button key={pos} onClick={()=>setFilterPos(prev=>{const n=new Set(prev);if(n.has(pos))n.delete(pos);else n.add(pos);return n;})} style={{fontFamily:mono,fontSize:10,padding:"4px 10px",background:filterPos.has(pos)?POS_COLORS[pos]:"transparent",color:filterPos.has(pos)?"#fff":POS_COLORS[pos],border:"1px solid "+(filterPos.has(pos)?POS_COLORS[pos]:"#e5e5e5"),borderRadius:99,cursor:"pointer"}}>{pos}</button>)}
          </div>

          {/* Compare bar */}
          {compareList.length>0&&<div style={{background:"#fff",border:"1px solid #3b82f6",borderRadius:8,padding:"6px 10px",marginBottom:6,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
            <span style={{fontFamily:mono,fontSize:8,color:"#3b82f6"}}>COMPARE:</span>
            {compareList.map(p=><span key={p.id} style={{fontFamily:sans,fontSize:10,fontWeight:600,color:"#171717",background:"rgba(59,130,246,0.06)",padding:"2px 6px",borderRadius:4,cursor:"pointer"}} onClick={()=>toggleCompare(p)}>{p.name} ✕</span>)}
            {compareList.length>=2&&<button onClick={()=>setShowCompare(true)} style={{fontFamily:sans,fontSize:10,fontWeight:700,padding:"3px 10px",background:"#3b82f6",color:"#fff",border:"none",borderRadius:99,cursor:"pointer"}}>compare {compareList.length}</button>}
          </div>}

          {/* Available players */}
          <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,overflow:"hidden",maxHeight:"calc(100vh - 220px)",overflowY:"auto"}}>
            <div style={{padding:"6px 12px",background:"#f9f9f7",borderBottom:"1px solid #e5e5e5",display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,flexWrap:"wrap"}}>
              <span style={{fontFamily:mono,fontSize:8,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase"}}>available ({filteredAvailable.length})</span>
              <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
                {Object.entries(recentPosCounts).filter(([,v])=>v>=2).sort((a,b)=>b[1]-a[1]).map(([pos,cnt])=>(
                  <span key={pos} title={`${cnt} ${pos}s drafted in last 8 picks`} style={{fontFamily:mono,fontSize:7,padding:"1px 5px",background:(POS_COLORS[pos]||"#737373")+"20",color:POS_COLORS[pos]||"#737373",border:"1px solid "+(POS_COLORS[pos]||"#737373")+"40",borderRadius:3,cursor:"default"}}>{pos} 🔥{cnt}</span>
                ))}
              </div>
              <span style={{fontFamily:mono,fontSize:8,color:"#a3a3a3"}}>click name = profile</span>
            </div>
            {filteredAvailable.map(id=>{const p=prospectsMap[id];if(!p)return null;const g=activeGrade(id);const c=POS_COLORS[p.pos];const inC=compareList.some(x=>x.id===p.id);const rank=getConsensusRank?getConsensusRank(p.name):null;
              return<div key={id} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderBottom:"1px solid #f8f8f8"}}>
                {rank&&rank<500?<span style={{fontFamily:mono,fontSize:8,color:"#d4d4d4",width:22,textAlign:"right"}}>#{rank}</span>:<span style={{fontFamily:mono,fontSize:8,color:"#e5e5e5",width:22,textAlign:"right"}}>—</span>}
                <span style={{fontFamily:mono,fontSize:9,color:c,width:24}}>{p.gpos||p.pos}</span>
                <SchoolLogo school={p.school} size={16}/>
                <span style={{fontFamily:sans,fontSize:11,fontWeight:600,color:"#171717",flex:1,cursor:"pointer"}} onClick={()=>setProfilePlayer(p)} onMouseEnter={e=>e.currentTarget.style.textDecoration="underline"} onMouseLeave={e=>e.currentTarget.style.textDecoration="none"}>{p.name}</span>
                <span style={{fontFamily:font,fontSize:12,fontWeight:900,color:g>=75?"#16a34a":g>=55?"#ca8a04":"#dc2626",width:24,textAlign:"right"}}>{g}</span>
                <button onClick={()=>toggleCompare(p)} style={{fontFamily:mono,fontSize:7,padding:"2px 5px",background:inC?"#3b82f6":"transparent",color:inC?"#fff":"#a3a3a3",border:"1px solid #e5e5e5",borderRadius:4,cursor:"pointer"}}>{inC?"✓":"+"}</button>
                {isUserPick&&<button onClick={()=>makePick(id)} style={{fontFamily:sans,fontSize:10,fontWeight:700,padding:"3px 10px",background:"#22c55e",color:"#fff",border:"none",borderRadius:6,cursor:"pointer"}}>draft</button>}
              </div>;
            })}
          </div>
        </div>

        {/* RIGHT: Depth chart — desktop only */}
        {!isMobile&&showDepth&&<div style={{width:280,flexShrink:0}}>{depthPanel}</div>}
      </div>

      {/* Compare overlay */}
      {showCompare&&compareList.length>=2&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setShowCompare(false)}>
        <div style={{background:"#faf9f6",borderRadius:16,padding:isMobile?16:24,maxWidth:900,width:"95%",maxHeight:"80vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <h2 style={{fontFamily:font,fontSize:22,fontWeight:900,color:"#171717",margin:0}}>player comparison</h2>
            <button onClick={()=>setShowCompare(false)} style={{fontFamily:sans,fontSize:12,color:"#a3a3a3",background:"none",border:"1px solid #e5e5e5",borderRadius:99,padding:"4px 12px",cursor:"pointer"}}>close</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat("+compareList.length+", 1fr)",gap:16}}>
            {compareList.map(p=>{const c=POS_COLORS[p.gpos||p.pos]||POS_COLORS[p.pos];const pt=POSITION_TRAITS[p.gpos||p.pos]||POSITION_TRAITS[p.pos]||[];const g=activeGrade(p.id);const rank=getConsensusRank?getConsensusRank(p.name):null;
              // Precompute per-trait max/min for color coding
              const traitMaxMin={};
              pt.forEach(t=>{
                const vals=compareList.map(cp=>traits[cp.id]?.[t]||50);
                traitMaxMin[t]={max:Math.max(...vals),min:Math.min(...vals)};
              });
              return<div key={p.id} style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:16,textAlign:"center"}}>
                <SchoolLogo school={p.school} size={40}/>
                <div style={{fontFamily:font,fontSize:16,fontWeight:900,color:"#171717",marginTop:8}}>{p.name}</div>
                <div style={{fontFamily:mono,fontSize:10,color:"#a3a3a3"}}>{p.school}</div>
                <span style={{fontFamily:mono,fontSize:10,color:c,background:c+"11",padding:"2px 8px",borderRadius:4,border:"1px solid "+c+"22",display:"inline-block",margin:"6px 0"}}>{p.gpos||p.pos}</span>
                {rank&&rank<400&&<div style={{fontFamily:mono,fontSize:9,color:"#a3a3a3"}}>consensus #{rank}</div>}
                <div style={{fontFamily:font,fontSize:32,fontWeight:900,color:g>=75?"#16a34a":g>=55?"#ca8a04":"#dc2626",lineHeight:1,margin:"8px 0"}}>{g}</div>
                <RadarChart traits={pt} values={pt.map(t=>traits[p.id]?.[t]||50)} color={c} size={140}/>
                <div style={{textAlign:"left",marginTop:8,background:"#fafaf9",borderRadius:8,padding:"8px 10px"}}>
                  {pt.map(t=>{
                    const val=traits[p.id]?.[t]||50;
                    const{max,min}=traitMaxMin[t]||{max:val,min:val};
                    const isBest=compareList.length>1&&val===max&&max!==min;
                    const isWorst=compareList.length>1&&val===min&&max!==min;
                    return<div key={t} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"3px 0",borderBottom:"1px solid #f0f0ee"}}>
                      <span style={{fontFamily:mono,fontSize:9,color:"#a3a3a3"}}>{t}</span>
                      <div style={{display:"flex",alignItems:"center",gap:4}}>
                        <div style={{width:40,height:4,background:"#e5e5e5",borderRadius:2,overflow:"hidden"}}>
                          <div style={{height:"100%",width:(val)+'%',background:isBest?"#22c55e":isWorst?"#ef4444":c+"88",borderRadius:2,transition:"width 0.3s"}}/>
                        </div>
                        <span style={{fontFamily:font,fontSize:12,fontWeight:900,color:isBest?"#16a34a":isWorst?"#dc2626":c,minWidth:20,textAlign:"right"}}>{val}</span>
                        {isBest&&<span style={{fontSize:9}}>▲</span>}
                        {isWorst&&<span style={{fontSize:9,color:"#dc2626"}}>▼</span>}
                      </div>
                    </div>;
                  })}
                </div>
                {isUserPick&&<button onClick={()=>{makePick(p.id);setShowCompare(false);setCompareList([]);}} style={{width:"100%",marginTop:10,fontFamily:sans,fontSize:11,fontWeight:700,padding:"6px",background:"#22c55e",color:"#fff",border:"none",borderRadius:6,cursor:"pointer"}}>draft {p.name.split(" ").pop()}</button>}
              </div>;
            })}
          </div>
        </div>
      </div>}

      {/* Profile overlay */}
      {profilePlayer&&<PlayerProfile player={profilePlayer} traits={traits} setTraits={setTraits} notes={notes} setNotes={setNotes} allProspects={allProspects} getGrade={getGrade} onClose={()=>setProfilePlayer(null)} onSelectPlayer={setProfilePlayer} consensus={CONSENSUS} ratings={ratings}/>}
    </div>
  );
}
