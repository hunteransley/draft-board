import { useState, useEffect, useCallback, useMemo, useRef, memo } from "react";
import NFL_ROSTERS from "./nflRosters.js";
import FA_FLAGS from "./freeAgencyFlags.js";
import { getScoutingTraits } from "./scoutingData.js";
import { getCombineScores } from "./combineTraits.js";
import { getStatBasedTraits } from "./statTraits.js";
import { getProspectStats } from "./prospectStats.js";
import { DEPTH_GROUPS, ALL_SLOTS, TEAM_SCHEME, TEAM_ABBR, getFormationPos, getSchemeDepthGroups } from "./depthChartUtils.js";
import { POS_DRAFT_VALUE, RANK_OVERRIDES, GRADE_OVERRIDES, TEAM_PROFILES, SCHEME_INFLECTIONS, DRAFT_ORDER, getPickRound } from "./draftConfig.js";
import { TEAM_NEEDS_COUNTS } from "./teamNeedsData.js";
import { ROSTER_BY_SLOT, ROSTER_BY_NAME, formatContract, formatTradeValue, TIER_COLORS, AVAILABILITY_DISPLAY } from "./rosterValueData.js";
import { GM_PARAMS, generateSimNoise, generateAllBoards, pickFromBoard, normalizeAbbr } from "./gmBoardGenerator.js";
import ARCHETYPE_DATA from "./archetypeData.json";

// Archetype display label overrides (when the data key is too long or needs cleanup)
const ARCHETYPE_DISPLAY={"Slot / Nickel":"Slot","All-Purpose / Three-Down":"All-Purpose","Thumper / Run Stuffer":"Thumper","Hybrid / Chess Piece":"Chess Piece","Box Safety / Run Support":"Box","Center Field / Free Safety":"Center Field","Versatile / Complete":"Complete","Gap / Power Scheme":"Gap/Power","H-Back / Versatile":"H-Back","Y / Inline":"Inline","F / Move":"Move","X / Boundary":"Boundary"};
// Archetype emojis — unique per archetype, no conflicts with trait or measurable emojis
const ARCHETYPE_EMOJI={
  "Pocket Passer":"🗽","Dual-Threat":"🎭","Game Manager":"👔","Gunslinger":"🔫",
  "Power Back":"🐗","Speed Back":"🏁","Receiving Back":"🪃","All-Purpose / Three-Down":"♠️",
  "X / Boundary":"🍿","Slot":"🎰","Deep Threat":"🐆","Possession":"🛟","YAC Weapon":"🦇",
  "Y / Inline":"🐏","F / Move":"🏄","Receiving TE":"🎣","H-Back / Versatile":"🧰",
  "Pass Protector":"🚧","Road Grader":"🦣","Athletic Tackle":"🦑",
  "Zone Scheme":"↔️","Gap / Power Scheme":"⬆️","Versatile":"🔄",
  "Speed Rusher":"🌪️","Power Rusher":"🦏","Versatile / Complete":"🐉","Run Defender":"🦍",
  "Penetrating 3-Tech":"🦡","Nose Tackle":"🐘","Two-Gap":"🐊",
  "Coverage LB":"☂️","Thumper / Run Stuffer":"🔨","Pass Rusher":"🦈","Sideline-to-Sideline":"🐺","Hybrid / Chess Piece":"👽",
  "Press Man":"🧟","Zone Corner":"🕸️","Slot / Nickel":"🦎",
  "Box Safety / Run Support":"🦂","Center Field / Free Safety":"🛸","Hybrid":"🎲",
};

// Canvas-based share image (no html2canvas dependency)

// Suffix-aware short name: "Rueben Bain Jr." → "Bain Jr." not "Jr."
const GEN_SUFFIXES=/^(Jr\.?|Sr\.?|II|III|IV|V|VI|VII|VIII)$/i;
function shortName(name){const p=name.split(" ");const last=p.pop()||"";return GEN_SUFFIXES.test(last)?(p.pop()||last)+" "+last:last;}


const JJ_VALUES={1:3000,2:2600,3:2200,4:1800,5:1700,6:1600,7:1500,8:1400,9:1350,10:1300,11:1250,12:1200,13:1150,14:1100,15:1050,16:1000,17:950,18:900,19:875,20:850,21:800,22:780,23:760,24:740,25:720,26:700,27:680,28:660,29:640,30:620,31:600,32:590,33:580,34:560,35:550,36:540,37:530,38:520,39:510,40:500,41:490,42:480,43:470,44:460,45:450,46:440,47:430,48:420,49:410,50:400,51:390,52:380,53:370,54:360,55:350,56:340,57:330,58:320,59:310,60:300,61:292,62:284,63:276,64:270,65:265,66:260,67:255,68:250,69:245,70:240,71:235,72:230,73:225,74:220,75:215,76:210,77:205,78:200,79:195,80:190,81:185,82:180,83:175,84:170,85:165,86:160,87:155,88:150,89:145,90:140,91:136,92:132,93:128,94:124,95:120,96:116,97:112,98:108,99:104,100:100};
function getPickValue(n){return JJ_VALUES[n]||Math.max(5,Math.round(100-((n-100)*0.72)));}

// Pure grade function — no hooks, callable anywhere
function scoreTeamPicks(teamPicks,team,prospectsMap,getConsensusRank,liveNeeds,TEAM_NEEDS_COUNTS){
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
  const base=TEAM_NEEDS_COUNTS?.[team]||{};
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

// DEPTH_GROUPS, ALL_SLOTS imported from depthChartUtils.js

// getFormationPos, getSchemeDepthGroups imported from depthChartUtils.js


// TEAM_ABBR, TEAM_SCHEME imported from depthChartUtils.js

const NFL_TEAM_COLORS={"49ers":"#AA0000",Raiders:"#A5ACAF",Jets:"#125740",Cardinals:"#97233F",Titans:"#4B92DB",Giants:"#0B2265",Browns:"#FF3C00",Commanders:"#5A1414",Saints:"#D3BC8D",Chiefs:"#E31837",Bengals:"#FB4F14",Dolphins:"#008E97",Cowboys:"#003594",Rams:"#003594",Falcons:"#A71930",Ravens:"#241773",Buccaneers:"#D50A0A",Colts:"#002C5F",Lions:"#0076B6",Vikings:"#4F2683",Panthers:"#0085CA",Packers:"#203731",Steelers:"#FFB612",Chargers:"#0080C6",Eagles:"#004C54",Bears:"#C83200",Bills:"#00338D",Texans:"#03202F",Broncos:"#FB4F14",Patriots:"#002244",Seahawks:"#69BE28",Jaguars:"#006778"};
const NFL_TEAM_ESPN_IDS={Raiders:13,Jets:20,Cardinals:22,Titans:10,Giants:19,Browns:5,Commanders:28,Saints:18,Chiefs:12,Bengals:4,Dolphins:15,Cowboys:6,Rams:14,Ravens:33,Buccaneers:27,Lions:8,Vikings:16,Panthers:29,Steelers:23,Chargers:24,Eagles:21,Bears:3,Bills:2,"49ers":25,Texans:34,Broncos:7,Patriots:17,Seahawks:26,Falcons:1,Colts:11,Jaguars:30,Packers:9};
function nflLogoUrl(team){const id=NFL_TEAM_ESPN_IDS[team];return id?`https://a.espncdn.com/i/teamlogos/nfl/500/${id}.png`:null;}
function loadImg(src,timeout=3000){return new Promise((res,rej)=>{const img=new Image();img.crossOrigin="anonymous";img.onload=()=>res(img);img.onerror=()=>rej();setTimeout(rej,timeout);img.src=src;});}
function drawTrunc(ctx,text,x,y,maxW){let t=text;while(ctx.measureText(t).width>maxW&&t.length>1)t=t.slice(0,-1);if(t!==text)t=t.slice(0,-1)+'…';ctx.fillText(t,x,y);}

// --- Module-level sub-components (extracted from MockDraftSim for stable reconciliation) ---

const FormationChart=memo(({team,depthChart,mono,sans})=>{
  const chart=depthChart[team]||{};
  const accent=NFL_TEAM_COLORS[team]||'#6366f1';
  const faAbbr=TEAM_ABBR[team]||team;
  const faList=FA_FLAGS[faAbbr]||[];
  return(<svg viewBox="-2 -2 104 109" style={{width:"100%"}}>
    <style>{`@keyframes draftPulse{0%{r:2.4;opacity:1}50%{r:4;opacity:.6}100%{r:2.4;opacity:1}}`}</style>
    <rect x="-2" y="-2" width="104" height="109" rx="4" fill="none" stroke="none"/>
    {[20,40,58,75,90].map(y=><line key={y} x1="2" y1={y} x2="98" y2={y} stroke="rgba(0,0,0,0.04)" strokeWidth="0.3"/>)}
    <line x1="2" y1="58" x2="98" y2="58" stroke={accent+"44"} strokeWidth="0.5" strokeDasharray="2,1.5"/>
    {Object.entries(getFormationPos(team)).map(([slot,pos])=>{
      const entry=chart[slot];const filled=!!entry;const isDraft=entry?.isDraft;
      if(!filled&&pos.schemeOnly)return null;
      if(pos.altFor&&chart[pos.altFor])return null;
      const rvSlot=ROSTER_BY_SLOT[team]?.[slot];const rv=filled&&!isDraft&&(rvSlot||(entry&&ROSTER_BY_NAME[entry.name])||Object.values(ROSTER_BY_SLOT[team]||{}).find(r=>r.name===entry.name));
      const tierColor=rv?TIER_COLORS[rv.performanceTier]:null;
      const dotColor=isDraft?"#7c3aed":tierColor||(filled?"#a8a29e":"#d4d4d4");
      const lastName=entry?shortName(entry.name):"";
      const isFa=filled&&!isDraft&&faList.includes(entry.name);
      return(<g key={slot}>
        {isFa&&<circle cx={pos.x} cy={pos.y} r={3.2} fill="none" stroke="#f97316" strokeWidth="0.4"/>}
        <circle cx={pos.x} cy={pos.y} r={filled?2.4:1.6} fill={dotColor} stroke={isDraft?"#7c3aed":filled?dotColor:"#a3a3a3"} strokeWidth={isDraft?"0.5":"0.2"} style={isDraft?{animation:"draftPulse 1.2s ease-in-out 1"}:undefined}/>
        {isDraft&&<polygon transform={`translate(${pos.x},${pos.y})`} points="0,-1.2 0.28,-0.39 1.14,-0.37 0.46,0.15 0.71,0.97 0,0.48 -0.71,0.97 -0.46,0.15 -1.14,-0.37 -0.28,-0.39" fill="white" style={{pointerEvents:"none"}}/>}
        <text x={pos.x} y={pos.y-3} textAnchor="middle" fill="#a3a3a3" fontSize="1.8" fontFamily={mono}>{pos.label||slot.replace(/\d$/,'')}</text>
        {filled&&<text x={pos.x} y={pos.y+4.5} textAnchor="middle" fill={isDraft?"#7c3aed":"#525252"} fontSize={isDraft?"2.2":"1.8"} fontWeight={isDraft?"bold":"normal"} fontFamily={sans}>{lastName}</text>}
      </g>);
    })}
  </svg>);
});

const DepthList=memo(({team,depthChart,mono,sans})=>{
  const chart=depthChart[team]||{};
  const groups=getSchemeDepthGroups(team);
  const faAbbr=TEAM_ABBR[team]||team;
  const faList=FA_FLAGS[faAbbr]||[];
  const baseGroupMap={};
  DEPTH_GROUPS.forEach(g=>{baseGroupMap[g.posMatch]=g.slots;});
  const faPill=(name)=>faList.includes(name)&&<span style={{fontFamily:mono,fontSize:8,fontWeight:700,color:"#f97316",background:"rgba(249,115,22,0.08)",padding:"2px 6px",borderRadius:99}}>FA</span>;
  const draftFadeStyle={animation:"draftNameFadeIn 0.4s ease-out both"};
  const tierDot=(slot,name)=>{const rv=ROSTER_BY_SLOT[team]?.[slot]||(name&&ROSTER_BY_NAME[name]);const tc=rv?TIER_COLORS[rv.performanceTier]:null;return tc?<span style={{width:5,height:5,borderRadius:3,background:tc,flexShrink:0}} title={rv.performanceTier}/>:null;};
  return(<div style={{marginTop:2}}>
    <style>{`@keyframes draftNameFadeIn{from{opacity:0;transform:translateX(6px)}to{opacity:1;transform:translateX(0)}}`}</style>
    {groups.map((group,gi)=>{
      const entries=group.slots.map(s=>({slot:s,entry:chart[s]})).filter(x=>x.entry);
      const extras=Object.entries(chart).filter(([k])=>group.slots.some(s=>k.startsWith(s+"_d"))).map(([k,v])=>({slot:k,entry:v}));
      const baseSlots=baseGroupMap[group.posMatch]||[];
      const hiddenRoster=baseSlots.filter(s=>!group.slots.includes(s)&&chart[s]).map(s=>({slot:s,entry:chart[s]}));
      extras.push(...hiddenRoster);
      if(entries.length===0&&extras.length===0)return null;
      return(<div key={group.label} style={{marginBottom:8,...(gi>0?{paddingTop:6,borderTop:"1px solid #f5f5f5"}:{})}}>
        {entries.map(({slot,entry})=>(<div key={slot} style={{fontFamily:sans,fontSize:11,padding:"2px 0",display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontFamily:mono,color:"#d4d4d4",width:24,fontSize:9,flexShrink:0}}>{group.slotLabels?.[slot]||slot}</span>
          {entry.isDraft
            ?<span style={{fontFamily:sans,fontWeight:700,fontSize:11,color:"#7c3aed",background:"rgba(124,58,237,0.06)",padding:"1px 6px",borderRadius:4,...draftFadeStyle}}>{entry.name}</span>
            :<>{tierDot(slot,entry.name)}<span style={{fontFamily:sans,fontWeight:400,fontSize:11,color:entry.isTraded?"#a855f7":"#525252"}}>{entry.name}</span>{entry.isTraded&&<span style={{fontFamily:mono,fontSize:7,color:"#a855f7",background:"rgba(168,85,247,0.08)",padding:"1px 4px",borderRadius:2}}>TRD</span>}{faPill(entry.name)}</>}
        </div>))}
        {extras.map(({slot,entry})=>(<div key={slot} style={{fontFamily:sans,fontSize:11,padding:"2px 0",display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontFamily:mono,color:"#d4d4d4",width:24,fontSize:9,flexShrink:0}}>+</span>
          {entry.isDraft
            ?<span style={{fontFamily:sans,fontWeight:700,fontSize:11,color:"#7c3aed",background:"rgba(124,58,237,0.06)",padding:"1px 6px",borderRadius:4,...draftFadeStyle}}>{entry.name}</span>
            :<>{tierDot(slot,entry.name)}<span style={{fontFamily:sans,fontWeight:400,fontSize:11,color:entry.isTraded?"#a855f7":"#525252"}}>{entry.name}</span>{entry.isTraded&&<span style={{fontFamily:mono,fontSize:7,color:"#a855f7",background:"rgba(168,85,247,0.08)",padding:"1px 4px",borderRadius:2}}>TRD</span>}{faPill(entry.name)}</>}
        </div>))}
      </div>);
    })}
  </div>);
});

const DraftFit=memo(({team,teamPicks,fpPills,liveNeeds,prospectsMap,mono,sans})=>{
  const base=TEAM_NEEDS_COUNTS?.[team]||{};const remaining=liveNeeds[team]||{};
  const prof=TEAM_PROFILES[team];
  const needEntries=Object.entries(base).sort((a,b)=>b[1]-a[1]);
  const totalNeeds=Object.values(base).reduce((s,v)=>s+v,0);
  const filledCount=totalNeeds-Object.values(remaining).reduce((s,v)=>s+v,0);
  if(teamPicks.length===0)return null;
  // Team philosophy
  const stageMap={rebuild:"rebuilding",retool:"retooling",contend:"contending",dynasty:"in dynasty mode"};
  const stageLabel=stageMap[prof?.stage]||"";
  const boosted=prof?.posBoost||[];
  // Tendency pills
  const tendencies=[];
  if(stageLabel)tendencies.push({text:stageMap[prof.stage],color:"#525252"});
  if(prof?.bpaLean>=0.7)tendencies.push({text:"BPA-first",color:"#2563eb"});
  else if(prof?.bpaLean<=0.4)tendencies.push({text:"need-driven",color:"#ea580c"});
  if(prof?.athBoost>=0.1)tendencies.push({text:"values athleticism",color:"#059669"});
  if(prof?.sizePremium)tendencies.push({text:"favors size",color:"#7c3aed"});
  if(prof?.ceilingChaser>=0.08)tendencies.push({text:"chases upside",color:"#d97706"});
  if(prof?.reachTolerance>=0.45)tendencies.push({text:"willing to reach",color:"#dc2626"});
  // Prose traits for sentence
  const sentenceTraits=[];
  if(prof?.bpaLean>=0.7)sentenceTraits.push("tend to take the best player available");
  else if(prof?.bpaLean<=0.4)sentenceTraits.push("tend to draft for need");
  if(prof?.athBoost>=0.1)sentenceTraits.push("value athleticism");
  if(prof?.sizePremium)sentenceTraits.push("favor bigger prospects at the position");
  if(prof?.ceilingChaser>=0.08)sentenceTraits.push("chase upside");
  if(prof?.reachTolerance>=0.45)sentenceTraits.push("reach for their guy");
  const pickedPositions=teamPicks.map(pk=>{const p=prospectsMap[pk.playerId];return p?.pos;}).filter(Boolean);
  let philoLine="";
  if(stageLabel){
    philoLine=`The ${team} are ${stageLabel}${sentenceTraits.length>0?" and "+sentenceTraits[0]:""}. `;
    if(sentenceTraits.length>1)philoLine+=`They also tend to ${sentenceTraits.slice(1).join(" and ")}. `;
    if(boosted.length>0){
      const nonBoosted=pickedPositions.filter(pos=>!boosted.includes(pos));
      if(nonBoosted.length>0&&teamPicks.length===1)philoLine+=`This front office usually prioritizes ${boosted.slice(0,3).join(", ")} — not ${nonBoosted[0]}.`;
      else philoLine+=`This front office usually prioritizes ${boosted.slice(0,3).join(", ")}.`;
    }
  }
  // Picks analysis
  const boostHits=pickedPositions.filter(pos=>boosted.includes(pos)).length;
  const topNeed=needEntries[0]?.[0];const topFilled=topNeed?base[topNeed]-(remaining[topNeed]||0):0;
  const lines=[];
  if(totalNeeds>0){
    if(filledCount===totalNeeds){lines.push({text:`You addressed every pre-draft need.`,color:"#16a34a"});}
    else if(filledCount===0){
      if(teamPicks.length===1)lines.push({text:`Your pick didn't fill a listed need — but value is value.`,color:"#a3a3a3"});
      else lines.push({text:`None of your ${teamPicks.length} picks addressed a team need.`,color:"#dc2626"});
    }else{
      const remainingNeeds=needEntries.filter(([pos])=>(remaining[pos]||0)>0).map(([pos])=>pos);
      if(topFilled>0)lines.push({text:`Filled their biggest need at ${topNeed}.`,color:"#16a34a"});
      else lines.push({text:`Left the top need (${topNeed}) unaddressed.`,color:"#ea580c"});
      if(remainingNeeds.length>0&&remainingNeeds.length<=3)lines.push({text:`Still need${remainingNeeds.length===1?"s":""}: ${remainingNeeds.join(", ")}`,color:"#a3a3a3"});
    }
  }
  return(<div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"12px 16px"}}>
    <div style={{fontFamily:mono,fontSize:8,letterSpacing:1.5,color:"#a3a3a3",textTransform:"uppercase",marginBottom:8,display:"flex",alignItems:"center",gap:4}}><span style={{fontSize:10}}>🧠</span> draft fit</div>
    {tendencies.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:8}}>
      {tendencies.map((t,i)=><span key={i} style={{fontFamily:mono,fontSize:8,padding:"2px 6px",borderRadius:4,color:t.color,background:t.color+"0d",border:`1px solid ${t.color}22`}}>{t.text}</span>)}
    </div>}
    {philoLine&&<div style={{fontFamily:sans,fontSize:11,color:"#737373",lineHeight:1.5,marginBottom:10}}>{philoLine}</div>}
    {needEntries.length>0&&<>
      <div style={{borderTop:"1px solid #f5f5f5",marginBottom:8}}/>
      <div style={{fontFamily:mono,fontSize:7,letterSpacing:1,color:"#d4d4d4",textTransform:"uppercase",marginBottom:4}}>pre-draft needs</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:lines.length>0?10:0}}>
        {(()=>{const broad=new Set(["DB","DL","OL"]);return needEntries.filter(([pos,v])=>v>=2&&!broad.has(pos)).map(([pos])=>{const rem=remaining[pos]||0;const isFilled=rem<=0;
          return <span key={pos} style={{fontFamily:mono,fontSize:9,padding:"2px 6px",borderRadius:4,
            ...(isFilled?{background:"rgba(34,197,94,0.1)",color:"#16a34a",border:"1px solid rgba(34,197,94,0.2)"}
              :{background:"rgba(239,68,68,0.06)",color:"#dc2626",border:"1px solid rgba(239,68,68,0.12)"})
          }}>{pos}{isFilled?" ✓":""}</span>;
        });})()}
      </div>
    </>}
    {lines.length>0&&<div>{lines.map((l,i)=><div key={i} style={{fontFamily:sans,fontSize:11,color:l.color,lineHeight:1.5}}>{l.text}</div>)}</div>}
    {fpPills&&fpPills.length>0&&<>
      <div style={{borderTop:"1px solid #f5f5f5",marginTop:8,marginBottom:8}}/>
      <div style={{fontFamily:mono,fontSize:7,letterSpacing:1,color:"#d4d4d4",textTransform:"uppercase",marginBottom:4}}>your strategy</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
        {fpPills.map((pill,i)=><span key={i} style={{fontFamily:sans,fontSize:9,fontWeight:600,color:pill.color,background:`${pill.color}0d`,border:`1px solid ${pill.color}22`,padding:"2px 7px",borderRadius:99,display:"inline-flex",alignItems:"center",gap:3,whiteSpace:"nowrap"}}><span>{pill.emoji}</span><span>{pill.text}</span></span>)}
      </div>
    </>}
  </div>);
});

const LiveNeeds=memo(({team,liveNeeds,userTeams,mono})=>{
  const needs=liveNeeds[team]||{};const base=TEAM_NEEDS_COUNTS?.[team]||{};const isUser=userTeams.has(team);const broad=new Set(["DB","DL","OL"]);
  const entries=Object.entries(needs).filter(([pos,v])=>v>0&&(!isUser||(!broad.has(pos)&&(base[pos]||0)>=2)));
  const filled=Object.entries(base).filter(([k])=>(!needs[k]||needs[k]===0)&&(!isUser||(!broad.has(k)&&(base[k]||0)>=2)));
  return(<div style={{marginTop:4}}>
    <div style={{fontFamily:mono,fontSize:7,letterSpacing:1.5,color:"rgba(255,255,255,0.3)",textTransform:"uppercase",marginBottom:2}}>needs</div>
    <div style={{display:"flex",flexWrap:"wrap",gap:2}}>
      {entries.map(([pos])=>(<span key={pos} style={{fontFamily:mono,fontSize:7,padding:"1px 4px",borderRadius:3,background:"rgba(239,68,68,0.2)",color:"#fca5a5",border:"1px solid rgba(239,68,68,0.25)"}}>{pos}</span>))}
      {filled.map(([pos])=>(<span key={pos} style={{fontFamily:mono,fontSize:7,padding:"1px 4px",background:"rgba(34,197,94,0.15)",color:"#86efac",borderRadius:3,textDecoration:"line-through",opacity:0.5}}>{pos} ✓</span>))}
    </div>
  </div>);
});

