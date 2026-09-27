# CMS UI rules

How CMS screens are built. This is the only file that states CMS UI rules: plugin rules, skills, agents and the
other docs point here and do not repeat it. Code is the source of truth. Values live in tokens and components live
in `src/boots/`. This file names them and never restates a value. Lint enforces what it can: run `npm run lint:ui`.

## Sources of truth

| What | Where |
|---|---|
| Tokens (colour, spacing, type, radius, shadow, overlay) | `@entirius/brand-tokens` + `src/assets/tokens/semantic.json` (generated into `src/assets/scss/themes/_semantic.generated.scss`); the scale lists in `src/assets/scss/variables/`, emitted by `main.scss` |
| Components | `src/boots/` + `src/boots/register-elems.js`; API in `docs/ui-components.md`; catalogue page `/ui` (`src/views/UiCatalogue/`) |
| Icons | the meaning registry `src/boots/Icons/icons.js` (`$icons` in templates); glyphs registered in `src/boots/Icons/fa-icons.js` |
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
  (except the hidden `type="file"` picker), `<select>` or `<textarea>`. A click handler sits on a boot or a focusable,
  named element: a click-only `span`/`div` fails `@ux` (`nonFocusable`) unless `tests/visual/ux-allow.json` names the
  plan that removes it. A decorative icon carries no pointer and no handler (`BasicInput`'s icon is `aria-hidden`).
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
| text action · icon-only action · page or dialog actions | `BasicButton` · `IconButton` · `ActionBar` |
| side panel · per-language editing | `SideDrawer` · `TranslationsDrawer` |
| dialog · confirmation (yes/no, unsaved changes) | `BasicModal` · `ConfirmDialog` (`tone="danger"` for a delete) |
| action menu or popover panel · floating action (+ labelled pill) | `BasicMenu` · `FloatingActions` (`pill`) |
| help next to a label · hint on a control | `FormField :tooltip` (else `BasicTooltip variant="help"`) · `BasicTooltip` |

- **C5 One icon set: FontAwesome, picked by meaning.** A template names the meaning, never the glyph:
  `<FontAwesomeIcon :icon="$icons.edit" />` (`src/boots/Icons/icons.js`, keys camelCase). A new meaning adds its glyph
  to `fa-icons.js`, in both the `import` and the `library.add()`: a missing registration renders nothing and logs
  nothing (the registry unit test catches it). Do not use `<i class="icon-*">` font glyphs; `BasicInput icon`,
  `BasicButton icon`, `IconButton icon` and `FloatingActions` icons take a meaning (`icon="search"`); a
  `BasicButton icon` that is no meaning still renders the legacy font until plan 19.
  Icon policy: a text button carries no icon unless the design shows one. An icon-only action is an `IconButton`
  with `label` (its accessible name: `aria-label` and `title`), and it gets a visible text label when it is
  important or not obvious (R7). Un-swept icon-only `BasicButton`s (`custom` slot + `label`) move to `IconButton`
  with `scripts/codemods/p3-actions.mjs`.
- **C6 One button family.** `BasicButton` owns height, padding, type and border: `size="md"` (default,
  `--elem-height`, the toolbar and form size) or `size="sm"` (row actions); labels never wrap. The role is
  `variant`: `primary` (one per page, R5: row, bulk, section and inline-form actions are `secondary` beside it; a
  dialog or drawer has its own), `secondary`, `ghost` (close, row edit), `danger` (every delete, remove, reject),
  `danger-solid` (the destructive confirm in a dialog: a delete, remove or flush is a `ConfirmDialog tone="danger"`;
  every other confirm is its default primary). The label is the default slot. Until the sweeps
  (plans 17, 18) the `btn-*` role classes and `text` still work: the same roles, `btn-outline` = `btn-secondary`,
  `btn-danger-fill` = `danger-solid`. An icon-only action is an `IconButton` (`sm` / `md` like the text button,
  `lg` 40 in the header), `variant` `ghost` · `outline` · `primary` · `danger`, `pressed` for a toggle; an icon-only
  `BasicButton` without `label` warns in the dev console. One toolbar uses one size. Back is always `BackBar` (icon,
  or icon + label), never a `BasicButton`. The click stops at the button; inside a wrapper that acts on the click
  (`SubscriberSetter`) pass `:stop="false"`. An icon-only button is named by its short action (`label`), and that is
  its one tooltip (IconButton draws it as a `BasicTooltip`): no tooltip wrapper on top of it.
  Never pass `bg-*` / `t-*` utilities to pick a role, and never set a button height or font size from a view.

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
  icon-only utilities. Every screen uses the same order: `ActionBar` renders it from the actions' `role`, and on a
  phone takes its own row labelled „Akcje”.
- **R6 One icon, one meaning.** An icon stands for one action across the CMS, and it is never reused for another
  action (reorder `arrows-up-down` ≠ menu `grip` ≠ drag handle `grip-vertical`). Pick the meaning from `$icons`
  (`icons.js`: one glyph per meaning, one meaning per glyph); lint warns on a literal glyph name in `icon="…"` or
  inside an `:icon` binding, and `scripts/codemods/p3-icons.mjs` rewrites it. A meaning that is missing is added to
  `icons.js` (stream 1; a stream-2 plan hands it to plan 19). Tile-group rows use distinct icons for add, reorder and
  preview.
- **R7 Label important actions.** An action that is important, or not obvious from its icon, carries a visible
  text label. A tooltip alone is not enough. Icon-only is reserved for well-known utilities (close, row delete,
  more), and each one is an `IconButton` with its `label`. A labelled action next to the FAB is its `pill`
  (`FloatingActions`, „Zarządzaj kolejnością”); tools that repeat one icon (rich-text table tools) are text buttons.
- **R8 Brand, not generic.** Accent and interactive states use the brand accent tokens (`accent` for text, icons,
  borders and indicators; `accent-fill` with white text for fills). No generic blue, and no panel-specific colours.
  The primary fill is `bg-accent-fill t-on-accent-fill`.
- **R9 Restyle before restructure.** A visual change keeps the structure and behaviour of a screen unless R1–R8
  require a change. Content-builder section blocks, tiles and `DataTable` internals change through tokens only.

## Page patterns

- **Page frame.** The panel wrapper holds a toolbar (`.panel-toolbar`) with `#<panel>-toolbar-left` / `-right`
  anchors, and child views `<Teleport … defer>` into them. Left anchor: back arrow + H1 (R2, R3). Right anchor: actions
  in R5 order. The toolbar styles its children by role, never by position: `.panel-toolbar__actions` on the right
  anchor, `.panel-toolbar__title` on a group around the left anchor (title + channel selector). The page wrapper
  below it pads with `.page-pad`, and its content card scrolls (`flex: 1; min-height: 0; overflow-y: auto`); the
  toolbar never shrinks. A toolbar with nothing in it (no teleported content, no selector or title of the panel's own)
  is hidden by `.panel-toolbar` itself: never an empty strip. P3 replaces this with `PageLayout` + `PageHeader` +
  `ActionBar`.
- **List view.** The toolbar holds a search `BasicInput` with `useSearchDebounce`, then filters in
  `MobileFilterPanel`, and it wraps (`flex-wrap`, `gap: var(--space-5)`). In `DataTable`, secondary columns get fixed
  widths and only the primary text column gets `1fr`, truncated with an ellipsis. A cell either fits (its column
  grows to the badge or buttons) or truncates with a `title`, never spills into its neighbour; a status badge column
  is `max-content`, never truncated; numbers take
  `numeric`, row buttons `actions`, and every column but name, status and actions takes a `priority` so a phone
  shows those three. A raw table uses `.table-basic` in a `.table-scroll` box. No data means `EmptyState`
  (`DataTable` renders it from `emptyText`, below the grid so a phone sees it); never a plain muted paragraph. A table
  inside a detail screen keeps the one-line empty state (`DataTable` default); a list screen whose only content is
  the table passes `empty-size="md"`.
- **Loading.** A screen whose data arrives after first paint shows `<Loader block v-if="loading" />` in the content
  area (`block` centres it; a loader in a modal, side panel or button stays inline, without `block`), and actions that need the data (Save, Delete) render only after the load. The empty
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
- **Dialogs.** Build on `BasicModal` (`size` sm · md · lg) or `ConfirmDialog`, never an overlay of the view's own:
  they trap focus, close on Esc and give focus back, and turn into a bottom sheet on a phone. Actions go in the
  footer as an `ActionBar` (R5). A dialog with an async action closes on success and on error.
- **Locked / system entity.** Show a notice bar at the top. Pass the disabled prop of each boot (`Dropdown
  :isDisabled`, `Switcher :prevent`, `BasicButton` / `BasicInput :isDisabled`), or show the value as read-only text.
  Disabled `BasicInput` and `Dropdown` share one look (`--surface-disabled`, `--border-subtle`, muted text).
  Hide delete. Save stays for the fields that are not locked.
- **Disabled button with a reason.** Wrap the disabled `BasicButton` in `BasicTooltip` carrying the reason (the
  wrapper becomes the tab stop, so the reason reads on keyboard focus too), and put the live button in the `v-else`
  branch.
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
- `.page-card` pads 16 px below tablet, and so does the page wrapper (`.page-pad`, `.page-pad-x` for the sides
  only). Spacing utilities (`p-12` …) mean the same on every screen; an empty state or loader keeps its own. The
  layout keeps every scroll region above the bottom bar.
- A tap target is at least 40 × 40 px on mobile, and list rows are at least 36 px high. A small control keeps its
  visual and takes the `touch-target` mixin (`utils/_touch-target.scss`): a transparent `::after` hit area, below
  tablet only. Hit areas never overlap: where a neighbour is closer, the area is the control plus half the gap on
  each side (the help "?" above its field, wrapped filter chips, table rows).
- A control in a scrolling box (`BasicTabs`, `SegmentedControl`) draws its focus ring inside (`outline-offset:
  -2px`), so the box never clips it.
- A button with icon + text drops its text on mobile via `icon-only-mobile`. It keeps an accessible label. The page's
  primary actions (Save, Publish, Approve) keep their text (R7).
- Fixed-bottom elements sit above `var(--bottom-bar-height)`.

## Copy

- Every visible string goes through `$t()`, with keys in both `src/i18n/locales/en.json` and `pl.json`. There is
  no `$tc`: format counts into the string.
- A loading message starts with "Ładowanie" / "Loading" and ends in an ellipsis ("Ładowanie…"); a permanent label
  never does. The visual harness waits on exactly that shape before it captures a screen (`docs/testing.md`).
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
5. `npm run visual:ux` is green: no `high` finding outside `tests/visual/ux-allow.json`, and an entry you add names
   its owning plan.
6. A boot you added or changed has its cells on `/ui` and `npm run visual:catalogue` is green.
