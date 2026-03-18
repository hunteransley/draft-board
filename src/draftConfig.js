// Shared draft simulation configuration — single source of truth
// Consumed by MockDraftSim.jsx and Round1Prediction.jsx

export const DRAFT_YEAR = 2026;

export const POS_DRAFT_VALUE={QB:1.08,EDGE:1.09,CB:1.05,OT:1.05,OL:1.05,DL:1.04,WR:1.04,IDL:1.03,DT:1.03,NT:1.03,IOL:1.01,DB:1.01,TE:1.01,S:0.99,LB:0.97,RB:1.02,"K/P":0.7};

// RANK_OVERRIDES: force consensus rank used by CPU to be higher (lower number = picked earlier)
// Use for players whose real-world buzz clearly exceeds their positional consensus slot
export const RANK_OVERRIDES={"Sonny Styles":6,"Kenyon Sadiq":18,"Jeremiyah Love":3};

// GRADE_OVERRIDES: force a minimum grade for specific elite prospects
// Use sparingly — only for players who are clearly mis-valued by the generic grade system
// This does NOT affect other players at their position, only the named individual
export const GRADE_OVERRIDES={"Jeremiyah Love":92,"Sonny Styles":89};

export const TEAM_PROFILES={
  // 3-4 teams value EDGE/OLB rushers + IDL/NT space-eaters; 4-3 teams value DT penetrators + EDGE ends
  // gposBoost: granular position preferences based on scheme (1.15× multiplier)
  // athBoost: 0-0.18, bonus for high athleticScore prospects (team values athleticism)
  // sizePremium: boolean, small boost for above-avg height/weight/arms at position
  // ceilingChaser: 0-0.12, bonus for high/elite ceiling prospects (team values upside)
  Raiders:{bpaLean:0.55,posBoost:["QB","OL","WR"],posPenalty:[],stage:"rebuild",reachTolerance:0.3,variance:2,gposBoost:["EDGE","IDL"],athBoost:0.08,sizePremium:false,ceilingChaser:0.08},
  Jets:{bpaLean:0.5,posBoost:["QB","DL","DB"],posPenalty:["RB"],stage:"rebuild",reachTolerance:0.4,variance:3,gposBoost:["EDGE","DT"],athBoost:0.06,sizePremium:true,ceilingChaser:0},
  Cardinals:{bpaLean:0.45,posBoost:["OL","DL","RB"],posPenalty:["QB"],stage:"rebuild",reachTolerance:0.3,variance:2,gposBoost:["EDGE","NT","IDL"],athBoost:0.08,sizePremium:false,ceilingChaser:0.06},
  Titans:{bpaLean:0.75,posBoost:["DL","DB","WR"],posPenalty:[],stage:"rebuild",reachTolerance:0.15,variance:1,gposBoost:["EDGE","NT","IDL"],athBoost:0,sizePremium:false,ceilingChaser:0},
  Giants:{bpaLean:0.6,posBoost:["OL","DL","LB","DB"],posPenalty:["QB"],stage:"rebuild",reachTolerance:0.25,variance:2,gposBoost:["EDGE","NT"],athBoost:0,sizePremium:true,ceilingChaser:0},
  Browns:{bpaLean:0.55,posBoost:["OL","WR","QB"],posPenalty:["DL","LB"],stage:"rebuild",reachTolerance:0.35,variance:3,gposBoost:["EDGE","DT"],athBoost:0.10,sizePremium:false,ceilingChaser:0},
  Commanders:{bpaLean:0.65,posBoost:["OL","WR"],posPenalty:[],stage:"contend",reachTolerance:0.3,variance:1,gposBoost:["EDGE","DT"],athBoost:0.08,sizePremium:false,ceilingChaser:0},
  Saints:{bpaLean:0.35,posBoost:["WR","DB","RB"],posPenalty:[],stage:"retool",reachTolerance:0.5,variance:4,gposBoost:["EDGE","DT"],athBoost:0,sizePremium:false,ceilingChaser:0},
  Chiefs:{bpaLean:0.5,posBoost:["WR","DB","RB"],posPenalty:["QB"],stage:"dynasty",reachTolerance:0.5,variance:3,gposBoost:["EDGE","DT","CB"],athBoost:0.12,sizePremium:false,ceilingChaser:0},
  Bengals:{bpaLean:0.8,posBoost:["DL","OL","DB"],posPenalty:[],stage:"contend",reachTolerance:0.1,variance:1,gposBoost:["EDGE","DT"],athBoost:0,sizePremium:false,ceilingChaser:0},
  Dolphins:{bpaLean:0.65,posBoost:["OL","DL","DB"],posPenalty:[],stage:"rebuild",reachTolerance:0.2,variance:2,gposBoost:["EDGE","NT","IDL"],athBoost:0.08,sizePremium:false,ceilingChaser:0.06},
  Cowboys:{bpaLean:0.7,posBoost:["DL","DB","LB"],posPenalty:[],stage:"retool",reachTolerance:0.2,variance:2,gposBoost:["EDGE","DT"],athBoost:0,sizePremium:false,ceilingChaser:0},
  Colts:{bpaLean:0.65,posBoost:["OL","DL","WR"],posPenalty:[],stage:"retool",reachTolerance:0.2,variance:1,gposBoost:["EDGE","DT"],athBoost:0.12,sizePremium:true,ceilingChaser:0},
  Steelers:{bpaLean:0.55,posBoost:["WR","QB","OL","DL"],posPenalty:[],stage:"retool",reachTolerance:0.35,variance:2,gposBoost:["EDGE","NT","IDL"],athBoost:0,sizePremium:true,ceilingChaser:0},
  Texans:{bpaLean:0.5,posBoost:["OL","DL","DB"],posPenalty:["QB"],stage:"contend",reachTolerance:0.4,variance:2,gposBoost:["EDGE","DT"],athBoost:0.08,sizePremium:false,ceilingChaser:0},
  Jaguars:{bpaLean:0.7,posBoost:["DL","DB","OL"],posPenalty:[],stage:"rebuild",reachTolerance:0.2,variance:2,gposBoost:["EDGE","DT"],athBoost:0.10,sizePremium:false,ceilingChaser:0.10},
  Patriots:{bpaLean:0.6,posBoost:["OL","WR","DL"],posPenalty:[],stage:"rebuild",reachTolerance:0.3,variance:2,gposBoost:["EDGE","NT","IDL"],athBoost:0.10,sizePremium:false,ceilingChaser:0.06},
  Broncos:{bpaLean:0.55,posBoost:["WR","OL","TE"],posPenalty:["QB"],stage:"contend",reachTolerance:0.4,variance:2,gposBoost:["EDGE","NT"],athBoost:0.06,sizePremium:true,ceilingChaser:0},
  Panthers:{bpaLean:0.5,posBoost:["OL","DL"],posPenalty:[],stage:"rebuild",reachTolerance:0.35,variance:3,gposBoost:["EDGE","NT","IDL"],athBoost:0,sizePremium:true,ceilingChaser:0},
  Bears:{bpaLean:0.6,posBoost:["WR","DB","DL"],posPenalty:[],stage:"contend",reachTolerance:0.3,variance:2,gposBoost:["EDGE","DT"],athBoost:0.15,sizePremium:false,ceilingChaser:0.10},
  Falcons:{bpaLean:0.6,posBoost:["OL","DL","DB"],posPenalty:[],stage:"retool",reachTolerance:0.25,variance:2,gposBoost:["EDGE","NT","IDL"],athBoost:0,sizePremium:true,ceilingChaser:0},
  Eagles:{bpaLean:0.5,posBoost:["OL","DL","DB"],posPenalty:[],stage:"dynasty",reachTolerance:0.45,variance:3,gposBoost:["EDGE","NT","IDL"],athBoost:0.06,sizePremium:false,ceilingChaser:0},
  Chargers:{bpaLean:0.6,posBoost:["OL","DL","TE"],posPenalty:["QB"],stage:"contend",reachTolerance:0.3,variance:1,gposBoost:["EDGE","NT","IDL"],athBoost:0,sizePremium:true,ceilingChaser:0},
  "49ers":{bpaLean:0.55,posBoost:["WR","OL","DB","DL"],posPenalty:[],stage:"contend",reachTolerance:0.5,variance:3,gposBoost:["EDGE","DT"],athBoost:0.12,sizePremium:false,ceilingChaser:0.06},
  Packers:{bpaLean:0.75,posBoost:["DB","WR","DL"],posPenalty:[],stage:"contend",reachTolerance:0.15,variance:1,gposBoost:["EDGE","NT"],athBoost:0.04,sizePremium:false,ceilingChaser:0},
  Lions:{bpaLean:0.6,posBoost:["DL","DB","OL","WR"],posPenalty:[],stage:"dynasty",reachTolerance:0.45,variance:3,gposBoost:["EDGE","DT"],athBoost:0.08,sizePremium:false,ceilingChaser:0.10},
  Rams:{bpaLean:0.45,posBoost:["OL","DL","QB","WR"],posPenalty:[],stage:"contend",reachTolerance:0.6,variance:4,gposBoost:["EDGE","NT","IDL"],athBoost:0.06,sizePremium:false,ceilingChaser:0},
  Seahawks:{bpaLean:0.65,posBoost:["OL","DL","DB"],posPenalty:[],stage:"dynasty",reachTolerance:0.3,variance:3,gposBoost:["EDGE","NT","IDL"],athBoost:0.15,sizePremium:true,ceilingChaser:0.08},
  Buccaneers:{bpaLean:0.55,posBoost:["OL","DL","DB"],posPenalty:[],stage:"contend",reachTolerance:0.3,variance:2,gposBoost:["EDGE","NT","IDL"],athBoost:0,sizePremium:false,ceilingChaser:0},
  Vikings:{bpaLean:0.4,posBoost:["OL","QB","WR"],posPenalty:[],stage:"retool",reachTolerance:0.4,variance:4,gposBoost:["EDGE","NT"],athBoost:0,sizePremium:false,ceilingChaser:0},
  Bills:{bpaLean:0.55,posBoost:["DL","DB","WR"],posPenalty:[],stage:"retool",reachTolerance:0.4,variance:3,gposBoost:["EDGE","DT"],athBoost:0.06,sizePremium:false,ceilingChaser:0},
  Ravens:{bpaLean:0.7,posBoost:["OL","WR","DB"],posPenalty:[],stage:"contend",reachTolerance:0.35,variance:2,gposBoost:["EDGE","NT","IDL"],athBoost:0.04,sizePremium:false,ceilingChaser:0},
};

