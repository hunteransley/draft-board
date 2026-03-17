#!/usr/bin/env python3
"""
Fill roster value gaps via Anthropic Batch API (50% off, Opus 4.6).

Usage:
  python3 agents/fill-roster-gaps.py --batch         — submit batch
  python3 agents/fill-roster-gaps.py --check         — check status
  python3 agents/fill-roster-gaps.py --download      — download + merge results

Merges new players into existing agents/output/roster-value/{TEAM}.json.
Never overwrites existing player entries.
"""
import os, sys, json, argparse
from pathlib import Path
from datetime import datetime

PROJECT_ROOT = Path(__file__).resolve().parent.parent
GAPS_FILE = PROJECT_ROOT / "agents" / "roster-value-gaps.json"
OUTPUT_DIR = PROJECT_ROOT / "agents" / "output" / "roster-value"
BATCH_DIR = PROJECT_ROOT / "agents" / "batches"
AGENT_SPEC = PROJECT_ROOT / "agents" / "roster-value" / "AGENT.md"
BATCH_ID_FILE = BATCH_DIR / "roster-gap-batch-id.txt"

API_KEY = os.environ.get("ANTHROPIC_API_KEY")
if not API_KEY:
    print("ERROR: Set ANTHROPIC_API_KEY env var")
    sys.exit(1)

try:
    import anthropic
except ImportError:
    print("ERROR: pip install anthropic")
    sys.exit(1)

client = anthropic.Anthropic(api_key=API_KEY)
MODEL = "claude-opus-4-6"

with open(AGENT_SPEC) as f:
    agent_spec = f.read()

with open(GAPS_FILE) as f:
    gaps = json.load(f)


def submit_batch():
    teams = gaps["teams"]
    requests = []

    for abbr, team_data in sorted(teams.items()):
        team_full = team_data["team_full"]
        players = team_data["players"]
        player_list = "\n".join(f"  - {p['name']} (slot: {p['slot']})" for p in players)

        prompt = f"""You are researching roster values for the {team_full} ({abbr}).

I need you to research ONLY these specific players who are missing from our database:

{player_list}

For each player, provide the standard roster-value schema as defined in your instructions.
Key fields needed: name (must match exactly as listed above), slot, position, age (as of Sept 2026),
draft_pedigree, contract (years_remaining, aav, guaranteed_remaining, cap_hit_2026, dead_cap_if_traded, free_agent_year),
performance_tier, performance_evidence, trade_value (pick_equivalent, pick_value_points, reasoning),
availability, availability_reasoning, injury_notes, character_notes, trade_buzz.

Output ONLY a JSON array of player objects. No preamble, no markdown. Start with [ and end with ]."""

        requests.append({
            "custom_id": f"roster-gap-{abbr}",
            "params": {
                "model": MODEL,
                "max_tokens": 8192,
                "system": agent_spec,
                "messages": [{"role": "user", "content": prompt}],
            }
        })

    print(f"Submitting batch: {len(requests)} teams, {gaps['total_missing']} players, model={MODEL}")
    batch = client.messages.batches.create(requests=requests)

    BATCH_DIR.mkdir(exist_ok=True)
    info = {"batch_id": batch.id, "agent": "roster-gap-fill", "submitted_at": datetime.now().isoformat(),
            "request_count": len(requests), "player_count": gaps["total_missing"]}
    with open(BATCH_ID_FILE, "w") as f:
        json.dump(info, f, indent=2)

    print(f"✅ Batch submitted: {batch.id}")
    print(f"Check status: python3 agents/fill-roster-gaps.py --check")


def check_batch():
    if not BATCH_ID_FILE.exists():
        print("No batch submitted. Run with --batch first.")
        return
    info = json.loads(BATCH_ID_FILE.read_text())
    batch_id = info["batch_id"]
    batch = client.messages.batches.retrieve(batch_id)
    counts = batch.request_counts
    print(f"Batch: {batch_id}")
    print(f"Status: {batch.processing_status}")
    print(f"  Processing: {counts.processing}")
    print(f"  Succeeded:  {counts.succeeded}")
    print(f"  Errored:    {counts.errored}")
    print(f"  Canceled:   {counts.canceled}")
    if batch.processing_status == "ended":
        print(f"\n✅ Ready! Run: python3 agents/fill-roster-gaps.py --download")


def download_batch():
    if not BATCH_ID_FILE.exists():
        print("No batch submitted. Run with --batch first.")
        return
    info = json.loads(BATCH_ID_FILE.read_text())
    batch_id = info["batch_id"]
    batch = client.messages.batches.retrieve(batch_id)

    if batch.processing_status != "ended":
        print(f"Batch not done yet. Status: {batch.processing_status}")
        return

    results = list(client.messages.batches.results(batch_id))
    print(f"Downloaded {len(results)} results\n")

    total_added = 0
    total_errors = 0

    for result in results:
        custom_id = result.custom_id
        abbr = custom_id.replace("roster-gap-", "")

        if result.result.type != "succeeded":
            print(f"  ❌ {abbr}: {result.result.type}")
            total_errors += 1
            continue

        message = result.result.message
        text = message.content[0].text.strip()

        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

        try:
            new_players = json.loads(text)
        except json.JSONDecodeError as e:
            print(f"  ❌ {abbr}: JSON parse error: {e}")
            debug_file = OUTPUT_DIR / f"{abbr}_gap_debug.txt"
            with open(debug_file, "w") as f:
                f.write(text)
            total_errors += 1
            continue

        existing_file = OUTPUT_DIR / f"{abbr}.json"
        if existing_file.exists():
            with open(existing_file) as f:
                existing = json.load(f)
        else:
            team_full = gaps["teams"].get(abbr, {}).get("team_full", abbr)
            existing = {"team": abbr, "team_full": team_full, "team_context": {}, "players": []}

        existing_names = {p["name"].lower() for p in existing.get("players", [])}

        added = 0
        for p in new_players:
            if p.get("name", "").lower() not in existing_names:
                existing["players"].append(p)
                existing_names.add(p["name"].lower())
                added += 1

        with open(existing_file, "w") as f:
            json.dump(existing, f, indent=2)

        print(f"  ✅ {abbr}: added {added} players")
        total_added += added

    print(f"\n✅ Done. Added {total_added} players. Errors: {total_errors}.")
    print("Verify with `npx vite build`, then commit.")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--batch", action="store_true", help="Submit batch (50%% off Opus 4.6)")
    p.add_argument("--check", action="store_true", help="Check batch status")
    p.add_argument("--download", action="store_true", help="Download + merge results")
    args = p.parse_args()

    if args.download:
        download_batch()
    elif args.check:
        check_batch()
    elif args.batch:
        submit_batch()
    else:
        print("Usage:")
        print("  python3 agents/fill-roster-gaps.py --batch      # submit")
        print("  python3 agents/fill-roster-gaps.py --check      # status")
        print("  python3 agents/fill-roster-gaps.py --download   # merge results")
