import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { GET_RegionalLanguages, GET_RegionalCurrencies, GET_RegionalCountries } from '@/api/regional/api'

/**
 * Reference data from django-regional. Cached for the session — admins rarely add
 * new languages/currencies/countries mid-session; if they do, reload the panel.
 */
export const useRegionalStore = defineStore('regional', () => {
  const languages = ref([])
  const currencies = ref([])
  const countries = ref([])
  const loading = ref(false)
  const fetched = ref(false)

  const languageOptions = computed(() =>
    languages.value.map(l => ({ value: l.id, label: `${l.name_pl} (${l.iso2.toUpperCase()})` }))
  )

  const currencyOptions = computed(() =>
    currencies.value.map(c => ({ value: c.id, label: `${c.iso3} — ${c.symbol || c.name_pl}` }))
  )

  const countryOptions = computed(() =>
    countries.value.map(c => ({ value: c.id, label: `${c.name_pl} (${c.iso2})` }))
  )

  function languageById(id) {
    return languages.value.find(l => l.id === id) || null
  }
  function currencyById(id) {
    return currencies.value.find(c => c.id === id) || null
  }
  function countryById(id) {
    return countries.value.find(c => c.id === id) || null
  }

  async function fetchAll() {
    if (fetched.value) return
    loading.value = true
    try {
      const [langRes, currRes, countryRes] = await Promise.all([
        GET_RegionalLanguages(),
        GET_RegionalCurrencies(),
        GET_RegionalCountries(),
      ])
      languages.value = langRes.data?.results || []
      currencies.value = currRes.data?.results || []
      countries.value = countryRes.data?.results || []
      fetched.value = true
    } catch (err) {
      console.error('Failed to fetch regional reference data:', err)
    } finally {
      loading.value = false
    }
  }

  return {
    languages,
    currencies,
    countries,
    loading,
    fetched,
    languageOptions,
    currencyOptions,
    countryOptions,
    languageById,
    currencyById,
    countryById,
    fetchAll,
  }
})
