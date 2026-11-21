import { describe, it, expect } from "vitest";
import {
  effectiveSort, filtersToQuery, formatMetrics, queryToFilters, resultsParams, totalsParams, verdictChips,
} from "@/views/EnrichmentReview/comfyResults";

describe("queryToFilters / filtersToQuery", () => {
  it("reads the defaults from an empty query", () => {
    expect(queryToFilters({})).toEqual({
      worker: "", verdict: "", source: "", reason: "", sku: "", task: "", sort: "-checked_at", page: 1,
    });
  });

  it("drops values outside the contract", () => {
    const filters = queryToFilters({ verdict: "bogus", source: "x", sort: "name", task: "abc", page: "0" });
    expect(filters).toMatchObject({ verdict: "", source: "", sort: "-checked_at", task: "", page: 1 });
  });

  it("round-trips what is set and keeps defaults out of the URL", () => {
    const query = { worker: "pim.packshot", verdict: "review", task: "42", sort: "-score", page: "3", sku: "A-1" };
    expect(filtersToQuery(queryToFilters(query))).toEqual(query);
    expect(filtersToQuery(queryToFilters({}))).toEqual({});
  });
});

describe("API params", () => {
  const filters = queryToFilters({ worker: "w", verdict: "pass", reason: "replace_size", sku: "A-1", task: "7", sort: "score", page: "2" });

  it("maps the filters to the contract's names", () => {
    expect(resultsParams(filters)).toEqual({
      worker: "w", verdict: "pass", reason: "replace_size", subject_ref: "A-1", task: 7, ordering: "score", page: 2, page_size: 20,
    });
  });

  it("leaves verdict, ordering and paging out of the totals", () => {
    expect(totalsParams(filters)).toEqual({ worker: "w", reason: "replace_size", subject_ref: "A-1", task: 7 });
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
