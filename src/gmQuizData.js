import { TEAM_PROFILES } from "./draftConfig.js";

// ============================================================
// GM Quiz — Data & Scoring
// ============================================================

// Current NFL GMs (2026)
const GM_DATA = {
  Raiders:      { gm: "Tom Telesco",         archetype: null },
  Jets:         { gm: "Darren Mougey",       archetype: null },
  Cardinals:    { gm: "Monti Ossenfort",      archetype: null },
  Titans:       { gm: "Mike Borgonzi",        archetype: null },
  Giants:       { gm: "Joe Schoen",           archetype: null },
  Browns:       { gm: "Andrew Berry",         archetype: null },
  Commanders:   { gm: "Adam Peters",          archetype: null },
  Saints:       { gm: "Mickey Loomis",        archetype: null },
  Chiefs:       { gm: "Brett Veach",          archetype: null },
  Bengals:      { gm: "Duke Tobin",           archetype: null },
  Dolphins:     { gm: "Chris Grier",          archetype: null },
  Cowboys:      { gm: "Jerry Jones",          archetype: null },
  Rams:         { gm: "Les Snead",            archetype: null },
  Ravens:       { gm: "Eric DeCosta",         archetype: null },
  Buccaneers:   { gm: "Jason Licht",          archetype: null },
  Lions:        { gm: "Brad Holmes",          archetype: null },
  Vikings:      { gm: "Kwesi Adofo-Mensah",   archetype: null },
  Panthers:     { gm: "Dan Morgan",           archetype: null },
  Steelers:     { gm: "Omar Khan",            archetype: null },
  Chargers:     { gm: "Joe Hortiz",           archetype: null },
  Eagles:       { gm: "Howie Roseman",        archetype: null },
  Bears:        { gm: "Ryan Poles",            archetype: null },
  Bills:        { gm: "Brandon Beane",         archetype: null },
  "49ers":      { gm: "John Lynch",            archetype: null },
  Texans:       { gm: "Nick Caserio",          archetype: null },
  Broncos:      { gm: "George Paton",          archetype: null },
  Patriots:     { gm: "Eliot Wolf",            archetype: null },
  Seahawks:     { gm: "John Schneider",        archetype: null },
  Falcons:      { gm: "Terry Fontenot",        archetype: null },
  Colts:        { gm: "Chris Ballard",         archetype: null },
  Jaguars:      { gm: "Trent Baalke",          archetype: null },
  Packers:      { gm: "Brian Gutekunst",       archetype: null },
};

// Archetype assignment from TEAM_PROFILES dimensions
function assignArchetype(p) {
  if (p.bpaLean >= 0.7 && p.reachTolerance <= 0.2)  return "The Board Loyalist";
  if (p.bpaLean <= 0.45 && p.reachTolerance >= 0.4)  return "The Aggressive Need-Filler";
  if (p.athBoost >= 0.12)                             return "The Athletic Freak Hunter";
  if ((p.ceilingChaser || 0) >= 0.08 && p.variance >= 3) return "The Upside Chaser";
  if (p.sizePremium)                                  return "The Big-Body Builder";
  if (p.variance <= 1 && p.bpaLean >= 0.6)            return "The Disciplined Drafter";
  if (p.variance >= 3 && p.reachTolerance >= 0.4)     return "The Chaotic Trader";
  if (p.bpaLean >= 0.6)                               return "The Board Loyalist";
  if (p.reachTolerance >= 0.35)                       return "The Aggressive Need-Filler";
  return "The Balanced GM";
}

// Populate archetypes from TEAM_PROFILES
Object.keys(GM_DATA).forEach(team => {
  const profile = TEAM_PROFILES[team];
  if (profile) GM_DATA[team].archetype = assignArchetype(profile);
});

// Blurb generator — explains why the user matched this GM
function generateBlurb(team, userProfile) {
  const p = TEAM_PROFILES[team];
  if (!p) return "";
  const gm = GM_DATA[team]?.gm || "this GM";
  const parts = [];

  if (p.bpaLean >= 0.65)
    parts.push(`Like ${gm}, you trust the board over team needs — the best player available is always the right pick.`);
  else if (p.bpaLean <= 0.45)
    parts.push(`Like ${gm}, you draft with purpose — filling roster holes matters more than chasing the highest-graded prospect.`);

  if (p.reachTolerance >= 0.4)
    parts.push("You're not afraid to move up the board when your guy is sitting there.");
  else if (p.reachTolerance <= 0.2)
    parts.push("You have the patience to wait for value instead of reaching.");

  if (p.athBoost >= 0.1)
    parts.push("Combine freaks catch your eye — athleticism is the ultimate separator.");
  if (p.sizePremium)
    parts.push("You believe in building big up front — size wins in the trenches.");
  if ((p.ceilingChaser || 0) >= 0.08)
    parts.push("You chase upside. A player's ceiling matters more than their floor.");
  if (p.variance >= 3)
    parts.push("You embrace risk and aren't afraid of a boom-or-bust pick.");
  else if (p.variance <= 1)
    parts.push("You play it steady — no fireworks, just smart picks that hit.");

  return parts.slice(0, 3).join(" ");
}

