#!/usr/bin/env python3
"""
BBL Agent Runner - Batch + Real-time
python agents/run.py gm --all --batch       # submit all 32 GMs as batch (50% off)
python agents/run.py check-batch            # check status
python agents/run.py download-batch         # download results when done
python agents/run.py gm --team TEN          # real-time single team
python agents/run.py scouting --prospect "Cam Ward"
python agents/run.py scouting --position EDGE --batch
python agents/run.py pro-day --all --batch         # batch all completed pro days
python agents/run.py pro-day --school "Wisconsin"  # single school real-time
"""
import os, sys, json, time, argparse, re
from pathlib import Path
from datetime import datetime, date

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
    "scheme": "claude-opus-4-6",
    "team-needs": "claude-opus-4-6",
    "pro-day": "claude-opus-4-6",
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

def call_agent(system_prompt, user_message, model, max_tokens=48000):
    import anthropic
    client = anthropic.Anthropic()
    try:
        text_parts = []
        usage = None
        with client.messages.stream(
            model=model, max_tokens=max_tokens, system=system_prompt,
            tools=[{"type": "web_search_20250305", "name": "web_search"}],
            messages=[{"role": "user", "content": user_message}],
        ) as stream:
            for event in stream:
                pass
            response = stream.get_final_message()
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

    if args.force:
        for t in teams:
            for ext in [f"{t}.json", f"{t}_raw.md"]:
                p = out / ext
                if p.exists(): p.unlink(); print(f"🗑️  Deleted {ext}")
        to_run = teams
    else:
        to_run = [t for t in teams if not (out / f"{t}.json").exists() or args.dry_run]
        skipped = [t for t in teams if t not in to_run]
        for t in skipped: print(f"⏭️  {t} — already done")
    if not to_run: print("\nAll done. Use --force to re-run."); return

    def make_msg(team):
        return (f"Research the {team} front office and produce a complete GM personality profile. "
                f"Follow your full research methodology: scouting tree, decision-making structure, "
                f"draft history analysis, public statements, trade history, reported intel, "
                f"and player archetype analysis. Output the complete JSON profile as specified in your instructions.\n\n"
                f"CRITICAL QUALITY REQUIREMENTS — do not skip any of these:\n"
                f"- Scouting tree: trace the FULL career path with every role, org, years, and mentor at each stop. "
                f"Do not compress into 1-2 entries — list every distinct role.\n"
                f"- Player archetype preferences: ALL 11 positions (QB, EDGE, OT, IOL, DT, CB, S, LB, WR, TE, RB) "
                f"must have COMPLETE profiles. No position may be empty or stub.\n"
                f"- For each position's playing_style: provide 3-5 most_valued_traits, 2-3 deal_breakers, "
                f"and 1-2 least_important_traits. Be specific and evidence-based, not generic.\n"
                f"- physical_profile must include height_range, weight_range, arm_length_minimum, "
                f"key_athletic_tests, and speed_requirement for every position.\n"
                f"- Evidence must cite real drafted players with actual measurables (height, weight, 40, arms).\n"
                f"- Output ONLY the JSON object. Do not include any preamble, research narrative, or markdown "
                f"fencing. Start with {{ and end with }}.")

    if args.batch:
        if args.dry_run:
            print(f"\nDRY RUN — would batch {len(to_run)} teams: {', '.join(to_run)}"); return
        reqs = [{"custom_id": t, "params": {"model": model, "max_tokens": 48000, "system": spec,
                 "tools": [{"type": "web_search_20250305", "name": "web_search"}],
                 "messages": [{"role": "user", "content": make_msg(t)}]}} for t in to_run]
        submit_batch(reqs, "gm-personality"); return

    for i, t in enumerate(to_run, 1):
        print(f"\n🧠 [{i}/{len(to_run)}] Researching: {t}")
        if args.dry_run: print(f"   DRY RUN"); continue
        result = call_agent(spec, make_msg(t), model, 48000)
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

# --- SCHEME AGENT ---

