// Scheme profile extraction — parses 32 agent scheme JSONs into normalized numeric profiles
// Static imports so Vite bundles them at build time

import { ABBR_TO_TEAM } from "./teamConfig.js";

import ARI from "../agents/output/scheme/ARI.json";
import ATL from "../agents/output/scheme/ATL.json";
import BAL from "../agents/output/scheme/BAL.json";
import BUF from "../agents/output/scheme/BUF.json";
import CAR from "../agents/output/scheme/CAR.json";
import CHI from "../agents/output/scheme/CHI.json";
import CIN from "../agents/output/scheme/CIN.json";
import CLE from "../agents/output/scheme/CLE.json";
import DAL from "../agents/output/scheme/DAL.json";
import DEN from "../agents/output/scheme/DEN.json";
import DET from "../agents/output/scheme/DET.json";
import GB from "../agents/output/scheme/GB.json";
import HOU from "../agents/output/scheme/HOU.json";
import IND from "../agents/output/scheme/IND.json";
import JAX from "../agents/output/scheme/JAX.json";
import KC from "../agents/output/scheme/KC.json";
import LAC from "../agents/output/scheme/LAC.json";
import LAR from "../agents/output/scheme/LAR.json";
import LV from "../agents/output/scheme/LV.json";
import MIA from "../agents/output/scheme/MIA.json";
import MIN from "../agents/output/scheme/MIN.json";
import NE from "../agents/output/scheme/NE.json";
import NO from "../agents/output/scheme/NO.json";
import NYG from "../agents/output/scheme/NYG.json";
import NYJ from "../agents/output/scheme/NYJ.json";
import PHI from "../agents/output/scheme/PHI.json";
import PIT from "../agents/output/scheme/PIT.json";
import SEA from "../agents/output/scheme/SEA.json";
import SF from "../agents/output/scheme/SF.json";
import TB from "../agents/output/scheme/TB.json";
import TEN from "../agents/output/scheme/TEN.json";
import WSH from "../agents/output/scheme/WSH.json";

const ALL_SCHEMES = { ARI, ATL, BAL, BUF, CAR, CHI, CIN, CLE, DAL, DEN, DET, GB, HOU, IND, JAX, KC, LAC, LAR, LV, MIA, MIN, NE, NO, NYG, NYJ, PHI, PIT, SEA, SF, TB, TEN, WSH };

// Rating text → 0-1 numeric
function ratingToNum(text) {
  if (!text) return 0.4;
  const t = text.toLowerCase().trim();
  if (t === "very high") return 0.9;
  if (t === "high") return 0.8;
  if (t === "medium-high" || t === "medium-to-high") return 0.6;
  if (t === "medium" || t === "moderate") return 0.4;
  if (t === "medium-low" || t === "medium-to-low" || t === "low-to-medium") return 0.3;
  if (t === "low") return 0.2;
  if (t === "none") return 0;
  // Handle compound like "low-to-medium"
  if (t.includes("high")) return 0.7;
  if (t.includes("medium")) return 0.4;
  if (t.includes("low")) return 0.2;
  return 0.4;
}

// Classify defensive front: "34" | "43" | "425" | "multiple"
function classifyFront(text) {
  if (!text) return "43";
  const t = text.toLowerCase();
  if (/3-4|3–4|odd front/.test(t) && !/4-3/.test(t)) return "34";
  if (/4-3|4–3|even front/.test(t) && !/3-4/.test(t)) return "43";
  if (/4-2-5|nickel/.test(t) && !/3-4|4-3/.test(t)) return "425";
  // If both mentioned, check which comes first or which is "base"
  if (/3-4/.test(t) && /4-3/.test(t)) {
    // "3-4 primary" or "3-4 base" → 34
    if (/3-4.*(?:primary|base|lean)/.test(t)) return "34";
    if (/4-3.*(?:primary|base|lean)/.test(t)) return "43";
    return "multiple";
  }
  if (/multiple|hybrid/.test(t)) {
    if (/3-4.*lean/.test(t) || /odd/.test(t)) return "34";
    if (/4-3.*lean/.test(t)) return "43";
    return "multiple";
  }
  return "43";
}

