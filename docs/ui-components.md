# UI Components

## Global Components (Boots)

47 components registered globally in `src/boots/register-elems.js` (plus
FontAwesome icon registration in `src/boots/Icons/fa-icons.js`, loaded
separately in `main.js` — not a component — and the icon meaning registry
`src/boots/Icons/icons.js`, `$icons` in templates). Every component is shown on the catalogue page `/ui`
(§ P3 components).

Full list (generated from `register-elems.js`): ActionBar, BasicButton, BasicCard, BasicCheckbox, BasicDatePicker,
BasicImage, BasicInput, BasicLogo, BasicMenu, BasicModal, BasicRadioGroup, BasicSelect, BasicSwiper, BasicSwitch,
BasicTabs, BasicTextarea, BasicTooltip, BasicWysiwyg, Breadcrumbs, BulkActionBar, ChannelMultiSelect, ColorInput,
ConfirmDialog, CountBadge, DataTable, EmptyState, EntitySearchPicker, FilterChip, FloatingActions, FormField,
IconButton, Loader, MediaTile, MobileFilterPanel, NoticeMe, NumberInput, PageHeader, PageLayout, Pagination,
PanelCard, SegmentedControl, SideDrawer, StanceSwitcher, StatusBadge, SubscriberSetter, Tag, TranslationsDrawer.

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
  (only when `min` < 0), one decimal separator and digits. `disabled` locks the value and both steppers.
- **`ChannelMultiSelect`** — multi-select for channel scoping (`v-model`
  array of channel idx). Props: `modelValue`, `channels`, `label`, `allLabel`.
- **`BasicSelect`** — an option may carry `description`, a muted line under its label. Never put a `?` tooltip
  inside an option: the bubble clips against the list's `overflow`.
- **`BulkActionBar`** — sticky bar for bulk row actions. Props: `count`
  (required), `actions` (required: `variant` per action, `secondary` without one; an action with `options` is an
  action picker, a BasicSelect), `selectedLabelKey`, `clearLabelKey`.
- **`SegmentedControl`** — single-choice toggle group. Props: `options`
  (required), `modelValue`; emits `update:modelValue`.
- **`StatusBadge`** — coloured status pill. Props: `label` (required),
  `tone` (`positive`/`negative`/`warning`/`info`/`neutral`/`accent`).
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

Pagination: `v-model:page` + `pages` (see § P3 display).

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

**Breakpoints:** `768px` (mobile/tablet), `1024px` (the shell: sidebar from here up), `1279px` (desktop). Mixins:
`max-tablet`, `min-tablet`, `max-shell`, `max-desktop`, `min-desktop`
(`src/assets/scss/utils/_media-query.scss`).

**Grid gotcha:** Utility grid classes only apply at `min-width: 40rem`
(640px). Below that, use `display: flex; flex-direction: column`.

**`--bottom-bar-height`:** `72px` below the shell breakpoint, `0px` from it up and on a screen without the tab bar
(`:root` in `src/assets/scss/utils/_mobile.scss`, `.app--no-panel-nav` in `App.vue`). Use for fixed-bottom elements.

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

- **`BasicButton`** — `variant` `primary` (accent fill, white text) · `secondary` (outline) · `ghost` · `danger`
  (every delete/remove/reject) · `danger-solid` (the destructive confirm of a dialog); `size` `md`
  (`--elem-height`) · `sm` (24 px); label in the default slot; `icon` = a meaning of `icons.js`, drawn before the
  label (6 px gap); `loading` swaps the icon for a spinner, disables and sets `aria-busy`; `disabled`; `type`
  (`button` by default); without a `variant` it is `secondary`. The click stops at the button (`:stop="false"` lets
  it through).
- **`IconButton`** — every icon-only action: `icon` (meaning, required), `label` (required: `aria-label` + `title`),
  `variant` `ghost` · `outline` · `primary` · `danger`, `size` `sm` 24 · `md` `--elem-height` · `lg` 40 (header,
  mobile menu, `--radius-xl`), `pressed` (a toggle: `aria-pressed`, `surface-hover` fill), `disabled`. `danger` is
  every icon-only delete or remove (C6). The click stops at the button by default (`:stop="false"` to opt out).
  A back control: `<IconButton icon="back" :label="$t('common.back')" />`. On a phone
  the hit area grows to 40 × 40 around the box, the box keeps its size. `md` matches the text button, not Figma's
  32 px (KD23).
