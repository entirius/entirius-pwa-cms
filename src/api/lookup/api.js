import { lookupApi } from "./client";

const LOOKUP = "/api/lookup/v2/admin";

// FormData payloads (image upload) need an explicit multipart header; JSON
// payloads let axios set application/json on its own.
const requestConfig = (payload) =>
  payload instanceof FormData
    ? { headers: { "Content-Type": "multipart/form-data" } }
    : undefined;

// Ranked candidates with the evidence behind each one, no verdict. { q, ean,
// brand, mpn, sku, name, attrs, scope, limit, image_url } as JSON, or the
// same fields + `image` file as FormData. This is what exploratory search
// (DedupSearchBox) uses — it must not log a DedupDecision per keystroke.
//
// /check/ additionally scores + decides + logs a DedupDecision per
// candidate; it is for the backend's own create hook and the SpawnRule
// path, not for CMS exploratory search — no CMS caller today (YAGNI, add
// POST_LookupCheck back if/when one needs a verdict client-side).
export const POST_LookupSearch = (payload) =>
  lookupApi.post(`${LOOKUP}/search/`, payload, requestConfig(payload));
