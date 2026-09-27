import { useMediaQuery } from "@/composables/useMediaQuery";

// Desktop screens of the leads platform are laid out for >= 1024 px (plan 14).
export function useIsDesktop() {
  return useMediaQuery("(min-width: 1024px)", true);
}
