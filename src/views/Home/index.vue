<template>
  <div class="home-view h-100 ov-h">
    <div class="home-inner h-100 ovy-auto">
      <div class="home-content">
        <PageHeader :overline="greeting" :title="$t('panels.choose_panel')" class="mb-8" />

        <div class="panel-grid">
          <component
            :is="panel.isEnabled ? 'button' : 'div'"
            v-for="panel in panels"
            :key="panel.idx"
            class="panel-card"
            :class="{ 'panel-card--disabled': !panel.isEnabled }"
            v-bind="panel.isEnabled ? { tabindex: '0' } : {}"
            :aria-label="$t(panel.labelKey)"
            @click="panel.isEnabled && $router.push(panel.root)"
            @keydown.enter="panel.isEnabled && $router.push(panel.root)"
          >
            <div class="panel-card-icon-wrap">
              <FontAwesomeIcon :icon="panel.icon" class="panel-card-icon" />
            </div>
            <p class="panel-card-name">{{ $t(panel.labelKey) }}</p>
            <p v-if="panel.isEnabled" class="panel-card-desc">
              {{ $t(panel.descriptionKey) }}
            </p>
            <p v-else class="panel-card-locked-msg">
              <FontAwesomeIcon :icon="$icons.lock" />
              {{ $t("panels.contact_admin") }}
            </p>
          </component>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { useUserStore } from "@/stores/user";
import { useMuninStore } from "@/stores/munin";
import { panels as panelRegistry } from "../../configs/access";

const HIDE_DISABLED = (process.env.VUE_APP_HIDE_DISABLED_PANELS || "").toUpperCase() === "TRUE";

export default {
  setup() {
    const userStore = useUserStore();
    const munin = useMuninStore();
    return { userStore, munin };
  },
  computed: {
    panels() {
      const all = panelRegistry.map(p => ({
        ...p,
        isEnabled: this.munin.isPanelEnabled(p.idx),
      }));
      return HIDE_DISABLED ? all.filter(p => p.isEnabled) : all;
    },
    user() {
      return this.userStore.user;
    },
    greeting() {
      const name = this.user?.first_name || this.user?.username || "";
      return name ? this.$t("panels.greeting_name", { name }) : this.$t("panels.greeting");
    },
  },
};
</script>

<style lang="scss" scoped>
.home-view {
  display: flex;
  align-items: flex-start;
  justify-content: center;
}
.home-inner {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  width: 100%;
}
.home-content {
  width: 100%;
  max-width: 860px;
  padding: var(--space-12) var(--space-8);
}
.panel-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3);

  @media only screen and (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media only screen and (max-width: 480px) {
    grid-template-columns: 1fr;
  }
}
.panel-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-2);
  padding: var(--space-5) var(--space-4);
  background: var(--surface-base);
  border: 1px solid transparent;
  border-radius: var(--radius-xl);
  cursor: pointer;
  font: inherit;
  color: inherit;
  transition: all 0.2s ease;
  &:hover,
  &:focus-visible {
    border-color: var(--border-subtle);
    box-shadow: var(--shadow-sm);
    .panel-card-icon-wrap {
      background: var(--accent-subtle);
    }
  }
}
.panel-card-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-xl);
  background: var(--surface-raised);
  flex-shrink: 0;
  transition: background 0.2s ease;
}
.panel-card-icon {
  font-size: var(--fs-500);
  color: var(--text-accent);
}
.panel-card-name {
  font-size: var(--fs-300);
  font-weight: 600;
  color: var(--text-body);
}
.panel-card-desc {
  font-size: var(--fs-200);
  color: var(--text-muted);
  line-height: 1.4;
}
.panel-card--disabled {
  opacity: 0.5;
  cursor: default;
  &:hover,
  &:focus-visible {
    border-color: transparent;
    box-shadow: none;
    .panel-card-icon-wrap {
      background: var(--surface-raised);
    }
  }
}
.panel-card-locked-msg {
  font-size: var(--fs-200);
  color: var(--text-muted);
  line-height: 1.4;
  display: flex;
  align-items: center;
  gap: var(--space-1);
}
</style>
