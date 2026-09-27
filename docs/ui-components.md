# UI Components

## Global Components (Boots)

37 components registered globally in `src/boots/register-elems.js` (plus
FontAwesome icon registration in `src/boots/Icons/fa-icons.js`, loaded
separately in `main.js` — not a component — and the icon meaning registry
`src/boots/Icons/icons.js`, `$icons` in templates). Every component is shown on the catalogue page `/ui`
(§ P3 components).

Full list: BackBar, BasicButton, BasicCheckbox, BasicDatePicker
(Flatpickr), BasicImage, BasicInput, BasicLogo, BasicSwiper, BasicTabs,
BasicWysiwyg (TipTap), BulkActionBar, ChannelMultiSelect, ColorInput,
DataTable (CSS Grid, `<script setup>`), Dropdown, EmptyState,
EntitySearchPicker, FilterChip, FloatingActions, FormField, HelpTooltip,
HoverMe, Loader, LockedField, MobileFilterPanel, NoticeMe,
NumberInput, Pagination, SegmentedControl, SideDrawer, StanceSwitcher,
StatusBadge, SubscriberSetter, Switcher, TextAreaBasic, ToolTip,
TranslationsDrawer.

New boots use `<script setup>` (plain JS). See `FloatingActions/index.vue` and
`DataTable/index.vue` as patterns.

Notable ones for list/form views:

- **`DataTable`** — see API below.
- **`FormField`** — label/description/tooltip/required wrapper for form
  inputs. Props: `label`, `description`, `tooltip`, `required`.
- **`EmptyState`** — placeholder for empty lists and panels. Props: `title`, `message`,
  `icon`, `size` (`md` full block, default; `sm` one line); the default slot takes an action. `DataTable` renders it
  for `emptyText`, one line by default; a list screen whose only content is the table passes `empty-size="md"`.
- **`Loader`** — loading indicator (`role="status"`), inline by default so it keeps its place in a modal, side
  panel or button; `block` centres it in the content area it stands in for.
- **`NumberInput`** — stepper field. A fractional `step` turns on decimal entry; typed text keeps one leading minus
  (only when `min` < 0), one decimal separator and digits. `isDisabled` locks the value and both steppers.
- **`ChannelMultiSelect`** — multi-select for channel scoping (`v-model`
  array of channel idx). Props: `modelValue`, `channels`, `label`, `allLabel`.
- **`HelpTooltip`** — inline `?` icon with a hover bubble. Props: `text`
  (required). `Switcher :hint` is the same bubble built in (the `?` click is
  `@click.stop`, it does not toggle the switch).
- **`Dropdown`** — an option in `:values` may carry `description`, a muted
  line under its label. Never put a `?` tooltip inside an option: the bubble
  clips against the list's `overflow`.
- **`BulkActionBar`** — sticky bar for bulk row actions. Props: `count`
  (required), `actions` (required), `selectedLabelKey`, `clearLabelKey`.
- **`SegmentedControl`** — single-choice toggle group. Props: `options`
  (required), `modelValue`; emits `update:modelValue`.
- **`StatusBadge`** — colored status pill. Props: `label` (required),
  `variant` (`positive`/`negative`/`warning`/`informative`/`neutral`).
- **`MobileFilterPanel`** — collapsible filter drawer for small screens.
  Props: `activeCount`, `triggerLabel`.
- **`FilterChip`** — toggleable filter pill. Props: `label` (required),
  `active`, `count`; emits `click`. A global component — do not redefine
  `.filter-chip` styles locally.

### DataTable

CSS Grid table for all list views. Uses `<script setup>`.

**Props:** `columns` (required), `rows`, `emptyText`, `sortable`,
`selectable`, `multiSelect`, `rowKey` (default `'uid'`)
**Events:** `sort`, `select`, `row-click`
**Slots:** `cell-{key}`, `header-{key}`, `empty`

