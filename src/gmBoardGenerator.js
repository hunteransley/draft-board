// ═══════════════════════════════════════════════════════════════════════════
// GM Board Generator — Per-GM prospect board generation for AI mock drafts
// Each GM builds their own personal board shaped by their full profile:
// positional value, archetype preferences, measurable thresholds, scheme fit,
// ceiling appetite, position avoidance, and team needs.
// ═══════════════════════════════════════════════════════════════════════════

import ARI from "../agents/output/gm-profiles/ARI.json";
import ATL from "../agents/output/gm-profiles/ATL.json";
import BAL from "../agents/output/gm-profiles/BAL.json";
import BUF from "../agents/output/gm-profiles/BUF.json";
import CAR from "../agents/output/gm-profiles/CAR.json";
import CHI from "../agents/output/gm-profiles/CHI.json";
import CIN from "../agents/output/gm-profiles/CIN.json";
import CLE from "../agents/output/gm-profiles/CLE.json";
import DAL from "../agents/output/gm-profiles/DAL.json";
import DEN from "../agents/output/gm-profiles/DEN.json";
import DET from "../agents/output/gm-profiles/DET.json";
import GB from "../agents/output/gm-profiles/GB.json";
import HOU from "../agents/output/gm-profiles/HOU.json";
import IND from "../agents/output/gm-profiles/IND.json";
import JAX from "../agents/output/gm-profiles/JAX.json";
import KC from "../agents/output/gm-profiles/KC.json";
import LAC from "../agents/output/gm-profiles/LAC.json";
import LAR from "../agents/output/gm-profiles/LAR.json";
import LV from "../agents/output/gm-profiles/LV.json";
import MIA from "../agents/output/gm-profiles/MIA.json";
import MIN from "../agents/output/gm-profiles/MIN.json";
import NE from "../agents/output/gm-profiles/NE.json";
import NO from "../agents/output/gm-profiles/NO.json";
import NYG from "../agents/output/gm-profiles/NYG.json";
import NYJ from "../agents/output/gm-profiles/NYJ.json";
import PHI from "../agents/output/gm-profiles/PHI.json";
import PIT from "../agents/output/gm-profiles/PIT.json";
import SEA from "../agents/output/gm-profiles/SEA.json";
import SF from "../agents/output/gm-profiles/SF.json";
import TB from "../agents/output/gm-profiles/TB.json";
import TEN from "../agents/output/gm-profiles/TEN.json";
import WSH from "../agents/output/gm-profiles/WSH.json";

import { ABBR_TO_TEAM } from "./teamConfig.js";
import { POSITION_TRAITS } from "./positions.js";
import { getConsensusGrade, getConsensusRank } from "./consensusData.js";
import { getScoutingTraits } from "./scoutingData.js";
import { getCombineScores } from "./combineTraits.js";
import { getCombineData } from "./combineData.js";
import { TEAM_NEEDS_SIMPLE, TEAM_NEEDS_COUNTS } from "./teamNeedsData.js";

const RAW_PROFILES = {ARI,ATL,BAL,BUF,CAR,CHI,CIN,CLE,DAL,DEN,DET,GB,HOU,IND,JAX,KC,LAC,LAR,LV,MIA,MIN,NE,NO,NYG,NYJ,PHI,PIT,SEA,SF,TB,TEN,WSH};

// Abbreviation normalization: TEAM_ABBR uses "WAS" but profiles use "WSH"
const ABBR_NORMALIZE = { WAS: "WSH" };
export function normalizeAbbr(abbr) { return ABBR_NORMALIZE[abbr] || abbr; }