- **`ActionBar`** — page and dialog actions in R5 order: `actions` = `[{ key, label, role, onClick, icon?,
  disabled?, loading?, testid? }]`, `role` `utility` (an IconButton, `icon` required) · `secondary` · `danger` ·
  `primary` (one at most, a second warns in dev); extra controls go into the default slot, already in order.
  Right-aligned, gap 12 px (8 px on a phone); below 768 px it takes its own row: the label „Akcje” above the actions, left-aligned (Figma S7).
- **`FloatingActions`** — FAB 44 px `accent-fill`, 16 px inset, 16 px above the bottom bar, `data-fid="fab"`;
  `actions[].icon` and `pill.icon` take meanings (other names still pass through until the sweeps). `pill` =
  `{ icon, label, handler, testid? }`: an important action with a visible label left of the FAB (R7). `open`
  starts with the speed-dial open.
- **`BulkActionBar`** — `actions[].variant` is a BasicButton variant (`secondary` without one); an action with
  `options` is a BasicSelect action picker.
- Codemod `scripts/codemods/p3-actions.mjs` (sweeps 17/18): colour classes → `variant`, `text` → slot,
  `isDisabled` → `disabled`, labelled buttons drop `icon`, icon-only → IconButton, `buttonClass` → `variant`;
  it flags the dark toggles, one-off colours, colours in `:class` and icon-only buttons it cannot name.

Catalogue: `#actions` (`#basic-button`, `#icon-button`, `#action-bar`, `#floating-actions`, `#bulk-action-bar`).

### P3 overlays (plan 12)

- **`useFocusTrap(container, { active, initialFocus?, onEscape? })`** (`src/composables/useFocusTrap.js`) — while
  `active`: focus moves in (the given element, else the first focusable), Tab / Shift+Tab cycle inside, Esc calls
  `onEscape`, the other children of `<body>` are `inert`, the body does not scroll; on release focus returns to the
  opener. Traps stack (the last one owns the keyboard). The container must be teleported to `<body>`; an `inline`
  overlay never activates one. Positioning of menus and tooltips: `useFloatingPosition` (`@floating-ui/dom`, flip +
  shift + offset, `position: fixed`).
- **`BasicModal`** — `v-model:open`, `title` (the `<h2>` that names the dialog; the `title` slot takes richer
  markup), `size` `sm` · `md` · `lg`, `persistent` (Esc and backdrop do not close; the close button does), default
  slot = body, `footer` slot or `actions` (→ `ActionBar`); emits `update:open` and `close`. `role="dialog"
  aria-modal`, teleported to `<body>`, `overlay-backdrop`, `surface-raised`, `--radius-xl`, `shadow-lg`, focus
  trapped. Below the tablet breakpoint: a full-width sheet at the bottom. Close button test id `basic-modal-close`.
- **`ConfirmDialog`** — on BasicModal `sm`: `v-model:open`, `title` (or slot), `message` (or the default slot),
  `confirmLabel` / `cancelLabel` (default „Akceptuj” / „Anuluj”), `tone` `default` (primary confirm) · `danger`
  (`danger-solid`), `loading` (spinner, Esc blocked), `discardLabel` (a third `danger` action for unsaved changes);
  emits `confirm`, `cancel` (Cancel, close, Esc, backdrop), `discard`. The caller closes it. Test ids
  `confirm-dialog-confirm` / `-cancel` / `-discard`.
- **`BasicMenu`** — `trigger` slot (the menu sets the control's `aria-haspopup`, `aria-expanded`, `aria-controls`
  and toggles on its click), `items` = `[{ key, label, icon?, danger?, separator?, disabled?, to?, testid? }]`
  (`role="menu"`; emits `select` with the item) or the `panel` slot (scope `close`, `role="dialog"` named by
  `label`); `placement` (floating-ui, default `bottom-start`). Keyboard: ArrowDown on the trigger opens, arrows /
  Home / End move, Enter / Space choose, Esc closes and returns focus, Tab and a click outside close.
- **`BasicTooltip`** — wraps its trigger (default slot; its first focusable gets `aria-describedby`): `text`,
  `placement` `top` · `bottom` · `left` · `right` (flips when there is no room), `variant` `help` (a `?` button
  named „Pomoc” instead of the slot), `open` (forced). Shows on hover and keyboard focus, hides on Esc, blur and
  leave. A trigger holding only a disabled control makes the wrapper the tab stop (disabled with a reason).
  `IconButton` shows its `label` through it (no `title`).
