import { GET_Mailboxes } from "@/api/communicator/api";

// U21: a brand ("entirius", "acme.shop") is set once on a mailbox; a footer and the mailbox form pick from the
// brands the channel's mailboxes carry (a company's brand is its `sender_brand` attribute).
// Blank = no brand. The slug rule is the backend's (`[a-z0-9.-]{0,32}`).
export const BRAND_PATTERN = /^[a-z0-9.-]{0,32}$/;

export const normaliseBrand = (value) => String(value ?? "").trim().toLowerCase();

/** The distinct brands of a list of mailboxes, sorted. */
export const brandsOf = (mailboxes) => [...new Set((mailboxes || []).map((mailbox) => normaliseBrand(mailbox.brand)).filter(Boolean))].sort();

/** The channel's brands; [] when the mailboxes cannot be read (communicator off, no access). */
export async function loadBrands() {
  try {
    return brandsOf((await GET_Mailboxes()).data.results);
  } catch {
    return [];
  }
}
