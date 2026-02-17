import { useState, useEffect, useCallback, useMemo } from "react";

// Jimmy Johnson Trade Value Chart (picks 1-224)
const JJ_VALUES={1:3000,2:2600,3:2200,4:1800,5:1700,6:1600,7:1500,8:1400,9:1350,10:1300,11:1250,12:1200,13:1150,14:1100,15:1050,16:1000,17:950,18:900,19:875,20:850,21:800,22:780,23:760,24:740,25:720,26:700,27:680,28:660,29:640,30:620,31:600,32:590,33:580,34:560,35:550,36:540,37:530,38:520,39:510,40:500,41:490,42:480,43:470,44:460,45:450,46:440,47:430,48:420,49:410,50:400,51:390,52:380,53:370,54:360,55:350,56:340,57:330,58:320,59:310,60:300,61:292,62:284,63:276,64:270,65:265,66:260,67:255,68:250,69:245,70:240,71:235,72:230,73:225,74:220,75:215,76:210,77:205,78:200,79:195,80:190,81:185,82:180,83:175,84:170,85:165,86:160,87:155,88:150,89:145,90:140,91:136,92:132,93:128,94:124,95:120,96:116,97:112,98:108,99:104,100:100};
function getPickValue(n){return JJ_VALUES[n]||Math.max(5,Math.round(100-((n-100)*0.72)));}

// Depth chart: position groups with multiple slots each
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

// Formation SVG positions
const FORMATION_POSITIONS={
  "QB1":{x:50,y:88},"QB2":null,"RB1":{x:50,y:78},"RB2":null,
  "WR1":{x:5,y:65},"WR2":{x:95,y:65},"WR3":{x:15,y:72},"WR4":null,
  "TE1":{x:80,y:68},"TE2":null,
  "LT":{x:32,y:68},"LG":{x:40,y:68},"C":{x:50,y:68},"RG":{x:60,y:68},"RT":{x:68,y:68},
  "DE1":{x:28,y:48},"DT1":{x:42,y:48},"DT2":{x:58,y:48},"DE2":{x:72,y:48},
  "LB1":{x:30,y:38},"LB2":{x:50,y:38},"LB3":{x:70,y:38},
  "CB1":{x:10,y:25},"CB2":{x:90,y:25},"SS":{x:65,y:18},"FS":{x:35,y:18},"K":{x:50,y:96}
};

