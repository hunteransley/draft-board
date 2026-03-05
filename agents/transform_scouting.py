#!/usr/bin/env python3
"""
Transform agent scouting output into scoutingTraits.json format.

Reads all JSON files from agents/output/scouting/ (nested trait objects with
grade/confidence/notes) and the raw_extracted.json fallback, then merges into
the flat {trait: number} format that src/scoutingTraits.json expects.

Usage:
  python3 agents/transform_scouting.py              # preview changes
  python3 agents/transform_scouting.py --write       # overwrite scoutingTraits.json
  python3 agents/transform_scouting.py --diff        # show side-by-side diffs
  python3 agents/transform_scouting.py --suggest     # show suggested new traits
"""
import json, os, re, sys
from pathlib import Path
from collections import defaultdict

PROJECT_ROOT = Path(__file__).resolve().parent.parent
AGENT_DIR = PROJECT_ROOT / "agents" / "output" / "scouting"
TRAITS_FILE = PROJECT_ROOT / "src" / "scoutingTraits.json"
RAW_EXTRACTED = AGENT_DIR / "raw_extracted.json"
CONSENSUS_FILE = PROJECT_ROOT / "src" / "consensusData.js"

# ── Name / school normalization ──────────────────────────────────────────────

NAME_ALIASES = {
    "jam miller": "jamarion miller",
    "nicholas singleton": "nick singleton",
    "kc concepcion": "kevin concepcion",
    "j michael sturdivant": "jmichael sturdivant",
    "marquarius white": "squirrel white",
}

SCHOOL_ALIASES = {
    "ole miss": "mississippi",
    "ole miss (mississippi)": "mississippi",
    "ole miss (university of mississippi)": "mississippi",
    "university at buffalo": "buffalo",
    "southern miss": "southern mississippi",
    "smu": "smu",
    "southern methodist university (smu)": "smu",
    "southern methodist": "smu",
    "usc": "usc",
    "usc (southern california)": "usc",
    "usc (university of southern california)": "usc",
    "uconn": "connecticut",
    "james madison university": "james madison",
    "rutgers university": "rutgers",
    "duke university": "duke",
    "john carroll university": "john carroll",
    "slippery rock university": "slippery rock",
    "south carolina state university": "south carolina state",
    "virginia union university": "virginia union",
    "the incarnate word": "incarnate word",
    "university of the incarnate word": "incarnate word",
}


def normalize_name(name):
    """Match scoutingData.js normalize: strip periods, Jr/Sr/II-V, apply aliases."""
    n = name.lower().replace(".", "").strip()
    n = re.sub(r"\s+(jr|sr|ii|iii|iv|v)\s*$", "", n, flags=re.IGNORECASE)
    n = re.sub(r"\s+", " ", n).strip()
    # Strip quotes / apostrophes and nicknames in quotes
    n = re.sub(r"['\u2018\u2019].*?['\u2018\u2019]\s*", "", n).strip()
    return NAME_ALIASES.get(n, n)


def clean_school(school):
    """Strip transfer annotations, 'University of', and apply aliases."""
    s = school.strip()
    # Remove parenthetical transfer/history notes
    s = re.sub(r"\s*\((?:transferred?|previously|prev\.|transfer|final).*?\)", "", s,
               flags=re.IGNORECASE).strip()
    # Remove semicolon-delimited history ("Texas Tech ; previously ...")
    s = re.sub(r"\s*;.*$", "", s).strip()
    # Check full aliases first (before stripping "University of")
    sl = s.lower().strip()
    if sl in SCHOOL_ALIASES:
        return SCHOOL_ALIASES[sl]
    # Strip common prefixes/suffixes
    s = re.sub(r"^University of\s+", "", s, flags=re.IGNORECASE)
    s = re.sub(r"\s+University$", "", s, flags=re.IGNORECASE)
    # Remove remaining parentheticals like "(FL)", "(Ragin' Cajuns)"
    s = re.sub(r"\s*\(.*?\)", "", s).strip()
    # Normalize periods in school names (e.g., "Stephen F." → "Stephen F")
    s = s.replace(".", "")
    sl = s.lower().strip()
    if sl in SCHOOL_ALIASES:
        return SCHOOL_ALIASES[sl]
    return s.strip()


