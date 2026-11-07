import { describe, it, expect } from "vitest";
import {
  ageText, approvalKey, blankRoute, buildRouteBody, capText, domainOf, errorCode, failedList, routeOptions, routeToForm, splitSelection,
} from "@/utils/leadsOutbound";

const form = (fields) => ({ ...blankRoute(), key: "ecomhouse", from_email: "wiktorw@ecom.house", ...fields });

describe("route body", () => {
  it("a new route sends its key and every field; empty numbers are null, the warm-up date too", () => {
    expect(buildRouteBody(form({ name: " Ecom ", cc_email: "dw@ecom.house", daily_cap: "50" }), { create: true })).toEqual({
      key: "ecomhouse", name: "Ecom", from_email: "wiktorw@ecom.house", cc_email: "dw@ecom.house", is_active: true,
      daily_cap: 50, warmup_start_cap: null, warmup_step: 5, warmup_started_on: null,
    });
  });

  it("an edit has no key; a warm-up carries its start date when there is a start limit", () => {
    const body = buildRouteBody(form({ daily_cap: "50", warmup_start_cap: "5", warmup_step: "5", warmup_started_on: "2026-11-10" }));
    expect(body.key).toBeUndefined();
    expect(body).toMatchObject({ warmup_start_cap: 5, warmup_step: 5, warmup_started_on: "2026-11-10" });
  });

  it.each([
    [{ key: "Eco House" }, "communicator.routes.key_invalid"],
    [{ from_email: "nope" }, "communicator.routes.from_invalid"],
    [{ cc_email: "nope" }, "communicator.routes.cc_invalid"],
    [{ daily_cap: "-1" }, "communicator.routes.number_invalid"],
    [{ daily_cap: "1.5" }, "communicator.routes.number_invalid"],
    [{ warmup_start_cap: "5" }, "communicator.routes.warmup_needs_cap"],
    [{ daily_cap: "10", warmup_start_cap: "20" }, "communicator.routes.warmup_above_cap"],
  ])("refuses %j before the call", (fields, error) => {
    expect(buildRouteBody(form(fields), { create: true })).toEqual({ error });
  });

  it("round trips a route from the API into the form", () => {
    const route = { key: "a", name: "A", from_email: "a@x.pl", cc_email: "", is_active: false, daily_cap: null, warmup_start_cap: 3, warmup_step: 2, warmup_started_on: "2026-11-01" };
    expect(routeToForm(route)).toMatchObject({ key: "a", daily_cap: "", warmup_start_cap: 3, is_active: false });
  });

  it("reads the error code and the today counter", () => {
    expect(errorCode({ response: { data: { error: "ROUTE_EXISTS" } } })).toBe("ROUTE_EXISTS");
    expect(errorCode(new Error("x"))).toBe("");
    expect(capText({ sent_today: 3, cap_today: 10 })).toBe("3 / 10");
    expect(capText({ sent_today: 3, cap_today: null })).toBe("3");
  });

  it("route options start with the channel default", () => {
    const options = routeOptions([{ key: "a", name: "Alpha" }, { key: "b", name: "" }], { defaultLabel: "Default", defaultKey: "a" });
    expect(options).toEqual([{ value: "", label: "Default: a" }, { value: "a", label: "Alpha (a)" }, { value: "b", label: "b" }]);
  });
});

describe("approvals helpers", () => {
  it("writes the age short", () => {
    expect([0.4, 5.2, 24, 30, 72].map(ageText)).toEqual(["<1 h", "5 h", "1 d", "1 d 6 h", "3 d"]);
  });

  it("splits a selection into what can be approved and what is blocked", () => {
    const rows = [{ id: 1, blocker: "" }, { id: 2, blocker: "unknown route" }, { id: 3, blocker: "" }];
    const split = splitSelection(rows, new Set([2, 3, 99]));
    expect(split.all).toEqual([2, 3]);
    expect(split.approvable).toEqual([3]);
    expect(split.blocked.map((row) => row.id)).toEqual([2]);
  });

  it("lists failures by id", () => {
    expect(failedList({ 4: "no longer waiting" })).toEqual([{ id: 4, reason: "no longer waiting" }]);
    expect(failedList(undefined)).toEqual([]);
  });

  const key = (k, target = { tagName: "BODY" }, extra = {}) => approvalKey({ key: k, target, ...extra });
  it("keys: j/k, x, a, r, Enter; never while typing, never with a modifier, never on a button for Enter", () => {
    expect(["j", "ArrowDown", "k", "ArrowUp", "x", " ", "a", "r", "Enter", "q"].map((k) => key(k))).toEqual(["next", "next", "prev", "prev", "toggle", "toggle", "approve", "reject", "preview", null]);
    expect(key("a", { tagName: "INPUT" })).toBeNull();
    expect(key("a", { tagName: "BODY" }, { ctrlKey: true })).toBeNull();
    expect(key("Enter", { tagName: "BUTTON" })).toBeNull();
    expect(key("j", { tagName: "BUTTON" })).toBe("next");
  });

  it("domainOf reads the host", () => {
    expect(domainOf("Anna@Shop.PL")).toBe("shop.pl");
    expect(domainOf("nope")).toBe("");
  });
});
