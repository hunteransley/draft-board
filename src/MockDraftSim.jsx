import { useState, useEffect, useCallback, useMemo } from "react";
import NFL_ROSTERS from "./nflRosters.js";

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
  QB1:{x:50,y:88},RB1:{x:50,y:78},WR1:{x:5,y:65},WR2:{x:95,y:65},WR3:{x:15,y:72},TE1:{x:80,y:68},
  LT:{x:32,y:68},LG:{x:40,y:68},C:{x:50,y:68},RG:{x:60,y:68},RT:{x:68,y:68},
  DE1:{x:28,y:48},DT1:{x:42,y:48},DT2:{x:58,y:48},DE2:{x:72,y:48},
  LB1:{x:30,y:38},LB2:{x:50,y:38},LB3:{x:70,y:38},
  CB1:{x:10,y:25},CB2:{x:90,y:25},SS:{x:65,y:18},FS:{x:35,y:18},K:{x:50,y:96}
};

const POS_DRAFT_VALUE={QB:1.08,OL:1.05,DL:1.06,WR:1.04,DB:1.03,TE:0.98,LB:0.97,RB:0.96,"K/P":0.7};

function pickVerdict(pickNum,consRank){
  if(consRank>=900)return{text:"UNKNOWN",color:"#737373",bg:"#f5f5f5"};
  const diff=pickNum-consRank; // positive = player fell to you = value, negative = you reached up
  if(diff>=20)return{text:"HUGE STEAL",color:"#16a34a",bg:"#dcfce7"};
  if(diff>=8)return{text:"GREAT VALUE",color:"#22c55e",bg:"#f0fdf4"};
  if(diff>=-5)return{text:"FAIR PICK",color:"#ca8a04",bg:"#fefce8"};
  if(diff>=-15)return{text:"REACH",color:"#ea580c",bg:"#fff7ed"};
  return{text:"BIG REACH",color:"#dc2626",bg:"#fef2f2"};
}

