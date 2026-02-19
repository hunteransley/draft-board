import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import NFL_ROSTERS from "./nflRosters.js";
import html2canvas from "html2canvas";

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
const GRADE_OVERRIDES={"Jeremiyah Love":91,"Sonny Styles":87};

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
  const ratio=playerVal/slotVal; // >1 = value (player worth more than slot), <1 = reach

  // Grade modifier: elite players (85+) compress the reach penalty significantly.
  // Taking a 90-grade player 3 spots early is NOT a reach — their talent justifies it.
  // Raw ratio penalizes any pick above consensus slot, but grade context matters.
  const g=grade||50;
  // How many picks "early" vs consensus
  const picksEarly=consRank-pickNum; // positive = picked before consensus slot
  // For high-grade players, forgive up to (grade-70)/2 picks of earliness
  // e.g. grade 90 → forgive up to 10 picks early; grade 80 → 5 picks; grade 70 → 0
  const gradeForgivePicks=Math.max(0,(g-70)/2);
  const adjustedEarly=Math.max(0,picksEarly-gradeForgivePicks);
  // Recompute ratio using adjusted consensus rank
  const adjustedConsRank=consRank-Math.round(adjustedEarly);
  const adjPlayerVal=getPickValue(Math.max(1,adjustedConsRank));
  const adjRatio=adjPlayerVal/slotVal;

  if(adjRatio>=1.5)return{text:"HUGE STEAL",color:"#16a34a",bg:"#dcfce7"};
  if(adjRatio>=1.15)return{text:"GREAT VALUE",color:"#22c55e",bg:"#f0fdf4"};
  if(adjRatio>=0.85)return{text:"FAIR PICK",color:"#ca8a04",bg:"#fefce8"};
  if(adjRatio>=0.55)return{text:"REACH",color:"#ea580c",bg:"#fff7ed"};
  return{text:"BIG REACH",color:"#dc2626",bg:"#fef2f2"};
}

