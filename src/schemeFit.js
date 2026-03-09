// Scheme fit scoring engine
// Computes 0-100 scheme fit score for each prospect × team pair
// Returns score, prospect-specific tags, component breakdown, and plain-English summary

import { SCHEME_PROFILES } from "./schemeData.js";
import { TEAM_PROFILES, SCHEME_INFLECTIONS } from "./draftConfig.js";
import { POSITION_TRAITS, TRAIT_WEIGHTS, TRAIT_ABBREV } from "./positions.js";
import { TEAM_SCHEME } from "./depthChartUtils.js";
import { getScoutingTraits } from "./scoutingData.js";
import { getStatBasedTraits } from "./statTraits.js";
import { getCombineScores } from "./combineTraits.js";
import { getCombineData } from "./combineData.js";

function tv(userTraits, id, trait, name, school) {
  return userTraits[id]?.[trait] ?? getScoutingTraits(name, school)?.[trait] ?? getStatBasedTraits(name, school)?.[trait] ?? 50;
}

function getCeiling(userTraits, id, name, school) {
  if (userTraits[id]?.__ceiling) return userTraits[id].__ceiling;
  const sc = getScoutingTraits(name, school);
  return sc?.__ceiling || "normal";
}

// ── Scheme-specific trait weight overrides ──
function getSchemeWeights(pos, scheme) {
  const base = TRAIT_WEIGHTS[pos];
  if (!base) return null;
  const w = { ...base };

  if (pos === "EDGE") {
    if (scheme.defFront === "34") {
      w["Pass Rush"] = 0.28; w["Bend"] = 0.24; w["Motor"] = 0.20;
      w["First Step"] = 0.12; w["Power"] = 0.10; w["Run Defense"] = 0.06;
    } else {
      w["First Step"] = 0.26; w["Power"] = 0.22; w["Pass Rush"] = 0.20;
      w["Run Defense"] = 0.16; w["Bend"] = 0.10; w["Motor"] = 0.06;
    }
  }
  if (pos === "CB") {
    if (scheme.coverageLean === "man") {
      w["Man Coverage"] = 0.32; w["Press"] = 0.24; w["Speed"] = 0.20;
      w["Ball Skills"] = 0.10; w["Zone Coverage"] = 0.06; w["Nickel"] = 0.08;
    } else if (scheme.coverageLean === "zone") {
      w["Zone Coverage"] = 0.30; w["Ball Skills"] = 0.26; w["Speed"] = 0.14;
      w["Man Coverage"] = 0.12; w["Nickel"] = 0.10; w["Press"] = 0.08;
    }
  }
  if (pos === "RB") {
    if (scheme.runScheme === "zone") {
      w["Vision"] = 0.28; w["Elusiveness"] = 0.26; w["Speed"] = 0.16;
      w["Contact Balance"] = 0.12; w["Pass Catching"] = 0.10; w["Power"] = 0.04; w["Pass Protection"] = 0.04;
    } else if (scheme.runScheme === "gap") {
      w["Power"] = 0.26; w["Contact Balance"] = 0.24; w["Vision"] = 0.20;
      w["Elusiveness"] = 0.10; w["Speed"] = 0.08; w["Pass Catching"] = 0.06; w["Pass Protection"] = 0.06;
    }
  }
  if (pos === "TE") {
    if (scheme.teRec >= 0.7) {
      if (scheme.offPersonnel === "12" || scheme.offPersonnel === "13") {
        w["Receiving"] = 0.24; w["Route Running"] = 0.22; w["Blocking"] = 0.16;
        w["Hands"] = 0.16; w["Athleticism"] = 0.12; w["Speed"] = 0.10;
      } else {
        w["Receiving"] = 0.26; w["Route Running"] = 0.24; w["Hands"] = 0.22;
        w["Speed"] = 0.14; w["Athleticism"] = 0.08; w["Blocking"] = 0.06;
      }
    }
  }
  if (pos === "S") {
    if (scheme.sHybrid >= 0.7) {
      w["Man Coverage"] = 0.16; w["Range"] = 0.24; w["Tackling"] = 0.24;
      w["Ball Skills"] = 0.14; w["Speed"] = 0.12; w["Nickel"] = 0.10;
    }
  }
  if (pos === "LB") {
    if (scheme.lbRush >= 0.7) {
      w["Pass Rush"] = 0.22; w["Athleticism"] = 0.20; w["Instincts"] = 0.14;
      w["Tackling"] = 0.12; w["Coverage"] = 0.10; w["Range"] = 0.08;
      w["Block Shedding"] = 0.08; w["Pre-Snap Diagnosis"] = 0.06;
    }
  }

  const sum = Object.values(w).reduce((a, b) => a + b, 0);
  if (sum > 0 && Math.abs(sum - 1) > 0.01) {
    for (const k in w) w[k] /= sum;
  }
  return w;
}

