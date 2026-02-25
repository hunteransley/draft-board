#!/usr/bin/env node
// Generates public/prospect-traits-export.csv with all prospects + position-specific trait columns
// Pre-fills trait values from stat-based derivation where available

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ── Load prospectStats raw data ──────────────────────────────
const statsSource = readFileSync(join(ROOT, "src/prospectStats.js"), "utf8");
const jsonMatch = statsSource.match(/const S=(\{.*?\});/s);
if (!jsonMatch) throw new Error("Could not parse S from prospectStats.js");
const S = JSON.parse(jsonMatch[1]);

// ── POSITION_TRAITS (mirrored from App.jsx) ──────────────────
const POSITION_TRAITS = {
  QB: ["Arm Strength","Accuracy","Pocket Presence","Mobility","Decision Making","Leadership"],
  RB: ["Vision","Burst","Power","Elusiveness","Pass Catching","Pass Protection"],
  WR: ["Route Running","Separation","Hands","YAC Ability","Speed","Contested Catches"],
  TE: ["Receiving","Route Running","Blocking","Athleticism","Hands","Versatility"],
  OT: ["Pass Protection","Run Blocking","Footwork","Anchor","Athleticism","Versatility"],
  IOL: ["Pass Protection","Run Blocking","Pulling","Strength","Awareness","Versatility"],
  EDGE: ["Pass Rush","Bend","First Step","Hand Usage","Motor","Run Defense"],
  DL: ["Pass Rush","Run Defense","First Step","Hand Usage","Motor","Versatility"],
  LB: ["Tackling","Coverage","Blitz Ability","Instincts","Athleticism","Range"],
  CB: ["Coverage","Ball Skills","Tackling","Speed","Press","Football IQ"],
  S: ["Coverage","Range","Ball Skills","Tackling","Versatility","Football IQ"],
  "K/P": ["Leg Strength","Accuracy","Consistency","Clutch","Directional Control","Hang Time"],
};

// Map gpos variants to POSITION_TRAITS keys
function posKey(gpos) {
  if (POSITION_TRAITS[gpos]) return gpos;
  if (gpos === "IDL" || gpos === "DT" || gpos === "NT") return "DL";
  if (gpos === "ILB" || gpos === "OLB") return "LB";
  if (gpos === "FS" || gpos === "SS") return "S";
  if (gpos === "OL") return "OT"; // default OL → OT
  if (gpos === "DB") return "CB"; // default DB → CB
  return null;
}

// ── Stat-based trait derivation (mirrored from statTraits.js) ─
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

function parseDef(s) {
  if (!s) return {};
  const n = (rx) => { const m = s.match(rx); return m ? parseFloat(m[1]) : 0; };
  return { tkl: n(/([\d.]+)\s*tkl/), tfl: n(/([\d.]+)\s*tfl/), sck: n(/([\d.]+)\s*sck/), pd: n(/([\d.]+)\s*pd/), td: n(/([\d.]+)\s*TD/) };
}
function parseQB(stat, extra) {
  if (!stat) return {};
  const m = stat.match(/(\d+)\s*\/\s*(\d+),\s*([\d.]+)\s*yds?,\s*(\d+)\s*TD,\s*(\d+)\s*INT/);
  if (!m) return {};
  const comp = +m[1], att = +m[2], yds = +m[3], td = +m[4], int_ = +m[5];
  const r = { comp_pct: att > 0 ? (comp / att) * 100 : 0, yds, td, int: int_, ypa: att > 0 ? yds / att : 0 };
  if (extra) {
    const rm = extra.match(/([\d.]+)\s*rush\s*yds?/i); if (rm) r.rush_yds = +rm[1];
    const rtd = extra.match(/([\d.]+)\s*TD/); if (rtd) r.rush_td = +rtd[1];
  }
  return r;
}
function parseRB(stat, extra) {
  if (!stat) return {};
  const r = {};
  const car = stat.match(/([\d.]+)\s*car/);
  if (car) { r.car = +car[1]; const yds = stat.match(/([\d.]+)\s*yds/); if (yds) r.yds = +yds[1]; const td = stat.match(/([\d.]+)\s*TD/); if (td) r.td = +td[1]; if (r.car > 0 && r.yds) r.ypc = r.yds / r.car; }
  if (extra) { const rec = extra.match(/([\d.]+)\s*rec/); if (rec) r.rec = +rec[1]; }
  return r;
}
function parseRec(stat) {
  if (!stat) return {};
  const r = {};
  const rec = stat.match(/([\d.]+)\s*rec/); if (rec) r.rec = +rec[1];
  const yds = stat.match(/([\d.]+)\s*yds/); if (yds) r.yds = +yds[1];
  const td = stat.match(/([\d.]+)\s*TD/); if (td) r.td = +td[1];
  if (r.rec > 0 && r.yds) r.ypr = r.yds / r.rec;
  return r;
}

