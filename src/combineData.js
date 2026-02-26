import COMBINE from "./combineData.json";

// Name normalization — matches scoutingData.js pattern
function normalize(name) {
  return name.toLowerCase().replace(/\./g, "").replace(/\s+(jr|sr|ii|iii|iv|v)\s*$/i, "").replace(/\s+/g, " ").trim();
}

export function getCombineData(name, school) {
  if (!name) return null;
  if (!school) { const n = normalize(name); for (const k in COMBINE) { if (k.startsWith(n + "|")) return COMBINE[k]; } return null; }
  const key = normalize(name) + "|" + school.toLowerCase().replace(/\s+/g, " ").trim();
  if (COMBINE[key]) return COMBINE[key];
  const n = normalize(name);
  for (const k in COMBINE) {
    if (k.startsWith(n + "|")) return COMBINE[k];
  }
  return null;
}

export function formatHeight(totalInches) {
  if (!totalInches) return null;
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return `${feet}'${inches}"`;
}