// ============================================================
// 10 Quiz Questions
// ============================================================
// Each answer has deltas: { dimension: value }
// These accumulate into a raw user profile vector

export const QUIZ_QUESTIONS = [
  // Q1: bpaLean
  {
    question: "You're picking 6th overall. The best player on your board is a QB — but you just signed one in free agency. Your next 5 biggest needs are all in the top 40.",
    theme: "BPA QB vs filling 5 holes",
    options: [
      { text: "Take the QB anyway. Best player, period.", deltas: { bpaLean: 3.0, stage: -1.0 } },
      { text: "Trade back, collect picks, fill multiple holes.", deltas: { bpaLean: -1.5, variance: 1.5, stage: -1.5 } },
      { text: "Take the best non-QB on the board.", deltas: { bpaLean: 1.5 } },
      { text: "Draft my biggest need — we can't waste another year.", deltas: { bpaLean: -2.5, variance: -1.0, stage: 1.5 } },
    ]
  },
  // Q2: athBoost + ceilingChaser
  {
    question: "Two DBs on the board. One ran a 4.28 with a 42\" vert but is raw in coverage. The other is a 4.48 technician who never missed an assignment in college.",
    theme: "Raw freak vs polished DB",
    options: [
      { text: "The 4.28 freak. You can't teach speed.", deltas: { athBoost: 2.5, ceilingChaser: 1.5 } },
      { text: "The technician. Give me the sure thing.", deltas: { athBoost: -1.5, ceilingChaser: -1.5, bpaLean: 0.5 } },
      { text: "The freak — but only if we have a great DB coach.", deltas: { athBoost: 1.5, ceilingChaser: 0.5 } },
      { text: "Whoever my scouts have ranked higher overall.", deltas: { bpaLean: 1.5 } },
    ]
  },
  // Q3: reachTolerance + bpaLean
  {
    question: "Your top-rated edge rusher is projected to go 12 picks after yours. Everyone says he'll be there later. But he's your guy.",
    theme: "Reach for your guy?",
    options: [
      { text: "Take him now. I'm not risking it.", deltas: { reachTolerance: 2.5, bpaLean: -1.0 } },
      { text: "Trade back a few spots and still grab him.", deltas: { reachTolerance: 1.0, variance: 0.5 } },
      { text: "Wait. Take the best player at my current pick.", deltas: { reachTolerance: -2.0, bpaLean: 2.0 } },
      { text: "Call teams behind me — if someone's interested, I'll move.", deltas: { reachTolerance: -0.5, variance: 1.0 } },
    ]
  },
  // Q4: sizePremium + athBoost
  {
    question: "Two edge rushers. One is 6'5\" 270 with long arms and a power-first game. The other is 6'2\" 240 but has the best first step and bend in the class.",
    theme: "Power vs finesse edge",
    options: [
      { text: "The 6'5\" 270 mauler. Size wins in the NFL.", deltas: { sizePremium: 3.0 } },
      { text: "The bendy edge. Get-off and bend create sacks.", deltas: { sizePremium: -2.0, athBoost: 2.0 } },
      { text: "Whoever grades higher on my board, regardless of build.", deltas: { bpaLean: 1.5, sizePremium: -0.5 } },
      { text: "The big guy — he can learn to bend, but you can't teach 6'5\".", deltas: { sizePremium: 2.0, ceilingChaser: 0.5 } },
    ]
  },
  // Q5: ceilingChaser + variance
  {
    question: "There's a WR prospect who totaled 100 yards across his three best opponents, then exploded for a 1,600-yard season. Elite tools, inconsistent production. Your scouts are split 50/50.",
    theme: "Boom or bust prospect",
    options: [
      { text: "Smash pick. That ceiling is worth the risk.", deltas: { ceilingChaser: 2.5, variance: 2.0, stage: -1.0 } },
      { text: "Pass. Inconsistency is a red flag I can't ignore.", deltas: { ceilingChaser: -2.0, variance: -1.5, stage: 1.0 } },
      { text: "Take him, but only in Round 2 or later.", deltas: { ceilingChaser: 1.0, variance: 0.5 } },
      { text: "Bring him in for a private workout first. Need more data.", deltas: { ceilingChaser: 0.5, variance: -0.5, stage: 0.5 } },
    ]
  },
  // Q6: bpaLean + variance
  {
    question: "The best player on your board is a running back. Your fan base and media will roast you for taking a RB this high. But he's clearly the best prospect left.",
    theme: "BPA is a RB",
    options: [
      { text: "Take the RB. I draft players, not positions.", deltas: { bpaLean: 2.5, variance: 1.0 } },
      { text: "No chance. RBs don't justify high picks anymore.", deltas: { bpaLean: -2.0, variance: -1.0 } },
      { text: "Trade back. If he's there 8 picks later, I'll take him.", deltas: { bpaLean: 0.5, variance: 0.5, reachTolerance: -0.5 } },
      { text: "Take the next best player at a premium position.", deltas: { bpaLean: -0.5, sizePremium: 0.5 } },
    ]
  },
  // Q7: athBoost + reachTolerance
  {
    question: "A mid-round WR just ran a 4.31 at the combine and is climbing boards. He was a Day 3 guy two weeks ago. Your pick is 15 spots away.",
    theme: "Combine riser WR",
    options: [
      { text: "I'm taking him. That speed changes everything.", deltas: { athBoost: 2.0, reachTolerance: 2.0 } },
      { text: "Interesting, but I don't chase combine hype.", deltas: { athBoost: -1.5, reachTolerance: -1.0, bpaLean: 0.5 } },
      { text: "He's on my radar now, but film still matters most.", deltas: { athBoost: 0.5, reachTolerance: -0.5 } },
      { text: "Love the speed. I'll take him if he falls to me, no reach.", deltas: { athBoost: 1.5, reachTolerance: -1.5 } },
    ]
  },
  // Q8: variance + ceilingChaser
  {
    question: "You have two first-round picks. Do you play it safe with two reliable starters, or gamble one pick on a potential All-Pro who could also bust?",
    theme: "Two 1sts strategy",
    options: [
      { text: "Gamble one. The All-Pro upside is worth one miss.", deltas: { variance: 3.0, ceilingChaser: 2.0 } },
      { text: "Two safe starters. Build a foundation, not a lottery ticket.", deltas: { variance: -2.5, ceilingChaser: -1.5, stage: -1.0 } },
      { text: "Take the higher-graded prospect regardless of risk profile.", deltas: { bpaLean: 1.5, variance: 0.5, stage: 0.5 } },
      { text: "Trade one pick for future capital. Spread the risk.", deltas: { variance: 1.0, reachTolerance: 0.5, stage: -0.5 } },
    ]
  },
  // Q9: reachTolerance + bpaLean
  {
    question: "You desperately need a left tackle. There's an elite raw talent with a high ceiling but he's projected to go 20 picks later. There's also a higher-floor, lower-ceiling OT right at your pick.",
    theme: "Reach for upside OT or take the safe one?",
    options: [
      { text: "Take the safe OT now. We need a tackle TODAY.", deltas: { reachTolerance: 2.0, bpaLean: -2.0 } },
      { text: "Take BPA and pray the raw OT falls to me later.", deltas: { reachTolerance: -2.0, bpaLean: 2.5 } },
      { text: "Trade down to bridge the gap and grab the high-ceiling guy.", deltas: { reachTolerance: -0.5, variance: 1.0, ceilingChaser: 0.5 } },
      { text: "Reach for the upside OT. I'd rather swing on ceiling.", deltas: { reachTolerance: 1.5, ceilingChaser: 1.5 } },
    ]
  },
  // Q10: variance + reachTolerance
  {
    question: "Draft night, Round 1. Your phone is ringing — a team wants your pick. You don't have any must-have targets left on the board.",
    theme: "Trade back or stay?",
    options: [
      { text: "Trade back. Stockpile picks when there's no clear target.", deltas: { variance: 2.0, reachTolerance: -1.5, stage: -1.5 } },
      { text: "Stay put. Take the best player available, trust the board.", deltas: { variance: -1.0, bpaLean: 2.0, stage: 0.5 } },
      { text: "Depends on the offer. I need at least a future first.", deltas: { variance: 1.0, reachTolerance: 0.5 } },
      { text: "Trade UP. Find a target higher and go get him.", deltas: { variance: 2.5, reachTolerance: 2.5, stage: 1.0 } },
    ]
  },
];