// ─── Keyword → Trait Mapping ────────────────────────────────────────────
// Maps natural language from GM archetype descriptions to our trait system.
// Each keyword maps to one or more trait names from POSITION_TRAITS.
const KEYWORD_TRAITS = {
  // Universal
  "motor": ["Motor"], "effort": ["Motor"], "relentless": ["Motor"], "high motor": ["Motor"],
  "athleticism": ["Athleticism"], "athletic": ["Athleticism"], "movement": ["Athleticism"],
  "versatil": ["Athleticism"], "agility": ["Athleticism"],
  "speed": ["Speed"], "fast": ["Speed"], "explosiv": ["Speed","First Step"], "quick": ["Speed","First Step"],
  "instinct": ["Instincts","Pre-Snap Diagnosis"], "football iq": ["Instincts","Decision Making","Pre-Snap Diagnosis"],
  "intelligence": ["Instincts","Decision Making"], "processing": ["Decision Making","Pre-Snap Diagnosis"],
  "character": [], "leadership": ["Leadership"], "captain": ["Leadership"],
  // EDGE / DL
  "pass rush": ["Pass Rush"], "pass-rush": ["Pass Rush"], "sack": ["Pass Rush"],
  "bull rush": ["Power","Pass Rush"], "power": ["Power","Strength"],
  "bend": ["Bend"], "flexibility": ["Bend"],
  "first step": ["First Step"], "get-off": ["First Step"], "first-step": ["First Step"],
  "run defense": ["Run Defense"], "edge setting": ["Run Defense"], "run stop": ["Run Defense"],
  "block shed": ["Block Shedding"], "shed": ["Block Shedding"],
  "hand usage": ["Hand Usage"], "hand technique": ["Hand Usage"],
  "anchor": ["Anchor"],
  "strength": ["Strength","Power"], "strong": ["Strength"],
  // CB / S
  "coverage": ["Man Coverage","Zone Coverage"], "man coverage": ["Man Coverage"],
  "zone coverage": ["Zone Coverage"], "press": ["Press"], "press coverage": ["Press"],
  "ball skills": ["Ball Skills"], "ball hawk": ["Ball Skills"], "interception": ["Ball Skills"],
  "tackling": ["Tackling"], "tackle": ["Tackling"], "run support": ["Tackling"],
  "range": ["Range"], "sideline": ["Range"], "center field": ["Range"],
  "nickel": ["Nickel"], "slot": ["Nickel"],
  // WR / TE
  "route": ["Route Running"], "route running": ["Route Running"], "separation": ["Route Running"],
  "hands": ["Hands"], "catch": ["Hands","Contested Catches"], "reliable hands": ["Hands"],
  "contested": ["Contested Catches"], "contested catch": ["Contested Catches"],
  "yac": ["YAC Ability"], "after the catch": ["YAC Ability"], "yards after": ["YAC Ability"],
  "release": ["Release Package"], "release package": ["Release Package"],
  "receiving": ["Receiving"], "pass catching": ["Pass Catching","Receiving"],
  "blocking": ["Blocking","Run Blocking"],
  // OL
  "pass protect": ["Pass Protection"], "pass block": ["Pass Protection"],
  "run block": ["Run Blocking"], "run blocking": ["Run Blocking"],
  "footwork": ["Footwork"], "feet": ["Footwork"], "foot speed": ["Footwork"],
  "pulling": ["Pulling"], "pull": ["Pulling"],
  // QB
  "arm strength": ["Arm Strength"], "arm talent": ["Arm Strength"], "arm": ["Arm Strength"],
  "accuracy": ["Accuracy"], "accurate": ["Accuracy"],
  "pocket": ["Pocket Presence"], "pocket presence": ["Pocket Presence"],
  "mobility": ["Mobility"], "scrambl": ["Mobility"], "escapab": ["Mobility"],
  "decision": ["Decision Making"],
  // RB
  "vision": ["Vision"], "patience": ["Vision"],
  "contact balance": ["Contact Balance"], "balance": ["Contact Balance"],
  "elusiv": ["Elusiveness"], "elusive": ["Elusiveness"], "juke": ["Elusiveness"],
  "power": ["Power"], "between the tackles": ["Power","Contact Balance"],
  // LB
  "blitz": ["Pass Rush"], "pre-snap": ["Pre-Snap Diagnosis"],
};

// ─── Parse Position Avoidance ───────────────────────────────────────────
// Converts text array like ["RB before Round 3", "QB in Round 1"] to structured rules
function parseAvoidance(avoidanceTexts) {
  if (!avoidanceTexts || !Array.isArray(avoidanceTexts)) return [];
  const rules = [];
  for (const text of avoidanceTexts) {
    const lower = text.toLowerCase();
    // Extract position (first word or two-letter code)
    const posMatch = lower.match(/^(qb|rb|wr|te|ot|ol|iol|edge|dl|dt|lb|cb|s|k|p)\b/);
    if (!posMatch) continue;
    const pos = posMatch[1].toUpperCase();
    // Extract round constraint
    let maxRound = 1; // default: avoidance in round 1
    if (lower.includes("round 1") || lower.includes("r1")) maxRound = 1;
    if (lower.includes("round 2") || lower.includes("r2") || lower.includes("before round 3")) maxRound = 2;
    if (lower.includes("round 3") || lower.includes("r3") || lower.includes("before round 4")) maxRound = 3;
    if (lower.includes("early round") || lower.includes("rounds 1-3") || lower.includes("first three")) maxRound = 3;
    if (lower.includes("rounds 1-2") || lower.includes("first two")) maxRound = 2;
    if (lower.includes("before day 3") || lower.includes("day 1-2")) maxRound = 3;
    // "never" with no round qualifier → all rounds
    if (lower.includes("never") && !lower.match(/round|r[1-7]/)) maxRound = 7;
    rules.push({ pos, maxRound, raw: text });
  }
  return rules;
}

// ─── Parse Measurable Thresholds ────────────────────────────────────────
// Normalizes the inconsistent threshold data across profiles into numeric values
function parseThresholds(thresholdsByPos) {
  if (!thresholdsByPos) return {};
  const parsed = {};
  for (const [pos, data] of Object.entries(thresholdsByPos)) {
    const t = {};
    // 40-yard dash max
    const fortyVal = data["40_yard_max"] || data["40_yard_preferred"];
    if (typeof fortyVal === "number") t.maxForty = fortyVal;
    // Height minimum (parse "6-3" or "6'3" or 75 inches)
    const htStr = data["min_height"] || "";
    if (typeof htStr === "string") {
      const htMatch = htStr.match(/(\d)-(\d+)/);
      if (htMatch) t.minHeight = parseInt(htMatch[1]) * 12 + parseInt(htMatch[2]);
    } else if (typeof htStr === "number") t.minHeight = htStr;
    // Weight minimum
    if (typeof data["min_weight"] === "number") t.minWeight = data["min_weight"];
    // Arm length minimum (parse "33 inches" or "33.75")
    const armStr = data["min_arm_length"] || "";
    if (typeof armStr === "number") t.minArms = armStr;
    else if (typeof armStr === "string") {
      const armMatch = armStr.match(/([\d.]+)\s*inch/);
      if (armMatch) t.minArms = parseFloat(armMatch[1]);
      else {
        const numMatch = armStr.match(/([\d.]+)/);
        if (numMatch && parseFloat(numMatch[1]) > 20) t.minArms = parseFloat(numMatch[1]);
      }
    }
    t.confidence = data["confidence"] || "medium";
    if (Object.keys(t).length > 1) parsed[pos.toUpperCase()] = t;
  }
  return parsed;
}

