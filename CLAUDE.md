# Big Board Lab (BBL)

2026 NFL Draft board builder and mock draft simulator at **bigboardlab.com**.

## Quick Reference

- **Deploy**: `npx vercel --prod --yes` (only when explicitly told)
- **Dev server**: `npx vite --host` (localhost:5173)
- **Build check**: `npx vite build`
- **Stack**: Vite + React (single `src/App.jsx`), no TypeScript, inline styles throughout
- **Data**: Supabase auth + database, ESPN depth charts, combine/college stats in static JS/JSON files

## Key Rules

- Never stash during deploys — Vercel deploys from the working tree, not git HEAD
- "Push to dev" = local dev server, NOT Vercel preview
- Never change grading LOGIC — only baseline trait scores in scoutingTraits.json
- Specialists (K, P, LS) should never have their traits adjusted
- Deploy only when explicitly asked

## Agents

Agent specs and runner live in `agents/`. Run agents via `python3 agents/run.py <agent> [args]` — see `agents/README.md` for full usage.

- **`agents/scouting/AGENT.md`** — Scouting report ingestion agent. Reads prospect reports from Tier 1 sources (Brugler, Jeremiah, Zierlein), translates narrative evaluations into structured trait grades on BBL's 1-100 scale. Handles paywalled content requests, scout disagreement resolution via trust-weighted averages, and outputs JSON consumable by the codebase. Supports single prospect, position batch, and full draft class modes.

- **`agents/gm-personality/AGENT.md`** — GM personality research agent. Researches all 32 NFL GMs to produce behavioral profiles driving AI GM behavior in mock draft simulations. Covers BPA/need weighting, trade behavior, positional value hierarchies, reach tolerance, scheme fit, psychological tendencies, college production preferences, measurable thresholds, and round-by-round strategy. Outputs per-team JSON with `mock_draft_behavior_parameters` that the simulator reads directly.

- **`agents/free-agency/AGENT.md`** — Free agency tracker agent. Gathers every FA signing/departure for each team, assesses needs impact using contract structure (AAV, guarantees, duration) as the primary signal. Outputs per-team JSON with signings, departures, needs impact summary, recommended tier adjustments, and pre-formatted key additions/losses for team pages. Run with `python3 agents/run.py fa --all --batch`. Designed to run multiple times during FA period.

- **`agents/run.py`** — Python runner that executes agent specs against the Anthropic API. Requires `ANTHROPIC_API_KEY` env var and the `anthropic` pip package.

## Architecture

### Shared Data Modules (single source of truth)

- **`src/draftConfig.js`** — `DRAFT_ORDER` (257 picks), `DRAFT_ORDER_R1`, `ROUND_BOUNDS`, `getPickRound()`, `DRAFT_YEAR`, `POS_DRAFT_VALUE`, `RANK_OVERRIDES`, `GRADE_OVERRIDES`, `TEAM_PROFILES`, `SCHEME_INFLECTIONS`
- **`src/positions.js`** — `POSITION_TRAITS`, `TRAIT_WEIGHTS`, `TRAIT_TEACHABILITY`, `TRAIT_EMOJI`, `TRAIT_ABBREV`, `TRAIT_SHORT`, `POSITION_GROUPS`, `POS_EMOJI`, `POS_COLORS`
- **`src/teamConfig.js`** — `TEAMS` (canonical 32-team object), derives `NFL_TEAM_ABR`, `NFL_TEAM_ESPN`, `NFL_TEAM_COLORS`, `ABBR_TO_TEAM`
- **`src/prospects.js`** — `PROSPECTS_RAW` (458 prospects, shared by App.jsx and update-combine.js)
- **`src/teamNeedsData.js`** — `TEAM_NEEDS_RICH`, `TEAM_NEEDS_SIMPLE`, `TEAM_NEEDS_COUNTS` (derived from agent JSONs)

### Key Files

- **`src/App.jsx`** — Main app component, board UI, ranking, grading, profile views
- **`src/MockDraftSim.jsx`** — Full 7-round mock draft simulator with CPU AI and trade logic
- **`src/Round1Prediction.jsx`** — R1 prediction sim (Monte Carlo, 500 iterations)
- **`src/combineTraits.js`** — Combine data → trait adjustment pipeline
- **`update-combine.js`** — Node script to fetch/merge combine data from nflverse

### Other

- See `agents/` for agent specs and runner
- Baseline traits in `src/scoutingTraits.json` (sourced from Grok/Twitter, has optimism bias)
- Combine pipeline in `src/combineTraits.js` amplifies bias for athletic prospects
- Draft order sourced from Tankathon, updated in `src/draftConfig.js` only
