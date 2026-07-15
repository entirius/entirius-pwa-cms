import { dpApi } from './client'

const DP = '/api/deliverypoints/v2/admin'

// --- Types ---

export const GET_Types = (params) =>
  dpApi.get(`${DP}/types/`, { params })

export const GET_Type = (pk) =>
  dpApi.get(`${DP}/types/${pk}/`)

export const POST_Type = (data) =>
  dpApi.post(`${DP}/types/`, data)

export const PATCH_Type = (pk, data) =>
  dpApi.patch(`${DP}/types/${pk}/`, data)

export const DELETE_Type = (pk) =>
  dpApi.delete(`${DP}/types/${pk}/`)

// --- Points ---

export const GET_Points = (params) =>
  dpApi.get(`${DP}/points/`, { params })

export const GET_PointsChannel = (channelIdx, params) =>
  dpApi.get(`${DP}/${channelIdx}/points/`, { params })

export const GET_Point = (pk) =>
  dpApi.get(`${DP}/points/${pk}/`)

export const POST_Point = (data) =>
  dpApi.post(`${DP}/points/`, data)

export const PATCH_Point = (pk, data) =>
  dpApi.patch(`${DP}/points/${pk}/`, data)

export const DELETE_Point = (pk) =>
  dpApi.delete(`${DP}/points/${pk}/`)

// --- Channels ---

export const GET_DPChannels = (params) =>
  dpApi.get(`${DP}/channels/`, { params })

// --- Countries ---

export const GET_Countries = () =>
  dpApi.get(`${DP}/countries/`)

// --- Translations ---

export const GET_PointT9N = (pointPk) =>
  dpApi.get(`${DP}/points/${pointPk}/translations/`)

export const POST_PointT9N = (pointPk, data) =>
  dpApi.post(`${DP}/points/${pointPk}/translations/`, data)

export const PATCH_PointT9N = (pointPk, language, data) =>
  dpApi.patch(`${DP}/points/${pointPk}/translations/${language}/`, data)

export const DELETE_PointT9N = (pointPk, language) =>
  dpApi.delete(`${DP}/points/${pointPk}/translations/${language}/`)

// --- Import ---

export const POST_Import = (formData) =>
  dpApi.post(`${DP}/import/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

// --- Geocode ---

export const POST_GeocodeSearch = (data) =>
  dpApi.post(`${DP}/geocode/search/`, data)