// ─── Extract Trait Preferences from Archetype Text ──────────────────────
function extractTraitPrefs(archetype, pos) {
  const posTraits = POSITION_TRAITS[pos] || [];
  const posTraitSet = new Set(posTraits);
  const valued = new Map(); // trait → count of mentions
  const devalued = new Set();
  const dealBreakers = [];

  function scanText(textArray, target) {
    if (!textArray) return;
    for (const text of textArray) {
      const lower = text.toLowerCase();
      for (const [keyword, traits] of Object.entries(KEYWORD_TRAITS)) {
        if (lower.includes(keyword)) {
          for (const trait of traits) {
            if (posTraitSet.has(trait)) target.set(trait, (target.get(trait) || 0) + 1);
          }
        }
      }
    }
  }

  if (archetype?.playing_style) {
    const style = archetype.playing_style;
    // Most valued traits
    const valuedMap = new Map();
    scanText(style.most_valued_traits || [], valuedMap);
    for (const [trait, count] of valuedMap) valued.set(trait, (valued.get(trait) || 0) + count);
    // Traits that make them reach (also valued)
    if (style.traits_that_make_them_reach) {
      const reachMap = new Map();
      scanText([style.traits_that_make_them_reach], reachMap);
      for (const [trait, count] of reachMap) valued.set(trait, (valued.get(trait) || 0) + count);
    }
    // Least important
    if (style.least_important_traits) {
      for (const text of style.least_important_traits) {
        const lower = text.toLowerCase();
        for (const [keyword, traits] of Object.entries(KEYWORD_TRAITS)) {
          if (lower.includes(keyword)) traits.forEach(t => { if (posTraitSet.has(t)) devalued.add(t); });
        }
      }
    }
    // Deal breakers
    if (style.deal_breakers) {
      for (const text of style.deal_breakers) {
        const lower = text.toLowerCase();
        const matchedTraits = new Set();
        for (const [keyword, traits] of Object.entries(KEYWORD_TRAITS)) {
          if (lower.includes(keyword)) traits.forEach(t => { if (posTraitSet.has(t)) matchedTraits.add(t); });
        }
        if (matchedTraits.size > 0) dealBreakers.push({ traits: [...matchedTraits], text });
      }
    }
  }

  // Remove conflicts (if a trait is both valued and devalued, valued wins)
  for (const t of valued.keys()) devalued.delete(t);

  return { valued, devalued, dealBreakers };
}

// ─── Build GM Parameters ────────────────────────────────────────────────
// One-time extraction from rich profiles → computational parameters
function buildGMParams(abbr, profile) {
  const phil = profile.draft_philosophy || {};
  const psych = profile.psychological_profile || {};
  const trade = profile.trade_behavior || {};
  const pv = profile.positional_value || {};
  const thresh = profile.measurable_thresholds || {};
  const archetypes = profile.player_archetype_preferences || {};

  // BPA weight by round (default to overall weight)
  const bpaByRound = phil.bpa_weight_by_round || {};
  const bpaDefault = phil.bpa_weight || 0.5;
  const bpaWeight = {
    1: bpaByRound["1"] ?? bpaDefault,
    2: bpaByRound["2"] ?? bpaDefault,
    3: bpaByRound["3"] ?? Math.max(bpaDefault - 0.1, 0.3),
    4: bpaByRound["4_plus"] ?? bpaByRound["4"] ?? Math.max(bpaDefault - 0.2, 0.25),
  };

  // Position value tiers → multiplier map
  // Wide spread so GM personality actually reshapes the board
  const tiers = pv.position_value_tiers || {};
  const posValueMap = {};
  for (const pos of (tiers.tier_1_premium || [])) posValueMap[pos] = 1.22;
  for (const pos of (tiers.tier_2_high || [])) posValueMap[pos] = 1.06;
  for (const pos of (tiers.tier_3_mid || [])) posValueMap[pos] = 0.88;
  for (const pos of (tiers.tier_4_low || [])) posValueMap[pos] = 0.45;

  // Position avoidance rules
  const avoidance = parseAvoidance(pv.position_avoidance || []);

  // Measurable thresholds
  const measurables = parseThresholds(thresh.athletic_thresholds_by_position);

  // Archetype trait preferences per position
  const traitPrefs = {};
  for (const [pos, arch] of Object.entries(archetypes)) {
    traitPrefs[pos] = extractTraitPrefs(arch, pos);
  }

  // Physical profile ranges per position (height/weight/arm expectations from archetypes)
  const physicalProfiles = {};
  for (const [pos, arch] of Object.entries(archetypes)) {
    if (!arch.physical_profile) continue;
    const pp = arch.physical_profile;
    const parsed = {};
    // Parse height range "6-2 to 6-5"
    const htRange = (pp.height_range || "").match(/(\d)-(\d+)\s*to\s*(\d)-(\d+)/);
    if (htRange) {
      parsed.minHeight = parseInt(htRange[1]) * 12 + parseInt(htRange[2]);
      parsed.maxHeight = parseInt(htRange[3]) * 12 + parseInt(htRange[4]);
    }
    // Parse weight range "250-275" or "250 to 275"
    const wtRange = (pp.weight_range || "").match(/(\d+)\s*[-–to]+\s*(\d+)/);
    if (wtRange) {
      parsed.minWeight = parseInt(wtRange[1]);
      parsed.maxWeight = parseInt(wtRange[2]);
    }
    if (Object.keys(parsed).length > 0) physicalProfiles[pos] = parsed;
  }

  return {
    abbr,
    team: ABBR_TO_TEAM[abbr] || abbr,
    gm: profile.front_office?.gm?.name || "Unknown",
    confidence: profile.confidence || "medium",
    bpaWeight,
    posValueMap,
    avoidance,
    measurables,
    physicalProfiles,
    traitPrefs,
    riskTolerance: psych.risk_tolerance ?? 0.5,
    recencyBias: psych.recency_bias ?? 0.5,
    combineWeight: psych.combine_weight ?? 0.5,
    characterWeight: psych.character_weight ?? 0.5,
    tradeUpAggression: trade.trade_up_aggression ?? 0.3,
    tradeDownWillingness: trade.trade_down_willingness ?? 0.3,
    tradeTriggers: trade.trade_triggers || [],
    roundStrategy: profile.round_strategy || {},
  };
}

