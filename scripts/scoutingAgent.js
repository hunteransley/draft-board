#!/usr/bin/env node
// Scouting Trait Extraction Agent
// Scrapes public scouting reports, sends to Anthropic API for trait grading,
// outputs results to scripts/scouting-results.json for review.
// Never writes to src/scoutingTraits.json.

import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import Anthropic from "@anthropic-ai/sdk";

// ── Load .env ────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const envPath = join(ROOT, ".env");
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

// ── Constants ────────────────────────────────────────────────
const POSITION_TRAITS = {
  QB: ["Arm Strength", "Accuracy", "Pocket Presence", "Mobility", "Decision Making", "Leadership"],
  RB: ["Vision", "Contact Balance", "Power", "Elusiveness", "Pass Catching", "Speed"],
  WR: ["Route Running", "Separation", "Hands", "YAC Ability", "Speed", "Contested Catches"],
  TE: ["Receiving", "Route Running", "Blocking", "Athleticism", "Hands", "Speed"],
  OT: ["Pass Protection", "Run Blocking", "Footwork", "Anchor", "Athleticism", "Strength"],
  IOL: ["Pass Protection", "Run Blocking", "Pulling", "Strength", "Anchor", "Versatility"],
  EDGE: ["Pass Rush", "Bend", "First Step", "Power", "Motor", "Run Defense"],
  DL: ["Pass Rush", "Run Defense", "First Step", "Hand Usage", "Motor", "Strength"],
  LB: ["Tackling", "Coverage", "Pass Rush", "Instincts", "Athleticism", "Range"],
  CB: ["Man Coverage", "Ball Skills", "Zone Coverage", "Speed", "Press", "Nickel"],
  S: ["Man Coverage", "Range", "Ball Skills", "Tackling", "Speed", "Nickel"],
  "K/P": ["Leg Strength", "Accuracy", "Consistency", "Clutch", "Directional Control", "Hang Time"],
};

const VALID_CEILINGS = ["elite", "high", "normal", "capped"];

// ── Helpers (from scoutingData.js / export-traits-csv.mjs) ──
function normalize(name) {
  return name.toLowerCase().replace(/\./g, "").replace(/\s+(jr|sr|ii|iii|iv|v)\s*$/i, "").replace(/\s+/g, " ").trim();
}

function makeKey(name, school) {
  return normalize(name) + "|" + school.toLowerCase().replace(/\s+/g, " ").trim();
}

function posKey(gpos) {
  if (POSITION_TRAITS[gpos]) return gpos;
  if (gpos === "IDL" || gpos === "DT" || gpos === "NT") return "DL";
  if (gpos === "ILB" || gpos === "OLB") return "LB";
  if (gpos === "FS" || gpos === "SS") return "S";
  if (gpos === "OL") return "OT";
  if (gpos === "DB") return "CB";
  return null;
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[.']/g, "")
    .replace(/\s+(jr|sr|ii|iii|iv|v)$/i, "")
    .replace(/\s+/g, "-")
    .trim();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function randomDelay() {
  return 2000 + Math.random() * 1000; // 2-3s
}

// ── ANSI Colors ──────────────────────────────────────────────
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
  gray: "\x1b[90m",
};

// ── Parse Prospects from App.jsx ─────────────────────────────
function loadProspects() {
  const appSrc = readFileSync(join(ROOT, "src/App.jsx"), "utf8");
  const matches = [...appSrc.matchAll(/\{name:"([^"]+)",school:"([^"]+)",pos:"([^"]+)"\}/g)];
  return matches.map((m) => ({ name: m[1], school: m[2], pos: m[3] }));
}

// ── Load existing scouting traits ────────────────────────────
function loadExistingTraits() {
  const path = join(ROOT, "src/scoutingTraits.json");
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, "utf8"));
}

