<template>
  <div class="hc flex ai-ct">
    <!-- Panel Switcher -->
    <div class="relative" v-out="'isPanelSwitcherOpen'">
      <button
        class="hc-btn"
        :class="{ 'hc-btn--active': isPanelSwitcherOpen }"
        tabindex="0"
        :aria-label="$t('panels.switch_panel')"
        @click="isPanelSwitcherOpen = !isPanelSwitcherOpen"
        @keydown.enter="isPanelSwitcherOpen = !isPanelSwitcherOpen"
      >
        <FontAwesomeIcon icon="grip" />
      </button>
      <transition name="hc-drop">
        <div v-if="isPanelSwitcherOpen" class="hc-dropdown">
          <p class="hc-dropdown-label">{{ $t("panels.switch_panel") }}</p>
          <component
            :is="panel.isEnabled ? 'button' : 'div'"
            v-for="panel in panels"
            :key="panel.idx"
            class="hc-dropdown-item"
            :class="{
              'hc-dropdown-item--active':
                panel.isEnabled && activeApp === panel.idx,
              'hc-dropdown-item--disabled': !panel.isEnabled,
            }"
            v-bind="panel.isEnabled ? { tabindex: '0' } : {}"
            @click="panel.isEnabled && handlePanelSelect(panel)"
            @keydown.enter="panel.isEnabled && handlePanelSelect(panel)"
          >
            <FontAwesomeIcon
              :icon="panel.isEnabled ? panel.icon : 'lock'"
              class="hc-dropdown-icon"
            />
            <span>{{ $t(panel.labelKey) }}</span>
          </component>
          <div class="hc-dropdown-sep"></div>
          <button
            class="hc-dropdown-item"
            tabindex="0"
            @click="handleGoHome"
            @keydown.enter="handleGoHome"
          >
            <FontAwesomeIcon icon="house" class="hc-dropdown-icon" />
            <span>{{ $t("nav.home") }}</span>
          </button>
        </div>
      </transition>
    </div>

    <!-- Separator -->
    <div class="hc-sep"></div>

    <!-- Configuration health (django-munin health/) — icon only while a check fails -->
    <ConfigHealthButton v-if="configHealthEnabled" />

    <!-- Notification bar (django-notifications) -->
    <NotificationBell v-if="munin.isModuleEnabled('notifications')" />

    <!-- User Menu -->
    <div class="relative" v-out="'isUserMenuOpen'">
      <button
        class="hc-btn"
        :class="{ 'hc-btn--active': isUserMenuOpen }"
        tabindex="0"
        :aria-label="userFullName"
        @click="isUserMenuOpen = !isUserMenuOpen"
        @keydown.enter="isUserMenuOpen = !isUserMenuOpen"
      >
        <FontAwesomeIcon icon="user" />
      </button>
      <transition name="hc-drop">
        <div v-if="isUserMenuOpen" class="hc-dropdown hc-dropdown--user">
          <!-- User info -->
          <p class="hc-dropdown-label">{{ userFullName }}</p>

          <!-- Theme toggle -->
          <button
            class="hc-dropdown-item"
            tabindex="0"
            @click="toggleTheme"
            @keydown.enter="toggleTheme"
          >
            <FontAwesomeIcon
              :icon="isDark ? 'sun' : 'moon'"
              class="hc-dropdown-icon"
            />
            <span>{{
              isDark ? $t("app.light_mode") : $t("app.dark_mode")
            }}</span>
          </button>

          <!-- Language picker -->
          <button
            class="hc-dropdown-item"
            tabindex="0"
            @click="isLangOpen = !isLangOpen"
            @keydown.enter="isLangOpen = !isLangOpen"
          >
            <FontAwesomeIcon icon="globe" class="hc-dropdown-icon" />
            <span>{{ currentLangLabel }}</span>
            <FontAwesomeIcon
              :icon="isLangOpen ? 'chevron-up' : 'chevron-down'"
              class="hc-dropdown-chevron"
            />
          </button>
          <div v-if="isLangOpen" class="hc-lang-list">
            <button
              v-for="l in languages"
              :key="l.code"
              class="hc-dropdown-item"
              :class="{ 'hc-dropdown-item--active': currentLang === l.code }"
              tabindex="0"
              @click="selectLanguage(l.code)"
              @keydown.enter="selectLanguage(l.code)"
            >
              <FontAwesomeIcon
                :icon="currentLang === l.code ? 'check' : 'globe'"
                class="hc-dropdown-icon"
              />
              <span>{{ l.label }}</span>
            </button>
          </div>

          <!-- Configuration health: the panel is always reachable, green state included -->
          <button
            v-if="configHealthEnabled"
            class="hc-dropdown-item"
            tabindex="0"
            data-testid="config-health-menu"
            @click="openConfigHealth"
            @keydown.enter="openConfigHealth"
          >
            <FontAwesomeIcon icon="circle-check" class="hc-dropdown-icon" />
            <span>{{ $t("config_health.title") }}</span>
          </button>

          <!-- Change password -->
          <button
            class="hc-dropdown-item"
            tabindex="0"
            @click="goToChangePassword"
            @keydown.enter="goToChangePassword"
          >
            <FontAwesomeIcon icon="key" class="hc-dropdown-icon" />
            <span>{{ $t("user.change_password") }}</span>
          </button>

          <div class="hc-dropdown-sep"></div>

          <!-- Logout -->
          <button
            class="hc-dropdown-item hc-dropdown-item--danger"
            tabindex="0"
            @click="handleLogout"
            @keydown.enter="handleLogout"
          >
            <FontAwesomeIcon
              icon="arrow-right-from-bracket"
              class="hc-dropdown-icon"
            />
            <span>{{ $t("app.log_out") }}</span>
          </button>
        </div>
      </transition>
    </div>
  </div>
