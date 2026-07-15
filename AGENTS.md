# AGENTS.md — entirius-pwa-cms

## Quick Reference

Admin CMS panel for the Entirius platform: a Vue 3 / Vue CLI single-page app with a visual page builder. Supports multiple content types (static pages, blog posts, rich content), configurable sections/tiles via JSON config, and a multipanel architecture (Pages, PIM, Points).

**Tech:** Vue 3.4, Pinia, Vue Router 4, Vue CLI 5, TipTap 3.19, SASS, Playwright
**Dev:** `npm run serve` (auto-generates `__client/` from defaults)
**Backend:** entirius-zeno (Django) at `http://localhost:8100` — set via `VUE_APP_API_URL`.

## Conventions

- English only: code, comments, docs, commits, branches, PRs.
- License: MPL-2.0.
- Git flow: `master` (production) + `develop` (integration); changes land via PR.
- `munin` is the django-munin API contract (module discovery + panel enablement). Never rename the client, store, or endpoints — it is a public API contract with the backend.

## Architecture

```
src/
├── boots/              # 38 global UI components (BasicInput, DataTable, FormField, EmptyState, ChannelMultiSelect, etc.)
├── composables/        # useSearchDebounce, useFormErrors, useUnsavedChanges, useLoader, useNotify, +3 more
├── configs/
│   ├── access.js       # Role-based access control & panel registry
│   └── builder/        # Config component controllers (registered via register-elems.js)
├── api/
│   ├── createClient.js # Shared Axios factory (debug interceptors, auth header)
│   ├── contentDB/      # ContentDB API client + endpoints + token refresh
│   ├── contactForms/   # Contact Forms API client (submissions, notifications)
│   ├── munin/          # Munin API client (module discovery)
│   └── pim/            # PIM API client skeleton
├── views/              # Route components (Home, Builder, Gallery, ContentSets, Pim, Points, Authors, ContactForms, Docs)
├── stores/             # Pinia stores (loader, notify, handy, user, pimChannel, contentDBChannel, munin)
├── components/         # Shared (EnvMissing, Loading, Navigation, Notifications)
├── functionals/        # Handy-kit (builder UI), Login-wall, Confirmation-modal
├── i18n/               # Translations (en.json, pl.json)
└── utils/              # Utilities, directives, env-check
```

## Key Concepts

**Panels:** Six self-contained panels -- Pages (includes Authors subsection), PIM, Points, Forms, Agreements, Emails. Enabled via Munin API (`GET /api/munin/v2/`) -- admin toggles `enabled_in_cms` per module in Django admin. `VUE_APP_PANELS` env var serves as fallback when API is unavailable. Panel metadata lives in `src/configs/access.js`, enablement logic in `src/stores/munin.js`. See `docs/panels-routing.md`.

**Stores (7):** `useLoaderStore`, `useNotifyStore`, `useHandyStore`, `useUserStore`, `usePimChannelStore`, `useContentDBChannelStore`, `useMuninStore`. All use Pinia composition syntax. See `docs/stores-composables.md`.

**Composables (8):** `useSearchDebounce`, `useFormErrors`, `useUnsavedChanges`, `useLoader`, `useNotify`, `useHandyKitSubscriber`, `useEntityFetch`, `useVariantMatching`. Opt-in for new code -- existing components use stores via `setup()` return pattern.

**Boot components (38):** Registered globally in `src/boots/register-elems.js`. New boots use `<script setup>`. Key additions: `FormField` (form field wrapper), `EmptyState` (no-data display), `ChannelMultiSelect` (channel scoping). See `docs/ui-components.md`.

**Config system:** `__client/` JSON configs drive builder UI dynamically. `__client_default/` (committed) contains skeletons. `scripts/init-client.js` copies on `npm run serve`/`build`. See `docs/config-system.md`.

**API factory:** `src/api/createClient.js` -- `createApiClient(baseURL, { authHeaderFn })`. ContentDB and PIM each have their own `client.js` + `api.js`. Add a new backend: create `src/api/{name}/client.js` and `api.js`.

