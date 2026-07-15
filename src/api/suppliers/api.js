import { suppliersApi } from './client'

const SUP = '/api/suppliers/v2/admin'

// --- Suppliers ---

export const GET_Suppliers = (params) =>
  suppliersApi.get(`${SUP}/suppliers/`, { params })

export const GET_Supplier = (idx) =>
  suppliersApi.get(`${SUP}/suppliers/${idx}/`)

export const POST_Supplier = (data) =>
  suppliersApi.post(`${SUP}/suppliers/`, data)

export const PATCH_Supplier = (idx, data) =>
  suppliersApi.patch(`${SUP}/suppliers/${idx}/`, data)

export const DELETE_Supplier = (idx, { force = false } = {}) =>
  suppliersApi.delete(`${SUP}/suppliers/${idx}/`, {
    params: force ? { force: true } : undefined,
  })

export const GET_SupplierDeleteImpact = (idx) =>
  suppliersApi.get(`${SUP}/suppliers/${idx}/delete-impact/`)

export const GET_DataKeys = (idx, params) =>
  suppliersApi.get(`${SUP}/suppliers/${idx}/data-keys/`, { params })

// etap-02: distinct supplier values for source_value picker in CategoryMapping rows
export const GET_DataValues = (idx, params) =>
  suppliersApi.get(`${SUP}/suppliers/${idx}/data-values/`, { params })

// --- Feeds (nested under supplier) ---

export const GET_Feeds = (supplierIdx, params) =>
  suppliersApi.get(`${SUP}/suppliers/${supplierIdx}/feeds/`, { params })

export const GET_Feed = (supplierIdx, idx) =>
  suppliersApi.get(`${SUP}/suppliers/${supplierIdx}/feeds/${idx}/`)

export const POST_Feed = (supplierIdx, data) =>
  suppliersApi.post(`${SUP}/suppliers/${supplierIdx}/feeds/`, data)

export const PATCH_Feed = (supplierIdx, idx, data) =>
  suppliersApi.patch(`${SUP}/suppliers/${supplierIdx}/feeds/${idx}/`, data)

export const DELETE_Feed = (supplierIdx, idx) =>
  suppliersApi.delete(`${SUP}/suppliers/${supplierIdx}/feeds/${idx}/`)

export const POST_FeedTrigger = (supplierIdx, idx, data = {}) =>
  suppliersApi.post(`${SUP}/suppliers/${supplierIdx}/feeds/${idx}/trigger/`, data)

export const POST_FeedTest = (supplierIdx, idx, data = {}) =>
  suppliersApi.post(`${SUP}/suppliers/${supplierIdx}/feeds/${idx}/test/`, data)

// --- Mapping Profiles (nested under supplier) ---

export const GET_MappingProfiles = (supplierIdx, params) =>
  suppliersApi.get(`${SUP}/suppliers/${supplierIdx}/mapping-profiles/`, { params })

export const GET_MappingProfile = (supplierIdx, idx) =>
  suppliersApi.get(`${SUP}/suppliers/${supplierIdx}/mapping-profiles/${idx}/`)

export const POST_MappingProfile = (supplierIdx, data) =>
  suppliersApi.post(`${SUP}/suppliers/${supplierIdx}/mapping-profiles/`, data)

export const PATCH_MappingProfile = (supplierIdx, idx, data) =>
  suppliersApi.patch(`${SUP}/suppliers/${supplierIdx}/mapping-profiles/${idx}/`, data)

export const DELETE_MappingProfile = (supplierIdx, idx) =>
  suppliersApi.delete(`${SUP}/suppliers/${supplierIdx}/mapping-profiles/${idx}/`)

export const POST_ValidateProfile = (supplierIdx, idx) =>
  suppliersApi.post(`${SUP}/suppliers/${supplierIdx}/mapping-profiles/${idx}/validate/`)

// --- Attribute Mappings (nested under profile pk) ---

export const GET_AttributeMappings = (profilePk, params) =>
  suppliersApi.get(`${SUP}/mapping-profiles/${profilePk}/attribute-mappings/`, { params })

export const POST_AttributeMapping = (profilePk, data) =>
  suppliersApi.post(`${SUP}/mapping-profiles/${profilePk}/attribute-mappings/`, data)

export const PATCH_AttributeMapping = (profilePk, pk, data) =>
  suppliersApi.patch(`${SUP}/mapping-profiles/${profilePk}/attribute-mappings/${pk}/`, data)

export const DELETE_AttributeMapping = (profilePk, pk) =>
  suppliersApi.delete(`${SUP}/mapping-profiles/${profilePk}/attribute-mappings/${pk}/`)

// --- Category Mappings (nested under profile pk) ---

export const GET_CategoryMappings = (profilePk, params) =>
  suppliersApi.get(`${SUP}/mapping-profiles/${profilePk}/category-mappings/`, { params })

export const POST_CategoryMapping = (profilePk, data) =>
  suppliersApi.post(`${SUP}/mapping-profiles/${profilePk}/category-mappings/`, data)

export const PATCH_CategoryMapping = (profilePk, pk, data) =>
  suppliersApi.patch(`${SUP}/mapping-profiles/${profilePk}/category-mappings/${pk}/`, data)

export const DELETE_CategoryMapping = (profilePk, pk) =>
  suppliersApi.delete(`${SUP}/mapping-profiles/${profilePk}/category-mappings/${pk}/`)

// --- Supplier Products ---

