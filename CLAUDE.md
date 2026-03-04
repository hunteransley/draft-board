# Big Board Lab (BBL)

2026 NFL Draft board builder and mock draft simulator at **bigboardlab.com**.

## Quick Reference

- **Deploy**: `npx vercel --prod --yes` (only when explicitly told)
- **Dev server**: `npx vite --host` (localhost:5173)
- **Build check**: `npx vite build`
- **Stack**: Vite + React (single `src/App.jsx`), no TypeScript, inline styles throughout
- **Data**: Firebase auth + Firestore, ESPN depth charts, combine/college stats in static JS/JSON files

## Key Rules

- Never stash during deploys — Vercel deploys from the working tree, not git HEAD
- "Push to dev" = local dev server, NOT Vercel preview
- Never change grading LOGIC — only baseline trait scores in scoutingTraits.json
- Specialists (K, P, LS) should never have their traits adjusted
- Deploy only when explicitly asked

## Agent Specs

Two agent specification files live in `agents/`:

- **`agents/BBL_SCOUTING_AGENT.md`** — Scouting report ingestion agent. Reads prospect reports from Tier 1 sources (Brugler, Jeremiah, Zierlein), translates narrative evaluations into structured trait grades on BBL's 1-100 scale. Handles paywalled content requests, scout disagreement resolution via trust-weighted averages, and outputs JSON consumable by the codebase. Supports single prospect, position batch, and full draft class modes.

- **`agents/BBL_GM_PERSONALITY_AGENT.md`** — GM personality research agent. Researches all 32 NFL GMs to produce behavioral profiles driving AI GM behavior in mock draft simulations. Covers BPA/need weighting, trade behavior, positional value hierarchies, reach tolerance, scheme fit, psychological tendencies, college production preferences, measurable thresholds, and round-by-round strategy. Outputs per-team JSON with `mock_draft_behavior_parameters` that the simulator reads directly.

## Architecture

- See `agents/` for agent specs referenced above
- Baseline traits in `src/scoutingTraits.json` (sourced from Grok/Twitter, has optimism bias)
- Combine pipeline in `src/combineTraits.js` amplifies bias for athletic prospects
- Position-specific trait taxonomies defined in `POSITION_TRAITS` in App.jsx
- GM personalities currently hardcoded in App.jsx mock draft logic
