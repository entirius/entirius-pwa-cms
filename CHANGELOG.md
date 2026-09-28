# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- Accessibility baseline of the shell (P4 plan 22): landmarks (`header`, the "Panele" sidebar `nav`, `main#main`, the
  tab-bar `nav`, the breadcrumb `nav`), a skip link („Przejdź do treści”), `<html lang>` from the UI language,
  focus to `<main>` after a path change (not a query change), `document.title` = `<page> · <panel> · Entirius CMS`,
  the `focus-ring` token on every shell control, sidebar transitions off under `prefers-reduced-motion`. Visual
  `@a11y` (`tests/visual/a11y.spec.js`): axe with no serious/critical violation on Home, a list and a detail at both
  viewports, and the keyboard script (skip link, sidebar group, mobile menu trap and Esc).

- Navigation model and shell components (P4 plan 21, not wired into `App.vue` yet): `src/composables/useNav.js`
  (`usePanels`, `navTree`, `resolveNavEntry` exact → `activeOn` → `navParent` → prefix, `useActiveNav`,
  `useBreadcrumbs` with `crumbParent` chains and a history-aware back target), `meta.navParent` on 9 detail/create
  routes, `meta.crumbParent` on the two template editors, `SHELL_BREAKPOINT` read by `useIsDesktop`. New boots
  `AppHeader`, `SidebarNav` (+ `SidebarNavGroup`, `SidebarNavItem`: disclosure groups, leaf panels, locked panels,
  64 px rail), `MobileMenu` (focus-trapped dialog), `BottomTabBar`, `UserMenu` (on BasicMenu, which gains `heading`
  items); `BasicLogo` draws the "ENTIRIUS CMS" wordmark. Catalogue `#shell` shows every cell; the theme item reads
  "Tryb jasny" / "Tryb ciemny".

- Input components (P3 plan 16): `FormField` owns label, hint, required marker, error and help tooltip, lays out
  `stacked` or `inline`, and provides the control contract (id, `aria-describedby`, `aria-invalid`, required,
  disabled); `BasicInput` gains `readonly` and a leading meaning icon; new `BasicTextarea` (counter), `BasicSwitch`
  (`role="switch"`) and `BasicRadioGroup`; `BasicCheckbox` takes a boolean `v-model`; every control takes `disabled`.
  `BasicDatePicker` destroys its flatpickr on unmount and has an input-style trigger with `v-model`. Catalogue
  `#inputs` shows every cell; `scripts/codemods/p3-inputs.mjs` moves the call sites in the sweeps.

- Page frame components (P3 plan 14): `PageLayout` (borderless content region, scroll body, `header` / `toolbar`
  slots), `PageHeader` (the one H1, overline, crumbs, back arrow, `meta` chips, ActionBar `actions`, mobile `sticky`
  head; claims the shell's header slot through `src/composables/pageHeader.js`) and `Breadcrumbs` (`aria-current`
  trail, 16 / 12 px). Catalogue `#page-frame` shows every cell. `BackBar` is a removed component: its 36 call sites
  are an `IconButton` `back` or, with a label, a ghost `BasicButton` `back` (same handler, `v-if`, class and test id).

- Display components (P3 plan 13): `StatusBadge` `tone` (positive, negative, warning, info, neutral, accent), `dot`
  and `size` in the badge type role (`variant` stays an alias); new `CountBadge` (999+), `Tag` (removable value chip),
  `BasicCard` (the polish card with title and actions), `PanelCard` (Home panel tile, locked state) and `MediaTile`
  (media grid tile, selected state). `BasicTabs` is a keyboard tablist; `Loader` takes `size` and an `overlay` that
  replaces `Loading.vue`; `Pagination` takes `v-model:page` + `pages`; `EmptyState` takes a meaning icon; tab, filter
  chip and filter-trigger counts are CountBadges. Catalogue `#display` shows every cell;
  `scripts/codemods/p3-display.mjs` moves `.chip` and `<Loading>` call sites in the sweeps.
