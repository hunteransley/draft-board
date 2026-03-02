import SCOUTING from "./scoutingTraits.json";
import { getCombineAdjustedTraits } from "./combineTraits.js";

// Name normalization — matches prospectStats.js pattern
const NAME_ALIASES = {"jam miller":"jamarion miller","nicholas singleton":"nick singleton","kc concepcion":"kevin concepcion","j michael sturdivant":"jmichael sturdivant"};
function normalize(name) {
  const n = name.toLowerCase().replace(/\./g, "").replace(/\s+(jr|sr|ii|iii|iv|v)\s*$/i, "").replace(/\s+/g, " ").trim();
  return NAME_ALIASES[n] || n;
}

export function getScoutingTraits(name, school) {
  const adjusted = getCombineAdjustedTraits(name, school);
  if (adjusted) return adjusted;
  if (!name) return null;
  if (!school) { const n = normalize(name); for (const k in SCOUTING) { if (k.startsWith(n + "|")) return SCOUTING[k]; } return null; }
  const key = normalize(name) + "|" + school.toLowerCase().replace(/\s+/g, " ").trim();
  if (SCOUTING[key]) return SCOUTING[key];
  // Fallback: match by name prefix (handles school aliases)
  const n = normalize(name);
  for (const k in SCOUTING) {
    if (k.startsWith(n + "|")) return SCOUTING[k];
  }
  return null;
}
