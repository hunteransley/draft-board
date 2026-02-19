#!/usr/bin/env node
/**
 * updateRosters.js — Pull ESPN depth charts for all 32 NFL teams
 * Run: node updateRosters.js
 * Output: overwrites nflRosters.js in the same directory
 */

import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEAMS = [
  {id:22,abbr:"ARI"},{id:1,abbr:"ATL"},{id:33,abbr:"BAL"},{id:2,abbr:"BUF"},
  {id:29,abbr:"CAR"},{id:3,abbr:"CHI"},{id:4,abbr:"CIN"},{id:5,abbr:"CLE"},
  {id:6,abbr:"DAL"},{id:7,abbr:"DEN"},{id:8,abbr:"DET"},{id:9,abbr:"GB"},
  {id:34,abbr:"HOU"},{id:11,abbr:"IND"},{id:30,abbr:"JAX"},{id:12,abbr:"KC"},
  {id:13,abbr:"LV"},{id:24,abbr:"LAC"},{id:14,abbr:"LAR"},{id:15,abbr:"MIA"},
  {id:16,abbr:"MIN"},{id:17,abbr:"NE"},{id:18,abbr:"NO"},{id:19,abbr:"NYG"},
  {id:20,abbr:"NYJ"},{id:21,abbr:"PHI"},{id:23,abbr:"PIT"},{id:25,abbr:"SF"},
  {id:26,abbr:"SEA"},{id:27,abbr:"TB"},{id:10,abbr:"TEN"},{id:28,abbr:"WAS"}
];

// Max slots per position prefix in our depth chart UI
const MAX_SLOTS = {
  QB:2, RB:2, WR:4, TE:2,
  LT:1, LG:1, C:1, RG:1, RT:1,
  DE:2, DT:2, LB:3, CB:2, SS:1, FS:1,
  K:1
};

// ESPN depthchart key → our slot prefix
// Format: data.depthchart[].positions.{key}.athletes[]
const KEY_TO_SLOT = {
  // Offense (group: "3WR 1TE" or similar)
  qb: "QB", rb: "RB", te: "TE",
  wr1: "WR", wr2: "WR", wr3: "WR",
  lt: "LT", lg: "LG", c: "C", rg: "RG", rt: "RT",
  // Defense (group: "Base 3-4 D" or "Base 4-3 D" etc)
  lde: "DE", rde: "DE",
  nt: "DT", ldt: "DT", rdt: "DT", dt: "DT",
  wlb: "LB", slb: "LB", lilb: "LB", rilb: "LB", mlb: "LB",
  sam: "LB", will: "LB", mike: "LB",
  lcb: "CB", rcb: "CB",
  ss: "SS", fs: "FS",
  // Special teams
  pk: "K",
};

function parseDepthChart(data) {
  const chart = {};
  const counters = {};

  const groups = data?.depthchart || [];
  for (const group of groups) {
    const positions = group?.positions || {};
    for (const [key, posData] of Object.entries(positions)) {
      const slot = KEY_TO_SLOT[key];
      if (!slot) continue;

      const max = MAX_SLOTS[slot];
      if (!max) continue;

      const athletes = posData?.athletes || [];
      // Take starter (first athlete) — or first + second for positions with 2+ depth
      const toTake = key.startsWith("wr") ? 1 : Math.min(athletes.length, max - (counters[slot] || 0));
      
      for (let i = 0; i < toTake; i++) {
        const name = athletes[i]?.displayName;
        if (!name) continue;

        const count = (counters[slot] || 0) + 1;
        if (count > max) break;

        counters[slot] = count;
        chart[`${slot}${count}`] = name;
      }
    }
  }

  return chart;
}

async function main() {
  const rosters = {};

  for (const team of TEAMS) {
    process.stdout.write(`Fetching ${team.abbr}...`);

    try {
      const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${team.id}/depthcharts`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const chart = parseDepthChart(data);
      rosters[team.abbr] = chart;
      const count = Object.keys(chart).length;
      console.log(count >= 15 ? ` ✅ ${count} slots` : ` ⚠ ${count} slots`);
    } catch (e) {
      console.log(` ❌ ${e.message}`);
      rosters[team.abbr] = {};
    }

    await new Promise(r => setTimeout(r, 200));
  }

  // Write output
  const now = new Date().toISOString().split("T")[0];
  let output = `// NFL Rosters — auto-generated from ESPN depth charts on ${now}\n`;
  output += `// Run: node updateRosters.js to refresh\n\n`;
  output += `const NFL_ROSTERS = ${JSON.stringify(rosters, null, 2)};\n\n`;
  output += `export default NFL_ROSTERS;\n`;

  const outPath = join(__dirname, "nflRosters.js");
  writeFileSync(outPath, output);
  console.log(`\n✅ Wrote ${outPath}`);
  console.log(`   ${Object.keys(rosters).length} teams`);
  console.log(`   ${Object.values(rosters).reduce((s, r) => s + Object.keys(r).length, 0)} total slots`);

  console.log(`\nSample — NO (Saints):`);
  console.log(JSON.stringify(rosters["NO"], null, 2));
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
