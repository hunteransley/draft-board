import COMBINE from "./combineData.json";
import SCOUTING from "./scoutingTraits.json";

// Name normalization — matches scoutingData.js / combineData.js pattern
function normalize(name) {
  return name.toLowerCase().replace(/\./g, "").replace(/\s+(jr|sr|ii|iii|iv|v)\s*$/i, "").replace(/\s+/g, " ").trim();
}

function lookupCombine(name, school) {
  if (!name) return null;
  if (school) {
    const key = normalize(name) + "|" + school.toLowerCase().replace(/\s+/g, " ").trim();
    if (COMBINE[key]) return COMBINE[key];
  }
  const n = normalize(name);
  for (const k in COMBINE) { if (k.startsWith(n + "|")) return COMBINE[k]; }
  return null;
}

function lookupScouting(name, school) {
  if (!name) return null;
  if (school) {
    const key = normalize(name) + "|" + school.toLowerCase().replace(/\s+/g, " ").trim();
    if (SCOUTING[key]) return SCOUTING[key];
  }
  const n = normalize(name);
  for (const k in SCOUTING) { if (k.startsWith(n + "|")) return SCOUTING[k]; }
  return null;
}

// Position traits — which traits each position has (no new traits added)
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

// Positions where Speed is a trait (raw overwrite from 40-yard dash)
const SPEED_POSITIONS = new Set(["RB", "WR", "TE", "CB", "S"]);
// Positions where Athleticism is a trait (raw overwrite from Athletic Score)
const ATHLETICISM_POSITIONS = new Set(["TE", "OT", "LB"]);

