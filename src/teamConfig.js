// Team metadata — single source of truth
// Key = standard abbreviation (used in agent JSONs / teamNeedsData)
// displayAbbr = short form shown in UI (differs for Rams: LA vs LAR, Commanders: WAS vs WSH)

export const TEAMS = {
  ARI: { name: "Cardinals", displayAbbr: "ARI", espnId: 22, color: "#97233F" },
  ATL: { name: "Falcons", displayAbbr: "ATL", espnId: 1, color: "#A71930" },
  BAL: { name: "Ravens", displayAbbr: "BAL", espnId: 33, color: "#241773" },
  BUF: { name: "Bills", displayAbbr: "BUF", espnId: 2, color: "#00338D" },
  CAR: { name: "Panthers", displayAbbr: "CAR", espnId: 29, color: "#0085CA" },
  CHI: { name: "Bears", displayAbbr: "CHI", espnId: 3, color: "#C83200" },
  CIN: { name: "Bengals", displayAbbr: "CIN", espnId: 4, color: "#FB4F14" },
  CLE: { name: "Browns", displayAbbr: "CLE", espnId: 5, color: "#FF3C00" },
  DAL: { name: "Cowboys", displayAbbr: "DAL", espnId: 6, color: "#003594" },
  DEN: { name: "Broncos", displayAbbr: "DEN", espnId: 7, color: "#FB4F14" },
  DET: { name: "Lions", displayAbbr: "DET", espnId: 8, color: "#0076B6" },
  GB:  { name: "Packers", displayAbbr: "GB", espnId: 9, color: "#203731" },
  HOU: { name: "Texans", displayAbbr: "HOU", espnId: 34, color: "#03202F" },
  IND: { name: "Colts", displayAbbr: "IND", espnId: 11, color: "#002C5F" },
  JAX: { name: "Jaguars", displayAbbr: "JAX", espnId: 30, color: "#006778" },
  KC:  { name: "Chiefs", displayAbbr: "KC", espnId: 12, color: "#E31837" },
  LAC: { name: "Chargers", displayAbbr: "LAC", espnId: 24, color: "#0080C6" },
  LAR: { name: "Rams", displayAbbr: "LA", espnId: 14, color: "#003594" },
  LV:  { name: "Raiders", displayAbbr: "LV", espnId: 13, color: "#A5ACAF" },
  MIA: { name: "Dolphins", displayAbbr: "MIA", espnId: 15, color: "#008E97" },
  MIN: { name: "Vikings", displayAbbr: "MIN", espnId: 16, color: "#4F2683" },
  NE:  { name: "Patriots", displayAbbr: "NE", espnId: 17, color: "#002244" },
  NO:  { name: "Saints", displayAbbr: "NO", espnId: 18, color: "#D3BC8D" },
  NYG: { name: "Giants", displayAbbr: "NYG", espnId: 19, color: "#0B2265" },
  NYJ: { name: "Jets", displayAbbr: "NYJ", espnId: 20, color: "#125740" },
  PHI: { name: "Eagles", displayAbbr: "PHI", espnId: 21, color: "#004C54" },
  PIT: { name: "Steelers", displayAbbr: "PIT", espnId: 23, color: "#FFB612" },
  SEA: { name: "Seahawks", displayAbbr: "SEA", espnId: 26, color: "#69BE28" },
  SF:  { name: "49ers", displayAbbr: "SF", espnId: 25, color: "#AA0000" },
  TB:  { name: "Buccaneers", displayAbbr: "TB", espnId: 27, color: "#D50A0A" },
  TEN: { name: "Titans", displayAbbr: "TEN", espnId: 10, color: "#4B92DB" },
  WSH: { name: "Commanders", displayAbbr: "WAS", espnId: 28, color: "#5A1414" },
};

// Derived lookups — all keyed by team display name
export const NFL_TEAM_ABR = Object.fromEntries(
  Object.entries(TEAMS).map(([, t]) => [t.name, t.displayAbbr])
);
export const NFL_TEAM_ESPN = Object.fromEntries(
  Object.entries(TEAMS).map(([, t]) => [t.name, t.espnId])
);
export const NFL_TEAM_COLORS = Object.fromEntries(
  Object.entries(TEAMS).map(([, t]) => [t.name, t.color])
);
// Standard abbreviation → team name (for agent JSON key resolution)
export const ABBR_TO_TEAM = Object.fromEntries(
  Object.entries(TEAMS).map(([abbr, t]) => [abbr, t.name])
);