def make_key(name, school):
    """Create the scoutingTraits.json lookup key with full normalization."""
    return normalize_name(name) + "|" + clean_school(school).lower()


# ── Ceiling detection ────────────────────────────────────────────────────────

CEILING_KEYWORDS = {
    "elite": ["generational", "elite ceiling", "elite upside",
              "unicorn", "franchise.?changing", "franchise.?level"],
    "high": ["high ceiling", "high upside", "significant upside",
             "tools to develop", "ceiling.*above.?average", "developmental upside"],
    "capped": ["limited ceiling", "capped ceiling", "what you see is what you get",
               "floor.?player", "scheme.?dependent ceiling", "narrow path to"],
}


def detect_ceiling(d):
    """Infer __ceiling from synthesis_notes and suggested_traits."""
    text = (d.get("synthesis_notes", "") + " " +
            json.dumps(d.get("suggested_traits", [])) + " " +
            json.dumps(d.get("consensus_deviation", {})))
    text_lower = text.lower()
    for level, keywords in CEILING_KEYWORDS.items():
        for kw in keywords:
            if re.search(kw, text_lower):
                return level
    return None


# ── New trait estimation ─────────────────────────────────────────────────────

# Suggested trait name variants that map to our canonical new traits
NEW_TRAIT_VARIANTS = {
    "Pass Protection": {
        "positions": {"RB"},
        "agent_names": ["Pass Protection"],
        "estimate": lambda t: _weighted(t, [("Power", 0.5), ("Contact Balance", 0.3), ("Speed", 0.2)]),
    },
    "Block Shedding": {
        "positions": {"LB"},
        "agent_names": ["Block Shedding", "Block Disengagement"],
        "estimate": lambda t: _weighted(t, [("Pass Rush", 0.4), ("Athleticism", 0.35), ("Tackling", 0.25)]),
    },
    "Pre-Snap Diagnosis": {
        "positions": {"QB", "LB"},
        "estimate_by_pos": {
            "QB": lambda t: _weighted(t, [("Decision Making", 0.7), ("Pocket Presence", 0.3)]),
            "LB": lambda t: _weighted(t, [("Instincts", 0.8), ("Coverage", 0.2)]),
        },
        "agent_names": ["Pre-Snap Diagnosis", "Pre-Snap Communication",
                        "Pre-Snap Identification", "Football IQ / Pre-Snap Diagnosis"],
    },
    "Release Package": {
        "positions": {"WR"},
        "agent_names": ["Release Package", "Press Release"],
        "estimate": lambda t: _weighted(t, [("Separation", 0.5), ("Speed", 0.3), ("Route Running", 0.2)]),
    },
}


def _weighted(traits, weights):
    """Compute weighted average from existing traits. Returns None if missing data."""
    total_w = 0
    total_v = 0
    for trait_name, w in weights:
        v = traits.get(trait_name)
        if isinstance(v, (int, float)):
            total_w += w
            total_v += v * w
    if total_w < 0.5:  # need at least half the weight covered
        return None
    return int(round(total_v / total_w))


# ── Data loading ─────────────────────────────────────────────────────────────

