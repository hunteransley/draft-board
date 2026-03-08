// Shared draft simulation configuration — single source of truth
// Consumed by MockDraftSim.jsx and Round1Prediction.jsx

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