// Classify coverage: "man" | "zone" | "multiple"
function classifyCoverage(text) {
  if (!text) return "multiple";
  const t = text.toLowerCase();
  const manSignals = (t.match(/man[- ]?(heavy|coverage|press)|cover[- ]?[10]/gi) || []).length;
  const zoneSignals = (t.match(/zone[- ]?(heavy|match|coverage)|cover[- ]?[2346]|quarters|mofo|split[- ]?field/gi) || []).length;
  if (manSignals > zoneSignals + 1) return "man";
  if (zoneSignals > manSignals + 1) return "zone";
  if (manSignals > 0 && zoneSignals > 0) return "multiple";
  if (zoneSignals > 0) return "zone";
  if (manSignals > 0) return "man";
  return "multiple";
}

// Classify blitz tendency: "heavy" | "moderate" | "light"
function classifyBlitz(text) {
  if (!text) return "moderate";
  const t = text.toLowerCase();
  if (/heavy|aggressive|high|3[5-9]%|4\d%|5\d%/.test(t)) return "heavy";
  if (/light|low|passive|1[5-9]%|2[0-2]%/.test(t)) return "light";
  return "moderate";
}

// Extract base personnel: "11" | "12" | "13" | "21" | "22"
function classifyPersonnel(text) {
  if (!text) return "11";
  const m = text.match(/\b(1[1-3]|2[1-2])\b/);
  return m ? m[1] : "11";
}

// Classify run scheme: "zone" | "gap" | "mixed"
function classifyRunScheme(text) {
  if (!text) return "mixed";
  const t = text.toLowerCase();
  const zoneSignals = (t.match(/outside zone|wide zone|inside zone|zone[- ]run|zone[- ]based/gi) || []).length;
  const gapSignals = (t.match(/power|gap|counter|duo|man[- ]block|downhill|pin.and.pull/gi) || []).length;
  if (zoneSignals > gapSignals + 1) return "zone";
  if (gapSignals > zoneSignals + 1) return "gap";
  if (zoneSignals > 0 && gapSignals > 0) return "mixed";
  if (zoneSignals > 0) return "zone";
  if (gapSignals > 0) return "gap";
  return "mixed";
}

// Classify pass style: "timing" | "vertical" | "play_action" | "spread"
function classifyPassStyle(passConcepts, schemeFamily) {
  const t = ((passConcepts || "") + " " + (schemeFamily || "")).toLowerCase();
  const timing = (t.match(/timing|west coast|quick game|short-to-intermediate|slant|curl|dig/gi) || []).length;
  const vertical = (t.match(/vertical|deep shot|downfield|air raid|explosive/gi) || []).length;
  const pa = (t.match(/play action|boot|bootleg|naked|rollout|under center/gi) || []).length;
  const spread = (t.match(/spread|rpo|shotgun|horizontal stretch/gi) || []).length;
  const scores = [
    ["play_action", pa],
    ["timing", timing],
    ["vertical", vertical],
    ["spread", spread],
  ];
  scores.sort((a, b) => b[1] - a[1]);
  return scores[0][1] > 0 ? scores[0][0] : "timing";
}

// Classify RPO usage: "high" | "moderate" | "low"
function classifyRpoUsage(text) {
  if (!text) return "moderate";
  const t = text.toLowerCase();
  if (/\b(high|very high|heavy|elite)\b/.test(t)) {
    if (/low-to-|moderate-to-low/.test(t)) return "low";
    return "high";
  }
  if (/\b(low|minimal|not|rarely)\b/.test(t)) {
    if (/moderate-to-high|low-to-high/.test(t)) return "high";
    if (/low-to-moderate/.test(t)) return "low";
    return "low";
  }
  if (/moderate-to-high/.test(t)) return "high";
  if (/moderate-to-low|low-to-moderate/.test(t)) return "low";
  return "moderate";
}

// Classify TE role: "move" | "hybrid" | "inline" | "standard"
function classifyTeRole(text) {
  if (!text) return "standard";
  const t = text.toLowerCase();
  const move = (t.match(/flex|slot|detach|move te|de facto wr|split wide|route tree/gi) || []).length;
  const block = (t.match(/inline|in-line|block|run game|zone block/gi) || []).length;
  const receiving = (t.match(/receiv|weapon|primary target|featured/gi) || []).length;
  if (move >= 2 && block < 2) return "move";
  if (move >= 1 && block >= 2) return "hybrid";
  if (block >= 2 && receiving < 2) return "inline";
  return "standard";
}