function pickVerdict(pickNum,consRank){
  const diff=consRank-pickNum;
  if(diff>=20)return{text:"STEAL",color:"#16a34a",bg:"#dcfce7"};
  if(diff>=8)return{text:"GREAT VALUE",color:"#22c55e",bg:"#f0fdf4"};
  if(diff>=-5)return{text:"FAIR",color:"#ca8a04",bg:"#fefce8"};
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
  // tradeMap: pickIndex -> team that now owns it (overrides fullDraftOrder)
  const[tradeMap,setTradeMap]=useState({});

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

  // Effective team at a pick index (respects trades)
  const getPickTeam=useCallback((idx)=>{
    return tradeMap[idx]||fullDraftOrder[idx]?.team;
  },[tradeMap,fullDraftOrder]);

  const startDraft=useCallback(()=>{
    setAvailable(board.map(p=>p.id));
    setPicks([]);setSetupDone(true);setShowResults(false);setTradeMap({});setLastVerdict(null);
  },[board]);

  // CPU pick logic
  const cpuPick=useCallback((team,avail)=>{
    const needs=teamNeeds[team]||["QB","WR","DL"];
    const detailedNeeds=TEAM_NEEDS_DETAILED?.[team]||{};
    let best=null,bestScore=-1;
    avail.forEach(id=>{
      const p=prospectsMap[id];if(!p)return;
      const needIdx=needs.indexOf(p.pos);
      const needCount=detailedNeeds[p.pos]||0;
      const needMult=needCount>=2?3:needCount===1?2.5:needIdx===0?3:needIdx===1?2:needIdx===2?1.5:0.8;
      const grade=getConsensusGrade?getConsensusGrade(p.name):(gradeMap[id]||50);
      const score=grade*needMult;
      if(score>bestScore){bestScore=score;best=id;}
    });
    return best||avail[0];
  },[teamNeeds,prospectsMap,gradeMap,getConsensusGrade,TEAM_NEEDS_DETAILED]);

  const isUserPick=useMemo(()=>{
    const n=picks.length;
    if(n>=totalPicks)return false;
    const team=getPickTeam(n);
    return userTeams.has(team);
  },[picks,userTeams,fullDraftOrder,totalPicks,getPickTeam]);

  // Make a pick
  const makePick=useCallback((playerId,opts={})=>{
    const n=picks.length;if(n>=totalPicks)return;
    const team=getPickTeam(n);
    const{round,pick}=fullDraftOrder[n];
    const newPicks=[...picks,{pick,round,team,playerId,traded:opts.traded||false,isUser:userTeams.has(team)&&!opts.traded}];
    setPicks(newPicks);
    setAvailable(prev=>prev.filter(id=>id!==playerId));
    // Per-pick verdict for user picks
    if(userTeams.has(team)&&!opts.traded&&getConsensusRank){
      const p=prospectsMap[playerId];
      if(p){
        const rank=getConsensusRank(p.name);
        const v=pickVerdict(pick,rank);
        setLastVerdict({...v,player:p.name,pick,rank});
        setTimeout(()=>setLastVerdict(null),3500);
      }
    }
    if(newPicks.length>=totalPicks)setShowResults(true);
  },[picks,fullDraftOrder,totalPicks,available,userTeams,prospectsMap,getConsensusRank,getPickTeam]);

  // === UNDO: rewind to just before the last USER pick ===
  const undo=useCallback(()=>{
    if(picks.length===0)return;
    // Find the index of the last user pick
    let lastUserIdx=-1;
    for(let i=picks.length-1;i>=0;i--){
      if(picks[i].isUser){lastUserIdx=i;break;}
    }
    if(lastUserIdx===-1)return; // no user picks to undo
    // Restore all players from lastUserIdx onward back to available
    const removedPicks=picks.slice(lastUserIdx);
    const restoredIds=removedPicks.map(p=>p.playerId);
    const keptPicks=picks.slice(0,lastUserIdx);
    // Rebuild available: current available + restored ids, in board order
    const keptPlayerIds=new Set(keptPicks.map(p=>p.playerId));
    const newAvailable=board.map(p=>p.id).filter(id=>!keptPlayerIds.has(id));
    setPicks(keptPicks);
    setAvailable(newAvailable);
    setLastVerdict(null);
    setShowResults(false);
    setTradeOffer(null);
  },[picks,board]);

  // CPU auto-pick
  useEffect(()=>{
    if(!setupDone||picks.length>=totalPicks||paused)return;
    const n=picks.length;
    const team=getPickTeam(n);
    if(userTeams.has(team))return;
    const timer=setTimeout(()=>{
      const pid=cpuPick(team,available);
      if(pid)makePick(pid);
    },speed);
    return()=>clearTimeout(timer);
  },[picks,paused,available,userTeams,cpuPick,makePick,speed,setupDone,fullDraftOrder,totalPicks,getPickTeam]);

  // CPU trade offers (rounds 1-3, 30% chance)
  useEffect(()=>{
    if(!isUserPick||tradeOffer||picks.length>=totalPicks)return;
    const userPickNum=picks.length;
    const userPickVal=getPickValue(userPickNum+1);
    const candidates=[];
    for(let i=userPickNum+3;i<Math.min(userPickNum+16,totalPicks);i++){
      const t=getPickTeam(i);
      if(t&&!userTeams.has(t)&&fullDraftOrder[i]?.round<=3)candidates.push({idx:i,team:t,...fullDraftOrder[i]});
    }
    if(candidates.length>0&&Math.random()<0.30){
      const trader=candidates[Math.floor(Math.random()*candidates.length)];
      const theirVal=getPickValue(trader.pick);
      const futureRound=Math.min(trader.round+2,7);
      const futurePick=Math.min(trader.pick+64,totalPicks);
      const offerVal=theirVal+getPickValue(futurePick);
      if(offerVal>=userPickVal*0.92){
        setTradeOffer({fromTeam:trader.team,traderIdx:trader.idx,theirPick:trader.pick,theirRound:trader.round,futurePick,futureRound,userPickIdx:userPickNum,userPick:userPickNum+1,userVal:userPickVal,offerVal:Math.round(offerVal)});
      }
    }
  },[isUserPick,picks,tradeOffer,totalPicks,fullDraftOrder,userTeams,getPickTeam]);

  // === ACCEPT TRADE: CPU gets user's current slot, user gets CPU's slot ===
  const acceptTrade=useCallback(()=>{
    if(!tradeOffer)return;
    const cpuTeam=tradeOffer.fromTeam;
    const userPickIdx=tradeOffer.userPickIdx;
    const cpuPickIdx=tradeOffer.traderIdx;
    // Remap ownership: user's current pick goes to CPU, CPU's pick goes to user
    setTradeMap(prev=>({...prev,[userPickIdx]:cpuTeam,[cpuPickIdx]:[...userTeams][0]}));
    // Now CPU makes the pick at user's current slot
    const pid=cpuPick(cpuTeam,available);
    if(pid){
      const{round,pick}=fullDraftOrder[userPickIdx];
      const newPicks=[...picks,{pick,round,team:cpuTeam,playerId:pid,traded:true,isUser:false}];
      setPicks(newPicks);
      setAvailable(prev=>prev.filter(id=>id!==pid));
    }
    setTradeOffer(null);
  },[tradeOffer,cpuPick,available,picks,fullDraftOrder,userTeams]);

  const declineTrade=()=>setTradeOffer(null);

  const toggleTeam=(t)=>setUserTeams(prev=>{const n=new Set(prev);n.has(t)?n.delete(t):n.add(t);return n;});
  const toggleCompare=(p)=>{
    setCompareList(prev=>{
      const exists=prev.find(x=>x.id===p.id);
      if(exists)return prev.filter(x=>x.id!==p.id);
      if(prev.length>=4)return prev;
      return[...prev,p];
    });
  };

  // Depth chart: multiple players per position group
  const depthChart=useMemo(()=>{
    const chart={};
    [...userTeams].forEach(team=>{
      chart[team]={};
      ALL_SLOTS.forEach(s=>chart[team][s]=null);
      const teamPicks=picks.filter(pk=>pk.team===team);
      teamPicks.forEach(pk=>{
        const p=prospectsMap[pk.playerId];if(!p)return;
        const group=DEPTH_GROUPS.find(g=>g.posMatch===p.pos);
        if(!group)return;
        for(const slot of group.slots){
          if(!chart[team][slot]){chart[team][slot]=p;break;}
        }
      });
    });
    return chart;
  },[picks,userTeams,prospectsMap]);

  // Live team needs tracking
  const liveNeeds=useMemo(()=>{
    const needs={};
    [...userTeams].forEach(team=>{
      const base=TEAM_NEEDS_DETAILED?.[team]||{};
      const remaining={...base};
      const teamPicks=picks.filter(pk=>pk.team===team);
      teamPicks.forEach(pk=>{
        const p=prospectsMap[pk.playerId];if(!p)return;
        if(remaining[p.pos]&&remaining[p.pos]>0)remaining[p.pos]--;
      });
      needs[team]=remaining;
    });
    return needs;
  },[picks,userTeams,prospectsMap,TEAM_NEEDS_DETAILED]);

  const filteredAvailable=useMemo(()=>{
    if(!filterPos)return available;
    return available.filter(id=>{const p=prospectsMap[id];return p&&p.pos===filterPos;});
  },[available,filterPos,prospectsMap]);

  // Draft grade
  const draftGrade=useMemo(()=>{
    if(picks.length<totalPicks)return null;
    const userPicks=picks.filter(pk=>userTeams.has(pk.team));
    if(userPicks.length===0)return null;
    let totalValue=0;
    userPicks.forEach(pk=>{
      const p=prospectsMap[pk.playerId];if(!p)return;
      const rank=getConsensusRank?getConsensusRank(p.name):pk.pick;
      totalValue+=(rank-pk.pick);
    });
    const avg=totalValue/userPicks.length;
    if(avg>=15)return{grade:"A+",color:"#16a34a"};
    if(avg>=10)return{grade:"A",color:"#16a34a"};
    if(avg>=5)return{grade:"B+",color:"#22c55e"};
    if(avg>=0)return{grade:"B",color:"#ca8a04"};
    if(avg>=-5)return{grade:"C+",color:"#ca8a04"};
    if(avg>=-10)return{grade:"C",color:"#dc2626"};
    if(avg>=-15)return{grade:"D",color:"#dc2626"};
    return{grade:"F",color:"#dc2626"};
  },[picks,userTeams,prospectsMap,getConsensusRank,totalPicks]);

  // Share image
  const shareDraft=useCallback(()=>{
    const userPicks=picks.filter(pk=>userTeams.has(pk.team));
    const W=1200,H=Math.min(900,200+userPicks.length*44);
    const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
    const ctx=canvas.getContext('2d');
    const grad=ctx.createLinearGradient(0,0,W,H);
    grad.addColorStop(0,'#0a0a0a');grad.addColorStop(1,'#1a1a2e');
    ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
    ctx.strokeStyle='rgba(255,255,255,0.03)';ctx.lineWidth=1;
    for(let x=0;x<W;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    const acGrad=ctx.createLinearGradient(0,0,W,0);
    acGrad.addColorStop(0,'#22c55e');acGrad.addColorStop(0.5,'#3b82f6');acGrad.addColorStop(1,'#a855f7');
    ctx.fillStyle=acGrad;ctx.fillRect(0,0,W,4);
    ctx.fillStyle='#fafafa';ctx.font='bold 32px Georgia,serif';ctx.fillText('MY MOCK DRAFT',48,50);
    const gradeText=draftGrade?` — Grade: ${draftGrade.grade}`:'';
    ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='500 12px monospace';
    ctx.fillText(`BIGBOARDLAB.COM  ·  2026 NFL DRAFT${gradeText}`,48,72);
    ctx.strokeStyle='rgba(255,255,255,0.08)';ctx.beginPath();ctx.moveTo(48,88);ctx.lineTo(W-48,88);ctx.stroke();
    userPicks.forEach((pk,i)=>{
      const p=prospectsMap[pk.playerId];if(!p)return;
      const y=100+i*44;const g=getGrade(pk.playerId);const c=POS_COLORS[p.pos];
      ctx.fillStyle=i%2===0?'rgba(255,255,255,0.02)':'transparent';
      ctx.fillRect(40,y,W-80,40);
      ctx.fillStyle='rgba(255,255,255,0.15)';ctx.font='14px monospace';ctx.fillText(`Rd${pk.round}`,56,y+26);
      ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='12px monospace';ctx.fillText(`#${pk.pick}`,110,y+26);
      ctx.fillStyle=c;ctx.font='bold 11px monospace';ctx.fillText(p.pos,160,y+26);
      ctx.fillStyle='#fafafa';ctx.font='bold 18px sans-serif';ctx.fillText(p.name,210,y+26);
      ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='12px monospace';
      const nw=ctx.measureText(p.name).width;ctx.fillText(p.school,228+nw,y+26);
      const gColor=g>=75?'#22c55e':g>=55?'#eab308':'#ef4444';
      ctx.fillStyle=gColor;ctx.font='bold 22px Georgia,serif';ctx.textAlign='right';ctx.fillText(`${g}`,W-56,y+28);ctx.textAlign='left';
    });
    ctx.fillStyle='rgba(255,255,255,0.15)';ctx.font='10px monospace';
    ctx.fillText(`GENERATED ${new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}).toUpperCase()}`,48,H-16);
    ctx.textAlign='right';ctx.fillText('BUILD YOURS → BIGBOARDLAB.COM',W-48,H-16);ctx.textAlign='left';
    canvas.toBlob(blob=>{
      const url=URL.createObjectURL(blob);const a=document.createElement('a');
      a.href=url;a.download='bigboardlab-mock-draft.png';a.click();URL.revokeObjectURL(url);
    });
  },[picks,userTeams,prospectsMap,getGrade,POS_COLORS,draftGrade]);

  // Formation depth chart component
  const FormationChart=({team})=>{
    const chart=depthChart[team]||{};
    return(
      <svg viewBox="0 0 100 105" style={{width:"100%",maxWidth:280}}>
        <rect x="0" y="0" width="100" height="105" rx="4" fill="#15803d"/>
        {/* Yard lines */}
        {[20,40,58,75,90].map(y=><line key={y} x1="2" y1={y} x2="98" y2={y} stroke="rgba(255,255,255,0.1)" strokeWidth="0.3"/>)}
        {/* LOS */}
        <line x1="2" y1="58" x2="98" y2="58" stroke="#fbbf24" strokeWidth="0.6" strokeDasharray="2,1.5"/>
        <text x="50" y="56" textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="2.2" fontFamily="monospace">LINE OF SCRIMMAGE</text>
        {/* Position dots */}
        {ALL_SLOTS.map(slot=>{
          const pos=FORMATION_POSITIONS[slot];if(!pos)return null;
          const player=chart[slot];
          const filled=!!player;
          const isOff=pos.y>58;
          const dotColor=filled?(isOff?"#4ade80":"#60a5fa"):"rgba(255,255,255,0.25)";
          const lastName=player?player.name.split(" ").pop():"";
          return(
            <g key={slot}>
              <circle cx={pos.x} cy={pos.y} r={filled?2.6:1.8} fill={dotColor} stroke={filled?"#fff":"rgba(255,255,255,0.15)"} strokeWidth="0.3"/>
              <text x={pos.x} y={pos.y-3.5} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="2" fontFamily="monospace" fontWeight="bold">{slot.replace(/\d$/,'')}</text>
              {filled&&<text x={pos.x} y={pos.y+5} textAnchor="middle" fill="#fff" fontSize="2.2" fontWeight="bold" fontFamily="sans-serif">{lastName}</text>}
            </g>
          );
        })}
      </svg>
    );
  };

  // Depth chart list (shows all drafted players per group, not just 1)
  const DepthList=({team})=>{
    const chart=depthChart[team]||{};
    return(
      <div style={{marginTop:6}}>
        {DEPTH_GROUPS.map(group=>{
          const players=group.slots.map(s=>chart[s]).filter(Boolean);
          if(players.length===0)return null;
          return(
            <div key={group.label} style={{marginBottom:4}}>
              <div style={{fontFamily:mono,fontSize:7,color:"rgba(255,255,255,0.35)",letterSpacing:1,textTransform:"uppercase"}}>{group.label}</div>
              {players.map((p,i)=>(
                <div key={i} style={{fontFamily:sans,fontSize:9,color:"#fff",padding:"1px 0",display:"flex",gap:4}}>
                  <span style={{color:"rgba(255,255,255,0.4)",width:14}}>{group.slots[i]}</span>
                  <span style={{fontWeight:i===0?600:400,color:i===0?"#fff":"rgba(255,255,255,0.6)"}}>{p.name}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  };

  // Live needs component
  const LiveNeeds=({team})=>{
    const needs=liveNeeds[team]||{};
    const entries=Object.entries(needs).filter(([,v])=>v>0);
    const base=TEAM_NEEDS_DETAILED?.[team]||{};
    const filled=Object.entries(base).filter(([k])=>!needs[k]||needs[k]===0);
    return(
      <div style={{marginTop:6}}>
        <div style={{fontFamily:mono,fontSize:7,letterSpacing:1.5,color:"rgba(255,255,255,0.35)",textTransform:"uppercase",marginBottom:3}}>needs</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
          {entries.map(([pos,count])=>(
            <span key={pos} style={{fontFamily:mono,fontSize:8,padding:"1px 5px",background:"rgba(239,68,68,0.2)",color:"#fca5a5",border:"1px solid rgba(239,68,68,0.3)",borderRadius:3}}>
              {pos}{count>1?` ×${count}`:""}
            </span>
          ))}
          {filled.map(([pos])=>(
            <span key={pos} style={{fontFamily:mono,fontSize:8,padding:"1px 5px",background:"rgba(34,197,94,0.15)",color:"#86efac",border:"1px solid rgba(34,197,94,0.2)",borderRadius:3,textDecoration:"line-through",opacity:0.5}}>
              {pos} ✓
            </span>
          ))}
        </div>
      </div>
    );
  };

  // How many user picks exist
  const userPickCount=useMemo(()=>picks.filter(p=>p.isUser).length,[picks]);

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
          <div style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:12}}>your team(s)</div>
          <div style={{display:"flex",gap:6,marginBottom:12}}>
            <button onClick={()=>setUserTeams(new Set())} style={{fontFamily:sans,fontSize:11,padding:"5px 12px",background:"transparent",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",color:"#525252"}}>clear</button>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {ALL_TEAMS.sort().map(t=><button key={t} onClick={()=>{if(userTeams.has(t)){toggleTeam(t);}else if(userTeams.size<4){toggleTeam(t);}}} style={{fontFamily:sans,fontSize:11,padding:"5px 12px",background:userTeams.has(t)?"#171717":"transparent",color:userTeams.has(t)?"#faf9f6":"#737373",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6,opacity:!userTeams.has(t)&&userTeams.size>=4?0.3:1}}><NFLTeamLogo team={t} size={16}/>{t}</button>)}
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
            <div style={{display:"flex",gap:6}}>
              {[["slow",1200],["med",600],["fast",200],["instant",50]].map(([label,ms])=><button key={label} onClick={()=>setSpeed(ms)} style={{fontFamily:sans,fontSize:13,fontWeight:speed===ms?700:400,padding:"8px 14px",background:speed===ms?"#171717":"transparent",color:speed===ms?"#faf9f6":"#737373",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer"}}>{label}</button>)}
            </div>
          </div>
        </div>
        <button onClick={startDraft} disabled={userTeams.size===0}
          style={{width:"100%",fontFamily:sans,fontSize:14,fontWeight:700,padding:"14px",background:userTeams.size>0?"#171717":"#d4d4d4",color:"#faf9f6",border:"none",borderRadius:99,cursor:userTeams.size>0?"pointer":"default"}}>
          start draft ({numRounds} round{numRounds>1?"s":""} · {userTeams.size} team{userTeams.size!==1?"s":""})
        </button>
      </div>
    </div>
  );

  const currentPickIdx=picks.length;
  const currentRound=currentPickIdx<totalPicks?fullDraftOrder[currentPickIdx].round:numRounds;
  const currentTeam=currentPickIdx<totalPicks?getPickTeam(currentPickIdx):"";

  // === DRAFT RESULTS ===
  if(showResults&&picks.length>=totalPicks){
    const userPicks=picks.filter(pk=>userTeams.has(pk.team));
    return(
      <div style={{minHeight:"100vh",background:"#faf9f6",fontFamily:font}}>
        <div style={{position:"fixed",top:0,left:0,right:0,zIndex:100,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 16px",background:"#fff",borderBottom:"1px solid #f0f0f0"}}>
          <span style={{fontFamily:mono,fontSize:10,color:"#a3a3a3"}}>draft complete</span>
          <button onClick={onClose} style={{fontFamily:sans,fontSize:10,color:"#a3a3a3",background:"none",border:"1px solid #e5e5e5",borderRadius:99,padding:"3px 10px",cursor:"pointer"}}>✕ exit</button>
        </div>
        <div style={{maxWidth:750,margin:"0 auto",padding:"52px 24px 40px",textAlign:"center"}}>
          <h1 style={{fontSize:36,fontWeight:900,color:"#171717",margin:"0 0 8px"}}>draft complete!</h1>
          {draftGrade&&<div style={{display:"inline-block",padding:"12px 32px",background:"#fff",border:`2px solid ${draftGrade.color}`,borderRadius:16,marginBottom:24}}>
            <div style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase"}}>draft grade</div>
            <div style={{fontFamily:font,fontSize:56,fontWeight:900,color:draftGrade.color,lineHeight:1}}>{draftGrade.grade}</div>
          </div>}
          <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:24}}>
            <button onClick={shareDraft} style={{fontFamily:sans,fontSize:12,fontWeight:600,padding:"8px 20px",background:"#171717",color:"#faf9f6",border:"none",borderRadius:99,cursor:"pointer"}}>📤 share results</button>
            <button onClick={()=>{setSetupDone(false);setPicks([]);setShowResults(false);setTradeMap({});}} style={{fontFamily:sans,fontSize:12,padding:"8px 20px",background:"transparent",color:"#525252",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer"}}>draft again</button>
          </div>
          {[...userTeams].map(team=>{
            const teamPicks=userPicks.filter(pk=>pk.team===team);
            return(
              <div key={team} style={{marginBottom:24,textAlign:"left"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                  <NFLTeamLogo team={team} size={20}/>
                  <span style={{fontFamily:sans,fontSize:14,fontWeight:700,color:"#171717"}}>{team}</span>
                </div>
                <div style={{display:"flex",gap:16,marginBottom:12}}>
                  <div style={{flex:"0 0 180px"}}><FormationChart team={team}/></div>
                  <div style={{flex:1,background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,overflow:"hidden"}}>
                    {teamPicks.map((pk,i)=>{const p=prospectsMap[pk.playerId];if(!p)return null;const c=POS_COLORS[p.pos];const g=getGrade(pk.playerId);const rank=getConsensusRank?getConsensusRank(p.name):pk.pick;const v=pickVerdict(pk.pick,rank);
                      return<div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 14px",borderBottom:"1px solid #f5f5f5"}}>
                        <span style={{fontFamily:mono,fontSize:10,color:"#d4d4d4",width:44}}>Rd{pk.round} #{pk.pick}</span>
                        <span style={{fontFamily:mono,fontSize:10,color:c,width:28}}>{p.pos}</span>
                        <SchoolLogo school={p.school} size={18}/>
                        <span style={{fontFamily:sans,fontSize:12,fontWeight:600,color:"#171717",flex:1}}>{p.name}</span>
                        <span style={{fontFamily:mono,fontSize:8,padding:"1px 6px",background:v.bg,color:v.color,borderRadius:3}}>{v.text}</span>
                        <span style={{fontFamily:font,fontSize:13,fontWeight:900,color:g>=75?"#16a34a":g>=55?"#ca8a04":"#dc2626",width:28,textAlign:"right"}}>{g}</span>
                      </div>;
                    })}
                  </div>
                </div>
              </div>
            );
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
          <button onClick={()=>setShowDepth(!showDepth)} style={{fontFamily:sans,fontSize:10,padding:"3px 10px",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",background:showDepth?"#171717":"transparent",color:showDepth?"#faf9f6":"#a3a3a3"}}>depth chart</button>
          <button onClick={()=>setPaused(!paused)} style={{fontFamily:sans,fontSize:10,padding:"3px 10px",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",background:paused?"#fef3c7":"transparent",color:paused?"#92400e":"#a3a3a3"}}>{paused?"▶ resume":"⏸ pause"}</button>
          <button onClick={onClose} style={{fontFamily:sans,fontSize:10,color:"#a3a3a3",background:"none",border:"1px solid #e5e5e5",borderRadius:99,padding:"3px 10px",cursor:"pointer"}}>✕ exit</button>
        </div>
      </div>

      {/* Per-pick verdict toast */}
      {lastVerdict&&<div style={{position:"fixed",top:44,left:"50%",transform:"translateX(-50%)",zIndex:200,padding:"8px 20px",background:lastVerdict.bg,border:`2px solid ${lastVerdict.color}`,borderRadius:99,display:"flex",alignItems:"center",gap:8,boxShadow:"0 4px 12px rgba(0,0,0,0.1)"}}>
        <span style={{fontFamily:sans,fontSize:13,fontWeight:700,color:lastVerdict.color}}>{lastVerdict.text}</span>
        <span style={{fontFamily:sans,fontSize:11,color:"#525252"}}>{lastVerdict.player} — consensus #{lastVerdict.rank} at pick #{lastVerdict.pick}</span>
      </div>}

      <div style={{display:"flex",gap:12,maxWidth:1400,margin:"0 auto",padding:"44px 12px 20px"}}>
        {/* LEFT: Pick history */}
        <div style={{width:280,flexShrink:0,maxHeight:"calc(100vh - 60px)",overflowY:"auto"}}>
          <div style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:6,padding:"0 4px"}}>picks</div>
          <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,overflow:"hidden"}}>
            {picks.map((pick,i)=>{const p=prospectsMap[pick.playerId];if(!p)return null;const c=POS_COLORS[p.pos];const isUser=userTeams.has(pick.team);
              const showRound=i===0||pick.round!==picks[i-1].round;
              return<div key={i}>{showRound&&<div style={{padding:"5px 10px",background:"#f5f5f5",fontFamily:mono,fontSize:8,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase"}}>round {pick.round}</div>}<div style={{display:"flex",alignItems:"center",gap:5,padding:"5px 10px",borderBottom:"1px solid #f8f8f8",background:isUser?"#22c55e06":"transparent"}}>
                <span style={{fontFamily:mono,fontSize:9,color:"#d4d4d4",width:18,textAlign:"right"}}>{pick.pick}</span>
                <NFLTeamLogo team={pick.team} size={13}/>
                <span style={{fontFamily:mono,fontSize:8,color:c}}>{p.pos}</span>
                <span style={{fontFamily:sans,fontSize:10,fontWeight:isUser?600:400,color:isUser?"#171717":"#737373",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</span>
                {pick.traded&&<span style={{fontFamily:mono,fontSize:7,color:"#a855f7",background:"#a855f708",padding:"1px 4px",borderRadius:2}}>TRADE</span>}
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
          {/* Trade offer */}
          {tradeOffer&&<div style={{background:"#a855f708",border:"2px solid #a855f7",borderRadius:12,padding:"14px 18px",marginBottom:10}}>
            <p style={{fontFamily:sans,fontSize:13,fontWeight:700,color:"#171717",margin:"0 0 4px"}}>📞 Trade offer from {tradeOffer.fromTeam}</p>
            <p style={{fontFamily:sans,fontSize:11,color:"#525252",margin:"0 0 6px"}}>
              They want your pick #{tradeOffer.userPick}. Offering: Rd{tradeOffer.theirRound} #{tradeOffer.theirPick} + Rd{tradeOffer.futureRound} #{tradeOffer.futurePick}
            </p>
            <div style={{marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",fontFamily:mono,fontSize:8,color:"#a3a3a3",marginBottom:2}}>
                <span>your pick: {tradeOffer.userVal} pts</span>
                <span>their offer: {tradeOffer.offerVal} pts</span>
              </div>
              <div style={{height:6,background:"#e5e5e5",borderRadius:3,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${Math.min(100,tradeOffer.offerVal/tradeOffer.userVal*100)}%`,background:tradeOffer.offerVal>=tradeOffer.userVal?"#22c55e":tradeOffer.offerVal>=tradeOffer.userVal*0.9?"#eab308":"#ef4444",borderRadius:3,transition:"width 0.3s"}}/>
              </div>
              <div style={{fontFamily:mono,fontSize:8,color:tradeOffer.offerVal>=tradeOffer.userVal?"#16a34a":"#ca8a04",marginTop:2}}>
                {tradeOffer.offerVal>=tradeOffer.userVal?"FAIR OR BETTER":"SLIGHT UNDERPAY"}
              </div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={acceptTrade} style={{fontFamily:sans,fontSize:11,fontWeight:700,padding:"6px 16px",background:"#a855f7",color:"#fff",border:"none",borderRadius:99,cursor:"pointer"}}>accept</button>
              <button onClick={declineTrade} style={{fontFamily:sans,fontSize:11,padding:"6px 16px",background:"transparent",color:"#737373",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer"}}>decline</button>
            </div>
          </div>}

          {/* On the clock */}
          {isUserPick&&picks.length<totalPicks&&<div style={{background:"#22c55e08",border:"2px solid #22c55e",borderRadius:12,padding:"10px 14px",marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <NFLTeamLogo team={currentTeam} size={22}/>
              <div>
                <p style={{fontFamily:sans,fontSize:13,fontWeight:700,color:"#171717",margin:0}}>You're on the clock — Rd {currentRound} Pick #{picks.length+1}</p>
                <div style={{display:"flex",gap:3,marginTop:3}}>
                  {Object.entries(liveNeeds[currentTeam]||{}).filter(([,v])=>v>0).map(([pos,count])=>(
                    <span key={pos} style={{fontFamily:mono,fontSize:8,padding:"1px 5px",background:`${POS_COLORS[pos]||"#737373"}15`,color:POS_COLORS[pos]||"#737373",borderRadius:3,border:`1px solid ${POS_COLORS[pos]||"#737373"}30`}}>{pos}{count>1?` ×${count}`:""}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>}

          {/* Position filter */}
          <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:6}}>
            <button onClick={()=>setFilterPos(null)} style={{fontFamily:mono,fontSize:10,padding:"4px 10px",background:!filterPos?"#171717":"transparent",color:!filterPos?"#faf9f6":"#a3a3a3",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer"}}>all</button>
            {positions.map(pos=><button key={pos} onClick={()=>setFilterPos(filterPos===pos?null:pos)} style={{fontFamily:mono,fontSize:10,padding:"4px 10px",background:filterPos===pos?POS_COLORS[pos]:"transparent",color:filterPos===pos?"#fff":POS_COLORS[pos],border:`1px solid ${filterPos===pos?POS_COLORS[pos]:"#e5e5e5"}`,borderRadius:99,cursor:"pointer"}}>{pos}</button>)}
          </div>

          {/* Compare bar */}
          {compareList.length>0&&<div style={{background:"#fff",border:"1px solid #3b82f6",borderRadius:8,padding:"6px 10px",marginBottom:6,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
            <span style={{fontFamily:mono,fontSize:8,color:"#3b82f6"}}>COMPARE:</span>
            {compareList.map(p=><span key={p.id} style={{fontFamily:sans,fontSize:10,fontWeight:600,color:"#171717",background:"#3b82f611",padding:"2px 6px",borderRadius:4,cursor:"pointer"}} onClick={()=>toggleCompare(p)}>{p.name} ✕</span>)}
            {compareList.length>=2&&<button onClick={()=>setShowCompare(true)} style={{fontFamily:sans,fontSize:10,fontWeight:700,padding:"3px 10px",background:"#3b82f6",color:"#fff",border:"none",borderRadius:99,cursor:"pointer"}}>compare {compareList.length}</button>}
          </div>}

          {/* Available players */}
          <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,overflow:"hidden",maxHeight:"calc(100vh - 220px)",overflowY:"auto"}}>
            <div style={{padding:"6px 12px",background:"#f9f9f7",borderBottom:"1px solid #e5e5e5",display:"flex",justifyContent:"space-between"}}>
              <span style={{fontFamily:mono,fontSize:8,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase"}}>available ({filteredAvailable.length})</span>
              <span style={{fontFamily:mono,fontSize:8,color:"#a3a3a3"}}>click name = profile · draft button = pick</span>
            </div>
            {filteredAvailable.slice(0,60).map(id=>{const p=prospectsMap[id];if(!p)return null;const g=getGrade(id);const c=POS_COLORS[p.pos];const inCompare=compareList.some(x=>x.id===p.id);const rank=getConsensusRank?getConsensusRank(p.name):null;
              return<div key={id} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderBottom:"1px solid #f8f8f8"}}>
                {rank&&<span style={{fontFamily:mono,fontSize:8,color:"#d4d4d4",width:22,textAlign:"right"}}>#{rank}</span>}
                <span style={{fontFamily:mono,fontSize:9,color:c,width:24}}>{p.pos}</span>
                <SchoolLogo school={p.school} size={16}/>
                <span style={{fontFamily:sans,fontSize:11,fontWeight:600,color:"#171717",flex:1,cursor:"pointer",textDecoration:"none"}}
                  onClick={()=>setProfilePlayer(p)}
                  onMouseEnter={e=>e.currentTarget.style.textDecoration="underline"}
                  onMouseLeave={e=>e.currentTarget.style.textDecoration="none"}>{p.name}</span>
                <span style={{fontFamily:font,fontSize:12,fontWeight:900,color:g>=75?"#16a34a":g>=55?"#ca8a04":"#dc2626",width:24,textAlign:"right"}}>{g}</span>
                <button onClick={()=>toggleCompare(p)} style={{fontFamily:mono,fontSize:7,padding:"2px 5px",background:inCompare?"#3b82f6":"transparent",color:inCompare?"#fff":"#a3a3a3",border:"1px solid #e5e5e5",borderRadius:4,cursor:"pointer"}}>{inCompare?"✓":"+"}</button>
                {isUserPick&&<button onClick={()=>makePick(id)} style={{fontFamily:sans,fontSize:10,fontWeight:700,padding:"3px 10px",background:"#22c55e",color:"#fff",border:"none",borderRadius:6,cursor:"pointer"}}>draft</button>}
              </div>;
            })}
          </div>
        </div>

        {/* RIGHT: Depth chart panel */}
        {showDepth&&<div style={{width:280,flexShrink:0,maxHeight:"calc(100vh - 60px)",overflowY:"auto"}}>
          {[...userTeams].map(team=>(
            <div key={team} style={{background:"#15803d",border:"1px solid #166534",borderRadius:12,padding:"10px",marginBottom:8}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                <NFLTeamLogo team={team} size={16}/>
                <span style={{fontFamily:sans,fontSize:12,fontWeight:700,color:"#fff"}}>{team}</span>
                <span style={{fontFamily:mono,fontSize:8,color:"rgba(255,255,255,0.5)",marginLeft:"auto"}}>{picks.filter(pk=>pk.team===team).length} picks</span>
              </div>
              <FormationChart team={team}/>
              <DepthList team={team}/>
              <LiveNeeds team={team}/>
            </div>
          ))}
        </div>}
      </div>

      {/* Compare overlay */}
      {showCompare&&compareList.length>=2&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setShowCompare(false)}>
        <div style={{background:"#faf9f6",borderRadius:16,padding:24,maxWidth:900,width:"95%",maxHeight:"80vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <h2 style={{fontFamily:font,fontSize:22,fontWeight:900,color:"#171717",margin:0}}>player comparison</h2>
            <button onClick={()=>setShowCompare(false)} style={{fontFamily:sans,fontSize:12,color:"#a3a3a3",background:"none",border:"1px solid #e5e5e5",borderRadius:99,padding:"4px 12px",cursor:"pointer"}}>close</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:`repeat(${compareList.length}, 1fr)`,gap:16}}>
            {compareList.map(p=>{const c=POS_COLORS[p.pos];const posTraits=POSITION_TRAITS[p.pos]||[];const g=getGrade(p.id);const rank=getConsensusRank?getConsensusRank(p.name):null;
              return<div key={p.id} style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:16,textAlign:"center"}}>
                <SchoolLogo school={p.school} size={40}/>
                <div style={{fontFamily:font,fontSize:16,fontWeight:900,color:"#171717",marginTop:8}}>{p.name}</div>
                <div style={{fontFamily:mono,fontSize:10,color:"#a3a3a3"}}>{p.school}</div>
                <span style={{fontFamily:mono,fontSize:10,color:c,background:`${c}11`,padding:"2px 8px",borderRadius:4,border:`1px solid ${c}22`,display:"inline-block",margin:"6px 0"}}>{p.pos}</span>
                {rank&&<div style={{fontFamily:mono,fontSize:9,color:"#a3a3a3"}}>consensus #{rank}</div>}
                <div style={{fontFamily:font,fontSize:32,fontWeight:900,color:g>=75?"#16a34a":g>=55?"#ca8a04":"#dc2626",lineHeight:1,margin:"8px 0"}}>{g}</div>
                <RadarChart traits={posTraits} values={posTraits.map(t=>traits[p.id]?.[t]||50)} color={c} size={140}/>
                <div style={{textAlign:"left",marginTop:8}}>
                  {posTraits.map(t=><div key={t} style={{display:"flex",justifyContent:"space-between",padding:"2px 0"}}>
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

      {/* Player profile overlay */}
      {profilePlayer&&<PlayerProfile player={profilePlayer} traits={traits} setTraits={setTraits} notes={notes} setNotes={setNotes} allProspects={allProspects} getGrade={getGrade} onClose={()=>setProfilePlayer(null)} onSelectPlayer={setProfilePlayer} consensus={CONSENSUS} ratings={ratings}/>}
    </div>
  );
}
