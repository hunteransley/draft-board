import { getProspectStats } from "./prospectStats.js";

// Linear interpolation between breakpoints: [[input, output], ...]
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

// Parse defensive stat line: "XX tkl, X.X tfl, X.X sck, X pd, X TD"
function parseDef(s) {
  if (!s) return {};
  const n = (rx) => { const m = s.match(rx); return m ? parseFloat(m[1]) : 0; };
  return {
    tkl: n(/([\d.]+)\s*tkl/),
    tfl: n(/([\d.]+)\s*tfl/),
    sck: n(/([\d.]+)\s*sck/),
    pd: n(/([\d.]+)\s*pd/),
    td: n(/([\d.]+)\s*TD/),
  };
}

// Parse QB stat line: "273/379, 3535 yds, 41 TD, 6 INT"
function parseQB(stat, extra) {
  if (!stat) return {};
  const m = stat.match(/(\d+)\s*\/\s*(\d+),\s*([\d.]+)\s*yds?,\s*(\d+)\s*TD,\s*(\d+)\s*INT/);
  if (!m) return {};
  const comp = +m[1], att = +m[2], yds = +m[3], td = +m[4], int_ = +m[5];
  const r = { comp_pct: att > 0 ? (comp / att) * 100 : 0, yds, td, int: int_, ypa: att > 0 ? yds / att : 0 };
  if (extra) {
    const rm = extra.match(/([\d.]+)\s*rush\s*yds?/i);
    if (rm) r.rush_yds = +rm[1];
    const rtd = extra.match(/([\d.]+)\s*TD/);
    if (rtd) r.rush_td = +rtd[1];
  }
  return r;
}

// Parse RB stat line: "199 car, 1372 yds, 18 TD" or "51 rec, 941 yds, 6 TD"
function parseRB(stat, extra) {
  if (!stat) return {};
  const r = {};
  const car = stat.match(/([\d.]+)\s*car/);
  if (car) {
    r.car = +car[1];
    const yds = stat.match(/([\d.]+)\s*yds/);
    if (yds) r.yds = +yds[1];
    const td = stat.match(/([\d.]+)\s*TD/);
    if (td) r.td = +td[1];
    if (r.car > 0 && r.yds) r.ypc = r.yds / r.car;
  }
  if (extra) {
    const rec = extra.match(/([\d.]+)\s*rec/);
    if (rec) r.rec = +rec[1];
  }
  return r;
}

// Parse WR/TE stat line: "51 rec, 875 yds, 9 TD"
function parseRec(stat) {
  if (!stat) return {};
  const r = {};
  const rec = stat.match(/([\d.]+)\s*rec/);
  if (rec) r.rec = +rec[1];
  const yds = stat.match(/([\d.]+)\s*yds/);
  if (yds) r.yds = +yds[1];
  const td = stat.match(/([\d.]+)\s*TD/);
  if (td) r.td = +td[1];
  if (r.rec > 0 && r.yds) r.ypr = r.yds / r.rec;
  return r;
}

// Cache to avoid re-parsing
const cache = new Map();