// Breakpoints for converting raw drill values to 0-100 scores
const BREAKPOINTS = {
  forty: {
    QB:[[4.40,99],[4.50,90],[4.60,80],[4.70,68],[4.80,55],[4.95,40],[5.10,28]],
    RB:[[4.30,99],[4.38,95],[4.45,88],[4.52,78],[4.60,68],[4.70,55],[4.80,40]],
    WR:[[4.25,99],[4.32,95],[4.40,88],[4.48,78],[4.55,68],[4.65,55],[4.75,42]],
    TE:[[4.40,99],[4.50,92],[4.58,82],[4.65,72],[4.75,60],[4.85,48],[4.95,35]],
    OT:[[4.75,99],[4.85,90],[4.95,78],[5.05,65],[5.15,55],[5.30,40]],
    IOL:[[4.80,99],[4.90,90],[5.00,78],[5.10,65],[5.20,52],[5.35,38]],
    EDGE:[[4.45,99],[4.55,92],[4.65,82],[4.75,70],[4.85,58],[4.95,45]],
    DL:[[4.60,99],[4.70,92],[4.80,82],[4.90,70],[5.00,58],[5.15,42]],
    LB:[[4.40,99],[4.48,92],[4.55,84],[4.62,74],[4.70,64],[4.80,52],[4.90,40]],
    CB:[[4.25,99],[4.32,95],[4.38,90],[4.45,82],[4.52,72],[4.60,60],[4.70,45]],
    S:[[4.30,99],[4.38,94],[4.45,86],[4.52,76],[4.60,65],[4.70,52],[4.80,40]],
  },
  vertical: {
    QB:[[28,40],[32,55],[35,70],[38,82],[41,92],[44,99]],
    RB:[[30,40],[33,55],[36,70],[39,82],[42,92],[45,99]],
    WR:[[30,40],[33,55],[36,70],[39,82],[42,92],[45,99]],
    TE:[[28,40],[31,52],[34,65],[37,78],[40,90],[43,99]],
    OT:[[24,40],[27,52],[30,65],[33,78],[36,90],[39,99]],
    IOL:[[22,40],[25,52],[28,65],[31,78],[34,90],[37,99]],
    EDGE:[[28,40],[31,55],[34,70],[37,82],[40,92],[43,99]],
    DL:[[26,40],[29,52],[32,65],[35,78],[38,90],[41,99]],
    LB:[[28,40],[31,55],[34,68],[37,80],[40,92],[43,99]],
    CB:[[32,40],[35,55],[38,72],[41,85],[44,95],[46,99]],
    S:[[30,40],[33,55],[36,70],[39,82],[42,92],[45,99]],
  },
  broad: {
    QB:[[96,40],[102,55],[108,68],[114,80],[120,90],[126,99]],
    RB:[[108,40],[114,55],[120,70],[126,82],[132,92],[138,99]],
    WR:[[108,40],[114,55],[120,70],[126,82],[132,92],[138,99]],
    TE:[[104,40],[110,55],[116,68],[122,80],[128,90],[134,99]],
    OT:[[96,40],[102,52],[108,65],[114,78],[120,90],[126,99]],
    IOL:[[92,40],[98,52],[104,65],[110,78],[116,90],[122,99]],
    EDGE:[[108,40],[114,55],[120,70],[126,82],[132,92],[138,99]],
    DL:[[100,40],[106,52],[112,65],[118,78],[124,90],[130,99]],
    LB:[[108,40],[114,55],[120,68],[126,80],[132,92],[138,99]],
    CB:[[112,40],[118,55],[124,72],[130,85],[136,95],[140,99]],
    S:[[108,40],[114,55],[120,70],[126,82],[132,92],[138,99]],
  },
  bench: {
    QB:[[12,40],[16,55],[20,70],[24,82],[28,92],[32,99]],
    RB:[[16,40],[19,55],[22,68],[25,80],[28,90],[32,99]],
    WR:[[10,40],[13,52],[16,65],[19,78],[22,90],[26,99]],
    TE:[[16,40],[19,52],[22,65],[25,78],[28,90],[32,99]],
    OT:[[20,40],[24,55],[28,70],[32,82],[36,92],[40,99]],
    IOL:[[22,40],[26,55],[30,70],[34,82],[38,92],[42,99]],
    EDGE:[[18,40],[22,55],[26,70],[30,82],[34,92],[38,99]],
    DL:[[20,40],[24,55],[28,68],[32,80],[36,92],[40,99]],
    LB:[[16,40],[19,52],[22,65],[25,78],[28,90],[32,99]],
    CB:[[8,40],[11,52],[14,65],[17,78],[20,90],[24,99]],
    S:[[10,40],[13,52],[16,65],[19,78],[22,90],[26,99]],
  },
  cone: {
    QB:[[6.70,99],[6.90,85],[7.10,70],[7.30,55],[7.50,40]],
    RB:[[6.60,99],[6.80,88],[7.00,75],[7.15,60],[7.30,45],[7.50,32]],
    WR:[[6.50,99],[6.65,90],[6.80,78],[6.95,65],[7.10,52],[7.30,38]],
    TE:[[6.70,99],[6.85,88],[7.00,75],[7.15,62],[7.30,48],[7.50,35]],
    OT:[[7.20,99],[7.40,85],[7.60,70],[7.80,55],[8.00,40]],
    IOL:[[7.10,99],[7.30,85],[7.50,70],[7.70,55],[7.90,40]],
    EDGE:[[6.70,99],[6.85,88],[7.00,75],[7.15,60],[7.30,45],[7.50,32]],
    DL:[[6.90,99],[7.10,85],[7.30,70],[7.50,55],[7.70,40]],
    LB:[[6.60,99],[6.80,88],[7.00,75],[7.15,60],[7.30,45],[7.50,32]],
    CB:[[6.40,99],[6.55,90],[6.70,78],[6.85,65],[7.00,52],[7.20,38]],
    S:[[6.50,99],[6.70,88],[6.85,75],[7.00,62],[7.15,48],[7.35,35]],
  },
  shuttle: {
    QB:[[4.00,99],[4.15,85],[4.30,70],[4.45,55],[4.60,40]],
    RB:[[3.95,99],[4.10,88],[4.22,75],[4.35,62],[4.50,48],[4.65,35]],
    WR:[[3.90,99],[4.02,90],[4.15,78],[4.28,65],[4.40,52],[4.55,38]],
    TE:[[4.00,99],[4.15,88],[4.28,75],[4.40,62],[4.55,48],[4.70,35]],
    OT:[[4.40,99],[4.55,85],[4.70,70],[4.85,55],[5.00,40]],
    IOL:[[4.35,99],[4.50,85],[4.65,70],[4.80,55],[4.95,40]],
    EDGE:[[4.10,99],[4.22,88],[4.35,75],[4.48,60],[4.60,45],[4.75,32]],
    DL:[[4.30,99],[4.45,85],[4.60,70],[4.75,55],[4.90,40]],
    LB:[[4.00,99],[4.12,88],[4.25,75],[4.38,62],[4.50,48],[4.65,35]],
    CB:[[3.85,99],[3.98,90],[4.10,78],[4.22,65],[4.35,52],[4.50,38]],
    S:[[3.95,99],[4.08,88],[4.20,75],[4.32,62],[4.45,48],[4.60,35]],
  },
  speedScore: {
    RB:[[85,35],[95,48],[105,60],[115,72],[125,82],[135,92],[145,99]],
    WR:[[80,35],[90,48],[100,60],[110,72],[120,82],[130,92],[140,99]],
    TE:[[85,35],[95,48],[105,62],[115,75],[125,85],[135,95],[145,99]],
    IOL:[[65,35],[72,48],[80,60],[88,72],[95,82],[103,92],[110,99]],
    EDGE:[[90,35],[100,48],[110,62],[120,75],[130,85],[140,95],[150,99]],
    DL:[[75,35],[85,48],[95,62],[105,75],[115,85],[125,95],[135,99]],
    LB:[[90,35],[100,48],[110,62],[120,75],[130,85],[140,95],[150,99]],
    S:[[85,35],[95,48],[105,62],[115,75],[125,85],[135,95],[145,99]],
  },
};

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

