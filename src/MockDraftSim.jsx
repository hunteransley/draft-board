import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import NFL_ROSTERS from "./nflRosters.js";

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
  const[speed,setSpeed]=useState(600);
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

    let best=null,bestScore=-1;
    const roundVar=round<=2?3:round<=4?6:10;
    const variance=(Math.random()-0.5)*(roundVar+prof.variance);

    // Track positions already drafted this draft
    const teamDrafted=picks.filter(pk=>pk.team===team).map(pk=>{const p=prospectsMap[pk.playerId];return p?p.pos:null;}).filter(Boolean);
    const posCounts={};teamDrafted.forEach(pos=>{posCounts[pos]=(posCounts[pos]||0)+1;});

    avail.forEach(id=>{
      const p=prospectsMap[id];if(!p)return;
      const pos=p.pos;
      const baseGrade=getConsensusGrade?getConsensusGrade(p.name):(gradeMap[id]||50);
      const grade=GRADE_OVERRIDES[p.name]?Math.max(baseGrade,GRADE_OVERRIDES[p.name]):baseGrade;
      const rawRank=getConsensusRank?getConsensusRank(p.name):999;
      const consRank=RANK_OVERRIDES[p.name]||rawRank;
      const nc=dn[pos]||0;const ni=needs.indexOf(pos);
      const nm=nc>=3?18:nc>=2?12:nc===1?8:ni>=0&&ni<3?5:ni>=0?2:(round>=3?-6:0);
      const pm=POS_DRAFT_VALUE[pos]||1.0;
      const base=Math.pow(Math.max(grade+variance,10),1.3);

      // Team positional preference: +12% for boosted, -25% penalty in Rd1-3
      const isBoosted=prof.posBoost.includes(pos);
      const isPenalized=prof.posPenalty.includes(pos);
      const teamPosBoost=isBoosted?1.12:isPenalized&&round<=3?0.75:1.0;

      // Anti-slide with team-specific reach tolerance
      const slide=consRank<900?(pickNum-consRank):0;
      // Elite grades get a much stronger slide boost — a 90-grade player falling 8 picks
      // should trigger near-panic across the league, not just a mild nudge
      const gradeSlideMultiplier=grade>=88?6:grade>=80?4.5:3;
      const slideBoost=slide>6?Math.pow(slide-6,1.5)*gradeSlideMultiplier:0;
      const reachThreshold=Math.round(12+prof.reachTolerance*15);
      const reachPenalty=slide<-reachThreshold&&round<=3?Math.abs(slide+reachThreshold)*1.5:0;

      // Diminishing returns on same position
      const alreadyAtPos=posCounts[pos]||0;
      const dimReturn=alreadyAtPos>=3?0.4:alreadyAtPos>=2?0.65:alreadyAtPos>=1?0.85:1.0;

      // Position run penalty: if 3+ of same pos taken in last 8 picks, devalue it
      // Simulates "supply satisfied" across the league — teams pivot away from flooded positions
      const recentRun=recentPosCounts[pos]||0;
      const runPenalty=recentRun>=4?0.72:recentRun>=3?0.84:recentRun>=2?0.93:1.0;

      // Need urgency: if team's #1 need player is available and sliding, boost heavily
      const isTopNeed=nc>=2||(ni===0);
      const isSliding=slide>4&&grade>=70;
      const urgencyBoost=isTopNeed&&isSliding?1.18:1.0;

      // K/P filter, RB penalty, QB modifier
      if(pos==="K/P"&&round<=4)return;
      // RB round 1 penalty: still real (RBs are devalued), but elite grades (85+) exempt
      // Love at 90+ grade should not be penalized — his talent transcends the positional bias
      const rbPen=(pos==="RB"&&round===1&&grade<85)?0.72:1.0;
      const qbMod=pos==="QB"?(nc>=2?1.3:nc>=1?1.1:ni>=0?0.9:0.5):1.0;

      // Stage modifier: contenders value need more, rebuilders lean BPA
      let stageMod=1.0;
      if(prof.stage==="dynasty"||prof.stage==="contend"){if(nc>=2)stageMod=1.1;if(prof.stage==="dynasty"&&isBoosted&&nc>=1)stageMod=1.12;}

      const bpaComponent=base*finalBpaW*pm*rbPen*qbMod*teamPosBoost;
      const needComponent=nm*finalNeedW*12;
      const score=(bpaComponent+needComponent+slideBoost-reachPenalty)*dimReturn*stageMod*runPenalty*urgencyBoost;
      if(score>bestScore){bestScore=score;best=id;}
    });
    return best||avail[0];
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

  const draftGrade=useMemo(()=>{
    if(picks.length<totalPicks)return null;
    const up=picks.filter(pk=>pk.isUser);if(up.length===0)return null;
    // Value score: average value ratio across picks (1.0 = picked exactly at consensus)
    let totalRatio=0;
    up.forEach(pk=>{
      const p=prospectsMap[pk.playerId];if(!p)return;
      const rank=getConsensusRank?getConsensusRank(p.name):pk.pick;
      const playerVal=getPickValue(rank<900?rank:pk.pick);
      const slotVal=getPickValue(pk.pick);
      totalRatio+=playerVal/slotVal;
    });
    const avgRatio=totalRatio/up.length; // 1.0 = fair, >1 = value, <1 = reach
    // Needs score: what % of team needs were addressed
    let needsBonus=0;
    [...userTeams].forEach(team=>{
      const base=TEAM_NEEDS_DETAILED?.[team]||{};
      const totalNeeds=Object.values(base).reduce((s,v)=>s+v,0);
      if(totalNeeds===0)return;
      const remaining=liveNeeds[team]||{};
      const remainingTotal=Object.values(remaining).reduce((s,v)=>s+v,0);
      const filled=(totalNeeds-remainingTotal)/totalNeeds; // 0-1
      needsBonus+=filled*0.15; // up to +0.15 per team
    });
    const teamCount=userTeams.size||1;
    needsBonus=needsBonus/teamCount;
    // Combined score: value ratio + needs bonus
    // avgRatio of 1.0 + full needs = 1.15 → B+/A-
    const score=avgRatio+needsBonus;
    // Grade thresholds: all fair picks (1.0) + decent needs = B+ (above average)
    if(score>=1.6)return{grade:"A+",color:"#16a34a"};
    if(score>=1.4)return{grade:"A",color:"#16a34a"};
    if(score>=1.2)return{grade:"B+",color:"#22c55e"};
    if(score>=1.05)return{grade:"B",color:"#22c55e"};
    if(score>=0.95)return{grade:"B-",color:"#ca8a04"};
    if(score>=0.85)return{grade:"C+",color:"#ca8a04"};
    if(score>=0.75)return{grade:"C",color:"#ca8a04"};
    if(score>=0.65)return{grade:"D",color:"#dc2626"};
    return{grade:"F",color:"#dc2626"};
  },[picks,prospectsMap,getConsensusRank,totalPicks,userTeams,liveNeeds,TEAM_NEEDS_DETAILED]);

  const shareDraft=useCallback(()=>{
    const up=picks.filter(pk=>pk.isUser);
    if(up.length===0)return;
    const teams=[...new Set(up.map(pk=>pk.team))];
    const team=teams[0];
    const firstPick=up[0];
    const firstPlayer=prospectsMap[firstPick?.playerId];
    const W=1200,H=628,LC=400;
    const canvas=document.createElement('canvas');
    canvas.width=W;canvas.height=H;
    const ctx=canvas.getContext('2d');

    try{
      // ── BACKGROUND ──
      ctx.fillStyle='#faf9f6';ctx.fillRect(0,0,W,H);
      ctx.strokeStyle='#e5e5e5';ctx.lineWidth=1;ctx.strokeRect(0.5,0.5,W-1,H-1);

      // ── LEFT COLUMN (white) ──
      ctx.fillStyle='#ffffff';ctx.fillRect(0,0,LC,H);
      ctx.strokeStyle='#e5e5e5';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(LC,0);ctx.lineTo(LC,H);ctx.stroke();

      // Logo — loaded from embedded base64, no CORS issue
      // Draw in a dark circle so the black PNG background reads as intentional branding
      const logoImg=new Image();
      logoImg.src=BBL_LOGO_B64;
      // Image loads synchronously from data URL in most browsers, but we handle both cases
      const drawLogoAndContinue=()=>{
        const logoSize=52;const logoPad=4;
        // Dark circle badge behind logo
        ctx.fillStyle='#1a1a2e';
        ctx.beginPath();ctx.arc(28+logoSize/2,22+logoSize/2,logoSize/2+logoPad,0,Math.PI*2);ctx.fill();
        ctx.drawImage(logoImg,28,22,logoSize,logoSize);
        // "big board lab" text next to logo
        ctx.fillStyle='#171717';ctx.font='bold 18px Georgia,serif';
        ctx.fillText('big board lab',90,48);
        ctx.fillStyle='#7c3aed';ctx.fillRect(90,53,112,2);
        // Team name below
        ctx.fillStyle='#171717';ctx.font='bold 20px system-ui,sans-serif';ctx.fillText(team,28,102);
        ctx.fillStyle='#a3a3a3';ctx.font='10px monospace';ctx.fillText('2026 NFL DRAFT',28,118);
      };
      if(logoImg.complete){drawLogoAndContinue();}
      else{
        // Fallback: text only if somehow not loaded
        ctx.fillStyle='#171717';ctx.font='bold 22px Georgia,serif';ctx.fillText('big board lab',28,46);
        ctx.fillStyle='#7c3aed';ctx.fillRect(28,52,136,2);
        ctx.fillStyle='#171717';ctx.font='bold 20px system-ui,sans-serif';ctx.fillText(team,28,90);
        ctx.fillStyle='#a3a3a3';ctx.font='10px monospace';ctx.fillText('2026 NFL DRAFT',28,108);
      }

      // ── FIRST PICK HERO ──
      if(firstPlayer){
        const c=POS_COLORS[firstPlayer.gpos||firstPlayer.pos]||POS_COLORS[firstPlayer.pos]||'#7c3aed';
        const firstGrade=activeGrade(firstPick.playerId);

        ctx.fillStyle='#f0f0f0';ctx.fillRect(28,134,LC-56,1);
        ctx.fillStyle='#a3a3a3';ctx.font='10px monospace';ctx.fillText('FIRST PICK',28,152);

        // Pick badge
        ctx.fillStyle='#f5f5f5';
        roundRect(ctx,28,160,64,22,4);ctx.fill();
        ctx.fillStyle='#737373';ctx.font='bold 10px monospace';ctx.textAlign='center';
        ctx.fillText('Rd'+firstPick.round+' · #'+firstPick.pick,60,175);ctx.textAlign='left';

        // Position pill
        ctx.fillStyle=c+'22';
        roundRect(ctx,100,160,52,22,4);ctx.fill();
        ctx.fillStyle=c;ctx.font='bold 10px monospace';ctx.textAlign='center';
        ctx.fillText(firstPlayer.gpos||firstPlayer.pos,126,175);ctx.textAlign='left';

        // Name + school
        ctx.fillStyle='#171717';ctx.font='bold 25px system-ui,sans-serif';
        let pname=firstPlayer.name;
        while(ctx.measureText(pname).width>LC-80&&pname.length>4)pname=pname.slice(0,-1);
        if(pname!==firstPlayer.name)pname+='…';
        ctx.fillText(pname,28,210);
        ctx.fillStyle='#737373';ctx.font='13px monospace';ctx.fillText(firstPlayer.school,28,228);

        // Grade badge
        const gc=firstGrade>=75?'#16a34a':firstGrade>=55?'#ca8a04':'#dc2626';
        ctx.fillStyle=gc+'18';
        roundRect(ctx,LC-72,158,52,44,8);ctx.fill();
        ctx.strokeStyle=gc+'44';ctx.lineWidth=1;roundRect(ctx,LC-72,158,52,44,8);ctx.stroke();
        ctx.fillStyle=gc;ctx.font='bold 28px Georgia,serif';ctx.textAlign='center';
        ctx.fillText(''+firstGrade,LC-46,187);ctx.textAlign='left';
        ctx.fillStyle='#a3a3a3';ctx.font='8px monospace';ctx.textAlign='center';
        ctx.fillText('GRADE',LC-46,198);ctx.textAlign='left';

        // Spider chart — inline, no nested function needed
        const pos=firstPlayer.gpos||firstPlayer.pos;
        const posTraits=POSITION_TRAITS[pos]||POSITION_TRAITS[firstPlayer.pos]||[];
        if(posTraits.length>=3){
          const rcx=LC/2,rcy=400,rs=130;const rr=rs-20;
          const rangles=posTraits.map((_,i)=>(Math.PI*2*i)/posTraits.length-Math.PI/2);
          const rvals=posTraits.map(t=>traits[firstPlayer.id]?.[t]||50);
          [0.25,0.5,0.75,1].forEach(lv=>{
            ctx.beginPath();
            rangles.forEach((a,i)=>{const px=rcx+rr*lv*Math.cos(a);const py=rcy+rr*lv*Math.sin(a);i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);});
            ctx.closePath();ctx.strokeStyle='#e5e5e5';ctx.lineWidth=0.75;ctx.stroke();
          });
          rangles.forEach(a=>{ctx.beginPath();ctx.moveTo(rcx,rcy);ctx.lineTo(rcx+rr*Math.cos(a),rcy+rr*Math.sin(a));ctx.strokeStyle='#e5e5e5';ctx.lineWidth=0.75;ctx.stroke();});
          ctx.beginPath();
          rangles.forEach((a,i)=>{const v=(rvals[i]||50)/100;const px=rcx+rr*v*Math.cos(a);const py=rcy+rr*v*Math.sin(a);i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);});
          ctx.closePath();ctx.fillStyle=c+'28';ctx.fill();ctx.strokeStyle=c;ctx.lineWidth=2;ctx.stroke();
          rangles.forEach((a,i)=>{const v=(rvals[i]||50)/100;ctx.beginPath();ctx.arc(rcx+rr*v*Math.cos(a),rcy+rr*v*Math.sin(a),3,0,Math.PI*2);ctx.fillStyle=c;ctx.fill();});
          ctx.fillStyle='#737373';ctx.font='9px monospace';ctx.textAlign='center';
          posTraits.forEach((t,i)=>{const lr=rr+14;ctx.fillText(t.split(' ').map(w=>w[0]).join(''),rcx+lr*Math.cos(rangles[i]),rcy+lr*Math.sin(rangles[i])+3);});
          ctx.textAlign='left';
        }
      }

      // ── RIGHT COLUMN — picks list ──
      const RX=LC+32,RW=W-LC-64;

      ctx.fillStyle='#a3a3a3';ctx.font='10px monospace';
      ctx.fillText('MY DRAFT · '+team.toUpperCase(),RX,36);

      // Overall grade badge
      if(draftGrade){
        const gc=draftGrade.color;
        ctx.fillStyle=gc+'18';roundRect(ctx,W-76,14,54,34,6);ctx.fill();
        ctx.strokeStyle=gc+'44';ctx.lineWidth=1;roundRect(ctx,W-76,14,54,34,6);ctx.stroke();
        ctx.fillStyle=gc;ctx.font='bold 20px Georgia,serif';ctx.textAlign='center';
        ctx.fillText(draftGrade.grade,W-49,36);ctx.textAlign='left';
        ctx.fillStyle='#a3a3a3';ctx.font='8px monospace';ctx.textAlign='center';
        ctx.fillText('GRADE',W-49,46);ctx.textAlign='left';
      }

      ctx.fillStyle='#e5e5e5';ctx.fillRect(RX,46,RW,1);

      const rowH=Math.min(46,Math.floor((H-88)/Math.max(up.length,1)));
      const maxRows=Math.floor((H-88)/Math.max(rowH,1));
      up.slice(0,maxRows).forEach((pk,i)=>{
        const p=prospectsMap[pk.playerId];if(!p)return;
        const g=activeGrade(pk.playerId);
        const pc=POS_COLORS[p.gpos||p.pos]||POS_COLORS[p.pos]||'#737373';
        const y=56+i*rowH;
        const isFirst=i===0;
        if(isFirst){ctx.fillStyle=pc+'0a';ctx.fillRect(RX-8,y,RW+16,rowH-1);}
        else if(i%2===0){ctx.fillStyle='#fafaf9';ctx.fillRect(RX-8,y,RW+16,rowH-1);}
        const mid=y+rowH*0.58;
        ctx.fillStyle='#d4d4d4';ctx.font='10px monospace';ctx.fillText('Rd'+pk.round,RX,mid);
        ctx.fillStyle='#a3a3a3';ctx.fillText('#'+pk.pick,RX+28,mid);
        ctx.fillStyle=pc+'22';roundRect(ctx,RX+62,y+rowH*0.22,36,rowH*0.52,3);ctx.fill();
        ctx.fillStyle=pc;ctx.font='bold 9px monospace';ctx.textAlign='center';
        ctx.fillText(p.gpos||p.pos,RX+80,y+rowH*0.56);ctx.textAlign='left';
        let nm=p.name;
        ctx.font=(isFirst?'bold 14px':'13px')+' system-ui,sans-serif';
        while(ctx.measureText(nm).width>RW-138&&nm.length>4)nm=nm.slice(0,-1);
        if(nm!==p.name)nm+='…';
        ctx.fillStyle=isFirst?'#171717':'#525252';ctx.fillText(nm,RX+108,mid);
        const gc=g>=75?'#16a34a':g>=55?'#ca8a04':'#dc2626';
        ctx.fillStyle=gc;ctx.font='bold '+(isFirst?'16':'14')+'px Georgia,serif';
        ctx.textAlign='right';ctx.fillText(''+g,RX+RW,mid);ctx.textAlign='left';
        if(i<up.length-1){ctx.fillStyle='#f0f0f0';ctx.fillRect(RX,y+rowH-1,RW,1);}
      });

      // ── FOOTER ──
      ctx.fillStyle='#f0f0ee';ctx.fillRect(0,H-38,W,38);
      ctx.fillStyle='#e5e5e5';ctx.fillRect(0,H-38,W,1);
      ctx.fillStyle='#171717';ctx.font='bold 13px Georgia,serif';ctx.fillText('big board lab',20,H-14);
      ctx.fillStyle='#a3a3a3';ctx.font='11px monospace';ctx.textAlign='center';
      ctx.fillText('bigboardlab.com · 2026 NFL Draft',W/2,H-14);ctx.textAlign='left';
      ctx.fillStyle='#737373';ctx.font='11px monospace';ctx.textAlign='right';
      ctx.fillText('build yours → bigboardlab.com',W-20,H-14);ctx.textAlign='left';

      // ── EXPORT ──
      canvas.toBlob(blob=>{
        if(!blob){alert('Share failed — try again');return;}
        if(navigator.share&&navigator.canShare&&navigator.canShare({files:[new File([blob],'draft.png',{type:'image/png'})]})){
          navigator.share({files:[new File([blob],'bigboardlab-mock-draft.png',{type:'image/png'})],title:'My Mock Draft — Big Board Lab',text:'My '+team+' mock draft'+(draftGrade?' (Grade: '+draftGrade.grade+')':'')+'! Build yours at bigboardlab.com'}).catch(()=>{});
        }else{
          const url=URL.createObjectURL(blob);
          const a=document.createElement('a');a.href=url;a.download='bigboardlab-mock-draft.png';
          document.body.appendChild(a);a.click();document.body.removeChild(a);
          setTimeout(()=>URL.revokeObjectURL(url),3000);
        }
      },'image/png');

    }catch(e){
      console.error('BBL share error:',e);
      alert('Could not generate share image: '+e.message);
    }
  },[picks,prospectsMap,activeGrade,POS_COLORS,POSITION_TRAITS,traits,draftGrade]);

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
        <div style={{maxWidth:900,margin:"0 auto",padding:"52px 24px 40px",textAlign:"center"}}>
          <h1 style={{fontSize:36,fontWeight:900,color:"#171717",margin:"0 0 8px"}}>draft complete!</h1>
          {draftGrade&&<div style={{display:"inline-block",padding:"12px 32px",background:"#fff",border:"2px solid "+draftGrade.color,borderRadius:16,marginBottom:24}}>
            <div style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase"}}>draft grade</div>
            <div style={{fontFamily:font,fontSize:56,fontWeight:900,color:draftGrade.color,lineHeight:1}}>{draftGrade.grade}</div>
            {tradeValueDelta!==0&&<div style={{fontFamily:mono,fontSize:10,color:tradeValueDelta>0?"#16a34a":"#dc2626",marginTop:4}}>trade surplus: {tradeValueDelta>0?"+":""}{tradeValueDelta} pts</div>}
          </div>}
          <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:24}}>
            <button onClick={shareDraft} style={{fontFamily:sans,fontSize:12,fontWeight:600,padding:"8px 20px",background:"#171717",color:"#faf9f6",border:"none",borderRadius:99,cursor:"pointer"}}>🔮 share results</button>
            <button onClick={()=>{setSetupDone(false);setPicks([]);setShowResults(false);setTradeMap({});}} style={{fontFamily:sans,fontSize:12,padding:"8px 20px",background:"transparent",color:"#525252",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer"}}>draft again</button>
          </div>
          {[...userTeams].map(team=>{
            const tp=userPicks.filter(pk=>pk.team===team);if(tp.length===0)return null;
            return(<div key={team} style={{marginBottom:32,textAlign:"left"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,justifyContent:"center"}}><NFLTeamLogo team={team} size={20}/><span style={{fontFamily:sans,fontSize:14,fontWeight:700,color:"#171717"}}>{team}</span></div>
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
        </div>
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
