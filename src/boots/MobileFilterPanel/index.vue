<template>
  <div class="mobile-filter-panel" ref="rootRef">
    <button
      class="mobile-filter-panel__trigger"
      @click="isOpen = !isOpen"
      :aria-label="triggerLabel"
      :aria-expanded="isOpen"
    >
      <FontAwesomeIcon icon="filter" />
      <span v-if="activeCount > 0" class="mobile-filter-panel__badge">{{
        activeCount
      }}</span>
    </button>
    <div class="mobile-filter-panel__desktop">
      <slot />
    </div>
    <Transition name="mfp-slide">
      <div v-if="isOpen" class="mobile-filter-panel__dropdown">
        <slot />
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";

defineProps({
  activeCount: {
    type: Number,
    default: 0,
  },
  triggerLabel: {
    type: String,
    default: "Filters",
  },
});

const isOpen = ref(false);
const rootRef = ref(null);

function handleOutsideClick(event) {
  if (rootRef.value && !rootRef.value.contains(event.target)) {
    isOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener("click", handleOutsideClick);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleOutsideClick);
});
</script>

<style lang="scss" scoped>
.mobile-filter-panel {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-1);
}

.mobile-filter-panel__trigger {
  display: none;
  position: relative;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: var(--radius-base);
  border: 1px solid var(--border-default);
  background-color: var(--surface-base);
  color: var(--text-secondary);
  font-size: var(--fs-250);
  cursor: pointer;
  transition: all 0.15s ease;
  &:hover {
    background-color: var(--surface-raised);
    color: var(--text-body);
  }
}

.mobile-filter-panel__badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 16px;
  height: 16px;
  font-size: var(--fs-100);
  font-weight: 600;
  line-height: 16px;
  text-align: center;
  border-radius: var(--radius-full);
  background-color: var(--accent-fill);
  color: var(--text-on-accent-fill);
  pointer-events: none;
}

.mobile-filter-panel__desktop {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}

.mobile-filter-panel__dropdown {
  display: none;
}

@media only screen and (max-width: 768px) {
  .mobile-filter-panel {
    gap: var(--space-2);
  }

  .mobile-filter-panel__trigger {
    display: flex;
  }

  .mobile-filter-panel__desktop {
    display: none;
  }

  .mobile-filter-panel__dropdown {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-1);
    width: 100%;
    max-height: 40vh;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding: var(--space-2);
    background-color: var(--surface-raised);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-base);
  }
}

.mfp-slide-enter-active,
.mfp-slide-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.mfp-slide-enter-from,
.mfp-slide-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