// Scheme archetype demand — how much does this team's scheme structurally create value
// for each cross-positional archetype? Derived from agent scheme analysis.
export const SCHEME_INFLECTIONS={
  Raiders:{teRec:.8,lbRush:.8,rbDual:.4},
  Jets:{teRec:.4,lbRush:.2,rbDual:.8},
  Cardinals:{teRec:.8,lbRush:.8,rbDual:.4},
  Titans:{teRec:.4,lbRush:.2,rbDual:.6},
  Giants:{teRec:.8,lbRush:.7,rbDual:.8},
  Browns:{teRec:.8,lbRush:.2,rbDual:.4},
  Commanders:{teRec:.8,lbRush:.7,rbDual:.4},
  Saints:{teRec:.15,lbRush:.7,rbDual:.15},
  Chiefs:{teRec:.8,lbRush:.2,rbDual:.8},
  Bengals:{teRec:.8,lbRush:.55,rbDual:.8},
  Dolphins:{teRec:.4,lbRush:.2,rbDual:.8},
  Cowboys:{teRec:.8,lbRush:.8,rbDual:.4},
  Rams:{teRec:.8,lbRush:.7,rbDual:.15},
  Ravens:{teRec:.8,lbRush:.55,rbDual:.4},
  Buccaneers:{teRec:.4,lbRush:.8,rbDual:.4},
  Colts:{teRec:.8,lbRush:.1,rbDual:.15},
  Lions:{teRec:.8,lbRush:.25,rbDual:.8},
  Vikings:{teRec:.8,lbRush:.55,rbDual:.8},
  Panthers:{teRec:.4,lbRush:.8,rbDual:.15},
  Steelers:{teRec:.8,lbRush:.8,rbDual:.4},
  Chargers:{teRec:.8,lbRush:.8,rbDual:.8},
  Eagles:{teRec:.8,lbRush:.8,rbDual:.8},
  Bears:{teRec:.8,lbRush:.2,rbDual:.8},
  Bills:{teRec:.8,lbRush:.8,rbDual:.8},
  "49ers":{teRec:.8,lbRush:.55,rbDual:.8},
  Texans:{teRec:.8,lbRush:.1,rbDual:.4},
  Broncos:{teRec:.8,lbRush:.8,rbDual:.8},
  Patriots:{teRec:.8,lbRush:.7,rbDual:.6},
  Seahawks:{teRec:.8,lbRush:.4,rbDual:.8},
  Falcons:{teRec:.8,lbRush:.7,rbDual:.8},
  Packers:{teRec:.8,lbRush:.8,rbDual:.4},
  Jaguars:{teRec:.4,lbRush:.2,rbDual:.4},
};