// Find a prospect's top N traits (scheme-weighted) for tag generation
function getTopSchemeTraits(prospect, scheme, userTraits, n = 2) {
  const pos = prospect.gpos || prospect.pos;
  const posTraits = POSITION_TRAITS[pos];
  const weights = getSchemeWeights(pos, scheme);
  if (!posTraits || !weights) return [];

  const traitScores = posTraits.map(trait => {
    const val = tv(userTraits, prospect.id, trait, prospect.name, prospect.school);
    const w = weights[trait] || 0;
    return { trait, val, w, impact: val * w };
  }).sort((a, b) => b.impact - a.impact);

  // Return top traits that are both scheme-relevant (w > avg) and the prospect is good at (val >= 65)
  return traitScores.filter(t => t.val >= 65 && t.w >= 0.10).slice(0, n);
}

// ── Component 1: Trait Alignment (40%) ──
function traitAlignmentScore(prospect, scheme, userTraits) {
  const pos = prospect.gpos || prospect.pos;
  const posTraits = POSITION_TRAITS[pos];
  if (!posTraits || pos === "K/P") return { score: 50, tags: [] };

  const weights = getSchemeWeights(pos, scheme);
  if (!weights) return { score: 50, tags: [] };

  let totalW = 0, totalV = 0;
  posTraits.forEach(trait => {
    const w = weights[trait] || 0;
    const v = tv(userTraits, prospect.id, trait, prospect.name, prospect.school);
    totalW += w;
    totalV += v * w;
  });
  const raw = totalW > 0 ? totalV / totalW : 50;

  // Steeper curve: 35-85 raw → 0-100, with power curve for spread
  const normalized = Math.max(0, Math.min(1, (raw - 35) / 50));
  const curved = Math.pow(normalized, 0.85) * 100; // slight curve to spread midrange
  const score = Math.max(0, Math.min(100, curved));

  // Generate prospect-specific tags from their actual strong traits
  const tags = [];
  const top = getTopSchemeTraits(prospect, scheme, userTraits, 2);
  if (top.length >= 2 && top[0].val >= 70 && top[1].val >= 70) {
    tags.push(`${TRAIT_ABBREV[top[0].trait] || top[0].trait} ${Math.round(top[0].val)} + ${TRAIT_ABBREV[top[1].trait] || top[1].trait} ${Math.round(top[1].val)}`);
  } else if (top.length >= 1 && top[0].val >= 75) {
    tags.push(`Elite ${top[0].trait.toLowerCase()}`);
  }

  return { score, tags };
}

