# UI Components -- CMS Blueprint

## Global Components (Boots)

Registered globally in `src/boots/register-elems.js`:

BasicInput, BasicWysiwyg (TipTap), BasicDatePicker (Flatpickr), BasicSwiper, BasicImage, BasicButton, BasicCheckbox, DataTable (CSS Grid, `<script setup>`), Dropdown, Accordion, Pagination, Loader, NoticeMe, LazyScroll, ToolTip, FloatingActions, MobileFilterPanel, Icons (FontAwesome)

New boots use `<script setup>` (plain JS). See `FloatingActions/index.vue` and `DataTable/index.vue` as patterns.

### DataTable

CSS Grid table for all list views. Uses `<script setup>`.

**Props:** `columns` (required), `rows`, `emptyText`, `sortable`, `selectable`, `multiSelect`, `rowKey` (default `'uid'`)
**Events:** `sort`, `select`, `row-click`
**Slots:** `cell-{key}`, `header-{key}`, `empty`

Sort: prop-gated, header click cycles null -> asc -> desc -> null, emits only (parent handles sorting).
Selection: prop-gated, Shift+click range, Ctrl/Cmd+click toggle.

## Custom Directives

**`v-out`** -- Click-outside detection. Pass string literal (`v-out="'open'"`) or callback. Never pass boolean directly.

**`v-ripple-effect`** -- Material ripple. Uses `var(--overlay-ripple)`.

## Theme System

- **Attribute:** `data-theme="default"|"dark"` on `<html>`
- **Store:** `useUserStore().theme`, `useUserStore().setTheme(theme)`
- **Persistence:** `localStorage` key `cms_theme`, falls back to `prefers-color-scheme: dark`

### Color Palettes

Defined in `src/assets/scss/themes/` (`__default.scss`, `__dark.scss`). Groups: `basic` (100-900), `support`, `primary`, `positive`, `negative`, `warning`, `informative`, `notice`.

Light: `basic-100` = lightest. Dark: scale inverts.

### Theme-Scoped CSS Variables

Per `[data-theme]` in `src/assets/scss/main.scss`:
- **Shadows:** `--shadow-sm/md/lg/arrow/right/left/down/top/around`
- **Overlays:** `--overlay-backdrop/heavy/loading/handy/ripple`
- **Gradients:** `--gradient-blue/subtle/main-bg`
- **Editor:** `--editor-table-header-bg/bg-alt/text`

### Focus Styles

`:focus-visible` uses `outline: 2px solid var(--c-support-400)` with `offset: 2px`. Defined in `src/assets/scss/utils/_reset.scss`.

## Mobile / RWD

**Breakpoints:** `768px` (mobile/tablet), `1279px` (desktop). Mixins: `max-tablet`, `min-tablet`, `max-desktop`, `min-desktop`.

**Grid gotcha:** Utility grid classes only apply at `min-width: 40rem` (640px). Below that, use `display: flex; flex-direction: column`.

**`--bottom-bar-height`:** `0px` desktop, `56px` mobile. Use for fixed-bottom elements.

## Reusable UI Patterns

### ToolTip on Disabled Buttons

```html
<ToolTip v-if="!isValid" :tip="'Why disabled'" :is_wrapper="true" class="left">
  <BasicButton :text="'Action'" class="bg-basic-300 t-basic-500" />
</ToolTip>
<BasicButton v-else :text="'Action'" class="bg-support-400" @click="handler" />
```

### Filter Chips

`.filter-chip` / `.filter-chip--active` defined in `Builds.vue` unscoped styles. Only load when content list is visited. Duplicate styles if using in other views.
