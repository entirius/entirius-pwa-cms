import { agmApi } from './client'

const AGM = '/api/agreements/v2/admin'

// --- Channels ---
export const GET_AgmChannels = (params) => agmApi.get(`${AGM}/channels/`, { params })
export const POST_SyncAgmChannels = () => agmApi.post(`${AGM}/channels/sync/`)

// --- Definitions ---
export const GET_Definitions = (params) => agmApi.get(`${AGM}/definitions/`, { params })
export const GET_Definition = (slug) => agmApi.get(`${AGM}/definitions/${slug}/`)
export const POST_Definition = (data) => agmApi.post(`${AGM}/definitions/`, data)
export const PATCH_Definition = (slug, data) => agmApi.patch(`${AGM}/definitions/${slug}/`, data)
export const DELETE_Definition = (slug) => agmApi.delete(`${AGM}/definitions/${slug}/`)

// --- Versions ---
export const GET_Versions = (slug, params) => agmApi.get(`${AGM}/definitions/${slug}/versions/`, { params })
export const POST_Version = (slug, data) => agmApi.post(`${AGM}/definitions/${slug}/versions/`, data)
export const GET_Version = (id) => agmApi.get(`${AGM}/versions/${id}/`)
export const PATCH_Version = (id, data) => agmApi.patch(`${AGM}/versions/${id}/`, data)
export const POST_PublishVersion = (id) => agmApi.post(`${AGM}/versions/${id}/publish/`)

// --- Consents ---
export const GET_Consents = (params) => agmApi.get(`${AGM}/consents/`, { params })
export const GET_ConsentHistory = (email) => agmApi.get(`${AGM}/consents/${encodeURIComponent(email)}/history/`)

// --- People ---
export const GET_People = (params) => agmApi.get(`${AGM}/people/`, { params })
export const GET_PersonDetail = (email) => agmApi.get(`${AGM}/people/${encodeURIComponent(email)}/`)

// --- Marketing Subscribers ---
export const GET_MarketingSubscribers = (params) => agmApi.get(`${AGM}/marketing-subscribers/`, { params })
export const GET_MarketingSubscribersExport = () => agmApi.get(`${AGM}/marketing-subscribers/export/`, { responseType: "blob" })

// --- Order Agreements ---
export const GET_OrderAgreements = (orderId) => agmApi.get(`${AGM}/orders/${orderId}/agreements/`)

// --- Content History ---
export const GET_ContentHistory = (slug, params) => agmApi.get(`${AGM}/definitions/${slug}/content-history/`, { params })
export const GET_ConsentText = (email, recordId) => agmApi.get(`${AGM}/people/${encodeURIComponent(email)}/consent-text/${recordId}/`)
