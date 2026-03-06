# Ourlads Depth Chart Agent

You are building an updated `nflRosters.js` file for Big Board Lab by scraping depth charts from Ourlads.com. Ourlads has scheme-specific position labels (NB for nickelback, LOLB/ROLB for 3-4 OLBs, NT for nose tackle, SWR for slot WR, etc.) that ESPN depth charts lack.

## Your Task

1. Fetch the Ourlads depth chart for all 32 NFL teams
2. Parse positions and starters from each page
3. Map Ourlads positions to BBL's slot system
4. Write the result to `src/nflRosters.js`

## URL Pattern

`https://www.ourlads.com/nfldepthcharts/depthchart/{ABBR}`

Team abbreviations (Ourlads uses these):
```
ARI, ATL, BAL, BUF, CAR, CHI, CIN, CLE, DAL, DEN, DET, GB, HOU, IND, JAX, KC,
LV, LAC, LAR, MIA, MIN, NE, NO, NYG, NYJ, PHI, PIT, SF, SEA, TB, TEN, WAS
```

## Position Mapping

Map Ourlads positions to these BBL slot names. Take only the **starter** (first player listed) at each position unless noted.

### Offense
| Ourlads | BBL Slot | Notes |
|---------|----------|-------|
| QB | QB1, QB2 | First two QBs |
| RB | RB1, RB2 | First two RBs |
| LWR | WR1 | Left outside WR |
| RWR | WR2 | Right outside WR |
| SWR | WR3 | Slot WR |
| WR (if no L/R/S split) | WR1, WR2, WR3 | In order |
| TE | TE1, TE2 | First two TEs |
| LT | LT | |
| LG | LG | |
| C | C | |
| RG | RG | |
| RT | RT | |

### Defense — varies by scheme

**3-4 teams** (look for NT, LOLB/ROLB/LILB/RILB):
| Ourlads | BBL Slot |
|---------|----------|
| DE (left) or LDE | DE1 |
| NT | DT1 |
| DE (right) or RDE or DT | DE2 |
| LOLB | LB1 |
| LILB | LB2 |
| RILB | LB3 |
| ROLB | LB4 |

**4-3 / 4-2-5 / wide-9 teams** (look for LDE/RDE/LDT/RDT):
| Ourlads | BBL Slot |
|---------|----------|
| LDE or SDE | DE1 |
| LDT or NT | DT1 |
| RDT or DT | DT2 |
| RDE or WDE | DE2 |
| WLB or WILL | LB1 |
| MLB or MIKE | LB2 |
| SLB or SAM | LB3 |

**Secondary (all schemes):**
| Ourlads | BBL Slot |
|---------|----------|
| LCB | CB1 |
| RCB | CB2 |
| NB or NCB or STAR or NICKEL | NB |
| SS | SS |
| FS | FS |

**Special teams:**
| Ourlads | BBL Slot |
|---------|----------|
| PK or K | K |

Ignore P (punter), LS (long snapper), KR, PR, and all other special teams.

## Output Format

Write to `src/nflRosters.js` in this exact format:

```js
// NFL Rosters — auto-generated from Ourlads depth charts on YYYY-MM-DD
// Run: claude agents/ourlads/AGENT.md to refresh

const NFL_ROSTERS = {
  "ARI": {
    "QB1": "Player Name",
    "QB2": "Player Name",
    "RB1": "Player Name",
    "RB2": "Player Name",
    "WR1": "Player Name",
    "WR2": "Player Name",
    "WR3": "Player Name",
    "TE1": "Player Name",
    "TE2": "Player Name",
    "LT": "Player Name",
    "LG": "Player Name",
    "C": "Player Name",
    "RG": "Player Name",
    "RT": "Player Name",
    "DE1": "Player Name",
    "DT1": "Player Name",
    "DT2": "Player Name",
    "DE2": "Player Name",
    "LB1": "Player Name",
    "LB2": "Player Name",
    "LB3": "Player Name",
    "LB4": "Player Name",
    "CB1": "Player Name",
    "CB2": "Player Name",
    "NB": "Player Name",
    "SS": "Player Name",
    "FS": "Player Name",
    "K": "Player Name"
  },
  // ... all 32 teams
};

export default NFL_ROSTERS;
```

## Important Rules

1. **Use WebFetch** to fetch each team's page. The URL pattern is consistent.
2. **Player names only** — strip jersey numbers, draft info (e.g., "(22/1)"), contract status (e.g., "U/Ten"), and any parenthetical notes. Just the clean name like "Will Anderson Jr." not "Will Anderson Jr. (23/1)".
3. **Every team gets every slot** where data exists. If a slot has no player on the depth chart, omit it from that team's entry.
4. **3-4 teams will NOT have DT2** — they have 3 DL (DE, NT, DE). Don't force a DT2.
5. **4-3 teams will NOT have LB4** — they have 3 LB. Don't force an LB4.
6. **Every team should have NB** — Ourlads lists a nickelback for all 32 teams.
7. **WR4** — if the team lists a 4th WR, include it. Most won't.
8. **FB** — ignore fullbacks, we don't have a slot for them.
9. **Fetch teams one at a time** with a short pause between requests to be polite to the server. Do NOT fetch in parallel.
10. **After writing the file**, report a summary: how many teams processed, total slots filled, and flag any teams that were missing critical positions.

## Scheme Reference

For identifying 3-4 vs 4-3 from the Ourlads data: you can tell by the position labels.
- If you see NT + LOLB/ROLB/LILB/RILB → 3-4
- If you see LDT/RDT + WLB/MLB/SLB → 4-3
- Some teams use hybrid labels — use your judgment based on the positions listed

## Validation

After generating the file, verify:
- All 32 teams are present
- Each team has at minimum: QB1, RB1, WR1, WR2, TE1, 5 OL slots, 3+ DL slots, 2+ LB slots, CB1, CB2, SS, FS, NB
- No empty string values
- No jersey numbers or parenthetical data in player names
- Player names use proper capitalization (e.g., "Patrick Mahomes" not "patrick mahomes")
