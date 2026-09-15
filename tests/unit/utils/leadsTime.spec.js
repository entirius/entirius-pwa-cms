import { describe, it, expect } from "vitest";
import { isOverdue } from "@/utils/leadsTime";

const at = (hhmm) => new Date(`2026-09-15T${hhmm}:00Z`).getTime();

describe("isOverdue", () => {
  it("a slot at 09:04 is held at 09:08 — the 09:05 beat already deferred it", () => {
    expect(isOverdue("2026-09-15T09:04:00Z", at("09:08"))).toBe(true);
  });

  it("is not held before the first beat after the slot plus its grace", () => {
    expect(isOverdue("2026-09-15T09:04:00Z", at("09:05"))).toBe(false);
    expect(isOverdue("2026-09-15T09:04:00Z", at("09:06"))).toBe(false);
  });

  it("an empty slot is never held", () => {
    expect(isOverdue("", at("09:08"))).toBe(false);
  });
});
