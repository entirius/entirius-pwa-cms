# Leads panel

Salesperson screens for django-leads + django-communicator, mobile first (one thumb at 390 px), desktop =
same screens in two columns (`src/views/Leads/index.vue`, CSS grid only). One panel for both backends (there is no
Communicator panel): munin keys `leads` and `communicator` both map to it, and every nav entry, route and
Settings section carries the module it needs (`requiresModule` / `meta.module` / the hub's filter) — a section of
a module that is off is simply not there. Nav (Leads CRM): Today (the panel root) · Inbox · Companies · Approvals ·
Reports · Settings; a phone gets Today · Inbox · Companies in the bottom bar (Approvals, Reports and Settings are
`desktopOnly`; a Settings section still opens from a link), which Review (`meta.noBottomBar`) keeps off its sticky
actions. The Inbox column carries a `SegmentedControl` Conversations | Companies (`leads-list-toggle`, shown with
both modules); "Companies" opens the full list page. A company card keeps the list it came from in the left column
on a desktop and lights Companies; the board and the import are Companies' page actions and light it too.
`siteintel` (intel card) and `notifications` (header bell, `src/components/NotificationBar/`)
gate in-view with `isModuleEnabled` — never map them in `MODULE_TO_PANEL`. Every leads-family call takes the
channel from `src/stores/leadsChannel.js` (`VUE_APP_LEADS_CHANNEL`, default `default-europe`), never
`VUE_APP_CHANNEL`. Review has no detail endpoint: the view finds the draft in `review/?status=review_required`.
The thread view opens the newest thread of `leads.Company:<id>` (closed or not); older threads sit behind one "Earlier threads" expander (first `threads/` page, more pages on demand, a row's detail loads with the row so its subject and recipient are readable collapsed) that badges an undecided opt-out; a reply that landed before our newest mail expands that section and opens its thread. A reply that sits in an older thread is marked ("The reply is in this thread") and scrolled into view on arrival (the bell carries only `subject_ref`). A waiting bubble shows no clock of its own: it states `sendState(next_slot)` like the Inbox (`src/utils/leadsTime.js`); a reply's quoted history (from its first `>` line) folds behind a toggle. `/leads/inbox` is one list of every conversation of the channel — one row per `subject_ref` (a company, or any other ref), never one per technical thread (`conversations/`: the newest thread's row, state/draft/waiting/reply from any of its threads, `thread_count > 1` as a quiet "N threads" hint; 20 per page, a 30 s poll like the bell) behind four `FilterChip`s whose counts come with the list (`counts`): All · Drafts · Waiting · Replies — Drafts is the default while drafts wait. A row keeps one layout and one marker (`InboxRow.vue`; the chip decides it for a conversation in several states): a draft opens Review (the row's draft, even from an older thread, "To:" its own recipient), a waiting mail shows a clock + `sendState(next_slot)` and Send now while `canSendNow`, a reply its first own line. Other rows open the company card, and a conversation without a company opens its newest thread at `/leads/conversations/:id`. The bell falls back to that view for an unmapped `subject_ref`. The empty Drafts filter keeps the old empty state ("N scheduled, <state>", `inbox-empty`), and the chip bar is `inbox-summary` — both are the emporium `InboxPage` contract. Activity messages are service strings — `activityText` (`src/utils/leadsLabels.js`) turns the known shapes into sentences. Config problems of the screen
(outgoing SMTP) show as `ConfigBanner code="…"` and the AI toolbox state as `AiToolboxHint` (`src/components/ConfigHealth/`),
both fed by the store `configHealth` — see `docs/config-health.md`. `data-testid`s are the contract of the
emporium page objects (`src/entirius_tests/cms_pages/`) — rename both together.

Desktop screens (≥ 1024 px; below that `DesktopOnly.vue` shows "Open on a desktop"): `/leads/board` (stage columns,
drag or the card's stage select → `companies/<id>/transition/`, refused move snaps back; rule badges from
`GET rules/` — the stages payload carries none), `/leads/import` (`POST imports/`, polls the batch).
Settings (`meta.page`: full width, one scroller, no DesktopOnly wall; every section on PageLayout + PageHeader, its tables DataTables):
`/leads/settings` lists the sections, each its own route — `settings/stages` (reorder = `PATCH stages/<id>/ {order}`
per moved stage — there is no bulk order endpoint; delete 409 inline), `settings/templates` (+ `/:id`),
`settings/sequences`, `settings/sending`, `settings/lead-types` (the Stages pattern: rename, reorder by PATCH `order`, deactivate, delete 409 inline; the code is fixed after create); a section leads back to the hub (the PageHeader `back`; a template goes back to the template list). Lead types are one list for the whole panel — `src/stores/leadTypes.js` (loaded once — a failed load is retried, logout resets it in `App.vue` together with the Inbox company-name cache `src/utils/leadsCompanyNames.js` — `label(code)`, `UNKNOWN` built in): Board chips = the active types in order, the company card's type select, the add-lead form and the template Audience (list column + edit select, shown only with the `leads` module; an audience a communicator does not send is never sent back). `/communicator/*` and `/leads/stages`
redirect there; the route names (`CommunicatorTemplates`, `CommunicatorSettings`, `LeadsStages`, …) did not change. `/leads/companies/:id` is the company card on every width (`Company.vue`, the name as H1, the domain and the stage /
lead-type selects in the PageHeader meta; tabs via `?tab=` overview | contacts | timeline ("History": the thread view
and the company's events) | tasks | intel; a phone opens History, a desktop Overview); notification jumps open
`?tab=timeline`.
The Contacts tab (`tabs/ContactsTab.vue`) adds, edits and removes contacts — one form at a time, above the
contacts DataTable — with the primary star (one per company, server-side); the fields are `ContactFields.vue`, shared with the add-lead form. Remove
answers 204 (never used, deleted) or 200 (used, anonymised) and the status line says which; anonymised rows are history only.

## Communicator sections of Settings

Template edit sends `auto_approve` back unchanged (Grappelli-only), test-generate
never saves. `GET templates/` is unpaginated (every template of the channel in `results`) and takes no `is_active`
filter, so the Communicate modal filters the full list client-side. Settings: mail footer per language (`SettingsFooter.vue`: HTML around `{{ legal }}` — the agreements text at send time; the server sanitises on save and answers with the cleaned HTML, which goes back into the field; languages = footers + template languages; preview in an empty-sandbox `<iframe srcdoc>` with a sample legal text; no footer = the legal text alone), send policy (holiday country is set
per channel — the SendPolicy API has no country field, so it is read-only here), channel mode (`PATCH channel/` never carries `live_enabled`; sandbox needs a
mailbox), suppressions, waiting messages (`approved` + `scheduled`) with Send now =
`messages/<id>/send-now/` (moves `scheduled_at` only; a mail already at the channel clock cannot be pulled
any earlier, so it offers no second Send now — a reload keeps that). The departure column is a state, never a
clock that slides: `sendState` (`src/utils/leadsTime.js`) names an hour only for a `next_slot` in the future,
else it says due / daily cap reached / waiting for the window with its hours; a used-up cap wins over any slot and
a closed window (policy `windows`, channel time zone) never shows a clock. `next_slot` (outbox endpoint, `GET_WaitingMessages`)
is the one slot the Inbox rows, the Review confirmation (looked up after accept), the thread bubbles and this table all read, so no two screens disagree. The waiting table (DataTable, the recipient under the company) keeps Send now inside the card at 1280 px with the sidebar open; `scheduled-row` + `data-message` sit on the row through DataTable `rowAttrs`. Sequences: create (no step edit API) + the text pool: add, edit in place through the row's edit square (future follow-ups only), remove — a text a thread already got is deactivated, not deleted (DELETE answers 200 with the row instead of 204), listed dimmed with Restore (`TextPool.vue`).

## Outbound screens (django-communicator / django-leads 0.5.0)

Every one is dormant on an older backend: the nav entry, the hub section and the route (`meta.moduleVersion`, checked
by the guard with `isModuleAtLeast`) need 0.5.0; the in-view parts ask `outboundOn(munin, module)`
(`src/utils/leadsOutbound.js`, also the reply-type tones, the mailbox states and `problemText` for a draft's
`blocker`). `/leads/approvals` (desktop entry, nav `badge: "approvals"` from `src/stores/approvals.js`, a 30 s poll the
panel wrapper starts with read on `communicator.review`) is the only cross-channel screen: the approval endpoints carry
no channel; a row of the active channel opens Review, another channel's row a drawer with its own Approve / Reject;
bulk calls go in chunks of 100. Settings sections (`LEADS_SETTINGS_SECTIONS`, one hub card per `group`):
`settings/mailboxes` (+ `/:id`, `new` adds; passwords are write-only — the form never holds a stored one and never
sends an empty one; the bell maps `communicator.Mailbox:<id>` there), `settings/sending-health`,
`settings/automatic-moves` (leads `stage-events/` and communicator `reply-classes/plans/` on one Save, one request per
changed card; the reply part sits in `ReadonlyArea` `communicator.settings`), `settings/reply-classification`,
`settings/do-not-contact` (replaces the Send settings suppression card; keeps its test ids). The Inbox row and the
thread bubble show the reply type (the row's class fields, else one `replies/` page), Review asks the approvals list for
the draft's `blocker` and disables Send with it, a contact row opens `SendCheckDialog` (`mailable/`), Import sends
`run_rules`, Sequences save `is_active` / `autostart` on change.


## CRM screens (django-leads 0.5.0, django-todo)

Every part is dormant on an older backend (`outboundOn(munin, "leads")`, routes `meta.moduleVersion`); tasks also
need `isModuleInstalled("todo")` and read on `todo.tasks` (`src/api/todo/api.js`, the leads JWT client, `tz` = the
channel's time zone). `/leads/today` (no area: its blocks gate themselves) lists the caller's tasks by chip (Due now
= `today/` for "Mine", else `tasks/?due=overdue` + `?due=today`; Upcoming, No date, Done = `tasks/` pages) and the
drafts / replies waiting (links to the Inbox chips, `?filter=draft|replied`). `/leads/companies` is a page: search,
owner chips, every filter (`attr.<key>` for `show_in_list` attributes), the sort (allowlist: `last_activity_at`,
`score_points`, `owner__username`) and the page live in the URL; the API pages (20) and filters; bulk "Assign owner"
(`companies/assign/`). The card adds Details (owner from `assignable-users/`, origin, custom fields; a PATCH of what
changed), Score (the last `score` activity's reasons, Score now; 409 `no_scoring_profile` → "Set up scoring"),
Tasks (`subject_ref = leads.Company:<id>`, inside `ReadonlyArea` `todo.tasks`), Write mail (`ComposeDialog.vue`:
the gate's `mailable/` answer disables Send with its reason; 409 `not_eligible` / `no_legal_basis` under To) and the
contact custom fields. One task dialog (`TaskDialog.vue`) adds, edits, logs a call (a phone task created, then done)
and closes a task with its outcome. Custom fields render through `CustomFields.vue` + `customFields.js`
(`fieldsFromDefinitions`, `validateValues`, `changedValues`, `formatValue`: the boot per kind). Settings sections:
`settings/custom-fields` (`?entity=` company | contact | deal; the key is fixed after create, a 409 on the kind locks
it; reorder = one PATCH `order` per moved row), `settings/scoring` (one active profile; Save creates it) and
`settings/rules` (conditions from `GET fields/`); Scoring and Rules share `ConditionRow.vue` (ops per kind, "is empty"
hides the value). `/leads/reports` (desktop) is the funnel as three tables, origin and period filters. Never parse a
`subject_ref` / `contact_ref` in a view: `src/utils/subjectRef.js` builds and reads them.

## Deals (django-leads 0.5.0)

Dormant on an older backend like the CRM screens (`meta.moduleVersion`, nav `minVersion`); deals ride
`leads.companies`, deal stages `leads.settings` — no new area. `/leads/deals` (`Deals.vue`, every width, nav entry 4
and the phone bar) lists `GET deals/`: search, owner chips (default Mine), status (default Open; cleared = `kind=all`),
deal stage and the expected-close range (`close_from` / `close_to`, written as one change), the sort (allowlist:
`expected_close_date`, `value_one_off`, `value_recurring`) and the page live in the URL; a phone shows deal and
stage only (every other column has a `priority`). `/leads/deals/board` (`DealsBoard.vue`, `meta.desktop`; the wall
links back to the list through `meta.desktopBack`) shows `GET deals/board/` columns (`DealBoardColumn.vue`,
`DealCard.vue`): count, totals per currency (`deals.js` `totalLines` — one line per currency, never added across),
the first 25 deals and "Show all" (the list filtered by the stage). Every move — row select, card select, drop, the
deal card's Mark won / Mark lost / Reopen — goes through `useDealMove.js`: a lost stage opens `LostReasonDialog.vue`
(a reason is required; the lost stage is picked only when the channel has more than one), a refusal or a cancelled
reason snaps a dropped card back. `/leads/deals/:id` (`Deal.vue`) is the deal card: kind badge, company link and stage
select in the header; Details (`DealDetails.vue`: values, currency, period, expected close, contact, owner, custom
fields of entity `deal`; a value without a currency is refused on Currency); Tasks (`tabs/TasksTab.vue` with `deal`:
`subject_ref` / `subject_label` from the deal); History (`GET deals/<id>/activities/`, moves in stage labels). The
company card gains a Deals tab (`tabs/DealsTab.vue`, `GET companies/<id>/deals/`, chips with the card's `deals`
counts); "Open deal" (`DealDialog.vue` + `DealForm.vue`) pre-fills the company, its name as the title, the primary
contact and the channel's default currency (`GET channel/` — `leads.settings`; unreadable = the API fills it), owner
and stage are the server's. Settings → Deal stages (`DealStages.vue`): label and kind per row (Save while dirty),
reorder, delete (409 → "This stage holds deals") and Add. Amounts stay decimal strings (`BasicInput format="money"`,
shown through `formatCost`). The bell maps `leads.Deal:<id>` to the deal card.
