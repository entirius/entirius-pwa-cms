import { emailApi } from './client'

const channel = process.env.VUE_APP_CHANNEL || 'default-europe'
const BASE = `/api/email/v2/admin/${channel}`

// --- Channels ---

export const GET_EmailChannels = (params) =>
  emailApi.get(`${BASE}/channels/`, { params })

export const GET_EmailChannel = (pk) =>
  emailApi.get(`${BASE}/channels/${pk}/`)

export const PATCH_EmailChannel = (pk, data) =>
  emailApi.patch(`${BASE}/channels/${pk}/`, data)

// --- Language Configs ---

export const GET_EmailLangConfigs = (channelPk) =>
  emailApi.get(`${BASE}/channels/${channelPk}/lang-configs/`)

export const GET_EmailLangConfig = (pk) =>
  emailApi.get(`${BASE}/lang-configs/${pk}/`)

export const PATCH_EmailLangConfig = (pk, data) =>
  emailApi.patch(`${BASE}/lang-configs/${pk}/`, data)

// --- Templates ---

export const GET_EmailTemplates = (emailType, params) =>
  emailApi.get(`${BASE}/templates/${emailType}/`, { params })

export const GET_EmailTemplate = (emailType, pk) =>
  emailApi.get(`${BASE}/templates/${emailType}/${pk}/`)

export const PATCH_EmailTemplate = (emailType, pk, data) =>
  emailApi.patch(`${BASE}/templates/${emailType}/${pk}/`, data)