function getStatTraits(ps) {
  const pos = ps.gpos;
  const stat = ps.statLine || "";
  const extra = ps.statExtra || "";

  if (pos === "QB") {
    const p = parseQB(stat, extra);
    if (!p.comp_pct) return null;
    const t = {};
    t["Accuracy"] = lerp(p.comp_pct, [[55,40],[62,55],[67,70],[72,85],[76,95]]);
    if (p.int > 0) t["Decision Making"] = lerp(p.td / p.int, [[1.5,45],[2.5,60],[3.5,75],[5.0,85],[7.0,95]]);
    else if (p.td > 0) t["Decision Making"] = 95;
    t["Arm Strength"] = lerp(p.ypa, [[6.0,40],[7.0,55],[8.0,70],[9.0,82],[10.0,92]]);
    if (p.rush_yds != null) t["Mobility"] = lerp(p.rush_yds, [[50,40],[150,55],[300,70],[500,82],[800,95]]);
    return t;
  }
  if (pos === "RB") {
    const p = parseRB(stat, extra);
    if (!p.ypc && !p.car) return null;
    const t = {};
    if (p.ypc) t["Vision"] = lerp(p.ypc, [[3.5,40],[4.5,55],[5.5,70],[6.5,85],[7.5,95]]);
    if (p.car) t["Power"] = lerp(p.car, [[100,45],[150,55],[200,68],[250,80],[300,90]]);
    if (p.rec != null) t["Pass Catching"] = lerp(p.rec, [[5,35],[15,50],[30,65],[45,80],[60,92]]);
    if (p.ypc) { let e = lerp(p.ypc, [[3.5,40],[4.5,55],[5.5,70],[6.5,85],[7.5,95]]); if (p.td >= 10) e = Math.min(99, e + 5); t["Elusiveness"] = e; }
    return t;
  }
  if (pos === "WR") {
    const p = parseRec(stat);
    if (!p.rec) return null;
    const t = {};
    if (p.ypr) t["Route Running"] = lerp(p.ypr, [[8,35],[11,50],[14,65],[17,80],[20,92]]);
    t["Hands"] = lerp(p.rec, [[20,40],[40,55],[60,70],[80,82],[100,92]]);
    if (p.td != null) t["Speed"] = lerp(p.td, [[2,35],[5,50],[8,65],[12,80],[16,92]]);
    return t;
  }
  if (pos === "TE") {
    const p = parseRec(stat);
    if (!p.rec) return null;
    const t = {};
    t["Receiving"] = lerp(p.rec, [[20,40],[40,55],[60,70],[80,82],[100,92]]);
    if (p.ypr) t["Route Running"] = lerp(p.ypr, [[6,35],[9,50],[12,65],[15,80],[18,92]]);
    t["Blocking"] = 55;
    return t;
  }
  if (pos === "EDGE") {
    const p = parseDef(stat);
    if (!p.tkl && !p.sck) return null;
    const t = {};
    t["Pass Rush"] = lerp(p.sck, [[2,35],[5,52],[8,68],[11,82],[14,93]]);
    t["First Step"] = lerp(p.tfl, [[3,38],[7,55],[11,70],[15,83],[19,93]]);
    t["Motor"] = lerp(p.tkl, [[15,38],[30,52],[45,68],[60,82],[75,93]]);
    return t;
  }
  if (pos === "DL" || pos === "IDL" || pos === "DT" || pos === "NT") {
    const p = parseDef(stat);
    if (!p.tkl && !p.sck) return null;
    const t = {};
    t["Pass Rush"] = lerp(p.sck, [[1,35],[3,52],[5,68],[7,82],[10,93]]);
    t["First Step"] = lerp(p.tfl, [[3,38],[7,55],[11,70],[15,83],[19,93]]);
    t["Motor"] = lerp(p.tkl, [[20,42],[35,58],[50,72],[65,84]]);
    return t;
  }
  if (pos === "LB" || pos === "ILB" || pos === "OLB") {
    const p = parseDef(stat);
    if (!p.tkl) return null;
    const t = {};
    t["Tackling"] = lerp(p.tkl, [[30,38],[50,52],[70,68],[90,82],[110,93]]);
    t["Blitz Ability"] = lerp(p.sck + p.tfl, [[2,38],[5,52],[9,68],[14,82],[20,95]]);
    t["Coverage"] = lerp(p.pd, [[0,42],[2,55],[4,68],[7,80],[10,92]]);
    return t;
  }
  if (pos === "CB") {
    const p = parseDef(stat);
    if (!p.tkl && !p.pd) return null;
    const t = {};
    t["Ball Skills"] = lerp(p.pd, [[1,38],[4,55],[7,70],[10,82],[14,93]]);
    t["Tackling"] = lerp(p.tkl, [[15,38],[30,55],[45,70],[60,82]]);
    return t;
  }
  if (pos === "S" || pos === "FS" || pos === "SS") {
    const p = parseDef(stat);
    if (!p.tkl && !p.pd) return null;
    const t = {};
    t["Ball Skills"] = lerp(p.pd, [[1,38],[4,55],[7,70],[10,82],[14,93]]);
    t["Tackling"] = lerp(p.tkl, [[25,40],[45,55],[65,72],[85,85]]);
    return t;
  }
  return null;
}

