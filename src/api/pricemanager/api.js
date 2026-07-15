import { pricemanagerApi } from './client'

const PM = '/api/pricemanager/v2/admin'

// Channels
export const GET_PmChannels = () => pricemanagerApi.get(`${PM}/channels/`)
export const GET_PmChannel = (idx) => pricemanagerApi.get(`${PM}/channels/${idx}/`)
export const POST_PmChannel = (data) => pricemanagerApi.post(`${PM}/channels/`, data)
export const PATCH_PmChannel = (idx, data) => pricemanagerApi.patch(`${PM}/channels/${idx}/`, data)
export const DELETE_PmChannel = (idx) => pricemanagerApi.delete(`${PM}/channels/${idx}/`)
export const POST_PmSyncChannels = () => pricemanagerApi.post(`${PM}/channels/sync/`)

// Tax Classes
export const GET_PmTaxClasses = () => pricemanagerApi.get(`${PM}/tax-classes/`)
export const GET_PmTaxClass = (idx) => pricemanagerApi.get(`${PM}/tax-classes/${idx}/`)
export const POST_PmTaxClass = (data) => pricemanagerApi.post(`${PM}/tax-classes/`, data)
export const PATCH_PmTaxClass = (idx, data) => pricemanagerApi.patch(`${PM}/tax-classes/${idx}/`, data)
export const DELETE_PmTaxClass = (idx) => pricemanagerApi.delete(`${PM}/tax-classes/${idx}/`)
export const POST_PmTaxRate = (idx, data) => pricemanagerApi.post(`${PM}/tax-classes/${idx}/rates/`, data)
export const PATCH_PmTaxRate = (idx, iso2, data) => pricemanagerApi.patch(`${PM}/tax-classes/${idx}/rates/${iso2}/`, data)
export const DELETE_PmTaxRate = (idx, iso2) => pricemanagerApi.delete(`${PM}/tax-classes/${idx}/rates/${iso2}/`)

// Prices (channel-scoped)
export const GET_PmPrices = (ch, params) => pricemanagerApi.get(`${PM}/${ch}/prices/`, { params })
export const GET_PmPriceDetail = (ch, sku) => pricemanagerApi.get(`${PM}/${ch}/prices/${sku}/`)
export const POST_PmPreview = (ch, sku, data) => pricemanagerApi.post(`${PM}/${ch}/prices/${sku}/preview/`, data)
export const PATCH_PmPrice = (ch, sku, data) => pricemanagerApi.patch(`${PM}/${ch}/prices/${sku}/`, data)
export const DELETE_PmPrice = (ch, sku, currency) => pricemanagerApi.delete(`${PM}/${ch}/prices/${sku}/`, { params: currency ? { currency } : {} })
export const POST_PmFlushSpecial = (ch, sku, currency) => pricemanagerApi.post(`${PM}/${ch}/prices/${sku}/flush-special/`, null, { params: currency ? { currency } : {} })
export const PATCH_PmBulkPrices = (ch, data) => pricemanagerApi.patch(`${PM}/${ch}/prices/bulk/`, data)
export const GET_PmPriceHistory = (ch, sku, params) => pricemanagerApi.get(`${PM}/${ch}/prices/${sku}/history/`, { params })
export const GET_PmPriceProducts = (ch, params) => pricemanagerApi.get(`${PM}/${ch}/prices/products/`, { params })
