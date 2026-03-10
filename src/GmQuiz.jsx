import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabase.js";
import { QUIZ_QUESTIONS, scoreQuiz, GM_DATA } from "./gmQuizData.js";
import { TEAM_PROFILES } from "./draftConfig.js";
import { CONSENSUS_BOARD, getConsensusRank } from "./consensusData.js";
import { NFL_TEAM_COLORS, NFL_TEAM_ABR, NFL_TEAM_ESPN } from "./teamConfig.js";
import { POS_COLORS, TRAIT_EMOJI } from "./positions.js";
import { PROSPECTS_RAW } from "./prospects.js";
import { TEAM_NEEDS_SIMPLE } from "./teamNeedsData.js";

const font = `'Literata',Georgia,serif`;
const mono = `'DM Mono','Courier New',monospace`;
const sans = `'DM Sans','Helvetica Neue',sans-serif`;

const STORAGE_KEY = "bbl_gm_quiz_answers";

function loadImg(src, timeout = 3000) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = () => rej();
    setTimeout(rej, timeout);
    img.src = src;
  });
}

function nflLogoUrl(team) {
  const id = NFL_TEAM_ESPN[team];
  return id ? `https://a.espncdn.com/i/teamlogos/nfl/500/${id}.png` : null;
}

// ============================================================
// Sub-components
// ============================================================

