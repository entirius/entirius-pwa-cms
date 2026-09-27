<template>
  <div
    id="app"
    class="bg-page flex-column ai-ct jc-ct"
    :class="{ 'app--no-panel-nav': hasPanel && !showBottomBar }"
  >
    <EnvMissing v-if="!envValid" :status="envStatus" />
    <router-view v-else-if="isAuth && isFullscreen" />
    <template v-else-if="isAuth">
      <div
        class="app-header flex ai-ct bb-subtle w-100 bg-base relative"
        style="z-index: 10"
      >
        <div
          v-if="hasPanel && showPanelNav"
          class="app-sidebar-col flex ai-ct br-subtle"
          style="align-self: stretch"
          :class="
            isSidebarCollapsed ? 'sidebar-collapsed jc-ct' : 'p-2 pl-8'
          "
        >
          <router-link to="/" class="app-logo-link">
            <BasicLogo
              :size="isSidebarCollapsed ? 30 : 22"
              :variant="isSidebarCollapsed ? 'icon' : 'full'"
            />
          </router-link>
        </div>
        <div v-else class="flex ai-ct p-2 pl-8">
          <router-link to="/" class="app-logo-link">
            <BasicLogo :size="22" variant="full" />
          </router-link>
        </div>
        <div v-if="hasPanel" class="app-header-mobile-logo hide-mobile">
          <router-link to="/" class="app-logo-link">
            <BasicLogo :size="22" variant="full" />
          </router-link>
        </div>
        <div
          class="app-content-col p-2 pl-8 flex ai-ct jc-sb"
          style="overflow: visible"
        >
          <h2 v-if="hasPanel" class="fs-400 fw-600 t-body route-title">
            {{ routeTitle }}
          </h2>
          <span v-else></span>
          <HeaderControls />
        </div>
      </div>
      <div class="layout flex relative">
        <template v-if="hasPanel && showPanelNav">
          <Navigation
            class="app-sidebar-col bg-base br-subtle"
            :class="{
              'sidebar-collapsed': isSidebarCollapsed,
              'sidebar-disabled': handyType,
            }"
          />
          <button
            class="sidebar-edge-toggle"
            :class="{ 'sidebar-edge-toggle--disabled': handyType }"
            :style="{ left: isSidebarCollapsed ? '48px' : '240px' }"
            :tabindex="handyType ? -1 : 0"
            :aria-label="
              isSidebarCollapsed
                ? $t('app.expand_sidebar')
                : $t('app.collapse_sidebar')
            "
            @click="!handyType && toggleSidebar()"
            @keydown.enter="!handyType && toggleSidebar()"
          >
            <FontAwesomeIcon
              :icon="isSidebarCollapsed ? $icons.next : $icons.prev"
            />
          </button>
        </template>
        <div class="app-content-col ov-h router-container">
          <router-view class="h-100" />
        </div>
      </div>
      <Loading v-if="loading" />
      <handy-kit v-if="handyType" />
      <nav
        v-if="hasPanel && showBottomBar"
        class="mobile-bottom-bar show-mobile"
      >
        <Navigation :mobile="true" />
      </nav>
    </template>
    <router-view v-else-if="isPublicRoute" />
    <LoginWall v-else />
    <Notifications />
  </div>
</template>

<script>
import { useLoaderStore } from "@/stores/loader";
import { useUserStore } from "@/stores/user";
import { useHandyStore } from "@/stores/handy";
import { useMuninStore } from "@/stores/munin";
import { useNotificationsStore } from "@/stores/notifications";
import { useConfigHealthStore } from "@/stores/configHealth";
import { useLeadTypesStore } from "@/stores/leadTypes";
import { useQualityStore } from "@/stores/quality";
import { useIsDesktop } from "@/composables/useIsDesktop";
import {
  buildNavRoutes,
  filterNavRoutes,
} from "./components/Navigation/nav-routes";

import { envStatus } from "@/utils/env-check";
import { clearCompanyNames } from "@/utils/leadsCompanyNames";
import "@/utils/client-config-check";
import EnvMissing from "./components/EnvMissing.vue";
import LoginWall from "./functionals/Login-wall/Login-wall.vue";
import Notifications from "./components/Notifications/Notifications.vue";
import Navigation from "./components/Navigation/Navigation.vue";
import HeaderControls from "./components/Navigation/HeaderControls.vue";

import HandyKit from "./functionals/Handy-kit/Handy-kit.vue";
import Loading from "./components/Loading.vue";

