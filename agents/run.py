#!/usr/bin/env python3
"""
BBL Agent Runner - Batch + Real-time
python agents/run.py gm --all --batch       # submit all 32 GMs as batch (50% off)
python agents/run.py check-batch            # check status
python agents/run.py download-batch         # download results when done
python agents/run.py gm --team TEN          # real-time single team
python agents/run.py scouting --prospect "Cam Ward"
python agents/run.py scouting --position EDGE --batch
"""
import os, sys, json, time, argparse, re
from pathlib import Path
from datetime import datetime

PROJECT_ROOT = Path(__file__).resolve().parent.parent
AGENTS_DIR = PROJECT_ROOT / "agents"
OUTPUT_DIR = PROJECT_ROOT / "agents" / "output"
BATCH_DIR = PROJECT_ROOT / "agents" / "batches"
DELAY_BETWEEN_CALLS_SECONDS = 90

DEFAULT_MODELS = {
    "scouting": "claude-sonnet-4-6",
    "gm-personality": "claude-opus-4-6",
    "combine": "claude-haiku-4-5-20251001",
    "trade-roster": "claude-haiku-4-5-20251001",
    "seo": "claude-sonnet-4-6",
    "content": "claude-sonnet-4-6",
}

NFL_DIVISIONS = {
    "AFC North": ["BAL","PIT","CIN","CLE"], "AFC South": ["TEN","IND","HOU","JAX"],
    "AFC East": ["BUF","MIA","NYJ","NE"], "AFC West": ["KC","LAC","DEN","LV"],
    "NFC North": ["DET","MIN","GB","CHI"], "NFC South": ["ATL","TB","NO","CAR"],
    "NFC East": ["PHI","DAL","WSH","NYG"], "NFC West": ["SF","LAR","SEA","ARI"],
}
ALL_TEAMS = [t for d in NFL_DIVISIONS.values() for t in d]

def check_setup():
    errors = []
    if sys.version_info < (3, 8):
        errors.append(f"Python 3.8+ required. You have {sys.version}.")
    try:
        import anthropic
    except ImportError:
        errors.append("Run: pip3 install anthropic")
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        env_file = PROJECT_ROOT / ".env"
        if env_file.exists():
            for line in env_file.read_text().splitlines():
                if line.startswith("ANTHROPIC_API_KEY="):
                    api_key = line.split("=", 1)[1].strip().strip('"').strip("'")
                    os.environ["ANTHROPIC_API_KEY"] = api_key
                    break
    if not api_key:
        errors.append("No API key. Run: export ANTHROPIC_API_KEY=sk-ant-your-key-here")
    if errors:
        print("\n❌ SETUP ISSUES:\n")
        for i, e in enumerate(errors, 1): print(f"  {i}. {e}\n")
        sys.exit(1)
    print("✅ Setup looks good.\n")

def load_agent_spec(agent_name):
    for path in [AGENTS_DIR / agent_name / "AGENT.md", AGENTS_DIR / f"{agent_name}.md"]:
        if path.exists():
            print(f"📄 Loaded agent spec: {path.relative_to(PROJECT_ROOT)}")
            return path.read_text()
    print(f"❌ No agent spec found for '{agent_name}'.")
    sys.exit(1)

def call_agent(system_prompt, user_message, model, max_tokens=16000):
    import anthropic
    client = anthropic.Anthropic()
    try:
        response = client.messages.create(
            model=model, max_tokens=max_tokens, system=system_prompt,
            tools=[{"type": "web_search_20250305", "name": "web_search"}],
            messages=[{"role": "user", "content": user_message}],
        )
        text_parts = [b.text for b in response.content if hasattr(b, "text")]
        usage = response.usage
        print(f"   Tokens — in: {usage.input_tokens:,}, out: {usage.output_tokens:,}")
        return "\n".join(text_parts)
    except anthropic.APIError as e:
        msg = str(e)
        if "rate_limit" in msg.lower():
            print("   ⏳ Rate limited. Waiting 60 seconds...")
            time.sleep(60)
            return call_agent(system_prompt, user_message, model, max_tokens)
        elif "overloaded" in msg.lower():
            print("   ⏳ API busy. Waiting 30 seconds...")
            time.sleep(30)
            return call_agent(system_prompt, user_message, model, max_tokens)
        else:
            print(f"\n❌ API Error: {msg}")
            raise

