import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { PROSPECTS_RAW } from "./prospects.js";
import { getConsensusRank, getConsensusGrade } from "./consensusData.js";
import { getProspectStats } from "./prospectStats.js";
import { POS_COLORS } from "./positions.js";

const font = `'Literata',Georgia,serif`;
const mono = `'DM Mono','Courier New',monospace`;
const sans = `'DM Sans','Helvetica Neue',sans-serif`;

// ============================================================
// Region definitions & seeding
// ============================================================

const REGION_DEFS = [
  { name: "Offensive Skill", positions: ["QB", "RB", "WR"], color: "#ef4444" },
  { name: "Big Men", positions: ["TE", "OT", "IOL"], color: "#22c55e" },
  { name: "Defensive Line", positions: ["EDGE", "DL"], color: "#3b82f6" },
  { name: "Back 7", positions: ["LB", "CB", "S"], color: "#a855f7" },
];

// Standard bracket seeding: 1v16, 8v9, 5v12, 4v13, 6v11, 3v14, 7v10, 2v15
const SEED_MATCHUPS = [
  [1, 16], [8, 9], [5, 12], [4, 13],
  [6, 11], [3, 14], [7, 10], [2, 15],
];

const ROUND_NAMES = [
  "Round of 64", "Round of 32", "Sweet 16", "Elite 8", "Final Four", "Championship",
];

function buildBracket() {
  // Enrich prospects with gpos and consensus rank
  const enriched = PROSPECTS_RAW.map((p, i) => {
    const stats = getProspectStats(p.name, p.school);
    const gpos = stats?.gpos || p.pos;
    const rank = getConsensusRank(p.name);
    return { ...p, id: `p${i}`, gpos, rank: rank || 999, stats };
  });

  const regions = REGION_DEFS.map((rd) => {
    const pool = enriched
      .filter((p) => rd.positions.includes(p.gpos))
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 16)
      .map((p, i) => ({ ...p, seed: i + 1 }));
    return { ...rd, prospects: pool };
  });

  // Build initial matchups (Round of 64 = 8 matchups per region = 32 total)
  const round0 = [];
  for (const region of regions) {
    for (const [s1, s2] of SEED_MATCHUPS) {
      const p1 = region.prospects.find((p) => p.seed === s1);
      const p2 = region.prospects.find((p) => p.seed === s2);
      if (p1 && p2) {
        round0.push({ a: p1, b: p2, region: region.name, regionColor: region.color });
      }
    }
  }

  return { regions, initialMatchups: round0 };
}

// ============================================================
// Intro Screen
// ============================================================

function BracketIntro({ regions, onStart }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div style={{
      minHeight: "100vh", background: "#0f0f0f", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: "40px 24px", textAlign: "center",
    }}>
      <img src="/logo.png" alt="Big Board Lab" style={{ width: 64, height: "auto", marginBottom: 8, filter: "invert(1)" }} />
      <h2 style={{ fontFamily: font, fontSize: 18, fontWeight: 900, letterSpacing: -0.5, color: "#fff", margin: "0 0 4px" }}>big board lab</h2>
      <p style={{ fontFamily: mono, fontSize: 9, letterSpacing: 1.5, color: "#525252", textTransform: "uppercase", margin: "0 0 32px" }}>2026 NFL Draft</p>

      <h1 style={{
        fontFamily: font, fontSize: "clamp(36px, 8vw, 56px)", fontWeight: 900, lineHeight: 0.95,
        color: "#fff", margin: "0 0 12px", letterSpacing: -2, maxWidth: 560,
        background: "linear-gradient(135deg, #ef4444, #a855f7, #3b82f6, #22c55e)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
      }}>
        Draft Prospect<br />Bracket
      </h1>
      <p style={{ fontFamily: sans, fontSize: 15, color: "#a3a3a3", lineHeight: 1.5, maxWidth: 420, margin: "0 auto 40px" }}>
        64 prospects. 4 regions. Pick your favorite through head-to-head matchups until one champion remains.
      </p>

      {/* Region previews */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: 12, width: "100%", maxWidth: 720, marginBottom: 40,
      }}>
        {regions.map((r) => (
          <div key={r.name} style={{
            background: "#1a1a1a", borderRadius: 12, padding: "16px 16px 12px",
            border: `1px solid ${r.color}30`, textAlign: "left",
          }}>
            <div style={{
              fontFamily: mono, fontSize: 10, fontWeight: 700, color: r.color,
              textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8,
            }}>{r.name}</div>
            {r.prospects.slice(0, 4).map((p, i) => (
              <div key={p.name} style={{
                display: "flex", alignItems: "center", gap: 6, padding: "3px 0",
              }}>
                <span style={{
                  fontFamily: mono, fontSize: 10, color: "#525252", width: 14, textAlign: "right",
                }}>{i + 1}</span>
                <span style={{ fontFamily: sans, fontSize: 13, color: "#e5e5e5", fontWeight: 600 }}>{p.name}</span>
                <span style={{
                  fontFamily: mono, fontSize: 9, color: POS_COLORS[p.gpos] || "#737373",
                  fontWeight: 700,
                }}>{p.gpos}</span>
              </div>
            ))}
            <div style={{ fontFamily: mono, fontSize: 10, color: "#404040", marginTop: 4 }}>
              + {r.prospects.length - 4} more
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onStart}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          fontFamily: sans, fontSize: 16, fontWeight: 700, padding: "16px 52px",
          background: hovered ? "#fff" : "linear-gradient(135deg, #ef4444, #a855f7)",
          color: hovered ? "#0f0f0f" : "#fff",
          border: "none", borderRadius: 99, cursor: "pointer",
          transition: "all 0.2s", transform: hovered ? "scale(1.03)" : "scale(1)",
          boxShadow: hovered ? "0 0 40px rgba(168,85,247,0.4)" : "0 0 20px rgba(168,85,247,0.2)",
        }}
      >
        Start Your Bracket
      </button>
    </div>
  );
}

