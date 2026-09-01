import { defineStore } from 'pinia'
import { ref } from 'vue'

// The Find view (atlas lookup) dies on "open a hit -> back": PimProductDetail lives
// outside the atlas route subtree, so the whole view unmounts and its data() — results,
// query, the picked photo — goes with it, forcing the operator to re-upload the picture
// to inspect a second candidate. The last search is kept here instead and Find restores
// it on mount. Deliberately tiny: one search, no history; the blob is the downscaled
// query image (the preview object-URL is recreated on restore — unmount revokes it).
export const useLookupFindStore = defineStore('lookupFind', () => {
  const saved = ref(null)

  function save(state) {
    saved.value = state
  }

  function clear() {
    saved.value = null
  }

  return { saved, save, clear }
})