// ============================================================
// Scoring Engine
// ============================================================

const DIMS = ["bpaLean", "reachTolerance", "athBoost", "sizePremium", "ceilingChaser", "variance", "stage"];
const DIM_WEIGHTS = { bpaLean: 2.0, reachTolerance: 1.5, variance: 1.5, athBoost: 1.2, ceilingChaser: 1.0, sizePremium: 0.8, stage: 0.6 };
const STAGE_MAP = { rebuild: 0, retool: 0.33, contend: 0.67, dynasty: 1 };

// Compute observed min/max across all 32 TEAM_PROFILES
function getProfileBounds() {
  const mins = {}, maxs = {};
  DIMS.forEach(d => { mins[d] = Infinity; maxs[d] = -Infinity; });
  Object.values(TEAM_PROFILES).forEach(p => {
    DIMS.forEach(d => {
      const v = d === "sizePremium" ? (p[d] ? 1 : 0) : d === "stage" ? (STAGE_MAP[p[d]] ?? 0.5) : (p[d] || 0);
      if (v < mins[d]) mins[d] = v;
      if (v > maxs[d]) maxs[d] = v;
    });
  });
  return { mins, maxs };
}

const BOUNDS = getProfileBounds();

function normalize(val, dim) {
  const range = BOUNDS.maxs[dim] - BOUNDS.mins[dim];
  if (range === 0) return 0.5;
  return Math.max(0, Math.min(1, (val - BOUNDS.mins[dim]) / range));
}