def load_agent_data():
    """Load all agent JSON files and raw extractions."""
    prospects = []

    for root, dirs, files in os.walk(AGENT_DIR):
        for f in sorted(files):
            if not f.endswith(".json") or f == "raw_extracted.json":
                continue
            fp = os.path.join(root, f)
            try:
                with open(fp) as fh:
                    d = json.load(fh)
                meta = d.get("prospect", {})
                name = meta.get("name", "")
                school = meta.get("school", "")
                if not name or not school:
                    continue

                # Extract flat traits from nested format
                traits = {}
                raw_traits = d.get("traits", {})
                for tname, tval in raw_traits.items():
                    if isinstance(tval, dict) and "grade" in tval:
                        grade = tval["grade"]
                        if isinstance(grade, (int, float)) and grade > 0:
                            traits[tname] = int(round(grade))
                    elif isinstance(tval, (int, float)):
                        traits[tname] = int(round(tval))

                # Extract suggested trait grades for our new traits
                suggested = extract_new_trait_grades(d)
                ceiling = detect_ceiling(d)

                prospects.append({
                    "name": name,
                    "school": school,
                    "position": meta.get("position", ""),
                    "traits": traits,
                    "suggested_new_traits": suggested,
                    "ceiling": ceiling,
                    "source": "agent",
                    "file": f,
                })
            except (json.JSONDecodeError, KeyError) as e:
                print(f"  ⚠️  Skipped {f}: {e}")

    # Raw extractions
    if RAW_EXTRACTED.exists():
        try:
            with open(RAW_EXTRACTED) as fh:
                raw_data = json.load(fh)
            for entry in raw_data:
                if not entry.get("traits"):
                    continue
                name = entry.get("name", "")
                school = entry.get("school", "")
                if not name or not school:
                    continue
                traits = {}
                for tname, tval in entry["traits"].items():
                    if isinstance(tval, (int, float)) and tval > 0:
                        traits[tname] = int(round(tval))
                if traits:
                    prospects.append({
                        "name": name,
                        "school": school,
                        "position": entry.get("position", ""),
                        "traits": traits,
                        "suggested_new_traits": {},
                        "ceiling": None,
                        "source": "raw_extraction",
                        "file": "raw_extracted.json",
                    })
        except (json.JSONDecodeError, KeyError) as e:
            print(f"  ⚠️  Skipped raw_extracted.json: {e}")

    return prospects


def extract_new_trait_grades(d):
    """Extract grades for our 4 new traits from suggested_traits array."""
    pos = d.get("prospect", {}).get("position", "")
    grades = {}
    for s in d.get("suggested_traits", []):
        tname = s.get("trait_name", "").strip()
        if not tname:
            continue
        for canonical, config in NEW_TRAIT_VARIANTS.items():
            if tname in config["agent_names"] and pos in config["positions"]:
                g = s.get("initial_grade")
                if isinstance(g, (int, float)):
                    grades[canonical] = int(round(g))
                elif isinstance(g, str):
                    try:
                        grades[canonical] = int(round(float(g)))
                    except ValueError:
                        pass
                break
    return grades


# ── Consensus-anchored rescaling ──────────────────────────────────────────────

# Trait weights mirroring App.jsx TRAIT_WEIGHTS (including new traits)
TRAIT_WEIGHTS = {
    "QB": {"Accuracy": .25, "Decision Making": .22, "Pocket Presence": .18,
           "Arm Strength": .15, "Leadership": .09, "Pre-Snap Diagnosis": .08, "Mobility": .03},
    "RB": {"Vision": .22, "Elusiveness": .20, "Contact Balance": .18,
           "Power": .15, "Speed": .10, "Pass Catching": .09, "Pass Protection": .06},
    "WR": {"Route Running": .25, "Separation": .25, "Hands": .18,
           "YAC Ability": .16, "Release Package": .08, "Contested Catches": .05, "Speed": .03},
    "TE": {"Receiving": .20, "Blocking": .20, "Route Running": .18,
           "Hands": .16, "Athleticism": .14, "Speed": .12},
    "OT": {"Pass Protection": .25, "Footwork": .20, "Anchor": .18,
           "Run Blocking": .15, "Athleticism": .12, "Strength": .10},
    "IOL": {"Run Blocking": .22, "Pass Protection": .22, "Strength": .18,
            "Pulling": .14, "Anchor": .13, "Versatility": .11},
    "EDGE": {"Pass Rush": .24, "First Step": .20, "Bend": .18,
             "Power": .15, "Motor": .13, "Run Defense": .10},
    "DL": {"Run Defense": .22, "Pass Rush": .20, "First Step": .18,
           "Hand Usage": .16, "Motor": .14, "Strength": .10},
    "LB": {"Instincts": .22, "Tackling": .20, "Athleticism": .15,
           "Coverage": .12, "Pass Rush": .09, "Range": .08,
           "Pre-Snap Diagnosis": .07, "Block Shedding": .07},
    "CB": {"Man Coverage": .24, "Ball Skills": .20, "Speed": .18,
           "Press": .15, "Zone Coverage": .13, "Nickel": .10},
    "S": {"Man Coverage": .10, "Range": .25, "Ball Skills": .20,
          "Tackling": .20, "Speed": .15, "Nickel": .10},
}