// ── Build the union of ALL trait column names ─────────────────
const allTraitsSet = new Set();
for (const traits of Object.values(POSITION_TRAITS)) {
  for (const t of traits) allTraitsSet.add(t);
}
const allTraits = [...allTraitsSet].sort();

// ── Build rows ───────────────────────────────────────────────
function titleCase(key) {
  // key is "fernando mendoza|indiana" → extract parts
  const [namePart, schoolPart] = key.split("|");
  const name = namePart.replace(/\b\w/g, c => c.toUpperCase()).replace(/\bMc(\w)/g, (_, c) => "Mc" + c.toUpperCase());
  const school = schoolPart.replace(/\b\w/g, c => c.toUpperCase()).replace(/\bUsc\b/,"USC").replace(/\bUcf\b/,"UCF").replace(/\bUconn\b/,"UConn").replace(/\bUtsa\b/,"UTSA").replace(/\bLsu\b/,"LSU").replace(/\bByu\b/,"BYU").replace(/\bSmm\b/,"SMU").replace(/\bTcu\b/,"TCU").replace(/\bUcla\b/,"UCLA");
  return { name, school };
}

const rows = [];
for (const [key, ps] of Object.entries(S)) {
  const { name, school } = titleCase(key);
  const gpos = ps.gpos || "";
  const pk = posKey(gpos);
  const posTraits = pk ? (POSITION_TRAITS[pk] || []) : [];
  const statTraits = getStatTraits(ps) || {};

  const row = {
    name,
    school,
    position: gpos,
    rank: ps.rank || "",
    height: ps.height || "",
    weight: ps.weight || "",
  };

  for (const t of allTraits) {
    if (posTraits.includes(t)) {
      row[t] = statTraits[t] != null ? statTraits[t] : "";
    } else {
      row[t] = "";
    }
  }
  rows.push(row);
}

// Sort by rank (numbered first, then unranked)
rows.sort((a, b) => {
  const ra = typeof a.rank === "number" ? a.rank : 9999;
  const rb = typeof b.rank === "number" ? b.rank : 9999;
  return ra - rb;
});

// ── CSV output ───────────────────────────────────────────────
function csvEscape(val) {
  const s = String(val ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

const headers = ["name", "school", "position", "rank", "height", "weight", ...allTraits];
const lines = [headers.map(csvEscape).join(",")];

for (const row of rows) {
  lines.push(headers.map(h => csvEscape(row[h])).join(","));
}

const csv = lines.join("\n") + "\n";

// Preview first 5 rows
console.log("=== PREVIEW (first 5 data rows) ===\n");
for (let i = 0; i <= 5; i++) {
  console.log(lines[i]);
}
console.log(`\n... ${rows.length} total prospects`);

// Write file
const outPath = join(ROOT, "public/prospect-traits-export.csv");
writeFileSync(outPath, csv);
console.log(`\nWritten to: ${outPath}`);
