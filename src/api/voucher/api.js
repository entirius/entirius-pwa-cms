import { voucherApi } from "./client";

const BASE = "/api/checkout-voucher/v2/admin";

// Form metadata (enum choices + state-action descriptors) — drives data-driven forms
export const GET_VoucherMeta = (channel) =>
  voucherApi.get(`${BASE}/${channel}/voucher-meta/`);

// Channel config (per-channel voucher settings)
export const GET_ChannelConfig = (channel) =>
  voucherApi.get(`${BASE}/${channel}/channel/`);

export const PATCH_ChannelConfig = (channel, data) =>
  voucherApi.patch(`${BASE}/${channel}/channel/`, data);

// Vouchers
export const GET_Vouchers = (channel, params) =>
  voucherApi.get(`${BASE}/${channel}/vouchers/`, { params });

export const GET_Voucher = (channel, pk) =>
  voucherApi.get(`${BASE}/${channel}/vouchers/${pk}/`);

export const PATCH_Voucher = (channel, pk, data) =>
  voucherApi.patch(`${BASE}/${channel}/vouchers/${pk}/`, data);

// Admin lookup by plaintext code (HMAC) — no brute-force oracle
export const POST_VoucherLookup = (channel, code) =>
  voucherApi.post(`${BASE}/${channel}/vouchers/lookup/`, { code });

// Audited code reveal (logs CODE_REVEALED)
export const POST_VoucherReveal = (channel, pk) =>
  voucherApi.post(`${BASE}/${channel}/vouchers/${pk}/reveal/`);

// State actions: block|unblock|cancel|extend|adjust-balance|reset-failed-attempts|resend-email|approve|reject
export const POST_VoucherAction = (channel, pk, action, data) =>
  voucherApi.post(`${BASE}/${channel}/vouchers/${pk}/${action}/`, data || {});

export const GET_VoucherEvents = (channel, pk, params) =>
  voucherApi.get(`${BASE}/${channel}/vouchers/${pk}/events/`, { params });

export const GET_VoucherRedemptions = (channel, pk, params) =>
  voucherApi.get(`${BASE}/${channel}/vouchers/${pk}/redemptions/`, { params });

// Campaigns
export const GET_Campaigns = (channel, params) =>
  voucherApi.get(`${BASE}/${channel}/campaigns/`, { params });

export const POST_Campaign = (channel, data) =>
  voucherApi.post(`${BASE}/${channel}/campaigns/`, data);

export const GET_Campaign = (channel, idx) =>
  voucherApi.get(`${BASE}/${channel}/campaigns/${idx}/`);

export const PATCH_Campaign = (channel, idx, data) =>
  voucherApi.patch(`${BASE}/${channel}/campaigns/${idx}/`, data);

export const DELETE_Campaign = (channel, idx) =>
  voucherApi.delete(`${BASE}/${channel}/campaigns/${idx}/`);

// ADMIN_ISSUE — mint a voucher inside an ADMIN_ISSUED campaign
export const POST_AdminIssue = (channel, campaignIdx, data) =>
  voucherApi.post(
    `${BASE}/${channel}/campaigns/${campaignIdx}/vouchers/`,
    data
  );

// Product vouchers (sellable templates)
export const GET_ProductVouchers = (channel, params) =>
  voucherApi.get(`${BASE}/${channel}/product-vouchers/`, { params });

export const POST_ProductVoucher = (channel, data) =>
  voucherApi.post(`${BASE}/${channel}/product-vouchers/`, data);

export const GET_ProductVoucher = (channel, pk) =>
  voucherApi.get(`${BASE}/${channel}/product-vouchers/${pk}/`);

export const PATCH_ProductVoucher = (channel, pk, data) =>
  voucherApi.patch(`${BASE}/${channel}/product-vouchers/${pk}/`, data);

export const DELETE_ProductVoucher = (channel, pk) =>
  voucherApi.delete(`${BASE}/${channel}/product-vouchers/${pk}/`);

// Product-voucher filters (nested INCLUSION/EXCLUSION)
export const GET_VoucherProductFilters = (channel, pvPk) =>
  voucherApi.get(`${BASE}/${channel}/product-vouchers/${pvPk}/filters/`);

export const POST_VoucherProductFilter = (channel, pvPk, data) =>
  voucherApi.post(`${BASE}/${channel}/product-vouchers/${pvPk}/filters/`, data);

export const PATCH_VoucherProductFilter = (channel, pvPk, filterId, data) =>
  voucherApi.patch(
    `${BASE}/${channel}/product-vouchers/${pvPk}/filters/${filterId}/`,
    data
  );

export const DELETE_VoucherProductFilter = (channel, pvPk, filterId) =>
  voucherApi.delete(
    `${BASE}/${channel}/product-vouchers/${pvPk}/filters/${filterId}/`
  );
