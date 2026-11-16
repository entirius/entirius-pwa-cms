import { describe, it, expect } from "vitest";
import {
  IGNORE,
  confidenceLevel,
  conflicts,
  fieldLabel,
  fieldOptions,
  hasIdentity,
  importErrorText,
  mappingPayload,
  nameConflict,
  previewFields,
  proposalNote,
  proposedMapping,
  wentLines,
  withField,
} from "@/views/Leads/columnMapping";
import { COLUMNS, FIELDS } from "./importFixtures";

describe("import mapping helpers (U17)", () => {
  it("names the server's level in three words: sure, check it, not recognised", () => {
    expect(COLUMNS.map((column) => confidenceLevel(column))).toEqual(["sure", "sure", "check", "check", "check", "unknown"]);
  });

  it("a field the user picked is sure; a proposal the user skipped is skipped, not unrecognised", () => {
    expect(confidenceLevel(COLUMNS[5], "phone")).toBe("sure");
    expect(confidenceLevel(COLUMNS[2], IGNORE)).toBe("skipped");
    expect(confidenceLevel(COLUMNS[0], IGNORE)).toBe("skipped");
    expect(confidenceLevel(COLUMNS[5], IGNORE)).toBe("unknown");
    expect(confidenceLevel(COLUMNS[2], "email")).toBe("check");
  });

  it("a full name together with a first or last name is a conflict of its own", () => {
    const base = { A: "full_name", B: "email" };
    expect(nameConflict(base)).toEqual([]);
    expect(nameConflict({ ...base, C: "first_name" })).toEqual(["A", "C"]);
    expect(nameConflict({ ...base, C: "last_name" })).toEqual(["A", "C"]);
    expect(nameConflict({ B: "email", C: "first_name", D: "last_name" })).toEqual([]);
    expect(conflicts({ ...base, C: "first_name" })).toEqual({});
  });

  it("starts from the proposal, keyed by the column name", () => {
    expect(proposedMapping(COLUMNS)).toEqual({
      "Nazwa firmy": "company_name",
      WWW: "website",
      Kolumna3: "email",
      REGON: IGNORE,
      "E-mail 2": IGNORE,
      xyz: IGNORE,
    });
  });

  it("offers Skip first, then every field named by its group; built-in names translated, custom ones as defined", () => {
    expect(fieldOptions(FIELDS).map((option) => option.label)).toEqual([
      "Skip this column",
      "Company · Company name",
      "Company · Domain",
      "Company · Website",
      "Contact · First name",
      "Contact · Last name",
      "Contact · E-mail",
      "Company custom field · NIP",
      "Contact custom field · LinkedIn",
    ]);
    expect(fieldOptions(FIELDS)[0].value).toBe(IGNORE);
    expect(fieldLabel({ key: "brand_new", label: "Brand new", custom: false })).toBe("Brand new");
  });

  it("two columns on one field are a conflict until one is skipped; nothing is moved behind the user's back", () => {
    const changed = withField(proposedMapping(COLUMNS), "E-mail 2", "email");
    expect(changed.Kolumna3).toBe("email");
    expect(conflicts(changed)).toEqual({ email: ["Kolumna3", "E-mail 2"] });
    expect(conflicts(withField(changed, "Kolumna3", IGNORE))).toEqual({});
    expect(conflicts(withField(changed, "Kolumna3", null))).toEqual({});
  });

  it("needs a column for the domain, the website or the e-mail", () => {
    expect(hasIdentity({ a: "company_name", b: "website" })).toBe(true);
    expect(hasIdentity({ a: "company_name", b: "email" })).toBe(true);
    expect(hasIdentity({ a: "company_name", b: IGNORE })).toBe(false);
  });

  it("the preview shows the fields the rows carry, in the field list's order", () => {
    const rows = [
      { row: 2, values: { email: "jan@alfa.pl", first_name: "Jan", last_name: "Kowalski" } },
      { row: 3, values: { company_name: "Beta" } },
    ];
    expect(previewFields(FIELDS, rows).map((field) => field.key)).toEqual(["company_name", "first_name", "last_name", "email"]);
  });

  it("sends every column of the file, a field or ignore", () => {
    expect(mappingPayload(COLUMNS.slice(0, 3), { "Nazwa firmy": "company_name", WWW: "domain" })).toEqual({
      "Nazwa firmy": "company_name",
      WWW: "domain",
      Kolumna3: IGNORE,
    });
  });

  it("says why: the reason (with the winning column or the concept), else where the proposal came from", () => {
    expect(COLUMNS.map(proposalNote)).toEqual([
      "recognised by the column name",
      "recognised by the column name",
      "recognised by the values",
      "looks like a REGON number, but CRM has no such field — add a custom field in Settings to keep it",
      "skipped: Kolumna3 fits this field better",
      "neither the name nor the values tell what it is",
    ]);
    expect(proposalNote({ reason: "brand_new" })).toBe("brand_new");
    expect(proposalNote({ source: "none" })).toBe("");
    expect(proposalNote({})).toBe("");
  });

  it("tells where each column went, the field by its name on screen", () => {
    const applied = [
      { column: "Nazwa firmy", field: "company_name", label: "Company name" },
      { column: "xyz", field: "ignore", label: null },
      { column: "Tel", field: "phone", label: "Phone" },
    ];
    expect(wentLines(applied, FIELDS)).toEqual(["Nazwa firmy → Company name", "xyz → skipped", "Tel → Phone"]);
  });

  it("a 400 reads by its issue; an unknown issue by the server's description; none = not ours", () => {
    const err = (issue, description) => ({ response: { status: 400, data: { details: [{ field: "file", issue, description }] } } });
    expect(importErrorText(err("UNSUPPORTED_FORMAT"), "x")).toContain(".xlsx");
    expect(importErrorText(err("BRAND_NEW", "Brand new problem."), "x")).toBe("Brand new problem.");
    expect(importErrorText({ response: { status: 500 } }, "x")).toBe(null);
  });
});
