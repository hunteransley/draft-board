#!/usr/bin/env node
/**
 * Combine Trait Adjustment Calculator
 *
 * Reads src/combineData.json + src/scoutingTraits.json, applies deterministic
 * drill-to-trait mappings using lerp breakpoints, outputs
 * scripts/combine-trait-adjustments.json for review.
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

// ── Lerp function (from statTraits.js) ───────────────────────
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

// ── Position-Specific Breakpoints ────────────────────────────
// For "lower is better" drills (40, cone, shuttle), breakpoints are
// ascending in time but descending in score — lerp handles this naturally.

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
};

// ── Drill-to-Trait Mappings ──────────────────────────────────
// "primary" = 75% scouting + 25% combine
// "partial" = 85% scouting + 15% combine
const DRILL_TRAIT_MAP = {
  QB: {
    forty: [{ trait: "Mobility", weight: "partial" }],
  },
  RB: {
    forty:    [{ trait: "Speed", weight: "primary" }],
    bench:    [{ trait: "Power", weight: "partial" }],
    vertical: [{ trait: "Elusiveness", weight: "partial" }],
    broad:    [{ trait: "Elusiveness", weight: "partial" }],
    cone:     [{ trait: "Elusiveness", weight: "primary" }],
    shuttle:  [{ trait: "Contact Balance", weight: "partial" }],
  },
  WR: {
    forty:    [{ trait: "Speed", weight: "primary" }],
    vertical: [{ trait: "Contested Catches", weight: "partial" }],
    broad:    [{ trait: "YAC Ability", weight: "partial" }],
    cone:     [{ trait: "Route Running", weight: "partial" }],
    shuttle:  [{ trait: "Separation", weight: "partial" }],
  },
  TE: {
    forty:    [{ trait: "Speed", weight: "primary" }],
    bench:    [{ trait: "Blocking", weight: "partial" }],
    vertical: [{ trait: "Athleticism", weight: "primary" }],
    broad:    [{ trait: "Athleticism", weight: "partial" }],
    cone:     [{ trait: "Route Running", weight: "partial" }],
  },
  OT: {
    bench:    [{ trait: "Strength", weight: "primary" }],
    broad:    [{ trait: "Athleticism", weight: "primary" }],
    cone:     [{ trait: "Footwork", weight: "partial" }],
    shuttle:  [{ trait: "Footwork", weight: "partial" }],
    forty:    [{ trait: "Athleticism", weight: "partial" }],
  },
  IOL: {
    bench:    [{ trait: "Strength", weight: "primary" }],
    broad:    [{ trait: "Pulling", weight: "partial" }],
    cone:     [{ trait: "Pulling", weight: "partial" }],
    shuttle:  [{ trait: "Versatility", weight: "partial" }],
  },
  EDGE: {
    forty:    [{ trait: "First Step", weight: "partial" }],
    bench:    [{ trait: "Power", weight: "primary" }],
    vertical: [{ trait: "Bend", weight: "partial" }],
    broad:    [{ trait: "First Step", weight: "partial" }],
    cone:     [{ trait: "Bend", weight: "primary" }],
    shuttle:  [{ trait: "Bend", weight: "partial" }],
  },
  DL: {
    bench:    [{ trait: "Strength", weight: "primary" }],
    forty:    [{ trait: "First Step", weight: "partial" }],
    broad:    [{ trait: "First Step", weight: "partial" }],
    cone:     [{ trait: "Hand Usage", weight: "partial" }],
  },
  LB: {
    forty:    [{ trait: "Athleticism", weight: "primary" }],
    bench:    [{ trait: "Pass Rush", weight: "partial" }],
    vertical: [{ trait: "Athleticism", weight: "partial" }],
    broad:    [{ trait: "Range", weight: "partial" }],
    cone:     [{ trait: "Coverage", weight: "partial" }],
    shuttle:  [{ trait: "Coverage", weight: "partial" }],
  },
  CB: {
    forty:    [{ trait: "Speed", weight: "primary" }],
    vertical: [{ trait: "Ball Skills", weight: "partial" }],
    cone:     [{ trait: "Man Coverage", weight: "primary" }],
    shuttle:  [{ trait: "Zone Coverage", weight: "partial" }],
  },
  S: {
    forty:    [{ trait: "Speed", weight: "primary" }],
    broad:    [{ trait: "Range", weight: "partial" }],
    cone:     [{ trait: "Man Coverage", weight: "partial" }],
    shuttle:  [{ trait: "Nickel", weight: "partial" }],
    bench:    [{ trait: "Tackling", weight: "partial" }],
  },
};

// ── Helpers ──────────────────────────────────────────────────
function normalize(name) {
  return name.toLowerCase().replace(/\./g, "").replace(/\s+(jr|sr|ii|iii|iv|v)\s*$/i, "").replace(/\s+/g, " ").trim();
}

function getPosition(key) {
  // Check prospectStats for gpos first
  if (prospectStats[key]?.gpos) return prospectStats[key].gpos;
  // Fall back — try to extract from BBL list embedded in App.jsx
  // Parse the pos from the key lookup approach
  return null;
}

function getDisplayName(key) {
  // Try prospectStats first — no display name there, reconstruct from key
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
console.log(`\n${c.cyan}${c.bold}NFL Combine Trait Calculator${c.reset}\n`);

const adjustments = {};
let totalAdjustments = 0;
let prospectsWithData = 0;

for (const [key, data] of Object.entries(combineData)) {
  const pos = getPosition(key);
  if (!pos || !DRILL_TRAIT_MAP[pos]) continue;

  // Apply filters
  if (filterPosition && pos !== filterPosition) continue;
  if (filterProspect && !key.includes(filterProspect)) continue;

  const scouting = scoutingTraits[key];
  const drillMap = DRILL_TRAIT_MAP[pos];

  // Collect all drill scores mapped to traits
  const traitInputs = {}; // trait -> [{score, weight}]
  const drillsUsed = {};

  for (const [drill, mappings] of Object.entries(drillMap)) {
    const drillVal = data[drill];
    if (drillVal == null) continue;

    const bps = BREAKPOINTS[drill]?.[pos];
    if (!bps) continue;

    const combineScore = lerp(drillVal, bps);
    drillsUsed[drill] = drillVal;

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
      // Use primary drill score
      const primary = inputs.find(i => i.weight === "primary");
      combineScore = primary.combineScore;
      weightType = "primary";
    } else {
      // Average all partial drill scores
      const avg = inputs.reduce((sum, i) => sum + i.combineScore, 0) / inputs.length;
      combineScore = Math.round(avg);
      weightType = "partial";
    }

    const blendFactor = weightType === "primary" ? 0.25 : 0.15;
    const blended = Math.round(current * (1 - blendFactor) + combineScore * blendFactor);
    const delta = blended - current;

    if (delta !== 0) {
      traitAdjustments[trait] = { current, combineScore, blended, weight: weightType, delta };
      totalAdjustments++;
    }
  }

  if (Object.keys(traitAdjustments).length > 0) {
    adjustments[key] = {
      name: displayName,
      position: pos,
      drills: drillsUsed,
      traitAdjustments,
    };

    // Console output
    console.log(`${c.bold}${displayName}${c.reset} ${c.gray}(${pos})${c.reset}`);
    const drillStr = Object.entries(drillsUsed).map(([d, v]) => `${d}: ${v}`).join(", ");
    console.log(`  ${c.dim}Drills: ${drillStr}${c.reset}`);

    for (const [trait, adj] of Object.entries(traitAdjustments)) {
      const arrow = adj.delta > 0 ? `${c.green}+${adj.delta}` : `${c.red}${adj.delta}`;
      const tag = adj.weight === "primary" ? `${c.yellow}primary${c.reset}` : `${c.gray}partial${c.reset}`;
      console.log(`  ${trait}: ${adj.current} ${c.dim}->${c.reset} ${c.bold}${adj.blended}${c.reset} (${arrow}${c.reset}) [${tag}] ${c.dim}combine=${adj.combineScore}${c.reset}`);
    }
    console.log();
  }
}

// ── Output ───────────────────────────────────────────────────
const output = {
  meta: {
    timestamp: new Date().toISOString(),
    prospects_with_data: prospectsWithData,
    adjustments_computed: totalAdjustments,
  },
  adjustments,
};

const outPath = join(__dirname, "combine-trait-adjustments.json");
writeFileSync(outPath, JSON.stringify(output, null, 2));

console.log(`${c.cyan}${c.bold}Summary${c.reset}`);
console.log(`  Prospects with combine data: ${prospectsWithData}`);
console.log(`  Trait adjustments computed: ${totalAdjustments}`);
console.log(`  Output: ${outPath}\n`);

if (prospectsWithData === 0) {
  console.log(`${c.yellow}No combine drill data found yet. Run update-combine.js first once drills begin.${c.reset}\n`);
}
