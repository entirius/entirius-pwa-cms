import { describe, it, expect } from "vitest";
import { actionBody, intentByThread, replyAt, REPLY_INTENTS } from "@/utils/leadsIntents";

const row = (extra = {}) => ({ intent: "interested", sequence: "stop", notify: "high", remind_after_days: "", needs_review: false, min_confidence: "", auto_suppress: false, ...extra });

describe("reply intent helpers (T4)", () => {
  it("knows the seven classes", () => {
    expect(REPLY_INTENTS).toEqual(["interested", "not_now", "not_interested", "out_of_office", "wrong_person", "unsubscribe", "unclear"]);
  });

  it("keeps the newest classified reply per thread", () => {
    const replies = [
      { id: 3, thread_id: 1, intent: "" },
      { id: 2, thread_id: 1, intent: "not_now" },
      { id: 1, thread_id: 1, intent: "interested" },
      { id: 4, thread_id: 2, intent: "unsubscribe" },
    ];
    const map = intentByThread(replies);
    expect(map.get(1).id).toBe(2);
    expect(map.get(2).id).toBe(4);
  });

  it("finds a reply by the time it arrived", () => {
    expect(replyAt([{ id: 1, received_at: "t1" }, { id: 2, received_at: "t2" }], "t2").id).toBe(2);
    expect(replyAt([], "t2")).toBeNull();
  });

  it("builds a reply-action body: empty reminder and threshold are null, auto_suppress only for unsubscribe", () => {
    expect(actionBody(row()).body).toEqual({ sequence: "stop", notify: "high", remind_after_days: null, needs_review: false, min_confidence: null });
    expect(actionBody(row({ intent: "unsubscribe", auto_suppress: true, remind_after_days: "3", min_confidence: "0.6" })).body).toEqual({
      sequence: "stop",
      notify: "high",
      remind_after_days: 3,
      needs_review: false,
      min_confidence: 0.6,
      auto_suppress: true,
    });
  });

  it("refuses a fractional reminder and a threshold above 1", () => {
    expect(actionBody(row({ remind_after_days: "1.5" })).error).toBe("communicator.reply_actions.remind_invalid");
    expect(actionBody(row({ remind_after_days: "-1" })).error).toBe("communicator.reply_actions.remind_invalid");
    expect(actionBody(row({ min_confidence: "2" })).error).toBe("communicator.reply_actions.confidence_invalid");
  });
});
