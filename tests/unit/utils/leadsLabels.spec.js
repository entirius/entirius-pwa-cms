import { describe, it, expect } from "vitest";
import { activityText, legalBasisLabel, ruleRunText, sendStateLabel, sendStateSentence, stageKindLabel } from "@/utils/leadsLabels";
import { pluralKey } from "@/utils/plural";

// FIX-17 items 14-16: enum values, statuses and counts read as words on every leads screen.
describe("leads labels", () => {
  it("names legal bases and stage kinds", () => {
    expect(legalBasisLabel("legitimate_interest")).toBe("Legitimate interest");
    expect(stageKindLabel("won")).toBe("won");
  });

  it("falls back to the raw value for a value it does not know", () => {
    expect(legalBasisLabel("franchise")).toBe("franchise");
  });

  it("translates the status of a draft activity", () => {
    expect(activityText("draft review_required")).toBe("Draft — to review");
    expect(activityText("")).toBe("");
  });

  // FIX-17b item 1: activity lines are sentences built from labels, never raw codes.
  it("builds sentences for stage, legal basis and blocked activities", () => {
    expect(activityText("stage new -> contacted")).toBe("Stage: new → contacted");
    expect(activityText("legal basis None -> legitimate_interest")).toBe("Legal basis set to legitimate interest");
    expect(activityText("legal basis  -> consent")).toBe("Legal basis set to consent");
    expect(activityText("legal basis consent -> contract")).toBe("Legal basis changed from consent to contract");
    expect(activityText("blocked: no_eligible_contact")).toBe("Blocked: no eligible contact");
    expect(activityText("blocked: some_new_reason")).toBe("Blocked: some new reason");
  });

  it("any other message keeps its words without snake_case or ASCII arrows", () => {
    expect(activityText("reply received")).toBe("Reply received");
    expect(activityText("rule error: value_error -> retry")).toBe("Rule error: value error → retry");
  });

  it("a held state names the window hours when known", () => {
    expect(sendStateLabel({ state: "held", window: "08:00–17:00" })).toBe("waiting for the send window (08:00–17:00)");
    expect(sendStateLabel({ state: "held", window: "" })).toBe("waiting for the send window");
  });

  // FIX-17c item 1: one sentence, no jargon — a held or capped mail names the slot it waits for.
  it("the send sentence adds the next slot of a held mail and never says send run", () => {
    expect(sendStateSentence({ state: "held", window: "08:00–17:00", next: "17.09 08:00" })).toBe(
      "waiting for the send window (08:00–17:00), next slot 17.09 08:00"
    );
    expect(sendStateSentence({ state: "cap", next: "17.09 08:00" })).toBe(
      "daily cap reached, next slot 17.09 08:00"
    );
    expect(sendStateSentence({ state: "at", time: "14:00" })).toBe("goes out at 14:00");
    expect(sendStateSentence({ state: "due" })).not.toMatch(/send run|^due/);
  });

  it("picks the plural form: one, few (2-4 outside the teens) and many", () => {
    expect([1, 2, 5, 12, 22, 25].map(pluralKey)).toEqual(["one", "few", "many", "many", "few", "many"]);
  });

  it("reads a rule run in words, without ids", () => {
    expect(ruleRunText({ outcome: "skipped", detail: "skipped: no hooks" })).toBe("Skipped — the audit found no hooks");
    expect(ruleRunText({ outcome: "fired", detail: "message 60 review_required" })).toBe("Ran — draft written, to review");
    expect(ruleRunText({ outcome: "fired", detail: "score S2 (40 points)" })).toBe("Ran — segment S2, 40 points");
    expect(ruleRunText({ outcome: "blocked", detail: "blocked: do_not_contact" })).toBe("Blocked — marked do not contact");
    expect(ruleRunText({ outcome: "skipped", detail: "skipped: condition attr.size" }, () => "Size")).toBe("Skipped — a condition did not hold: Size");
    expect(ruleRunText({ outcome: "fired", detail: "something new 7" })).toBe("Ran");
    expect(ruleRunText({ outcome: "", detail: "claimed" })).toBe("Running");
  });
});
