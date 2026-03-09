#!/usr/bin/env node
/**
 * BBL Combine Auto-Updater
 * 
 * Fetches 2026 combine data from nflverse (free, open-source, auto-updated),
 * matches against BBL's 458 prospects, and regenerates combine-results.html.
 * 
 * USAGE:
 *   node update-combine.js
 * 
 * That's it. One command. Run it as often as you want during combine week.
 * 
 * DATA SOURCES (tried in order):
 *   1. nflverse GitHub CSV (primary - usually updated within hours of results)
 *   2. Manual fallback CSV at ./combine-manual.csv (if you want to add data yourself)
 * 
 * The script merges all sources - nflverse data wins if there's a conflict,
 * then manual CSV fills gaps. Your BBL prospect list is always the base.
 */

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PROSPECTS_RAW } from './src/prospects.js';
import { DRAFT_YEAR } from './src/draftConfig.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================
// CONFIG
// ============================================================
const NFLVERSE_COMBINE_URL = 'https://github.com/nflverse/nflverse-data/releases/download/combine/combine.csv';
const MANUAL_CSV_PATH = path.join(__dirname, 'combine-manual.csv');
const HTML_TEMPLATE_PATH = path.join(__dirname, 'public', 'blog', '2026-nfl-combine-results.html');
const OUTPUT_PATH = path.join(__dirname, 'public', 'blog', '2026-nfl-combine-results.html');
const COMBINE_JSON_PATH = path.join(__dirname, 'src', 'combineData.json');
const PERCENTILES_JSON_PATH = path.join(__dirname, 'src', 'combinePercentiles.json');
const SEASON = DRAFT_YEAR;

// ============================================================
// POSITION MAPPING (nflverse → BBL)
// ============================================================
const NFLVERSE_POS_MAP = {
  'QB': 'QB', 'RB': 'RB', 'FB': 'RB', 'WR': 'WR',
  'TE': 'TE', 'OT': 'OT', 'T': 'OT', 'OG': 'IOL', 'G': 'IOL', 'C': 'IOL',
  'OL': 'OT', // generic OL defaults to OT
  'DE': 'EDGE', 'EDGE': 'EDGE', 'OLB': 'LB',
  'DT': 'DL', 'NT': 'DL', 'DL': 'DL',
  'ILB': 'LB', 'LB': 'LB', 'MLB': 'LB',
  'CB': 'CB', 'DB': 'CB',
  'FS': 'S', 'SS': 'S', 'S': 'S',
};

// ============================================================
// BREAKPOINTS (from scripts/combineTraits.js)
// ============================================================
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

function computeSpeedScore(weight, forty) {
  if (!weight || !forty) return null;
  return Math.round((weight * 200) / Math.pow(forty, 4) * 100) / 100;
}

// Binary search to find percentile rank in sorted array
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

// For drills where lower is better (forty, cone, shuttle), invert percentile
function getPercentileInverted(value, sortedArr) {
  if (!sortedArr || sortedArr.length === 0) return null;
  const raw = getPercentile(value, sortedArr);
  return 100 - raw;
}

// ============================================================
// BBL PROSPECT LIST (derived from shared prospects.js)
// ============================================================
const BBL_PROSPECTS = PROSPECTS_RAW.map((p, i) => ({
  ...p, rank: i + 1,
  height: null, weight: null, forty: null, vertical: null,
  broad: null, bench: null, cone: null, shuttle: null,
}));

// ============================================================
// HELPERS
// ============================================================

function fetchURL(url) {
  return new Promise((resolve, reject) => {
    const handler = (res) => {
      // Follow redirects (GitHub releases redirect to S3)
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        console.log(`  ↳ Following redirect...`);
        const mod = res.headers.location.startsWith('https') ? https : http;
        mod.get(res.headers.location, handler).on('error', reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    };
    https.get(url, { headers: { 'User-Agent': 'BBL-Combine-Updater/1.0' } }, handler).on('error', reject);
  });
}

function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];
  
  // Parse header
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());
  
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    const row = {};
    headers.forEach((h, idx) => { row[h] = vals[idx] || null; });
    rows.push(row);
  }
  return rows;
}