- **`SideDrawer`** — focus trapped in `focused` mode (`role="dialog" aria-modal`, named by its title), Esc closes in
  both modes (sticky: while focus is inside), close = `IconButton` (`side-drawer-close`). **`TranslationsDrawer`**
  footer is an `ActionBar` (Save rightmost, `translations-save` / `translations-cancel`).
- `inline` (BasicModal, ConfirmDialog, SideDrawer, TranslationsDrawer, BasicMenu) renders the open state in the page
  flow: no Teleport, no backdrop, no trap (catalogue).
- Removed (lint, `scripts/lint/removed-components/overlays.json`): `ToolTip`, `HelpTooltip`, `HoverMe` →
  `BasicTooltip`; the `Confirmation-modal` / `Unsaved-changes-modal` wrappers are deleted (ConfirmDialog).
- Codemod `scripts/codemods/p3-overlays.mjs` (sweeps 17/18): the confirmation tags → `ConfirmDialog` (`visible` →
  `open`, `destructive` → `tone`, `accept` / `reject` / `save` / `stay` → `confirm` / `cancel`, a plain `#header`
  `<h2>` → `title`, `#description` → default slot), tooltips → `BasicTooltip` (`tip` → `text`, a standalone ToolTip
  or HelpTooltip → `variant="help"`), imports dropped; flags a custom `#footer`, a missing title, a computed
  `is_wrapper` and attributes outside the map.

Catalogue: `#overlays` (`#basic-modal`, `#confirm-dialog`, `#side-drawer`, `#translations-drawer`, `#basic-menu`,
`#basic-tooltip`), plus buttons that open the real overlays.

### P3 display (plan 13)

- **`StatusBadge`** — one state pill: `label` (string or number, also the `title`; the badge never grows past its
  cell and ends in an ellipsis), `tone` `positive` · `negative` · `warning` · `info` · `neutral` · `accent`, `dot`
  (default on), `size` `md` · `sm`; hollow (tone border, tone text), 12 px Inter 600 (`type-badge`). It replaced
  the global `.chip` (deleted).
- **`CountBadge`** — `count` in a 20 px pill (`surface-hover`, 11 px Inter 600, `type-count`), `999+` above 999.
  BasicTabs, FilterChip and the MobileFilterPanel trigger show their counts with it.
- **`Tag`** — a value chip (a picked entity, a media tag): `label`, `removable` adds a `close` IconButton `sm` named
  „Usuń: <label>” that emits `remove`.
- **`BasicTabs`** — `options` `[{ label, value, count? }]` + `v-model` (unchanged); a `tablist` with one Tab stop
  (the active tab), ←/→ (wrapping), Home and End select and focus a tab; active = accent text + 2 px accent underline.
  Tab `i` is `id="<idPrefix>-tab-<value>"` with `aria-controls="<idPrefix>-panel-<value>"`: the call site renders the
  panel as `<div role="tabpanel" :id="…-panel-<value>" :aria-labelledby="…-tab-<value>">`. Empty `options` render
  nothing.
- **`BasicCard`** — the card of `.page-card` (border-subtle, `--radius-3xl`, 24 px / 16 px below tablet): `title`
  (section title, Inter 600 16 px), `actions` slot (an ActionBar, right of the title), default slot.
