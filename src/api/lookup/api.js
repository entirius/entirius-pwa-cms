import { lookupApi } from "./client";

const LOOKUP = "/api/lookup/v2/admin";

// FormData payloads (image upload) need an explicit multipart header; JSON
// payloads let axios set application/json on its own.
const requestConfig = (payload) =>
  payload instanceof FormData
    ? { headers: { "Content-Type": "multipart/form-data" } }
    : undefined;

// Ranked candidates plus a match/review/no_match decision per candidate and
// an overall decision. { q, ean, brand, mpn, sku, name, attrs, scope, limit,
// image_url } as JSON, or the same fields + `image` file as FormData.
//
// The plain, decision-less /search/ endpoint has no CMS caller yet — add
// POST_LookupSearch back here if/when one needs it (YAGNI).
export const POST_LookupCheck = (payload) =>
  lookupApi.post(`${LOOKUP}/check/`, payload, requestConfig(payload));
