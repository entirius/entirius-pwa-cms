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
  gap: 5px;
}

.mobile-filter-panel__trigger {
  display: none;
  position: relative;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: 5px;
  border: 1px solid var(--c-basic-400);
  background-color: var(--c-basic-100);
  color: var(--c-basic-600);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;
  &:hover {
    background-color: var(--c-basic-200);
    color: var(--c-basic-800);
  }
}

.mobile-filter-panel__badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 16px;
  height: 16px;
  font-size: 10px;
  font-weight: 600;
  line-height: 16px;
  text-align: center;
  border-radius: 50px;
  background-color: var(--c-support-400);
  color: var(--c-basic-100);
  pointer-events: none;
}

.mobile-filter-panel__desktop {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
}

.mobile-filter-panel__dropdown {
  display: none;
}

@media only screen and (max-width: 768px) {
  .mobile-filter-panel {
    gap: 8px;
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
    gap: 5px;
    width: 100%;
    max-height: 40vh;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding: 8px;
    background-color: var(--c-basic-200);
    border: 1px solid var(--c-basic-300);
    border-radius: 5px;
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
