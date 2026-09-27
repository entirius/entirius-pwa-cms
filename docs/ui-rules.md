# CMS UI rules

How CMS screens are built. This is the only file that states CMS UI rules: plugin rules, skills, agents and the
other docs point here and do not repeat it. Code is the source of truth. Values live in tokens and components live
in `src/boots/`. This file names them and never restates a value. Lint enforces what it can: run `npm run lint:ui`.

## Sources of truth

| What | Where |
|---|---|
| Tokens (colour, spacing, type, radius, shadow, overlay) | `@entirius/brand-tokens` + `src/assets/tokens/semantic.json` (generated into `src/assets/scss/themes/_semantic.generated.scss`); the scale lists in `src/assets/scss/variables/`, emitted by `main.scss` |
| Components | `src/boots/` + `src/boots/register-elems.js`; API in `docs/ui-components.md`; catalogue page (P3) |
| Icons | FontAwesome, registered in `src/boots/Icons/fa-icons.js` (P3: the `icons.js` meaning registry) |
| Breakpoints | `src/assets/scss/utils/_media-query.scss` (mixins `max-tablet`, `min-tablet`, `max-desktop`, `min-desktop`) |
| Lint | `stylelint.config.mjs` (T rules), `eslint.config.mjs` (C rules) |
| Design reference | Figma snapshot, frozen (see § Designs) |

## Tokens

Two layers: `@entirius/brand-tokens` (`--brand-*`, never used directly in views) and the CMS semantic layer on top
of it. The semantic source is `src/assets/tokens/semantic.json`: its `color`, `overlay`, `shadow` and `type` groups
are generated into `themes/_semantic.generated.scss` (`node scripts/tokens/build-theme.mjs`, a unit test fails when it
is stale; never edit the output by hand). Its `space`, `radius`, `font-size` and `font` groups name the scales that
`main.scss` emits from the lists in `src/assets/scss/variables/`; the parity check (`@parity`) holds both to the same
values.

- **T1 Colour comes from a semantic token.** Use `var(--surface-*)`, `--text-*`, `--border-*`, `--focus-ring`,
  `--accent*`, `--positive*`, `--negative*`, `--warning*`, `--info*`, or the classes the map names: `bg-*` (surfaces),
  `t-*` (text), `b-*` / `bt-*` / `bb-*` / `bl-*` / `br-*` (borders), all three for accent and status, most with a
  `-hover` variant (`t-accent-hover`, `bg-accent-hover`, `b-accent-hover` are the `accent-hover` token itself). Pick the token by the role the map gives it, never by a number. No hex, `rgb()`, `rgba()`,
  `hsl()` or named colours outside the token files. Form fields (input, select, textarea, checkbox, radio) sit on
  `surface-sunken` with a `border-control` edge. On `accent-subtle` text is `text-strong` or `text-body`, never
  `text-accent` or `text-muted`; on `accent-fill` it is `text-on-accent-fill`.
- **T2 No fallback on a token.** `var(--text-body, #fff)` hides a missing token in one theme. Every `var()` names a
  token that exists (brand, semantic, a scale below, or one declared in the same file); lint flags unknown ones.
- **T3 Spacing comes from `--space-*`.** The brand steps on the 4 px grid: `--space-0`, `-1` (4 px), `-2`, `-3`, `-4`,
  `-5`, `-6`, `-8`, `-10`, `-12`, `-16`, `-30` (120 px); the step number times 4 is the px value. Classes use the same
  numbers: `p-*`, `pt-*` / `pr-*` / `pb-*` / `pl-*`, `pv-*` / `ph-*`, `m-*` and its sides and axes, `gap-*`. Margin,
  padding and gap never take raw px or rem. The one exception is a 1–3 px hairline alignment (border compensation, a
  focus offset, an icon nudge), which stays raw. When no step fits, ask for a token.
- **T4 Radius comes from `--radius-*`.** `--radius-base` (4 px), `-lg`, `-xl`, `-2xl`, `-3xl`, `-4xl`, `-full`, or the
  classes `rounded` (base), `rounded-lg` … `rounded-full` and the corner variants `rounded-tl` / `rounded-tr`. Radius
  never comes from the spacing scale. `br-` is the border-right prefix of T1 and never a radius.
