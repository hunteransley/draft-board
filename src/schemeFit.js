// Scheme fit scoring engine
// Computes 0-100 scheme fit score for each prospect × team pair
// Returns score, prospect-specific tags, component breakdown, and plain-English summary

import { SCHEME_PROFILES, SCHEME_NARRATIVES, SCHEME_BLUEPRINT_WEIGHTS } from "./schemeData.js";
import { TEAM_PROFILES, SCHEME_INFLECTIONS } from "./draftConfig.js";
import { POSITION_TRAITS, TRAIT_WEIGHTS, TRAIT_ABBREV, POS_GROUP_MAP } from "./positions.js";
import { TEAM_SCHEME } from "./depthChartUtils.js";
import { getScoutingTraits } from "./scoutingData.js";
import { getStatBasedTraits } from "./statTraits.js";
import { getCombineScores } from "./combineTraits.js";
import { getCombineData } from "./combineData.js";
import SCOUTING_NARRATIVES from "./scoutingNarratives.json";

function tv(userTraits, id, trait, name, school) {
  return userTraits[id]?.[trait] ?? getScoutingTraits(name, school)?.[trait] ?? getStatBasedTraits(name, school)?.[trait] ?? 50;
}

function getCeiling(userTraits, id, name, school) {
  if (userTraits[id]?.__ceiling) return userTraits[id].__ceiling;
  const sc = getScoutingTraits(name, school);
  return sc?.__ceiling || "normal";
}

function getScoutNarrative(name, school) {
  const nKey = `${name?.toLowerCase()}|${school?.toLowerCase()}`;
  return SCOUTING_NARRATIVES[nKey] || null;
}

// ── Scheme fit tag → scheme matcher (returns true if tag matches team's scheme) ──
const SCHEME_TAG_MATCHERS = {
  // Offensive
  zone_run: (s) => s.runScheme === "zone" || s.offFamily === "shanahan_zone",
  gap_scheme: (s) => s.runScheme === "gap" || s.offFamily === "power_run",
  play_action: (s) => s.passStyle === "play_action",
  rpo_fit: (s) => s.rpoUsage === "high",
  west_coast: (s) => s.passStyle === "timing" || s.offFamily === "west_coast",
  spread_offense: (s) => s.passStyle === "spread" || s.offFamily === "spread_rpo",
  slot_receiver: (s) => s.passStyle === "spread" || s.passStyle === "timing",
  boundary_receiver: (s) => s.passStyle === "vertical" || s.passStyle === "play_action",
  receiving_back: (s) => s.rbDual >= 0.6,
  power_back: (s) => s.runScheme === "gap" || s.offFamily === "power_run",
  inline_te: (s) => s.teRole === "inline",
  // Defensive
  "34_fit": (s) => s.defFront === "34",
  "43_fit": (s) => s.defFront === "43" || s.defFront === "425",
  pass_rush_specialist: (s) => s.blitzTendency === "heavy",
  run_stuffer: () => true,
  hands_in_dirt: (s) => s.edgeType === "hands_dirt",
  standup_edge: (s) => s.edgeType === "standup",
  zone_coverage: (s) => s.coverageLean === "zone" || s.coverageLean === "multiple",
  press_man: (s) => s.coverageLean === "man",
  nickel_coverage: (s) => s.defFront === "425" || s.coverageLean === "multiple",
  hybrid_safety: (s) => s.safetyRole === "hybrid_box" || s.safetyRole === "versatile",
  // EXCLUDE
  gap_scheme_EXCLUDE: (s) => s.runScheme === "gap" || s.offFamily === "power_run",
};

