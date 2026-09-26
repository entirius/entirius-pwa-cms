<template>
  <div class="floating-actions" ref="rootRef">
    <div v-show="isOpen" class="floating-actions__menu" role="menu">
      <div
        v-for="(action, index) in actions"
        :key="index"
        class="floating-actions__item"
        :style="{ animationDelay: `${index * 50}ms` }"
      >
        <span class="floating-actions__label">{{ action.label }}</span>
        <button
          class="floating-actions__action"
          :class="[`floating-actions__action--${action.variant || 'primary'}`]"
          role="menuitem"
          tabindex="0"
          :aria-label="action.label"
          :disabled="action.disabled"
          @click="handleActionClick(action)"
          @keydown.enter="handleActionClick(action)"
        >
          <FontAwesomeIcon
            v-if="!isCustomIcon(action.icon)"
            :icon="action.icon"
          />
          <i v-else :class="action.icon" />
        </button>
      </div>
    </div>

    <button
      v-if="backHandler"
      class="floating-actions__back"
      aria-label="Back"
      @click="backHandler"
    >
      <FontAwesomeIcon icon="backward" />
    </button>

    <button
      class="floating-actions__trigger"
      aria-label="Toggle menu"
      :aria-expanded="isOpen"
      aria-haspopup="menu"
      @click="handleToggle"
    >
      <FontAwesomeIcon
        icon="plus"
        class="floating-actions__trigger-icon"
        :class="{ 'floating-actions__trigger-icon--open': isOpen }"
      />
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";

/**
 * @typedef {Object} FloatingAction
 * @property {string} icon - FA short name or custom class starting with 'icon-'
 * @property {string} label - Tooltip text
 * @property {Function} handler - Click callback
 * @property {'primary'|'secondary'|'danger'} [variant='primary']
 * @property {boolean} [disabled]
 */

defineProps({
  actions: {
    type: Array,
    required: true,
  },
  backHandler: {
    type: Function,
    default: null,
  },
});

const isOpen = ref(false);
const rootRef = ref(null);

const CUSTOM_ICON_PREFIX = "icon-";

function isCustomIcon(icon) {
  return icon.startsWith(CUSTOM_ICON_PREFIX);
}

function handleToggle() {
  isOpen.value = !isOpen.value;
}

function handleActionClick(action) {
  if (action.disabled) return;
  isOpen.value = false;
  action.handler();
}

function handleOutsideClick(event) {
  if (!rootRef.value?.contains(event.target)) {
    isOpen.value = false;
  }
}

function handleEscape(event) {
  if (event.key === "Escape" && isOpen.value) {
    isOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener("click", handleOutsideClick);
  document.addEventListener("keydown", handleEscape);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleOutsideClick);
  document.removeEventListener("keydown", handleEscape);
});
</script>

<style scoped>
.floating-actions {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  z-index: 90;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-3);
}

@media only screen and (max-width: 768px) {
  .floating-actions {
    bottom: calc(var(--bottom-bar-height) + 1rem);
    right: 1rem;
  }
}

.floating-actions__back {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-full);
  border: 1px solid var(--border-default);
  background-color: var(--surface-base);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--fs-300);
  box-shadow: var(--shadow-md);
  transition: all 0.2s ease;
}

.floating-actions__back:hover {
  background-color: var(--surface-raised);
  color: var(--text-body);
}

.floating-actions__trigger {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-full);
  border: none;
  background-color: var(--accent-fill);
  color: var(--text-on-accent-fill);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--fs-400);
  box-shadow: var(--shadow-md);
  transition: background-color 0.2s ease;
}

.floating-actions__trigger:hover {
  filter: brightness(1.1);
}

.floating-actions__trigger-icon {
  transition: transform 0.25s ease;
}

.floating-actions__trigger-icon--open {
  transform: rotate(45deg);
}

.floating-actions__menu {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-2);
}

.floating-actions__item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  animation: fab-fly-in 0.2s ease forwards;
  opacity: 0;
  transform: translateY(8px);
}

@keyframes fab-fly-in {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.floating-actions__label {
  background-color: var(--surface-inverse);
  color: var(--text-inverse);
  font-size: var(--fs-100);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
  white-space: nowrap;
  pointer-events: none;
}

.floating-actions__action {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  border: none;
  color: var(--text-on-accent-fill);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--fs-200);
  box-shadow: var(--shadow-arrow);
  transition: filter 0.2s ease;
  flex-shrink: 0;
}

.floating-actions__action:hover:not(:disabled) {
  filter: brightness(1.1);
}

.floating-actions__action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.floating-actions__action--primary {
  background-color: var(--accent-fill);
}

.floating-actions__action--secondary {
  background-color: var(--surface-inverse);
  color: var(--text-inverse);
}

.floating-actions__action--danger {
  background-color: var(--negative-fill);
  color: var(--text-on-status-fill);
}
</style>
