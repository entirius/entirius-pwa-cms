import { cfApi } from './client'

const CF = '/api/contact-forms/v2/admin'

// --- Submissions ---

export const GET_Submissions = (params) =>
  cfApi.get(`${CF}/submissions/`, { params })

export const GET_Submission = (pk) =>
  cfApi.get(`${CF}/submissions/${pk}/`)

export const PATCH_SubmissionStatus = (pk, data) =>
  cfApi.patch(`${CF}/submissions/${pk}/`, data)

export const GET_AttachmentDownload = (pk, attachmentId) =>
  cfApi.get(`${CF}/submissions/${pk}/attachments/${attachmentId}/download/`, {
    responseType: 'blob',
  })

// --- Form types (read-only; source for the type filter) ---

export const GET_FormTypes = (channelIdx) =>
  cfApi.get(`${CF}/form-types/`, { params: { channel_idx: channelIdx } })

// --- Notification Config (CRUD) ---

export const GET_NotificationConfigs = (params) =>
  cfApi.get(`${CF}/notifications/`, { params })

export const GET_NotificationConfig = (pk) =>
  cfApi.get(`${CF}/notifications/${pk}/`)

export const POST_NotificationConfig = (data) =>
  cfApi.post(`${CF}/notifications/`, data)

export const PATCH_NotificationConfig = (pk, data) =>
  cfApi.patch(`${CF}/notifications/${pk}/`, data)

export const DELETE_NotificationConfig = (pk) =>
  cfApi.delete(`${CF}/notifications/${pk}/`)

// --- Bookings (read-only) ---

export const GET_Bookings = (params) =>
  cfApi.get(`${CF}/bookings/`, { params })

export const GET_Booking = (pk) =>
  cfApi.get(`${CF}/bookings/${pk}/`)

// --- Leads ---

export const GET_Leads = (params) =>
  cfApi.get(`${CF}/leads/`, { params })

export const GET_Lead = (pk) =>
  cfApi.get(`${CF}/leads/${pk}/`)

export const GET_LeadsSummary = (params) =>
  cfApi.get(`${CF}/leads/summary/`, { params })

export const PATCH_Lead = (pk, data) =>
  cfApi.patch(`${CF}/leads/${pk}/`, data)

export const POST_LeadTransition = (pk, data) =>
  cfApi.post(`${CF}/leads/${pk}/transition/`, data)

// --- Channel integrations (google_ads + bookings flags) ---

export const GET_ChannelIntegrations = (channelIdx) =>
  cfApi.get(`${CF}/channels/${channelIdx}/integrations/`)