def load_consensus_board():
    """Parse CONSENSUS_BOARD array from consensusData.js → name→rank dict."""
    text = CONSENSUS_FILE.read_text()
    # Extract the array body between [ and ];
    m = re.search(r'CONSENSUS_BOARD\s*=\s*\[(.*?)\];', text, re.DOTALL)
    if not m:
        print("  ⚠️  Could not parse CONSENSUS_BOARD from consensusData.js")
        return {}
    body = m.group(1)
    names = re.findall(r'"([^"]+)"', body)
    # Build name → 1-indexed rank, applying same normalization
    rank_map = {}
    for i, name in enumerate(names):
        rank_map[normalize_name(name)] = i + 1
    return rank_map


def consensus_grade(rank):
    """Port of getConsensusGrade from consensusData.js (lines 173-185)."""
    if rank <= 5:
        return round(97 - rank * 0.6)
    if rank <= 15:
        return round(94 - (rank - 5) * 0.6)
    if rank <= 32:
        return round(88 - (rank - 15) * 0.35)
    if rank <= 64:
        return round(82 - (rank - 32) * 0.35)
    if rank <= 100:
        return round(71 - (rank - 64) * 0.22)
    if rank <= 150:
        return round(63 - (rank - 100) * 0.16)
    if rank <= 224:
        return round(55 - (rank - 150) * 0.12)
    if rank <= 320:
        return round(46 - (rank - 224) * 0.06)
    if rank <= 450:
        return round(40 - (rank - 320) * 0.04)
    return 30


def target_raw(grade):
    """Inverse of gradeFromTraits piecewise remap (App.jsx:1301-1305).

    gradeFromTraits maps: raw >= 90 → ~raw, 80-90 → 70+2*(raw-80), etc.
    This inverts that to find the raw trait avg needed to produce `grade`.
    """
    if grade >= 90:
        return grade               # raw >= 90 maps ~linearly
    if grade >= 70:
        return 80 + (grade - 70) / 2
    if grade >= 50:
        return 70 + (grade - 50) / 2
    return 60 + (grade - 30) / 2


def weighted_avg(traits, pos):
    """Compute weighted trait average matching App.jsx gradeFromTraits logic."""
    weights = TRAIT_WEIGHTS.get(pos, {})
    if not weights:
        return None
    total_w = 0
    total_v = 0
    for trait, w in weights.items():
        v = traits.get(trait)
        if isinstance(v, (int, float)):
            total_w += w
            total_v += v * w
    return total_v / total_w if total_w > 0 else None


def rescale_traits(traits, pos, consensus_rank):
    """Spread-preserving rescale: anchor to consensus, keep trait shape.

    Above-mean traits compress proportionally to fit [target, 99].
    Below-mean traits preserve full deviation from mean.
    Floor based on consensus grade prevents top picks having "bad" traits.
    For mid/late picks with ample headroom, both scales ≈ 1.0 (≈ uniform shift).
    """
    if consensus_rank >= 999:
        return traits  # No consensus data, keep as-is

    grade = consensus_grade(consensus_rank)
    target = target_raw(grade)
    current = weighted_avg(traits, pos)
    if current is None:
        return traits

    # Floor: top picks can't have embarrassingly low traits
    floor = max(30, round(grade * 0.7))

    # Find max deviations above/below the weighted mean
    numeric = {k: v for k, v in traits.items()
               if isinstance(v, (int, float)) and not k.startswith("__")}
    if not numeric:
        return traits

    max_pos_dev = max((v - current for v in numeric.values() if v > current), default=0)
    max_neg_dev = max((current - v for v in numeric.values() if v < current), default=0)

    # Scale factors: compress whichever direction needs it to stay in bounds
    scale_up = min(1.0, (99 - target) / max_pos_dev) if max_pos_dev > 0 else 1.0
    scale_down = min(1.0, (target - floor) / max_neg_dev) if max_neg_dev > 0 else 1.0

    rescaled = {}
    for k, v in traits.items():
        if k.startswith("__"):
            rescaled[k] = v
            continue
        if isinstance(v, (int, float)):
            dev = v - current
            if dev >= 0:
                new_val = target + dev * scale_up
            else:
                new_val = target + dev * scale_down
            rescaled[k] = max(floor, min(99, round(new_val)))
        else:
            rescaled[k] = v
    return rescaled


