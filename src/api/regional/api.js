import { regionalApi } from './client'

const REGIONAL = '/api/regional/v2/admin'

export const GET_RegionalLanguages = () => regionalApi.get(`${REGIONAL}/languages/`)
export const GET_RegionalCurrencies = () => regionalApi.get(`${REGIONAL}/currencies/`)
export const GET_RegionalCountries = () => regionalApi.get(`${REGIONAL}/countries/`)
