import { atlasApi } from './client'

const ATLAS = '/api/atlas/v2/admin'

// --- Suppliers (facade: kind=procurement projection of Source) ---

export const GET_Suppliers = (params) =>
  atlasApi.get(`${ATLAS}/suppliers/`, { params })

export const GET_Supplier = (idx) =>
  atlasApi.get(`${ATLAS}/suppliers/${idx}/`)

export const POST_Supplier = (data) =>
  atlasApi.post(`${ATLAS}/suppliers/`, data)

export const PATCH_Supplier = (idx, data) =>
  atlasApi.patch(`${ATLAS}/suppliers/${idx}/`, data)

export const DELETE_Supplier = (idx, { force = false } = {}) =>
  atlasApi.delete(`${ATLAS}/suppliers/${idx}/`, {
    params: force ? { force: true } : undefined,
  })

// --- Source-level resources (moved from suppliers/{idx}/... to sources/{idx}/...) ---

export const GET_SupplierDeleteImpact = (idx) =>
  atlasApi.get(`${ATLAS}/sources/${idx}/delete-impact/`)

export const GET_DataKeys = (idx, params) =>
  atlasApi.get(`${ATLAS}/sources/${idx}/data-keys/`, { params })

export const GET_DataValues = (idx, params) =>
  atlasApi.get(`${ATLAS}/sources/${idx}/data-values/`, { params })

// --- Feeds (nested under source) ---

export const GET_Feeds = (supplierIdx, params) =>
  atlasApi.get(`${ATLAS}/sources/${supplierIdx}/feeds/`, { params })

export const GET_Feed = (supplierIdx, idx) =>
  atlasApi.get(`${ATLAS}/sources/${supplierIdx}/feeds/${idx}/`)

export const POST_Feed = (supplierIdx, data) =>
  atlasApi.post(`${ATLAS}/sources/${supplierIdx}/feeds/`, data)

export const PATCH_Feed = (supplierIdx, idx, data) =>
  atlasApi.patch(`${ATLAS}/sources/${supplierIdx}/feeds/${idx}/`, data)

export const DELETE_Feed = (supplierIdx, idx) =>
  atlasApi.delete(`${ATLAS}/sources/${supplierIdx}/feeds/${idx}/`)

export const POST_FeedTrigger = (supplierIdx, idx, data = {}) =>
  atlasApi.post(`${ATLAS}/sources/${supplierIdx}/feeds/${idx}/trigger/`, data)

export const POST_FeedTest = (supplierIdx, idx, data = {}) =>
  atlasApi.post(`${ATLAS}/sources/${supplierIdx}/feeds/${idx}/test/`, data)

// --- Mapping Profiles (nested under source) ---

export const GET_MappingProfiles = (supplierIdx, params) =>
  atlasApi.get(`${ATLAS}/sources/${supplierIdx}/mapping-profiles/`, { params })

export const GET_MappingProfile = (supplierIdx, idx) =>
  atlasApi.get(`${ATLAS}/sources/${supplierIdx}/mapping-profiles/${idx}/`)

export const POST_MappingProfile = (supplierIdx, data) =>
  atlasApi.post(`${ATLAS}/sources/${supplierIdx}/mapping-profiles/`, data)

export const PATCH_MappingProfile = (supplierIdx, idx, data) =>
  atlasApi.patch(`${ATLAS}/sources/${supplierIdx}/mapping-profiles/${idx}/`, data)

export const DELETE_MappingProfile = (supplierIdx, idx) =>
  atlasApi.delete(`${ATLAS}/sources/${supplierIdx}/mapping-profiles/${idx}/`)

export const POST_ValidateProfile = (supplierIdx, idx) =>
  atlasApi.post(`${ATLAS}/sources/${supplierIdx}/mapping-profiles/${idx}/validate/`)

// --- Attribute Mappings (nested under profile pk) ---

export const GET_AttributeMappings = (profilePk, params) =>
  atlasApi.get(`${ATLAS}/mapping-profiles/${profilePk}/attribute-mappings/`, { params })

export const POST_AttributeMapping = (profilePk, data) =>
  atlasApi.post(`${ATLAS}/mapping-profiles/${profilePk}/attribute-mappings/`, data)

export const PATCH_AttributeMapping = (profilePk, pk, data) =>
  atlasApi.patch(`${ATLAS}/mapping-profiles/${profilePk}/attribute-mappings/${pk}/`, data)

export const DELETE_AttributeMapping = (profilePk, pk) =>
  atlasApi.delete(`${ATLAS}/mapping-profiles/${profilePk}/attribute-mappings/${pk}/`)

// --- Category Mappings (nested under profile pk) ---

export const GET_CategoryMappings = (profilePk, params) =>
  atlasApi.get(`${ATLAS}/mapping-profiles/${profilePk}/category-mappings/`, { params })

export const POST_CategoryMapping = (profilePk, data) =>
  atlasApi.post(`${ATLAS}/mapping-profiles/${profilePk}/category-mappings/`, data)

export const PATCH_CategoryMapping = (profilePk, pk, data) =>
  atlasApi.patch(`${ATLAS}/mapping-profiles/${profilePk}/category-mappings/${pk}/`, data)

export const DELETE_CategoryMapping = (profilePk, pk) =>
  atlasApi.delete(`${ATLAS}/mapping-profiles/${profilePk}/category-mappings/${pk}/`)

// --- Source Products ---
// list/detail/bulk endpoints accept a `source` idx filter (was `supplier` under django-suppliers;
// the old CMS call sites sending `supplier_idx` were a pre-existing no-op — see AGENTS.md migration notes).