# ── Transform ────────────────────────────────────────────────────────────────

def transform():
    """Build the merged scoutingTraits dict."""
    with open(TRAITS_FILE) as f:
        baseline = json.load(f)

    # Build a normalized-key → original-key mapping for baseline
    baseline_norm = {}
    for orig_key in baseline:
        parts = orig_key.split("|", 1)
        if len(parts) == 2:
            norm_key = normalize_name(parts[0]) + "|" + parts[1]
            baseline_norm[norm_key] = orig_key

    # Load consensus board for rescaling
    consensus_ranks = load_consensus_board()

    prospects = load_agent_data()
    print(f"Loaded {len(prospects)} agent prospect files")

    merged = dict(baseline)
    updated = 0
    added = 0
    unchanged = 0
    new_trait_stats = defaultdict(lambda: {"agent": 0, "estimated": 0, "skipped": 0})
    diffs = []

    for p in prospects:
        key = make_key(p["name"], p["school"])
        if not p["traits"]:
            continue

        # Try to find the baseline entry (exact key or normalized match)
        baseline_key = None
        if key in baseline:
            baseline_key = key
        elif key in baseline_norm:
            baseline_key = baseline_norm[key]

        old = baseline.get(baseline_key, {}) if baseline_key else {}

        # Start with baseline traits, then overlay agent grades
        new_traits = {k: v for k, v in old.items() if k != "__ceiling"}
        new_traits.update(p["traits"])

        # Add new traits: use agent grade if available, else estimate
        for canonical, config in NEW_TRAIT_VARIANTS.items():
            if p["position"] not in config["positions"]:
                continue
            if canonical in p["suggested_new_traits"]:
                new_traits[canonical] = p["suggested_new_traits"][canonical]
                new_trait_stats[canonical]["agent"] += 1
            elif canonical not in new_traits:
                # Estimate from correlated traits
                if "estimate_by_pos" in config:
                    est_fn = config["estimate_by_pos"].get(p["position"])
                else:
                    est_fn = config.get("estimate")
                if est_fn:
                    est = est_fn(new_traits)
                    if est is not None:
                        new_traits[canonical] = est
                        new_trait_stats[canonical]["estimated"] += 1
                    else:
                        new_trait_stats[canonical]["skipped"] += 1

        # Consensus-anchored rescaling: shift all traits so weighted avg
        # matches the grade implied by the prospect's consensus rank
        norm_name = normalize_name(p["name"])
        c_rank = consensus_ranks.get(norm_name, 999)
        new_traits = rescale_traits(new_traits, p["position"], c_rank)

        # Ceiling: only apply agent ceiling if existing is normal/unset
        existing_ceiling = old.get("__ceiling")
        if existing_ceiling and existing_ceiling != "normal":
            # Preserve existing non-normal ceiling
            new_traits["__ceiling"] = existing_ceiling
        elif p["ceiling"]:
            new_traits["__ceiling"] = p["ceiling"]
        elif existing_ceiling:
            new_traits["__ceiling"] = existing_ceiling

        # Use the original baseline key if it exists, else the normalized key
        write_key = baseline_key if baseline_key else key

        if baseline_key:
            old_comparable = {k: v for k, v in old.items() if k != "__ceiling"}
            new_comparable = {k: v for k, v in new_traits.items() if k != "__ceiling"}
            if old_comparable != new_comparable:
                updated += 1
                diffs.append((write_key, old, new_traits, p))
            else:
                unchanged += 1
        else:
            added += 1
            diffs.append((write_key, {}, new_traits, p))

        merged[write_key] = new_traits
        # Remove the old key if we normalized to a different one
        if baseline_key and baseline_key != write_key and baseline_key in merged:
            del merged[baseline_key]

    return merged, diffs, updated, added, unchanged, new_trait_stats


