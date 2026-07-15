# Stores and Composables -- CMS Blueprint

## Pinia Stores

All stores use composition (setup) syntax with `defineStore`.

- **`useLoaderStore`** (`loader.js`) -- `loaderStart()`/`loaderFinish()`, `handyLoaderStart()`/`handyLoaderFinish()`. Auto-timeout 10s.
- **`useNotifyStore`** (`notify.js`) -- `spawnNotification({ title, msg, type, timeout })`. Types: `informative`, `positive`, `negative`, `warning`.
- **`useHandyStore`** (`handy.js`) -- Builder panel state. `open_Handykit()`, `pass_Asset()`, `changeState()`. Subscriber pattern via `triggerListener`.
- **`useUserStore`** (`user.js`) -- Auth, theme (`"default"`/`"dark"`), sidebar, `activeApp`. Cookie persistence via `universal-cookie`.

## Composables

Located in `src/composables/`. Opt-in for new code. Existing components keep using stores via `setup()` return pattern.

- **`useApi`** -- Wraps async with loader + error notification. `{ handy: true }` for builder context.
- **`useLoader`** -- Thin wrapper over loader store. Returns `{ start, finish, handyStart, handyFinish }`.
- **`useNotify`** -- Notification shortcuts: `{ success, error, info, warning, hide }`.
- **`useHandyKitSubscriber`** -- Watches `handy.triggerListener` to bind HandyKit payloads to component data.
- **`useVariantMatching`** -- Config variant matching logic.

## Store Usage Pattern (Options API)

```javascript
export default {
  setup() {
    const loader = useLoaderStore()
    const notify = useNotifyStore()
    return { loader, notify }
  },
  methods: {
    async fetchData() {
      try {
        this.loader.loaderStart()
        const data = await apiCall()
      } catch (error) {
        this.notify.spawnNotification({ type: 'negative', msg: error.message })
      } finally {
        this.loader.loaderFinish()
      }
    }
  }
}
```
