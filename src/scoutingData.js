import SCOUTING from "./scoutingTraits.json";

// Name normalization — matches prospectStats.js pattern
function normalize(name) {
  return name.toLowerCase().replace(/\./g, "").replace(/\s+(jr|sr|ii|iii|iv|v)\s*$/i, "").replace(/\s+/g, " ").trim();
}

export function getScoutingTraits(name, school) {
  const key = normalize(name) + "|" + school.toLowerCase().replace(/\s+/g, " ").trim();
  if (SCOUTING[key]) return SCOUTING[key];
  // Fallback: match by name prefix (handles school aliases)
  const n = normalize(name);
  for (const k in SCOUTING) {
    if (k.startsWith(n + "|")) return SCOUTING[k];
  }
  return null;
}
