// How a /search/ hit relates to the query, from the backend's `match` field.
// Fallback for a backend that predates it: 100 = the same thing, > 0 = something agreed.
const KINDS = new Set(["exact", "similar", "none"]);

export function matchKind(hit) {
  if (KINDS.has(hit?.match)) return hit.match;
  const similarity = Number(hit?.similarity ?? hit?.score ?? 0);
  if (similarity >= 100) return "exact";
  return similarity > 0 ? "similar" : "none";
}

// Exact and similar are results; `none` are blocking neighbours nothing agreed on — kept
// (the top neighbour is always worth a glance) but folded away, never presented as matches.
export function groupHits(hits) {
  const groups = { exact: [], similar: [], none: [] };
  for (const hit of hits || []) groups[matchKind(hit)].push(hit);
  return groups;
}