// ─── Build All GM Parameters ────────────────────────────────────────────
export const GM_PARAMS = {};
for (const [abbr, profile] of Object.entries(RAW_PROFILES)) {
  GM_PARAMS[abbr] = buildGMParams(abbr, profile);
}


// ─── Gaussian Random ────────────────────────────────────────────────────
function gaussRandom(sigma = 1) {
  let u, v, s;
  do { u = Math.random() * 2 - 1; v = Math.random() * 2 - 1; s = u * u + v * v; } while (s >= 1 || s === 0);
  return sigma * u * Math.sqrt(-2 * Math.log(s) / s);
}

// ─── Generate Per-Sim Noise ─────────────────────────────────────────────
// Each sim iteration, every GM's evaluation shifts slightly
export function generateSimNoise(prospectIds) {
  const noise = {};
  const wobbled = {};
  for (const [abbr, gm] of Object.entries(GM_PARAMS)) {
    // Per-prospect grade noise: gaussian, sigma based on how uncertain this GM is
    const sigma = 2.5 + gm.riskTolerance * 2; // risk-tolerant GMs have wider evaluations (~3.5-4.5)
    const teamNoise = {};
    for (const id of prospectIds) {
      teamNoise[id] = Math.max(-8, Math.min(8, gaussRandom(sigma)));
    }
    noise[abbr] = teamNoise;
    // Wobble BPA weight slightly (±0.06)
    const wobbledBpa = {};
    for (const [round, val] of Object.entries(gm.bpaWeight)) {
      wobbledBpa[round] = Math.max(0.15, Math.min(0.90, val + gaussRandom(0.04)));
    }
    wobbled[abbr] = { ...gm, bpaWeight: wobbledBpa };
  }
  return { noise, wobbled };
}

// ─── Position Value Multiplier ──────────────────────────────────────────
function getPositionValue(gpos, gm) {
  return gm.posValueMap[gpos] ?? 1.0;
}

// ─── Position Avoidance Penalty ─────────────────────────────────────────
// Returns a multiplier: 1.0 (no avoidance), or a heavy penalty
function getAvoidancePenalty(gpos, gm, round) {
  for (const rule of gm.avoidance) {
    if (rule.pos === gpos && round <= rule.maxRound) {
      return 0.20;
    }
  }
  return 1.0;
}