def extract_json(text):
    m = re.search(r"```json\s*\n(.*?)\n\s*```", text, re.DOTALL)
    if m:
        try: return json.loads(m.group(1))
        except json.JSONDecodeError: pass
    i, j = text.find("{"), text.rfind("}")
    if i != -1 and j != -1:
        try: return json.loads(text[i:j+1])
        except json.JSONDecodeError: pass
    return None

# --- BATCH API ---

def submit_batch(requests_list, agent_name):
    import anthropic
    client = anthropic.Anthropic()
    BATCH_DIR.mkdir(parents=True, exist_ok=True)
    print(f"\n📦 Submitting batch of {len(requests_list)} requests...")
    batch = client.messages.batches.create(requests=requests_list)
    info = {"batch_id": batch.id, "agent": agent_name, "submitted_at": datetime.now().isoformat(),
            "request_count": len(requests_list), "status": batch.processing_status,
            "custom_ids": [r["custom_id"] for r in requests_list]}
    (BATCH_DIR / f"{batch.id}.json").write_text(json.dumps(info, indent=2))
    print(f"   ✅ Batch submitted: {batch.id}")
    print(f"   📋 {len(requests_list)} requests queued")
    print(f"   💰 50% discount applied automatically")
    print(f"   ⏱️  Usually under 1 hour (max 24 hours)")
    print(f"\n   Check status:   python3 agents/run.py check-batch")
    print(f"   Download:       python3 agents/run.py download-batch")

def check_batch_status():
    import anthropic
    client = anthropic.Anthropic()
    BATCH_DIR.mkdir(parents=True, exist_ok=True)
    files = list(BATCH_DIR.glob("*.json"))
    if not files:
        print("No batches found. Submit one with --batch flag first.")
        return
    for f in sorted(files):
        info = json.loads(f.read_text())
        try:
            batch = client.messages.batches.retrieve(info["batch_id"])
            c = batch.request_counts
            emoji = "✅" if batch.processing_status == "ended" else "⏳"
            print(f"\n{emoji} Batch: {info['batch_id']}")
            print(f"   Agent: {info['agent']} | Submitted: {info['submitted_at']}")
            print(f"   Status: {batch.processing_status}")
            print(f"   Succeeded: {c.succeeded} | Errored: {c.errored} | Expired: {c.expired} | Processing: {c.processing}")
            if batch.processing_status == "ended":
                print(f"   👉 Run: python3 agents/run.py download-batch")
            info["status"] = batch.processing_status
            f.write_text(json.dumps(info, indent=2))
        except Exception as e:
            print(f"❌ Error checking {info['batch_id']}: {e}")

def download_batch_results():
    import anthropic
    client = anthropic.Anthropic()
    BATCH_DIR.mkdir(parents=True, exist_ok=True)
    files = list(BATCH_DIR.glob("*.json"))
    if not files:
        print("No batches found.")
        return
    for f in sorted(files):
        info = json.loads(f.read_text())
        if info.get("downloaded"):
            print(f"⏭️  {info['batch_id']} — already downloaded.")
            continue
        try:
            batch = client.messages.batches.retrieve(info["batch_id"])
            if batch.processing_status != "ended":
                print(f"⏳ {info['batch_id']} — still processing. Try later.")
                continue
            agent = info["agent"]
            if agent == "gm-personality": out = OUTPUT_DIR / "gm-profiles"
            elif agent == "scouting": out = OUTPUT_DIR / "scouting"
            else: out = OUTPUT_DIR / agent
            out.mkdir(parents=True, exist_ok=True)
            print(f"\n📥 Downloading {info['batch_id']} ({info['request_count']} results)...")
            ok, fail = 0, 0
            for r in client.messages.batches.results(info["batch_id"]):
                cid = r.custom_id
                if r.result.type == "succeeded":
                    text = "\n".join(b.text for b in r.result.message.content if hasattr(b, "text"))
                    jd = extract_json(text)
                    if jd:
                        (out / f"{cid}.json").write_text(json.dumps(jd, indent=2))
                        print(f"   ✅ {cid}.json")
                    else:
                        (out / f"{cid}_raw.md").write_text(text)
                        print(f"   ⚠️  {cid} — no JSON, raw saved")
                    ok += 1
                else:
                    print(f"   ❌ {cid} — {r.result.type}")
                    fail += 1
            print(f"\n   Done: {ok} saved, {fail} failed")
            info["downloaded"] = True
            info["downloaded_at"] = datetime.now().isoformat()
            f.write_text(json.dumps(info, indent=2))
            if agent == "gm-personality": generate_gm_index(out)
        except Exception as e:
            print(f"❌ Error: {e}")