def collect_suggested_traits():
    """Collect and deduplicate suggested traits across all agent files."""
    suggestions = defaultdict(lambda: {"count": 0, "positions": set(),
                                        "grades": [], "weights": [],
                                        "definition": "", "prospects": []})

    for root, dirs, files in os.walk(AGENT_DIR):
        for f in sorted(files):
            if not f.endswith(".json") or f == "raw_extracted.json":
                continue
            fp = os.path.join(root, f)
            try:
                with open(fp) as fh:
                    d = json.load(fh)
                name = d.get("prospect", {}).get("name", f)
                pos = d.get("prospect", {}).get("position", "?")
                for s in d.get("suggested_traits", []):
                    tname = s.get("trait_name", "").strip()
                    if not tname:
                        continue
                    entry = suggestions[tname]
                    entry["count"] += 1
                    spos = s.get("position", pos)
                    if isinstance(spos, list):
                        for sp in spos: entry["positions"].add(sp)
                    else:
                        entry["positions"].add(spos)
                    for also in s.get("also_applicable_to", []):
                        entry["positions"].add(also)
                    if s.get("initial_grade"):
                        g = s["initial_grade"]
                        if isinstance(g, (int, float)):
                            entry["grades"].append(g)
                        elif isinstance(g, str):
                            try: entry["grades"].append(float(g))
                            except ValueError: pass
                    if s.get("suggested_weight"):
                        w = s["suggested_weight"]
                        if isinstance(w, (int, float)):
                            entry["weights"].append(w)
                        elif isinstance(w, str):
                            try: entry["weights"].append(float(w))
                            except ValueError: pass
                    if not entry["definition"] and s.get("definition"):
                        entry["definition"] = s["definition"]
                    entry["prospects"].append(f"{name} ({pos})")
            except (json.JSONDecodeError, KeyError):
                continue

    return suggestions


def print_diff(key, old, new, p):
    """Print a single prospect diff."""
    pos = p.get("position", "?")
    print(f"\n  {key} [{pos}]")
    all_traits = sorted(set(list(old.keys()) + list(new.keys())))
    for t in all_traits:
        if t == "__ceiling":
            continue
        ov = old.get(t, "—")
        nv = new.get(t, "—")
        if ov != nv:
            delta = ""
            if isinstance(ov, (int, float)) and isinstance(nv, (int, float)):
                d = nv - ov
                delta = f" ({'+' if d > 0 else ''}{d})"
            print(f"    {t:20s}  {str(ov):>4s} → {str(nv):>4s}{delta}")
    oc = old.get("__ceiling")
    nc = new.get("__ceiling")
    if oc != nc:
        print(f"    {'__ceiling':20s}  {str(oc or '—'):>4s} → {str(nc or '—'):>4s}")