// ── Component 2: Archetype Match (25%) ──
function archetypeMatchScore(prospect, scheme, teamName, userTraits) {
  const pos = prospect.gpos || prospect.pos;
  if (pos === "K/P") return { score: 50, tags: [] };

  let archetypeScore = 0;
  let tags = [];
  let matchCount = 0;

  if (pos === "TE") {
    const demand = scheme.teRec;
    const rec = tv(userTraits, prospect.id, "Receiving", prospect.name, prospect.school);
    const rr = tv(userTraits, prospect.id, "Route Running", prospect.name, prospect.school);
    const hands = tv(userTraits, prospect.id, "Hands", prospect.name, prospect.school);
    const blk = tv(userTraits, prospect.id, "Blocking", prospect.name, prospect.school);
    const traitFit = (rec * 0.4 + rr * 0.3 + hands * 0.3) / 100;
    // Bonus/penalty based on how well traits match what scheme wants
    const match = traitFit * (0.5 + demand * 0.8); // scale demand impact
    archetypeScore += match;
    matchCount++;
    if (demand >= 0.6 && rec >= 70) {
      if (blk >= 65) tags.push("Complete TE");
      else tags.push(scheme.offPersonnel >= "12" ? "Move TE in multi-TE" : "Receiving weapon");
    }
    // Anti-fit: blocking-only TE in a receiving scheme
    if (demand >= 0.7 && rec < 55 && blk >= 70) archetypeScore -= 0.15;
  }

  if (pos === "LB") {
    const demand = scheme.lbRush;
    const pr = tv(userTraits, prospect.id, "Pass Rush", prospect.name, prospect.school);
    const ath = tv(userTraits, prospect.id, "Athleticism", prospect.name, prospect.school);
    const cov = tv(userTraits, prospect.id, "Coverage", prospect.name, prospect.school);
    const traitFit = (pr * 0.5 + ath * 0.5) / 100;
    const match = traitFit * (0.5 + demand * 0.8);
    archetypeScore += match;
    matchCount++;
    if (demand >= 0.6 && pr >= 70) tags.push("Edge-rush versatility");
    // Coverage LB in a rush-first scheme is a mismatch
    if (demand >= 0.7 && pr < 50 && cov >= 70) archetypeScore -= 0.12;
    // Rush LB in a coverage scheme is also a mismatch
    if (demand <= 0.3 && pr >= 70 && cov < 50) archetypeScore -= 0.10;
  }

  if (pos === "RB") {
    const demand = scheme.rbDual;
    const catching = tv(userTraits, prospect.id, "Pass Catching", prospect.name, prospect.school);
    const elus = tv(userTraits, prospect.id, "Elusiveness", prospect.name, prospect.school);
    const speed = tv(userTraits, prospect.id, "Speed", prospect.name, prospect.school);
    const power = tv(userTraits, prospect.id, "Power", prospect.name, prospect.school);
    if (demand >= 0.6) {
      const traitFit = (catching * 0.4 + elus * 0.3 + speed * 0.3) / 100;
      const match = traitFit * (0.5 + demand * 0.8);
      archetypeScore += match;
      if (catching >= 70 && elus >= 65) tags.push("Receiving back");
      // Pure power back in a dual-threat scheme
      if (catching < 50 && power >= 70) archetypeScore -= 0.12;
    } else {
      // Gap/power scheme wants power RB
      const traitFit = (power * 0.4 + elus * 0.3 + speed * 0.3) / 100;
      archetypeScore += traitFit * 0.8;
      if (power >= 70 && speed >= 65) tags.push("Downhill runner");
    }
    matchCount++;
  }

  if (pos === "S") {
    const demand = scheme.sHybrid;
    const man = tv(userTraits, prospect.id, "Man Coverage", prospect.name, prospect.school);
    const tackling = tv(userTraits, prospect.id, "Tackling", prospect.name, prospect.school);
    const range = tv(userTraits, prospect.id, "Range", prospect.name, prospect.school);
    const nickel = tv(userTraits, prospect.id, "Nickel", prospect.name, prospect.school);
    const traitFit = (man * 0.25 + tackling * 0.25 + range * 0.25 + nickel * 0.25) / 100;
    const match = traitFit * (0.5 + demand * 0.8);
    archetypeScore += match;
    matchCount++;
    if (demand >= 0.6) {
      if (tackling >= 70 && man >= 65) tags.push("Box/slot hybrid");
      else if (range >= 75) tags.push("Rangey centerfielder");
    }
    // Pure deep safety in a hybrid scheme is a partial mismatch
    if (demand >= 0.7 && tackling < 50 && range >= 75) archetypeScore -= 0.08;
  }

  if (pos === "CB") {
    if (scheme.coverageLean === "man") {
      const man = tv(userTraits, prospect.id, "Man Coverage", prospect.name, prospect.school);
      const press = tv(userTraits, prospect.id, "Press", prospect.name, prospect.school);
      const speed = tv(userTraits, prospect.id, "Speed", prospect.name, prospect.school);
      const traitFit = (man * 0.4 + press * 0.35 + speed * 0.25) / 100;
      archetypeScore += traitFit * 1.2;
      if (man >= 72 && press >= 68) tags.push("Press-man specialist");
      // Zone CB in a man scheme
      const zone = tv(userTraits, prospect.id, "Zone Coverage", prospect.name, prospect.school);
      if (man < 55 && zone >= 70) archetypeScore -= 0.15;
    } else if (scheme.coverageLean === "zone") {
      const zone = tv(userTraits, prospect.id, "Zone Coverage", prospect.name, prospect.school);
      const ball = tv(userTraits, prospect.id, "Ball Skills", prospect.name, prospect.school);
      const traitFit = (zone * 0.45 + ball * 0.55) / 100;
      archetypeScore += traitFit * 1.2;
      if (ball >= 72 && zone >= 68) tags.push("Zone ballhawk");
      // Man CB in a zone scheme
      const man = tv(userTraits, prospect.id, "Man Coverage", prospect.name, prospect.school);
      if (zone < 55 && man >= 70) archetypeScore -= 0.12;
    } else {
      const man = tv(userTraits, prospect.id, "Man Coverage", prospect.name, prospect.school);
      const zone = tv(userTraits, prospect.id, "Zone Coverage", prospect.name, prospect.school);
      archetypeScore += Math.max(man, zone) / 100;
      if (man >= 70 && zone >= 65) tags.push("Versatile cover skills");
    }
    matchCount++;
  }

  if (pos === "EDGE") {
    if (scheme.defFront === "34") {
      const bend = tv(userTraits, prospect.id, "Bend", prospect.name, prospect.school);
      const motor = tv(userTraits, prospect.id, "Motor", prospect.name, prospect.school);
      const pr = tv(userTraits, prospect.id, "Pass Rush", prospect.name, prospect.school);
      const traitFit = (bend * 0.35 + motor * 0.30 + pr * 0.35) / 100;
      archetypeScore += traitFit * 1.2;
      if (bend >= 72 && pr >= 70) tags.push("OLB rush profile");
      // Power DE in a 3-4 is a partial mismatch if no bend
      const power = tv(userTraits, prospect.id, "Power", prospect.name, prospect.school);
      if (bend < 55 && power >= 70) archetypeScore -= 0.10;
    } else {
      const first = tv(userTraits, prospect.id, "First Step", prospect.name, prospect.school);
      const power = tv(userTraits, prospect.id, "Power", prospect.name, prospect.school);
      const rd = tv(userTraits, prospect.id, "Run Defense", prospect.name, prospect.school);
      const traitFit = (first * 0.35 + power * 0.35 + rd * 0.30) / 100;
      archetypeScore += traitFit * 1.2;
      if (first >= 70 && power >= 68) tags.push("Hand-in-dirt DE");
      // Speed rusher without power in a 4-3
      const bend = tv(userTraits, prospect.id, "Bend", prospect.name, prospect.school);
      if (power < 50 && bend >= 75) archetypeScore -= 0.08;
    }
    matchCount++;
  }

  // QB, WR, OT, IOL, DL — universal fit (no strong archetype divergence by scheme)
  if (matchCount === 0) {
    // Still give some credit for good traits
    const posTraits = POSITION_TRAITS[pos] || [];
    const weights = TRAIT_WEIGHTS[pos] || {};
    let sum = 0, wSum = 0;
    posTraits.forEach(t => {
      const v = tv(userTraits, prospect.id, t, prospect.name, prospect.school);
      const w = weights[t] || 0.1;
      sum += v * w;
      wSum += w;
    });
    const avg = wSum > 0 ? sum / wSum : 50;
    return { score: Math.max(0, Math.min(100, ((avg - 35) / 50) * 100)), tags: [] };
  }

  const avgMatch = archetypeScore / matchCount;
  // Wider range: scale 0-1.3 input → 0-100 output with spread
  const score = Math.max(0, Math.min(100, (avgMatch / 1.0) * 100));
  return { score, tags };
}

