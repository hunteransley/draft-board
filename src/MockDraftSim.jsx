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
const RANK_OVERRIDES={"Sonny Styles":12,"Kenyon Sadiq":20};

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

function pickVerdict(pickNum,consRank){
  if(consRank>=900)return{text:"UNKNOWN",color:"#737373",bg:"#f5f5f5"};
  // Use draft value chart ratio — not raw pick difference
  // Getting pick-3 player at pick-10 is massive; getting pick-110 player at pick-117 is nothing
  const playerVal=getPickValue(consRank);
  const slotVal=getPickValue(pickNum);
  const ratio=playerVal/slotVal; // >1 = value (player worth more than slot), <1 = reach
  if(ratio>=1.5)return{text:"HUGE STEAL",color:"#16a34a",bg:"#dcfce7"};
  if(ratio>=1.15)return{text:"GREAT VALUE",color:"#22c55e",bg:"#f0fdf4"};
  if(ratio>=0.85)return{text:"FAIR PICK",color:"#ca8a04",bg:"#fefce8"};
  if(ratio>=0.55)return{text:"REACH",color:"#ea580c",bg:"#fff7ed"};
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
      const grade=getConsensusGrade?getConsensusGrade(p.name):(gradeMap[id]||50);
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
      const slideBoost=slide>6?Math.pow(slide-6,1.5)*3:0;
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
      const rbPen=(pos==="RB"&&round===1&&grade<88)?0.7:1.0;
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
      if(p){const rank=getConsensusRank(p.name);const v=pickVerdict(pick,rank);setLastVerdict({...v,player:p.name,pick,rank});setTimeout(()=>setLastVerdict(null),3500);}
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
    const remainingPicks=up.slice(1);
    const W=1200,H=628;
    const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
    const ctx=canvas.getContext('2d');

    const drawCard=()=>{
      // === BACKGROUND — matches site cream ===
      ctx.fillStyle='#faf9f6';ctx.fillRect(0,0,W,H);

      // Outer border
      ctx.strokeStyle='#e5e5e5';ctx.lineWidth=1;ctx.strokeRect(0.5,0.5,W-1,H-1);

      // Left column background (white card)
      const LC=400; // left col width
      ctx.fillStyle='#ffffff';ctx.fillRect(0,0,LC,H);
      ctx.strokeStyle='#e5e5e5';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(LC,0);ctx.lineTo(LC,H);ctx.stroke();

      // === LEFT COLUMN ===
      // Logo — load and draw, or fallback to text
      const logoImg=new Image();
      logoImg.onload=()=>{
        // Logo: top-left, tasteful size
        const LH=36;const LW=LH*(logoImg.width/logoImg.height);
        ctx.drawImage(logoImg,28,22,LW,LH);
        // Redraw everything that depends on logo position
        finishCard();
      };
      logoImg.onerror=()=>{
        // Fallback: text logo
        ctx.fillStyle='#171717';ctx.font='bold 18px Georgia,serif';ctx.fillText('big board lab',28,46);
        finishCard();
      };
      logoImg.src='/logo.png';
    };

    const finishCard=()=>{
      const LC=400;
      const c=firstPlayer?POS_COLORS[firstPlayer.gpos||firstPlayer.pos]||POS_COLORS[firstPlayer.pos]||'#7c3aed':'#7c3aed';
      const firstGrade=firstPlayer?activeGrade(firstPick.playerId):null;

      // === TEAM NAME (prominent, below logo) ===
      const drawTeamLabel=()=>{
        ctx.fillStyle='#171717';ctx.font='bold 20px system-ui,sans-serif';ctx.fillText(team,28,90);
        ctx.fillStyle='#a3a3a3';ctx.font='10px monospace';ctx.fillText('2026 NFL DRAFT',28,108);
        drawFirstPickHero();
      };
      drawTeamLabel();

      const drawFirstPickHero=()=>{
        if(!firstPlayer){drawPicksList();return;}

        // Divider
        ctx.fillStyle='#f0f0f0';ctx.fillRect(28,122,LC-56,1);

        // First pick label
        ctx.fillStyle='#a3a3a3';ctx.font='10px monospace';
        ctx.letterSpacing='2px';ctx.fillText('FIRST PICK',28,142);ctx.letterSpacing='0px';

        // Pick number badge
        ctx.fillStyle='#f5f5f5';
        roundRect(ctx,28,150,56,22,4);ctx.fill();
        ctx.fillStyle='#737373';ctx.font='bold 11px monospace';ctx.textAlign='center';
        ctx.fillText('Rd'+firstPick.round+' #'+firstPick.pick,56,165);ctx.textAlign='left';

        // Position pill
        ctx.fillStyle=c+'18';
        roundRect(ctx,92,150,52,22,4);ctx.fill();
        ctx.fillStyle=c;ctx.font='bold 11px monospace';ctx.textAlign='center';
        ctx.fillText(firstPlayer.gpos||firstPlayer.pos,118,165);ctx.textAlign='left';

        // Player name — big
        ctx.fillStyle='#171717';ctx.font='bold 26px system-ui,sans-serif';
        ctx.fillText(firstPlayer.name,28,200);

        // School
        ctx.fillStyle='#737373';ctx.font='13px monospace';
        ctx.fillText(firstPlayer.school,28,218);

        // Grade badge — right side of left col
        if(firstGrade!==null){
          const gc=firstGrade>=75?'#16a34a':firstGrade>=55?'#ca8a04':'#dc2626';
          ctx.fillStyle=gc+'15';
          roundRect(ctx,LC-76,148,56,40,8);ctx.fill();
          ctx.strokeStyle=gc+'40';ctx.lineWidth=1;
          roundRect(ctx,LC-76,148,56,40,8);ctx.stroke();
          ctx.fillStyle=gc;ctx.font='bold 30px Georgia,serif';ctx.textAlign='center';
          ctx.fillText(''+firstGrade,LC-48,177);ctx.textAlign='left';
          ctx.fillStyle='#a3a3a3';ctx.font='8px monospace';ctx.textAlign='center';
          ctx.fillText('GRADE',LC-48,188);ctx.textAlign='left';
        }

        // === SPIDER CHART ===
        drawRadarChart(ctx,firstPlayer,230,LC/2,300,c);

        drawPicksList();
      };

      const drawPicksList=()=>{
        // === RIGHT COLUMN — picks list ===
        const RX=LC+32;const RW=W-LC-64;

        // Header
        ctx.fillStyle='#a3a3a3';ctx.font='10px monospace';
        ctx.fillText('MY DRAFT · '+team.toUpperCase(),RX,36);

        // Draft grade top right
        if(draftGrade){
          const gc=draftGrade.color;
          ctx.fillStyle=gc+'15';
          roundRect(ctx,W-80,16,56,32,6);ctx.fill();
          ctx.strokeStyle=gc+'50';ctx.lineWidth=1;
          roundRect(ctx,W-80,16,56,32,6);ctx.stroke();
          ctx.fillStyle=gc;ctx.font='bold 20px Georgia,serif';ctx.textAlign='center';
          ctx.fillText(draftGrade.grade,W-52,37);ctx.textAlign='left';
          ctx.fillStyle='#a3a3a3';ctx.font='8px monospace';ctx.textAlign='center';
          ctx.fillText('GRADE',W-52,47);ctx.textAlign='left';
        }

        // Thin divider under header
        ctx.fillStyle='#e5e5e5';ctx.fillRect(RX,46,RW,1);

        // All user picks (first pick first, then rest)
        const allPicks=up;
        const rowH=Math.min(46,Math.floor((H-80)/Math.max(allPicks.length,1)));
        const maxRows=Math.floor((H-80)/rowH);

        allPicks.slice(0,maxRows).forEach((pk,i)=>{
          const p=prospectsMap[pk.playerId];if(!p)return;
          const g=activeGrade(pk.playerId);
          const pc=POS_COLORS[p.gpos||p.pos]||POS_COLORS[p.pos]||'#737373';
          const y=56+i*rowH;
          const isFirst=i===0;

          // Row bg — first pick subtly highlighted
          if(isFirst){ctx.fillStyle=pc+'08';ctx.fillRect(RX-8,y,RW+16,rowH-2);}
          else if(i%2===0){ctx.fillStyle='#fafaf9';ctx.fillRect(RX-8,y,RW+16,rowH-2);}

          // Round + pick number
          ctx.fillStyle='#d4d4d4';ctx.font='10px monospace';
          ctx.fillText('Rd'+pk.round,RX,y+rowH*0.45);
          ctx.fillStyle='#a3a3a3';
          ctx.fillText('#'+pk.pick,RX+30,y+rowH*0.45);

          // Position pill
          ctx.fillStyle=pc+'18';
          roundRect(ctx,RX+66,y+rowH*0.2,38,rowH*0.55,3);ctx.fill();
          ctx.fillStyle=pc;ctx.font='bold 9px monospace';ctx.textAlign='center';
          ctx.fillText(p.gpos||p.pos,RX+85,y+rowH*0.56);ctx.textAlign='left';

          // Name
          ctx.fillStyle=isFirst?'#171717':'#525252';
          ctx.font=(isFirst?'bold ':'')+''+(isFirst?14:13)+'px system-ui,sans-serif';
          // Truncate long names
          let name=p.name;
          ctx.font=(isFirst?'bold 14px':'13px')+' system-ui,sans-serif';
          while(ctx.measureText(name).width>RW-140&&name.length>8)name=name.slice(0,-2);
          if(name!==p.name)name+='…';
          ctx.fillText(name,RX+114,y+rowH*0.56);

          // Grade
          const gc=g>=75?'#16a34a':g>=55?'#ca8a04':'#dc2626';
          ctx.fillStyle=gc;ctx.font='bold '+(isFirst?16:14)+'px Georgia,serif';ctx.textAlign='right';
          ctx.fillText(''+g,RX+RW,y+rowH*0.58);ctx.textAlign='left';

          // Bottom border
          if(i<allPicks.length-1){ctx.fillStyle='#f5f5f5';ctx.fillRect(RX,y+rowH-1,RW,1);}
        });

        // === FOOTER — URL branding ===
        ctx.fillStyle='#f0f0ee';ctx.fillRect(0,H-40,W,40);
        ctx.fillStyle='#e5e5e5';ctx.fillRect(0,H-40,W,1);
        // Logo text left
        ctx.fillStyle='#171717';ctx.font='bold 13px Georgia,serif';ctx.fillText('big board lab',20,H-15);
        // URL center
        ctx.fillStyle='#a3a3a3';ctx.font='11px monospace';ctx.textAlign='center';
        ctx.fillText('bigboardlab.com · 2026 NFL Draft',W/2,H-15);ctx.textAlign='left';
        // CTA right
        ctx.fillStyle='#737373';ctx.font='11px monospace';ctx.textAlign='right';
        ctx.fillText('build yours at bigboardlab.com',W-20,H-15);ctx.textAlign='left';

        // Done — export
        canvas.toBlob(blob=>{
          if(navigator.share&&navigator.canShare?.({files:[new File([blob],'mock-draft.png',{type:'image/png'})]})){
            navigator.share({files:[new File([blob],'bigboardlab-mock-draft.png',{type:'image/png'})],title:'My Mock Draft — Big Board Lab',text:'Check out my '+team+' mock draft'+(draftGrade?' — Grade: '+draftGrade.grade:'')+'! Build yours at bigboardlab.com'});
          }else{
            const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='bigboardlab-mock-draft.png';a.click();URL.revokeObjectURL(url);
          }
        });
      };
    };

    drawCard();
  },[picks,prospectsMap,activeGrade,POS_COLORS,POSITION_TRAITS,traits,draftGrade,font,mono,sans]);

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
            <button onClick={shareDraft} style={{fontFamily:sans,fontSize:12,fontWeight:600,padding:"8px 20px",background:"#171717",color:"#faf9f6",border:"none",borderRadius:99,cursor:"pointer"}}>📤 share results</button>
            <button onClick={()=>{setSetupDone(false);setPicks([]);setShowResults(false);setTradeMap({});}} style={{fontFamily:sans,fontSize:12,padding:"8px 20px",background:"transparent",color:"#525252",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer"}}>draft again</button>
          </div>
          {[...userTeams].map(team=>{
            const tp=userPicks.filter(pk=>pk.team===team);if(tp.length===0)return null;
            return(<div key={team} style={{marginBottom:32,textAlign:"left"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,justifyContent:"center"}}><NFLTeamLogo team={team} size={20}/><span style={{fontFamily:sans,fontSize:14,fontWeight:700,color:"#171717"}}>{team}</span></div>
              <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,overflow:"hidden",marginBottom:12}}>
                {tp.map((pk,i)=>{const p=prospectsMap[pk.playerId];if(!p)return null;const c=POS_COLORS[p.pos];const g=activeGrade(pk.playerId);const rank=getConsensusRank?getConsensusRank(p.name):pk.pick;const v=pickVerdict(pk.pick,rank);
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