// Normalize name for matching: lowercase, strip suffixes, normalize punctuation
function normName(name) {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/\s+(jr\.?|sr\.?|ii|iii|iv|v)$/i, '') // strip suffixes
    .replace(/['.]/g, '')  // strip apostrophes and periods
    .replace(/\s+/g, ' ')
    .trim();
}

// Try to match a combine row to a BBL prospect
function findMatch(combineRow, bblMap) {
  const name = combineRow.player_name || combineRow.name || '';
  const school = combineRow.school || combineRow.college || '';
  
  // Try exact normalized name match
  const key1 = normName(name);
  if (bblMap[key1]) return bblMap[key1];
  
  // Try name + school combo
  const key2 = key1 + '|' + normName(school);
  if (bblMap[key2]) return bblMap[key2];
  
  // Try last name + school
  const parts = name.split(' ');
  const lastName = parts[parts.length - 1];
  const key3 = normName(lastName) + '|' + normName(school);
  if (bblMap[key3]) return bblMap[key3];
  
  return null;
}

function parseNum(v) {
  if (v === null || v === undefined || v === '' || v === 'NA' || v === 'DNP' || v === 'DNS') return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function parseHeight(v) {
  if (!v || v === 'NA') return null;
  // nflverse format might be inches (e.g. 77) or "6-5" or "6'5"
  const n = parseInt(v);
  if (!isNaN(n) && n > 60 && n < 90) {
    // Convert total inches to feet-inches format
    const feet = Math.floor(n / 12);
    const inches = n % 12;
    return `${feet}-${inches}`;
  }
  // Already in readable format
  if (typeof v === 'string' && (v.includes('-') || v.includes("'"))) return v;
  return v;
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('🏈 BBL Combine Auto-Updater\n');
  
  // Build lookup maps for BBL prospects
  const bblMap = {};
  BBL_PROSPECTS.forEach(p => {
    const nk = normName(p.name);
    bblMap[nk] = p;
    bblMap[nk + '|' + normName(p.school)] = p;
    // Also add last name + school
    const parts = p.name.split(' ');
    const lastName = parts[parts.length - 1];
    bblMap[normName(lastName) + '|' + normName(p.school)] = p;
  });

  // Initialize results map
  const results = {};
  BBL_PROSPECTS.forEach(p => {
    results[p.name] = {
      ...p,
      height: p.height || null,
      heightInches: null,
      weight: p.weight || null,
      forty: p.forty || null,
      vertical: p.vertical || null,
      broad: p.broad || null,
      bench: p.bench || null,
      cone: p.cone || null,
      shuttle: p.shuttle || null,
      arms: null,
      hands: null,
      wingspan: null,
    };
  });

  let matchCount = 0;
  let allRows = []; // store all nflverse rows for historical percentiles

  // ---- SOURCE 1: nflverse CSV ----
  console.log('📡 Fetching nflverse combine data...');
  try {
    const csv = await fetchURL(NFLVERSE_COMBINE_URL);
    const rows = parseCSV(csv);
    allRows = rows; // save for percentile computation
    // Filter to current season
    const current = rows.filter(r => parseInt(r.season) === SEASON);
    console.log(`  ✅ Got ${rows.length} total rows, ${current.length} for ${SEASON}`);

    current.forEach(row => {
      const match = findMatch(row, bblMap);
      if (match) {
        const r = results[match.name];
        const htRaw = parseNum(row.ht);
        const ht = parseHeight(row.ht);
        const wt = parseNum(row.wt);
        const forty = parseNum(row.forty);
        const vertical = parseNum(row.vertical);
        const broad = parseNum(row.broad_jump);
        const bench = parseNum(row.bench);
        const cone = parseNum(row.cone);
        const shuttle = parseNum(row.shuttle);

        const arms = parseNum(row.arms || row.arm_length || row.arm);
        const hands = parseNum(row.hands || row.hand_size || row.hand);
        const wing = parseNum(row.wingspan || row.wing);

        if (htRaw) r.heightInches = htRaw;
        if (ht) r.height = ht;
        if (wt) r.weight = wt;
        if (forty) r.forty = forty;
        if (vertical) r.vertical = vertical;
        if (broad) r.broad = broad;
        if (bench) r.bench = bench;
        if (cone) r.cone = cone;
        if (shuttle) r.shuttle = shuttle;
        if (arms) r.arms = arms;
        if (hands) r.hands = hands;
        if (wing) r.wingspan = wing;
        matchCount++;
      }
    });
    console.log(`  🔗 Matched ${matchCount} prospects to BBL board`);
  } catch (err) {
    console.log(`  ⚠️  nflverse fetch failed: ${err.message}`);
    console.log(`     (This is normal if 2026 combine data hasn't been published yet)`);
  }

  // ---- SOURCE 2: Manual CSV override ----
  if (fs.existsSync(MANUAL_CSV_PATH)) {
    console.log('\n📋 Loading manual CSV overrides...');
    const csv = fs.readFileSync(MANUAL_CSV_PATH, 'utf8');
    const rows = parseCSV(csv);
    let manualCount = 0;
    rows.forEach(row => {
      const match = findMatch(row, bblMap);
      if (match) {
        const r = results[match.name];
        // Manual only fills gaps - doesn't overwrite nflverse data
        const htRawManual = parseNum(row.height || row.ht);
        const ht = parseHeight(row.height || row.ht);
        if (htRawManual && !r.heightInches) r.heightInches = htRawManual;
        if (ht && !r.height) r.height = ht;
        if (!r.weight) r.weight = parseNum(row.weight || row.wt);
        if (!r.forty) r.forty = parseNum(row.forty || row['40']);
        if (!r.vertical) r.vertical = parseNum(row.vertical || row.vert);
        if (!r.broad) r.broad = parseNum(row.broad || row.broad_jump);
        if (!r.bench) r.bench = parseNum(row.bench);
        if (!r.cone) r.cone = parseNum(row.cone || row['3cone'] || row['3-cone']);
        if (!r.shuttle) r.shuttle = parseNum(row.shuttle);
        if (!r.arms) r.arms = parseNum(row.arms || row.arm_length || row.arm);
        if (!r.hands) r.hands = parseNum(row.hands || row.hand_size || row.hand);
        if (!r.wingspan) r.wingspan = parseNum(row.wingspan || row.wing);
        manualCount++;
      }
    });
    console.log(`  ✅ Applied ${manualCount} manual overrides`);
  }

  // ---- SOURCE 3: Pro Day data (gap-fills only) ----
  const proDayDir = path.join(__dirname, 'agents', 'output', 'pro-day');
  const proDayTracker = {}; // name -> [field, field, ...]
  if (fs.existsSync(proDayDir)) {
    const proDayFiles = fs.readdirSync(proDayDir).filter(f => f.endsWith('.json'));
    if (proDayFiles.length > 0) {
      console.log(`\n🏟️  Loading pro day data (${proDayFiles.length} schools)...`);
      let proDayFills = 0;
      proDayFiles.forEach(file => {
        const data = JSON.parse(fs.readFileSync(path.join(proDayDir, file), 'utf8'));
        const school = data.school || '';
        (data.participants || []).forEach(p => {
          const match = findMatch({ player_name: p.name, school }, bblMap);
          if (!match) return;
          const r = results[match.name];
          const fields = [];
          if (p.height && !r.heightInches) { r.heightInches = p.height; fields.push('height'); }
          if (p.weight && !r.weight) { r.weight = p.weight; fields.push('weight'); }
          if (p.forty && !r.forty) { r.forty = p.forty; fields.push('forty'); }
          if (p.vertical && !r.vertical) { r.vertical = p.vertical; fields.push('vertical'); }
          if (p.broad && !r.broad) { r.broad = p.broad; fields.push('broad'); }
          if (p.bench && !r.bench) { r.bench = p.bench; fields.push('bench'); }
          if (p.cone && !r.cone) { r.cone = p.cone; fields.push('cone'); }
          if (p.shuttle && !r.shuttle) { r.shuttle = p.shuttle; fields.push('shuttle'); }
          if (p.arms && !r.arms) { r.arms = p.arms; fields.push('arms'); }
          if (p.hands && !r.hands) { r.hands = p.hands; fields.push('hands'); }
          if (p.wingspan && !r.wingspan) { r.wingspan = p.wingspan; fields.push('wingspan'); }
          if (fields.length > 0) {
            proDayTracker[match.name] = fields;
            proDayFills++;
            console.log(`    ✅ ${p.name} (${school}) — gap-filled: ${fields.join(', ')}`);
          }
        });
      });
      console.log(`  ✅ Applied ${proDayFills} pro day gap-fills`);
    }
  }

  // ---- BUILD HISTORICAL PERCENTILE TABLES ----
  console.log('\n📊 Building historical percentile tables...');
  // Include height (ht) and weight (wt) alongside drills
  const drillFields = ['forty', 'vertical', 'broad_jump', 'bench', 'cone', 'shuttle', 'ht', 'wt'];
  const drillKeys = ['forty', 'vertical', 'broad', 'bench', 'cone', 'shuttle', 'height', 'weight'];
  // Drills where lower = better (inverted percentile)
  const INVERTED_DRILLS = new Set(['forty', 'cone', 'shuttle']);
  const percentilesData = {};

  // Group all historical rows by BBL position
  allRows.forEach(row => {
    const pos = NFLVERSE_POS_MAP[(row.pos || '').toUpperCase()];
    if (!pos) return;
    if (!percentilesData[pos]) percentilesData[pos] = {};
    drillFields.forEach((field, idx) => {
      const val = parseNum(row[field]);
      if (val == null) return;
      const key = drillKeys[idx];
      if (!percentilesData[pos][key]) percentilesData[pos][key] = [];
      percentilesData[pos][key].push(val);
    });
  });

  // Sort all arrays for binary search
  Object.values(percentilesData).forEach(posData => {
    Object.keys(posData).forEach(drill => {
      posData[drill].sort((a, b) => a - b);
    });
  });

  // ---- BUILD HISTORICAL RAS COMPOSITES PER POSITION ----
  // For each historical player, compute their average percentile across available metrics,
  // then collect all composites per position for double-percentile ranking.
  console.log('  📈 Computing historical RAS composites...');
  const historicalComposites = {}; // pos → sorted array of composite scores
  const allMetrics = ['forty', 'vertical', 'broad', 'bench', 'cone', 'shuttle', 'height', 'weight'];

  // Re-iterate all rows to compute per-player composites
  allRows.forEach(row => {
    const pos = NFLVERSE_POS_MAP[(row.pos || '').toUpperCase()];
    if (!pos) return;
    const posPerc = percentilesData[pos];
    if (!posPerc) return;

    // Compute this player's per-metric percentiles
    const playerPercs = [];
    const vals = {
      forty: parseNum(row.forty),
      vertical: parseNum(row.vertical),
      broad: parseNum(row.broad_jump),
      bench: parseNum(row.bench),
      cone: parseNum(row.cone),
      shuttle: parseNum(row.shuttle),
      height: parseNum(row.ht),
      weight: parseNum(row.wt),
    };

    // Height/weight contribute at 0.25 weight; drills at 1.0
    const SIZE_METRICS = new Set(['height', 'weight']);
    let weightedSum = 0, totalWeight = 0;
    for (const metric of allMetrics) {
      if (vals[metric] == null || !posPerc[metric]) continue;
      const perc = INVERTED_DRILLS.has(metric)
        ? getPercentileInverted(vals[metric], posPerc[metric])
        : getPercentile(vals[metric], posPerc[metric]);
      const w = SIZE_METRICS.has(metric) ? 0.25 : 1.0;
      weightedSum += perc * w;
      totalWeight += w;
    }

    // Need at least 3 metrics for a meaningful composite
    if (totalWeight >= 3) {
      const composite = weightedSum / totalWeight;
      if (!historicalComposites[pos]) historicalComposites[pos] = [];
      historicalComposites[pos].push(composite);
    }
  });

  // Sort historical composites for percentile ranking
  for (const pos in historicalComposites) {
    historicalComposites[pos].sort((a, b) => a - b);
  }

  const compCounts = Object.entries(historicalComposites).map(([p, d]) => `${p}(${d.length})`).join(', ');
  console.log(`  ✅ Historical composites: ${compCounts}`);

  // Write percentiles JSON
  fs.writeFileSync(PERCENTILES_JSON_PATH, JSON.stringify(percentilesData, null, 2));
  const posCounts = Object.entries(percentilesData).map(([p, d]) => `${p}(${d.forty?.length || 0})`).join(', ');
  console.log(`  ✅ Wrote percentile tables: ${posCounts}`);
  console.log(`  📁 ${PERCENTILES_JSON_PATH}`);

  // ---- Write src/combineData.json ----
  const combineJson = {};
  BBL_PROSPECTS.forEach(p => {
    const r = results[p.name];
    // Only include prospects with at least some data
    const hasData = r.height || r.weight || r.forty || r.vertical || r.broad || r.bench || r.cone || r.shuttle || r.arms || r.hands || r.wingspan;
    if (!hasData) return;
    const key = normName(p.name) + '|' + p.school.toLowerCase().trim();
    // BBL position for this prospect
    const bblPos = p.pos === 'OL' ? 'OT' : (p.pos === 'DB' ? 'CB' : p.pos);
    // Compute Speed Score: (weight * 200) / (forty^4) — weight-adjusted speed metric
    const ss = computeSpeedScore(r.weight, r.forty);

    // Compute per-drill percentiles (position-specific)
    const posPerc = percentilesData[bblPos] || {};
    const percentiles = {};
    const scores = {};

    // Individual drills
    if (r.forty && posPerc.forty) {
      percentiles.forty = getPercentileInverted(r.forty, posPerc.forty);
      if (BREAKPOINTS.forty[bblPos]) scores.forty = lerp(r.forty, BREAKPOINTS.forty[bblPos]);
    }
    if (r.vertical && posPerc.vertical) {
      percentiles.vertical = getPercentile(r.vertical, posPerc.vertical);
      if (BREAKPOINTS.vertical[bblPos]) scores.vertical = lerp(r.vertical, BREAKPOINTS.vertical[bblPos]);
    }
    if (r.broad && posPerc.broad) {
      percentiles.broad = getPercentile(r.broad, posPerc.broad);
      if (BREAKPOINTS.broad[bblPos]) scores.broad = lerp(r.broad, BREAKPOINTS.broad[bblPos]);
    }
    if (r.bench && posPerc.bench) {
      percentiles.bench = getPercentile(r.bench, posPerc.bench);
      if (BREAKPOINTS.bench[bblPos]) scores.bench = lerp(r.bench, BREAKPOINTS.bench[bblPos]);
    }
    if (r.cone && posPerc.cone) {
      percentiles.cone = getPercentileInverted(r.cone, posPerc.cone);
      if (BREAKPOINTS.cone[bblPos]) scores.cone = lerp(r.cone, BREAKPOINTS.cone[bblPos]);
    }
    if (r.shuttle && posPerc.shuttle) {
      percentiles.shuttle = getPercentileInverted(r.shuttle, posPerc.shuttle);
      if (BREAKPOINTS.shuttle[bblPos]) scores.shuttle = lerp(r.shuttle, BREAKPOINTS.shuttle[bblPos]);
    }
    // Height + weight percentiles
    const heightInches = r.heightInches || null;
    if (heightInches && posPerc.height) {
      percentiles.height = getPercentile(heightInches, posPerc.height);
    }
    if (r.weight && posPerc.weight) {
      percentiles.weight = getPercentile(r.weight, posPerc.weight);
    }

    // Speed Score percentile + score
    if (ss && BREAKPOINTS.speedScore[bblPos]) {
      scores.speedScore = lerp(ss, BREAKPOINTS.speedScore[bblPos]);
    }

    // Composite scores
    // Athletic Score (RAS-like): double-percentile ranking
    // Step 1: Compute raw composite = average of all per-metric percentiles (incl height/weight)
    // Step 2: Rank that composite against ALL historical composites at this position
    // Uses one decimal place (like RAS) for finer granularity at the top
    const athMetrics = ['forty', 'vertical', 'broad', 'bench', 'cone', 'shuttle', 'height', 'weight'];
    const SIZE_ATH = new Set(['height', 'weight']);
    let athleticScore = null;
    {
      let wSum = 0, wTotal = 0;
      for (const m of athMetrics) {
        if (percentiles[m] == null) continue;
        const w = SIZE_ATH.has(m) ? 0.25 : 1.0;
        wSum += percentiles[m] * w;
        wTotal += w;
      }
      if (wTotal >= 3 && historicalComposites[bblPos]) {
        const rawComposite = wSum / wTotal;
        // Rank against historical composites with one-decimal precision
        const arr = historicalComposites[bblPos];
        let lo = 0, hi = arr.length;
        while (lo < hi) { const mid = (lo + hi) >> 1; if (arr[mid] < rawComposite) lo = mid + 1; else hi = mid; }
        athleticScore = Math.round((lo / arr.length) * 1000) / 10; // e.g. 99.9, 97.3
        // Cap at 99.9 (not 100.0)
        if (athleticScore >= 100) athleticScore = 99.9;
      }
    }

    // Agility Score: average of cone + shuttle percentiles
    const agilityScore = (percentiles.cone != null && percentiles.shuttle != null)
      ? Math.round((percentiles.cone + percentiles.shuttle) / 2)
      : (percentiles.cone != null ? percentiles.cone : percentiles.shuttle != null ? percentiles.shuttle : null);

    // Explosion Score: average of vertical + broad percentiles
    const explosionScore = (percentiles.vertical != null && percentiles.broad != null)
      ? Math.round((percentiles.vertical + percentiles.broad) / 2)
      : (percentiles.vertical != null ? percentiles.vertical : percentiles.broad != null ? percentiles.broad : null);

    const entry = {
      height: r.heightInches || null,
      weight: r.weight || null,
      forty: r.forty || null,
      vertical: r.vertical || null,
      broad: r.broad || null,
      bench: r.bench || null,
      cone: r.cone || null,
      shuttle: r.shuttle || null,
      arms: r.arms || null,
      hands: r.hands || null,
      wingspan: r.wingspan || null,
      speedScore: ss,
      percentiles: Object.keys(percentiles).length > 0 ? percentiles : undefined,
      scores: Object.keys(scores).length > 0 ? scores : undefined,
      athleticScore: athleticScore,
      agilityScore: agilityScore,
      explosionScore: explosionScore,
    };
    if (proDayTracker[p.name]) entry.proDayFields = proDayTracker[p.name];
    combineJson[key] = entry;
  });
  fs.writeFileSync(COMBINE_JSON_PATH, JSON.stringify(combineJson, null, 2));
  console.log(`\n📊 Wrote ${Object.keys(combineJson).length} prospects to ${COMBINE_JSON_PATH}`);

  // ---- GENERATE HTML OUTPUT ----
  console.log('\n📝 Generating combine-results.html...');

  // Read existing HTML template
  const html = fs.readFileSync(HTML_TEMPLATE_PATH, 'utf8');

  // Build new COMBINE_DATA array (now includes composite scores from combineJson)
  const dataLines = BBL_PROSPECTS.map(p => {
    const r = results[p.name];
    const h = r.height ? '"' + r.height + '"' : 'null';
    const fmt = v => (v !== null && v !== undefined) ? v : 'null';
    // Look up composite scores from combineJson
    const key = normName(p.name) + '|' + p.school.toLowerCase().trim();
    const cj = combineJson[key];
    const ath = cj ? fmt(cj.athleticScore) : 'null';
    const spd = cj ? fmt(cj.speedScore) : 'null';
    const agi = cj ? fmt(cj.agilityScore) : 'null';
    const exp = cj ? fmt(cj.explosionScore) : 'null';
    // Format arms/hands/wingspan as display strings (e.g. 31.5 → '31 4/8"')
    const fmtMeas = v => {
      if (v == null) return 'null';
      const whole = Math.floor(v);
      const frac = Math.round((v - whole) * 8);
      return frac === 0 ? `"${whole}\\""` : `"${whole} ${frac}/8\\""`;
    };
    return `  {name:"${p.name}",pos:"${p.pos}",school:"${p.school}",rank:${p.rank},height:${h},weight:${fmt(r.weight)},hands:${fmtMeas(r.hands)},arms:${fmtMeas(r.arms)},wingspan:${fmtMeas(r.wingspan)},forty:${fmt(r.forty)},vertical:${fmt(r.vertical)},broad:${fmt(r.broad)},bench:${fmt(r.bench)},cone:${fmt(r.cone)},shuttle:${fmt(r.shuttle)},ath:${ath},spd:${spd},agi:${agi},exp:${exp}}`;
  });
  const newDataBlock = 'const COMBINE_DATA = [\n' + dataLines.join(',\n') + '\n];';

  // Replace the COMBINE_DATA block in HTML
  const dataRegex = /const COMBINE_DATA = \[[\s\S]*?\];/;
  const newHtml = html.replace(dataRegex, newDataBlock);

  // Update the "last updated" timestamp
  const now = new Date();
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dateStr = `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()} ${now.getHours()}:${String(now.getMinutes()).padStart(2,'0')}`;
  const todayISO = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');
  const updatedHtml = newHtml.replace(
    /Last updated: <span id="lastUpdated">.*?<\/span>/,
    `Last updated: <span id="lastUpdated">${dateStr}</span>`
  ).replace(
    /"dateModified":\s*"[^"]*"/,
    `"dateModified": "${todayISO}"`
  );

  // Also update sitemap lastmod for the combine article
  const sitemapPath = path.join(__dirname, 'public', 'sitemap.xml');
  if (fs.existsSync(sitemapPath)) {
    const sitemap = fs.readFileSync(sitemapPath, 'utf8');
    const updatedSitemap = sitemap.replace(
      /(<loc>https:\/\/bigboardlab\.com\/blog\/2026-nfl-combine-results\.html<\/loc>\s*<lastmod>)[^<]*(<\/lastmod>)/,
      `$1${todayISO}$2`
    );
    if (updatedSitemap !== sitemap) fs.writeFileSync(sitemapPath, updatedSitemap);
  }

  fs.writeFileSync(OUTPUT_PATH, updatedHtml);

  // Stats
  const filled = BBL_PROSPECTS.filter(p => {
    const r = results[p.name];
    return r.forty || r.vertical || r.broad || r.bench || r.cone || r.shuttle;
  }).length;
  const withMeasure = BBL_PROSPECTS.filter(p => {
    const r = results[p.name];
    return r.height || r.weight;
  }).length;

  console.log(`\n✅ Done! Updated ${OUTPUT_PATH}`);
  console.log(`   📊 ${filled} prospects with athletic testing data`);
  console.log(`   📏 ${withMeasure} prospects with height/weight`);
  console.log(`   📦 ${BBL_PROSPECTS.length} total prospects\n`);
  
  if (filled === 0) {
    console.log('   💡 No combine drill results yet — this is normal before the combine starts.');
    console.log('   💡 Run this script again once drills begin (Thu Feb 26).\n');
    console.log('   💡 You can also add data manually via combine-manual.csv:');
    console.log('      name,pos,school,height,weight,forty,vertical,broad,bench,cone,shuttle');
    console.log('      Fernando Mendoza,QB,Indiana,6-5,225,4.78,30,112,,,\n');
  }
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