// ── Component 3: Positional Scheme Value (15%) ──
function positionalSchemeValue(prospect, scheme) {
  const pos = prospect.gpos || prospect.pos;
  if (pos === "K/P") return { score: 50, tags: [] };

  let mod = 0;
  let tags = [];

  if (scheme.defFront === "34") {
    if (pos === "EDGE") mod += 8;
    if (pos === "LB") mod += 5;
    if (pos === "DL") mod -= 4;
  } else if (scheme.defFront === "43") {
    if (pos === "DL") mod += 6;
    if (pos === "EDGE") mod += 3;
    if (pos === "LB") mod -= 4;
  } else if (scheme.defFront === "425") {
    if (pos === "CB" || pos === "S") mod += 6;
    if (pos === "LB") mod -= 6;
  }
  if (scheme.offPersonnel === "12" || scheme.offPersonnel === "13") {
    if (pos === "TE") { mod += 8; tags.push("Multi-TE offense"); }
    if (pos === "WR") mod -= 3;
  }
  if (scheme.coverageLean === "man" && pos === "CB") mod += 4;
  if (scheme.coverageLean === "zone" && pos === "S") mod += 3;
  if (scheme.blitzTendency === "heavy" && (pos === "EDGE" || pos === "LB")) mod += 3;
  if (scheme.blitzTendency === "heavy" && pos === "S" && scheme.sHybrid >= 0.6) { mod += 3; tags.push("Blitz-heavy secondary"); }

  // Wider range: ×2.5 modifier
  const score = Math.max(0, Math.min(100, 50 + mod * 2.5));
  return { score, tags };
}

