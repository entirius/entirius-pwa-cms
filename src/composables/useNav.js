import { computed, toValue } from "vue";
import { useRoute, useRouter } from "vue-router";
import { panels as REGISTRY } from "@/configs/access";
import { buildNavRoutes, filterNavRoutes, isNavActive } from "@/components/Navigation/nav-routes";
import { useMuninStore } from "@/stores/munin";
import { useQualityStore } from "@/stores/quality";
import { useIsDesktop } from "@/composables/useIsDesktop";
import { t } from "@/i18n";

// The one navigation model of the shell (r05 §2–§4): which panels exist (`usePanels`), which entries each has
// (`navTree`), which entry a route lights (`resolveNavEntry`), where the user is (`useActiveNav`) and the trail above
// the title (`useBreadcrumbs`). Pure functions carry the rules; the composables feed them the stores and the route.
// The active panel comes from `route.meta.panel` ("home" on `/`).
export const HOME = "home";
export const HOME_ROUTE = "/";
const HIDE_DISABLED = (process.env.VUE_APP_HIDE_DISABLED_PANELS || "").toUpperCase() === "TRUE";

// Registry order × Munin; `hideDisabled` drops locked panels instead of showing them dimmed.
export function panelList(isPanelEnabled, hideDisabled = HIDE_DISABLED) {
  const all = REGISTRY.map((panel) => ({ ...panel, isEnabled: isPanelEnabled(panel.idx) }));
  return hideDisabled ? all.filter((panel) => panel.isEnabled) : all;
}

export function usePanels() {
  const munin = useMuninStore();
  return computed(() => panelList(munin.isPanelEnabled));
}

// `{ [panelIdx]: entries[] }`; ctx = { qualityAvailable, isModuleEnabled, isDesktop }.
export function navTree(ctx, routes = buildNavRoutes()) {
  return Object.fromEntries(
    REGISTRY.map((panel) => [panel.idx, filterNavRoutes(routes, { ...ctx, panel: panel.idx })])
  );
}

export function useNavTree() {
  const munin = useMuninStore();
  const quality = useQualityStore();
  const isDesktop = useIsDesktop();
  const routes = buildNavRoutes();
  return computed(() =>
    navTree({ qualityAvailable: quality.available, isModuleEnabled: munin.isModuleEnabled, isDesktop: isDesktop.value }, routes)
  );
}

const longestPrefix = (entries, path) =>
  entries
    .filter((entry) => path.startsWith(`${entry.route}/`))
    .sort((a, b) => b.route.length - a.route.length)[0];

// exact → activeOn → meta.navParent → longest path prefix; entries are one panel's, already filtered.
export function resolveNavEntry(entries, route) {
  const path = route.path;
  return (
    entries.find((entry) => entry.route === path) ??
    entries.find((entry) => isNavActive(entry, path)) ??
    entries.find((entry) => entry.route === route.meta?.navParent) ??
    longestPrefix(entries, path) ??
    null
  );
}

// The phone tab bar lists the active panel's entries: shown with two or more, never on `meta.noBottomBar`
// (Leads Review).
export const tabBarShown = (entries, route) => entries.length > 1 && !route.meta?.noBottomBar;

export const activePanelOf = (route) => (route.path === HOME_ROUTE ? HOME : route.meta?.panel ?? null);

export function useActiveNav() {
  const route = useRoute();
  const tree = useNavTree();
  const panelIdx = computed(() => activePanelOf(route));
  const entry = computed(() => resolveNavEntry(tree.value[panelIdx.value] ?? [], route));
  return { panelIdx, entry, tree };
}

const paramNames = (path) => [...path.matchAll(/:(\w+)/g)].map((match) => match[1]);

// The `meta.crumbParent` chain of `route` (route names), outermost first, each linked with the params it takes.
export function crumbParents(route, records) {
  const parents = [];
  const byName = (name) => (name ? records.find((r) => r.name === name) : null);
  let record = byName(route.meta?.crumbParent);
  while (record && !parents.some((parent) => parent.record === record)) {
    parents.unshift({ record, params: Object.fromEntries(paramNames(record.path).map((key) => [key, route.params[key]])) });
    record = byName(record.meta?.crumbParent);
  }
  return parents;
}

// R3: panel → entry → crumbParent chain → current page; nothing on the panel's list itself (its entry or its root:
// Stock's entry `/stock` redirects to the root `/stock/manage`) or outside a panel.
// A panel whose root is the entry keeps both crumbs (Figma S6: "Pages / Lista treści / Product Showcase").
export function buildCrumbs(route, { panel, entry, parents = [], title }) {
  if (!panel || route.path === panel.root || route.path === entry?.route) return [];
  return [
    { label: t(panel.labelKey), to: panel.root },
    ...(entry ? [{ label: t(entry.labelKey), to: { path: entry.route, query: entry.query } }] : []),
    ...parents.map(({ record, params }) => ({ label: t(record.meta.titleKey), to: { name: record.name, params } })),
    { label: title || t(route.meta?.titleKey) },
  ];
}

// The back arrow goes to the last linked crumb: history back when that is where the user came from (keeps list
// filters and paging), else a push (a deep link never leaves the app).
export function goBackTo(router, target) {
  const back = window.history.state?.back;
  if (back && back.split("?")[0] === router.resolve(target).path) router.back();
  else router.push(target);
}

export function useBreadcrumbs(title = null) {
  const route = useRoute();
  const router = useRouter();
  const panels = usePanels();
  const { panelIdx, entry } = useActiveNav();
  const crumbs = computed(() =>
    buildCrumbs(route, {
      panel: panels.value.find((panel) => panel.idx === panelIdx.value),
      entry: entry.value,
      parents: crumbParents(route, router.getRoutes()),
      title: toValue(title),
    })
  );
  const backTarget = computed(() => crumbs.value.at(-2)?.to ?? null);
  const back = () => backTarget.value && goBackTo(router, backTarget.value);
  return { crumbs, backTarget, back };
}