**ContentDB channels:** `useContentDBChannelStore` centralizes channel and language data for all ContentDB views (Builder, Builds, Authors, ContentSets). Fetches `GET_ContentChannels` and `GET_Languages` once, exposes `channels`, `languages`, `defaultLanguage`, `availableLanguages`. Builder.vue uses the `ChannelMultiSelect` boot component for channel assignment. Empty selection = public (all channels). Draft payload includes `channels: [idx1, idx2]`.

**Standard patterns for new panels:**
- `useSearchDebounce` -- list search (replaces inline debounce). Never duplicate debounce logic.
- `useFormErrors` -- edit/create field-level validation. All edit views MUST use it.
- `FormField` -- wraps label + slot + description. Use for ALL form fields. Has a `:tooltip` prop that renders a `?` HelpTooltip next to the label (the field-level equivalent of `Switcher :hint`); also a `:description` prop for a muted line below the field.
- `EmptyState` -- standardized no-data display (title, message, icon props).
- `ChannelMultiSelect` -- channel multi-select with globe icon, responsive (icon-only on mobile).
- `HelpTooltip` -- inline `?` icon with a hover/focus bubble (`:text`). Use to explain non-obvious fields/toggles. The `Switcher` boot has a built-in `:hint` prop that renders one next to its label (click on `?` is `@click.stop`, won't toggle).
- `Dropdown` options support an optional `el.description` field in `:values` -- renders a muted secondary line under the option label (use for terse labels that need a fuller explanation, e.g. discount modifiers). Don't put a `?` tooltip inside dropdown options -- the bubble clips against the list's `overflow`.
- `MobileFilterPanel` + `FilterChip` -- filter UI on list views.

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `VUE_APP_API_URL` | Yes | Backend base URL |
| `VUE_APP_CHANNEL` | Yes | Active channel |
| `VUE_APP_PANELS` | No | Fallback panel IDs (comma-separated). Primary source: Munin API |
| `VUE_APP_LANG` | No | UI language (`EN`/`PL`) |
| `VUE_APP_DEBUG` | No | Debug logging |
| `VUE_APP_USERNAME` | No | Auto-login username |
| `VUE_APP_PASSWORD` | No | Auto-login password |

## Development Commands

```bash
npm install          # Install dependencies
npm run serve        # Dev server (auto-generates __client/)
npm run build        # Production build
npm run init:client  # Manually generate/repair __client/ configs
npm run pretty       # Code formatting
```

## Testing

```bash
npm run test:smoke   # Quick sanity check (7 tests, ~2 min)
npm test             # Full suite (build + all e2e, ~7 min)
```

See `docs/testing.md` for full command reference and test structure.

Vitest is configured for component unit tests (`npm run test:unit`). Setup lives in `vitest.config.js` + `tests/unit/setup.js` (global mocks for `$t`/`$tc`/`$route`/`$router` + stubs for boot components). Add new specs under `tests/unit/views/{Panel}/`.

## PIM ↔ Suppliers Bridge (etap-06)

`ProductList.vue` adds a `Supplier` column when `useMuninStore().isPanelEnabled('suppliers')` returns true. A single bulk call `GET_BulkHasChanges(skus)` per page hydrates `supplierStatusMap`; rows with `unseen_count > 0` render an "Updated" StatusBadge. Click navigates to `/pim/products/{sku}#supplier` — `ProductDetail.vue` watches `$route.hash` and `hasSupplierTab` to flip `activeTab` once `fetchSupplierStatus()` resolves. The `SupplierTab` (lazy-loaded) renders LinkedSuppliersPanel + status line + Force re-push/Acknowledge actions + Timeline. Force preferred + Reset to auto are stubbed (disabled + tooltip) until etap-13b ships the `set-preferred-supplier` endpoint. **Zero coupling**: PIM API service stays untouched; all supplier reads live in `src/api/suppliers/api.js` (`GET_BulkHasChanges`, `GET_SkuChanges`, `POST_AcknowledgeSku`, `POST_ForceRepushSku`).

## Suppliers Panel Bridge (etap-07)

Symmetric to etap-06 on the Suppliers side. `views/Suppliers/tabs/ProductsTab.vue` gains a warning "Updated" StatusBadge on `pushed`/`pushed_pending_images` rows whose `data_changed_at > pushed_at`, a "Has unseen changes" FilterChip (client-side filter on the current page), and the boot `<BulkActionBar>` with two actions: force re-push selected (per-SP via `POST_ForceRepushProduct(sp.id)`) and acknowledge selected (per unique `real_product_sku` via `POST_AcknowledgeSku(sku, {all_unseen:true})`). Bulk handlers live in the `useSupplierBulkActions` composable and aggregate per-call success/failure into a single warning toast.

`views/SupplierReview/SupplierReview.vue` registers a 4th `Updated` mode (lazy-loaded `UpdatedMode.vue`) — cross-supplier list driven by `GET_SupplierProducts({status:'pushed', ordering:'-data_changed_at'})` + client-side `isRowUpdated` filter, plus a per-supplier sidebar (`<FilterChip :count>` aggregated from visible rows) and the same bulk actions.

ProductsTab's existing SideDrawer (ProductCard + RawDataPanel) gets two new sections when the panel is enabled and the SP has a linked SKU: `SupplierProductTimelineSection` (wraps the etap-06 `SupplierTimeline` + diff renderers, fetches via `GET_SkuChanges`) and `SupplierProductMappingSection` (lists the supplier's mapping profiles with attribute + category counts, "Open Mappings tab" emits `open-mappings` → `$router.push({query.tab=mappings})`). `SupplierDetail.vue` now watches `$route.query.tab` to flip `activeTab` when the URL changes — mirrors the etap-06 PIM ProductDetail `$route.hash` pattern.

