// Builds the lookup /search or /check request body: JSON for text-only (or a
// still-remote `image_url`), FormData once a local image has been picked and
// downscaled.
export function buildLookupPayload({
  scope,
  q,
  imageBlob,
  imageUrl,
  imageRemoved,
}) {
  const base = { scope };
  if (q?.trim()) base.q = q.trim();
  if (imageBlob) return toFormData(base, imageBlob);
  if (!imageRemoved && imageUrl) base.image_url = imageUrl;
  return base;
}

function toFormData(base, imageBlob) {
  const form = new FormData();
  Object.entries(base).forEach(([key, value]) => {
    if (Array.isArray(value)) value.forEach((v) => form.append(key, v));
    else form.append(key, value);
  });
  form.append("image", imageBlob, "query.jpg");
  return form;
}