// ─── Measurable Fit Score ───────────────────────────────────────────────
// Checks prospect's physical measurements against GM's thresholds
function getMeasurableFit(gpos, gm, combineRaw) {
  if (!combineRaw) return 1.0;
  const thresh = gm.measurables[gpos];
  const phys = gm.physicalProfiles[gpos];
  let score = 1.0;
  const weight = 0.4 + gm.combineWeight * 0.6; // how much measurables matter (0.6-1.0 range)

  if (thresh) {
    // 40-yard dash
    if (thresh.maxForty && combineRaw.forty) {
      if (combineRaw.forty > thresh.maxForty + 0.08) score *= lerp(0.80, 0.90, weight);
      else if (combineRaw.forty > thresh.maxForty) score *= lerp(0.92, 0.96, weight);
      else if (combineRaw.forty < thresh.maxForty - 0.08) score *= lerp(1.04, 1.08, weight);
    }
    // Height
    if (thresh.minHeight && combineRaw.height) {
      if (combineRaw.height < thresh.minHeight - 2) score *= lerp(0.82, 0.88, weight);
      else if (combineRaw.height < thresh.minHeight) score *= lerp(0.92, 0.96, weight);
    }
    // Weight
    if (thresh.minWeight && combineRaw.weight) {
      if (combineRaw.weight < thresh.minWeight - 15) score *= lerp(0.85, 0.90, weight);
      else if (combineRaw.weight < thresh.minWeight) score *= lerp(0.93, 0.97, weight);
    }
    // Arm length
    if (thresh.minArms && combineRaw.arms) {
      if (combineRaw.arms < thresh.minArms - 1) score *= lerp(0.78, 0.85, weight);
      else if (combineRaw.arms < thresh.minArms) score *= lerp(0.90, 0.95, weight);
      else if (combineRaw.arms > thresh.minArms + 1.5) score *= lerp(1.02, 1.06, weight);
    }
  }

  // Physical profile fit from archetype (height/weight range preferences)
  if (phys) {
    if (phys.minHeight && phys.maxHeight && combineRaw.height) {
      if (combineRaw.height >= phys.minHeight && combineRaw.height <= phys.maxHeight) score *= 1.02;
      else if (combineRaw.height < phys.minHeight - 2 || combineRaw.height > phys.maxHeight + 2) score *= 0.96;
    }
    if (phys.minWeight && phys.maxWeight && combineRaw.weight) {
      if (combineRaw.weight >= phys.minWeight && combineRaw.weight <= phys.maxWeight) score *= 1.02;
      else if (combineRaw.weight < phys.minWeight - 15 || combineRaw.weight > phys.maxWeight + 15) score *= 0.96;
    }
  }

  return score;
}

function lerp(a, b, t) { return a + (b - a) * Math.max(0, Math.min(1, t)); }

// ─── Archetype Match Score ──────────────────────────────────────────────
// How well does this prospect's trait profile match what this GM values?
function getArchetypeMatch(gpos, gm, traits) {
  if (!traits) return 1.0;
  const prefs = gm.traitPrefs[gpos];
  if (!prefs) return 1.0;

  let score = 1.0;
  let valuedSum = 0, valuedCount = 0;

  // Reward high values on traits the GM values — amplified range
  for (const [trait, mentions] of prefs.valued) {
    const val = traits[trait];
    if (val == null) continue;
    valuedSum += val;
    valuedCount++;
    const emphasis = Math.min(mentions, 3) / 3; // 0.33 to 1.0
    if (val >= 85) score *= 1.0 + 0.06 * emphasis;
    else if (val >= 75) score *= 1.0 + 0.03 * emphasis;
    else if (val < 55) score *= 1.0 - 0.05 * emphasis;
  }

  // Valued trait average bonus/penalty — wider swing
  if (valuedCount >= 2) {
    const avg = valuedSum / valuedCount;
    if (avg >= 82) score *= 1.08;
    else if (avg >= 72) score *= 1.03;
    else if (avg < 58) score *= 0.90;
  }

  // Deal breaker penalties — harsher
  for (const db of prefs.dealBreakers) {
    const traitVals = db.traits.map(t => traits[t]).filter(v => v != null);
    if (traitVals.length > 0) {
      const avg = traitVals.reduce((a, b) => a + b, 0) / traitVals.length;
      if (avg < 50) score *= 0.82;
      else if (avg < 60) score *= 0.90;
    }
  }

  return score;
}

// ─── Ceiling Modifier ───────────────────────────────────────────────────
function getCeilingModifier(traits, gm) {
  const ceiling = traits?.__ceiling || "normal";
  const risk = gm.riskTolerance;
  if (ceiling === "elite") return 1.0 + risk * 0.12;
  if (ceiling === "high") return 1.0 + risk * 0.06;
  if (ceiling === "low") return 1.0 - risk * 0.04;
  return 1.0;
}

// ─── Need Integration ───────────────────────────────────────────────────
// Light need influence on the board (heavier adjustment happens live during draft)
function getNeedBoost(gpos, teamAbbr) {
  const needs = TEAM_NEEDS_SIMPLE[teamAbbr] || [];
  const counts = TEAM_NEEDS_COUNTS[teamAbbr] || {};
  const count = counts[gpos] || 0;
  const isListed = needs.includes(gpos);
  if (count >= 3) return 1.08;
  if (count >= 2) return 1.05;
  if (isListed) return 1.03;
  return 1.0;
}

// ─── Scheme Fit ─────────────────────────────────────────────────────────
// Wraps the precomputed scheme fit into a board multiplier
function getSchemeFitMult(schemeFitScore, gm) {
  if (schemeFitScore == null) return 1.0;
  // Score is 0-100, center at 50. Convert to 0.85-1.15 range.
  const raw = 1.0 + (schemeFitScore - 50) / 200;
  // GM's scheme sensitivity: contend teams care more, rebuild less
  const sensitivity = gm.combineWeight > 0.5 ? 0.7 : 0.5; // rough proxy; scheme-conscious GMs weight it more
  return 1.0 + (raw - 1.0) * sensitivity;
}

// ═══════════════════════════════════════════════════════════════════════════
// BOARD GENERATION — The Heart of the System
// ═══════════════════════════════════════════════════════════════════════════