// ── Component 4: Athletic Profile Match (10%) ──
function athleticProfileScore(prospect, teamName) {
  const prof = TEAM_PROFILES[teamName];
  if (!prof) return { score: 50, tags: [] };

  const cs = getCombineScores(prospect.name, prospect.school);
  const cd = getCombineData(prospect.name, prospect.school);
  let score = 50;
  let tags = [];

  if (cs) {
    const ath = cs.athleticScore || 0;
    const spd = cs.speedScore || 0;

    if (prof.athBoost > 0.06) {
      if (ath >= 85) { score += 30; tags.push(`${Math.round(ath)} athletic score`); }
      else if (ath >= 70) { score += 18; }
      else if (ath >= 55) score += 6;
      else if (ath < 35) score -= 15;
    }
    if (prof.sizePremium && cs.percentiles) {
      const wtPct = cs.percentiles.weight || 0;
      if (wtPct >= 80) { score += 10; }
      else if (wtPct >= 65) score += 5;
      else if (wtPct < 30) score -= 8;
    }
    if (prof.athBoost > 0.10 && spd >= 80) { score += 8; }
    // Speed tag from actual 40 time
    if (cd && cd.forty && cd.forty <= 4.40 && prof.athBoost > 0.04) {
      tags.push(`${cd.forty}s 40-yard`);
    }
  } else {
    // No combine data — slight penalty for teams that value measurables
    if (prof.athBoost > 0.10) score -= 8;
  }

  return { score: Math.max(0, Math.min(100, score)), tags };
}

// ── Component 5: Ceiling Preference (10%) ──
function ceilingPreferenceScore(prospect, teamName, userTraits) {
  const prof = TEAM_PROFILES[teamName];
  if (!prof) return { score: 50, tags: [] };

  const ceiling = getCeiling(userTraits, prospect.id, prospect.name, prospect.school);
  let score = 50;
  let tags = [];

  if (prof.ceilingChaser > 0.06) {
    if (ceiling === "elite") { score += 30; tags.push("Elite ceiling"); }
    else if (ceiling === "high") { score += 18; tags.push("High ceiling"); }
    else if (ceiling === "capped") score -= 20;
    else score -= 3; // normal is slightly below max for ceiling chasers
  } else if (prof.ceilingChaser === 0) {
    if (ceiling === "capped") score += 5;
    if (ceiling === "elite") score -= 6;
  }

  return { score: Math.max(0, Math.min(100, score)), tags };
}

// ── Generate plain-English tooltip summary ──
function generateSummary(prospect, teamName, scheme, components) {
  const pos = prospect.gpos || prospect.pos;
  const name = prospect.name.split(" ").pop(); // last name
  const parts = [];

  // Trait alignment insight
  if (components.trait >= 70) {
    if (pos === "CB" && scheme.coverageLean === "man") parts.push(`trait profile fits ${teamName}'s man-heavy coverage`);
    else if (pos === "CB" && scheme.coverageLean === "zone") parts.push(`trait profile fits ${teamName}'s zone scheme`);
    else if (pos === "EDGE" && scheme.defFront === "34") parts.push(`rush traits match ${teamName}'s 3-4 OLB role`);
    else if (pos === "EDGE") parts.push(`traits align with ${teamName}'s 4-3 DE profile`);
    else if (pos === "TE" && scheme.teRec >= 0.7) parts.push(`receiving traits match ${teamName}'s TE-centric passing game`);
    else if (pos === "RB" && scheme.runScheme === "zone") parts.push(`vision and elusiveness fit ${teamName}'s zone run scheme`);
    else if (pos === "RB" && scheme.runScheme === "gap") parts.push(`power and contact balance fit ${teamName}'s gap scheme`);
    else if (pos === "S" && scheme.sHybrid >= 0.7) parts.push(`versatile skill set fits ${teamName}'s hybrid safety role`);
    else parts.push(`strong trait alignment with ${teamName}'s scheme`);
  } else if (components.trait < 40) {
    parts.push(`trait profile is a weaker fit for ${teamName}'s scheme`);
  }

  // Archetype insight
  if (components.archetype >= 70) {
    parts.push("archetype matches what the scheme demands");
  } else if (components.archetype < 35) {
    parts.push("archetype doesn't match the scheme's preferred mold");
  }

  // Athletic insight
  if (components.athletic >= 70) parts.push(`${teamName} values the athletic profile`);
  else if (components.athletic < 35) parts.push("athletic profile is a concern for this team");

  // Ceiling insight
  if (components.ceiling >= 70) parts.push(`${teamName} chases upside — ceiling is a plus`);

  if (parts.length === 0) parts.push(`moderate scheme fit for ${teamName}`);

  return `${name}'s ${parts.slice(0, 2).join("; ")}.`;
}