def main():
    write_mode = "--write" in sys.argv
    diff_mode = "--diff" in sys.argv
    suggest_mode = "--suggest" in sys.argv

    if suggest_mode:
        suggestions = collect_suggested_traits()
        frequent = {k: v for k, v in suggestions.items() if v["count"] >= 3}
        print(f"\n{'='*70}")
        print(f"SUGGESTED NEW TRAITS (3+ prospects)")
        print(f"{'='*70}")
        for tname in sorted(frequent, key=lambda x: -frequent[x]["count"]):
            s = frequent[tname]
            positions = ", ".join(sorted(s["positions"]))
            avg_grade = sum(s["grades"]) / len(s["grades"]) if s["grades"] else 0
            avg_weight = sum(s["weights"]) / len(s["weights"]) if s["weights"] else 0
            print(f"\n  {tname} ({s['count']} prospects)")
            print(f"    Positions: {positions}")
            print(f"    Avg grade: {avg_grade:.0f}  |  Avg weight: {avg_weight:.1f}")
            if s["definition"]:
                defn = s["definition"][:120] + ("..." if len(s["definition"]) > 120 else "")
                print(f"    Definition: {defn}")
            print(f"    Prospects: {', '.join(s['prospects'][:8])}" +
                  (f" +{len(s['prospects'])-8} more" if len(s["prospects"]) > 8 else ""))
        return

    merged, diffs, updated, added, unchanged, new_trait_stats = transform()

    print(f"\n{'='*50}")
    print(f"  Updated: {updated}  |  Added: {added}  |  Unchanged: {unchanged}")
    print(f"  Total in merged output: {len(merged)}")
    print(f"{'='*50}")

    if new_trait_stats:
        print(f"\nNew trait coverage:")
        for t in sorted(new_trait_stats):
            s = new_trait_stats[t]
            total = s["agent"] + s["estimated"] + s["skipped"]
            print(f"  {t:20s}  agent={s['agent']:3d}  estimated={s['estimated']:3d}  skipped={s['skipped']:3d}  total={total}")

    # Rescaling spot-check: show weighted avg for a few key ranks
    consensus_ranks = load_consensus_board()
    print(f"\nRescaling spot-check (weighted trait avg → gradeFromTraits output):")
    for check_rank in [1, 32, 100]:
        # Find the prospect at this rank
        target_name = None
        for name, rank in consensus_ranks.items():
            if rank == check_rank:
                target_name = name
                break
        if not target_name:
            continue
        # Find them in merged
        for mk, mv in merged.items():
            parts = mk.split("|", 1)
            if len(parts) == 2 and normalize_name(parts[0]) == target_name:
                # Detect position from diffs or agent data
                pos = None
                for _, _, _, dp in diffs:
                    dk = make_key(dp["name"], dp["school"])
                    if dk == mk or (parts[0] in dk):
                        pos = dp.get("position")
                        break
                if not pos:
                    # Try to infer from prospects
                    for ap in load_agent_data():
                        if make_key(ap["name"], ap["school"]) == mk:
                            pos = ap["position"]
                            break
                if pos:
                    avg = weighted_avg(mv, pos)
                    if avg is not None:
                        # Simulate gradeFromTraits piecewise
                        if avg >= 90:
                            grade = min(99, round(avg))
                        elif avg >= 80:
                            grade = round(70 + (avg - 80) * 2)
                        elif avg >= 70:
                            grade = round(50 + (avg - 70) * 2)
                        else:
                            grade = max(1, round(30 + (avg - 60) * 2))
                        cg = consensus_grade(check_rank)
                        print(f"  Pick {check_rank:3d}: {parts[0]:30s} [{pos}]  avg={avg:.1f}  grade={grade}  (consensus target={cg})")
                break

    if diff_mode:
        big_movers = []
        for key, old, new, p in diffs:
            if not old:
                continue
            max_delta = 0
            for t in set(list(old.keys()) + list(new.keys())):
                if t == "__ceiling":
                    continue
                ov = old.get(t, 0)
                nv = new.get(t, 0)
                if isinstance(ov, (int, float)) and isinstance(nv, (int, float)):
                    max_delta = max(max_delta, abs(nv - ov))
            big_movers.append((max_delta, key, old, new, p))
        big_movers.sort(reverse=True)

        print(f"\nTop 20 biggest changes:")
        for delta, key, old, new, p in big_movers[:20]:
            print_diff(key, old, new, p)

        print(f"\n\nAll {len(diffs)} diffs:")
        for key, old, new, p in sorted(diffs, key=lambda x: x[0]):
            print_diff(key, old, new, p)

    if write_mode:
        sorted_merged = dict(sorted(merged.items()))
        with open(TRAITS_FILE, "w") as f:
            json.dump(sorted_merged, f, indent=2)
        print(f"\n✅ Written to {TRAITS_FILE}")
    else:
        if not diff_mode and not suggest_mode:
            print("\nDry run. Use --write to save, --diff to see changes, --suggest for new traits.")


if __name__ == "__main__":
    main()
