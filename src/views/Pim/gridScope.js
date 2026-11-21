// The PIM grid's filters as the filter scope of an AI task (`scope_spec.filters`, the PIM adapter keys), so a run can
// cover every matching product, not only the selected page.

/** The adapter's filters for the grid state, only the ones set; `null` when none is. */
export function gridFilterScope({ search, activeFilter, visibility, productClass, category, attributeFilters } = {}) {
  const filters = {};
  if (search) filters.search = search;
  if (activeFilter === "enabled") filters.is_enabled = true;
  if (activeFilter === "disabled") filters.is_enabled = false;
  if (activeFilter === "no_media") filters.has_media = false;
  if (visibility) filters.visibility = visibility;
  if (productClass) filters.product_class = productClass;
  if (category) filters.category_idx = category;
  if (Object.keys(attributeFilters || {}).length) filters.attribute_filters = { ...attributeFilters };
  return Object.keys(filters).length ? filters : null;
}