function QuizIntro({ onStart }) {
  return (
    <div style={{ minHeight: "100vh", background: "#faf9f6", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", textAlign: "center" }}>
      <img src="/logo.png" alt="Big Board Lab" style={{ width: 80, height: "auto", marginBottom: 8 }} />
      <h2 style={{ fontFamily: font, fontSize: 20, fontWeight: 900, letterSpacing: -1, color: "#171717", margin: "0 0 4px" }}>big board lab</h2>
      <p style={{ fontFamily: mono, fontSize: 9, letterSpacing: 1.5, color: "#a3a3a3", textTransform: "uppercase", margin: "0 0 28px" }}>2026 NFL Draft</p>
      <h1 style={{ fontFamily: font, fontSize: 44, fontWeight: 900, lineHeight: 0.95, color: "#171717", margin: "0 0 16px", letterSpacing: -2, maxWidth: 480 }}>Which NFL GM<br/>Are You?</h1>
      <p style={{ fontFamily: sans, fontSize: 16, color: "#525252", lineHeight: 1.5, maxWidth: 420, margin: "0 auto 36px" }}>
        10 draft scenarios. 4 choices each. We'll match you to one of 32 real NFL front offices.
      </p>
      <button onClick={onStart} style={{ fontFamily: sans, fontSize: 15, fontWeight: 700, padding: "14px 44px", background: "#171717", color: "#fff", border: "none", borderRadius: 99, cursor: "pointer", transition: "transform 0.1s" }}
        onMouseDown={e => e.currentTarget.style.transform = "scale(0.97)"}
        onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
        onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
        {"\ud83c\udfc8"} Start Quiz
      </button>
      <p style={{ fontFamily: sans, fontSize: 12, color: "#a3a3a3", marginTop: 16 }}>Free &middot; takes 2 minutes</p>
    </div>
  );
}

function QuizQuestion({ question, index, total, onAnswer }) {
  const [selected, setSelected] = useState(null);

  const handleSelect = (optIdx) => {
    setSelected(optIdx);
    setTimeout(() => onAnswer(question.options[optIdx].deltas), 350);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#faf9f6", display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 24px 60px" }}>
      {/* BBL header */}
      <div style={{ width: "100%", maxWidth: 520, display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <img src="/logo.png" alt="Big Board Lab" style={{ width: 28, height: "auto" }} />
        <span style={{ fontFamily: font, fontSize: 14, fontWeight: 900, letterSpacing: -0.5, color: "#171717" }}>big board lab</span>
        <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: 1, color: "#a3a3a3", textTransform: "uppercase", marginLeft: 4 }}>GM Quiz</span>
      </div>
      {/* Progress */}
      <div style={{ width: "100%", maxWidth: 520, marginBottom: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontFamily: mono, fontSize: 11, color: "#a3a3a3", letterSpacing: 1 }}>QUESTION {index + 1} / {total}</span>
        </div>
        <div style={{ width: "100%", height: 3, background: "#e5e5e5", borderRadius: 99 }}>
          <div style={{ width: `${((index + 1) / total) * 100}%`, height: "100%", background: "linear-gradient(90deg, #ec4899, #7c3aed)", borderRadius: 99, transition: "width 0.3s ease" }} />
        </div>
      </div>

      {/* Question */}
      <div style={{ maxWidth: 520, width: "100%", marginBottom: 28 }}>
        <h2 style={{ fontFamily: font, fontSize: 22, fontWeight: 700, color: "#171717", lineHeight: 1.35, margin: 0 }}>
          {question.question}
        </h2>
      </div>

      {/* Options */}
      <div style={{ maxWidth: 520, width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
        {question.options.map((opt, i) => {
          const isSelected = selected === i;
          return (
            <button key={i} onClick={() => selected === null && handleSelect(i)}
              style={{
                fontFamily: sans, fontSize: 14, fontWeight: 500, lineHeight: 1.4,
                padding: "16px 20px", textAlign: "left",
                background: isSelected ? "#171717" : "#fff",
                color: isSelected ? "#fff" : "#171717",
                border: isSelected ? "1.5px solid #171717" : "1.5px solid #e5e5e5",
                borderRadius: 12, cursor: selected === null ? "pointer" : "default",
                transition: "all 0.15s",
                opacity: selected !== null && !isSelected ? 0.5 : 1,
              }}
              onMouseEnter={e => { if (selected === null) e.currentTarget.style.borderColor = "#a3a3a3"; }}
              onMouseLeave={e => { if (selected === null) e.currentTarget.style.borderColor = "#e5e5e5"; }}>
              {opt.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function QuizAuthGate({ NFLTeamLogo }) {
  const [error, setError] = useState("");
  const heroTeams = ["Raiders","Jets","Cardinals","Titans","Giants","Browns","Commanders","Saints"];

  const handleGoogle = async () => {
    try { sessionStorage.setItem("authSource", "gm-quiz"); } catch (e) {}
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/gm" }
    });
    if (err) setError(err.message);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#faf9f6" }}>
      {/* Hero — visual matching illustration */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 24px 0", textAlign: "center" }}>
        <img src="/logo.png" alt="Big Board Lab" style={{ width: 56, height: "auto", marginBottom: 6 }} />
        <h2 style={{ fontFamily: font, fontSize: 18, fontWeight: 900, letterSpacing: -1, color: "#171717", margin: "0 0 4px" }}>big board lab</h2>
        <p style={{ fontFamily: mono, fontSize: 9, letterSpacing: 1.5, color: "#a3a3a3", textTransform: "uppercase", margin: "0 0 20px" }}>2026 NFL Draft</p>

        {/* Matching illustration — user profile → team logos */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
          {/* User profile icon */}
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#f5f3ff", border: "2px solid #ede9fe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          {/* Arrow with connecting lines */}
          <svg width="48" height="24" viewBox="0 0 48 24" style={{ flexShrink: 0 }}>
            <line x1="0" y1="12" x2="36" y2="12" stroke="#d4d4d4" strokeWidth="2" strokeDasharray="3,3"/>
            <polygon points="36,6 48,12 36,18" fill="#7c3aed"/>
          </svg>
          {/* Team logos cluster */}
          <div style={{ display: "flex", gap: -4, flexShrink: 0 }}>
            {["Chiefs","Packers","Lions"].map((t,i) => (
              <div key={t} style={{ width: 40, height: 40, borderRadius: "50%", background: "#fff", border: "2px solid #e5e5e5", display: "flex", alignItems: "center", justifyContent: "center", marginLeft: i > 0 ? -8 : 0, zIndex: 3 - i, position: "relative" }}>
                <NFLTeamLogo team={t} size={22}/>
              </div>
            ))}
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#f5f5f5", border: "2px solid #e5e5e5", display: "flex", alignItems: "center", justifyContent: "center", marginLeft: -8, zIndex: 0, position: "relative" }}>
              <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, color: "#a3a3a3" }}>+29</span>
            </div>
          </div>
        </div>

        <h2 style={{ fontFamily: font, fontSize: 28, fontWeight: 900, color: "#171717", margin: "0 0 8px", letterSpacing: -1 }}>
          Your GM match is ready
        </h2>
        <p style={{ fontFamily: sans, fontSize: 15, color: "#525252", lineHeight: 1.5, margin: "0 0 8px", maxWidth: 400 }}>
          Sign in to see which GM you draft like — and which 2026 prospects your front office would target.
        </p>
        <p style={{ fontFamily: sans, fontSize: 13, color: "#737373", lineHeight: 1.5, margin: "0 0 28px", maxWidth: 400 }}>
          Your account also unlocks the full draft toolkit: mock drafts with 32 AI GMs, trait grading, prospect rankings, and more.
        </p>
      </div>

      {/* Sign In */}
      <div style={{ maxWidth: 400, margin: "0 auto", padding: "0 24px 24px" }}>
        <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 16, padding: 24 }}>
          <button onClick={handleGoogle}
            style={{ width: "100%", fontFamily: sans, fontSize: 14, fontWeight: 700, padding: "14px", background: "#fff", color: "#171717", border: "1px solid #e5e5e5", borderRadius: 99, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 8, transition: "background 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.background = "#f5f5f5"} onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            continue with Google
          </button>
          {error && <p style={{ fontFamily: sans, fontSize: 12, color: "#dc2626", marginBottom: 4, textAlign: "center" }}>{error}</p>}
          <p style={{ fontFamily: sans, fontSize: 11, color: "#a3a3a3", margin: "4px 0 0", textAlign: "center" }}>free &middot; takes 2 seconds</p>
        </div>
      </div>

      {/* Feature Cards — exact homepage replicas */}
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "20px 24px 48px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>

        {/* 32 AI GMs */}
        <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 12, padding: "20px 22px" }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontFamily: sans, fontSize: 13, fontWeight: 700, color: "#171717", marginBottom: 4 }}>32 AI GMs with real tendencies</div>
            <div style={{ fontFamily: sans, fontSize: 12, color: "#737373", lineHeight: 1.45 }}>Each CPU team drafts differently based on real needs and front office style.</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
            {heroTeams.map(t => <div key={t} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: 4 }}>
              <NFLTeamLogo team={t} size={20}/>
              <span style={{ fontFamily: mono, fontSize: 7, color: "#a3a3a3", fontWeight: 600 }}>{NFL_TEAM_ABR[t]}</span>
            </div>)}
          </div>
        </div>

        {/* Trait grading */}
        <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 12, padding: "20px 22px" }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontFamily: sans, fontSize: 13, fontWeight: 700, color: "#171717", marginBottom: 4 }}>Spider charts & trait grading</div>
            <div style={{ fontFamily: sans, fontSize: 12, color: "#737373", lineHeight: 1.45 }}>Dial in traits and watch radar charts and grades update in real time.</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0 }}>
              {[{label:"ACC",v:82},{label:"ARM",v:75},{label:"AWR",v:68},{label:"MOB",v:72}].map(row => <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontFamily: mono, fontSize: 7, fontWeight: 600, color: "#a3a3a3", width: 24, textAlign: "right", flexShrink: 0 }}>{row.label}</span>
                <div style={{ flex: 1, height: 4, background: "#f0f0f0", borderRadius: 99, overflow: "hidden" }}><div style={{ width: `${row.v}%`, height: "100%", background: "linear-gradient(90deg,#ec4899,#7c3aed)", borderRadius: 99 }}/></div>
                <span style={{ fontFamily: mono, fontSize: 7, fontWeight: 700, color: "#525252", width: 16, textAlign: "right" }}>{row.v}</span>
              </div>)}
            </div>
            {/* Mini radar SVG */}
            <svg width={90} height={90} viewBox="0 0 90 90" style={{ flexShrink: 0 }}>
              {[50,70,90].map(lv => { const r = ((lv - 40) / 60) * 32; return <polygon key={lv} points={[0,1,2,3,4,5].map(i => { const a = Math.PI * 2 * i / 6 - Math.PI / 2; return `${45+r*Math.cos(a)},${45+r*Math.sin(a)}`; }).join(" ")} fill="none" stroke={lv === 70 ? "#d4d4d4" : "#e5e5e5"} strokeWidth={lv === 70 ? 0.8 : 0.5}/>; })}
              <polygon points={[82,75,68,72,78,65].map((v,i) => { const r = Math.max(0, ((v - 40) / 60)) * 32; const a = Math.PI * 2 * i / 6 - Math.PI / 2; return `${45+r*Math.cos(a)},${45+r*Math.sin(a)}`; }).join(" ")} fill="#1e3a5f18" stroke="#1e3a5f" strokeWidth="2"/>
            </svg>
          </div>
        </div>

        {/* Trait filtering */}
        <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 12, padding: "20px 22px" }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontFamily: sans, fontSize: 13, fontWeight: 700, color: "#171717", marginBottom: 4 }}>Filter by elite traits</div>
            <div style={{ fontFamily: sans, fontSize: 12, color: "#737373", lineHeight: 1.45 }}>Find the best pass rushers, ball hawks, or route runners across every position.</div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center", marginBottom: 8 }}>
            {["Pass Rush","Speed","Man Coverage","Hands"].map(t => <span key={t} style={{ fontFamily: sans, fontSize: 9, fontWeight: 600, color: "#7c3aed", background: "#f5f3ff", border: "1px solid #ede9fe", borderRadius: 99, padding: "3px 8px", display: "inline-flex", alignItems: "center", gap: 3 }}>
              <span style={{ fontSize: 9 }}>{TRAIT_EMOJI[t]}</span>{t}
            </span>)}
          </div>
          <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid #f0f0f0" }}>
            {[{name:"Bain Jr.",pos:"EDGE",val:92},{name:"Parker",pos:"EDGE",val:88},{name:"Bailey",pos:"DL",val:85}].map((p,i) => { const c = POS_COLORS[p.pos]; return <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", borderBottom: i < 2 ? "1px solid #f5f5f5" : "none" }}>
              <span style={{ fontFamily: mono, fontSize: 8, fontWeight: 700, color: c, background: `${c}0d`, padding: "1px 6px", borderRadius: 99 }}>{p.pos}</span>
              <span style={{ fontFamily: sans, fontSize: 11, fontWeight: 600, color: "#171717", flex: 1 }}>{p.name}</span>
              <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, color: "#7c3aed" }}>{p.val}</span>
            </div>; })}
          </div>
        </div>

        {/* Depth charts */}
        <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 12, padding: "20px 22px" }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontFamily: sans, fontSize: 13, fontWeight: 700, color: "#171717", marginBottom: 4 }}>Live depth chart updates</div>
            <div style={{ fontFamily: sans, fontSize: 12, color: "#737373", lineHeight: 1.45 }}>Every pick lands on the roster in real time. Watch starters get displaced.</div>
          </div>
          <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid #f0f0f0" }}>
            {[{slot:"QB1",name:"F. Mendoza",draft:true},{slot:"EDGE1",name:"K. Mack"},{slot:"CB2",name:"A. Terrell",draft:true}].map((r,i) => <div key={r.slot} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", borderBottom: i < 2 ? "1px solid #f5f5f5" : "none", background: r.draft ? "rgba(34,197,94,0.04)" : "transparent" }}>
              <span style={{ fontFamily: mono, fontSize: 8, fontWeight: 700, color: "#a3a3a3", width: 36 }}>{r.slot}</span>
              <span style={{ fontFamily: sans, fontSize: 11, fontWeight: r.draft ? 600 : 400, color: r.draft ? "#171717" : "#737373", flex: 1 }}>{r.name}</span>
              {r.draft && <span style={{ fontFamily: mono, fontSize: 7, fontWeight: 700, color: "#22c55e", background: "rgba(34,197,94,0.1)", padding: "1px 6px", borderRadius: 99 }}>NEW</span>}
            </div>)}
          </div>
        </div>

        {/* Historical data */}
        <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 12, padding: "20px 22px" }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontFamily: sans, fontSize: 13, fontWeight: 700, color: "#171717", marginBottom: 4 }}>10 years of historical data</div>
            <div style={{ fontFamily: sans, fontSize: 12, color: "#737373", lineHeight: 1.45 }}>Combine measurables and college stats compared against a decade of FBS data. Dominator ratings and historical percentiles.</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0 }}>
              {[{label:"REC DOM",pct:92,val:"92nd"},{label:"SPD SCR",pct:85,val:"85th"},{label:"ATH SCR",pct:88,val:"88th"},{label:"40 YD",pct:78,val:"78th"}].map(row => <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontFamily: mono, fontSize: 7, fontWeight: 600, color: "#a3a3a3", width: 40, textAlign: "right", flexShrink: 0 }}>{row.label}</span>
                <div style={{ flex: 1, height: 4, background: "#f0f0f0", borderRadius: 99, overflow: "hidden" }}><div style={{ width: `${row.pct}%`, height: "100%", background: "linear-gradient(90deg,#7c3aed,#ec4899)", borderRadius: 99 }}/></div>
                <span style={{ fontFamily: mono, fontSize: 7, fontWeight: 700, color: "#7c3aed", width: 24, textAlign: "right" }}>{row.val}</span>
              </div>)}
            </div>
            <svg width={90} height={90} viewBox="0 0 90 90" style={{ flexShrink: 0 }}>
              <line x1={15} y1={8} x2={15} y2={82} stroke="#f0f0f0" strokeWidth={0.5}/>
              <line x1={45} y1={8} x2={45} y2={82} stroke="#f0f0f0" strokeWidth={0.5}/>
              <line x1={75} y1={8} x2={75} y2={82} stroke="#f0f0f0" strokeWidth={0.5}/>
              {[
                [12,18,"#dc2626"],[18,30,"#dc2626"],[10,42,"#dc2626"],[16,55,"#dc2626"],[14,68,"#dc2626"],[20,22,"#dc2626"],[8,48,"#dc2626"],
                [42,14,"#7c3aed"],[48,24,"#7c3aed"],[38,36,"#7c3aed"],[44,46,"#7c3aed"],[50,56,"#7c3aed"],[40,66,"#7c3aed"],[46,72,"#7c3aed"],[52,38,"#7c3aed"],
                [72,20,"#2563eb"],[78,34,"#2563eb"],[70,48,"#2563eb"],[76,60,"#2563eb"],[74,72,"#2563eb"],[68,40,"#2563eb"],
              ].map((d,i) => <circle key={i} cx={d[0]} cy={d[1]} r={3.5} fill={d[2]} opacity={0.6}/>)}
              <text x={15} y={90} textAnchor="middle" style={{ fontSize: "6px", fill: "#a3a3a3", fontFamily: "monospace" }}>RB</text>
              <text x={45} y={90} textAnchor="middle" style={{ fontSize: "6px", fill: "#a3a3a3", fontFamily: "monospace" }}>WR</text>
              <text x={75} y={90} textAnchor="middle" style={{ fontSize: "6px", fill: "#a3a3a3", fontFamily: "monospace" }}>TE</text>
            </svg>
          </div>
        </div>

        {/* Community ADP */}
        <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 12, padding: "20px 22px" }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontFamily: sans, fontSize: 13, fontWeight: 700, color: "#171717", marginBottom: 4 }}>Community-powered draft intelligence</div>
            <div style={{ fontFamily: sans, fontSize: 12, color: "#737373", lineHeight: 1.45 }}>See where prospects land across thousands of mock drafts. Real ADP and rising/falling trends from the community.</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {[{pos:"EDGE",name:"Bain Jr.",delta:"+2.1",up:true},{pos:"QB",name:"Nussmeier",delta:"-1.4",up:false},{pos:"S",name:"Downs",delta:"+0.8",up:true}].map(row => { const c = POS_COLORS[row.pos]; return <div key={row.name} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", borderRadius: 8, background: "#faf9f6" }}>
              <span style={{ fontFamily: mono, fontSize: 8, fontWeight: 700, color: c, background: `${c}0d`, padding: "1px 6px", borderRadius: 99 }}>{row.pos}</span>
              <span style={{ fontFamily: sans, fontSize: 11, fontWeight: 600, color: "#171717", flex: 1 }}>{row.name}</span>
              <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, color: row.up ? "#16a34a" : "#dc2626" }}>{row.up ? "\u2191" : "\u2193"}{row.delta.replace(/[+-]/,"")}</span>
            </div>; })}
          </div>
        </div>

      </div>
    </div>
  );
}