- **T5 Type comes from a type role.** New text uses a `type-*` class (the map's `type` group: family, weight, size,
  line height, tracking). Sizes outside a role use `--fs-*` or the `fs-*` classes: `100` (10 px), `150` (11), `200`
  (12), `250` (13), `300` (14), `400` (16), `500` (20), `600` (24), `700` (30). Weights are `fw-300` … `fw-600`: Inter
  carries 300–600, Lexend Deca 300 and 400. Font families are `--font-ui` (Inter, body and controls), `--font-brand`
  (Lexend Deca, titles and navigation) and `--font-mono`. Shadow and overlay come from `--shadow-sm`, `-md`, `-lg`,
  `-down` (plus the CMS-local `-arrow` / `-right` / `-left` / `-top` / `-around`) and `--overlay-backdrop`, `-heavy`,
  `-loading`, `-handy`, `-ripple`. The page `<h1>` carries `.page-title` (`typo/_typo.scss`: `--font-brand`,
  `--fs-700`, 400), so a view never sizes or weighs it; content H1s (rich text, previews, docs) are not page titles and
  keep the browser look; section titles stay Inter 600 one step
  down. Text that carries meaning is at least 12 px (`--fs-200`); 10–11 px is for decorative counters only (a badge
  count on a tab, chip, bell or filter button).
- **T6 Every screen works in both themes.** `data-theme` on `<html>` is `default` (light) or `dark`. A screen that
  follows T1 is themed for free. Scope third-party dark overrides as `[data-theme="dark"] .x { }`.

Removed in P2, and lint fails on them: the old palette (`--c-*` and its `t-` / `bg-` / `b-`… `<colour>-<shade>`
classes), the old spacing steps (`--space-50` … `--space-700` and `p-100`-style classes with their `-m` / `-d`
variants), `--radius-sm` / `--radius-md`, the radius classes `br-<n>`, `br-tl-<n>`, `radius-<name>` and
`br-<radius name>`, `--fs-800` … `--fs-1000`, `fw-100` and `fw-700`.

Traps:
- `ph-*` / `pv-*` are shorthands, and they reset the other two sides. Use `pl-*` + `pr-*` when you also set a vertical side.
- Utility grid classes apply only from 640 px up. Below that, use flex.
- Inputs, selects, number and colour inputs and buttons share `--elem-height` (32 px), so never override it on one of them.

## Components

- **C1 Build UI from boots.** Views, `src/components/` and `src/functionals/` use no raw `<button>`, `<input>`
  (except the hidden `type="file"` picker), `<select>` or `<textarea>`.
- **C2 One component, one implementation.** Before writing a component, check `src/boots/` and `src/functionals/`.
  If one does most of the job, extend it with a prop or variant. If it is broken, fix it in place. Never make a
  panel-local copy (`PimDataTable`, `ld-btn`). New shared UI goes into `src/boots/` + `register-elems.js`. Builder
  controllers also register in `src/configs/builder/components/register-elems.js`. `eslint.config.mjs` lists removed
  components with their replacements.
- **C3 Do not restyle a boot from outside.** No local `.filter-chip`, `.status-badge` or badge and button class
  families. A missing look is a variant of the boot.
- **C4 Pick the boot by job:**

| Job | Boot |
|---|---|
| text / colour / number / rich text | `BasicInput` / `ColorInput` / `NumberInput` / `BasicWysiwyg` |
| on/off setting · item in a checklist | `Switcher` · `BasicCheckbox` |
| choice from a list · async entity search · channel scope | `Dropdown` · `EntitySearchPicker` · `ChannelMultiSelect` |
| form field wrapper (label, hint, required, error) | `FormField`, around every field |
| status / category pill | `StatusBadge` |
| filter toggle · mode switch (list / edit) | `FilterChip` inside `MobileFilterPanel` · `SegmentedControl` (never a pair of chips) |
| list · bulk actions · empty list | `DataTable` · `BulkActionBar` · `EmptyState` |
| side panel · per-language editing | `SideDrawer` · `TranslationsDrawer` |
| confirmation · floating action | `Confirmation-modal` (`src/functionals/`) · `FloatingActions` |
| help next to a label | `FormField :tooltip` |

- **C5 One icon set: FontAwesome.** Register every icon in `fa-icons.js`, in both the `import` and the
  `library.add()`. A missing registration fails silently. Do not use `<i class="icon-*">` font glyphs.
  `BasicButton icon="…"` still renders the legacy font, so an icon the font lacks renders blank (`trash-can`, `xmark`,
  `pencil`). Until P3 moves BasicButton to FontAwesome, put `<FontAwesomeIcon>` into its `custom` slot.
  Icon policy: a text button carries no icon unless the design shows one. An icon-only action has an accessible
  name (`aria-label` or `title`), and it gets a visible text label when it is important or not obvious (R7). Until
  P3 ships `IconButton`, an icon-only `BasicButton` puts `<FontAwesomeIcon>` into its `custom` slot and names itself
  with `label` (sets `aria-label` and `title`).
