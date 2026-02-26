#!/usr/bin/env node
/**
 * Combine Trait Adjustment Calculator (v2 — Winks Research-Based)
 *
 * Reads src/combineData.json + src/scoutingTraits.json, applies research-backed
 * drill-to-trait mappings with Speed Score and position splits, outputs
 * scripts/combine-trait-adjustments.json for review.
 *
 * KEY CHANGES from v1 (based on Hayden Winks combine research):
 * - Speed Score (weight-adjusted 40) added as primary for most positions; raw 40 kept as partial
 * - Position splits: RB at 210lbs, WR at 6'0, DT at 310lbs
 * - Three Cone is #1 for EDGE (promoted from partial to primary)
 * - Bench Press demoted everywhere except OT
 * - Vertical promoted for CB and S
 *
 * USAGE:
 *   node scripts/combineTraits.js                       # all prospects
 *   node scripts/combineTraits.js --position WR         # filter by position
 *   node scripts/combineTraits.js --prospect "Mendoza"  # single prospect
 */

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ── ANSI Colors ──────────────────────────────────────────────
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
  gray: "\x1b[90m",
};

// ── Load Data ────────────────────────────────────────────────
const combineData = JSON.parse(readFileSync(join(ROOT, "src/combineData.json"), "utf8"));
const scoutingTraits = JSON.parse(readFileSync(join(ROOT, "src/scoutingTraits.json"), "utf8"));

// Load prospect list from prospectStats.js to get gpos
const statsSource = readFileSync(join(ROOT, "src/prospectStats.js"), "utf8");
const jsonMatch = statsSource.match(/const S=(\{.*?\});/s);
if (!jsonMatch) throw new Error("Could not parse S from prospectStats.js");
const prospectStats = JSON.parse(jsonMatch[1]);

// Also load BBL prospect list from App.jsx for pos fallback
const appSource = readFileSync(join(ROOT, "src/App.jsx"), "utf8");
const rawMatch = appSource.match(/const PROSPECTS_RAW=\[([\s\S]*?)\];/);

// ── Position Traits (from scoutingAgent.js) ──────────────────
const POSITION_TRAITS = {
  QB: ["Arm Strength", "Accuracy", "Pocket Presence", "Mobility", "Decision Making", "Leadership"],
  RB: ["Vision", "Contact Balance", "Power", "Elusiveness", "Pass Catching", "Speed"],
  WR: ["Route Running", "Separation", "Hands", "YAC Ability", "Speed", "Contested Catches"],
  TE: ["Receiving", "Route Running", "Blocking", "Athleticism", "Hands", "Speed"],
  OT: ["Pass Protection", "Run Blocking", "Footwork", "Anchor", "Athleticism", "Strength"],
  IOL: ["Pass Protection", "Run Blocking", "Pulling", "Strength", "Anchor", "Versatility"],
  EDGE: ["Pass Rush", "Bend", "First Step", "Power", "Motor", "Run Defense"],
  DL: ["Pass Rush", "Run Defense", "First Step", "Hand Usage", "Motor", "Strength"],
  LB: ["Tackling", "Coverage", "Pass Rush", "Instincts", "Athleticism", "Range"],
  CB: ["Man Coverage", "Ball Skills", "Zone Coverage", "Speed", "Press", "Nickel"],
  S: ["Man Coverage", "Range", "Ball Skills", "Tackling", "Speed", "Nickel"],
};

// ── Lerp function ────────────────────────────────────────────
function lerp(val, bps) {
  if (val <= bps[0][0]) return bps[0][1];
  if (val >= bps[bps.length - 1][0]) return bps[bps.length - 1][1];
  for (let i = 1; i < bps.length; i++) {
    if (val <= bps[i][0]) {
      const [x0, y0] = bps[i - 1];
      const [x1, y1] = bps[i];
      return Math.round(y0 + (y1 - y0) * ((val - x0) / (x1 - x0)));
    }
  }
  return bps[bps.length - 1][1];
}

