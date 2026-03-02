/**
 * Build historical combine comps JSON from NFLVerse data.
 * Fetches full NFLVerse combine CSV (2000–2025), maps positions to BBL,
 * computes percentile vectors using combinePercentiles.json distributions,
 * and outputs src/historicalComps.json grouped by position.
 *
 * Usage: node scripts/build-historical-comps.cjs
 */

const fs = require('fs');
const path = require('path');

const NFLVERSE_URL = 'https://github.com/nflverse/nflverse-data/releases/download/combine/combine.csv';
const PERCENTILES_PATH = path.join(__dirname, '..', 'src', 'combinePercentiles.json');
const OUTPUT_PATH = path.join(__dirname, '..', 'src', 'historicalComps.json');

// Position mapping — NFLVerse pos → BBL pos (array for multi-map)
const POS_MAP = {
  'QB': ['QB'], 'RB': ['RB'], 'FB': ['RB'], 'WR': ['WR'],
  'TE': ['TE'], 'OT': ['OT'], 'T': ['OT'],
  'OG': ['IOL'], 'G': ['IOL'], 'C': ['IOL'],
  'OL': ['OT', 'IOL'],
  'DE': ['EDGE'], 'EDGE': ['EDGE'],
  'OLB': ['LB'], 'ILB': ['LB'], 'LB': ['LB'],
  'DT': ['DL'], 'NT': ['DL'], 'DL': ['DL'],
  'CB': ['CB'],
  'S': ['S'], 'SAF': ['S'],
  'DB': ['CB', 'S'],
};

const INVERTED = new Set(['forty', 'cone', 'shuttle']);
const DRILL_FIELDS = ['forty', 'vertical', 'broad', 'bench', 'cone', 'shuttle'];
const SIZE_FIELDS = ['height', 'weight'];
const ALL_FIELDS = [...SIZE_FIELDS, ...DRILL_FIELDS];

function parseNum(v) {
  if (!v || v === 'NA' || v.trim() === '') return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function getPercentile(value, sortedArr) {
  if (!sortedArr || sortedArr.length === 0) return null;
  let lo = 0, hi = sortedArr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sortedArr[mid] < value) lo = mid + 1;
    else hi = mid;
  }
  return Math.round((lo / sortedArr.length) * 100);
}

function getPercentileForField(value, sortedArr, field) {
  const raw = getPercentile(value, sortedArr);
  if (raw === null) return null;
  return INVERTED.has(field) ? 100 - raw : raw;
}

