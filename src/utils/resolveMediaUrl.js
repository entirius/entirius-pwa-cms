// Resolve an API-relative media path (e.g. "/media/products/x.jpg") against
// the backend origin. Absolute URLs (http/https — e.g. an atlas source's
// remote picture) pass through untouched. Precedent:
// src/functionals/EditBannerModal.vue's resolveMediaUrl.
export function resolveMediaUrl(url) {
  if (!url) return "";
  if (!url.startsWith("/")) return url;
  return (process.env.VUE_APP_API_URL || "") + url;
}
