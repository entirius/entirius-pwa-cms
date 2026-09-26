<template>
  <Transition name="modal">
    <div v-if="visible" class="modal-overlay" @click.self="reject">
      <div class="modal-container">
        <div class="modal-header">
          <slot name="header"></slot>
        </div>
        <div class="modal-body">
          <slot name="description"></slot>
        </div>
        <div class="modal-footer">
          <slot name="footer">
            <button class="modal-btn modal-btn--secondary" @click="reject">
              {{ $t("common.cancel") }}
            </button>
            <button class="modal-btn modal-btn--delete" @click="accept">
              <FontAwesomeIcon icon="trash-can" />
              {{ $t("common.accept") }}
            </button>
          </slot>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script>
export default {
  name: "ConfirmationModal",
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
  },
  methods: {
    accept() {
      this.$emit("accept");
    },
    reject() {
      this.$emit("reject");
    },
  },
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
  padding: var(--space-4);
}

.modal-container {
  background: var(--surface-base);
  padding: var(--space-6);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-subtle);
  box-shadow: var(--shadow-lg);
  width: 420px;
  max-width: 100%;
}

.modal-header {
  margin-bottom: var(--space-3);
}

.modal-header h2 {
  font-size: var(--fs-400);
  font-weight: 600;
  color: var(--text-body);
  margin: 0;
}

.modal-body {
  margin-bottom: var(--space-6);
}

.modal-body p {
  font-size: var(--fs-300);
  line-height: 1.5;
  color: var(--text-secondary);
  margin: 0;
}

.modal-footer {
  display: flex;
  gap: var(--space-2);
  justify-content: flex-end;
}

.modal-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  height: 36px;
  padding: 0 var(--space-4);
  font-size: var(--fs-250);
  font-weight: 500;
  font-family: inherit;
  border-radius: var(--radius-base);
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

.modal-btn--delete {
  background: var(--surface-base);
  border-color: var(--border-default);
  color: var(--text-body);
}

.modal-btn--delete:hover {
  background: var(--surface-raised);
  border-color: var(--border-default);
  color: var(--text-body);
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