export const GET_SupplierProducts = (params) =>
  suppliersApi.get(`${SUP}/products/`, { params })

export const GET_SupplierProduct = (pk) =>
  suppliersApi.get(`${SUP}/products/${pk}/`)

export const PATCH_SupplierProduct = (pk, data) =>
  suppliersApi.patch(`${SUP}/products/${pk}/`, data)

export const POST_ApproveProduct = (pk) =>
  suppliersApi.post(`${SUP}/products/${pk}/approve/`)

export const POST_RejectProduct = (pk) =>
  suppliersApi.post(`${SUP}/products/${pk}/reject/`)

export const POST_SkipProduct = (pk) =>
  suppliersApi.post(`${SUP}/products/${pk}/skip/`)

export const POST_QueueProduct = (pk) =>
  suppliersApi.post(`${SUP}/products/${pk}/queue/`)

export const POST_PushProduct = (pk) =>
  suppliersApi.post(`${SUP}/products/${pk}/push/`)

export const POST_ForceRepushProduct = (pk) =>
  suppliersApi.post(`${SUP}/products/${pk}/force-repush/`)

export const POST_BulkApproveProducts = (data) =>
  suppliersApi.post(`${SUP}/products/bulk-approve/`, data)

export const POST_BulkRejectProducts = (data) =>
  suppliersApi.post(`${SUP}/products/bulk-reject/`, data)

export const POST_BulkRequeueProducts = (data) =>
  suppliersApi.post(`${SUP}/products/bulk-requeue/`, data)

// --- Product Supplier Links ---

export const GET_ProductLinks = (params) =>
  suppliersApi.get(`${SUP}/product-links/`, { params })

export const GET_ProductLink = (pk) =>
  suppliersApi.get(`${SUP}/product-links/${pk}/`)

export const POST_ProductLink = (data) =>
  suppliersApi.post(`${SUP}/product-links/`, data)

export const PATCH_ProductLink = (pk, data) =>
  suppliersApi.patch(`${SUP}/product-links/${pk}/`, data)

export const DELETE_ProductLink = (pk) =>
  suppliersApi.delete(`${SUP}/product-links/${pk}/`)

export const POST_SetPreferredLink = (pk) =>
  suppliersApi.post(`${SUP}/product-links/${pk}/set-preferred/`)

// Stage 6 finding: no dedicated unset_preferred endpoint; use PATCH with is_preferred=false
export const POST_UnsetPreferredLink = (pk) =>
  suppliersApi.patch(`${SUP}/product-links/${pk}/`, { is_preferred: false })

// --- Import Logs ---

export const GET_ImportLogs = (params) =>
  suppliersApi.get(`${SUP}/import-logs/`, { params })

export const GET_ImportLog = (pk) =>
  suppliersApi.get(`${SUP}/import-logs/${pk}/`)

// --- Integration Events ---

export const GET_IntegrationEvents = (params) =>
  suppliersApi.get(`${SUP}/events/`, { params })

export const GET_IntegrationEvent = (pk) =>
  suppliersApi.get(`${SUP}/events/${pk}/`)

export const POST_AcknowledgeEvent = (pk) =>
  suppliersApi.post(`${SUP}/events/${pk}/acknowledge/`)

// --- Bulk Push ---

export const POST_BulkPush = (data) =>
  suppliersApi.post(`${SUP}/push/`, data)

// --- Settings ---

export const GET_SupplierSettings = () =>
  suppliersApi.get(`${SUP}/settings/`)

export const PATCH_SupplierSettings = (data) =>
  suppliersApi.patch(`${SUP}/settings/`, data)

// --- Connectors ---

export const GET_Connectors = () =>
  suppliersApi.get(`${SUP}/connectors/`)

// --- etap-05: PIM SKU Bridge (audit log read API) ---

export const GET_BulkHasChanges = (skus) =>
  suppliersApi.get(`${SUP}/pim-sku/has-changes/`, {
    params: { skus: Array.isArray(skus) ? skus.join(',') : skus },
  })

export const GET_SkuChanges = (sku, params = {}) =>
  suppliersApi.get(`${SUP}/pim-sku/${encodeURIComponent(sku)}/changes/`, { params })

export const POST_AcknowledgeSku = (sku, data) =>
  suppliersApi.post(`${SUP}/pim-sku/${encodeURIComponent(sku)}/acknowledge/`, data)

export const POST_ForceRepushSku = (sku) =>
  suppliersApi.post(`${SUP}/pim-sku/${encodeURIComponent(sku)}/force-repush/`)

// --- etap-13b: auto-preferred selection manual override + reset ---

export const POST_SetPreferredSupplier = (sku, data) =>
  suppliersApi.post(
    `${SUP}/pim-sku/${encodeURIComponent(sku)}/set-preferred-supplier/`,
    data,
  )

export const POST_ResetPreferredToAuto = (sku, data = {}) =>
  suppliersApi.post(
    `${SUP}/pim-sku/${encodeURIComponent(sku)}/reset-preferred-to-auto/`,
    data,
  )

// --- etap-07b: cross-supplier dashboards (auto-matched, duplicates, merge-by-ean) ---

export const GET_AutoMatched = (params = {}) =>
  suppliersApi.get(`${SUP}/auto-matched/`, { params })

export const GET_Duplicates = (params = {}) =>
  suppliersApi.get(`${SUP}/duplicates/`, { params })

export const POST_MergeByEan = (data) =>
  suppliersApi.post(`${SUP}/realproducts/merge-by-ean/`, data)
