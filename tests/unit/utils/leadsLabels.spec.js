import { describe, it, expect } from "vitest";
import { activityText, companyTypeLabel, legalBasisLabel, stageKindLabel } from "@/utils/leadsLabels";
import { pluralKey } from "@/utils/plural";

// FIX-17 items 14-16: enum values, statuses and counts read as words on every leads screen.
describe("leads labels", () => {
  it("names company types, legal bases and stage kinds", () => {
    expect(companyTypeLabel("RETAILER")).toBe("Retailer");
    expect(legalBasisLabel("legitimate_interest")).toBe("Legitimate interest");
    expect(stageKindLabel("won")).toBe("won");
  });

  it("falls back to the raw value for a value it does not know", () => {
    expect(companyTypeLabel("FRANCHISE")).toBe("FRANCHISE");
  });

  it("translates the status of a draft activity, leaves other messages alone", () => {
    expect(activityText("draft review_required")).toBe("Draft — to review");
    expect(activityText("stage new -> contacted")).toBe("stage new -> contacted");
    expect(activityText("")).toBe("");
  });

  it("picks the plural form: one, few (2-4 outside the teens) and many", () => {
    expect([1, 2, 5, 12, 22, 25].map(pluralKey)).toEqual(["one", "few", "many", "many", "few", "many"]);
  });
});