// ── Source Registry ──────────────────────────────────────────
const SOURCES = [
  {
    name: "NFL.com",
    id: "nfl",
    requiresPuppeteer: true,
    enabled: true,
    buildUrl(prospect) {
      const parts = prospect.name.toLowerCase().replace(/[.']/g, "").replace(/\s+(jr|sr|ii|iii|iv|v)$/i, "").trim().split(/\s+/);
      const slug = parts.join("-");
      return `https://www.nfl.com/prospects/${slug}/`;
    },
    extractText(html) {
      // Look for scouting report sections
      const sections = [];
      // Match prospect profile/overview/analysis content
      const profileMatch = html.match(/class="[^"]*prospect[^"]*"[^>]*>([\s\S]*?)<\/(?:section|div)>/gi);
      if (profileMatch) {
        for (const block of profileMatch) {
          const text = block.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
          if (text.length > 50) sections.push(text);
        }
      }
      // Also try overview/analysis sections
      const overviewMatch = html.match(/(?:overview|analysis|scouting\s*report|strengths|weaknesses)[^>]*>([\s\S]*?)<\/(?:section|div|article)>/gi);
      if (overviewMatch) {
        for (const block of overviewMatch) {
          const text = block.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
          if (text.length > 50) sections.push(text);
        }
      }
      const combined = sections.join("\n\n");
      return combined.length > 50 ? combined : null;
    },
  },
  {
    name: "NFL Draft Buzz",
    id: "draftbuzz",
    requiresPuppeteer: false,
    enabled: true,
    buildUrl(prospect) {
      const parts = prospect.name.replace(/[.']/g, "").trim().split(/\s+/);
      const first = encodeURIComponent(parts[0]);
      const last = encodeURIComponent(parts.slice(1).join("-"));
      const school = encodeURIComponent(prospect.school.replace(/\s+/g, "-"));
      return `https://www.nfldraftbuzz.com/Player/${first}-${last}/${school}`;
    },
    extractText(html) {
      // Look for article body / scouting report content
      const bodyMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
        html.match(/class="[^"]*(?:player-bio|scouting|report|analysis)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi);
      if (bodyMatch) {
        const text = (Array.isArray(bodyMatch) ? bodyMatch.map((b) => b.replace(/<[^>]+>/g, " ")).join(" ") : bodyMatch[1].replace(/<[^>]+>/g, " "))
          .replace(/\s+/g, " ")
          .trim();
        return text.length > 50 ? text : null;
      }
      return null;
    },
  },
  {
    name: "CBS Sports",
    id: "cbs",
    requiresPuppeteer: false,
    enabled: true,
    buildUrl(prospect) {
      const slug = slugify(prospect.name);
      return `https://www.cbssports.com/nfl/draft/players/${slug}/`;
    },
    extractText(html) {
      const match = html.match(/class="[^"]*(?:player-bio|prospect|scouting|analysis)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|section)>/gi);
      if (match) {
        const text = match.map((b) => b.replace(/<[^>]+>/g, " ")).join(" ").replace(/\s+/g, " ").trim();
        return text.length > 50 ? text : null;
      }
      return null;
    },
  },
  {
    name: "FOX Sports",
    id: "fox",
    requiresPuppeteer: true,
    enabled: true,
    buildUrl(prospect) {
      const slug = slugify(prospect.name);
      return `https://www.foxsports.com/nfl-draft/prospects/${slug}`;
    },
    extractText(html) {
      const match = html.match(/class="[^"]*(?:prospect|bio|scouting|analysis)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|section)>/gi);
      if (match) {
        const text = match.map((b) => b.replace(/<[^>]+>/g, " ")).join(" ").replace(/\s+/g, " ").trim();
        return text.length > 50 ? text : null;
      }
      return null;
    },
  },
  {
    name: "The Athletic",
    id: "athletic",
    requiresPuppeteer: false,
    enabled: true,
    buildUrl(prospect) {
      const query = encodeURIComponent(`${prospect.name} ${prospect.school} NFL draft scouting report`);
      return `https://www.nytimes.com/athletic/search/?q=${query}`;
    },
    extractText(html) {
      // Free preview text from search results
      const snippets = [];
      const matches = html.matchAll(/class="[^"]*(?:snippet|preview|excerpt|description)[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/gi);
      for (const m of matches) {
        const text = m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        if (text.length > 30) snippets.push(text);
      }
      const combined = snippets.join("\n");
      return combined.length > 50 ? combined : null;
    },
  },
];

// ── Fetch Helpers ────────────────────────────────────────────
let browser = null;

async function launchBrowser() {
  if (browser) return browser;
  const puppeteer = await import("puppeteer");
  browser = await puppeteer.default.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  return browser;
}

async function closeBrowser() {
  if (browser) {
    try {
      await browser.close();
    } catch (_) {}
    browser = null;
  }
}

