import { stockAlertsApi } from './client'

// django-stock-alerts admin API, scoped to the CMS channel. The export is a CSV blob of the current filter.
const BASE = `/api/stock-alerts/v2/admin/${process.env.VUE_APP_CHANNEL}`

export const GET_StockAlertsDemand = (params) => stockAlertsApi.get(`${BASE}/demand/`, { params })

export const GET_StockAlertsSubscriptions = (params) => stockAlertsApi.get(`${BASE}/subscriptions/`, { params })

export const GET_StockAlertsExport = (params) =>
  stockAlertsApi.get(`${BASE}/subscriptions/export/`, { params, responseType: 'blob' })

export const POST_StockAlertsCancel = (id) => stockAlertsApi.post(`${BASE}/subscriptions/${id}/cancel/`)