export default {
  setup() {
    const loader = useLoaderStore();
    const userStore = useUserStore();
    const handy = useHandyStore();
    const munin = useMuninStore();
    const quality = useQualityStore();
    const notificationBar = useNotificationsStore();
    const configHealth = useConfigHealthStore();
    const leadTypes = useLeadTypesStore();
    const isDesktop = useIsDesktop();
    return { loader, userStore, handy, munin, quality, notificationBar, configHealth, leadTypes, isDesktop };
  },
  data() {
    return { envStatus, navRoutes: buildNavRoutes() };
  },
  computed: {
    envValid() {
      return envStatus.valid;
    },
    loading() {
      return this.loader.loading;
    },
    handyType() {
      return this.handy.handyType;
    },
    isAuth() {
      return this.userStore.isAuth;
    },
    notificationsActive() {
      return this.userStore.isAuth && this.munin.isModuleEnabled("notifications");
    },
    // Health polling needs admin data (`munin.loaded`) — the endpoint is admin-only.
    configHealthActive() {
      return this.userStore.isAuth && this.munin.loaded && this.munin.isModuleEnabled("munin");
    },
    isSidebarCollapsed() {
      return this.userStore.isSidebarCollapsed;
    },
    hasPanel() {
      return !!this.$route.meta?.panel;
    },
    // A panel with a single nav entry (enrichment, emails, accounts, checkout, stock) needs no
    // sub-navigation — hide the sidebar + edge toggle + mobile bottom bar and let content fill.
    // A screen with its own sticky actions at the bottom (Leads Review) keeps the phone's bottom bar off it.
    showBottomBar() {
      return this.showPanelNav && !this.$route.meta?.noBottomBar;
    },
    showPanelNav() {
      return (
        filterNavRoutes(this.navRoutes, {
          activeApp: this.userStore.activeApp,
          qualityAvailable: this.quality.available,
          isModuleEnabled: this.munin.isModuleEnabled,
          isDesktop: this.isDesktop,
        }).length > 1
      );
    },
    isPublicRoute() {
      return this.$route.meta?.requiresAuth === false;
    },
    isFullscreen() {
      return !!this.$route.meta?.fullscreen;
    },
    routeTitle() {
      // Vue Router 4: Check matched routes from deepest to shallowest
      const matched = this.$route.matched;
      for (let i = matched.length - 1; i >= 0; i--) {
        if (matched[i].meta && matched[i].meta.titleKey) {
          return this.$t(matched[i].meta.titleKey);
        }
      }
      return this.$t("app.no_title");
    },
  },
  watch: {
    // Notification bar polling runs only while logged in and the module is on.
    notificationsActive: {
      handler(active) {
        if (active) this.notificationBar.start();
        else this.notificationBar.stop();
      },
      immediate: true,
    },
    configHealthActive: {
      handler(active) {
        if (active) this.configHealth.start();
        else this.configHealth.stop();
      },
      immediate: true,
    },
    // Logout drops the leads caches that outlive a view — the next user may work another channel.
    isAuth(auth) {
      if (auth) return;
      this.leadTypes.reset();
      clearCompanyNames();
    },
  },
  methods: {
    toggleSidebar() {
      this.userStore.toggleSidebar();
    },
  },

  async created() {
    this.userStore.appInit();
    if (this.userStore.isAuth) {
      this.munin.ensureLoaded();
    }
  },
  components: {
    EnvMissing,
    Notifications,
    Navigation,
    HeaderControls,
    HandyKit,
    Loading,
    LoginWall,
  },
};
</script>

<style lang="scss">
@import "./assets/scss/main.scss";
#app {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}
// Single-tab panels hide the mobile bottom bar — reclaim the height it would have reserved so the
// content area isn't left with an empty strip (the var also drives the FloatingActions offset).
.app--no-panel-nav {
  --bottom-bar-height: 0px;
}
.app-logo-link {
  display: flex;
  align-items: center;
  text-decoration: none;
  cursor: pointer;
}
.app-sidebar-col {
  width: 240px;
  flex-shrink: 0;
  transition: width 0.3s ease, opacity 0.2s ease;
  overflow: hidden;

  &.sidebar-collapsed {
    width: 48px;
  }
  &.sidebar-disabled {
    opacity: 0.4;
    pointer-events: none;
  }
}
.app-content-col {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}
.layout {
  overflow: hidden;
  width: 100%;
  height: 100%;
  .router-container {
    & > div {
    }
  }
}
.sidebar-edge-toggle {
  position: absolute;
  top: 50%;
  transform: translate(-60%, -50%);
  transition: left 0.3s ease, opacity 0.2s ease;
  z-index: 10;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-full);
  border: 1px solid var(--border-subtle);
  background: var(--surface-base);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--fs-200);
  box-shadow: var(--shadow-sm);
  &:hover {
    background: var(--surface-raised);
  }
  &--disabled {
    opacity: 0.4;
    cursor: not-allowed;
    pointer-events: none;
  }
}
.app-header-mobile-logo {
  display: none;
}
.route-title {
  @media only screen and (max-width: 768px) {
    max-width: 40vw;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
.mobile-bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 56px;
  background-color: var(--surface-base);
  border-top: 1px solid var(--border-subtle);
  z-index: 20;
}
@media only screen and (max-width: 768px) {
  .app-sidebar-col,
  .sidebar-edge-toggle {
    display: none !important;
  }
  .app-header-mobile-logo {
    display: flex;
    align-items: center;
    padding: var(--space-1) var(--space-1) var(--space-1) var(--space-4);
  }
  // The layout takes the height the header leaves; its padding keeps every scroll region above the fixed
  // bottom bar.
  .layout {
    flex: 1;
    height: auto;
    min-height: 0;
    padding-bottom: calc(var(--bottom-bar-height) + env(safe-area-inset-bottom, 0px));
  }
}
</style>