// ============================================================
// Prospect Recommendations — team-specific targeting
// ============================================================
function getGmTargets(team, count = 3) {
  const profile = TEAM_PROFILES[team];
  if (!profile) return [];

  const needs = TEAM_NEEDS_SIMPLE[team] || [];
  const needSet = new Set(needs.slice(0, 8));
  const posBoostSet = new Set([...(profile.posBoost || []), ...(profile.gposBoost || [])]);

  const scored = PROSPECTS_RAW.map(p => {
    const cr = getConsensusRank(p.name) || 999;
    if (cr > 200) return null;

    const pos = p.gpos || p.pos;
    let score = 0;

    // Base rank value — BPA-weighted (higher bpaLean = more weight on rank)
    const rankPct = 1 - cr / 200;
    score += rankPct * profile.bpaLean * 2.0;

    // Need match — strong signal for need-driven teams
    if (needSet.has(p.pos) || needSet.has(pos)) score += (1 - profile.bpaLean) * 2.5;

    // posBoost/gposBoost — team-specific positional preferences from TEAM_PROFILES
    if (posBoostSet.has(p.pos) || posBoostSet.has(pos)) score += 1.2;

    // Penalize heavily if prospect matches NO team signal at all
    if (!needSet.has(p.pos) && !needSet.has(pos) && !posBoostSet.has(p.pos) && !posBoostSet.has(pos)) {
      score *= 0.3;
    }

    return { ...p, cr, score, pos };
  }).filter(Boolean);

  scored.sort((a, b) => b.score - a.score);

  // Enforce positional variety — no two same position group
  const result = [];
  const usedPos = new Set();
  for (const p of scored) {
    if (usedPos.has(p.pos)) continue;
    usedPos.add(p.pos);
    result.push(p);
    if (result.length >= count) break;
  }

  return result;
}

