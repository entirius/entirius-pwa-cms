import { describe, it, expect } from "vitest";
import {
  gapBadgeVariant,
  gapRowState,
  hasQualityFields,
  resolveGapLabel,
  findingsParams,
} from "@/views/Pim/quality";

describe("quality helpers", () => {
  describe("gapBadgeVariant", () => {
    it("maps critical → negative, warning → warning", () => {
      expect(gapBadgeVariant("critical")).toBe("negative");
      expect(gapBadgeVariant("warning")).toBe("warning");
    });
    it("falls back to neutral for null/unknown", () => {
      expect(gapBadgeVariant(null)).toBe("neutral");
      expect(gapBadgeVariant("whatever")).toBe("neutral");
    });
  });

  describe("gapRowState", () => {
    it("returns 'unevaluated' when gap_evaluated_at is null (never checked / custom)", () => {
      expect(gapRowState({ gap_evaluated_at: null, gap_worst_severity: null })).toBe("unevaluated");
    });
    it("returns 'gaps' when evaluated and a worst severity exists", () => {
      expect(gapRowState({ gap_evaluated_at: "2026-06-07", gap_worst_severity: "critical" })).toBe("gaps");
    });
    it("returns 'ok' when evaluated with no gaps", () => {
      expect(gapRowState({ gap_evaluated_at: "2026-06-07", gap_worst_severity: null })).toBe("ok");
    });
    it("treats a missing row as unevaluated", () => {
      expect(gapRowState(undefined)).toBe("unevaluated");
    });
  });

  describe("hasQualityFields (soft-compat gate)", () => {
    it("true when the row carries gap_worst_severity (even if null)", () => {
      expect(hasQualityFields({ gap_worst_severity: null })).toBe(true);
      expect(hasQualityFields({ gap_worst_severity: "warning" })).toBe(true);
    });
    it("false for an old-backend row without the field, or no row", () => {
      expect(hasQualityFields({ sku: "A" })).toBe(false);
      expect(hasQualityFields(undefined)).toBe(false);
    });
  });

  describe("resolveGapLabel", () => {
    const finding = { label_t9n: { en: "Missing description", pl: "Brak opisu" }, definition_key: "pl-desc" };
    it("picks the UI language (case-insensitive)", () => {
      expect(resolveGapLabel(finding, "PL")).toBe("Brak opisu");
      expect(resolveGapLabel(finding, "en")).toBe("Missing description");
    });
    it("falls back en → first value → definition_key", () => {
      expect(resolveGapLabel(finding, "de")).toBe("Missing description");
      expect(resolveGapLabel({ label_t9n: { fr: "X" }, definition_key: "k" }, "de")).toBe("X");
      expect(resolveGapLabel({ label_t9n: {}, definition_key: "k" }, "de")).toBe("k");
    });
  });

  describe("findingsParams", () => {
    it("is empty when no filters are active", () => {
      expect(findingsParams()).toEqual({});
      expect(findingsParams({})).toEqual({});
    });
    it("includes severity and only_source when set", () => {
      expect(findingsParams({ severity: "critical", onlySource: true })).toEqual({
        severity: "critical",
        only_source: true,
      });
    });
  });
});