// ── Speed Score ──────────────────────────────────────────────
// Formula: (weight * 200) / (forty^4)
// Higher = better. Contextualizes speed relative to mass.
function speedScore(weight, forty) {
  if (!weight || !forty) return null;
  return Math.round((weight * 200) / Math.pow(forty, 4) * 100) / 100;
}

// ── Position-Specific Breakpoints ────────────────────────────
// Raw drill breakpoints (lower is better for forty/cone/shuttle)
const BREAKPOINTS = {
  forty: {
    QB:   [[4.40,99],[4.50,90],[4.60,80],[4.70,68],[4.80,55],[4.95,40],[5.10,28]],
    RB:   [[4.30,99],[4.38,95],[4.45,88],[4.52,78],[4.60,68],[4.70,55],[4.80,40]],
    WR:   [[4.25,99],[4.32,95],[4.40,88],[4.48,78],[4.55,68],[4.65,55],[4.75,42]],
    TE:   [[4.40,99],[4.50,92],[4.58,82],[4.65,72],[4.75,60],[4.85,48],[4.95,35]],
    OT:   [[4.75,99],[4.85,90],[4.95,78],[5.05,65],[5.15,55],[5.30,40]],
    IOL:  [[4.80,99],[4.90,90],[5.00,78],[5.10,65],[5.20,52],[5.35,38]],
    EDGE: [[4.45,99],[4.55,92],[4.65,82],[4.75,70],[4.85,58],[4.95,45]],
    DL:   [[4.60,99],[4.70,92],[4.80,82],[4.90,70],[5.00,58],[5.15,42]],
    LB:   [[4.40,99],[4.48,92],[4.55,84],[4.62,74],[4.70,64],[4.80,52],[4.90,40]],
    CB:   [[4.25,99],[4.32,95],[4.38,90],[4.45,82],[4.52,72],[4.60,60],[4.70,45]],
    S:    [[4.30,99],[4.38,94],[4.45,86],[4.52,76],[4.60,65],[4.70,52],[4.80,40]],
  },
  vertical: {
    QB:   [[28,40],[32,55],[35,70],[38,82],[41,92],[44,99]],
    RB:   [[30,40],[33,55],[36,70],[39,82],[42,92],[45,99]],
    WR:   [[30,40],[33,55],[36,70],[39,82],[42,92],[45,99]],
    TE:   [[28,40],[31,52],[34,65],[37,78],[40,90],[43,99]],
    OT:   [[24,40],[27,52],[30,65],[33,78],[36,90],[39,99]],
    IOL:  [[22,40],[25,52],[28,65],[31,78],[34,90],[37,99]],
    EDGE: [[28,40],[31,55],[34,70],[37,82],[40,92],[43,99]],
    DL:   [[26,40],[29,52],[32,65],[35,78],[38,90],[41,99]],
    LB:   [[28,40],[31,55],[34,68],[37,80],[40,92],[43,99]],
    CB:   [[32,40],[35,55],[38,72],[41,85],[44,95],[46,99]],
    S:    [[30,40],[33,55],[36,70],[39,82],[42,92],[45,99]],
  },
  broad: {
    QB:   [[96,40],[102,55],[108,68],[114,80],[120,90],[126,99]],
    RB:   [[108,40],[114,55],[120,70],[126,82],[132,92],[138,99]],
    WR:   [[108,40],[114,55],[120,70],[126,82],[132,92],[138,99]],
    TE:   [[104,40],[110,55],[116,68],[122,80],[128,90],[134,99]],
    OT:   [[96,40],[102,52],[108,65],[114,78],[120,90],[126,99]],
    IOL:  [[92,40],[98,52],[104,65],[110,78],[116,90],[122,99]],
    EDGE: [[108,40],[114,55],[120,70],[126,82],[132,92],[138,99]],
    DL:   [[100,40],[106,52],[112,65],[118,78],[124,90],[130,99]],
    LB:   [[108,40],[114,55],[120,68],[126,80],[132,92],[138,99]],
    CB:   [[112,40],[118,55],[124,72],[130,85],[136,95],[140,99]],
    S:    [[108,40],[114,55],[120,70],[126,82],[132,92],[138,99]],
  },
  bench: {
    QB:   [[12,40],[16,55],[20,70],[24,82],[28,92],[32,99]],
    RB:   [[16,40],[19,55],[22,68],[25,80],[28,90],[32,99]],
    WR:   [[10,40],[13,52],[16,65],[19,78],[22,90],[26,99]],
    TE:   [[16,40],[19,52],[22,65],[25,78],[28,90],[32,99]],
    OT:   [[20,40],[24,55],[28,70],[32,82],[36,92],[40,99]],
    IOL:  [[22,40],[26,55],[30,70],[34,82],[38,92],[42,99]],
    EDGE: [[18,40],[22,55],[26,70],[30,82],[34,92],[38,99]],
    DL:   [[20,40],[24,55],[28,68],[32,80],[36,92],[40,99]],
    LB:   [[16,40],[19,52],[22,65],[25,78],[28,90],[32,99]],
    CB:   [[8,40],[11,52],[14,65],[17,78],[20,90],[24,99]],
    S:    [[10,40],[13,52],[16,65],[19,78],[22,90],[26,99]],
  },
  cone: {
    QB:   [[6.70,99],[6.90,85],[7.10,70],[7.30,55],[7.50,40]],
    RB:   [[6.60,99],[6.80,88],[7.00,75],[7.15,60],[7.30,45],[7.50,32]],
    WR:   [[6.50,99],[6.65,90],[6.80,78],[6.95,65],[7.10,52],[7.30,38]],
    TE:   [[6.70,99],[6.85,88],[7.00,75],[7.15,62],[7.30,48],[7.50,35]],
    OT:   [[7.20,99],[7.40,85],[7.60,70],[7.80,55],[8.00,40]],
    IOL:  [[7.10,99],[7.30,85],[7.50,70],[7.70,55],[7.90,40]],
    EDGE: [[6.70,99],[6.85,88],[7.00,75],[7.15,60],[7.30,45],[7.50,32]],
    DL:   [[6.90,99],[7.10,85],[7.30,70],[7.50,55],[7.70,40]],
    LB:   [[6.60,99],[6.80,88],[7.00,75],[7.15,60],[7.30,45],[7.50,32]],
    CB:   [[6.40,99],[6.55,90],[6.70,78],[6.85,65],[7.00,52],[7.20,38]],
    S:    [[6.50,99],[6.70,88],[6.85,75],[7.00,62],[7.15,48],[7.35,35]],
  },
  shuttle: {
    QB:   [[4.00,99],[4.15,85],[4.30,70],[4.45,55],[4.60,40]],
    RB:   [[3.95,99],[4.10,88],[4.22,75],[4.35,62],[4.50,48],[4.65,35]],
    WR:   [[3.90,99],[4.02,90],[4.15,78],[4.28,65],[4.40,52],[4.55,38]],
    TE:   [[4.00,99],[4.15,88],[4.28,75],[4.40,62],[4.55,48],[4.70,35]],
    OT:   [[4.40,99],[4.55,85],[4.70,70],[4.85,55],[5.00,40]],
    IOL:  [[4.35,99],[4.50,85],[4.65,70],[4.80,55],[4.95,40]],
    EDGE: [[4.10,99],[4.22,88],[4.35,75],[4.48,60],[4.60,45],[4.75,32]],
    DL:   [[4.30,99],[4.45,85],[4.60,70],[4.75,55],[4.90,40]],
    LB:   [[4.00,99],[4.12,88],[4.25,75],[4.38,62],[4.50,48],[4.65,35]],
    CB:   [[3.85,99],[3.98,90],[4.10,78],[4.22,65],[4.35,52],[4.50,38]],
    S:    [[3.95,99],[4.08,88],[4.20,75],[4.32,62],[4.45,48],[4.60,35]],
  },
  // Speed Score breakpoints by position (higher = better)
  // Calibrated from nflverse historical combine data distributions
  speedScore: {
    RB:   [[85,35],[95,48],[105,60],[115,72],[125,82],[135,92],[145,99]],
    WR:   [[80,35],[90,48],[100,60],[110,72],[120,82],[130,92],[140,99]],
    TE:   [[85,35],[95,48],[105,62],[115,75],[125,85],[135,95],[145,99]],
    IOL:  [[65,35],[72,48],[80,60],[88,72],[95,82],[103,92],[110,99]],
    EDGE: [[90,35],[100,48],[110,62],[120,75],[130,85],[140,95],[150,99]],
    DL:   [[75,35],[85,48],[95,62],[105,75],[115,85],[125,95],[135,99]],
    LB:   [[90,35],[100,48],[110,62],[120,75],[130,85],[140,95],[150,99]],
    S:    [[85,35],[95,48],[105,62],[115,75],[125,85],[135,95],[145,99]],
  },
};