def run_scheme_agent(args):
    spec = load_agent_spec("scheme")
    model = args.model or DEFAULT_MODELS["scheme"]
    out = OUTPUT_DIR / "scheme-profiles"
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

    if args.force:
        for t in teams:
            for ext in [f"{t}.json", f"{t}_raw.md"]:
                p = out / ext
                if p.exists(): p.unlink(); print(f"🗑️  Deleted {ext}")
        to_run = teams
    else:
        to_run = [t for t in teams if not (out / f"{t}.json").exists() or args.dry_run]
        skipped = [t for t in teams if t not in to_run]
        for t in skipped: print(f"⏭️  {t} — already done")
    if not to_run: print("\nAll done. Use --force to re-run."); return

    def make_msg(team):
        return (f"Research the {team} coaching staff and produce a complete scheme profile. "
                f"Follow your full research methodology: coaching staff identification, offensive scheme, "
                f"defensive scheme (with front alignment), and positional value inflections. "
                f"CRITICAL: Use the CURRENT 2025-2026 coaching staff. Verify any recent coaching changes. "
                f"Output the complete JSON profile as specified in your instructions.\n\n"
                f"QUALITY REQUIREMENTS:\n"
                f"- Identify the current HC, OC, and DC with their scheme trees\n"
                f"- Classify base front (3-4 vs 4-3 vs hybrid) with evidence\n"
                f"- All four positional value inflections (TE receiving, LB pass rush, RB dual threat, S hybrid) "
                f"must have ratings AND specific explanations\n"
                f"- scheme_specific_draft_notes must be actionable, not generic\n"
                f"- Output ONLY the JSON object. Start with {{ and end with }}.")

    if args.batch:
        if args.dry_run:
            print(f"\nDRY RUN — would batch {len(to_run)} teams: {', '.join(to_run)}"); return
        reqs = [{"custom_id": t, "params": {"model": model, "max_tokens": 16000, "system": spec,
                 "tools": [{"type": "web_search_20250305", "name": "web_search"}],
                 "messages": [{"role": "user", "content": make_msg(t)}]}} for t in to_run]
        submit_batch(reqs, "scheme"); return

    for i, t in enumerate(to_run, 1):
        print(f"\n🏈 [{i}/{len(to_run)}] Researching scheme: {t}")
        if args.dry_run: print(f"   DRY RUN"); continue
        result = call_agent(spec, make_msg(t), model, 16000)
        jd = extract_json(result)
        if jd: (out / f"{t}.json").write_text(json.dumps(jd, indent=2)); print(f"   ✅ Saved")
        else: (out / f"{t}_raw.md").write_text(result); print(f"   ⚠️  No JSON, raw saved")
        time.sleep(DELAY_BETWEEN_CALLS_SECONDS)

# --- TEAM NEEDS AGENT ---

