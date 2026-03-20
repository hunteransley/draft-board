#!/usr/bin/env node
/**
 * updateRosters.js — Pull ESPN depth charts for all 32 NFL teams
 * Run: node src/updateRosters.js
 * Output: overwrites src/nflRosters.js
 *
 * Uses TEAM_SCHEME from depthChartUtils.js to drive scheme-aware
 * defensive slot mapping (3-4, 4-3, 4-2-5/w9).
 */

import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { TEAM_SCHEME, TEAM_ABBR } from "./depthChartUtils.js";
import { TEAMS as TEAM_CONFIG } from "./teamConfig.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Reverse lookup: abbreviation → team name (for TEAM_SCHEME lookup)
const ABBR_TO_NAME = Object.fromEntries(
  Object.entries(TEAM_ABBR).map(([name, abbr]) => [abbr, name])
);

// Derive ESPN team list from teamConfig (single source of truth)
const TEAMS = Object.entries(TEAM_CONFIG).map(([abbr, t]) => ({id: t.espnId, abbr}));

/* ── Scheme-aware defensive slot priority tables ──
   For each BBL slot, try ESPN position keys in order;
   take first athlete from first hit. */

const DEF_34 = [
  ["DE1", ["lde"]],
  ["DT1", ["nt", "ldt"]],
  ["DE2", ["rde"]],
  ["LB1", ["wlb"]],
  ["LB2", ["lilb", "mlb"]],
  ["LB3", ["rilb"]],
  ["LB4", ["slb"]],
];

const DEF_43 = [
  ["DE1", ["lde"]],
  ["DT1", ["ldt", "nt"]],
  ["DT2", ["rdt"]],
  ["DE2", ["rde"]],
  ["LB1", ["wlb"]],
  ["LB2", ["mlb", "lilb"]],
  ["LB3", ["slb", "rilb"]],
];

const DEF_425 = [
  ["DE1", ["lde"]],
  ["DT1", ["ldt", "nt"]],
  ["DT2", ["rdt"]],
  ["DE2", ["rde"]],
  ["LB1", ["lilb", "wlb", "mlb"]],
  ["LB2", ["rilb", "slb"]],
];

const DEF_TABLES = { "34": DEF_34, "43": DEF_43, "425": DEF_425, "w9": DEF_425 };

/* ── Flatten ESPN response into { posKey: athletes[] } ── */

function flattenPositions(data) {
  const positions = {};
  for (const group of data?.depthchart || []) {
    for (const [key, posData] of Object.entries(group?.positions || {})) {
      if (!positions[key]) positions[key] = posData?.athletes || [];
    }
  }
  return positions;
}

/* ── Build roster for one team ── */

function buildRoster(positions, defScheme) {
  const chart = {};
  const name = (key, idx = 0) => positions[key]?.[idx]?.displayName || null;
  const set = (slot, val) => { if (val) chart[slot] = val; };
  const tryFirst = (keys) => {
    for (const k of keys) { const n = name(k); if (n) return n; }
    return null;
  };

  // ── Offense (identical for all teams) ──
  set("QB1", name("qb", 0));
  set("QB2", name("qb", 1));
  set("RB1", name("rb", 0));
  set("RB2", name("rb", 1));
  set("WR1", name("wr1"));
  set("WR2", name("wr2"));
  set("WR3", name("wr3"));
  set("TE1", name("te", 0));
  set("TE2", name("te", 1));
  set("LT", name("lt"));
  set("LG", name("lg"));
  set("C",  name("c"));
  set("RG", name("rg"));
  set("RT", name("rt"));

  // ── Defense (scheme-aware) ──
  const defTable = DEF_TABLES[defScheme] || DEF_43;
  for (const [slot, keys] of defTable) {
    set(slot, tryFirst(keys));
  }


  // 4-DL fixup: ESPN sometimes lists both interior DL under single "nt" key
  // instead of splitting ldt/rdt. Pull nt[1] for DT2 when rdt is missing.
  if (!chart.DT2 && (defScheme === "43" || defScheme === "425" || defScheme === "w9")) {
    set("DT2", name("nt", 1) || name("ldt", 1) || name("rde", 1) || name("lde", 1));
  }

  // ── Secondary + Specialists (all schemes) ──
  set("CB1", name("lcb"));
  set("CB2", name("rcb"));
  set("NB",  name("nb"));
  set("SS",  name("ss"));
  set("FS",  name("fs"));
  set("K",   name("pk"));

  return chart;
}

/* ── Validation ── */

const CRITICAL = ["QB1", "DE1", "CB1", "SS", "FS"];

function validate(abbr, chart) {
  const count = Object.keys(chart).length;
  if (count < 20) {
    console.warn(`  ⚠ ${abbr}: only ${count} slots filled (expected ≥20)`);
  }
  for (const slot of CRITICAL) {
    if (!chart[slot]) console.warn(`  ⚠ ${abbr}: missing critical slot ${slot}`);
  }
}

/* ── Main ── */

async function main() {
  const rosters = {};

  for (const team of TEAMS) {
    const teamName = ABBR_TO_NAME[team.abbr];
    const defScheme = TEAM_SCHEME[teamName]?.def || "43";
    process.stdout.write(`${team.abbr} (${defScheme})...`);

    try {
      const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${team.id}/depthcharts`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const positions = flattenPositions(data);
      const chart = buildRoster(positions, defScheme);
      rosters[team.abbr] = chart;

      const count = Object.keys(chart).length;
      console.log(` ✅ ${count} slots`);
      validate(team.abbr, chart);
    } catch (e) {
      console.log(` ❌ ${e.message}`);
      rosters[team.abbr] = {};
    }

    await new Promise(r => setTimeout(r, 200));
  }

  // Write output
  const now = new Date().toISOString().split("T")[0];
  let output = `// NFL Rosters — auto-generated from ESPN depth charts on ${now}\n`;
  output += `// Run: node src/updateRosters.js to refresh\n\n`;
  output += `const NFL_ROSTERS = ${JSON.stringify(rosters, null, 2)};\n\n`;
  output += `export default NFL_ROSTERS;\n`;

  const outPath = join(__dirname, "nflRosters.js");
  writeFileSync(outPath, output);
  console.log(`\n✅ Wrote ${outPath}`);
  console.log(`   ${Object.keys(rosters).length} teams`);
  console.log(`   ${Object.values(rosters).reduce((s, r) => s + Object.keys(r).length, 0)} total slots`);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
