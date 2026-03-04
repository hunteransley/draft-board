# BBL Agent Runner — Setup & Usage

## What This Is

A Python script that runs your BBL agents (scouting, GM research, etc.) by calling the Anthropic API directly with web search enabled. Runs in a separate terminal from Claude Code. No new accounts, no new costs — uses your existing API key and credits.

## Setup (tell Claude Code to do this)

Hand Claude Code these files and say:

> "Put run.py at agents/run.py, put this README at agents/README.md, and make sure the agent specs are at agents/scouting/AGENT.md and agents/gm-personality/AGENT.md. Then run `pip3 install anthropic` if it's not already installed."

Your folder structure should look like:

```
your-bbl-project/
├── agents/
│   ├── run.py                        ← the runner script
│   ├── README.md                     ← this file
│   ├── scouting/
│   │   └── AGENT.md                  ← scouting agent spec
│   ├── gm-personality/
│   │   └── AGENT.md                  ← GM personality agent spec
│   └── output/                       ← created automatically
│       ├── scouting/
│       │   ├── edge/
│       │   ├── qb/
│       │   └── ...
│       └── gm-profiles/
│           ├── TEN.json
│           ├── BAL.json
│           └── gm_index.json
├── CLAUDE.md                         ← add agent routing here
└── ... (rest of your BBL project)
```

## One-Time Setup

Open a terminal and run:

```bash
pip3 install anthropic
```

Then set your API key (the one you already have):

```bash
export ANTHROPIC_API_KEY=sk-ant-your-key-here
```

To make the API key persist so you don't have to set it every time, add that line to your shell config:

```bash
echo 'export ANTHROPIC_API_KEY=sk-ant-your-key-here' >> ~/.zshrc
```

## How to Use

Open a NEW terminal window (separate from Claude Code). Navigate to your BBL project root.

### Scouting Agent

```bash
# Test with one prospect first
python3 agents/run.py scouting --prospect "Cam Ward" --dry-run    # see what it would do
python3 agents/run.py scouting --prospect "Cam Ward"               # actually run it

# Scout an entire position group
python3 agents/run.py scouting --position EDGE --dry-run           # preview
python3 agents/run.py scouting --position EDGE                     # run all EDGE prospects

# Other positions
python3 agents/run.py scouting --position QB
python3 agents/run.py scouting --position CB
python3 agents/run.py scouting --position WR
python3 agents/run.py scouting --position OT
```

### GM Personality Agent

```bash
# Test with one team first
python3 agents/run.py gm --team TEN --dry-run
python3 agents/run.py gm --team TEN

# Run a whole division
python3 agents/run.py gm --division "AFC North"

# Run all 32 teams
python3 agents/run.py gm --all --dry-run    # preview
python3 agents/run.py gm --all              # go time
```

### Any Future Agent

```bash
python3 agents/run.py seo --message "check SEO status and indexing"
python3 agents/run.py trade-roster --message "check for recent trades impacting depth charts"
```

## What Happens When You Run It

1. It checks that Python, the anthropic package, and your API key are all set up
2. It loads the agent spec (AGENT.md) as the system prompt
3. For scouting batches: it discovers all prospects at the position, then scouts them one by one
4. For GM research: it researches each team's front office sequentially
5. Each result is saved as a JSON file in agents/output/
6. If it can't parse JSON from the response, it saves the raw text so nothing is lost
7. If it hits a rate limit, it waits and retries automatically
8. If a prospect was already scouted, it skips them (delete the file to re-run)

## After It Runs

Go back to Claude Code and say:

> "The scouting agent finished EDGE prospects. Results are in agents/output/scouting/edge/ — integrate them into the codebase."

or

> "GM profiles are done. Results are in agents/output/gm-profiles/ — integrate them."

Claude Code will read the JSON files and do whatever codebase work is needed.

## Estimated Costs

| Task | Est. Cost |
|------|-----------|
| Scout 1 prospect | $0.10–0.30 |
| Scout all EDGE (~40 prospects) | $4–12 |
| Scout full class (~458 prospects) | $45–135 |
| Research 1 GM | $0.50–1.50 |
| Research all 32 GMs | $16–48 |

## Troubleshooting

**"No module named anthropic"** → Run `pip3 install anthropic`

**"No Anthropic API key found"** → Run `export ANTHROPIC_API_KEY=sk-ant-your-key-here`

**"Rate limited"** → The script handles this automatically. It waits and retries.

**"Couldn't parse JSON"** → The raw response is saved. You can review it or re-run. This sometimes happens when the model writes a lot of narrative before the JSON.

**"Already scouted, skipping"** → Delete the JSON file for that prospect to re-run them.

**Want to re-run everything fresh?** → Delete the agents/output/ folder and run again.
