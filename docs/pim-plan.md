# PIM Implementation Plan

## Completed Refactor (Phases 1-3)

Three preparatory phases cleaned up the codebase so PIM can share existing infrastructure instead of duplicating it.

**Phase 1 -- Vuex to Pinia.** Migrated 5 Vuex modules (loader, notify, helpers, user, handy) to Pinia composition stores. Updated 31+ consumer components. Removed Vuex entirely.

**Phase 2 -- API layer + composables.** Created shared Axios factory (`src/api/createClient.js`) so ContentDB and PIM use the same HTTP client pattern. Added PIM API skeleton (`src/api/pim/`). Built core composables: `useApi` (async wrapper with loader + error), `useLoader`, `useNotify`, `useHandyKitSubscriber`.

**Phase 3 -- DataTable component.** Built reusable `DataTable` in `src/boots/` with CSS Grid (subgrid), sort headers, row selection (single + multi + shift-range), scoped slots for custom cells. Migrated Builds.vue content list to use it. Sort and selection are prop-gated, ready for PIM activation.

---

## Infrastructure Ready for PIM

| Layer | What exists | Where |
|-------|-------------|-------|
| API client | Shared Axios factory with debug + auth injection | `src/api/createClient.js` |
| PIM API | Skeleton client with env-based Bearer auth | `src/api/pim/client.js`, `api.js` |
| State | Pinia composition stores (loader, notify, user, handy) | `src/stores/` |
| Composables | useApi, useLoader, useNotify, useHandyKitSubscriber, useVariantMatching | `src/composables/` |
| DataTable | Sortable, selectable, scoped slots, CSS Grid subgrid | `src/boots/DataTable/index.vue` |
| Panel system | Multi-panel routing with `meta.panel`, sidebar filtering, panel switcher | `src/configs/access.js`, router |
| Theme | Dark/light with CSS custom properties, works automatically for new views | `src/assets/scss/themes/` |
| i18n | EN + PL, namespace pattern established | `src/i18n/locales/` |

### Adding a PIM view (pattern)

1. Add endpoint functions to `src/api/pim/api.js`
2. Create view in `src/views/Pim/`
3. Add route in `src/router/index.js` with `meta: { panel: "pim" }`
4. Add sidebar link in `Navigation.vue` with `app: ["pim"]`
5. Use `<DataTable>` with `:sortable="true"` / `:selectable="true"` as needed

---

## PIM Features to Build

### Core Views (start here)

**Product List** -- Main PIM landing page. DataTable with SKU, name, category, status, health score columns. Server-side sort + pagination. Multi-select for bulk operations. Filters by category, status, completeness.

**Product Card** -- Single product editor. Sticky sidebar navigation between sections (Notion-style). Draft system with autosave to localStorage every 30s. Toast notification for draft recovery. Sections: basic info, attributes, media, rich text, SEO.

**Category Tree** -- Draggable tree structure using vuedraggable with `forceFallback: true`. Optimistic UI (instant visual update, background sync). Auto-recalculate slugs/paths when moving branches.

### Data & Attributes

**Attribute System (10k+ scale)** -- Remote virtual select (combobox) with virtual scrolling for large attribute lists. Debounced search with typo-tolerance. Vue Virtual Scroller for rendering only visible items.

**Inheritance** -- Ghost values: grey placeholders showing parent/model values. Chain icon to link/unlink (override vs inherit). Reactive Pinia mapping: if `product.local_attr` is null, display `model.attr`. Visual indicator "Inherited from: [Model Name]" per field.

**Completeness (Health Score)** -- Progress bar at top of product card. Interactive checklist of missing fields. `useCompletenessStore` with automatic recalculation on every change. Market-dependent validation (e.g., DE description required, PL optional).

### Content & Media

**Product Gallery** -- Hybrid dropzone (last tile is always "Upload"). Multi-selection with Shift+Click. `URL.createObjectURL` for instant preview before upload. Focal point selection for thumbnail cropping.

**Rich Text (TipTap)** -- Content variables as interactive chips (e.g., `{{weight}}`). Custom TipTap Node Views. Block manual variable editing. Auto-link SKU codes to other products. Reuses existing TipTap 3.19 setup.

### Workflow & Operations

**Workflow & Kanban** -- Trello-style board with status columns (Draft, Copywriting, Ready). vuedraggable between columns. Cards with mini-preview and health score. Auto-create task when ERP adds new SKU.

**Bulk Edit Wizard** -- Step-by-step: 1) Filter, 2) Choose action, 3) Dry run (preview sample of 5 products), 4) Execute. `lodash.set` for dynamic field mapping. Progress bar with percentage.

**Audit Trail** -- Time-travel slider comparing old vs new versions (GitHub diff style). Object diff component with red/green highlighting. Rollback single attribute from history. `audit_logs` table storing who/what/when snapshots.

### Collaboration & UX

**Concurrent Editing** -- Field-level locking via WebSockets (Socket.io). Greyed-out field with avatar of active editor. Conflict notification: "User X just saved changes that may conflict with yours."

**AI Copilot** -- Sidebar panel with action buttons ("Fix grammar", "Generate attributes"). OpenAI/Claude integration via SSE for streaming text. Auto-tag images (suggest color, material from photo).

**Command Palette (Ctrl+K)** -- Global search across actions + data. Vue Router integration. Keyboard shortcuts for common actions (Save, Copy SKU). Compact/Comfortable density toggle via SASS variables.

**Guided Tours** -- Interactive tooltips for first-time users. Vue-Tour library connected to Pinia state (track which steps shown). Quick Help icon `[?]` per attribute showing API tooltip.

---

## Suggested Build Order

| Priority | Feature | Dependencies |
|----------|---------|-------------|
| 1 | PIM API endpoints | PIM skeleton exists |
| 2 | Product List view | DataTable, API endpoints |
| 3 | Category Tree | vuedraggable (new dep) |
| 4 | Product Card (basic) | API endpoints, category tree |
| 5 | Attribute system | Virtual scroller (new dep) |
| 6 | Inheritance | Attribute system, Pinia store |
| 7 | Health Score | Product card, attribute system |
| 8 | Product Gallery | Existing image upload patterns |
| 9 | Rich Text (PIM) | Existing TipTap setup |
| 10 | Workflow & Kanban | Product card, status system |
| 11 | Bulk Edit | Product list, API batch endpoints |
| 12 | Audit Trail | API history endpoints |
| 13 | Concurrent Editing | WebSockets (new infra) |
| 14 | AI Copilot | SSE integration (new infra) |
| 15 | Command Palette | Router, global search |
| 16 | Guided Tours | Vue-Tour (new dep) |

### New Dependencies (not yet installed)

- `vuedraggable` -- category tree, kanban columns
- `vue-virtual-scroller` -- 10k+ attribute lists
- `socket.io-client` -- concurrent editing
- `vue-tour` or equivalent -- onboarding tours
- `lodash` (or `lodash.set`) -- bulk edit field mapping