// ── DRAFT ORDER (single source of truth — all 257 picks from Tankathon) ──

export const DRAFT_ORDER=[
{pick:1,round:1,team:"Raiders"},{pick:2,round:1,team:"Jets"},{pick:3,round:1,team:"Cardinals"},{pick:4,round:1,team:"Titans"},
{pick:5,round:1,team:"Giants"},{pick:6,round:1,team:"Browns"},{pick:7,round:1,team:"Commanders"},{pick:8,round:1,team:"Saints"},
{pick:9,round:1,team:"Chiefs"},{pick:10,round:1,team:"Bengals"},{pick:11,round:1,team:"Dolphins"},{pick:12,round:1,team:"Cowboys"},
{pick:13,round:1,team:"Rams",from:"Falcons"},{pick:14,round:1,team:"Ravens"},{pick:15,round:1,team:"Buccaneers"},{pick:16,round:1,team:"Jets",from:"Colts"},
{pick:17,round:1,team:"Lions"},{pick:18,round:1,team:"Vikings"},{pick:19,round:1,team:"Panthers"},{pick:20,round:1,team:"Cowboys",from:"Packers"},
{pick:21,round:1,team:"Steelers"},{pick:22,round:1,team:"Chargers"},{pick:23,round:1,team:"Eagles"},{pick:24,round:1,team:"Browns",from:"Jaguars"},
{pick:25,round:1,team:"Bears"},{pick:26,round:1,team:"Bills"},{pick:27,round:1,team:"49ers"},{pick:28,round:1,team:"Texans"},
{pick:29,round:1,team:"Chiefs",from:"Rams"},{pick:30,round:1,team:"Dolphins",from:"Broncos"},{pick:31,round:1,team:"Patriots"},{pick:32,round:1,team:"Seahawks"},
{pick:33,round:2,team:"Jets"},{pick:34,round:2,team:"Cardinals"},{pick:35,round:2,team:"Titans"},{pick:36,round:2,team:"Raiders"},
{pick:37,round:2,team:"Giants"},{pick:38,round:2,team:"Texans",from:"Commanders"},{pick:39,round:2,team:"Browns"},{pick:40,round:2,team:"Chiefs"},
{pick:41,round:2,team:"Bengals"},{pick:42,round:2,team:"Saints"},{pick:43,round:2,team:"Dolphins"},{pick:44,round:2,team:"Jets",from:"Cowboys"},
{pick:45,round:2,team:"Ravens"},{pick:46,round:2,team:"Buccaneers"},{pick:47,round:2,team:"Colts"},{pick:48,round:2,team:"Falcons"},
{pick:49,round:2,team:"Vikings"},{pick:50,round:2,team:"Lions"},{pick:51,round:2,team:"Panthers"},{pick:52,round:2,team:"Packers"},
{pick:53,round:2,team:"Steelers"},{pick:54,round:2,team:"Eagles"},{pick:55,round:2,team:"Chargers"},{pick:56,round:2,team:"Jaguars"},
{pick:57,round:2,team:"Bears"},{pick:58,round:2,team:"49ers"},{pick:59,round:2,team:"Texans"},{pick:60,round:2,team:"Bears",from:"Bills"},
{pick:61,round:2,team:"Rams"},{pick:62,round:2,team:"Broncos"},{pick:63,round:2,team:"Patriots"},{pick:64,round:2,team:"Seahawks"},
{pick:65,round:3,team:"Cardinals"},{pick:66,round:3,team:"Titans"},{pick:67,round:3,team:"Raiders"},{pick:68,round:3,team:"Eagles",from:"Jets"},
{pick:69,round:3,team:"Texans",from:"Giants"},{pick:70,round:3,team:"Browns"},{pick:71,round:3,team:"Commanders"},{pick:72,round:3,team:"Bengals"},
{pick:73,round:3,team:"Saints"},{pick:74,round:3,team:"Chiefs"},{pick:75,round:3,team:"Dolphins"},{pick:76,round:3,team:"Steelers",from:"Cowboys"},
{pick:77,round:3,team:"Buccaneers"},{pick:78,round:3,team:"Colts"},{pick:79,round:3,team:"Falcons"},{pick:80,round:3,team:"Ravens"},
{pick:81,round:3,team:"Jaguars",from:"Lions"},{pick:82,round:3,team:"Vikings"},{pick:83,round:3,team:"Panthers"},{pick:84,round:3,team:"Packers"},
{pick:85,round:3,team:"Steelers"},{pick:86,round:3,team:"Chargers"},{pick:87,round:3,team:"Dolphins",from:"Eagles"},{pick:88,round:3,team:"Jaguars"},
{pick:89,round:3,team:"Bears"},{pick:90,round:3,team:"Dolphins",from:"Texans"},{pick:91,round:3,team:"Bills"},{pick:92,round:3,team:"Cowboys",from:"49ers"},
{pick:93,round:3,team:"Rams"},{pick:94,round:3,team:"Dolphins",from:"Broncos"},{pick:95,round:3,team:"Patriots"},{pick:96,round:3,team:"Seahawks"},
{pick:97,round:3,team:"Vikings"},{pick:98,round:3,team:"Eagles"},{pick:99,round:3,team:"Steelers"},{pick:100,round:3,team:"Jaguars",from:"Lions"},
{pick:101,round:4,team:"Titans"},{pick:102,round:4,team:"Raiders"},{pick:103,round:4,team:"Jets"},{pick:104,round:4,team:"Cardinals"},
{pick:105,round:4,team:"Giants"},{pick:106,round:4,team:"Texans",from:"Commanders"},{pick:107,round:4,team:"Browns"},{pick:108,round:4,team:"Broncos",from:"Saints"},
{pick:109,round:4,team:"Chiefs"},{pick:110,round:4,team:"Bengals"},{pick:111,round:4,team:"Broncos",from:"Dolphins"},{pick:112,round:4,team:"Cowboys"},
{pick:113,round:4,team:"Colts"},{pick:114,round:4,team:"Falcons"},{pick:115,round:4,team:"Ravens"},{pick:116,round:4,team:"Buccaneers"},
{pick:117,round:4,team:"Raiders",from:"Vikings"},{pick:118,round:4,team:"Lions"},{pick:119,round:4,team:"Panthers"},{pick:120,round:4,team:"Packers"},
{pick:121,round:4,team:"Steelers"},{pick:122,round:4,team:"Eagles"},{pick:123,round:4,team:"Chargers"},{pick:124,round:4,team:"Jaguars"},
{pick:125,round:4,team:"Patriots",from:"Bears"},{pick:126,round:4,team:"Bills"},{pick:127,round:4,team:"49ers"},{pick:128,round:4,team:"Lions",from:"Texans"},
{pick:129,round:4,team:"Bears",from:"Rams"},{pick:130,round:4,team:"Dolphins",from:"Broncos"},{pick:131,round:4,team:"Patriots"},{pick:132,round:4,team:"Saints",from:"Seahawks"},
{pick:133,round:4,team:"49ers"},{pick:134,round:4,team:"Raiders"},{pick:135,round:4,team:"Steelers"},{pick:136,round:4,team:"Saints"},
{pick:137,round:4,team:"Eagles"},{pick:138,round:4,team:"49ers"},{pick:139,round:4,team:"49ers"},{pick:140,round:4,team:"Jets"},
{pick:141,round:5,team:"Texans",from:"Raiders"},{pick:142,round:5,team:"Titans",from:"Jets"},{pick:143,round:5,team:"Cardinals"},{pick:144,round:5,team:"Titans"},
{pick:145,round:5,team:"Giants"},{pick:146,round:5,team:"Browns"},{pick:147,round:5,team:"Commanders"},{pick:148,round:5,team:"Chiefs"},
{pick:149,round:5,team:"Browns",from:"Bengals"},{pick:150,round:5,team:"Saints"},{pick:151,round:5,team:"Dolphins"},{pick:152,round:5,team:"Cowboys"},
{pick:153,round:5,team:"Eagles",from:"Falcons"},{pick:154,round:5,team:"Ravens"},{pick:155,round:5,team:"Buccaneers"},{pick:156,round:5,team:"Colts"},
{pick:157,round:5,team:"Lions"},{pick:158,round:5,team:"Panthers",from:"Vikings"},{pick:159,round:5,team:"Panthers"},{pick:160,round:5,team:"Packers"},
{pick:161,round:5,team:"Steelers"},{pick:162,round:5,team:"Ravens",from:"Chargers"},{pick:163,round:5,team:"Vikings",from:"Eagles"},{pick:164,round:5,team:"Jaguars"},
{pick:165,round:5,team:"Bills",from:"Bears"},{pick:166,round:5,team:"Jaguars",from:"49ers"},{pick:167,round:5,team:"Texans"},{pick:168,round:5,team:"Bills"},
{pick:169,round:5,team:"Chiefs",from:"Rams"},{pick:170,round:5,team:"Broncos"},{pick:171,round:5,team:"Patriots"},{pick:172,round:5,team:"Saints",from:"Seahawks"},
{pick:173,round:5,team:"Ravens"},{pick:174,round:5,team:"Ravens"},{pick:175,round:5,team:"Raiders"},{pick:176,round:5,team:"Chiefs"},
{pick:177,round:5,team:"Cowboys"},{pick:178,round:5,team:"Eagles"},{pick:179,round:5,team:"Jets"},{pick:180,round:5,team:"Cowboys"},
{pick:181,round:5,team:"Lions"},
{pick:182,round:6,team:"Raiders",from:"Jets"},{pick:183,round:6,team:"Cardinals"},{pick:184,round:6,team:"Titans"},{pick:185,round:6,team:"Raiders"},
{pick:186,round:6,team:"Giants"},{pick:187,round:6,team:"Commanders"},{pick:188,round:6,team:"Lions",from:"Browns"},{pick:189,round:6,team:"Bengals"},
{pick:190,round:6,team:"Saints"},{pick:191,round:6,team:"Patriots",from:"Chiefs"},{pick:192,round:6,team:"Giants",from:"Dolphins"},{pick:193,round:6,team:"Giants",from:"Cowboys"},
{pick:194,round:6,team:"Jets",from:"Ravens"},{pick:195,round:6,team:"Buccaneers"},{pick:196,round:6,team:"Vikings",from:"Colts"},{pick:197,round:6,team:"Falcons"},
{pick:198,round:6,team:"Commanders",from:"Vikings"},{pick:199,round:6,team:"Bengals",from:"Lions"},{pick:200,round:6,team:"Panthers"},{pick:201,round:6,team:"Packers"},
{pick:202,round:6,team:"Patriots",from:"Steelers"},{pick:203,round:6,team:"Jaguars",from:"Eagles"},{pick:204,round:6,team:"Chargers"},{pick:205,round:6,team:"Lions",from:"Jaguars"},
{pick:206,round:6,team:"Browns",from:"Bears"},{pick:207,round:6,team:"Rams",from:"Texans"},{pick:208,round:6,team:"Jets",from:"Bills"},{pick:209,round:6,team:"Patriots",from:"49ers"},
{pick:210,round:6,team:"Chiefs",from:"Rams"},{pick:211,round:6,team:"Ravens",from:"Broncos"},{pick:212,round:6,team:"Patriots"},{pick:213,round:6,team:"Seahawks"},
{pick:214,round:6,team:"Steelers"},{pick:215,round:6,team:"Eagles"},{pick:216,round:6,team:"Steelers"},
{pick:217,round:7,team:"Cardinals"},{pick:218,round:7,team:"Jets",from:"Titans"},{pick:219,round:7,team:"Raiders"},{pick:220,round:7,team:"Bills",from:"Jets"},
{pick:221,round:7,team:"Cowboys",from:"Giants"},{pick:222,round:7,team:"Lions",from:"Browns"},{pick:223,round:7,team:"Commanders"},{pick:224,round:7,team:"Steelers",from:"Saints"},
{pick:225,round:7,team:"Cowboys",from:"Chiefs"},{pick:226,round:7,team:"Bengals"},{pick:227,round:7,team:"Dolphins"},{pick:228,round:7,team:"Bills",from:"Cowboys"},
{pick:229,round:7,team:"Buccaneers"},{pick:230,round:7,team:"Colts"},{pick:231,round:7,team:"Falcons"},{pick:232,round:7,team:"Rams",from:"Ravens"},
{pick:233,round:7,team:"Jaguars",from:"Lions"},{pick:234,round:7,team:"Vikings"},{pick:235,round:7,team:"Panthers"},{pick:236,round:7,team:"Packers"},
{pick:237,round:7,team:"Steelers"},{pick:238,round:7,team:"Dolphins",from:"Chargers"},{pick:239,round:7,team:"Bears",from:"Eagles"},{pick:240,round:7,team:"Vikings",from:"Jaguars"},
{pick:241,round:7,team:"Bears"},{pick:242,round:7,team:"Jets",from:"Bills"},{pick:243,round:7,team:"Texans",from:"49ers"},{pick:244,round:7,team:"Texans"},
{pick:245,round:7,team:"Jaguars",from:"Rams"},{pick:246,round:7,team:"Broncos"},{pick:247,round:7,team:"Patriots"},{pick:248,round:7,team:"Browns",from:"Seahawks"},
{pick:249,round:7,team:"Colts"},{pick:250,round:7,team:"Ravens"},{pick:251,round:7,team:"Rams"},{pick:252,round:7,team:"Rams"},
{pick:253,round:7,team:"Ravens"},{pick:254,round:7,team:"Colts"},{pick:255,round:7,team:"Packers"},{pick:256,round:7,team:"Broncos"},
{pick:257,round:7,team:"Broncos"},
];

export const DRAFT_ORDER_R1=DRAFT_ORDER.filter(d=>d.round===1);
export const ROUND_BOUNDS=[0,32,64,100,140,181,216,257];
export function getPickRound(pickNum){return ROUND_BOUNDS.findIndex(b=>pickNum<=b)||7;}