def run_team_needs_agent(args):
    spec = load_agent_spec("team-needs")
    model = args.model or DEFAULT_MODELS["team-needs"]
    out = OUTPUT_DIR / "team-needs"
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

    if args.force:
        for t in teams:
            for ext in [f"{t}.json", f"{t}_raw.md"]:
                p = out / ext
                if p.exists(): p.unlink(); print(f"🗑️  Deleted {ext}")
        to_run = teams
    else:
        to_run = [t for t in teams if not (out / f"{t}.json").exists() or args.dry_run]
        skipped = [t for t in teams if t not in to_run]
        for t in skipped: print(f"⏭️  {t} — already done")
    if not to_run: print("\nAll done. Use --force to re-run."); return

    def make_msg(team):
        return (f"Research the {team} roster and produce a complete team needs assessment for the 2026 NFL Draft. "
                f"Follow your full research methodology: current roster assessment, 2026 free agency moves, "
                f"draft capital, and need prioritization. "
                f"CRITICAL: This must reflect the CURRENT state as of March 2026. Research all free agency "
                f"signings, trades, cuts, and retirements that have happened this offseason. "
                f"Stale needs from December/January are NOT acceptable.\n\n"
                f"QUALITY REQUIREMENTS:\n"
                f"- Use GRANULAR positions: EDGE not DE, OT not OL, IOL not G, CB/S not DB\n"
                f"- Every need must cite the current starter and explain WHY it's a need\n"
                f"- Include free_agency_impact with specific moves that changed the picture\n"
                f"- Include both simple_needs (broad groups for backwards compat) and needs_summary (granular tiers)\n"
                f"- detailed_needs must use broad groups (QB, WR, OL, DL, DB, LB, TE, RB) with urgency scores\n"
                f"- scheme_fit_notes should briefly note how scheme affects what types of players fit\n"
                f"- Output ONLY the JSON object. Start with {{ and end with }}.")

    if args.batch:
        if args.dry_run:
            print(f"\nDRY RUN — would batch {len(to_run)} teams: {', '.join(to_run)}"); return
        reqs = [{"custom_id": t, "params": {"model": model, "max_tokens": 16000, "system": spec,
                 "tools": [{"type": "web_search_20250305", "name": "web_search"}],
                 "messages": [{"role": "user", "content": make_msg(t)}]}} for t in to_run]
        submit_batch(reqs, "team-needs"); return

    for i, t in enumerate(to_run, 1):
        print(f"\n📋 [{i}/{len(to_run)}] Researching needs: {t}")
        if args.dry_run: print(f"   DRY RUN"); continue
        result = call_agent(spec, make_msg(t), model, 16000)
        jd = extract_json(result)
        if jd: (out / f"{t}.json").write_text(json.dumps(jd, indent=2)); print(f"   ✅ Saved")
        else: (out / f"{t}_raw.md").write_text(result); print(f"   ⚠️  No JSON, raw saved")
        time.sleep(DELAY_BETWEEN_CALLS_SECONDS)

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
        print(f"\n🔬 Discovering {pos} prospects from codebase...")
        # Normalize names the same way the codebase does (combineTraits.js)
        NAME_ALIASES = {"jam miller":"jamarion miller","nicholas singleton":"nick singleton",
                        "kc concepcion":"kevin concepcion","j michael sturdivant":"jmichael sturdivant"}
        def norm_name(n):
            n = n.lower().replace(".", "").replace("'", "").strip()
            n = re.sub(r'\s+(jr|sr|ii|iii|iv|v)\s*$', '', n)
            n = re.sub(r'\s+', ' ', n).strip()
            return NAME_ALIASES.get(n, n)

        # Build gpos lookup from prospectStats.js (granular: EDGE, DT, CB, S, OT, IOL, etc.)
        stats_path = PROJECT_ROOT / "src" / "prospectStats.js"
        gpos_by_name = {}  # normalized name -> gpos
        if stats_path.exists():
            stats_text = stats_path.read_text()
            for m in re.finditer(r'"([^|"]+)\|([^"]+)":\{[^}]*"gpos":"([^"]+)"', stats_text):
                gpos_by_name[norm_name(m.group(1))] = m.group(3)

        # Get ordered prospect list from consensus board (consensusData.js)
        consensus_path = PROJECT_ROOT / "src" / "consensusData.js"
        prospects = []
        if consensus_path.exists():
            consensus_text = consensus_path.read_text()
            for m in re.finditer(r'"([^"]+)"', consensus_text):
                name = m.group(1)
                norm = norm_name(name)
                gpos = gpos_by_name.get(norm)
                if gpos == pos:
                    prospects.append(name)
        if not prospects:
            print(f"❌ No {pos} prospects found in consensus board"); sys.exit(1)
        to_run = []
        for n in prospects:
            safe = n.lower().replace(" ","_").replace("'","")
            if not (pos_out / f"{safe}.json").exists(): to_run.append((n, safe))
            else: print(f"   ⏭️  {n} — done")
        print(f"   {len(prospects)} found, {len(to_run)} need scouting")
        if not to_run: return
        if args.dry_run: print(f"   DRY RUN — would {'batch' if args.batch else 'scout'} {len(to_run)}"); return

        if args.batch:
            reqs = []
            seen_ids = set()
            for name, safe in to_run:
                cid = re.sub(r'[^a-zA-Z0-9_-]', '', safe)[:64]
                if cid in seen_ids:
                    print(f"   ⏭️  {name} — duplicate id, skipping")
                    continue
                seen_ids.add(cid)
                reqs.append({"custom_id": cid, "params": {"model": model, "max_tokens": 8000, "system": spec,
                     "tools": [{"type": "web_search_20250305", "name": "web_search"}],
                     "messages": [{"role": "user", "content": f"Scout {name}, position {pos}. Follow single prospect workflow. Note any paywalled sources."}]}})
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

