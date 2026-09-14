import { onBeforeUnmount, ref } from "vue";

// Desktop screens of the leads platform are laid out for >= 1024 px (plan 14).
const QUERY = "(min-width: 1024px)";

export function useIsDesktop() {
  const media = window.matchMedia?.(QUERY);
  const isDesktop = ref(media ? media.matches : true);
  const update = (event) => (isDesktop.value = event.matches);
  media?.addEventListener?.("change", update);
  onBeforeUnmount(() => media?.removeEventListener?.("change", update));
  return isDesktop;
}
