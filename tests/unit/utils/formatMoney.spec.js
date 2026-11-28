import { describe, it, expect, afterEach } from "vitest";
import { setLang } from "@/i18n";
import { formatMoney } from "@/utils/format";

// Intl separates groups and the currency with a no-break space (U+00A0).
const NBSP = " ";

describe("formatMoney", () => {
  afterEach(() => setLang("EN"));

  it("writes an amount the way the UI language does", () => {
    expect(formatMoney("18500.00", "PLN")).toBe(`PLN${NBSP}18,500.00`);
    setLang("PL");
    expect(formatMoney("18500.00", "PLN")).toBe(`18${NBSP}500,00${NBSP}zł`);
    expect(formatMoney("500", "EUR")).toBe(`500,00${NBSP}€`);
  });

  it("keeps two decimals of a 4-place decimal string and groups an amount without a currency", () => {
    setLang("PL");
    expect(formatMoney("40.3000", "PLN")).toBe(`40,30${NBSP}zł`);
    expect(formatMoney("12400", "")).toBe(`12${NBSP}400,00`);
  });

  it("falls back to the plain form for a code Intl does not know, and to nothing for no amount", () => {
    expect(formatMoney("12.5", "ZZZZ")).toBe("12.50 ZZZZ");
    expect(formatMoney(null, "PLN")).toBe("");
    expect(formatMoney("abc", "PLN")).toBe("");
  });
});
