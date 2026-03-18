#!/usr/bin/env python3
"""
Run archetype classification agent via Anthropic Batch API.

Usage:
  python3 agents/run-archetypes.py --batch      # submit
  python3 agents/run-archetypes.py --check      # status
  python3 agents/run-archetypes.py --download   # download + write output

Reads scouting narratives, groups prospects by position, sends to Opus 4.6
for archetype classification. Output: src/archetypeData.json
"""
import os, sys, json, argparse
from pathlib import Path
from datetime import datetime

PROJECT_ROOT = Path(__file__).resolve().parent.parent
NARRATIVES_FILE = PROJECT_ROOT / "src" / "scoutingNarratives.json"
STATS_FILE = PROJECT_ROOT / "src" / "prospectStats.js"
AGENT_SPEC = PROJECT_ROOT / "agents" / "archetype" / "AGENT.md"
OUTPUT_FILE = PROJECT_ROOT / "src" / "archetypeData.json"
BATCH_DIR = PROJECT_ROOT / "agents" / "batches"
BATCH_ID_FILE = BATCH_DIR / "archetype-batch-id.txt"

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

with open(NARRATIVES_FILE) as f:
    narratives = json.load(f)

# Parse gpos from prospectStats.js
import re
with open(STATS_FILE) as f:
    stats_content = f.read()
stats_match = re.search(r'const S=(\{.*?\});', stats_content, re.DOTALL)
stats = json.loads(stats_match.group(1)) if stats_match else {}

# Group prospects by position for efficient batching
POS_GROUPS = {
    "QB": ["QB"],
    "RB": ["RB"],
    "WR": ["WR"],
    "TE": ["TE"],
    "OL": ["OT", "IOL", "C", "OG"],
    "EDGE": ["EDGE"],
    "DL": ["DL"],
    "LB": ["LB"],
    "CB": ["CB"],
    "S": ["S"],
}

def get_pos_group(key):
    gpos = stats.get(key, {}).get("gpos", "?")
    for group, positions in POS_GROUPS.items():
        if gpos in positions:
            return group
    return None

def build_prospect_input(key, entry):
    """Extract the fields the agent needs."""
    return {
        "key": key,
        "scouting_blurb": entry.get("scouting_blurb", ""),
        "strengths": entry.get("strengths", []),
        "weaknesses": entry.get("weaknesses", []),
        "pro_comparison": entry.get("pro_comparison", ""),
        "pro_comparison_reasoning": entry.get("pro_comparison_reasoning", ""),
        "alt_pro_comparison": entry.get("alt_pro_comparison", ""),
        "scheme_fit_tags": entry.get("scheme_fit_tags", []),
        "trait_language": entry.get("trait_language", {}),
    }


def submit_batch():
    # Group prospects by position
    groups = {}
    for key, entry in narratives.items():
        pos = get_pos_group(key)
        if not pos:
            continue
        if pos not in groups:
            groups[pos] = []
        groups[pos].append(build_prospect_input(key, entry))

    requests = []
    for pos, prospects in sorted(groups.items()):
        prospect_json = json.dumps(prospects, indent=1)
        prompt = f"""Classify the following {len(prospects)} {pos} prospects into archetypes.

Read each prospect's full scouting data carefully. Assign 1-4 archetype labels per prospect based on the evidence. Use the archetype vocabulary from your instructions, and add new archetypes if the data supports them.

Prospects:
{prospect_json}

Output a JSON array of {{"key": "...", "archetypes": [...]}} objects. No preamble, no markdown. Start with [ and end with ]."""

        requests.append({
            "custom_id": f"archetype-{pos}",
            "params": {
                "model": MODEL,
                "max_tokens": 16384,
                "system": agent_spec,
                "messages": [{"role": "user", "content": prompt}],
            }
        })

    total_prospects = sum(len(g) for g in groups.values())
    print(f"Submitting batch: {len(requests)} position groups, {total_prospects} prospects, model={MODEL}")
    for pos, prospects in sorted(groups.items()):
        print(f"  {pos}: {len(prospects)} prospects")

    batch = client.messages.batches.create(requests=requests)

    BATCH_DIR.mkdir(exist_ok=True)
    info = {"batch_id": batch.id, "agent": "archetype", "submitted_at": datetime.now().isoformat(),
            "request_count": len(requests), "prospect_count": total_prospects}
    with open(BATCH_ID_FILE, "w") as f:
        json.dump(info, f, indent=2)

    print(f"✅ Batch submitted: {batch.id}")
    print(f"Check status: python3 agents/run-archetypes.py --check")


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
    if batch.processing_status == "ended":
        print(f"\n✅ Ready! Run: python3 agents/run-archetypes.py --download")


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

    all_archetypes = {}
    total = 0
    errors = 0

    for result in results:
        custom_id = result.custom_id
        pos = custom_id.replace("archetype-", "")

        if result.result.type != "succeeded":
            print(f"  ❌ {pos}: {result.result.type}")
            errors += 1
            continue

        text = result.result.message.content[0].text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

        try:
            entries = json.loads(text)
            for entry in entries:
                key = entry.get("key", "")
                archetypes = entry.get("archetypes", [])
                if key and archetypes:
                    all_archetypes[key] = archetypes
                    total += 1
            print(f"  ✅ {pos}: {len(entries)} prospects classified")
        except json.JSONDecodeError as e:
            print(f"  ❌ {pos}: JSON parse error: {e}")
            debug_file = BATCH_DIR / f"archetype-{pos}-debug.txt"
            with open(debug_file, "w") as f:
                f.write(text)
            errors += 1

    # Write output
    with open(OUTPUT_FILE, "w") as f:
        json.dump(all_archetypes, f, indent=2)

    print(f"\n✅ Done. {total} prospects classified. Errors: {errors}.")
    print(f"Output: {OUTPUT_FILE}")

    # Show archetype distribution
    from collections import Counter
    all_labels = Counter()
    for archs in all_archetypes.values():
        for a in archs:
            all_labels[a] += 1
    print(f"\nArchetype distribution ({len(all_labels)} unique labels):")
    for label, count in all_labels.most_common():
        print(f"  {label}: {count}")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--batch", action="store_true", help="Submit batch (50%% off Opus 4.6)")
    p.add_argument("--check", action="store_true", help="Check batch status")
    p.add_argument("--download", action="store_true", help="Download + write output")
    args = p.parse_args()

    if args.download:
        download_batch()
    elif args.check:
        check_batch()
    elif args.batch:
        submit_batch()
    else:
        print("Usage:")
        print("  python3 agents/run-archetypes.py --batch      # submit")
        print("  python3 agents/run-archetypes.py --check      # status")
        print("  python3 agents/run-archetypes.py --download   # write src/archetypeData.json")
