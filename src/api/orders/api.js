import { ordersApi } from './client'

const BASE = '/api/checkout/v2/admin'

export const GET_Orders = (channel, params) =>
  ordersApi.get(`${BASE}/${channel}/orders/`, { params })

export const GET_Order = (channel, uid) =>
  ordersApi.get(`${BASE}/${channel}/orders/${uid}/`)

// Puts the order's `confirmation` or `canceled` e-mail back in the send queue: 202 with the mail row.
export const POST_OrderMailResend = (channel, uid, kind) =>
  ordersApi.post(`${BASE}/${channel}/orders/${uid}/mails/${kind}/resend/`)
