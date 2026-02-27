#!/usr/bin/env node
/**
 * Convert @JordanSportGuy Twitter combine CSVs into combine-manual.csv format
 *
 * Input format:  HEIGHT=6006 (6'0 6/8"), Hand Size=1018 (10 1/8"), Arm Length=3148 (31 4/8")
 * Output format: height=76.75 (inches), hands=10.125, arms=31.5
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// NFL combine notation: last two digits are "N8" meaning N/8 fraction
// e.g., 6006 height = 6 feet, 00 inches, 6/8"
//       1018 hands  = 10 inches, 1/8"
//       3148 arms   = 31 inches, 4/8"
//       7548 wing   = 75 inches, 4/8"

function combineHeight(val) {
  if (!val || val === '') return null;
  const s = val.toString().trim();
  if (s.length === 4) {
    const feet = parseInt(s[0]);
    const inches = parseInt(s[1] + s[2]);
    const eighths = parseInt(s[3]);
    return feet * 12 + inches + eighths / 8;
  }
  if (s.length === 3) {
    const feet = parseInt(s[0]);
    const inches = parseInt(s[1] + s[2]);
    return feet * 12 + inches;
  }
  return null;
}

// Convert 4-digit combine measure: WWNF where WW=whole, N=numerator, F=8 (always)
function combineMeasure(val) {
  if (!val || val === '') return null;
  const s = val.toString().trim();
  if (s.length === 4) {
    const whole = parseInt(s.substring(0, 2));
    const numerator = parseInt(s[2]); // 3rd digit is the fraction numerator
    return whole + numerator / 8;
  }
  return null;
}

// Hand size: same pattern (e.g., 1018 = 10 + 1/8 = 10.125)
function combineHands(val) {
  if (!val || val === '') return null;
  const s = val.toString().trim();
  if (s.length === 4) {
    const whole = parseInt(s.substring(0, 2));
    const numerator = parseInt(s[2]);
    return whole + numerator / 8;
  }
  if (s.length === 3) {
    const whole = parseInt(s[0]);
    const numerator = parseInt(s[1]);
    return whole + numerator / 8;
  }
  return null;
}

// Convert broad jump format "10'4" to inches
function parseBroad(val) {
  if (!val || val === '') return null;
  const s = val.toString().trim().replace(/\s/g, '');
  const m = s.match(/(\d+)'(\d+)/);
  if (m) return parseInt(m[1]) * 12 + parseInt(m[2]);
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

// Height in inches to "6-2" format
function inchesToFeetDash(inches) {
  if (!inches) return '';
  const feet = Math.floor(inches / 12);
  const rem = Math.round((inches % 12) * 8) / 8; // round to nearest eighth
  return `${feet}-${rem}`;
}

function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').replace(/:$/, ''));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    const row = {};
    headers.forEach((h, idx) => { row[h] = vals[idx] || ''; });
    rows.push(row);
  }
  return rows;
}

// ---- MAIN ----
const inputFiles = process.argv.slice(2);
if (inputFiles.length === 0) {
  console.log('Usage: node convert-combine-csv.js <file1.csv> [file2.csv] ...');
  process.exit(1);
}

const allRows = [];
for (const file of inputFiles) {
  const text = fs.readFileSync(file, 'utf8');
  const rows = parseCSV(text);
  console.log(`📄 ${path.basename(file)}: ${rows.length} players`);
  allRows.push(...rows);
}

// Convert to combine-manual.csv format
const output = ['name,pos,school,height,weight,forty,vertical,broad,bench,cone,shuttle,arms,hands,wingspan'];

allRows.forEach(r => {
  const name = (r.NAME || r.Name || '').trim();
  const school = (r.SCHOOL || r.School || '').trim();
  if (!name) return;

  const htInches = combineHeight(r.HEIGHT || r.Height);
  const height = htInches || '';
  const weight = r.WEIGHT || r.Weight || '';
  const forty = r['40 Yard Dash'] || r['40'] || '';
  const vertical = r.Vertical || '';
  const broad = parseBroad(r.Broad) || '';
  const bench = r.Bench || '';
  const cone = r['3 Cone'] || r['3-Cone'] || '';
  const shuttle = r.Shuttle || '';
  const arms = combineMeasure(r['Arm Length'] || r['Arms']) || '';
  const hands = combineHands(r['Hand Size'] || r['Hands']) || '';
  const wingspan = combineMeasure(r.Wingspan) || '';

  output.push(`${name},,${school},${height},${weight},${forty},${vertical},${broad},${bench},${cone},${shuttle},${arms},${hands},${wingspan}`);
});

const outPath = path.join(__dirname, 'combine-manual.csv');
fs.writeFileSync(outPath, output.join('\n'));
console.log(`\n✅ Wrote ${allRows.length} players to ${outPath}`);
console.log('   Now run: node update-combine.js');