// ============================================================
// Share Canvas — portrait layout matching mockup
// ============================================================
function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
  if (!text) return y;
  const words = text.split(" ");
  let line = "";
  let currentY = y;
  for (const word of words) {
    const testLine = line + (line ? " " : "") + word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) ctx.fillText(line, x, currentY);
  return currentY;
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

async function renderShareCanvas(result) {
  const W = 900, H = 1100;
  const canvas = document.createElement("canvas");
  canvas.width = W * 2; canvas.height = H * 2;
  const ctx = canvas.getContext("2d");
  ctx.scale(2, 2);

  const allResults = result.allResults || [];
  const pad = 80;

  // Background
  ctx.fillStyle = "#faf9f6";
  ctx.fillRect(0, 0, W, H);

  // "My GM Style Match is..."
  ctx.fillStyle = "#171717";
  ctx.font = `800 26px 'Literata', Georgia, serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("My GM Style Match is...", W / 2, 60);

  // Team logo (loaded from ESPN CDN)
  const logoSize = 180;
  let logoImg = null;
  try { logoImg = await loadImg(nflLogoUrl(result.team)); } catch (e) {}
  if (logoImg) {
    ctx.drawImage(logoImg, (W - logoSize) / 2, 90, logoSize, logoSize);
  } else {
    const tc = NFL_TEAM_COLORS[result.team] || "#171717";
    ctx.fillStyle = tc;
    ctx.font = `bold 80px 'DM Sans', sans-serif`;
    ctx.fillText(NFL_TEAM_ABR[result.team] || "???", W / 2, 200);
  }

  // GM Name
  ctx.fillStyle = "#171717";
  ctx.font = `900 52px 'Literata', Georgia, serif`;
  ctx.textAlign = "center";
  ctx.fillText(result.gm, W / 2, 330);

  // Archetype badge pill
  const archText = result.archetype.toUpperCase();
  ctx.font = `700 14px 'DM Sans', sans-serif`;
  const archWidth = ctx.measureText(archText).width + 48;
  drawRoundedRect(ctx, (W - archWidth) / 2, 348, archWidth, 32, 16);
  ctx.fillStyle = "#ede9fe";
  ctx.fill();
  ctx.fillStyle = "#7c3aed";
  ctx.font = `700 13px 'DM Sans', sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(archText, W / 2, 364);

  // Match % (left) + Description box (right)
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  const rowY = 420;

  // Left: percentage
  ctx.fillStyle = "#171717";
  ctx.font = `900 80px 'DM Mono', monospace`;
  ctx.fillText(`${result.matchPct}%`, pad, rowY + 60);
  ctx.fillStyle = "#a3a3a3";
  ctx.font = `500 16px 'DM Sans', sans-serif`;
  ctx.fillText("match", pad, rowY + 85);

  // Right: blurb in rounded gray box
  const boxX = 340, boxW = W - 340 - pad, boxH = 110;
  drawRoundedRect(ctx, boxX, rowY, boxW, boxH, 12);
  ctx.fillStyle = "#f0eeeb";
  ctx.fill();
  ctx.fillStyle = "#525252";
  ctx.font = `500 15px 'DM Sans', sans-serif`;
  ctx.textAlign = "left";
  wrapCanvasText(ctx, result.blurb, boxX + 20, rowY + 30, boxW - 40, 22);

  // Horizontal rule
  const ruleY = 560;
  ctx.strokeStyle = "#d4d4d4";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, ruleY);
  ctx.lineTo(W - pad, ruleY);
  ctx.stroke();

  // Secondary GM matches
  allResults.slice(1, 5).forEach((r, i) => {
    const y = 600 + i * 48;

    ctx.fillStyle = "#171717";
    ctx.font = `500 18px 'DM Sans', sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText(`${r.gm}, ${r.team}`, pad, y);

    ctx.fillStyle = "#525252";
    ctx.font = `700 18px 'DM Mono', monospace`;
    ctx.textAlign = "right";
    ctx.fillText(`${r.matchPct}%`, W - pad, y);

    // Thin separator
    ctx.strokeStyle = "#e5e5e5";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(pad, y + 18);
    ctx.lineTo(W - pad, y + 18);
    ctx.stroke();
  });

  // Bottom horizontal rule
  const bottomRuleY = 800;
  ctx.strokeStyle = "#d4d4d4";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, bottomRuleY);
  ctx.lineTo(W - pad, bottomRuleY);
  ctx.stroke();

  // "Take the Quiz at bigboardlab.com"
  ctx.fillStyle = "#525252";
  ctx.font = `400 17px 'DM Mono', monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("Take the Quiz at bigboardlab.com", W / 2, 850);

  // BBL logo + wordmark (load logo, fallback to text)
  let bblLogo = null;
  try { bblLogo = await loadImg(window.location.origin + "/logo.png"); } catch (e) {}
  if (bblLogo) {
    const logoH = 32;
    const logoW = logoH * (bblLogo.width / bblLogo.height);
    const wordWidth = 140;
    const totalW = logoW + 10 + wordWidth;
    const startX = (W - totalW) / 2;
    ctx.drawImage(bblLogo, startX, 878, logoW, logoH);
    ctx.fillStyle = "#171717";
    ctx.font = `900 22px 'Literata', Georgia, serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("big board lab", startX + logoW + 10, 894);
  } else {
    ctx.fillStyle = "#171717";
    ctx.font = `900 22px 'Literata', Georgia, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("big board lab", W / 2, 895);
  }

  return canvas;
}

// ============================================================
// Results — Cover Flow carousel + prospects + share
// ============================================================
function QuizResults({ result, user, NFLTeamLogo, SchoolLogo, onClose, onLaunchMock, trackEvent, userId }) {
  const [copied, setCopied] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const touchStartX = useRef(null);

  const allResults = result.allResults || [];
  const active = allResults[activeIdx] || result;
  const teamColor = NFL_TEAM_COLORS[active.team] || "#171717";
  const targets = getGmTargets(active.team);

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) {
      if (dx < 0 && activeIdx < allResults.length - 1) setActiveIdx(activeIdx + 1);
      if (dx > 0 && activeIdx > 0) setActiveIdx(activeIdx - 1);
    }
    touchStartX.current = null;
  };

  const handleShare = useCallback(async () => {
    const shareTarget = allResults[activeIdx] || result;
    const shareText = `My GM match is ${shareTarget.gm} from the ${shareTarget.team}. Find yours at bigboardlab.com/gm`;
    const canvas = await renderShareCanvas({
      team: shareTarget.team,
      gm: shareTarget.gm,
      archetype: shareTarget.archetype,
      matchPct: shareTarget.matchPct,
      blurb: shareTarget.blurb,
      allResults,
    });
    canvas.toBlob(async blob => {
      if (trackEvent) trackEvent(userId, "share_triggered", { type: "gm_quiz", team: shareTarget.team, matchPct: shareTarget.matchPct });
      if (!blob) return;

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile && navigator.share && navigator.canShare) {
        try {
          const file = new File([blob], "bigboardlab-gm-quiz.png", { type: "image/png" });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: `I draft like ${shareTarget.gm} \u2014 Big Board Lab`,
              text: shareText,
            });
            return;
          }
        } catch (e) {}
      }

      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch (e) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "bigboardlab-gm-quiz.png";
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 3000);
      }
    }, "image/png");
  }, [activeIdx, allResults, result, trackEvent, userId]);

  const featureCards = [
    { title: "32 AI GMs with real tendencies", desc: "Each CPU team drafts differently based on real needs and front office style." },
    { title: "Spider charts & trait grading", desc: "Dial in traits and watch radar charts and grades update in real time." },
    { title: "Pair-by-pair prospect ranking", desc: "Choose between two players, head-to-head, until your board builds itself." },
    { title: "Live depth chart updates", desc: "Every pick lands on the roster in real time. Watch starters get displaced." },
    { title: "Community-powered draft intelligence", desc: "See where prospects land across thousands of mock drafts." },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#faf9f6", fontFamily: font }}>
      {/* Header bar */}
      <div style={{ padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <img src="/logo.png" alt="Big Board Lab" style={{ width: 32, height: "auto" }} />
          <span style={{ fontFamily: font, fontSize: 14, fontWeight: 900, letterSpacing: -0.5, color: "#171717" }}>big board lab</span>
        </div>
        <button onClick={onClose} style={{ fontFamily: sans, fontSize: 12, fontWeight: 600, color: "#737373", background: "none", border: "1px solid #e5e5e5", borderRadius: 99, padding: "6px 16px", cursor: "pointer" }}>
          {"\u2192"} Big Board Lab
        </button>
      </div>

      {/* Cover Flow Carousel */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          maxWidth: 600, margin: "0 auto", padding: "8px 0 0",
          position: "relative", height: 350, overflow: "hidden",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {allResults.map((r, i) => {
          const offset = i - activeIdx;
          const absOff = Math.abs(offset);
          if (absOff > 2) return null;

          const tc = NFL_TEAM_COLORS[r.team] || "#171717";
          const isCenter = offset === 0;
          const scale = isCenter ? 1 : absOff === 1 ? 0.78 : 0.62;
          const opacity = isCenter ? 1 : absOff === 1 ? 0.65 : 0.4;
          const tx = isCenter ? 0 : (offset > 0 ? 1 : -1) * (absOff === 1 ? 170 : 290);

          return (
            <div key={r.team}
              onClick={() => !isCenter && setActiveIdx(i)}
              style={{
                position: "absolute",
                width: 260,
                background: "#fff",
                border: isCenter ? `2px solid ${tc}40` : "1px solid #e5e5e5",
                borderRadius: 20,
                padding: isCenter ? "28px 20px" : "20px 16px",
                textAlign: "center",
                transform: `translateX(${tx}px) scale(${scale})`,
                opacity,
                zIndex: 5 - absOff,
                transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                cursor: isCenter ? "default" : "pointer",
                boxShadow: isCenter ? "0 8px 32px rgba(0,0,0,0.08)" : "0 2px 8px rgba(0,0,0,0.04)",
                overflow: "hidden",
              }}>
              {/* Team color top accent */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, ${tc}, ${tc}80)` }} />

              <div style={{ marginBottom: 10 }}>
                <NFLTeamLogo team={r.team} size={isCenter ? 60 : 40} />
              </div>

              <div style={{ fontFamily: mono, fontSize: isCenter ? 44 : 28, fontWeight: 900, color: "#171717", letterSpacing: -2, lineHeight: 1 }}>
                {r.matchPct}%
              </div>
              <div style={{ fontFamily: sans, fontSize: 10, color: "#a3a3a3", marginBottom: isCenter ? 10 : 6 }}>match</div>

              {isCenter && <p style={{ fontFamily: sans, fontSize: 11, color: "#737373", margin: "0 0 4px" }}>You draft like</p>}
              <div style={{ fontFamily: font, fontSize: isCenter ? 20 : 13, fontWeight: 800, color: "#171717", letterSpacing: -0.5 }}>
                {r.gm}
              </div>
              <div style={{ fontFamily: sans, fontSize: isCenter ? 13 : 10, fontWeight: 600, color: tc, marginBottom: isCenter ? 8 : 4 }}>
                {r.team}
              </div>

              <span style={{
                fontFamily: mono, fontSize: isCenter ? 9 : 7, fontWeight: 700,
                color: "#7c3aed", background: "#f5f3ff", border: "1px solid #ede9fe",
                borderRadius: 99, padding: isCenter ? "3px 12px" : "2px 8px",
                display: "inline-block", letterSpacing: 0.5
              }}>
                {r.archetype.toUpperCase()}
              </span>
            </div>
          );
        })}

        {/* Arrow buttons */}
        {activeIdx > 0 && (
          <button onClick={() => setActiveIdx(activeIdx - 1)} style={{
            position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", zIndex: 10,
            width: 32, height: 32, borderRadius: "50%", background: "#fff", border: "1px solid #e5e5e5",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: sans, fontSize: 18, color: "#737373", boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            padding: 0, lineHeight: 1,
          }}>
            {"\u2039"}
          </button>
        )}
        {activeIdx < allResults.length - 1 && (
          <button onClick={() => setActiveIdx(activeIdx + 1)} style={{
            position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", zIndex: 10,
            width: 32, height: 32, borderRadius: "50%", background: "#fff", border: "1px solid #e5e5e5",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: sans, fontSize: 18, color: "#737373", boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            padding: 0, lineHeight: 1,
          }}>
            {"\u203a"}
          </button>
        )}
      </div>

      {/* Navigation dots */}
      <div style={{ display: "flex", justifyContent: "center", gap: 8, padding: "12px 0 0" }}>
        {allResults.map((_, i) => (
          <button key={i} onClick={() => setActiveIdx(i)}
            style={{
              width: i === activeIdx ? 24 : 8, height: 8,
              borderRadius: 99, border: "none", padding: 0,
              background: i === activeIdx ? "linear-gradient(90deg, #ec4899, #7c3aed)" : "#d4d4d4",
              cursor: "pointer", transition: "all 0.3s",
            }}
          />
        ))}
      </div>

      {/* Blurb */}
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "16px 24px 0", textAlign: "center" }}>
        <p style={{ fontFamily: sans, fontSize: 13, color: "#525252", lineHeight: 1.55, maxWidth: 400, margin: "0 auto" }}>
          {active.blurb}
        </p>
      </div>

      {/* GM's 2026 Targets */}
      {targets.length > 0 && (
        <div style={{ maxWidth: 520, margin: "0 auto", padding: "24px 24px 0" }}>
          <h3 style={{ fontFamily: sans, fontSize: 14, fontWeight: 700, color: "#171717", margin: "0 0 12px" }}>
            {activeIdx === 0 ? "Your" : `${active.gm}'s`} 2026 Targets
          </h3>
          <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 12, overflow: "hidden" }}>
            {targets.map((p, i) => {
              const pos = p.gpos || p.pos;
              const c = POS_COLORS[pos] || "#737373";
              return (
                <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: i < targets.length - 1 ? "1px solid #f5f5f5" : "none" }}>
                  <SchoolLogo school={p.school} size={24} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: sans, fontSize: 13, fontWeight: 600, color: "#171717" }}>{p.name}</div>
                    <div style={{ fontFamily: sans, fontSize: 11, color: "#737373" }}>{p.school}</div>
                  </div>
                  <span style={{ fontFamily: mono, fontSize: 9, fontWeight: 700, color: c, background: `${c}0d`, padding: "2px 8px", borderRadius: 99 }}>{pos}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Share */}
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "24px 24px 0", display: "flex", gap: 10 }}>
        <button onClick={handleShare}
          style={{ flex: 1, fontFamily: sans, fontSize: 13, fontWeight: 700, padding: "12px 20px", background: "#171717", color: "#fff", border: "none", borderRadius: 99, cursor: "pointer", transition: "transform 0.1s" }}
          onMouseDown={e => e.currentTarget.style.transform = "scale(0.97)"}
          onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
          {copied ? "\u2705 Copied!" : "\ud83d\udcf8 Share Result"}
        </button>
        <button onClick={() => {
          const a = allResults[activeIdx] || result;
          const text = `My GM match is ${a.gm} from the ${a.team}. Find yours at bigboardlab.com/gm`;
          navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {});
        }}
          style={{ fontFamily: sans, fontSize: 13, fontWeight: 600, padding: "12px 20px", background: "#fff", color: "#171717", border: "1px solid #e5e5e5", borderRadius: 99, cursor: "pointer" }}>
          {"\ud83d\udd17"} Copy Link
        </button>
      </div>

      {/* Feature Showcase */}
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "40px 24px 0" }}>
        <p style={{ fontFamily: mono, fontSize: 10, letterSpacing: 2, color: "#a3a3a3", textTransform: "uppercase", margin: "0 0 8px", textAlign: "center" }}>See what your GM can do</p>
        <h3 style={{ fontFamily: font, fontSize: 22, fontWeight: 800, color: "#171717", margin: "0 0 20px", textAlign: "center", letterSpacing: -0.5 }}>on Big Board Lab</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {featureCards.map(card => (
            <div key={card.title} style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 12, padding: "16px 20px" }}>
              <div style={{ fontFamily: sans, fontSize: 13, fontWeight: 700, color: "#171717", marginBottom: 3 }}>{card.title}</div>
              <div style={{ fontFamily: sans, fontSize: 12, color: "#737373", lineHeight: 1.4 }}>{card.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "28px 24px 60px", textAlign: "center" }}>
        <button onClick={() => { try { sessionStorage.removeItem(STORAGE_KEY); } catch(e) {} if (onLaunchMock) onLaunchMock(active.team); else onClose(); }}
          style={{ fontFamily: sans, fontSize: 15, fontWeight: 700, padding: "14px 40px", background: teamColor, color: "#fff", border: "none", borderRadius: 99, cursor: "pointer", transition: "transform 0.1s" }}
          onMouseDown={e => e.currentTarget.style.transform = "scale(0.97)"}
          onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
          {"\ud83c\udfdf\ufe0f"} Start a Mock Draft as {active.team}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Main GmQuiz Component