// Classify edge type: "standup" | "hands_dirt" | "hybrid"
function classifyEdgeType(text) {
  if (!text) return "hybrid";
  const t = text.toLowerCase();
  const standup = (t.match(/stand-up|stand up|\bolb\b|two-point/gi) || []).length;
  const dirt = (t.match(/hand-in-dirt|hands-in-dirt|4-3 de|hands-down|4-down|hand down/gi) || []).length;
  if (standup > dirt + 1) return "standup";
  if (dirt > standup + 1) return "hands_dirt";
  if (standup > 0 && dirt > 0) return "hybrid";
  if (standup > 0) return "standup";
  if (dirt > 0) return "hands_dirt";
  return "hybrid";
}

// Classify safety role: "hybrid_box" | "versatile" | "deep_first" | "traditional_split"
function classifySafetyRole(text) {
  if (!text) return "traditional_split";
  const t = text.toLowerCase();
  const hybrid = (t.match(/hybrid|box|slot|\blb\b|blitz|chess piece|multiple role|449|85% box|three-safety/gi) || []).length;
  const deep = (t.match(/deep|centerfield|single high|free safety|ballhawk/gi) || []).length;
  if (hybrid >= 4 || /three-safety/.test(t)) return "hybrid_box";
  if (hybrid >= 2) return "versatile";
  if (deep >= 2 && hybrid < 2) return "deep_first";
  return "traditional_split";
}

// Classify LB scheme role: "coverage_first" | "run_coverage" | "blitz_hybrid" | "edge_convert"
function classifyLbSchemeRole(text, defFront) {
  if (!text) return "run_coverage";
  const t = text.toLowerCase();
  const coverage = (t.match(/coverage first|coverage capable|cover|nickel|off ball|only 1 lb/gi) || []).length;
  const rush = (t.match(/pass rush|edge|blitz|rush|stand-up/gi) || []).length;
  const hybrid = (t.match(/hybrid|versatile|chess piece|multiple alignment/gi) || []).length;
  if (rush >= 3 && defFront === "34") return "edge_convert";
  if (hybrid >= 2) return "blitz_hybrid";
  if (coverage >= 3) return "coverage_first";
  return "run_coverage";
}

// Classify offense family: "shanahan_zone" | "west_coast" | "spread_rpo" | "power_run" | "pro_style"
function classifyOffFamily(schemeFamily, runScheme) {
  const t = ((schemeFamily || "") + " " + (runScheme || "")).toLowerCase();
  if (/shanahan|wide zone|outside zone|kubiak/.test(t)) return "shanahan_zone";
  if (/spread|air raid|rpo heavy/.test(t)) return "spread_rpo";
  if (/power|gap primary|downhill|man block/.test(t)) return "power_run";
  if (/west coast|walsh|reid|erhardt-perkins/.test(t)) return "west_coast";
  return "pro_style";
}

function parseScheme(json) {
  const off = json.offense || {};
  const def = json.defense || {};
  const pvi = json.positional_value_inflections || {};
  const defFront = classifyFront(def.base_front);
  return {
    defFront,
    coverageLean: classifyCoverage(def.coverage_base),
    blitzTendency: classifyBlitz(def.blitz_tendency),
    offPersonnel: classifyPersonnel(off.base_personnel),
    runScheme: classifyRunScheme(off.run_scheme),
    teRec: ratingToNum(pvi.te_receiving_boost?.rating),
    lbRush: ratingToNum(pvi.lb_pass_rush_boost?.rating),
    rbDual: ratingToNum(pvi.rb_dual_threat_boost?.rating),
    sHybrid: ratingToNum(pvi.s_hybrid_boost?.rating),
    // Enriched fields
    passStyle: classifyPassStyle(off.pass_concepts, off.scheme_family),
    rpoUsage: classifyRpoUsage(off.rpo_usage),
    teRole: classifyTeRole(off.te_usage),
    edgeType: classifyEdgeType(def.edge_rush_source),
    safetyRole: classifySafetyRole(def.safety_usage),
    lbSchemeRole: classifyLbSchemeRole(def.lb_role, defFront),
    offFamily: classifyOffFamily(off.scheme_family, off.run_scheme),
  };
}

export const SCHEME_PROFILES = {};
for (const [abbr, json] of Object.entries(ALL_SCHEMES)) {
  const teamName = ABBR_TO_TEAM[abbr];
  if (teamName) SCHEME_PROFILES[teamName] = parseScheme(json);
}