# --- GM AGENT ---

def run_gm_agent(args):
    spec = load_agent_spec("gm-personality")
    model = args.model or DEFAULT_MODELS["gm-personality"]
    out = OUTPUT_DIR / "gm-profiles"
    out.mkdir(parents=True, exist_ok=True)

    if args.team: teams = [args.team.upper()]
    elif args.division:
        matched = None
        for k in NFL_DIVISIONS:
            if args.division.lower().replace(" ","") in k.lower().replace(" ",""): matched = k; break
        if not matched:
            print(f"❌ Unknown division. Available: {', '.join(NFL_DIVISIONS.keys())}"); sys.exit(1)
        teams = NFL_DIVISIONS[matched]
        print(f"📋 {matched} — {', '.join(teams)}")
    elif args.all: teams = ALL_TEAMS; print("📋 All 32 teams")
    else: print("❌ Specify --team, --division, or --all"); sys.exit(1)

    to_run = [t for t in teams if not (out / f"{t}.json").exists() or args.dry_run]
    skipped = [t for t in teams if t not in to_run]
    for t in skipped: print(f"⏭️  {t} — already done")
    if not to_run: print("\nAll done. Delete files to re-run."); return

    def make_msg(team):
        return (f"Research the {team} front office and produce a complete GM personality profile. "
                f"Follow your full research methodology: scouting tree, decision-making structure, "
                f"draft history analysis, public statements, trade history, reported intel, "
                f"and player archetype analysis. Output the complete JSON profile as specified in your instructions.")

    if args.batch:
        if args.dry_run:
            print(f"\nDRY RUN — would batch {len(to_run)} teams: {', '.join(to_run)}"); return
        reqs = [{"custom_id": t, "params": {"model": model, "max_tokens": 16000, "system": spec,
                 "tools": [{"type": "web_search_20250305", "name": "web_search"}],
                 "messages": [{"role": "user", "content": make_msg(t)}]}} for t in to_run]
        submit_batch(reqs, "gm-personality"); return

    for i, t in enumerate(to_run, 1):
        print(f"\n🧠 [{i}/{len(to_run)}] Researching: {t}")
        if args.dry_run: print(f"   DRY RUN"); continue
        result = call_agent(spec, make_msg(t), model, 16000)
        jd = extract_json(result)
        if jd: (out / f"{t}.json").write_text(json.dumps(jd, indent=2)); print(f"   ✅ Saved")
        else: (out / f"{t}_raw.md").write_text(result); print(f"   ⚠️  No JSON, raw saved")
        time.sleep(DELAY_BETWEEN_CALLS_SECONDS)
    if len(to_run) > 1: generate_gm_index(out)

def generate_gm_index(out):
    index = {"generated_at": datetime.now().isoformat(), "teams": []}
    for f in sorted(out.glob("*.json")):
        if f.name == "gm_index.json": continue
        try:
            d = json.loads(f.read_text())
            entry = {"abbreviation": f.stem,
                     "gm": d.get("front_office",{}).get("gm",{}).get("name","Unknown"),
                     "confidence": d.get("confidence","unknown"), "file": f"gm-profiles/{f.name}"}
            p = d.get("draft_philosophy",{})
            if p.get("actual_philosophy"): entry["headline_tendency"] = p["actual_philosophy"][:100]
            index["teams"].append(entry)
        except: pass
    (out / "gm_index.json").write_text(json.dumps(index, indent=2))
    print(f"📋 GM Index: {len(index['teams'])} teams")

# --- SCOUTING AGENT ---