export default function MockDraftSim({board,myBoard,getGrade,teamNeeds,draftOrder,onClose,allProspects,PROSPECTS,CONSENSUS,ratings,traits,setTraits,notes,setNotes,POS_COLORS,POSITION_TRAITS,SchoolLogo,NFLTeamLogo,RadarChart,PlayerProfile,font,mono,sans,schoolLogo,getConsensusRank,getConsensusGrade,TEAM_NEEDS_DETAILED,rankedGroups}){
  const ALL_TEAMS=useMemo(()=>[...new Set(DRAFT_ORDER_2026.map(d=>d.team))],[]);
  const[boardMode,setBoardMode]=useState("consensus");
  const activeBoard=boardMode==="my"&&myBoard?myBoard:board;
  const activeGrade=useCallback((id)=>{if(boardMode==="my")return getGrade(id);const p=PROSPECTS.find(x=>x.id===id);return p?getConsensusGrade(p.name):50;},[boardMode,getGrade,PROSPECTS,getConsensusGrade]);
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
  },[activeBoard]);

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
      // Elite-grade players (88+) bypass positional discount — their talent transcends position value
      const rawPm=POS_DRAFT_VALUE[pos]||1.0;
      const pm=grade>=88?Math.max(rawPm,1.0):rawPm;
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

    // Sort by score descending
    scored.sort((a,b)=>b.score-a.score);

    // ── WEIGHTED RANDOM SELECTION ──
    // Use softmax over a tier of close competitors. Tier is score-difference based, not
    // percentage-based, so elite outliers (Love, Styles) don't get swamped by the pool.
    const topScore=scored[0].score;
    const topGrade=scored[0].grade||50;

    // Tier window: how close must a player be to compete?
    // Round 1 is tight. Elite top player (grade 88+) narrows it further — they're the consensus pick.
    const baseTierPct=round<=1?0.07:round<=2?0.11:round<=3?0.16:round<=5?0.22:0.30;
    // If top scorer is elite grade, compress tier so they win more often
    const tierPct=topGrade>=88?baseTierPct*0.55:baseTierPct;
    const tierCandidates=scored.filter(s=>s.score>=topScore*(1-tierPct));

    const maxCandidates=Math.max(1,Math.min(tierCandidates.length,Math.round(1+prof.variance/2)));
    const pool=tierCandidates.slice(0,maxCandidates);

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
    if(np.length>=totalPicks)setShowResults(true);
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
      // Slot drafted players based on round
      const teamPicks=picks.filter(pk=>pk.team===team);
      teamPicks.forEach(pk=>{
        const p=prospectsMap[pk.playerId];if(!p)return;
        const group=DEPTH_GROUPS.find(g=>g.posMatch===p.pos);if(!group)return;
        const grade=getConsensusGrade?getConsensusGrade(p.name):(gradeMap[pk.playerId]||50);
        const entry={name:p.name,isDraft:true};
        if(pk.round===1||(pk.round===2&&grade>=80)){
          // Starter: push existing starter down, take slot 1
          const s1=group.slots[0];
          if(chart[team][s1]){
            // Find an empty slot to push the displaced player into
            const emptySlot=group.slots.find(s=>!chart[team][s]);
            if(emptySlot)chart[team][emptySlot]=chart[team][s1];
          }
          chart[team][s1]=entry;
        }else if(pk.round<=3){
          // Second slot
          const target=group.slots[1]||group.slots[0];
          if(!chart[team][target]){
            chart[team][target]=entry;
          }else{
            // Find any empty slot in the group
            const emptySlot=group.slots.find(s=>!chart[team][s]);
            if(emptySlot)chart[team][emptySlot]=entry;
            else{
              // Overflow
              const oi=Object.keys(chart[team]).filter(k=>k.startsWith(group.slots[group.slots.length-1]+"_d")).length;
              chart[team][group.slots[group.slots.length-1]+"_d"+oi]=entry;
            }
          }
        }else{
          // Rd 4-7: last slot in the group
          const target=group.slots[group.slots.length-1];
          if(!chart[team][target]){
            chart[team][target]=entry;
          }else{
            const emptySlot=group.slots.find(s=>!chart[team][s]);
            if(emptySlot)chart[team][emptySlot]=entry;
            else{
              const oi=Object.keys(chart[team]).filter(k=>k.startsWith(group.slots[group.slots.length-1]+"_d")).length;
              chart[team][group.slots[group.slots.length-1]+"_d"+oi]=entry;
            }
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

    const node=shareRef.current;
    if(!node){alert('Share card not ready');return;}

    // Briefly make the share card visible for capture
    node.style.position='fixed';
    node.style.left='0';
    node.style.top='0';
    node.style.zIndex='-1';
    node.style.opacity='1';
    node.style.pointerEvents='none';

    // Wait for paint
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));

    try{
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
      alert('Share failed: '+e.message);
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

    // Single-team mode: picks list + grade + logo
    const team=[...userTeams][0];
    const tp=userPicks.filter(pk=>pk.team===team);
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
  },[picks,userTeams,prospectsMap,activeGrade,getConsensusRank,getConsensusGrade,draftGrade,POS_COLORS,font,mono,sans]);

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
  const FormationChart=({team})=>{
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
  };

  const DepthList=({team,dark=true})=>{
    const chart=depthChart[team]||{};
    const slotColor=dark?"#a3a3a3":"#a3a3a3";
    const nameColor=dark?"#525252":"#525252";
    const draftColor=dark?"#7c3aed":"#7c3aed";
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
  };

  const LiveNeeds=({team})=>{
    const needs=liveNeeds[team]||{};const entries=Object.entries(needs).filter(([,v])=>v>0);
    const base=TEAM_NEEDS_DETAILED?.[team]||{};const filled=Object.entries(base).filter(([k])=>!needs[k]||needs[k]===0);
    return(<div style={{marginTop:4}}>
      <div style={{fontFamily:mono,fontSize:7,letterSpacing:1.5,color:"rgba(255,255,255,0.3)",textTransform:"uppercase",marginBottom:2}}>needs</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:2}}>
        {entries.map(([pos,count])=>(<span key={pos} style={{fontFamily:mono,fontSize:7,padding:"1px 4px",background:"rgba(239,68,68,0.2)",color:"#fca5a5",border:"1px solid rgba(239,68,68,0.25)",borderRadius:3}}>{pos}{count>1?" ×"+count:""}</span>))}
        {filled.map(([pos])=>(<span key={pos} style={{fontFamily:mono,fontSize:7,padding:"1px 4px",background:"rgba(34,197,94,0.15)",color:"#86efac",borderRadius:3,textDecoration:"line-through",opacity:0.5}}>{pos} ✓</span>))}
      </div>
    </div>);
  };

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
                  <FormationChart team={team}/>
                </div>
                <div style={{flex:1,background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"12px 16px"}}>
                  <div style={{fontFamily:mono,fontSize:8,letterSpacing:1.5,color:"#a3a3a3",textTransform:"uppercase",marginBottom:6}}>depth chart</div>
                  <DepthList team={team} dark={false}/>
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
          <FormationChart team={team}/>
          <DepthList team={team}/>
          <LiveNeeds team={team}/>
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
          {tradePartner&&tradeEval&&<div style={{display:"flex",gap:6,marginTop:6}}>
            <button onClick={executeTrade} disabled={!tradeEval||!tradeEval.valid} style={{fontFamily:sans,fontSize:11,fontWeight:700,padding:"5px 14px",background:tradeEval?.valid?"#a855f7":"#d4d4d4",color:"#fff",border:"none",borderRadius:99,cursor:tradeEval?.valid?"pointer":"default"}}>execute</button>
          </div>}
        </div>}

        {/* Available players — main scrollable area */}
        <div style={{flex:1,overflowY:"auto",padding:"0 8px"}}>
          <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,overflow:"hidden"}}>
            <div style={{padding:"6px 10px",background:"#f9f9f7",borderBottom:"1px solid #e5e5e5",display:"flex",justifyContent:"space-between"}}>
              <span style={{fontFamily:mono,fontSize:8,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase"}}>available ({filteredAvailable.length})</span>
            </div>
            {filteredAvailable.slice(0,60).map(id=>{const p=prospectsMap[id];if(!p)return null;const g=activeGrade(id);const c=POS_COLORS[p.pos];const rank=getConsensusRank?getConsensusRank(p.name):null;
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
            {filteredAvailable.slice(0,60).map(id=>{const p=prospectsMap[id];if(!p)return null;const g=activeGrade(id);const c=POS_COLORS[p.pos];const inC=compareList.some(x=>x.id===p.id);const rank=getConsensusRank?getConsensusRank(p.name):null;
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
