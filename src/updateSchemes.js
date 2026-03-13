#!/usr/bin/env node
/**
 * updateSchemes.js — Derive TEAM_SCHEME from scheme agent JSONs
 * Run: node src/updateSchemes.js
 * Overwrites the TEAM_SCHEME object in src/depthChartUtils.js
 */

import { readFileSync, writeFileSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SCHEME_DIR = join(__dirname, "..", "agents", "output", "scheme");

// Abbreviation → team name (must match TEAM_SCHEME keys in depthChartUtils.js)
const ABBR_TO_NAME = {
  ARI:"Cardinals",ATL:"Falcons",BAL:"Ravens",BUF:"Bills",CAR:"Panthers",
  CHI:"Bears",CIN:"Bengals",CLE:"Browns",DAL:"Cowboys",DEN:"Broncos",
  DET:"Lions",GB:"Packers",HOU:"Texans",IND:"Colts",JAX:"Jaguars",
  KC:"Chiefs",LAC:"Chargers",LAR:"Rams",LV:"Raiders",MIA:"Dolphins",
  MIN:"Vikings",NE:"Patriots",NO:"Saints",NYG:"Giants",NYJ:"Jets",
  PHI:"Eagles",PIT:"Steelers",SEA:"Seahawks",SF:"49ers",TB:"Buccaneers",
  TEN:"Titans",WSH:"Commanders",WAS:"Commanders"
};

function classifyDef(defense) {
  const front = (defense.front_structure || "").toLowerCase();
  const sub = (defense.sub_packages || "").toLowerCase();
  const family = (defense.scheme_family || "").toLowerCase();
  const combined = sub + " " + front;

  // Use first 150 chars of front for lead-descriptor checks (avoids
  // matching secondary mentions like "can flex to 3-4 situationally")
  const lead = front.slice(0, 150);

  // 1. Wide-9: family identifies wide-9 AND front doesn't call it just "technique"
  const w9Family = /wide.?9/.test(family);
  const w9Technique = /wide.?9\s+technique/.test(front);
  const w9InFront = /wide.?9/.test(front.slice(0, 300));
  if (w9Family && !w9Technique && w9InFront) return "w9";

  // 2. Nickel-as-base (425): sub or front says nickel/4-2-5 IS the base
  const nickelBase =
    /nickel[\s(].*?(?:is|as)\s+(?:the\s+)?(?:de\s+facto\s+)?(?:true\s+)?(?:functional\s+)?base/.test(combined)
    || /4-2-5[\s)].*?(?:is|as)\s+(?:the\s+)?(?:true\s+)?base/.test(combined)
    || /(?:true|primary)\s+base\s+(?:package|personnel|grouping|defense)/.test(combined);
  const not34Lead = !/^3-4|^odd/.test(lead.trim());
  if (nickelBase && not34Lead) return "425";

  // 3. 3-4: lead says 3-4 — but if "4-3" appears before "3-4", it's a 4-3 team
  //    mentioning 3-4 elements (e.g. "4-3 base with 3-4 spacing")
  const idx34 = lead.indexOf("3-4");
  const idx43 = lead.indexOf("4-3");
  if (idx34 >= 0 && !(idx43 >= 0 && idx43 < idx34)) return "34";

  // 4. Fallback to 4-3
  return "43";
}

function classifyOff(offense) {
  const personnel = (offense.personnel_tendencies || "").toLowerCase();

  // Look for primary personnel grouping
  // If 12/13/21/22 is emphasized as base or most-used, use "12"
  if (/\b(12|13|21|22)\s+personnel[^.]*?(base|primary|most|heav|significant|lead)/i.test(personnel)) return "12";
  if (/(base|primary|most|heav|lead)[^.]*?\b(12|13|21|22)\s+personnel/i.test(personnel)) return "12";
  // Specific patterns: "lowest 11 personnel" or "anti-11"
  if (/lowest\s+11\s+personnel|anti.11/i.test(personnel)) return "12";

  return "11";
}

function main() {
  const files = readdirSync(SCHEME_DIR).filter(f => f.endsWith(".json"));
  const schemes = {};

  for (const file of files) {
    const abbr = file.replace(".json", "");
    const data = JSON.parse(readFileSync(join(SCHEME_DIR, file), "utf8"));
    const teamName = ABBR_TO_NAME[abbr];
    if (!teamName) { console.warn(`⚠ Unknown abbreviation: ${abbr}`); continue; }

    const def = classifyDef(data.defense || {});
    const off = classifyOff(data.offense || {});
    schemes[teamName] = { def, off };
    console.log(`${abbr.padEnd(3)} ${teamName.padEnd(12)} → def: ${def.padEnd(3)}  off: ${off}`);
  }

  // Build the TEAM_SCHEME JS block
  const entries = Object.entries(schemes)
    .map(([name, s]) => {
      const key = name.includes("'") || name.match(/^\d/) ? `"${name}"` : name;
      return `  ${key}:{def:"${s.def}",off:"${s.off}"}`;
    })
    .join(",\n");

  const schemeBlock = `export const TEAM_SCHEME={\n${entries},\n};`;

  // Read depthChartUtils.js and replace TEAM_SCHEME
  const utilsPath = join(__dirname, "depthChartUtils.js");
  let code = readFileSync(utilsPath, "utf8");

  const startMarker = "export const TEAM_SCHEME={";
  const startIdx = code.indexOf(startMarker);
  if (startIdx === -1) { console.error("❌ Could not find TEAM_SCHEME in depthChartUtils.js"); process.exit(1); }

  // Find the closing }; for TEAM_SCHEME
  let braceDepth = 0;
  let endIdx = -1;
  for (let i = startIdx + startMarker.length - 1; i < code.length; i++) {
    if (code[i] === "{") braceDepth++;
    if (code[i] === "}") {
      braceDepth--;
      if (braceDepth === 0) {
        endIdx = i + 1;
        // Include trailing semicolon
        if (code[endIdx] === ";") endIdx++;
        break;
      }
    }
  }

  if (endIdx === -1) { console.error("❌ Could not find end of TEAM_SCHEME"); process.exit(1); }

  code = code.slice(0, startIdx) + schemeBlock + code.slice(endIdx);
  writeFileSync(utilsPath, code);

  console.log(`\n✅ Updated TEAM_SCHEME in depthChartUtils.js (${Object.keys(schemes).length} teams)`);
}

main();
