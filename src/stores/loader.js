import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useLoaderStore = defineStore('loader', () => {
  const loading = ref(false)
  const handyLoading = ref(false)
  let loaderTimeout = null
  let handyTimeout = null

  function loaderStart() {
    loading.value = true
    clearTimeout(loaderTimeout)
    loaderTimeout = setTimeout(() => { loading.value = false }, 10000)
  }

  function loaderFinish() {
    loading.value = false
    clearTimeout(loaderTimeout)
  }

  function handyLoaderStart() {
    handyLoading.value = true
    clearTimeout(handyTimeout)
    handyTimeout = setTimeout(() => { handyLoading.value = false }, 10000)
  }

  function handyLoaderFinish() {
    handyLoading.value = false
    clearTimeout(handyTimeout)
  }

  return { loading, handyLoading, loaderStart, loaderFinish, handyLoaderStart, handyLoaderFinish }
})
