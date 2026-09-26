# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

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

- The session refreshes its access token a minute before it expires, whatever lifetime the service issues. The
  CMS assumed 15 minutes against a 5-minute token and refreshed far too late.
- A token refreshed by a request (expired on page load, or a 401 retry) moves the next scheduled refresh too; the
  CMS no longer sends a second refresh at the old token's time.
- Logging out while the session refreshes no longer signs you back in: a refresh answered after the logout is
  dropped and writes no cookie.
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

