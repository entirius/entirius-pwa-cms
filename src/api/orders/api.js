import { ordersApi } from './client'

const BASE = '/api/checkout/v2/admin'

export const GET_Orders = (channel, params) =>
  ordersApi.get(`${BASE}/${channel}/orders/`, { params })

export const GET_Order = (channel, uid) =>
  ordersApi.get(`${BASE}/${channel}/orders/${uid}/`)