async function fetchWithPuppeteer(url) {
  const b = await launchBrowser();
  let page;
  try {
    page = await b.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
    // Wait a bit for JS rendering
    await sleep(2000);
    const html = await page.content();
    return html;
  } catch (err) {
    if (err.message && err.message.includes("Target closed")) {
      // Browser crashed, relaunch
      browser = null;
      const b2 = await launchBrowser();
      page = await b2.newPage();
      await page.setUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      );
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
      await sleep(2000);
      return await page.content();
    }
    throw err;
  } finally {
    if (page) {
      try {
        await page.close();
      } catch (_) {}
    }
  }
}

async function fetchWithHttp(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// ── Fetch All Sources for a Prospect ─────────────────────────
async function fetchAllSources(prospect) {
  const results = [];
  const sourceStats = {};

  for (const source of SOURCES) {
    if (!source.enabled) continue;

    const url = source.buildUrl(prospect);
    let text = null;
    let charCount = 0;

    try {
      const html = source.requiresPuppeteer
        ? await fetchWithPuppeteer(url)
        : await fetchWithHttp(url);

      if (html) {
        text = source.extractText(html);
        if (text) charCount = text.length;
      }
    } catch (err) {
      // Log and continue
    }

    if (text) {
      console.log(`  ${c.green}[+]${c.reset} ${source.name} — ${charCount} chars`);
      results.push({ source: source.name, text });
    } else {
      console.log(`  ${c.red}[-]${c.reset} ${source.name} — not found`);
    }

    sourceStats[source.name] = text ? charCount : 0;

    // Delay between requests
    await sleep(randomDelay());
  }

  return { results, sourceStats };
}

// ── Anthropic API ────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an NFL scouting analyst. Grade prospects on a 0-100 scale:
  95-100: Generational/elite
  88-94: Pro Bowl caliber
  80-87: Solid starter
  72-79: Day 2 pick, competent
  65-71: Rotational, developmental
  55-64: Backup caliber
  45-54: Below average
  <45: Serious deficiency

Also assess ceiling: "elite" / "high" / "normal" / "capped"

You must respond with ONLY valid JSON. No markdown, no explanation, no backticks.`;

function buildUserPrompt(prospect, posTraits, sourceTexts) {
  const traitList = posTraits.join(", ");
  let sourceSections = "";
  for (const { source, text } of sourceTexts) {
    sourceSections += `\n--- Source: ${source} ---\n${text}\n`;
  }

  return `Grade ${prospect.name} (${prospect.pos}, ${prospect.school}) on EXACTLY these traits: ${traitList}

Scouting reports:
${sourceSections}
Respond with ONLY valid JSON:
{ ${posTraits.map((t) => `"${t}": <0-100>`).join(", ")}, "__ceiling": "<elite|high|normal|capped>" }`;
}

async function callAnthropic(client, prospect, posTraits, sourceTexts) {
  const userPrompt = buildUserPrompt(prospect, posTraits, sourceTexts);

  let response;
  try {
    response = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 256,
      temperature: 0.1,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });
  } catch (err) {
    if (err.status === 429) {
      console.log(`  ${c.yellow}[!]${c.reset} Rate limited, waiting 5s...`);
      await sleep(5000);
      response = await client.messages.create({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 256,
        temperature: 0.1,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      });
    } else {
      throw err;
    }
  }

  const rawText = response.content[0]?.text || "";

  // Try to parse JSON — strip any backticks/markdown
  const cleaned = rawText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Retry once
    console.log(`  ${c.yellow}[!]${c.reset} JSON parse failed, retrying...`);
    try {
      const retry = await client.messages.create({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 256,
        temperature: 0.0,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      });
      const retryText = retry.content[0]?.text || "";
      const retryCleaned = retryText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      parsed = JSON.parse(retryCleaned);
    } catch {
      console.log(`  ${c.red}[✗]${c.reset} JSON parse failed after retry, skipping`);
      return null;
    }
  }

  // Validate: strip unknown keys, clamp values
  const validated = {};
  for (const trait of posTraits) {
    if (trait in parsed && typeof parsed[trait] === "number") {
      validated[trait] = Math.max(0, Math.min(100, Math.round(parsed[trait])));
    }
  }

  if (parsed.__ceiling && VALID_CEILINGS.includes(parsed.__ceiling)) {
    validated.__ceiling = parsed.__ceiling;
  }

  return validated;
}

// ── Diff Helpers ─────────────────────────────────────────────
function computeDiff(extracted, existing) {
  const diff = {};
  for (const [key, val] of Object.entries(extracted)) {
    if (key === "__ceiling") {
      if (existing.__ceiling && existing.__ceiling !== val) {
        diff.__ceiling = `${existing.__ceiling} → ${val}`;
      } else if (!existing.__ceiling) {
        diff.__ceiling = `NEW: ${val}`;
      }
      continue;
    }
    if (key in existing) {
      const delta = val - existing[key];
      if (delta !== 0) {
        diff[key] = delta > 0 ? `+${delta}` : `${delta}`;
      }
    } else {
      diff[key] = `NEW: ${val}`;
    }
  }
  return diff;
}

function printProspectSummary(prospect, extracted, existing, isNew) {
  console.log(`\n${c.green}[✓]${c.reset} ${c.bold}${prospect.name}${c.reset} (${prospect.pos}, ${prospect.school})`);

  const pk = posKey(prospect.pos);
  const traits = pk ? POSITION_TRAITS[pk] : [];

  for (const trait of traits) {
    if (!(trait in extracted)) continue;
    const newVal = extracted[trait];

    if (isNew || !(trait in existing)) {
      console.log(`    ${trait}: ${c.cyan}${newVal}${c.reset} ${c.dim}(new)${c.reset}`);
    } else {
      const oldVal = existing[trait];
      const delta = newVal - oldVal;
      if (delta === 0) {
        console.log(`    ${trait}: ${oldVal} ${c.dim}(unchanged)${c.reset}`);
      } else {
        const arrow = delta > 0 ? `${c.green}+${delta}${c.reset}` : `${c.red}${delta}${c.reset}`;
        const flag = Math.abs(delta) >= 5 ? ` ${c.yellow}← DISAGREES${c.reset}` : "";
        console.log(`    ${trait}: ${oldVal} → ${newVal} (${arrow})${flag}`);
      }
    }
  }

  // Ceiling
  if (extracted.__ceiling) {
    if (isNew || !existing.__ceiling) {
      console.log(`    Ceiling: ${c.magenta}${extracted.__ceiling}${c.reset} ${c.dim}(new)${c.reset}`);
    } else if (existing.__ceiling !== extracted.__ceiling) {
      const label = extracted.__ceiling === "elite" || (existing.__ceiling === "normal" && extracted.__ceiling === "high")
        ? `${c.green}← UPGRADE${c.reset}`
        : `${c.yellow}← CHANGE${c.reset}`;
      console.log(`    Ceiling: ${existing.__ceiling} → ${c.magenta}${extracted.__ceiling}${c.reset} ${label}`);
    }
  }

  if (isNew) {
    console.log(`    ${c.cyan}NEW PROSPECT${c.reset}`);
  }
}

// ── CLI Parsing ──────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { position: null, prospect: null };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--position" && args[i + 1]) {
      opts.position = args[++i].toUpperCase();
    } else if (args[i] === "--prospect" && args[i + 1]) {
      opts.prospect = args[++i];
    }
  }
  return opts;
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  const opts = parseArgs();

  // Check API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(`${c.red}Error:${c.reset} ANTHROPIC_API_KEY not set.`);
    console.error(`Add it to ${c.cyan}.env${c.reset} file: ANTHROPIC_API_KEY=sk-ant-...`);
    process.exit(1);
  }

  const client = new Anthropic();

  // Load prospects
  let prospects = loadProspects();
  const existingTraits = loadExistingTraits();

  // Filter by position
  if (opts.position) {
    const filterPos = opts.position;
    prospects = prospects.filter((p) => {
      const pk = posKey(p.pos);
      return p.pos.toUpperCase() === filterPos || (pk && pk === filterPos);
    });
  }

  // Filter by single prospect
  if (opts.prospect) {
    const target = opts.prospect.toLowerCase();
    prospects = prospects.filter((p) => p.name.toLowerCase().includes(target));
  }

  if (prospects.length === 0) {
    console.error(`${c.red}No prospects found matching filters.${c.reset}`);
    process.exit(1);
  }

  console.log(`\n${c.bold}🔍 Scouting Agent — 2026 NFL Draft${c.reset}`);
  console.log(`   ${prospects.length} prospect${prospects.length !== 1 ? "s" : ""} to process`);
  if (opts.position) console.log(`   Position filter: ${opts.position}`);
  if (opts.prospect) console.log(`   Name filter: "${opts.prospect}"`);
  console.log();

  const results = {};
  const sourceHits = {};
  let prospectsProcessed = 0;
  let totalTraitsExtracted = 0;
  let newProspects = 0;

  // Initialize source hit counters
  for (const s of SOURCES) sourceHits[s.name] = 0;

  try {
    for (let i = 0; i < prospects.length; i++) {
      const prospect = prospects[i];
      const key = makeKey(prospect.name, prospect.school);
      const pk = posKey(prospect.pos);

      if (!pk) {
        console.log(`${c.yellow}[${i + 1}/${prospects.length}]${c.reset} ${prospect.name} — unknown position "${prospect.pos}", skipping`);
        continue;
      }

      const posTraits = POSITION_TRAITS[pk];
      console.log(`${c.cyan}[${i + 1}/${prospects.length}]${c.reset} ${c.bold}${prospect.name}${c.reset} (${prospect.pos}, ${prospect.school})`);

      // Fetch scouting text from all sources
      const { results: sourceResults, sourceStats } = await fetchAllSources(prospect);

      // Track source hits
      for (const [name, chars] of Object.entries(sourceStats)) {
        if (chars > 0) sourceHits[name] = (sourceHits[name] || 0) + 1;
      }

      if (sourceResults.length === 0) {
        console.log(`  ${c.yellow}[→]${c.reset} No scouting text found, skipping API call`);
        continue;
      }

      // Call Anthropic
      console.log(`  ${c.blue}[→]${c.reset} Calling Anthropic...`);
      const extracted = await callAnthropic(client, { ...prospect, pos: pk }, posTraits, sourceResults);

      if (!extracted) {
        continue;
      }

      // Log extracted traits
      const traitSummary = posTraits
        .filter((t) => t in extracted)
        .map((t) => `${t} ${extracted[t]}`)
        .join(", ");
      console.log(`  ${c.green}[→]${c.reset} ${traitSummary}`);
      if (extracted.__ceiling) {
        console.log(`  ${c.magenta}[→]${c.reset} Ceiling: ${extracted.__ceiling}`);
      }

      // Build result entry
      const existing = existingTraits[key] || {};
      const isNew = !existingTraits[key];
      const diff = computeDiff(extracted, existing);

      results[key] = {
        name: prospect.name,
        school: prospect.school,
        position: prospect.pos,
        extracted,
        existing: Object.keys(existing).length > 0 ? existing : null,
        diff: Object.keys(diff).length > 0 ? diff : null,
        isNew,
        sourcesUsed: sourceResults.map((s) => s.source),
      };

      printProspectSummary(prospect, extracted, existing, isNew);

      prospectsProcessed++;
      totalTraitsExtracted += Object.keys(extracted).filter((k) => k !== "__ceiling").length;
      if (isNew) newProspects++;
    }
  } finally {
    await closeBrowser();
  }

  // Write results file
  const outputPath = join(__dirname, "scouting-results.json");
  const output = {
    meta: {
      timestamp: new Date().toISOString(),
      sources_used: SOURCES.filter((s) => s.enabled).map((s) => s.name),
      prospects_processed: prospectsProcessed,
      filters: {
        position: opts.position || "all",
        prospect: opts.prospect || "all",
      },
    },
    results,
  };
  writeFileSync(outputPath, JSON.stringify(output, null, 2));

  // Print summary
  console.log(`\n${c.bold}📊 Summary${c.reset}`);
  console.log(`   Prospects processed: ${prospectsProcessed}`);
  console.log(
    `   Sources hit: ${Object.entries(sourceHits)
      .map(([name, count]) => `${name} (${count})`)
      .join(", ")}`
  );
  console.log(`   Traits extracted: ${totalTraitsExtracted}`);
  console.log(`   New prospects: ${newProspects}`);
  console.log(`   File written: ${c.cyan}scripts/scouting-results.json${c.reset}`);
  console.log(`\n   ${c.dim}Review the results file, then manually apply changes to src/scoutingTraits.json${c.reset}`);
}

main().catch((err) => {
  console.error(`\n${c.red}Fatal error:${c.reset}`, err.message || err);
  closeBrowser().then(() => process.exit(1));
});
