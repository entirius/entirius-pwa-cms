import { ref, onBeforeUnmount } from "vue"

/**
 * Debounced search for list views.
 *
 * Usage (Options API — setup return pattern):
 *   setup() {
 *     const { search, debouncedFetch } = useSearchDebounce()
 *     return { search, debouncedFetch }
 *   }
 *   // template: <BasicInput v-model="search" @input="debouncedFetch(fetchItems)" />
 *
 * Usage (Composition API):
 *   const { search, debouncedFetch } = useSearchDebounce()
 *
 * The fetch callback receives no args — read `search.value` inside it.
 * Timer auto-cleans on component unmount.
 */
export function useSearchDebounce(delay = 300) {
  const search = ref("")
  let timer = null

  function debouncedFetch(fetchFn) {
    clearTimeout(timer)
    timer = setTimeout(fetchFn, delay)
  }

  onBeforeUnmount(() => clearTimeout(timer))

  return { search, debouncedFetch }
}