- **C6 One button family.** `BasicButton` owns height, padding, type and border: `size="md"` (default,
  `--elem-height`, the toolbar and form size) or `size="sm"` (row actions); labels never wrap. The role is a class:
  `btn-primary` (one per page, R5), `btn-secondary` (`btn-outline` is the same look), `btn-ghost` (back, close, row
  edit), `btn-danger` (every delete, remove, reject), `btn-danger-fill` (the destructive confirm in a dialog). A
  button without `text` is icon-only: a square of its size, `label` required. Never pass `bg-*` / `t-*` utilities to
  pick a role, and never set a button height or font size from a view.

## Layout (R1–R9)

- **R1 Navigation on the left.** Every panel and every sub-page can be reached from the persistent left sidebar.
  The header has no panel switcher. To add a page, add its entry to `src/components/Navigation/nav-routes.js`. Never
  hard-code a menu in a view.
- **R2 One page title.** The page title appears once, as the only `<h1>`, at the top of the content area. The
  header, sidebar and toolbar never repeat it. The content area is the page's only scroll and focus region.
- **R3 Breadcrumbs below the panel root.** Every page below a panel's top-level list shows breadcrumbs
  (`Panel / List / Item`) above the H1, with a back arrow next to the H1. A panel's top-level list has neither.
- **R4 Space, not lines.** Header regions and page sections are separated by spacing tokens, never by divider
  lines (`bb-*`, a `border-bottom` under a header or toolbar, `<hr>`). Borders belong to containers: cards, section
  blocks, tables and inputs.
- **R5 Action order.** Page and dialog actions are right-aligned and ordered by importance from the right. The
  primary action (accent fill, one per page or dialog) is rightmost, the secondary (outline) comes next, then the
  icon-only utilities. Every screen uses the same order.
- **R6 One icon, one meaning.** An icon stands for one action across the CMS, and it is never reused for another
  action (reorder ≠ menu). Use the icon other screens already use for that action (P3: pick it from `icons.js`).
  Tile-group rows use distinct icons for add, reorder and preview.
- **R7 Label important actions.** An action that is important, or not obvious from its icon, carries a visible
  text label. A tooltip alone is not enough. Icon-only is reserved for well-known utilities (close, row delete,
  more), and each one still gets an accessible label.
- **R8 Brand, not generic.** Accent and interactive states use the brand accent tokens (`accent` for text, icons,
  borders and indicators; `accent-fill` with white text for fills). No generic blue, and no panel-specific colours.
  The primary fill is `bg-accent-fill t-on-accent-fill`.
- **R9 Restyle before restructure.** A visual change keeps the structure and behaviour of a screen unless R1–R8
  require a change. Content-builder section blocks, tiles and `DataTable` internals change through tokens only.

## Page patterns

- **Page frame.** The panel wrapper holds a toolbar (`.panel-toolbar`) with `#<panel>-toolbar-left` / `-right`
  anchors, and child views `<Teleport … defer>` into them. Left anchor: back arrow + H1 (R2, R3). Right anchor: actions
  in R5 order. The content card below it scrolls (`flex: 1; min-height: 0; overflow-y: auto`), and the toolbar never
  shrinks. P3 replaces this with `PageLayout` + `PageHeader` + `ActionBar`.
- **List view.** The toolbar holds a search `BasicInput` with `useSearchDebounce`, then filters in
  `MobileFilterPanel`, and it wraps (`flex-wrap`, `gap: var(--space-5)`). In `DataTable`, secondary columns get fixed
  widths and only the primary text column gets `1fr`, truncated with an ellipsis. A cell either fits (its column
  grows to the badge or buttons) or truncates with a `title`, never spills into its neighbour; numbers take
  `numeric`, row buttons `actions`, and every column but name, status and actions takes a `priority` so a phone
  shows those three. A raw table uses `.table-basic` in a `.table-scroll` box. No data means `EmptyState`
  (`DataTable` renders it from `emptyText`, below the grid so a phone sees it); never a plain muted paragraph.
- **Loading.** A screen whose data arrives after first paint shows `<Loader v-if="loading" />` in the content area
  (the boot centres itself), and actions that need the data (Save, Delete) render only after the load. The empty
  state comes after the load, never during it. A record that answers 404 shows `EmptyState` with a way back, not a
  blank form.
- **Values.** Show a stored value in the unit people read (a tax rate fraction `0.2300` is "23 %",
  `src/utils/taxRate.js`); a field takes the same unit and converts on save. Dates and times go through `formatDate`
  (`src/utils/format.js`), never raw ISO. A select in an edit form shows the stored value even when the loaded
  options lack it (`withStoredOption`, `src/utils/options.js`).
