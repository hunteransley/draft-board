#!/usr/bin/env python3
"""
Patch missing boom_bust_variance into existing scouting output files.
Reads each player's existing JSON, asks Claude for just the boom_bust field,
patches the file in place, then re-run transform_scouting.py to apply.

Usage: python3 agents/patch_boom_bust.py
"""
import os, sys, json, time
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SCOUTING_DIR = PROJECT_ROOT / "agents" / "output" / "scouting"
NARRATIVES_FILE = PROJECT_ROOT / "src" / "scoutingNarratives.json"

MISSING = [
    "aaron hall","aidan hubbard","aiden fisher","aj haulcy","albert regis",
    "andre fuller","arvell reese","bishop fitzgerald","blake cotton",
    "bobby jamison-travis","bryan thomas","bryson eason","bud clark",
    "caden barnett","caleb banks","cashius howell","charles demmings",
    "chris mcclellan","cj allen","cole brevard","collin wright","colton hood",
    "d'angelo ponds","dariel djabome","david blay","david gusta",
    "declan williams","deshon singleton","domani jackson","dq smith",
    "harold perkins","hero kanu","jack pyburn","jadon canady","jalen huskey",
    "james thompson","jarod washington","jermod mccoy","justin jefferson",
    "keeshawn silver","keionte scott","kendal daniels","keyshawn james-newby",
    "kyle louis","landon robinson","lee hunter","logan fano","louis moore",
    "malachi lawrence","malik muhammad","mansoor delane","nick barrett",
    "nyjalik kelly","owen heinecke","quintayvious hutchins","r mason thomas",
    "red murdock","scooby williams","taurean york","tj hall","tomas rimac",
    "toriano pride","treydan stukes","wydett williams","xavier nwankpa",
    "zane durant","zion young"
]

def get_api_key():
    key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not key:
        env_file = PROJECT_ROOT / ".env"
        if env_file.exists():
            for line in env_file.read_text().splitlines():
                if line.startswith("ANTHROPIC_API_KEY="):
                    key = line.split("=", 1)[1].strip().strip('"').strip("'")
    return key

def find_output_file(name):
    safe = name.lower().replace(" ", "_").replace("'", "")
    # Check flat directory first
    fp = SCOUTING_DIR / f"{safe}.json"
    if fp.exists():
        return fp
    # Check position subdirectories
    for sub in SCOUTING_DIR.iterdir():
        if sub.is_dir():
            fp2 = sub / f"{safe}.json"
            if fp2.exists():
                return fp2
    return None

def build_prompt(name, data):
    blurb = data.get("scouting_blurb") or data.get("synthesis_notes") or ""
    strengths = data.get("strengths") or []
    weaknesses = data.get("weaknesses") or []
    talent_grade = data.get("talent_grade", "unknown")
    proj_range = data.get("projected_draft_range", "unknown")

    return f"""You are a NFL draft analyst. Based on this scouting data for {name.title()}, generate a boom_bust_variance object.

SCOUTING BLURB:
{blurb[:800] if blurb else "N/A"}

TOP STRENGTHS: {"; ".join(strengths[:3]) if strengths else "N/A"}
TOP WEAKNESSES: {"; ".join(weaknesses[:3]) if weaknesses else "N/A"}
TALENT GRADE: {talent_grade}/100
PROJECTED RANGE: {proj_range}

Respond with ONLY valid JSON in this exact format (no markdown, no extra text):
{{
  "boom_bust_variance": {{
    "level": "low|medium|high",
    "explanation": "2-4 sentences explaining the outcome range, floor, and ceiling."
  }}
}}

Guidelines:
- low = tight outcome range, player will likely be what they appear (reliable starter or reliable backup)
- medium = meaningful upside/downside gap, outcome depends on development or scheme
- high = wide variance, could be a star or a bust depending on factors that are genuinely uncertain"""

def main():
    api_key = get_api_key()
    if not api_key:
        print("❌ No ANTHROPIC_API_KEY found"); sys.exit(1)

    try:
        import anthropic
    except ImportError:
        print("❌ Run: pip3 install anthropic"); sys.exit(1)

    client = anthropic.Anthropic(api_key=api_key)

    patched = 0
    skipped = 0
    failed = 0

    for i, name in enumerate(MISSING, 1):
        safe = name.lower().replace(" ", "_").replace("'", "")
        fp = find_output_file(name)

        if not fp:
            print(f"[{i}/{len(MISSING)}] ⚠️  {name} — output file not found, skipping")
            skipped += 1
            continue

        data = json.loads(fp.read_text())

        # Already has it (in case we re-run)
        if data.get("boom_bust_variance"):
            print(f"[{i}/{len(MISSING)}] ⏭️  {name} — already has boom_bust_variance")
            skipped += 1
            continue

        print(f"[{i}/{len(MISSING)}] 🔬 {name}...", end=" ", flush=True)

        try:
            response = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=400,
                messages=[{"role": "user", "content": build_prompt(name, data)}]
            )
            text = response.content[0].text.strip()
            # Strip markdown if present
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            parsed = json.loads(text)
            bb = parsed.get("boom_bust_variance")
            if not bb or "level" not in bb or "explanation" not in bb:
                raise ValueError(f"Missing fields in response: {parsed}")

            data["boom_bust_variance"] = bb
            fp.write_text(json.dumps(data, indent=2))
            print(f"✅ {bb['level']}")
            patched += 1

        except Exception as e:
            print(f"❌ {e}")
            failed += 1

        # Small delay to avoid rate limits
        if i < len(MISSING):
            time.sleep(1)

    print(f"\n✅ Patched: {patched}  ⏭️  Skipped: {skipped}  ❌ Failed: {failed}")
    if patched > 0:
        print("\nNow run: python3 agents/transform_scouting.py")

if __name__ == "__main__":
    main()
