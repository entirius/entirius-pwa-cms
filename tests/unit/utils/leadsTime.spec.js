import { describe, it, expect } from "vitest";
import { channelTimeZone, formatTime, isOverdue } from "@/utils/leadsTime";

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

describe("one date/time format everywhere (24 h, the channel's timezone, with a day when it is not today)", () => {
  const now = new Date("2026-09-15T12:00:00Z");

  it("today is a bare 24 h time in the channel time zone", () => {
    channelTimeZone.value = "Europe/Warsaw";
    expect(formatTime("2026-09-15T21:46:00Z", now)).toBe("23:46");
  });

  it("another day in the channel time zone carries DD.MM", () => {
    channelTimeZone.value = "Europe/Warsaw";
    expect(formatTime("2026-09-15T22:30:00Z", now)).toBe("16.09 00:30");
    expect(formatTime("2026-09-14T06:00:00Z", now)).toBe("14.09 08:00");
  });

  it("a missing timestamp is empty", () => {
    expect(formatTime("", now)).toBe("");
  });
});
