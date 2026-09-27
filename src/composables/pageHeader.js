import { computed, inject, onBeforeUnmount, onMounted } from "vue";

// The shell's page-header slot (R2): the shell provides `{ claim, release, crumbs? }` under PAGE_HEADER_CLAIM and hides
// its fallback header while a PageHeader holds a claim. Claims can overlap during a route change (the next page mounts
// before the last one unmounts), so the provider counts them. `crumbs` is a ref of the route's `[{ label, to? }]`.
export const PAGE_HEADER_CLAIM = Symbol("pageHeaderClaim");

// Claims the slot on mount and releases it on unmount; returns the shell's crumbs ([] without a provider).
export function usePageHeaderClaim() {
  const shell = inject(PAGE_HEADER_CLAIM, null);
  onMounted(() => shell?.claim());
  onBeforeUnmount(() => shell?.release());
  return computed(() => shell?.crumbs?.value ?? []);
}
