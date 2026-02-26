import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import NFL_ROSTERS from "./nflRosters.js";
import { getScoutingTraits } from "./scoutingData.js";
import { getStatBasedTraits } from "./statTraits.js";
import { getProspectStats } from "./prospectStats.js";
// Canvas-based share image (no html2canvas dependency)

// Suffix-aware short name: "Rueben Bain Jr." → "Bain Jr." not "Jr."
const GEN_SUFFIXES=/^(Jr\.?|Sr\.?|II|III|IV|V|VI|VII|VIII)$/i;
function shortName(name){const p=name.split(" ");const last=p.pop()||"";return GEN_SUFFIXES.test(last)?(p.pop()||last)+" "+last:last;}

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

const TEAM_ABBR={Raiders:"LV",Jets:"NYJ",Cardinals:"ARI",Titans:"TEN",Giants:"NYG",Browns:"CLE",Commanders:"WAS",Saints:"NO",Chiefs:"KC",Bengals:"CIN",Dolphins:"MIA",Cowboys:"DAL",Rams:"LAR",Falcons:"ATL",Ravens:"BAL",Buccaneers:"TB",Colts:"IND",Lions:"DET",Vikings:"MIN",Panthers:"CAR",Packers:"GB",Steelers:"PIT",Chargers:"LAC",Eagles:"PHI",Bears:"CHI","49ers":"SF",Texans:"HOU",Jaguars:"JAX",Seahawks:"SEA",Patriots:"NE",Broncos:"DEN",Bills:"BUF"};

const NFL_TEAM_COLORS={"49ers":"#AA0000",Raiders:"#A5ACAF",Jets:"#125740",Cardinals:"#97233F",Titans:"#4B92DB",Giants:"#0B2265",Browns:"#FF3C00",Commanders:"#5A1414",Saints:"#D3BC8D",Chiefs:"#E31837",Bengals:"#FB4F14",Dolphins:"#008E97",Cowboys:"#003594",Rams:"#003594",Falcons:"#A71930",Ravens:"#241773",Buccaneers:"#D50A0A",Colts:"#002C5F",Lions:"#0076B6",Vikings:"#4F2683",Panthers:"#0085CA",Packers:"#203731",Steelers:"#FFB612",Chargers:"#0080C6",Eagles:"#004C54",Bears:"#C83200",Bills:"#00338D",Texans:"#03202F",Broncos:"#FB4F14",Patriots:"#002244",Seahawks:"#69BE28",Jaguars:"#006778"};
const NFL_TEAM_ESPN_IDS={Raiders:13,Jets:20,Cardinals:22,Titans:10,Giants:19,Browns:5,Commanders:28,Saints:18,Chiefs:12,Bengals:4,Dolphins:15,Cowboys:6,Rams:14,Ravens:33,Buccaneers:27,Lions:8,Vikings:16,Panthers:29,Steelers:23,Chargers:24,Eagles:21,Bears:3,Bills:2,"49ers":25,Texans:34,Broncos:7,Patriots:17,Seahawks:26,Falcons:1,Colts:11,Jaguars:30,Packers:9};
function nflLogoUrl(team){const id=NFL_TEAM_ESPN_IDS[team];return id?`https://a.espncdn.com/i/teamlogos/nfl/500/${id}.png`:null;}
function loadImg(src,timeout=3000){return new Promise((res,rej)=>{const img=new Image();img.crossOrigin="anonymous";img.onload=()=>res(img);img.onerror=()=>rej();setTimeout(rej,timeout);img.src=src;});}
function drawTrunc(ctx,text,x,y,maxW){let t=text;while(ctx.measureText(t).width>maxW&&t.length>1)t=t.slice(0,-1);if(t!==text)t=t.slice(0,-1)+'…';ctx.fillText(t,x,y);}

// Override consensus ranks for players the board data may undervalue
// These represent realistic draft range ceilings/floors based on current intel
const BBL_LOGO_B64="data:image/png;base64,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993WusbZohb7HSPJo6Fjiee3xJD+8/H0A4HqYxqJpqiZ008r5ZHHLnvcXEn3JXWkae+qTyyEpZCIisIhSDslutqDa3UDq62BtXQVGG1lDK4hkwHmCP2XDyPPuCo+RYaUlhhPBfG33HZHfuOJzar9E6jDct6XCmrWH0BOWy8/P6d1kTpzfPQIMOmr5Q6xtDP2aa5tImA9AeoH5API9vJfn8xzmODmOLXDsQcEKTdA787n6NYynoNRy11EztSXEfaI8egLvvNHs1wUEpwWI7r0ZNT9SzlfuZQh5p9zNlqunkHDpY6JtREfclwGB9SvCNZ+GepJE1gjopPNgt8keD/owFptg8Ytxw2LUui6KpZj7z6OoLP+h4d/NbPD4pdqa5w/SWiq6MnuX0kEmPz5UNT40tfDJqSPczVfhlpf1rLLS1JHID7fJL+TsrIUW9GjKICn0DtrdLhM44jFNbmwxk+WXAEj8FjH+J3ZikYHUmk6x7/RlthYR+JWE1B4wrNBD06X0LMZP4qudsTfwYDn8Qj/AMrfyxqXqb5XUe9W6MBt92jodEafm4nZGS+plYe7Scknj06QfPK1HxMaw0rtrs8NotLVYqa+eL4EzBIHPgjc7re+QjgPeT+z/iPsoT154kt0NVRSUsd1isVG8YdFbGGJxHvISX/gQD6KH5pZZ5nzTSPkkeepz3uyXH1JPdSxKeNWyXZEJSzwfCIitIBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAf//Z";

// RANK_OVERRIDES: force consensus rank used by CPU to be higher (lower number = picked earlier)
// Use for players whose real-world buzz clearly exceeds their positional consensus slot
const RANK_OVERRIDES={"Sonny Styles":6,"Kenyon Sadiq":18,"Jeremiyah Love":3};

// GRADE_OVERRIDES: force a minimum grade for specific elite prospects
// Use sparingly — only for players who are clearly mis-valued by the generic grade system
// This does NOT affect other players at their position, only the named individual
const GRADE_OVERRIDES={"Jeremiyah Love":92,"Sonny Styles":89};

// === TEAM PERSONALITY PROFILES ===
// bpaLean: 0-1, how much team trusts BPA (1.0=pure BPA like CIN, 0.3=heavy need like NO)
// posBoost: positions this regime values above market rate
// posPenalty: positions this regime avoids early
// stage: "rebuild"|"retool"|"contend"|"dynasty"
// reachTolerance: 0-1, willingness to reach for 'their guy'
// variance: regime scouting divergence from consensus
const TEAM_PROFILES={
  // 3-4 teams value EDGE/OLB rushers + IDL/NT space-eaters; 4-3 teams value DT penetrators + EDGE ends
  // gposBoost: granular position preferences based on scheme (1.15× multiplier)
  Raiders:{bpaLean:0.55,posBoost:["QB","OL","WR"],posPenalty:[],stage:"rebuild",reachTolerance:0.3,variance:2,gposBoost:["EDGE","IDL"]},
  Jets:{bpaLean:0.5,posBoost:["QB","DL","DB"],posPenalty:["RB"],stage:"rebuild",reachTolerance:0.4,variance:3,gposBoost:["EDGE","DT"]},
  Cardinals:{bpaLean:0.45,posBoost:["OL","DL","RB"],posPenalty:["QB"],stage:"rebuild",reachTolerance:0.3,variance:2,gposBoost:["EDGE","NT","IDL"]},
  Titans:{bpaLean:0.75,posBoost:["DL","DB","WR"],posPenalty:[],stage:"rebuild",reachTolerance:0.15,variance:1,gposBoost:["EDGE","NT","IDL"]},
  Giants:{bpaLean:0.6,posBoost:["OL","DL","LB","DB"],posPenalty:["QB"],stage:"rebuild",reachTolerance:0.25,variance:2,gposBoost:["EDGE","NT"]},
  Browns:{bpaLean:0.55,posBoost:["OL","WR","QB"],posPenalty:["DL","LB"],stage:"rebuild",reachTolerance:0.35,variance:3,gposBoost:["EDGE","DT"]},
  Commanders:{bpaLean:0.65,posBoost:["OL","WR"],posPenalty:[],stage:"contend",reachTolerance:0.3,variance:1,gposBoost:["EDGE","DT"]},
  Saints:{bpaLean:0.35,posBoost:["WR","DB","RB"],posPenalty:[],stage:"retool",reachTolerance:0.5,variance:4,gposBoost:["EDGE","DT"]},
  Chiefs:{bpaLean:0.5,posBoost:["WR","DB","RB"],posPenalty:["QB"],stage:"dynasty",reachTolerance:0.5,variance:3,gposBoost:["EDGE","DT","CB"]},
  Bengals:{bpaLean:0.8,posBoost:["DL","OL","DB"],posPenalty:[],stage:"contend",reachTolerance:0.1,variance:1,gposBoost:["EDGE","DT"]},
  Dolphins:{bpaLean:0.65,posBoost:["OL","DL","DB"],posPenalty:[],stage:"rebuild",reachTolerance:0.2,variance:2,gposBoost:["EDGE","NT","IDL"]},
  Cowboys:{bpaLean:0.7,posBoost:["DL","DB","LB"],posPenalty:[],stage:"retool",reachTolerance:0.2,variance:2,gposBoost:["EDGE","DT"]},
  Colts:{bpaLean:0.65,posBoost:["OL","DL","WR"],posPenalty:[],stage:"retool",reachTolerance:0.2,variance:1,gposBoost:["EDGE","DT"]},
  Steelers:{bpaLean:0.55,posBoost:["WR","QB","OL","DL"],posPenalty:[],stage:"retool",reachTolerance:0.35,variance:2,gposBoost:["EDGE","NT","IDL"]},
  Texans:{bpaLean:0.5,posBoost:["OL","DL","DB"],posPenalty:["QB"],stage:"contend",reachTolerance:0.4,variance:2,gposBoost:["EDGE","DT"]},
  Jaguars:{bpaLean:0.7,posBoost:["DL","DB","OL"],posPenalty:[],stage:"rebuild",reachTolerance:0.2,variance:2,gposBoost:["EDGE","DT"]},
  Patriots:{bpaLean:0.6,posBoost:["OL","WR","DL"],posPenalty:[],stage:"rebuild",reachTolerance:0.3,variance:2,gposBoost:["EDGE","NT","IDL"]},
  Broncos:{bpaLean:0.55,posBoost:["WR","OL","TE"],posPenalty:["QB"],stage:"contend",reachTolerance:0.4,variance:2,gposBoost:["EDGE","NT"]},
  Panthers:{bpaLean:0.5,posBoost:["OL","DL"],posPenalty:[],stage:"rebuild",reachTolerance:0.35,variance:3,gposBoost:["EDGE","NT","IDL"]},
  Bears:{bpaLean:0.6,posBoost:["WR","DB","DL"],posPenalty:[],stage:"contend",reachTolerance:0.3,variance:2,gposBoost:["EDGE","DT"]},
  Falcons:{bpaLean:0.6,posBoost:["OL","DL","DB"],posPenalty:[],stage:"retool",reachTolerance:0.25,variance:2,gposBoost:["EDGE","NT","IDL"]},
  Eagles:{bpaLean:0.5,posBoost:["OL","DL","DB"],posPenalty:[],stage:"dynasty",reachTolerance:0.45,variance:3,gposBoost:["EDGE","NT","IDL"]},
  Chargers:{bpaLean:0.6,posBoost:["OL","DL","TE"],posPenalty:["QB"],stage:"contend",reachTolerance:0.3,variance:1,gposBoost:["EDGE","NT","IDL"]},
  "49ers":{bpaLean:0.55,posBoost:["WR","OL","DB","DL"],posPenalty:[],stage:"contend",reachTolerance:0.5,variance:3,gposBoost:["EDGE","DT"]},
  Packers:{bpaLean:0.75,posBoost:["DB","WR","DL"],posPenalty:[],stage:"contend",reachTolerance:0.15,variance:1,gposBoost:["EDGE","NT"]},
  Lions:{bpaLean:0.6,posBoost:["DL","DB","OL","WR"],posPenalty:[],stage:"dynasty",reachTolerance:0.45,variance:3,gposBoost:["EDGE","DT"]},
  Rams:{bpaLean:0.45,posBoost:["OL","DL","QB","WR"],posPenalty:[],stage:"contend",reachTolerance:0.6,variance:4,gposBoost:["EDGE","NT","IDL"]},
  Seahawks:{bpaLean:0.65,posBoost:["OL","DL","DB"],posPenalty:[],stage:"dynasty",reachTolerance:0.3,variance:3,gposBoost:["EDGE","NT","IDL"]},
  Buccaneers:{bpaLean:0.55,posBoost:["OL","DL","DB"],posPenalty:[],stage:"contend",reachTolerance:0.3,variance:2,gposBoost:["EDGE","NT","IDL"]},
  Vikings:{bpaLean:0.4,posBoost:["OL","QB","WR"],posPenalty:[],stage:"retool",reachTolerance:0.4,variance:4,gposBoost:["EDGE","NT"]},
  Ravens:{bpaLean:0.7,posBoost:["OL","WR","DB"],posPenalty:[],stage:"contend",reachTolerance:0.35,variance:2,gposBoost:["EDGE","NT","IDL"]},
};

