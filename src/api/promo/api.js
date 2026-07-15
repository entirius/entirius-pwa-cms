import { promoApi } from './client'

const BASE = '/api/checkout/v2/admin'

// Discount meta (modifiers + targets)
export const GET_DiscountMeta = (channel) =>
  promoApi.get(`${BASE}/${channel}/discount-meta/`)

// Discount rules
export const GET_DiscountRules = (channel, params) =>
  promoApi.get(`${BASE}/${channel}/discount-rules/`, { params })

export const POST_DiscountRule = (channel, data) =>
  promoApi.post(`${BASE}/${channel}/discount-rules/`, data)

export const GET_DiscountRule = (channel, ruleId) =>
  promoApi.get(`${BASE}/${channel}/discount-rules/${ruleId}/`)

export const PATCH_DiscountRule = (channel, ruleId, data) =>
  promoApi.patch(`${BASE}/${channel}/discount-rules/${ruleId}/`, data)

export const DELETE_DiscountRule = (channel, ruleId) =>
  promoApi.delete(`${BASE}/${channel}/discount-rules/${ruleId}/`)

// Discount codes (sub-resource of a rule)
export const GET_DiscountCodes = (channel, ruleId, params) =>
  promoApi.get(`${BASE}/${channel}/discount-rules/${ruleId}/codes/`, { params })

export const POST_DiscountCode = (channel, ruleId, data) =>
  promoApi.post(`${BASE}/${channel}/discount-rules/${ruleId}/codes/`, data)

export const PATCH_DiscountCode = (channel, ruleId, codeId, data) =>
  promoApi.patch(`${BASE}/${channel}/discount-rules/${ruleId}/codes/${codeId}/`, data)

export const DELETE_DiscountCode = (channel, ruleId, codeId) =>
  promoApi.delete(`${BASE}/${channel}/discount-rules/${ruleId}/codes/${codeId}/`)

// Product filters
export const GET_ProductFilters = (channel, ruleId) =>
  promoApi.get(`${BASE}/${channel}/discount-rules/${ruleId}/product-filters/`)

export const POST_ProductFilter = (channel, ruleId, data) =>
  promoApi.post(`${BASE}/${channel}/discount-rules/${ruleId}/product-filters/`, data)

export const PATCH_ProductFilter = (channel, ruleId, filterId, data) =>
  promoApi.patch(`${BASE}/${channel}/discount-rules/${ruleId}/product-filters/${filterId}/`, data)

export const DELETE_ProductFilter = (channel, ruleId, filterId) =>
  promoApi.delete(`${BASE}/${channel}/discount-rules/${ruleId}/product-filters/${filterId}/`)

// Threshold filters
export const GET_ThresholdFilters = (channel, ruleId) =>
  promoApi.get(`${BASE}/${channel}/discount-rules/${ruleId}/threshold-filters/`)

export const POST_ThresholdFilter = (channel, ruleId, data) =>
  promoApi.post(`${BASE}/${channel}/discount-rules/${ruleId}/threshold-filters/`, data)

export const PATCH_ThresholdFilter = (channel, ruleId, filterId, data) =>
  promoApi.patch(`${BASE}/${channel}/discount-rules/${ruleId}/threshold-filters/${filterId}/`, data)

export const DELETE_ThresholdFilter = (channel, ruleId, filterId) =>
  promoApi.delete(`${BASE}/${channel}/discount-rules/${ruleId}/threshold-filters/${filterId}/`)

// Bulk operations on discount rules
export const POST_BulkRules = (channel, data) =>
  promoApi.post(`${BASE}/${channel}/discount-rules/bulk/`, data)

// Customer filters
export const GET_CustomerFilters = (channel, ruleId) =>
  promoApi.get(`${BASE}/${channel}/discount-rules/${ruleId}/customer-filters/`)

// Currencies
export const GET_Currencies = (channel) =>
  promoApi.get(`${BASE}/${channel}/currencies/`)

// Channels (for the rule's channels multi-select)
export const GET_Channels = (channel) =>
  promoApi.get(`${BASE}/${channel}/channels/`)

// Shipping methods (for free_shipping_methods multi-select)
export const GET_ShippingMethods = (channel) =>
  promoApi.get(`${BASE}/${channel}/shipping-methods/`)

export const POST_CustomerFilter = (channel, ruleId, data) =>
  promoApi.post(`${BASE}/${channel}/discount-rules/${ruleId}/customer-filters/`, data)

export const PATCH_CustomerFilter = (channel, ruleId, filterId, data) =>
  promoApi.patch(`${BASE}/${channel}/discount-rules/${ruleId}/customer-filters/${filterId}/`, data)

export const DELETE_CustomerFilter = (channel, ruleId, filterId) =>
  promoApi.delete(`${BASE}/${channel}/discount-rules/${ruleId}/customer-filters/${filterId}/`)
