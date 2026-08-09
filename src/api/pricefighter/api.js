import { pricefighterApi } from './client'

const PF = '/api/pricefighter/v2/admin'

// Channels
export const GET_PfChannels = () => pricefighterApi.get(`${PF}/channels/`)
export const POST_PfSyncChannels = () => pricefighterApi.post(`${PF}/channels/sync/`)

// Decision view (read)
export const GET_PfDecisions = (params) => pricefighterApi.get(`${PF}/decisions/`, { params })
export const GET_PfDecisionDetail = (sku, params) =>
  pricefighterApi.get(`${PF}/decisions/${encodeURIComponent(sku)}/`, { params })
export const GET_PfBounds = (params) => pricefighterApi.get(`${PF}/bounds/`, { params })
export const GET_PfHistory = (params) => pricefighterApi.get(`${PF}/history/`, { params })

// Apply (write)
export const POST_PfApply = (data) => pricefighterApi.post(`${PF}/apply/`, data)

// Pricing rules (write)
export const GET_PfRules = (params) => pricefighterApi.get(`${PF}/rules/`, { params })
export const GET_PfRule = (id) => pricefighterApi.get(`${PF}/rules/${id}/`)
export const POST_PfRule = (data) => pricefighterApi.post(`${PF}/rules/`, data)
export const PATCH_PfRule = (id, data) => pricefighterApi.patch(`${PF}/rules/${id}/`, data)
export const DELETE_PfRule = (id) => pricefighterApi.delete(`${PF}/rules/${id}/`)
