import { useState, useEffect, useCallback, useMemo } from "react";

// Jimmy Johnson Trade Value Chart (picks 1-224)
const JJ_VALUES={1:3000,2:2600,3:2200,4:1800,5:1700,6:1600,7:1500,8:1400,9:1350,10:1300,11:1250,12:1200,13:1150,14:1100,15:1050,16:1000,17:950,18:900,19:875,20:850,21:800,22:780,23:760,24:740,25:720,26:700,27:680,28:660,29:640,30:620,31:600,32:590,33:580,34:560,35:550,36:540,37:530,38:520,39:510,40:500,41:490,42:480,43:470,44:460,45:450,46:440,47:430,48:420,49:410,50:400,51:390,52:380,53:370,54:360,55:350,56:340,57:330,58:320,59:310,60:300,61:292,62:284,63:276,64:270,65:265,66:260,67:255,68:250,69:245,70:240,71:235,72:230,73:225,74:220,75:215,76:210,77:205,78:200,79:195,80:190,81:185,82:180,83:175,84:170,85:165,86:160,87:155,88:150,89:145,90:140,91:136,92:132,93:128,94:124,95:120,96:116,97:112,98:108,99:104,100:100};
function getPickValue(n){return JJ_VALUES[n]||Math.max(10,Math.round(100-((n-100)*0.8)));}

// Depth chart positions
const DEPTH_POS=["QB","RB","WR1","WR2","WR3","TE","LT","LG","C","RG","RT","DE1","DT1","DT2","DE2","LB1","LB2","LB3","CB1","CB2","SS","FS","K"];
const POS_TO_DEPTH={"QB":["QB"],"RB":["RB"],"WR":["WR1","WR2","WR3"],"TE":["TE"],"OL":["LT","LG","C","RG","RT"],"DL":["DE1","DT1","DT2","DE2"],"LB":["LB1","LB2","LB3"],"DB":["CB1","CB2","SS","FS"],"K/P":["K"]};

