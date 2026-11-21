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
// A score bound as typed ("0.5"), "" when it is not a number.
const number = (value) => (Number.isFinite(Number(one(value))) && one(value) !== "" ? one(value) : "");

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
    score_min: number(query.score_min),
    score_max: number(query.score_max),
    history: one(query.history) === "1",
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
  for (const key of ["score_min", "score_max"]) {
    if (filters[key] !== "" && filters[key] != null) query[key] = String(filters[key]);
  }
  if (filters.history) query.history = "1";
  if (filters.sort && filters.sort !== DEFAULT_SORT) query.sort = filters.sort;
  if (filters.page > 1) query.page = String(filters.page);
  return query;
}

/** A score order is offered with a worker only (scores compare within one worker): without one the newest first stands. */
export const effectiveSort = (filters) => (filters.sort !== DEFAULT_SORT && !filters.worker ? DEFAULT_SORT : filters.sort);

/** `verdicts/` params: the filters of the list without verdict, ordering and paging. The score range is sent with a worker
 * only (scores compare within one worker); `latest` is sent only for the history view (the default is the newest check of
 * each product per worker). */
export function totalsParams(filters) {
  const params = {};
  if (filters.worker) params.worker = filters.worker;
  if (filters.source) params.source = filters.source;
  if (filters.reason) params.reason = filters.reason;
  if (filters.sku) params.search = filters.sku;
  if (filters.worker && filters.score_min !== "") params.score_min = Number(filters.score_min);
  if (filters.worker && filters.score_max !== "") params.score_max = Number(filters.score_max);
  if (filters.history) params.latest = false;
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

/** `comfy-results/export/` params: the list's filters and sort, no paging (the whole filtered list). */
export function exportParams(filters) {
  const params = { ...totalsParams(filters), ordering: effectiveSort(filters) };
  if (filters.verdict) params.verdict = filters.verdict;
  return params;
}

/** The Review (Proposals) query for one result row: that product and that worker version's source, every status
 * (applied ones included, to find and undo them). */
export function proposalsQuery(row) {
  return { subject_ref: row.subject_ref, source: `worker:${row.worker_key}@v${row.worker_version}`, status: "__all" };
}

/** The Picture checks query for one run's "Results": that run and its worker, with history (a product rechecked later
 * would otherwise drop out of the run's own results). */
export const runResultsQuery = (row) => ({ task: String(row.id), worker: row.type, history: "1" });

const INPUT_KEYS = ["sku", "score_min", "score_max"];
const typed = (value) => String(value ?? "").trim();

/** The filters the typed fields make: trimmed, a score bound that is not a number left blank. */
export function inputsPatch(inputs) {
  const patch = Object.fromEntries(INPUT_KEYS.map((key) => [key, typed(inputs[key])]));
  for (const key of ["score_min", "score_max"]) if (!Number.isFinite(Number(patch[key]))) patch[key] = "";
  return patch;
}

/** The typed fields after the filters changed: an input whose trimmed value already equals its filter stays as typed
 * (writing "low" back over "low " would eat the space), any other takes the filter's value. */
export function syncInputs(inputs, filters) {
  return Object.fromEntries(INPUT_KEYS.map((key) => [key, typed(inputs[key]) === String(filters[key] ?? "") ? inputs[key] ?? "" : filters[key] ?? ""]));
}