function speedScore(weight, forty) {
  if (!weight || !forty) return null;
  return Math.round((weight * 200) / Math.pow(forty, 4) * 100) / 100;
}

// Research-backed drill-to-trait mappings (from scripts/combineTraits.js)
function getDrillTraitMap(pos, data) {
  const weight = data.weight || 0;
  const height = data.height || 0;
  switch (pos) {
    case "QB": return { forty: [{ trait: "Mobility", weight: "partial" }] };
    case "RB":
      if (weight < 210) return {
        cone: [{ trait: "Elusiveness", weight: "primary" }],
        shuttle: [{ trait: "Contact Balance", weight: "primary" }],
        speedScore: [{ trait: "Speed", weight: "partial" }],
        forty: [{ trait: "Speed", weight: "partial" }],
        broad: [{ trait: "Elusiveness", weight: "partial" }],
        vertical: [{ trait: "Elusiveness", weight: "partial" }],
      };
      return {
        speedScore: [{ trait: "Speed", weight: "primary" }],
        broad: [{ trait: "Power", weight: "primary" }],
        forty: [{ trait: "Speed", weight: "partial" }],
        cone: [{ trait: "Elusiveness", weight: "partial" }],
        shuttle: [{ trait: "Contact Balance", weight: "partial" }],
        vertical: [{ trait: "Elusiveness", weight: "partial" }],
      };
    case "WR":
      if (height < 72) return {
        speedScore: [{ trait: "Speed", weight: "primary" }],
        shuttle: [{ trait: "Separation", weight: "primary" }],
        forty: [{ trait: "Speed", weight: "partial" }],
        cone: [{ trait: "Route Running", weight: "partial" }],
        broad: [{ trait: "YAC Ability", weight: "partial" }],
        vertical: [{ trait: "Contested Catches", weight: "partial" }],
      };
      return {
        broad: [{ trait: "YAC Ability", weight: "primary" }, { trait: "Contested Catches", weight: "partial" }],
        speedScore: [{ trait: "Speed", weight: "partial" }],
        forty: [{ trait: "Speed", weight: "partial" }],
        shuttle: [{ trait: "Separation", weight: "partial" }],
        cone: [{ trait: "Route Running", weight: "partial" }],
        vertical: [{ trait: "Contested Catches", weight: "partial" }],
      };
    case "TE": return {
      speedScore: [{ trait: "Speed", weight: "primary" }],
      cone: [{ trait: "Route Running", weight: "primary" }],
      vertical: [{ trait: "Athleticism", weight: "primary" }],
      forty: [{ trait: "Speed", weight: "partial" }],
      broad: [{ trait: "Athleticism", weight: "partial" }],
      bench: [{ trait: "Blocking", weight: "partial" }],
    };
    case "OT": return {
      forty: [{ trait: "Athleticism", weight: "primary" }],
      broad: [{ trait: "Athleticism", weight: "primary" }],
      bench: [{ trait: "Strength", weight: "primary" }],
      cone: [{ trait: "Footwork", weight: "partial" }],
      shuttle: [{ trait: "Footwork", weight: "partial" }],
    };
    case "IOL": return {
      speedScore: [{ trait: "Pulling", weight: "primary" }],
      shuttle: [{ trait: "Versatility", weight: "primary" }],
      forty: [{ trait: "Pulling", weight: "partial" }],
      broad: [{ trait: "Pulling", weight: "partial" }],
      cone: [{ trait: "Pulling", weight: "partial" }],
      bench: [{ trait: "Strength", weight: "partial" }],
    };
    case "EDGE": return {
      cone: [{ trait: "Bend", weight: "primary" }],
      broad: [{ trait: "First Step", weight: "primary" }],
      speedScore: [{ trait: "First Step", weight: "primary" }],
      forty: [{ trait: "First Step", weight: "partial" }],
      shuttle: [{ trait: "Bend", weight: "partial" }],
      bench: [{ trait: "Power", weight: "partial" }],
      vertical: [{ trait: "Bend", weight: "partial" }],
    };
    case "DL":
      if (weight < 310) return {
        speedScore: [{ trait: "First Step", weight: "primary" }],
        cone: [{ trait: "Hand Usage", weight: "primary" }],
        forty: [{ trait: "First Step", weight: "partial" }],
        broad: [{ trait: "First Step", weight: "partial" }],
        bench: [{ trait: "Strength", weight: "partial" }],
      };
      return {
        speedScore: [{ trait: "First Step", weight: "primary" }],
        forty: [{ trait: "First Step", weight: "partial" }],
        broad: [{ trait: "First Step", weight: "partial" }],
        bench: [{ trait: "Strength", weight: "partial" }],
      };
    case "LB": return {
      speedScore: [{ trait: "Athleticism", weight: "primary" }],
      shuttle: [{ trait: "Coverage", weight: "primary" }],
      forty: [{ trait: "Athleticism", weight: "partial" }],
      broad: [{ trait: "Range", weight: "partial" }],
      cone: [{ trait: "Coverage", weight: "partial" }],
      vertical: [{ trait: "Athleticism", weight: "partial" }],
    };
    case "CB": return {
      forty: [{ trait: "Speed", weight: "primary" }],
      vertical: [{ trait: "Ball Skills", weight: "primary" }],
      cone: [{ trait: "Man Coverage", weight: "primary" }],
      shuttle: [{ trait: "Zone Coverage", weight: "partial" }],
    };
    case "S": return {
      speedScore: [{ trait: "Speed", weight: "primary" }],
      vertical: [{ trait: "Range", weight: "primary" }],
      forty: [{ trait: "Speed", weight: "partial" }],
      broad: [{ trait: "Range", weight: "partial" }],
      cone: [{ trait: "Man Coverage", weight: "partial" }],
      shuttle: [{ trait: "Nickel", weight: "partial" }],
    };
    default: return {};
  }
}

