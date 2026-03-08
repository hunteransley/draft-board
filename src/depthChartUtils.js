// Shared depth chart utilities — used by MockDraftSim + team trends page

export const DEPTH_GROUPS=[
  {label:"QB",slots:["QB1","QB2"],posMatch:"QB"},
  {label:"RB",slots:["RB1","RB2"],posMatch:"RB"},
  {label:"WR",slots:["WR1","WR2","WR3","WR4"],posMatch:"WR"},
  {label:"TE",slots:["TE1","TE2"],posMatch:"TE"},
  {label:"OL",slots:["LT","LG","C","RG","RT"],posMatch:"OL"},
  {label:"DL",slots:["DE1","DT1","DT2","DE2"],posMatch:"DL"},
  {label:"LB",slots:["LB1","LB2","LB3","LB4"],posMatch:"LB"},
  {label:"DB",slots:["CB1","CB2","NB","SS","FS"],posMatch:"DB"},
  {label:"K",slots:["K"],posMatch:"K/P"},
];
export const ALL_SLOTS=DEPTH_GROUPS.flatMap(g=>g.slots);

export const TEAM_SCHEME={
  Steelers:{def:"34",off:"11"},Patriots:{def:"34",off:"12"},Eagles:{def:"34",off:"11"},
  Broncos:{def:"34",off:"11"},Saints:{def:"34",off:"11"},Rams:{def:"34",off:"11"},
  Buccaneers:{def:"34",off:"11"},Cowboys:{def:"34",off:"11"},
  Ravens:{def:"34",off:"12"},Bills:{def:"34",off:"11"},Chargers:{def:"34",off:"11"},
  Panthers:{def:"34",off:"12"},Seahawks:{def:"34",off:"12"},Cardinals:{def:"34",off:"11"},
  Raiders:{def:"34",off:"12"},Dolphins:{def:"34",off:"11"},Vikings:{def:"34",off:"11"},
  Jets:{def:"34",off:"11"},Falcons:{def:"34",off:"12"},
  Browns:{def:"w9",off:"12"},Titans:{def:"w9",off:"11"},
  Bengals:{def:"425",off:"11"},Bears:{def:"425",off:"11"},Packers:{def:"425",off:"11"},
  Texans:{def:"425",off:"11"},Colts:{def:"425",off:"11"},Jaguars:{def:"425",off:"11"},
  Giants:{def:"425",off:"11"},"49ers":{def:"425",off:"12"},Commanders:{def:"425",off:"11"},
  Chiefs:{def:"43",off:"11"},Lions:{def:"43",off:"11"},
};

// Team name → roster abbreviation (matches nflRosters.js keys)
export const TEAM_ABBR={Raiders:"LV",Jets:"NYJ",Cardinals:"ARI",Titans:"TEN",Giants:"NYG",Browns:"CLE",Commanders:"WAS",Saints:"NO",Chiefs:"KC",Bengals:"CIN",Dolphins:"MIA",Cowboys:"DAL",Rams:"LAR",Falcons:"ATL",Ravens:"BAL",Buccaneers:"TB",Colts:"IND",Lions:"DET",Vikings:"MIN",Panthers:"CAR",Packers:"GB",Steelers:"PIT",Chargers:"LAC",Eagles:"PHI",Bears:"CHI","49ers":"SF",Texans:"HOU",Jaguars:"JAX",Seahawks:"SEA",Patriots:"NE",Broncos:"DEN",Bills:"BUF"};

