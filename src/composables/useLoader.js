import { useLoaderStore } from '@/stores/loader'

export function useLoader() {
  const store = useLoaderStore()

  return {
    loading: () => store.loading,
    handyLoading: () => store.handyLoading,
    start: () => store.loaderStart(),
    finish: () => store.loaderFinish(),
    handyStart: () => store.handyLoaderStart(),
    handyFinish: () => store.handyLoaderFinish(),
  }
}
