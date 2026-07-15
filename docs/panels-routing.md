# Panels and Routing -- CMS Blueprint

## Multipanel Architecture

Six panels: Pages, PIM, Points, Forms, Agreements, Emails. Each self-contained.

### Panel Registry

In `src/configs/access.js` `apps` array. Each entry: `{ name, idx, icon, root, labelKey, access }`. This is static metadata only -- enablement is determined at runtime by the Munin store.

### Panel Enablement (Munin-Driven)

Panel visibility is controlled by `django-munin`, not by environment variables.

**How it works:**
1. Admin toggles `enabled_in_cms` on Module records in Django admin
2. `GET /api/munin/v2/` returns all modules with their `enabled_in_cms` flag
3. `useMuninStore` maps module keys to panel idx values via `MODULE_TO_PANEL`
4. Router guard and Home view check `munin.isPanelEnabled(panelIdx)`

**MODULE_TO_PANEL mapping** (in `src/stores/munin.js`):

| Munin module key | CMS panel idx |
|---|---|
| `contentdb` | `pages` |
| `pim` | `pim` |
| `deliverypoints` | `points` |
| `contact_forms` | `forms` |
| `agreements` | `agreements` |
| `email` | `emails` |

Modules not in this map (regional, accounts, etc.) have no CMS panel and are ignored.

**Fallback chain:**
1. **Munin API** -- primary source (admin-controlled, runtime)
2. **`VUE_APP_PANELS` env var** -- fallback if API unavailable or not yet loaded
3. **Empty set** -- if neither source is available, no panels enabled

**Fetch timing:**
- After login: `Login-wall.vue` calls `munin.fetchModules()` with fresh JWT
- On page refresh: `App.vue` fires `munin.fetchModules()` if already authenticated (fire-and-forget, env fallback covers the gap)

### Layout Rules

- **Home (`/`)** -- No sidebar, no route title. Panel selector cards.
- **Panel pages** (`meta.panel` set) -- Sidebar with panel-specific links.
- Controlled by `hasPanel` in `App.vue`: `!!this.$route.meta?.panel`

### Key Components

| Component | Location | Role |
|---|---|---|
| `HeaderControls` | `src/components/Navigation/HeaderControls.vue` | Panel switcher, theme toggle, user, logout |
| `Navigation` | `src/components/Navigation/Navigation.vue` | Sidebar links filtered by `activeApp` |
| `Home` | `src/views/Home/index.vue` | Panel selector cards |

### Adding a New Panel

1. Register in `src/configs/access.js` `apps` array
2. Add entry to `MODULE_TO_PANEL` in `src/stores/munin.js`
3. Add i18n keys (`panels.{name}`, `panels.{name}_desc`) to `en.json` and `pl.json`
4. Create view: `src/views/{PanelName}/index.vue`
5. Add route in `src/router/index.js` with `meta: { panel: "{idx}" }`
6. Add sidebar routes in `Navigation.vue` with `app: ["{idx}"]`
7. Ensure the corresponding django-munin module has `enabled_in_cms = True`

## Routing

Routes namespaced by panel. Every route has `meta: { panel: "idx" }`. Lazy-loaded via `() => import(...)`.

| Route | Panel | Description |
|---|---|---|
| `/` | -- | Home (panel selector) |
| `/pages/content?lg=pl` | pages | Content list |
| `/pages/:content_type/:type/:uid?` | pages | Builder |
| `/pages/gallery` | pages | Gallery |
| `/pages/content-sets?lg=pl` | pages | Content sets |
| `/pages/doc` | pages | Internal docs |
| `/pim` | pim | PIM panel |
| `/points` | points | Points panel |
| `/forms` | forms | Contact forms |
| `/agreements` | agreements | Agreements |
| `/emails` | emails | Email templates |

Legacy routes (`/gallery`, `/content-sets`, `/doc`, `/content`) redirect to `/pages/...`.

### Access Control

Role-based system in `src/configs/access.js`. Roles: `admin`, `moderator`, `user`. Routes filtered by `grantAccess()`.

Panel-level access controlled by Munin (admin toggles modules). Route-level access controlled by roles in `access.js`.

## Internationalization

Plugin at `src/i18n/index.js`. Language via `VUE_APP_LANG` (`EN`/`PL`). Files: `src/i18n/locales/en.json`, `pl.json`.

**Namespaces:** `nav`, `login`, `builder`, `gallery`, `config`, `config_option`, `prop`, `prop_option`, `common`, `notifications`, `images`, `meta`, `attrs`, `routes`, `categories`, `controllers`, `order`, `content_sets`, `content_role`, `app`, `panels`

Add strings to both `en.json` and `pl.json`.
