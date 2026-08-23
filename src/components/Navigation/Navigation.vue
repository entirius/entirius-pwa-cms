<template>
  <nav v-if="!mobile" class="navigation-wrapper fs-300 t-basic-700 h-100 ov-h">
    <template v-if="user">
      <nav
        class="navigation pb-100 pt-700"
        :class="isSidebarCollapsed ? '' : 'pl-300 pr-300'"
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
            :class="isSidebarCollapsed ? 'nav-link--collapsed' : ''"
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
      class="mobile-nav__item t-basic-600"
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
import { buildNavRoutes, filterNavRoutes } from "./nav-routes";

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
    return { userStore, qualityStore, munin };
  },
  data() {
    return {
      routes: buildNavRoutes(),
    };
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
  gap: 10px;
  min-width: 0;
  padding: 8px 12px;
  margin-bottom: 2px;
  border-radius: 8px;
  color: var(--c-basic-600);
  font-weight: 500;
  line-height: 1.4;
  text-decoration: none;
  transition: background-color 0.15s ease, color 0.15s ease;

  &:hover {
    background: var(--c-basic-200);
    color: var(--c-basic-800);
  }
  &:focus-visible {
    outline: 2px solid var(--c-support-300);
    outline-offset: -2px;
  }
  // The global .router-link-active decorator bumps the font a size up with
  // !important, which clipped labels and shifted the layout on every route
  // change — pin the size back, scoped to the sidebar.
  &.router-link-active {
    font-size: inherit !important;
    color: var(--c-support-400) !important;
    font-weight: 600;
    background: color-mix(in srgb, var(--c-support-400) 10%, transparent);

    &::before {
      content: "";
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 18px;
      border-radius: 999px;
      background: var(--c-support-400);
    }
  }
}
.nav-link--collapsed {
  justify-content: center;
  width: 40px;
  padding: 8px 0;
}
.nav-icon {
  width: 18px;
  font-size: 15px;
  text-align: center;
  flex-shrink: 0;
  color: var(--c-basic-500);
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
  padding: 0 4px;
  text-decoration: none;
  color: var(--c-basic-600);
  transition: color 0.15s ease;
  overflow: hidden;
  &.router-link-active {
    color: var(--c-support-400);
  }
}
.mobile-nav__icon {
  font-size: 16px;
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
