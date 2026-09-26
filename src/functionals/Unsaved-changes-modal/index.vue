<template>
  <Transition name="modal">
    <div v-if="visible" class="modal-overlay" @click.self="$emit('stay')">
      <div class="modal-container">
        <div class="modal-header">
          <h2>{{ $t("unsaved.title") }}</h2>
        </div>
        <div class="modal-body">
          <p>{{ $t("unsaved.message") }}</p>
        </div>
        <div class="modal-footer">
          <button class="modal-btn modal-btn--secondary" @click="$emit('stay')">
            {{ $t("common.cancel") }}
          </button>
          <button
            class="modal-btn modal-btn--discard"
            @click="$emit('discard')"
          >
            {{ $t("unsaved.discard") }}
          </button>
          <button class="modal-btn modal-btn--save" @click="$emit('save')">
            {{ $t("unsaved.save_and_leave") }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script>
export default {
  name: "UnsavedChangesModal",
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["save", "discard", "stay"],
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--overlay-backdrop);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
  padding: 1rem;
}

.modal-container {
  background: var(--surface-base);
  padding: 24px;
  border-radius: 8px;
  border: 1px solid var(--border-subtle);
  box-shadow: var(--shadow-lg);
  width: 420px;
  max-width: 100%;
}

.modal-header {
  margin-bottom: 12px;
}

.modal-header h2 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-body);
  margin: 0;
}

.modal-body {
  margin-bottom: 24px;
}

.modal-body p {
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-secondary);
  margin: 0;
}

.modal-footer {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.modal-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 36px;
  padding: 0 16px;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  border-radius: 5px;
  border: 1px solid;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.modal-btn--secondary {
  background: var(--surface-base);
  border-color: var(--border-default);
  color: var(--text-body);
}

.modal-btn--secondary:hover {
  background: var(--surface-raised);
  border-color: var(--border-default);
}

.modal-btn--discard {
  background: var(--negative-subtle);
  border-color: var(--negative);
  color: var(--negative);
}

.modal-btn--discard:hover {
  background: var(--negative-fill);
  border-color: var(--negative);
  color: var(--text-on-status-fill);
}

.modal-btn--save {
  background: var(--accent-fill);
  border-color: var(--accent);
  color: var(--text-on-accent-fill);
}

.modal-btn--save:hover {
  background: var(--accent-fill);
  border-color: var(--accent);
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.15s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-container {
  animation: modal-scale 0.15s ease-out;
}

@keyframes modal-scale {
  from {
    opacity: 0;
    transform: scale(0.96);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
