// Enricher → Review → Picture checks: the filters of the screen, kept in the URL query, and the API params they make.

export const VERDICTS = ["set", "review", "pass", "escalate", "propose_picture"];
export const SOURCES = ["prefilter", "workflow"];
export const SORTS = ["-checked_at", "score", "-score"];
export const DEFAULT_SORT = "-checked_at";
export const PAGE_SIZE = 20;

const VERDICT_TONE = { set: "info", review: "warning", pass: "positive", escalate: "accent", propose_picture: "neutral" };

/** The StatusBadge tone of a verdict. */
export const verdictTone = (verdict) => VERDICT_TONE[verdict] || "neutral";

const one = (value) => (Array.isArray(value) ? value[0] : value) || "";

/** The screen's filters from a route query; a value outside the contract (verdict, source, sort) is dropped. */
export function queryToFilters(query = {}) {
  const verdict = one(query.verdict);
  const source = one(query.source);
  const sort = one(query.sort);
  return {
    worker: one(query.worker),
    verdict: VERDICTS.includes(verdict) ? verdict : "",
    source: SOURCES.includes(source) ? source : "",
    reason: one(query.reason),
    sku: one(query.sku),
    task: /^\d+$/.test(one(query.task)) ? one(query.task) : "",
    sort: SORTS.includes(sort) ? sort : DEFAULT_SORT,
    page: parseInt(one(query.page), 10) || 1,
  };
}

/** The route query of the filters: only what is set (the default sort and page 1 stay out of the URL). */
export function filtersToQuery(filters) {
  const query = {};
  for (const key of ["worker", "verdict", "source", "reason", "sku", "task"]) {
    if (filters[key]) query[key] = String(filters[key]);
  }
  if (filters.sort && filters.sort !== DEFAULT_SORT) query.sort = filters.sort;
  if (filters.page > 1) query.page = String(filters.page);
  return query;
}

/** A score order needs a worker (the backend answers 400 otherwise): without one the newest first stands. */
export const effectiveSort = (filters) => (filters.sort !== DEFAULT_SORT && !filters.worker ? DEFAULT_SORT : filters.sort);

/** `verdicts/` params: the filters of the list without verdict, ordering and paging. */
export function totalsParams(filters) {
  const params = {};
  if (filters.worker) params.worker = filters.worker;
  if (filters.source) params.source = filters.source;
  if (filters.reason) params.reason = filters.reason;
  if (filters.sku) params.subject_ref = filters.sku;
  if (filters.task) params.task = Number(filters.task);
  return params;
}

/** `comfy-results/` params: the totals' filters plus verdict, ordering and the page. */
export function resultsParams(filters, pageSize = PAGE_SIZE) {
  const params = { ...totalsParams(filters), ordering: effectiveSort(filters), page: filters.page, page_size: pageSize };
  if (filters.verdict) params.verdict = filters.verdict;
  return params;
}

/** "key: value" for the metrics other than the score (its own column), numbers to 3 decimals. */
export function formatMetrics(metrics) {
  const shown = ([key, value]) => key !== "score" && value !== null && typeof value !== "object";
  const text = (value) => (typeof value === "number" && !Number.isInteger(value) ? value.toFixed(3) : String(value));
  return Object.entries(metrics || {})
    .filter(shown)
    .map(([key, value]) => `${key}: ${text(value)}`)
    .join(", ");
}

/** The verdict chips: [{ value: "" (all), count }, …] for the verdicts present, in the contract's order. */
export function verdictChips(totals) {
  const verdicts = totals?.verdicts || {};
  const present = VERDICTS.filter((verdict) => verdicts[verdict] > 0);
  return [{ value: "", count: totals?.total ?? 0 }, ...present.map((value) => ({ value, count: verdicts[value] }))];
}
