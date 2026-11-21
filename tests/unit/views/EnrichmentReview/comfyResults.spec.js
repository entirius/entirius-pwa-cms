import { describe, it, expect } from "vitest";
import {
  effectiveSort, exportParams, filtersToQuery, inputsPatch, proposalsQuery, runResultsQuery, syncInputs, formatMetrics, queryToFilters, resultsParams, totalsParams, verdictChips,
} from "@/views/EnrichmentReview/comfyResults";

describe("queryToFilters / filtersToQuery", () => {
  it("reads the defaults from an empty query", () => {
    expect(queryToFilters({})).toEqual({
      worker: "", verdict: "", source: "", reason: "", sku: "", task: "", score_min: "", score_max: "", history: false,
      sort: "-checked_at", page: 1,
    });
  });

  it("drops values outside the contract", () => {
    const filters = queryToFilters({ verdict: "bogus", source: "x", sort: "name", task: "abc", page: "0" });
    expect(filters).toMatchObject({ verdict: "", source: "", sort: "-checked_at", task: "", page: 1 });
  });

  it("round-trips what is set and keeps defaults out of the URL", () => {
    const query = { worker: "pim.packshot", verdict: "review", task: "42", sort: "-score", page: "3", sku: "A-1", score_min: "0.2", score_max: "0.8", history: "1" };
    expect(filtersToQuery(queryToFilters(query))).toEqual(query);
    expect(filtersToQuery(queryToFilters({}))).toEqual({});
  });
});

describe("API params", () => {
  const filters = queryToFilters({
    worker: "w", verdict: "pass", reason: "replace_size", sku: "A-1", task: "7", sort: "score", page: "2",
    score_min: "0.2", score_max: "0.8", history: "1",
  });

  it("maps the filters to the contract's names", () => {
    expect(resultsParams(filters)).toEqual({
      worker: "w", verdict: "pass", reason: "replace_size", search: "A-1", task: 7, score_min: 0.2, score_max: 0.8, latest: false,
      ordering: "score", page: 2, page_size: 20,
    });
  });

  it("leaves verdict, ordering and paging out of the totals", () => {
    expect(totalsParams(filters)).toEqual({
      worker: "w", reason: "replace_size", search: "A-1", task: 7, score_min: 0.2, score_max: 0.8, latest: false,
    });
  });

  it("sends the score range only with a worker, latest only for the history view", () => {
    const params = totalsParams(queryToFilters({ score_min: "0.5" }));
    expect(params).toEqual({});
    expect(totalsParams(queryToFilters({ worker: "w", score_min: "0.5" }))).toEqual({ worker: "w", score_min: 0.5 });
    expect(queryToFilters({ score_min: "abc" }).score_min).toBe("");
  });

  it("exports the filters and the sort without paging", () => {
    expect(exportParams(filters)).toEqual({
      worker: "w", verdict: "pass", reason: "replace_size", search: "A-1", task: 7, score_min: 0.2, score_max: 0.8,
      latest: false, ordering: "score",
    });
  });

  it("opens a row's proposals on its product and worker version, every status", () => {
    expect(proposalsQuery({ subject_ref: "SKU-1", worker_key: "pim.packshot_quality", worker_version: 2 })).toEqual({
      subject_ref: "SKU-1", source: "worker:pim.packshot_quality@v2", status: "__all",
    });
  });

  it("falls back to the newest first for a score order without a worker", () => {
    expect(effectiveSort({ worker: "", sort: "-score" })).toBe("-checked_at");
    expect(effectiveSort({ worker: "w", sort: "-score" })).toBe("-score");
    expect(resultsParams(queryToFilters({ sort: "score" })).ordering).toBe("-checked_at");
  });
});

describe("formatMetrics", () => {
  it("skips the score and nested values, rounds decimals", () => {
    expect(formatMetrics({ score: 0.21, white_share: 0.7, edges: 3, nested: { a: 1 }, none: null })).toBe("white_share: 0.700, edges: 3");
    expect(formatMetrics(null)).toBe("");
  });
});

describe("verdictChips", () => {
  it("starts with all and lists the verdicts present in the contract's order", () => {
    const chips = verdictChips({ total: 4149, verdicts: { pass: 3800, review: 120, escalate: 40, set: 0 } });
    expect(chips).toEqual([
      { value: "", count: 4149 }, { value: "review", count: 120 }, { value: "pass", count: 3800 }, { value: "escalate", count: 40 },
    ]);
    expect(verdictChips(null)).toEqual([{ value: "", count: 0 }]);
  });
});

describe("typed fields", () => {
  it("applies every typed field together, trimmed, a non-number bound blank", () => {
    expect(inputsPatch({ sku: " low ", score_min: 0.5, score_max: "x" })).toEqual({ sku: "low", score_min: "0.5", score_max: "" });
    expect(inputsPatch({})).toEqual({ sku: "", score_min: "", score_max: "" });
  });

  it("writes an input back only when its trimmed value differs from the filter", () => {
    const filters = { sku: "low", score_min: "", score_max: "0.9" };
    expect(syncInputs({ sku: "low ", score_min: "", score_max: "0.9" }, filters)).toEqual({ sku: "low ", score_min: "", score_max: "0.9" });
    expect(syncInputs({ sku: "other", score_min: "0.1", score_max: "0.9" }, filters)).toEqual({ sku: "low", score_min: "", score_max: "0.9" });
  });
});

describe("runResultsQuery", () => {
  it("opens the run's results with history, so a product rechecked later stays in", () => {
    expect(runResultsQuery({ id: 9, type: "pim.packshot" })).toEqual({ task: "9", worker: "pim.packshot", history: "1" });
  });
});