// ── Scheme-specific trait weight overrides ──
function getSchemeWeights(pos, scheme, teamName) {
  const base = TRAIT_WEIGHTS[pos];
  if (!base) return null;

  // Agent-provided per-team weights (v2 blueprint data)
  const bpPos = pos === "IDL" ? "DL" : POS_GROUP_MAP[pos] || pos;
  const agentWeights = teamName && SCHEME_BLUEPRINT_WEIGHTS[teamName]?.[bpPos];
  if (agentWeights && Object.keys(agentWeights).length > 0) {
    const posTraits = POSITION_TRAITS[pos];
    if (posTraits) {
      const w = {};
      let sum = 0;
      for (const trait of posTraits) {
        w[trait] = agentWeights[trait] || 0;
        sum += w[trait];
      }
      if (sum > 0 && Math.abs(sum - 1) > 0.01) {
        for (const k in w) w[k] /= sum;
      }
      return sum > 0 ? w : { ...base };
    }
  }

  // Fallback: hardcoded scheme-type weights
  const w = { ...base };

  if (pos === "EDGE") {
    if (scheme.defFront === "34") {
      w["Pass Rush"] = 0.28; w["Bend"] = 0.24; w["Motor"] = 0.20;
      w["First Step"] = 0.12; w["Power"] = 0.10; w["Run Defense"] = 0.06;
      // Edge type modifier
      if (scheme.edgeType === "standup") {
        w["Bend"] = (w["Bend"] || 0) + 0.04;
        w["Motor"] = (w["Motor"] || 0) - 0.04;
      }
    } else {
      w["First Step"] = 0.26; w["Power"] = 0.22; w["Pass Rush"] = 0.20;
      w["Run Defense"] = 0.16; w["Bend"] = 0.10; w["Motor"] = 0.06;
      // Edge type modifier
      if (scheme.edgeType === "hands_dirt") {
        w["Power"] = (w["Power"] || 0) + 0.04;
        w["Run Defense"] = (w["Run Defense"] || 0) + 0.02;
        w["Bend"] = (w["Bend"] || 0) - 0.06;
      }
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
    if (scheme.teRole === "move") {
      w["Route Running"] = 0.26; w["Receiving"] = 0.22; w["Hands"] = 0.20;
      w["Speed"] = 0.16; w["Athleticism"] = 0.10; w["Blocking"] = 0.06;
    } else if (scheme.teRole === "hybrid") {
      w["Receiving"] = 0.22; w["Route Running"] = 0.20; w["Blocking"] = 0.18;
      w["Hands"] = 0.16; w["Athleticism"] = 0.14; w["Speed"] = 0.10;
    } else if (scheme.teRole === "inline") {
      w["Blocking"] = 0.32; w["Receiving"] = 0.18; w["Route Running"] = 0.14;
      w["Athleticism"] = 0.14; w["Hands"] = 0.12; w["Speed"] = 0.10;
    } else if (scheme.teRec >= 0.7) {
      // Fallback for "standard" teRole but high receiving demand
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
    if (scheme.safetyRole === "hybrid_box") {
      w["Tackling"] = 0.24; w["Man Coverage"] = 0.22; w["Nickel"] = 0.16;
      w["Range"] = 0.14; w["Speed"] = 0.14; w["Ball Skills"] = 0.10;
    } else if (scheme.safetyRole === "versatile") {
      w["Man Coverage"] = 0.16; w["Range"] = 0.22; w["Tackling"] = 0.22;
      w["Ball Skills"] = 0.14; w["Speed"] = 0.14; w["Nickel"] = 0.12;
    } else if (scheme.safetyRole === "deep_first") {
      w["Range"] = 0.30; w["Ball Skills"] = 0.26; w["Speed"] = 0.18;
      w["Man Coverage"] = 0.10; w["Tackling"] = 0.10; w["Nickel"] = 0.06;
    }
    // "traditional_split" keeps base weights
  }
  if (pos === "LB") {
    if (scheme.lbSchemeRole === "coverage_first") {
      w["Coverage"] = 0.22; w["Athleticism"] = 0.20; w["Instincts"] = 0.18;
      w["Tackling"] = 0.14; w["Range"] = 0.10; w["Pre-Snap Diagnosis"] = 0.08;
      w["Pass Rush"] = 0.04; w["Block Shedding"] = 0.04;
    } else if (scheme.lbSchemeRole === "blitz_hybrid") {
      w["Pass Rush"] = 0.18; w["Athleticism"] = 0.18; w["Coverage"] = 0.16;
      w["Instincts"] = 0.14; w["Tackling"] = 0.12; w["Range"] = 0.08;
      w["Block Shedding"] = 0.08; w["Pre-Snap Diagnosis"] = 0.06;
    } else if (scheme.lbSchemeRole === "edge_convert" || scheme.lbRush >= 0.7) {
      w["Pass Rush"] = 0.22; w["Athleticism"] = 0.20; w["Instincts"] = 0.14;
      w["Tackling"] = 0.12; w["Coverage"] = 0.10; w["Range"] = 0.08;
      w["Block Shedding"] = 0.08; w["Pre-Snap Diagnosis"] = 0.06;
    }
  }

  // ── QB scheme weights (driven by passStyle + rpoUsage) ──
  if (pos === "QB") {
    if (scheme.passStyle === "play_action") {
      w["Accuracy"] = 0.20; w["Decision Making"] = 0.16; w["Pocket Presence"] = 0.20;
      w["Arm Strength"] = 0.24; w["Mobility"] = 0.08; w["Leadership"] = 0.06; w["Pre-Snap Diagnosis"] = 0.06;
    } else if (scheme.passStyle === "timing") {
      w["Accuracy"] = 0.30; w["Decision Making"] = 0.24; w["Pocket Presence"] = 0.18;
      w["Arm Strength"] = 0.12; w["Mobility"] = 0.02; w["Leadership"] = 0.06; w["Pre-Snap Diagnosis"] = 0.08;
    } else if (scheme.passStyle === "vertical") {
      w["Accuracy"] = 0.22; w["Decision Making"] = 0.18; w["Pocket Presence"] = 0.16;
      w["Arm Strength"] = 0.26; w["Mobility"] = 0.06; w["Leadership"] = 0.04; w["Pre-Snap Diagnosis"] = 0.08;
    } else if (scheme.passStyle === "spread") {
      w["Accuracy"] = 0.24; w["Decision Making"] = 0.26; w["Pocket Presence"] = 0.10;
      w["Arm Strength"] = 0.14; w["Mobility"] = 0.14; w["Leadership"] = 0.04; w["Pre-Snap Diagnosis"] = 0.08;
    }
    // RPO overlay
    if (scheme.rpoUsage === "high") {
      w["Mobility"] = (w["Mobility"] || 0.03) + 0.04;
      w["Decision Making"] = (w["Decision Making"] || 0.22) + 0.02;
      w["Leadership"] = (w["Leadership"] || 0.09) - 0.06;
      if (w["Leadership"] < 0) w["Leadership"] = 0;
    }
  }

  // ── WR scheme weights (driven by passStyle) ──
  if (pos === "WR") {
    if (scheme.passStyle === "timing") {
      w["Route Running"] = 0.28; w["Separation"] = 0.20; w["Hands"] = 0.24;
      w["YAC Ability"] = 0.12; w["Speed"] = 0.02; w["Contested Catches"] = 0.04; w["Release Package"] = 0.10;
    } else if (scheme.passStyle === "vertical") {
      w["Route Running"] = 0.18; w["Separation"] = 0.22; w["Hands"] = 0.12;
      w["YAC Ability"] = 0.08; w["Speed"] = 0.18; w["Contested Catches"] = 0.16; w["Release Package"] = 0.06;
    } else if (scheme.passStyle === "play_action") {
      w["Route Running"] = 0.22; w["Separation"] = 0.24; w["Hands"] = 0.12;
      w["YAC Ability"] = 0.22; w["Speed"] = 0.10; w["Contested Catches"] = 0.06; w["Release Package"] = 0.04;
    } else if (scheme.passStyle === "spread") {
      w["Route Running"] = 0.24; w["Separation"] = 0.24; w["Hands"] = 0.14;
      w["YAC Ability"] = 0.20; w["Speed"] = 0.08; w["Contested Catches"] = 0.06; w["Release Package"] = 0.04;
    }
  }

  // ── OT scheme weights (driven by offFamily) ──
  if (pos === "OT") {
    if (scheme.offFamily === "shanahan_zone") {
      w["Pass Protection"] = 0.20; w["Run Blocking"] = 0.16; w["Footwork"] = 0.22;
      w["Anchor"] = 0.12; w["Athleticism"] = 0.22; w["Strength"] = 0.08;
    } else if (scheme.offFamily === "power_run") {
      w["Pass Protection"] = 0.22; w["Run Blocking"] = 0.18; w["Footwork"] = 0.12;
      w["Anchor"] = 0.22; w["Athleticism"] = 0.06; w["Strength"] = 0.20;
    } else if (scheme.offFamily === "spread_rpo") {
      w["Pass Protection"] = 0.28; w["Run Blocking"] = 0.08; w["Footwork"] = 0.22;
      w["Anchor"] = 0.14; w["Athleticism"] = 0.16; w["Strength"] = 0.12;
    }
    // west_coast and pro_style keep base weights
  }

  // ── IOL scheme weights (driven by offFamily) ──
  if (pos === "IOL" || pos === "C" || pos === "OG") {
    if (scheme.offFamily === "shanahan_zone") {
      w["Pass Protection"] = 0.18; w["Run Blocking"] = 0.22; w["Pulling"] = 0.20;
      w["Strength"] = 0.14; w["Anchor"] = 0.10; w["Versatility"] = 0.16;
    } else if (scheme.offFamily === "power_run") {
      w["Pass Protection"] = 0.14; w["Run Blocking"] = 0.24; w["Pulling"] = 0.16;
      w["Strength"] = 0.22; w["Anchor"] = 0.18; w["Versatility"] = 0.06;
    } else if (scheme.offFamily === "spread_rpo") {
      w["Pass Protection"] = 0.28; w["Run Blocking"] = 0.10; w["Pulling"] = 0.10;
      w["Strength"] = 0.18; w["Anchor"] = 0.20; w["Versatility"] = 0.14;
    }
    // west_coast and pro_style keep base weights
  }

  // ── DL scheme weights (driven by defFront) ──
  if (pos === "DL" || pos === "IDL") {
    if (scheme.defFront === "34") {
      w["Pass Rush"] = 0.08; w["Run Defense"] = 0.28; w["First Step"] = 0.06;
      w["Hand Usage"] = 0.18; w["Motor"] = 0.16; w["Strength"] = 0.24;
    } else if (scheme.defFront === "43") {
      w["Pass Rush"] = 0.26; w["Run Defense"] = 0.16; w["First Step"] = 0.22;
      w["Hand Usage"] = 0.18; w["Motor"] = 0.10; w["Strength"] = 0.08;
    } else if (scheme.defFront === "425") {
      w["Pass Rush"] = 0.24; w["Run Defense"] = 0.12; w["First Step"] = 0.22;
      w["Hand Usage"] = 0.20; w["Motor"] = 0.14; w["Strength"] = 0.08;
    }
    // "multiple" keeps base weights
  }

  const sum = Object.values(w).reduce((a, b) => a + b, 0);
  if (sum > 0 && Math.abs(sum - 1) > 0.01) {
    for (const k in w) w[k] /= sum;
  }
  return w;
}

// Find a prospect's top N traits (scheme-weighted) for tag generation
function getTopSchemeTraits(prospect, scheme, userTraits, n = 2, teamName) {
  const pos = prospect.gpos || prospect.pos;
  const posTraits = POSITION_TRAITS[pos];
  const weights = getSchemeWeights(pos, scheme, teamName);
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
function traitAlignmentScore(prospect, scheme, userTraits, teamName) {
  const pos = prospect.gpos || prospect.pos;
  const posTraits = POSITION_TRAITS[pos];
  if (!posTraits || pos === "K/P") return { score: 50, tags: [] };

  const weights = getSchemeWeights(pos, scheme, teamName);
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
  const top = getTopSchemeTraits(prospect, scheme, userTraits, 2, teamName);
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

  // Helper to get a trait value
  const t = (trait) => tv(userTraits, prospect.id, trait, prospect.name, prospect.school);

  // ── QB ──
  if (pos === "QB") {
    matchCount++;
    const acc = t("Accuracy"), dm = t("Decision Making"), pkt = t("Pocket Presence");
    const arm = t("Arm Strength"), mob = t("Mobility");
    let traitFit;
    if (scheme.passStyle === "play_action") {
      traitFit = (arm * 0.35 + pkt * 0.25 + mob * 0.20 + acc * 0.20) / 100;
      if (arm >= 72 && mob >= 60) tags.push("Play-action fit");
      if (mob < 45 && arm < 60) archetypeScore -= 0.12;
    } else if (scheme.passStyle === "timing") {
      traitFit = (acc * 0.35 + dm * 0.35 + pkt * 0.30) / 100;
      if (acc >= 72 && dm >= 68) tags.push("Timing-based processor");
      if (acc < 55 && arm >= 75) archetypeScore -= 0.10;
    } else if (scheme.passStyle === "vertical") {
      traitFit = (arm * 0.40 + acc * 0.25 + pkt * 0.20 + dm * 0.15) / 100;
      if (arm >= 75 && pkt >= 65) tags.push("Downfield arm talent");
      if (arm < 60) archetypeScore -= 0.15;
    } else {
      // spread
      traitFit = (dm * 0.30 + mob * 0.25 + acc * 0.25 + arm * 0.20) / 100;
      if (mob >= 68 && dm >= 65) tags.push("Spread-ready dual threat");
    }
    archetypeScore += traitFit * 1.2;
    // RPO bonus
    if (scheme.rpoUsage === "high" && mob >= 65 && dm >= 65) {
      archetypeScore += 0.08;
      tags.push("RPO-capable");
    }
  }

  // ── WR ──
  if (pos === "WR") {
    matchCount++;
    const rr = t("Route Running"), sep = t("Separation"), hnd = t("Hands");
    const yac = t("YAC Ability"), spd = t("Speed"), cc = t("Contested Catches");
    let traitFit;
    if (scheme.passStyle === "timing") {
      traitFit = (rr * 0.35 + hnd * 0.35 + sep * 0.30) / 100;
      if (rr >= 72 && hnd >= 70) tags.push("Precision route runner");
    } else if (scheme.passStyle === "vertical") {
      traitFit = (spd * 0.30 + cc * 0.30 + sep * 0.20 + rr * 0.20) / 100;
      if (spd >= 72 && cc >= 65) tags.push("Vertical threat");
    } else if (scheme.passStyle === "play_action") {
      traitFit = (yac * 0.30 + sep * 0.30 + rr * 0.25 + spd * 0.15) / 100;
      if (yac >= 70 && sep >= 68) tags.push("YAC weapon off PA");
    } else {
      // spread
      traitFit = (sep * 0.30 + rr * 0.25 + yac * 0.25 + hnd * 0.20) / 100;
      if (sep >= 70 && yac >= 68) tags.push("Separation/YAC in space");
    }
    archetypeScore += traitFit * 1.2;
  }

  // ── OT ──
  if (pos === "OT") {
    matchCount++;
    const pp = t("Pass Protection"), rbk = t("Run Blocking"), ft = t("Footwork");
    const anc = t("Anchor"), ath = t("Athleticism"), str = t("Strength");
    let traitFit;
    if (scheme.offFamily === "shanahan_zone") {
      traitFit = (ath * 0.30 + ft * 0.30 + rbk * 0.20 + pp * 0.20) / 100;
      if (ath >= 70 && ft >= 68) tags.push("Zone scheme mover");
      if (ath < 50 && str >= 75) archetypeScore -= 0.10;
    } else if (scheme.offFamily === "power_run") {
      traitFit = (str * 0.30 + anc * 0.30 + pp * 0.20 + rbk * 0.20) / 100;
      if (str >= 72 && anc >= 70) tags.push("Power scheme anchor");
      if (str < 50 && ath >= 70) archetypeScore -= 0.08;
    } else if (scheme.offFamily === "spread_rpo") {
      traitFit = (pp * 0.35 + ft * 0.25 + ath * 0.25 + anc * 0.15) / 100;
      if (pp >= 72 && ft >= 68) tags.push("Pass-pro technician");
    } else {
      traitFit = (pp * 0.25 + ft * 0.25 + anc * 0.25 + rbk * 0.25) / 100;
      if (pp >= 70 && rbk >= 68) tags.push("Complete blocker");
    }
    archetypeScore += traitFit * 1.2;
  }

  // ── IOL ──
  if (pos === "IOL" || pos === "C" || pos === "OG") {
    matchCount++;
    const pp = t("Pass Protection"), rbk = t("Run Blocking"), pul = t("Pulling");
    const str = t("Strength"), anc = t("Anchor"), vrs = t("Versatility");
    let traitFit;
    if (scheme.offFamily === "shanahan_zone") {
      traitFit = (pul * 0.25 + rbk * 0.25 + vrs * 0.20 + pp * 0.15 + str * 0.15) / 100;
      if (pul >= 70 && rbk >= 68) tags.push("Zone combo blocker");
    } else if (scheme.offFamily === "power_run") {
      traitFit = (str * 0.30 + rbk * 0.25 + anc * 0.25 + pul * 0.20) / 100;
      if (str >= 72 && rbk >= 70) tags.push("Drive-block mauler");
    } else if (scheme.offFamily === "spread_rpo") {
      traitFit = (pp * 0.30 + anc * 0.25 + str * 0.20 + vrs * 0.15 + pul * 0.10) / 100;
      if (pp >= 72 && anc >= 68) tags.push("Interior pass protector");
    } else {
      traitFit = (rbk * 0.25 + pp * 0.25 + str * 0.25 + anc * 0.25) / 100;
      if (rbk >= 70 && pp >= 68) tags.push("Complete interior lineman");
    }
    archetypeScore += traitFit * 1.2;
  }

  // ── DL ──
  if (pos === "DL" || pos === "IDL") {
    matchCount++;
    const pr = t("Pass Rush"), rd = t("Run Defense"), fs = t("First Step");
    const hnd = t("Hand Usage"), mtr = t("Motor"), str = t("Strength");
    let traitFit;
    if (scheme.defFront === "34") {
      traitFit = (rd * 0.30 + str * 0.30 + hnd * 0.20 + mtr * 0.20) / 100;
      if (rd >= 72 && str >= 70) tags.push("Two-gap nose");
      if (pr >= 70 && rd < 55) archetypeScore -= 0.10;
    } else if (scheme.defFront === "43") {
      traitFit = (pr * 0.30 + fs * 0.25 + hnd * 0.20 + rd * 0.15 + mtr * 0.10) / 100;
      if (pr >= 72 && fs >= 68) tags.push("Interior pass rusher");
      if (rd >= 75 && pr < 50) archetypeScore -= 0.08;
    } else if (scheme.defFront === "425") {
      traitFit = (pr * 0.30 + fs * 0.25 + hnd * 0.25 + mtr * 0.20) / 100;
      if (fs >= 72 && pr >= 68) tags.push("Penetrating 3-tech");
    } else {
      traitFit = (pr * 0.25 + rd * 0.25 + hnd * 0.25 + str * 0.25) / 100;
      if (pr >= 68 && rd >= 68) tags.push("Versatile interior DL");
    }
    archetypeScore += traitFit * 1.2;
  }

  // ── TE ──
  if (pos === "TE") {
    matchCount++;
    const rec = t("Receiving"), rr = t("Route Running"), hands = t("Hands");
    const blk = t("Blocking"), spd = t("Speed"), ath = t("Athleticism");
    let traitFit;
    if (scheme.teRole === "move") {
      traitFit = (rr * 0.30 + spd * 0.25 + rec * 0.25 + hands * 0.20) / 100;
      if (rr >= 70 && spd >= 65) tags.push("Move TE fit");
      if (blk >= 70 && rec < 55) archetypeScore -= 0.15;
    } else if (scheme.teRole === "hybrid") {
      traitFit = (rec * 0.25 + blk * 0.25 + rr * 0.20 + hands * 0.15 + ath * 0.15) / 100;
      if (rec >= 68 && blk >= 65) tags.push("Complete TE");
      if (rec < 55 && blk >= 70) archetypeScore -= 0.08;
    } else if (scheme.teRole === "inline") {
      traitFit = (blk * 0.40 + ath * 0.20 + rec * 0.20 + hands * 0.20) / 100;
      if (blk >= 72 && ath >= 65) tags.push("Inline blocker fit");
      if (blk < 55 && rec >= 70) archetypeScore -= 0.12;
    } else {
      // standard — use original demand-based logic
      const demand = scheme.teRec;
      traitFit = (rec * 0.4 + rr * 0.3 + hands * 0.3) / 100;
      const match = traitFit * (0.5 + demand * 0.8);
      archetypeScore += match;
      if (demand >= 0.6 && rec >= 70) {
        if (blk >= 65) tags.push("Complete TE");
        else tags.push(scheme.offPersonnel >= "12" ? "Move TE in multi-TE" : "Receiving weapon");
      }
      if (demand >= 0.7 && rec < 55 && blk >= 70) archetypeScore -= 0.15;
      // skip the common traitFit*1.2 below since we used different scaling
      traitFit = 0;
    }
    if (traitFit > 0) archetypeScore += traitFit * 1.2;
  }

  // ── LB ──
  if (pos === "LB") {
    matchCount++;
    const pr = t("Pass Rush"), ath = t("Athleticism"), cov = t("Coverage");
    const inst = t("Instincts"), tkl = t("Tackling");
    let traitFit;
    if (scheme.lbSchemeRole === "coverage_first") {
      traitFit = (cov * 0.35 + ath * 0.30 + inst * 0.20 + tkl * 0.15) / 100;
      if (cov >= 70 && ath >= 68) tags.push("Coverage LB fit");
      if (pr >= 70 && cov < 50) archetypeScore -= 0.10;
    } else if (scheme.lbSchemeRole === "blitz_hybrid") {
      traitFit = (pr * 0.30 + ath * 0.25 + cov * 0.25 + inst * 0.20) / 100;
      if (pr >= 68 && cov >= 60) tags.push("Blitz/coverage hybrid");
      if (cov < 45 && pr < 60) archetypeScore -= 0.10;
    } else if (scheme.lbSchemeRole === "edge_convert") {
      traitFit = (pr * 0.50 + ath * 0.50) / 100;
      if (pr >= 70) tags.push("Edge-rush versatility");
      if (pr < 50 && cov >= 70) archetypeScore -= 0.12;
    } else {
      // run_coverage
      const demand = scheme.lbRush;
      traitFit = (inst * 0.30 + tkl * 0.25 + ath * 0.25 + cov * 0.20) / 100;
      if (demand >= 0.6 && pr >= 70) tags.push("Edge-rush versatility");
      if (demand >= 0.7 && pr < 50 && cov >= 70) archetypeScore -= 0.12;
      if (demand <= 0.3 && pr >= 70 && cov < 50) archetypeScore -= 0.10;
    }
    archetypeScore += traitFit * 1.2;
  }

  // ── RB (unchanged) ──
  if (pos === "RB") {
    matchCount++;
    const demand = scheme.rbDual;
    const catching = t("Pass Catching"), elus = t("Elusiveness");
    const speed = t("Speed"), power = t("Power");
    if (demand >= 0.6) {
      const traitFit = (catching * 0.4 + elus * 0.3 + speed * 0.3) / 100;
      const match = traitFit * (0.5 + demand * 0.8);
      archetypeScore += match;
      if (catching >= 70 && elus >= 65) tags.push("Receiving back");
      if (catching < 50 && power >= 70) archetypeScore -= 0.12;
    } else {
      const traitFit = (power * 0.4 + elus * 0.3 + speed * 0.3) / 100;
      archetypeScore += traitFit * 0.8;
      if (power >= 70 && speed >= 65) tags.push("Downhill runner");
    }
  }

  // ── S ──
  if (pos === "S") {
    matchCount++;
    const man = t("Man Coverage"), tackling = t("Tackling"), range = t("Range");
    const nickel = t("Nickel"), ball = t("Ball Skills"), spd = t("Speed");
    let traitFit;
    if (scheme.safetyRole === "hybrid_box") {
      traitFit = (tackling * 0.25 + man * 0.25 + nickel * 0.20 + range * 0.15 + spd * 0.15) / 100;
      if (tackling >= 70 && man >= 65) tags.push("Box/slot hybrid");
      if (tackling < 50 && range >= 75) archetypeScore -= 0.10;
    } else if (scheme.safetyRole === "versatile") {
      traitFit = (range * 0.25 + tackling * 0.20 + man * 0.20 + ball * 0.20 + nickel * 0.15) / 100;
      if (tackling >= 68 && range >= 68) tags.push("Versatile safety");
    } else if (scheme.safetyRole === "deep_first") {
      traitFit = (range * 0.35 + ball * 0.30 + spd * 0.20 + man * 0.15) / 100;
      if (range >= 72 && ball >= 68) tags.push("Rangey centerfielder");
      if (range < 55 && tackling >= 70) archetypeScore -= 0.08;
    } else {
      // traditional_split
      traitFit = (man * 0.25 + range * 0.25 + tackling * 0.25 + ball * 0.25) / 100;
      if (range >= 70 && ball >= 65) tags.push("Rangey centerfielder");
    }
    archetypeScore += traitFit * 1.2;
  }

  // ── CB (unchanged) ──
  if (pos === "CB") {
    matchCount++;
    if (scheme.coverageLean === "man") {
      const man = t("Man Coverage"), press = t("Press"), speed = t("Speed");
      const traitFit = (man * 0.4 + press * 0.35 + speed * 0.25) / 100;
      archetypeScore += traitFit * 1.2;
      if (man >= 72 && press >= 68) tags.push("Press-man specialist");
      const zone = t("Zone Coverage");
      if (man < 55 && zone >= 70) archetypeScore -= 0.15;
    } else if (scheme.coverageLean === "zone") {
      const zone = t("Zone Coverage"), ball = t("Ball Skills");
      const traitFit = (zone * 0.45 + ball * 0.55) / 100;
      archetypeScore += traitFit * 1.2;
      if (ball >= 72 && zone >= 68) tags.push("Zone ballhawk");
      const man = t("Man Coverage");
      if (zone < 55 && man >= 70) archetypeScore -= 0.12;
    } else {
      const man = t("Man Coverage"), zone = t("Zone Coverage");
      archetypeScore += Math.max(man, zone) / 100;
      if (man >= 70 && zone >= 65) tags.push("Versatile cover skills");
    }
  }

  // ── EDGE ──
  if (pos === "EDGE") {
    matchCount++;
    if (scheme.defFront === "34") {
      const bend = t("Bend"), motor = t("Motor"), pr = t("Pass Rush");
      const traitFit = (bend * 0.35 + motor * 0.30 + pr * 0.35) / 100;
      archetypeScore += traitFit * 1.2;
      if (scheme.edgeType === "standup") {
        if (bend >= 72 && pr >= 70) tags.push("Stand-up OLB rush fit");
      } else {
        if (bend >= 72 && pr >= 70) tags.push("OLB rush profile");
      }
      const power = t("Power");
      if (bend < 55 && power >= 70) archetypeScore -= 0.10;
    } else {
      const first = t("First Step"), power = t("Power"), rd = t("Run Defense");
      const traitFit = (first * 0.35 + power * 0.35 + rd * 0.30) / 100;
      archetypeScore += traitFit * 1.2;
      if (scheme.edgeType === "hands_dirt") {
        if (first >= 70 && power >= 68) tags.push("Hand-in-dirt DE fit");
      } else {
        if (first >= 70 && power >= 68) tags.push("Versatile edge fit");
      }
      const bend = t("Bend");
      if (power < 50 && bend >= 75) archetypeScore -= 0.08;
    }
  }

  // ── Scout narrative scheme_fit_tags bonus ──
  const scoutNarr = getScoutNarrative(prospect.name, prospect.school);
  if (scoutNarr?.scheme_fit_tags?.length) {
    let tagBonus = 0, tagPenalty = 0, tagMatches = 0;
    for (const tag of scoutNarr.scheme_fit_tags) {
      if (tag.endsWith("_EXCLUDE")) {
        const matcher = SCHEME_TAG_MATCHERS[tag];
        if (matcher && matcher(scheme)) tagPenalty += 0.06;
      } else {
        const matcher = SCHEME_TAG_MATCHERS[tag];
        if (!matcher) continue;
        if (matcher(scheme)) { tagBonus += 0.05; tagMatches++; }
      }
    }
    tagBonus = Math.min(tagBonus, 0.15);
    tagPenalty = Math.min(tagPenalty, 0.12);
    archetypeScore += tagBonus - tagPenalty;
    if (tagMatches >= 2) tags.push("Scout-tagged scheme fit");
    if (tagPenalty > 0) tags.push("Scheme concern flagged");
  }

  if (matchCount === 0) {
    return { score: 50, tags: [] };
  }

  const avgMatch = archetypeScore / matchCount;
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
    if (pos === "DL" || pos === "IDL") mod -= 4;
  } else if (scheme.defFront === "43") {
    if (pos === "DL" || pos === "IDL") mod += 6;
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

  // ── New positional scheme value modifiers ──
  if (pos === "QB") {
    if (scheme.rpoUsage === "high") mod += 3;
    if (scheme.passStyle === "vertical") mod += 2;
  }
  if (pos === "WR") {
    if (scheme.offPersonnel === "11") mod += 3;
    if (scheme.passStyle === "vertical") mod += 2;
    if (scheme.passStyle === "play_action") mod -= 2;
  }
  if (pos === "OT") {
    if (scheme.offFamily === "shanahan_zone") mod += 4;
    if (scheme.offFamily === "spread_rpo") mod += 2;
  }
  if (pos === "IOL" || pos === "C" || pos === "OG") {
    if (scheme.offFamily === "power_run" || scheme.runScheme === "gap") mod += 4;
    if (scheme.offFamily === "shanahan_zone") mod += 2;
  }
  if (pos === "DL" || pos === "IDL") {
    if (scheme.defFront === "34") mod += 3; // partially offsets existing -4
    if (scheme.blitzTendency === "heavy") mod += 2;
  }
  if (pos === "S" && scheme.safetyRole === "hybrid_box") mod += 4;
  if (pos === "EDGE" && scheme.edgeType === "standup" && scheme.defFront === "34") mod += 3;

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

  // ── boom_bust_variance interaction with ceiling chasing ──
  const scoutNarrC5 = getScoutNarrative(prospect.name, prospect.school);
  const variance = scoutNarrC5?.boom_bust_variance?.level;
  if (variance) {
    if (prof.ceilingChaser > 0.06) {
      if (variance === "high") score += 10;
      else if (variance === "medium") score += 3;
      else if (variance === "low") score -= 5;
    } else if (prof.ceilingChaser === 0) {
      if (variance === "high") score -= 8;
      else if (variance === "low") score += 5;
    } else {
      if (variance === "high") score += 3;
      else if (variance === "low") score += 2;
    }
  }

  return { score: Math.max(0, Math.min(100, score)), tags };
}

// ── Generate plain-English tooltip summary ──
function generateSummary(prospect, teamName, scheme, components) {
  const pos = prospect.gpos || prospect.pos;
  const nameParts = prospect.name.split(" ");
  const suffixes = new Set(["Jr.", "Jr", "Sr.", "Sr", "II", "III", "IV", "V"]);
  let name = nameParts[nameParts.length - 1];
  if (suffixes.has(name) && nameParts.length >= 3) name = nameParts[nameParts.length - 2];
  const parts = [];

  // Trait alignment insight
  if (components.trait >= 70) {
    if (pos === "QB") {
      if (scheme.passStyle === "play_action") parts.push(`arm talent and mobility fit ${teamName}'s play-action offense`);
      else if (scheme.passStyle === "timing") parts.push(`accuracy and processing fit ${teamName}'s timing-based passing game`);
      else if (scheme.passStyle === "vertical") parts.push(`arm strength and pocket presence fit ${teamName}'s vertical attack`);
      else if (scheme.passStyle === "spread") parts.push(`decision making and mobility fit ${teamName}'s spread offense`);
      else parts.push(`strong trait alignment with ${teamName}'s scheme`);
    } else if (pos === "WR") {
      if (scheme.passStyle === "timing") parts.push(`route precision fits ${teamName}'s timing-based passing game`);
      else if (scheme.passStyle === "vertical") parts.push(`speed and contested-catch ability match ${teamName}'s vertical attack`);
      else if (scheme.passStyle === "play_action") parts.push(`YAC and separation fit ${teamName}'s play-action passing game`);
      else if (scheme.passStyle === "spread") parts.push(`separation and versatility fit ${teamName}'s spread offense`);
      else parts.push(`strong trait alignment with ${teamName}'s scheme`);
    } else if (pos === "OT") {
      if (scheme.offFamily === "shanahan_zone") parts.push(`athleticism and footwork fit ${teamName}'s zone blocking scheme`);
      else if (scheme.offFamily === "power_run") parts.push(`strength and anchor fit ${teamName}'s power blocking scheme`);
      else if (scheme.offFamily === "spread_rpo") parts.push(`pass protection fits ${teamName}'s pass-heavy scheme`);
      else parts.push(`strong trait alignment with ${teamName}'s scheme`);
    } else if (pos === "IOL" || pos === "C" || pos === "OG") {
      if (scheme.offFamily === "shanahan_zone") parts.push(`pulling and combo blocking fit ${teamName}'s zone run game`);
      else if (scheme.offFamily === "power_run") parts.push(`strength and run blocking fit ${teamName}'s gap scheme`);
      else if (scheme.offFamily === "spread_rpo") parts.push(`pass protection and anchor fit ${teamName}'s pass-heavy scheme`);
      else parts.push(`strong trait alignment with ${teamName}'s scheme`);
    } else if (pos === "DL" || pos === "IDL") {
      if (scheme.defFront === "34") parts.push(`run-stuffing profile fits ${teamName}'s 3-4 nose role`);
      else if (scheme.defFront === "43") parts.push(`pass-rush upside matches ${teamName}'s 4-3 interior rush`);
      else if (scheme.defFront === "425") parts.push(`penetration ability fits ${teamName}'s 4-2-5 interior`);
      else parts.push(`strong trait alignment with ${teamName}'s scheme`);
    } else if (pos === "CB" && scheme.coverageLean === "man") parts.push(`trait profile fits ${teamName}'s man-heavy coverage`);
    else if (pos === "CB" && scheme.coverageLean === "zone") parts.push(`trait profile fits ${teamName}'s zone scheme`);
    else if (pos === "EDGE" && scheme.defFront === "34") parts.push(`rush traits match ${teamName}'s 3-4 OLB role`);
    else if (pos === "EDGE") parts.push(`traits align with ${teamName}'s 4-3 DE profile`);
    else if (pos === "TE" && scheme.teRole === "move") parts.push(`receiving traits match ${teamName}'s move-TE role`);
    else if (pos === "TE" && scheme.teRole === "hybrid") parts.push(`complete skill set fits ${teamName}'s hybrid TE role`);
    else if (pos === "TE" && scheme.teRec >= 0.7) parts.push(`receiving traits match ${teamName}'s TE-centric passing game`);
    else if (pos === "RB" && scheme.runScheme === "zone") parts.push(`vision and elusiveness fit ${teamName}'s zone run scheme`);
    else if (pos === "RB" && scheme.runScheme === "gap") parts.push(`power and contact balance fit ${teamName}'s gap scheme`);
    else if (pos === "S" && scheme.safetyRole === "hybrid_box") parts.push(`box versatility fits ${teamName}'s hybrid safety role`);
    else if (pos === "S" && scheme.safetyRole === "versatile") parts.push(`versatile skill set fits ${teamName}'s multiple safety role`);
    else if (pos === "S" && scheme.safetyRole === "deep_first") parts.push(`range and ball skills fit ${teamName}'s deep safety role`);
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

  const c1 = traitAlignmentScore(prospect, scheme, userTraits, teamName);
  const c2 = archetypeMatchScore(prospect, scheme, teamName, userTraits);
  const c3 = positionalSchemeValue(prospect, scheme);
  const c4 = athleticProfileScore(prospect, teamName);
  const c5 = ceilingPreferenceScore(prospect, teamName, userTraits);

  let raw = c1.score * 0.40 + c2.score * 0.25 + c3.score * 0.15 + c4.score * 0.10 + c5.score * 0.10;

  // ── Analyst consensus confidence modifier ──
  const scoutNarrFinal = getScoutNarrative(prospect.name, prospect.school);
  const consensus = scoutNarrFinal?.analyst_consensus_level;
  if (consensus === "low") {
    raw = 50 + (raw - 50) * 0.88;
  } else if (consensus === "moderate") {
    raw = 50 + (raw - 50) * 0.95;
  }

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

// Get scheme role label for a team×position
function getSchemeRoleLabel(pos, scheme) {
  if (pos === "QB") {
    const labels = { play_action: "Play-Action QB", timing: "Timing/West Coast QB", vertical: "Vertical Passer", spread: "Spread/Dual-Threat QB" };
    let label = labels[scheme.passStyle] || "Quarterback";
    if (scheme.rpoUsage === "high") label += " (RPO)";
    return label;
  }
  if (pos === "WR") {
    return { timing: "Timing Route Runner", vertical: "Vertical Threat WR", play_action: "YAC/PA Weapon", spread: "Spread Separator" }[scheme.passStyle] || "Wide Receiver";
  }
  if (pos === "OT") {
    return { shanahan_zone: "Zone Scheme OT", power_run: "Power Scheme OT", spread_rpo: "Pass-Pro OT", west_coast: "West Coast OT", pro_style: "Pro Style OT" }[scheme.offFamily] || "Offensive Tackle";
  }
  if (pos === "IOL" || pos === "C" || pos === "OG") {
    return { shanahan_zone: "Zone Scheme IOL", power_run: "Gap/Power IOL", spread_rpo: "Pass-Pro IOL", west_coast: "West Coast IOL", pro_style: "Pro Style IOL" }[scheme.offFamily] || "Interior OL";
  }
  if (pos === "DL" || pos === "IDL") {
    return { "34": "3-4 Nose/5-Tech", "43": "4-3 Interior Rusher", "425": "Penetrating 3-Tech", multiple: "Multiple-Front DL" }[scheme.defFront] || "Defensive Line";
  }
  if (pos === "TE") {
    return { move: "Move TE", hybrid: "Hybrid TE", inline: "Inline TE", standard: "Tight End" }[scheme.teRole] || "Tight End";
  }
  if (pos === "S") {
    return { hybrid_box: "Hybrid Box Safety", versatile: "Versatile Safety", deep_first: "Deep/FS", traditional_split: "Safety" }[scheme.safetyRole] || "Safety";
  }
  if (pos === "EDGE") {
    const front = scheme.defFront === "34" ? "3-4" : scheme.defFront === "425" ? "4-2-5" : "4-3";
    return { standup: `${front} Stand-Up Edge`, hands_dirt: `${front} Hand-Down DE`, hybrid: `${front} Versatile Edge` }[scheme.edgeType] || "Edge Rusher";
  }
  if (pos === "LB") {
    return { coverage_first: "Coverage LB", blitz_hybrid: "Blitz/Coverage LB", edge_convert: "Edge-Convert OLB", run_coverage: "Run & Cover LB" }[scheme.lbSchemeRole] || "Linebacker";
  }
  if (pos === "CB") {
    return { man: "Press-Man CB", zone: "Zone CB", multiple: "Multiple CB" }[scheme.coverageLean] || "Cornerback";
  }
  if (pos === "RB") {
    if (scheme.rbDual >= 0.6) return scheme.runScheme === "zone" ? "Zone/Receiving RB" : "Dual-Threat RB";
    return scheme.runScheme === "zone" ? "Zone Runner" : scheme.runScheme === "gap" ? "Power/Gap RB" : "Running Back";
  }
  return pos;
}

// Get the top 3 scheme-weighted traits with prospect values for display
export function getSchemeTraitBreakdown(prospect, teamName, userTraits) {
  const scheme = SCHEME_PROFILES[teamName];
  if (!scheme) return null;
  const pos = prospect.gpos || prospect.pos;
  if (pos === "K/P") return null;

  const weights = getSchemeWeights(pos, scheme, teamName);
  const posTraits = POSITION_TRAITS[pos];
  if (!weights || !posTraits) return null;

  const roleLabel = getSchemeRoleLabel(pos, scheme);

  // Get top 3 traits by scheme weight
  const ranked = posTraits.map(trait => ({
    trait,
    abbrev: TRAIT_ABBREV[trait] || trait,
    weight: weights[trait] || 0,
    value: tv(userTraits, prospect.id, trait, prospect.name, prospect.school),
  })).sort((a, b) => b.weight - a.weight).slice(0, 3);

  return { roleLabel, traits: ranked };
}

// Get average scheme fit score for a position across all prospects for a team
export function getPositionAvgFit(pos, teamName, allFits, prospects) {
  const teamFits = allFits[teamName];
  if (!teamFits) return null;
  let sum = 0, count = 0;
  for (const p of prospects) {
    const pPos = p.gpos || p.pos;
    if (pPos !== pos || pPos === "K/P") continue;
    const fit = teamFits[p.id];
    if (fit && fit.score > 0) { sum += fit.score; count++; }
  }
  return count > 0 ? Math.round(sum / count) : null;
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

// ── Scout Vision: position → narrative field mapping ──
const POS_NARRATIVE_MAP = {
  QB: "passConcepts", WR: "passConcepts", TE: "teUsage", RB: "rbUsage",
  OT: "runScheme", IOL: "runScheme", EDGE: "edgeSource", DL: "edgeSource",
  LB: "lbRole", CB: "coverageBase", S: "safetyUsage",
};
// Position → inflection key mapping
const POS_INFLECTION_MAP = {
  TE: "te_receiving", LB: "lb_pass_rush", EDGE: "lb_pass_rush",
  RB: "rb_dual_threat", S: "s_hybrid",
};

function getFitLevel(score) {
  if (score >= 75) return "strong";
  if (score >= 60) return "moderate";
  if (score >= 45) return "weak";
  return "mismatch";
}

export function generateScoutReasoning(prospect, teamName, fitResult, userTraits) {
  const scheme = SCHEME_PROFILES[teamName];
  const narr = SCHEME_NARRATIVES[teamName];
  if (!scheme || !narr || !fitResult) return null;
  const pos = prospect.gpos || prospect.pos;
  if (pos === "K/P") return null;

  const roleLabel = getSchemeRoleLabel(pos, scheme);
  const fitLevel = getFitLevel(fitResult.score);
  const components = fitResult.components || {};

  // ── Gather trait data ──
  const posTraits = POSITION_TRAITS[pos] || [];
  const weights = getSchemeWeights(pos, scheme, teamName) || {};
  const allTraits = posTraits.map(trait => ({
    trait,
    abbr: TRAIT_ABBREV[trait] || trait,
    val: Math.round(tv(userTraits, prospect.id, trait, prospect.name, prospect.school)),
    w: weights[trait] || 0,
  })).sort((a, b) => b.w - a.w);

  const eliteFits = [], solidFits = [], criticalGaps = [], hiddenGems = [];
  for (const t of allTraits) {
    if (t.val >= 72 && t.w >= 0.15) eliteFits.push(t);
    else if (t.val >= 60 && t.w >= 0.10) solidFits.push(t);
    if (t.val < 58 && t.w >= 0.14) criticalGaps.push(t);
    if (t.val >= 72 && t.w < 0.10) hiddenGems.push(t);
  }

  const cd = getCombineData(prospect.name, prospect.school);
  const cs = getCombineScores(prospect.name, prospect.school);
  const ceiling = getCeiling(userTraits, prospect.id, prospect.name, prospect.school);

  // ── Scheme narrative data ──
  const isOff = ["QB", "WR", "TE", "RB", "OT", "IOL"].includes(pos);
  const coord = isOff ? narr.oc : narr.dc;
  const bpNarr = narr.blueprints?.[pos];
  const schemeFitNarrative = bpNarr?.schemeFitNarrative || "";
  const idealArchetype = bpNarr?.idealArchetype || "";
  const developmentContext = bpNarr?.developmentContext || "";
  const narrativeKey = POS_NARRATIVE_MAP[pos];
  const schemeDemand = schemeFitNarrative || (narrativeKey && narr[narrativeKey] ? narr[narrativeKey] : "");

  // ── Scouting narrative data (from agent) ──
  const nKey = `${prospect.name?.toLowerCase()}|${prospect.school?.toLowerCase()}`;
  const scoutNarr = SCOUTING_NARRATIVES[nKey];

  // ── Prospect strengths line (for trait bar display) ──
  const topTraits = getTopSchemeTraits(prospect, scheme, userTraits, 3, teamName);
  const prospectStrengths = topTraits.length > 0
    ? topTraits.map(t => `${TRAIT_ABBREV[t.trait] || t.trait} ${Math.round(t.val)}`).join(" + ")
    : "balanced trait profile";

  // ── Helper: get scouting language for a trait (no source attribution) ──
  function getTraitQuote(traitName) {
    const tl = scoutNarr?.trait_language?.[traitName];
    if (!tl) return null;
    // Try all entries, pick the first one with usable language
    const entries = Object.entries(tl);
    // Prefer tier 1, then any
    const sorted = [...entries].sort(([a], [b]) => {
      const t1 = /^(zierlein|jeremiah|brugler)$/i;
      return (t1.test(b) ? 1 : 0) - (t1.test(a) ? 1 : 0);
    });
    for (const [, val] of sorted) {
      let lang = val?.language;
      if (!lang || lang.length < 20) continue;
      // Skip AI artifact / error text
      if (/no specific|no explicit|not ranked|language recovered|fragments|not found|no \w+-specific/i.test(lang)) continue;
      // Strip analyst name mentions
      lang = lang.replace(/\b(Zierlein|Jeremiah|Brugler|Kiper|McShay|Schrager|Miller|Rang|Emory|Cosell|NFL\.com|CBS Sports|ESPN|PFF)(?:'s?)?\b/gi, "").replace(/\s{2,}/g, " ").replace(/^\s*['']\s*/, "").trim();
      if (lang.length < 20) continue;
      // Use first complete sentence
      const dot = lang.indexOf(". ");
      if (dot > 0 && dot < 160) return lang.substring(0, dot + 1);
      const nextDot = lang.indexOf(".", 120);
      if (nextDot > 0 && nextDot < 200) return lang.substring(0, nextDot + 1);
      const cut = lang.substring(0, 140);
      const lastBreak = Math.max(cut.lastIndexOf(", "), cut.lastIndexOf("; "), cut.lastIndexOf(" — "), cut.lastIndexOf(" – "));
      return lastBreak > 60 ? cut.substring(0, lastBreak) + "." : cut.replace(/[,;\s]+$/, "") + ".";
    }
    return null;
  }

  // ── Helper: strip analyst/source names from text ──
  function stripSources(text) {
    if (!text) return text;
    return text.replace(/\b(Zierlein|Jeremiah|Brugler|Kiper|McShay|Schrager|Miller|Rang|Emory|Cosell|NFL\.com|CBS Sports|ESPN|PFF)(?:'s?)?\b/gi, "").replace(/\s{2,}/g, " ").trim();
  }

  // ── Helper: find strength/weakness text that matches a trait ──
  function findRelevantStrength(traitName) {
    if (!scoutNarr?.strengths) return null;
    const keywords = traitName.toLowerCase().split(" ");
    const match = scoutNarr.strengths.find(s => {
      const sl = s.toLowerCase();
      return keywords.some(k => k.length > 3 && sl.includes(k));
    });
    return match ? stripSources(match) : null;
  }
  function findRelevantWeakness(traitName) {
    if (!scoutNarr?.weaknesses) return null;
    const keywords = traitName.toLowerCase().split(" ");
    const match = scoutNarr.weaknesses.find(w => {
      const wl = w.toLowerCase();
      return keywords.some(k => k.length > 3 && wl.includes(k));
    });
    return match ? stripSources(match) : null;
  }

  // ── Helper: trim text to a max length at a sentence boundary ──
  function trimSentence(text, max) {
    if (!text || text.length <= max) return text;
    // Try last sentence boundary before max
    const dot = text.lastIndexOf(". ", max);
    if (dot > max * 0.4) return text.substring(0, dot + 1);
    // Try next sentence boundary just past max
    const nextDot = text.indexOf(".", max);
    if (nextDot > 0 && nextDot < max + 60) return text.substring(0, nextDot + 1);
    // End at last clause boundary with a period
    const cut = text.substring(0, max);
    const lastBreak = Math.max(cut.lastIndexOf(", "), cut.lastIndexOf("; "), cut.lastIndexOf(" — "), cut.lastIndexOf(" – "));
    return lastBreak > max * 0.4 ? cut.substring(0, lastBreak) + "." : cut.replace(/[,;\s]+$/, "") + ".";
  }

  // ── Helper: clean idealArchetype text for use after "want" ──
  function cleanArchetype(text) {
    if (!text) return text;
    // "[Player] IS the archetype — [desc]" → "[desc]"
    const archMatch = text.match(/\bIS the archetype\s*[—–-]\s*/i);
    if (archMatch) return text.substring(archMatch.index + archMatch[0].length);
    // Find "The [role] is [rest]" or "The ideal [role] is [rest]"
    const isMatch = text.match(/^(The\s+(?:ideal\s+)?(?:.*?))\s+is\s+/i);
    if (isMatch) {
      const after = text.substring(isMatch[0].length);
      // If what follows "is" starts with a/an → it's a description, use directly
      if (/^(a|an)\s/i.test(after)) return after;
      // Otherwise it's a player name → "a [role] like [rest]"
      let role = isMatch[1].replace(/^The\s+(ideal\s+)?/i, "").replace(/\s+in\s+.*$/i, "").trim();
      return `a ${role} like ${after}`;
    }
    return text;
  }

  // ── Build the analysis ──
  const sentences = [];
  const coordName = coord?.name?.split(" ").pop() || teamName;
  // Get prospect last name, stripping suffixes like Jr., Sr., II, III, IV
  const nameParts = (prospect.name || "").split(" ");
  const suffixes = new Set(["jr.", "jr", "sr.", "sr", "ii", "iii", "iv", "v"]);
  let lastName = nameParts[nameParts.length - 1];
  if (suffixes.has(lastName.toLowerCase()) && nameParts.length > 2) lastName = nameParts[nameParts.length - 2];

  // PART 1: Who this prospect IS — grounded in scouting language, not numbers
  let blurbText = "";
  if (scoutNarr?.scouting_blurb) {
    // Extract the key identity statement (first sentence of blurb)
    const blurb = stripSources(scoutNarr.scouting_blurb);
    const firstSentence = trimSentence(blurb, 180);
    blurbText = firstSentence.toLowerCase();
    sentences.push(firstSentence);
  } else if (eliteFits.length >= 2) {
    sentences.push(`Profiles as a ${roleLabel.toLowerCase()} with elite ${eliteFits[0].trait.toLowerCase()} and ${eliteFits[1].trait.toLowerCase()}.`);
  } else if (eliteFits.length === 1) {
    sentences.push(`Standout ${eliteFits[0].trait.toLowerCase()} prospect who projects as a ${roleLabel.toLowerCase()}.`);
  } else {
    sentences.push(`Profiles as a developmental ${roleLabel.toLowerCase()} prospect.`);
  }

  // PART 2: WHY this prospect fits THIS scheme — the bridge
  // Check which traits are already mentioned in the blurb to avoid repetition
  function traitMentionedInBlurb(trait) {
    if (!blurbText) return false;
    const words = trait.toLowerCase().split(" ");
    return words.filter(w => w.length > 3).some(w => blurbText.includes(w));
  }

  if (eliteFits.length > 0 && schemeFitNarrative) {
    // Pick the best fit trait for Part 2 — prefer one NOT already in the blurb
    let topFit = eliteFits[0];
    let altFitUsed = false;
    if (blurbText && traitMentionedInBlurb(topFit.trait) && eliteFits.length >= 2 && !traitMentionedInBlurb(eliteFits[1].trait)) {
      topFit = eliteFits[1];
      altFitUsed = true;
    }

    const quote = getTraitQuote(topFit.trait);
    const strength = findRelevantStrength(topFit.trait);
    // Find the clause in the scheme narrative that connects to their strength
    const demandClauses = schemeFitNarrative.split(/[.;]/).map(c => c.trim()).filter(c => c.length > 15);
    const traitWords = topFit.trait.toLowerCase().split(" ");
    const matchClause = demandClauses.find(c => {
      const cl = c.toLowerCase();
      return traitWords.some(w => w.length > 3 && cl.includes(w));
    });

    if (matchClause && strength) {
      const trimmedStrength = trimSentence(strength, 120);
      if (traitMentionedInBlurb(topFit.trait)) {
        // Trait already in blurb — lead with scheme demand, skip restating the prospect trait
        sentences.push(`${coordName}'s system demands exactly that: ${matchClause.charAt(0).toLowerCase() + matchClause.slice(1).trim()}.`);
      } else {
        sentences.push(`${coordName}'s system demands ${matchClause.charAt(0).toLowerCase() + matchClause.slice(1).trim()}. ${lastName} delivers: ${trimmedStrength.charAt(0).toLowerCase() + trimmedStrength.slice(1)}`);
      }
    } else if (matchClause && quote) {
      if (traitMentionedInBlurb(topFit.trait)) {
        sentences.push(`${coordName}'s system demands exactly that: ${matchClause.charAt(0).toLowerCase() + matchClause.slice(1).trim()}.`);
      } else {
        sentences.push(`${coordName}'s system demands ${matchClause.charAt(0).toLowerCase() + matchClause.slice(1).trim()}, and ${lastName} shows exactly that — ${quote.charAt(0).toLowerCase() + quote.slice(1)}`);
      }
    } else if (matchClause) {
      if (traitMentionedInBlurb(topFit.trait)) {
        sentences.push(`${coordName}'s scheme needs ${matchClause.charAt(0).toLowerCase() + matchClause.slice(1).trim()} — and that's the profile.`);
      } else {
        sentences.push(`${coordName}'s scheme needs ${matchClause.charAt(0).toLowerCase() + matchClause.slice(1).trim()} — ${lastName}'s ${topFit.trait.toLowerCase()} (${topFit.val}) is built for it.`);
      }
    } else if (idealArchetype) {
      const arcSnip = trimSentence(cleanArchetype(idealArchetype), 120);
      sentences.push(`The ${teamName} want ${arcSnip.charAt(0).toLowerCase() + arcSnip.slice(1)} — ${eliteFits.map(t => t.trait.toLowerCase()).join(" and ")} are the priorities, and ${lastName} delivers.`);
    }

    // Add a second elite fit with scout language if available (skip if already used as topFit)
    if (eliteFits.length >= 2) {
      const second = altFitUsed ? eliteFits[0] : eliteFits[1];
      // Only add if this trait isn't already covered in blurb
      if (!traitMentionedInBlurb(second.trait)) {
        const q2 = getTraitQuote(second.trait);
        if (q2) {
          sentences.push(`${lastName}'s ${second.trait.toLowerCase()} also fits — ${q2.charAt(0).toLowerCase() + q2.slice(1)}`);
        }
      }
    }
  } else if (solidFits.length >= 2 && schemeFitNarrative) {
    // Moderate fit — still connect to scheme
    const firstClause = schemeFitNarrative.split(/[.;]/)[0].trim();
    if (firstClause.length > 15) {
      const cleanClause = firstClause.replace(/^the\s+ideal\s+\w+\s+is\s+/i, "");
      sentences.push(`The ${teamName} want ${cleanClause.charAt(0).toLowerCase() + cleanClause.slice(1)}. ${lastName} checks enough boxes — solid ${solidFits[0].trait.toLowerCase()} (${solidFits[0].val}) and ${solidFits[1].trait.toLowerCase()} (${solidFits[1].val}) — but isn't a natural archetype match.`);
    }
  } else if (fitLevel === "weak" || fitLevel === "mismatch") {
    // Mismatch — explain what the scheme wants vs what the prospect is
    if (idealArchetype) {
      const arcSnip = trimSentence(cleanArchetype(idealArchetype), 120);
      sentences.push(`The ${teamName} want ${arcSnip.charAt(0).toLowerCase() + arcSnip.slice(1)} — that's not ${lastName}'s game.`);
    }
    if (criticalGaps.length > 0) {
      const gap = criticalGaps[0];
      const weakness = findRelevantWeakness(gap.trait);
      if (weakness) {
        sentences.push(`The critical gap: ${trimSentence(weakness, 140)}`);
      } else {
        sentences.push(`${gap.trait} (${gap.val}) is a critical gap — this scheme weights it as a top priority.`);
      }
    }
  }

  // PART 3: Combine/measurables (brief, only when meaningful)
  if (cd) {
    const measParts = [];
    if (cd.forty && cd.forty > 0) measParts.push(`${cd.forty}s forty`);
    if (cd.broad) measParts.push(`${cd.broad}" broad`);
    if (cd.bench) measParts.push(`${cd.bench} bench`);
    if (cs?.athleticScore != null && cs.athleticScore >= 80 && components.athletic >= 65) {
      sentences.push(`Combine validates the fit: ${cs.athleticScore.toFixed(1)} athletic composite (${measParts.slice(0,2).join(", ")}).`);
    } else if (cs?.athleticScore != null && cs.athleticScore < 40 && components.athletic < 40) {
      sentences.push(`Measurables are a concern: ${cs.athleticScore.toFixed(1)} athletic composite — below ${teamName}'s typical targets.`);
    }
  }

  // PART 4: Critical gaps with scout language (only if not already covered in mismatch section)
  if (criticalGaps.length > 0 && fitLevel !== "weak" && fitLevel !== "mismatch") {
    const gap = criticalGaps[0];
    const weakness = findRelevantWeakness(gap.trait);
    const gapQuote = getTraitQuote(gap.trait);
    if (weakness) {
      sentences.push(`The concern: ${trimSentence(weakness, 140)}`);
    } else if (gapQuote) {
      sentences.push(`The concern at ${gap.trait.toLowerCase()}: ${gapQuote.charAt(0).toLowerCase() + gapQuote.slice(1)}`);
    } else {
      sentences.push(`${gap.trait} (${gap.val}) is below the bar for this scheme's ${roleLabel.toLowerCase()} role.`);
    }
  }

  // PART 5: Pro comparison as scheme context (when it adds insight)
  if (scoutNarr?.pro_comparison_reasoning && (fitLevel === "strong" || fitLevel === "moderate")) {
    const compReasoning = stripSources(scoutNarr.pro_comparison_reasoning);
    // Only include if it has scheme-relevant language
    const schemeWords = ["scheme", "system", "zone", "gap", "timing", "play-action", "coverage", "press", "man", "thriv"];
    if (schemeWords.some(w => compReasoning.toLowerCase().includes(w))) {
      sentences.push(`Pro comp context: ${trimSentence(compReasoning, 150)}`);
    }
  }

  // PART 6: Boom/bust context (development context shown separately via relevantInflection)
  if (scoutNarr?.boom_bust_variance?.level === "high" && fitLevel !== "mismatch") {
    const bbExpl = stripSources(scoutNarr.boom_bust_variance.explanation);
    if (bbExpl) sentences.push(`High variance prospect: ${trimSentence(bbExpl, 120)}`);
  }

  const whyItFits = sentences.join(" ");

  // ── Headline — grounded in scouting identity + scheme connection ──
  const archetypeTag = fitResult.tags?.[0] || "";
  const proComp = scoutNarr?.pro_comparison || "";
  let headline;
  if (fitLevel === "strong") {
    if (proComp && archetypeTag) {
      headline = `${proComp} archetype — ${archetypeTag}`;
    } else if (archetypeTag) {
      headline = `Strong fit — ${archetypeTag}`;
    } else {
      headline = `Strong scheme fit as ${roleLabel}`;
    }
  } else if (fitLevel === "moderate") {
    if (components.trait >= 70 && components.archetype < 55) {
      headline = proComp ? `${proComp}-type traits, unconventional archetype` : `Trait fit is strong, archetype is unconventional`;
    } else if (components.archetype >= 70 && components.trait < 55) {
      headline = `Right archetype, needs trait development`;
    } else {
      headline = archetypeTag ? `Solid fit — ${archetypeTag}` : `Moderate fit as ${roleLabel}`;
    }
  } else if (fitLevel === "weak") {
    if (criticalGaps.length >= 2) headline = `Multiple scheme-critical gaps at ${roleLabel}`;
    else if (hiddenGems.length > 0) headline = `Marginal fit but has translatable traits`;
    else headline = `Marginal scheme fit — different archetype preferred`;
  } else {
    headline = `Scheme mismatch at ${roleLabel}`;
  }

  // ── Relevant inflection / scheme context ──
  let relevantInflection = null;
  if (developmentContext && developmentContext.length > 40) {
    relevantInflection = developmentContext;
  } else {
    const inflKey = POS_INFLECTION_MAP[pos];
    if (inflKey) {
      const infl = narr.inflections[inflKey];
      if (infl && infl.explanation && /high|very high/i.test(infl.rating)) {
        relevantInflection = infl.explanation;
      }
    }
  }
  if (!relevantInflection && schemeDemand && schemeDemand.length > 40) {
    relevantInflection = schemeDemand;
  }

  return {
    headline,
    roleLabel,
    prospectStrengths,
    schemeDemand,
    whyItFits,
    fitLevel,
    relevantInflection,
  };
}

export function computeTeamScoutVision(teamName, prospects, allFits, userTraits) {
  const teamFits = allFits[teamName];
  if (!teamFits) return new Map();
  const result = new Map();
  for (const p of prospects) {
    const fit = teamFits[p.id];
    if (!fit || fit.score < 35) continue;
    const reasoning = generateScoutReasoning(p, teamName, fit, userTraits);
    if (reasoning) result.set(p.id, reasoning);
  }
  return result;
}
