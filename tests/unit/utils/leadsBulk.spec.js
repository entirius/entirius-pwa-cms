import { describe, it, expect } from "vitest";
import { bulkAnswer } from "@/utils/leadsBulk";

// Every bulk action of the Leads panel ends saying what it changed and what it did not (acceptance walk 3, S3).
describe("bulkAnswer", () => {
  const approve = { doneKey: "leads.approvals.approved_n", notKey: "leads.approvals.not_approved" };

  it("says how many rows changed when nothing was refused", () => {
    expect(bulkAnswer({ ...approve, done: 2 })).toEqual({ msg: "2 drafts approved.", type: "positive" });
  });

  it("adds how many were not changed, as a warning", () => {
    expect(bulkAnswer({ ...approve, done: 1, refused: 1 })).toEqual({ msg: "1 draft approved. 1 not approved.", type: "warning" });
    expect(bulkAnswer({ ...approve, done: 0, refused: 2 }).msg).toBe("0 drafts approved. 2 not approved.");
  });

  it("passes extra parameters to the sentence", () => {
    const assign = { doneKey: "leads.companies.assigned", notKey: "leads.companies.not_assigned", params: { name: "Anna" } };
    expect(bulkAnswer({ ...assign, done: 3, refused: 1 }).msg).toBe("3 companies assigned to Anna. 1 not assigned.");
  });
});