export default function MockDraftSim({board,getGrade,teamNeeds,draftOrder,onClose,allProspects,PROSPECTS,CONSENSUS,ratings,traits,setTraits,notes,setNotes,POS_COLORS,POSITION_TRAITS,SchoolLogo,NFLTeamLogo,RadarChart,PlayerProfile,font,mono,sans,schoolLogo}){
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
  const[showDepth,setShowDepth]=useState(false);
  const[tradeOffer,setTradeOffer]=useState(null);
  const[showResults,setShowResults]=useState(false);

  const prospectsMap=useMemo(()=>{const m={};PROSPECTS.forEach(p=>m[p.id]=p);return m;},[PROSPECTS]);
  const gradeMap=useMemo(()=>{const m={};board.forEach(p=>m[p.id]=getGrade(p.id));return m;},[board,getGrade]);

  const fullDraftOrder=useMemo(()=>{
    const order=[];
    for(let r=0;r<numRounds;r++){
      const roundOrder=r%2===0?[...draftOrder]:[...draftOrder].reverse();
      roundOrder.forEach(d=>order.push({pick:order.length+1,round:r+1,team:d.team}));
    }
    return order;
  },[numRounds,draftOrder]);

  const totalPicks=fullDraftOrder.length;

  const startDraft=useCallback(()=>{
    setAvailable(board.map(p=>p.id));
    setPicks([]);setSetupDone(true);setShowResults(false);
  },[board]);

  const cpuPick=useCallback((team,avail)=>{
    const needs=teamNeeds[team]||["QB","WR","DL"];
    let best=null,bestScore=-1;
    avail.forEach(id=>{
      const p=prospectsMap[id];if(!p)return;
      const needIdx=needs.indexOf(p.pos);
      const needMult=needIdx===0?3:needIdx===1?2:needIdx===2?1.5:0.8;
      const score=(gradeMap[id]||50)*needMult;
      if(score>bestScore){bestScore=score;best=id;}
    });
    return best||avail[0];
  },[teamNeeds,prospectsMap,gradeMap]);

  const isUserPick=useMemo(()=>{
    const n=picks.length;
    return n<totalPicks&&userTeams.has(fullDraftOrder[n]?.team);
  },[picks,userTeams,fullDraftOrder,totalPicks]);

  const makePick=useCallback((playerId)=>{
    const n=picks.length;if(n>=totalPicks)return;
    const{team,round,pick}=fullDraftOrder[n];
    const newPicks=[...picks,{pick,round,team,playerId}];
    setPicks(newPicks);
    setAvailable(prev=>prev.filter(id=>id!==playerId));
    if(newPicks.length>=totalPicks)setShowResults(true);
  },[picks,fullDraftOrder,totalPicks]);

  // CPU auto-pick
  useEffect(()=>{
    if(!setupDone||picks.length>=totalPicks||paused)return;
    const n=picks.length;const team=fullDraftOrder[n]?.team;
    if(userTeams.has(team))return;
    const timer=setTimeout(()=>{
      const pid=cpuPick(team,available);
      if(pid)makePick(pid);
    },speed);
    return()=>clearTimeout(timer);
  },[picks,paused,available,userTeams,cpuPick,makePick,speed,setupDone,fullDraftOrder,totalPicks]);

  // CPU trade offers (rounds 1-3, teams 3-16 picks behind user)
  useEffect(()=>{
    if(!isUserPick||tradeOffer||picks.length>=totalPicks)return;
    const userPickNum=picks.length;
    const userPickVal=getPickValue(userPickNum+1);
    // Look for CPU teams that might want to trade up
    const candidates=[];
    for(let i=userPickNum+3;i<Math.min(userPickNum+16,totalPicks);i++){
      const t=fullDraftOrder[i];
      if(t&&!userTeams.has(t.team)&&t.round<=3){
        candidates.push({idx:i,...t});
      }
    }
    if(candidates.length>0&&Math.random()<0.35){
      const trader=candidates[Math.floor(Math.random()*candidates.length)];
      const theirVal=getPickValue(trader.pick);
      // They offer their pick + a future round pick
      const futureRound=trader.round+2;
      const futurePick=trader.pick+64;
      const offerVal=theirVal+getPickValue(futurePick);
      if(offerVal>=userPickVal*0.95){
        setTradeOffer({fromTeam:trader.team,theirPick:trader.pick,theirRound:trader.round,futurePick,futureRound,userPick:userPickNum+1});
      }
    }
  },[isUserPick,picks,tradeOffer,totalPicks,fullDraftOrder,userTeams]);

  const acceptTrade=useCallback(()=>{
    if(!tradeOffer)return;
    // Swap: user gets their pick position, they get user's current position
    // For simplicity: skip user's current pick (CPU picks for the trading team) and user picks at the traded position
    const cpuTeam=tradeOffer.fromTeam;
    const pid=cpuPick(cpuTeam,available);
    if(pid){
      const n=picks.length;
      const{team,round,pick}=fullDraftOrder[n];
      setPicks(prev=>[...prev,{pick,round,team:cpuTeam,playerId:pid,traded:true}]);
      setAvailable(prev=>prev.filter(id=>id!==pid));
    }
    setTradeOffer(null);
  },[tradeOffer,cpuPick,available,picks,fullDraftOrder]);

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

  // Depth chart for user teams
  const depthChart=useMemo(()=>{
    const chart={};
    [...userTeams].forEach(team=>{
      chart[team]={};
      const teamPicks=picks.filter(pk=>pk.team===team);
      teamPicks.forEach(pk=>{
        const p=prospectsMap[pk.playerId];if(!p)return;
        const slots=POS_TO_DEPTH[p.pos]||[];
        for(const slot of slots){
          if(!chart[team][slot]){chart[team][slot]=p;break;}
        }
      });
    });
    return chart;
  },[picks,userTeams,prospectsMap]);

  // Draft grade calculation
  const draftGrade=useMemo(()=>{
    if(picks.length<totalPicks)return null;
    const userPicks=picks.filter(pk=>userTeams.has(pk.team));
    if(userPicks.length===0)return null;
    let totalValue=0;
    userPicks.forEach(pk=>{
      const g=gradeMap[pk.playerId]||50;
      const pickVal=getPickValue(pk.pick);
      const expectedGrade=Math.max(30,90-(pk.pick*0.25));
      const valueDiff=g-expectedGrade;
      totalValue+=valueDiff;
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
  },[picks,userTeams,gradeMap,totalPicks]);

  // Share draft results image
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
      a.href=url;a.download='my-mock-draft.png';a.click();URL.revokeObjectURL(url);
    });
  },[picks,userTeams,prospectsMap,getGrade,POS_COLORS,draftGrade]);

  // Filtered available players
  const filteredAvailable=useMemo(()=>{
    if(!filterPos)return available;
    return available.filter(id=>{const p=prospectsMap[id];return p&&p.pos===filterPos;});
  },[available,filterPos,prospectsMap]);

  const positions=["QB","RB","WR","TE","OL","DL","LB","DB","K/P"];

  // === SETUP SCREEN ===
  if(!setupDone)return(
    <div style={{minHeight:"100vh",background:"#faf9f6",fontFamily:font}}>
      <div style={{position:"fixed",top:0,left:0,right:0,zIndex:100,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 16px",background:"#fff",borderBottom:"1px solid #f0f0f0"}}>
        <span style={{fontFamily:mono,fontSize:10,color:"#a3a3a3"}}>mock draft setup</span>
        <button onClick={onClose} style={{fontFamily:sans,fontSize:10,color:"#a3a3a3",background:"none",border:"1px solid #e5e5e5",borderRadius:99,padding:"3px 10px",cursor:"pointer"}}>✕ exit</button>
      </div>
      <div style={{maxWidth:600,margin:"0 auto",padding:"52px 24px 40px"}}>
        <h1 style={{fontSize:28,fontWeight:900,color:"#171717",margin:"0 0 24px"}}>mock draft setup</h1>
        <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"20px 24px",marginBottom:16}}>
          <div style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:12}}>your team(s)</div>
          <div style={{display:"flex",gap:6,marginBottom:12}}>
            <button onClick={()=>setUserTeams(new Set(ALL_TEAMS))} style={{fontFamily:sans,fontSize:11,padding:"5px 12px",background:"transparent",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",color:"#525252"}}>select all</button>
            <button onClick={()=>setUserTeams(new Set())} style={{fontFamily:sans,fontSize:11,padding:"5px 12px",background:"transparent",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",color:"#525252"}}>clear</button>
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
            <div style={{display:"flex",gap:6}}>
              {[["slow",1200],["med",600],["fast",200]].map(([label,ms])=><button key={label} onClick={()=>setSpeed(ms)} style={{fontFamily:sans,fontSize:13,fontWeight:speed===ms?700:400,padding:"8px 14px",background:speed===ms?"#171717":"transparent",color:speed===ms?"#faf9f6":"#737373",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer"}}>{label}</button>)}
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

  const currentRound=picks.length<totalPicks?fullDraftOrder[picks.length].round:numRounds;
  const currentTeam=picks.length<totalPicks?fullDraftOrder[picks.length].team:"";

  // === DRAFT RESULTS ===
  if(showResults&&picks.length>=totalPicks){
    const userPicks=picks.filter(pk=>userTeams.has(pk.team));
    return(
      <div style={{minHeight:"100vh",background:"#faf9f6",fontFamily:font}}>
        <div style={{position:"fixed",top:0,left:0,right:0,zIndex:100,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 16px",background:"#fff",borderBottom:"1px solid #f0f0f0"}}>
          <span style={{fontFamily:mono,fontSize:10,color:"#a3a3a3"}}>draft complete</span>
          <button onClick={onClose} style={{fontFamily:sans,fontSize:10,color:"#a3a3a3",background:"none",border:"1px solid #e5e5e5",borderRadius:99,padding:"3px 10px",cursor:"pointer"}}>✕ exit</button>
        </div>
        <div style={{maxWidth:700,margin:"0 auto",padding:"52px 24px 40px",textAlign:"center"}}>
          <h1 style={{fontSize:36,fontWeight:900,color:"#171717",margin:"0 0 8px"}}>draft complete!</h1>
          {draftGrade&&<div style={{display:"inline-block",padding:"12px 32px",background:"#fff",border:`2px solid ${draftGrade.color}`,borderRadius:16,marginBottom:24}}>
            <div style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase"}}>draft grade</div>
            <div style={{fontFamily:font,fontSize:56,fontWeight:900,color:draftGrade.color,lineHeight:1}}>{draftGrade.grade}</div>
          </div>}
          <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:24}}>
            <button onClick={shareDraft} style={{fontFamily:sans,fontSize:12,fontWeight:600,padding:"8px 20px",background:"#171717",color:"#faf9f6",border:"none",borderRadius:99,cursor:"pointer"}}>📤 share results</button>
            <button onClick={()=>{setSetupDone(false);setPicks([]);setShowResults(false);}} style={{fontFamily:sans,fontSize:12,padding:"8px 20px",background:"transparent",color:"#525252",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer"}}>draft again</button>
          </div>
          <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,overflow:"hidden",textAlign:"left"}}>
            {userPicks.map((pk,i)=>{const p=prospectsMap[pk.playerId];if(!p)return null;const c=POS_COLORS[p.pos];const g=getGrade(pk.playerId);
              return<div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 16px",borderBottom:"1px solid #f5f5f5"}}>
                <span style={{fontFamily:mono,fontSize:11,color:"#d4d4d4",width:40}}>Rd{pk.round} #{pk.pick}</span>
                <NFLTeamLogo team={pk.team} size={18}/>
                <span style={{fontFamily:mono,fontSize:10,color:c,width:28}}>{p.pos}</span>
                <SchoolLogo school={p.school} size={20}/>
                <span style={{fontFamily:sans,fontSize:13,fontWeight:600,color:"#171717",flex:1}}>{p.name}</span>
                <span style={{fontFamily:font,fontSize:14,fontWeight:900,color:g>=75?"#16a34a":g>=55?"#ca8a04":"#dc2626"}}>{g}</span>
              </div>;
            })}
          </div>
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
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setShowDepth(!showDepth)} style={{fontFamily:sans,fontSize:10,padding:"3px 10px",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",background:showDepth?"#171717":"transparent",color:showDepth?"#faf9f6":"#a3a3a3"}}>depth chart</button>
          <button onClick={()=>setPaused(!paused)} style={{fontFamily:sans,fontSize:10,padding:"3px 10px",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer",background:paused?"#fef3c7":"transparent",color:paused?"#92400e":"#a3a3a3"}}>{paused?"▶ resume":"⏸ pause"}</button>
          <button onClick={onClose} style={{fontFamily:sans,fontSize:10,color:"#a3a3a3",background:"none",border:"1px solid #e5e5e5",borderRadius:99,padding:"3px 10px",cursor:"pointer"}}>✕ exit</button>
        </div>
      </div>

      <div style={{display:"flex",gap:16,maxWidth:1200,margin:"0 auto",padding:"44px 16px 20px"}}>
        {/* LEFT: Pick history */}
        <div style={{width:320,flexShrink:0,maxHeight:"calc(100vh - 60px)",overflowY:"auto"}}>
          <div style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:8,padding:"0 4px"}}>picks</div>
          <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,overflow:"hidden"}}>
            {picks.map((pick,i)=>{const p=prospectsMap[pick.playerId];if(!p)return null;const c=POS_COLORS[p.pos];const isUser=userTeams.has(pick.team);
              const showRound=i===0||pick.round!==picks[i-1].round;
              return<div key={i}>{showRound&&<div style={{padding:"6px 12px",background:"#f5f5f5",fontFamily:mono,fontSize:9,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase"}}>round {pick.round}</div>}<div style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderBottom:"1px solid #f8f8f8",background:isUser?"#22c55e06":"transparent",fontSize:12}}>
                <span style={{fontFamily:mono,fontSize:10,color:"#d4d4d4",width:20,textAlign:"right"}}>{pick.pick}</span>
                <NFLTeamLogo team={pick.team} size={14}/>
                <span style={{fontFamily:mono,fontSize:9,color:c}}>{p.pos}</span>
                <span style={{fontFamily:sans,fontSize:11,fontWeight:isUser?600:400,color:isUser?"#171717":"#737373",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</span>
                {pick.traded&&<span style={{fontFamily:mono,fontSize:8,color:"#a855f7"}}>TRADE</span>}
              </div></div>;
            })}
            {picks.length<totalPicks&&<div style={{padding:"10px 12px",display:"flex",alignItems:"center",gap:6}}>
              <NFLTeamLogo team={currentTeam} size={14}/>
              <span style={{fontFamily:mono,fontSize:10,color:"#a3a3a3"}}>#{picks.length+1} {currentTeam}...</span>
            </div>}
          </div>
        </div>

        {/* CENTER: Available players + on the clock */}
        <div style={{flex:1,minWidth:0}}>
          {/* Trade offer */}
          {tradeOffer&&<div style={{background:"#a855f708",border:"2px solid #a855f7",borderRadius:12,padding:"14px 18px",marginBottom:12}}>
            <p style={{fontFamily:sans,fontSize:13,fontWeight:700,color:"#171717",margin:"0 0 6px"}}>📞 Trade offer from {tradeOffer.fromTeam}</p>
            <p style={{fontFamily:sans,fontSize:12,color:"#525252",margin:"0 0 10px"}}>
              They want your pick #{tradeOffer.userPick}. Offering: Rd{tradeOffer.theirRound} #{tradeOffer.theirPick} + Rd{tradeOffer.futureRound} #{tradeOffer.futurePick}
            </p>
            <div style={{display:"flex",gap:8}}>
              <button onClick={acceptTrade} style={{fontFamily:sans,fontSize:12,fontWeight:700,padding:"6px 16px",background:"#a855f7",color:"#fff",border:"none",borderRadius:99,cursor:"pointer"}}>accept</button>
              <button onClick={declineTrade} style={{fontFamily:sans,fontSize:12,padding:"6px 16px",background:"transparent",color:"#737373",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer"}}>decline</button>
            </div>
          </div>}

          {/* On the clock */}
          {isUserPick&&picks.length<totalPicks&&<div style={{background:"#22c55e08",border:"2px solid #22c55e",borderRadius:12,padding:"12px 16px",marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
              <NFLTeamLogo team={currentTeam} size={24}/>
              <div>
                <p style={{fontFamily:sans,fontSize:14,fontWeight:700,color:"#171717",margin:0}}>You're on the clock — Rd {currentRound} Pick #{picks.length+1}</p>
                <p style={{fontFamily:mono,fontSize:10,color:"#a3a3a3",margin:0}}>needs: {(teamNeeds[currentTeam]||[]).join(", ")}</p>
              </div>
            </div>
          </div>}

          {/* Position filter */}
          <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>
            <button onClick={()=>setFilterPos(null)} style={{fontFamily:mono,fontSize:10,padding:"4px 10px",background:!filterPos?"#171717":"transparent",color:!filterPos?"#faf9f6":"#a3a3a3",border:"1px solid #e5e5e5",borderRadius:99,cursor:"pointer"}}>all</button>
            {positions.map(pos=><button key={pos} onClick={()=>setFilterPos(filterPos===pos?null:pos)} style={{fontFamily:mono,fontSize:10,padding:"4px 10px",background:filterPos===pos?POS_COLORS[pos]:"transparent",color:filterPos===pos?"#fff":POS_COLORS[pos],border:`1px solid ${filterPos===pos?POS_COLORS[pos]:"#e5e5e5"}`,borderRadius:99,cursor:"pointer"}}>{pos}</button>)}
          </div>

          {/* Compare bar */}
          {compareList.length>0&&<div style={{background:"#fff",border:"1px solid #3b82f6",borderRadius:8,padding:"8px 12px",marginBottom:8,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <span style={{fontFamily:mono,fontSize:9,color:"#3b82f6"}}>COMPARE:</span>
            {compareList.map(p=><span key={p.id} style={{fontFamily:sans,fontSize:11,fontWeight:600,color:"#171717",background:"#3b82f611",padding:"2px 8px",borderRadius:4,cursor:"pointer"}} onClick={()=>toggleCompare(p)}>{p.name} ✕</span>)}
            {compareList.length>=2&&<button onClick={()=>setShowCompare(true)} style={{fontFamily:sans,fontSize:10,fontWeight:700,padding:"4px 12px",background:"#3b82f6",color:"#fff",border:"none",borderRadius:99,cursor:"pointer"}}>compare {compareList.length}</button>}
          </div>}

          {/* Available players list */}
          <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,overflow:"hidden",maxHeight:"calc(100vh - 200px)",overflowY:"auto"}}>
            <div style={{padding:"8px 14px",background:"#f9f9f7",borderBottom:"1px solid #e5e5e5",display:"flex",justifyContent:"space-between"}}>
              <span style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase"}}>available ({filteredAvailable.length})</span>
              <span style={{fontFamily:mono,fontSize:9,color:"#a3a3a3"}}>click name = profile · draft button = pick</span>
            </div>
            {filteredAvailable.slice(0,50).map(id=>{const p=prospectsMap[id];if(!p)return null;const g=getGrade(id);const c=POS_COLORS[p.pos];const inCompare=compareList.some(x=>x.id===p.id);
              return<div key={id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 14px",borderBottom:"1px solid #f8f8f8"}}>
                <span style={{fontFamily:mono,fontSize:10,color:c,width:28}}>{p.pos}</span>
                <SchoolLogo school={p.school} size={18}/>
                <span style={{fontFamily:sans,fontSize:12,fontWeight:600,color:"#171717",flex:1,cursor:"pointer",textDecoration:"none"}}
                  onClick={()=>setProfilePlayer(p)}
                  onMouseEnter={e=>e.currentTarget.style.textDecoration="underline"}
                  onMouseLeave={e=>e.currentTarget.style.textDecoration="none"}>{p.name}</span>
                <span style={{fontFamily:font,fontSize:13,fontWeight:900,color:g>=75?"#16a34a":g>=55?"#ca8a04":"#dc2626",width:28,textAlign:"right"}}>{g}</span>
                <button onClick={()=>toggleCompare(p)} style={{fontFamily:mono,fontSize:8,padding:"2px 6px",background:inCompare?"#3b82f6":"transparent",color:inCompare?"#fff":"#a3a3a3",border:"1px solid #e5e5e5",borderRadius:4,cursor:"pointer"}}>{inCompare?"✓":"+"}</button>
                {isUserPick&&<button onClick={()=>makePick(id)} style={{fontFamily:sans,fontSize:10,fontWeight:700,padding:"4px 12px",background:"#22c55e",color:"#fff",border:"none",borderRadius:6,cursor:"pointer"}}>draft</button>}
              </div>;
            })}
          </div>
        </div>

        {/* RIGHT: Depth chart */}
        {showDepth&&<div style={{width:240,flexShrink:0,maxHeight:"calc(100vh - 60px)",overflowY:"auto"}}>
          <div style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:"#a3a3a3",textTransform:"uppercase",marginBottom:8}}>depth chart</div>
          {[...userTeams].map(team=><div key={team} style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"12px 14px",marginBottom:8}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}><NFLTeamLogo team={team} size={16}/><span style={{fontFamily:sans,fontSize:12,fontWeight:700,color:"#171717"}}>{team}</span></div>
            {DEPTH_POS.map(slot=>{
              const p=depthChart[team]?.[slot];
              return<div key={slot} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"3px 0",borderBottom:"1px solid #f5f5f5"}}>
                <span style={{fontFamily:mono,fontSize:9,color:"#a3a3a3",width:32}}>{slot}</span>
                {p?<span style={{fontFamily:sans,fontSize:11,color:"#171717",flex:1}}>{p.name}</span>:<span style={{fontFamily:sans,fontSize:10,color:"#d4d4d4",flex:1,fontStyle:"italic"}}>—</span>}
              </div>;
            })}
          </div>)}
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
            {compareList.map(p=>{const c=POS_COLORS[p.pos];const posTraits=POSITION_TRAITS[p.pos]||[];const g=getGrade(p.id);
              return<div key={p.id} style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:16,textAlign:"center"}}>
                <SchoolLogo school={p.school} size={40}/>
                <div style={{fontFamily:font,fontSize:16,fontWeight:900,color:"#171717",marginTop:8}}>{p.name}</div>
                <div style={{fontFamily:mono,fontSize:10,color:"#a3a3a3"}}>{p.school}</div>
                <span style={{fontFamily:mono,fontSize:10,color:c,background:`${c}11`,padding:"2px 8px",borderRadius:4,border:`1px solid ${c}22`,display:"inline-block",margin:"6px 0"}}>{p.pos}</span>
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