// ============================================================
// Matchup Card
// ============================================================

function MatchupCard({ prospect, regionColor, SchoolLogo, onPick, side, isWinner, isLoser }) {
  const [hovered, setHovered] = useState(false);
  const stats = prospect.stats;
  const pos = prospect.gpos;
  const posColor = POS_COLORS[pos] || "#737373";

  return (
    <div
      onClick={() => onPick(prospect)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1, minWidth: 0, maxWidth: 380,
        background: isWinner ? `${regionColor}15` : isLoser ? "#0f0f0f" : hovered ? "#222" : "#1a1a1a",
        border: isWinner ? `2px solid ${regionColor}` : isLoser ? "2px solid #333" : hovered ? "2px solid #444" : "2px solid #2a2a2a",
        borderRadius: 16, padding: "28px 24px", cursor: isWinner || isLoser ? "default" : "pointer",
        transition: "all 0.2s", display: "flex", flexDirection: "column", alignItems: "center",
        gap: 12, position: "relative", overflow: "hidden",
        transform: !isWinner && !isLoser && hovered ? "translateY(-2px)" : "none",
        opacity: isLoser ? 0.35 : 1,
        boxShadow: isWinner
          ? `0 0 30px ${regionColor}25`
          : hovered && !isLoser ? "0 8px 32px rgba(0,0,0,0.5)" : "none",
      }}
    >
      {/* Seed badge */}
      <div style={{
        position: "absolute", top: 12, [side === "left" ? "left" : "right"]: 12,
        fontFamily: mono, fontSize: 11, fontWeight: 700, color: "#525252",
        background: "#0f0f0f", borderRadius: 6, padding: "2px 8px",
        border: "1px solid #2a2a2a",
      }}>#{prospect.seed}</div>

      {/* Winner badge */}
      {isWinner && (
        <div style={{
          position: "absolute", top: 12, [side === "left" ? "right" : "left"]: 12,
          fontFamily: mono, fontSize: 10, fontWeight: 700, color: regionColor,
          background: `${regionColor}20`, borderRadius: 6, padding: "2px 8px",
          border: `1px solid ${regionColor}40`,
        }}>ADVANCES</div>
      )}

      <SchoolLogo school={prospect.school} size={72} />

      <div style={{ textAlign: "center" }}>
        <div style={{
          fontFamily: font, fontSize: 20, fontWeight: 900, color: "#fff",
          letterSpacing: -0.5, lineHeight: 1.1, marginBottom: 4,
        }}>{prospect.name}</div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <span style={{
            fontFamily: mono, fontSize: 11, fontWeight: 700, color: posColor,
            background: `${posColor}18`, padding: "2px 8px", borderRadius: 4,
          }}>{pos}</span>
          <span style={{ fontFamily: sans, fontSize: 13, color: "#737373" }}>{prospect.school}</span>
        </div>
      </div>

      {/* Consensus rank */}
      <div style={{
        fontFamily: mono, fontSize: 11, color: "#525252", display: "flex", alignItems: "center", gap: 4,
      }}>
        <span style={{ color: "#737373" }}>Consensus</span> #{prospect.rank}
      </div>

      {/* Stats */}
      {stats && (
        <div style={{
          background: "#0f0f0f", borderRadius: 8, padding: "8px 12px", width: "100%",
          border: "1px solid #2a2a2a",
        }}>
          {stats.height && (
            <div style={{ fontFamily: mono, fontSize: 11, color: "#525252", marginBottom: stats.statLine ? 4 : 0 }}>
              {stats.height}{stats.weight ? ` / ${stats.weight} lbs` : ""}
            </div>
          )}
          {stats.statLine && (
            <div style={{ fontFamily: mono, fontSize: 11, color: "#a3a3a3", lineHeight: 1.4 }}>
              {stats.statLine}
            </div>
          )}
          {stats.statExtra && (
            <div style={{ fontFamily: mono, fontSize: 10, color: "#525252", marginTop: 2 }}>
              {stats.statExtra}
            </div>
          )}
        </div>
      )}

      {/* Click hint */}
      {!isWinner && !isLoser && (
        <div style={{
          fontFamily: sans, fontSize: 12, color: hovered ? regionColor : "#333",
          transition: "color 0.2s", fontWeight: 600,
        }}>
          {hovered ? "Pick to advance" : "Tap to pick"}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Matchup Phase
// ============================================================

function MatchupPhase({ matchups, currentMatch, currentRound, totalRounds, SchoolLogo, onPick, picks, roundMatchups }) {
  const [picked, setPicked] = useState(null); // id of just-picked winner
  const [animating, setAnimating] = useState(false);
  const matchup = matchups[currentMatch];

  if (!matchup) return null;

  const totalMatches = matchups.length;
  const roundName = ROUND_NAMES[currentRound] || `Round ${currentRound + 1}`;

  // Progress across entire bracket
  const totalPicksSoFar = Object.keys(picks).length;
  const totalPicksNeeded = 32 + 16 + 8 + 4 + 2 + 1; // 63
  const overallProgress = totalPicksSoFar / totalPicksNeeded;

  const handlePick = useCallback((prospect) => {
    if (animating) return;
    setPicked(prospect.id);
    setAnimating(true);
    setTimeout(() => {
      onPick(prospect);
      setPicked(null);
      setAnimating(false);
    }, 800);
  }, [animating, onPick]);

  return (
    <div style={{
      minHeight: "100vh", background: "#0f0f0f", display: "flex", flexDirection: "column",
      alignItems: "center", padding: "0 16px 40px",
    }}>
      {/* Header */}
      <div style={{
        width: "100%", maxWidth: 820, padding: "20px 0 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{
            fontFamily: mono, fontSize: 10, fontWeight: 700, textTransform: "uppercase",
            letterSpacing: 1.5, color: matchup.regionColor, marginBottom: 2,
          }}>{matchup.region}</div>
          <div style={{ fontFamily: font, fontSize: 20, fontWeight: 900, color: "#fff", letterSpacing: -0.5 }}>
            {roundName}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: mono, fontSize: 11, color: "#525252" }}>
            Match {currentMatch + 1} of {totalMatches}
          </div>
          <div style={{ fontFamily: mono, fontSize: 10, color: "#333" }}>
            {totalPicksSoFar} / {totalPicksNeeded} picks
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{
        width: "100%", maxWidth: 820, height: 3, background: "#1a1a1a",
        borderRadius: 2, marginBottom: 32, overflow: "hidden",
      }}>
        <div style={{
          width: `${overallProgress * 100}%`, height: "100%",
          background: `linear-gradient(90deg, ${matchup.regionColor}, #a855f7)`,
          borderRadius: 2, transition: "width 0.4s ease",
        }} />
      </div>

      {/* VS display */}
      <div style={{
        display: "flex", alignItems: "stretch", gap: "clamp(12px, 3vw, 24px)",
        width: "100%", maxWidth: 820, justifyContent: "center",
        flexDirection: window.innerWidth < 600 ? "column" : "row",
      }}>
        <MatchupCard
          prospect={matchup.a}
          regionColor={matchup.regionColor}
          SchoolLogo={SchoolLogo}
          onPick={handlePick}
          side="left"
          isWinner={picked === matchup.a.id}
          isLoser={picked === matchup.b.id}
        />

        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <div style={{
            fontFamily: font, fontSize: 28, fontWeight: 900, color: "#2a2a2a",
            letterSpacing: -1,
          }}>VS</div>
        </div>

        <MatchupCard
          prospect={matchup.b}
          regionColor={matchup.regionColor}
          SchoolLogo={SchoolLogo}
          onPick={handlePick}
          side="right"
          isWinner={picked === matchup.b.id}
          isLoser={picked === matchup.a.id}
        />
      </div>

      {/* Region bracket mini progress */}
      <div style={{
        marginTop: 32, display: "flex", gap: 6, alignItems: "center",
      }}>
        {roundMatchups.map((_, i) => {
          const done = i < currentMatch || picks[`${currentRound}-${i}`];
          const active = i === currentMatch;
          return (
            <div key={i} style={{
              width: active ? 24 : 8, height: 8, borderRadius: 4,
              background: done ? matchup.regionColor : active ? "#444" : "#1a1a1a",
              border: `1px solid ${done ? matchup.regionColor : "#2a2a2a"}`,
              transition: "all 0.3s",
            }} />
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Champion Reveal
// ============================================================

function ChampionReveal({ champion, SchoolLogo, regionWinners, finalFour, regions }) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 300);
    return () => clearTimeout(t);
  }, []);

  const posColor = POS_COLORS[champion.gpos] || "#737373";

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "60px 24px 40px", textAlign: "center",
    }}>
      {/* Champion */}
      <div style={{
        opacity: revealed ? 1 : 0, transform: revealed ? "scale(1) translateY(0)" : "scale(0.8) translateY(20px)",
        transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
        display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 40,
      }}>
        <div style={{
          fontFamily: mono, fontSize: 11, fontWeight: 700, letterSpacing: 3,
          color: "#a855f7", textTransform: "uppercase", marginBottom: 16,
        }}>Your Champion</div>

        <div style={{
          background: "linear-gradient(135deg, #1a1a1a, #222)",
          borderRadius: 24, padding: "40px 48px", border: "2px solid #a855f7",
          boxShadow: "0 0 60px rgba(168,85,247,0.2), 0 0 120px rgba(168,85,247,0.1)",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
          position: "relative", overflow: "hidden",
        }}>
          {/* Glow effect */}
          <div style={{
            position: "absolute", top: -50, left: "50%", transform: "translateX(-50%)",
            width: 200, height: 200, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />

          <SchoolLogo school={champion.school} size={96} />
          <div>
            <div style={{
              fontFamily: font, fontSize: "clamp(28px, 6vw, 40px)", fontWeight: 900,
              color: "#fff", letterSpacing: -1, lineHeight: 1, marginBottom: 8,
            }}>{champion.name}</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <span style={{
                fontFamily: mono, fontSize: 13, fontWeight: 700, color: posColor,
                background: `${posColor}20`, padding: "3px 10px", borderRadius: 6,
              }}>{champion.gpos}</span>
              <span style={{ fontFamily: sans, fontSize: 15, color: "#a3a3a3" }}>{champion.school}</span>
            </div>
          </div>
          <div style={{ fontFamily: mono, fontSize: 12, color: "#525252" }}>
            Consensus #{champion.rank} {champion.stats?.statLine ? `  |  ${champion.stats.statLine}` : ""}
          </div>
        </div>
      </div>

      {/* Final Four results */}
      <div style={{
        opacity: revealed ? 1 : 0, transition: "opacity 0.6s 0.5s",
        width: "100%", maxWidth: 640, marginBottom: 32,
      }}>
        <div style={{
          fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: 2,
          color: "#525252", textTransform: "uppercase", marginBottom: 12,
        }}>Final Four</div>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 8,
        }}>
          {finalFour.map((p) => {
            const isChamp = p.id === champion.id;
            const regDef = regions.find(r => r.prospects.some(rp => rp.id === p.id));
            const rc = regDef?.color || "#525252";
            return (
              <div key={p.id} style={{
                background: isChamp ? `${rc}15` : "#1a1a1a",
                border: `1px solid ${isChamp ? rc : "#2a2a2a"}`,
                borderRadius: 10, padding: "12px 8px", textAlign: "center",
              }}>
                <SchoolLogo school={p.school} size={36} />
                <div style={{
                  fontFamily: sans, fontSize: 13, fontWeight: 700, color: "#e5e5e5",
                  marginTop: 6, marginBottom: 2,
                }}>{p.name}</div>
                <span style={{
                  fontFamily: mono, fontSize: 10, fontWeight: 700,
                  color: POS_COLORS[p.gpos] || "#737373",
                }}>{p.gpos}</span>
                <span style={{ fontFamily: mono, fontSize: 10, color: "#525252", marginLeft: 6 }}>#{p.rank}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Region winners */}
      <div style={{
        opacity: revealed ? 1 : 0, transition: "opacity 0.6s 0.8s",
        width: "100%", maxWidth: 640,
      }}>
        <div style={{
          fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: 2,
          color: "#525252", textTransform: "uppercase", marginBottom: 12,
        }}>Region Champions</div>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 8,
        }}>
          {regionWinners.map((rw) => (
            <div key={rw.region} style={{
              background: "#1a1a1a", border: `1px solid ${rw.color}30`,
              borderRadius: 10, padding: "12px 8px", textAlign: "center",
            }}>
              <div style={{
                fontFamily: mono, fontSize: 9, fontWeight: 700, color: rw.color,
                textTransform: "uppercase", letterSpacing: 1, marginBottom: 6,
              }}>{rw.region}</div>
              <SchoolLogo school={rw.prospect.school} size={32} />
              <div style={{
                fontFamily: sans, fontSize: 12, fontWeight: 700, color: "#e5e5e5",
                marginTop: 4,
              }}>{rw.prospect.name}</div>
              <span style={{
                fontFamily: mono, fontSize: 10, fontWeight: 700,
                color: POS_COLORS[rw.prospect.gpos] || "#737373",
              }}>{rw.prospect.gpos}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Results / Full Bracket View
// ============================================================

function BracketResults({ champion, picks, allMatchups, regions, SchoolLogo, onShare, onRestart, onHome }) {
  // Derive region winners and final four
  const regionWinners = regions.map((r) => {
    // Elite 8 winners = region winners. They're the round 3 winners for each region.
    // Walk through picks to find who won each region
    let regionProspects = r.prospects;
    // Round 0 (of 64): 8 matchups per region
    let roundWinners = [];
    for (let m = 0; m < 8; m++) {
      const regionIdx = regions.indexOf(r);
      const matchIdx = regionIdx * 8 + m;
      const winner = picks[`0-${matchIdx}`];
      if (winner) roundWinners.push(winner);
    }
    // Round 1 (of 32): 4 matchups per region
    let r1Winners = [];
    for (let m = 0; m < 4; m++) {
      const regionIdx = regions.indexOf(r);
      const matchIdx = regionIdx * 4 + m;
      const winner = picks[`1-${matchIdx}`];
      if (winner) r1Winners.push(winner);
    }
    // Round 2 (sweet 16): 2 matchups per region
    let r2Winners = [];
    for (let m = 0; m < 2; m++) {
      const regionIdx = regions.indexOf(r);
      const matchIdx = regionIdx * 2 + m;
      const winner = picks[`2-${matchIdx}`];
      if (winner) r2Winners.push(winner);
    }
    // Round 3 (elite 8): 1 matchup per region
    const regionIdx = regions.indexOf(r);
    const regionWinner = picks[`3-${regionIdx}`];
    return { region: r.name, color: r.color, prospect: regionWinner };
  });

  const finalFour = regionWinners.map(rw => rw.prospect).filter(Boolean);

  // Add semifinal losers to show in final four display
  const semiFinalLosers = [];
  const sf1Winner = picks["4-0"];
  const sf2Winner = picks["4-1"];
  const allFF = [...finalFour];

  return (
    <div style={{
      minHeight: "100vh", background: "#0f0f0f", display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      {/* Header */}
      <div style={{
        width: "100%", maxWidth: 820, padding: "20px 16px 0",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <button onClick={onHome} style={{
          fontFamily: sans, fontSize: 13, fontWeight: 600, color: "#525252",
          background: "none", border: "none", cursor: "pointer", padding: "8px 0",
        }}>
          &larr; Home
        </button>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onRestart} style={{
            fontFamily: sans, fontSize: 12, fontWeight: 600, color: "#a3a3a3",
            background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8,
            padding: "8px 16px", cursor: "pointer",
          }}>
            New Bracket
          </button>
          <button onClick={onShare} style={{
            fontFamily: sans, fontSize: 12, fontWeight: 700, color: "#fff",
            background: "linear-gradient(135deg, #a855f7, #3b82f6)",
            border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer",
          }}>
            Share Bracket
          </button>
        </div>
      </div>

      <ChampionReveal
        champion={champion}
        SchoolLogo={SchoolLogo}
        regionWinners={regionWinners}
        finalFour={allFF}
        regions={regions}
      />

      {/* Full bracket mini-view by region */}
      <div style={{
        width: "100%", maxWidth: 820, padding: "0 16px 60px",
      }}>
        <div style={{
          fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: 2,
          color: "#525252", textTransform: "uppercase", marginBottom: 16, textAlign: "center",
        }}>Full Bracket</div>

        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
        }}>
          {regions.map((r, ri) => (
            <RegionBracketMini
              key={r.name}
              region={r}
              regionIndex={ri}
              picks={picks}
              SchoolLogo={SchoolLogo}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Region bracket mini visualization
// ============================================================

function RegionBracketMini({ region, regionIndex, picks, SchoolLogo }) {
  // Reconstruct bracket for this region
  const rounds = [];

  // Round 0: initial matchups
  const r0 = [];
  for (let m = 0; m < 8; m++) {
    const matchIdx = regionIndex * 8 + m;
    const [s1, s2] = SEED_MATCHUPS[m];
    const p1 = region.prospects.find(p => p.seed === s1);
    const p2 = region.prospects.find(p => p.seed === s2);
    const winner = picks[`0-${matchIdx}`];
    r0.push({ a: p1, b: p2, winner });
  }
  rounds.push(r0);

  // Subsequent rounds within region (1, 2, 3)
  for (let rd = 1; rd <= 3; rd++) {
    const prevWinners = rounds[rd - 1].map(m => m.winner).filter(Boolean);
    const thisRound = [];
    const matchesPerRegion = rd === 1 ? 4 : rd === 2 ? 2 : 1;
    for (let m = 0; m < matchesPerRegion; m++) {
      const matchIdx = regionIndex * matchesPerRegion + m;
      const a = prevWinners[m * 2];
      const b = prevWinners[m * 2 + 1];
      const winner = picks[`${rd}-${matchIdx}`];
      thisRound.push({ a, b, winner });
    }
    rounds.push(thisRound);
  }

  return (
    <div style={{
      background: "#1a1a1a", borderRadius: 12, padding: 16,
      border: `1px solid ${region.color}20`,
    }}>
      <div style={{
        fontFamily: mono, fontSize: 10, fontWeight: 700, color: region.color,
        textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12,
      }}>{region.name}</div>

      {/* Show round 0 matchups with winners */}
      {rounds[0].map((m, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: 4,
          padding: "3px 0", borderBottom: i % 2 === 1 ? "1px solid #2a2a2a" : "none",
          marginBottom: i % 2 === 1 ? 8 : 2,
        }}>
          <span style={{
            fontFamily: mono, fontSize: 9, color: "#404040", width: 16, textAlign: "right", flexShrink: 0,
          }}>{m.a?.seed}</span>
          <span style={{
            fontFamily: sans, fontSize: 11, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            color: m.winner?.id === m.a?.id ? "#fff" : "#525252",
            fontWeight: m.winner?.id === m.a?.id ? 700 : 400,
          }}>{m.a?.name || "—"}</span>
          <span style={{
            fontFamily: mono, fontSize: 9, color: "#404040", width: 16, textAlign: "right", flexShrink: 0,
          }}>{m.b?.seed}</span>
          <span style={{
            fontFamily: sans, fontSize: 11, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            color: m.winner?.id === m.b?.id ? "#fff" : "#525252",
            fontWeight: m.winner?.id === m.b?.id ? 700 : 400,
          }}>{m.b?.name || "—"}</span>
        </div>
      ))}

      {/* Region winner */}
      {rounds[3]?.[0]?.winner && (
        <div style={{
          marginTop: 8, padding: "8px 0 0", borderTop: `1px solid ${region.color}30`,
          display: "flex", alignItems: "center", gap: 8, justifyContent: "center",
        }}>
          <SchoolLogo school={rounds[3][0].winner.school} size={20} />
          <span style={{
            fontFamily: sans, fontSize: 13, fontWeight: 700, color: region.color,
          }}>{rounds[3][0].winner.name}</span>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Share image generation
// ============================================================

async function generateShareImage(champion, regionWinners, finalFour) {
  const W = 1200, H = 630;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#0f0f0f";
  ctx.fillRect(0, 0, W, H);

  // Subtle gradient overlay
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "rgba(168,85,247,0.05)");
  grad.addColorStop(1, "rgba(59,130,246,0.05)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Title
  ctx.fillStyle = "#525252";
  ctx.font = `700 12px 'DM Sans', sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("NFL DRAFT PROSPECT BRACKET", W / 2, 40);

  // Champion
  ctx.fillStyle = "#a855f7";
  ctx.font = `700 11px 'DM Mono', monospace`;
  ctx.fillText("YOUR CHAMPION", W / 2, 80);

  ctx.fillStyle = "#fff";
  ctx.font = `900 42px 'Literata', Georgia, serif`;
  ctx.fillText(champion.name, W / 2, 130);

  const posColor = POS_COLORS[champion.gpos] || "#737373";
  ctx.fillStyle = posColor;
  ctx.font = `700 16px 'DM Mono', monospace`;
  ctx.fillText(`${champion.gpos}  |  ${champion.school}  |  #${champion.rank}`, W / 2, 160);

  // Divider
  ctx.strokeStyle = "#2a2a2a";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(200, 190);
  ctx.lineTo(W - 200, 190);
  ctx.stroke();

  // Final Four
  ctx.fillStyle = "#525252";
  ctx.font = `700 11px 'DM Mono', monospace`;
  ctx.fillText("FINAL FOUR", W / 2, 220);

  const ffSpacing = 240;
  const ffStartX = (W - ffSpacing * (finalFour.length - 1)) / 2;
  finalFour.forEach((p, i) => {
    const x = ffStartX + i * ffSpacing;
    const isChamp = p.id === champion.id;
    ctx.fillStyle = isChamp ? "#a855f7" : "#e5e5e5";
    ctx.font = `${isChamp ? 900 : 600} 18px 'DM Sans', sans-serif`;
    ctx.fillText(p.name, x, 260);
    ctx.fillStyle = POS_COLORS[p.gpos] || "#737373";
    ctx.font = `700 12px 'DM Mono', monospace`;
    ctx.fillText(`${p.gpos} #${p.rank}`, x, 280);
  });

  // Divider
  ctx.strokeStyle = "#2a2a2a";
  ctx.beginPath();
  ctx.moveTo(100, 310);
  ctx.lineTo(W - 100, 310);
  ctx.stroke();

  // Region winners
  ctx.fillStyle = "#525252";
  ctx.font = `700 11px 'DM Mono', monospace`;
  ctx.textAlign = "center";
  ctx.fillText("REGION CHAMPIONS", W / 2, 340);

  const rwSpacing = 260;
  const rwStartX = (W - rwSpacing * 3) / 2;
  regionWinners.forEach((rw, i) => {
    const x = rwStartX + i * rwSpacing;
    ctx.fillStyle = rw.color;
    ctx.font = `700 10px 'DM Mono', monospace`;
    ctx.fillText(rw.region.toUpperCase(), x, 370);
    ctx.fillStyle = "#e5e5e5";
    ctx.font = `700 16px 'DM Sans', sans-serif`;
    ctx.fillText(rw.prospect.name, x, 395);
    ctx.fillStyle = POS_COLORS[rw.prospect.gpos] || "#737373";
    ctx.font = `700 11px 'DM Mono', monospace`;
    ctx.fillText(`${rw.prospect.gpos} #${rw.prospect.rank}`, x, 415);
  });

  // Branding
  ctx.fillStyle = "#333";
  ctx.font = `600 13px 'DM Sans', sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("bigboardlab.com/draft-bracket", W / 2, H - 30);

  // Logo attempt
  try {
    const logo = await new Promise((res, rej) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => res(img);
      img.onerror = rej;
      setTimeout(rej, 2000);
      img.src = "/logo.png";
    });
    ctx.filter = "invert(1)";
    ctx.drawImage(logo, W / 2 - 16, H - 70, 32, 32);
    ctx.filter = "none";
  } catch (e) {}

  return canvas;
}

// ============================================================
// Main Component
// ============================================================

export default function DraftBracket({ SchoolLogo, onHome }) {
  const [phase, setPhase] = useState("intro"); // intro | playing | results
  const [picks, setPicks] = useState({});
  const [currentRound, setCurrentRound] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(0);
  const [shareStatus, setShareStatus] = useState(null); // null | "copying" | "copied" | "error"

  const { regions, initialMatchups } = useMemo(() => buildBracket(), []);

  // Track all matchups per round
  const [roundMatchups, setRoundMatchups] = useState(initialMatchups);

  // Derive matchups for current round from picks
  useEffect(() => {
    if (currentRound === 0) {
      setRoundMatchups(initialMatchups);
      return;
    }

    // Build matchups for the current round based on previous round winners
    const prevRound = currentRound - 1;
    let prevMatchups;

    if (currentRound <= 3) {
      // Within-region rounds
      const prevCount = prevRound === 0 ? 32 : prevRound === 1 ? 16 : prevRound === 2 ? 8 : 4;
      const newMatchups = [];
      for (let i = 0; i < prevCount; i += 2) {
        const winA = picks[`${prevRound}-${i}`];
        const winB = picks[`${prevRound}-${i + 1}`];
        if (winA && winB) {
          // Determine region from the winners
          const regionIdx = Math.floor(i / (prevCount / 4));
          const region = regions[regionIdx];
          newMatchups.push({
            a: winA, b: winB,
            region: region?.name || "",
            regionColor: region?.color || "#525252",
          });
        }
      }
      setRoundMatchups(newMatchups);
    } else if (currentRound === 4) {
      // Final Four: Offensive Skill vs Big Men, Defensive Line vs Back 7
      const rw = regions.map((r, ri) => picks[`3-${ri}`]);
      const newMatchups = [];
      if (rw[0] && rw[1]) {
        newMatchups.push({
          a: rw[0], b: rw[1],
          region: "Semifinal 1",
          regionColor: "#f59e0b",
        });
      }
      if (rw[2] && rw[3]) {
        newMatchups.push({
          a: rw[2], b: rw[3],
          region: "Semifinal 2",
          regionColor: "#f59e0b",
        });
      }
      setRoundMatchups(newMatchups);
    } else if (currentRound === 5) {
      // Championship
      const sf1 = picks["4-0"];
      const sf2 = picks["4-1"];
      if (sf1 && sf2) {
        setRoundMatchups([{
          a: sf1, b: sf2,
          region: "Championship",
          regionColor: "#fbbf24",
        }]);
      }
    }
  }, [currentRound, picks, initialMatchups, regions]);

  const handlePick = useCallback((prospect) => {
    const key = `${currentRound}-${currentMatch}`;
    setPicks(prev => ({ ...prev, [key]: prospect }));

    const nextMatch = currentMatch + 1;
    if (nextMatch < roundMatchups.length) {
      setCurrentMatch(nextMatch);
    } else {
      // Advance to next round
      const nextRound = currentRound + 1;
      if (nextRound > 5) {
        // Done!
        setPhase("results");
      } else {
        setCurrentRound(nextRound);
        setCurrentMatch(0);
      }
    }
  }, [currentRound, currentMatch, roundMatchups]);

  const handleShare = useCallback(async () => {
    setShareStatus("copying");
    try {
      const regionWinners = regions.map((r, ri) => ({
        region: r.name, color: r.color, prospect: picks[`3-${ri}`],
      }));
      const finalFour = regionWinners.map(rw => rw.prospect).filter(Boolean);
      const champion = picks["5-0"];

      const canvas = await generateShareImage(champion, regionWinners, finalFour);
      const blob = await new Promise(r => canvas.toBlob(r, "image/png"));

      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setShareStatus("copied");
      } else {
        // Fallback: download
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "draft-bracket.png";
        a.click();
        URL.revokeObjectURL(url);
        setShareStatus("copied");
      }
    } catch (e) {
      console.error("Share failed:", e);
      setShareStatus("error");
    }
    setTimeout(() => setShareStatus(null), 2500);
  }, [picks, regions]);

  const handleRestart = useCallback(() => {
    setPicks({});
    setCurrentRound(0);
    setCurrentMatch(0);
    setPhase("intro");
  }, []);

  // Set title
  useEffect(() => {
    document.title = "NFL Draft Prospect Bracket — Big Board Lab";
    return () => { document.title = "Big Board Lab — 2026 NFL Draft"; };
  }, []);

  if (phase === "intro") {
    return <BracketIntro regions={regions} onStart={() => setPhase("playing")} />;
  }

  if (phase === "results") {
    const champion = picks["5-0"];
    if (!champion) return null;
    return (
      <BracketResults
        champion={champion}
        picks={picks}
        allMatchups={initialMatchups}
        regions={regions}
        SchoolLogo={SchoolLogo}
        onShare={handleShare}
        onRestart={handleRestart}
        onHome={onHome}
      />
    );
  }

  // Playing phase
  return (
    <MatchupPhase
      matchups={roundMatchups}
      currentMatch={currentMatch}
      currentRound={currentRound}
      totalRounds={6}
      SchoolLogo={SchoolLogo}
      onPick={handlePick}
      picks={picks}
      roundMatchups={roundMatchups}
    />
  );
}