- Select components (P3 plan 15): new `BasicSelect` (`v-model` value or array with `multiple`, `searchable`,
  `clearable`, option descriptions; a keyboard combobox whose listbox opens in BasicMenu's panel, FormField contract);
  `EntitySearchPicker` and `ChannelMultiSelect` run on BasicMenu with the same listbox (the picker shows its value as
  a `Tag`, the chip reads „Kanały: 2” and has a `compact` form). BasicMenu `inline` draws a `top` placement above the
  trigger. Catalogue `#selects`; `scripts/codemods/p3-selects.mjs` moves `Dropdown` call sites in the sweeps and
  `Dropdown` is a removed component. `p3-actions` counts legacy `txt-*` / numbered colour classes as colours.
- Overlay components (P3 plan 12): `BasicModal` (sizes, footer ActionBar, bottom sheet on a phone), `ConfirmDialog`
  (`tone`, `loading`, unsaved-changes discard), `BasicMenu` (keyboard menu or panel, `@floating-ui/dom`
  positioning), `BasicTooltip` (hover and focus, `help` variant) and `useFocusTrap`: every dialog traps focus,
  closes on Esc and gives focus back. SideDrawer traps focus in focused mode and closes on Esc in both modes;
  TranslationsDrawer's footer is an ActionBar; IconButton shows its label as a BasicTooltip. The eight shared modals
  in `src/functionals/` run on BasicModal / ConfirmDialog (Confirmation-modal and Unsaved-changes-modal as thin
  wrappers); catalogue `#overlays`; `scripts/codemods/p3-overlays.mjs` moves the call sites in the sweeps.
- Display components (P3 plan 13): `StatusBadge` `tone` (positive, negative, warning, info, neutral, accent), `dot`
  and `size` in the badge type role (`variant` stays an alias); new `CountBadge` (999+), `Tag` (removable value chip),
  `BasicCard` (the polish card with title and actions), `PanelCard` (Home panel tile, locked state) and `MediaTile`
  (media grid tile, selected state). `BasicTabs` is a keyboard tablist; `Loader` takes `size` and an `overlay` that
  replaces `Loading.vue`; `Pagination` takes `v-model:page` + `pages`; `EmptyState` takes a meaning icon; tab, filter
  chip and filter-trigger counts are CountBadges. Catalogue `#display` shows every cell;
  `scripts/codemods/p3-display.mjs` moves `.chip` and `<Loading>` call sites in the sweeps.

- Action components (P3 plan 11): `BasicButton` `variant` (primary, secondary, ghost, danger, danger-solid), meaning
  `icon`, `loading`, `disabled`, label in the default slot; new `IconButton` (every icon-only action, `label`
  required, `pressed` toggle) and `ActionBar` (R5 order, „Akcje” row on a phone); `FloatingActions` `pill` (labelled
  action next to the FAB, R7) and meaning icons; `BulkActionBar` actions take `variant`. Catalogue `#actions` shows
  every cell; `scripts/codemods/p3-actions.mjs` moves the call sites in the sweeps.

- Component catalogue `/ui` (any logged-in operator, in no nav): every component from static fixtures, one section
  per P3/P4 plan, `?theme=dark|light`; visual layers `@catalogue` (`npm run visual:catalogue`) and `@components`
  (`npm run visual:components`, baselines via `visual:approve:components`).
- Icon meaning registry `src/boots/Icons/icons.js` (`$icons` in templates): one glyph per meaning; lint warns on a
  literal glyph name (R6) and `scripts/codemods/p3-icons.mjs` rewrites it. The legacy font glyphs in views, kits and
  builder controllers, `BasicInput icon` and Pagination use the registry; the builder reorder buttons show the reorder
  glyph instead of the menu grid.
- P3 plan slots: per-plan blocks in `register-elems.js` and `docs/ui-components.md`, removed-component lists in
  `scripts/lint/removed-components/`, the codemod library (`scripts/codemods/p3-lib.mjs`, sweep partitions) and the
  FormField control contract `src/composables/formField.js`.
- UI rules in `docs/ui-rules.md` and `npm run lint:ui` (stylelint + eslint, warnings = debt).
- Visual fidelity harness in `tests/visual/` (`npm run visual`): token parity, Figma landmarks report and screen
  regression over the 106-screen capture spec; baselines are approved by the operator (`docs/testing.md`).
- **Leads desktop screens** (plan 14, ≥ 1024 px, "Open on a desktop" below): stage board with drag-and-drop
  and a stage select per card, type / do-not-contact / search filters and rule badges; company card with
  overview, intel (lighthouse score per strategy, audit sources), contacts and timeline tabs plus Communicate,
  Re-audit, Mark do not contact and Create customer (only for `won` with `accounts` installed); CSV import with
  the batch report; stages admin with drag or up/down reorder, inline rename and the delete refusal inline.
  On a phone the company thread says stage, Communicate and do-not-contact are available on desktop.
  A company linked to a shop customer carries a "Known customer" badge linking to the customer; a scheduled
  mail past the send beat says the send window or the daily cap holds it (Inbox and timeline).
- **Communicator panel** (`/communicator/*`, munin key `communicator`): templates list and edit (model list,
  validated JSON schema, versions drawer, test generate without saving), sequences with the follow-up text
  pool, send settings (policy windows and cap, channel mode with the sandbox mailbox rule and the live gate text,
  suppressions, waiting messages with Send now that only reschedules).
- **Leads panel** (`/leads/inbox`, `/leads/inbox/:id`, `/leads/companies/:id`; munin keys `leads`,
  `communicator`): mobile-first Inbox and one-draft Review (Send / Not now docked in thumb reach, swipe with
  button fallback, "more" menu with rewrite-with-note, edit, skip company; "Scheduled HH:MM" after Send; empty
  queue says how many are scheduled and when the next goes out), a company thread as one chat timeline over
  every thread of the company (messages, replies, follow-ups, activity notes, opt-out confirm) with a collapsible intel card, and a
  two-column layout at ≥ 1024 px. Channel from `VUE_APP_LEADS_CHANNEL` (default `default-europe`).
- **Toolbox teaser** on Review and the company thread, driven by munin `platform.toolbox_status`:
  `unconfigured` disables AI actions under one "available with the Entirius AI Toolbox" banner, `unreachable`
  keeps them enabled with an inline error.
- **Notification bar** in the header (django-notifications): unread badge polled every 30 s while logged in
  and the tab is visible, list as a bottom sheet (thumb reach on a phone), one tap marks read and jumps to the subject (`src/utils/subjectRef.js`).
- **Optional SSO login** (login wall + `/sso/callback`): with
  `VUE_APP_SSO_API_BASE` set, the login wall offers "Log in with SSO". The CMS
  asks the backend for the provider's authorization URL, keeps the one-time
  `state` in `sessionStorage`, and on return exchanges the code for the same
  token pair the password login returns. Refresh and logout are unchanged. The
  CMS knows no identity provider, only two backend endpoints; contract in
  `docs/sso-login.md`. Unset, nothing changes.

### Changed

- P5 PriceFighter (plan 41): the four raw tables are `DataTable`s: the observations of a gap row and of a history
  entry (one panel-local `ObservationsTable`), the apply preview and the apply report (now with column headers, both
  dialogs `lg`). The market cell of every PriceFighter table is one panel-local `MarketCell`: country · currency, and
  the channel on its own muted line that never truncates, so rows that differ only by channel stay apart, on a phone
  too (the market column is no longer hidden there). The strategy rule modal is a `BasicModal` with the rule form on
  a `.form-grid` (the scope value is marked required) and an `ActionBar` footer: Delete (danger utility, opens the
  same `ConfirmDialog`), Cancel, Save. The gap table and the decision history have their H1 in a `PageHeader`, their
  filters in the `PageLayout` toolbar (the gap table's channel, recommendation and competitor-only filters in a
  `MobileFilterPanel`) and their pagination in the list footer. The apply calls, payloads and confirmation are
  unchanged. Smoke spec `tests/e2e/p5-pricefighter-smoke.spec.js`.

- P5 PriceManager (plan 39): the Pricing panel toolbar is gone. The channel selector sits in the PageHeader `meta` of
  the prices list and the price detail (one panel-local `PmChannelSelect`), and every list has its H1. Save all with
  its unsaved count, Sync from PIM, and each detail's Save and Delete are in PageHeader `ActionBar`s. The price
  detail's Save, the countries and history toggles, and the two danger actions moved from a row under the form into
  its header (under the form when the detail is embedded in the PIM product tab). The price, tax class and channel
  details follow the detail-form pattern: `BasicCard` sections with a `.form-grid`, the calculated price is a
  read-only `BasicInput`, and the tax rate fields are labelled `FormField`s with the same percent rules. The promo
  dates are `BasicDatePicker`s in the detail and in the price rows, where the table box grows while a calendar is
  open. The rows' "Show countries" control is a small `IconButton` toggle. SKU, channel IDX and tax class IDX cells
  are links, which closes the two plan-39 `nonFocusable` allow-list entries. Pagination sits in the list footer.
  Smoke spec `tests/e2e/p5-price-manager-smoke.spec.js`.

- P5 ContactForms (plan 37): the lead and booking detail cards are `BasicCard`s (the view-local `cf-card` is gone).
  The lead's status badge sits beside the title (PageHeader `meta`), and the unsaved badge, the transitions
  `BasicSelect`, Mark as Won and Save sit in the PageHeader, with the same transition call and the same deal-value
  dialog before "won". The dialog's buttons are its `ActionBar`. Open lead moved into the booking's PageHeader. The
  submission's attachment download is an outline `IconButton` `download` named by `cf.download_attachment` + the file name. The bookings date
  filters are `BasicDatePicker`s in inline `FormField`s with a clear button, and the lead status filter of both
  lists is an inline `FilterChip` row (no filter panel). Pagination sits in the footer of the three lists, and the
  Forms panel toolbar is gone. Smoke spec `tests/e2e/p5-contact-forms-smoke.spec.js`.

- P5 Authors (plan 35): the content editor's Authors and Co-authors fields are `EntitySearchPicker`s inside
  `FormField`s — a picked author joins the list, the list is removable `Tag`s you can drag to reorder, an author
  already in either list is not offered again; the save payload (`author_uids`, `co_author_uids`) is unchanged. The
  view-local `views/Authors/AuthorPicker.vue` is deleted. The author form follows the detail-form pattern: Basic
  info, Translations (per-field translate `IconButton`), Contact and Social profiles are `BasicCard` sections with a
  `.form-grid`; Save, danger Delete, the unsaved badge and the Active switch sit in the PageHeader; the reassign
  select of the delete dialog is a `FormField`; the photo preview is no longer a click-only target (the Select /
  Edit button opens the gallery). The authors list keeps its filter panel in the page toolbar, shows the
  "not available" state as an `EmptyState` and its pagination in the footer; the Authors panel toolbar is gone.
  Smoke spec `tests/e2e/p5-authors-smoke.spec.js`.
- Auth screens, Enrichment lists, Docs and the lookup/notification components on the P3 components (P5 plan 32):
  login, forgot-password, password change and reset are `<form>`s (Enter submits), each password field has a
  „Pokaż hasło” `IconButton` toggle inside the field, the links are `ghost` buttons and the titles balance their
  lines; the task-queue drawer's SKU and pager, the lookup open, photo and remove controls and the toast close are
  boots; the spawn-rule edit actions are an `ActionBar` in R5 order (delete · run · save) shown after the rule
  loaded; Docs sits in `PageLayout` with a „Dokumentacja” `PageHeader` and its example cards show key and value.
  Read-only smoke `tests/e2e/p5-pilot-b-smoke.spec.js`.
- P5 Stock (plan 38): the stock screen sits in the page frame — a „Stocks” `PageHeader` whose actions row holds the
  warehouse picker (select, source badge, last sync), the unsaved `StatusBadge` and an `ActionBar` (Import CSV ·
  Save All); the Stock panel toolbar and its teleport target are gone. The warehouse table and the product's stock
  tab in PIM are `DataTable`s with a labelled `NumberInput` per editable row (a phone hides the dispatch column);
  the SKU filters are an inline chip row and the pager sits in the page footer. The CSV import and add-product
  dialogs use `BasicModal` footer actions; the import picks its file through a `FormField` with a „Choose file”
  button, and its labels are translated. Smoke spec `tests/e2e/p5-stock-smoke.spec.js`.
- P5 Agreements (plan 36): the agreement form is `BasicCard` sections with a `.form-grid` of `FormField`s (API field
  errors shown per field); Save and the danger Delete moved from the panel toolbar into the PageHeader `ActionBar`,
  shown after the load (a failed load shows an `EmptyState`), and the Agreements toolbar is gone. The versions and
  legal-page-history tables are `DataTable`s: a phone keeps version, status and actions, the draft edit form sits
  under the table, a snapshot's legal text opens in the table's expand row, and the history section opens with a
  labelled `IconButton` (was a click-only header). System display contexts are `Tag`s. The legal text at consent
  opens in a `BasicModal` (focus trap, Esc, labelled close). The definitions list filters with an inline chip row
  next to the search; list pagination sits in the page footer; the consent tabs render their `tabpanel`s. Smoke spec
  `tests/e2e/p5-agreements-smoke.spec.js`.
- P5 Emails (plan 34): the channel, template-type, template and language-config tiles are `EmailCard`
  (`src/views/Emails/EmailCard.vue`), a `BasicCard` whose title is the link to the record and covers the card — the
  tiles open from the keyboard now (Tab, Enter). The channel, template and language-config forms are `BasicCard`
  sections with a `.form-grid` (rich-text fields span both columns); Save moved from the foot of each form (mid-page on
  the channel) into the PageHeader `ActionBar`. The header shows after the load. The font preview line is translated.
  Smoke spec `tests/e2e/p5-emails-smoke.spec.js`.

- P5 Faq and the detail-form pattern (plan 33): the group and item forms are `BasicCard` sections with a `.form-grid`
  of `FormField`s (2 columns above 768 px, `.form-grid__wide` spans both) — labels, required markers, hints (IDX and
  URL key fixed after create, no channel = every channel) and errors all come from FormField. Save, Delete (danger
  `IconButton`) and the group's Translations sit in the PageHeader `ActionBar`, beside the unsaved badge and the
  Active switch; the Faq panel toolbar is gone. An item's per-field translations are an `IconButton` beside each
  field. `ActionBar` utilities take `variant` (`danger` for an icon-only delete). The groups list has an inline chip
  row, the items list keeps its filter panel; both lists carry a PageHeader and their pagination in the footer. Group
  rows open from the keyboard, a group's questions are links. Pattern: `docs/ui-components.md` § Detail form. Smoke
  spec `tests/e2e/p5-faq-smoke.spec.js`.

- P5 pilot A (plan 31): Orders, Customers, Content sets and Translation jobs sit on the page frame. Each list's
  one chip set is an inline `FilterChip` row (`.filter-chip-row`: wraps on desktop, scrolls sideways on a phone) next
  to its search, instead of a `MobileFilterPanel`; the order and customer details carry their back arrow and title in
  `PageHeader`, the orders channel select sits in its `meta`, the Translation jobs Refresh in its `ActionBar`. The
  three panel toolbars are gone. Content sets: the sets are `BasicCard`s with an `IconButton` delete, the
  „Powiązany z zestawem” badge is a `StatusBadge`, document tiles are keyboard buttons, „Wyczyść zestaw” sits left of the
  primary „Ustaw zestaw” on the right, and empty columns show `EmptyState`. Translation jobs: stat cards are
  `BasicCard`s, the source badge a `StatusBadge`. Smoke spec `tests/e2e/p5-pilot-a-smoke.spec.js`.
- Auth screens, Enrichment lists, Docs and the lookup/notification components on the P3 components (P5 plan 32):
  login, forgot-password, password change and reset are `<form>`s (Enter submits), each password field has a
  „Pokaż hasło” `IconButton` toggle inside the field, the links are `ghost` buttons and the titles balance their
  lines; the task-queue drawer's SKU and pager, the lookup open, photo and remove controls and the toast close are
  boots; the spawn-rule edit actions are an `ActionBar` in R5 order (delete · run · save) shown after the rule
  loaded; Docs sits in `PageLayout` with a „Dokumentacja” `PageHeader` and its example cards show key and value.
  Read-only smoke `tests/e2e/p5-pilot-b-smoke.spec.js`.

- The Pages content editor (P5 plan 28, Figma S6–S8): `PageLayout` with a `PageHeader` — crumbs Pages / Lista treści /
  <document>, a back arrow to the list, the document name as the H1 and the „Kanały” `ChannelMultiSelect` chip beside
  it; the head sticks under the app header on a phone. The toolbar that teleported into the Pages wrapper is an
  `ActionBar` in R5 order: „Kopiuj” · „Zaawansowane” (· „Opcje dokumentu”) · „Zapisz szkic” · „Zapisz i publikuj”, with
  the unsaved badge beside it; on a phone it is its own row under „Akcje”. Section, tile-group and tile actions are
  `IconButton`s (32 px, 36 on a phone; add = primary, reorder = `reorder`, delete = danger), link chips are `Tag`s,
  the advanced row's URL / meta / category buttons are `BasicButton`s, the home variant switch is a `BasicSelect`
  and the FAB with the „Zarządzaj kolejnością” pill sits 24 px from the corner (16 px above the tab bar below 1024 px).
  The scroll-to-top button above the FAB is gone (not in the design). Handy-kit: the images kit tabs are `BasicTabs`,
  the SKU picker's mode switch is a ghost `BasicButton`.
- Page frame boots follow Figma S6–S8: `data-fid="page-title"` marks the PageHeader title row (back, H1, meta);
  breadcrumbs set Lexend Deca at line-height 1.1 (the title row moves 6 px up on desktop, 5 px on a phone); the
  sticky head sits flush under the app header, full width; the phone `ActionBar` puts „Akcje” above one left-aligned
  row of actions. On a phone the rich-text mode select takes its own row above the tools (A-54).
- The Pages content list (P5 plan 27, Figma S4/S5): `PageLayout` with the „Lista treści” `PageHeader`; the filters
  row holds „Filtry:” with the content-type `FilterChip`s (a „Wyczyść filtry” IconButton instead of the „✕” chip) and
  the language `BasicSelect` in an inline `FormField` „Język treści”; on a phone the chips scroll sideways in one row
  and the select stacks under its label (no `MobileFilterPanel` on this screen). Each content type is a table with an
  uppercase title and a `CountBadge`; the empty list is an `EmptyState`; the FAB sits 24 px from the corner on
  desktop and 16 px above the tab bar below 1024 px. „Przetłumacz wszystko” drops its icon.
- The page frame (P5 plan 25): every view outside Home, Gallery and the Pages builder renders in `PageLayout` —
  no bordered page card, content on the page background with 40/80 px padding (20 on a phone), the view's
  `PageHeader` in the `#header` slot (a loading page keeps its condition there) and the search/filter row in
  `#toolbar`. The swap is the `p5-page-frame` codemod (`scripts/codemods/p5-page-frame.mjs`, `--check` in the gate);
  section cards, local modal surfaces and the auth cards are `BasicCard`, the only renderer of `.page-card`.
- The gallery is the Figma S9/S10 screen (P5 plan 29): `PageLayout` + `PageHeader` „Galeria”, a controls row with
  the label „Filtruj po tagu”, the tag filter as `FilterChip`s (one sideways-scrolling row on a phone) and the sort
  and page-size `BasicSelect`s (180 px; side by side under the label on a phone), a bordered grid of `MediaTile`s
  (188 × 276, 150 × 240 on a phone; file name as caption, tags over the image) with labelled `IconButton` actions
  (edit tags, delete behind a `ConfirmDialog`), pagination below and the FAB 24 px from the corner. Tag manager, tag
  editor and upload are `BasicModal`s with `BasicSelect multiple` tag pickers; the filter keeps its own tag list, so
  editing or uploading no longer changes it. `MediaTile` gains an `overlay` slot and shows actions and overlay on
  hover, keyboard focus, selection and always on a touch screen; images are contained, not cropped.

- Home is the Figma S1/S2 screen (P5 plan 26): `PageLayout` + `PageHeader` (greeting overline, title), a left-aligned
  `PanelCard` grid (3 columns from 1024 px, 2 from 769 px, 1 on a phone, 12 px gap) with the panel's own glyph, locked
  panels dimmed with the lock, and the blurred Entirius sign behind the content as decoration. `PanelCard` draws the
  plain 24 px icon (no tinted tile) and keeps title and description 12 px apart; the page, not the card, sets
  `data-fid="panel-card"` (Home: the first card). On a phone Home keeps the Figma rhythm (40 px top, 30 px title).

- The new shell in `App.vue` (P4 plan 22): AppHeader without a title, SidebarNav on every authenticated route (Home
  and single-entry panels included) from 1024 px, the mobile menu and a 72 px tab bar below it, `<main>` with the
  shell's page header: a view's `PageHeader` claims it (crumbs, back to the parent crumb, its title for the tab name),
  otherwise a fallback shows the crumbs and the H1 from `titleKey`. The 40 views with a raw `<h1>` render
  `PageHeader` (their title-row content in `meta` / `actions`, a back arrow beside the H1 as `back`), so every page
  has exactly one H1. The bell and configuration health are IconButtons that open their lists in BasicMenu's
  `panel` mode (on a phone configuration health opens from the user menu). `--bottom-bar-height` lives on `:root`
  (72 px below the shell breakpoint, 0 without the bar). User-menu languages are `menuitemradio` items with
  `aria-checked` (BasicMenu items take `checked`); the user fallback name goes through i18n; one
  `munin.healthAvailable` gate serves the header, the user menu and the polling. The sidebar entry of a page below it
  is `aria-current="true"`, the page itself `"page"`. Landmarks: the shell ids are a gate (±2 px, S1–S10).
  CMS e2e `01`, `04`, `05`, `14`, `15` target the new shell by role (run in plan 24).

- P3 join (plan 19): the rich-text formatting tools are IconButtons and its mode switch a BasicSelect;
  BulkActionBar pickers are BasicSelects; FAB and empty-state icons resolve only as meanings; selects open on an
  active option and their list is named by the field label; dialogs start in their first field; tabs name their
  panels; route edit / delete in the routes kit act on their own row again; one name per breakpoint
  (`$breakpoint-shell`, `$breakpoint-wide`); a min-* mixin never overlaps its max-* partner (768 stays a phone). Lint: C2 and C5 are
  errors; the catalogue spec fails on a missing component anchor or an API call.

- P3 sweep, partition 1 (plan 17): Pim, Points, PriceManager, PriceFighter, Stock, Agreements, the functionals,
  the builder controllers and the shell use the P3 components — buttons by `variant`, icon-only actions on
  `IconButton`, icons by meaning, confirmations on `ConfirmDialog` / `BasicModal`, chips on `StatusBadge`, `Loader`,
  `BasicSelect`, `BasicSwitch`, `BasicTextarea`, field errors and floating labels on `FormField`. The Handy-kit
  lists that did more than pick a value (reorder, edit, delete per row) open in a `BasicMenu` panel. The P3 codemods
  no longer reject a rewrite that closes a tag (`<StatusBadge />`).

- P3 sweep, partition 2 (plan 18): Promo, Atlas, Faq, forms, enrichment, content, Leads and the other partition-2
  views use the P3 components — icons by meaning, buttons by variant, icon-only actions on `IconButton`,
  confirmations on `ConfirmDialog` (custom footers on `BasicModal`), `.chip` on `StatusBadge`, `Dropdown` on
  `BasicSelect` (the custom check lists are `multiple` selects), `Switcher` / `TextAreaBasic` on `BasicSwitch` /
  `BasicTextarea`, field errors on `FormField`. The Builder section order is a labelled FloatingActions pill;
  the Atlas preferred-strategy and evaluation-frequency selects show their value again (they passed `v-model` to a
  Dropdown that ignored it); the forms back control has a 40 × 40 hit area on a phone.
- Rich-text table tools are short text buttons (four "add" and three "delete" tools shared one icon each); the
  pricing detail flush/delete buttons carry one tooltip (their label); the standalone `ToolTip` hint is a `note`
  described by its text; the FAB sits 16 px from the edge and its speed-dial back button uses the `back` meaning.

- **Forms, type and spacing follow one rhythm** (`docs/ui-rules.md` T5, Cards, Forms): one form-label style
  (`.field-label`: 12 px / 600, uppercase, muted) from `FormField`, the `BasicInput` / `LockedField` labels and every
  raw label, with local copies removed; the required marker is always the red `*` of `.required` or
  `FormField :required` (no typed asterisks; key fields on quality rules and spawn rules marked). Inputs, selects,
  number and colour inputs and buttons are 32 px (`--elem-height`); the colour swatch has an edge; Leads fields use
  the field surface and control border. One card class (`.page-card`: faint border, 24 px radius, 24 px padding,
  16 px on a phone) replaces the 48 / 40 / 32 / 20 / 8 px page and section cards. Every H1 is the page title in
  Lexend Deca 30 px; FAQ and author screens show their title once. Meaningful text is at least 12 px (10–11 px only
  for badge counts). The rich-text mode select follows the theme. Filter chips sit 8 px apart.
- **Polish copy:** diacritics in the contact-form strings; e-mail template types, field labels and hints, the home
  greeting, rich-text modes, atlas raw data and stock, customer columns and address headers, the PIM product-tile
  tab, upload "or" and placeholders go through i18n; tile, channel and FAQ-question counts use Polish plurals;
  channel selects show the choice alone ("Wybrano: 2") instead of nested parentheses.
- **One button family** (`BasicButton`): two sizes (`md` = the input height, `sm` = row actions), 12 px labels that
  never wrap, a 1 px border on every variant, and the roles primary / secondary / ghost / danger / danger-fill as
  classes (`docs/ui-rules.md` C6). Every delete, remove and reject is a danger button; icon-only buttons are squares
  with a FontAwesome icon and an accessible name; back arrows are ghost icon buttons instead of a 14 px strip. The
  Leads kit (`ld-btn`), the config-health panel, atlas, pricing, enrichment review and pagination follow the same
  metrics; layout-list and navigation-editor row actions and the rich-text toolbar are keyboard-reachable and named.
- **Brand token layer (P2, additive):** the CMS loads `@entirius/brand-tokens` and self-hosts Inter and Lexend Deca
  (`@fontsource-variable`, wght axis, latin + latin-ext); Google Fonts is no longer requested. Body text renders in
  Inter from the app bundle. New tokens beside the old ones: the semantic colour layer (`--surface-*`, `--text-*`,
  `--border-*`, `--accent*`, status) for both themes with its `t-` / `bg-` / `b-` classes, generated from
  `src/assets/tokens/semantic.json`; brand spacing `--space-0` … `--space-30`, radius `--radius-base` … `--radius-full`,
  `--fs-150` / `--fs-250`, font families `--font-ui` / `--font-brand` / `--font-mono` and the `type-*` role classes.
  Shadows and overlays now come from the semantic layer; the dark loading veil is black-based instead of blue.
  PIM supplier diffs that already read `var(--font-mono, monospace)` now get the brand mono stack.
  The visual parity gate checks every semantic token in both themes and fails when body text is not Inter.
- **Every colour comes from the semantic layer (P2):** the old palette (`--c-<colour>-<shade>`, the
  `t-` / `bg-` / `b-` / `bb-` / `bt-` / `bl-` / `br-` / `o-` / `stroke-<colour>-<shade>` classes, `themes/__dark.scss`,
  `themes/__default.scss`) is gone; each use was moved by the role it plays (`scripts/codemods/p2-colours.mjs`;
  `--check` exits 1 while anything is left to rewrite). Visible: the brand palette in both themes (warm black shell, `#00ACC1` accent,
  white text on the teal `accent-fill`), inputs, selects and checkboxes on `surface-sunken` with the `border-control`
  edge, accent and muted text on `accent-subtle` chips become `text-strong`, the app background is the flat
  `surface-page` (the `--gradient-*` variables and `.bg-gradient-*` / `.text-gradient-*` / `.main-bg-theme` are removed),
  the content-builder tables use `accent-subtle` / `surface-raised` / `text-strong`. `npm run lint:ui` fails on an old
  palette var or class. Client config is untouched; the CMS has no per-client theme overrides.
- **Spacing, radius and type on the brand scales (P2):** spacing uses the brand step names (`--space-1` = 4 px …
  `--space-30`, classes `p-1`, `mb-8`, `gap-5` …), radius classes are `rounded` / `rounded-lg` … `rounded-full` from the
  radius scale (`br-` is border-right only), `--fs-500` is 20 px and `--fs-700` 30 px. The old names (`--space-50` …
  `--space-700`, their classes and `-m` / `-d` variants, `--radius-sm` / `--radius-md`, `.br-<n>`, `.radius-<name>`,
  `--fs-800` … `--fs-1000`, `fw-100` / `fw-700`) are deleted and `npm run lint:ui` fails on them; it also flags a
  `var()` that names no token. Raw margin, padding, gap, radius and font-size values became tokens, and off-grid ones
  snapped to the nearest step (`scripts/codemods/p2-scales.mjs`, `--check` exits 1 while anything is left to rewrite;
  every snap and every value left raw is listed in `scripts/codemods/p2-scales-report.txt`). Visible: 5 → 4, 10 → 8,
  30 → 32, 50 → 48 and 60 → 64 px spacing, 5/6 → 4 px radii, 10–12 px radii → 12, 18 → 20 and 28 → 30 px type.
- **Post-login session setup is shared** (`src/composables/useLoginSession.js`):
  password and SSO login run the same code after the token call.

### Fixed

- P5 wave-2 close (plan 40): the Stock page offers its warehouse picker when no warehouse is active yet (it was only
  inside the table, so a fresh session hit a dead end); FAQ lists show an empty state; a FAQ answer is required before
  the save request; e-mail channel Save shows its progress and cannot be sent twice, a failed channel load offers a
  retry; wysiwyg editors inside a form field are labelled by it; the sticky page footer appears only when it has
  content; picked authors show their role again and drag by a handle; booking filters sit in the phone filter panel;
  the channel and tax-class IDX links are URL-encoded and the tax-class name is bold again; the e-mail panel's nav
  entry reads "Email configuration" (`nav.email_dashboard`), so channel crumbs no longer pass through the templates
  entry. A click on a SKU's label in the stock add-products dialog selects it once (it toggled twice); a retried
  e-mail channel load shows the form again; the price list mounts one promo calendar at a time and the table's
  scroll box no longer clips or grows around it; channel and tax-class details keep their header while loading.

- P5 wave-1 close (plan 30): cards no longer add a second 16 px gap under children that carry their own margin (auth,
  e-mail, FAQ, PIM detail cards); the PIM lists, enrichment tasks and spawn rules keep their pagination visible at
  the bottom edge while the list scrolls; the content-list FAB checks each type's document limit against that type's
  own documents; the gallery keeps the upload dialog, the file, alt and tags after a failed upload, clears the new
  tag field after a tag is added, stops logging upload payloads and shows 4 fixed tile columns (2 below 1280 px); a
  gallery tile's hidden actions cannot be clicked, and Tab reaches them through the tile; the FAB sits 24 px from
  the corner on desktop and above the tab bar up to 1023 px on every page.
- Handy-kit image library and upload preview borders used removed `--clr-gray-*` tokens and drew nothing; they use
  the border tokens again.
- Pages content list: one delete confirmation for the whole list (every content-type group rendered its own copy, so
  a delete opened one dialog per group).
- Thin scrollbars apply to mouse screens only: on a touch screen the styled scrollbar widened the layout viewport past
  the screen and moved every fixed element (FAB, pill, toasts) 6 / 11 px off its corner.

- P4 close (plan 24): closing the configuration-health panel with Esc returns focus to a named control even where the
  header shows no health icon (a phone; desktop with every check green); the Points, FAQ, Agreements, consent-person
  and contact-form detail pages show one back arrow (the page header's) instead of two; a long e-mail on the
  consent-person page wraps again; `/ui` names itself (its demo page headers no longer take the shell's title); every
  shell control draws a full focus ring. The shell's fallback page header draws no back arrow of its own (the view's
  toolbar back stays, so detail pages without a PageHeader show one) and keeps the title off a panel toolbar below it;
  the Atlas auto-matched title no longer collapses to one letter per line on a phone; promotion and voucher pages name
  themselves in the breadcrumbs and the title instead of repeating „Promocje”.

- P3 review leftovers (plan 21): BasicTooltip adds or drops its `aria-describedby` id when its text or the
  trigger's name changes, and removes it on unmount; a focus trap starts in the first editable field (not a checkbox,
  radio or read-only value); the routes kit's manage list is filtered, capped at 10 rows, and offers no delete on a
  route the document uses; the `@catalogue` API check counts calls made while the page mounts.

- P3 close (plan 20): the PIM "Translate store", Builder "Translate all" and PIM option "Translations" buttons show
  the translate icon on a phone instead of an empty box; author, feature-set, option and gallery-tag fields take their
  share of the row again; a portrait image stays inside its gallery tile; the Find-product empty state shows its
  search icon; a dialog without a title is named by `ariaLabel`. The visual harness waits until no request is in
  flight before a capture, so detail screens opened by a row click keep their lazily loaded fields. A closed menu or
  select mounts no items, so the page holds no hidden copy of its option labels.

- The Handy-kit categories list loads its next page when the end of the list comes into view, so a first page that
  does not fill the box no longer stops at six categories.

- Handy-kit category picker loads the first page and the next one when its list is scrolled to the end (plan 10
  loaded every page on open); P3 codemods resolve the repo root from a path with spaces and report a missing or
  unparsable file as one error line.
- UX polish track closed (plans 01–07, FIX-02…06): 189 audited defects accounted for — buttons in one family (sizes,
  roles, named icon-only squares, FAQ delete and unlink work again), values and loaders shown right, every action
  reachable on a phone, tables that fit or truncate on purpose, one label, card and type rhythm. `@ux` is now a guard:
  a `high` finding (zero-size, off-viewport, under the bottom bar, click-only element) fails its screen unless
  `tests/visual/ux-allow.json` names the plan that removes it (Dropdown and Switcher → P3, click-only rows and cards →
  their P5 panel plans); a partial `@ux` run no longer wipes the last full report. Closing fixes: no empty panel
  toolbar strip (28 screens), content sets scroll on a phone, the search icon of `BasicInput` is decorative and lets
  the click through, `ToolTip` wrappers leave focus to their control, `Confirmation-modal` is destructive only when a
  delete or remove asks for it, `BasicButton :stop="false"` for wrappers that act on the click (navigation editor
  reorder), rich-text table tools are named icon buttons, channel and author-picker labels name their control.
- Touch and layout rules (phone): small controls keep their look and get a thumb-sized hit area from one mixin
  (`touch-target`): the help "?", table row checkboxes and the expander, `NumberInput` − / +, filter chips, the
  config-health close and the Leads kit buttons; neighbouring hit areas never overlap. The back arrow is 40 px on a
  phone only and shows its tooltip on desktop. Page wrappers pad 16 px on a phone through `.page-pad` instead of a
  global `!important` override of `p-12`, so empty states and loaders keep their spacing. Focus rings of tabs and
  segmented options are drawn inside, never clipped by the scrolling row. Leads stage and lead-type rows stack at the
  shared tablet breakpoint; the Builder tile row scrolls natively below tablet (was: on a touch pointer); the
  customer status badges wrap without borrowing the title-row class; the panel toolbar styles its title group and
  actions by role class. `@ux` reports a page card that scrolls sideways on a phone (`overflow` / `card-x`).
- Tables keep what a row showed and stay pageable: PriceFighter gap and decision tables show the channel in the
  market cell again, so rows that differ only by channel are told apart; status badge columns (layout extenders,
  recommendation, strategy) size to their longest label instead of truncating; a chip in a narrow cell ends in an
  ellipsis (`.chip__label`) with the full text as a tooltip. A truncated flexible column is never narrower than its
  header, and a truncated slot cell's tooltip is its rendered text, not the raw value. `Pagination` also takes
  `current` / `total` / `perPage` (and emits `change`), so the Stock tables page again. `DataTable` switches to the
  phone layout at the shared `max-tablet` breakpoint (768 px). Promo modifier labels are back to their previous
  wording (now translated) and the Stock "Sold out" badge is gone.
- Page titles only: the page-title face moved from the `h1` element rule to `.page-title`, carried by every page H1,
  so a heading typed in the rich-text editor, a content or e-mail preview and the docs view look as before. Every
  form label uses the shared label style (translation dialogs, layout-extender modals, channel selectors, Leads
  review and rewrite, drift reason, voucher filters); the Leads kit labels by `.ld-field__label`, not by position,
  so a hint or badge placed first is not restyled. A `BasicInput` / `LockedField` label stays on one line inside its
  control, with an ellipsis and the full text as a tooltip. The `@ux` label census also counts `.ld-field__label` and
  `aria-labelledby` targets.
- Tax rates: an empty, non-numeric or out-of-range (0–100) rate never posts; the field says "Podaj stawkę 0–100".
  `NumberInput` takes one leading minus (only when `min` < 0), one decimal separator ("," reads as ".", a second
  one is dropped) and digits, and looks disabled (muted text, no focus ring, steppers off) with `isDisabled`.
- Empty states: an empty table inside a detail screen is one line (icon and text); list screens keep the full
  block. The tax class, price channel and price history lists use `EmptyState` instead of a muted dash.
- Loaders in modals, side panels and buttons keep their place again; content-area loaders stay centred (`block`).
- Enrichment spawn rules: a channel typed into the free-text fallback drops a language it cannot vouch for, like a
  picked channel does.
- Buttons: one primary per page. Row, bulk, section and inline-form actions beside a page primary are secondary
  (enrichment row accept, lead "Mark as won", promo bulk activate, agreement versions, FAQ associations, PIM groups,
  options and files, point translations, tax rates, voucher filters, promo codes). Delete and remove confirmations
  are filled danger (the shared confirmation modal and the supplier delete); non-destructive confirms (edit published
  agreement, feed trigger, force re-push, atlas bulk approve/requeue) stay primary. An icon-only `BasicButton`
  without `label` warns in dev. The rich-text table tools are one size (`sm`, text); every back control is
  `BackBar`; sheet and notification close buttons, `BackBar` and the leads kit have a 40 px hit area on a phone;
  the price detail flush/delete buttons carry one tooltip; the navigation reorder handle is a real button; the
  atlas swipe bar shows Reject outlined with three equal buttons on a phone; builds rows say "Edit" / "Preview".
- Tables: nothing overlaps, everything fits or truncates on purpose. `DataTable` cells pad 12 px, a column is never
  narrower than its header or an untruncated cell (badges, buttons), text cells truncate on one line with the full
  value in a tooltip, numbers are right-aligned with tabular figures, and an empty value shows "—". Columns carry a
  priority: on a phone the secondary columns step back and the name gets the width. `StatusBadge` and `.chip` stay
  inside their cell. Raw tables (stock, atlas duplicates, agreement versions, the leads kit) share `.table-basic`;
  atlas duplicate groups line up, the price grid keeps its columns apart and names its currency column, the promo
  modifier is a translated neutral badge, enrichment JSON scrolls instead of breaking keys mid-word, stock shows its
  status as a badge ("Sold out" for a zero quantity). Pagination hides for a single page.
- Mobile: every action is reachable on a phone. Scroll regions end above the bottom bar (pagination, the last form
  fields and the atlas swipe actions were under it); panel toolbars, in-card title rows and section headings wrap, so
  Save, Publish and Import no longer sit past the viewport; page cards pad 16 px instead of 48 px. Wide tables
  (prices, stock, atlas duplicates, agreement versions), tabs and segmented controls scroll in their own box, never
  the card. Forms stack to one column (PIM attributes and feature sets, forms-list filters, the atlas find box, leads
  stages); PIM and Promo show their channel selector again; builder Save draft and Publish keep their labels. The
  `.flex-wrap` utility 49 rows relied on did not exist and now does.
- Tax rates read and are entered in percent: the tax class showed the stored fraction as "0.2300%"; it now shows
  "23 %" / "8,5 %", and a typed 23 is stored as 0.2300. `NumberInput` with a fractional `step` takes decimals
  ("8,5" or "8.5"); it used to strip the separator, so 8,5 became 85.
- Edit forms show the values the record has: the enrichment rule edit showed "Select" for a check and task type
  outside the loaded lists (atlas rules) and for a rule without a channel scope ("All channels" now); task types
  carry labels. A carrier delivery point shows its type.
- Dates: price decision history, gap observations, price history and atlas events show the CMS date format instead
  of raw ISO timestamps.
- Loading states: the loader sits centred in the content area (it was a faint corner ripple, so edit screens read as
  blank for a second); author edit shows Save and Delete after the load; a missing PIM category shows a not-found
  state instead of a blank editable form.
- Empty states have one look (`EmptyState`): lists without rows show it below the table, visible on a phone (the
  text used to sit off-screen in the scrolling grid); point translations, waiting mails, the Inbox detail pane
  ("No drafts to review") and an empty new document ("Add the first section") use it too.
- Disabled inputs look disabled, like disabled selects.
- FAQ items and groups can be deleted and unlinked again: their delete, remove-from-group and unlink buttons
  rendered 0 px high because the legacy icon font lacks the glyph.
- The session refreshes its access token a minute before it expires, whatever lifetime the service issues. The
  CMS assumed 15 minutes against a 5-minute token and refreshed far too late.
- A token refreshed by a request (expired on page load, or a 401 retry) moves the next scheduled refresh too; the
  CMS no longer sends a second refresh at the old token's time.
- Logging out while the session refreshes no longer signs you back in: a refresh answered after the logout is
  dropped and writes no cookie. One that fails after the logout no longer shows the "session expired" screen or
  signs out a login made in the meantime. A refresh failing while the logout request is still out no longer does
  either, and a panel request waiting on that refresh shows no error toast. Logging out always ends on a clean
  login screen: the CMS refreshes an expiring token first, tells the server without the refresh machinery (5 s at
  most, a failure still logs you out) and reloads the page.
- Opening the CMS after the access token expired (a tab reopened later) refreshes the session first. Panels outside
  `VUE_APP_PANELS` no longer bounce to the home page.
- The desktop sidebar is no longer empty after a fast click right after login: the CMS leaves the login screen only
  once the user profile is loaded.
- Router `meta.module` guard no longer loops when the panel root itself needs the missing module.
- Read-only fields are read-only again: `BasicInput`, `TextAreaBasic` and `Dropdown` take `isDisabled`, and the
  `disabled` passed by PIM product inherited fields, system agreement definitions (category, consent channel) and
  the Atlas feed/source key landed on the wrapper, which left them editable.
- The contact form attachment download button is visible. It was icon-only with a glyph the icon font lacks, which
  rendered it blank. It now carries a "Download" / "Pobierz" label. The Polish "Załączniki" heading has its diacritics.

### Removed

- The old shell (P4 plan 22): the header route title, the grip panel switcher, the three logo copies, the sidebar
  edge toggle, `Navigation.vue`, `HeaderControls.vue`, `userStore.activeApp` and its write in the router guard, the
  global `.router-link-active` decorator (it resized 24 unrelated links), the theme logo PNGs.

- `/playground` and `Playground.vue` (replaced by `/ui`), the unused `Accordion` boot and `LazyScroll` (a Vue 2
  directive that never fired): the builder category kit now loads every category page instead of only the first.
- P3 join (plan 19): the retired boots `Dropdown`, `Switcher`, `TextAreaBasic`, `LockedField`, `ToolTip`,
  `HelpTooltip`, `HoverMe`, `BackBar`, `components/Loading.vue`, the `Confirmation-modal`, `Unsaved-changes-modal` and
  `Translations-modal` wrappers, the icon font and the global `.chip`; the transition APIs `BasicButton` `text` /
  `isDisabled` / `custom` / btn-* classes (secondary by default), `BasicInput` floating `label` / `validate` /
  `isDisabled`, `NumberInput` `isDisabled`, `StatusBadge` `variant`, `Pagination` `pagination` / `current` / `total` /
  `perPage` / `onChangePage` / `change`, `BulkActionBar` `buttonClass`, `BasicDatePicker` `value` / `label` /
  `onChange`, the `BasicCheckbox` array API, `Loader` `h` / `w` and the `EmptyState` glyph fallback. A removed
  component and an icon-font class are lint errors.

## [2.1.0] (2026-09-01)

### Added

- **Find product: grouped results** (`/atlas/find` and "Find in PIM"): hits split
  into *Exact matches* / *Similar* by the backend's `match` kind (django-lookup
  ≥ 0.2.0; `src/utils/lookupMatch.js` falls back on `similarity` for an older
  backend), `none` neighbours folded behind a disclosure, relevance shown as
  `NN %` with an "Exact" badge, and a photo-specific empty state.