def run_scouting_agent(args):
    spec = load_agent_spec("scouting")
    model = args.model or DEFAULT_MODELS["scouting"]
    out = OUTPUT_DIR / "scouting"
    out.mkdir(parents=True, exist_ok=True)

    if args.prospect:
        if args.batch: print("❌ Use --position for batch, not --prospect"); sys.exit(1)
        safe = args.prospect.lower().replace(" ","_").replace("'","")
        f = out / f"{safe}.json"
        if f.exists() and not args.dry_run: print(f"⏭️  Already scouted."); return
        print(f"\n🔬 Scouting: {args.prospect}")
        if args.dry_run: print("   DRY RUN"); return
        result = call_agent(spec, f"Scout {args.prospect}. Follow single prospect workflow.", model)
        jd = extract_json(result)
        if jd: f.write_text(json.dumps(jd, indent=2)); print("   ✅ Saved")
        else: (out / f"{safe}_raw.md").write_text(result); print("   ⚠️  No JSON, raw saved")
    elif args.position:
        pos = args.position.upper()
        pos_out = out / pos.lower()
        pos_out.mkdir(parents=True, exist_ok=True)
        print(f"\n🔬 Discovering {pos} prospects...")
        disc = call_agent("Return only JSON arrays of names.",
                          f"Identify all draftable {pos} prospects in the 2026 NFL Draft. Return ONLY a JSON array. Format: [\"Name\",...]",
                          "claude-haiku-4-5-20251001")
        prospects = None
        try:
            m = re.search(r"\[.*\]", disc, re.DOTALL)
            if m: prospects = json.loads(m.group(0))
        except: pass
        if not prospects: print("❌ Couldn't get list."); sys.exit(1)
        to_run = []
        for n in prospects:
            safe = n.lower().replace(" ","_").replace("'","")
            if not (pos_out / f"{safe}.json").exists(): to_run.append((n, safe))
            else: print(f"   ⏭️  {n} — done")
        print(f"   {len(prospects)} found, {len(to_run)} need scouting")
        if not to_run: return
        if args.dry_run: print(f"   DRY RUN — would {'batch' if args.batch else 'scout'} {len(to_run)}"); return

        if args.batch:
            reqs = [{"custom_id": safe, "params": {"model": model, "max_tokens": 8000, "system": spec,
                     "tools": [{"type": "web_search_20250305", "name": "web_search"}],
                     "messages": [{"role": "user", "content": f"Scout {name}, position {pos}. Follow single prospect workflow. Note any paywalled sources."}]}}
                    for name, safe in to_run]
            submit_batch(reqs, "scouting"); return

        for i, (name, safe) in enumerate(to_run, 1):
            print(f"   [{i}/{len(to_run)}] 🔬 {name}")
            try:
                result = call_agent(spec, f"Scout {name}, position {pos}. Follow single prospect workflow.", model)
                jd = extract_json(result)
                if jd: (pos_out / f"{safe}.json").write_text(json.dumps(jd, indent=2)); print("      ✅")
                else: (pos_out / f"{safe}_raw.md").write_text(result); print("      ⚠️  raw saved")
            except Exception as e: print(f"      ❌ {e}")
            time.sleep(DELAY_BETWEEN_CALLS_SECONDS)
    else:
        print("❌ Specify --prospect or --position"); sys.exit(1)

# --- GENERIC ---

def run_generic_agent(args):
    spec = load_agent_spec(args.agent)
    model = args.model or DEFAULT_MODELS.get(args.agent, "claude-sonnet-4-6")
    out = OUTPUT_DIR / args.agent; out.mkdir(parents=True, exist_ok=True)
    if args.dry_run: print("DRY RUN"); return
    result = call_agent(spec, args.message, model)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    (out / f"run_{ts}.md").write_text(result)
    jd = extract_json(result)
    if jd: (out / f"run_{ts}.json").write_text(json.dumps(jd, indent=2))
    print(f"✅ Saved to agents/output/{args.agent}/")

# --- CLI ---

def main():
    p = argparse.ArgumentParser(description="BBL Agent Runner", formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="Examples:\n  python agents/run.py gm --all --batch\n  python agents/run.py check-batch\n  python agents/run.py download-batch\n  python agents/run.py gm --team TEN\n  python agents/run.py scouting --position EDGE --batch")
    p.add_argument("agent", help="scouting, gm, check-batch, or download-batch")
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--model", help="Override default model")
    p.add_argument("--batch", action="store_true", help="Use batch mode (50%% cheaper)")
    p.add_argument("--prospect", help="Single prospect name")
    p.add_argument("--position", help="Position group (EDGE, QB, etc.)")
    p.add_argument("--team", help="Single team (TEN, BAL, etc.)")
    p.add_argument("--division", help="Division name")
    p.add_argument("--all", action="store_true", help="All 32 teams")
    p.add_argument("--message", help="Freeform message for generic agents")
    args = p.parse_args()

    if args.agent == "check-batch": check_setup(); check_batch_status(); return
    if args.agent == "download-batch": check_setup(); download_batch_results(); return
    check_setup()
    if args.agent in ("scouting","scout"): run_scouting_agent(args)
    elif args.agent in ("gm","gm-personality"): run_gm_agent(args)
    else:
        if not args.message: print(f"❌ Provide --message for custom agents"); sys.exit(1)
        run_generic_agent(args)

if __name__ == "__main__":
    main()