// ── Main scoring function ──
export function computeSchemeFit(prospect, teamName, userTraits) {
  const scheme = SCHEME_PROFILES[teamName];
  if (!scheme || prospect.pos === "K/P" || prospect.gpos === "K/P") {
    return { score: 0, tags: [], components: null, summary: "" };
  }

  const c1 = traitAlignmentScore(prospect, scheme, userTraits);
  const c2 = archetypeMatchScore(prospect, scheme, teamName, userTraits);
  const c3 = positionalSchemeValue(prospect, scheme);
  const c4 = athleticProfileScore(prospect, teamName);
  const c5 = ceilingPreferenceScore(prospect, teamName, userTraits);

  const raw = c1.score * 0.40 + c2.score * 0.25 + c3.score * 0.15 + c4.score * 0.10 + c5.score * 0.10;
  const score = Math.round(Math.max(0, Math.min(100, raw)));

  // Component breakdown for UI
  const components = {
    trait: Math.round(c1.score),
    archetype: Math.round(c2.score),
    positional: Math.round(c3.score),
    athletic: Math.round(c4.score),
    ceiling: Math.round(c5.score),
  };

  // Collect all tags, deduplicate, take top 3
  const allTags = [...c1.tags, ...c2.tags, ...c3.tags, ...c4.tags, ...c5.tags];
  const tags = [...new Set(allTags)].slice(0, 3);

  const summary = generateSummary(prospect, teamName, scheme, components);

  return { score, tags, components, summary };
}

// Precompute all fits
export function computeAllSchemeFits(prospects, userTraits) {
  const result = {};
  const teams = Object.keys(SCHEME_PROFILES);
  for (const team of teams) {
    const teamFits = {};
    for (const p of prospects) {
      if (p.pos === "K/P" || p.gpos === "K/P") continue;
      teamFits[p.id] = computeSchemeFit(p, team, userTraits);
    }
    result[team] = teamFits;
  }
  return result;
}

export function getTopTeamFits(prospectId, allFits, n = 5) {
  const entries = [];
  for (const [team, fits] of Object.entries(allFits)) {
    const fit = fits[prospectId];
    if (fit && fit.score > 0) entries.push({ team, ...fit });
  }
  entries.sort((a, b) => b.score - a.score);
  return entries.slice(0, n);
}

export function getTeamSchemeFits(teamName, allFits, prospects, posFilter, threshold = 65) {
  const teamFits = allFits[teamName];
  if (!teamFits) return [];

  let entries = [];
  for (const p of prospects) {
    if (p.pos === "K/P" || p.gpos === "K/P") continue;
    const pos = p.gpos || p.pos;
    if (posFilter && posFilter !== "ALL" && pos !== posFilter) continue;
    const fit = teamFits[p.id];
    if (fit) entries.push({ prospect: p, ...fit });
  }

  entries.sort((a, b) => b.score - a.score);

  const aboveThreshold = entries.filter(e => e.score >= threshold);
  if (aboveThreshold.length >= 5) return aboveThreshold;

  const above55 = entries.filter(e => e.score >= 55);
  if (above55.length >= 5) return above55;

  return entries.slice(0, 5).map(e => ({ ...e, limitedFit: true }));
}
