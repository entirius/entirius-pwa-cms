import { faqApi } from './client'

const FAQ = '/api/faq/v2/admin'

// --- Channels ---

export const GET_FaqChannels = (params) =>
  faqApi.get(`${FAQ}/channels/`, { params })

export const POST_FaqSyncChannels = () =>
  faqApi.post(`${FAQ}/channels/sync/`)

// --- Groups ---

export const GET_FaqGroups = (channel, params) =>
  faqApi.get(`${FAQ}/${channel}/groups/`, { params })

export const POST_FaqGroup = (channel, data) =>
  faqApi.post(`${FAQ}/${channel}/groups/`, data)

export const GET_FaqGroup = (channel, idx) =>
  faqApi.get(`${FAQ}/${channel}/groups/${idx}/`)

export const PATCH_FaqGroup = (channel, idx, data) =>
  faqApi.patch(`${FAQ}/${channel}/groups/${idx}/`, data)

export const DELETE_FaqGroup = (channel, idx) =>
  faqApi.delete(`${FAQ}/${channel}/groups/${idx}/`)

export const PATCH_FaqGroupsReorder = (channel, data) =>
  faqApi.patch(`${FAQ}/${channel}/groups/reorder/`, data)

// --- Group Translations ---

export const GET_FaqGroupTranslations = (channel, groupIdx) =>
  faqApi.get(`${FAQ}/${channel}/groups/${groupIdx}/translations/`)

export const POST_FaqGroupTranslation = (channel, groupIdx, data) =>
  faqApi.post(`${FAQ}/${channel}/groups/${groupIdx}/translations/`, data)

export const PATCH_FaqGroupTranslation = (channel, groupIdx, language, data) =>
  faqApi.patch(`${FAQ}/${channel}/groups/${groupIdx}/translations/${language}/`, data)

export const DELETE_FaqGroupTranslation = (channel, groupIdx, language) =>
  faqApi.delete(`${FAQ}/${channel}/groups/${groupIdx}/translations/${language}/`)

// --- Items ---

export const GET_FaqItems = (channel, params) =>
  faqApi.get(`${FAQ}/${channel}/items/`, { params })

export const POST_FaqItem = (channel, data) =>
  faqApi.post(`${FAQ}/${channel}/items/`, data)

export const GET_FaqItem = (channel, pk) =>
  faqApi.get(`${FAQ}/${channel}/items/${pk}/`)

export const PATCH_FaqItem = (channel, pk, data) =>
  faqApi.patch(`${FAQ}/${channel}/items/${pk}/`, data)

export const DELETE_FaqItem = (channel, pk) =>
  faqApi.delete(`${FAQ}/${channel}/items/${pk}/`)

export const PATCH_FaqItemsReorder = (channel, data) =>
  faqApi.patch(`${FAQ}/${channel}/items/reorder/`, data)

// --- Item Translations ---

export const GET_FaqItemTranslations = (channel, itemPk) =>
  faqApi.get(`${FAQ}/${channel}/items/${itemPk}/translations/`)

export const POST_FaqItemTranslation = (channel, itemPk, data) =>
  faqApi.post(`${FAQ}/${channel}/items/${itemPk}/translations/`, data)

export const PATCH_FaqItemTranslation = (channel, itemPk, language, data) =>
  faqApi.patch(`${FAQ}/${channel}/items/${itemPk}/translations/${language}/`, data)

export const DELETE_FaqItemTranslation = (channel, itemPk, language) =>
  faqApi.delete(`${FAQ}/${channel}/items/${itemPk}/translations/${language}/`)

// --- Discovery ---

export const GET_FaqDiscover = (channel, params) =>
  faqApi.get(`${FAQ}/${channel}/discover/`, { params })