// Resolve granular position: use prospect.gpos (set by App.jsx) when available
function resolvePos(prospect) {
  const gpos = prospect.gpos || prospect.pos;
  // Normalize aliases to match GM profile keys
  if (gpos === "IDL" || gpos === "NT" || gpos === "DT") return "DT";
  if (gpos === "DE" || gpos === "OLB" || gpos === "EDGE") return "EDGE";
  if (gpos === "OG" || gpos === "OC" || gpos === "G" || gpos === "C") return "IOL";
  if (gpos === "T" || gpos === "OT") return "OT";
  if (gpos === "FS" || gpos === "SS" || gpos === "SAF") return "S";
  // Fallback: if still generic, try to infer from scouting traits
  if (gpos === "DL") {
    const sc = getScoutingTraits(prospect.name, prospect.school);
    return (sc?.Bend || sc?.["First Step"]) ? "EDGE" : "DT";
  }
  if (gpos === "DB") {
    const sc = getScoutingTraits(prospect.name, prospect.school);
    return (sc?.["Man Coverage"] || sc?.Press) ? "CB" : "S";
  }
  if (gpos === "OL") {
    const sc = getScoutingTraits(prospect.name, prospect.school);
    return sc?.Footwork ? "OT" : "IOL";
  }
  return gpos;
}

// Score a single prospect through a single GM's lens
function scoreProspect(prospect, gm, noise, schemeFits, round) {
  const { id, name, school } = prospect;
  const gpos = resolvePos(prospect);

  // 1. BASE GRADE: consensus + per-sim noise
  const consensusGrade = getConsensusGrade(name);
  const consensusRank = getConsensusRank(name);
  const gradeNoise = noise?.[id] || 0;
  const grade = Math.max(20, Math.min(99, consensusGrade + gradeNoise));

  // Flatter curve: lets GM personality matter more relative to raw consensus
  const base = Math.pow(grade, 1.15);

  // 2. POSITIONAL VALUE: where does this GM rank this position?
  let posValue = getPositionValue(gpos, gm);

  // TRANSCENDENT OVERRIDE: truly special prospects overcome positional discount.
  // Three paths — all require elite ceiling as the gate.
  const traits = getScoutingTraits(name, school);
  const ceiling = traits?.__ceiling || "normal";
  const combineScores = getCombineScores(name, school);
  const athScore = combineScores?.athleticScore || 0;
  if (ceiling === "elite") {
    const isTranscendent =
      (grade >= 95 && athScore >= 98) ||   // path 1: elite athlete + elite grade
      (grade >= 98) ||                      // path 2: generational grade alone
      (consensusRank <= 5 && grade >= 95);  // path 3: consensus top 5 + elite grade
    if (isTranscendent) {
      // Transcendent = transcends position. Compete as tier 1.
      posValue = Math.max(posValue, 1.22);
    }
  }

  // 3. ARCHETYPE MATCH: does this prospect fit what the GM wants at this position?
  const archMatch = getArchetypeMatch(gpos, gm, traits);

  // 4. MEASURABLE FIT: does this prospect meet the GM's physical thresholds?
  const combineRaw = getCombineData(name, school);
  const measFit = getMeasurableFit(gpos, gm, combineRaw);

  // 5. SCHEME FIT: precomputed per team × prospect
  const sfData = schemeFits?.[gm.team]?.[id] || schemeFits?.[gm.abbr]?.[id];
  const sfScore = sfData?.score ?? 50;
  const schemeMult = getSchemeFitMult(sfScore, gm);

  // 6. CEILING MODIFIER: GM's appetite for upside
  const ceilingMod = getCeilingModifier(traits, gm);

  // 7. POSITION AVOIDANCE: heavy penalty for positions the GM historically avoids
  const avoidPenalty = getAvoidancePenalty(gpos, gm, round || 1);

  // 8. NEED: light boost for positions the team needs
  const needBoost = getNeedBoost(gpos, gm.abbr);

  // COMPOSITE BOARD SCORE
  const boardScore = base * posValue * archMatch * measFit * schemeMult * ceilingMod * avoidPenalty * needBoost;

  return { id, name, pos: gpos, boardScore, grade, consensusRank, consensusGrade };
}

// Generate a complete board for one GM
export function generateBoard(gmOrAbbr, prospects, noise, schemeFits) {
  const gm = typeof gmOrAbbr === "string" ? GM_PARAMS[gmOrAbbr] : gmOrAbbr;
  if (!gm) return [];

  // Score every prospect for round 1 by default (avoidance is round-specific,
  // but the board represents the GM's pre-draft ranking; round-specific
  // avoidance adjustments happen live during picks)
  const scored = prospects.map(p => scoreProspect(p, gm, noise, schemeFits, 1));
  scored.sort((a, b) => b.boardScore - a.boardScore);
  return scored;
}

// Generate boards for all 32 GMs
export function generateAllBoards(prospects, noise, schemeFits) {
  const boards = {};
  for (const abbr of Object.keys(GM_PARAMS)) {
    boards[abbr] = generateBoard(abbr, prospects, noise, schemeFits);
  }
  return boards;
}

// ═══════════════════════════════════════════════════════════════════════════
// LIVE PICK DECISION — What happens when a GM is on the clock
// ═══════════════════════════════════════════════════════════════════════════

