import { accessApi } from './client'

// django-access: who the logged-in user is and what they may do (`{ user, gate_mode, manages_access, roles,
// permissions: { "<area>": "read" | "write" } }`).
export const GET_Me = () => accessApi.get('/api/access/v2/me/')