// Cache for computed results
const _traitCache = {};
const _scoreCache = {};

/**
 * Returns combine-adjusted traits for a prospect, or null if no combine data.
 * Implements the three-category hierarchy:
 * 1. 40 → Speed: RAW OVERWRITE (positions with Speed trait)
 * 2. Athletic Score → Athleticism: RAW OVERWRITE (positions with Athleticism trait)
 * 3. All other drill-to-trait mappings: PRIMARY (40/60) or PARTIAL (25/75)
 */
export function getCombineAdjustedTraits(name, school) {
  if (!name) return null;
  const cacheKey = normalize(name) + "|" + (school || "").toLowerCase().trim();
  if (_traitCache[cacheKey] !== undefined) return _traitCache[cacheKey];

  const cd = lookupCombine(name, school);
  if (!cd) { _traitCache[cacheKey] = null; return null; }

  // Need at least one drill to adjust traits
  const hasDrills = cd.forty || cd.vertical || cd.broad || cd.bench || cd.cone || cd.shuttle;
  if (!hasDrills) { _traitCache[cacheKey] = null; return null; }

  const sc = lookupScouting(name, school);
  if (!sc) { _traitCache[cacheKey] = null; return null; }

  // Determine position from scouting data keys
  let pos = null;
  for (const [p, traitList] of Object.entries(POSITION_TRAITS)) {
    if (traitList.every(t => sc[t] != null || t === "__ceiling")) {
      // Check at least 4 matching traits
      const matches = traitList.filter(t => sc[t] != null).length;
      if (matches >= 4) { pos = p; break; }
    }
  }
  if (!pos) {
    // Fallback: find position by best trait key overlap
    let bestPos = null, bestCount = 0;
    for (const [p, traitList] of Object.entries(POSITION_TRAITS)) {
      const count = traitList.filter(t => sc[t] != null).length;
      if (count > bestCount) { bestCount = count; bestPos = p; }
    }
    pos = bestPos;
  }
  if (!pos) { _traitCache[cacheKey] = null; return null; }

  // Start with copy of scouting traits
  const result = { ...sc };

  // Category 1: 40 → Speed RAW OVERWRITE (only for positions with Speed trait)
  if (cd.forty && SPEED_POSITIONS.has(pos) && BREAKPOINTS.forty[pos]) {
    result["Speed"] = lerp(cd.forty, BREAKPOINTS.forty[pos]);
  }

  // Category 2: Athletic Score → Athleticism RAW OVERWRITE
  // athleticScore is RAS-like (0-99.9), round to integer for trait value
  if (cd.athleticScore != null && ATHLETICISM_POSITIONS.has(pos)) {
    result["Athleticism"] = Math.round(cd.athleticScore);
  }

  // Category 3: Drill-to-trait blending (PRIMARY 40/60, PARTIAL 25/75)
  const ss = speedScore(cd.weight, cd.forty);
  const dataWithSS = { ...cd, speedScore: ss };
  const drillMap = getDrillTraitMap(pos, cd);

  // Collect combine scores per trait
  const traitInputs = {};
  for (const [drill, mappings] of Object.entries(drillMap)) {
    let drillVal;
    if (drill === "speedScore") {
      if (!ss) continue;
      drillVal = ss;
    } else {
      drillVal = cd[drill];
      if (drillVal == null) continue;
    }
    const bps = BREAKPOINTS[drill]?.[pos];
    if (!bps) continue;
    const combineScore = lerp(drillVal, bps);
    for (const { trait, weight } of mappings) {
      if (!traitInputs[trait]) traitInputs[trait] = [];
      traitInputs[trait].push({ combineScore, weight, drill });
    }
  }

  // Apply blending
  for (const [trait, inputs] of Object.entries(traitInputs)) {
    // Skip traits already handled by raw overwrite
    if (trait === "Speed" && SPEED_POSITIONS.has(pos) && cd.forty) continue;
    if (trait === "Athleticism" && ATHLETICISM_POSITIONS.has(pos) && cd.athleticScore != null) continue;

    // Only blend traits that exist for this position
    if (!POSITION_TRAITS[pos]?.includes(trait)) continue;

    const current = sc[trait] ?? 50;
    const hasPrimary = inputs.some(i => i.weight === "primary");
    let combineScore;

    if (hasPrimary) {
      const primaries = inputs.filter(i => i.weight === "primary");
      combineScore = Math.round(primaries.reduce((sum, i) => sum + i.combineScore, 0) / primaries.length);
    } else {
      combineScore = Math.round(inputs.reduce((sum, i) => sum + i.combineScore, 0) / inputs.length);
    }

    // Position-specific combine sensitivity tiers
    // Extreme (WR/CB/EDGE): athleticism IS the job
    // High (S/RB/LB/TE): athleticism very important
    // Mid (QB/OT): athleticism matters somewhat
    // Low (DL/IOL): technique/size dominate, outliers still move
    const BLEND = {
      extreme: { primary: 0.50, partial: 0.35 },
      high:    { primary: 0.40, partial: 0.25 },
      mid:     { primary: 0.25, partial: 0.15 },
      low:     { primary: 0.15, partial: 0.10 },
    };
    const POS_TIER = {
      WR: "extreme", CB: "extreme", EDGE: "extreme",
      S: "high", RB: "high", LB: "high", TE: "high",
      QB: "mid", OT: "mid",
      DL: "low", IOL: "low",
    };
    const tier = BLEND[POS_TIER[pos] || "high"];
    const blendFactor = hasPrimary ? tier.primary : tier.partial;
    result[trait] = Math.round(current * (1 - blendFactor) + combineScore * blendFactor);
  }

  // Combine-driven ceiling: ATH + explosion set a floor (or enforce capped)
  if (cd.athleticScore != null) {
    const ath = cd.athleticScore;
    const exp = cd.explosionScore;
    const CEIL_RANK = { capped: 0, normal: 1, high: 2, elite: 3 };
    const CEIL_NAME = ["capped", "normal", "high", "elite"];

    // Derive ceiling from combine composites
    let combineCeiling = "normal";
    if (ath < 40) {
      combineCeiling = "capped";
    } else if (ath >= 98 && exp != null && exp >= 95) {
      combineCeiling = "elite";
    } else if (ath >= 95 && exp != null && exp >= 95) {
      combineCeiling = "high";
    }

    const scoutCeiling = sc.__ceiling || "normal";

    if (combineCeiling === "capped") {
      // Capped is enforced regardless — limited physical tools are a hard cap
      result.__ceiling = "capped";
    } else {
      // For everything else, take the higher of combine vs scouting
      const best = CEIL_RANK[combineCeiling] > CEIL_RANK[scoutCeiling] ? combineCeiling : scoutCeiling;
      result.__ceiling = best;
    }
  }

  _traitCache[cacheKey] = result;
  return result;
}

/**
 * Returns combine composite scores for UI display.
 */
export function getCombineScores(name, school) {
  if (!name) return null;
  const cacheKey = normalize(name) + "|" + (school || "").toLowerCase().trim();
  if (_scoreCache[cacheKey] !== undefined) return _scoreCache[cacheKey];

  const cd = lookupCombine(name, school);
  if (!cd) { _scoreCache[cacheKey] = null; return null; }

  const result = {
    athleticScore: cd.athleticScore ?? null,
    agilityScore: cd.agilityScore ?? null,
    explosionScore: cd.explosionScore ?? null,
    speedScore: cd.speedScore ?? null,
    percentiles: cd.percentiles ?? null,
    scores: cd.scores ?? null,
  };

  _scoreCache[cacheKey] = result;
  return result;
}