async function main() {
  console.log('Fetching NFLVerse combine CSV...');
  const resp = await fetch(NFLVERSE_URL);
  const text = await resp.text();
  const lines = text.trim().split('\n');
  const header = lines[0].split(',');
  const rows = lines.slice(1).map(l => {
    const v = l.split(',');
    const o = {};
    header.forEach((h, i) => o[h] = v[i]);
    return o;
  });

  console.log(`Fetched ${rows.length} rows`);

  const percentiles = JSON.parse(fs.readFileSync(PERCENTILES_PATH, 'utf8'));

  // Field name mapping: NFLVerse CSV → combinePercentiles.json keys
  const CSV_TO_PERC = {
    'ht': 'height', 'wt': 'weight', 'forty': 'forty',
    'bench': 'bench', 'vertical': 'vertical', 'broad_jump': 'broad',
    'cone': 'cone', 'shuttle': 'shuttle'
  };

  // Also compute composite score distributions for athletic score (double-percentile)
  // First pass: compute raw composite averages per position for all historical rows
  const compositesByPos = {};

  const allPlayerData = []; // temp storage for second pass

  for (const row of rows) {
    const season = parseInt(row.season);
    if (season < 2000 || season >= 2026) continue; // exclude 2026 (current class)

    const rawPos = (row.pos || '').toUpperCase().trim();
    const bblPositions = POS_MAP[rawPos];
    if (!bblPositions) continue;

    // Parse raw values
    const raw = {};
    for (const [csvField, percField] of Object.entries(CSV_TO_PERC)) {
      raw[percField] = parseNum(row[csvField]);
    }

    // Count non-null measurable fields (excluding height/weight for the 5-field minimum)
    const drillCount = DRILL_FIELDS.filter(f => raw[f] !== null).length;
    const sizeCount = SIZE_FIELDS.filter(f => raw[f] !== null).length;
    const totalFields = drillCount + sizeCount;
    if (totalFields < 5) continue;

    allPlayerData.push({ row, raw, bblPositions, season });
  }

  // First pass: compute raw composite percentile averages to build distribution
  for (const { raw, bblPositions } of allPlayerData) {
    for (const pos of bblPositions) {
      const posDist = percentiles[pos];
      if (!posDist) continue;

      // Compute per-metric percentiles
      let wSum = 0, wTotal = 0;
      for (const field of ALL_FIELDS) {
        if (raw[field] === null || !posDist[field]) continue;
        const perc = getPercentileForField(raw[field], posDist[field], field);
        if (perc === null) continue;
        const w = SIZE_FIELDS.includes(field) ? 0.25 : 1.0;
        wSum += perc * w;
        wTotal += w;
      }
      if (wTotal >= 3) {
        if (!compositesByPos[pos]) compositesByPos[pos] = [];
        compositesByPos[pos].push(wSum / wTotal);
      }
    }
  }

  // Sort composite distributions
  for (const pos of Object.keys(compositesByPos)) {
    compositesByPos[pos].sort((a, b) => a - b);
  }

  // Second pass: build final output with percentile vectors + composite scores
  const output = {}; // { pos: [ { n, s, y, pct: { forty, vertical, ... }, ath, spd, agi, exp }, ... ] }

  for (const { row, raw, bblPositions, season } of allPlayerData) {
    for (const pos of bblPositions) {
      const posDist = percentiles[pos];
      if (!posDist) continue;

      // Compute per-metric percentiles
      const pct = {};
      let wSum = 0, wTotal = 0;
      for (const field of ALL_FIELDS) {
        if (raw[field] === null || !posDist[field]) continue;
        const perc = getPercentileForField(raw[field], posDist[field], field);
        if (perc === null) continue;
        pct[field] = perc;
        const w = SIZE_FIELDS.includes(field) ? 0.25 : 1.0;
        wSum += perc * w;
        wTotal += w;
      }

      // Athletic score (double-percentile)
      let ath = null;
      if (wTotal >= 3 && compositesByPos[pos]) {
        const rawComposite = wSum / wTotal;
        const arr = compositesByPos[pos];
        let lo = 0, hi = arr.length;
        while (lo < hi) {
          const mid = (lo + hi) >> 1;
          if (arr[mid] < rawComposite) lo = mid + 1;
          else hi = mid;
        }
        ath = Math.round((lo / arr.length) * 1000) / 10;
        if (ath >= 100) ath = 99.9;
      }

      // Speed score
      let spd = null;
      if (raw.weight && raw.forty) {
        spd = Math.round((raw.weight * 200) / Math.pow(raw.forty, 4) * 100) / 100;
      }

      // Agility score
      let agi = null;
      if (pct.cone != null && pct.shuttle != null) agi = Math.round((pct.cone + pct.shuttle) / 2);
      else if (pct.cone != null) agi = pct.cone;
      else if (pct.shuttle != null) agi = pct.shuttle;

      // Explosion score
      let exp = null;
      if (pct.vertical != null && pct.broad != null) exp = Math.round((pct.vertical + pct.broad) / 2);
      else if (pct.vertical != null) exp = pct.vertical;
      else if (pct.broad != null) exp = pct.broad;

      if (!output[pos]) output[pos] = [];
      output[pos].push({
        n: row.player_name,
        s: row.school,
        y: season,
        pct,
        ath: ath,
        spd: spd,
        agi: agi,
        exp: exp,
      });
    }
  }

  // Stats
  let total = 0;
  for (const pos of Object.keys(output)) {
    console.log(`  ${pos}: ${output[pos].length} players`);
    total += output[pos].length;
  }
  console.log(`Total: ${total} player-position entries`);

  const json = JSON.stringify(output);
  fs.writeFileSync(OUTPUT_PATH, json);
  console.log(`Written to ${OUTPUT_PATH} (${Math.round(json.length / 1024)}KB)`);
}

main().catch(e => { console.error(e); process.exit(1); });