// ── Research-Backed Drill-to-Trait Mappings ──────────────────
// Based on Hayden Winks' research on which drills are predictive by position.
//
// "primary" = 75% scouting + 25% combine
// "partial" = 85% scouting + 15% combine
//
// getDrillTraitMap returns position-specific mappings that may vary
// based on prospect height/weight (size splits).

function getDrillTraitMap(pos, data) {
  const weight = data.weight || 0;
  const height = data.height || 0; // in inches

  switch (pos) {
    case "QB":
      return {
        forty: [{ trait: "Mobility", weight: "partial" }],
      };

    case "RB":
      if (weight < 210) {
        // Small RBs: Three Cone and agility matter most
        return {
          cone:     [{ trait: "Elusiveness", weight: "primary" }],
          shuttle:  [{ trait: "Contact Balance", weight: "primary" }],
          speedScore: [{ trait: "Speed", weight: "partial" }],
          forty:    [{ trait: "Speed", weight: "partial" }],
          broad:    [{ trait: "Elusiveness", weight: "partial" }],
          vertical: [{ trait: "Elusiveness", weight: "partial" }],
        };
      } else {
        // Big RBs (210+): Speed Score and Broad Jump matter most
        return {
          speedScore: [{ trait: "Speed", weight: "primary" }],
          broad:    [{ trait: "Power", weight: "primary" }],
          forty:    [{ trait: "Speed", weight: "partial" }],
          cone:     [{ trait: "Elusiveness", weight: "partial" }],
          shuttle:  [{ trait: "Contact Balance", weight: "partial" }],
          vertical: [{ trait: "Elusiveness", weight: "partial" }],
        };
      }

    case "WR":
      if (height < 72) {
        // Small WRs (<6'0): Speed Score and Shuttle matter most
        return {
          speedScore: [{ trait: "Speed", weight: "primary" }],
          shuttle:  [{ trait: "Separation", weight: "primary" }],
          forty:    [{ trait: "Speed", weight: "partial" }],
          cone:     [{ trait: "Route Running", weight: "partial" }],
          broad:    [{ trait: "YAC Ability", weight: "partial" }],
          vertical: [{ trait: "Contested Catches", weight: "partial" }],
        };
      } else {
        // Big WRs (6'0+): Broad Jump matters most
        return {
          broad:    [{ trait: "YAC Ability", weight: "primary" }, { trait: "Contested Catches", weight: "partial" }],
          speedScore: [{ trait: "Speed", weight: "partial" }],
          forty:    [{ trait: "Speed", weight: "partial" }],
          shuttle:  [{ trait: "Separation", weight: "partial" }],
          cone:     [{ trait: "Route Running", weight: "partial" }],
          vertical: [{ trait: "Contested Catches", weight: "partial" }],
        };
      }

    case "TE":
      // Speed Score, Three Cone, and Vertical matter most
      return {
        speedScore: [{ trait: "Speed", weight: "primary" }],
        cone:     [{ trait: "Route Running", weight: "primary" }],
        vertical: [{ trait: "Athleticism", weight: "primary" }],
        forty:    [{ trait: "Speed", weight: "partial" }],
        broad:    [{ trait: "Athleticism", weight: "partial" }],
        bench:    [{ trait: "Blocking", weight: "partial" }],
      };

    case "OT":
      // Raw 40, Broad Jump, and Bench matter most (one of few positions where bench is predictive)
      return {
        forty:    [{ trait: "Athleticism", weight: "primary" }],
        broad:    [{ trait: "Athleticism", weight: "primary" }],
        bench:    [{ trait: "Strength", weight: "primary" }],
        cone:     [{ trait: "Footwork", weight: "partial" }],
        shuttle:  [{ trait: "Footwork", weight: "partial" }],
      };

    case "IOL":
      // Speed Score and Short Shuttle matter most
      return {
        speedScore: [{ trait: "Pulling", weight: "primary" }],
        shuttle:  [{ trait: "Versatility", weight: "primary" }],
        forty:    [{ trait: "Pulling", weight: "partial" }],
        broad:    [{ trait: "Pulling", weight: "partial" }],
        cone:     [{ trait: "Pulling", weight: "partial" }],
        bench:    [{ trait: "Strength", weight: "partial" }],
      };

    case "EDGE":
      // Three Cone is #1, then Broad Jump and Speed Score
      return {
        cone:     [{ trait: "Bend", weight: "primary" }],
        broad:    [{ trait: "First Step", weight: "primary" }],
        speedScore: [{ trait: "First Step", weight: "primary" }],
        forty:    [{ trait: "First Step", weight: "partial" }],
        shuttle:  [{ trait: "Bend", weight: "partial" }],
        bench:    [{ trait: "Power", weight: "partial" }],
        vertical: [{ trait: "Bend", weight: "partial" }],
      };

    case "DL":
      if (weight < 310) {
        // Sub-310 DT: Speed Score and Three Cone matter most
        return {
          speedScore: [{ trait: "First Step", weight: "primary" }],
          cone:     [{ trait: "Hand Usage", weight: "primary" }],
          forty:    [{ trait: "First Step", weight: "partial" }],
          broad:    [{ trait: "First Step", weight: "partial" }],
          bench:    [{ trait: "Strength", weight: "partial" }],
        };
      } else {
        // 310+ DT: Speed Score matters most (other drills less predictive)
        return {
          speedScore: [{ trait: "First Step", weight: "primary" }],
          forty:    [{ trait: "First Step", weight: "partial" }],
          broad:    [{ trait: "First Step", weight: "partial" }],
          bench:    [{ trait: "Strength", weight: "partial" }],
        };
      }

    case "LB":
      // Speed Score and Short Shuttle matter most
      return {
        speedScore: [{ trait: "Athleticism", weight: "primary" }],
        shuttle:  [{ trait: "Coverage", weight: "primary" }],
        forty:    [{ trait: "Athleticism", weight: "partial" }],
        broad:    [{ trait: "Range", weight: "partial" }],
        cone:     [{ trait: "Coverage", weight: "partial" }],
        vertical: [{ trait: "Athleticism", weight: "partial" }],
      };

    case "CB":
      // Raw 40, Vertical, and Three Cone matter most
      return {
        forty:    [{ trait: "Speed", weight: "primary" }],
        vertical: [{ trait: "Ball Skills", weight: "primary" }],
        cone:     [{ trait: "Man Coverage", weight: "primary" }],
        shuttle:  [{ trait: "Zone Coverage", weight: "partial" }],
      };

    case "S":
      // Speed Score and Vertical matter most
      return {
        speedScore: [{ trait: "Speed", weight: "primary" }],
        vertical: [{ trait: "Range", weight: "primary" }],
        forty:    [{ trait: "Speed", weight: "partial" }],
        broad:    [{ trait: "Range", weight: "partial" }],
        cone:     [{ trait: "Man Coverage", weight: "partial" }],
        shuttle:  [{ trait: "Nickel", weight: "partial" }],
      };

    default:
      return {};
  }
}

