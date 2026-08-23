import { lookupApi } from "./client";

const LOOKUP = "/api/lookup/v2/admin";

// FormData payloads (image upload) need an explicit multipart header; JSON
// payloads let axios set application/json on its own.
const requestConfig = (payload) =>
  payload instanceof FormData
    ? { headers: { "Content-Type": "multipart/form-data" } }
    : undefined;

// Ranked candidates, no verdict. { q, ean, brand, mpn, sku, name, attrs, scope,
// limit, image_url } as JSON, or the same fields + `image` file as FormData.
export const POST_LookupSearch = (payload) =>
  lookupApi.post(`${LOOKUP}/search/`, payload, requestConfig(payload));

// Same input shape as search, plus a match/review/no_match decision per
// candidate and an overall decision.
export const POST_LookupCheck = (payload) =>
  lookupApi.post(`${LOOKUP}/check/`, payload, requestConfig(payload));