export const GET_SupplierProducts = (params) =>
  atlasApi.get(`${ATLAS}/products/`, { params })

export const GET_SupplierProduct = (pk) =>
  atlasApi.get(`${ATLAS}/products/${pk}/`)

export const PATCH_SupplierProduct = (pk, data) =>
  atlasApi.patch(`${ATLAS}/products/${pk}/`, data)

export const POST_ApproveProduct = (pk) =>
  atlasApi.post(`${ATLAS}/products/${pk}/approve/`)

export const POST_RejectProduct = (pk) =>
  atlasApi.post(`${ATLAS}/products/${pk}/reject/`)

export const POST_SkipProduct = (pk) =>
  atlasApi.post(`${ATLAS}/products/${pk}/skip/`)

export const POST_QueueProduct = (pk) =>
  atlasApi.post(`${ATLAS}/products/${pk}/queue/`)

export const POST_PushProduct = (pk) =>
  atlasApi.post(`${ATLAS}/products/${pk}/push/`)

export const POST_ForceRepushProduct = (pk) =>
  atlasApi.post(`${ATLAS}/products/${pk}/force-repush/`)

export const POST_BulkApproveProducts = (data) =>
  atlasApi.post(`${ATLAS}/products/bulk-approve/`, data)

export const POST_BulkRejectProducts = (data) =>
  atlasApi.post(`${ATLAS}/products/bulk-reject/`, data)

export const POST_BulkRequeueProducts = (data) =>
  atlasApi.post(`${ATLAS}/products/bulk-requeue/`, data)

// --- Product Source Links ---

export const GET_ProductLinks = (params) =>
  atlasApi.get(`${ATLAS}/product-links/`, { params })

export const GET_ProductLink = (pk) =>
  atlasApi.get(`${ATLAS}/product-links/${pk}/`)

export const POST_ProductLink = (data) =>
  atlasApi.post(`${ATLAS}/product-links/`, data)

export const PATCH_ProductLink = (pk, data) =>
  atlasApi.patch(`${ATLAS}/product-links/${pk}/`, data)

export const DELETE_ProductLink = (pk) =>
  atlasApi.delete(`${ATLAS}/product-links/${pk}/`)

export const POST_SetPrimaryLink = (pk) =>
  atlasApi.post(`${ATLAS}/product-links/${pk}/set-primary/`)

// No dedicated unset-primary endpoint; PATCH with is_primary=false
export const POST_UnsetPrimaryLink = (pk) =>
  atlasApi.patch(`${ATLAS}/product-links/${pk}/`, { is_primary: false })

// --- Import Logs ---

export const GET_ImportLogs = (params) =>
  atlasApi.get(`${ATLAS}/import-logs/`, { params })

export const GET_ImportLog = (pk) =>
  atlasApi.get(`${ATLAS}/import-logs/${pk}/`)

// --- Integration Events ---

export const GET_IntegrationEvents = (params) =>
  atlasApi.get(`${ATLAS}/events/`, { params })

export const GET_IntegrationEvent = (pk) =>
  atlasApi.get(`${ATLAS}/events/${pk}/`)

export const POST_AcknowledgeEvent = (pk) =>
  atlasApi.post(`${ATLAS}/events/${pk}/acknowledge/`)

// --- Bulk Push ---

export const POST_BulkPush = (data) =>
  atlasApi.post(`${ATLAS}/push/`, data)

// --- Settings ---

export const GET_SupplierSettings = () =>
  atlasApi.get(`${ATLAS}/settings/`)

export const PATCH_SupplierSettings = (data) =>
  atlasApi.patch(`${ATLAS}/settings/`, data)

// --- Connectors ---

export const GET_Connectors = () =>
  atlasApi.get(`${ATLAS}/connectors/`)

// --- PIM SKU Bridge (audit log read API) ---

export const GET_BulkHasChanges = (skus) =>
  atlasApi.get(`${ATLAS}/pim-sku/has-changes/`, {
    params: { skus: Array.isArray(skus) ? skus.join(',') : skus },
  })

export const GET_SkuChanges = (sku, params = {}) =>
  atlasApi.get(`${ATLAS}/pim-sku/${encodeURIComponent(sku)}/changes/`, { params })

export const POST_AcknowledgeSku = (sku, data) =>
  atlasApi.post(`${ATLAS}/pim-sku/${encodeURIComponent(sku)}/acknowledge/`, data)

export const POST_ForceRepushSku = (sku) =>
  atlasApi.post(`${ATLAS}/pim-sku/${encodeURIComponent(sku)}/force-repush/`)

// --- Auto-primary selection: manual override + reset ---

export const POST_SetPrimarySource = (sku, data) =>
  atlasApi.post(
    `${ATLAS}/pim-sku/${encodeURIComponent(sku)}/set-primary-source/`,
    data,
  )

export const POST_ResetPrimaryToAuto = (sku, data = {}) =>
  atlasApi.post(
    `${ATLAS}/pim-sku/${encodeURIComponent(sku)}/reset-primary-to-auto/`,
    data,
  )

// --- Cross-source dashboards (auto-matched, duplicates, merge-by-ean) ---

export const GET_AutoMatched = (params = {}) =>
  atlasApi.get(`${ATLAS}/auto-matched/`, { params })

export const GET_Duplicates = (params = {}) =>
  atlasApi.get(`${ATLAS}/duplicates/`, { params })

export const POST_MergeByEan = (data) =>
  atlasApi.post(`${ATLAS}/realproducts/merge-by-ean/`, data)
