<template>
  <div class="relative">
    <button
      v-if="visible"
      ref="button"
      class="cfg-btn"
      :class="{ 'cfg-btn--active': store.panelOpen, 'cfg-btn--fixed': fixed }"
      :title="label"
      :aria-label="label"
      data-testid="config-health-button"
      @click="toggle"
    >
      <FontAwesomeIcon
        :icon="fixed ? 'circle-check' : 'triangle-exclamation'"
      />
      <span
        v-if="!fixed"
        class="cfg-btn__count"
        data-testid="config-health-count"
        >{{ store.failing.length }}</span
      >
    </button>
    <Teleport to="body">
      <ConfigHealthPanel
        v-if="store.panelOpen"
        :anchor="anchor"
        @close="store.panelOpen = false"
      />
    </Teleport>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { t } from "@/i18n";
import { useConfigHealthStore } from "@/stores/configHealth";
import ConfigHealthPanel from "./ConfigHealthPanel.vue";

// Silence means healthy: the icon exists only while a check fails, plus ~10 s of green "fixed" after a flip.
// Tap/click opens the panel on every viewport; `title` is the desktop hover hint (no hover-only affordance).
// The panel itself is mounted here for both entry points (this icon, the user menu — `anchor` null there).
const store = useConfigHealthStore();
const button = ref(null);
const anchor = ref(null);

const fixed = computed(() => !store.failing.length && store.justFixed);
const visible = computed(() => store.failing.length > 0 || fixed.value);
const label = computed(() =>
  fixed.value
    ? t("config_health.fixed")
    : t("config_health.open", { count: store.failing.length })
);

function toggle() {
  store.panelOpen = !store.panelOpen;
  const rect = button.value.getBoundingClientRect();
  anchor.value = {
    top: Math.round(rect.bottom + 8),
    right: Math.round(window.innerWidth - rect.right),
  };
}
</script>

<style scoped>
.cfg-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: none;
  color: var(--c-warning-300);
  cursor: pointer;
  font-size: 13px;
}
.cfg-btn:hover,
.cfg-btn--active {
  background: var(--c-basic-200);
}
.cfg-btn--fixed {
  color: var(--c-positive-300);
}
.cfg-btn__count {
  position: absolute;
  top: 0;
  right: 0;
  min-width: 1.1rem;
  height: 1.1rem;
  padding: 0 0.25rem;
  border-radius: 999px;
  background: var(--c-negative-300);
  color: var(--c-basic-100);
  font-size: 0.65rem;
  font-weight: 700;
  line-height: 1.1rem;
  text-align: center;
}
</style>
