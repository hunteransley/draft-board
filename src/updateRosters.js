#!/usr/bin/env node
/**
 * updateRosters.js — Pull ESPN depth charts for all 32 NFL teams
 * Run: node updateRosters.js
 * Output: overwrites nflRosters.js in the same directory
 * 
 * Slot names match MockDraftSim DEPTH_GROUPS:
 *   QB1,QB2 | RB1,RB2 | WR1-WR4 | TE1,TE2
 *   LT,LG,C,RG,RT | DE1,DT1,DT2,DE2 | LB1,LB2,LB3
 *   CB1,CB2,SS,FS | K
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

// ESPN depthchart position key → what slot(s) to fill
// Each entry: { slot, numbered } where numbered=true means append counter (DE1,DE2)
// and numbered=false means use slot name as-is (LT, SS, K)
const MAPPINGS = {
  // Offense
  qb:  { slot:"QB",  numbered:true,  max:2 },
  rb:  { slot:"RB",  numbered:true,  max:2 },
  wr1: { slot:"WR",  numbered:true,  max:1 },
  wr2: { slot:"WR",  numbered:true,  max:1 },
  wr3: { slot:"WR",  numbered:true,  max:1 },
  te:  { slot:"TE",  numbered:true,  max:2 },
  lt:  { slot:"LT",  numbered:false, max:1 },
  lg:  { slot:"LG",  numbered:false, max:1 },
  c:   { slot:"C",   numbered:false, max:1 },
  rg:  { slot:"RG",  numbered:false, max:1 },
  rt:  { slot:"RT",  numbered:false, max:1 },
  // Defense — DE maps to DE1/DE2, DT maps to DT1/DT2
  lde: { slot:"DE",  numbered:true,  max:1 },
  rde: { slot:"DE",  numbered:true,  max:1 },
  nt:  { slot:"DT",  numbered:true,  max:1 },
  ldt: { slot:"DT",  numbered:true,  max:1 },
  rdt: { slot:"DT",  numbered:true,  max:1 },
  dt:  { slot:"DT",  numbered:true,  max:1 },
  // LB numbered: LB1,LB2,LB3
  wlb: { slot:"LB",  numbered:true,  max:1 },
  slb: { slot:"LB",  numbered:true,  max:1 },
  lilb:{ slot:"LB",  numbered:true,  max:1 },
  rilb:{ slot:"LB",  numbered:true,  max:1 },
  mlb: { slot:"LB",  numbered:true,  max:1 },
  sam: { slot:"LB",  numbered:true,  max:1 },
  will:{ slot:"LB",  numbered:true,  max:1 },
  mike:{ slot:"LB",  numbered:true,  max:1 },
  // CB numbered: CB1,CB2
  lcb: { slot:"CB",  numbered:true,  max:1 },
  rcb: { slot:"CB",  numbered:true,  max:1 },
  // Safeties: bare slot names SS, FS (no number)
  ss:  { slot:"SS",  numbered:false, max:1 },
  fs:  { slot:"FS",  numbered:false, max:1 },
  // Kicker: bare K
  pk:  { slot:"K",   numbered:false, max:1 },
};

// Max per numbered slot prefix
const SLOT_MAX = { QB:2, RB:2, WR:4, TE:2, DE:2, DT:2, LB:3, CB:2 };

function parseDepthChart(data) {
  const chart = {};
  const counters = {};

  const groups = data?.depthchart || [];
  for (const group of groups) {
    const positions = group?.positions || {};
    for (const [key, posData] of Object.entries(positions)) {
      const m = MAPPINGS[key];
      if (!m) continue;

      const athletes = posData?.athletes || [];
      const toTake = Math.min(athletes.length, m.max);

      for (let i = 0; i < toTake; i++) {
        const name = athletes[i]?.displayName;
        if (!name) continue;

        if (m.numbered) {
          const count = (counters[m.slot] || 0) + 1;
          const max = SLOT_MAX[m.slot] || 2;
          if (count > max) break;
          counters[m.slot] = count;
          chart[`${m.slot}${count}`] = name;
        } else {
          // Single slot — use bare name (LT, SS, K, etc.)
          if (chart[m.slot]) continue; // already filled
          chart[m.slot] = name;
        }
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