**BulkActionBar boot promotion (etap-07 phase 1):** the PIM-only `views/Pim/components/BulkActionBar.vue` was promoted to `src/boots/BulkActionBar/index.vue` with a generic `:actions=[{key, labelKey, buttonClass?, options?}]` API + `action(key, value?)` emit. The legacy PIM consumer (`ProductList.vue`) was refactored to pass its three actions (enable / disable / visibility dropdown) via the new prop. Add new bulk actions by appending to the `:actions` array — no boot edit needed.

**Out of scope (deferred to etap-07b):** `/suppliers/auto-matched` dashboard, `/suppliers/inventory` multi-supplier breakdown, `/suppliers/duplicates` UI + `POST /realproducts/merge-by-ean/` endpoint. Those depend on etap-13a (auto EAN-match + `find_duplicate_realproducts` service) which isn't shipped yet.

## Cross-supplier Dashboards (etap-07b)

Three views land under `/suppliers` once etap-13a + etap-13b are shipped (both done as of 2026-05-25):

- `/suppliers/auto-matched` (`views/Suppliers/AutoMatched.vue`) — distinct-SKU listing of every RealProduct touched by the auto-EAN-link path. Filter chip bar (`All`, `Has violations`, `Manual override only`) drives the query (`?has_violations=true`, `?manual_override_only=true`, `?supplier=<idx>`). Click row → `/pim/products/{sku}#supplier` (reuses etap-06 hash-sync to land on the Supplier tab). Suppliers column renders one `StatusBadge variant="positive"` per preferred link, `neutral` per non-preferred; flags column shows `warning`/`informative` badges for tolerance violations + manual overrides.