// Softmax selection from candidate pool
function softmaxSelect(candidates, temperature) {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  const maxScore = candidates[0].liveScore;
  const weights = candidates.map(c => Math.exp((c.liveScore - maxScore) / temperature));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r <= 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

// The Flicker — a GM's small chance of breaking their own patterns
function shouldFlicker(prospect, gm, currentPick) {
  let pressure = 0;

  // Generational talent
  if (prospect.grade >= 97) pressure += 0.22;
  else if (prospect.grade >= 95) pressure += 0.12;
  else if (prospect.grade >= 92) pressure += 0.05;

  // Massive slide past consensus
  const slide = currentPick - prospect.consensusRank;
  if (slide >= 20) pressure += 0.18;
  else if (slide >= 15) pressure += 0.12;
  else if (slide >= 10) pressure += 0.06;

  // Elite ceiling
  // (can't easily check here without traits, so we use grade as proxy for now)

  // GM's own risk tolerance amplifies the flicker
  pressure *= (0.5 + gm.riskTolerance * 0.7);

  // Cap at 30%
  return Math.random() < Math.min(pressure, 0.30);
}

// Pick from board with live adjustments
// Premium positions that teams realistically stack (EDGE, OT, CB, DT)
const STACKABLE_POSITIONS = new Set(["EDGE", "OT", "CB", "DT"]);

export function pickFromBoard(board, gm, context) {
  const {
    available,     // Set of available prospect IDs
    round,         // Current round (1-7)
    currentPick,   // Overall pick number
    alreadyDrafted, // Map of pos → count already drafted by this team
    recentPosCounts, // Map of pos → count in last 5 picks across all teams
    teamNeeds,     // Current team needs (updated as draft progresses)
    teamPickHistory, // Array of {pos, pick} for this team's prior picks
  } = context;

  const roundKey = round <= 3 ? round : 4;
  const bpaWeight = gm.bpaWeight[roundKey] ?? 0.4;
  const needWeight = 1.0 - bpaWeight;

  // Filter to available prospects
  const candidates = [];
  for (const entry of board) {
    if (!available.has(entry.id)) continue;

    let liveScore = entry.boardScore;

    // ── Round-specific avoidance re-evaluation ──
    // Board was scored with round 1 avoidance. For later rounds, recalculate.
    if (round > 1) {
      const boardAvoid = getAvoidancePenalty(entry.pos, gm, 1);
      const liveAvoid = getAvoidancePenalty(entry.pos, gm, round);
      if (boardAvoid !== liveAvoid) {
        // Undo board avoidance, apply live avoidance
        liveScore = (liveScore / boardAvoid) * liveAvoid;
      }
    }

    // ── Live need adjustment ──
    const needs = teamNeeds || TEAM_NEEDS_SIMPLE[gm.abbr] || [];
    const needCounts = TEAM_NEEDS_COUNTS[gm.abbr] || {};
    const posNeed = needCounts[entry.pos] || 0;
    const isListed = needs.includes?.(entry.pos) || (Array.isArray(needs) && needs.includes(entry.pos));
    let needMult = 1.0;
    if (posNeed >= 3) needMult = 1.0 + needWeight * 0.35;
    else if (posNeed >= 2) needMult = 1.0 + needWeight * 0.25;
    else if (posNeed >= 1 || isListed) needMult = 1.0 + needWeight * 0.15;
    else needMult = 1.0 - needWeight * 0.10; // slight penalty for non-needs in need-heavy rounds
    liveScore *= needMult;

    // ── Slide bonus (falling talent detection) ──
    const slide = currentPick - entry.consensusRank;
    if (slide > 8) {
      const gradeMultiplier = entry.grade >= 88 ? 0.025 : entry.grade >= 80 ? 0.018 : 0.012;
      liveScore *= 1.0 + (slide - 8) * gradeMultiplier;
    }
    // Reach penalty
    const reachThreshold = 10 + gm.riskTolerance * 18; // 10-28 spots
    if (slide < -reachThreshold && round <= 3) {
      liveScore *= 0.85 - Math.abs(slide + reachThreshold) * 0.015;
    }

    // ── Positional saturation with proximity decay ──
    // "The board reshuffles the moment you draft someone at a position."
    // Penalty is harsh when the last pick at this position was recent,
    // and decays as picks pass. Premium positions decay faster (stacking is realistic).
    const already = alreadyDrafted?.[entry.pos] || 0;
    if (already >= 3) {
      liveScore *= 0.20; // three at one position is almost impossible
    } else if (already >= 1 && teamPickHistory?.length > 0) {
      // Find the most recent pick at this position
      const lastAtPos = teamPickHistory.filter(h => h.pos === entry.pos).sort((a, b) => b.pick - a.pick)[0];
      if (lastAtPos) {
        const pickGap = currentPick - lastAtPos.pick;
        const isStackable = STACKABLE_POSITIONS.has(entry.pos);
        // Proximity penalty: harsh when close, decays toward 1.0 over distance
        // Premium positions recover faster (halved decay distance)
        const decayRate = isStackable ? 0.020 : 0.012; // picks to recover ~1 point of penalty
        const proximityPenalty = Math.min(1.0, 0.35 + pickGap * decayRate);
        // Count penalty: second pick is penalized, third is brutal
        const countMult = already >= 2 ? 0.50 : 1.0;
        liveScore *= proximityPenalty * countMult;
      }
    }

    // ── Positional run penalty (too many of this pos taken recently) ──
    const recentRun = recentPosCounts?.[entry.pos] || 0;
    if (recentRun >= 4) liveScore *= 0.75;
    else if (recentRun >= 3) liveScore *= 0.85;
    else if (recentRun >= 2) liveScore *= 0.94;

    candidates.push({ ...entry, liveScore });
    if (candidates.length >= 30) break; // only need top ~30 from board
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.liveScore - a.liveScore);

  // ── The Flicker ──
  // Check top 5 candidates for an extraordinary situation that overrides avoidance
  for (let i = 0; i < Math.min(5, candidates.length); i++) {
    const c = candidates[i];
    const avoidPenalty = getAvoidancePenalty(c.pos, gm, round);
    if (avoidPenalty < 1.0 && shouldFlicker(c, gm, currentPick)) {
      // Override: recalculate without avoidance penalty
      c.liveScore /= avoidPenalty;
      // Re-sort after flicker
      candidates.sort((a, b) => b.liveScore - a.liveScore);
      break; // only one flicker per pick
    }
  }

  // ── Softmax selection from top tier ──
  const topScore = candidates[0].liveScore;
  // Tier window: tighter in early rounds (less randomness), wider later
  const tierPct = round <= 1 ? 0.08 : round <= 3 ? 0.13 : round <= 5 ? 0.20 : 0.28;
  // If top candidate is elite grade, tighten the tier (clear best player)
  const eliteTighten = candidates[0].grade >= 90 ? 0.6 : candidates[0].grade >= 85 ? 0.8 : 1.0;
  const threshold = topScore * (1 - tierPct * eliteTighten);
  const tier = candidates.filter(c => c.liveScore >= threshold).slice(0, 5);

  // Temperature: lower = top candidate wins more often
  const temp = round <= 1 ? 2.5 : round <= 3 ? 2.0 : round <= 5 ? 1.5 : 1.2;

  return softmaxSelect(tier, temp);
}

// ═══════════════════════════════════════════════════════════════════════════
// TRADE EVALUATION — GM-specific trade behavior
// ═══════════════════════════════════════════════════════════════════════════

// Jimmy Johnson trade value chart (simplified)
const TRADE_VALUES = [3000,2600,2200,1800,1700,1600,1500,1400,1350,1300,1250,1200,1150,1100,1050,1000,950,900,875,850,800,780,760,740,720,700,680,660,640,620,600,590,580,560,550,540,520,510,500,490,480,470,460,450,440,430,420,410,400,390,380,370,360,350,340,330,320,310,300,290,280,270,260,250,240,230,220,215,210,205,200,195,190,185,180,175,170,165,160,155,150,148,146,144,142,140,138,136,134,132,130,128,126,124,122,120,118,116,114,112,110,108,106,104,102,100,99,98,97,96,95,94,93,92,91,90,89,88,87,86,85,84,83,82,81,80,79,78,77,76,75,74,73,72,71,70,69,68,67,66,65,64,63,62,61,60,59,58,57,56,55,54,53,52,51,50,49,48,47,46,45,44,43,42,41,40,39,38,37,36,35,34,33,32,31,30,29,28,27,26,25,24,23,22,21,20,19,18,17,16,15,14,13,12,11,10,9,8,7,6,5,5,5,5,5,4,4,4,4,4,3,3,3,3,3,3,3,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1];
function getTradeValue(pick) { return TRADE_VALUES[Math.min(pick - 1, TRADE_VALUES.length - 1)] || 1; }

// Evaluate whether a team should trade up to a target pick
export function evaluateTradeUp(traderAbbr, targetPick, traderPick, board, available, context) {
  const gm = GM_PARAMS[traderAbbr];
  if (!gm) return null;

  // Find trader's best available prospect at their pick vs at target pick
  const traderBoard = board.filter(e => available.has(e.id));
  if (traderBoard.length < 2) return null;
  const bestAtTarget = traderBoard[0]; // best player available NOW
  const bestAtOwnPick = traderBoard[Math.min(targetPick - traderPick, traderBoard.length - 1)];

  // Separation: how much better is the target pick's best vs own pick's best?
  const separation = bestAtOwnPick.boardScore > 0
    ? bestAtTarget.boardScore / bestAtOwnPick.boardScore
    : 2.0;
  if (separation < 1.12) return null; // not enough value gap to trade up

  // Trade value math
  const targetValue = getTradeValue(targetPick);
  const traderValue = getTradeValue(traderPick);
  if (traderValue < targetValue * 0.78) return null; // can't afford it

  // Probability based on GM's trade-up aggression and the value gap
  let prob = gm.tradeUpAggression * 0.3; // base
  if (separation >= 1.30) prob += 0.20;
  else if (separation >= 1.20) prob += 0.12;
  else if (separation >= 1.15) prob += 0.06;

  // Top picks amplify willingness (stakes are higher)
  if (targetPick <= 10) prob *= 1.4;
  else if (targetPick <= 20) prob *= 1.2;

  prob = Math.min(prob, 0.45);

  if (Math.random() >= prob) return null;

  return {
    trader: traderAbbr,
    targetPick,
    targetPlayer: bestAtTarget,
    traderPick,
    separation,
    prob,
    valueGap: targetValue - traderValue,
  };
}