// ============================================================
export default function GmQuiz({ user, NFLTeamLogo, SchoolLogo, trackEvent, userId, onLaunchMock }) {
  // Check sessionStorage for saved answers (survives OAuth redirect)
  const [phase, setPhase] = useState(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length === QUIZ_QUESTIONS.length) {
          // If user is logged in, go straight to results
          return user ? "results" : "auth-gate";
        }
      }
    } catch (e) {}
    return "intro";
  });
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length === QUIZ_QUESTIONS.length) return parsed;
      }
    } catch (e) {}
    return [];
  });
  const [matchResult, setMatchResult] = useState(() => {
    if (phase === "results" && answers.length === QUIZ_QUESTIONS.length) {
      return scoreQuiz(answers);
    }
    return null;
  });

  // When user auth state changes (after OAuth redirect), advance from auth-gate to results
  useEffect(() => {
    if (user && phase === "auth-gate" && answers.length === QUIZ_QUESTIONS.length) {
      const result = scoreQuiz(answers);
      setMatchResult(result);
      setPhase("results");
      if (trackEvent) trackEvent(userId, "gm_quiz_result", { team: result.team, gm: result.gm, matchPct: result.matchPct });
    }
  }, [user, phase, answers, trackEvent, userId]);

  const handleStart = () => {
    if (trackEvent) trackEvent(userId, "gm_quiz_start");
    setPhase("quiz");
    setQuestionIndex(0);
    setAnswers([]);
  };

  const handleAnswer = (deltas) => {
    const newAnswers = [...answers, deltas];
    setAnswers(newAnswers);

    if (questionIndex + 1 < QUIZ_QUESTIONS.length) {
      setQuestionIndex(questionIndex + 1);
    } else {
      // Save answers to sessionStorage before potential auth redirect
      try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newAnswers)); } catch (e) {}

      if (user) {
        const result = scoreQuiz(newAnswers);
        setMatchResult(result);
        setPhase("results");
        if (trackEvent) trackEvent(userId, "gm_quiz_result", { team: result.team, gm: result.gm, matchPct: result.matchPct });
      } else {
        setPhase("auth-gate");
      }
    }
  };

  const handleClose = () => {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch (e) {}
    window.history.pushState({}, "", "/");
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  if (phase === "intro") return <QuizIntro onStart={handleStart} />;
  if (phase === "quiz") {
    return <QuizQuestion
      key={questionIndex}
      question={QUIZ_QUESTIONS[questionIndex]}
      index={questionIndex}
      total={QUIZ_QUESTIONS.length}
      onAnswer={handleAnswer}
    />;
  }
  if (phase === "auth-gate") return <QuizAuthGate NFLTeamLogo={NFLTeamLogo} />;
  if (phase === "results" && matchResult) {
    return <QuizResults
      result={matchResult}
      user={user}
      NFLTeamLogo={NFLTeamLogo}
      SchoolLogo={SchoolLogo}
      onClose={handleClose}
      onLaunchMock={onLaunchMock}
      trackEvent={trackEvent}
      userId={userId}
    />;
  }

  return null;
}