// Override consensus ranks for players the board data may undervalue
// These represent realistic draft range ceilings/floors based on current intel
const BBL_LOGO_B64="data:image/png;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAFxAqUDASIAAhEBAxEB/8QAHQABAAICAwEBAAAAAAAAAAAAAAcIBQYBAwQCCf/EAEkQAAEDAwMCBAMEBwUGBQMFAAEAAgMEBREGByESMQhBUWETcYEUIpGhFSMyQlKxwQkzYnKCFiRTkqLRFyWy4fGT0vAmQ3ODwv/EABsBAQACAwEBAAAAAAAAAAAAAAACAwEEBQYH/8QAOBEAAgEDAwIFAwEFCAMBAAAAAAECAwQREiExBUETIlFhcQYygaEUI0KR4RUzYnKxwdHwJFKi8f/aAAwDAQACEQMRAD8ApkiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgC9Fuoqy418FBb6Waqq6h4jhhhYXvkcTgAAckleccnAV1vD9oHT+z22Em6OtIQ28zUvxmNlH36aN37EbG9/iPyM+mccDKhUnpW27MpZND228I2pbtSx12s7tFYYnAONJCBLOB/iOelp+pW/N8I+3ZYacawun2jyPxIc/wDLhahddR6/3ZrTW192qrDp97sU1DSSEOlZ6uIwT8zwfILIw7Exsp21jLfeWkDqEwacj37fmro2dSSTqT0v0OPcdfs7ebhhya5wsmF3A8H2pLfRvrNGXynvnTk/ZKhoglcP8Ls9JPscfNVv1DZbvp67T2m+W6pt1dA7pkgqIyxzfx7j37FWlpbruNtvVGt07fqq9ULP763V7i/7o79OTkY9sH2K3rVFm0v4l9rH3O3Rso9UW5pbH1cSQTYz8J57mN2OPTuPNQrU6lu1q3Xqb1nfW99DXQfyu6KIIvTc6GqtlxqbdXQugqqaV0M0bu7HtOCD9QvMhshERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQExeEbb9uut2aSSth+JabN011WHNy2Qtd+rjPs53f1DSPNTnv/e3bg7oUuiKV5dZbCRNcHA8SSkfsn1IGAPmSvZsBbqfaXwxV+uayNrbhcad1cA4YLsjop48+hJB/wBZ9Frfh4sFXcamCpuDny1d2qDWVsr+5Zkkkn35+pCnaJSqSqy4icrrd1K3tdFJ+ebwvyStZbfQ6L0xFfJaaOS4VQ6aGBzQBE0Dvjy4/oFhXa31S6rNQLrI05yGNaOge2Mdl2bh3oXbUMrIS37LS/qIWt7ADgkfX+S1zHHZdWhbxmtdRZb/AER8wv8AqVSjU8C3liMe/q+7N5E1NrexV009JFBeqCMy9cQwJmeeR9MexIUYbSVj9HeIWhp6ZxZb9SwuhmiHA+IMlpA9Q4DB9HkKTdo2/DqL1VvwIore8OJ7ZLgR/wCkqKoo3z79beRQjL2VRleB5NyD/wD5K1pwSjUp9lwel6Dc1J3NvVfM1LV744ZGfja0xFp3fKsqqfobDeqaO4hjRjpcS5j8+pL43Oz/AIlB6sn/AGhLw7dmyN/ebY2Z/wDrzKti5lJ5gmz6DLZhERWEQiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCLMaP0xfdXXyGy6ets9fWzHhkbeGjzc49mtHmTwrg6B2d212asUeptyKyiul4wHNEreqKN2P2IojzI4fxEfQKEpqLxyzKTZWPQ+zu5GsoW1Nj0tWPpXDLamoxBE4f4XPIDvplSXR+ELcmaFskt50rTFwyWPqpiR/ywkfgSt1134l9QXJz6HRNoitVP+yyomAlncP8uOlny5Puo2qdwN06uQyy6pu4JOekVPSB8gMYV8bO5nvskS8q5OdQeFXda2R9dHDZrzju2ircED/+1rPyyol1VpHU+lao02orDcLXJnj7RA5gd8j2P0U2WTeHdexSskN9qK6Np5ZVgTNI9MkZH0IKlbSniH0xqun/AEHuRpmnp4ZeHTNb8emJ/wATHDqZ/wBXvhYna3NLdpNewwnwUiRXK3J8MWktWWx2otq7zS0kkjeplIZfiUsx9GuGTGfxHbgd1UzVumr7pS8S2jUNsqLfWRnlkrcdQ9Wns4e44VMZqW3ci00YhERTMBERAEREAREQBERAFtm0Wkptcbj2TTMQcI6upb9oeP3IW/ekd8w0HHvhamrZeAXR4Yb9uDXtDIIIzRU0jxwDw6V2fYdI+qhUlpi2Ziss3fxV3SC53PS+2Fsc2OB0jKirjh4EULRhoI9A3qx9FtelKSLTmhrlfGtbHJURikomjgjgjj5cn/SoW0pWVWudzb/rJrHPjraoUdtBHPwgQG49MgAn0JKmXcusipGW7TNM7MdvhBlIOA55HJx+J+q36VLFOFHu92eF69fZuKlVPamsL/M/+EaOxuMg+q+iQFySPVcxQvnljhjGXPcGtA8yTgLstqKyfONLlL1bN0tQdZtrbjXH7s90kEEQ8y0ZH8us/gtB2ApZNR+IW4XeRuaXT1D8NhxkfFkywD8DKf8ASt03mr4rFZaC1tcDHaqIzTAHgvIHH5fmsFsBINC7Dal3GuQaKmvMtd9/+GMFsQ9wXF2PZy4deo428p95PY+ofT9qv2vjalFR/L3ZW/xb6mGp9+dQTxyF9PQSNt8PoBEOl2PYv6z9VEy9Fxq57hcKmvqX9c9RK6WR3q5xyfzK861UsLB7BhERZAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAW27Vbfah3H1RFYrBAC7h1RUyZEVOz+J5/kO5Kxuh9L3fWWqKLTtjpjPW1b+lo8mN7ue4+TQMklXXr7jpHw2bZw2SzsirNQ1jQ/75+/Uy9nTPx2Y3yb9O+VCUnlRjyyUY5PmpqtC+GrQ7LXbKeO5ajqYw9wcemaqd/xJCM9EY8m/hk8qs+tNSX/W92lv2o6ySaV56YmdmsBPDGN7ABfdTU3PVN3nv9/qpKqoqHl7nvOS/wBAPQDsAutkYqbmXAfqabgAdi//ANl2LSxjRWp7yfLGo7bTQikpxk5lcMuOO3svcB68r6C4wuikksFTllgj0XkrKKCpaepmHHs5vBC9aEeqYCk0dWktV6w0BchW6fuMjIS4GSE/eikHmHsPr6jB9CCrFaf1Vttv5ZW6e1fbIKK89PTHE5/3wf4oJcZ7/un5EFV6LRjBAI9FjaugdFKKy3udDUMIc0tJBBHIII7FaF10+nV8y2fqiyM+x2b/AOxeodrq51ZGZLppyRwENwbHgxk9mSgfsu9+x8vQRErnbN77013pRojc2OGognb8FldUDqbIDgCOYY8/4vofVRr4nNhZdHfF1fpGJ9RpuV3VPA3LnURPn7xnyPkuLLVSn4dTn19TLj3RXtERTIhERAEREAREQH1Gx8kjY42ue9xDWtAyST2AV6tYO/8ACDwr23R0Tem83KAUkga7kyzfenPHfAJaD8vTCrn4RdEM1pvHbzVM6qC0f+YVGRw4sI+G36vx+BU2b8XCTV2+lHY4CHW7TEYlmwSQ6c4dg+XB6R9CEpRdSvGHZbspuriNrbzrS7I2/YPS1NZ6SnnqsNhs9KZ5jgYMpBJ/Dn8AsLd6yW5Xaqr5hh88hfj0BPA+gwPotwrJXaf2yp6QDpq7w/rkJPIjHIH1GPoStJAycrsWy1zlU7cI+R9XrSVOFFvzPzS+Xx+h8jj1Wz7ZUAuOraYvH6mkBqJSRwA3GPxJH5rWyFuumWGxbe3m+uPTLWf7tT54J7jI+pJ/0qy7k1TwuWanSKSqXSlJbQTb/BFviCu095rDbqE9VRfK8U0IHJ6ARz8v2R9VlfGRXxaH2H07oKic1r697IHY4zFTta55H+ss+eSsZtdQO1j4iKEOaHUOmoDVSk9uvs0fMvLfowqMvG3q12o96Ki1xPzR2KBtHG0Hj4h+/I759R6f9IXHvGnUjSXEUfVfp+3lRsvEl903l/kgtERVnYCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgC7KaGapqI6enjfLNK4MYxgyXOJwAB6rrVqPBPtdA+WXdHUsAZSUWRa2zNwwvH7c5z5NGQ33JPkFGclFZZlLLJB2o0jp7w+7Vz6u1IxsmoqyFvxgSOrrIyymj9OeXepBJ4AVdNQXO6a71TV6jvkzpZJXkgEkhrc/dY30AHH/AMrZd+df1O5uvfh0crmWS3l0VJGDkEA4dKR2y7jHsAFg6aJsEDYoxhoGAF1LC00R8Sf3P9DMnjZHTWTiionvxgMGAPfsAlsh+DRMa7l7vvP+Z5/9voui6htTWUtETw4/Ef8AIdvz/ksiWhgzkADz9F00tyt8HPZcLzS3GjiB+LURjHoc/wAl2UQrbkAbVarlXA9jT0z3g/UArEpRW7eDCi2dwXCytHovcatI+yaEvL2nzfGGD8yFm6PaLdiqAI0k2DP/ABqtjVS7ujHmSJKDZp54Xy7OMeS3/wD8Dt2iMiyWw+xuDMrzVOze7FMCXaVhmA8oa1jisK9oP+JDRJEcXG1x1R+I0Bso5B7Z9ipo8PW732IN0FrnoqLTO0wQVFR974WePhPz3Yew9M45B40er0NuDQAurtDXiNo7lkYePyJWm6la6nGK2gq6GoBwBPC6PJ9DkBV16dG5hjK/4JRbXJtfio2JfoKpfqzTEb5tM1Uv34mjqNC93YZ84yex8uAfU1+V0/DhuzSaktZ221z8KpjnidDSTVJy2dh4+C/Pc4/ZP/tmBfEttHVbYat6qNsk2na9xdQTnnoPcwuP8Q8vUc+uOG1KnPw589vcy49yJkRFMiEREARFltG2Kr1Pqu16eoQTUXCqZTsIGenqOC75AZP0QFw/CVZKPbvYe7bk3NuZrhFJUgO4/UxdTY2D3e/Pty1YDYC212oa+S7XVzpa/UFY6oqZAMEMDiXEegP3sD5LcvFJUU9o0JpbanTzhTMrXRQfDacltPEA1ufrgn5LYtsbfBpnTFxvrIgyOiphS0QPYuwAPzxn6q60i4UpVe8tkec+oq0ZOnaN7PzS+EeTdG4RXDVElPTlv2eiaKeJrewx3x9ePotWyQvkFznuc9znOcSS4nJJPclfZPHK7VCn4cFE+VXlw7ivOq+7/TscN6nvaxgy5xAAHmVue6lRHZdN2uyvcA2hpTU1AB/ewe/v3/FYzbu1/pXV9FERmOF3x5c9gG8jPzOB9Vs2p9G192v9ZX3K50FFBM7piZPJyWAYHHZadxXgq8YyeyO50yyrOwnVpxzqaXpst2Rd4RtW6Ktkl+rL3faKivl5rQWQzu6P1TQegdR4yS93n5Ba94jPDTe3Vlz11o24S3uKslfV1NFLgzt6j1ExuHEg5PGAfmt/1dstbKq2y1P6Nt9xjAOZ6EgSM475GCcfVajt/r/UW0Woaaz3ivmu2jayURNfMSX0Bz3B8hzyOxxkYIOdG4t9cpVqMs+qPofT+s0qrjbVIOEsbZ4fwyoT2Oje5j2lrmnDmkYIPovlXK8TPh5qdV3SHWe21LSSTVrS+vpGzNjbKTyJo84GSO4zzwfMqqesNHap0hWfZNS2KutchJDTPEQ1/wDld2P0K1YVFNHacWjAoiKwwEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQG17TaLr9wNfW3S9ASw1UmZ5unIhiby95+Q7epIHmraeKfWtBorQ1t2r0y37M6emZHN0O5hpWggMz36n4/DPqCvP4PNL27b7aO67n6hiEE9dE6Rj5ByylZyAP87h9fu+ygp8OrN1dxqy6W+2T3GurakloOfhxDnoBd2AAHbPODhLeCqVdcvtj/qWLZHxaKGKjoQ5xa2R46nuJwB6D6L7pn1dfWChstvq7pVHH6uliLyPngcD3U/baeG5plbXa/uD7i0YLKKlkMcOcA/ecME8kjjHbuptq6LTmgtCXSos9rorVSUVJLNinhDckNOCSBknOOSST6rdq9XgnpprLI6G92U12o2t1juRWXC40E9Ha6aimFJNJUZcWvABLQADkgEZ+anvS/hm0jSxtk1PdrnfJwclrZPs8Q9sDLj8w4fJbL4WrLJa9nbfUzRltTdpprlNx3Mjvun/kaxSLdrjb7RTGpuldS0MP8dTK2Np+pIC5l11C4dRxi9vYtjGONzWbBtXtzYy11s0daY5GfsyzRGeQH1D5C4/mttihiiAEUUcYHYNaBj8FG2o9+Nr7GXMl1FHWyjj4VFGZST8xwfoVpNx8UlhDiy06Wu1X6PlLY2n8cla0aFzX3w2Z1RRYI88nuiqvdfErrKoOLTpa00QxwamZ8p+oHT/Na7Wb77uzk/DrrLSZ7fCogcf8xKuj0e4lyPFRcrkeqdRVJJN5d53fs6xgj9m22nP84yuGbyb0NIJ1lC/2dbaf+kYU/wCxLj1RjxUXcJJ/7LxV9roa5hZW0kE8RyXskjDmvGCMEEEEc5+gVQaLfTd6BwdLdLNVY8paEDP/ACkLYrZ4ktbUwabppmzV3fq+zyviJ7YOCXe/Cw+kXUXlDxUzL+JfZahjsw1loS2xW+toMSVNNRRhjJWDn4jGgABw7nA5HPcc5PbK72jf3aG46L1U5j7zSwgSPxh/UOI6huPMHg/h5r4t3if085vwL3pS60jXjDnRFszMEYIxwfVQTcNbWfRe8MWrtuKyU2uWT4slK+MsLGuP6yFwOeDzjnjjGCONmFCrOm4VVut0yOxEOu9MXTRurbhpq8wmOsoZTG70eP3XD2IwR81g1czxa6QoNyduLburpWMT1NJT9VT8Nv3paY8nI9Yzn6F3oMUzVVOepe5W1hhERTMHbS089XUxUtNDJNPK8MjjY0uc9xOAAB3Kuv4atkaHbOgbuLuFVwUlzbD1QwyvDY6Frh3efOQjjA7duT21bwV7bW6is1Tu5qhkbaenEgtvxmjpjaz+8qOfQhzR8ney6dV6mu+9mqpKirfU0uj6SctoaFoLXVBHHU7Hcn8gcDnJUYU5XEnCOy7sourqnZ0nWqvb/vB81l0l3B3ovOsaYvntdIBR2xzmkAgDGQPclx9cOAU0a8mNm0xZ9LZHxWM+0VYH8Z8j9SfwXGkdG2jSdLb62+VVNbKeEiSGgY3LjjkZA98E9+e5Xtv9LpLVN3muLdVmnnlwAyaEhoAAAAPGAugpwjKMYp6Y9zwfUJVrxVarxGc8JRbWdP8AUjvAxkYyuOR3W7HbyeY/+V3+01mezWzDJ/DK8dZt/qqnGTb2TAecUoPH1wt1XdJ9zyk+j30F/d5+NzJaAlFg0ld9TPa34r8U9MHfvHOOPUZIJ9mlaZX11VcKl9VW1Ek8rzlznHJ/9h7BbzuDb6uh0zY7HTUVS9sMZmqHRxlzQ8jGCQMZGT+Kj57Xsd0va5jvRwII+hVNponKVR4y2bfWHWoQp2iyowW/PL3ZkdPXqvsdxZV0k7w0ECSLP3ZG55BC798dMUFypmvpImspbzTGUAj9iQYJIx6Eg/UrFQQyTzRwxNLpJCGtaBySTgKV9UXOwaftlst9zt0N0r6WABkTsER5AyXZyOcDyJ4UblqnWjKCy3ykbHR5TqWtTxJ6VBpxb7MgDTt33x0pb6ektGq6KuoaOMRxUdTTRuHSOzeosDu3H7WfdSNord3TO4HVoLdHTVPbbjUt+H8KpZmmqSePuuPLDntz8isw3Velbi4U9z0vTUkbzj41LgOZ78AE/n8lou9m3lPUUDGRvbO2Vhmtla3hzT3AJH0z5HIPkqKlvSqvDjpl2Z6iy+oa8HqqTjUp7JtbNfKIL8T+y9RtbqJtZbDJU6auD3fZJHcup3d/gvPr6HzHuCoZV89sqob3bBXjRepXdd6t2aOSeTlwkA6oJj75aQfUtPqqKXKjqLdcamgqo3R1FNK6KVjhgtc04I/ELnwck3CXKPabNKS4Z50RFYYCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgC2farSk+t9xLHpWBxabhVNZI8fuRgF0jvoxrj9FrCtZ4ANHxy3G+67qmZFFH9ipSR2LgHSOHvgNH1IUKktMWzMVlm3+Mm/MtWnbBtfp9gigmbGZooz2ij+7DH9XDP+lqlHaDRtp0ZoijsP2F5qqiEOrpA0nre4gEkjgYJA9gz2CrbpjUFt1j4kbhrDVV0hpLHapn1LZZ3gNLIvuQsb6knDgACSAeFv2sfErUVVO616BtspIJH6VuAyCM92s8/bP4KcrepKEaNNb8v8luUuSxlfWW+z28Vt5uUNJTwZAnqakMaQe3USQCfb8FXbxG736Tu+iLtpHTFVPcKqtaIX1UUZELR1DqGTgkkAjgKEtSVl71RcBcNU3utu9QMhnxpD0RgnkMaMBo9gAsDeoGB9DSRta1r5s4AwMD/AOQtq36OoNSqPL9CLnnZElv3h3LfY6Kz2qvpdP0FLTMgjbSRB0nS0AcvdnB+QC0q6/bLzVurb7dLhdqp3Dpquoc9xHpkknHtnC+2kgYQnK69O2pw4iipybOiCkpoRiGBjPcAAn6ruwAuR2Q9lckkRzk4XIXy9zWNLnuDWjkknACxlRfKKJxa0ukI82jj81lyS5MpN8GVI4XA4XnoK2Gtg+LCTgHBBGCCvRn0WVh7jBzkjsmeO5XB+Sxd1u/2KcQtgLzgEknAGVhtLdmVHJlWSOYQAX9IIcWtcRkgEA+3cpcrLSXC3mXohM7WEl7SWubl55OSerJI7duViqC+0sjgyeMxE/vZyFmWzBoDonBzSB2OQRnPPqOFBpSJbolzwZawiZNdNtb65klNVMfJRMk7EnIlj+Th94D16vVV38Qeg3bd7p3TT8bXfYXEVNA5370D8lv4EOafdpWQuNyq7Dq636ltrvhTwzsnHQMBrwQSB7EZCn/xaWim3H2Psm5VmjEslvjEz3NH3hBJxI04/hd0nB7c+q89e0vBr6lxL/Uk/MslL1ldIWSp1Jqm2WCkOJ7hVR07D6dTgM/TusUrBeBHTUV53hlu9RG18Vmonzs6hnEryGNI9xlx+ipnLTFsillk0+JSvh0rtvpvafThFO6vaylLGdxTx4BJ/wAxwSfPBWY2n07aNPaddfJYG/ZLXEIqRruPiS47+5JOSfU5UZa7qnap8R+o7gD8SmsjBb6fPIa5gw/H+syFSvrlxtOmLHplv3ZGQipqAP43ZPP1J/ALdt6bjSjT7y3Z4v6hvV48n/DSWcf4nwandK+tudxlra6YyyyHJPkB5ADyA8gugn6IT5d18nDeScD3XZjGMYpJYR8ynUnVk5ye73OcYIcOCOxHde+mvd7pWgUt4roGj91k7gPwzhY0SAng5Hsuepqw4QfKTJQrVqb8smn8s2Sl1xqyncB+l3TNH7ssbHfnjP5ra9OXw60t9ztd7pKR80NK6aCZkeC0ggZ5JwckdseYUZtw8ho5JOAB5qSdH2KqstgqJ52/Dud5ApKOFwIcAckuI8gB94+gA9VzrunRpw1RWJex6PolxeXVbROTlDDzkxO3Vvgggq9W3Bn+6UDSYGngPl8seuMgfMj0Wq3OvqLjcZ66qdmWd5cc+Wew+g4Wz7iXCKkipNJ2xxFHbgPjEHiSTHc+uMn6n2C08kEe6utYOT8WS3f6Gj1SpGilaU+I7v3f9ODjGcreKsuqtm4JKnJfTVxjpye/TnkD1HJH09lqNqt1VdLhFQ0TC6WUgD0A8yfYDJUh3+/6ZsVtptLVFufdhRNHxA09LGvwc8ggk5Jz6ZULyfnjGKy16Gx0WgvDq1KslGLWFnuyCtvtY1O0e4N/ulysVXV2K7uBfLTEH4RySHEe2XDBx3W4bwbRaL3q0vJrzbeejjvj2mR/wcMbVv7lkzR+zL/iOMnvkEFbZPYtO6ttVRNpuGSlqomEzUE56w9uOcZJz6eairQVdNtNu7bZaWZ0OnL/ADCmq6cn7kchOGkZ7YJyD5Akdlp3FBVk6tPKkuUz33R+rNuFrWxuvLJcPH+5U6vpKmgrp6Gtgkp6qnkdFNFI3pcx7TgtIPYghdCsv4+NG0lo1vbdW0EDY2XmJzKosGGumjxh3zLSM/JVoWpCWqOT0jWGERFIwEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBXstLBtb4LI3wn7PcrlQNk6gcO+NVOGCPMObG7P+lUr0TZZdSaysun4DiW5V8NI0+hkeG5+QzlW78dNwFBYNL6Sof1dMHOqHRjsGsb8OP8Am9RUXOrCHuTh3ZXmxWmlnphVVEYkcSegO7ADzws0I2sADRgDgADsuq2tdDRRRO/dYAR9OV6OoFepjEqlJtgO4x3WKqyJdRUjD2ZG5/45H9AshVPbDBJO79lgJK9lz0Jra06fZr25WZtNZ5GMY0vnYJOh5Aa7oznBJHcZ57KupUjDCfczFPk85CYRnLAc9xlc9yriDW4AXDy1jS5xAaAST5ALnt5rxXWGappjBGenrIDifIeaizMY7mAq5a281Rjp2uEDTwDwB7k+q99Lp+FrB8eV7neYbwFk4vs9uo8HEcTBknzP/clbnt9tXuFr63m7WWhpaG2nIinr3lgmx3LAASR74x354KpnOFJapvBasvg02io4KSMsgb0tJySTkkr0Y9F79b6d1LoK6R27V9tNKZeYKmM9cMvycOM+xwR5gLHtcHYIVtOpGccxeUQknnc5AyuuopqeowZ4mSEDAJHP4rt7Lt0/Zbtq7VdDpOwNBras5fKf2YYwCXPJ8gACfwA5ISpOMIuUnsjEU29jDVVnoZGkRxmN3kWk8fivHRxVlrqWskcZaR5x1AfsE9jjyCsPqjwtV1usJrtM6rqbhdom9UlNUsAjlwOQ0gkg57Z/91CdJI57ZYKmJ0NVBIY5onDBY4HBBC1re4pV8uD4LHFrk6brRNqqCRjh94DqB9xyp78HN5pdT7f3/bW7kOhiD3xsdz1U8wLXj26XnOf8fsoPkcccL27E6hfo7e+1TuJbSVkv2SYZwOiTgH6HB+YVXUKfiUXhb8oQl2Ii1zp+r0rrG7acrm4qLdVyU7iOzuk4Dh7EYI9irZeAi3RWnbfVusJOomSq+CR5BlPF8Q4+fxT/AMoUf+PbSX6H3So9TQR/7vfKNvxHA5Hx4cMd7D7nwvrlSj4VsQeEfUEsYw90lycfc/AA/oF56ctdNe+DMViRqvh2pXXe4y3Cr/WT3S8F8rj3cAck/Ulykzc6pFTre4+kLhC32DQAfzz+K0TwpDqi04SMdVRM93uep4/oFtGrCX6uvLnd/tso/wCsr0EEvGS9EfJ+uVHorN8yqY/CRjeecL7pJpKWshqoun4kMgkb1DIyDkZHmMhcY4XC3WsrDPJRk4tNbNG502q7DVuzfdJUUsh7zU4+G4n1OMZ/FZu/0m39sttDcJbRWSQ1rOuP4UhIBwCQcng8qMHZIIWxaa1QKKgdZrvQNuVqcciNx+/GfVp8loV7VxSdPPuj0dh1aNTVC5Uc42k4rb5MgdYWO0n4unNMQQzDtPOepw9xnJH0IWWtl3raGxVOsr7OZLhVsNPbYnDAYDyS0eQOMk+g914qW5bcUjvtEdmuM8g5bFMR0D278j55X3vDOK2Cx3CAdNFLTExtb+yx2QSOOO2B9FrOnFzjHS0n3Z0416lKhUreLGTitox4WdsmiSyPmkdNK5zpHkuc4nJJJySus54ABJPAAHJK46sc+S3fQFopaail1beGYpKQ5pmO4M0nlgHuAeB7/JdOrUVGHHwjytnbTvK2nO3Lfoj1U4GhNMfaZADfbnGRE3zgj4yT6Hn6njyK0ORxle6SRxc9xJLjySfMr2ahulReLtPcKokvlPDc8NA7AewCxx8yFC3pOK1S+5lnUbyNaSp0vsjsv+fybDt5JUQ63tppy770ha/Hm0g5UY+Jx8Apbq2PAMV1PwS3yIcRx9FM22bWW6humqKlgLaKMxwA9jIR/TI/FRDebYNd7u6c0pEfig1QrrgQcgMByQfmAfxHqqJSXiTn2Swem6FbTzbw7tuXwv6mw+PGSE7QaSM/T9qkrQQDwR+p+9x9QqVq039oPqKCbU+n9I08gcbdTOqph/CZMBo/Buce4VWVxaP2I+nTeWERFaRCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiICX/BzbHXLxC6cd8MPiojNVSZ8g2Jwaf8AncxSL4v7m28b1QW5rw5lFSwwnBzgnLiPzXk/s97UKrci+3Ujmjtgjb85JB/9i1reGo+3b/aimaD0srHt/ayPusDePTkdlbYpyuvhFi+08zhzwuqQFoyM8ei7QeFyMHLSOCvRo187m7bSbaUGsdOVGrNY6qpbFpuOd8IaZGsfIWnBLnuOGjPGO5W0VlF4VmPFPW3+7VpZhhqHGqe3I9HBmCOOMZCgm726JsLc1EzYhMHCF0h+G0kgOcATgEjufZTr4o9R6QqdEaQsun7vZ6owVTJquGhlY/4XTAW5eGZxkuPf3XFuadR1VGUtm/5GwmsbGo7s6Y2zstmtt/211oy5RVNUIJbdJU/EkwRkuDSA5mOM5AHI+umjsvHSG3TSiWn+A6QcZbjI+i9hx5LqW9N046XLPuVyY7hOy5C5yMK5sry0z36D043W25lj0tK7ppZZPjVZzgmJvLh9QCM+6vdaK6yvP6LtNdQyGkYI/gQTMJiAGAOkHgADGMcYX5zsv9ysN+uNTa5nQVM9IaQTNOHMY8AvwfIkcZHbJWM0terjpe9U97s9XJSVtM/rZIw9/MgjzB7EHgrjX1pO5lnOEjZjlI/RXc/RNs19o+t0/c4wRKwmnlxkwygHpePke48xkKh9FFUUE1Vaa9pjraCZ1PM09w5pIP5g8q+m2WrafW2h7TqWmjMX2uEGRhH7EgJDwPYEHHqMKpnibsn6F31q6ljQ2K60bKjjjLwOk/yWn0itKnVdFiaysmiOyecYWzbEbh6f25v2oNS3eCatq5Y2UVFSwECRwJ6pHEnhrR0sGecnsODjWwCcBaTXtEdbP1cH4h/mu7c0lVhofD5IU3ufoRs1unp/c6gqZrU2WkraUgVNFOQZGA9nAjgtJyMjz4Krz4tNMs01urSX2nj6KPUEJ6yO3x48B+fcgsPv1H0WD8Htm1jPuZT3+x03RaaYOhuU8zi2N8ThzG3+J+QCAOAQCSOMzb40bOys2pguxGJbZc4Jg7zDX5jI+RL2n6BcCko2t4o03lMtluisLeR24WF1I11LU0twhd0yxPGD6EHIP45Wbbgsa5vYgHKx2ooDNa5HZwWYf+B5/JekksxZrReGT/4pYY9feGOxazo4S6WjEFW/HdjXt6JAfkSPwXx4J5m3jw+6s082UPqI6ypaI/NrJqZgbx6FzX/mslsIItZeE296acPjTU7K2iazzJLfjR/TMmB8loH9nreG0es9Uaamw2SspI5257l0L3Aj8JCfovJVFp1R9GX8NM9/hgq204tkbnYNLcnxEegccj/1Lf8AX1OKbW13j7ZqC8e4cA7+qjykoX6N3t1hpqNoijFWK6iHkGOw9oHyDwD7tKlnc+BlVPbNRQDEVxpWlw9HAdj74OPou7TmnUhNcSWD5Z163cf2iHeMlP8AD/qacPRD6lMgea33QmldP6hs5M1wf+kGv6pI4zgsbnABBHOeeR6rZr3EKENUuDzHTun1eoVvCpYz7miyQTxxMlkglZG8ZY9zCA4exPBXXnthTDubZ7xW2i32ew0QNE17WyBrgOnGA3IJzgdyRlajr/TNo03bqGKKWZ9xk/vPvZa4AcnHlz2+RWrb9QhV0p8t7I63Ufpytaa5LeMEst7fy9TS3ZcCD2WzaX1BTxW91iv9L9rtTjlhb+3CfUfn6f0XbpfRN1v9EKylkpYoC4tDpZCCSO+AAStkn2pkbb8x3ZpqxyQYyIyPTPcfP8lm5ubd+SctyPS+l9US8ehTymu/DRi2022VM8TvuFdUNHIgLHD6E4AP4pvDUkVFoo6MGK3CkEsUbRgZJI7DzAAH1PqtJracwVc1LI9r3RPLCWHIJBwcH0W22i92W62WGy6pbLGKbimrIgS5gxjBAyfIeRzgccZUZUfDnGqm5JF1G+jc0alo4xpuXde3ZmmF4x95Zh9gqYbDFdakmL7TIGUkOMvm9SB5D09fqM7HFbtvbU8Vkl2nu8jPvR07YiASO2SQB+J+i507PV6n1kb1XtbFbbZH8QMH7EYGS0D1OeffCsqXTabiml7mvbdKpwkqdSScnwk84Xqzz7k1UOmdH2zT7pBG2OA1da4evJ5+ufwC1bwp0lPBQas3avn6inndIIZXj9injHU8j2GGj/SQtW3w1BV6kuQs9C1zrjf6sU9O3+FmQBn0AGAfqVsHiqutLtj4f7Nt3apA2puETaV2MZMLMOlf3/ecR/zFc+7k4Uo0lzJ5Z7/6eoKcql1jb7Y/CKj7l6oqtaa9vWqKsnruFU+VjSf7uPtGz/SwNb9FrqIqD0gREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREBcD+zqo3Ng1bcek4c6nhDvLgPcf5/mogvzn1O6epaiX9o3CqdjOeDKcflhTf8A2evGitUEd/0gzH/0lA+ZP9ub78QYeKucEe/xStnpizWmTa8pkjwF8PdhhI7gcL7cMr4I4yV3+ChI3va12ytu0lHqPcK4vu96nnexlpYHPMQa4gD4bSByMHLiAc4BUp3ncbS2l7RSV8+xlZRWurkENNNWUlPC6VxaSAGkOJyATknHHdVXvsdDDCZQImz9TSCMBxw4Hj81PXiC3E0/rbQGmLPpdl0uddQVcE9S2O3ytaGiB7HYLmgEgkDj3XFuaH71a3nL9eDYi9jVN6dS7c6tpLdVaT0hXWPUMVSPju+zMhhMOOc9DiDzjHAPf66YcALrmqJKeVsddR1lE5/AFTA5mT8yF2O75HYrp29ONOGmLyvkrk3nc4J5XIXyuQR6q8i0apqMFt1kIH7QB/LH9Fsezdm0VedVN/291LDZ7XDhxic14dUnP7PWAWtHqSQfT1WF1VEWzRTgcEFhPv3H8ysKWgnlalaDknFPGS+O6R+meiptMzWKCLSNVbp7XA0MhFDI18bABwAQSP6qt3jTia3cLS1QThz6GVpHrh5x/NZjwEwyRaZ1LOWkRvrYmg+RIYc/zWs+MisbW7rWWijeOqithc9o8i55I/JcKypeFe6E8mZZaIqe8NHC0u/xO/SUoPHWQ4fULbqjr+zyEfthpI+eOFr+oRBNFT1kUjcvGHNzyPp+IXpJrKKoLckfbLf7WmjaChsdNR2mqtkJEbIXU3QQCRklzSCSfU5Vn/Eq6Kv8Pl6qJQGGSmgmDfIO62OAH1wqGWJsc19oIJZY4o31MYc95w1g6hkknsAMqzXiL3m0dqXbyr0TpCauuVVO6GP7RHAWwhkb2uPJIJJDcDAI57ri3Nt++g6ce+5dskQnRvBo4j3PQP5L5rW/GpZYz2LCPyXVaHS/Zmsnp5ISxoGHAc/Jep5bg45zwu5yarXmJm8BVX8OTVNnkfkGOCpa30IL2uP16m/gFGmx9ivNi8Y0tmtsbgKC51jKk54FMOvJJ9COnHrkLZvBPPJTbuXKl6jie3PYR69L2u/orCab0xZNO7h693BnjDaiXoikcG5LY2QsmeR8+oZ/yry99iFeS9UbCjnBEW/JpZfE5bBQvzUMtIFcB2AzIWg++CD8iFIOpiW7VaeEmC8zSdHrjqf/AEwoV0ALjrvXN51zUNAqL1WfBpmA5EbBgAA+gAaM+xUwbmVLYa+isEA/3e2U7YznuXEDv74x9SV06MHFU6b7bnzj6hrwnWuKi4SUPl5ya1YTbzeqX9LmQUId+t6BkkeQwOcZxnHKnbTum7dZKSpks0ZbJVND2/GJ9MgcjIGTyO6gq0VMVFdaeskp2VDIZA8xP7Ox2B+vK2+5arl1Nqi2sbUPtNI14Bd8YjAPLiTwOcYH0UOoW9SrJaftOd9NdQtbOk3USc28L139zd9GU2obNSXGp1TXCWNmZGNDusAAEucMDPyHfjstL1xrS1aitLYIbY6OqEn97KASxgzwCOcnzGOOVs+sNwIrRd20FJTQ1kbIwZiXEcnsARkdvY91EV1q5K651Na6NkfxpC4MYMBoPYD6KiwtZSn4tSOPQ6P1D1anRt1Z29TVypJ7/qSBtJfrpJWRWCmpoHUjOuWWUg9TG/jg5JA+q37W10bZ9MVlY5wEvR0RAnu88D/v8gVrGytpNLZprpM0iSsdhme4YO34kkrC72Xj41zpbPG/LKcfElA/jIwB9B/MqidKNxe4itlydO3u63TOgeJVl5pLEV7PgjwtOSSSSSSSTkkrg9vVc5HquQM9u69KlhHyttyeT4aT1ta1pc5xADQMkk9gFIGoKmHSWiILG9zY66vHx65xPLGAdj6DjH0J810aQscVmt79W31gjiiGaKF3eV5zg4/DH1PYcw3uZe7zrPVsWkrQTPebzIGykE4poifM+QA5+QPqFz6s1Ul/hju/c9b0rplWCUEv3lT/AOY93+TY/DtYP9uN07hr+qYf0TZXfZreXfsukxnPzAJJ93AKBPFNr8a/3Zr6mlmElqtv+40BB4cxhPU8f5ndRHt0qxXiC1Fa9ltjKHbzTs4bd7jTmAOZw8MP99O7HYuJwD78dlSBciVTx6jqv8H1OjQhbUo0YcRWAiIpEwiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIC5P9ndOP9n9W07nEgVUDw35scP6D8FB1a6OPcS/sjcS01lQQT5frTweByM4PuFMP9nPI51dq+nLf1fw6dwdnzy8YUT6soX0G72pabGMXKqwPYyFw/IrZ6btXl+CzPlPQM4zlcgA+fK+Qe4zyO6B2DkrvZNfg3zZ7Wm1miNMV1fqjTs121T9rf0NdTCTMeB0lrnkMa0dj3ORkAqUdQbt7mWHQkesaLbmxWywymIwmauEr3NkIDD0x9OByO4GMqtFfJTyRTwBr5JDGeoMjLyAe2cA4+qmTUO42lrz4XaLRja6eXUEFLBH9lbSyuPXE8HGQ0jsO+Vxby3hGpGT3y99+EbEW2jB7n7w6m3D0e/Tl301aKT4krHmrikLiwNOfuA5IJxjOey0AfdYGk5wMZKyEWltdTWCa+w6Puf6NpoviS1Erfh/dHctB5OPZY2ne2eBkrTlrwCPkV0raNKCcafCISb5Z9jlchpwuQ3nIOF6rVPQ09zppbnSy1dE2Rpnhjk6HvZnkB3kcf8A4O62G8LJXnLMBfXOqIXUsVFNIQR9/GACPT1WvyW+4dJxSzZxxhuVJ2uJtL1F7MmkKe409udGCYq0gvY/JyAQTkYx3JPfKwVM6OWMSRuDm5xkeyrS1rL2LFJpbEw+GDeDQ2htIDTOo2XK31b6l80lU6DrheTgAZaS4YAxyCO/KjfcnUcetN075qWlcXUReKakJH7UTBgO+ROSPYhYmRscjemRjXD0IyummpoqUv8AgBzWP5LQeAfYeSop2VOnVdVcsOeVg7HlzoXtaQHEYBPYe669NWvT1HcmSXygq7hSYIkZDOI3kkHBBII4ODjAz6r75xldNRVuhGGU80ziOA1vH1PYLZaTWGRUn2MPdbfQC+QRQMc2Cd5/Vk5IGeMnHp3+RWfp6eGmYGQRtY30AwsfQ0E7603GsIEuMMYDkNC9lZUOhhMga13Ty4E4yPPB9ViKxuw23sd5OeF8uHHK+KWaGphE0D+pp49CD6FdhzjlSIPZm4eEyd0XiBghb2lp6pp/5CR/JW2hZRXS76t0xVS9L5wwuA7mOSmYwkfLH5hVM8J3QfEBShrGlwhqXdRJyAGHj08/yXm8UmudV6K8UVbd7Jcn0z6eCldFHkmN7DC3qa9vmCQcrzfUYa7jbnBsqWEe/Tt0n2rvdTorUofbqqhqXPpKsA/DlY45BDsdj3B9yDgjC3gVwuebgKttV8c9ZlbIH9RPOSQvvS2/G0G59np7VuTaqe23Nw6Xiqj64C7+KOYcsz6Oxg+Z7r03nw90U9ObxtRrSaiD/wBZFTyzGenf5gB45A9yHLZodShHCrLD9ex4/q/0lC8lKpRm028tdsniJGcJx58rTL9Wa929mij3B04W0z3/AA466kkBY89+ADgnHOMg+yzen9UWC+N/8vuMT5AMmJ/3Hj6H+i60Ksakcp5TPAX/AEC+scucG0u6MzjJ7qT9DaDtt100ytuTp2TzuJjdG7HSwHA4Iwc4PdReSM91l7Fqm+WV4+w1rjGO8Mn3mEfI9voqLqnVqQxSeGR6LdWltcaryGpP9CwVNTQUFsZTU0bjHTxBrGgZJAH8yq76jlq6i9VVRWxPinlkLnMe0gt54GD6DAUi6d3Rpp8R3qkdSu4HxYcvYfcjuPplaXuBeYr1qSWrgeHU7AI4iBjIHn9SSuZ02jWo1ZeJH8nq/qq/s76ypu3qcPCiYCmp6mqqWU9LA+aV5AaxgySVvNustm0lBHcdVTNmriOqGgjIdyO3V6/Xge69VI6n0XpOGtbG03q5sJjc8A/BjxnI9O4+ZPoFB9XV6v3J1VU6f0RA+olYcV11mcRHACcZB8ux55JxwOMreqVXVTbeILv6nO6V0lwnGEI6qrWXniPz7mf3V3PrLpc4rXboDXXiciKht9OOpsOeASB5/mfYLatE6dsOxGhK/cTcCrZPqOuZmQZBeHHkU8Xq4+Z/oMr5oLLtx4cNOv1BqS4Oumoqtv3ZXgOqJ345bCw/sN9ST8yqj72bp6h3T1N+lLuW09HBllDQxuJjp2E/9Tjxl3n7DAXLq3Pjrw6axFfqfQundMhYpyb1TlzJ/wDeDEbo61uu4Gta/U92diWpdiKIHLYIhw2NvsB+JJPmtYRFFJJYR0AiIsgIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiL32C0XK/wB4prPZ6OWsrqp4jhhjGXOJ/wDzugPJTwzVE7IKeKSaWRwaxjGlznE+QA7lWY2c8Kl1u1PFfNxaqWyW/pEgoIyBUPbjP6xx4iHtgn/L3UibZbfaI2B04dV61qYKnUBAxK5nWI39OfhwN7k5PLvPHl2Ub7l7t6u3KkdTmV1lsAOG0lO4tfMPWQ55J9Owz2PcqVKpcvFPj1JpJbslmv3c2p2itjtM6CtMdyrYR0fBozhjng4zLPgknvnuc/PKrhqeouOqtX3LUtXFDbpK+YzOihJIZkAYGTnsOSffhcU9BS0zQIIg3Hn5n5lfNVWQUgzPIGD0J5P0XZtLGFss5y3y2Yc29kc0dFDSh3w3SPc/GXOdknH/AMrvPbAWMhvAqJWspaOaVhOC88AD1WUI9FvLDINepsO1OvrltreLrVUlgob5TXNsYmiqJOh7Czqx0uwcA9RyMHPHbHM06L3Y1dq6yXC9aW2gs5gt8j46iZ13iYWPawPIDTECeCDx3Vc2R1VTXU1vt9FNXV1W/ohp4Rl7z6AKXfD3fLttvT6otmpdF6nfBc5IpIY6ahLyHAPbIDyAMgsxz5FcjqFCl9+PN6ZLYSbRhdX736+1tYJ7XIy12a3VcZjlbSRvdM5mcFpc4kDPY4AUfRMZDE2Jgw1gAA9gtr0ltRuZqCpdDQ6altlFLUvc2quWIgyMuJB6ckkgHsMrU6inq7de7pZq+SGWottW+lklhOWPLTgkey27V0I+Sl+SE03yc9RzwuqeppYXBs87Y3EZAccZC7i3I4XXPTQTACeJsgHH3hlbr9iCweSKpluNfT2qzMNVW1cjYYWjgF7iABk+eSFsOodB6+0ND0X7S1UKUE/7xTD4rM59W5H5ha3WURjiD7a37PUROEkT2HDg4HIII5B9CrseHrceDcjQzH15hF8omfBuFMBy4gYEgB8nYzjyOR6Lm31zVt8SisruWxSawUnivlDK8tMjmEHBDwQQfdetlXSuGRURkf5groXf/wAG7xc5Lbfrdp9lwzgwXGmbDJ6ZAcB+IWPrfDztFcyKgaZaxr+QaatmYwj2DXgYWvHrEceeLMeGnwU9fV0rASaiMD/MF5n3q2MBDqlufRoJVyaXw5bQ0zw4aZkkI8pK+dw/Avwtps+1m3NoLZLfo2ywOZz8Q04c4e5JyfxWJ9ap48qeTKpFF6SDUNzpairsdgrqqlpojNNUuiIjYwDJcTjGAPdYmhppLxEKqumcWE/dibwPqrZ+KLcLSlDtddNKafvFBJdK4spzT0bgRHGXgvJ6eAC0EfVVht1MKaihjByAwcrcsq87iLlJYXYxJKK2O6nhZCwRxtDWAcAcBdkjuMLgHnHZfE7g2NzvQZW8lgq5Zvfg+pzNvlJVZ4io6h34kD+q0rxuPe/xEXrqaQ1tNSBmR3HwGf1ysbtbqm/6N1S3UliLZHw5bUQPGWzRE8sPpnGQRyCAVaHWOldB+JLb5l3tEsVDqKmiDY53Y+NBJ/wpgOXMz5/Uei87fwlCt4rXlaxk2GsrCKCK23gO0XqT7TU65rLhX0en42OhpqcTFsdU/wDecW9ulvPPr8itN248LGubpq51Lq2mFns9LJ/vE7JGvfO0H9mLB8/4jwPnwpb8QW5dv0vp+PaXb9kMEkcIpauSEfdpIQAPhgj98+Z/qVq4deXhU92yMU1uR5v7r5m424j4KKYyafszjDSkD7s8nHVJ7gkYHsAfNR7X26hLHVBzTuYC7rjOCMDOV6aGljpKZkEQ+60dz3J8yVkNMaVuOvtaUGkbWXBs0gdXTtGRBCCC5x8sgdh5kgea9FCELajj0RH72bLt3pfeGt0XHqaw00N3tj3ubHS1EoMzmtOC5oOCQTkDBySDwvXQ67hpaw27VlsrdP17D0uZURnpz7HAP4jHupI8QO8UWyVNYNGaJordU1METTNBVBzmw04GGg9Lgetxyck+XnlY/TXiP2m1/Q/ovcXTkVqle3pJqYhU05J44eAHN9eQMeq5FPqVXOpxzHt6nGv/AKd6feZco4l6o6aWppKqnbUUlRFPE4ZDmOBBH0WQ0+ymqb/QQVcrYqd87RI5xwMZyefyX3XbC6YvVL+ntptay2/rJdGxk4qaV3tkHqbz6l3yWpV1g3h01K6mvGi23poOI6qgk+6/0JwD39MD5Lehf0a6cU8P3PH3H0Zc21RVKDU0nnD2Mz4hdYFsVwq6aTLSBRUIb2JPAIH4n6LYW3ODYLwyx3SGCD9PVbWuDZRn4tVLyOrzIa3Jxns0rX9vNrNa6z1hbr3ru3MslhtconioHHMk7xggEeQyBknHHAHJIjTxvbm0ertXUmk7JNHNbLG55mmjdls1S4AHHqGAdIPqXey511UjNxo03lLk9n0axqWlKVSslrm8v/ZEGau1Je9WX2pvmoLjNX19Q7qfJIe3sB2aB2AHAWIRFA6oREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAV2/DJoWw7YbRz7o6sYYblXUhna8gF9NTO/u2xg/vvy0/UDjlVJ2tsEeqNxtP6em/ua+vihl92Fw6vyyrceNi7Ojg05oi3yfBpZy6onjj4HRHhrG/Lvj5KGh1akaS7/6E4ruQtrrUl33E1K/UF7keKZpLaCi6iWQReQ57njJJ5Jye2AMbJJHTxFzyGsaMkk4AC+mgxMDQ3DQMADsAty2M20fuvqGSW4yy0umbdIBUuYcPqHdwxp8sjufIHjk8egk6dpSzwkRw5Mwu3uk9WbjXA0mlqHoo2vDZ7jOCIYvXnHJx5AEret89hrdoHaYaijudVc7tBVxCtmfgRiJ+W/db3GHlgySSc+XZZ/fPfmxbY0b9B7XUdEK+lYYXzsaDBRHsQB+/IPfgHvnsshsRfrnvZ4ftSaf1Ncn1t1aZqYzPaMkuAkieQOPuuAxxjhcafUa0pKfEcrYmtK2RXSzysmt8RZjIGCB6jhe8cBYPTTJaapqrdUsMc0Mha5h7tcDhw+hCzhAz2XoYPVFMpksMU0tbRXOiu1rq3UdwophNTTNAJa4H08x7KbNCb4br6j1LQ6UpqXSEldWB/wAKpqYJ2BxaCSD0SAZOPIAcqDauYwQvka0uLQSB6rfdvtut0J2aa3C0tBaLi2KRtXCyKrDHjBwY35zycYIHZad7GjpzUW/Yshky29uut5LVq+XSN71HQ24OpGVH/ksJjY9jsjAe8l/BBB5xwVFlNTinYWjqJc4uc5xyXE9yT5kqfdebZbp7s6qob5eLRaNImkpjTdf2s1L3sLi4ZAA7EuxwO55UZbvaN0roa52e02TU1VfL2fiG6uL2mNjRgAADPQc54JJ75xwFTY1qSShFeZ87GZJvuauFwRwi4yupgpwx258192K96i0lqOHUulav7PWx8SxkZZOzPLXjzB8xwfMEHlfAKDkeihOCmnGSymIya3LPaR3R2s3XtsVu1ra7bSXYDBpbk0FnV6xyEDHPbsQtnl2X0mCJbFddT2Bp5Att3eGH3AeH4+mAqYVtupaz++Zh3k9pwR9f+6y9h1RrvTcfw9P60udNCBhsLpS6Mf6DkH8Fx6vSppvwZYXoy5TTLv6T0bFp93WdQ6mu0gGA653N8wA/yjDfxC2KaGOaB8FRE2WJ4w9jxkEehCo4zene5o6f9rqYjGOp1tpiR9fhrHXrXm5l/gMN311cPhuGHMpyIWuHoWsDQfqFpLo9eTy2kT1ImfxgS6JodtDY7RJZ6W7i4QzCkpgwSEDqByAMjAdnlV1tUtRJSNNRGIyAAG+eAO5XTBaaeGczufJPMTkySnqJPqvcMgcru2ds7eGlvJVKSZ9EBeS6OMVBPJ5iM4XqaMlYnU1QIqRsZx99/ORngc/9ltSezIRWWdWkg40csmCC9+AfYD/3Kz+mq+/6UvovulrtJbqwY+IwEGOUZzh7TwQfQ/keVsN12o1jpnQ9p1ZTUpudsrqRlTURRRn4tIXDJDhySMY5H1AWo0NbT1rQYJWk+bScEfRa8HTrxccpk3lPKJT1Lv5ubfrP+i4IrTYy8dM1XRtf8Rwxghpc49Ofbn0IUX01HHTlzy90s8hLpJXnLnknJJJ912yZYOQQB3z5Lxx17qmvit1sp5LhXTuDIoIQXFxPYcLNOjRoJ6UkMylsLnVSQBkNNG6eqmcGQwtBLnuJwAAO/JHHmrNbc2m07A7RXDWeri036ri+JNE5wD3SYzHTM9yeT6cnsMrr2X2kt+gbdLuRuXUU0VdTxfGZFMR8OgaP3j6yeQHl81WPxI7uVu6WreqAvhsFA5zLfTuGCQeDI7/E7A48h9Vxr26dxLw4fauX6kvtRomutTXPWOrLjqW7yddZXTGRwB+6wfusb7AYA+SwiIqSBn9G6z1To6t+2aZvtbbJScu+DIQ1/wDmb2d9Qpz054wtf0NCKe72ay3aVrcCo6XwPd7uDT0n6BqraihKEZcoym0TZuN4mtytY2qS1MloLFRy5bMLbG9skrT+657nOIH+XpznnKhQkk5PJXCLMYqKwkG2+QiIpGAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiICS/C5IyLf/AEg54GDXdP1LHAfzU7eMeAw7sWOeQ/clt72sz2yHnP8AMKqujL5PpnVtp1BTN65bdVx1LW9WOrpcCW58sjI+qul4vbVHqTb3TW41ncJ4KbomLwO9POGua7Pp2/FZoSULqEn8E48NFfJSS0ho7jurIeCmqjm2pudsj6WVlNXyfFwOcvaOkn17FVxY9j4mvYctcAQfYhbVsVrpu2+5baq4TuZYrqwx1wwSIyOWvAHPB748ifQLrdSoOtQajytzFN4ZX/VFJXUGpLnQ3QO+3QVcsdR1dzIHEOP45U4eBHVpsO8Zsc84jpL7Svg6XdvjsHXGfngPb79Snav3Z8OGobrJFd7HbKmWof8ArKqtsrHBx/ic8jP1+S0/crw5l13tuvdkamnhc2aOpjoxUYjBB6hJFIScDgZaffB8hwZzwtM1jI0vlGjeJ/TQ0RvBUVtKzFDdj9tiAGAC4kSAfI5P1WqxSCVoc3kEZBVpvE/oiq1js1Fd56Bkd/s7G1hjj+993p/XxgjuP3v9A9VUvTk7ZaH4bnAvi4PuPIru9MuXVpb8rYzURkXRteMOGQQu6yXHUOm2Sf7M6mu9oa8l5ipalzIyfUtBwfrldRd5BcHLlvzhGaxJZKoyaZtFz18647fTfpfcjXVRqV7DGy1kllM5+cZLgcObjnsCtQoYo46ZrvhhsrwDI4kkk+eSee68l9hDYGVTR96CQPzjnHYrIRua6Nrm4IIyCFXRoRpZwTlLKyfXZAUQK8hkLkdkCEoYYPovLV08krR8KeSFw5Dmn+Y816e6LGAsoxDo76w4bVxSDyJaAf5L6it9fLI11dXFzAcljOAfY4AWUx+K57JhE9T7HLQBwOABgBcrjPC4LgASSAB3JOFghu2HOXhtFrl1PuHZbDG34gqKqOJzQM8EgvP4fyX3LUPlZOaGnmrDBGZJTCwuEbR3c4gYA9zwpW8EmnHXTW101fXQ5p7bCY4XuHHxpPQ+oYDn06h6rUvK8adKUs//AKWwjhkvb1b32LaTUNh0zWWqSugqqUyVBhfh9PEHdDCGnh2cP4yP2VgpdO+H3d4MrbJdaG23ioPVijqG0073f4oXcOPqQ3Puqp+JXWLdcby328U8vxKGGX7HREOyDDF90OHs4hz/APUo4BIOQSD7LztOnKCTi2mZc3kvfL4XNLRSuqblq+6CjB6nN/Vxho/znP8AJddbrfYHZWgmj0yKO4XhrenNI/7VPIf8cxJAB8wCMeiosZpT3lf/AMxXwrJqpU++bY1kh7ybtaj3JurpK1wobWwj7Pb4XHoaB2Lz3e7nue3ljJzHiIpJJLCIBERZAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAV2vB3qmg3B2gum2Go3id9vhdCxrnfffSPOQRnzY7IHp9xUlVm/7Pi0RVW4d8u8nLqK3tZGM+cjwD+TT+Kqrfbn0JR5NJ1JZ7xpLVddoualmqrjTVPwKRrIyTOHH7haByQQQQB648lY3Znw826jpor3uHE263KUB7aFziYYMjs8Dh5HmO3sV87WQjV/iW1rqW8tE0lgmNDb4nAYiDXOZ1AfIE59XlTfZdR2u93C50dtnNQ+2zCnqXtB6BJjJaD2JHY47HhXXt9V0KEdtt2WqKW5Du6t427q2Ve32nNu6XU9ybGY5ILXQxxMon4wCZQ0BhB9D7HzC1vbLRviJ0xpmK12mutNuoWOMkVPVvZK9meS3ODgZ8gcclWVpqakpHyvpaSCB07y+UxRhpe7zLiByfc8r4prjR1dTUUtPVwyz0xDZ4mSAviJGQHAcjI5GVoRu2o6Yxz87jSQPV7l7zaK+JFrrQkV9tgBElXa2Zw3HOQCcjHckABVX1RU2mHV9RX6afI611LzLDC9vS+EOOTE4dsg9iOMAL9HL5daCx2ie7XWb4NDTgGaQsLgxpIBcQATgZyT5AE+Sql4xtF2C2V1i1bpuGCNl7L2TNpgPhyvAaWyNA4y4OOcd8Z8yuj06unU+3HwHFcETTPnoWxm62+tt4lAdGaiFzA8EZBBI5HuF2MqqVw+5PGfQZwfwU9eErcmK62+fbHVDGS1FMHGibVMDw+IftQkEclpyQD5Z9OZS1Bsptley51RpKhp5Dz1UgNPg+uGED8QVuVOrKjPROL+SHhJ8FMaoslgfEcEPaQQV4tPySOozFID1QuLDn08vy4+itNc/C5ouUl1ovd6tbjzj4glaD8iB/NRdq/Y+s01uFZdPw6rAp7617Y62emwBMwZDCASMkEEHPr6K+l1OhU74ZHQ8Ee49ShUrVfhp181xNPqm0zjyzE5mV5D4dtzmHArrJIPUzOH9FYuo2/wD7Ix4ciM0IUns8O+5heOussoaTyRO4kD8F66bw26+kIE9/tEAzyWhziB+Cy+o2y/iM6GRIODyhcPVTZS+F3UT8fbddUrQe4hoySPxKzVt8K9ka8G7avvFa3zZExsQP15/kqZ9Wt48PIVNsrw+aFgzJK1o9yAuqKpZU1LaWginrqp37MNPE57z8gBkq3ti8Pu1tqcHusDrg8dnVdS94J9wCAfqFJFhs1msNIKWyWmgtsHnHS0zI2k+pAAyfcrVn1yCXliSVL1KWaZ2i3P1NIPs9gdZqY4JnuJ+GcezP2s/MBSppDw32ugqYqvWN6mvrYw58lJTB0bCQOBxyc/Q8Y8+LIFxecH+S0vWl3sGnaepvVzr47exkb3l7ph+vPYxsBJBJ6BkAZ5HqVz6nUbms8R2+CSgkQn4o7zp/TmjLVt5pC109rkuZbU1dNSwiN4iB+41+OS57sHkk4Zz3WW1BLHsb4UTD92K93KMxtxgOdUzg5Pv0MH4NCjfY6y1u7O99Zq+7wS/o22yNqHNeS5pI4hiySScAZPPZvuFq3jX3EOrdyG6coZ+u16fDoPun7slQf7x3HpgNHph3qrKr+2j6bsi9kQISSSSckrhEWSsIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAKYPCZuNS7d7nsmusoitN0i+yVcjjxFyCx59g4c+xKh9FiSUlhhbF495rFqDQl6uG7u3tzgFDcoW/pKLqD2PLwA2VvkQS5rs+vPIJUr7EWWCx7SWBsQzLV0ja6okJy6WSYB5cT3JwQM+yira5z9e+CiazW8vqK+hpJqZ0Y5eZIZPisYPPlvSAPdSR4ctSU+o9obI6KVpnoKdtDUMB5Y6MdIyPdoB/FataUpUMPlPGfYvW+5kNQ3y63q0akt+kJ20+orLK0silAImwA8NIP7rxlueMHz4WmPZ/wCJOnoNw9B1Zs+uLY0wVMLjgPLf26aZp7g+RI449Mj73MkuGid59M62pIpnWm7Ftou3QCWjLsRvdjzBOR5nBA7rP2jb2q0/u/U6tsde2C0XSF4udAQfvy92vb5ZzyfmfVIOFKGc7vf+geWzMbfX6u1noxx1JpyotVU/rpq2kqoiGyEcOIB7sPPt7lV63722vekKO21VBV1lx0TQXAVRoyet9vJPPSTz0EcegOM98q2gxjgcrqq4YaqmlpaqFk0ErCySN4BDmkYII8wVVRuXTqalwzLWSpG+ekomm3b2bbVAdQzPZNV/ZuHU8wP94QOwzw4eR9jxI+jvE3omtoaWHUMddba74YE0gh+JCXgckEHIBPOMLybL07dNbs642onY2qsk8H2+mheMsYwlgLMH1bK3P+T3UM7/AG0ly281AbtbYZKjTlXITFIGkiAk5+E8+Xlgnv8AMLqwjRrvwqj35TI7ottZd0NvL1gUOsrKXHsyaqbC4/Jr8E/gvBvbpkaz28nls1RFLc7dI2ut0sTw/EsfIAIPORkfVUfgbaZqb4zo4gAPvjt0n6L10FO6jeKm1VtZQyHkPppnRn55BBVsejqMlKEiLq9mi+G12qabWeh7dfoDh8sfRUxnvFM3h7D6EEHHqCD5rZ/xX542PUmrNM1ZpLRqi6W+nqXGQiKchr5CACSOxJAHPc4C2qLc7dKIARa4ryB/HHG7+bStep0abk3Foz4iS3LxkhcdQCpJ/wCLG63Tg60mJ9fs0X/2Lyz7m7pzcO1xXAH+CKIfyaq30Wv6jxYl5eod0e+KNhklkaxoGS5xwB8yVQqp1nuDVAio11fSD/w6kx/+nCw9Z9ruLg663O4XF3fNVUuk/mSrYdEn/FIw6qXBea+7h6EsrHG4aus0Tm942VbZJB/oYS78lGGqPEzo+ge+KxW253qUZAc2P4UZPrk84+gVZGUNEwgimjyOxIz/ADXa5rQz7rQAO2FtQ6NSW8nkj4z7Eh6n8Q2416MkVsZR6epXDBMQ+JMB69TgQPoFFF1luWo77S0ktXW3e51MrYw+aQyPcScBozkgZK4udSKWIhrsyPPDT5D1VgfDJt7SaXstTulrUspPhQOkoxU8fAiwczHPm4dvY+/F1XwbKm3FLPb1Mxy3lmd1zcaDw+eHiO3UcsZ1DcA6KFzeHPqHt/WSfJgx8sNHmqIPc573Pe4uc45JPclSBv8Abk1m52vp7y/4kNtgHwLdTOdxFED3I7dTjyT8h2AUerkwT+6XLIt5YREUzAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQFkPAjrqps+4E2ipWmSivjS+Pn+6njaXZ+RaCD8gt/iv8ABsv4g7va4/jSaZurWVdVCyMn7IXk/fAHcNOc48jgcgZq/szqqPRO6Ng1PO0up6KrBqOkZPwnAseQPMhriR7q5u+dtulBf7JvDpGnhvFNS04ZcIYz1tqKVw/bGAepvS49u2QewOK46VUcZcSX6lkHsTfRVlJcKKGro6iGqpZgJIpY3BzHjgggjj0K7jyo/wBp9X7eXy0Ok0pUUtvdK8yT25x+G+J5HOGHgD3aMH5rX9393P8AYXUtphoZaC9U9SHMqbbA7NUwjkPBAIAOcYI5wce2j+zzlNwSLM7ZJXuL6uKilfQxxS1IaTGyVxaxx8gSO2e2fJQc7xLWiL7XQ1Gkrs68U0roXU0MjJIy8EggPHOMg+RXnvPiEff7e6z6E0je6m+1Q+HF8eAdMRPBOGkk498AdzwshZ/0X4d9nKm/6ll+13q4TiaeGOUCSoqH9omn0aMkntw4q+FGNKOakctvZGG0fG01sudmqdU70bhRm1zV1M4xQTENdBTDDvvA9iehgAPPHusL4fd52bvVd60LrG2RTmo+LNTFsf6t9PnPQ8eTm8Ydn8+9d97t99WbnQ/oydsdrsbXh4oYHE/EI7GR372PkB7KWP7O6wRS3XVeqJ2nqp4YKGA54PxC58n1Hw4/xKnVTac3s9sY7ENWXsaJvHoOi0VujPpy217qqlMbKgtIw6EOyRG4+ZAAOfRwXhGA3pHAAXv1vcZL9uXqO+yyF/xa57IyfJgJAH0AaPosPdHllIWRAulkIYxoGSSTjAHqvUW6apR1PLxuVS3eDpfGy50b3NBaA8iNx9R5r6tlYZWGGXieM9LwfUef1XkgrKiglNuuFLJTPiPSWvjLXNOexB5C9NVShxbXUjmulA5AOQ8eisynug4pbM9/JXIXnpKllTEHMyCOC0jkH0K784Iypp5K2sH15oSF8h2Vy7gEkgBMBcHyXEBeG4XGKmwC7qkIIDP6ldNdcQXinowZZ3O6R0jPPoPUrzW21vlmkmrOoyMeWuY4EEOB5B9Meig5b4RYopLLN48PVgs+pd2rdR6m6nQysfLBE4gNmlaMtYfYgOOB3IA81tHj01jfKa9W/b6GP7JZhTMrHlhx9qOSGg47NYWnjzPPoo7oLtLY9T2K8w5ElHXxPBHs4H+h/FSx/aGWtlTa9H6nhYCA+ekkkxy5rg2SMf8ATIfquF1Jf+RFvuv1LM5jsVAREVBAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCnjw7+Ie67etg0/qGOW6aZBIa1vM9Jn/h5IBb/hP0I7GB0UZRUlhhPBeua0+HHc+Y3ahvVvoayU9Ugiqvscme5Lon4+WQEZcfD3soJLvSXGmud5a0iJlPOKuqJPk0A9LM+ZJaO/PkaKIoaJY0uTwT1lwr34x7XHTyCwaIqXTuBw+qqmsaDjgkNaS7nyyFWvdLcXVG5F9bdtS1oldGC2ngjHTFA0+TW/hknk4GStRRZhSjDhEW2wrseA6P4eyWq6pvDv0pLgjuOmmjP9VSdXc8AjXybQampXxuDJrq/ocRw7MDGnB8+2FGv9hmPJAFqkdIKp7uS6pkJJ8ySsvpmiZW7gaXpZHfckukRI9QHArw0sbYam4U5GHRVkrCPTBwvTYal9DrzTVcThkFziLifIFwBXpKn9zt6EM+cuPutoXb3Wc0Vu1FHS09zfHmmnjeI6jA44/iA9OVW/XXh415p2Was0zJHfaBpJa2J3RUAehjPDiB/CST6BSJ40dvdV6utFqvulKWatktYe+aGCTEvQQD1NH72Mdhz6Aqve3/iR3O0c2Oinr471Rw/c+z3Jhe9oB7CQEPBHlknHovN21atTjmEs+zLm1nDMLcm3e01rhcKCehqWHEglhcwk+hBA5XfFe4HtBlY5rvPpAIP5qwNr8VW2WoaaOm1npKvp3OGHAwRVcLT8yQ78Gr1jW/hLuA+LNS2tkjuemS2VLCPwZhdGn1Wa2nB/gi4xZXCW8tyGwROe48AHA/llbTobbfcPX9S2O32qSlojjrq6oGGBo+ZGXH2aCfVTLDvL4ZdLAz2OzNqJmdhSWhxdn2M3SPrlaTuF4vbpVZpdDWFlBF2+014D5cezG/db+JUavU6s9qccfISiidNn9kNLaDnirp3Mu19YzqM8wGIz5mNnOPmcn3VZNxqQW/d3V9vjGImXBzwAOPvfeP5lTv4XW6/uVdV601vTywivo2sgM7sPeOrq6gzu1uMKBdd3OO7bp6tucZyyW4vYCPPoJb/RY6ZOc68nJ5EvtNa1COmh+KAMskYR+IU+eNZpqPDxpSoLhltdSPOe5zSyj+qga+sE1NFCDzJMxvzyVPvjgp56fYPTNOyN5ZDcaVspAOGhtNKBn05PmrOq41wIw+1lJkRFpmAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiLaNq9FXPcHXNu0tay1ktU8mSV37MMTRl7z8h5eZwPNYbxuDy6I0dqbWt4badMWiouVUeXCMYbGPV7jhrR7khWQ0j4PpxCyq1rrCCkaR96Cgj6sH0+K/A/6ce6lu+XHTmx2mrfoXQFlbcdTXANEEAZl8rjwZpiOT54GfwAyvFSbK6q1eW3bdHW1wlnf94W23PEcUAPPSTggn1AAx6lUylLGpvSn/ADZYoowI8K+0UrWxM1VdGyDgkV8BJ+nStq3Or59utNaX202vpYYLndiYKSUgdMTGkBz3Hzc4nvz5nvjPqb4c9tmxYZBc45P+K2uf1A+vOR+S1fVOwl/tNZRXzQWr6qettsnxaWluhDiDkEhkg4GcDgtwfMhYpOhNpynnHZruZxjhED6601etv9a1ln1HUtqZZwypFY1pEcxeMkgkc4JIPuFiKypiqImRUjjLVF4MTYsl5dnjAHmrWaE1bUa/vkuhdx9vaRlypWkzOkewtwB+2In/AHgCeMsJHsFv9BoXSWlo5q/Tmjba2tY0mNkMbI3vd5APdw35+S6P9pyox0Tjl4/BHQm8kUaWue4G2msdM2bVV9ffNP6gaI4XzRls1JKQPuHJJGCQOCQRk8YUI+OfR9DpvdWnu1up2U8N8pjUSsY3pb8drul7gPLOWk++T5qU96avXVt1bpTX+uLdb4rFbrgGC20lQZDTgkHrkfgBzjgkY4+6BxkrE/2glinrbdpfWdNKZKNofSPb5NL8PY764cPoFoyac4z9ecGZcFQURFaVhTR4N9G2zWO8kDbxA2oo7XTOrzC4ZbI9rmhgcPMAuz9PRQurVf2eljldqHUmp5OKenpmUjeeC5x6j+AaFXVeINmUssk/XV11vuDuXd9CaNvbNP2yyxA19WxhdNI4jIa0AgkHtjIHBJPYGrsDXWqqqaS6ukgrWTP+M2cFr+rPJOfMqweg59ZX3dfV+4G31Db5Le2qFJLSVcpYK8AAEtdjDXDAIJIHOOeQZrqtI2DWdsp6zWGjKBle5uZIKgRzPjPp8RnDh7/kFfTulZtJJPK7FklqWClekrFW681dbNOWGZjKmSX4jqgtLmQBoJL3Y8gAfrgeas1ttcbhrGk1RtXuhBT1VwtsXTPM3HRUQO4DweMOacEHA7t8wV0671JDtbdKbTG323NLLdLgAIHRljGvz5hjMyOAI5yWgHzKwOndjdVamvFZqjcTVFRQ11wIM1JayGu6eCGufkgAYA6QD275WbmvG4jqq+VdvXJiMcLCOiDwubP0zXQ1GpbhPKezn18TSPoB/wB1rOrPB9SVMDqnRGsOogfdhuLQ9rj/APyx9uP8JUst8Om2nw+mWkuU0nnK+uf1E+vBA/JYq57K37SvVdNrtZXKiq4xn7DWyiSGUDnpBwAPqCD6jutFTg35am/uiWlehSzcnb3Vu3t4/RuqLVJSOdzDO378Mw9WPHB+XceYC1RfoDpq+2reK03PbPcuyC36ipGkywlmMkdpoj3a4Z7dvMZBwqV7u6FuO3Ovbhpa4v8Ai/Z3B9PUBuBPC7ljwPLI4I8iCPJXQm29MluVtYNSREVhEIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIArc/2f+maeOi1LracAyR4oYcj9luA95B9/u/gqjK9O3csWgfBM682toFXV0Tp5H4BPxJ5hF1e/SHD8FVVWpKPrsShye3w20rtXaz1Nuhdg6eomq30lt6zkQwjGS30JGB7YPqVPpdkqum0Fy1ptnoiigrtIuvenKlorGV1pk+JPEJAHEPiOMgZ7gjHupHsm8u39ykbBJexbqg94a+F9O8H0w4BU3VKcqj07pFyxgkNcBeCmvtiqGCSC922RpGQW1bD/AFXZJeLLG0mS8W5gHm6qYB+ZWn4ck8YM5PDe9N266X203x7TDcbZN1xTxgB7mEEOicfNpB7eRAKzbj1dlpl+3P0DZiWVuqLd8Tyjhk+I8/INzla5LurdL010WgdEXa7v6ukVVcw0dK33Jf8AePyAGfVWeHUlhPsY2Pd4l7ZHcdlNQNkDS6CJk8eSBhzXjH5EqMN4f/1H4JLZX1HM1LR0cvV3JfG4Qk59+V87uVwNnqI9ydWfpS/zxOZQaaseW08DyCGukwep5B55Pl5r363optDeCGSz39rGV8tJ8IQyHlr5qgyNb82td+LStx0tFKO++SL75KLIiK8pCu/4TIH2bwt36+RxiOd32+pa8d3COL7pPyLSqQK9Xh86dVeDms09Z5h+kY6atpHMBwTIXOe1p/zBwH1KqqpPGfVEocm3eE63Mt2zVveCC+pmlmec5OScAH5AKWScDIKqrs3UFtsgoNFasm03rGlaY6+x3gF9HWPBOSAeWEjAy059hnKlem3J1LYoxFuDoW5W8g4NbagaulPvgffb8sHHmVTdUJOq3EtXBu1n0zQ0GqbnqaQmpudd0sE0gGYYgABGz0HmfMk8rOnBOVpdo3U2+ujxFT6ooY5j3incYXj5hwGFscV9skrAYrzbZAectqmH+RWtOFT+JMysdjI4X193AWLn1Dp+nZ1z3u2xNAyS6rYP6rVrzu9t5bnmI6hhrZx2homOneT6AMBUY0Zy4TBpHifomacqbDuhbI/hXG01jIql7ODLAT2djvg8D2cfZaH487RS3fRel9c0kbC8P+A+Rv70UretnzAIOPmVt+69y1pufoq4Wyx6RdadPGEzzXK8kxSPEYLsRxDJGSO5z8h3XiqGN1r4Hal1yjY6e30MjYn47OpZCGOHuWMAJ9SVv6ZRpxlLlPH8yMkmmUaREV5SEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAVw/CdrTT2ttsKnZ3VMrGTNikipmF3QZ4HHq+4T/wDuNcSR59sdlTxfcMssErZYZHxyMOWvYcEH1BUJw1Iynh5L7WrTO821jDR6Zmo9Y6ciJMFLVHFREz0GCCD8iR54GV91W8umpGGm3A2zulumBxL8agbPED54cQCfwVaNB+JXdPSlLHRm6097pI+Gx3SIyuA9BIC1/wCJOFLdl8Y9uqYgzU2hpOoDHVSVDZAf9LwOPbJUW3/FHPungmpI2Go1r4ZbgS6S0U1O48kR258P/pAXmGsPDPRPBgsYrXnsx1FLID7APJC+Y/EvsxWASV2kqtkhzkPt0L/5FfMvig2ioObbo6uefWOhgj/PKhqfpL+ZLKMzbdzrE5wg232Xq6qc8B7qBlPH88gHP5L31Fh35140QXW6W3RVpecOioWkzFvpnJdnyI6mg+ijq++MkRRmLTOh2Rgg4fWVWAD/AJGDn/mCibXXiO3V1XHJTPvjLPRycOgtcfwc/N+TJ9OrHsrNUnxFL3e5jWkWUfSbN7CRvud4ubrrqF3PXUPbPWOd/hYOIx7n6kqr+/28993WusbZohb7HSPJo6Fjiee3xJD+8/H0A4HqYxqJpqiZ008r5ZHHLnvcXEn3JXWkae+qTyyEpZCIisIhSDslutqDa3UDq62BtXQVGG1lDK4hkwHmCP2XDyPPuCo+RYaUlhhPBfG33HZHfuOJzar9E6jDct6XCmrWH0BOWy8/P6d1kTpzfPQIMOmr5Q6xtDP2aa5tImA9AeoH5API9vJfn8xzmODmOLXDsQcEKTdA787n6NYynoNRy11EztSXEfaI8egLvvNHs1wUEpwWI7r0ZNT9SzlfuZQh5p9zNlqunkHDpY6JtREfclwGB9SvCNZ+GepJE1gjopPNgt8keD/owFptg8Ytxw2LUui6KpZj7z6OoLP+h4d/NbPD4pdqa5w/SWiq6MnuX0kEmPz5UNT40tfDJqSPczVfhlpf1rLLS1JHID7fJL+TsrIUW9GjKICn0DtrdLhM44jFNbmwxk+WXAEj8FjH+J3ZikYHUmk6x7/RlthYR+JWE1B4wrNBD06X0LMZP4qudsTfwYDn8Qj/AMrfyxqXqb5XUe9W6MBt92jodEafm4nZGS+plYe7Scknj06QfPK1HxMaw0rtrs8NotLVYqa+eL4EzBIHPgjc7re+QjgPeT+z/iPsoT154kt0NVRSUsd1isVG8YdFbGGJxHvISX/gQD6KH5pZZ5nzTSPkkeepz3uyXH1JPdSxKeNWyXZEJSzwfCIitIBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAf//Z";