export default function MockDraftSim({board,getGrade,teamNeeds,draftOrder,onClose,allProspects,PROSPECTS,CONSENSUS,ratings,traits,setTraits,notes,setNotes,POS_COLORS,POSITION_TRAITS,SchoolLogo,NFLTeamLogo,RadarChart,PlayerProfile,font,mono,sans,schoolLogo,getConsensusRank,getConsensusGrade,TEAM_NEEDS_DETAILED}){
  const ALL_TEAMS=useMemo(()=>[...new Set(draftOrder.map(d=>d.team))],[draftOrder]);
  const[setupDone,setSetupDone]=useState(false);
  const[userTeams,setUserTeams]=useState(new Set());
  const[numRounds,setNumRounds]=useState(1);
  const[speed,setSpeed]=useState(600);
  const[picks,setPicks]=useState([]);
  const[available,setAvailable]=useState([]);
  const[paused,setPaused]=useState(false);
  const[filterPos,setFilterPos]=useState(null);
  const[profilePlayer,setProfilePlayer]=useState(null);
  const[compareList,setCompareList]=useState([]);
  const[showCompare,setShowCompare]=useState(false);
  const[showDepth,setShowDepth]=useState(true);
  const[tradeOffer,setTradeOffer]=useState(null);
  const[showResults,setShowResults]=useState(false);
  const[lastVerdict,setLastVerdict]=useState(null);
  const[tradeMap,setTradeMap]=useState({});
  const[showTradeUp,setShowTradeUp]=useState(false);
  const[tradeTarget,setTradeTarget]=useState(null);
  const[tradeUserPicks,setTradeUserPicks]=useState([]);
  const[tradePartner,setTradePartner]=useState(null);
  const[depthTeamIdx,setDepthTeamIdx]=useState(0);

  const prospectsMap=useMemo(()=>{const m={};PROSPECTS.forEach(p=>m[p.id]=p);return m;},[PROSPECTS]);
  const gradeMap=useMemo(()=>{const m={};board.forEach(p=>m[p.id]=getGrade(p.id));return m;},[board,getGrade]);
  const positions=["QB","RB","WR","TE","OL","DL","LB","DB","K/P"];

  const fullDraftOrder=useMemo(()=>{
    const order=[];
    for(let r=0;r<numRounds;r++){
      const roundOrder=r%2===0?[...draftOrder]:[...draftOrder].reverse();
      roundOrder.forEach(d=>order.push({pick:order.length+1,round:r+1,team:d.team}));
    }
    return order;
  },[numRounds,draftOrder]);
  const totalPicks=fullDraftOrder.length;
  const getPickTeam=useCallback((idx)=>tradeMap[idx]||fullDraftOrder[idx]?.team,[tradeMap,fullDraftOrder]);

  const getTeamFuturePicks=useCallback((team)=>{
    const r=[];for(let i=picks.length;i<totalPicks;i++){if(getPickTeam(i)===team)r.push({idx:i,...fullDraftOrder[i]});}return r;
  },[picks,totalPicks,getPickTeam,fullDraftOrder]);

  const startDraft=useCallback(()=>{
    setAvailable(board.map(p=>p.id));setPicks([]);setSetupDone(true);setShowResults(false);
    setTradeMap({});setLastVerdict(null);setTradeOffer(null);setShowTradeUp(false);
  },[board]);

  const cpuPick=useCallback((team,avail,pickNum)=>{
    const needs=teamNeeds[team]||["QB","WR","DL"];
    const dn=TEAM_NEEDS_DETAILED?.[team]||{};
    if(pickNum===1){const m=avail.find(id=>{const p=prospectsMap[id];return p&&p.name==="Fernando Mendoza";});if(m)return m;}
    let best=null,bestScore=-1;
    const variance=(Math.random()-0.5)*12;
    avail.forEach(id=>{
      const p=prospectsMap[id];if(!p)return;
      const grade=getConsensusGrade?getConsensusGrade(p.name):(gradeMap[id]||50);
      const nc=dn[p.pos]||0;const ni=needs.indexOf(p.pos);
      const nm=nc>=2?12:nc===1?8:ni>=0&&ni<3?5:0;
      const pm=POS_DRAFT_VALUE[p.pos]||1.0;
      // Grade is king: base score from grade^1.3 ensures elite players stay elite
      // Needs add a flat bonus, positional value is a gentle multiplier
      const base=Math.pow(grade+variance,1.3);
      const score=(base+nm)*pm;
      if(score>bestScore){bestScore=score;best=id;}
    });
    return best||avail[0];
  },[teamNeeds,prospectsMap,gradeMap,getConsensusGrade,TEAM_NEEDS_DETAILED]);

  const isUserPick=useMemo(()=>{
    return picks.length<totalPicks&&userTeams.has(getPickTeam(picks.length));
  },[picks,userTeams,totalPicks,getPickTeam]);

  const makePick=useCallback((playerId,opts={})=>{
    const n=picks.length;if(n>=totalPicks)return;
    const team=getPickTeam(n);const{round,pick}=fullDraftOrder[n];
    const isUser=userTeams.has(team)&&!opts.traded;
    const np=[...picks,{pick,round,team,playerId,traded:opts.traded||false,isUser}];
    setPicks(np);setAvailable(prev=>prev.filter(id=>id!==playerId));
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
    setPicks(kp);setAvailable(board.map(p=>p.id).filter(id=>!ki.has(id)));
    setLastVerdict(null);setShowResults(false);setTradeOffer(null);
  },[picks,board]);

  // CPU auto-pick — pauses when trade offer or trade panel is open
  useEffect(()=>{
    if(!setupDone||picks.length>=totalPicks||paused||tradeOffer||showTradeUp)return;
    const n=picks.length;const team=getPickTeam(n);
    if(userTeams.has(team))return;
    const timer=setTimeout(()=>{const pid=cpuPick(team,available,fullDraftOrder[n].pick);if(pid)makePick(pid);},speed);
    return()=>clearTimeout(timer);
  },[picks,paused,available,userTeams,cpuPick,makePick,speed,setupDone,fullDraftOrder,totalPicks,getPickTeam,tradeOffer,showTradeUp]);

  // CPU trade offers
  useEffect(()=>{
    if(!isUserPick||tradeOffer||showTradeUp||picks.length>=totalPicks)return;
    const idx=picks.length;const uv=getPickValue(fullDraftOrder[idx].pick);
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
    const pid=cpuPick(ct,available,fullDraftOrder[ui].pick);
    if(pid){const{round,pick}=fullDraftOrder[ui];setPicks(prev=>[...prev,{pick,round,team:ct,playerId:pid,traded:true,isUser:false}]);setAvailable(prev=>prev.filter(id=>id!==pid));}
    setTradeOffer(null);
  },[tradeOffer,cpuPick,available,fullDraftOrder,getPickTeam]);

  const declineTrade=()=>setTradeOffer(null);
  const openTradeUp=()=>{setShowTradeUp(true);setTradeTarget(null);setTradeUserPicks([]);setTradePartner(null);};
  const closeTradeUp=()=>{setShowTradeUp(false);setTradeTarget(null);setTradeUserPicks([]);setTradePartner(null);};

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
    if(!tradeTarget||tradeUserPicks.length===0||!tradePartner)return;
    const tv=tradeTarget.value||getPickValue(tradeTarget.pick);
    const ov=tradeUserPicks.reduce((s,p)=>s+(p.value||getPickValue(p.pick)),0);
    if(ov<tv*1.05)return;
    const ut=[...userTeams][0];const nm={...tradeMap};
    // If target is a current draft pick, reassign it
    if(tradeTarget.type==="current"&&tradeTarget.idx!=null){nm[tradeTarget.idx]=ut;}
    // Reassign user's current-draft picks to the partner
    tradeUserPicks.filter(p=>p.type==="current"&&p.idx!=null).forEach(p=>{nm[p.idx]=tradePartner;});
    setTradeMap(nm);closeTradeUp();
  },[tradeTarget,tradeUserPicks,tradeMap,userTeams,tradePartner]);

  const toggleTeam=(t)=>setUserTeams(prev=>{const n=new Set(prev);n.has(t)?n.delete(t):n.add(t);return n;});
  const toggleCompare=(p)=>{setCompareList(prev=>{const e=prev.find(x=>x.id===p.id);if(e)return prev.filter(x=>x.id!==p.id);if(prev.length>=4)return prev;return[...prev,p];});};

  // Depth chart: NFL roster + drafted players overlay — drafted rookies slot in properly
  const depthChart=useMemo(()=>{
    const chart={};
    [...userTeams].forEach(team=>{
      // Build per-group arrays: roster first, then drafted on top
      chart[team]={};const roster=NFL_ROSTERS[team]||{};
      // Collect roster entries per group
      const groupPlayers={};
      DEPTH_GROUPS.forEach(g=>{
        groupPlayers[g.label]=[];
        g.slots.forEach(s=>{if(roster[s])groupPlayers[g.label].push({name:roster[s],isRoster:true,slot:s});});
      });
      // Add drafted players to front of their group (they're starters/high picks)
      picks.filter(pk=>pk.team===team).forEach(pk=>{
        const p=prospectsMap[pk.playerId];if(!p)return;
        const group=DEPTH_GROUPS.find(g=>g.posMatch===p.pos);if(!group)return;
        groupPlayers[group.label].unshift({name:p.name,isDraft:true});
      });
      // Map back to slots
      DEPTH_GROUPS.forEach(g=>{
        const players=groupPlayers[g.label];
        g.slots.forEach((s,i)=>{chart[team][s]=players[i]||null;});
        // Overflow beyond slot count
        for(let i=g.slots.length;i<players.length;i++){
          chart[team][g.slots[g.slots.length-1]+"_d"+i]=players[i];
        }
      });
    });
    return chart;
  },[picks,userTeams,prospectsMap]);

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
    if(!filterPos)return available;
    return available.filter(id=>{const p=prospectsMap[id];return p&&p.pos===filterPos;});
  },[available,filterPos,prospectsMap]);

  const draftGrade=useMemo(()=>{
    if(picks.length<totalPicks)return null;
    const up=picks.filter(pk=>pk.isUser);if(up.length===0)return null;
    let tv=0;up.forEach(pk=>{const p=prospectsMap[pk.playerId];if(!p)return;const rank=getConsensusRank?getConsensusRank(p.name):pk.pick;tv+=(pk.pick-rank);});
    const avg=tv/up.length;
    if(avg>=15)return{grade:"A+",color:"#16a34a"};if(avg>=10)return{grade:"A",color:"#16a34a"};
    if(avg>=5)return{grade:"B+",color:"#22c55e"};if(avg>=0)return{grade:"B",color:"#ca8a04"};
    if(avg>=-5)return{grade:"C+",color:"#ca8a04"};if(avg>=-10)return{grade:"C",color:"#dc2626"};
    if(avg>=-15)return{grade:"D",color:"#dc2626"};return{grade:"F",color:"#dc2626"};
  },[picks,prospectsMap,getConsensusRank,totalPicks]);

  const shareDraft=useCallback(()=>{
    const up=picks.filter(pk=>pk.isUser);const W=1200,H=Math.min(900,200+up.length*44);
    const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;const ctx=canvas.getContext('2d');
    const grad=ctx.createLinearGradient(0,0,W,H);grad.addColorStop(0,'#0a0a0a');grad.addColorStop(1,'#1a1a2e');
    ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
    const ac=ctx.createLinearGradient(0,0,W,0);ac.addColorStop(0,'#22c55e');ac.addColorStop(0.5,'#3b82f6');ac.addColorStop(1,'#a855f7');
    ctx.fillStyle=ac;ctx.fillRect(0,0,W,4);
    ctx.fillStyle='#fafafa';ctx.font='bold 32px Georgia,serif';ctx.fillText('MY MOCK DRAFT',48,50);
    ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='500 12px monospace';
    ctx.fillText('BIGBOARDLAB.COM  ·  2026 NFL DRAFT'+(draftGrade?' — Grade: '+draftGrade.grade:''),48,72);
    up.forEach((pk,i)=>{
      const p=prospectsMap[pk.playerId];if(!p)return;const y=100+i*44;const g=getGrade(pk.playerId);const c=POS_COLORS[p.pos];
      ctx.fillStyle=i%2===0?'rgba(255,255,255,0.02)':'transparent';ctx.fillRect(40,y,W-80,40);
      ctx.fillStyle='rgba(255,255,255,0.15)';ctx.font='14px monospace';ctx.fillText('Rd'+pk.round,56,y+26);
      ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='12px monospace';ctx.fillText('#'+pk.pick,110,y+26);
      ctx.fillStyle=c;ctx.font='bold 11px monospace';ctx.fillText(p.pos,160,y+26);
      ctx.fillStyle='#fafafa';ctx.font='bold 18px sans-serif';ctx.fillText(p.name,210,y+26);
      const gc=g>=75?'#22c55e':g>=55?'#eab308':'#ef4444';
      ctx.fillStyle=gc;ctx.font='bold 22px Georgia,serif';ctx.textAlign='right';ctx.fillText(''+g,W-56,y+28);ctx.textAlign='left';
    });
    ctx.fillStyle='rgba(255,255,255,0.15)';ctx.font='10px monospace';ctx.fillText('BUILD YOURS at BIGBOARDLAB.COM',48,H-16);
    canvas.toBlob(blob=>{const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='bigboardlab-mock-draft.png';a.click();URL.revokeObjectURL(url);});
  },[picks,prospectsMap,getGrade,POS_COLORS,draftGrade]);

  const userPickCount=useMemo(()=>picks.filter(p=>p.isUser).length,[picks]);

  // Sub-components
  const FormationChart=({team})=>{
    const chart=depthChart[team]||{};
    return(<svg viewBox="0 0 100 105" style={{width:"100%",maxWidth:280}}>
      <rect x="0" y="0" width="100" height="105" rx="4" fill="#15803d"/>
      {[20,40,58,75,90].map(y=><line key={y} x1="2" y1={y} x2="98" y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth="0.3"/>)}
      <line x1="2" y1="58" x2="98" y2="58" stroke="#fbbf24" strokeWidth="0.5" strokeDasharray="2,1.5"/>
      {Object.entries(FORMATION_POS).map(([slot,pos])=>{
        const entry=chart[slot];const filled=!!entry;const isDraft=entry?.isDraft;const isOff=pos.y>58;
        const dotColor=isDraft?"#fbbf24":filled?(isOff?"#4ade80":"#60a5fa"):"rgba(255,255,255,0.2)";
        const lastName=entry?entry.name.split(" ").pop():"";
        return(<g key={slot}>
          <circle cx={pos.x} cy={pos.y} r={filled?2.4:1.6} fill={dotColor} stroke={isDraft?"#fff":"rgba(255,255,255,0.3)"} strokeWidth={isDraft?"0.5":"0.2"}/>
          <text x={pos.x} y={pos.y-3} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="1.8" fontFamily="monospace">{slot.replace(/\d$/,'')}</text>
          {filled&&<text x={pos.x} y={pos.y+4.5} textAnchor="middle" fill={isDraft?"#fbbf24":"rgba(255,255,255,0.55)"} fontSize={isDraft?"2.2":"1.8"} fontWeight={isDraft?"bold":"normal"} fontFamily="sans-serif">{lastName}</text>}
        </g>);
      })}
    </svg>);
  };

  const DepthList=({team})=>{
    const chart=depthChart[team]||{};
    return(<div style={{marginTop:4}}>
      {DEPTH_GROUPS.map(group=>{
        const entries=group.slots.map(s=>({slot:s,entry:chart[s]})).filter(x=>x.entry);
        const extras=Object.entries(chart).filter(([k])=>k.startsWith(group.slots[group.slots.length-1]+"_d")).map(([k,v])=>({slot:k,entry:v}));
        if(entries.length===0&&extras.length===0)return null;
        return(<div key={group.label} style={{marginBottom:2}}>
          {entries.map(({slot,entry})=>(<div key={slot} style={{fontFamily:sans,fontSize:9,padding:"1px 0",display:"flex",gap:4}}>
            <span style={{color:"rgba(255,255,255,0.3)",width:16,fontSize:7}}>{slot}</span>
            <span style={{fontWeight:entry.isDraft?700:400,color:entry.isDraft?"#fbbf24":"rgba(255,255,255,0.55)"}}>{entry.name}{entry.isDraft?" ★":""}</span>
          </div>))}
          {extras.map(({slot,entry})=>(<div key={slot} style={{fontFamily:sans,fontSize:9,padding:"1px 0",display:"flex",gap:4}}>
            <span style={{color:"rgba(255,255,255,0.3)",width:16,fontSize:7}}>+</span>
            <span style={{fontWeight:entry.isDraft?700:400,color:entry.isDraft?"#fbbf24":"rgba(255,255,255,0.55)"}}>{entry.name}{entry.isDraft?" ★":""}</span>
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
            <button onClick={()=>setUserTeams(new Set())} style={{fontFamily:sans,fontSize:10,padding:"3px 10px",background:"transparent",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",color:"#a3a3a3"}}>clear</button>
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
        <div style={{maxWidth:800,margin:"0 auto",padding:"52px 24px 40px",textAlign:"center"}}>
          <h1 style={{fontSize:36,fontWeight:900,color:"#171717",margin:"0 0 8px"}}>draft complete!</h1>
          {draftGrade&&<div style={{display:"inline-block",padding:"12px 32px",background:"#fff",border:"2px solid "+draftGrade.color,borderRadius:16,marginBottom:24}}>
            <div style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase"}}>draft grade</div>
            <div style={{fontFamily:font,fontSize:56,fontWeight:900,color:draftGrade.color,lineHeight:1}}>{draftGrade.grade}</div>
          </div>}
          <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:24}}>
            <button onClick={shareDraft} style={{fontFamily:sans,fontSize:12,fontWeight:600,padding:"8px 20px",background:"#171717",color:"#faf9f6",border:"none",borderRadius:99,cursor:"pointer"}}>📤 share results</button>
            <button onClick={()=>{setSetupDone(false);setPicks([]);setShowResults(false);setTradeMap({});}} style={{fontFamily:sans,fontSize:12,padding:"8px 20px",background:"transparent",color:"#525252",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer"}}>draft again</button>
          </div>
          {[...userTeams].map(team=>{
            const tp=userPicks.filter(pk=>pk.team===team);if(tp.length===0)return null;
            return(<div key={team} style={{marginBottom:24,textAlign:"left"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><NFLTeamLogo team={team} size={20}/><span style={{fontFamily:sans,fontSize:14,fontWeight:700,color:"#171717"}}>{team}</span></div>
              <div style={{display:"flex",gap:16,marginBottom:12}}>
                <div style={{flex:"0 0 180px"}}><FormationChart team={team}/></div>
                <div style={{flex:1,background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,overflow:"hidden"}}>
                  {tp.map((pk,i)=>{const p=prospectsMap[pk.playerId];if(!p)return null;const c=POS_COLORS[p.pos];const g=getGrade(pk.playerId);const rank=getConsensusRank?getConsensusRank(p.name):pk.pick;const v=pickVerdict(pk.pick,rank);
                    return<div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderBottom:"1px solid #f5f5f5"}}>
                      <span style={{fontFamily:mono,fontSize:10,color:"#d4d4d4",width:44}}>Rd{pk.round} #{pk.pick}</span>
                      <span style={{fontFamily:mono,fontSize:10,color:c,width:28}}>{p.pos}</span>
                      <SchoolLogo school={p.school} size={16}/>
                      <span style={{fontFamily:sans,fontSize:12,fontWeight:600,color:"#171717",flex:1}}>{p.name}</span>
                      <span style={{fontFamily:mono,fontSize:7,padding:"1px 5px",background:v.bg,color:v.color,borderRadius:3}}>{v.text}</span>
                      <span style={{fontFamily:font,fontSize:12,fontWeight:900,color:g>=75?"#16a34a":g>=55?"#ca8a04":"#dc2626"}}>{g}</span>
                    </div>;
                  })}
                </div>
              </div>
            </div>);
          })}
        </div>
      </div>
    );
  }

  // === MAIN DRAFT SCREEN ===
  return(
    <div style={{minHeight:"100vh",background:"#faf9f6",fontFamily:font}}>
      {/* Top bar */}
      <div style={{position:"fixed",top:0,left:0,right:0,zIndex:100,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 16px",background:"#fff",borderBottom:"1px solid #f0f0f0"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontFamily:mono,fontSize:10,color:"#a3a3a3"}}>round {currentRound} · pick {Math.min(picks.length+1,totalPicks)}/{totalPicks}</span>
          {isUserPick&&<span style={{fontFamily:sans,fontSize:10,fontWeight:700,color:"#22c55e"}}>YOUR PICK</span>}
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
        <div style={{width:280,flexShrink:0,maxHeight:"calc(100vh - 60px)",overflowY:"auto"}}>
          <div style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:6,padding:"0 4px"}}>picks</div>
          <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,overflow:"hidden"}}>
            {picks.map((pick,i)=>{const p=prospectsMap[pick.playerId];if(!p)return null;const c=POS_COLORS[p.pos];const isU=pick.isUser;
              const showRound=i===0||pick.round!==picks[i-1].round;
              return<div key={i}>{showRound&&<div style={{padding:"5px 10px",background:"#f5f5f5",fontFamily:mono,fontSize:8,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase"}}>round {pick.round}</div>}<div style={{display:"flex",alignItems:"center",gap:5,padding:"5px 10px",borderBottom:"1px solid #f8f8f8",background:isU?"rgba(34,197,94,0.02)":"transparent"}}>
                <span style={{fontFamily:mono,fontSize:9,color:"#d4d4d4",width:18,textAlign:"right"}}>{pick.pick}</span>
                <NFLTeamLogo team={pick.team} size={13}/>
                <span style={{fontFamily:mono,fontSize:8,color:c}}>{p.pos}</span>
                <span style={{fontFamily:sans,fontSize:10,fontWeight:isU?600:400,color:isU?"#171717":"#737373",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</span>
                {pick.traded&&<span style={{fontFamily:mono,fontSize:7,color:"#a855f7",background:"rgba(168,85,247,0.03)",padding:"1px 4px",borderRadius:2}}>TRD</span>}
              </div></div>;
            })}
            {picks.length<totalPicks&&<div style={{padding:"8px 10px",display:"flex",alignItems:"center",gap:5}}>
              <NFLTeamLogo team={currentTeam} size={13}/>
              <span style={{fontFamily:mono,fontSize:9,color:"#a3a3a3"}}>#{picks.length+1} {currentTeam}...</span>
            </div>}
          </div>
        </div>

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
                  <button key={t} onClick={()=>{setTradePartner(t);setTradeTarget(null);setTradeUserPicks([]);}} style={{fontFamily:sans,fontSize:9,padding:"3px 8px",background:tradePartner===t?"#a855f7":"#fff",color:tradePartner===t?"#fff":"#737373",border:"1px solid "+(tradePartner===t?"#a855f7":"#e5e5e5"),borderRadius:5,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:3}}>
                    <NFLTeamLogo team={t} size={11}/>{t}
                  </button>
                ))}
              </div>
            </div>
            {/* Step 2: Select what you want from them */}
            {tradePartner&&<div style={{marginBottom:8}}>
              <div style={{fontFamily:mono,fontSize:8,color:"#a3a3a3",letterSpacing:1,marginBottom:4}}>YOU GET:</div>
              {[{year:2026,label:"2026 (this draft)",picks:partnerAssets.thisDraft},{year:2027,label:"2027",picks:partnerAssets.futurePicks.filter(p=>p.year===2027)},{year:2028,label:"2028",picks:partnerAssets.futurePicks.filter(p=>p.year===2028)}].map(yr=>(
                yr.picks.length>0&&<div key={yr.year} style={{marginBottom:4}}>
                  <div style={{fontFamily:mono,fontSize:7,color:"#d4d4d4",marginBottom:2}}>{yr.label}</div>
                  <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
                    {yr.picks.map((p,i)=>{const sel=tradeTarget?.label===p.label&&tradeTarget?.type===p.type;
                      return<button key={p.label+i} onClick={()=>setTradeTarget(sel?null:p)} style={{fontFamily:sans,fontSize:9,padding:"3px 8px",background:sel?"#a855f7":"#fff",color:sel?"#fff":"#525252",border:"1px solid "+(sel?"#a855f7":"#e5e5e5"),borderRadius:5,cursor:"pointer"}}>{p.type==="current"?p.label:`Rd${p.round}`} <span style={{fontSize:7,color:sel?"#e9d5ff":"#a3a3a3"}}>({p.value}pts)</span></button>;
                    })}
                  </div>
                </div>
              ))}
            </div>}
            {/* Step 3: Select what you give up */}
            {tradeTarget&&<div style={{marginBottom:8}}>
              <div style={{fontFamily:mono,fontSize:8,color:"#a3a3a3",letterSpacing:1,marginBottom:4}}>YOU GIVE:</div>
              {[{year:2026,label:"2026 (this draft)",picks:userAllPicks.thisDraft},{year:2027,label:"2027",picks:userAllPicks.futurePicks.filter(p=>p.year===2027)},{year:2028,label:"2028",picks:userAllPicks.futurePicks.filter(p=>p.year===2028)}].map(yr=>(
                yr.picks.length>0&&<div key={yr.year} style={{marginBottom:4}}>
                  <div style={{fontFamily:mono,fontSize:7,color:"#d4d4d4",marginBottom:2}}>{yr.label}</div>
                  <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
                    {yr.picks.map((p,i)=>{const sel=tradeUserPicks.some(x=>x.label===p.label&&x.type===p.type);
                      return<button key={p.label+i} onClick={()=>setTradeUserPicks(prev=>sel?prev.filter(x=>!(x.label===p.label&&x.type===p.type)):[...prev,p])} style={{fontFamily:sans,fontSize:9,padding:"3px 8px",background:sel?"#171717":"#fff",color:sel?"#faf9f6":"#525252",border:"1px solid #e5e5e5",borderRadius:5,cursor:"pointer"}}>{p.type==="current"?p.label:`Rd${p.round}`} <span style={{fontSize:7,color:sel?"#a3a3a3":"#d4d4d4"}}>({p.value}pts)</span></button>;
                    })}
                  </div>
                </div>
              ))}
            </div>}
            {/* Value bar + execute */}
            {tradeTarget&&tradeUserPicks.length>0&&(()=>{
              const tv=tradeTarget.value||0;const ov=tradeUserPicks.reduce((s,p)=>s+(p.value||0),0);const enough=ov>=tv*1.05;
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
            <button onClick={()=>setFilterPos(null)} style={{fontFamily:mono,fontSize:10,padding:"4px 10px",background:!filterPos?"#171717":"transparent",color:!filterPos?"#faf9f6":"#a3a3a3",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer"}}>all</button>
            {positions.map(pos=><button key={pos} onClick={()=>setFilterPos(filterPos===pos?null:pos)} style={{fontFamily:mono,fontSize:10,padding:"4px 10px",background:filterPos===pos?POS_COLORS[pos]:"transparent",color:filterPos===pos?"#fff":POS_COLORS[pos],border:"1px solid "+(filterPos===pos?POS_COLORS[pos]:"#e5e5e5"),borderRadius:99,cursor:"pointer"}}>{pos}</button>)}
          </div>

          {/* Compare bar */}
          {compareList.length>0&&<div style={{background:"#fff",border:"1px solid #3b82f6",borderRadius:8,padding:"6px 10px",marginBottom:6,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
            <span style={{fontFamily:mono,fontSize:8,color:"#3b82f6"}}>COMPARE:</span>
            {compareList.map(p=><span key={p.id} style={{fontFamily:sans,fontSize:10,fontWeight:600,color:"#171717",background:"rgba(59,130,246,0.06)",padding:"2px 6px",borderRadius:4,cursor:"pointer"}} onClick={()=>toggleCompare(p)}>{p.name} ✕</span>)}
            {compareList.length>=2&&<button onClick={()=>setShowCompare(true)} style={{fontFamily:sans,fontSize:10,fontWeight:700,padding:"3px 10px",background:"#3b82f6",color:"#fff",border:"none",borderRadius:99,cursor:"pointer"}}>compare {compareList.length}</button>}
          </div>}

          {/* Available players */}
          <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,overflow:"hidden",maxHeight:"calc(100vh - 220px)",overflowY:"auto"}}>
            <div style={{padding:"6px 12px",background:"#f9f9f7",borderBottom:"1px solid #e5e5e5",display:"flex",justifyContent:"space-between"}}>
              <span style={{fontFamily:mono,fontSize:8,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase"}}>available ({filteredAvailable.length})</span>
              <span style={{fontFamily:mono,fontSize:8,color:"#a3a3a3"}}>click name = profile</span>
            </div>
            {filteredAvailable.slice(0,60).map(id=>{const p=prospectsMap[id];if(!p)return null;const g=getGrade(id);const c=POS_COLORS[p.pos];const inC=compareList.some(x=>x.id===p.id);const rank=getConsensusRank?getConsensusRank(p.name):null;
              return<div key={id} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderBottom:"1px solid #f8f8f8"}}>
                {rank&&rank<400&&<span style={{fontFamily:mono,fontSize:8,color:"#d4d4d4",width:22,textAlign:"right"}}>#{rank}</span>}
                <span style={{fontFamily:mono,fontSize:9,color:c,width:24}}>{p.pos}</span>
                <SchoolLogo school={p.school} size={16}/>
                <span style={{fontFamily:sans,fontSize:11,fontWeight:600,color:"#171717",flex:1,cursor:"pointer"}} onClick={()=>setProfilePlayer(p)} onMouseEnter={e=>e.currentTarget.style.textDecoration="underline"} onMouseLeave={e=>e.currentTarget.style.textDecoration="none"}>{p.name}</span>
                <span style={{fontFamily:font,fontSize:12,fontWeight:900,color:g>=75?"#16a34a":g>=55?"#ca8a04":"#dc2626",width:24,textAlign:"right"}}>{g}</span>
                <button onClick={()=>toggleCompare(p)} style={{fontFamily:mono,fontSize:7,padding:"2px 5px",background:inC?"#3b82f6":"transparent",color:inC?"#fff":"#a3a3a3",border:"1px solid #e5e5e5",borderRadius:4,cursor:"pointer"}}>{inC?"✓":"+"}</button>
                {isUserPick&&<button onClick={()=>makePick(id)} style={{fontFamily:sans,fontSize:10,fontWeight:700,padding:"3px 10px",background:"#22c55e",color:"#fff",border:"none",borderRadius:6,cursor:"pointer"}}>draft</button>}
              </div>;
            })}
          </div>
        </div>

        {/* RIGHT: Depth chart — paginated for multi-team */}
        {showDepth&&<div style={{width:280,flexShrink:0,maxHeight:"calc(100vh - 60px)",overflowY:"auto"}}>
          {userTeams.size>1&&<div style={{display:"flex",gap:3,marginBottom:6}}>
            {[...userTeams].map((team,i)=>(
              <button key={team} onClick={()=>setDepthTeamIdx(i)} style={{flex:1,fontFamily:sans,fontSize:10,fontWeight:depthTeamIdx===i?700:400,padding:"4px 6px",background:depthTeamIdx===i?"#166534":"rgba(21,128,61,0.3)",color:depthTeamIdx===i?"#fff":"rgba(255,255,255,0.6)",border:"1px solid #166534",borderRadius:6,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:3}}>
                <NFLTeamLogo team={team} size={12}/>{team}
              </button>
            ))}
          </div>}
          {(()=>{const teamsArr=[...userTeams];const team=teamsArr[Math.min(depthTeamIdx,teamsArr.length-1)]||teamsArr[0];if(!team)return null;
            return(
              <div style={{background:"#15803d",border:"1px solid #166534",borderRadius:12,padding:"10px"}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                  <NFLTeamLogo team={team} size={16}/>
                  <span style={{fontFamily:sans,fontSize:12,fontWeight:700,color:"#fff"}}>{team}</span>
                  <span style={{fontFamily:mono,fontSize:8,color:"rgba(255,255,255,0.4)",marginLeft:"auto"}}>{picks.filter(pk=>pk.team===team).length} drafted</span>
                </div>
                <FormationChart team={team}/>
                <DepthList team={team}/>
                <LiveNeeds team={team}/>
              </div>
            );
          })()}
        </div>}
      </div>

      {/* Compare overlay */}
      {showCompare&&compareList.length>=2&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setShowCompare(false)}>
        <div style={{background:"#faf9f6",borderRadius:16,padding:24,maxWidth:900,width:"95%",maxHeight:"80vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <h2 style={{fontFamily:font,fontSize:22,fontWeight:900,color:"#171717",margin:0}}>player comparison</h2>
            <button onClick={()=>setShowCompare(false)} style={{fontFamily:sans,fontSize:12,color:"#a3a3a3",background:"none",border:"1px solid #e5e5e5",borderRadius:99,padding:"4px 12px",cursor:"pointer"}}>close</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat("+compareList.length+", 1fr)",gap:16}}>
            {compareList.map(p=>{const c=POS_COLORS[p.pos];const pt=POSITION_TRAITS[p.pos]||[];const g=getGrade(p.id);const rank=getConsensusRank?getConsensusRank(p.name):null;
              return<div key={p.id} style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:16,textAlign:"center"}}>
                <SchoolLogo school={p.school} size={40}/>
                <div style={{fontFamily:font,fontSize:16,fontWeight:900,color:"#171717",marginTop:8}}>{p.name}</div>
                <div style={{fontFamily:mono,fontSize:10,color:"#a3a3a3"}}>{p.school}</div>
                <span style={{fontFamily:mono,fontSize:10,color:c,background:c+"11",padding:"2px 8px",borderRadius:4,border:"1px solid "+c+"22",display:"inline-block",margin:"6px 0"}}>{p.pos}</span>
                {rank&&rank<400&&<div style={{fontFamily:mono,fontSize:9,color:"#a3a3a3"}}>consensus #{rank}</div>}
                <div style={{fontFamily:font,fontSize:32,fontWeight:900,color:g>=75?"#16a34a":g>=55?"#ca8a04":"#dc2626",lineHeight:1,margin:"8px 0"}}>{g}</div>
                <RadarChart traits={pt} values={pt.map(t=>traits[p.id]?.[t]||50)} color={c} size={140}/>
                <div style={{textAlign:"left",marginTop:8}}>
                  {pt.map(t=><div key={t} style={{display:"flex",justifyContent:"space-between",padding:"2px 0"}}>
                    <span style={{fontFamily:mono,fontSize:9,color:"#a3a3a3"}}>{t}</span>
                    <span style={{fontFamily:font,fontSize:12,fontWeight:900,color:c}}>{traits[p.id]?.[t]||50}</span>
                  </div>)}
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
