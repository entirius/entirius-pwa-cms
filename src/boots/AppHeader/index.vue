<template>
  <header class="app-header flex ai-ct" :class="{ 'app-header--mobile': isMobile }" data-fid="header">
    <router-link to="/" class="app-header__logo flex ai-ct" data-fid="logo">
      <BasicLogo variant="full" :size="isMobile ? 24 : 32" />
    </router-link>
    <div class="app-header__tools flex ai-ct gap-2">
      <template v-if="!isMobile">
        <ConfigHealthButton v-if="healthEnabled" />
        <NotificationBell v-if="munin.isModuleEnabled('notifications')" />
      </template>
      <UserMenu />
      <template v-if="isMobile">
        <span class="app-header__separator" aria-hidden="true" />
        <IconButton
          size="lg"
          :icon="menuOpen ? 'close' : 'menu'"
          :label="menuOpen ? $t('shell.close_menu') : $t('shell.menu')"
          :pressed="menuOpen"
          :aria-expanded="String(menuOpen)"
          :aria-controls="menuId"
          @click="$emit('update:menuOpen', !menuOpen)"
        />
      </template>
    </div>
  </header>
</template>

<script setup>
// The app bar (R1, R2; r05 §5, Figma S1/S2): the wordmark (home link) and, on the right, configuration health and
// the notification bell (both conditional, as before) and the user menu. No page title, no panel switcher. Desktop
// 88 px (wordmark 206 × 32 at x 40); below the shell breakpoint 81 px (wordmark 154 × 24) with the menu button after
// a hairline separator: it toggles `menuOpen` (v-model) and controls the MobileMenu `menuId`. `mobile` forces a
// layout (catalogue); by default the breakpoint decides.
import { computed } from "vue";
import BasicLogo from "@/boots/BasicLogo/index.vue";
import IconButton from "@/boots/IconButton/index.vue";
import UserMenu from "@/boots/UserMenu/index.vue";
import ConfigHealthButton from "@/components/ConfigHealth/ConfigHealthButton.vue";
import NotificationBell from "@/components/NotificationBar/NotificationBell.vue";
import { useMuninStore } from "@/stores/munin";
import { useIsDesktop } from "@/composables/useIsDesktop";

const props = defineProps({
  menuOpen: { type: Boolean, default: false },
  menuId: { type: String, default: "mobile-menu" },
  mobile: { type: Boolean, default: undefined },
});
defineEmits(["update:menuOpen"]);

const munin = useMuninStore();
const isDesktop = useIsDesktop();
const isMobile = computed(() => props.mobile ?? !isDesktop.value);
// Admin data loaded (the health endpoint is admin-only) and munin itself enabled.
const healthEnabled = computed(() => munin.loaded && munin.isModuleEnabled("munin"));
</script>

<style lang="scss" scoped>
.app-header {
  box-sizing: border-box;
  width: 100%;
  height: 88px;
  padding: 0 var(--space-10);
  border-bottom: 1px solid var(--border-hairline);
  background: var(--surface-page);
}

.app-header--mobile {
  height: auto;
  padding: var(--space-5);
}

.app-header__logo {
  text-decoration: none;

  &:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: 2px;
  }
}

.app-header__tools {
  margin-left: auto;
}

.app-header__separator {
  width: 1px;
  height: var(--space-6);
  background: var(--border-hairline);
}
</style>