# --- PRO DAY AGENT ---

def parse_pro_day_schedule():
    """Parse agents/pro-day/schedule.txt → {school: latest_date_str}"""
    sched_path = AGENTS_DIR / "pro-day" / "schedule.txt"
    if not sched_path.exists():
        print(f"❌ Schedule not found: {sched_path}"); sys.exit(1)
    schedule = {}
    current_date = None
    for line in sched_path.read_text().splitlines():
        line = line.strip()
        if not line:
            continue
        if re.match(r'^(March|April)\s+\d+$', line):
            current_date = line
        elif current_date:
            schedule[line] = current_date  # last occurrence wins for dupes
    return schedule

def parse_date_2026(date_str):
    """Parse 'March 5' → date(2026, 3, 5)."""
    return datetime.strptime(f"{date_str} 2026", "%B %d %Y").date()

def run_pro_day_agent(args):
    spec = load_agent_spec("pro-day")
    model = args.model or DEFAULT_MODELS["pro-day"]
    out = OUTPUT_DIR / "pro-day"
    out.mkdir(parents=True, exist_ok=True)

    schedule = parse_pro_day_schedule()

    if args.school:
        # Find school in schedule (case-insensitive)
        matched = None
        for s in schedule:
            if s.lower() == args.school.lower():
                matched = s; break
        if not matched:
            # Fuzzy: check if school name is contained in any schedule entry
            for s in schedule:
                if args.school.lower() in s.lower():
                    matched = s; break
        if not matched:
            print(f"❌ '{args.school}' not found in schedule. Available schools:")
            for s, d in sorted(schedule.items()):
                print(f"   {d}: {s}")
            sys.exit(1)
        schools = {matched: schedule[matched]}
    elif args.all:
        today = date.today()
        schools = {s: d for s, d in schedule.items() if parse_date_2026(d) <= today}
        if not schools:
            print("❌ No pro days have occurred yet (based on today's date).")
            print(f"   Next pro day: {min(schedule.items(), key=lambda x: parse_date_2026(x[1]))}")
            sys.exit(1)
        print(f"📋 {len(schools)} pro days completed as of {today.strftime('%B %d')}:")
        for s, d in sorted(schools.items(), key=lambda x: parse_date_2026(x[1])):
            print(f"   {d}: {s}")
    else:
        print("❌ Specify --school or --all"); sys.exit(1)

    # Determine which need processing
    if args.force:
        to_run = schools
    else:
        to_run = {}
        for s, d in schools.items():
            safe = re.sub(r'[^a-zA-Z0-9_-]', '_', s.lower().replace(' ', '_').replace('.', ''))
            if not (out / f"{safe}.json").exists():
                to_run[s] = d
            else:
                print(f"⏭️  {s} — already done")
        if not to_run:
            print("\nAll done. Use --force to re-run."); return

    def make_msg(school, date_str):
        return (f"Research the {school} Pro Day held on {date_str}, 2026.\n\n"
                f"Find and record testing results for EVERY participant. Search thoroughly using "
                f"multiple queries and sources. Record all measurements (height, weight, arms, hands, "
                f"wingspan) and all drills (40-yard dash, vertical jump, broad jump, bench press, "
                f"3-cone, shuttle) for every prospect who worked out.\n\n"
                f"CRITICAL REQUIREMENTS:\n"
                f"- Include ALL participants, not just notable prospects. Pro days typically have 10-30+ participants.\n"
                f"- Convert all heights to total inches (6'2\" = 74.0, 6'4 3/4\" = 76.75).\n"
                f"- Convert all fractional measurements to decimal (33 1/4\" = 33.25).\n"
                f"- Use null for any drill/measurement not reported.\n"
                f"- Note if times are hand-timed vs electronic.\n"
                f"- Include visiting prospects from other schools (note their actual school in notes).\n"
                f"- Cross-reference multiple sources for accuracy on key numbers.\n"
                f"- Output ONLY the JSON object as specified. Start with {{ and end with }}.")

    if args.batch:
        if args.dry_run:
            print(f"\nDRY RUN — would batch {len(to_run)} schools: {', '.join(to_run.keys())}"); return
        reqs = []
        for school, d in to_run.items():
            safe = re.sub(r'[^a-zA-Z0-9_-]', '_', school.lower().replace(' ', '_').replace('.', ''))[:64]
            reqs.append({"custom_id": safe, "params": {"model": model, "max_tokens": 16000, "system": spec,
                         "tools": [{"type": "web_search_20250305", "name": "web_search"}],
                         "messages": [{"role": "user", "content": make_msg(school, d)}]}})
        submit_batch(reqs, "pro-day"); return

    for i, (school, d) in enumerate(to_run.items(), 1):
        safe = re.sub(r'[^a-zA-Z0-9_-]', '_', school.lower().replace(' ', '_').replace('.', ''))
        print(f"\n🏟️  [{i}/{len(to_run)}] Researching: {school} ({d})")
        if args.dry_run: print(f"   DRY RUN"); continue
        result = call_agent(spec, make_msg(school, d), model, 16000)
        jd = extract_json(result)
        if jd: (out / f"{safe}.json").write_text(json.dumps(jd, indent=2)); print(f"   ✅ Saved")
        else: (out / f"{safe}_raw.md").write_text(result); print(f"   ⚠️  No JSON, raw saved")
        time.sleep(DELAY_BETWEEN_CALLS_SECONDS)

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
        epilog="Examples:\n  python agents/run.py gm --all --batch\n  python agents/run.py check-batch\n  python agents/run.py download-batch\n  python agents/run.py gm --team TEN\n  python agents/run.py scouting --position EDGE --batch\n  python agents/run.py pro-day --all --batch\n  python agents/run.py pro-day --school Wisconsin")
    p.add_argument("agent", help="scouting, gm, check-batch, or download-batch")
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--model", help="Override default model")
    p.add_argument("--batch", action="store_true", help="Use batch mode (50%% cheaper)")
    p.add_argument("--prospect", help="Single prospect name")
    p.add_argument("--position", help="Position group (EDGE, QB, etc.)")
    p.add_argument("--team", help="Single team (TEN, BAL, etc.)")
    p.add_argument("--division", help="Division name")
    p.add_argument("--school", help="School name for pro-day agent")
    p.add_argument("--all", action="store_true", help="All 32 teams")
    p.add_argument("--force", action="store_true", help="Overwrite existing results")
    p.add_argument("--message", help="Freeform message for generic agents")
    args = p.parse_args()

    if args.agent == "check-batch": check_setup(); check_batch_status(); return
    if args.agent == "download-batch": check_setup(); download_batch_results(); return
    check_setup()
    if args.agent in ("scouting","scout"): run_scouting_agent(args)
    elif args.agent in ("gm","gm-personality"): run_gm_agent(args)
    elif args.agent == "scheme": run_scheme_agent(args)
    elif args.agent in ("team-needs","needs"): run_team_needs_agent(args)
    elif args.agent in ("pro-day","proday"): run_pro_day_agent(args)
    else:
        if not args.message: print(f"❌ Provide --message for custom agents"); sys.exit(1)
        run_generic_agent(args)

if __name__ == "__main__":
    main()
