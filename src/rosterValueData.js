import ARI from "../agents/output/roster-value/ARI.json";
import ATL from "../agents/output/roster-value/ATL.json";
import BAL from "../agents/output/roster-value/BAL.json";
import BUF from "../agents/output/roster-value/BUF.json";
import CAR from "../agents/output/roster-value/CAR.json";
import CHI from "../agents/output/roster-value/CHI.json";
import CIN from "../agents/output/roster-value/CIN.json";
import CLE from "../agents/output/roster-value/CLE.json";
import DAL from "../agents/output/roster-value/DAL.json";
import DEN from "../agents/output/roster-value/DEN.json";
import DET from "../agents/output/roster-value/DET.json";
import GB from "../agents/output/roster-value/GB.json";
import HOU from "../agents/output/roster-value/HOU.json";
import IND from "../agents/output/roster-value/IND.json";
import JAX from "../agents/output/roster-value/JAX.json";
import KC from "../agents/output/roster-value/KC.json";
import LAC from "../agents/output/roster-value/LAC.json";
import LAR from "../agents/output/roster-value/LAR.json";
import LV from "../agents/output/roster-value/LV.json";
import MIA from "../agents/output/roster-value/MIA.json";
import MIN from "../agents/output/roster-value/MIN.json";
import NE from "../agents/output/roster-value/NE.json";
import NO from "../agents/output/roster-value/NO.json";
import NYG from "../agents/output/roster-value/NYG.json";
import NYJ from "../agents/output/roster-value/NYJ.json";
import PHI from "../agents/output/roster-value/PHI.json";
import PIT from "../agents/output/roster-value/PIT.json";
import SEA from "../agents/output/roster-value/SEA.json";
import SF from "../agents/output/roster-value/SF.json";
import TB from "../agents/output/roster-value/TB.json";
import TEN from "../agents/output/roster-value/TEN.json";
import WSH from "../agents/output/roster-value/WSH.json";
import { ABBR_TO_TEAM } from "./teamConfig.js";

const ALL = {ARI,ATL,BAL,BUF,CAR,CHI,CIN,CLE,DAL,DEN,DET,GB,HOU,IND,JAX,KC,LAC,LAR,LV,MIA,MIN,NE,NO,NYG,NYJ,PHI,PIT,SEA,SF,TB,TEN,WSH};

// Full team data keyed by team name (e.g. "Steelers")
export const ROSTER_VALUES = {};
// Quick lookup: teamName → { QB1: {...}, LT: {...}, ... }
export const ROSTER_BY_SLOT = {};
// Quick lookup: playerName → flattened player data
export const ROSTER_BY_NAME = {};

function flattenPlayer(p, teamName) {
  return {
    name: p.name, slot: p.slot, position: p.position, age: p.age, draftPedigree: p.draft_pedigree,
    yearsRemaining: p.contract.years_remaining, aav: p.contract.aav,
    guaranteedRemaining: p.contract.guaranteed_remaining, capHit: p.contract.cap_hit_2026,
    deadCap: p.contract.dead_cap_if_traded, faYear: p.contract.free_agent_year,
    performanceTier: p.performance_tier, performanceEvidence: p.performance_evidence,
    tradeValue: { pickEquivalent: p.trade_value.pick_equivalent, valuePoints: p.trade_value.pick_value_points, reasoning: p.trade_value.reasoning },
    availability: p.availability, availabilityReasoning: p.availability_reasoning,
    injuryNotes: p.injury_notes, characterNotes: p.character_notes, tradeBuzz: p.trade_buzz,
    team: teamName,
  };
}

Object.entries(ALL).forEach(([abbr, data]) => {
  const teamName = ABBR_TO_TEAM[abbr];
  if (!teamName) return;
  ROSTER_VALUES[teamName] = { team_context: data.team_context, players: data.players };
  ROSTER_BY_SLOT[teamName] = {};
  data.players.forEach(p => {
    const flat = flattenPlayer(p, teamName);
    ROSTER_BY_SLOT[teamName][p.slot] = flat;
    ROSTER_BY_NAME[p.name] = flat;
  });
});

export function formatContract(player) {
  if (!player) return "";
  const yr = player.yearsRemaining;
  const aav = player.aav >= 1e6 ? `$${(player.aav / 1e6).toFixed(1)}M` : `$${Math.round(player.aav / 1e3)}K`;
  const base = `${yr}yr/${aav}`;
  if (yr === 1 && player.faYear) return `${base} (UFA '${String(player.faYear).slice(2)})`;
  return base;
}

export function formatTradeValue(player) {
  if (!player?.tradeValue) return "";
  const pe = player.tradeValue.pickEquivalent;
  if (pe <= 32) return `~Rd1 pick`;
  if (pe <= 64) return `~Rd2 pick`;
  if (pe <= 100) return `~Rd3 pick`;
  if (pe <= 139) return `~Rd4 pick`;
  if (pe <= 181) return `~Rd5 pick`;
  if (pe <= 215) return `~Rd6 pick`;
  return `~Rd7 pick`;
}

export const TIER_COLORS = {
  elite: "#7c3aed", pro_bowl: "#2563eb", quality_starter: "#0d9488",
  starter: "#525252", rotational: "#a3a3a3", backup: "#d4d4d4", declining: "#dc2626"
};

export const AVAILABILITY_DISPLAY = {
  untouchable: { label: "CORE", color: "#16a34a" },
  available_at_premium: { label: "PREM", color: "#d97706" },
  available: { label: "AVAIL", color: "#a3a3a3" },
  actively_shopable: { label: "SHOP", color: "#dc2626" },
};

export default ROSTER_VALUES;
