// U17: the shapes of KONTRAKT-IMPORT (leads `imports/fields/`, `imports/preview/` columns).
export const FIELDS = [
  { key: "company_name", label: "Company name", entity: "company", custom: false },
  { key: "domain", label: "Domain", entity: "company", custom: false },
  { key: "website", label: "Website", entity: "company", custom: false },
  { key: "first_name", label: "First name", entity: "contact", custom: false },
  { key: "last_name", label: "Last name", entity: "contact", custom: false },
  { key: "email", label: "Email", entity: "contact", custom: false },
  { key: "attr.nip", label: "NIP", entity: "company", custom: true },
  { key: "contact.attr.linkedin", label: "LinkedIn", entity: "contact", custom: true },
];
export const COLUMNS = [
  { name: "Nazwa firmy", index: 0, field: "company_name", confidence: 0.95, level: "certain", source: "header", reason: null, samples: ["Alfa"] },
  { name: "WWW", index: 1, field: "website", confidence: 0.95, level: "certain", source: "header", reason: null, samples: ["https://alfa.pl"] },
  { name: "Kolumna3", index: 2, field: "email", confidence: 0.75, level: "check", source: "content", reason: null, samples: ["jan@alfa.pl"] },
  {
    name: "REGON",
    index: 3,
    field: "ignore",
    confidence: 0.95,
    level: "unrecognised",
    source: "header",
    reason: "no_crm_field",
    concept: "regon",
    samples: ["123"],
  },
  {
    name: "E-mail 2",
    index: 4,
    field: "ignore",
    confidence: 0.9,
    level: "check",
    source: "header",
    reason: "duplicate_field",
    conflict_with: "Kolumna3",
    samples: ["k@alfa.pl"],
  },
  { name: "xyz", index: 5, field: "ignore", confidence: 0, level: "unrecognised", source: "none", reason: "unrecognised", samples: ["a1"] },
];
