<template>
  <div
    id="app"
    class="main-bg-theme flex-column ai-ct jc-ct"
    :class="{ 'app--no-panel-nav': hasPanel && !showPanelNav }"
  >
    <EnvMissing v-if="!envValid" :status="envStatus" />
    <router-view v-else-if="isAuth && isFullscreen" />
    <template v-else-if="isAuth">
      <div
        class="app-header flex ai-ct bb-basic-300 w-100 bg-basic-100 relative"
        style="z-index: 10"
      >
        <div
          v-if="hasPanel && showPanelNav"
          class="app-sidebar-col flex ai-ct br-basic-300"
          style="align-self: stretch"
          :class="
            isSidebarCollapsed ? 'sidebar-collapsed jc-ct' : 'p-100 pl-300'
          "
        >
          <router-link to="/" class="app-logo-link">
            <BasicLogo
              :size="isSidebarCollapsed ? 30 : 22"
              :variant="isSidebarCollapsed ? 'icon' : 'full'"
            />
          </router-link>
        </div>
        <div v-else class="flex ai-ct p-100 pl-300">
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
          class="app-content-col p-100 pl-300 flex ai-ct jc-sb"
          style="overflow: visible"
        >
          <h2 v-if="hasPanel" class="fs-400 fw-600 t-basic-800 route-title">
            {{ routeTitle }}
          </h2>
          <span v-else></span>
          <HeaderControls />
        </div>
      </div>
      <div class="layout flex relative">
        <template v-if="hasPanel && showPanelNav">
          <Navigation
            class="app-sidebar-col bg-basic-100 br-basic-300"
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
              :icon="isSidebarCollapsed ? 'chevron-right' : 'chevron-left'"
            />
          </button>
        </template>
        <div class="app-content-col ov-h router-container">
          <router-view class="h-100" />
        </div>
      </div>
      <Loading v-if="loading" />
      <handy-kit v-if="handyType" />
      <nav v-if="hasPanel && showPanelNav" class="mobile-bottom-bar show-mobile">
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
import { useQualityStore } from "@/stores/quality";
import { buildNavRoutes, filterNavRoutes } from "./components/Navigation/nav-routes";

import { envStatus } from "@/utils/env-check";
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
    return { loader, userStore, handy, munin, quality };
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
    isSidebarCollapsed() {
      return this.userStore.isSidebarCollapsed;
    },
    hasPanel() {
      return !!this.$route.meta?.panel;
    },
    // A panel with a single nav entry (enrichment, emails, accounts, checkout, stock) needs no
    // sub-navigation — hide the sidebar + edge toggle + mobile bottom bar and let content fill.
    showPanelNav() {
      return (
        filterNavRoutes(this.navRoutes, {
          activeApp: this.userStore.activeApp,
          qualityAvailable: this.quality.available,
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
  border-radius: 50%;
  border: 1px solid var(--c-basic-300);
  background: var(--c-basic-100);
  color: var(--c-basic-600);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  box-shadow: var(--shadow-sm);
  &:hover {
    background: var(--c-basic-200);
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
  background-color: var(--c-basic-100);
  border-top: 1px solid var(--c-basic-300);
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
    padding: 4px 4px 4px 16px;
  }
  .layout {
    height: calc(100% - var(--bottom-bar-height));
  }
  .p-500 {
    padding: 12px !important;
  }
}
</style>
