import { stockApi } from './client'

const QMS = '/api/qms/v2/admin'

// --- Warehouses ---
export const GET_Warehouses = (params) => stockApi.get(`${QMS}/warehouses/`, { params })
export const GET_Warehouse = (code) => stockApi.get(`${QMS}/warehouses/${code}/`)

// --- Stock ---
export const GET_WarehouseStock = (code, params) =>
  stockApi.get(`${QMS}/warehouses/${code}/stock/`, { params })
export const PATCH_WarehouseStock = (code, data) =>
  stockApi.patch(`${QMS}/warehouses/${code}/stock/edit/`, data)

// --- Products (SKU browser with has_stock annotation) ---
export const GET_WarehouseProducts = (code, params) =>
  stockApi.get(`${QMS}/warehouses/${code}/products/`, { params })

// --- Stock by SKU (product-centric, used in PIM tab) ---
export const GET_StockBySku = (sku) => stockApi.get(`${QMS}/stock-by-sku/${sku}/`)
export const PATCH_StockBySku = (sku, data) =>
  stockApi.patch(`${QMS}/stock-by-sku/${sku}/edit/`, data)

// --- CSV Import ---
export const POST_ImportCSV = (code, formData) =>
  stockApi.post(`${QMS}/warehouses/${code}/stock/import-csv/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
