import { t } from "@/i18n";
import { GET_LeadsChannel } from "@/api/leads/api";
import { GET_RegionalCurrencies } from "@/api/regional/api";
import { formatCost } from "@/utils/format";
import { activityText } from "@/utils/leadsLabels";

// Deals of the Leads CRM (plan 16): stage kinds, money lines, the stages a deal closes in. Amounts stay decimal
// strings end to end; a total is one line per currency, never added across currencies (`ux/copy.md` § Money).
export const DEAL_KINDS = ["open", "won", "lost"];

const KIND_TONES = { open: "info", won: "positive", lost: "negative" };

export const dealKindTone = (kind) => KIND_TONES[kind] || "neutral";

export const dealKindLabel = (kind) => t(`leads.deal_kind.${kind}`);

export const stageKindOptions = () => DEAL_KINDS.map((value) => ({ value, label: t(`leads.deal_stage_kind.${value}`) }));

// Stages come in pipeline order: the first of a kind is where Mark won / Mark lost / Reopen go.
export const firstStage = (stages, kind) => stages.find((stage) => stage.kind === kind) || null;

export const canClose = (stages) => Boolean(firstStage(stages, "won") && firstStage(stages, "lost"));

export const stageOptions = (stages) => stages.map((stage) => ({ value: stage.key, label: stage.label }));

const isZero = (amount) => !amount || /^0*\.?0*$/.test(amount);

export const recurringText = (amount, currency, period = "month") =>
  t(`leads.deal.per_${period === "year" ? "year" : "month"}`, { value: formatCost(amount, currency) });

export const oneOffText = (deal) => (isZero(deal.value_one_off) ? "" : formatCost(deal.value_one_off, deal.currency || ""));

export const recurringValueText = (deal) =>
  isZero(deal.value_recurring) ? "" : recurringText(deal.value_recurring, deal.currency || "", deal.recurring_period);

// The value of one deal as a list row or a board card reads it: one-off, then recurring with its period.
export const dealValue = (deal) => [oneOffText(deal), recurringValueText(deal)].filter(Boolean).join(" · ");

// A board column's totals (the API sums recurring values per month): one-off lines, then recurring lines, by currency.
export function totalLines(totals = []) {
  const oneOff = totals.filter((row) => !isZero(row.one_off)).map((row) => formatCost(row.one_off, row.currency));
  const recurring = totals.filter((row) => !isZero(row.recurring)).map((row) => recurringText(row.recurring, row.currency));
  return [...oneOff, ...recurring];
}

// Currency codes a deal can pick: the known ones, the channel default and the deal's own (it still reads).
export function currencyOptions(codes, ...own) {
  const all = [...new Set([...own, ...codes].filter(Boolean))].sort();
  return all.map((code) => ({ value: code, label: code }));
}

// The currencies to pick from and the channel's default; each one is optional (a salesperson may read neither).
export async function loadCurrencies() {
  const [regional, channel] = await Promise.allSettled([GET_RegionalCurrencies(), GET_LeadsChannel()]);
  const rows = regional.status === "fulfilled" ? regional.value.data.results || [] : [];
  const fallback = channel.status === "fulfilled" ? channel.value.data.default_currency : null;
  return { codes: rows.map((row) => row.iso3).filter(Boolean), fallback };
}

// The company's contacts a deal can name (anonymised ones are gone), the primary one first.
export function contactOptions(contacts = []) {
  const live = contacts.filter((contact) => !contact.anonymised_at);
  const ordered = [...live.filter((contact) => contact.is_primary), ...live.filter((contact) => !contact.is_primary)];
  return ordered.map((contact) => ({ value: contact.id, label: `${contact.first_name} ${contact.last_name}`.trim() || contact.email }));
}

// A deal as DealForm edits it, and back: amounts stay strings, an empty field is null.
export const dealForm = (deal = {}) => ({
  title: deal.title || "",
  contactId: deal.contact?.id ?? null,
  expectedClose: deal.expected_close_date || "",
  valueOneOff: deal.value_one_off ?? "",
  currency: deal.currency ?? null,
  valueRecurring: deal.value_recurring ?? "",
  period: deal.recurring_period || "month",
});

export const dealBody = (form) => ({
  title: form.title.trim(),
  contact_id: form.contactId || null,
  expected_close_date: form.expectedClose || null,
  value_one_off: form.valueOneOff || null,
  currency: form.currency || null,
  value_recurring: form.valueRecurring || null,
  recurring_period: form.period,
});

// What the API would refuse, said before the call: a title, and a currency for any value (unless the channel's
// default fills it on create — `fallback`).
export function dealFormErrors(form, fallback = null) {
  const errors = {};
  if (!form.title.trim()) errors.title = t("leads.deal.title_required");
  const hasValue = !isZero(form.valueOneOff) || !isZero(form.valueRecurring);
  if (hasValue && !form.currency && !fallback) errors.currency = t("leads.deal.pick_currency");
  return errors;
}

// A History entry of the deal card: a move reads as "Qualified → Proposal" in the stages' labels; anything else
// through the panel's activity sentences.
export function dealHistoryText(activity, stages = []) {
  const { from, to } = activity.data || {};
  if (!from || !to) return activityText(activity);
  const label = (key) => stages.find((stage) => stage.key === key)?.label || key;
  return t("leads.activity.deal_moved", { from: label(from), to: label(to) });
}
