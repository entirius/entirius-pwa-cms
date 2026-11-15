import { describe, it, expect } from "vitest";
import { formatLeadsDay } from "@/utils/leadsTime";
import { cancelledLine, taskDue } from "@/views/Leads/tasks";

// m6 (acceptance walk 3): under the Done chip the Due column says when the task was done, not "Done" on every row.
describe("taskDue", () => {
  it("a done task says when it was done", () => {
    const done_at = "2026-11-10T10:00:00Z";
    expect(taskDue({ status: "done", done_at })).toEqual({ label: `Done ${formatLeadsDay(done_at)}`, tone: "positive" });
  });

  it("a done task without a date says Done", () => {
    expect(taskDue({ status: "done", done_at: null }).label).toBe("Done");
  });
});

// U5: a cancelled task says who cancelled it, when and why.
describe("cancelledLine", () => {
  const done_at = "2026-11-15T11:12:00Z";
  it("names who, when and the reason", () => {
    const task = { status: "cancelled", done_by: "manager", done_at, outcome: "urgent" };
    expect(cancelledLine(task)).toBe(`Cancelled by manager · ${formatLeadsDay(done_at)} — urgent`);
    expect(taskDue(task)).toEqual({ label: `Cancelled ${formatLeadsDay(done_at)}`, tone: "neutral" });
  });

  it("without a reason or a date it says only who; any other task has no line", () => {
    expect(cancelledLine({ status: "cancelled", done_by: "", done_at: null, outcome: "" })).toBe("Cancelled by System");
    expect(cancelledLine({ status: "done", done_by: "manager", outcome: "ok" })).toBe("");
  });
});