function normalizeProfile(raw) {
  const out = {};
  DIMS.forEach(d => { out[d] = normalize(raw[d] || 0, d); });
  return out;
}

// Compute per-dimension min/max achievable from quiz answers
// For each question, find the min and max delta per dimension, then sum across questions
function getQuizBounds() {
  const qMin = {}, qMax = {};
  DIMS.forEach(d => { qMin[d] = 0; qMax[d] = 0; });
  QUIZ_QUESTIONS.forEach(q => {
    const dimMin = {}, dimMax = {};
    DIMS.forEach(d => { dimMin[d] = 0; dimMax[d] = 0; });
    q.options.forEach(opt => {
      Object.entries(opt.deltas).forEach(([dim, val]) => {
        if (dim in dimMin) {
          if (val < dimMin[dim]) dimMin[dim] = val;
          if (val > dimMax[dim]) dimMax[dim] = val;
        }
      });
    });
    DIMS.forEach(d => { qMin[d] += dimMin[d]; qMax[d] += dimMax[d]; });
  });
  return { qMin, qMax };
}

const QUIZ_BOUNDS = getQuizBounds();

// Weighted Euclidean distance (lower = better match)
function weightedDistance(a, b) {
  let sum = 0;
  DIMS.forEach(d => {
    const w = DIM_WEIGHTS[d] || 1;
    const diff = ((a[d] || 0) - (b[d] || 0)) * w;
    sum += diff * diff;
  });
  return Math.sqrt(sum);
}

// Main scoring: accumulate answer deltas → normalize to [0,1] → distance match
export function scoreQuiz(answers) {
  // answers: array of 10 delta objects (one per question)
  const raw = {};
  DIMS.forEach(d => { raw[d] = 0; });
  answers.forEach(deltas => {
    Object.entries(deltas).forEach(([dim, val]) => {
      if (dim in raw) raw[dim] += val;
    });
  });

  // Normalize user vector to [0,1] using actual quiz min/max range
  const userNorm = {};
  DIMS.forEach(d => {
    const lo = QUIZ_BOUNDS.qMin[d];
    const hi = QUIZ_BOUNDS.qMax[d];
    const range = hi - lo;
    if (range === 0) { userNorm[d] = 0.5; return; }
    userNorm[d] = Math.max(0, Math.min(1, (raw[d] - lo) / range));
  });

  // Score against all 32 teams using weighted Euclidean distance
  const results = [];
  Object.entries(TEAM_PROFILES).forEach(([team, profile]) => {
    const teamNorm = {};
    DIMS.forEach(d => {
      teamNorm[d] = normalize(d === "sizePremium" ? (profile[d] ? 1 : 0) : d === "stage" ? (STAGE_MAP[profile[d]] ?? 0.5) : (profile[d] || 0), d);
    });
    const dist = weightedDistance(userNorm, teamNorm);
    results.push({ team, distance: dist });
  });

  results.sort((a, b) => a.distance - b.distance);

  // Convert distance to match percentage and enrich top 5
  const maxDist = Math.sqrt(DIMS.reduce((s, d) => s + (DIM_WEIGHTS[d] || 1) ** 2, 0));
  const top5 = results.slice(0, 5).map(r => {
    const gmInfo = GM_DATA[r.team] || {};
    return {
      ...r,
      matchPct: Math.max(0, Math.min(99, Math.round((1 - r.distance / maxDist) * 100))),
      gm: gmInfo.gm || "Unknown GM",
      archetype: gmInfo.archetype || "The Balanced GM",
      blurb: generateBlurb(r.team, userNorm),
    };
  });

  const best = top5[0];

  return {
    team: best.team,
    gm: best.gm,
    archetype: best.archetype,
    matchPct: best.matchPct,
    blurb: best.blurb,
    userProfile: userNorm,
    allResults: top5,
  };
}

export { GM_DATA, DIMS };
