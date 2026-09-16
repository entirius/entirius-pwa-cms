<template>
  <div ref="bar" class="ra" data-testid="review-actions">
    <button class="ra-btn ra-btn--secondary" :disabled="busy" data-testid="review-skip" @click="$emit('skip')">
      {{ $t("leads.review.not_now") }}
    </button>
    <button class="ra-btn ra-btn--primary" :disabled="busy" data-testid="review-send" @click="$emit('send')">
      <FontAwesomeIcon icon="paper-plane" />
      {{ $t("leads.review.send") }}
    </button>
    <div class="ra__more" v-out="() => (menuOpen = false)">
      <button
        class="ra-btn ra-btn--icon"
        :disabled="busy"
        :aria-label="$t('leads.review.more')"
        :aria-expanded="String(menuOpen)"
        data-testid="review-more"
        @click="menuOpen = !menuOpen"
      >
        <FontAwesomeIcon icon="ellipsis-vertical" />
      </button>
      <div v-if="menuOpen" class="ra__menu" role="menu">
        <button role="menuitem" :disabled="aiDisabled" data-testid="review-rewrite" @click="pick('rewrite')">
          {{ $t("leads.review.rewrite") }}
        </button>
        <button role="menuitem" data-testid="review-edit" @click="pick('edit')">
          {{ $t("leads.review.edit") }}
        </button>
        <button role="menuitem" data-testid="review-skip-company" @click="pick('skip-company')">
          {{ $t("leads.review.skip_company") }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";

defineProps({
  busy: { type: Boolean, default: false },
  aiDisabled: { type: Boolean, default: false },
});
const emit = defineEmits(["send", "skip", "rewrite", "edit", "skip-company"]);
const menuOpen = ref(false);
const bar = ref(null);

// A phone toast sits above this bar (Notifications.vue), so Send / Not now stay reachable while one is on screen.
const root = document.documentElement.style;
onMounted(() => root.setProperty("--action-bar-height", `${bar.value.offsetHeight}px`));
onBeforeUnmount(() => root.removeProperty("--action-bar-height"));

function pick(name) {
  menuOpen.value = false;
  emit(name);
}
</script>

<style scoped>
.ra {
  position: sticky;
  bottom: 0;
  display: flex;
  gap: var(--space-200);
  padding: var(--space-200) var(--space-300);
  background: var(--c-basic-100);
  border-top: 1px solid var(--c-basic-300);
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.04);
}
.ra-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-100);
  min-height: 48px;
  border-radius: 8px;
  border: 1px solid var(--c-basic-300);
  background: var(--c-basic-100);
  color: var(--c-basic-800);
  font-weight: 600;
  cursor: pointer;
}
.ra-btn:disabled {
  opacity: 0.5;
  cursor: default;
}
.ra-btn--secondary {
  flex: 1;
}
.ra-btn--primary {
  flex: 2;
  border-color: var(--c-positive-300);
  background: var(--c-positive-300);
  color: var(--c-basic-100);
}
.ra-btn--icon {
  width: 48px;
}
.ra__more {
  position: relative;
}
.ra__menu {
  position: absolute;
  right: 0;
  bottom: calc(100% + 0.5rem);
  display: flex;
  flex-direction: column;
  min-width: 13rem;
  background: var(--c-basic-100);
  border: 1px solid var(--c-basic-300);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  z-index: 20;
}
.ra__menu button {
  min-height: 44px;
  padding: 0 var(--space-300);
  border: none;
  background: none;
  color: var(--c-basic-800);
  text-align: left;
  cursor: pointer;
}
.ra__menu button:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