export function getStatBasedTraits(name, school) {
  const key = `${name}|${school}`;
  if (cache.has(key)) return cache.get(key);

  const ps = getProspectStats(name, school);
  if (!ps || !ps.gpos) { cache.set(key, null); return null; }

  const pos = ps.gpos;
  const stat = ps.statLine || "";
  const extra = ps.statExtra || "";
  let traits = null;

  if (pos === "QB") {
    const p = parseQB(stat, extra);
    if (p.comp_pct) {
      traits = {};
      traits["Accuracy"] = lerp(p.comp_pct, [[55,40],[62,55],[67,70],[72,85],[76,95]]);
      if (p.int > 0) traits["Decision Making"] = lerp(p.td / p.int, [[1.5,45],[2.5,60],[3.5,75],[5.0,85],[7.0,95]]);
      else if (p.td > 0) traits["Decision Making"] = 95;
      traits["Arm Strength"] = lerp(p.ypa, [[6.0,40],[7.0,55],[8.0,70],[9.0,82],[10.0,92]]);
      if (p.rush_yds != null) traits["Mobility"] = lerp(p.rush_yds, [[50,40],[150,55],[300,70],[500,82],[800,95]]);
    }
  }

  else if (pos === "RB") {
    const p = parseRB(stat, extra);
    if (p.ypc || p.car) {
      traits = {};
      if (p.ypc) traits["Vision"] = lerp(p.ypc, [[3.5,40],[4.5,55],[5.5,70],[6.5,85],[7.5,95]]);
      if (p.car) traits["Power"] = lerp(p.car, [[100,45],[150,55],[200,68],[250,80],[300,90]]);
      if (p.rec != null) traits["Pass Catching"] = lerp(p.rec, [[5,35],[15,50],[30,65],[45,80],[60,92]]);
      if (p.ypc) {
        let e = lerp(p.ypc, [[3.5,40],[4.5,55],[5.5,70],[6.5,85],[7.5,95]]);
        if (p.td >= 10) e = Math.min(99, e + 5);
        traits["Elusiveness"] = e;
      }
    }
  }

  else if (pos === "WR") {
    const p = parseRec(stat);
    if (p.rec) {
      traits = {};
      if (p.ypr) traits["Route Running"] = lerp(p.ypr, [[8,35],[11,50],[14,65],[17,80],[20,92]]);
      traits["Hands"] = lerp(p.rec, [[20,40],[40,55],[60,70],[80,82],[100,92]]);
      if (p.td != null) traits["Speed"] = lerp(p.td, [[2,35],[5,50],[8,65],[12,80],[16,92]]);
    }
  }

  else if (pos === "TE") {
    const p = parseRec(stat);
    if (p.rec) {
      traits = {};
      traits["Receiving"] = lerp(p.rec, [[20,40],[40,55],[60,70],[80,82],[100,92]]);
      if (p.ypr) traits["Route Running"] = lerp(p.ypr, [[6,35],[9,50],[12,65],[15,80],[18,92]]);
      traits["Blocking"] = 55;
    }
  }

  else if (pos === "EDGE") {
    const p = parseDef(stat);
    if (p.tkl || p.sck) {
      traits = {};
      traits["Pass Rush"] = lerp(p.sck, [[2,35],[5,52],[8,68],[11,82],[14,93]]);
      traits["First Step"] = lerp(p.tfl, [[3,38],[7,55],[11,70],[15,83],[19,93]]);
      traits["Motor"] = lerp(p.tkl, [[15,38],[30,52],[45,68],[60,82],[75,93]]);
    }
  }

  else if (pos === "DL" || pos === "IDL" || pos === "DT" || pos === "NT") {
    const p = parseDef(stat);
    if (p.tkl || p.sck) {
      traits = {};
      traits["Pass Rush"] = lerp(p.sck, [[1,35],[3,52],[5,68],[7,82],[10,93]]);
      traits["First Step"] = lerp(p.tfl, [[3,38],[7,55],[11,70],[15,83],[19,93]]);
      traits["Motor"] = lerp(p.tkl, [[20,42],[35,58],[50,72],[65,84]]);
    }
  }

  else if (pos === "LB" || pos === "ILB" || pos === "OLB") {
    const p = parseDef(stat);
    if (p.tkl) {
      traits = {};
      traits["Tackling"] = lerp(p.tkl, [[30,38],[50,52],[70,68],[90,82],[110,93]]);
      traits["Pass Rush"] = lerp(p.sck + p.tfl, [[2,38],[5,52],[9,68],[14,82],[20,95]]);
      traits["Coverage"] = lerp(p.pd, [[0,42],[2,55],[4,68],[7,80],[10,92]]);
    }
  }

  else if (pos === "CB") {
    const p = parseDef(stat);
    if (p.tkl || p.pd) {
      traits = {};
      traits["Ball Skills"] = lerp(p.pd, [[1,38],[4,55],[7,70],[10,82],[14,93]]);
      traits["Tackling"] = lerp(p.tkl, [[15,38],[30,55],[45,70],[60,82]]);
    }
  }

  else if (pos === "S" || pos === "FS" || pos === "SS") {
    const p = parseDef(stat);
    if (p.tkl || p.pd) {
      traits = {};
      traits["Ball Skills"] = lerp(p.pd, [[1,38],[4,55],[7,70],[10,82],[14,93]]);
      traits["Tackling"] = lerp(p.tkl, [[25,40],[45,55],[65,72],[85,85]]);
    }
  }

  cache.set(key, traits);
  return traits;
}