export function getFormationPos(team){
  const scheme=TEAM_SCHEME[team];
  const off=scheme?.off||"11";
  const def=scheme?.def||"43";
  const pos={
    QB1:{x:50,y:78},
    LT:{x:32,y:68},LG:{x:40,y:68},C:{x:50,y:68},RG:{x:60,y:68},RT:{x:68,y:68},
    CB1:{x:10,y:25},CB2:{x:90,y:25},SS:{x:65,y:18},FS:{x:35,y:18}
  };
  if(off==="12"){
    Object.assign(pos,{WR1:{x:5,y:65},WR2:{x:95,y:65},TE1:{x:80,y:68},TE2:{x:22,y:68,label:"TE"},RB1:{x:50,y:88}});
  }else{
    Object.assign(pos,{WR1:{x:5,y:65},WR2:{x:95,y:65},WR3:{x:22,y:65},TE1:{x:80,y:68},RB1:{x:50,y:88}});
  }
  if(def==="34"){
    Object.assign(pos,{
      DE1:{x:30,y:48},DT1:{x:50,y:48,label:"NT"},DE2:{x:70,y:48},
      LB1:{x:18,y:42,label:"OLB"},LB2:{x:40,y:38,label:"ILB"},LB3:{x:60,y:38,label:"ILB"},LB4:{x:82,y:42,label:"OLB",schemeOnly:true}
    });
  }else if(def==="w9"){
    Object.assign(pos,{
      DE1:{x:18,y:48},DT1:{x:42,y:48},DT2:{x:58,y:48},DE2:{x:82,y:48},
      LB1:{x:38,y:38},LB2:{x:62,y:38},
      NB:{x:50,y:30,label:"NB"}
    });
  }else if(def==="425"){
    Object.assign(pos,{
      DE1:{x:28,y:48},DT1:{x:42,y:48},DT2:{x:58,y:48},DE2:{x:72,y:48},
      LB1:{x:38,y:38},LB2:{x:62,y:38},
      NB:{x:50,y:30,label:"NB"}
    });
  }else{
    Object.assign(pos,{
      DE1:{x:28,y:48},DT1:{x:42,y:48},DT2:{x:58,y:48},DE2:{x:72,y:48},
      LB1:{x:30,y:38},LB2:{x:50,y:38},LB3:{x:70,y:38}
    });
  }
  return pos;
}

export function getSchemeDepthGroups(team){
  const scheme=TEAM_SCHEME[team];
  const def=scheme?.def;
  if(def==="34"){
    return[
      {label:"QB",slots:["QB1","QB2"],posMatch:"QB"},
      {label:"RB",slots:["RB1","RB2"],posMatch:"RB"},
      {label:"WR",slots:["WR1","WR2","WR3","WR4"],posMatch:"WR"},
      {label:"TE",slots:["TE1","TE2"],posMatch:"TE"},
      {label:"OL",slots:["LT","LG","C","RG","RT"],posMatch:"OL"},
      {label:"DL",slots:["DE1","DT1","DE2"],posMatch:"DL",slotLabels:{DE1:"DE",DT1:"NT",DE2:"DE"}},
      {label:"LB",slots:["LB1","LB2","LB3","LB4"],posMatch:"LB",slotLabels:{LB1:"OLB",LB2:"ILB",LB3:"ILB",LB4:"OLB"}},
      {label:"DB",slots:["CB1","CB2","NB","SS","FS"],posMatch:"DB"},
      {label:"K",slots:["K"],posMatch:"K/P"},
    ];
  }
  if(def==="425"||def==="w9"){
    return[
      {label:"QB",slots:["QB1","QB2"],posMatch:"QB"},
      {label:"RB",slots:["RB1","RB2"],posMatch:"RB"},
      {label:"WR",slots:["WR1","WR2","WR3","WR4"],posMatch:"WR"},
      {label:"TE",slots:["TE1","TE2"],posMatch:"TE"},
      {label:"OL",slots:["LT","LG","C","RG","RT"],posMatch:"OL"},
      {label:"DL",slots:["DE1","DT1","DT2","DE2"],posMatch:"DL"},
      {label:"LB",slots:["LB1","LB2"],posMatch:"LB"},
      {label:"DB",slots:["CB1","CB2","NB","SS","FS"],posMatch:"DB"},
      {label:"K",slots:["K"],posMatch:"K/P"},
    ];
  }
  return DEPTH_GROUPS;
}
