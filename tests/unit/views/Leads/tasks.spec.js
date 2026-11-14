import { describe, it, expect } from "vitest";
import { formatLeadsDay } from "@/utils/leadsTime";
import { taskDue } from "@/views/Leads/tasks";

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