// ── Helpers ──────────────────────────────────────────────────
function normalize(name) {
  return name.toLowerCase().replace(/\./g, "").replace(/\s+(jr|sr|ii|iii|iv|v)\s*$/i, "").replace(/\s+/g, " ").trim();
}

function getPosition(key) {
  if (prospectStats[key]?.gpos) return prospectStats[key].gpos;
  return null;
}

function getDisplayName(key) {
  const parts = key.split("|");
  const name = parts[0].split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  return name;
}

// ── CLI args ─────────────────────────────────────────────────
const args = process.argv.slice(2);
let filterPosition = null;
let filterProspect = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--position" && args[i + 1]) filterPosition = args[++i].toUpperCase();
  if (args[i] === "--prospect" && args[i + 1]) filterProspect = args[++i].toLowerCase();
}

// ── Main ─────────────────────────────────────────────────────
console.log(`\n${c.cyan}${c.bold}NFL Combine Trait Calculator v2 (Winks Research)${c.reset}\n`);

const adjustments = {};
let totalAdjustments = 0;
let prospectsWithData = 0;
let speedScoreCount = 0;
let splitCount = { smallRB: 0, bigRB: 0, smallWR: 0, bigWR: 0, lightDT: 0, heavyDT: 0 };

for (const [key, data] of Object.entries(combineData)) {
  const pos = getPosition(key);
  if (!pos) continue;

  // Apply filters
  if (filterPosition && pos !== filterPosition) continue;
  if (filterProspect && !key.includes(filterProspect)) continue;

  // Compute Speed Score if we have weight + forty
  const ss = speedScore(data.weight, data.forty);
  const dataWithSS = { ...data, speedScore: ss };

  // Get position-specific drill map (may vary by weight/height)
  const drillMap = getDrillTraitMap(pos, data);
  if (!drillMap || Object.keys(drillMap).length === 0) continue;

  // Track splits
  if (pos === "RB") { if ((data.weight || 999) < 210) splitCount.smallRB++; else splitCount.bigRB++; }
  if (pos === "WR") { if ((data.height || 999) < 72) splitCount.smallWR++; else splitCount.bigWR++; }
  if (pos === "DL") { if ((data.weight || 999) < 310) splitCount.lightDT++; else splitCount.heavyDT++; }

  const scouting = scoutingTraits[key];

  // Collect all drill scores mapped to traits
  const traitInputs = {};
  const drillsUsed = {};

  for (const [drill, mappings] of Object.entries(drillMap)) {
    let drillVal;
    let displayVal;

    if (drill === "speedScore") {
      if (!ss) continue;
      drillVal = ss;
      displayVal = ss;
      speedScoreCount++;
    } else {
      drillVal = data[drill];
      displayVal = data[drill];
      if (drillVal == null) continue;
    }

    // Get breakpoints — speedScore has its own, raw drills use position-specific
    const bps = BREAKPOINTS[drill]?.[pos];
    if (!bps) continue;

    const combineScore = lerp(drillVal, bps);
    drillsUsed[drill] = displayVal;

    for (const { trait, weight } of mappings) {
      if (!traitInputs[trait]) traitInputs[trait] = [];
      traitInputs[trait].push({ combineScore, weight, drill });
    }
  }

  if (Object.keys(traitInputs).length === 0) continue;

  prospectsWithData++;
  const displayName = getDisplayName(key);
  const traitAdjustments = {};

  for (const [trait, inputs] of Object.entries(traitInputs)) {
    const current = scouting?.[trait] ?? 50;

    // Primary takes precedence over partial
    const hasPrimary = inputs.some(i => i.weight === "primary");
    let combineScore;
    let weightType;

    if (hasPrimary) {
      // Average all primary drill scores (may have multiple primaries now)
      const primaries = inputs.filter(i => i.weight === "primary");
      combineScore = Math.round(primaries.reduce((sum, i) => sum + i.combineScore, 0) / primaries.length);
      weightType = "primary";
    } else {
      const avg = inputs.reduce((sum, i) => sum + i.combineScore, 0) / inputs.length;
      combineScore = Math.round(avg);
      weightType = "partial";
    }

    const blendFactor = weightType === "primary" ? 0.25 : 0.15;
    const blended = Math.round(current * (1 - blendFactor) + combineScore * blendFactor);
    const delta = blended - current;

    if (delta !== 0) {
      traitAdjustments[trait] = { current, combineScore, blended, weight: weightType, delta, drills: inputs.map(i => i.drill) };
      totalAdjustments++;
    }
  }

  if (Object.keys(traitAdjustments).length > 0) {
    // Determine which split was used
    let split = null;
    if (pos === "RB") split = (data.weight || 999) < 210 ? "<210lbs" : "210+lbs";
    if (pos === "WR") split = (data.height || 999) < 72 ? "<6'0" : "6'0+";
    if (pos === "DL") split = (data.weight || 999) < 310 ? "<310lbs" : "310+lbs";

    adjustments[key] = {
      name: displayName,
      position: pos,
      split,
      speedScore: ss,
      drills: drillsUsed,
      traitAdjustments,
    };

    // Console output
    const splitTag = split ? ` ${c.magenta}[${split}]${c.reset}` : "";
    console.log(`${c.bold}${displayName}${c.reset} ${c.gray}(${pos})${c.reset}${splitTag}`);
    const drillStr = Object.entries(drillsUsed).map(([d, v]) => `${d}: ${v}`).join(", ");
    console.log(`  ${c.dim}Drills: ${drillStr}${c.reset}`);
    if (ss) console.log(`  ${c.blue}Speed Score: ${ss}${c.reset}`);

    for (const [trait, adj] of Object.entries(traitAdjustments)) {
      const arrow = adj.delta > 0 ? `${c.green}+${adj.delta}` : `${c.red}${adj.delta}`;
      const tag = adj.weight === "primary" ? `${c.yellow}primary${c.reset}` : `${c.gray}partial${c.reset}`;
      const drillList = adj.drills.join("+");
      console.log(`  ${trait}: ${adj.current} ${c.dim}->${c.reset} ${c.bold}${adj.blended}${c.reset} (${arrow}${c.reset}) [${tag}] ${c.dim}combine=${adj.combineScore} via ${drillList}${c.reset}`);
    }
    console.log();
  }
}

