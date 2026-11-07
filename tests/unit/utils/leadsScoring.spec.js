import { describe, it, expect } from "vitest";
import { buildProfileBody, formatSeconds, formatValue, parseValue, toRow } from "@/utils/leadsScoring";

const form = (extra = {}) => ({
  key: "",
  thresholds: { S: 20, M: 40, L: 70 },
  rules: [{ field: "lead_type", op: "in", value: "RETAILER, WHOLESALER", label: "retailer", points: "30" }],
  disqualifiers: [{ field: "platform", op: "eq", value: "marketplace", label: "marketplace", points: 0 }],
  is_active: true,
  ...extra,
});

describe("scoring profile helpers (T3)", () => {
  it("types a value by its condition: list for in, whole number for counts, text otherwise", () => {
    expect(parseValue("lead_type", "in", "A, B,, C")).toEqual(["A", "B", "C"]);
    expect(parseValue("hooks_count", "gte", "3")).toBe(3);
    expect(parseValue("hooks_count", "eq", "x")).toBeNaN();
    expect(parseValue("industry", "contains", " fashion ")).toBe("fashion");
    expect(formatValue(["A", "B"])).toBe("A, B");
    expect(formatValue(3)).toBe("3");
  });

  it("builds the request body: typed values, integer points, no empty key", () => {
    const { body, error } = buildProfileBody(form());
    expect(error).toBeUndefined();
    expect(body).toEqual({
      key: undefined,
      thresholds: { S: 20, M: 40, L: 70 },
      rules: [{ field: "lead_type", op: "in", value: ["RETAILER", "WHOLESALER"], label: "retailer", points: 30 }],
      disqualifiers: [{ field: "platform", op: "eq", value: "marketplace", label: "marketplace" }],
      is_active: true,
    });
  });

  it("refuses thresholds out of range or out of order", () => {
    expect(buildProfileBody(form({ thresholds: { S: -1, M: 40, L: 70 } })).error).toBe("leads.scoring.thresholds_invalid");
    expect(buildProfileBody(form({ thresholds: { S: 50, M: 40, L: 70 } })).error).toBe("leads.scoring.thresholds_order");
  });

  it("refuses a row without a value or with fractional points", () => {
    const blank = { field: "domain", op: "contains", value: "", label: "", points: 5 };
    expect(buildProfileBody(form({ rules: [blank] })).error).toBe("leads.scoring.row_invalid");
    expect(buildProfileBody(form({ rules: [{ ...blank, value: "x", points: "1.5" }] })).error).toBe("leads.scoring.row_invalid");
    expect(buildProfileBody(form({ disqualifiers: [{ ...blank, field: "hooks_count", op: "lte", value: "abc" }] })).error).toBe("leads.scoring.row_invalid");
  });

  it("turns a saved row back into editor strings", () => {
    expect(toRow({ field: "lead_type", op: "in", value: ["A", "B"], label: "x", points: 5 })).toEqual({ field: "lead_type", op: "in", value: "A, B", label: "x", points: 5 });
  });

  it("writes a duration for the funnel", () => {
    expect(formatSeconds(null)).toBe("");
    expect(formatSeconds(90)).toBe("1m");
    expect(formatSeconds(3 * 3600 + 20 * 60)).toBe("3h 20m");
    expect(formatSeconds(2 * 86400 + 5 * 3600)).toBe("2d 5h");
  });
});
