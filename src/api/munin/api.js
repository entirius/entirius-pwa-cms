import { muninApi } from './client'

export const GET_Modules = () => muninApi.get('/api/munin/v2/')
