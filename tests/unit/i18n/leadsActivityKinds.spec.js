import { describe, it, expect, afterEach } from "vitest";
import en from "@/i18n/locales/en.json";
import pl from "@/i18n/locales/pl.json";
import { setLang } from "@/i18n";
import { activityText } from "@/utils/leadsLabels";

// P10 (acceptance walk 3): History reads in one language. Every activity kind of leads has its line in both locales.
// Source of the list: `ActivityKind` in entirius-django-leads `src/django_leads/enums.py` — a new kind there needs a line
// in `leads.activity.kind` of both locales and an entry here.
const ACTIVITY_KINDS = [
  "import",
  "form",
  "form_import_failed",
  "stage",
  "rule",
  "draft",
  "sent",
  "reply",
  "bounce",
  "optout",
  "note",
  "anonymised",
  "blocked",
  "skipped",
  "rotation",
  "rotation_failed",
  "rotation_gave_up",
  "legal_basis",
  "legal_basis_conflict",
  "intel",
  "intel_empty",
  "score",
  "task",
  "deal",
];

describe("leads activity kinds", () => {
  afterEach(() => setLang("EN"));

  it.each(ACTIVITY_KINDS)("%s has a line in English and in Polish", (kind) => {
    expect(en.leads.activity.kind[kind]).toBeTruthy();
    expect(pl.leads.activity.kind[kind]).toBeTruthy();
  });

  it("names no kind the enum does not have", () => {
    expect(Object.keys(en.leads.activity.kind).sort()).toEqual([...ACTIVITY_KINDS].sort());
  });

  it("a message the panel does not know reads as its kind in Polish, never in the service's English", () => {
    setLang("PL");
    expect(activityText({ kind: "rotation", message: "rotated to the next contact" })).toBe("Wybrano kolejny kontakt");
    expect(activityText({ kind: "sent", message: "message sent" })).toBe("Wysłano maila");
    expect(activityText({ kind: "note", message: "contact flagged: wrong person" })).toBe("Kontakt oznaczony: niewłaściwa osoba");
    expect(activityText({ kind: "import", message: "import created" })).toBe("Utworzono przez import");
  });
});