Column options (JSDoc in the component): `key`, `label`, `sortable`, `align`, `width` (a grid track; a px width
never drops below the header or an untruncated cell, and on a phone shrinks to that content), `truncate` (one line, ellipsis, `title` from `title(row)`, else
the value, or a slot cell's rendered text; on for cells without a slot; a truncated `fr` column is at least
max(120 px, its header)), `numeric` (right, tabular figures, no wrap), `actions` (right-aligned buttons,
`max-content` track), `priority` (2 hidden at `max-tablet` ≤ 768 px, 3 below 1024 px). A status (badge) column never
truncates: `width: "max-content"`. An empty value renders "—".

Pagination: `pagination` (`{ page, pages }`) or `current` / `total` / `perPage`; hidden for one page; emits the new
page as `onChangePage` and `change`. A `.chip` that can be cut wraps its text in `.chip__label` and carries `title`.

Sort: prop-gated, header click cycles null -> asc -> desc -> null, emits only
(parent handles sorting).
Selection: prop-gated, Shift+click range, Ctrl/Cmd+click toggle. The
component exposes `clearSelection()` (via `defineExpose`) for parent-driven
deselect after bulk actions — call it through a template ref.

## Custom Directives

Defined in `src/utils/directives/`.

**`v-out`** — Click-outside detection. Pass a string literal
(`v-out="'open'"`, sets that data key to `false`) or a callback function.
Never pass a boolean directly.

**`v-ripple-effect`** — Material ripple. Injects a `.ripple-effect-class`
span on click.

## Theme System

- **Attribute:** `data-theme="default"|"dark"` on `<html>`
- **Store:** `useUserStore().theme`, `useUserStore().setTheme(theme)`
- **Persistence:** `localStorage` key `cms_theme`, falls back to
  `prefers-color-scheme: dark`

### Colours, shadows, overlays

The semantic layer, per `[data-theme]`: `src/assets/tokens/semantic.json`, generated into
`src/assets/scss/themes/_semantic.generated.scss` (rules and roles: `docs/ui-rules.md` § Tokens).

### Focus Styles

`:focus-visible` uses `outline: 2px solid var(--accent)` with
`offset: 2px`. Defined in `src/assets/scss/utils/_reset.scss`.

## Mobile / RWD

**Breakpoints:** `768px` (mobile/tablet), `1279px` (desktop). Mixins:
`max-tablet`, `min-tablet`, `max-desktop`, `min-desktop`
(`src/assets/scss/utils/_media-query.scss`).

**Grid gotcha:** Utility grid classes only apply at `min-width: 40rem`
(640px). Below that, use `display: flex; flex-direction: column`.

**`--bottom-bar-height`:** `0px` desktop, `56px` mobile
(`src/assets/scss/utils/_mobile.scss`). Use for fixed-bottom elements.

## Reusable UI Patterns

Page patterns, boot choice by job and UI rules live in `docs/ui-rules.md`.

## P3 components

One section per P3/P4 plan, in plan order. A plan writes only its own section (dev-plans § Streams); each section
matches the plan's block in `register-elems.js` and its section of the catalogue (`src/views/UiCatalogue/sections/`).

### P3 icons

`src/boots/Icons/icons.js` exports `ICONS`, a frozen `{ meaning: glyph }` map; templates read it as `$icons`
(`<FontAwesomeIcon :icon="$icons.edit" />`). Keys are camelCase (`saveDraft`, `importCsv`), one glyph per meaning
and one meaning per glyph (unit test). A new meaning adds its glyph to `fa-icons.js` (import and `library.add()`).
`BasicInput icon` and Pagination take their glyphs from it. Catalogue: `#icons`, every meaning at 16 / 20 / 24 px.

### P3 actions (plan 11)

### P3 overlays (plan 12)

### P3 display (plan 13)

### P3 page frame (plan 14)

### P3 selects (plan 15)

### P3 inputs (plan 16)

### P4 shell (plan 21)