</template>

<script>
import { useUserStore } from "@/stores/user";
import { useNotifyStore } from "@/stores/notify";
import { useMuninStore } from "@/stores/munin";
import { panels } from "../../configs/access";
import NotificationBell from "@/components/NotificationBar/NotificationBell.vue";
import ConfigHealthButton from "@/components/ConfigHealth/ConfigHealthButton.vue";
import { useConfigHealthStore } from "@/stores/configHealth";

const HIDE_DISABLED = (process.env.VUE_APP_HIDE_DISABLED_PANELS || "").toUpperCase() === "TRUE";

export default {
  components: { NotificationBell, ConfigHealthButton },
  setup() {
    const userStore = useUserStore();
    const notify = useNotifyStore();
    const munin = useMuninStore();
    const configHealth = useConfigHealthStore();
    return { userStore, notify, munin, configHealth };
  },
  data() {
    return {
      isPanelSwitcherOpen: false,
      isUserMenuOpen: false,
      isLangOpen: false,
      languages: [
        { code: "EN", label: "English" },
        { code: "PL", label: "Polski" },
      ],
    };
  },
  computed: {
    // Admin data loaded (the health endpoint is admin-only) and munin itself enabled — the bell's gate.
    configHealthEnabled() {
      return this.munin.loaded && this.munin.isModuleEnabled("munin");
    },
    panels() {
      const all = panels.map((p) => ({
        ...p,
        isEnabled: this.munin.isPanelEnabled(p.idx),
      }));
      return HIDE_DISABLED ? all.filter((p) => p.isEnabled) : all;
    },
    user() {
      return this.userStore.user;
    },
    activeApp() {
      return this.userStore.activeApp;
    },
    theme() {
      return this.userStore.theme;
    },
    isDark() {
      return this.theme === "dark";
    },
    currentLang() {
      return this.userStore.lang;
    },
    currentLangLabel() {
      const found = this.languages.find((l) => l.code === this.currentLang);
      return found ? found.label : this.currentLang;
    },
    userFullName() {
      return this.user?.username || this.user?.email || "User";
    },
  },
  methods: {
    toggleTheme() {
      this.userStore.setTheme(this.isDark ? "default" : "dark");
    },
    selectLanguage(code) {
      if (code !== this.currentLang) {
        this.userStore.setLanguage(code);
      }
      this.isLangOpen = false;
    },
    handlePanelSelect(panel) {
      this.isPanelSwitcherOpen = false;
      this.$router.push(panel.root);
    },
    handleGoHome() {
      this.isPanelSwitcherOpen = false;
      this.$router.push("/");
    },
    openConfigHealth() {
      this.isUserMenuOpen = false;
      this.configHealth.panelOpen = true;
    },
    goToChangePassword() {
      this.isUserMenuOpen = false;
      this.$router.push("/change-password");
    },
    async handleLogout() {
      this.isUserMenuOpen = false;
      await this.userStore.logout();
      if (this.$route.path !== "/") {
        this.$router.push("/");
      }
    },
  },
};
</script>

<style lang="scss">
.hc {
  gap: 2px;
}
.hc-sep {
  width: 1px;
  height: 16px;
  background: var(--surface-hover);
  margin: 0 var(--space-1);
}
.hc-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-lg);
  border: none;
  background: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: var(--fs-250);
  transition: all 0.15s ease;
  &:hover {
    background: var(--surface-raised);
    color: var(--text-body);
  }
  &--active {
    background: var(--surface-raised);
    color: var(--text-body);
  }
}

/* Dropdown */
.hc-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 220px;
  padding: var(--space-1);
  background: var(--surface-base);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
  z-index: 100;
  &--user {
    min-width: 260px;
  }
}
.hc-dropdown-label {
  padding: var(--space-1) var(--space-2) var(--space-1);
  font-size: var(--fs-150);
  font-weight: 500;
  color: var(--text-muted);
  letter-spacing: 0.03em;
  text-transform: uppercase;
}
.hc-dropdown-sep {
  height: 1px;
  background: var(--surface-hover);
  margin: var(--space-1) var(--space-1);
}
.hc-dropdown-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-2) var(--space-2);
  border-radius: var(--radius-base);
  cursor: pointer;
  background: none;
  border: none;
  font: inherit;
  font-size: var(--fs-250);
  color: var(--text-body);
  text-align: left;
  transition: background 0.12s ease;
  &:hover {
    background: var(--surface-raised);
  }
  &--active {
    color: var(--text-accent);
    font-weight: 600;
    background: var(--accent-subtle);
    &:hover {
      background: var(--accent-subtle);
    }
  }
  &--disabled {
    opacity: 0.45;
    cursor: default;
    &:hover {
      background: none;
    }
  }
  &--danger:hover {
    color: var(--negative);
  }
}
.hc-dropdown-icon {
  width: 16px;
  text-align: center;
  flex-shrink: 0;
  font-size: var(--fs-200);
}

.hc-dropdown-chevron {
  margin-left: auto;
  font-size: var(--fs-100);
  color: var(--text-muted);
}
.hc-lang-list {
  padding-left: var(--space-3);
}

/* Dropdown animation */
.hc-drop-enter-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.hc-drop-leave-active {
  transition: opacity 0.1s ease, transform 0.1s ease;
}
.hc-drop-enter-from,
.hc-drop-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