- **`PanelCard`** — Home panel tile: `icon` (the panel's glyph from `configs/access.js`), `title` (Lexend Deca),
  `description`, `locked` + `lockedText` (opacity .5, lock, not focusable, no click), emits `click`; `surface-card`
  gradient, `--radius-3xl`, padding and gap 20 px, a plain 24 px icon, title and description 12 px apart; root class
  `panel-card` (e2e hook). The page sets `data-fid="panel-card"` on the one card Figma measures (Home: the first).
- **`MediaTile`** — media grid tile, 188 × 276 (150 × 240 below tablet), `surface-raised`: `src` (none = image
  placeholder; contained, not cropped), `alt`, `caption` (truncated, full text in `title`), `selected` (accent
  border), `actions` slot (IconButtons `sm`), `overlay` slot (value chips, `Tag`, over the bottom of the image).
  Actions and overlay show on hover, keyboard focus inside the tile, when selected and always on a touch screen.
  The page lays the tiles out (Gallery: `repeat(auto-fill, <tile width>)` in a bordered container).
- **`Loader`** — `size` 32 · 64 (64 by default), `block` centres it in a content area, `overlay` veils the
  screen (`overlay-loading`, 64 px rings, fades in and out), `overlay contained` veils the nearest
  positioned ancestor; `role="status"` with a visually hidden „Ładowanie…”.
- **`Pagination`** — `v-model:page` + `pages`; 32 px page squares 4 px apart, the current one boxed in accent, round
  prev/next arrows at opacity .5 when disabled, an ellipsis for many pages, nothing for one page. A computed page
  count is `:pages="Math.ceil(total / perPage)"` at the call site.
- **`EmptyState`** — `icon` is a meaning of `icons.js` (`empty` for a list with no rows).
- **`MobileFilterPanel`** — the trigger is an `outline` IconButton `filter` named by `triggerLabel`, with a CountBadge.
- Codemod `scripts/codemods/p3-display.mjs` (sweeps 17/18): `.chip` + colour classes → `StatusBadge` `tone`
  (`:dot="false"` keeps the dotless look, `chip--sm` → `size="sm"`, `.chip__label` unwrapped); `<Loading>` →
  `<Loader overlay>` (`isHandy` → `contained`), import dropped. It flags `:class` bindings, click handlers, one-off
  colours and content that is not one text. `Loading` is a removed component (`removed-components/display.json`).

Catalogue: `#display` (`#status-badge`, `#count-badge`, `#tag`, `#basic-tabs`, `#basic-card`, `#panel-card`,
`#media-tile`, `#empty-state`, `#loader`, `#pagination`, `#filter-chip`, `#mobile-filter-panel`, `#data-table`).

### P3 page frame (plan 14)

- **`PageLayout`** — a page's content region: no border, no card (R4), padding 40 top / 80 sides (20 below tablet),
  one scroll body (`h-100 ovy-auto`). Slots `header` (a PageHeader), `toolbar` (the filters row), default (the
  content). It replaces the bordered page container when P5 adopts it (plan 25).
- **`PageHeader`** — `title` is the page's only `<h1>` (`.page-title`: Lexend Deca 30/400, 20 below tablet) in the
  title row (back, H1, meta: `data-fid="page-title"`, Figma's "Heading" frame); `overline` (Inter 13/500 uppercase, Home); `crumbs` `[{ label, to? }]` 24 px above the
  title row — omitted = the crumbs the shell provides (none without a shell), `[]` = none; `back` (a route location
  pushed on click, or a handler) = a ghost `back` IconButton left of the H1, 20 px gap; `sticky` pins the head (crumbs,
  back, title, meta) under the app header on a phone, flush with it and full width, on the page background (`data-fid="sticky-header"`); the
  actions row scrolls away. Slots `meta` (chips beside the title, they keep their width) and `actions` (an
  ActionBar): in the title row on desktop while both fit, otherwise wrapped under it right-aligned, and always its own
  row below 1024 px. A long title wraps inside itself.
- **Shell claim** — `src/composables/pageHeader.js`: `PAGE_HEADER_CLAIM` (injection key) and
  `usePageHeaderClaim()`. The shell (P4) provides `{ claim, release, crumbs }` and hides its fallback header while a
  claim is held; claims overlap during a route change, so the provider counts them. PageHeader claims on mount,
  releases on unmount, and without a provider the claim is a no-op. `claim-shell="false"` keeps a demo instance (the
  `/ui` catalogue) out of the slot: no claim, no shell crumbs, the page keeps its own header.
- **`Breadcrumbs`** — `items` `[{ label, to? }]`, the last item is the current page (`aria-current="page"`, never a
  link); `<nav aria-label="Breadcrumb"><ol>`; Lexend Deca 16/400 (12 below tablet), `size="sm"` = 12 everywhere;
  ancestors `text-muted`, current `text-strong`, a `/` separator with 12 px gaps; long labels truncate with a `title`.
- `BackBar` is a removed component (`removed-components/page-frame.json` → PageHeader `back`); until a view moves to
  PageHeader its back control is an `IconButton icon="back"` (`label` „Wstecz”) or, with a visible label, a
  `BasicButton variant="ghost" size="sm" icon="back"`.

Catalogue: `#page-frame` (`#page-header`, `#breadcrumbs`, `#page-layout`).

### P3 selects (plan 15)

- **`BasicSelect`** — one choice from a list: `v-model` (a value, or an array when `multiple`), `options`
  `[{ label, value, description?, disabled? }]`, `placeholder` (default „Wybierz”), `searchable` (filter input above
  the list), `clearable` (a clear IconButton while something is chosen), `disabled`. Closed control: a
  `role="combobox"` button, `--elem-height`, `--radius-base`, `border-control`, 12 px Inter 500, `expand` caret;
  `multiple` shows the one label or „Wybrano: N”. The list opens in BasicMenu's panel (position, flip = drop-up,
  outside click, Esc, focus return) as a `listbox` driven by `aria-activedescendant`: arrows (wrap), Home / End,
  type-ahead, Enter / Space; checkboxes when `multiple`, a check on the chosen option otherwise. Inside a FormField
  it takes the field's id, `aria-describedby`, invalid, required and disabled (`useFormFieldControl()`); outside one,
  `aria-label` / `aria-labelledby` on the tag name the control. `placement` and `inline` go to BasicMenu.
- **`EntitySearchPicker`** — async entity search: `fetchFn(search)` → `[{ label, value, secondary? }]` (300 ms
  debounce; `clientFilter` fetches once and filters here), `v-model` + `v-model:displayValue`, `placeholder`,
  `disabled`. The chosen entity is a removable `Tag` (remove → both cleared, `clear`); the list opens in
  BasicMenu's panel: a filter input driving a listbox, `secondary` as the option description. i18n `entity_picker.*`.
  Transition until the sweeps: the `disabled` prop is the old manual-entry fallback (a text field for the value,
  used by the Edit* modals without PIM); a FormField's `disabled` disables the control.
- **`ChannelMultiSelect`** — channel scope chip (`channels` icon): „Kanały: Wszystkie” / „Kanały: 2”; `compact`
  (and every chip below the tablet breakpoint) shows „Kanały”. `v-model` = channel idxs, `channels` =
  `[{ idx, name? }]`, `label`, `allLabel`; the list is a multi-select listbox with checkboxes in BasicMenu's panel.
- The three share `src/boots/BasicSelect/OptionList.vue` (listbox rendering) and `useListbox.js` (keyboard).
  BasicMenu `inline` with a `top` placement draws the list above the trigger (the catalogue's drop-up).
- Removed (lint, `scripts/lint/removed-components/selects.json`): `Dropdown` → `BasicSelect`.
- Codemod `scripts/codemods/p3-selects.mjs` (sweeps 17/18): `Dropdown` → `BasicSelect`, `:values` → `:options`,
  `isDisabled` → `disabled`, `icon` dropped; `:selected="x ? [x] : []"` / `[x]` + an `@onSelect` that only assigns
  x → `v-model="x"` (a method keeps `@update:model-value="method"`); `:selected` alone → `:model-value`. Flags (tag
  left as it is): a handler that does more, a `:selected` that is not one assignable value, a missing `:selected`,
  `validate`, `custom_droplist`, `complex_values`, `can_remove_selected`, `@onUse`, `@onRemoveSelected`,
  `@onExtension*`, options with `label_ext*` in the file, any other attribute.

Catalogue: `#selects` (`#basic-select`, `#entity-search-picker`, `#channel-multi-select`).

### P3 inputs (plan 16)

- **`FormField`** — the only owner of a field's `label`, `description` (hint), `required` (the red `*`), `error`
  (`role="alert"`, replaces the hint) and `tooltip` (a BasicTooltip `help` button after the label); `layout`
  `stacked` · `inline` (label left, control right from 1024 px, stacked below — Figma „Język treści”); `id` fixes the
  control's id, `disabled` disables it. It provides `FORM_FIELD` (`src/composables/formField.js`): `id` (the label's
  `for`), `describedBy` (the hint or error shown), `invalid`, `required`, `disabled`, plus `labelId` for a control a
  `for` cannot name. Of several controls in one field (rows of a `v-for`) only the first takes the field's id.
  Controls read it through `useControlAttrs()` (`src/boots/FormField/useControlAttrs.js`) and
  paint their own error border.
- **`BasicInput`** — `v-model`, `type`, `placeholder`, `icon` (a leading meaning of `icons.js`), `readonly` (the
  value behind a `lock`, the former `LockedField`), `disabled`; `--elem-height`, `border-control`, the polish disabled
  look. No label or error text of its own (the FormField's). `null` / `false` show an empty field, `0` shows „0”.
  `focusOnCreate` focuses it on mount; events `onFocusout` / `onKeyDown` (Enter) carry the text; unknown listeners
  and classes land on the wrapper.
- **`BasicTextarea`** — replaces `TextAreaBasic`: `v-model`, `rows` (4), `maxlength` (with an „n / max” counter),
  `placeholder`, `disabled`, `readonly`.
- **`NumberInput`** — `disabled`; the value field reads the contract.
- **`BasicCheckbox`** — one checkbox: a boolean `v-model`, its label in the default slot, `disabled`. A list of ids
  is `BasicSelect multiple`.
- **`BasicRadioGroup`** — `options` `[{ label, value, disabled? }]`, `v-model`, `name`, `disabled`; native radios in a
  `role="radiogroup"` (one Tab stop, the arrow keys move and select), named by the FormField label.
- **`BasicSwitch`** — replaces `Switcher`: `v-model`, `label`, `hint` (a help tooltip), `disabled`; a
  `role="switch"` button with `aria-checked`, styles scoped to it.
- **`BasicDatePicker`** — an input-looking trigger with the `calendar` icon opens an inline flatpickr; `v-model` (the
  flatpickr date string), `config` (a single date by default, `mode: "range"` for a range), `disabled`; the instance
  is destroyed on unmount. Its label is the FormField's. The trigger's click reaches the document, so other
  popovers close; a click inside the open calendar never closes it.
- **`SegmentedControl`** — contract id and `disabled`, named by the FormField label, `aria-pressed` on the active
  option. **`ColorInput`** — `disabled`, the text field reads the contract, the swatch is the native picker itself
  (named by the FormField label, else „Wybierz kolor”).
- Codemod `scripts/codemods/p3-inputs.mjs` (sweeps 17/18): `Switcher` → `BasicSwitch` (`:selected` + `@onSelect="x =
  !x"` → `v-model`, `prevent` → `disabled`), `TextAreaBasic` → `BasicTextarea` (`limit` → `maxlength`), `LockedField` →
  `BasicInput readonly`, `isDisabled` / `is_disabled` → `disabled` on BasicInput, NumberInput and the textarea, a
  floating `label` → a `FormField` around the control (dropped inside a labelled FormField). It flags other
  `@onSelect` handlers, `validate`, the checkbox array API and the old textarea API. `Switcher`, `TextAreaBasic` and
  `LockedField` are removed components (`removed-components/inputs.json`).

Catalogue: `#inputs` (`#form-field`, `#basic-input`, `#basic-textarea`, `#number-input`, `#basic-checkbox`,
`#basic-radio-group`, `#basic-switch`, `#segmented-control`, `#basic-date-picker`, `#color-input`, `#basic-wysiwyg`).

### P4 shell (plan 21)

In the catalogue and live: `App.vue` mounts `AppHeader`, `SidebarNav` (desktop), `MobileMenu` and `BottomTabBar`
(below the shell breakpoint) and `ShellPageHeader` at the top of `<main>` (plan 22); the old shell is gone.

- **Nav model** — `src/composables/useNav.js`, the one answer to every shell question. `usePanels()` = the
  `access.js` registry × Munin (`isEnabled`), locked panels dropped under `VUE_APP_HIDE_DISABLED_PANELS=TRUE`;
  `navTree(ctx)` = `{ [panelIdx]: entries[] }` through `filterNavRoutes` per panel (`ctx` = `qualityAvailable`,
  `isModuleEnabled`, `isDesktop`); `resolveNavEntry(entries, route)` lights an entry in the order exact path →
  `activeOn` → `meta.navParent` → longest path prefix; `useActiveNav()` = `{ panelIdx, entry, tree }`, the panel from
  `route.meta.panel` (`"home"` on `/`). A detail or create page whose path does not nest under its list sets
  `meta.navParent: "<entry route>"` (9 routes: Points, Forms, Agreements, Atlas, Promo).
- **Breadcrumbs** — `useBreadcrumbs(title?)` → `{ crumbs, backTarget, back }`: panel → entry → the
  `meta.crumbParent` chain (route names, e.g. `EmailTemplateEdit` → `EmailTemplateList`, linked with the params the
  parent takes) → the current page (`title`, else the route's `titleKey`). Nothing on a panel's list (R3); a panel
  root that is also the entry keeps both crumbs. `back()` goes to the last linked crumb: history back when the
  previous entry is that crumb (list filters survive), else a push.
- **Breakpoint** — `SHELL_BREAKPOINT` (1024, `src/utils/breakpoints.js`) = `$breakpoint-shell`; `useIsDesktop`
  reads it. A unit test holds the SCSS and script values together.
- **`AppHeader`** — `<header data-fid="header">`: the wordmark home link (`data-fid="logo"`), then ConfigHealth and
  the bell (conditional; a phone reaches ConfigHealth through the user menu) and `UserMenu`, 12 px apart. The bell
  and ConfigHealth are IconButtons (`notif-bell`, `config-health-button`) that open their lists in BasicMenu's
  `panel` mode. 88 px on desktop, 81 px below the shell breakpoint with a hairline separator
  and the `menu` / `close` IconButton (`aria-expanded`, `aria-controls` = `menuId`, `v-model:menuOpen`). No title,
  no panel switcher (R1, R2). `mobile` forces a layout.
- **`SidebarNav`** — `<nav aria-label="Panele" data-testid="app-sidebar" data-fid="sidebar">`, 300 px, its own
  scroll: "Panele", Home, every panel in registry order. A panel with more than one entry is a
  `SidebarNavGroup` disclosure (`button[aria-expanded][aria-controls]`), one entry is a leaf link, a locked panel is
  dimmed with a lock, unfocusable, "(niedostępny)" for screen readers. The active panel's group opens on
  activation; the others toggle per session. `collapsed` (default: the user store, `cms_sidebar_collapsed`) is the
  64 px rail: icons named by `aria-label` with a BasicTooltip, toggled by the footer IconButton (`aria-expanded`;
  with the `collapsed` prop set it reports `update:collapsed` and writes no preference).
  `flat` is the MobileMenu list (no title, no footer, each panel one link to its root).
- **`SidebarNavItem`** — `label`, `icon` (a FontAwesome glyph of the nav model), `to`, `level` 1 (40 px, Lexend
  16/400) / 2 (32 px, 14/400, 1 px `hairline` rail → `accent` when active), `active` (`aria-current="page"` on a
  link on its own page, `"true"` on a page below it), `locked`, `expanded` (set = a disclosure row, emits `toggle`), `collapsed`. Group rows hover with a
  `surface-hover` pill, links change colour only; the inactive L2 text is `text-secondary` (KD22).
- **`MobileMenu`** — `v-model:open`: a full-screen `role="dialog" aria-modal="true"` below the header with the flat
  SidebarNav (`data-fid="mobile-menu"`); its close button sits over the header's menu button. `useFocusTrap`: focus on
  close, Tab cycles, Esc closes, focus returns to the menu button, the background is inert; a navigation closes it.
  `inline` = open in the page flow without a trap.
- **`BottomTabBar`** — `<nav aria-label="<panel>" data-fid="tab-bar">`, 72 px (= `--bottom-bar-height`): the current
  panel's entries, icon + 12 px label, items ≥ 44 px, the lit one `aria-current`; hidden with ≤ 1 entry and on
  `meta.noBottomBar`. `entries` / `label` / `current` take fixed data (catalogue). No panel has more than 5 phone
  entries (a unit test guards it: there is no overflow design).
- **`UserMenu`** — on BasicMenu (`aria-haspopup="menu"`): the user's name (a BasicMenu `heading` item), the theme
  item naming its target ("Tryb jasny" / "Tryb ciemny"), the languages (`menuitemradio`, the current one
  `aria-checked`; BasicMenu items take `checked`), configuration health (with
  munin), change password, logout (`danger`). Trigger: IconButton `lg` `user`, `data-fid="user-button"`.
- **`BasicLogo`** — `variant="full"` is the "ENTIRIUS CMS" wordmark, `size` its height (32 → 206 × 32, 24 → 154 × 24);
  its gradients belong to the asset (D2), the name turns `text-strong` in the light theme.

Catalogue: `#shell` (`#app-header`, `#sidebar-nav`, `#sidebar-nav-group`, `#sidebar-nav-item`, `#mobile-menu`,
`#bottom-tab-bar`, `#user-menu`, `#basic-logo`).
