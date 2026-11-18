import { GET_Mailboxes } from "@/api/communicator/api";

// U21: a brand ("entirius", "ecom.house") is set once on a mailbox; a company, a footer and the import pick from the
// brands the channel's mailboxes carry. Blank = no brand. The slug rule is the backend's (`[a-z0-9.-]{0,32}`).
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

/** Select options of `brands` plus the values already in use (a brand no mailbox carries any more stays shown). */
export function brandOptions(brands, ...kept) {
  const all = [...new Set([...(brands || []), ...kept.map(normaliseBrand).filter(Boolean)])].sort();
  return all.map((brand) => ({ value: brand, label: brand }));
}
