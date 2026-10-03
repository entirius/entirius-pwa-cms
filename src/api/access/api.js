import { accessApi } from './client'

// django-access: who the logged-in user is and what they may do (`{ user, gate_mode, manages_access, roles,
// permissions: { "<area>": "read" | "write" } }`).
export const GET_Me = () => accessApi.get('/api/access/v2/me/')

// Admin API (`access.manage`): the area catalogue (`{ modules: [{ module, areas }], roles, scopes }`) and roles.
const ADMIN = '/api/access/v2/admin'

export const GET_AccessCatalogue = () => accessApi.get(`${ADMIN}/catalogue/`)
export const GET_AccessRoles = (params = {}) => accessApi.get(`${ADMIN}/roles/`, { params })
export const GET_AccessRole = (id) => accessApi.get(`${ADMIN}/roles/${id}/`)
export const POST_AccessRole = (payload) => accessApi.post(`${ADMIN}/roles/`, payload)
export const PATCH_AccessRole = (id, payload) => accessApi.patch(`${ADMIN}/roles/${id}/`, payload)
export const DELETE_AccessRole = (id) => accessApi.delete(`${ADMIN}/roles/${id}/`)