### Security

- **Dependency refresh closing the open Dependabot alerts** (#23, #24, #25): unit-test
  toolchain (vitest 4, happy-dom 20, @vitejs/plugin-vue 6), runtime deps (axios 1.x,
  swiper 14, uuid 11, lodash, sass), and `package.json` `overrides` pinning the patched
  transitive vue-cli 5 / webpack 5 toolchain. Dependabot config added.
- **New CI job `test-e2e-mocked`**: backend-free Playwright smoke of the Atlas panels
  (cookie-stubbed auth, mocked APIs) on every PR.

### Fixed

- **Find product keeps its search across back-navigation**: opening a hit's
  details unmounted the view and wiped results, query and the uploaded photo —
  the operator had to re-upload the picture to inspect a second candidate. The
  last search now lives in the `lookupFind` store and is restored on return.

## [2.0.0] (2026-08-09)

First release from this repository — now the canonical home of the CMS.
The 1.x line was released from the previous internal repository (through
1.6.1); this release restores full feature parity with that line and adds
the changes below.

### Added

- **Multi-method payment rendering** (Checkout orders): `payment_method` is
  rendered as a list — a voucher settling alongside the gateway shows every
  method on the order detail. Orders holding the legacy single dict still
  render.
- **Voucher dormancy without the backend module**: the Promo panel now stays
  available when the backend lacks `checkout_voucher` — Discounts (served by
  `django-checkout`) remain usable, the Vouchers segment hides, voucher
  routes redirect to the panel root via the new `meta.module` route gating,
  and `?tab=vouchers` deep links land on a locked EmptyState.

### Fixed

- **Refresh token no longer clobbered**: when the backend does not rotate
  refresh tokens, the stored token is kept instead of being overwritten with
  `undefined` (users stayed logged in only until the first refresh).
- **Unit suite is self-contained**: `pretest:unit` generates `__client/`, so
  the suite passes in clean environments (CI).

### Changed

- **Documentation refactored to the handbook convention**: compact AGENTS.md
  plus a verified `docs/` reference set (panels/routing, stores/composables,
  UI components, testing, supplier bridges, gotchas, operator guides).
- **Repository identity**: package `entirius-pwa-cms` 2.0.0, MPL-2.0,
  pre-commit secret scanning, GitHub Actions CI.

## [1.6.1] (2026-07-22)

### Added

- **Delivery point type change** (Points panel): the Type dropdown is editable
  for custom points when the backend supports it (django-deliverypoints >=
  1.1.0, detected via the Munin module version — `isModuleAtLeast` in the munin
  store). Carrier points stay locked. Older backends keep the dropdown locked
  so a change is never silently dropped.
- **Order-impact warning on type creation**: creating a new delivery point type
  shows an informative notification that types are stored inside orders and
  cannot be changed or deleted later without developer assistance.

### Fixed

- **Point create no longer rejects empty optional fields**: `buildPayload`
  sent `null` for empty strings, which the create endpoint rejects ("Input
  should be a valid string" on 8 fields). Empty strings are sent as `""`,
  which also makes clearing a field on edit actually persist (PATCH `null`
  means "unchanged" on the backend).
- **No spurious "Unsaved changes" modal after creating a point**: the create
  path now snapshots the form before redirecting, and `useUnsavedChanges`
  recomputes `isDirty` when the snapshot baseline changes (watch covered only
  `current` before, so `snapshot()` after save never reset the dirty flag —
  affects all 9 views using the composable).
- **Translations section hidden on single-language setups** (Point detail):
  nothing to translate into when channels expose one language; the section
  still shows if legacy translations exist.

## [1.6.0] (2026-07-02)

### Fixed

- **Real API error messages reach the operator everywhere** (fixes a regression
  where empty error toasts were shown): the token-refresh interceptor rejects non-401 errors with
  the unwrapped response body, so every view-level `err.response?.data` read
  was dead code and the operator got a generic "Something went wrong" toast
  instead of the backend message. All ~195 ad-hoc handlers across every panel
  (PIM, Points, Faq, Authors, Agreements, Emails, ContactForms, Accounts,
  CheckoutOrders, LayoutExtenders, PriceManager, Promo, Suppliers, Stock,
  Enrichment) now go through `extractApiMessage(err, fallback)`.
- **`useFormErrors` understands every backend error shape**: v2 envelope,
  legacy `{detail}` (string and pydantic list), DRF-in-envelope
  `{meta, data: {field: [msg]}}` and raw DRF `{field: [msg]}` — wrapped and
  unwrapped — with a guaranteed non-empty per-field message.
- **No more empty error UI**: `BasicInput` renders the error line only with a
  non-empty message, `spawnNotification` falls back to a localized message on
  an empty toast (and unwraps refs — `formErrors.summary` passed raw is a
  ComputedRef, always truthy, which silently defeated `||` fallbacks).
- **Promo custom error parsers removed**: `filterErrorMessage`,
  `codeErrorMessage` and the `extractError` helpers now delegate to
  `extractApiMessage`; `handleApiError` re-wrap workarounds dropped.

### Added

- **Promo panel**: full discount/voucher management — discount rules
  with modifiers and per-rule discount codes (`PromoList`/`PromoEdit`),
  campaigns, vouchers (list, detail with code reveal, product vouchers),
  product/threshold/customer filter drawer, and per-channel promo settings.
  Ships a new `promo` + `voucher` API client pair and a `checkoutChannel`
  store; order list gained discount/voucher context.
- **AI translations**: bulk product translation in PIM
  (`TranslateDialog`, `TranslateStoreDialog`), translate-all for content
  (`TranslateAllContentModal` in Builder), and a Translation Dashboard for
  monitoring jobs (`translationJobs` store + `pim`/`contentDB` translator API
  clients). Both the translate actions and the Promo panel are gated on their
  backend modules being enabled (Munin).
- **`Dropdown` field-error support**: new `validate` prop (`{status, msg}`,
  same shape as `BasicInput`) renders an invalid border + message; used for
  the feature-set picker on Product create. `TextAreaBasic` unified to the
  same `{status, msg}` shape.
- **Error-feedback e2e suite** (`tests/e2e/16-error-feedback.spec.js`): live
  required-field and duplicate-SKU scenarios plus six mocked backend error
  shapes (v2, DRF envelope, raw DRF, `{detail}`, 500 HTML, network abort)
  assert the operator always sees a concrete, non-empty message.

## [1.5.2] (2026-06-25)

### Fixed

- **Layout-extender publish persists the draft first**: publishing a
  layout-extender now saves the pending draft before the publish call, so the
  published layout reflects the latest edits instead of the last saved state.
- **Category links now point to real storefront pages**: the category picker
  (`useCategoryFetch`) saves the category `url_key` into `link_value` instead of
  `idx`. Affects every storefront-routing picker -- megamenu items, banners,
  links, and FAQ associations. Previously, categories whose `idx` differed from
  their `url_key` produced catalog links that resolved to zero products. Falls
  back to `idx` when the backend doesn't yet supply `url_key` (requires
  django-pim with the `url_key` field on the admin category list). Internal PIM
  pickers (product-to-category assignment, supplier mapping) keep using `idx`
  and are unaffected.

## [1.1.0] (2026-03-03)

### WYSIWYG Editor Improvements

- **Paste sanitization**: Strip inline `color`, `font-family`, `font-size`, `font-weight`, `background-color`, `line-height`, `letter-spacing` from pasted HTML via `transformPastedHTML`. Toolbar color button still works -- only paste-time styles are removed.
- **Focus mode**: Distraction-free writing via `<Teleport to="body">`. Blurred backdrop, centered card (z-201, above HandyKit), Escape to close, body scroll lock. Expand/compress button in top-right corner of editor (appears on hover, always visible in focus mode).
- **Line-height**: Set to 1.7 for body text, 1.3 for headings, 1.4 for table cells. Applied to both editor and preview.
- **Cursor**: `cursor: text` on `.ProseMirror` in normal mode.
- **Icons**: Registered `faExpand` and `faCompress` in FA icon library.
- **Dark mode cleanup**: Removed `!important` color override from editor (paste sanitization handles it). Kept override in Builder.vue for legacy saved content in read-only previews.

## Earlier development (pre-1.1.0)

### Vue 3 Migration (2026-01-31 to 2026-02-08)

**Major Upgrade**
- Vue 2.6 → Vue 3.5
- Vuex 3 → Vuex 4
- Vue Router 3 → Vue Router 4
- TipTap 2.2 → TipTap 3.19
- Removed compatibility layer - pure Vue 3 implementation

**Architecture**
- Extracted variant matching to reusable composable (`useVariantMatching`)
- Migrated all components to Composition API where beneficial
- Updated component lifecycle hooks (Vue 3 syntax)
- Fixed universal-cookie integration (replaced deprecated vue-cookies)

**UI/UX Improvements**
- Added i18n system with EN/PL locale support
- Collapsible sidebar with material-style polish
- Empty-state placeholders for content list and content sets
- Improved confirmation modal with blur backdrop effect
- Added tile deletion confirmation (previously missing)
- FloatingActions component with proper z-index layering

**Components**
- BasicWysiwyg migrated to TipTap's official `useEditor()` hook
- Updated all global components for Vue 3 compatibility
- Fixed route title resolution for nested routes

**Developer Experience**
- Added comprehensive migration documentation
- Testing infrastructure with Playwright e2e tests
- Debug console helper for development
- Updated build configuration for Vue 3

### Pre-Migration (2026-01-28 to 2026-01-31)

**Gallery Enhancements**
- Gallery tag system implementation
- Tag filtering and management UI
- Bug fixes for image selection and display
- Empty gallery state messaging

**Bug Fixes**
- Fixed configuration loading issues
- Removed debugging artifacts
- General stability improvements

### Feature Development (2025-12 to 2026-01)

**Content Management**
- Document copy functionality
- Delete confirmation for routes and sections
- Vimeo integration (in progress)
- Document configuration options

**UI Components**
- Gallery controller improvements
- Group field controller updates and edition fixes
- Notification system added
- Route list kit enhancements

**Multi-Client Support**
- Multi-client deployment infrastructure
- Client configs moved to gitignore
- Multi-path feature for flexible routing

**Authentication & Security**
- Refresh token expiration handling
- Improved session management

### Core Features (2025 Q3-Q4)

**Builder System**
- Layout extender for custom layouts
- Section creation and management
- Config system with dynamic UI generation
- Vertical scroll improvements

**Content Types**
- Document type dropdown remodel
- Category system improvements
- Gallery integration with content builder

**Developer Tools**
- Config validation and debugging
- Client context improvements
- Build system optimizations