// === TEAM PERSONALITY PROFILES ===
// bpaLean: 0-1, how much team trusts BPA (1.0=pure BPA like CIN, 0.3=heavy need like NO)
// posBoost: positions this regime values above market rate
// posPenalty: positions this regime avoids early
// stage: "rebuild"|"retool"|"contend"|"dynasty"
// reachTolerance: 0-1, willingness to reach for 'their guy'
// variance: regime scouting divergence from consensus

// Central-limit-theorem gaussian approximation (sum of 6 uniforms)
function gaussRandom(sigma){
  let s=0;for(let i=0;i<6;i++)s+=Math.random();
  return(s-3)*sigma;
}

// TEAM_PROFILES, SCHEME_INFLECTIONS, overrides, POS_DRAFT_VALUE imported from draftConfig.js

// Per-archetype coefficients: TE→WR and LB→EDGE are real positional value jumps (0.18).
// RB dual-threat is still the same position — tiny seasoning only (0.03).
function traitFlexScore(pos,gpos,sc,teamInflections){
  if(!sc)return 0;
  const t=sc;
  if(pos==='TE'){const avg=((t.Receiving||0)+(t['Route Running']||0)+(t.Hands||0)+(t.Speed||0))/4;if(avg>=78)return((avg-78)/22)*(teamInflections.teRec||0)*0.18;}
  if(pos==='LB'){const avg=((t['Pass Rush']||0)*0.65+(t.Athleticism||0)*0.65+(t['Block Shedding']||0)*0.35+(t.Range||0)*0.35)/2;if(avg>=78)return((avg-78)/22)*(teamInflections.lbRush||0)*0.18;}
  if(pos==='RB'){const avg=((t['Pass Catching']||0)+(t.Speed||0))/2;if(avg>=78)return((avg-78)/22)*(teamInflections.rbDual||0)*0.03;}
  return 0;
}

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

