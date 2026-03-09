import ARI from "../agents/output/team-needs/ARI.json";
import ATL from "../agents/output/team-needs/ATL.json";
import BAL from "../agents/output/team-needs/BAL.json";
import BUF from "../agents/output/team-needs/BUF.json";
import CAR from "../agents/output/team-needs/CAR.json";
import CHI from "../agents/output/team-needs/CHI.json";
import CIN from "../agents/output/team-needs/CIN.json";
import CLE from "../agents/output/team-needs/CLE.json";
import DAL from "../agents/output/team-needs/DAL.json";
import DEN from "../agents/output/team-needs/DEN.json";
import DET from "../agents/output/team-needs/DET.json";
import GB from "../agents/output/team-needs/GB.json";
import HOU from "../agents/output/team-needs/HOU.json";
import IND from "../agents/output/team-needs/IND.json";
import JAX from "../agents/output/team-needs/JAX.json";
import KC from "../agents/output/team-needs/KC.json";
import LAC from "../agents/output/team-needs/LAC.json";
import LAR from "../agents/output/team-needs/LAR.json";
import LV from "../agents/output/team-needs/LV.json";
import MIA from "../agents/output/team-needs/MIA.json";
import MIN from "../agents/output/team-needs/MIN.json";
import NE from "../agents/output/team-needs/NE.json";
import NO from "../agents/output/team-needs/NO.json";
import NYG from "../agents/output/team-needs/NYG.json";
import NYJ from "../agents/output/team-needs/NYJ.json";
import PHI from "../agents/output/team-needs/PHI.json";
import PIT from "../agents/output/team-needs/PIT.json";
import SEA from "../agents/output/team-needs/SEA.json";
import SF from "../agents/output/team-needs/SF.json";
import TB from "../agents/output/team-needs/TB.json";
import TEN from "../agents/output/team-needs/TEN.json";
import WSH from "../agents/output/team-needs/WSH.json";
import { ABBR_TO_TEAM } from "./teamConfig.js";

const ALL = {ARI,ATL,BAL,BUF,CAR,CHI,CIN,CLE,DAL,DEN,DET,GB,HOU,IND,JAX,KC,LAC,LAR,LV,MIA,MIN,NE,NO,NYG,NYJ,PHI,PIT,SEA,SF,TB,TEN,WSH};

const TEAM_NEEDS_RICH = {};
Object.entries(ALL).forEach(([abbr, data]) => {
  TEAM_NEEDS_RICH[ABBR_TO_TEAM[abbr]] = data;
});

// Position → urgency score derived from agent needs array.
// Tier 1 (critical) → 3, Tier 2 (important) → 2, Tier 3 (depth) → 1, Tier 4+ → 0.
// This preserves the "higher = bigger need" semantics the scoring formula expects.
// Includes both granular keys (CB, EDGE, IOL…) for UI tendency dots
// and broad keys (DB, DL, OL) for scoring — broad = max urgency among sub-positions.
const GRANULAR_TO_BROAD = {EDGE:"DL",DT:"DL",IDL:"DL",NT:"DL",CB:"DB",S:"DB",OT:"OL",IOL:"OL"};
const TIER_TO_URGENCY = {1:3, 2:2, 3:1};
export const TEAM_NEEDS_COUNTS = {};
Object.entries(TEAM_NEEDS_RICH).forEach(([team, data]) => {
  const map = {};
  (data.needs || []).forEach(n => {
    if (!n.position || !n.tier) return;
    const u = TIER_TO_URGENCY[n.tier] || 0;
    if (!u) return; // tier 4+ = not a real draft need
    map[n.position] = u;
    const broad = GRANULAR_TO_BROAD[n.position];
    if (broad && (!map[broad] || u > map[broad])) map[broad] = u;
  });
  TEAM_NEEDS_COUNTS[team] = map;
});

// Ordered simple needs (replaces hardcoded TEAM_NEEDS in App.jsx / Round1Prediction.jsx)
// Agent JSON: ["QB", "WR", "DB", "DL", "OL", "LB"]
export const TEAM_NEEDS_SIMPLE = {};
Object.entries(TEAM_NEEDS_RICH).forEach(([team, data]) => {
  TEAM_NEEDS_SIMPLE[team] = data.simple_needs || [];
});

export default TEAM_NEEDS_RICH;
