import { describe, it, expect, vi } from "vitest";

vi.mock("@/api/leads/api", () => ({ GET_LeadsChannel: vi.fn() }));
vi.mock("@/api/regional/api", () => ({ GET_RegionalCurrencies: vi.fn() }));

import { canClose, contactOptions, currencyOptions, dealFormErrors, dealHistoryText, dealValue, firstStage, totalLines } from "@/views/Leads/deals";

const stages = [
  { key: "qualified", label: "Qualified", kind: "open" },
  { key: "proposal", label: "Proposal", kind: "open" },
  { key: "won", label: "Won", kind: "won" },
];

// Plan 16: the money lines, the closing stages and the History sentences of the deal screens.
describe("Leads deals helpers", () => {
  it("totals: one line per currency, one-off before recurring, never added across currencies", () => {
    const totals = [
      { currency: "EUR", one_off: "500.00", recurring: "0.00" },
      { currency: "PLN", one_off: "12400.00", recurring: "800.00" },
    ];
    expect(totalLines(totals)).toEqual(["500.00 EUR", "12400.00 PLN", "800.00 PLN / month"]);
    expect(totalLines([])).toEqual([]);
  });

  it("a deal's value reads one-off, then recurring with its period", () => {
    expect(dealValue({ value_one_off: "12400.00", value_recurring: "100.00", recurring_period: "year", currency: "PLN" })).toBe("12400.00 PLN · 100.00 PLN / year");
    expect(dealValue({ value_one_off: null, value_recurring: null, currency: null })).toBe("");
  });

  it("deals close only with a won and a lost stage; the first stage of a kind is the target", () => {
    expect(canClose(stages)).toBe(false);
    expect(canClose([...stages, { key: "lost", kind: "lost" }])).toBe(true);
    expect(firstStage(stages, "open").key).toBe("qualified");
    expect(firstStage(stages, "lost")).toBeNull();
  });

  it("a value without a currency is refused unless the channel's default fills it", () => {
    const form = { title: "Shop", valueOneOff: "100.00", valueRecurring: "", currency: null };
    expect(dealFormErrors(form)).toEqual({ currency: "Pick a currency" });
    expect(dealFormErrors(form, "PLN")).toEqual({});
    expect(dealFormErrors({ ...form, title: " ", valueOneOff: "" })).toEqual({ title: "Give the deal a title" });
  });

  it("History: a move in stage labels, an opened deal as a sentence", () => {
    expect(dealHistoryText({ message: "deal qualified -> proposal", data: { from: "qualified", to: "proposal" } }, stages)).toBe("Qualified → Proposal");
    expect(dealHistoryText({ message: "deal opened: Shop rebuild", data: {} }, stages)).toBe("Deal opened: Shop rebuild");
  });

  it("currencies are unique and sorted; the primary contact comes first, anonymised ones are gone", () => {
    expect(currencyOptions(["PLN", "EUR"], "PLN", null).map((o) => o.value)).toEqual(["EUR", "PLN"]);
    const contacts = [
      { id: 1, first_name: "Ewa", last_name: "Lis", is_primary: false },
      { id: 2, first_name: "Jan", last_name: "Nowak", is_primary: true },
      { id: 3, first_name: "", last_name: "", email: "x@y.test", anonymised_at: "2026-01-01" },
    ];
    expect(contactOptions(contacts)).toEqual([{ value: 2, label: "Jan Nowak" }, { value: 1, label: "Ewa Lis" }]);
  });
});
