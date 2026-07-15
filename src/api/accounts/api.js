import { accountsApi } from './client'

const ACC = '/api/accounts/v2/admin'

export const GET_Customers = (params) =>
  accountsApi.get(`${ACC}/customers/`, { params })

export const GET_Customer = (uid) =>
  accountsApi.get(`${ACC}/customers/${uid}/`)

export const GET_AccountsGroups = (params) =>
  accountsApi.get(`${ACC}/groups/`, { params })

export const GET_AccountsChannels = (params) =>
  accountsApi.get(`${ACC}/channels/`, { params })