// ── Output ───────────────────────────────────────────────────
const output = {
  meta: {
    timestamp: new Date().toISOString(),
    version: 2,
    methodology: "Hayden Winks research-based drill-to-trait mapping with Speed Score and position splits",
    prospects_with_data: prospectsWithData,
    adjustments_computed: totalAdjustments,
    speed_scores_computed: speedScoreCount,
    position_splits: splitCount,
  },
  adjustments,
};

const outPath = join(__dirname, "combine-trait-adjustments.json");
writeFileSync(outPath, JSON.stringify(output, null, 2));

console.log(`${c.cyan}${c.bold}Summary${c.reset}`);
console.log(`  Prospects with combine data: ${prospectsWithData}`);
console.log(`  Trait adjustments computed: ${totalAdjustments}`);
console.log(`  Speed Scores used: ${speedScoreCount}`);
if (splitCount.smallRB + splitCount.bigRB > 0)
  console.log(`  RB splits: ${splitCount.smallRB} small (<210) / ${splitCount.bigRB} big (210+)`);
if (splitCount.smallWR + splitCount.bigWR > 0)
  console.log(`  WR splits: ${splitCount.smallWR} small (<6'0) / ${splitCount.bigWR} big (6'0+)`);
if (splitCount.lightDT + splitCount.heavyDT > 0)
  console.log(`  DT splits: ${splitCount.lightDT} light (<310) / ${splitCount.heavyDT} heavy (310+)`);
console.log(`  Output: ${outPath}\n`);

if (prospectsWithData === 0) {
  console.log(`${c.yellow}No combine drill data found yet. Run update-combine.js first once drills begin.${c.reset}\n`);
}