export default function MockDraftSim({board,myBoard,getGrade,teamNeeds,onClose,onMockComplete,myGuys,myGuysUpdated,setMyGuysUpdated,mockCount,allProspects,PROSPECTS,CONSENSUS,ratings,traits,setTraits,notes,setNotes,POS_COLORS,POSITION_TRAITS,SchoolLogo,NFLTeamLogo,RadarChart,PlayerProfile,font,mono,sans,schoolLogo,getConsensusRank,getConsensusGrade,getConsensusRound,rankedGroups,mockLaunchTeam,mockLaunchRounds,mockLaunchSpeed,mockLaunchCpuTrades,mockLaunchBoardMode,onRankPosition,isGuest,onRequireAuth,trackEvent,userId,isGuestUser,traitThresholds,qualifiesForFilter,prospectBadges,TRAIT_ABBREV,TRAIT_EMOJI,SCHOOL_CONFERENCE,POS_EMOJI,onShareMyGuys,copiedShare:parentCopiedShare,measurableThresholds,qualifiesForMeasurableFilter,MEASURABLE_EMOJI,MEASURABLE_SHORT,MEASURABLE_LIST,MEASURABLE_DRILLS,MEASURABLE_KEY,MEASURABLE_RAW,MEAS_GROUPS,getMeasRadarData,schemeFits,generateScoutReasoning,computeTeamScoutVision}){
  const TRAIT_SHORT={"Contested Catches":"Contested","Man Coverage":"Man Cov","Contact Balance":"Contact Bal","Directional Control":"Directional","Decision Making":"Decision","Pocket Presence":"Pocket Pres","Pass Catching":"Pass Catch","Run Blocking":"Run Block","Pass Protection":"Pass Prot","Hand Usage":"Hand Use","Run Defense":"Run Def","Zone Coverage":"Zone Cov","Leg Strength":"Leg Str"};
  const prospectsMap=useMemo(()=>{const m={};PROSPECTS.forEach(p=>m[p.id]=p);return m;},[PROSPECTS]);
  // Trait value with scouting fallback (same chain as App.jsx tv())
  const tvFn=useCallback((id,trait)=>{const p=prospectsMap[id];if(!p)return 50;return traits[id]?.[trait]??getScoutingTraits(p.name,p.school)?.[trait]??getStatBasedTraits(p.name,p.school)?.[trait]??50;},[traits,prospectsMap]);
  const ALL_TEAMS=useMemo(()=>[...new Set(DRAFT_ORDER.map(d=>d.team))],[]);
  const[boardMode,setBoardMode]=useState("consensus");
  const activeBoard=boardMode==="my"&&myBoard?myBoard:board;
  const activeGrade=useCallback((id)=>getGrade(id),[getGrade]);
  // Check if a player has a user-assigned grade (ranked position group or individual trait edits)
  const hasUserGrade=useCallback((p)=>{if(boardMode!=="my")return false;const g=(p.gpos||p.pos)==="K"||(p.gpos||p.pos)==="P"||(p.gpos||p.pos)==="LS"?"K/P":(p.gpos||p.pos);return rankedGroups.has(g)||(traits[p.id]&&Object.keys(traits[p.id]).length>0);},[boardMode,rankedGroups,traits]);
  // Render grade or round pill depending on whether user has graded this player
  const renderGradeOrPill=useCallback((p,fontSize=9)=>{if(hasUserGrade(p)){const g=activeGrade(p.id);return<span style={{fontFamily:mono,fontSize:fontSize+2,fontWeight:700,color:"#171717",flexShrink:0}}>{g}</span>;}const rd=getConsensusRound(p.name);return<span style={{fontFamily:mono,fontSize,fontWeight:700,color:rd.fg,background:rd.bg,padding:"2px 6px",borderRadius:4,flexShrink:0}}>{rd.label}</span>;},[hasUserGrade,activeGrade,getConsensusRound,mono]);
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
  const[archetypeFilter,setArchetypeFilter]=useState(new Set());
  const[measMode,setMeasMode]=useState(false);
  useEffect(()=>{setTraitFilter(new Set());setArchetypeFilter(new Set());setMeasMode(false);},[filterPos]);
  const[profilePlayer,setProfilePlayer]=useState(null);
  const[compareList,setCompareList]=useState([]);
  const[scoutVision,setScoutVision]=useState(false);
  const[expandedScoutId,setExpandedScoutId]=useState(null);
  const[svTooltip,setSvTooltip]=useState(()=>!localStorage.getItem("bbl_sv_seen_2"));
  useEffect(()=>{if(svTooltip){const t=setTimeout(()=>{setSvTooltip(false);localStorage.setItem("bbl_sv_seen_2","1");},6500);return()=>clearTimeout(t);}},[svTooltip]);
  const[showCompare,setShowCompare]=useState(false);
  const[compareMeasMode,setCompareMeasMode]=useState(false);
  useEffect(()=>{setCompareMeasMode(false);},[showCompare]);
  const[showDepth,setShowDepth]=useState(true);
  const[mobileDepthOpen,setMobileDepthOpen]=useState(false);
  const[depthSheetTeam,setDepthSheetTeam]=useState("");
  const[tradeOffer,setTradeOffer]=useState(null);
  const[showResults,setShowResults]=useState(false);
  useEffect(()=>{window.scrollTo(0,0);},[setupDone,showResults]);
  const[showMyGuysOverlay,setShowMyGuysOverlay]=useState(false);
  const[copiedDraft,setCopiedDraft]=useState(false);
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
  const[playerTradeMap,setPlayerTradeMap]=useState({}); // playerName → team traded TO
  const[tradePlayerTarget,setTradePlayerTarget]=useState([]); // players user wants to GET from partner
  const[tradeUserPlayers,setTradeUserPlayers]=useState([]); // players user wants to GIVE
  const[showGetPlayers,setShowGetPlayers]=useState(false); // toggle for partner players section
  const[showGivePlayers,setShowGivePlayers]=useState(false); // toggle for user players section
  const[showMobilePicks,setShowMobilePicks]=useState(false);
  const tradeDeclinedRef=useRef(0);
  const boardNoiseRef=useRef({});
  const wobbledProfilesRef=useRef({});
  const gmBoardsRef=useRef({});

  const generateBoardNoise=useCallback((boardToUse)=>{
    // Legacy noise generation (kept for trade evaluation compatibility)
    const noise={};const wobbled={};
    const teams=[...new Set(DRAFT_ORDER.map(d=>d.team))];
    teams.forEach(team=>{
      const prof=TEAM_PROFILES[team]||{variance:2,bpaLean:0.5};
      const sigma=prof.variance*0.9;
      const tn={};
      boardToUse.forEach(p=>{tn[p.id]=Math.max(-8,Math.min(8,gaussRandom(sigma)));});
      noise[team]=tn;
      const ws=0.03*prof.variance;
      const baseSchemeW=prof.schemeWeight??((prof.gposBoost?.length||0)>2?0.6:prof.stage==="rebuild"?0.3:prof.stage==="dynasty"?0.4:prof.stage==="contend"?0.7:0.5);
      wobbled[team]={...prof,bpaLean:Math.max(0.2,Math.min(0.9,prof.bpaLean+gaussRandom(ws))),schemeWeight:Math.max(0,Math.min(1,baseSchemeW+gaussRandom(prof.variance*0.08)))};
    });
    boardNoiseRef.current=noise;
    wobbledProfilesRef.current=wobbled;
    // Generate per-GM boards using the new board generator
    const prospectIds=boardToUse.map(p=>p.id);
    const {noise:gmNoise,wobbled:gmWobbled}=generateSimNoise(prospectIds);
    const boards=generateAllBoards(boardToUse,gmNoise,schemeFits);
    gmBoardsRef.current=boards;
  },[schemeFits]);

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
      // Use correct board based on launch mode (activeBoard may be stale since setBoardMode hasn't re-rendered yet)
      const launchBoard=mockLaunchBoardMode==="my"&&myBoard?myBoard:board;
      setTimeout(()=>{
        generateBoardNoise(launchBoard);
        setAvailable(launchBoard.map(p=>p.id));setPicks([]);setSetupDone(true);setShowResults(false);
        setTradeMap({});setLastVerdict(null);setTradeOffer(null);setShowTradeUp(false);setTradeValueDelta(0);setCpuTradeLog([]);
      },50);
    }
  },[mockLaunchTeam]);

  // Position run tracker: count how many of each pos drafted in last 8 picks
  const recentPosCounts=useMemo(()=>{
    const recent=picks.slice(-8);
    const counts={};
    recent.forEach(pk=>{const p=prospectsMap[pk.playerId];if(p)counts[p.pos]=(counts[p.pos]||0)+1;});
    return counts;
  },[picks,prospectsMap]);

  const gradeMap=useMemo(()=>{const m={};activeBoard.forEach(p=>m[p.id]=activeGrade(p.id));return m;},[activeBoard,activeGrade]);
  // Precompute archetype tags per prospect ID from scouting narratives
  // Precompute archetype labels per prospect ID from agent-classified data
  const prospectTagsMap=useMemo(()=>{
    const m={};
    activeBoard.forEach(p=>{
      const n=(p.name||"").toLowerCase().replace(/\./g,"").replace(/\s+(jr|sr|ii|iii|iv|v)\s*$/i,"").replace(/\s+/g," ").trim();
      const s=(p.school||"").toLowerCase().trim();
      const key=n+"|"+s;
      m[p.id]=ARCHETYPE_DATA[key]||[];
    });
    return m;
  },[activeBoard]);
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
    if(label==="IDL")return POS_COLORS["DL"];
    return POS_COLORS[label]||POS_COLORS["DL"]||"#999";
  };

  const fullDraftOrder=useMemo(()=>{
    return DRAFT_ORDER.filter(d=>d.round<=numRounds);
  },[numRounds]);
  const totalPicks=fullDraftOrder.length;
  const getPickTeam=useCallback((idx)=>tradeMap[idx]||fullDraftOrder[idx]?.team,[tradeMap,fullDraftOrder]);
  const getPickOwner=useCallback((idx)=>{
    if(tradeMap[idx])return tradeMap[idx];
    if(idx<totalPicks)return fullDraftOrder[idx]?.team;
    return DRAFT_ORDER[idx]?.team;
  },[tradeMap,totalPicks,fullDraftOrder]);
  const getPickInfo=useCallback((idx)=>idx<totalPicks?fullDraftOrder[idx]:DRAFT_ORDER[idx],[totalPicks,fullDraftOrder]);

  const getTeamFuturePicks=useCallback((team)=>{
    const r=[];for(let i=picks.length;i<totalPicks;i++){if(getPickTeam(i)===team)r.push({idx:i,...fullDraftOrder[i]});}return r;
  },[picks,totalPicks,getPickTeam,fullDraftOrder]);

  const startDraft=useCallback(()=>{
    generateBoardNoise(activeBoard);
    setAvailable(activeBoard.map(p=>p.id));setPicks([]);setSetupDone(true);setShowResults(false);
    setTradeMap({});setLastVerdict(null);setTradeOffer(null);setShowTradeUp(false);setTradeValueDelta(0);setCpuTradeLog([]);
    if(trackEvent)trackEvent(userId,'mock_draft_sim_started',{team:[...userTeams].join(','),rounds:numRounds,speed,cpuTrades,boardMode,guest:!!isGuestUser});
  },[activeBoard,generateBoardNoise,trackEvent,userId,isGuestUser,userTeams,numRounds,speed,cpuTrades,boardMode]);

  const picksRef=useRef(picks);picksRef.current=picks;
  const recentPosCountsRef=useRef(recentPosCounts);recentPosCountsRef.current=recentPosCounts;
  const cpuPick=useCallback((team,avail,pickNum)=>{
    // #1 overall is always consensus #1
    if(pickNum===1){const m=avail.find(id=>{const p=prospectsMap[id];return p&&p.name==="Fernando Mendoza";});if(m)return m;}

    const round=getPickRound(pickNum);
    const abbr=normalizeAbbr(TEAM_ABBR[team]||team);
    const board=gmBoardsRef.current[abbr];

    // Fallback: if no board generated for this team, use first available
    if(!board||board.length===0)return avail[0];

    // Build available set
    const availSet=new Set(avail);

    // Track positions already drafted by this team — with pick numbers for proximity
    const teamPickHistory=picksRef.current.filter(pk=>pk.team===team).map(pk=>{const p=prospectsMap[pk.playerId];return p?{pos:p.gpos||p.pos,pick:pk.pick}:null;}).filter(Boolean);
    const posCounts={};teamPickHistory.forEach(h=>{posCounts[h.pos]=(posCounts[h.pos]||0)+1;});

    const result=pickFromBoard(board,GM_PARAMS[abbr]||GM_PARAMS[TEAM_ABBR[team]],{
      available:availSet,
      round,
      currentPick:pickNum,
      alreadyDrafted:posCounts,
      recentPosCounts:recentPosCountsRef.current,
      teamNeeds:teamNeeds[team],
      teamPickHistory,
    });

    return result?.id||avail[0];
  },[teamNeeds,prospectsMap]);

  const isUserPick=useMemo(()=>{
    return picks.length<totalPicks&&userTeams.has(getPickTeam(picks.length));
  },[picks,userTeams,totalPicks,getPickTeam]);

  // Scout Vision: which team lens is active (team currently on the clock)
  const scoutTeam=useMemo(()=>{
    if(!scoutVision)return null;
    const current=picks.length<totalPicks?getPickTeam(picks.length):null;
    if(current&&userTeams.has(current))return current;
    return null;
  },[scoutVision,picks.length,totalPicks,getPickTeam,userTeams]);

  // Compute contextual tags for available players during user picks: NEED, SLIDE, RIVAL
  const playerTags=useMemo(()=>{
    const tags={};// id -> [{tag,color,bg}]
    if(!isUserPick||available.length===0)return tags;
    const team=getPickTeam(picks.length);
    const pickNum=fullDraftOrder[picks.length]?.pick||1;
    const needs=teamNeeds[team]||["QB","WR","DL"];
    const dn=TEAM_NEEDS_COUNTS?.[team]||{};
    const rivals=DIVISION_RIVALS[team]||[];
    // Get rival top-2 LIVE needs within 7 picks
    const rivalTopNeeds=[];// [{team, positions:[pos1,pos2], pickIdx}]
    for(let i=picks.length+1;i<Math.min(picks.length+8,fullDraftOrder.length);i++){
      const t=getPickTeam(i);
      if(rivals.includes(t)){
        // Compute live needs for this rival (base needs minus what they've already drafted)
        const base={...(TEAM_NEEDS_COUNTS?.[t]||{})};
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
      if((nc>=2||(nc>=1&&ni<=2)||(ni===0))&&alreadyAtPos<2){
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
      // FIT: scout vision scheme fit >= 75
      if(scoutTeam&&schemeFits){
        const fit=schemeFits[scoutTeam]?.[id];
        if(fit&&fit.score>=75)t.push({tag:"FIT",color:"#6366f1",bg:"#eef2ff"});
      }
      if(t.length>0)tags[id]=t;
    });
    return tags;
  },[isUserPick,available,picks,getPickTeam,fullDraftOrder,teamNeeds,TEAM_NEEDS_COUNTS,prospectsMap,getConsensusRank,gradeMap,scoutTeam,schemeFits]);

  const makePick=useCallback((playerId,opts={})=>{
    const n=picks.length;if(n>=totalPicks)return;
    const team=getPickTeam(n);const{round,pick}=fullDraftOrder[n];
    const traded=opts.traded||team!==fullDraftOrder[n].team;
    const isUser=userTeams.has(team);
    const np=[...picks,{pick,round,team,playerId,traded,isUser}];
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
        }),userTeams.size);
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
    if(!currentPick||currentPick>64)return null;
    const recentTraders=new Set(cpuTradeLog.filter(t=>currentIdx-t.pickIdx<8).map(t=>t.fromTeam));

    // Track picks already involved in a trade this draft (can't trade same pick twice)
    const tradedPickIdxs=new Set(cpuTradeLog.flatMap(t=>t.involvedPicks||[t.pickIdx]));

    // ── TRADE-DOWN EVALUATION: Does the team on the clock want to move back? ──
    // Driven by board disappointment: if the best available player is much worse
    // than what they expected at this pick, they're open to trading down.
    const currentAbbr=normalizeAbbr(TEAM_ABBR[currentTeam]||currentTeam);
    const currentGm=GM_PARAMS[currentAbbr];
    if(!currentGm)return null;
    const currentBoard=gmBoardsRef.current[currentAbbr]||[];
    const availSet=new Set(available);
    // Find the current team's best available and their expected value at this pick
    let currentBest=null,currentSecond=null;
    for(const entry of currentBoard){
      if(!availSet.has(entry.id))continue;
      if(!currentBest)currentBest=entry;
      else if(!currentSecond){currentSecond=entry;break;}
    }
    if(!currentBest)return null;
    // Board disappointment: compare best available grade to what this pick slot "deserves"
    // A pick at #5 expects ~grade 94. If best available is 87, that's a 7-point disappointment.
    const expectedGrade=getConsensusGrade?getConsensusGrade("__pick__")||0:0;
    // Simpler: use the best available's board score relative to the next few available
    // If top 3-4 are clustered, the team is more willing to slide (they'll get similar value later)
    let clusterCount=0;
    if(currentBest){
      const threshold=currentBest.boardScore*0.92; // within 8% = clustered
      for(const entry of currentBoard){
        if(!availSet.has(entry.id))continue;
        if(entry.boardScore>=threshold)clusterCount++;
        else break;
        if(clusterCount>=6)break;
      }
    }
    // Disappointment: best available grade vs expected grade at this slot
    const slotExpectedGrade=96-currentPick*0.5; // rough: pick 1 expects ~95.5, pick 10 expects ~91, pick 20 expects ~86
    const disappointment=Math.max(0,(slotExpectedGrade-currentBest.grade)/10); // 0-1 scale
    // Willingness = baseline × situational boost from disappointment and clustering
    // High cluster (4+ similar players) = more willing (can get comparable talent later)
    // High disappointment = more willing (nobody exciting here)
    const clusterBoost=clusterCount>=4?1.5:clusterCount>=3?1.25:1.0;
    const disappointmentBoost=1.0+disappointment*2.0; // 7-point miss = 1.0+0.7*2 = 2.4x
    const situationalWillingness=Math.min(0.9,currentGm.tradeDownWillingness*clusterBoost*disappointmentBoost);
    if(Math.random()>situationalWillingness)return null;

    const candidateTeams=[];
    for(let i=currentIdx+2;i<Math.min(currentIdx+13,totalPicks);i++){
      if(tradedPickIdxs.has(i))continue;
      const t=getPickTeam(i);
      if(!t||userTeams.has(t)||t===currentTeam)continue;
      if(recentTraders.has(t))continue;
      const tAbbr=normalizeAbbr(TEAM_ABBR[t]||t);
      const gm=GM_PARAMS[tAbbr];
      if(!gm)continue;

      // ── TRADE-UP EVALUATION: Does this candidate desperately want to move up? ──
      // Driven by board separation: their #1 is SO much better than #2 that they
      // can't risk waiting. The wider the gap, the more aggressive.
      const board=gmBoardsRef.current[tAbbr]||[];
      let bestPlayer=null,bestScore=0,secondScore=0;
      for(const entry of board){
        if(!availSet.has(entry.id))continue;
        const score=entry.boardScore*(0.85+Math.random()*0.30);
        if(score>bestScore){
          secondScore=bestScore;bestScore=score;
          bestPlayer={id:entry.id,name:entry.name,grade:entry.grade,consRank:entry.consensusRank,pos:entry.pos,score};
        }else if(score>secondScore){secondScore=score;}
        if(secondScore>0&&bestScore/secondScore<1.10)break;
      }
      if(!bestPlayer||bestPlayer.grade<70)continue;
      const separation=secondScore>0?bestScore/secondScore:2.0;

      // Check trade value
      const theirPickIdx=i;
      const theirPickNum=fullDraftOrder[theirPickIdx]?.pick;
      const currentVal=getPickValue(currentPick);
      const theirVal=getPickValue(theirPickNum);
      let sweetenerIdx=null,sweetenerVal=0;
      for(let j=theirPickIdx+1;j<DRAFT_ORDER.length;j++){
        if(tradedPickIdxs.has(j))continue;
        if(getPickOwner(j)===t){sweetenerIdx=j;sweetenerVal=getPickValue(getPickInfo(j)?.pick||999);break;}
      }
      let totalOffer=theirVal+sweetenerVal;
      let sweetenerPlayer=null;
      const shortfall=currentVal-totalOffer;
      if(shortfall>0&&shortfall>=currentVal*0.15&&shortfall<=currentVal*0.40){
        const rosterData=ROSTER_BY_SLOT[t];
        if(rosterData){
          const tradeable=Object.values(rosterData).filter(p=>{
            if(p.availability==="untouchable"||(p.availability==="available_at_premium"&&currentPick>15))return false;
            if(playerTradeMap[p.name])return false;
            return p.tradeValue.valuePoints>=shortfall*0.5&&p.tradeValue.valuePoints<=shortfall*1.5;
          }).sort((a,b)=>{
            const aw=a.availability==="actively_shopable"?3:1;
            const bw=b.availability==="actively_shopable"?3:1;
            return(a.tradeValue.valuePoints/aw)-(b.tradeValue.valuePoints/bw);
          });
          if(tradeable.length>0){sweetenerPlayer=tradeable[0];totalOffer+=sweetenerPlayer.tradeValue.valuePoints;}
        }
      }
      if(totalOffer<currentVal)continue; // offer must meet or exceed pick value

      // Trade-up probability: baseline aggression scaled by how desperate they are (separation)
      const separationBoost=separation>=1.30?2.5:separation>=1.20?1.8:separation>=1.15?1.3:1.0;
      let prob=gm.tradeUpAggression*0.13*separationBoost;
      if(currentPick<=10)prob*=1.3;
      else if(currentPick<=20)prob*=1.15;
      prob=Math.min(0.35,prob);
      if(Math.random()>prob)continue;

      candidateTeams.push({
        team:t,theirPickIdx,theirPickNum,sweetenerIdx,
        sweetenerPick:sweetenerIdx!==null?getPickInfo(sweetenerIdx)?.pick:null,
        sweetenerRound:sweetenerIdx!==null?getPickInfo(sweetenerIdx)?.round:null,
        sweetenerPlayer,
        targetPlayer:bestPlayer,separation,totalOffer,currentVal
      });
    }
    if(candidateTeams.length===0)return null;
    const weights=candidateTeams.map(c=>Math.pow(c.separation,2));
    const totalW=weights.reduce((a,b)=>a+b,0);
    let r=Math.random()*totalW;
    for(let ci=0;ci<candidateTeams.length;ci++){r-=weights[ci];if(r<=0)return candidateTeams[ci];}
    return candidateTeams[0];
  },[cpuTrades,cpuTradeLog,getPickTeam,getPickOwner,getPickInfo,fullDraftOrder,totalPicks,userTeams,available,playerTradeMap]);

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
        // Track player trade if sweetener player included
        if(cpuTrade.sweetenerPlayer){
          setPlayerTradeMap(prev=>({...prev,[cpuTrade.sweetenerPlayer.name]:team}));
        }
        // Log the trade for UI display
        const gaveLabels=[`Rd${fullDraftOrder[cpuTrade.theirPickIdx].round} #${cpuTrade.theirPickNum}`];
        if(cpuTrade.sweetenerIdx!==null)gaveLabels.push(`Rd${cpuTrade.sweetenerRound} #${cpuTrade.sweetenerPick}`);
        if(cpuTrade.sweetenerPlayer)gaveLabels.push(cpuTrade.sweetenerPlayer.name);
        const gotLabels=[`Rd${fullDraftOrder[n].round} #${fullDraftOrder[n].pick}`];
        const involvedPicks=[n,cpuTrade.theirPickIdx];
        if(cpuTrade.sweetenerIdx!==null)involvedPicks.push(cpuTrade.sweetenerIdx);
        setCpuTradeLog(prev=>[...prev,{fromTeam:tradingTeam,toTeam:team,pickIdx:n,involvedPicks,gave:gaveLabels,got:gotLabels,targetPlayer:cpuTrade.targetPlayer.name}]);
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
      const tv=getPickValue(tr.pick);
      let futureIdx=null,futureVal=0;
      for(let j=tr.idx+1;j<DRAFT_ORDER.length;j++){if(getPickOwner(j)===tr.team){futureIdx=j;futureVal=getPickValue(getPickInfo(j)?.pick||999);break;}}
      if(futureIdx!==null){const ov=tv+futureVal;
      if(ov>=uv*0.92)setTradeOffer({fromTeam:tr.team,traderIdx:tr.idx,theirPick:tr.pick,theirRound:tr.round,futureIdx,futurePick:getPickInfo(futureIdx).pick,futureRound:getPickInfo(futureIdx).round,userPickIdx:idx,userPick:fullDraftOrder[idx].pick,userVal:uv,offerVal:Math.round(ov)});}
    }
  },[isUserPick,picks,tradeOffer,showTradeUp,totalPicks,fullDraftOrder,userTeams,getPickTeam,getPickOwner,getPickInfo]);

  const acceptTrade=useCallback(()=>{
    if(!tradeOffer)return;
    const ct=tradeOffer.fromTeam;const ui=tradeOffer.userPickIdx;const ci=tradeOffer.traderIdx;const fi=tradeOffer.futureIdx;const ut=getPickTeam(ui);
    setTradeMap(prev=>{const nm={...prev,[ui]:ct,[ci]:ut};if(fi!=null)nm[fi]=ut;return nm;});
    // Track JJP value delta: they give offerVal, we give userVal
    setTradeValueDelta(prev=>prev+(tradeOffer.offerVal-tradeOffer.userVal));
    const pid=cpuPick(ct,available,fullDraftOrder[ui].pick);
    if(pid){const{round,pick}=fullDraftOrder[ui];setPicks(prev=>[...prev,{pick,round,team:ct,playerId:pid,traded:true,isUser:false}]);setAvailable(prev=>prev.filter(id=>id!==pid));}
    setTradeOffer(null);
    if(showTradeUp)closeTradeUp();
  },[tradeOffer,cpuPick,available,fullDraftOrder,getPickTeam,showTradeUp]);

  const declineTrade=()=>{tradeDeclinedRef.current=Date.now();setTradeOffer(null);};
  const autoPausedForTradeRef=useRef(false);
  // When trading with multiple teams, determine which user team to trade as
  // (whichever has the next upcoming pick)
  const tradeAsTeam=useMemo(()=>{
    if(userTeams.size<=1)return[...userTeams][0]||null;
    for(let i=picks.length;i<totalPicks;i++){
      const t=getPickTeam(i);
      if(userTeams.has(t))return t;
    }
    return[...userTeams][0];
  },[userTeams,picks.length,totalPicks,getPickTeam]);
  const openTradeUp=()=>{
    if(!paused){setPaused(true);autoPausedForTradeRef.current=true;}
    setShowTradeUp(true);setTradeTarget([]);setTradeUserPicks([]);setTradePartner(null);setTradePlayerTarget([]);setTradeUserPlayers([]);setShowGetPlayers(false);setShowGivePlayers(false);
  };
  const closeTradeUp=()=>{
    setShowTradeUp(false);setTradeTarget([]);setTradeUserPicks([]);setTradePartner(null);setTradePlayerTarget([]);setTradeUserPlayers([]);setShowGetPlayers(false);setShowGivePlayers(false);
    if(autoPausedForTradeRef.current){setPaused(false);autoPausedForTradeRef.current=false;}
  };
  const toggleTradeUp=()=>{if(showTradeUp)closeTradeUp();else openTradeUp();};

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
    // Remaining picks — full 7-round catalog, not just simulated rounds
    const thisDraft=[];
    for(let i=picks.length;i<DRAFT_ORDER.length;i++){
      const owner=getPickOwner(i);
      if(owner===tradePartner){const d=DRAFT_ORDER[i];thisDraft.push({idx:i,...d,type:"current",label:`Rd${d.round} #${d.pick}`,value:getPickValue(d.pick)});}
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
  },[tradePartner,picks,totalPicks,getPickOwner,fullDraftOrder]);

  // User's tradable picks (current draft + future)
  const userAllPicks=useMemo(()=>{
    const ut=tradeAsTeam||getPickTeam(picks.length);
    if(!ut)return{thisDraft:[],futurePicks:[]};
    // Remaining picks — full 7-round catalog, not just simulated rounds
    const thisDraft=[];
    for(let i=picks.length;i<DRAFT_ORDER.length;i++){
      const owner=getPickOwner(i);
      if(owner===ut){const d=DRAFT_ORDER[i];thisDraft.push({idx:i,...d,type:"current",label:`Rd${d.round} #${d.pick}`,value:getPickValue(d.pick)});}
    }
    const futurePicks=[];
    for(let yr=2027;yr<=2028;yr++){
      for(let rd=1;rd<=7;rd++){
        const estPick=rd*32-16;
        futurePicks.push({year:yr,round:rd,type:"future",label:`${yr} Rd${rd}`,value:Math.round(getPickValue(estPick)*0.85)});
      }
    }
    return{thisDraft,futurePicks};
  },[userTeams,ALL_TEAMS,picks,totalPicks,getPickOwner,fullDraftOrder]);

  // Tradeable players from partner team (non-untouchable, not already traded)
  const partnerPlayers=useMemo(()=>{
    if(!tradePartner)return[];
    const data=ROSTER_BY_SLOT[tradePartner];if(!data)return[];
    return Object.values(data).filter(p=>p.availability!=="untouchable"&&!playerTradeMap[p.name]).sort((a,b)=>b.tradeValue.valuePoints-a.tradeValue.valuePoints);
  },[tradePartner,playerTradeMap]);

  // Tradeable players from user team (all non-untouchable)
  const userPlayers=useMemo(()=>{
    const ut=tradeAsTeam||getPickTeam(picks.length);
    if(!ut)return[];
    const data=ROSTER_BY_SLOT[ut];if(!data)return[];
    return Object.values(data).filter(p=>p.availability!=="untouchable"&&!playerTradeMap[p.name]).sort((a,b)=>b.tradeValue.valuePoints-a.tradeValue.valuePoints);
  },[userTeams,ALL_TEAMS,picks,getPickTeam,playerTradeMap]);

  const executeTradeUp=useCallback(()=>{
    if((tradeTarget.length===0&&tradePlayerTarget.length===0)||(tradeUserPicks.length===0&&tradeUserPlayers.length===0)||!tradePartner)return;
    const tv=tradeTarget.reduce((s,p)=>s+(p.value||0),0)+tradePlayerTarget.reduce((s,p)=>s+(p.tradeValue?.valuePoints||0),0);
    const ov=tradeUserPicks.reduce((s,p)=>s+(p.value||0),0)+tradeUserPlayers.reduce((s,p)=>s+(p.tradeValue?.valuePoints||0),0);
    if(ov<tv*1.05)return;
    const ut=tradeAsTeam||getPickTeam(picks.length);const nm={...tradeMap};
    // Reassign their current-draft picks to user
    tradeTarget.filter(p=>p.type==="current"&&p.idx!=null).forEach(p=>{nm[p.idx]=ut;});
    // Reassign user's current-draft picks to the partner
    tradeUserPicks.filter(p=>p.type==="current"&&p.idx!=null).forEach(p=>{nm[p.idx]=tradePartner;});
    setTradeMap(nm);
    // Track player trades
    const pm={...playerTradeMap};
    tradePlayerTarget.forEach(p=>{pm[p.name]=ut;});
    tradeUserPlayers.forEach(p=>{pm[p.name]=tradePartner;});
    if(tradePlayerTarget.length>0||tradeUserPlayers.length>0)setPlayerTradeMap(pm);
    closeTradeUp();
  },[tradeTarget,tradeUserPicks,tradePlayerTarget,tradeUserPlayers,tradeMap,playerTradeMap,userTeams,ALL_TEAMS,getPickTeam,picks,tradePartner]);

  const toggleTeam=(t)=>setUserTeams(prev=>{const n=new Set(prev);n.has(t)?n.delete(t):n.add(t);return n;});
  const toggleCompare=(p)=>{setCompareList(prev=>{const e=prev.find(x=>x.id===p.id);if(e)return prev.filter(x=>x.id!==p.id);if(prev.length>=4)return prev;return[...prev,p];});};

  // Depth chart: NFL roster + drafted players overlay — round-aware slotting
  // Static base roster — computed once, never changes during draft
  const baseDepthChart=useMemo(()=>{
    const chart={};
    const allTeamAbbrs=Object.keys(NFL_ROSTERS);
    allTeamAbbrs.forEach(team=>{
      chart[team]={};const roster=NFL_ROSTERS[team]||{};
      DEPTH_GROUPS.forEach(g=>{
        g.slots.forEach(s=>{if(roster[s])chart[team][s]={name:roster[s],isRoster:true};});
      });
    });
    Object.entries(TEAM_ABBR).forEach(([name,abbr])=>{
      if(chart[name])return;
      const roster=NFL_ROSTERS[abbr]||{};
      chart[name]={};
      DEPTH_GROUPS.forEach(g=>{
        g.slots.forEach(s=>{if(roster[s])chart[name][s]={name:roster[s],isRoster:true};});
      });
    });
    return chart;
  },[]);
  // Depth chart with draft overlay — clones base then layers picks
  const depthChart=useMemo(()=>{
    const chart={};
    for(const team of Object.keys(baseDepthChart)){chart[team]={...baseDepthChart[team]};}
    // Overlay drafted players
    const allDraftTeams=new Set(picks.map(pk=>pk.team));
    [...allDraftTeams].forEach(team=>{
      if(!chart[team])chart[team]={...baseDepthChart[TEAM_ABBR[team]||team]||{}};
      const teamPicks=picks.filter(pk=>pk.team===team);
      teamPicks.forEach(pk=>{
        const p=prospectsMap[pk.playerId];if(!p)return;
        let group=DEPTH_GROUPS.find(g=>g.posMatch===p.pos);if(!group)return;
        const grade=getConsensusGrade?getConsensusGrade(p.name):(gradeMap[pk.playerId]||50);
        const entry={name:p.name,isDraft:true};
        // Determine preferred starting slot based on granular position
        const gpos=p.gpos||p.pos;
        let preferredSlot=group.slots[0];
        // Build position-appropriate slot list for DL and DB
        let allowedSlots=group.slots;
        const scheme=TEAM_SCHEME[team];
        if(scheme?.def==="34"&&group.posMatch==="DL"){
          // 3-4 scheme routing: EDGE→OLB or 3-4 DE, IDL→NT
          const cs=getCombineScores(p.name,p.school);
          const sc=getScoutingTraits(p.name,p.school);
          if(gpos==="EDGE"||gpos==="DE"||gpos==="OLB"){
            const wt=cs?.weight||null;
            const ath=cs?.athleticScore||50;
            const pr=sc?.["Pass Rush"]||50;
            const rd=sc?.["Run Defense"]||50;
            const isOLB=!wt||wt<265||(wt<=285&&pr>rd&&ath>75);
            if(isOLB){
              group=DEPTH_GROUPS.find(g=>g.posMatch==="LB");
              preferredSlot="LB1";allowedSlots=["LB1","LB4"];
            }else{
              preferredSlot="DE1";allowedSlots=["DE1","DE2"];
            }
          }else{
            // IDL/DT/NT → NT slot first, then DE slots (no DT2 in 3-4)
            preferredSlot="DT1";allowedSlots=["DT1","DE1","DE2"];
          }
        }else if(scheme?.def==="34"&&group.posMatch==="LB"){
          // 3-4 LB routing: use traits to determine OLB vs ILB fit
          const cs=getCombineScores(p.name,p.school);
          const sc=getScoutingTraits(p.name,p.school);
          const wt=cs?.weight||null;
          const ath=cs?.athleticScore||50;
          const pr=sc?.["Pass Rush"]||50;
          const rd=sc?.["Run Defense"]||50;
          const isOLB=wt&&wt<240&&ath>75&&pr>rd;
          if(isOLB){
            preferredSlot="LB1";allowedSlots=["LB1","LB4","LB2","LB3"];
          }else{
            preferredSlot="LB2";allowedSlots=["LB2","LB3","LB1","LB4"];
          }
        }else if((scheme?.def==="425"||scheme?.def==="w9")&&group.posMatch==="LB"){
          // 4-2-5/w9: only 2 LB slots
          preferredSlot="LB1";allowedSlots=["LB1","LB2"];
        }else if(group.posMatch==="DL"){
          // 4-3/w9: EDGE/DE -> DE slots only, IDL/DT/NT -> DT slots only
          if(gpos==="IDL"||gpos==="DT"||gpos==="NT"){
            preferredSlot="DT1";
            allowedSlots=["DT1","DT2"];
          }else{
            preferredSlot="DE1";
            allowedSlots=["DE1","DE2"];
          }
        }else if(group.posMatch==="DB"){
          const isSafety=gpos==="S"||gpos==="SAF"||gpos==="FS"||gpos==="SS";
          // Nickel routing: all teams have NB slot from Ourlads roster data
          const cs=getCombineScores(p.name,p.school);
          const sc=getScoutingTraits(p.name,p.school);
          const nk=sc?.["Nickel"]||50;
          const mc=sc?.["Man Coverage"]||50;
          const wt=cs?.weight||null;
          const isElite=grade>=90;
          let toNickel=false;
          if(!isElite){
            if(isSafety){
              toNickel=nk>=85&&mc>=70;
            }else if(wt){
              if(wt<190)toNickel=nk>=70;
              else if(wt<=200)toNickel=nk>=80;
              else toNickel=nk>=90;
            }else{
              toNickel=nk>=85;
            }
          }
          if(toNickel){
            preferredSlot="NB";allowedSlots=["NB","CB1","CB2"];
          }else if(isSafety){
            preferredSlot="SS";allowedSlots=["SS","FS"];
          }else{
            preferredSlot="CB1";allowedSlots=["CB1","CB2"];
          }
        }else if(group.posMatch==="OL"){
          // IOL/OG/OC/G/C -> guard/center slots, OT/T -> tackle slots
          if(gpos==="C"||gpos==="OC"){
            preferredSlot="C";
            allowedSlots=["C","LG","RG"];
          }else if(gpos==="IOL"||gpos==="OG"||gpos==="G"){
            preferredSlot="LG";
            allowedSlots=["LG","RG","C"];
          }else{
            preferredSlot="LT";
            allowedSlots=["LT","RT"];
          }
        }
        // Determine target tier using roster talent comparison
        // Map performance tiers to numeric scores for comparison
        const tierScore={"elite":95,"pro_bowl":85,"quality_starter":75,"starter":65,"rotational":55,"backup":45,"declining":50};
        const roundCapital={1:85,2:72,3:58,4:48,5:42,6:36,7:32};
        const getRookieScore=(rd,gr,sf)=>Math.round(gr*0.5+(roundCapital[rd]||35)*0.35+(sf||50)*0.15);
        const getIncumbentScore=(slot)=>{
          const incumbent=chart[team][slot];
          if(!incumbent)return 20; // empty
          if(incumbent.isDraft){
            // Another rookie — find their draft round and grade to score them properly
            const draftPk=picks.find(dpk=>dpk.team===team&&prospectsMap[dpk.playerId]?.name===incumbent.name);
            if(draftPk){
              const dp=prospectsMap[draftPk.playerId];
              const dGrade=getConsensusGrade?getConsensusGrade(dp.name):70;
              const dSf=schemeFits?.[team]?.[draftPk.playerId]?.score||50;
              return getRookieScore(draftPk.round,dGrade,dSf);
            }
            return 55; // drafted but can't find details — treat as rotational
          }
          const rv=ROSTER_BY_SLOT[team]?.[slot]||(incumbent.name&&ROSTER_BY_NAME[incumbent.name]);
          return rv?tierScore[rv.performanceTier]||65:65;
        };
        // Rookie's projected talent
        const schemeFit=schemeFits?.[team]?.[pk.playerId]?.score||50;
        const rookieScore=getRookieScore(pk.round,grade,schemeFit);
        // Find the right tier by comparing against incumbents at each allowed slot
        let tier=0;
        const s1Score=getIncumbentScore(allowedSlots[0]);
        const s2Score=allowedSlots[1]?getIncumbentScore(allowedSlots[1]):0;
        if(rookieScore>=s1Score-5){tier=1;} // better than or close to starter
        else if(allowedSlots[1]&&rookieScore>=s2Score-5){tier=2;} // better than second string
        else if(pk.round<=4||grade>=65){tier=allowedSlots.length>2?3:2;} // depth piece
        else{tier=0;} // overflow

        // Helper: find next available depth key (LG_d0, LG_d1, etc.)
        const nextDepthKey=(slot)=>{
          let n=0;while(chart[team][slot+"_d"+n])n++;
          return slot+"_d"+n;
        };

        if(tier===1){
          // Starter: take the preferred slot ONLY. No cross-position cascading.
          const s1=preferredSlot;
          if(chart[team][s1]){
            // Bumped player (roster or rookie) goes to depth
            chart[team][nextDepthKey(s1)]=chart[team][s1];
          }
          chart[team][s1]=entry;
        }else if(tier===2){
          // Find the weakest incumbent across allowed slots
          let weakestSlot=null,weakestScore=999;
          for(const s of allowedSlots){
            const sc=getIncumbentScore(s);
            if(sc<weakestScore){weakestScore=sc;weakestSlot=s;}
          }
          const target=weakestSlot||allowedSlots[1]||allowedSlots[0];
          if(!chart[team][target]){
            chart[team][target]=entry;
          }else if(rookieScore>=weakestScore-5){
            chart[team][nextDepthKey(target)]=chart[team][target];
            chart[team][target]=entry;
          }else{
            chart[team][nextDepthKey(allowedSlots[allowedSlots.length-1])]=entry;
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
    // Reflect player trades: remove from old team, add to new team with tier-based slotting
    Object.entries(playerTradeMap).forEach(([playerName,newTeam])=>{
      const rv=ROSTER_BY_NAME[playerName];if(!rv)return;
      const oldTeam=rv.team;
      // Remove from old team (check by both name variants)
      [oldTeam,TEAM_ABBR[oldTeam]||oldTeam].forEach(tk=>{
        if(!chart[tk])return;
        Object.keys(chart[tk]).forEach(slot=>{if(chart[tk][slot]?.name===playerName)delete chart[tk][slot];});
      });
      // Add to new team — find correct position group and slot by tier
      if(!chart[newTeam])return;
      const entry={name:playerName,isRoster:true,isTraded:true};
      const pos=rv.position;
      const group=DEPTH_GROUPS.find(g=>g.posMatch===pos);
      if(!group){chart[newTeam][rv.slot]=entry;return;}
      // Determine tier from performance tier
      const tier=rv.performanceTier==="elite"||rv.performanceTier==="pro_bowl"?1:rv.performanceTier==="quality_starter"||rv.performanceTier==="starter"?2:3;
      const slots=group.slots;
      if(tier===1){
        // Starter: take first slot, cascade down
        const s1=slots[0];
        if(chart[newTeam][s1]){
          for(let j=slots.length-1;j>0;j--){
            if(chart[newTeam][slots[j-1]])chart[newTeam][slots[j]]=chart[newTeam][slots[j-1]];
            else delete chart[newTeam][slots[j]];
          }
        }
        chart[newTeam][s1]=entry;
      }else if(tier===2){
        const target=slots[1]||slots[0];
        if(!chart[newTeam][target])chart[newTeam][target]=entry;
        else{const empty=slots.find(s=>!chart[newTeam][s]);if(empty)chart[newTeam][empty]=entry;}
      }else{
        const target=slots[slots.length-1]||slots[0];
        if(!chart[newTeam][target])chart[newTeam][target]=entry;
        else{const empty=slots.find(s=>!chart[newTeam][s]);if(empty)chart[newTeam][empty]=entry;}
      }
    });
    return chart;
  },[baseDepthChart,picks,prospectsMap,getConsensusGrade,gradeMap,playerTradeMap]);

  const liveNeeds=useMemo(()=>{
    // Does this prospect's position satisfy this need key?
    const NEED_SATISFIERS={
      DL:new Set(["DL","DT","IDL","NT","EDGE","DE"]),
      DB:new Set(["DB","CB","S","FS","SS"]),
      OL:new Set(["OL","OT","IOL","C","OG"]),
      IOL:new Set(["IOL","C","OG","OL"]),
      IDL:new Set(["IDL","DT","NT","DL"]),
      EDGE:new Set(["EDGE","DE","OLB","DL"]),
      OT:new Set(["OT","OL"]),
      CB:new Set(["CB","DB"]),
      S:new Set(["S","FS","SS","DB"]),
    };
    const satisfiesNeed=(needKey,gpos)=>{
      if(needKey===gpos)return true;
      return NEED_SATISFIERS[needKey]?.has(gpos)||false;
    };
    const needs={};
    [...userTeams].forEach(team=>{
      const base=TEAM_NEEDS_COUNTS?.[team]||{};const rem={...base};
      picks.filter(pk=>pk.team===team).forEach(pk=>{
        const p=prospectsMap[pk.playerId];if(!p)return;
        const gpos=p.gpos||p.pos;
        // Match granular keys first (IDL before DL, CB before DB, IOL before OL)
        // so the visible pill updates, not the hidden broad key
        const sortedKeys=Object.keys(rem).sort((a,b)=>{
          const broad=["DL","DB","OL"];
          const aIsBroad=broad.includes(a)?1:0;
          const bIsBroad=broad.includes(b)?1:0;
          return aIsBroad-bIsBroad;
        });
        for(const needKey of sortedKeys){
          if(rem[needKey]>0&&satisfiesNeed(needKey,gpos)){rem[needKey]=0;break;}
        }
      });
      needs[team]=rem;
    });
    return needs;
  },[picks,userTeams,prospectsMap,TEAM_NEEDS_COUNTS]);

  const filteredAvailable=useMemo(()=>{
    let result=available;
    if(filterPos.size>0)result=result.filter(id=>{const p=prospectsMap[id];return p&&[...filterPos].some(f=>posFilterMatch(p,f));});
    if(traitFilter.size>0&&filterPos.size===1){const rawPos=[...filterPos][0];const pos=rawPos==="IDL"?"DL":rawPos;result=result.filter(id=>measMode?[...traitFilter].some(m=>qualifiesForMeasurableFilter&&qualifiesForMeasurableFilter(id,pos,m)):[...traitFilter].some(t=>qualifiesForFilter&&qualifiesForFilter(id,pos,t)));}
    if(archetypeFilter.size>0)result=result.filter(id=>{const tags=prospectTagsMap[id]||[];return[...archetypeFilter].some(t=>tags.includes(t));});
    return result;
  },[available,filterPos,prospectsMap,traitFilter,archetypeFilter,qualifiesForFilter,measMode,qualifiesForMeasurableFilter]);

  // Scout Vision: precomputed reasoning data
  const scoutData=useMemo(()=>{
    if(!scoutTeam||!schemeFits||!computeTeamScoutVision)return null;
    return computeTeamScoutVision(scoutTeam,PROSPECTS,schemeFits,traits);
  },[scoutTeam,schemeFits,PROSPECTS,traits,computeTeamScoutVision]);

  // Scout Vision: reorder filteredAvailable by scheme fit score (descending)
  const svBoard=useMemo(()=>{
    if(!scoutTeam||!schemeFits)return filteredAvailable;
    const teamFits=schemeFits[scoutTeam]||{};
    return [...filteredAvailable].sort((a,b)=>{
      const sa=teamFits[a]?.score||0;
      const sb=teamFits[b]?.score||0;
      return sb-sa;
    });
  },[scoutTeam,schemeFits,filteredAvailable]);

  // Active available list — svBoard when scout vision ON, else filteredAvailable
  const displayAvailable=scoutTeam?svBoard:filteredAvailable;

  // Grade wrapper — calls pure function with current hook values
  const gradeTeamPicks=useCallback((teamPicks,team)=>{
    return scoreTeamPicks(teamPicks,team,prospectsMap,getConsensusRank,liveNeeds,TEAM_NEEDS_COUNTS);
  },[prospectsMap,getConsensusRank,liveNeeds,TEAM_NEEDS_COUNTS]);

  // Overall draft grade — null for all-32 (prediction mode, not graded)
  const draftGrade=useMemo(()=>{
    if(picks.length<totalPicks)return null;
    if(userTeams.size===32)return null;
    const up=picks.filter(pk=>pk.isUser);if(up.length===0)return null;
    if(userTeams.size===1){
      return scoreTeamPicks(up,[...userTeams][0],prospectsMap,getConsensusRank,liveNeeds,TEAM_NEEDS_COUNTS);
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
  },[picks,prospectsMap,getConsensusRank,totalPicks,userTeams,liveNeeds,TEAM_NEEDS_COUNTS]);

  const resultsRef=useRef(null);
  const ctaPickRef=useRef(null);

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
      // SINGLE TEAM — matching all-32 style picks, inline radar, web-matching depth chart
      // ================================================================
      const W=1200,pad=32,colGap=24;
      const rowH=47; // matching all-32 row height
      const radarSize=200;

      // Best pick for inline radar expansion
      const bestPick=teamPicks.reduce((best,pk)=>{const g=activeGrade(pk.playerId);return(!best||g>best.grade)?{pk,grade:g}:best;},null);
      const radarExpandH=bestPick?radarSize+60:0;

      // Strategy fingerprint pills
      const fpPills=draftFingerprint(teamPicks);

      // Depth chart data — matching web UI DepthList (scheme-aware)
      const chart=depthChart[team]||{};
      const schemeGroups=getSchemeDepthGroups(team);
      const baseGroupMap={};
      DEPTH_GROUPS.forEach(g=>{baseGroupMap[g.posMatch]=g.slots;});
      const depthGroupsRendered=schemeGroups.map(group=>{
        const entries=group.slots.map(s=>({slot:s,label:group.slotLabels?.[s]||s,entry:chart[s]})).filter(x=>x.entry);
        const extras=Object.entries(chart).filter(([k])=>group.slots.some(s=>k.startsWith(s+'_d'))).map(([k,v])=>({slot:k,label:'+',entry:v}));
        const baseSlots=baseGroupMap[group.posMatch]||[];
        const hiddenRoster=baseSlots.filter(s=>!group.slots.includes(s)&&chart[s]).map(s=>({slot:s,label:'+',entry:chart[s]}));
        extras.push(...hiddenRoster);
        return{label:group.label,items:[...entries,...extras]};
      }).filter(g=>g.items.length>0);
      const depthRowH=18;
      const depthGroupGap=10;
      const depthRowCount=depthGroupsRendered.reduce((s,g)=>s+g.items.length,0);
      const depthTotalH=depthRowCount*depthRowH+depthGroupsRendered.length*depthGroupGap+24;

      // Picks container height
      const picksTotalH=teamPicks.length*rowH+radarExpandH;

      // Strategy pills row
      const strategyH=fpPills.length>0?36:0;

      const headerH=76;
      const bodyH=Math.max(picksTotalH,depthTotalH)+strategyH;
      const footerH=44;
      const H=headerH+bodyH+footerH+pad;

      canvas.width=W*scale;canvas.height=H*scale;
      ctx.scale(scale,scale);

      ctx.fillStyle='#faf9f6';ctx.fillRect(0,0,W,H);

      // === HEADER — team identity left (vertically centered), logo+wordmark right ===
      const hMidY=headerH/2;

      // NFL team logo
      let tLogoImg=null;
      try{tLogoImg=await loadImg(nflLogoUrl(team));}catch(e){}
      const tLogoSize=44;
      if(tLogoImg)ctx.drawImage(tLogoImg,pad,hMidY-tLogoSize/2,tLogoSize,tLogoSize);

      // Team name — vertically centered with logo
      ctx.textBaseline='middle';ctx.textAlign='left';
      ctx.fillStyle='#171717';ctx.font=`bold 24px ${sans}`;
      ctx.fillText(team,pad+tLogoSize+10,hMidY);

      // Grade pill — vertically centered with team name
      if(draftGrade){
        ctx.font=`bold 22px ${sans}`;
        const gradeW=ctx.measureText(draftGrade.grade).width+18;
        ctx.font=`bold 24px ${sans}`;
        const teamW=ctx.measureText(team).width;
        const gpX=pad+tLogoSize+10+teamW+12;
        const gpH=32;
        ctx.fillStyle=draftGrade.color+'18';rr(gpX,hMidY-gpH/2,gradeW,gpH,6);ctx.fill();
        ctx.strokeStyle=draftGrade.color+'40';ctx.lineWidth=1;rr(gpX,hMidY-gpH/2,gradeW,gpH,6);ctx.stroke();
        ctx.fillStyle=draftGrade.color;ctx.font=`bold 22px ${sans}`;
        ctx.textAlign='center';ctx.fillText(draftGrade.grade,gpX+gradeW/2,hMidY);ctx.textAlign='left';
      }

      // Trade value delta — small, below center line
      if(tradeValueDelta!==0){ctx.fillStyle=tradeValueDelta>0?'#16a34a':'#dc2626';ctx.font=`9px ${mono}`;ctx.textBaseline='top';ctx.fillText('trade: '+(tradeValueDelta>0?'+':'')+tradeValueDelta+' pts',pad+tLogoSize+10,hMidY+16);ctx.textBaseline='middle';}

      // Logo + wordmark — top-right, vertically centered
      let logoImg=null;
      try{logoImg=new Image();logoImg.crossOrigin='anonymous';logoImg.src='/logo.png';await new Promise((r,j)=>{logoImg.onload=r;logoImg.onerror=j;setTimeout(j,2000);});}catch(e){logoImg=null;}
      const bLogoH=36,bLogoW=logoImg?Math.round(logoImg.naturalWidth/logoImg.naturalHeight*bLogoH):0;
      ctx.font=`800 28px ${font}`;
      const wmW=ctx.measureText('big board lab').width;
      const brandTotalW=bLogoW+(bLogoW?10:0)+wmW;
      const brandX=W-pad-brandTotalW;
      if(logoImg)ctx.drawImage(logoImg,brandX,hMidY-bLogoH/2,bLogoW,bLogoH);
      ctx.fillStyle='#171717';
      ctx.fillText('big board lab',brandX+(bLogoW?bLogoW+10:0),hMidY);
      ctx.textBaseline='top';

      // Separator
      ctx.fillStyle='#e5e5e5';ctx.fillRect(pad,headerH-4,W-pad*2,1);

      // === TWO COLUMNS ===
      const bodyY=headerH+8;
      const leftW=Math.round((W-pad*2-colGap)*0.65);
      const rightX=pad+leftW+colGap;
      const rightW=W-pad-rightX;

      // Load school logos
      const pickSchools=[...new Set(teamPicks.map(pk=>prospectsMap[pk.playerId]?.school).filter(Boolean))];
      const schoolCache={};
      await Promise.all(pickSchools.map(async s=>{
        const url=schoolLogo(s);if(!url)return;
        try{schoolCache[s]=await loadImg(url,2000);}catch(e){}
      }));

      // LEFT: PICKS — single white container like all-32
      ctx.fillStyle='#fff';rr(pad,bodyY,leftW,picksTotalH,12);ctx.fill();
      ctx.strokeStyle='#e5e5e5';ctx.lineWidth=1;rr(pad,bodyY,leftW,picksTotalH,12);ctx.stroke();

      let py=bodyY;
      for(let pi=0;pi<teamPicks.length;pi++){
        const pk=teamPicks[pi];
        const p=prospectsMap[pk.playerId];if(!p)continue;
        const g=activeGrade(pk.playerId);
        const rank=getConsensusRank?getConsensusRank(p.name):pk.pick;
        const g2=getConsensusGrade?getConsensusGrade(p.name):g;
        const v=pickVerdict(pk.pick,rank,g2);
        const c=POS_COLORS[p.gpos||p.pos]||POS_COLORS[p.pos]||'#525252';
        const isBest=bestPick&&pk.playerId===bestPick.pk.playerId;

        // Detect trade
        const pickIdx=picks.findIndex(x=>x.pick===pk.pick&&x.round===pk.round&&x.playerId===pk.playerId);
        const origOwner=pickIdx>=0?fullDraftOrder[pickIdx]?.team:null;
        const wasTrade=origOwner&&origOwner!==pk.team;

        // Row separator (between rows, not first)
        if(pi>0){ctx.fillStyle='#f5f5f5';ctx.fillRect(pad+1,py-0.5,leftW-2,1);}

        const midY=py+rowH/2;
        ctx.textBaseline='middle';

        // Pick # — right-aligned in left column (matching all-32)
        ctx.fillStyle='#d4d4d4';ctx.font=`12px ${mono}`;ctx.textAlign='right';
        ctx.fillText('R'+pk.round+' #'+pk.pick,pad+56,midY);ctx.textAlign='left';

        // Position pill
        const posText=p.gpos||p.pos;
        ctx.font=`bold 10px ${mono}`;
        const posW=ctx.measureText(posText).width+12;
        ctx.fillStyle=c+'18';rr(pad+62,midY-10,posW,20,4);ctx.fill();
        ctx.fillStyle=c;ctx.fillText(posText,pad+68,midY);

        // School logo
        const sLogo=schoolCache[p.school];
        const slx=pad+62+posW+8;
        if(sLogo)ctx.drawImage(sLogo,slx,midY-10,20,20);

        // Player name
        const nameX=slx+(sLogo?26:0);
        ctx.fillStyle='#171717';ctx.font=`bold 13px ${sans}`;
        const nameEnd=pad+leftW-10;
        // Reserve space for school + trade pill on right
        ctx.font=`11px ${mono}`;
        const schoolStr=p.school||'';
        const schoolW=ctx.measureText(schoolStr).width;
        let tradeW=0,tradeTxt='';
        if(wasTrade){tradeTxt='via '+(TEAM_ABBR[origOwner]||origOwner);ctx.font=`bold 7px ${mono}`;tradeW=ctx.measureText(tradeTxt).width+8;}
        const reservedRight=schoolW+8+(tradeW?tradeW+6:0)+(v?ctx.measureText(v.text).width+20:0);

        ctx.fillStyle='#171717';ctx.font=`bold 13px ${sans}`;
        const nameMaxW=nameEnd-nameX-reservedRight;
        const fullNameW=ctx.measureText(p.name).width;
        const nameDrawW=Math.min(fullNameW,Math.max(nameMaxW,60));
        drawTrunc(ctx,p.name,nameX,midY,nameDrawW);

        // School text after name
        const schoolX=nameX+nameDrawW+8;
        ctx.fillStyle='#a3a3a3';ctx.font=`11px ${mono}`;
        let afterSchoolX=schoolX;
        if(schoolX+schoolW<=nameEnd-(tradeW?tradeW+6:0)){ctx.fillText(schoolStr,schoolX,midY);afterSchoolX=schoolX+schoolW+6;}
        else{drawTrunc(ctx,schoolStr,schoolX,midY,nameEnd-schoolX-(tradeW?tradeW+6:0));afterSchoolX=nameEnd-(tradeW?tradeW+6:0);}

        // Badge emoji pills after school
        const pBadges=prospectBadges&&prospectBadges[pk.playerId]||[];
        if(pBadges.length>0){
          let bx=afterSchoolX;
          pBadges.forEach(b=>{
            const bc=POS_COLORS[p.gpos||p.pos]||'#525252';
            ctx.font=`10px ${sans}`;
            const ew=ctx.measureText(b.emoji).width+8;
            if(bx+ew>nameEnd-(tradeW?tradeW+6:0)-4)return;
            ctx.fillStyle=bc+'0d';rr(bx,midY-8,ew,16,3);ctx.fill();
            ctx.fillStyle=bc;ctx.font=`bold 10px ${sans}`;
            ctx.fillText(b.emoji,bx+4,midY);
            bx+=ew+3;
          });
        }

        // Trade pill at right edge
        if(wasTrade){
          const pillX=nameEnd-tradeW;
          ctx.fillStyle='rgba(168,85,247,0.08)';rr(pillX,midY-7,tradeW,14,2);ctx.fill();
          ctx.fillStyle='#a855f7';ctx.font=`bold 7px ${mono}`;ctx.fillText(tradeTxt,pillX+4,midY);
        }

        // Verdict pill — far right
        if(v){
          ctx.font=`bold 9px ${mono}`;
          const vw=ctx.measureText(v.text).width+14;
          const vx=pad+leftW-vw-8;
          ctx.fillStyle=v.bg;rr(vx,midY-9,vw,18,9);ctx.fill();
          ctx.fillStyle=v.color;ctx.textAlign='center';ctx.fillText(v.text,vx+vw/2,midY);ctx.textAlign='left';
        }

        ctx.textBaseline='top';
        py+=rowH;

        // Inline radar expansion for best pick
        if(isBest&&bestPick){
          // Thin divider
          ctx.fillStyle='#f5f5f5';ctx.fillRect(pad+1,py-0.5,leftW-2,1);
          const radarCx=pad+leftW/2;
          const radarCy=py+radarExpandH/2;
          drawRadarChart(ctx,p,radarCy,radarCx,radarSize,accent);
          py+=radarExpandH;
        }
      }

      // === STRATEGY PILLS — below picks container ===
      if(fpPills.length>0){
        const spY=bodyY+picksTotalH+10;
        let fpX=pad;
        ctx.font=`11px ${sans}`;ctx.textBaseline='middle';
        fpPills.forEach(pill=>{
          const label=`${pill.emoji} ${pill.text}`;
          ctx.font=`bold 11px ${sans}`;
          const tw=ctx.measureText(label).width+16;
          ctx.fillStyle=pill.color+'18';rr(fpX,spY,tw,22,11);ctx.fill();
          ctx.fillStyle=pill.color;
          ctx.fillText(label,fpX+8,spY+11);
          fpX+=tw+8;
        });
        ctx.textBaseline='top';
      }

      // RIGHT: DEPTH CHART — matching web DepthList exactly
      ctx.fillStyle='#fff';rr(rightX,bodyY,rightW,depthTotalH,12);ctx.fill();
      ctx.strokeStyle='#e5e5e5';ctx.lineWidth=1;rr(rightX,bodyY,rightW,depthTotalH,12);ctx.stroke();

      let dy=bodyY+12;
      for(let gi=0;gi<depthGroupsRendered.length;gi++){
        const group=depthGroupsRendered[gi];
        // Group separator (not first)
        if(gi>0){ctx.fillStyle='#f5f5f5';ctx.fillRect(rightX+12,dy,rightW-24,1);dy+=depthGroupGap;}
        for(const{slot,label,entry}of group.items){
          const isDraft=entry.isDraft;
          ctx.textBaseline='middle';
          const rmid=dy+depthRowH/2;
          // Slot label — matching web: mono 9px #d4d4d4, fixed 28px width
          ctx.fillStyle='#d4d4d4';ctx.font=`9px ${mono}`;
          ctx.fillText(label,rightX+12,rmid);
          // Player name — matching web: sans 11px, drafted = bold purple with bg, else normal #525252
          if(isDraft){
            ctx.font=`bold 11px ${sans}`;
            const nw=ctx.measureText(entry.name).width+12;
            ctx.fillStyle='rgba(124,58,237,0.06)';rr(rightX+42,rmid-8,nw,16,4);ctx.fill();
            ctx.fillStyle='#7c3aed';
            ctx.fillText(entry.name,rightX+48,rmid);
          }else{
            ctx.fillStyle='#525252';ctx.font=`11px ${sans}`;
            drawTrunc(ctx,entry.name,rightX+42,rmid,rightW-56);
          }
          ctx.textBaseline='top';
          dy+=depthRowH;
        }
      }

      // === FOOTER — separator + centered CTA ===
      const fy=H-footerH;
      ctx.fillStyle='#e5e5e5';ctx.fillRect(pad,fy,W-pad*2,1);
      ctx.textBaseline='middle';ctx.textAlign='center';
      ctx.fillStyle='#a3a3a3';ctx.font=`13px ${mono}`;
      ctx.fillText('draft smarter at bigboardlab.com',W/2,fy+footerH/2);
      ctx.textAlign='left';ctx.textBaseline='top';

    }else{
      // ================================================================
      // ALL 32 — three-column layout, branding in last cell
      // ================================================================
      const W=1200;
      const pad=24;
      const colGap=10;
      const numCols=3;
      const colW=(W-pad*2-(numCols-1)*colGap)/numCols;
      const rowH=47;
      const numRows=11;
      const gridY=16;
      const gridH=numRows*rowH;
      const H=gridY+gridH+16;
      const colPicks=[11,11,10]; // picks per column

      canvas.width=W*scale;canvas.height=H*scale;
      ctx.scale(scale,scale);

      // Background
      ctx.fillStyle='#faf9f6';ctx.fillRect(0,0,W,H);

      // Load logos + site logo
      const r1picks=picks.filter(pk=>pk.round===1).slice(0,32);
      let logo32=null;
      try{logo32=new Image();logo32.crossOrigin='anonymous';logo32.src='/logo.png';await new Promise((r,j)=>{logo32.onload=r;logo32.onerror=j;setTimeout(j,2000);});}catch(e){logo32=null;}
      const logoCache={};
      const schoolCache={};
      const uniqueTeams=[...new Set(r1picks.map(pk=>pk.team))];
      const uniqueSchools=[...new Set(r1picks.map(pk=>prospectsMap[pk.playerId]?.school).filter(Boolean))];
      await Promise.all([
        ...uniqueTeams.map(async t=>{try{logoCache[t]=await loadImg(nflLogoUrl(t),2000);}catch(e){}}),
        ...uniqueSchools.map(async s=>{const url=schoolLogo(s);if(!url)return;try{schoolCache[s]=await loadImg(url,2000);}catch(e){}})
      ]);

      // Draw three columns
      let pickIdx=0;
      for(let c=0;c<numCols;c++){
        const cx=pad+c*(colW+colGap);
        const nPicks=colPicks[c];

        // Column container — white, rounded, 1px border (sized to actual picks)
        const colH=nPicks*rowH;
        ctx.fillStyle='#fff';rr(cx,gridY,colW,colH,12);ctx.fill();
        ctx.strokeStyle='#e5e5e5';ctx.lineWidth=1;rr(cx,gridY,colW,colH,12);ctx.stroke();

        for(let r=0;r<nPicks;r++){
          const i=pickIdx+r;
          if(i>=r1picks.length)break;
          const pk=r1picks[i];
          const p=prospectsMap[pk.playerId];if(!p)continue;
          const ry=gridY+r*rowH;
          const midY=ry+rowH/2;

          // Row separator
          if(r<nPicks-1){ctx.fillStyle='#f5f5f5';ctx.fillRect(cx+1,ry+rowH-0.5,colW-2,1);}

          ctx.textBaseline='middle';

          // Pick #
          ctx.fillStyle='#d4d4d4';ctx.font='12px ui-monospace,monospace';ctx.textAlign='right';
          ctx.fillText(String(i+1),cx+28,midY);ctx.textAlign='left';

          // NFL team logo
          if(logoCache[pk.team])ctx.drawImage(logoCache[pk.team],cx+34,midY-10,20,20);

          // Position
          const posColor=POS_COLORS[p.gpos||p.pos]||POS_COLORS[p.pos]||'#737373';
          ctx.fillStyle=posColor;ctx.font='bold 10px ui-monospace,monospace';
          ctx.fillText(p.gpos||p.pos,cx+60,midY);

          // School logo
          const slx=cx+100;
          if(schoolCache[p.school]){
            ctx.drawImage(schoolCache[p.school],slx,midY-10,20,20);
          }else{
            ctx.fillStyle='#f0f0f0';ctx.beginPath();ctx.arc(slx+10,midY,10,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#a3a3a3';ctx.font='bold 8px -apple-system,system-ui,sans-serif';ctx.textAlign='center';
            ctx.fillText((p.school||'?').charAt(0),slx+10,midY);ctx.textAlign='left';
          }

          // Player name + School — measure school & trade first to reserve space
          const nameX=slx+26;
          const rowEnd=cx+colW-10;

          ctx.font='11px ui-monospace,monospace';
          const schoolStr=p.school||'';
          const schoolW=ctx.measureText(schoolStr).width;

          const origSlot=fullDraftOrder[i];
          const wasTrade=origSlot&&pk.team!==origSlot.team;
          let tradeW=0;let tradeTxt='';
          if(wasTrade){
            tradeTxt='via '+(TEAM_ABBR[origSlot.team]||origSlot.team);
            ctx.font='bold 7px ui-monospace,monospace';
            tradeW=ctx.measureText(tradeTxt).width+8;
          }

          const reservedRight=schoolW+8+(tradeW?tradeW+6:0);
          const nameMaxW=rowEnd-nameX-reservedRight;

          ctx.fillStyle='#171717';ctx.font='bold 13px -apple-system,system-ui,sans-serif';
          const fullNameW=ctx.measureText(p.name).width;
          const nameDrawW=Math.min(fullNameW,Math.max(nameMaxW,60));
          drawTrunc(ctx,p.name,nameX,midY,nameDrawW);

          const schoolX=nameX+nameDrawW+8;
          ctx.fillStyle='#a3a3a3';ctx.font='11px ui-monospace,monospace';
          if(schoolX+schoolW<=rowEnd-(tradeW?tradeW+6:0)){
            ctx.fillText(schoolStr,schoolX,midY);
          }else{
            drawTrunc(ctx,schoolStr,schoolX,midY,rowEnd-schoolX-(tradeW?tradeW+6:0));
          }

          if(wasTrade){
            const pillX=rowEnd-tradeW;
            ctx.fillStyle='rgba(168,85,247,0.08)';rr(pillX,midY-7,tradeW,14,2);ctx.fill();
            ctx.fillStyle='#a855f7';ctx.font='bold 7px ui-monospace,monospace';
            ctx.fillText(tradeTxt,pillX+4,midY);
          }

          ctx.textBaseline='top';
        }

        // Branding module — separate container below col 3
        if(c===2){
          const brandY=gridY+colH+6;
          const brandH=rowH;
          ctx.fillStyle='#fff';rr(cx,brandY,colW,brandH,12);ctx.fill();
          ctx.strokeStyle='#e5e5e5';ctx.lineWidth=1;rr(cx,brandY,colW,brandH,12);ctx.stroke();

          const brandMidY=brandY+brandH/2;
          ctx.textBaseline='middle';

          // Logo (same position as NFL logos in pick rows)
          let bx=cx+12;
          if(logo32){
            const bLogoH=24,bLogoW=Math.round(logo32.naturalWidth/logo32.naturalHeight*bLogoH);
            ctx.drawImage(logo32,bx,brandMidY-bLogoH/2,bLogoW,bLogoH);
            bx+=bLogoW+8;
          }

          // Wordmark
          ctx.fillStyle='#171717';ctx.font="bold 14px 'Literata',Georgia,serif";
          ctx.fillText('big board lab',bx,brandMidY);
          bx+=ctx.measureText('big board lab').width+10;

          // CTA
          ctx.fillStyle='#a3a3a3';ctx.font='10px ui-monospace,monospace';
          ctx.fillText('draft smarter at bigboardlab.com',bx,brandMidY);

          ctx.textBaseline='top';
        }

        pickIdx+=nPicks;
      }
    }

    // === EXPORT — preview mode returns data URL, otherwise clipboard/share ===
    const label=isSingleTeam?team:'mock-draft';
    canvas.toBlob(async blob=>{
      if(trackEvent)trackEvent(userId,'share_triggered',{type:isAllTeams?'mock_all32':'mock_single',team:[...userTeams].join(','),grade:draftGrade?.grade||null,guest:!!isGuestUser});
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
        setCopiedDraft(true);setTimeout(()=>setCopiedDraft(false),1500);
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
    ctx.fillStyle='#737373';ctx.font=`bold 9px ${sans}`;ctx.textAlign='center';ctx.textBaseline='middle';
    posTraits.forEach((t,i)=>{
      const lr=r+24;const lx=cx+lr*Math.cos(angles[i]);const ly=cy+lr*Math.sin(angles[i]);
      const a=angles[i];
      if(Math.abs(Math.cos(a))>0.3){ctx.textAlign=Math.cos(a)>0?'left':'right';}else{ctx.textAlign='center';}
      ctx.fillText(t,lx,ly);
    });
    ctx.textAlign='left';ctx.textBaseline='top';
  }

  const userPickCount=useMemo(()=>picks.filter(p=>p.isUser).length,[picks]);

  const draftFingerprint=(teamPicks)=>{
    if(teamPicks.length<5)return[];
    const guys=teamPicks.map(pk=>{const p=prospectsMap[pk.playerId];if(!p)return null;return{id:p.id,name:p.name,school:p.school,gpos:p.gpos||p.pos,pick:pk.pick,round:pk.round};}).filter(Boolean);
    if(guys.length<5)return[];
    const pills=[];
    const posCounts={};
    guys.forEach(g=>{const pos=g.gpos==="K"||g.gpos==="P"||g.gpos==="LS"?"K/P":g.gpos;posCounts[pos]=(posCounts[pos]||0)+1;});
    const topPos=Object.entries(posCounts).sort((a,b)=>b[1]-a[1]);
    if(topPos.length>0&&topPos[0][1]>=Math.ceil(guys.length*0.4)){
      const[pos,cnt]=topPos[0];
      pills.push({emoji:(POS_EMOJI||{})[pos]||"📋",text:`${pos} heavy`,color:POS_COLORS[pos]||"#525252"});
    }else if(topPos.length>=4&&topPos[0][1]-topPos[topPos.length-1][1]<=1){
      pills.push({emoji:"🔀",text:"balanced draft",color:"#525252"});
    }
    const traitCounts={};
    guys.forEach(g=>{if(!g.id)return;const badges=prospectBadges[g.id]||[];badges.forEach(b=>{traitCounts[b.trait]=(traitCounts[b.trait]||0)+1;});});
    const topTraits=Object.entries(traitCounts).filter(([,c])=>c>=2).sort((a,b)=>b[1]-a[1]).slice(0,2);
    topTraits.forEach(([trait])=>{
      const labels={"Pass Rush":"pass rush magnet","Speed":"speed obsessed","Man Coverage":"lockdown lean","Accuracy":"accuracy snob","Motor":"motor lovers","Ball Skills":"ball hawk bias","Tackling":"sure tacklers","Vision":"vision seekers","Hands":"reliable hands","First Step":"first step fanatic","Athleticism":"athletic bias"};
      pills.push({emoji:(TRAIT_EMOJI||{})[trait]||"⭐",text:labels[trait]||trait.toLowerCase(),color:"#7c3aed"});
    });
    const ceilCounts={elite:0,high:0,normal:0,capped:0};
    guys.forEach(g=>{const sc=getScoutingTraits(g.name,g.school);const c=sc?.__ceiling||"normal";ceilCounts[c]++;});
    const upside=ceilCounts.elite+ceilCounts.high;
    if(upside>=Math.ceil(guys.length*0.6)){
      pills.push({emoji:"⭐",text:"ceiling chaser",color:"#ea580c"});
    }else if(ceilCounts.capped>=Math.ceil(guys.length*0.3)){
      pills.push({emoji:"🔒",text:"floor first",color:"#64748b"});
    }
    const avgDelta=guys.reduce((s,g)=>{const rank=getConsensusRank?getConsensusRank(g.name):g.pick;return s+(rank-g.pick);},0)/guys.length;
    if(avgDelta<-10)pills.push({emoji:"📈",text:"value hunter",color:"#16a34a"});
    else if(avgDelta>5)pills.push({emoji:"🎲",text:"reach drafter",color:"#dc2626"});
    else pills.push({emoji:"⚖️",text:"consensus aligned",color:"#525252"});
    if(SCHOOL_CONFERENCE){
      const confCounts={};
      guys.forEach(g=>{const conf=SCHOOL_CONFERENCE[g.school];if(conf&&conf!=="FCS"&&conf!=="D2"&&conf!=="D3"&&conf!=="Ind")confCounts[conf]=(confCounts[conf]||0)+1;});
      const topConf=Object.entries(confCounts).sort((a,b)=>b[1]-a[1]);
      if(topConf.length>0&&topConf[0][1]>=Math.ceil(guys.length*0.6))pills.push({emoji:"🏈",text:`${topConf[0][0]} lean`,color:"#0369a1"});
    }
    const schoolCounts={};
    guys.forEach(g=>{if(g.school)schoolCounts[g.school]=(schoolCounts[g.school]||0)+1;});
    const repeats=Object.entries(schoolCounts).filter(([,c])=>c>=2).sort((a,b)=>b[1]-a[1]);
    if(repeats.length>0){const[sch]=repeats[0];pills.push({emoji:"🏫",text:`${sch} pipeline`,color:"#7c3aed"});}
    return pills.slice(0,4);
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
          {draftGrade&&userTeams.size===1&&<div style={{display:"inline-block",padding:"12px 32px",background:"#fff",border:"2px solid "+draftGrade.color,borderRadius:16,marginBottom:24}}>
            <div style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase"}}>draft grade</div>
            <div style={{fontFamily:font,fontSize:56,fontWeight:900,color:draftGrade.color,lineHeight:1}}>{draftGrade.grade}</div>
            {tradeValueDelta!==0&&<div style={{fontFamily:mono,fontSize:10,color:tradeValueDelta>0?"#16a34a":"#dc2626",marginTop:4}}>trade surplus: {tradeValueDelta>0?"+":""}{tradeValueDelta} pts</div>}
          </div>}
          {userTeams.size===32&&<div style={{fontFamily:mono,fontSize:11,color:"#a3a3a3",marginBottom:24,letterSpacing:1}}>2026 NFL DRAFT · FIRST ROUND PREDICTIONS</div>}
          <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:24}}>
            {(userTeams.size===1||userTeams.size===32)&&<button onClick={shareDraft} style={{fontFamily:sans,fontSize:13,fontWeight:700,padding:"10px 24px",background:"transparent",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",display:"inline-flex",alignItems:"center",position:"relative"}}><span style={{visibility:copiedDraft?"hidden":"visible"}}><span className="shimmer-text">share results</span></span>{copiedDraft&&<span style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",color:"#a3a3a3",fontWeight:400}}>copied</span>}</button>}
            <button onClick={onClose} style={{fontFamily:sans,fontSize:12,padding:"8px 20px",background:"transparent",color:"#525252",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer"}}>draft again</button>
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
              // Pick one randomly but stabilize across re-renders via ref
              if(cpuCandidates.length>0){
                if(!ctaPickRef.current||!cpuCandidates.find(c=>c.player.name===ctaPickRef.current.player.name)){
                  ctaPickRef.current=cpuCandidates[Math.floor(Math.random()*cpuCandidates.length)];
                }
                ctaPick=ctaPickRef.current;
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
          {userTeams.size===32?(()=>{
            // Group picks by round
            const rounds={};
            picks.forEach(pk=>{if(!rounds[pk.round])rounds[pk.round]=[];rounds[pk.round].push(pk);});
            return Object.entries(rounds).sort((a,b)=>a[0]-b[0]).map(([rd,rdPicks])=>{
              const half=Math.ceil(rdPicks.length/2);
              const leftCol=rdPicks.slice(0,half);
              const rightCol=rdPicks.slice(half);
              const renderPick=(pk,i)=>{const p=prospectsMap[pk.playerId];if(!p)return null;const c=POS_COLORS[p.pos];
                return<div key={i} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 10px",borderBottom:"1px solid #f5f5f5"}}>
                  <span style={{fontFamily:mono,fontSize:11,color:"#d4d4d4",width:22,textAlign:"right",flexShrink:0}}>{pk.pick}</span>
                  <NFLTeamLogo team={pk.team} size={16}/>
                  <span style={{fontFamily:mono,fontSize:10,color:c,width:32,flexShrink:0}}>{p.gpos||p.pos}</span>
                  <SchoolLogo school={p.school} size={16}/>
                  <span style={{fontFamily:sans,fontSize:13,fontWeight:600,color:"#171717",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",cursor:"pointer"}} onClick={()=>setProfilePlayer(p)} onMouseEnter={e=>e.currentTarget.style.textDecoration="underline"} onMouseLeave={e=>e.currentTarget.style.textDecoration="none"}>{p.name}</span>
                  <span style={{fontFamily:mono,fontSize:11,color:"#a3a3a3",flexShrink:0}}>{p.school}</span>
                  {pk.traded&&<span style={{fontFamily:mono,fontSize:7,color:"#a855f7",background:"rgba(168,85,247,0.08)",padding:"1px 4px",borderRadius:2,flexShrink:0}}>TRD</span>}
                </div>;
              };
              return<div key={rd} style={{marginBottom:24,textAlign:"left"}}>
                <div style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:8,textAlign:"center"}}>round {rd}</div>
                <div className="all32-round" style={{display:"flex",gap:12}}>
                  <div style={{flex:1,background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,overflow:"hidden"}}>
                    {leftCol.map(renderPick)}
                  </div>
                  {rightCol.length>0&&<div style={{flex:1,background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,overflow:"hidden"}}>
                    {rightCol.map(renderPick)}
                  </div>}
                </div>
                <style>{`@media(max-width:640px){.all32-round{flex-direction:column!important;}}`}</style>
              </div>;
            });
          })():[...userTeams].map(team=>{
            const tp=userPicks.filter(pk=>pk.team===team);if(tp.length===0)return null;
            const teamGrade=gradeTeamPicks(tp,team);
            const fpPills=draftFingerprint(tp);
            return(<div key={team} style={{marginBottom:32,textAlign:"left"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <NFLTeamLogo team={team} size={20}/>
                <span style={{fontFamily:sans,fontSize:14,fontWeight:700,color:"#171717"}}>{team}</span>
              </div>
              <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,overflow:"hidden",marginBottom:12}}>
                {tp.map((pk,i)=>{const p=prospectsMap[pk.playerId];if(!p)return null;const c=POS_COLORS[p.pos];const g=activeGrade(pk.playerId);const rank=getConsensusRank?getConsensusRank(p.name):pk.pick;const g2=getConsensusGrade?getConsensusGrade(p.name):activeGrade(pk.playerId);const v=pickVerdict(pk.pick,rank,g2);
                  return<div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderBottom:"1px solid #f5f5f5"}}>
                    <span style={{fontFamily:mono,fontSize:10,color:"#d4d4d4",width:44}}>Rd{pk.round} #{pk.pick}</span>
                    <span style={{fontFamily:mono,fontSize:10,color:c,width:28}}>{p.gpos||p.pos}</span>
                    <SchoolLogo school={p.school} size={16}/>
                    <span style={{fontFamily:sans,fontSize:12,fontWeight:600,color:"#171717",flex:1,cursor:"pointer"}} onClick={()=>setProfilePlayer(p)} onMouseEnter={e=>e.currentTarget.style.textDecoration="underline"} onMouseLeave={e=>e.currentTarget.style.textDecoration="none"}>{p.name}</span>
                    <span style={{fontFamily:mono,fontSize:7,padding:"1px 5px",background:v.bg,color:v.color,borderRadius:3}}>{v.text}</span>
                    {renderGradeOrPill(p)}
                  </div>;
                })}
              </div>
              <div style={{display:"flex",gap:16,alignItems:"stretch",flexWrap:"wrap"}}>
                <div style={{flex:"1 1 280px",minWidth:260,display:"flex",flexDirection:"column",gap:12}}>
                  <DraftFit team={team} teamPicks={tp} fpPills={fpPills} liveNeeds={liveNeeds} prospectsMap={prospectsMap} mono={mono} sans={sans}/>
                  <div style={{background:"#fff",borderRadius:12,padding:"8px 4px"}}>
                    <FormationChart team={team} depthChart={depthChart} mono={mono} sans={sans}/>
                  </div>
                </div>
                <div style={{flex:"1 1 280px",minWidth:200,background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"12px 16px"}}>
                  <div style={{fontFamily:mono,fontSize:8,letterSpacing:1.5,color:"#a3a3a3",textTransform:"uppercase",marginBottom:6}}>depth chart</div>
                  <DepthList team={team} depthChart={depthChart} mono={mono} sans={sans}/>
                  <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:6}}>
                    {[["elite","ELT"],["pro_bowl","PRO"],["quality_starter","QS"],["starter","STR"],["rotational","ROT"],["backup","BKP"],["declining","DEC"]].map(([tier,label])=><span key={tier} style={{display:"inline-flex",alignItems:"center",gap:2}}><span style={{width:5,height:5,borderRadius:3,background:TIER_COLORS[tier]}}/><span style={{fontFamily:mono,fontSize:7,color:"#a3a3a3"}}>{label}</span></span>)}
                  </div>
                </div>
              </div>
            </div>);
          })}
          {userTeams.size<32&&(()=>{
            const rounds={};
            picks.forEach(pk=>{if(!rounds[pk.round])rounds[pk.round]=[];rounds[pk.round].push(pk);});
            return<>
              <div style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",textAlign:"center",marginTop:32,marginBottom:12}}>full draft board</div>
              {Object.entries(rounds).sort((a,b)=>a[0]-b[0]).map(([rd,rdPicks])=>{
                const half=Math.ceil(rdPicks.length/2);
                const leftCol=rdPicks.slice(0,half);
                const rightCol=rdPicks.slice(half);
                const renderPick=(pk,i)=>{const p=prospectsMap[pk.playerId];if(!p)return null;const c=POS_COLORS[p.pos];const isUser=userTeams.has(pk.team);
                  return<div key={i} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 10px",borderBottom:"1px solid #f5f5f5",...(isUser?{background:"rgba(124,58,237,0.04)"}:{})}}>
                    <span style={{fontFamily:mono,fontSize:11,color:"#d4d4d4",width:22,textAlign:"right",flexShrink:0}}>{pk.pick}</span>
                    <NFLTeamLogo team={pk.team} size={16}/>
                    <span style={{fontFamily:mono,fontSize:10,color:c,width:32,flexShrink:0}}>{p.gpos||p.pos}</span>
                    <SchoolLogo school={p.school} size={16}/>
                    <span style={{fontFamily:sans,fontSize:13,fontWeight:isUser?800:600,color:"#171717",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",cursor:"pointer"}} onClick={()=>setProfilePlayer(p)} onMouseEnter={e=>e.currentTarget.style.textDecoration="underline"} onMouseLeave={e=>e.currentTarget.style.textDecoration="none"}>{p.name}</span>
                    <span style={{fontFamily:mono,fontSize:11,color:"#a3a3a3",flexShrink:0}}>{p.school}</span>
                    {pk.traded&&<span style={{fontFamily:mono,fontSize:7,color:"#a855f7",background:"rgba(168,85,247,0.08)",padding:"1px 4px",borderRadius:2,flexShrink:0}}>TRD</span>}
                  </div>;
                };
                return<div key={rd} style={{marginBottom:24,textAlign:"left"}}>
                  <div style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:8,textAlign:"center"}}>round {rd}</div>
                  <div className="full-draft-round" style={{display:"flex",gap:12}}>
                    <div style={{flex:1,background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,overflow:"hidden"}}>
                      {leftCol.map(renderPick)}
                    </div>
                    {rightCol.length>0&&<div style={{flex:1,background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,overflow:"hidden"}}>
                      {rightCol.map(renderPick)}
                    </div>}
                  </div>
                </div>;
              })}
            </>;
          })()}
          <style>{`@media(max-width:640px){.fp-pill-hide{display:none!important;}.full-draft-round{flex-direction:column!important;}}`}</style>
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
            if(avgDelta<-10)pills.push({emoji:"📈",text:"value hunter",detail:`avg ${Math.round(Math.abs(avgDelta))} picks late`,color:"#16a34a"});
            else if(avgDelta>5)pills.push({emoji:"🎲",text:"reach drafter",detail:`avg ${Math.round(avgDelta)} picks early`,color:"#dc2626"});
            else pills.push({emoji:"⚖️",text:"consensus aligned",detail:`±${Math.round(Math.abs(avgDelta))}`,color:"#525252"});
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
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <h2 style={{fontFamily:font,fontSize:24,fontWeight:900,color:"#171717",margin:0,letterSpacing:-0.5}}>👀 my guys</h2>
                {onShareMyGuys&&(myGuys||[]).length>0&&<button onClick={onShareMyGuys} style={{fontFamily:sans,fontSize:12,fontWeight:parentCopiedShare==="my-guys"?400:700,padding:"6px 14px",background:"transparent",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",display:"inline-flex",alignItems:"center",flexShrink:0}}>{parentCopiedShare==="my-guys"?<span style={{color:"#a3a3a3"}}>copied</span>:<span className="shimmer-text">share my guys</span>}</button>}
              </div>
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
        {profilePlayer&&<PlayerProfile player={profilePlayer} traits={traits} setTraits={setTraits} notes={notes} setNotes={setNotes} allProspects={allProspects} getGrade={getGrade} onClose={()=>setProfilePlayer(null)} onSelectPlayer={setProfilePlayer} consensus={CONSENSUS} ratings={ratings} isGuest={isGuest} onRequireAuth={onRequireAuth} schemeFits={schemeFits}/>}
      </div>
    );
  }

  // === MAIN DRAFT SCREEN ===
  const picksPanel=(<div style={{maxHeight:isMobile?"none":"calc(100vh - 60px)",overflowY:"auto"}}>
    <style>{`@keyframes pickSlideIn{from{transform:translateX(20px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
    <div style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:6,padding:"0 4px"}}>picks</div>
    <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,overflow:"hidden"}}>
      {picks.map((pick,i)=>{const p=prospectsMap[pick.playerId];if(!p)return null;const c=POS_COLORS[p.pos];const isU=pick.isUser;
        const showRound=i===0||pick.round!==picks[i-1].round;
        return<div key={i} style={{animation:"pickSlideIn 0.3s ease-out both"}}>{showRound&&<div style={{padding:"5px 10px",background:"#f5f5f5",fontFamily:mono,fontSize:8,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase"}}>round {pick.round}</div>}<div style={{display:"flex",alignItems:"center",gap:5,padding:"5px 10px",borderBottom:"1px solid #f8f8f8",background:isU?"rgba(34,197,94,0.02)":"transparent"}}>
          <span style={{fontFamily:mono,fontSize:9,color:"#d4d4d4",width:18,textAlign:"right"}}>{pick.pick}</span>
          <NFLTeamLogo team={pick.team} size={13}/>
          <span style={{fontFamily:mono,fontSize:8,color:c}}>{p.gpos||p.pos}</span>
          <span style={{fontFamily:sans,fontSize:10,fontWeight:isU?600:400,color:isU?"#171717":"#737373",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</span>
          {pick.traded&&(()=>{const ct=cpuTradeLog.find(t=>t.involvedPicks?t.involvedPicks.includes(i):t.pickIdx===i);const tip=ct?`${ct.fromTeam} traded ${ct.gave.join(" + ")} to ${ct.toTeam} for ${ct.got.join(" + ")}`:`Trade: ${pick.team} acquired pick #${pick.pick}`;return<span title={tip} style={{fontFamily:mono,fontSize:7,color:"#a855f7",background:"rgba(168,85,247,0.08)",padding:"1px 4px",borderRadius:2,cursor:"help"}}>🔄 TRD</span>;})()}
        </div></div>;
      })}
      {/* Current pick indicator */}
      {picks.length<totalPicks&&<div style={{padding:"8px 10px",display:"flex",alignItems:"center",gap:5,background:"rgba(99,102,241,0.04)"}}>
        <span style={{fontFamily:mono,fontSize:9,color:"#6366f1",width:18,textAlign:"right",fontWeight:700}}>→</span>
        <NFLTeamLogo team={currentTeam} size={13}/>
        <span style={{fontFamily:mono,fontSize:9,color:"#6366f1",fontWeight:600}}>#{fullDraftOrder[picks.length]?.pick} {currentTeam}</span>
      </div>}
      {/* Upcoming picks */}
      {picks.length<totalPicks&&fullDraftOrder.slice(picks.length+1).map((d,i)=>{
        const idx=picks.length+1+i;
        const team=getPickTeam(idx);
        const isMyPick=userTeams.has(team);
        const showRound=i===0?d.round!==fullDraftOrder[picks.length]?.round:d.round!==fullDraftOrder[picks.length+i]?.round;
        return<div key={"up"+idx}>
          {showRound&&<div style={{padding:"5px 10px",background:"#f5f5f5",fontFamily:mono,fontSize:8,letterSpacing:2,color:"#d4d4d4",textTransform:"uppercase"}}>round {d.round}</div>}
          <div style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",borderBottom:"1px solid #f8f8f8",background:isMyPick?"rgba(34,197,94,0.08)":"transparent",opacity:isMyPick?1:0.45}}>
            <span style={{fontFamily:mono,fontSize:9,color:"#d4d4d4",width:18,textAlign:"right"}}>{d.pick}</span>
            <NFLTeamLogo team={team} size={13}/>
            <span style={{fontFamily:sans,fontSize:10,color:isMyPick?"#16a34a":"#a3a3a3",fontWeight:isMyPick?600:400}}>{team}</span>
            {isMyPick&&<span style={{fontFamily:mono,fontSize:7,color:"#16a34a",background:"rgba(34,197,94,0.1)",padding:"1px 4px",borderRadius:2}}>YOU</span>}
          </div>
        </div>;
      })}
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
          <FormationChart team={team} depthChart={depthChart} mono={mono} sans={sans}/>
          <DepthList team={team} depthChart={depthChart} mono={mono} sans={sans}/>
          <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:4,marginBottom:4}}>
            {[["elite","ELT"],["pro_bowl","PRO"],["quality_starter","QS"],["starter","STR"],["rotational","ROT"],["backup","BKP"],["declining","DEC"]].map(([tier,label])=><span key={tier} style={{display:"inline-flex",alignItems:"center",gap:2}}><span style={{width:5,height:5,borderRadius:3,background:TIER_COLORS[tier]}}/><span style={{fontFamily:mono,fontSize:7,color:"#a3a3a3"}}>{label}</span></span>)}
          </div>
          <LiveNeeds team={team} liveNeeds={liveNeeds} userTeams={userTeams} mono={mono}/>
        </div>
      );
    })()}
  </div>);

  const centerPanel=null; // centerPanel is inlined below for desktop; mobile has its own layout

  // === MOBILE DRAFT SCREEN ===
  if(isMobile){
    const userPicks=picks.filter(pk=>pk.isUser);
    const needs=liveNeeds[currentTeam]||{};const base=TEAM_NEEDS_COUNTS?.[currentTeam]||{};const isUserTeam=userTeams.has(currentTeam);const broad=new Set(["DB","DL","OL"]);
    const needEntries=Object.entries(needs).filter(([pos,v])=>v>0&&(!isUserTeam||(!broad.has(pos)&&(base[pos]||0)>=2)));
    const filled=Object.entries(base).filter(([k])=>(!needs[k]||needs[k]===0)&&(!isUserTeam||(!broad.has(k)&&(base[k]||0)>=2)));
    return(
      <div style={{minHeight:"100vh",background:"#faf9f6",fontFamily:font,display:"flex",flexDirection:"column"}}>
        <style>{`.trait-pills-scroll::-webkit-scrollbar{display:none;}
@keyframes svFadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
@keyframes svFadeOut{from{opacity:1}to{opacity:0}}`}</style>
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

              <button onPointerDown={(e)=>{e.preventDefault();setShowMobilePicks(v=>!v);}} style={{fontFamily:sans,fontSize:10,padding:"4px 8px",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",background:showMobilePicks?"#171717":"transparent",color:showMobilePicks?"#faf9f6":"#a3a3a3",touchAction:"manipulation"}}>picks</button>
              <button onPointerDown={(e)=>{e.preventDefault();toggleTradeUp();}} style={{fontFamily:sans,fontSize:10,padding:"4px 8px",border:"1px solid #a855f7",borderRadius:99,cursor:"pointer",background:showTradeUp?"#a855f7":"rgba(168,85,247,0.03)",color:showTradeUp?"#fff":"#a855f7",touchAction:"manipulation"}}>📞</button>
              <button onPointerDown={(e)=>{e.preventDefault();setPaused(p=>!p);}} style={{fontFamily:sans,fontSize:10,padding:"4px 8px",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",background:paused?"#fef3c7":"transparent",color:paused?"#92400e":"#a3a3a3",touchAction:"manipulation"}}>{paused?"▶":"⏸"}</button>
              <button onPointerDown={(e)=>{e.preventDefault();onClose();}} style={{fontFamily:sans,fontSize:10,color:"#a3a3a3",background:"none",border:"1px solid #e5e5e5",borderRadius:99,padding:"4px 8px",cursor:"pointer",touchAction:"manipulation"}}>✕</button>
            </div>
          </div>
          {/* Mobile picks panel — toggled from header */}
          {showMobilePicks&&<div style={{maxHeight:"50vh",overflowY:"auto",borderBottom:"1px solid #e5e5e5",padding:"4px 0"}}>{picksPanel}</div>}
          {/* Position filter — horizontal scroll, with scout vision toggle inline */}
          <div style={{display:"flex",gap:4,padding:"0 12px 8px",overflowX:"auto",WebkitOverflowScrolling:"touch",alignItems:"center"}}>
            {<div style={{position:"relative",flexShrink:0}}>
              <button onClick={()=>{setScoutVision(v=>!v);setExpandedScoutId(null);setSvTooltip(false);localStorage.setItem("bbl_sv_seen_2","1");}} title={scoutVision?"Disable Scout Vision":"Enable Scout Vision"} style={{width:40,height:22,borderRadius:11,border:"none",background:scoutVision?"linear-gradient(135deg,#4f46e5,#7c3aed,#a855f7)":"linear-gradient(135deg,#c4b5fd,#a3a3a3)",cursor:"pointer",position:"relative",transition:"background 0.2s"}}><div style={{width:16,height:16,borderRadius:8,background:"#fff",position:"absolute",top:3,left:scoutVision?21:3,transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontFamily:mono,fontSize:7,fontWeight:700,color:scoutVision?"#6366f1":"#a3a3a3",lineHeight:1}}>SV</span></div></button>
              {svTooltip&&<div style={{position:"absolute",top:-36,left:0,background:"#171717",color:"#fff",fontFamily:sans,fontSize:9,padding:"6px 10px",borderRadius:8,whiteSpace:"nowrap",pointerEvents:"none",animation:"svFadeIn 0.3s ease, svFadeOut 0.5s ease 5.5s forwards",zIndex:10,lineHeight:1.3,boxShadow:"0 4px 12px rgba(0,0,0,0.2)"}}><span style={{fontWeight:700}}>Scout Vision</span> — sort by scheme fit<div style={{position:"absolute",bottom:-4,left:16,width:0,height:0,borderLeft:"5px solid transparent",borderRight:"5px solid transparent",borderTop:"5px solid #171717"}}/></div>}
            </div>}
            <button onClick={()=>setFilterPos(new Set())} style={{fontFamily:mono,fontSize:10,padding:"4px 10px",background:filterPos.size===0?"#171717":"transparent",color:filterPos.size===0?"#faf9f6":"#a3a3a3",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",flexShrink:0}}>all</button>
            {positions.map(pos=><button key={pos} onClick={()=>setFilterPos(prev=>{const n=new Set(prev);if(n.has(pos))n.delete(pos);else n.add(pos);return n;})} style={{fontFamily:mono,fontSize:10,padding:"4px 10px",background:filterPos.has(pos)?granularPosColor(pos):"transparent",color:filterPos.has(pos)?"#fff":granularPosColor(pos),border:"1px solid "+(filterPos.has(pos)?granularPosColor(pos):"#e5e5e5"),borderRadius:99,cursor:"pointer",flexShrink:0}}>{pos}</button>)}
          </div>
          {filterPos.size===1&&(()=>{const rawPos=[...filterPos][0];const pos=rawPos==="IDL"?"DL":rawPos;const posTraits=(POSITION_TRAITS||{})[pos]||[];if(!posTraits.length)return null;const c=(POS_COLORS||{})[pos]||(POS_COLORS||{})[rawPos]||"#525252";const measPills=(MEASURABLE_LIST||[]).filter(m=>measurableThresholds&&measurableThresholds[pos]?.[m]);const posAvail=available.filter(id=>{const p=prospectsMap[id];return p&&posFilterMatch(p,rawPos);});return<div style={{display:"flex",alignItems:"center",gap:6,padding:"0 12px 6px"}}><button title={measMode?"Measurables mode — click for Traits":"Traits mode — click for Measurables"} onClick={()=>{setMeasMode(v=>!v);setTraitFilter(new Set());}} style={{width:40,height:22,borderRadius:11,border:"none",background:measMode?"linear-gradient(135deg,#00ffff,#1e3a5f)":"linear-gradient(135deg,#ec4899,#a855f7)",cursor:"pointer",position:"relative",transition:"background 0.2s",flexShrink:0}}><div style={{width:16,height:16,borderRadius:8,background:"#fff",position:"absolute",top:3,left:measMode?21:3,transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontFamily:mono,fontSize:8,fontWeight:700,color:measMode?"#00ffff":"#a855f7",lineHeight:1}}>{measMode?"M":"T"}</span></div></button><div className="trait-pills-scroll" style={{display:"flex",gap:4,overflowX:"auto",WebkitOverflowScrolling:"touch",flexWrap:"nowrap",scrollbarWidth:"none",alignItems:"center",flex:1,minWidth:0}}>{!measMode?posTraits.map(trait=>{const active=traitFilter.has(trait);const count=posAvail.filter(id=>qualifiesForFilter&&qualifiesForFilter(id,pos,trait)).length;return<button key={trait} onClick={()=>setTraitFilter(prev=>{const n=new Set(prev);n.has(trait)?n.delete(trait):n.add(trait);return n;})} style={{fontFamily:mono,fontSize:9,padding:"3px 8px",background:active?c+"18":"transparent",color:active?"#171717":"#525252",border:"1px solid "+(active?c+"44":c+"25"),borderRadius:99,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",gap:3,whiteSpace:"nowrap"}}><span>{(TRAIT_EMOJI||{})[trait]}</span><span>{TRAIT_SHORT[trait]||trait}</span><span style={{fontSize:8,opacity:0.7}}>({count})</span></button>;}):(()=>{const groups=(MEAS_GROUPS||[]).map(g=>({...g,pills:g.keys.filter(m=>measPills.includes(m))})).filter(g=>g.pills.length>0);return groups.flatMap((g,gi)=>{const divider=gi>0?[<span key={"d"+gi} style={{color:"#d4d4d4",fontSize:10,flexShrink:0,padding:"0 1px",lineHeight:1}}>·</span>]:[];return[...divider,...g.pills.map(m=>{const active=traitFilter.has(m);const count=posAvail.filter(id=>qualifiesForMeasurableFilter&&qualifiesForMeasurableFilter(id,pos,m)).length;return<button key={m} onClick={()=>setTraitFilter(prev=>{const n=new Set(prev);n.has(m)?n.delete(m):n.add(m);return n;})} style={{fontFamily:mono,fontSize:9,padding:"3px 8px",background:active?g.border+"18":"transparent",color:active?"#171717":"#525252",border:"1px solid "+(active?g.border+"66":g.border+"30"),borderRadius:99,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",gap:3,whiteSpace:"nowrap"}}><span>{(MEASURABLE_EMOJI||{})[m]}</span><span>{(MEASURABLE_SHORT||{})[m]}</span><span style={{fontSize:8,opacity:0.7}}>({count})</span></button>;})];});})()}</div></div>;})()}
          {/* Archetype pills */}
          {filterPos.size===1&&(()=>{const rawPos=[...filterPos][0];const posAvail=available.filter(id=>{const p=prospectsMap[id];return p&&posFilterMatch(p,rawPos);});const archTagCounts={};posAvail.forEach(id=>{(prospectTagsMap[id]||[]).forEach(t=>{archTagCounts[t]=(archTagCounts[t]||0)+1;});});const archTags=Object.entries(archTagCounts).sort((a,b)=>b[1]-a[1]).map(([t])=>t);if(!archTags.length)return null;return<div className="trait-pills-scroll" style={{display:"flex",gap:4,overflowX:"auto",WebkitOverflowScrolling:"touch",flexWrap:"nowrap",scrollbarWidth:"none",alignItems:"center",padding:"0 12px 6px"}}><span style={{fontFamily:mono,fontSize:8,color:"#a3a3a3",flexShrink:0,letterSpacing:1}}>ROLE</span>{archTags.map(tag=>{const active=archetypeFilter.has(tag);return<button key={tag} onClick={()=>setArchetypeFilter(prev=>{const n=new Set(prev);n.has(tag)?n.delete(tag):n.add(tag);return n;})} style={{fontFamily:mono,fontSize:9,padding:"3px 8px",background:active?"#171717":"transparent",color:active?"#faf9f6":"#525252",border:"1px solid "+(active?"#171717":"#d4d4d4"),borderRadius:99,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",gap:3,whiteSpace:"nowrap"}}><span>{ARCHETYPE_EMOJI[tag]||""}</span><span>{ARCHETYPE_DISPLAY[tag]||tag}</span><span style={{fontSize:8,opacity:0.7}}>({archTagCounts[tag]})</span></button>;})}</div>;})()}
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
            {allCpuTeams.map(t=>(<button key={t} onClick={()=>{setTradePartner(t);setTradeTarget([]);setTradeUserPicks([]);setTradePlayerTarget([]);setTradeUserPlayers([]);setShowGetPlayers(false);setShowGivePlayers(false);}} style={{fontFamily:sans,fontSize:9,padding:"3px 6px",background:tradePartner===t?"#a855f7":"#fff",color:tradePartner===t?"#fff":"#737373",border:"1px solid "+(tradePartner===t?"#a855f7":"#e5e5e5"),borderRadius:5,cursor:"pointer"}}><NFLTeamLogo team={t} size={10}/></button>))}
          </div>
          {tradePartner&&<>
            <div style={{marginBottom:6,padding:"6px 8px",background:"rgba(168,85,247,0.04)",borderRadius:6,border:"1px solid rgba(168,85,247,0.12)"}}>
              <div style={{fontFamily:mono,fontSize:8,color:"#a855f7",letterSpacing:1,marginBottom:4,fontWeight:700}}>YOU GET:</div>
              {[{year:2026,label:"this draft",picks:partnerAssets.thisDraft},{year:2027,label:"2027",picks:partnerAssets.futurePicks.filter(p=>p.year===2027)},{year:2028,label:"2028",picks:partnerAssets.futurePicks.filter(p=>p.year===2028)}].map(yr=>yr.picks.length>0&&<div key={yr.year} style={{marginBottom:3}}>
                <div style={{fontFamily:mono,fontSize:7,color:"#d4d4d4",marginBottom:2}}>{yr.label}</div>
                <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
                  {yr.picks.map((p,i)=>{const uid=p.type+"-"+p.label;const sel=tradeTarget.some(x=>(x.type+"-"+x.label)===uid);return<button key={uid+i} onClick={()=>{setTradeTarget(prev=>{const already=prev.some(x=>(x.type+"-"+x.label)===uid);return already?prev.filter(x=>(x.type+"-"+x.label)!==uid):[...prev,p];});}} style={{fontFamily:sans,fontSize:9,padding:"3px 6px",background:sel?"#a855f7":"#fff",color:sel?"#fff":"#525252",border:"1px solid "+(sel?"#a855f7":"#e5e5e5"),borderRadius:4,cursor:"pointer"}}>{p.type==="current"?p.label:`Rd${p.round}`} <span style={{fontSize:7,color:sel?"#e9d5ff":"#a3a3a3"}}>{p.value}</span></button>;})}
                </div>
              </div>)}
              {partnerPlayers.length>0&&<div style={{marginTop:3}}>
                {!showGetPlayers?<button onClick={()=>setShowGetPlayers(true)} style={{fontFamily:mono,fontSize:7,color:"#a855f7",background:"transparent",border:"1px solid rgba(168,85,247,0.2)",borderRadius:3,padding:"1px 6px",cursor:"pointer"}}>+ players ({partnerPlayers.length})</button>
                :<div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{partnerPlayers.map(p=>{const sel=tradePlayerTarget.some(x=>x.name===p.name);const tc=TIER_COLORS[p.performanceTier]||"#a3a3a3";return<button key={p.name} onClick={()=>{setTradePlayerTarget(prev=>prev.some(x=>x.name===p.name)?prev.filter(x=>x.name!==p.name):[...prev,p]);}} style={{fontFamily:sans,fontSize:8,padding:"2px 6px",background:sel?"#a855f7":"#fff",color:sel?"#fff":"#525252",border:"1px solid "+(sel?"#a855f7":"#e5e5e5"),borderRadius:4,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:2}}><span style={{width:4,height:4,borderRadius:2,background:sel?"#fff":tc}}/>{shortName(p.name)} <span style={{fontSize:6,color:sel?"#e9d5ff":"#a3a3a3"}}>{p.tradeValue.valuePoints}</span></button>;})}</div>}
              </div>}
            </div>
            <div style={{marginBottom:6,padding:"6px 8px",background:"rgba(23,23,23,0.03)",borderRadius:6,border:"1px solid #e5e5e5"}}>
              <div style={{fontFamily:mono,fontSize:8,color:"#525252",letterSpacing:1,marginBottom:4,fontWeight:700}}>YOU GIVE:</div>
              {[{year:2026,label:"this draft",picks:userAllPicks.thisDraft},{year:2027,label:"2027",picks:userAllPicks.futurePicks.filter(p=>p.year===2027)},{year:2028,label:"2028",picks:userAllPicks.futurePicks.filter(p=>p.year===2028)}].map(yr=>yr.picks.length>0&&<div key={yr.year} style={{marginBottom:3}}>
                <div style={{fontFamily:mono,fontSize:7,color:"#d4d4d4",marginBottom:2}}>{yr.label}</div>
                <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
                  {yr.picks.map((p,i)=>{const uid=p.type+"-"+p.label;const sel=tradeUserPicks.some(x=>(x.type+"-"+x.label)===uid);return<button key={uid+i} onClick={()=>{setTradeUserPicks(prev=>{const already=prev.some(x=>(x.type+"-"+x.label)===uid);return already?prev.filter(x=>(x.type+"-"+x.label)!==uid):[...prev,p];});}} style={{fontFamily:sans,fontSize:9,padding:"3px 6px",background:sel?"#171717":"#fff",color:sel?"#faf9f6":"#525252",border:"1px solid #e5e5e5",borderRadius:4,cursor:"pointer"}}>{p.type==="current"?p.label:`Rd${p.round}`} <span style={{fontSize:7,color:sel?"#a3a3a3":"#d4d4d4"}}>{p.value}</span></button>;})}
                </div>
              </div>)}
              {userPlayers.length>0&&<div style={{marginTop:3}}>
                {!showGivePlayers?<button onClick={()=>setShowGivePlayers(true)} style={{fontFamily:mono,fontSize:7,color:"#525252",background:"transparent",border:"1px solid #e5e5e5",borderRadius:3,padding:"1px 6px",cursor:"pointer"}}>+ players ({userPlayers.length})</button>
                :<div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{userPlayers.map(p=>{const sel=tradeUserPlayers.some(x=>x.name===p.name);const tc=TIER_COLORS[p.performanceTier]||"#a3a3a3";return<button key={p.name} onClick={()=>{setTradeUserPlayers(prev=>prev.some(x=>x.name===p.name)?prev.filter(x=>x.name!==p.name):[...prev,p]);}} style={{fontFamily:sans,fontSize:8,padding:"2px 6px",background:sel?"#171717":"#fff",color:sel?"#faf9f6":"#525252",border:"1px solid #e5e5e5",borderRadius:4,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:2}}><span style={{width:4,height:4,borderRadius:2,background:sel?"#fff":tc}}/>{shortName(p.name)} <span style={{fontSize:6,color:sel?"#a3a3a3":"#d4d4d4"}}>{p.tradeValue.valuePoints}</span></button>;})}</div>}
              </div>}
            </div>
            {(()=>{const tv=tradeTarget.reduce((s,p)=>s+(p.value||0),0)+tradePlayerTarget.reduce((s,p)=>s+(p.tradeValue?.valuePoints||0),0);const ov=tradeUserPicks.reduce((s,p)=>s+(p.value||0),0)+tradeUserPlayers.reduce((s,p)=>s+(p.tradeValue?.valuePoints||0),0);if(tv===0&&ov===0)return null;const enough=tv>0&&ov>0&&ov>=tv*1.05;return<div><div style={{display:"flex",justifyContent:"space-between",fontFamily:mono,fontSize:7,color:"#a3a3a3",marginBottom:2}}><span>get: {tv}pts</span><span>give: {ov}pts</span></div><div style={{height:4,background:"#e5e5e5",borderRadius:2,overflow:"hidden",marginBottom:4}}><div style={{height:"100%",width:tv>0?Math.min(100,ov/(tv*1.05)*100)+"%":"0%",background:enough?"#22c55e":"#ef4444",borderRadius:2}}/></div><button onClick={executeTradeUp} disabled={!enough} style={{fontFamily:sans,fontSize:11,fontWeight:700,padding:"5px 14px",background:enough?"#a855f7":"#d4d4d4",color:"#fff",border:"none",borderRadius:99,cursor:enough?"pointer":"default"}}>execute</button></div>;})()}
          </>}
        </div>}

        {/* Available players — main scrollable area */}
        <div style={{flex:1,overflowY:"auto",padding:"0 8px"}}>
          <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,overflow:"hidden"}}>
            <div style={{padding:"6px 10px",background:"#f9f9f7",borderBottom:"1px solid #e5e5e5",display:"flex",justifyContent:"space-between"}}>
              <span style={{fontFamily:mono,fontSize:8,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase"}}>available ({displayAvailable.length})</span>
            </div>
            {scoutTeam&&<div style={{padding:"4px 10px",background:"rgba(99,102,241,0.04)",borderBottom:"1px solid rgba(99,102,241,0.1)",display:"flex",alignItems:"center",gap:6}}>
              <NFLTeamLogo team={scoutTeam} size={14}/>
              <span style={{fontFamily:mono,fontSize:8,letterSpacing:1,color:"#6366f1",textTransform:"uppercase"}}>scout vision — {scoutTeam}</span>
            </div>}
            {displayAvailable.length===0&&traitFilter.size>0&&<div style={{padding:"16px",textAlign:"center",fontFamily:sans,fontSize:12,color:"#a3a3a3",fontStyle:"italic"}}>no available prospects meet this threshold</div>}
            {displayAvailable.slice(0,60).map(id=>{const p=prospectsMap[id];if(!p)return null;const g=activeGrade(id);const c=POS_COLORS[p.pos];const rank=boardRankMap[id];const tags=playerTags[id]||[];
              const svFit=scoutTeam&&schemeFits?.[scoutTeam]?.[id];const svScore=svFit?.score||0;const svReason=scoutData?.get(id);
              const svBg=scoutTeam?(svScore>=75?"rgba(99,102,241,0.04)":svScore>=60?"rgba(99,102,241,0.02)":svScore>0&&svScore<45?"rgba(220,38,38,0.03)":"transparent"):"transparent";
              const rowBg=scoutTeam?svBg:(tags.length>0&&isUserPick?"rgba(240,249,255,0.5)":"transparent");
              return<div key={id}>
                <div style={{display:"flex",alignItems:"center",gap:5,padding:"8px 10px",borderBottom:expandedScoutId===id?"none":"1px solid #f8f8f8",background:rowBg}}>
                {rank&&!scoutTeam?<span style={{fontFamily:mono,fontSize:8,color:"#d4d4d4",width:20,textAlign:"right"}}>#{rank}</span>:<span style={{fontFamily:mono,fontSize:8,color:"#e5e5e5",width:20,textAlign:"right"}}>—</span>}
                <span style={{fontFamily:mono,fontSize:9,color:c,width:32}}>{p.gpos||p.pos}</span>
                <SchoolLogo school={p.school} size={18}/>
                <span style={{fontFamily:sans,fontSize:12,fontWeight:600,color:"#171717",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} onClick={()=>setProfilePlayer(p)}>{p.name}</span>
                {scoutTeam&&!isUserPick&&svScore>0&&<span onClick={()=>setExpandedScoutId(prev=>prev===id?null:id)} style={{fontFamily:mono,fontSize:9,fontWeight:700,color:"#fff",background:"linear-gradient(135deg,#6366f1,#a855f7)",padding:"2px 6px",borderRadius:4,cursor:"pointer",flexShrink:0,display:"inline-flex",alignItems:"center",gap:2}}>{svScore}<span style={{fontSize:7,opacity:0.8}}>{expandedScoutId===id?"−":"+"}</span></span>}
                {isUserPick&&tags.map(t=><span key={t.tag} style={{fontFamily:mono,fontSize:7,fontWeight:700,color:t.color,background:t.bg,padding:"2px 5px",borderRadius:3,flexShrink:0,letterSpacing:0.5}}>{t.tag}</span>)}
                {!scoutTeam&&(()=>{
                  const MAX_PILLS=5;const pills=[];
                  if(archetypeFilter.size>0){const tags=prospectTagsMap[id]||[];[...archetypeFilter].forEach(t=>{if(tags.includes(t)&&pills.length<MAX_PILLS)pills.push({key:"arch-"+t,emoji:ARCHETYPE_EMOJI[t]||"",label:ARCHETYPE_DISPLAY[t]||t,type:"arch"});});}
                  if(traitFilter.size>0&&measMode){[...traitFilter].forEach(t=>{if(pills.length<MAX_PILLS&&qualifiesForMeasurableFilter&&qualifiesForMeasurableFilter(id,(p.gpos||p.pos)==="IDL"?"DL":(p.gpos||p.pos),t))pills.push({key:"meas-"+t,emoji:(MEASURABLE_EMOJI||{})[t]||"",label:t,type:"meas"});});}
                  const traitBadges=prospectBadges&&prospectBadges[id]||[];
                  traitBadges.forEach(b=>{if(pills.length<MAX_PILLS)pills.push({key:"trait-"+b.trait,emoji:b.emoji,label:b.trait+" "+b.score,type:"trait"});});
                  if(!pills.length)return null;
                  return pills.map(pl=><span key={pl.key} title={pl.label} style={{fontFamily:mono,fontSize:7,fontWeight:700,color:pl.type==="arch"?"#171717":pl.type==="meas"?"#0d9488":c,background:pl.type==="arch"?"#17171712":pl.type==="meas"?"#0d948812":c+"0d",padding:"2px 4px",borderRadius:3,flexShrink:0}}>{pl.emoji}</span>);
                })()}
                {renderGradeOrPill(p)}
                {isUserPick&&!scoutTeam&&<button onClick={()=>makePick(id)} style={{fontFamily:sans,fontSize:10,fontWeight:700,padding:"4px 10px",background:"#22c55e",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",flexShrink:0}}>draft</button>}
                {isUserPick&&scoutTeam&&svScore>0&&<span onClick={()=>setExpandedScoutId(prev=>prev===id?null:id)} style={{fontFamily:mono,fontSize:10,fontWeight:700,color:"#fff",background:"linear-gradient(135deg,#6366f1,#a855f7)",padding:"4px 10px",borderRadius:6,cursor:"pointer",flexShrink:0,display:"inline-flex",alignItems:"center",gap:3,minWidth:42,justifyContent:"center"}}>{svScore}<span style={{fontSize:8,opacity:0.85,fontWeight:400}}>{expandedScoutId===id?"−":"+"}</span></span>}
                {isUserPick&&scoutTeam&&!svScore&&<button onClick={()=>makePick(id)} style={{fontFamily:sans,fontSize:10,fontWeight:700,padding:"4px 10px",background:"#22c55e",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",flexShrink:0}}>draft</button>}
              </div>
              {expandedScoutId===id&&svReason&&<div style={{marginLeft:12,padding:"10px 12px 12px 14px",background:"rgba(99,102,241,0.05)",borderLeft:"3px solid #6366f1",borderBottom:"1px solid rgba(99,102,241,0.12)",borderRadius:"0 0 8px 0"}}>
                <div style={{fontFamily:sans,fontSize:11,fontWeight:700,color:"#4f46e5",marginBottom:4}}>{svReason.headline}</div>
                <div style={{fontFamily:mono,fontSize:9,color:"#6366f1",marginBottom:4,opacity:0.8}}>{svReason.roleLabel}</div>
                <div style={{fontFamily:sans,fontSize:11,color:"#404040",lineHeight:1.5,marginBottom:8}}>{svReason.whyItFits}</div>
                {svReason.prospectStrengths&&<div style={{fontFamily:mono,fontSize:9,color:"#737373",marginBottom:6}}>key traits: {svReason.prospectStrengths}</div>}
                {svReason.relevantInflection&&<div style={{fontFamily:sans,fontSize:10,color:"#4f46e5",fontStyle:"italic",lineHeight:1.4,padding:"6px 8px",background:"rgba(99,102,241,0.06)",borderRadius:6,borderLeft:"2px solid rgba(99,102,241,0.4)",marginBottom:8}}>{svReason.relevantInflection.length>200?svReason.relevantInflection.slice(0,200)+"…":svReason.relevantInflection}</div>}
                {isUserPick&&<button onClick={()=>makePick(id)} style={{fontFamily:sans,fontSize:10,fontWeight:700,padding:"5px 16px",background:"#22c55e",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",marginTop:2}}>draft {p.name.split(" ").pop()}</button>}
              </div>}
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
              {needEntries.map(([pos])=>(<span key={pos} style={{fontFamily:mono,fontSize:8,padding:"2px 6px",borderRadius:4,background:"rgba(239,68,68,0.06)",color:"#dc2626",border:"1px solid rgba(239,68,68,0.12)"}}>{pos}</span>))}
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
              <FormationChart team={depthSheetTeam} depthChart={depthChart} mono={mono} sans={sans}/>
              <div style={{marginTop:12,background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"10px 12px"}}>
                <div style={{fontFamily:mono,fontSize:8,letterSpacing:1.5,color:"#a3a3a3",textTransform:"uppercase",marginBottom:6}}>depth chart</div>
                <DepthList team={depthSheetTeam} depthChart={depthChart} mono={mono} sans={sans}/>
              </div>
              <div style={{marginTop:10}}>
                <LiveNeeds team={depthSheetTeam} liveNeeds={liveNeeds} userTeams={userTeams} mono={mono}/>
              </div>
            </div>
          </div>
        </div>}

        {/* Profile overlay */}
        {profilePlayer&&<PlayerProfile player={profilePlayer} traits={traits} setTraits={setTraits} notes={notes} setNotes={setNotes} allProspects={allProspects} getGrade={getGrade} onClose={()=>setProfilePlayer(null)} onSelectPlayer={setProfilePlayer} consensus={CONSENSUS} ratings={ratings} isGuest={isGuest} onRequireAuth={onRequireAuth} schemeFits={schemeFits}/>}
        {/* Compare overlay */}
        {showCompare&&compareList.length>=2&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setShowCompare(false)}>
          <div style={{background:"#faf9f6",borderRadius:16,padding:16,width:"95%",maxHeight:"80vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <h2 style={{fontFamily:font,fontSize:18,fontWeight:900,color:"#171717",margin:0}}>compare</h2>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                {getMeasRadarData&&compareList.every(p=>getMeasRadarData(p.name,p.school)!=null)&&<button title={compareMeasMode?"Switch to traits":"Switch to measurables"} onClick={()=>setCompareMeasMode(v=>!v)} style={{width:40,height:22,borderRadius:11,border:"none",background:compareMeasMode?"linear-gradient(135deg,#00ffff,#1e3a5f)":"linear-gradient(135deg,#ec4899,#a855f7)",cursor:"pointer",position:"relative",transition:"background 0.2s"}}><div style={{width:16,height:16,borderRadius:8,background:"#fff",position:"absolute",top:3,left:compareMeasMode?21:3,transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontFamily:mono,fontSize:8,fontWeight:700,color:compareMeasMode?"#00ffff":"#a855f7",lineHeight:1}}>{compareMeasMode?"M":"T"}</span></div></button>}
                <button onClick={()=>setShowCompare(false)} style={{fontFamily:sans,fontSize:11,color:"#a3a3a3",background:"none",border:"1px solid #e5e5e5",borderRadius:99,padding:"4px 10px",cursor:"pointer"}}>close</button>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr",gap:12}}>
              {compareList.map(p=>{const c=POS_COLORS[p.gpos||p.pos]||POS_COLORS[p.pos];const pt=POSITION_TRAITS[p.gpos||p.pos]||POSITION_TRAITS[p.pos]||[];const g=activeGrade(p.id);
                const md=getMeasRadarData?getMeasRadarData(p.name,p.school):null;
                const activeLabels=compareMeasMode&&md?md.labels:pt;
                const activeValues=compareMeasMode&&md?md.values:pt.map(t=>tvFn(p.id,t));
                const itemMaxMin={};
                activeLabels.forEach((label,li)=>{
                  const vals=compareList.map(cp=>{if(compareMeasMode&&getMeasRadarData){const cpMd=getMeasRadarData(cp.name,cp.school);if(!cpMd)return null;const idx=cpMd.labels.indexOf(label);return idx>=0?cpMd.values[idx]:null;}return tvFn(cp.id,label);}).filter(v=>v!=null);
                  itemMaxMin[label]={max:vals.length?Math.max(...vals):activeValues[li],min:vals.length?Math.min(...vals):activeValues[li]};
                });
                return<div key={p.id} style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:12,textAlign:"center"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,textAlign:"left"}}>
                    <SchoolLogo school={p.school} size={32}/>
                    <div style={{flex:1}}><div style={{fontFamily:font,fontSize:14,fontWeight:900,color:"#171717"}}>{p.name}</div><div style={{fontFamily:mono,fontSize:9,color:c}}>{p.gpos||p.pos} · {p.school}</div></div>
                    <div style={{fontFamily:font,fontSize:20,fontWeight:900,color:g>=75?"#16a34a":g>=55?"#ca8a04":"#dc2626"}}>{g}</div>
                  </div>
                  <RadarChart traits={activeLabels} values={activeValues} color={c} size={140} proDaySpokes={compareMeasMode&&md?md.proDaySpokes:undefined}/>
                  <div style={{textAlign:"left",marginTop:4,background:"#fafaf9",borderRadius:8,padding:"6px 8px"}}>
                    {activeLabels.map((label,li)=>{
                      const val=activeValues[li];
                      const{max,min}=itemMaxMin[label]||{max:val,min:val};
                      const isBest=compareList.length>1&&val===max&&max!==min;
                      const isWorst=compareList.length>1&&val===min&&max!==min;
                      return<div key={label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"2px 0",borderBottom:"1px solid #f0f0ee"}}>
                        <span style={{fontFamily:mono,fontSize:9,color:"#a3a3a3"}}>{label}</span>
                        <div style={{display:"flex",alignItems:"center",gap:4}}>
                          <div style={{width:36,height:4,background:"#e5e5e5",borderRadius:2,overflow:"hidden"}}>
                            <div style={{height:"100%",width:(val)+'%',background:isBest?"#22c55e":isWorst?"#ef4444":c+"88",borderRadius:2}}/>
                          </div>
                          <span style={{fontFamily:font,fontSize:11,fontWeight:900,color:isBest?"#16a34a":isWorst?"#dc2626":c,minWidth:18,textAlign:"right"}}>{val}</span>
                          {isBest&&<span style={{fontSize:8}}>▲</span>}
                          {isWorst&&<span style={{fontSize:8,color:"#dc2626"}}>▼</span>}
                        </div>
                      </div>;
                    })}
                  </div>
                  {isUserPick&&<button onClick={()=>{makePick(p.id);setShowCompare(false);setCompareList([]);}} style={{width:"100%",marginTop:8,fontFamily:sans,fontSize:10,fontWeight:700,padding:"6px",background:"#22c55e",color:"#fff",border:"none",borderRadius:6,cursor:"pointer"}}>draft {shortName(p.name)}</button>}
                </div>;
              })}
            </div>
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
            if(avgDelta<-10)pills.push({emoji:"📈",text:"value hunter",detail:`avg ${Math.round(Math.abs(avgDelta))} picks late`,color:"#16a34a"});
            else if(avgDelta>5)pills.push({emoji:"🎲",text:"reach drafter",detail:`avg ${Math.round(avgDelta)} picks early`,color:"#dc2626"});
            else pills.push({emoji:"⚖️",text:"consensus aligned",detail:`±${Math.round(Math.abs(avgDelta))}`,color:"#525252"});
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
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <h2 style={{fontFamily:font,fontSize:24,fontWeight:900,color:"#171717",margin:0,letterSpacing:-0.5}}>👀 my guys</h2>
                {onShareMyGuys&&(myGuys||[]).length>0&&<button onClick={onShareMyGuys} style={{fontFamily:sans,fontSize:12,fontWeight:parentCopiedShare==="my-guys"?400:700,padding:"6px 14px",background:"transparent",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",display:"inline-flex",alignItems:"center",flexShrink:0}}>{parentCopiedShare==="my-guys"?<span style={{color:"#a3a3a3"}}>copied</span>:<span className="shimmer-text">share my guys</span>}</button>}
              </div>
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
      <style>{`.trait-pills-scroll::-webkit-scrollbar{display:none;}
@keyframes svFadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
@keyframes svFadeOut{from{opacity:1}to{opacity:0}}`}</style>
      {/* Top bar */}
      <div style={{position:"fixed",top:0,left:0,right:0,zIndex:100,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 16px",background:"#fff",borderBottom:"1px solid #f0f0f0"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontFamily:mono,fontSize:10,color:"#a3a3a3"}}>round {currentRound} · pick {Math.min(picks.length+1,totalPicks)}/{totalPicks}</span>
          {isUserPick&&<span style={{fontFamily:sans,fontSize:10,fontWeight:700,color:"#22c55e"}}>YOUR PICK</span>}
          {tradeValueDelta!==0&&<span style={{fontFamily:mono,fontSize:9,padding:"2px 8px",borderRadius:99,background:tradeValueDelta>0?"rgba(34,197,94,0.1)":"rgba(239,68,68,0.1)",color:tradeValueDelta>0?"#16a34a":"#dc2626",border:"1px solid "+(tradeValueDelta>0?"rgba(34,197,94,0.3)":"rgba(239,68,68,0.3)")}}>trades: {tradeValueDelta>0?"+":""}{tradeValueDelta} pts</span>}
        </div>
        <div style={{display:"flex",gap:6}}>
          {userPickCount>0&&<button onClick={undo} style={{fontFamily:sans,fontSize:10,padding:"3px 10px",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",background:"#fef3c7",color:"#92400e"}}>↩ undo</button>}

          <button onClick={toggleTradeUp} style={{fontFamily:sans,fontSize:10,padding:"3px 10px",border:"1px solid #a855f7",borderRadius:99,cursor:"pointer",background:showTradeUp?"#a855f7":"rgba(168,85,247,0.03)",color:showTradeUp?"#fff":"#a855f7"}}>📞 trade</button>
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
        {/* LEFT: Pick history + upcoming */}
        {!isMobile&&<div style={{width:280,flexShrink:0,maxHeight:"calc(100vh - 60px)",overflowY:"auto",position:"sticky",top:44}}>{picksPanel}</div>}

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
                  <button key={t} onClick={()=>{setTradePartner(t);setTradeTarget([]);setTradeUserPicks([]);setTradePlayerTarget([]);setTradeUserPlayers([]);setShowGetPlayers(false);setShowGivePlayers(false);}} style={{fontFamily:sans,fontSize:9,padding:"3px 8px",background:tradePartner===t?"#a855f7":"#fff",color:tradePartner===t?"#fff":"#737373",border:"1px solid "+(tradePartner===t?"#a855f7":"#e5e5e5"),borderRadius:5,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:3}}>
                    <NFLTeamLogo team={t} size={11}/>{t}
                  </button>
                ))}
              </div>
            </div>
            {/* YOU GET — picks + players together */}
            {tradePartner&&<div style={{marginBottom:8,padding:"8px 10px",background:"rgba(168,85,247,0.04)",borderRadius:8,border:"1px solid rgba(168,85,247,0.12)"}}>
              <div style={{fontFamily:mono,fontSize:8,color:"#a855f7",letterSpacing:1,marginBottom:6,fontWeight:700}}>YOU GET:</div>
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
              {partnerPlayers.length>0&&<div style={{marginTop:4}}>
                {!showGetPlayers?<button onClick={()=>setShowGetPlayers(true)} style={{fontFamily:mono,fontSize:8,color:"#a855f7",background:"transparent",border:"1px solid rgba(168,85,247,0.2)",borderRadius:4,padding:"2px 8px",cursor:"pointer"}}>+ players ({partnerPlayers.length})</button>
                :<>{tradePlayerTarget.length>0&&<button onClick={()=>setShowGetPlayers(false)} style={{fontFamily:mono,fontSize:7,color:"#a3a3a3",background:"transparent",border:"none",padding:0,cursor:"pointer",marginBottom:3}}>hide players</button>}<div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
                  {!showGetPlayers?null:partnerPlayers.map(p=>{const sel=tradePlayerTarget.some(x=>x.name===p.name);const tc=TIER_COLORS[p.performanceTier]||"#a3a3a3";return<button key={p.name} onClick={()=>{setTradePlayerTarget(prev=>prev.some(x=>x.name===p.name)?prev.filter(x=>x.name!==p.name):[...prev,p]);}} style={{fontFamily:sans,fontSize:9,padding:"3px 8px",background:sel?"#a855f7":"#fff",color:sel?"#fff":"#525252",border:"1px solid "+(sel?"#a855f7":"#e5e5e5"),borderRadius:5,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:3}}><span style={{width:5,height:5,borderRadius:3,background:sel?"#fff":tc,flexShrink:0}}/>{p.name} <span style={{fontSize:7,color:sel?"#e9d5ff":"#a3a3a3"}}>{p.position} {p.tradeValue.valuePoints}pts</span></button>;})}
                </div></>}
              </div>}
            </div>}
            {/* YOU GIVE — picks + players together */}
            {tradePartner&&<div style={{marginBottom:8,padding:"8px 10px",background:"rgba(23,23,23,0.03)",borderRadius:8,border:"1px solid #e5e5e5"}}>
              <div style={{fontFamily:mono,fontSize:8,color:"#525252",letterSpacing:1,marginBottom:6,fontWeight:700}}>YOU GIVE:</div>
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
              {userPlayers.length>0&&<div style={{marginTop:4}}>
                {!showGivePlayers?<button onClick={()=>setShowGivePlayers(true)} style={{fontFamily:mono,fontSize:8,color:"#525252",background:"transparent",border:"1px solid #e5e5e5",borderRadius:4,padding:"2px 8px",cursor:"pointer"}}>+ players ({userPlayers.length})</button>
                :<>{tradeUserPlayers.length>0&&<button onClick={()=>setShowGivePlayers(false)} style={{fontFamily:mono,fontSize:7,color:"#a3a3a3",background:"transparent",border:"none",padding:0,cursor:"pointer",marginBottom:3}}>hide players</button>}<div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
                  {!showGivePlayers?null:userPlayers.map(p=>{const sel=tradeUserPlayers.some(x=>x.name===p.name);const tc=TIER_COLORS[p.performanceTier]||"#a3a3a3";return<button key={p.name} onClick={()=>{setTradeUserPlayers(prev=>prev.some(x=>x.name===p.name)?prev.filter(x=>x.name!==p.name):[...prev,p]);}} style={{fontFamily:sans,fontSize:9,padding:"3px 8px",background:sel?"#171717":"#fff",color:sel?"#faf9f6":"#525252",border:"1px solid #e5e5e5",borderRadius:5,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:3}}><span style={{width:5,height:5,borderRadius:3,background:sel?"#fff":tc,flexShrink:0}}/>{p.name} <span style={{fontSize:7,color:sel?"#a3a3a3":"#d4d4d4"}}>{p.position} {p.tradeValue.valuePoints}pts</span></button>;})}
                </div></>}
              </div>}
            </div>}
            {/* Value bar + execute */}
            {(tradeTarget.length>0||tradePlayerTarget.length>0||tradeUserPicks.length>0||tradeUserPlayers.length>0)&&(()=>{
              const tv=tradeTarget.reduce((s,p)=>s+(p.value||0),0)+tradePlayerTarget.reduce((s,p)=>s+(p.tradeValue?.valuePoints||0),0);
              const ov=tradeUserPicks.reduce((s,p)=>s+(p.value||0),0)+tradeUserPlayers.reduce((s,p)=>s+(p.tradeValue?.valuePoints||0),0);
              if(tv===0&&ov===0)return null;
              const enough=tv>0&&ov>0&&ov>=tv*1.05;
              return(<div style={{marginTop:6}}>
                <div style={{display:"flex",justifyContent:"space-between",fontFamily:mono,fontSize:8,color:"#a3a3a3",marginBottom:2}}>
                  <span>you get: {tv} pts</span><span>you give: {ov} pts</span>
                </div>
                <div style={{height:6,background:"#e5e5e5",borderRadius:3,overflow:"hidden"}}>
                  <div style={{height:"100%",width:tv>0?Math.min(100,ov/(tv*1.05)*100)+"%":"0%",background:enough?"#22c55e":"#ef4444",borderRadius:3}}/>
                </div>
                <div style={{fontFamily:mono,fontSize:8,color:enough?"#16a34a":"#dc2626",marginTop:1}}>{tv===0||ov===0?"SELECT ASSETS ON BOTH SIDES":enough?"OFFER SUFFICIENT — CPU will accept":"NEED MORE (~5% OVERPAY REQUIRED)"}</div>
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
                  {(()=>{const bn=TEAM_NEEDS_COUNTS?.[currentTeam]||{};const ln=liveNeeds[currentTeam]||{};const broad=new Set(["DB","DL","OL"]);const remaining=Object.entries(ln).filter(([pos,v])=>v>0&&!broad.has(pos)&&(bn[pos]||0)>=2);const filled=Object.entries(bn).filter(([pos,v])=>v>=2&&!broad.has(pos)&&(!ln[pos]||ln[pos]<=0));return[...remaining.map(([pos])=>(
                    <span key={pos} style={{fontFamily:mono,fontSize:8,padding:"1px 5px",borderRadius:3,background:"rgba(239,68,68,0.08)",color:"#dc2626",border:"1px solid rgba(239,68,68,0.15)"}}>{pos}</span>)),...filled.map(([pos])=>(
                    <span key={pos} style={{fontFamily:mono,fontSize:8,padding:"1px 5px",borderRadius:3,background:"rgba(34,197,94,0.08)",color:"#16a34a",border:"1px solid rgba(34,197,94,0.15)"}}>{pos} ✓</span>))];})()}
                </div>
              </div>
            </div>
          </div>}

          {/* Position filter + scout vision toggle */}
          <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:6,alignItems:"center"}}>
            {<div style={{position:"relative",flexShrink:0,marginRight:4}}>
              <button onClick={()=>{setScoutVision(v=>!v);setExpandedScoutId(null);setSvTooltip(false);localStorage.setItem("bbl_sv_seen_2","1");}} title={scoutVision?"Disable Scout Vision":"Enable Scout Vision"} style={{width:40,height:22,borderRadius:11,border:"none",background:scoutVision?"linear-gradient(135deg,#4f46e5,#7c3aed,#a855f7)":"linear-gradient(135deg,#c4b5fd,#a3a3a3)",cursor:"pointer",position:"relative",transition:"background 0.2s"}}><div style={{width:16,height:16,borderRadius:8,background:"#fff",position:"absolute",top:3,left:scoutVision?21:3,transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontFamily:mono,fontSize:8,fontWeight:700,color:scoutVision?"#6366f1":"#a3a3a3",lineHeight:1}}>SV</span></div></button>
              {svTooltip&&<div style={{position:"absolute",top:-36,left:0,background:"#171717",color:"#fff",fontFamily:sans,fontSize:9,padding:"6px 10px",borderRadius:8,whiteSpace:"nowrap",pointerEvents:"none",animation:"svFadeIn 0.3s ease, svFadeOut 0.5s ease 5.5s forwards",zIndex:10,lineHeight:1.3,boxShadow:"0 4px 12px rgba(0,0,0,0.2)"}}><span style={{fontWeight:700}}>Scout Vision</span> — sort by scheme fit<div style={{position:"absolute",bottom:-4,left:16,width:0,height:0,borderLeft:"5px solid transparent",borderRight:"5px solid transparent",borderTop:"5px solid #171717"}}/></div>}
            </div>}
            <button onClick={()=>setFilterPos(new Set())} style={{fontFamily:mono,fontSize:10,padding:"4px 10px",background:filterPos.size===0?"#171717":"transparent",color:filterPos.size===0?"#faf9f6":"#a3a3a3",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer"}}>all</button>
            {positions.map(pos=><button key={pos} onClick={()=>setFilterPos(prev=>{const n=new Set(prev);if(n.has(pos))n.delete(pos);else n.add(pos);return n;})} style={{fontFamily:mono,fontSize:10,padding:"4px 10px",background:filterPos.has(pos)?granularPosColor(pos):"transparent",color:filterPos.has(pos)?"#fff":granularPosColor(pos),border:"1px solid "+(filterPos.has(pos)?granularPosColor(pos):"#e5e5e5"),borderRadius:99,cursor:"pointer"}}>{pos}</button>)}
          </div>
          {filterPos.size===1&&(()=>{const rawPos=[...filterPos][0];const pos=rawPos==="IDL"?"DL":rawPos;const posTraits=(POSITION_TRAITS||{})[pos]||[];if(!posTraits.length)return null;const c=(POS_COLORS||{})[pos]||(POS_COLORS||{})[rawPos]||"#525252";const measPills=(MEASURABLE_LIST||[]).filter(m=>measurableThresholds&&measurableThresholds[pos]?.[m]);const posAvail=available.filter(id=>{const p=prospectsMap[id];return p&&posFilterMatch(p,rawPos);});const archTagCounts={};posAvail.forEach(id=>{(prospectTagsMap[id]||[]).forEach(t=>{archTagCounts[t]=(archTagCounts[t]||0)+1;});});const archTags=Object.entries(archTagCounts).sort((a,b)=>b[1]-a[1]).map(([t])=>t);const archButtons=archTags.map(tag=>{const active=archetypeFilter.has(tag);const count=archTagCounts[tag];return<button key={"arch-"+tag} onClick={()=>setArchetypeFilter(prev=>{const n=new Set(prev);n.has(tag)?n.delete(tag):n.add(tag);return n;})} style={{fontFamily:mono,fontSize:9,padding:"3px 8px",background:active?"#171717":"transparent",color:active?"#faf9f6":"#525252",border:"1px solid "+(active?"#171717":"#d4d4d4"),borderRadius:99,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",gap:3,whiteSpace:"nowrap"}}><span>{ARCHETYPE_EMOJI[tag]||""}</span><span>{ARCHETYPE_DISPLAY[tag]||tag}</span><span style={{fontSize:8,opacity:0.7}}>({count})</span></button>;});return<div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}><button title={measMode?"Measurables mode — click for Traits":"Traits mode — click for Measurables"} onClick={()=>{setMeasMode(v=>!v);setTraitFilter(new Set());}} style={{width:40,height:22,borderRadius:11,border:"none",background:measMode?"linear-gradient(135deg,#00ffff,#1e3a5f)":"linear-gradient(135deg,#ec4899,#a855f7)",cursor:"pointer",position:"relative",transition:"background 0.2s",flexShrink:0}}><div style={{width:16,height:16,borderRadius:8,background:"#fff",position:"absolute",top:3,left:measMode?21:3,transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontFamily:mono,fontSize:8,fontWeight:700,color:measMode?"#00ffff":"#a855f7",lineHeight:1}}>{measMode?"M":"T"}</span></div></button><div className="trait-pills-scroll" style={{display:"flex",gap:4,overflowX:"auto",WebkitOverflowScrolling:"touch",flexWrap:"nowrap",scrollbarWidth:"none",alignItems:"center",flex:1,minWidth:0}}>{!measMode?posTraits.map(trait=>{const active=traitFilter.has(trait);const count=posAvail.filter(id=>qualifiesForFilter&&qualifiesForFilter(id,pos,trait)).length;return<button key={trait} onClick={()=>setTraitFilter(prev=>{const n=new Set(prev);n.has(trait)?n.delete(trait):n.add(trait);return n;})} style={{fontFamily:mono,fontSize:9,padding:"3px 8px",background:active?c+"18":"transparent",color:active?"#171717":"#525252",border:"1px solid "+(active?c+"44":c+"25"),borderRadius:99,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",gap:3,whiteSpace:"nowrap"}}><span>{(TRAIT_EMOJI||{})[trait]}</span><span>{TRAIT_SHORT[trait]||trait}</span><span style={{fontSize:8,opacity:0.7}}>({count})</span></button>;}):(()=>{const groups=(MEAS_GROUPS||[]).map(g=>({...g,pills:g.keys.filter(m=>measPills.includes(m))})).filter(g=>g.pills.length>0);return groups.flatMap((g,gi)=>{const divider=gi>0?[<span key={"d"+gi} style={{color:"#d4d4d4",fontSize:10,flexShrink:0,padding:"0 1px",lineHeight:1}}>·</span>]:[];return[...divider,...g.pills.map(m=>{const active=traitFilter.has(m);const count=posAvail.filter(id=>qualifiesForMeasurableFilter&&qualifiesForMeasurableFilter(id,pos,m)).length;return<button key={m} onClick={()=>setTraitFilter(prev=>{const n=new Set(prev);n.has(m)?n.delete(m):n.add(m);return n;})} style={{fontFamily:mono,fontSize:9,padding:"3px 8px",background:active?g.border+"18":"transparent",color:active?"#171717":"#525252",border:"1px solid "+(active?g.border+"66":g.border+"30"),borderRadius:99,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",gap:3,whiteSpace:"nowrap"}}><span>{(MEASURABLE_EMOJI||{})[m]}</span><span>{(MEASURABLE_SHORT||{})[m]}</span><span style={{fontSize:8,opacity:0.7}}>({count})</span></button>;})];});})()}{archButtons.length>0&&<><span style={{color:"#d4d4d4",fontSize:12,flexShrink:0,padding:"0 2px"}}>|</span>{archButtons}</>}</div></div>;})()}

          {/* Compare bar */}
          {compareList.length>0&&<div style={{background:"#fff",border:"1px solid #3b82f6",borderRadius:8,padding:"6px 10px",marginBottom:6,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
            <span style={{fontFamily:mono,fontSize:8,color:"#3b82f6"}}>COMPARE:</span>
            {compareList.map(p=><span key={p.id} style={{fontFamily:sans,fontSize:10,fontWeight:600,color:"#171717",background:"rgba(59,130,246,0.06)",padding:"2px 6px",borderRadius:4,cursor:"pointer"}} onClick={()=>toggleCompare(p)}>{p.name} ✕</span>)}
            {compareList.length>=2&&<button onClick={()=>setShowCompare(true)} style={{fontFamily:sans,fontSize:10,fontWeight:700,padding:"3px 10px",background:"#3b82f6",color:"#fff",border:"none",borderRadius:99,cursor:"pointer"}}>compare {compareList.length}</button>}
          </div>}

          {/* Available players */}
          <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,overflow:"hidden",maxHeight:"calc(100vh - 220px)",overflowY:"auto"}}>
            <div style={{padding:"6px 12px",background:"#f9f9f7",borderBottom:"1px solid #e5e5e5",display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,flexWrap:"wrap"}}>
              <span style={{fontFamily:mono,fontSize:8,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase"}}>available ({displayAvailable.length})</span>
              <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
                {Object.entries(recentPosCounts).filter(([,v])=>v>=2).sort((a,b)=>b[1]-a[1]).map(([pos,cnt])=>(
                  <span key={pos} title={`${cnt} ${pos}s drafted in last 8 picks`} style={{fontFamily:mono,fontSize:7,padding:"1px 5px",background:(POS_COLORS[pos]||"#737373")+"20",color:POS_COLORS[pos]||"#737373",border:"1px solid "+(POS_COLORS[pos]||"#737373")+"40",borderRadius:3,cursor:"default"}}>{pos} 🔥{cnt}</span>
                ))}
              </div>
              <span style={{fontFamily:mono,fontSize:8,color:"#a3a3a3"}}>click name = profile</span>
            </div>
            {scoutTeam&&<div style={{padding:"4px 12px",background:"rgba(99,102,241,0.04)",borderBottom:"1px solid rgba(99,102,241,0.1)",display:"flex",alignItems:"center",gap:6}}>
              <NFLTeamLogo team={scoutTeam} size={14}/>
              <span style={{fontFamily:mono,fontSize:8,letterSpacing:1,color:"#6366f1",textTransform:"uppercase"}}>scout vision — {scoutTeam}</span>
            </div>}
            {displayAvailable.length===0&&traitFilter.size>0&&<div style={{padding:"16px",textAlign:"center",fontFamily:sans,fontSize:12,color:"#a3a3a3",fontStyle:"italic"}}>no available prospects meet this threshold</div>}
            {displayAvailable.slice(0,60).map(id=>{const p=prospectsMap[id];if(!p)return null;const g=activeGrade(id);const c=POS_COLORS[p.pos];const inC=compareList.some(x=>x.id===p.id);const rank=boardRankMap[id];const tags=playerTags[id]||[];
              const svFit=scoutTeam&&schemeFits?.[scoutTeam]?.[id];const svScore=svFit?.score||0;const svReason=scoutData?.get(id);
              const svBg=scoutTeam?(svScore>=75?"rgba(99,102,241,0.04)":svScore>=60?"rgba(99,102,241,0.02)":svScore>0&&svScore<45?"rgba(220,38,38,0.03)":"transparent"):"transparent";
              const rowBg=scoutTeam?svBg:(tags.length>0&&isUserPick?"rgba(240,249,255,0.4)":"transparent");
              return<div key={id}>
                <div style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderBottom:expandedScoutId===id?"none":"1px solid #f8f8f8",background:rowBg}}>
                {rank&&!scoutTeam?<span style={{fontFamily:mono,fontSize:8,color:"#d4d4d4",width:22,textAlign:"right"}}>#{rank}</span>:<span style={{fontFamily:mono,fontSize:8,color:"#e5e5e5",width:22,textAlign:"right"}}>—</span>}
                <span style={{fontFamily:mono,fontSize:9,color:c,width:24}}>{p.gpos||p.pos}</span>
                <SchoolLogo school={p.school} size={16}/>
                <span style={{fontFamily:sans,fontSize:11,fontWeight:600,color:"#171717",flex:1,cursor:"pointer"}} onClick={()=>setProfilePlayer(p)} onMouseEnter={e=>e.currentTarget.style.textDecoration="underline"} onMouseLeave={e=>e.currentTarget.style.textDecoration="none"}>{p.name}</span>
                {scoutTeam&&!isUserPick&&svScore>0&&<span onClick={()=>setExpandedScoutId(prev=>prev===id?null:id)} style={{fontFamily:mono,fontSize:9,fontWeight:700,color:"#fff",background:"linear-gradient(135deg,#6366f1,#a855f7)",padding:"2px 6px",borderRadius:4,cursor:"pointer",flexShrink:0,display:"inline-flex",alignItems:"center",gap:2}}>{svScore}<span style={{fontSize:7,opacity:0.8}}>{expandedScoutId===id?"−":"+"}</span></span>}
                {scoutTeam&&svReason&&<span style={{fontFamily:mono,fontSize:8,color:"#6366f1",flexShrink:0,maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{svReason.roleLabel}</span>}
                {isUserPick&&tags.map(t=><span key={t.tag} style={{fontFamily:mono,fontSize:7,fontWeight:700,color:t.color,background:t.bg,padding:"2px 5px",borderRadius:3,flexShrink:0,letterSpacing:0.5}}>{t.tag}</span>)}
                {!scoutTeam&&(()=>{
                  const MAX_PILLS=5;const pills=[];
                  // 1. Archetype emojis (if filter active and prospect matches)
                  if(archetypeFilter.size>0){const tags=prospectTagsMap[id]||[];[...archetypeFilter].forEach(t=>{if(tags.includes(t)&&pills.length<MAX_PILLS)pills.push({key:"arch-"+t,emoji:ARCHETYPE_EMOJI[t]||"",label:ARCHETYPE_DISPLAY[t]||t,type:"arch"});});}
                  // 2. Measurable emojis (if filter active and prospect qualifies)
                  if(traitFilter.size>0&&measMode){[...traitFilter].forEach(t=>{if(pills.length<MAX_PILLS&&qualifiesForMeasurableFilter&&qualifiesForMeasurableFilter(id,(p.gpos||p.pos)==="IDL"?"DL":(p.gpos||p.pos),t))pills.push({key:"meas-"+t,emoji:(MEASURABLE_EMOJI||{})[t]||"",label:t,type:"meas"});});}
                  // 3. Trait badges fill remaining slots
                  const traitBadges=prospectBadges&&prospectBadges[id]||[];
                  traitBadges.forEach(b=>{if(pills.length<MAX_PILLS)pills.push({key:"trait-"+b.trait,emoji:b.emoji,label:b.trait+" "+b.score,type:"trait"});});
                  return pills.map(pl=><span key={pl.key} title={pl.label} style={{fontFamily:mono,fontSize:7,fontWeight:700,color:pl.type==="arch"?"#171717":pl.type==="meas"?"#0d9488":c,background:pl.type==="arch"?"#17171712":pl.type==="meas"?"#0d948812":c+"0d",padding:"2px 4px",borderRadius:3,flexShrink:0}}>{pl.emoji}</span>);
                })()}
                {renderGradeOrPill(p)}
                <button onClick={()=>toggleCompare(p)} style={{fontFamily:mono,fontSize:7,padding:"2px 5px",background:inC?"#3b82f6":"transparent",color:inC?"#fff":"#a3a3a3",border:"1px solid #e5e5e5",borderRadius:4,cursor:"pointer"}}>{inC?"✓":"+"}</button>
                {isUserPick&&!scoutTeam&&<button onClick={()=>makePick(id)} style={{fontFamily:sans,fontSize:10,fontWeight:700,padding:"3px 10px",background:"#22c55e",color:"#fff",border:"none",borderRadius:6,cursor:"pointer"}}>draft</button>}
                {isUserPick&&scoutTeam&&svScore>0&&<span onClick={()=>setExpandedScoutId(prev=>prev===id?null:id)} style={{fontFamily:mono,fontSize:10,fontWeight:700,color:"#fff",background:"linear-gradient(135deg,#6366f1,#a855f7)",padding:"3px 10px",borderRadius:6,cursor:"pointer",flexShrink:0,display:"inline-flex",alignItems:"center",gap:3,minWidth:44,justifyContent:"center"}}>{svScore}<span style={{fontSize:8,opacity:0.85,fontWeight:400}}>{expandedScoutId===id?"−":"+"}</span></span>}
                {isUserPick&&scoutTeam&&!svScore&&<button onClick={()=>makePick(id)} style={{fontFamily:sans,fontSize:10,fontWeight:700,padding:"3px 10px",background:"#22c55e",color:"#fff",border:"none",borderRadius:6,cursor:"pointer"}}>draft</button>}
              </div>
              {expandedScoutId===id&&svReason&&<div style={{marginLeft:28,padding:"12px 16px 14px 16px",background:"rgba(99,102,241,0.05)",borderLeft:"3px solid #6366f1",borderBottom:"1px solid rgba(99,102,241,0.12)",borderRadius:"0 0 8px 0"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                  <div style={{fontFamily:sans,fontSize:12,fontWeight:700,color:"#4f46e5"}}>{svReason.headline}</div>
                  <span style={{fontFamily:mono,fontSize:8,color:"#6366f1",opacity:0.7}}>{svReason.roleLabel}</span>
                </div>
                <div style={{fontFamily:sans,fontSize:11,color:"#404040",lineHeight:1.6,marginBottom:8}}>{svReason.whyItFits}</div>
                <div style={{fontFamily:mono,fontSize:9,color:"#737373",marginBottom:8}}>key traits: {svReason.prospectStrengths}</div>
                {svReason.relevantInflection&&<div style={{fontFamily:sans,fontSize:10,color:"#4f46e5",fontStyle:"italic",lineHeight:1.5,padding:"8px 10px",background:"rgba(99,102,241,0.06)",borderRadius:6,borderLeft:"2px solid rgba(99,102,241,0.4)",marginBottom:8}}>{svReason.relevantInflection}</div>}
                {isUserPick&&<button onClick={()=>makePick(id)} style={{fontFamily:sans,fontSize:10,fontWeight:700,padding:"5px 16px",background:"#22c55e",color:"#fff",border:"none",borderRadius:6,cursor:"pointer"}}>draft {p.name.split(" ").pop()}</button>}
              </div>}
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
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              {getMeasRadarData&&compareList.every(p=>getMeasRadarData(p.name,p.school)!=null)&&<button title={compareMeasMode?"Switch to traits":"Switch to measurables"} onClick={()=>setCompareMeasMode(v=>!v)} style={{width:40,height:22,borderRadius:11,border:"none",background:compareMeasMode?"linear-gradient(135deg,#00ffff,#1e3a5f)":"linear-gradient(135deg,#ec4899,#a855f7)",cursor:"pointer",position:"relative",transition:"background 0.2s"}}><div style={{width:16,height:16,borderRadius:8,background:"#fff",position:"absolute",top:3,left:compareMeasMode?21:3,transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontFamily:mono,fontSize:8,fontWeight:700,color:compareMeasMode?"#00ffff":"#a855f7",lineHeight:1}}>{compareMeasMode?"M":"T"}</span></div></button>}
              <button onClick={()=>setShowCompare(false)} style={{fontFamily:sans,fontSize:12,color:"#a3a3a3",background:"none",border:"1px solid #e5e5e5",borderRadius:99,padding:"4px 12px",cursor:"pointer"}}>close</button>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat("+compareList.length+", 1fr)",gap:16}}>
            {compareList.map(p=>{const c=POS_COLORS[p.gpos||p.pos]||POS_COLORS[p.pos];const pt=POSITION_TRAITS[p.gpos||p.pos]||POSITION_TRAITS[p.pos]||[];const g=activeGrade(p.id);const rank=getConsensusRank?getConsensusRank(p.name):null;const ps=getProspectStats(p.name,p.school);const posRank=ps?.posRank;
              const md=getMeasRadarData?getMeasRadarData(p.name,p.school):null;
              const activeLabels=compareMeasMode&&md?md.labels:pt;
              const activeValues=compareMeasMode&&md?md.values:pt.map(t=>tvFn(p.id,t));
              // Precompute per-trait/meas max/min for color coding
              const itemMaxMin={};
              activeLabels.forEach((label,li)=>{
                const vals=compareList.map(cp=>{if(compareMeasMode&&getMeasRadarData){const cpMd=getMeasRadarData(cp.name,cp.school);if(!cpMd)return null;const idx=cpMd.labels.indexOf(label);return idx>=0?cpMd.values[idx]:null;}return tvFn(cp.id,label);}).filter(v=>v!=null);
                itemMaxMin[label]={max:vals.length?Math.max(...vals):activeValues[li],min:vals.length?Math.min(...vals):activeValues[li]};
              });
              return<div key={p.id} style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:16,textAlign:"center"}}>
                <SchoolLogo school={p.school} size={40}/>
                <div style={{fontFamily:font,fontSize:16,fontWeight:900,color:"#171717",marginTop:8}}>{p.name}</div>
                <div style={{fontFamily:mono,fontSize:10,color:"#a3a3a3"}}>{p.school}</div>
                <span style={{fontFamily:mono,fontSize:10,color:c,background:c+"11",padding:"2px 8px",borderRadius:4,border:"1px solid "+c+"22",display:"inline-block",margin:"6px 0"}}>{p.gpos||p.pos}</span>
                {rank&&rank<400&&<div style={{fontFamily:mono,fontSize:9,color:"#a3a3a3"}}>consensus #{rank}{posRank&&<span> · {p.gpos||p.pos} #{posRank}</span>}</div>}
                <div style={{fontFamily:font,fontSize:32,fontWeight:900,color:g>=75?"#16a34a":g>=55?"#ca8a04":"#dc2626",lineHeight:1,margin:"8px 0"}}>{g}</div>
                <RadarChart traits={activeLabels} values={activeValues} color={c} size={140} proDaySpokes={compareMeasMode&&md?md.proDaySpokes:undefined}/>
                {(()=>{const fitScore=currentTeam&&schemeFits?.[currentTeam]?.[p.id]?.score;if(fitScore==null)return null;return<div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:5,marginTop:6}}><NFLTeamLogo team={currentTeam} size={14}/><span style={{fontFamily:mono,fontSize:10,fontWeight:700,color:"#fff",background:"linear-gradient(135deg,#6366f1,#a855f7)",padding:"3px 10px",borderRadius:6,display:"inline-block"}}>fit {fitScore}</span></div>;})()}
                <div style={{textAlign:"left",marginTop:8,background:"#fafaf9",borderRadius:8,padding:"8px 10px"}}>
                  {activeLabels.map((label,li)=>{
                    const val=activeValues[li];
                    const{max,min}=itemMaxMin[label]||{max:val,min:val};
                    const isBest=compareList.length>1&&val===max&&max!==min;
                    const isWorst=compareList.length>1&&val===min&&max!==min;
                    return<div key={label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"3px 0",borderBottom:"1px solid #f0f0ee"}}>
                      <span style={{fontFamily:mono,fontSize:9,color:"#a3a3a3"}}>{compareMeasMode?label:label}</span>
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
      {profilePlayer&&<PlayerProfile player={profilePlayer} traits={traits} setTraits={setTraits} notes={notes} setNotes={setNotes} allProspects={allProspects} getGrade={getGrade} onClose={()=>setProfilePlayer(null)} onSelectPlayer={setProfilePlayer} consensus={CONSENSUS} ratings={ratings} isGuest={isGuest} onRequireAuth={onRequireAuth} schemeFits={schemeFits}/>}
    </div>
  );
}
