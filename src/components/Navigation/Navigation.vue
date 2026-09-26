<template>
  <nav v-if="!mobile" class="navigation-wrapper fs-300 t-body h-100 ov-h">
    <template v-if="user">
      <nav
        class="navigation pb-2 pt-30"
        :class="isSidebarCollapsed ? '' : 'pl-8 pr-8'"
      >
        <div
          class="flex flex-column"
          :class="isSidebarCollapsed ? 'ai-ct' : ''"
        >
          <router-link
            v-for="(r, i) in filteredRoutes"
            :key="`${r.labelKey}-${i}`"
            :to="{ path: r.route, query: r.query }"
            class="nav-link"
            :class="[isSidebarCollapsed ? 'nav-link--collapsed' : '', { 'router-link-active': isNavActive(r, $route?.path) }]"
          >
            <FontAwesomeIcon :icon="r.icon" class="nav-icon" />
            <span v-if="!isSidebarCollapsed" class="nav-label">{{
              $t(r.labelKey)
            }}</span>
          </router-link>
        </div>
      </nav>
    </template>
  </nav>
  <nav v-else class="mobile-nav">
    <router-link
      v-for="(r, i) in filteredRoutes"
      :key="`mobile-${r.labelKey}-${i}`"
      :to="{ path: r.route, query: r.query }"
      class="mobile-nav__item t-secondary"
      :class="{ 'router-link-active': isNavActive(r, $route?.path) }"
    >
      <FontAwesomeIcon :icon="r.icon" class="mobile-nav__icon" />
      <span class="mobile-nav__label">{{ $t(r.labelKey) }}</span>
    </router-link>
  </nav>
</template>

<script>
import { useUserStore } from "@/stores/user";
import { useQualityStore } from "@/stores/quality";
import { useMuninStore } from "@/stores/munin";
import { useIsDesktop } from "@/composables/useIsDesktop";
import { buildNavRoutes, filterNavRoutes, isNavActive } from "./nav-routes";

export default {
  props: {
    mobile: {
      type: Boolean,
      default: false,
    },
  },
  setup() {
    const userStore = useUserStore();
    const qualityStore = useQualityStore();
    const munin = useMuninStore();
    const isDesktop = useIsDesktop();
    return { userStore, qualityStore, munin, isDesktop };
  },
  data() {
    return {
      routes: buildNavRoutes(),
    };
  },
  methods: {
    isNavActive,
  },
  computed: {
    user() {
      return this.userStore.user;
    },
    activeApp() {
      return this.userStore.activeApp;
    },
    isSidebarCollapsed() {
      return this.userStore.isSidebarCollapsed;
    },
    filteredRoutes() {
      return filterNavRoutes(this.routes, {
        activeApp: this.activeApp,
        qualityAvailable: this.qualityStore.available,
        isModuleEnabled: this.munin.isModuleEnabled,
        isDesktop: this.isDesktop,
      });
    },
  },
};
</script>

<style lang="scss">
.navigation-wrapper {
  display: flex;
  flex-direction: column;
  @media screen and (min-width: 768px) {
    position: sticky;
    align-self: start;
    top: 0;
  }
}
.navigation {
  height: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
}
.nav-link {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
  padding: var(--space-2) var(--space-3);
  margin-bottom: 2px;
  border-radius: var(--radius-lg);
  color: var(--text-secondary);
  font-weight: 500;
  line-height: 1.4;
  text-decoration: none;
  transition: background-color 0.15s ease, color 0.15s ease;

  &:hover {
    background: var(--surface-raised);
    color: var(--text-body);
  }
  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }
  // The global .router-link-active decorator bumps the font a size up with
  // !important, which clipped labels and shifted the layout on every route
  // change — pin the size back, scoped to the sidebar.
  &.router-link-active {
    font-size: inherit !important;
    color: var(--text-accent) !important;
    font-weight: 600;
    background: color-mix(in srgb, var(--accent-fill) 10%, transparent);

    &::before {
      content: "";
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 18px;
      border-radius: var(--radius-full);
      background: var(--accent-fill);
    }
  }
}
.nav-link--collapsed {
  justify-content: center;
  width: 40px;
  padding: var(--space-2) 0;
}
.nav-icon {
  width: 18px;
  font-size: var(--fs-300);
  text-align: center;
  flex-shrink: 0;
  color: var(--text-muted);
  transition: color 0.15s ease;

  .nav-link:hover &,
  .nav-link.router-link-active & {
    color: inherit;
  }
}
.nav-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mobile-nav {
  display: flex;
  align-items: stretch;
  width: 100%;
  height: 100%;
}
.mobile-nav__item {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-height: 44px;
  padding: 0 var(--space-1);
  text-decoration: none;
  color: var(--text-secondary);
  transition: color 0.15s ease;
  overflow: hidden;
  &.router-link-active {
    color: var(--text-accent);
  }
}
.mobile-nav__icon {
  font-size: var(--fs-400);
  flex-shrink: 0;
}
.mobile-nav__label {
  font-size: 9px;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
  text-align: center;
}
</style>
