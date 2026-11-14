import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve as resolvePath } from "node:path";
import en from "@/i18n/locales/en.json";
import pl from "@/i18n/locales/pl.json";

// R4 (acceptance walk 2): no English label on a Polish company card or deal card. Every Leads and communicator string
// exists in both locales, and every literal `leads.*` key the two cards and their tabs use resolves in Polish.
const NAMESPACES = ["leads", "communicator"];
const CARD_FILES = [
  "Company.vue",
  "CompanyDetails.vue",
  "CompanyActions.vue",
  "Deal.vue",
  "DealDetails.vue",
  "tabs/OverviewTab.vue",
  "tabs/ContactsTab.vue",
  "tabs/TasksTab.vue",
  "tabs/DealsTab.vue",
  "tabs/IntelTab.vue",
];

const resolve = (locale, key) => key.split(".").reduce((node, part) => node?.[part], locale);
const leaves = (node, prefix) =>
  Object.entries(node ?? {}).flatMap(([key, value]) =>
    typeof value === "object" ? leaves(value, `${prefix}.${key}`) : [`${prefix}.${key}`]
  );
const missingIn = (locale, keys) => keys.filter((key) => !String(resolve(locale, key) ?? "").trim());
const literalKeys = (file) => {
  const source = readFileSync(resolvePath(__dirname, "../../../src/views/Leads", file), "utf8");
  return [...source.matchAll(/["'`](leads\.[a-z0-9_]+(?:\.[a-z0-9_]+)+)["'`]/g)].map((match) => match[1]);
};

describe("Leads i18n keys", () => {
  it.each(NAMESPACES)("%s has the same keys in EN and PL", (namespace) => {
    const enKeys = leaves(en[namespace], namespace);
    expect(missingIn(pl, enKeys)).toEqual([]);
    expect(missingIn(en, leaves(pl[namespace], namespace))).toEqual([]);
  });

  it.each(CARD_FILES)("%s: every literal key is Polish", (file) => {
    const keys = literalKeys(file);
    expect(keys.length).toBeGreaterThan(0);
    expect(missingIn(pl, keys)).toEqual([]);
  });
});