// Division map for RIVAL tags
const DIVISION_RIVALS={
  // AFC East
  "Bills":["Dolphins","Jets","Patriots"],"Dolphins":["Bills","Jets","Patriots"],"Jets":["Bills","Dolphins","Patriots"],"Patriots":["Bills","Dolphins","Jets"],
  // AFC North
  "Ravens":["Bengals","Browns","Steelers"],"Bengals":["Ravens","Browns","Steelers"],"Browns":["Ravens","Bengals","Steelers"],"Steelers":["Ravens","Bengals","Browns"],
  // AFC South
  "Texans":["Colts","Jaguars","Titans"],"Colts":["Texans","Jaguars","Titans"],"Jaguars":["Texans","Colts","Titans"],"Titans":["Texans","Colts","Jaguars"],
  // AFC West
  "Broncos":["Chiefs","Chargers","Raiders"],"Chiefs":["Broncos","Chargers","Raiders"],"Chargers":["Broncos","Chiefs","Raiders"],"Raiders":["Broncos","Chiefs","Chargers"],
  // NFC East
  "Cowboys":["Eagles","Giants","Commanders"],"Eagles":["Cowboys","Giants","Commanders"],"Giants":["Cowboys","Eagles","Commanders"],"Commanders":["Cowboys","Eagles","Giants"],
  // NFC North
  "Bears":["Lions","Packers","Vikings"],"Lions":["Bears","Packers","Vikings"],"Packers":["Bears","Lions","Vikings"],"Vikings":["Bears","Lions","Packers"],
  // NFC South
  "Buccaneers":["Falcons","Panthers","Saints"],"Falcons":["Buccaneers","Panthers","Saints"],"Panthers":["Buccaneers","Falcons","Saints"],"Saints":["Buccaneers","Falcons","Panthers"],
  // NFC West
  "Cardinals":["49ers","Rams","Seahawks"],"49ers":["Cardinals","Rams","Seahawks"],"Rams":["Cardinals","49ers","Seahawks"],"Seahawks":["Cardinals","49ers","Rams"],
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

export default function MockDraftSim({board,myBoard,getGrade,teamNeeds,draftOrder,onClose,onMockComplete,myGuys,myGuysUpdated,setMyGuysUpdated,mockCount,allProspects,PROSPECTS,CONSENSUS,ratings,traits,setTraits,notes,setNotes,POS_COLORS,POSITION_TRAITS,SchoolLogo,NFLTeamLogo,RadarChart,PlayerProfile,font,mono,sans,schoolLogo,getConsensusRank,getConsensusGrade,TEAM_NEEDS_DETAILED,rankedGroups,mockLaunchTeam,mockLaunchRounds,mockLaunchSpeed,mockLaunchCpuTrades,mockLaunchBoardMode,onRankPosition,isGuest,onRequireAuth,trackEvent,userId,isGuestUser,traitThresholds,qualifiesForFilter,prospectBadges,TRAIT_ABBREV,TRAIT_EMOJI,SCHOOL_CONFERENCE,POS_EMOJI}){
  const TRAIT_SHORT={"Contested Catches":"Contested","Man Coverage":"Man Cov","Contact Balance":"Contact Bal","Directional Control":"Directional","Decision Making":"Decision","Pocket Presence":"Pocket Pres","Pass Catching":"Pass Catch","Run Blocking":"Run Block","Pass Protection":"Pass Prot","Hand Usage":"Hand Use","Run Defense":"Run Def","Zone Coverage":"Zone Cov","Leg Strength":"Leg Str"};
  // Trait value with scouting fallback (same chain as App.jsx tv())
  const tvFn=useCallback((id,trait)=>{const p=PROSPECTS.find(x=>x.id===id);if(!p)return 50;return traits[id]?.[trait]??getScoutingTraits(p.name,p.school)?.[trait]??getStatBasedTraits(p.name,p.school)?.[trait]??50;},[traits,PROSPECTS]);
  const ALL_TEAMS=useMemo(()=>[...new Set(DRAFT_ORDER_2026.map(d=>d.team))],[]);
  const[boardMode,setBoardMode]=useState("consensus");
  const activeBoard=boardMode==="my"&&myBoard?myBoard:board;
  const activeGrade=useCallback((id)=>getGrade(id),[getGrade]);
  // Board rank lookup: position in the active board (1-indexed)
  const boardRankMap=useMemo(()=>{const m={};activeBoard.forEach((p,i)=>{m[p.id]=i+1;});return m;},[activeBoard]);
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
  const[traitFilter,setTraitFilter]=useState(new Set());
  useEffect(()=>{setTraitFilter(new Set());},[filterPos]);
  const[profilePlayer,setProfilePlayer]=useState(null);
  const[compareList,setCompareList]=useState([]);
  const[showCompare,setShowCompare]=useState(false);
  const[showDepth,setShowDepth]=useState(true);
  const[mobileDepthOpen,setMobileDepthOpen]=useState(false);
  const[depthSheetTeam,setDepthSheetTeam]=useState("");
  const[tradeOffer,setTradeOffer]=useState(null);
  const[showResults,setShowResults]=useState(false);
  const[showMyGuysOverlay,setShowMyGuysOverlay]=useState(false);
  const[lastVerdict,setLastVerdict]=useState(null);
  const[tradeMap,setTradeMap]=useState({});
  const[showTradeUp,setShowTradeUp]=useState(false);
  const[tradeTarget,setTradeTarget]=useState([]); // array of picks user wants to GET
  const[tradeUserPicks,setTradeUserPicks]=useState([]);
  const[tradePartner,setTradePartner]=useState(null);
  const[depthTeamIdx,setDepthTeamIdx]=useState(0);
  const[tradeValueDelta,setTradeValueDelta]=useState(0); // net JJP value from all trades
  const[cpuTrades,setCpuTrades]=useState(true); // CPU-to-CPU trades enabled
  const[cpuTradeLog,setCpuTradeLog]=useState([]); // [{fromTeam,toTeam,pickIdx,gave:[],got:[]}]
  const tradeDeclinedRef=useRef(0);

  // Auto-launch when coming from home screen CTA with a team pre-selected
  const hasAutoLaunched=useRef(false);
  useEffect(()=>{
    if(mockLaunchTeam&&mockLaunchTeam instanceof Set&&mockLaunchTeam.size>0&&!hasAutoLaunched.current&&!setupDone){
      hasAutoLaunched.current=true;
      setUserTeams(mockLaunchTeam);
      if(mockLaunchRounds)setNumRounds(mockLaunchRounds);
      if(mockLaunchSpeed)setSpeed(mockLaunchSpeed);
      if(typeof mockLaunchCpuTrades==='boolean')setCpuTrades(mockLaunchCpuTrades);
      if(mockLaunchBoardMode)setBoardMode(mockLaunchBoardMode);
      // Auto-start the draft immediately — skip the setup screen
      setTimeout(()=>{
        setAvailable(activeBoard.map(p=>p.id));setPicks([]);setSetupDone(true);setShowResults(false);
        setTradeMap({});setLastVerdict(null);setTradeOffer(null);setShowTradeUp(false);setTradeValueDelta(0);setCpuTradeLog([]);
      },50);
    }
  },[mockLaunchTeam]);

  const prospectsMap=useMemo(()=>{const m={};PROSPECTS.forEach(p=>m[p.id]=p);return m;},[PROSPECTS]);

  // Position run tracker: count how many of each pos drafted in last 8 picks
  const recentPosCounts=useMemo(()=>{
    const recent=picks.slice(-8);
    const counts={};
    recent.forEach(pk=>{const p=prospectsMap[pk.playerId];if(p)counts[p.pos]=(counts[p.pos]||0)+1;});
    return counts;
  },[picks,prospectsMap]);

  const gradeMap=useMemo(()=>{const m={};activeBoard.forEach(p=>m[p.id]=activeGrade(p.id));return m;},[activeBoard,activeGrade]);
  const positions=["QB","RB","WR","TE","OT","IOL","EDGE","IDL","LB","CB","S","K/P"];
  // Map granular filter labels to prospect fields
  const posFilterMatch=(p,filterLabel)=>{
    if(!p)return false;
    const gpos=p.gpos||p.pos;
    if(filterLabel==="OT")return p.pos==="OL"&&(gpos==="OT"||gpos==="T");
    if(filterLabel==="IOL")return p.pos==="OL"&&(gpos==="IOL"||gpos==="OG"||gpos==="OC"||gpos==="G"||gpos==="C"||gpos==="OL");
    if(filterLabel==="EDGE")return p.pos==="DL"&&(gpos==="EDGE"||gpos==="DE"||gpos==="OLB");
    if(filterLabel==="IDL")return p.pos==="DL"&&(gpos==="IDL"||gpos==="DT"||gpos==="NT"||gpos==="DL");
    if(filterLabel==="CB")return p.pos==="DB"&&(gpos==="CB");
    if(filterLabel==="S")return p.pos==="DB"&&(gpos==="S"||gpos==="SAF"||gpos==="FS"||gpos==="SS");
    return p.pos===filterLabel;
  };
  // Map granular position labels to colors (use parent colors where needed)
  const granularPosColor=(label)=>{
    if(label==="OT")return POS_COLORS["OT"]||POS_COLORS["OL"];
    if(label==="IOL")return POS_COLORS["IOL"]||POS_COLORS["OL"];
    if(label==="EDGE"||label==="IDL")return POS_COLORS["DL"];
    if(label==="CB"||label==="S")return POS_COLORS["DB"];
    return POS_COLORS[label]||"#999";
  };

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
    setTradeMap({});setLastVerdict(null);setTradeOffer(null);setShowTradeUp(false);setTradeValueDelta(0);setCpuTradeLog([]);
    if(trackEvent)trackEvent(userId,'mock_draft_sim_started',{team:[...userTeams].join(','),rounds:numRounds,speed,cpuTrades,boardMode,guest:!!isGuestUser});
  },[activeBoard,trackEvent,userId,isGuestUser,userTeams,numRounds,speed,cpuTrades,boardMode]);

  const cpuPick=useCallback((team,avail,pickNum)=>{
    const needs=teamNeeds[team]||["QB","WR","DL"];
    const dn=TEAM_NEEDS_DETAILED?.[team]||{};
    const prof=TEAM_PROFILES[team]||{bpaLean:0.55,posBoost:[],posPenalty:[],stage:"retool",reachTolerance:0.3,variance:2,gposBoost:[]};
    if(pickNum===1){const m=avail.find(id=>{const p=prospectsMap[id];return p&&p.name==="Fernando Mendoza";});if(m)return m;}

    // Elite slide protection: consensus top-5 talents that the CPU must not let fall
    // Love (RB) and Styles (S) get positionally discounted by the scoring formula,
    // but in reality teams would never pass on them this late. 85% chance to snap them up.
    if(pickNum>=6){
      const eliteSliders=[
        {name:"Jeremiyah Love",floor:8},
        {name:"Sonny Styles",floor:10},
      ];
      for(const es of eliteSliders){
        if(pickNum>es.floor){
          const match=avail.find(id=>{const p=prospectsMap[id];return p&&p.name===es.name;});
          if(match&&Math.random()<0.85)return match;
        }
      }
    }
    const round=pickNum<=32?1:pickNum<=64?2:pickNum<=100?3:pickNum<=144?4:pickNum<=180?5:pickNum<=220?6:7;

    // === STAGE-BASED BPA/NEED SHIFTS ===
    // Dynasty: talent-first, can afford luxury picks — heavy BPA
    // Contend: filling specific holes to make a run — heavy needs, willing to reach
    // Rebuild: accumulate talent early, fill needs later — BPA early, needs late
    // Retool: balanced approach
    let stageBpaShift=0, stageNeedShift=0;
    if(prof.stage==="dynasty"){stageBpaShift=0.15;stageNeedShift=-0.12;}
    else if(prof.stage==="contend"){stageBpaShift=-0.08;stageNeedShift=0.18;}
    else if(prof.stage==="rebuild"){stageBpaShift=round<=2?0.12:-0.05;stageNeedShift=round<=2?-0.1:0.15;}

    const bpaW=0.6+prof.bpaLean*0.8+stageBpaShift;
    const needW=1.15-prof.bpaLean+stageNeedShift;
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

      const slide=consRank<900?(pickNum-consRank):0;
      const gradeSlideMultiplier=grade>=88?6:grade>=80?4.5:3;
      const slideBoost=slide>6?Math.pow(slide-6,1.5)*gradeSlideMultiplier:0;
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

      // Scheme-specific granular position boost (gposBoost)
      const gpos=p.gpos||p.pos;
      const isSchemefit=(prof.gposBoost||[]).includes(gpos);
      const schemeBoost=isSchemefit?1.15:1.0;

      // Stage modifier — meaningful impact on scoring
      let stageMod=1.0;
      if(prof.stage==="dynasty"){
        // Dynasty teams take luxury BPA picks, less urgency on needs
        stageMod=grade>=85?1.15:nc>=2?1.05:0.95;
        // Dynasty teams more willing to take "best athlete" even at filled positions
        if(grade>=90&&alreadyAtPos<=1)stageMod*=1.1;
      }else if(prof.stage==="contend"){
        // Contenders aggressively fill needs, discount non-needs
        stageMod=nc>=2?1.25:nc>=1?1.12:ni>=0?1.0:0.82;
      }else if(prof.stage==="rebuild"){
        // Rebuilders take BPA in early rounds, shift to needs later
        if(round<=2){stageMod=grade>=80?1.15:1.0;}
        else{stageMod=nc>=2?1.2:nc>=1?1.1:0.9;}
      }else{
        // Retool: slight need boost, balanced
        stageMod=nc>=2?1.1:1.0;
      }

      const bpaComponent=base*finalBpaW*pm*rbPen*qbMod*teamPosBoost*schemeBoost;
      const needComponent=nm*finalNeedW*12;
      const score=(bpaComponent+needComponent+slideBoost-reachPenalty)*dimReturn*stageMod*runPenalty*urgencyBoost;
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

  // Compute contextual tags for available players during user picks: NEED, SLIDE, RIVAL
  const playerTags=useMemo(()=>{
    const tags={};// id -> [{tag,color,bg}]
    if(!isUserPick||available.length===0)return tags;
    const team=getPickTeam(picks.length);
    const pickNum=fullDraftOrder[picks.length]?.pick||1;
    const needs=teamNeeds[team]||["QB","WR","DL"];
    const dn=TEAM_NEEDS_DETAILED?.[team]||{};
    const rivals=DIVISION_RIVALS[team]||[];
    // Get rival top-2 LIVE needs within 7 picks
    const rivalTopNeeds=[];// [{team, positions:[pos1,pos2], pickIdx}]
    for(let i=picks.length+1;i<Math.min(picks.length+8,fullDraftOrder.length);i++){
      const t=getPickTeam(i);
      if(rivals.includes(t)){
        // Compute live needs for this rival (base needs minus what they've already drafted)
        const base={...(TEAM_NEEDS_DETAILED?.[t]||{})};
        picks.filter(pk=>pk.team===t).forEach(pk=>{const p=prospectsMap[pk.playerId];if(p&&base[p.pos]>0)base[p.pos]--;});
        // Find top-2 needs by remaining count
        const sorted=Object.entries(base).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);
        const topPositions=sorted.slice(0,2).map(([pos])=>pos);
        if(topPositions.length>0)rivalTopNeeds.push({team:t,positions:topPositions,pickIdx:i});
      }
    }
    // Pre-compute: for each position, what's the top 33% threshold among available?
    const posAvailCounts={};
    available.forEach(id=>{const p=prospectsMap[id];if(p)posAvailCounts[p.pos]=(posAvailCounts[p.pos]||0)+1;});
    const posTop33={};
    Object.entries(posAvailCounts).forEach(([pos,count])=>{posTop33[pos]=Math.ceil(count/3);});
    // Track position rank for each available player
    const posRankMap={};const posCounters={};
    available.forEach(id=>{const p=prospectsMap[id];if(!p)return;const pos=p.pos;posCounters[pos]=(posCounters[pos]||0)+1;posRankMap[id]=posCounters[pos];});
    // Track what team has already drafted
    const teamDrafted=picks.filter(pk=>pk.team===team).map(pk=>{const p=prospectsMap[pk.playerId];return p?p.pos:null;}).filter(Boolean);
    const posCounts={};teamDrafted.forEach(pos=>{posCounts[pos]=(posCounts[pos]||0)+1;});

    available.forEach(id=>{
      const p=prospectsMap[id];if(!p)return;
      const pos=p.pos;
      const t=[];
      // NEED: top-2 team need and not already over-drafted at this position
      const nc=dn[pos]||0;const ni=needs.indexOf(pos);
      const alreadyAtPos=posCounts[pos]||0;
      if((nc>=2||(nc>=1&&ni<=1)||(ni===0))&&alreadyAtPos<2){
        t.push({tag:"NEED",color:"#0369a1",bg:"#e0f2fe"});
      }
      // SLIDE: consensus rank is well above current pick (scaled by draft position)
      const consRank=getConsensusRank?getConsensusRank(p.name):999;
      const slideThreshold=pickNum<=15?5:pickNum<=32?7:pickNum<=64?12:15;
      if(consRank<900&&(pickNum-consRank)>=slideThreshold){
        t.push({tag:"SLIDE",color:"#c026d3",bg:"#fae8ff"});
      }
      // RIVAL: a division rival picking within 7 picks has this as their top-2 LIVE need,
      // AND this player is top 33% available at their position OR has 65+ grade
      const playerGrade=getConsensusGrade?getConsensusGrade(p.name):50;
      const posRank=posRankMap[id]||999;
      const top33Cutoff=posTop33[pos]||1;
      const isEliteAvail=posRank<=top33Cutoff||playerGrade>=65;
      if(isEliteAvail&&consRank<900){
        const matchingRival=rivalTopNeeds.find(r=>r.positions.includes(pos));
        if(matchingRival){
          t.push({tag:"RIVAL",color:"#dc2626",bg:"#fef2f2"});
        }
      }
      if(t.length>0)tags[id]=t;
    });
    return tags;
  },[isUserPick,available,picks,getPickTeam,fullDraftOrder,teamNeeds,TEAM_NEEDS_DETAILED,prospectsMap,getConsensusRank,gradeMap]);

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
    if(np.length>=totalPicks){
      setShowResults(true);
      if(trackEvent)trackEvent(userId,'mock_draft_completed',{team:[...userTeams].join(','),rounds:numRounds,totalPicks:np.length,guest:!!isGuestUser});
      if(onMockComplete){
        const mockId=crypto.randomUUID();
        onMockComplete(np.map(pk=>{
          const p=prospectsMap[pk.playerId];
          const cRank=p?getConsensusRank(p.name):null;
          const cGrade=p?(getConsensusGrade?getConsensusGrade(p.name):50):50;
          const v=p&&cRank?pickVerdict(pk.pick,cRank,cGrade):null;
          return{mockId,prospectName:p?.name||'',prospectPos:p?.gpos||p?.pos||'',team:pk.team,pickNumber:pk.pick,round:pk.round,isUserPick:pk.isUser,grade:v?v.grade:null};
        }));
      }
    }
  },[picks,fullDraftOrder,totalPicks,userTeams,prospectsMap,getConsensusRank,getPickTeam]);

  const undo=useCallback(()=>{
    if(picks.length===0)return;
    let li=-1;for(let i=picks.length-1;i>=0;i--){if(picks[i].isUser){li=i;break;}}
    if(li===-1)return;
    const kp=picks.slice(0,li);const ki=new Set(kp.map(p=>p.playerId));
    setPicks(kp);setAvailable(activeBoard.map(p=>p.id).filter(id=>!ki.has(id)));
    setLastVerdict(null);setShowResults(false);setTradeOffer(null);
  },[picks,activeBoard]);

  // === CPU-to-CPU TRADE-UP LOGIC ===
  const evaluateCpuTradeUp=useCallback((currentIdx)=>{
    if(!cpuTrades)return null;
    const currentTeam=getPickTeam(currentIdx);
    const currentPick=fullDraftOrder[currentIdx]?.pick;
    if(!currentPick||currentPick>64)return null; // only trade up in rounds 1-2

    // Teams that already traded up recently can't trade again for 8 picks
    const recentTraders=new Set(cpuTradeLog.filter(t=>currentIdx-t.pickIdx<8).map(t=>t.fromTeam));

    const candidateTeams=[];
    for(let i=currentIdx+2;i<Math.min(currentIdx+13,totalPicks);i++){
      const t=getPickTeam(i);
      if(!t||userTeams.has(t)||t===currentTeam)continue;
      const prof=TEAM_PROFILES[t]||{reachTolerance:0.3,stage:"retool",variance:2,bpaLean:0.5,posBoost:[]};
      if(recentTraders.has(t))continue; // cooldown

      // === PATH 1: ANALYTICAL — team has a clear target they love ===
      const needs=teamNeeds[t]||["QB","WR","DL"];
      const dn=TEAM_NEEDS_DETAILED?.[t]||{};
      let bestPlayer=null,bestScore=0,secondScore=0;
      available.forEach(id=>{
        const p=prospectsMap[id];if(!p)return;
        const pos=p.pos;
        const baseGrade=getConsensusGrade?getConsensusGrade(p.name):(0);
        const grade=GRADE_OVERRIDES[p.name]?Math.max(baseGrade,GRADE_OVERRIDES[p.name]):baseGrade;
        if(grade<70)return;
        const rawRank=getConsensusRank?getConsensusRank(p.name):999;
        const consRank=RANK_OVERRIDES[p.name]||rawRank;
        const nc=dn[pos]||0;const ni=needs.indexOf(pos);
        const slide=consRank<900?(currentPick-consRank):0;
        const needFit=nc>=2?2.0:nc>=1?1.5:ni>=0&&ni<3?1.2:ni>=0?1.0:0.5;
        const gradeScore=Math.pow(grade,1.2);
        const slideBonus=slide>3?slide*3:0;
        const isBoosted=prof.posBoost?.includes(pos)?1.15:1.0;
        const score=(gradeScore*needFit*isBoosted+slideBonus)*(0.85+Math.random()*0.30);
        if(score>bestScore){secondScore=bestScore;bestScore=score;bestPlayer={id,name:p.name,grade,consRank,pos,score};}
        else if(score>secondScore){secondScore=score;}
      });

      if(!bestPlayer)continue;
      const separation=secondScore>0?bestScore/secondScore:2.0;

      // Check trade value
      const theirPickIdx=i;
      const theirPickNum=fullDraftOrder[theirPickIdx]?.pick;
      const currentVal=getPickValue(currentPick);
      const theirVal=getPickValue(theirPickNum);
      let sweetenerIdx=null,sweetenerVal=0;
      for(let j=theirPickIdx+1;j<totalPicks;j++){
        if(getPickTeam(j)===t){sweetenerIdx=j;sweetenerVal=getPickValue(fullDraftOrder[j]?.pick||999);break;}
      }
      const totalOffer=theirVal+sweetenerVal;
      if(totalOffer<currentVal*0.78)continue; // teams frequently overpay

      // === PATH 2: IMPULSE — random chance based on team personality ===
      // Every aggressive team has a small chance to just trade up each pick
      const baseImpulse=prof.stage==="dynasty"?0.04:prof.stage==="contend"?0.05:prof.reachTolerance>=0.4?0.035:0.015;
      // Impulse increases in top 15 (more action at top of draft)
      const topBoost=currentPick<=10?1.6:currentPick<=20?1.3:1.0;
      // Impulse increases if their best player is a strong need fit
      const needBoost=separation>=1.15?1.4:1.0;
      const impulseChance=baseImpulse*topBoost*needBoost;

      // Analytical path: higher separation = higher chance
      const analyticalChance=separation>=1.30?0.35:separation>=1.15?0.18:0.0;

      // Combined: either path can trigger the trade
      const finalChance=Math.min(0.45,impulseChance+analyticalChance);
      if(Math.random()>finalChance)continue;

      candidateTeams.push({
        team:t,theirPickIdx,theirPickNum,sweetenerIdx,
        sweetenerPick:sweetenerIdx!==null?fullDraftOrder[sweetenerIdx]?.pick:null,
        sweetenerRound:sweetenerIdx!==null?fullDraftOrder[sweetenerIdx]?.round:null,
        targetPlayer:bestPlayer,separation,totalOffer,currentVal
      });
    }
    if(candidateTeams.length===0)return null;
    // Weighted random among candidates so different teams win each sim
    const weights=candidateTeams.map(c=>Math.pow(c.separation,2));
    const totalW=weights.reduce((a,b)=>a+b,0);
    let r=Math.random()*totalW;
    for(let ci=0;ci<candidateTeams.length;ci++){r-=weights[ci];if(r<=0)return candidateTeams[ci];}
    return candidateTeams[0];
  },[cpuTrades,cpuTradeLog,getPickTeam,fullDraftOrder,totalPicks,userTeams,teamNeeds,available,prospectsMap,getConsensusGrade,getConsensusRank,TEAM_NEEDS_DETAILED]);

  // CPU auto-pick — pauses when trade offer or trade panel is open
  useEffect(()=>{
    if(!setupDone||picks.length>=totalPicks||paused||tradeOffer||showTradeUp)return;
    const n=picks.length;const team=getPickTeam(n);
    if(userTeams.has(team))return;
    const timer=setTimeout(()=>{
      // Check for CPU-to-CPU trade-up first
      const cpuTrade=evaluateCpuTradeUp(n);
      if(cpuTrade){
        // Execute the trade: swap picks in tradeMap
        const tradingTeam=cpuTrade.team;
        setTradeMap(prev=>{
          const nm={...prev,[n]:tradingTeam,[cpuTrade.theirPickIdx]:team};
          if(cpuTrade.sweetenerIdx!==null)nm[cpuTrade.sweetenerIdx]=team;
          return nm;
        });
        // Log the trade for UI display
        const gaveLabels=[`Rd${fullDraftOrder[cpuTrade.theirPickIdx].round} #${cpuTrade.theirPickNum}`];
        if(cpuTrade.sweetenerIdx!==null)gaveLabels.push(`Rd${cpuTrade.sweetenerRound} #${cpuTrade.sweetenerPick}`);
        const gotLabels=[`Rd${fullDraftOrder[n].round} #${fullDraftOrder[n].pick}`];
        setCpuTradeLog(prev=>[...prev,{fromTeam:tradingTeam,toTeam:team,pickIdx:n,gave:gaveLabels,got:gotLabels,targetPlayer:cpuTrade.targetPlayer.name}]);
        // Execute the pick directly for the trading team (can't use makePick due to async tradeMap)
        const pid=cpuPick(tradingTeam,available,fullDraftOrder[n].pick);
        if(pid){
          const{round,pick}=fullDraftOrder[n];
          setPicks(prev=>[...prev,{pick,round,team:tradingTeam,playerId:pid,traded:true,isUser:false}]);
          setAvailable(prev=>prev.filter(id=>id!==pid));
          if(picks.length+1>=totalPicks)setShowResults(true);
        }
      }else{
        const pid=cpuPick(team,available,fullDraftOrder[n].pick);if(pid)makePick(pid);
      }
    },speed);
    return()=>clearTimeout(timer);
  },[picks,paused,available,userTeams,cpuPick,makePick,speed,setupDone,fullDraftOrder,totalPicks,getPickTeam,tradeOffer,showTradeUp,evaluateCpuTradeUp]);

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
    // When controlling all 32: allow trading with any team except the one currently picking
    if(userTeams.size>=ALL_TEAMS.length){
      const currentTeam=picks.length<totalPicks?getPickTeam(picks.length):null;
      return ALL_TEAMS.filter(t=>t!==currentTeam).sort();
    }
    return ALL_TEAMS.filter(t=>!userTeams.has(t)).sort();
  },[ALL_TEAMS,userTeams,picks.length,totalPicks,getPickTeam]);

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
    const allTeamAbbrs=Object.keys(NFL_ROSTERS);
    allTeamAbbrs.forEach(team=>{
      chart[team]={};const roster=NFL_ROSTERS[team]||{};
      // Start with roster in slots
      DEPTH_GROUPS.forEach(g=>{
        g.slots.forEach(s=>{if(roster[s])chart[team][s]={name:roster[s],isRoster:true};});
      });
    });
    // Also build for team names used in draft order (e.g. "Saints" → "NO")
    Object.entries(TEAM_ABBR).forEach(([name,abbr])=>{
      if(chart[name])return; // already built
      const roster=NFL_ROSTERS[abbr]||{};
      chart[name]={};
      DEPTH_GROUPS.forEach(g=>{
        g.slots.forEach(s=>{if(roster[s])chart[name][s]={name:roster[s],isRoster:true};});
      });
    });
    // Overlay drafted players
    const allDraftTeams=new Set(picks.map(pk=>pk.team));
    [...allDraftTeams].forEach(team=>{
      if(!chart[team])chart[team]={};
      const roster=NFL_ROSTERS[TEAM_ABBR[team]||team]||{};
      // Ensure base roster is loaded
      DEPTH_GROUPS.forEach(g=>{
        g.slots.forEach(s=>{if(roster[s]&&!chart[team][s])chart[team][s]={name:roster[s],isRoster:true};});
      });
      const teamPicks=picks.filter(pk=>pk.team===team);
      teamPicks.forEach(pk=>{
        const p=prospectsMap[pk.playerId];if(!p)return;
        const group=DEPTH_GROUPS.find(g=>g.posMatch===p.pos);if(!group)return;
        const grade=getConsensusGrade?getConsensusGrade(p.name):(gradeMap[pk.playerId]||50);
        const entry={name:p.name,isDraft:true};
        // Determine preferred starting slot based on granular position
        const gpos=p.gpos||p.pos;
        let preferredSlot=group.slots[0];
        // Build position-appropriate slot list for DL and DB
        let allowedSlots=group.slots;
        if(group.posMatch==="DL"){
          // EDGE/DE -> DE slots only, IDL/DT/NT -> DT slots only
          if(gpos==="IDL"||gpos==="DT"||gpos==="NT"){
            preferredSlot="DT1";
            allowedSlots=["DT1","DT2"];
          }else{
            preferredSlot="DE1";
            allowedSlots=["DE1","DE2"];
          }
        }else if(group.posMatch==="DB"){
          // S/SAF -> safety slots, CB -> CB slots
          if(gpos==="S"||gpos==="SAF"||gpos==="FS"||gpos==="SS"){
            preferredSlot="SS";
            allowedSlots=["SS","FS"];
          }else{
            preferredSlot="CB1";
            allowedSlots=["CB1","CB2"];
          }
        }else if(group.posMatch==="OL"){
          // IOL/OG/OC/G/C -> guard/center slots, OT/T -> tackle slots
          if(gpos==="IOL"||gpos==="OG"||gpos==="OC"||gpos==="G"||gpos==="C"){
            preferredSlot="LG";
            allowedSlots=["LG","C","RG"];
          }else{
            preferredSlot="LT";
            allowedSlots=["LT","RT"];
          }
        }
        // Determine target tier: 1=starter, 2=second string, 3=third string, 0=overflow
        let tier=0;
        if(pk.round===1){tier=1;}
        else if(pk.round===2){tier=grade>=85?1:grade>=70?2:3;}
        else if(pk.round===3){tier=grade>=80?2:3;}
        else{tier=grade>=70?3:0;}

        if(tier===1){
          // Starter: take preferred slot, cascade everyone down
          const s1=preferredSlot;
          const idx=allowedSlots.indexOf(s1);
          if(idx>=0&&chart[team][s1]){
            // Shift all players from preferred slot down by one
            for(let j=allowedSlots.length-1;j>idx;j--){
              if(chart[team][allowedSlots[j-1]])chart[team][allowedSlots[j]]=chart[team][allowedSlots[j-1]];
            }
          }
          chart[team][s1]=entry;
        }else if(tier===2){
          // Second string
          const target=allowedSlots[1]||allowedSlots[0];
          if(!chart[team][target]){
            chart[team][target]=entry;
          }else{
            const emptySlot=allowedSlots.find(s=>!chart[team][s]);
            if(emptySlot)chart[team][emptySlot]=entry;
            else{
              const oi=Object.keys(chart[team]).filter(k=>k.startsWith(allowedSlots[allowedSlots.length-1]+"_d")).length;
              chart[team][allowedSlots[allowedSlots.length-1]+"_d"+oi]=entry;
            }
          }
        }else if(tier===3){
          // Third string
          const target=allowedSlots.length>2?allowedSlots[2]:(allowedSlots[allowedSlots.length-1]||allowedSlots[0]);
          if(!chart[team][target]){
            chart[team][target]=entry;
          }else{
            const emptySlot=allowedSlots.find(s=>!chart[team][s]);
            if(emptySlot)chart[team][emptySlot]=entry;
            else{
              const oi=Object.keys(chart[team]).filter(k=>k.startsWith(allowedSlots[allowedSlots.length-1]+"_d")).length;
              chart[team][allowedSlots[allowedSlots.length-1]+"_d"+oi]=entry;
            }
          }
        }else{
          // Overflow: Rd 4-7 below 70 — new slot at end
          const target=allowedSlots[allowedSlots.length-1];
          if(!chart[team][target]){
            chart[team][target]=entry;
          }else{
            const emptySlot=allowedSlots.find(s=>!chart[team][s]);
            if(emptySlot)chart[team][emptySlot]=entry;
            else{
              const oi=Object.keys(chart[team]).filter(k=>k.startsWith(allowedSlots[allowedSlots.length-1]+"_d")).length;
              chart[team][allowedSlots[allowedSlots.length-1]+"_d"+oi]=entry;
            }
          }
        }
      });
    });
    return chart;
  },[picks,prospectsMap,getConsensusGrade,gradeMap]);

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
    let result=available;
    if(filterPos.size>0)result=result.filter(id=>{const p=prospectsMap[id];return p&&[...filterPos].some(f=>posFilterMatch(p,f));});
    if(traitFilter.size>0&&filterPos.size===1&&qualifiesForFilter){const rawPos=[...filterPos][0];const pos=rawPos==="IDL"?"DL":rawPos;result=result.filter(id=>[...traitFilter].some(t=>qualifiesForFilter(id,pos,t)));}
    return result;
  },[available,filterPos,prospectsMap,traitFilter,qualifiesForFilter]);

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

  const shareDraft=useCallback(async()=>{
    const up=picks.filter(pk=>pk.isUser);
    if(up.length===0)return;
    const isSingleTeam=userTeams.size===1;
    const isAllTeams=userTeams.size===32;
    if(!isSingleTeam&&!isAllTeams)return;

    const team=isSingleTeam?[...userTeams][0]:'NFL Draft';
    const teamPicks=isSingleTeam?up.filter(pk=>pk.team===team):up;
    const accent=NFL_TEAM_COLORS[team]||'#6366f1';
    const scale=2;

    const canvas=document.createElement('canvas');
    const ctx=canvas.getContext('2d');

    function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();}

    if(isSingleTeam){
      // ================================================================
      // SINGLE TEAM — light bg, tight layout
      // Logo in dark footer, spider card under picks
      // ================================================================
      const W=900,pad=32,colGap=24;
      const pickRowH=48;
      const depthRowH=16,depthGroupGap=4;

      // Depth chart data — flat, no group headers
      const chart=depthChart[team]||{};
      const depthGroups=DEPTH_GROUPS.map(g=>{
        const entries=g.slots.map(s=>({slot:s,entry:chart[s]})).filter(x=>x.entry);
        const extras=Object.entries(chart).filter(([k])=>g.slots.some(s=>k.startsWith(s+'_d'))).map(([k,v])=>({slot:k,entry:v}));
        return{label:g.label,items:[...entries,...extras]};
      }).filter(g=>g.items.length>0);
      const depthRowCount=depthGroups.reduce((s,g)=>s+g.items.length,0);

      // Best pick for radar
      const bestPick=teamPicks.reduce((best,pk)=>{const g=activeGrade(pk.playerId);return(!best||g>best.grade)?{pk,grade:g}:best;},null);
      const radarSize=220;
      const radarCardH=bestPick?radarSize+110:0;

      const depthTotalH=depthRowCount*depthRowH+depthGroups.length*depthGroupGap+20;
      const picksTotalH=24+teamPicks.length*pickRowH;
      const leftContentH=picksTotalH+radarCardH;
      const bodyH=Math.max(leftContentH,depthTotalH);
      const headerH=62;
      const footerH=60;
      const H=headerH+bodyH+footerH+pad;

      canvas.width=W*scale;canvas.height=H*scale;
      ctx.scale(scale,scale);

      ctx.fillStyle='#faf9f6';ctx.fillRect(0,0,W,H);
      // Pink→purple gradient top bar
      const tGrad=ctx.createLinearGradient(0,0,W,0);
      tGrad.addColorStop(0,'#ec4899');tGrad.addColorStop(1,'#7c3aed');
      ctx.fillStyle=tGrad;ctx.fillRect(0,0,W,4);
      // Thin team accent bar below
      ctx.fillStyle=accent;ctx.fillRect(0,4,W,2);

      // === HEADER ===
      ctx.textBaseline='top';ctx.textAlign='left';
      ctx.fillStyle='#171717';ctx.font='bold 22px -apple-system,system-ui,sans-serif';
      ctx.fillText('BIG BOARD LAB',pad,16);
      ctx.fillStyle='#a3a3a3';ctx.font='11px ui-monospace,monospace';
      ctx.fillText('2026 NFL MOCK DRAFT',pad,42);

      try{const tLogo=await loadImg(nflLogoUrl(team));ctx.drawImage(tLogo,W-pad-42,12,42,42);}catch(e){}
      ctx.textAlign='right';
      ctx.fillStyle='#171717';ctx.font='bold 18px -apple-system,system-ui,sans-serif';
      ctx.fillText(team,W-pad-50,16);
      if(draftGrade){ctx.fillStyle=draftGrade.color;ctx.font='bold 28px -apple-system,system-ui,sans-serif';ctx.fillText(draftGrade.grade,W-pad-50,36);}
      if(tradeValueDelta!==0){ctx.fillStyle=tradeValueDelta>0?'#16a34a':'#dc2626';ctx.font='9px ui-monospace,monospace';ctx.fillText('trade: '+(tradeValueDelta>0?'+':'')+tradeValueDelta+' pts',W-pad-50,draftGrade?64:42);}
      ctx.textAlign='left';

      ctx.fillStyle='#e5e5e5';ctx.fillRect(pad,headerH,W-pad*2,1);
      // Gradient separator
      const sGrad=ctx.createLinearGradient(pad,0,W-pad,0);
      sGrad.addColorStop(0,'#ec4899');sGrad.addColorStop(1,'#7c3aed');
      ctx.fillStyle=sGrad;ctx.fillRect(pad,headerH+1,W-pad*2,2);

      // === TWO COLUMNS ===
      const bodyY=headerH+12;
      const leftW=Math.round((W-pad*2-colGap)*0.52);
      const rightX=pad+leftW+colGap;
      const rightW=W-pad-rightX;

      // LEFT: PICKS
      ctx.fillStyle=accent;ctx.font='bold 9px ui-monospace,monospace';
      ctx.fillText('YOUR PICKS',pad,bodyY);
      let py=bodyY+20;
      for(const pk of teamPicks){
        const p=prospectsMap[pk.playerId];if(!p)continue;
        const g=activeGrade(pk.playerId);
        const rank=getConsensusRank?getConsensusRank(p.name):pk.pick;
        const g2=getConsensusGrade?getConsensusGrade(p.name):g;
        const v=pickVerdict(pk.pick,rank,g2);
        const c=POS_COLORS[p.gpos||p.pos]||POS_COLORS[p.pos]||'#525252';

        // Detect trade: was this pick slot originally owned by a different team?
        const pickIdx=picks.findIndex(x=>x.pick===pk.pick&&x.round===pk.round&&x.playerId===pk.playerId);
        const origOwner=pickIdx>=0?fullDraftOrder[pickIdx]?.team:null;
        const wasTrade=origOwner&&origOwner!==pk.team;

        ctx.fillStyle='#fff';rr(pad,py,leftW,pickRowH-3,5);ctx.fill();
        ctx.strokeStyle='#f0f0f0';ctx.lineWidth=0.5;ctx.stroke();
        ctx.fillStyle=accent;ctx.fillRect(pad,py+2,3,pickRowH-7);

        if(wasTrade){ctx.fillStyle='rgba(168,85,247,0.08)';const trdTxt='🔄 via '+(TEAM_ABBR[origOwner]||origOwner);ctx.font='bold 7px ui-monospace,monospace';const trdW=ctx.measureText(trdTxt).width+8;rr(pad+8,py+24,trdW,11,3);ctx.fill();ctx.fillStyle='#a855f7';ctx.fillText(trdTxt,pad+12,py+29);}

        ctx.fillStyle='#a3a3a3';ctx.font='10px ui-monospace,monospace';ctx.textAlign='left';
        ctx.fillText('Rd'+pk.round+' #'+pk.pick,pad+8,py+12);
        ctx.fillStyle=c;ctx.font='bold 10px ui-monospace,monospace';
        ctx.fillText(p.gpos||p.pos,pad+72,py+12);
        ctx.fillStyle='#171717';ctx.font='bold 15px -apple-system,system-ui,sans-serif';
        drawTrunc(ctx,p.name,pad+108,py+12,leftW-210);
        ctx.fillStyle='#a3a3a3';ctx.font='11px -apple-system,system-ui,sans-serif';
        drawTrunc(ctx,p.school||'',pad+108,py+28,leftW-210);
        // Trait badge emojis
        const pBadges=prospectBadges&&prospectBadges[pk.playerId]||[];
        if(pBadges.length>0){const schoolW=ctx.measureText(p.school||'').width;ctx.font='11px -apple-system,system-ui,sans-serif';let bx=pad+108+schoolW+6;pBadges.forEach(b=>{ctx.fillText(b.emoji,bx,py+27);bx+=14;});}

        // Verdict pill — measure AFTER setting the correct font
        ctx.font='bold 8px ui-monospace,monospace';
        const vw=ctx.measureText(v.text).width+14;
        const vx=pad+leftW-vw-34;
        ctx.fillStyle=v.bg;rr(vx,py+6,vw,16,8);ctx.fill();
        ctx.fillStyle=v.color;
        ctx.textAlign='center';
        ctx.fillText(v.text,vx+vw/2,py+12);
        ctx.textAlign='left';

        ctx.fillStyle=g>=75?'#16a34a':g>=55?'#ca8a04':'#dc2626';
        ctx.font='bold 16px -apple-system,system-ui,sans-serif';ctx.textAlign='right';
        ctx.fillText(String(g),pad+leftW-6,py+12);
        ctx.textAlign='left';
        py+=pickRowH;
      }

      // SCOUTING CARD — school logo, player info, grade, rank + radar
      if(bestPick){
        const bp=prospectsMap[bestPick.pk.playerId];
        if(bp){
          const cardY=py+12;
          const cardH=radarCardH-12;
          // Card bg
          ctx.fillStyle='#fff';rr(pad,cardY,leftW,cardH,8);ctx.fill();
          ctx.strokeStyle='#f0f0f0';ctx.lineWidth=0.5;ctx.stroke();
          ctx.fillStyle=accent;ctx.fillRect(pad,cardY+4,3,cardH-8);

          // School logo — left side of header
          const infoY=cardY+14;
          let schoolLoaded=false;
          try{
            const sUrl=schoolLogo(bp.school);
            if(sUrl){const sImg=await loadImg(sUrl);ctx.drawImage(sImg,pad+14,infoY,32,32);schoolLoaded=true;}
          }catch(e){}
          const textX=schoolLoaded?pad+54:pad+14;

          // Player name — bold
          ctx.fillStyle='#171717';ctx.font='bold 16px -apple-system,system-ui,sans-serif';ctx.textBaseline='top';
          ctx.fillText(bp.name,textX,infoY);

          // Position + School
          const bpPos=bp.gpos||bp.pos;
          const bpColor=POS_COLORS[bpPos]||POS_COLORS[bp.pos]||'#525252';
          ctx.fillStyle=bpColor;ctx.font='bold 10px ui-monospace,monospace';
          ctx.fillText(bpPos,textX,infoY+20);
          ctx.fillStyle='#a3a3a3';ctx.font='11px -apple-system,system-ui,sans-serif';
          ctx.fillText(bp.school||'',textX+ctx.measureText(bpPos).width+8,infoY+20);

          // Grade — right-aligned in header area
          const bpGrade=bestPick.grade;
          ctx.fillStyle=bpGrade>=75?'#16a34a':bpGrade>=55?'#ca8a04':'#dc2626';
          ctx.font='bold 28px -apple-system,system-ui,sans-serif';ctx.textAlign='right';
          ctx.fillText(String(bpGrade),pad+leftW-14,infoY);

          // Rank — below grade
          const bpRank=getConsensusRank?getConsensusRank(bp.name):null;
          if(bpRank&&bpRank<900){
            ctx.fillStyle='#a3a3a3';ctx.font='9px ui-monospace,monospace';
            ctx.fillText('CONSENSUS #'+bpRank,pad+leftW-14,infoY+28);
          }
          ctx.textAlign='left';

          // Thin divider
          ctx.fillStyle='#f0f0f0';ctx.fillRect(pad+14,infoY+40,leftW-28,1);

          // Radar centered below info
          const radarCx=pad+leftW/2;
          const radarCy=infoY+44+radarSize/2+8;
          drawRadarChart(ctx,bp,radarCy,radarCx,radarSize,accent);
        }
      }

      // RIGHT: DEPTH CHART (no group headers)
      ctx.fillStyle=accent;ctx.font='bold 9px ui-monospace,monospace';
      ctx.fillText('DEPTH CHART',rightX,bodyY);
      let dy=bodyY+20;
      for(const group of depthGroups){
        for(const{slot,entry}of group.items){
          const isDraft=entry.isDraft;
          ctx.fillStyle='#a3a3a3';ctx.font='9px ui-monospace,monospace';
          ctx.fillText(slot.replace(/_d\d+$/,'+'),rightX,dy+5);
          if(isDraft){ctx.fillStyle=accent;ctx.font='bold 11px -apple-system,system-ui,sans-serif';drawTrunc(ctx,entry.name+' ★',rightX+34,dy+5,rightW-38);}
          else{ctx.fillStyle='#525252';ctx.font='11px -apple-system,system-ui,sans-serif';drawTrunc(ctx,entry.name,rightX+34,dy+5,rightW-38);}
          dy+=depthRowH;
        }
        dy+=depthGroupGap;
      }

      // === DARK FOOTER with BBL logo ===
      const fy=H-footerH;
      ctx.fillStyle='#111111';ctx.fillRect(0,fy,W,footerH);
      try{const logo=new Image();logo.src=BBL_LOGO_B64;await new Promise((r,j)=>{logo.onload=r;logo.onerror=j;setTimeout(j,2000);});ctx.drawImage(logo,pad,fy+10,40,40);}catch(e){}
      ctx.fillStyle='#ffffff';ctx.font='bold 15px -apple-system,system-ui,sans-serif';ctx.textBaseline='top';
      ctx.fillText('bigboardlab.com',pad+48,fy+12);
      ctx.fillStyle='#737373';ctx.font='11px -apple-system,system-ui,sans-serif';
      ctx.fillText('Rank prospects · Grade them your way · The most realistic mock draft ever built',pad+48,fy+32);
      const bGrad=ctx.createLinearGradient(0,0,W,0);bGrad.addColorStop(0,'#ec4899');bGrad.addColorStop(1,'#7c3aed');
      ctx.fillStyle=bGrad;ctx.fillRect(0,H-3,W,3);

    }else{
      // ================================================================
      // ALL 32 — landscape 1200×675, light bg, dark footer
      // ================================================================
      const W=1200,H=714;
      canvas.width=W*scale;canvas.height=H*scale;
      ctx.scale(scale,scale);
      const pad=24;
      ctx.fillStyle='#faf9f6';ctx.fillRect(0,0,W,H);

      const grad=ctx.createLinearGradient(0,0,W,0);
      grad.addColorStop(0,'#ec4899');grad.addColorStop(1,'#7c3aed');
      ctx.fillStyle=grad;ctx.fillRect(0,0,W,4);

      ctx.textBaseline='top';
      ctx.textAlign='center';ctx.fillStyle='#171717';
      ctx.font='bold 18px -apple-system,system-ui,sans-serif';
      ctx.fillText('2026 NFL MOCK DRAFT — ROUND 1',W/2,14);
      ctx.fillStyle='#a3a3a3';ctx.font='11px ui-monospace,monospace';
      ctx.fillText('BIGBOARDLAB.COM',W/2,36);
      ctx.textAlign='left';
      ctx.fillStyle='#e5e5e5';ctx.fillRect(pad,52,W-pad*2,1);
      const sepGrad=ctx.createLinearGradient(pad,0,W-pad,0);
      sepGrad.addColorStop(0,'#ec4899');sepGrad.addColorStop(1,'#7c3aed');
      ctx.fillStyle=sepGrad;ctx.fillRect(pad,53,W-pad*2,2);

      const bodyY=62,cols=4,rows=8;
      const colW=(W-pad*2-((cols-1)*10))/cols;
      const rowH=74;

      const r1picks=picks.filter(pk=>pk.round===1).slice(0,32);
      const logoCache={};
      const uniqueTeams=[...new Set(r1picks.map(pk=>pk.team))];
      await Promise.all(uniqueTeams.map(async t=>{try{logoCache[t]=await loadImg(nflLogoUrl(t),2000);}catch(e){}}));

      for(let i=0;i<Math.min(r1picks.length,32);i++){
        const pk=r1picks[i];
        const p=prospectsMap[pk.playerId];if(!p)continue;
        const col=Math.floor(i/rows),row=i%rows;
        const x=pad+col*(colW+10),y=bodyY+row*rowH;
        const tAccent=NFL_TEAM_COLORS[pk.team]||'#6366f1';

        ctx.fillStyle='#fff';rr(x,y,colW,rowH-6,5);ctx.fill();
        ctx.strokeStyle='#f0f0f0';ctx.lineWidth=0.5;ctx.stroke();
        ctx.fillStyle=tAccent;ctx.fillRect(x,y+2,3,rowH-10);

        const origSlot=fullDraftOrder[i];
        const wasTrade=origSlot&&pk.team!==origSlot.team;

        ctx.fillStyle='#a3a3a3';ctx.font='bold 12px ui-monospace,monospace';ctx.textAlign='left';
        ctx.fillText('#'+(i+1),x+10,y+14);
        if(logoCache[pk.team])ctx.drawImage(logoCache[pk.team],x+38,y+5,24,24);
        ctx.fillStyle='#737373';ctx.font='10px -apple-system,system-ui,sans-serif';
        drawTrunc(ctx,pk.team,x+66,y+10,colW-76);

        if(wasTrade){const fromTeam=origSlot?origSlot.team:'';const tradeTxt=fromTeam?'via '+(TEAM_ABBR[fromTeam]||fromTeam):'TRD';ctx.fillStyle='rgba(168,85,247,0.08)';const tw=ctx.measureText(tradeTxt).width+8;rr(x+66,y+18,tw,12,3);ctx.fill();ctx.fillStyle='#a855f7';ctx.font='bold 7px ui-monospace,monospace';ctx.fillText(tradeTxt,x+70,y+24);}

        const c=POS_COLORS[p.gpos||p.pos]||POS_COLORS[p.pos]||'#737373';
        ctx.fillStyle=c;ctx.font='bold 10px ui-monospace,monospace';ctx.fillText(p.gpos||p.pos,x+10,y+38);
        ctx.fillStyle='#171717';ctx.font='bold 13px -apple-system,system-ui,sans-serif';drawTrunc(ctx,p.name,x+48,y+38,colW-56);
        ctx.fillStyle='#a3a3a3';ctx.font='10px -apple-system,system-ui,sans-serif';drawTrunc(ctx,p.school||'',x+48,y+54,colW-56);
        // Trait badge emojis
        const pBadges32=prospectBadges&&prospectBadges[pk.playerId]||[];
        if(pBadges32.length>0){ctx.font='10px -apple-system,system-ui,sans-serif';const sw=ctx.measureText(p.school||'').width;let bx=x+48+sw+4;pBadges32.forEach(b=>{ctx.fillText(b.emoji,bx,y+54);bx+=13;});}
      }

      // Dark footer
      const footerH=48;
      ctx.fillStyle='#111111';ctx.fillRect(0,H-footerH,W,footerH);
      try{const logo=new Image();logo.src=BBL_LOGO_B64;await new Promise((r,j)=>{logo.onload=r;logo.onerror=j;setTimeout(j,2000);});ctx.drawImage(logo,pad,H-footerH+8,32,32);}catch(e){}
      ctx.fillStyle='#ffffff';ctx.font='bold 13px -apple-system,system-ui,sans-serif';ctx.textBaseline='top';
      ctx.fillText('bigboardlab.com',pad+40,H-footerH+10);
      ctx.fillStyle='#737373';ctx.font='10px -apple-system,system-ui,sans-serif';
      ctx.fillText('The most realistic mock draft simulator ever built',pad+40,H-footerH+26);
      const bGrad32=ctx.createLinearGradient(0,0,W,0);bGrad32.addColorStop(0,'#ec4899');bGrad32.addColorStop(1,'#7c3aed');
      ctx.fillStyle=bGrad32;ctx.fillRect(0,H-3,W,3);
    }

    // === EXPORT — clipboard + toast on desktop, share sheet on mobile ===
    const label=isSingleTeam?team:'mock-draft';
    canvas.toBlob(async blob=>{
      if(trackEvent)trackEvent(userId,'share_results',{team:[...userTeams].join(','),grade:draftGrade?.grade||null,guest:!!isGuestUser});
      if(!blob){alert('Could not generate image');return;}
      const isMobile=/iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if(isMobile&&navigator.share&&navigator.canShare){
        try{
          const file=new File([blob],`bigboardlab-${label}.png`,{type:'image/png'});
          if(navigator.canShare({files:[file]})){await navigator.share({files:[file],title:'My Mock Draft — Big Board Lab',text:'Build yours at bigboardlab.com'});return;}
        }catch(e){}
      }
      // Desktop: clipboard + toast
      try{
        await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);
        // Show toast
        const toast=document.createElement('div');
        toast.textContent='✓ Copied to clipboard';
        Object.assign(toast.style,{position:'fixed',bottom:'32px',left:'50%',transform:'translateX(-50%)',background:'#171717',color:'#fff',padding:'10px 24px',borderRadius:'99px',fontSize:'14px',fontWeight:'600',fontFamily:'-apple-system,system-ui,sans-serif',zIndex:'99999',boxShadow:'0 4px 12px rgba(0,0,0,0.15)',transition:'opacity 0.3s'});
        document.body.appendChild(toast);
        setTimeout(()=>{toast.style.opacity='0';setTimeout(()=>toast.remove(),300);},2000);
      }catch(e){
        // Clipboard failed — fall back to download
        const url=URL.createObjectURL(blob);
        const a=document.createElement('a');a.href=url;a.download=`bigboardlab-${label}.png`;
        document.body.appendChild(a);a.click();document.body.removeChild(a);
        setTimeout(()=>URL.revokeObjectURL(url),3000);
      }
    },'image/png');
  },[picks,userTeams,prospectsMap,activeGrade,getConsensusRank,getConsensusGrade,draftGrade,tradeValueDelta,depthChart,POS_COLORS,cpuTradeLog,fullDraftOrder]);

  // Canvas helper: rounded rectangle path
  function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();}

  // Canvas radar chart — full trait labels
  function drawRadarChart(ctx,player,cy,cx,size,color){
    const pos=player.gpos||player.pos;
    const posTraits=POSITION_TRAITS[pos]||POSITION_TRAITS[player.pos]||[];
    if(posTraits.length===0)return;
    const r=size/2-32;const n=posTraits.length;
    const K=1.8;const curve=(v)=>Math.pow(v/100,K)*100;const FLOOR=curve(40);
    const angles=posTraits.map((_,i)=>(Math.PI*2*i)/n-Math.PI/2);
    const vals=posTraits.map(t=>tvFn(player.id,t));

    // Grid rings — non-linear spacing matching power curve
    [50,60,70,80,90,100].forEach(lv=>{
      const frac=Math.max(0,(curve(lv)-FLOOR)/(100-FLOOR));
      ctx.beginPath();
      angles.forEach((a,i)=>{const px=cx+r*frac*Math.cos(a);const py=cy+r*frac*Math.sin(a);i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);});
      ctx.closePath();ctx.strokeStyle=lv===70?'#d4d4d4':'#e5e5e5';ctx.lineWidth=lv===70?0.8:0.5;ctx.stroke();
    });
    // Axes
    angles.forEach(a=>{
      ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+r*Math.cos(a),cy+r*Math.sin(a));
      ctx.strokeStyle='#e5e5e5';ctx.lineWidth=0.5;ctx.stroke();
    });
    // Fill polygon — power curve applied to values
    ctx.beginPath();
    angles.forEach((a,i)=>{const v=Math.max(0,(curve(vals[i]||50)-FLOOR)/(100-FLOOR));const px=cx+r*v*Math.cos(a);const py=cy+r*v*Math.sin(a);i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);});
    ctx.closePath();ctx.fillStyle=color+'28';ctx.fill();
    ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke();
    // Dots
    angles.forEach((a,i)=>{const v=Math.max(0,(curve(vals[i]||50)-FLOOR)/(100-FLOOR));ctx.beginPath();ctx.arc(cx+r*v*Math.cos(a),cy+r*v*Math.sin(a),3.5,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();});
    // Labels — FULL trait names
    ctx.fillStyle='#737373';ctx.font='bold 9px -apple-system,system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
    posTraits.forEach((t,i)=>{
      const lr=r+24;const lx=cx+lr*Math.cos(angles[i]);const ly=cy+lr*Math.sin(angles[i]);
      const a=angles[i];
      if(Math.abs(Math.cos(a))>0.3){ctx.textAlign=Math.cos(a)>0?'left':'right';}else{ctx.textAlign='center';}
      ctx.fillText(t,lx,ly);
    });
    ctx.textAlign='left';ctx.textBaseline='top';
  }

  const userPickCount=useMemo(()=>picks.filter(p=>p.isUser).length,[picks]);

  // Sub-components
  const FormationChart=({team,maxW=280})=>{
    const chart=depthChart[team]||{};
    return(<svg viewBox="0 0 100 105" style={{width:"100%",maxWidth:maxW}}>
      <rect x="0" y="0" width="100" height="105" rx="4" fill="#faf9f6" stroke="#e5e5e5" strokeWidth="0.5"/>
      {[20,40,58,75,90].map(y=><line key={y} x1="2" y1={y} x2="98" y2={y} stroke="rgba(0,0,0,0.04)" strokeWidth="0.3"/>)}
      <line x1="2" y1="58" x2="98" y2="58" stroke="rgba(124,58,237,0.3)" strokeWidth="0.5" strokeDasharray="2,1.5"/>
      {Object.entries(FORMATION_POS).map(([slot,pos])=>{
        const entry=chart[slot];const filled=!!entry;const isDraft=entry?.isDraft;const isOff=pos.y>58;
        const dotColor=isDraft?"#7c3aed":filled?(isOff?"#3b82f6":"#60a5fa"):"#d4d4d4";
        const lastName=entry?shortName(entry.name):"";
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
        const extras=Object.entries(chart).filter(([k])=>group.slots.some(s=>k.startsWith(s+"_d"))).map(([k,v])=>({slot:k,entry:v}));
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
  // If launching from home screen, show a loading state instead of setup screen during auto-start
  if(!setupDone&&mockLaunchTeam&&mockLaunchTeam instanceof Set&&mockLaunchTeam.size>0)return(
    <div style={{minHeight:"100vh",background:"#faf9f6",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:32,marginBottom:8}}>🏈</div>
        <div style={{fontFamily:mono,fontSize:11,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase"}}>setting up war room...</div>
      </div>
    </div>
  );

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
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase"}}>cpu trades</div>
              <p style={{fontFamily:sans,fontSize:11,color:"#a3a3a3",margin:"4px 0 0"}}>CPU teams can trade up with each other when elite players slide</p>
            </div>
            <button onClick={()=>setCpuTrades(prev=>!prev)} style={{width:48,height:26,borderRadius:13,border:"none",background:cpuTrades?"linear-gradient(135deg,#a855f7,#ec4899)":"#d4d4d4",cursor:"pointer",position:"relative",transition:"background 0.2s"}}><div style={{width:20,height:20,borderRadius:10,background:"#fff",position:"absolute",top:3,left:cpuTrades?25:3,transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}/></button>
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
            {myGuys&&<button onClick={()=>{if(isGuest){onRequireAuth("want to see and share the guys you draft more than others?");return;}if(trackEvent)trackEvent(userId,'my_guys_viewed',{count:(myGuys||[]).length});setShowMyGuysOverlay(true);if(setMyGuysUpdated)setMyGuysUpdated(false);}} style={{fontFamily:sans,fontSize:12,fontWeight:600,padding:"8px 16px",background:myGuysUpdated?"linear-gradient(135deg,#ec4899,#7c3aed)":mockCount>0?"#171717":"transparent",color:myGuysUpdated||mockCount>0?"#fff":"#a3a3a3",border:myGuysUpdated||mockCount>0?"none":"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",position:"relative",transition:"all 0.2s"}}>
              👀 my guys
              {myGuysUpdated&&<span style={{position:"absolute",top:-2,right:-2,width:8,height:8,borderRadius:4,background:"#ec4899",border:"2px solid #faf9f6"}}/>}
            </button>}
          </div>

          {/* Post-draft ranking CTA — challenge user to build their own board */}
          {onRankPosition&&(()=>{
            const unrankedPositions=["QB","RB","WR","TE","OT","IOL","EDGE","DL","LB","CB","S"].filter(pos=>!rankedGroups?.has(pos));
            const mapToRankPos=(p)=>{
              const pos=p.gpos||p.pos;
              if(p.pos==="OL")return(pos==="IOL"||pos==="OG"||pos==="OC"||pos==="G"||pos==="C")?"IOL":"OT";
              if(p.pos==="DL")return(pos==="EDGE"||pos==="DE"||pos==="OLB")?"EDGE":"DL";
              if(p.pos==="DB")return(pos==="S"||pos==="SAF"||pos==="FS"||pos==="SS")?"S":"CB";
              return p.pos;
            };

            // Priority 1: User's own pick was a huge steal or big reach
            const userDraftPicks=picks.filter(pk=>pk.isUser&&pk.round<=3);
            let ctaPick=null;
            for(const pk of userDraftPicks){
              const p=prospectsMap[pk.playerId];if(!p)continue;
              const rank=getConsensusRank?getConsensusRank(p.name):pk.pick;
              const g2=getConsensusGrade?getConsensusGrade(p.name):50;
              const v=pickVerdict(pk.pick,rank,g2);
              const pos=mapToRankPos(p);
              if((v.text==="HUGE STEAL"||v.text==="BIG REACH")&&unrankedPositions.includes(pos)){
                ctaPick={player:p,pick:pk.pick,pos,verdict:v,isUserPick:true};break;
              }
            }

            // Priority 2: CPU pick that was controversial, with variance
            if(!ctaPick){
              const cpuCandidates=[];
              picks.forEach(pk=>{
                if(pk.isUser||pk.pick<=3)return;// skip top 3 to avoid "#2 every time"
                const p=prospectsMap[pk.playerId];if(!p)return;
                const pos=mapToRankPos(p);
                if(!unrankedPositions.includes(pos))return;
                const rank=getConsensusRank?getConsensusRank(p.name):pk.pick;
                const g2=getConsensusGrade?getConsensusGrade(p.name):50;
                const v=pickVerdict(pk.pick,rank,g2);
                if(v.text==="REACH"||v.text==="BIG REACH"||v.text==="HUGE STEAL"||v.text==="GREAT VALUE"){
                  cpuCandidates.push({player:p,pick:pk.pick,pos,verdict:v,isUserPick:false});
                }
              });
              // Shuffle and pick one randomly for variance
              if(cpuCandidates.length>0){
                ctaPick=cpuCandidates[Math.floor(Math.random()*cpuCandidates.length)];
              }
            }

            // Priority 3: Generic unranked position suggestion
            const suggestPos=ctaPick?ctaPick.pos:unrankedPositions[0];
            if(!suggestPos)return null;

            return<div style={{background:"linear-gradient(135deg,#fdf4ff,#f5f3ff)",border:"1px solid #e9d5ff",borderRadius:12,padding:"16px 20px",marginBottom:20,textAlign:"left"}}>
              <div style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"#7c3aed",textTransform:"uppercase",marginBottom:6}}>
                {ctaPick?.isUserPick?"your pick, your call":"make it your draft"}
              </div>
              {ctaPick?
                <p style={{fontFamily:sans,fontSize:13,color:"#525252",margin:"0 0 12px",lineHeight:1.5}}>
                  <strong style={{color:"#171717"}}>{ctaPick.player.name}</strong> went at pick #{ctaPick.pick} — a <strong style={{color:ctaPick.verdict.color}}>{ctaPick.verdict.text.toLowerCase()}</strong>.
                  {ctaPick.isUserPick
                    ?" Where do you actually rank the "+suggestPos+"s? Build your board and find out."
                    :" Rank the "+suggestPos+"s yourself and your mock drafts can reflect your evaluations."}
                </p>
              :
                <p style={{fontFamily:sans,fontSize:13,color:"#525252",margin:"0 0 12px",lineHeight:1.5}}>
                  Build your own {suggestPos} rankings and your mock drafts can reflect your evaluations instead of consensus.
                </p>
              }
              <button onClick={()=>onRankPosition(suggestPos)} style={{fontFamily:sans,fontSize:13,fontWeight:700,padding:"10px 24px",background:"#7c3aed",color:"#fff",border:"none",borderRadius:99,cursor:"pointer"}}>
                rank {suggestPos}s my way →
              </button>
            </div>;
          })()}
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
              <div style={{display:"flex",gap:16,alignItems:"flex-start",flexWrap:"wrap"}}>
                <div style={{flex:"1 1 280px",minWidth:260,background:"#fff",borderRadius:12,padding:"16px"}}>
                  <FormationChart team={team}/>
                </div>
                <div style={{flex:"1 1 280px",minWidth:200,background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"12px 16px"}}>
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

        {/* My Guys overlay — results screen (matches homepage view) */}
        {showMyGuysOverlay&&(()=>{
          const TRAIT_MAP=POSITION_TRAITS;
          const emptySlots=Array.from({length:Math.max(0,10-(myGuys||[]).length)});
          const guys=(myGuys||[]).map(g=>{const p=PROSPECTS.find(pr=>pr.name===g.name);return{...g,prospect:p,gpos:p?.gpos||g.pos,school:p?.school||"",id:p?.id};});
          const fingerprint=(()=>{
            if(guys.length<5)return[];
            const pills=[];
            const posCounts={};
            guys.forEach(g=>{const pos=g.gpos==="K"||g.gpos==="P"||g.gpos==="LS"?"K/P":g.gpos;posCounts[pos]=(posCounts[pos]||0)+1;});
            const topPos=Object.entries(posCounts).sort((a,b)=>b[1]-a[1]);
            if(topPos.length>0&&topPos[0][1]>=Math.ceil(guys.length*0.3)){
              const[pos,cnt]=topPos[0];
              pills.push({emoji:(POS_EMOJI||{})[pos]||"📋",text:`${pos} heavy`,detail:`${cnt}/${guys.length}`,color:POS_COLORS[pos]||"#525252"});
            }else if(topPos.length>=4&&topPos[0][1]-topPos[topPos.length-1][1]<=1){
              pills.push({emoji:"🔀",text:"balanced board",detail:"",color:"#525252"});
            }
            const traitCounts={};
            guys.forEach(g=>{if(!g.id)return;const badges=prospectBadges[g.id]||[];badges.forEach(b=>{traitCounts[b.trait]=(traitCounts[b.trait]||0)+1;});});
            const topTraits=Object.entries(traitCounts).filter(([,c])=>c>=3).sort((a,b)=>b[1]-a[1]).slice(0,2);
            topTraits.forEach(([trait,cnt])=>{
              const labels={"Pass Rush":"pass rush magnet","Speed":"speed obsessed","Man Coverage":"lockdown lean","Accuracy":"accuracy snob","Motor":"motor lovers","Ball Skills":"ball hawk bias","Tackling":"sure tacklers","Vision":"vision seekers","Hands":"reliable hands","First Step":"first step fanatic","Athleticism":"athletic bias"};
              pills.push({emoji:(TRAIT_EMOJI||{})[trait]||"⭐",text:labels[trait]||trait.toLowerCase(),detail:`${cnt}x`,color:"#7c3aed"});
            });
            const ceilCounts={elite:0,high:0,normal:0,capped:0};
            guys.forEach(g=>{const sc=getScoutingTraits(g.name,g.school);const c=sc?.__ceiling||"normal";ceilCounts[c]++;});
            const upside=ceilCounts.elite+ceilCounts.high;
            if(upside>=Math.ceil(guys.length*0.6)){
              pills.push({emoji:"⭐",text:"ceiling chaser",detail:`${upside}/${guys.length} high+`,color:"#ea580c"});
            }else if(ceilCounts.capped>=Math.ceil(guys.length*0.3)){
              pills.push({emoji:"🔒",text:"floor first",detail:`${ceilCounts.capped} capped`,color:"#64748b"});
            }
            const avgDelta=guys.reduce((s,g)=>s+g.delta,0)/guys.length;
            if(avgDelta>10)pills.push({emoji:"📈",text:"value hunter",detail:`+${Math.round(avgDelta)} avg`,color:"#16a34a"});
            else if(avgDelta<-5)pills.push({emoji:"🎲",text:"reach drafter",detail:`${Math.round(avgDelta)} avg`,color:"#dc2626"});
            else pills.push({emoji:"⚖️",text:"consensus aligned",detail:`${avgDelta>0?"+":""}${Math.round(avgDelta)}`,color:"#525252"});
            if(SCHOOL_CONFERENCE){
              const confCounts={};
              guys.forEach(g=>{const conf=SCHOOL_CONFERENCE[g.school];if(conf&&conf!=="FCS"&&conf!=="D2"&&conf!=="D3"&&conf!=="Ind")confCounts[conf]=(confCounts[conf]||0)+1;});
              const topConf=Object.entries(confCounts).sort((a,b)=>b[1]-a[1]);
              if(topConf.length>0&&topConf[0][1]>=Math.ceil(guys.length*0.5))pills.push({emoji:"🏈",text:`${topConf[0][0]} lean`,detail:`${topConf[0][1]}/${guys.length}`,color:"#0369a1"});
            }
            const schoolCounts={};
            guys.forEach(g=>{if(g.school)schoolCounts[g.school]=(schoolCounts[g.school]||0)+1;});
            const repeats=Object.entries(schoolCounts).filter(([,c])=>c>=2).sort((a,b)=>b[1]-a[1]);
            if(repeats.length>0){const[sch,cnt]=repeats[0];pills.push({emoji:"🏫",text:`${sch} pipeline`,detail:`${cnt}`,color:"#7c3aed"});}
            return pills.slice(0,6);
          })();
          return<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setShowMyGuysOverlay(false)}>
          <div style={{background:"#faf9f6",borderRadius:16,padding:24,maxWidth:720,width:"100%",maxHeight:"85vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <h2 style={{fontFamily:font,fontSize:24,fontWeight:900,color:"#171717",margin:0,letterSpacing:-0.5}}>👀 my guys</h2>
              <button onClick={()=>setShowMyGuysOverlay(false)} style={{fontFamily:sans,fontSize:14,color:"#a3a3a3",background:"none",border:"none",cursor:"pointer",padding:"4px 8px"}}>✕</button>
            </div>
            <p style={{fontFamily:sans,fontSize:13,color:"#737373",margin:"0 0 4px",lineHeight:1.5}}>the prospects you bang the table for every time you mock</p>
            <p style={{fontFamily:mono,fontSize:10,letterSpacing:1.5,color:"#a3a3a3",textTransform:"uppercase",margin:"0 0 12px"}}>{mockCount||0} mock{(mockCount||0)!==1?"s":""} completed · {(myGuys||[]).length}/10 guys identified</p>

            {fingerprint.length>0&&<div style={{marginBottom:16}}>
              <div style={{fontFamily:mono,fontSize:9,letterSpacing:1.5,color:"#a3a3a3",textTransform:"uppercase",marginBottom:8}}>scouting fingerprint</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {fingerprint.map((pill,i)=><span key={i} style={{fontFamily:sans,fontSize:11,fontWeight:600,color:pill.color,background:`${pill.color}0d`,border:`1px solid ${pill.color}22`,padding:"4px 10px",borderRadius:99,display:"inline-flex",alignItems:"center",gap:4,whiteSpace:"nowrap"}}>
                  <span>{pill.emoji}</span><span>{pill.text}</span>{pill.detail&&<span style={{fontFamily:mono,fontSize:9,opacity:0.7}}>({pill.detail})</span>}
                </span>)}
              </div>
            </div>}

            {(!myGuys||myGuys.length===0)?<div style={{textAlign:"center",padding:"32px 0"}}><div style={{fontSize:32,marginBottom:8}}>👀</div><p style={{fontFamily:sans,fontSize:14,color:"#a3a3a3"}}>complete a mock to start discovering your guys</p></div>
            :<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))",gap:12}}>
              {myGuys.map((g,i)=>{
                const c=POS_COLORS[g.pos]||"#525252";
                const prospect=PROSPECTS.find(p=>p.name===g.name);
                const traitPos=g.pos==="DB"?(getProspectStats(g.name)?.gpos||"CB"):g.pos==="OL"?"OT":g.pos;
                const traitKeys=TRAIT_MAP[traitPos]||TRAIT_MAP["QB"];
                const traitVals=traitKeys.map(t=>tvFn(prospect?.id,t)/100);
                const cx=60,cy=60,r=45,n=traitKeys.length;
                const pts=(vals)=>vals.map((v,j)=>{const a=(Math.PI*2*j/n)-Math.PI/2;return[cx+r*v*Math.cos(a),cy+r*v*Math.sin(a)];});
                const poly=(p)=>p.map(pt=>pt.join(",")).join(" ");
                const gridLevels=[0.25,0.5,0.75,1];
                return<div key={g.name} style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:14,padding:16,cursor:"pointer",transition:"border-color 0.15s"}} onClick={()=>{if(prospect)setProfilePlayer(prospect);}} onMouseEnter={e=>e.currentTarget.style.borderColor=c} onMouseLeave={e=>e.currentTarget.style.borderColor="#e5e5e5"}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                    <span style={{fontFamily:font,fontSize:18,fontWeight:900,color:"#d4d4d4"}}>{i+1}</span>
                    <SchoolLogo school={prospect?.school||""} size={24}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontFamily:sans,fontSize:14,fontWeight:700,color:"#171717",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{g.name}</div>
                      <div style={{fontFamily:mono,fontSize:10,color:"#a3a3a3"}}>{prospect?.school||""}</div>
                    </div>
                    <span style={{fontFamily:mono,fontSize:10,fontWeight:600,color:c,background:`${c}0d`,padding:"2px 8px",borderRadius:4}}>{g.pos}</span>
                  </div>
                  <svg viewBox="0 0 120 120" style={{width:"100%",maxWidth:160,margin:"0 auto",display:"block"}}>
                    {gridLevels.map(lv=><polygon key={lv} points={poly(pts(traitKeys.map(()=>lv)))} fill="none" stroke="#e5e5e5" strokeWidth={lv===1?0.8:0.4}/>)}
                    {traitKeys.map((t,j)=>{const a=(Math.PI*2*j/n)-Math.PI/2;const lx=cx+r*1.18*Math.cos(a);const ly=cy+r*1.18*Math.sin(a);return<text key={t} x={lx} y={ly} textAnchor="middle" dominantBaseline="central" style={{fontSize:3.5,fill:"#a3a3a3",fontFamily:mono}}>{t.split(" ")[0]}</text>;})}
                    <polygon points={poly(pts(traitVals))} fill={`${c}20`} stroke={c} strokeWidth={1.2}/>
                    {pts(traitVals).map(([px,py],j)=><circle key={j} cx={px} cy={py} r={1.5} fill={c}/>)}
                  </svg>
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:8,padding:"8px 0 0",borderTop:"1px solid #f5f5f5"}}>
                    <div style={{textAlign:"center"}}><div style={{fontFamily:mono,fontSize:8,color:"#a3a3a3",textTransform:"uppercase",letterSpacing:1}}>you pick</div><div style={{fontFamily:font,fontSize:16,fontWeight:900,color:"#171717"}}>{g.avgPick}</div></div>
                    <div style={{textAlign:"center"}}><div style={{fontFamily:mono,fontSize:8,color:"#a3a3a3",textTransform:"uppercase",letterSpacing:1}}>consensus</div><div style={{fontFamily:font,fontSize:16,fontWeight:900,color:"#a3a3a3"}}>{g.consensusRank}</div></div>
                    <div style={{textAlign:"center"}}><div style={{fontFamily:mono,fontSize:8,color:"#a3a3a3",textTransform:"uppercase",letterSpacing:1}}>score</div><div style={{fontFamily:font,fontSize:16,fontWeight:900,color:"#171717"}}>{g.score}</div></div>
                    <div style={{textAlign:"center"}}><div style={{fontFamily:mono,fontSize:8,color:"#a3a3a3",textTransform:"uppercase",letterSpacing:1}}>drafted</div><div style={{fontFamily:font,fontSize:16,fontWeight:900,color:"#171717"}}>{g.timesDrafted}x</div></div>
                  </div>
                </div>;
              })}
              {emptySlots.map((_,i)=><div key={`empty${i}`} style={{background:"#faf9f6",border:"2px dashed #e5e5e5",borderRadius:14,padding:16,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:200}}>
                <div style={{fontFamily:font,fontSize:24,fontWeight:900,color:"#e5e5e5"}}>{(myGuys||[]).length+i+1}</div>
                <div style={{fontFamily:sans,fontSize:11,color:"#d4d4d4",textAlign:"center",marginTop:4}}>mock more to discover</div>
              </div>)}
            </div>}
          </div>
        </div>;
        })()}
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
          {pick.traded&&(()=>{const ct=cpuTradeLog.find(t=>t.pickIdx===i);return ct?<span title={`${ct.fromTeam} traded ${ct.gave.join(" + ")} to ${ct.toTeam} for ${ct.got.join(" + ")}`} style={{fontFamily:mono,fontSize:7,color:"#a855f7",background:"rgba(168,85,247,0.08)",padding:"1px 4px",borderRadius:2,cursor:"help"}}>🔄 TRD</span>:<span style={{fontFamily:mono,fontSize:7,color:"#a855f7",background:"rgba(168,85,247,0.03)",padding:"1px 4px",borderRadius:2}}>TRD</span>;})()}
        </div></div>;
      })}
      {picks.length<totalPicks&&<div style={{padding:"8px 10px",display:"flex",alignItems:"center",gap:5}}>
        <NFLTeamLogo team={currentTeam} size={13}/>
        <span style={{fontFamily:mono,fontSize:9,color:"#a3a3a3"}}>#{picks.length+1} {currentTeam}...</span>
      </div>}
    </div>
  </div>);

  const depthPanel=showDepth&&(<div style={{maxHeight:isMobile?"none":"calc(100vh - 60px)",overflowY:"auto"}}>
    {userTeams.size>1&&<div style={{display:"flex",gap:3,marginBottom:6,overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none",msOverflowStyle:"none"}}>
      {[...userTeams].map((team,i)=>(
        <button key={team} onClick={()=>setDepthTeamIdx(i)} style={{fontFamily:sans,fontSize:10,fontWeight:depthTeamIdx===i?700:400,padding:"4px 6px",background:depthTeamIdx===i?"#171717":"#f5f5f5",color:depthTeamIdx===i?"#faf9f6":"#737373",border:"1px solid #e5e5e5",borderRadius:6,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:3,whiteSpace:"nowrap",flexShrink:0}}>
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
        <style>{`.trait-pills-scroll::-webkit-scrollbar{display:none;}`}</style>
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
            {positions.map(pos=><button key={pos} onClick={()=>setFilterPos(prev=>{const n=new Set(prev);if(n.has(pos))n.delete(pos);else n.add(pos);return n;})} style={{fontFamily:mono,fontSize:10,padding:"4px 10px",background:filterPos.has(pos)?granularPosColor(pos):"transparent",color:filterPos.has(pos)?"#fff":granularPosColor(pos),border:"1px solid "+(filterPos.has(pos)?granularPosColor(pos):"#e5e5e5"),borderRadius:99,cursor:"pointer",flexShrink:0}}>{pos}</button>)}
          </div>
          {filterPos.size===1&&(()=>{const rawPos=[...filterPos][0];const pos=rawPos==="IDL"?"DL":rawPos;const posTraits=(POSITION_TRAITS||{})[pos]||[];if(!posTraits.length)return null;const c=(POS_COLORS||{})[pos]||(POS_COLORS||{})[rawPos]||"#525252";return<div className="trait-pills-scroll" style={{display:"flex",gap:4,padding:"0 12px 6px",overflowX:"auto",WebkitOverflowScrolling:"touch",flexWrap:"nowrap",scrollbarWidth:"none"}}>{posTraits.map(trait=>{const active=traitFilter.has(trait);const count=available.filter(id=>qualifiesForFilter&&qualifiesForFilter(id,pos,trait)).length;return<button key={trait} onClick={()=>setTraitFilter(prev=>{const n=new Set(prev);n.has(trait)?n.delete(trait):n.add(trait);return n;})} style={{fontFamily:mono,fontSize:9,padding:"3px 8px",background:active?c+"18":"transparent",color:active?"#171717":"#525252",border:"1px solid "+(active?c+"44":c+"25"),borderRadius:99,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",gap:3,whiteSpace:"nowrap"}}><span>{(TRAIT_EMOJI||{})[trait]}</span><span>{TRAIT_SHORT[trait]||trait}</span><span style={{fontSize:8,opacity:0.7}}>({count})</span></button>;})}</div>;})()}
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
            {filteredAvailable.length===0&&traitFilter.size>0&&<div style={{padding:"16px",textAlign:"center",fontFamily:sans,fontSize:12,color:"#a3a3a3",fontStyle:"italic"}}>no available prospects meet this threshold</div>}
            {filteredAvailable.slice(0,60).map(id=>{const p=prospectsMap[id];if(!p)return null;const g=activeGrade(id);const c=POS_COLORS[p.pos];const rank=boardRankMap[id];const tags=playerTags[id]||[];
              return<div key={id} style={{display:"flex",alignItems:"center",gap:5,padding:"8px 10px",borderBottom:"1px solid #f8f8f8",background:tags.length>0&&isUserPick?"rgba(240,249,255,0.5)":"transparent"}}>
                {rank?<span style={{fontFamily:mono,fontSize:8,color:"#d4d4d4",width:20,textAlign:"right"}}>#{rank}</span>:<span style={{fontFamily:mono,fontSize:8,color:"#e5e5e5",width:20,textAlign:"right"}}>—</span>}
                <span style={{fontFamily:mono,fontSize:9,color:c,width:32}}>{p.gpos||p.pos}</span>
                <SchoolLogo school={p.school} size={18}/>
                <span style={{fontFamily:sans,fontSize:12,fontWeight:600,color:"#171717",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} onClick={()=>setProfilePlayer(p)}>{p.name}</span>
                {isUserPick&&tags.map(t=><span key={t.tag} style={{fontFamily:mono,fontSize:7,fontWeight:700,color:t.color,background:t.bg,padding:"2px 5px",borderRadius:3,flexShrink:0,letterSpacing:0.5}}>{t.tag}</span>)}
                {(prospectBadges&&prospectBadges[id]||[]).map(b=><span key={b.trait} title={b.trait+" "+b.score} style={{fontFamily:mono,fontSize:7,fontWeight:700,color:c,background:c+"0d",padding:"2px 4px",borderRadius:3,flexShrink:0}}>{b.emoji}</span>)}
                <span style={{fontFamily:font,fontSize:13,fontWeight:900,color:g>=75?"#16a34a":g>=55?"#ca8a04":"#dc2626",width:24,textAlign:"right"}}>{g}</span>
                {isUserPick&&<button onClick={()=>makePick(id)} style={{fontFamily:sans,fontSize:10,fontWeight:700,padding:"4px 10px",background:"#22c55e",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",flexShrink:0}}>draft</button>}
              </div>;
            })}
          </div>
        </div>

        {/* Sticky bottom: needs + your picks */}
        <div style={{position:"sticky",bottom:0,zIndex:100,background:"#fff",borderTop:"1px solid #e5e5e5",padding:"8px 12px"}}>
          {/* Depth chart floating button */}
          <button onClick={()=>{if(!depthSheetTeam||!userTeams.has(depthSheetTeam))setDepthSheetTeam([...userTeams][0]||currentTeam);setMobileDepthOpen(true);}} style={{position:"absolute",top:-48,right:12,fontFamily:sans,fontSize:11,fontWeight:700,padding:"8px 14px",background:"#171717",color:"#faf9f6",border:"none",borderRadius:99,cursor:"pointer",boxShadow:"0 2px 8px rgba(0,0,0,0.15)",display:"flex",alignItems:"center",gap:6,zIndex:101}}>
            <NFLTeamLogo team={[...userTeams][0]||currentTeam} size={16}/><span>depth</span>
          </button>
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
                  <span style={{fontFamily:sans,fontSize:10,fontWeight:600,color:"#171717",whiteSpace:"nowrap"}}>{shortName(p.name)}</span>
                  <span style={{fontFamily:mono,fontSize:7,color:"#a3a3a3"}}>#{pk.pick}</span>
                </div>;
              })}
            </div>
          </div>}
        </div>

        {/* Mobile depth chart bottom sheet */}
        {mobileDepthOpen&&<div style={{position:"fixed",inset:0,zIndex:250,display:"flex",flexDirection:"column",justifyContent:"flex-end"}} onClick={()=>setMobileDepthOpen(false)}>
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.4)"}}/>
          <div style={{position:"relative",background:"#faf9f6",borderRadius:"20px 20px 0 0",maxHeight:"85vh",display:"flex",flexDirection:"column",boxShadow:"0 -4px 20px rgba(0,0,0,0.1)"}} onClick={e=>e.stopPropagation()}>
            {/* Drag handle */}
            <div style={{display:"flex",justifyContent:"center",padding:"10px 0 4px"}}>
              <div style={{width:36,height:4,background:"#d4d4d4",borderRadius:2}}/>
            </div>
            {/* Header with team selector */}
            <div style={{padding:"4px 16px 10px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <NFLTeamLogo team={depthSheetTeam} size={20}/>
                  <span style={{fontFamily:font,fontSize:16,fontWeight:900,color:"#171717"}}>{depthSheetTeam}</span>
                  <span style={{fontFamily:mono,fontSize:9,color:"#a3a3a3"}}>{picks.filter(pk=>pk.team===depthSheetTeam).length} drafted</span>
                </div>
                <button onClick={()=>setMobileDepthOpen(false)} style={{fontFamily:sans,fontSize:11,color:"#a3a3a3",background:"none",border:"1px solid #e5e5e5",borderRadius:99,padding:"4px 10px",cursor:"pointer"}}>✕</button>
              </div>
              {userTeams.size>1&&<div style={{display:"flex",gap:4,marginTop:8,overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
                {[...userTeams].map(t=><button key={t} onClick={()=>setDepthSheetTeam(t)} style={{fontFamily:sans,fontSize:10,fontWeight:depthSheetTeam===t?700:400,padding:"4px 10px",background:depthSheetTeam===t?"#171717":"transparent",color:depthSheetTeam===t?"#faf9f6":"#737373",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",gap:4}}><NFLTeamLogo team={t} size={12}/>{t}</button>)}
              </div>}
            </div>
            {/* Scrollable content */}
            <div style={{flex:1,overflowY:"auto",padding:"0 12px 20px",WebkitOverflowScrolling:"touch"}}>
              <FormationChart team={depthSheetTeam} maxW={600}/>
              <div style={{marginTop:12,background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"10px 12px"}}>
                <div style={{fontFamily:mono,fontSize:8,letterSpacing:1.5,color:"#a3a3a3",textTransform:"uppercase",marginBottom:6}}>depth chart</div>
                <DepthList team={depthSheetTeam} dark={false}/>
              </div>
              <div style={{marginTop:10}}>
                <LiveNeeds team={depthSheetTeam}/>
              </div>
            </div>
          </div>
        </div>}

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

        {/* My Guys overlay — dismissible modal on desktop draft screen (matches homepage view) */}
        {showMyGuysOverlay&&(()=>{
          const TRAIT_MAP=POSITION_TRAITS;
          const emptySlots=Array.from({length:Math.max(0,10-(myGuys||[]).length)});
          const guys=(myGuys||[]).map(g=>{const p=PROSPECTS.find(pr=>pr.name===g.name);return{...g,prospect:p,gpos:p?.gpos||g.pos,school:p?.school||"",id:p?.id};});
          const fingerprint=(()=>{
            if(guys.length<5)return[];
            const pills=[];
            const posCounts={};
            guys.forEach(g=>{const pos=g.gpos==="K"||g.gpos==="P"||g.gpos==="LS"?"K/P":g.gpos;posCounts[pos]=(posCounts[pos]||0)+1;});
            const topPos=Object.entries(posCounts).sort((a,b)=>b[1]-a[1]);
            if(topPos.length>0&&topPos[0][1]>=Math.ceil(guys.length*0.3)){
              const[pos,cnt]=topPos[0];
              pills.push({emoji:(POS_EMOJI||{})[pos]||"📋",text:`${pos} heavy`,detail:`${cnt}/${guys.length}`,color:POS_COLORS[pos]||"#525252"});
            }else if(topPos.length>=4&&topPos[0][1]-topPos[topPos.length-1][1]<=1){
              pills.push({emoji:"🔀",text:"balanced board",detail:"",color:"#525252"});
            }
            const traitCounts={};
            guys.forEach(g=>{if(!g.id)return;const badges=prospectBadges[g.id]||[];badges.forEach(b=>{traitCounts[b.trait]=(traitCounts[b.trait]||0)+1;});});
            const topTraits=Object.entries(traitCounts).filter(([,c])=>c>=3).sort((a,b)=>b[1]-a[1]).slice(0,2);
            topTraits.forEach(([trait,cnt])=>{
              const labels={"Pass Rush":"pass rush magnet","Speed":"speed obsessed","Man Coverage":"lockdown lean","Accuracy":"accuracy snob","Motor":"motor lovers","Ball Skills":"ball hawk bias","Tackling":"sure tacklers","Vision":"vision seekers","Hands":"reliable hands","First Step":"first step fanatic","Athleticism":"athletic bias"};
              pills.push({emoji:(TRAIT_EMOJI||{})[trait]||"⭐",text:labels[trait]||trait.toLowerCase(),detail:`${cnt}x`,color:"#7c3aed"});
            });
            const ceilCounts={elite:0,high:0,normal:0,capped:0};
            guys.forEach(g=>{const sc=getScoutingTraits(g.name,g.school);const c=sc?.__ceiling||"normal";ceilCounts[c]++;});
            const upside=ceilCounts.elite+ceilCounts.high;
            if(upside>=Math.ceil(guys.length*0.6)){
              pills.push({emoji:"⭐",text:"ceiling chaser",detail:`${upside}/${guys.length} high+`,color:"#ea580c"});
            }else if(ceilCounts.capped>=Math.ceil(guys.length*0.3)){
              pills.push({emoji:"🔒",text:"floor first",detail:`${ceilCounts.capped} capped`,color:"#64748b"});
            }
            const avgDelta=guys.reduce((s,g)=>s+g.delta,0)/guys.length;
            if(avgDelta>10)pills.push({emoji:"📈",text:"value hunter",detail:`+${Math.round(avgDelta)} avg`,color:"#16a34a"});
            else if(avgDelta<-5)pills.push({emoji:"🎲",text:"reach drafter",detail:`${Math.round(avgDelta)} avg`,color:"#dc2626"});
            else pills.push({emoji:"⚖️",text:"consensus aligned",detail:`${avgDelta>0?"+":""}${Math.round(avgDelta)}`,color:"#525252"});
            if(SCHOOL_CONFERENCE){
              const confCounts={};
              guys.forEach(g=>{const conf=SCHOOL_CONFERENCE[g.school];if(conf&&conf!=="FCS"&&conf!=="D2"&&conf!=="D3"&&conf!=="Ind")confCounts[conf]=(confCounts[conf]||0)+1;});
              const topConf=Object.entries(confCounts).sort((a,b)=>b[1]-a[1]);
              if(topConf.length>0&&topConf[0][1]>=Math.ceil(guys.length*0.5))pills.push({emoji:"🏈",text:`${topConf[0][0]} lean`,detail:`${topConf[0][1]}/${guys.length}`,color:"#0369a1"});
            }
            const schoolCounts={};
            guys.forEach(g=>{if(g.school)schoolCounts[g.school]=(schoolCounts[g.school]||0)+1;});
            const repeats=Object.entries(schoolCounts).filter(([,c])=>c>=2).sort((a,b)=>b[1]-a[1]);
            if(repeats.length>0){const[sch,cnt]=repeats[0];pills.push({emoji:"🏫",text:`${sch} pipeline`,detail:`${cnt}`,color:"#7c3aed"});}
            return pills.slice(0,6);
          })();
          return<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setShowMyGuysOverlay(false)}>
          <div style={{background:"#faf9f6",borderRadius:16,padding:24,maxWidth:720,width:"100%",maxHeight:"85vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <h2 style={{fontFamily:font,fontSize:24,fontWeight:900,color:"#171717",margin:0,letterSpacing:-0.5}}>👀 my guys</h2>
              <button onClick={()=>setShowMyGuysOverlay(false)} style={{fontFamily:sans,fontSize:14,color:"#a3a3a3",background:"none",border:"none",cursor:"pointer",padding:"4px 8px"}}>✕</button>
            </div>
            <p style={{fontFamily:sans,fontSize:13,color:"#737373",margin:"0 0 4px",lineHeight:1.5}}>the prospects you bang the table for every time you mock</p>
            <p style={{fontFamily:mono,fontSize:10,letterSpacing:1.5,color:"#a3a3a3",textTransform:"uppercase",margin:"0 0 12px"}}>{mockCount||0} mock{(mockCount||0)!==1?"s":""} completed · {(myGuys||[]).length}/10 guys identified</p>

            {fingerprint.length>0&&<div style={{marginBottom:16}}>
              <div style={{fontFamily:mono,fontSize:9,letterSpacing:1.5,color:"#a3a3a3",textTransform:"uppercase",marginBottom:8}}>scouting fingerprint</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {fingerprint.map((pill,i)=><span key={i} style={{fontFamily:sans,fontSize:11,fontWeight:600,color:pill.color,background:`${pill.color}0d`,border:`1px solid ${pill.color}22`,padding:"4px 10px",borderRadius:99,display:"inline-flex",alignItems:"center",gap:4,whiteSpace:"nowrap"}}>
                  <span>{pill.emoji}</span><span>{pill.text}</span>{pill.detail&&<span style={{fontFamily:mono,fontSize:9,opacity:0.7}}>({pill.detail})</span>}
                </span>)}
              </div>
            </div>}

            {(!myGuys||myGuys.length===0)?<div style={{textAlign:"center",padding:"32px 0"}}><div style={{fontSize:32,marginBottom:8}}>👀</div><p style={{fontFamily:sans,fontSize:14,color:"#a3a3a3"}}>complete a mock to start discovering your guys</p></div>
            :<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))",gap:12}}>
              {myGuys.map((g,i)=>{
                const c=POS_COLORS[g.pos]||"#525252";
                const prospect=PROSPECTS.find(p=>p.name===g.name);
                const traitPos=g.pos==="DB"?(getProspectStats(g.name)?.gpos||"CB"):g.pos==="OL"?"OT":g.pos;
                const traitKeys=TRAIT_MAP[traitPos]||TRAIT_MAP["QB"];
                const traitVals=traitKeys.map(t=>tvFn(prospect?.id,t)/100);
                const cx=60,cy=60,r=45,n=traitKeys.length;
                const pts=(vals)=>vals.map((v,j)=>{const a=(Math.PI*2*j/n)-Math.PI/2;return[cx+r*v*Math.cos(a),cy+r*v*Math.sin(a)];});
                const poly=(p)=>p.map(pt=>pt.join(",")).join(" ");
                const gridLevels=[0.25,0.5,0.75,1];
                return<div key={g.name} style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:14,padding:16,cursor:"pointer",transition:"border-color 0.15s"}} onClick={()=>{if(prospect)setProfilePlayer(prospect);}} onMouseEnter={e=>e.currentTarget.style.borderColor=c} onMouseLeave={e=>e.currentTarget.style.borderColor="#e5e5e5"}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                    <span style={{fontFamily:font,fontSize:18,fontWeight:900,color:"#d4d4d4"}}>{i+1}</span>
                    <SchoolLogo school={prospect?.school||""} size={24}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontFamily:sans,fontSize:14,fontWeight:700,color:"#171717",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{g.name}</div>
                      <div style={{fontFamily:mono,fontSize:10,color:"#a3a3a3"}}>{prospect?.school||""}</div>
                    </div>
                    <span style={{fontFamily:mono,fontSize:10,fontWeight:600,color:c,background:`${c}0d`,padding:"2px 8px",borderRadius:4}}>{g.pos}</span>
                  </div>
                  <svg viewBox="0 0 120 120" style={{width:"100%",maxWidth:160,margin:"0 auto",display:"block"}}>
                    {gridLevels.map(lv=><polygon key={lv} points={poly(pts(traitKeys.map(()=>lv)))} fill="none" stroke="#e5e5e5" strokeWidth={lv===1?0.8:0.4}/>)}
                    {traitKeys.map((t,j)=>{const a=(Math.PI*2*j/n)-Math.PI/2;const lx=cx+r*1.18*Math.cos(a);const ly=cy+r*1.18*Math.sin(a);return<text key={t} x={lx} y={ly} textAnchor="middle" dominantBaseline="central" style={{fontSize:3.5,fill:"#a3a3a3",fontFamily:mono}}>{t.split(" ")[0]}</text>;})}
                    <polygon points={poly(pts(traitVals))} fill={`${c}20`} stroke={c} strokeWidth={1.2}/>
                    {pts(traitVals).map(([px,py],j)=><circle key={j} cx={px} cy={py} r={1.5} fill={c}/>)}
                  </svg>
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:8,padding:"8px 0 0",borderTop:"1px solid #f5f5f5"}}>
                    <div style={{textAlign:"center"}}><div style={{fontFamily:mono,fontSize:8,color:"#a3a3a3",textTransform:"uppercase",letterSpacing:1}}>you pick</div><div style={{fontFamily:font,fontSize:16,fontWeight:900,color:"#171717"}}>{g.avgPick}</div></div>
                    <div style={{textAlign:"center"}}><div style={{fontFamily:mono,fontSize:8,color:"#a3a3a3",textTransform:"uppercase",letterSpacing:1}}>consensus</div><div style={{fontFamily:font,fontSize:16,fontWeight:900,color:"#a3a3a3"}}>{g.consensusRank}</div></div>
                    <div style={{textAlign:"center"}}><div style={{fontFamily:mono,fontSize:8,color:"#a3a3a3",textTransform:"uppercase",letterSpacing:1}}>score</div><div style={{fontFamily:font,fontSize:16,fontWeight:900,color:"#171717"}}>{g.score}</div></div>
                    <div style={{textAlign:"center"}}><div style={{fontFamily:mono,fontSize:8,color:"#a3a3a3",textTransform:"uppercase",letterSpacing:1}}>drafted</div><div style={{fontFamily:font,fontSize:16,fontWeight:900,color:"#171717"}}>{g.timesDrafted}x</div></div>
                  </div>
                </div>;
              })}
              {emptySlots.map((_,i)=><div key={`empty${i}`} style={{background:"#faf9f6",border:"2px dashed #e5e5e5",borderRadius:14,padding:16,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:200}}>
                <div style={{fontFamily:font,fontSize:24,fontWeight:900,color:"#e5e5e5"}}>{(myGuys||[]).length+i+1}</div>
                <div style={{fontFamily:sans,fontSize:11,color:"#d4d4d4",textAlign:"center",marginTop:4}}>mock more to discover</div>
              </div>)}
            </div>}
          </div>
        </div>;
        })()}
      </div>
    );
  }

  // === DESKTOP DRAFT SCREEN ===
  return(
    <div style={{minHeight:"100vh",background:"#faf9f6",fontFamily:font}}>
      <style>{`.trait-pills-scroll::-webkit-scrollbar{display:none;}`}</style>
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
            {positions.map(pos=><button key={pos} onClick={()=>setFilterPos(prev=>{const n=new Set(prev);if(n.has(pos))n.delete(pos);else n.add(pos);return n;})} style={{fontFamily:mono,fontSize:10,padding:"4px 10px",background:filterPos.has(pos)?granularPosColor(pos):"transparent",color:filterPos.has(pos)?"#fff":granularPosColor(pos),border:"1px solid "+(filterPos.has(pos)?granularPosColor(pos):"#e5e5e5"),borderRadius:99,cursor:"pointer"}}>{pos}</button>)}
          </div>
          {filterPos.size===1&&(()=>{const rawPos=[...filterPos][0];const pos=rawPos==="IDL"?"DL":rawPos;const posTraits=(POSITION_TRAITS||{})[pos]||[];if(!posTraits.length)return null;const c=(POS_COLORS||{})[pos]||(POS_COLORS||{})[rawPos]||"#525252";return<div className="trait-pills-scroll" style={{display:"flex",gap:4,marginBottom:6,overflowX:"auto",WebkitOverflowScrolling:"touch",flexWrap:"nowrap",scrollbarWidth:"none"}}>{posTraits.map(trait=>{const active=traitFilter.has(trait);const count=available.filter(id=>qualifiesForFilter&&qualifiesForFilter(id,pos,trait)).length;return<button key={trait} onClick={()=>setTraitFilter(prev=>{const n=new Set(prev);n.has(trait)?n.delete(trait):n.add(trait);return n;})} style={{fontFamily:mono,fontSize:9,padding:"3px 8px",background:active?c+"18":"transparent",color:active?"#171717":"#525252",border:"1px solid "+(active?c+"44":c+"25"),borderRadius:99,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",gap:3,whiteSpace:"nowrap"}}><span>{(TRAIT_EMOJI||{})[trait]}</span><span>{TRAIT_SHORT[trait]||trait}</span><span style={{fontSize:8,opacity:0.7}}>({count})</span></button>;})}</div>;})()}

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
            {filteredAvailable.length===0&&traitFilter.size>0&&<div style={{padding:"16px",textAlign:"center",fontFamily:sans,fontSize:12,color:"#a3a3a3",fontStyle:"italic"}}>no available prospects meet this threshold</div>}
            {filteredAvailable.slice(0,60).map(id=>{const p=prospectsMap[id];if(!p)return null;const g=activeGrade(id);const c=POS_COLORS[p.pos];const inC=compareList.some(x=>x.id===p.id);const rank=boardRankMap[id];const tags=playerTags[id]||[];
              return<div key={id} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderBottom:"1px solid #f8f8f8",background:tags.length>0&&isUserPick?"rgba(240,249,255,0.4)":"transparent"}}>
                {rank?<span style={{fontFamily:mono,fontSize:8,color:"#d4d4d4",width:22,textAlign:"right"}}>#{rank}</span>:<span style={{fontFamily:mono,fontSize:8,color:"#e5e5e5",width:22,textAlign:"right"}}>—</span>}
                <span style={{fontFamily:mono,fontSize:9,color:c,width:24}}>{p.gpos||p.pos}</span>
                <SchoolLogo school={p.school} size={16}/>
                <span style={{fontFamily:sans,fontSize:11,fontWeight:600,color:"#171717",flex:1,cursor:"pointer"}} onClick={()=>setProfilePlayer(p)} onMouseEnter={e=>e.currentTarget.style.textDecoration="underline"} onMouseLeave={e=>e.currentTarget.style.textDecoration="none"}>{p.name}</span>
                {isUserPick&&tags.map(t=><span key={t.tag} style={{fontFamily:mono,fontSize:7,fontWeight:700,color:t.color,background:t.bg,padding:"2px 5px",borderRadius:3,flexShrink:0,letterSpacing:0.5}}>{t.tag}</span>)}
                {(prospectBadges&&prospectBadges[id]||[]).map(b=><span key={b.trait} title={b.trait+" "+b.score} style={{fontFamily:mono,fontSize:7,fontWeight:700,color:c,background:c+"0d",padding:"2px 4px",borderRadius:3,flexShrink:0}}>{b.emoji}</span>)}
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
            {compareList.map(p=>{const c=POS_COLORS[p.gpos||p.pos]||POS_COLORS[p.pos];const pt=POSITION_TRAITS[p.gpos||p.pos]||POSITION_TRAITS[p.pos]||[];const g=activeGrade(p.id);const rank=getConsensusRank?getConsensusRank(p.name):null;const ps=getProspectStats(p.name,p.school);const posRank=ps?.posRank;
              // Precompute per-trait max/min for color coding
              const traitMaxMin={};
              pt.forEach(t=>{
                const vals=compareList.map(cp=>tvFn(cp.id,t));
                traitMaxMin[t]={max:Math.max(...vals),min:Math.min(...vals)};
              });
              return<div key={p.id} style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:16,textAlign:"center"}}>
                <SchoolLogo school={p.school} size={40}/>
                <div style={{fontFamily:font,fontSize:16,fontWeight:900,color:"#171717",marginTop:8}}>{p.name}</div>
                <div style={{fontFamily:mono,fontSize:10,color:"#a3a3a3"}}>{p.school}</div>
                <span style={{fontFamily:mono,fontSize:10,color:c,background:c+"11",padding:"2px 8px",borderRadius:4,border:"1px solid "+c+"22",display:"inline-block",margin:"6px 0"}}>{p.gpos||p.pos}</span>
                {rank&&rank<400&&<div style={{fontFamily:mono,fontSize:9,color:"#a3a3a3"}}>consensus #{rank}{posRank&&<span> · {p.gpos||p.pos} #{posRank}</span>}</div>}
                <div style={{fontFamily:font,fontSize:32,fontWeight:900,color:g>=75?"#16a34a":g>=55?"#ca8a04":"#dc2626",lineHeight:1,margin:"8px 0"}}>{g}</div>
                <RadarChart traits={pt} values={pt.map(t=>tvFn(p.id,t))} color={c} size={140}/>
                <div style={{textAlign:"left",marginTop:8,background:"#fafaf9",borderRadius:8,padding:"8px 10px"}}>
                  {pt.map(t=>{
                    const val=tvFn(p.id,t);
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
                {isUserPick&&<button onClick={()=>{makePick(p.id);setShowCompare(false);setCompareList([]);}} style={{width:"100%",marginTop:10,fontFamily:sans,fontSize:11,fontWeight:700,padding:"6px",background:"#22c55e",color:"#fff",border:"none",borderRadius:6,cursor:"pointer"}}>draft {shortName(p.name)}</button>}
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