- **Edit view.** A `FormField` wraps every field, validation follows § Forms, and there is one primary Save (R5).
  A dirty form shows the unsaved state next to the actions. Rhythm: 16 px (`--space-4`) between fields, 24 px
  (`--space-6`) between groups, 32 px (`--space-8`) between cards.
- **Cards.** `.page-card` (`utils/_decorators.scss`) is the one card, for the page card and for a section card
  inside it: `surface-base`, `border-subtle`, `--radius-3xl`, 24 px padding, 16 px below tablet. A view never sets
  its own card padding, border or radius.
- **Dialogs.** Build on `Confirmation-modal` or a `src/functionals/` modal, never inline in a view. Width:
  `min-width: min(400px, 95vw)`. A dialog with an async action closes on success and on error.
- **Locked / system entity.** Show a notice bar at the top. Pass the disabled prop of each boot (`Dropdown
  :isDisabled`, `Switcher :prevent`, `BasicButton` / `BasicInput :isDisabled`), or show the value as read-only text.
  Disabled `BasicInput` and `Dropdown` share one look (`--surface-disabled`, `--border-subtle`, muted text).
  Hide delete. Save stays for the fields that are not locked.
- **Disabled button with a reason.** Wrap the disabled `BasicButton` in `ToolTip :is_wrapper="true"` carrying the
  reason, and put the live button in the `v-else` branch.
- **Delete.** Use an icon-only `btn-danger` button with the `trash-can` icon, followed by a confirmation. Never a text "Delete" button.
- **Drag and drop.** Use `vuedraggable` with `:force-fallback="true"` and `fallback-class="drag-ghost"`. The ghost
  style goes in an unscoped `<style>`, because the clone is appended to `<body>`.

## Forms

- Create `useFormErrors()` in `setup()` and return it as `formErrors`.
- `BasicInput` and `Dropdown` both take `:validate="formErrors.getFieldError('field')"`. `FormField :required` marks
  required fields.
- One label style: `FormField` (and the `label` prop of `BasicInput` / `LockedField`) renders `.field-label` —
  12 px / 600, uppercase, `text-muted`, 4 px above the control. A raw `<label>` takes `.field-label`; never a local
  copy of the style. The required marker is the `.required` class (a `negative` `*` after the label), never a `*`
  typed into the text.
- Run `validateRequired(form, rules)` before the request, and `formErrors.handleApiError(err)` in `catch`, before
  the toast.
- A deep watcher on the form clears the errors when the user edits. Never show a generic toast only.

## Mobile

- Breakpoints come from the mixins, never from raw media queries. Check every screen at 390 px (one thumb) and on
  desktop. The page never scrolls horizontally, and neither does a card: a wide table (`DataTable`, or a raw table in
  an `overflow-x: auto` box), `BasicTabs` and `SegmentedControl` scroll inside their own box.
- Rows wrap instead of overflowing, through the shared classes (`utils/_panel-toolbar.scss`): `.panel-toolbar` for the
  panel strip, `.page-title-row` for an in-card back arrow + H1 + `ml-auto` actions, `.section-head` for an `h2` with
  its controls. Wrapped actions stay right-aligned (R5). Other rows use `.flex-wrap` (with `.rg-*` for the row gap);
  form rows stack to one column below tablet.
- `.page-card` pads 16 px below tablet, and so does the page wrapper (`p-12`, `pl-12` …); the layout keeps every
  scroll region above the bottom bar.
- A tap target is at least 24 × 24 px, and list rows are at least 36 px high. A small glyph gets a larger hit area
  (padding or a pseudo-element), not a larger visual.
- A button with icon + text drops its text on mobile via `icon-only-mobile`. It keeps an accessible label. The page's
  primary actions (Save, Publish, Approve) keep their text (R7).
- Fixed-bottom elements sit above `var(--bottom-bar-height)`.

## Copy

- Every visible string goes through `$t()`, with keys in both `src/i18n/locales/en.json` and `pl.json`. There is
  no `$tc`: format counts into the string.
- Polish copy uses full diacritics (`ą ę ć ł ń ó ś ź ż`). Labels on actions are verbs ("Zapisz szkic").

## Designs

Figma file `jimkqs9e4FejL8MzIv3mq1`, frozen at version `2401775257004070120`, is the layout and structure reference
for the 2026 redesign only. Values never come from Figma. Map every Figma value to the nearest token, or ask for a
token when none fits. The fidelity harness keeps the list of decided differences. A screen without a design is built
from this file and the catalogue page. The designer updates Figma afterwards, and that update is never a blocker.

## Before merge

1. `npm run lint:ui` adds no warning in the files you touched.
2. `npm run test:unit` and `npm run test:smoke` pass.
3. You checked the screen in both themes, at 390 px and on desktop.
4. The fidelity check is green for the screens you touched (P1).
