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
  padding: 1rem;
}

.modal-container {
  background: var(--c-basic-100);
  padding: 24px;
  border-radius: 8px;
  border: 1px solid var(--c-basic-300);
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
  color: var(--c-basic-700);
  margin: 0;
}

.modal-body {
  margin-bottom: 24px;
}

.modal-body p {
  font-size: 14px;
  line-height: 1.5;
  color: var(--c-basic-600);
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
  background: var(--c-basic-100);
  border-color: var(--c-basic-400);
  color: var(--c-basic-700);
}

.modal-btn--secondary:hover {
  background: var(--c-basic-200);
  border-color: var(--c-basic-500);
}

.modal-btn--delete {
  background: var(--c-basic-100);
  border-color: var(--c-basic-400);
  color: var(--c-basic-700);
}

.modal-btn--delete:hover {
  background: var(--c-basic-200);
  border-color: var(--c-basic-500);
  color: var(--c-basic-800);
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