- `/suppliers/duplicates` (`views/Suppliers/Duplicates.vue`) — one card per EAN group from `GET_Duplicates({tolerance_pct: 10})`. Each card has a `StatusBadge` for the suggestion (`positive=merge` / `warning=review`) + a flat `<table>` listing RealProducts with per-row `Merge to {sku}` buttons. Clicking opens `MergeConfirmationModal` (winner+loser passed as props). On successful merge → success notification via `useNotifyStore().spawnNotification({type:'positive', msg})` (NOT `.success()` — that's a Pinia API mismatch from etap-07b first cut, fixed in same commit) + refetch. `useNotifyStore().success` does not exist; always use `spawnNotification({type, msg})`.

- `MergeConfirmationModal.vue` (`views/Suppliers/components/`) — kalka with `ForcePreferredModal` (etap-13b): wraps `ConfirmationModal` from `@/functionals/Confirmation-modal`, owns reason textarea (min 3 chars, trimmed) + confirm/cancel buttons. POSTs to `POST_MergeByEan({winner_sku, loser_sku, reason})` and emits `confirmed(responseData)` on success, `cancelled` on close. Error states surface inline (`merge-confirm__error` block, `--c-negative-100`) instead of as a toast so the modal stays open for retry. Cancel is blocked while a request is in flight.

API methods live in `src/api/suppliers/api.js`: `GET_AutoMatched(params)`, `GET_Duplicates(params)`, `POST_MergeByEan({winner_sku, loser_sku, reason})`. Nav icons reuse existing fa-icons (`faLink` for auto-matched, `faCopy` for duplicates) — no new entries in `fa-icons.js`.

**Out of scope this etap:** `/suppliers/inventory` (multi-supplier per-SKU breakdown) is intentionally NOT built — preferred-only strategy locks the data shape to what `auto-matched` already returns; a separate view would duplicate UI without adding operator value. Reopen if a "preferred history" timeline becomes the asked-for feature.

## Reference Docs

| File | Content |
|---|---|
| `docs/stores-composables.md` | All 7 stores, all 8 composables, Options API usage pattern |
| `docs/ui-components.md` | Boot components, DataTable API, custom directives, theme system, RWD, UI patterns |
| `docs/panels-routing.md` | Panel registry, layout rules, route table, access control, i18n |
| `docs/config-system.md` | `__client/` file map, variant system, adding section types/props, env validation |
| `docs/testing.md` | Test commands, suite table, writing tests |
| `docs/api.rst` | ContentDB API reference |
| `docs/pim-plan.md` | PIM panel development plan |

## Gotchas

- Restart dev server after changing config JSON -- dynamic `import()` is cached
- `__client/` is gitignored -- each deployment has its own configs; never commit it
- Global components register in TWO files: `src/boots/register-elems.js` (UI) AND `src/configs/builder/components/register-elems.js` (controllers)
- Sidebar routes are hardcoded in `Navigation.vue` -- no dynamic route registration
- Points panel import view is commented out (Navigation + router). Imports are CLI-only via `manage.py import_deliverypoints`. Files kept but unreachable.
- Carrier types are read-only in TypeList -- clicking shows informative toast, no edit modal
- Config variant strings must EXACTLY match `prop:value` format -- typos cause silent failures
- `plugins/vuex.js` does NOT exist in CMS (pure Pinia) -- do not confuse with storefront patterns
- Panel enablement is driven by Munin API (`enabled_in_cms` flag). `VUE_APP_PANELS` env var is a fallback only. To enable/disable a panel, toggle the module in Django admin, not the env var
- **New panel icon checklist:** When adding a panel, the icon string in `access.js` and `Navigation.vue` must also be imported in `src/boots/Icons/fa-icons.js` (both the `import {}` statement AND the `library.add()` call). Missing imports fail silently -- no console error, icon just doesn't render.
- `PimField.vue` in `views/Pim/components/` is a legacy alias for `FormField` boot component -- use `<FormField>` directly in new code
- Project i18n is a hand-rolled `state.lang` reactive (no vue-i18n). Only `$t(key, params)` is wired -- `$tc` does NOT exist. For pluralization, format the count into a single string (`"{count} unseen change(s)"`) rather than the `singular | plural` pipe syntax.
- Tab hash sync in `ProductDetail.vue` runs in `mounted()` AND watches `hasSupplierTab` -- because `fetchSupplierStatus()` is async, a direct `#supplier` deep-link reaches `mounted()` before the tab exists. The watcher re-applies once `supplierStatus.has_supplier` flips true. Same pattern fits any future async-conditional tab.
