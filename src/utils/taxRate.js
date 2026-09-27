import { getLang } from "@/i18n";

// PriceManager stores a tax rate as a decimal fraction with 4 places ("0.2300" = 23 %);
// the CMS shows and takes percent. Both directions round to 2 percent decimals.
const LOCALES = { PL: "pl-PL", EN: "en-GB" };

const round2 = (n) => Math.round(n * 100) / 100;

export function rateToPercent(rate) {
  if (rate === null || rate === undefined || rate === "") return null;
  const num = Number(rate);
  return Number.isFinite(num) ? round2(num * 100) : null;
}

export function percentToRate(percent) {
  return (round2(Number(percent)) / 100).toFixed(4);
}

// "23 %", "8,5 %" (pl) / "8.5 %" (en); "" when the rate is missing.
export function formatTaxRate(rate) {
  const percent = rateToPercent(rate);
  if (percent === null) return "";
  const locale = LOCALES[getLang()] || LOCALES.EN;
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(percent)} %`;
}
