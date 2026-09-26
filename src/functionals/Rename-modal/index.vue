<template>
  <div v-if="visible" class="modal-overlay">
    <div class="modal-container">
      <div class="modal-header">
        <slot name="header"></slot>
      </div>
      <div class="modal-body">
        <slot name="description"></slot>
      </div>
      <div class="modal-footer mt-8">
        <BasicButton @click="accept" :text="$t('common.copy')"></BasicButton>
        <BasicButton
          @click="reject"
          class="bg-negative-fill t-on-status-fill rounded"
          :text="$t('common.cancel')"
        ></BasicButton>
      </div>
    </div>
  </div>
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
  z-index: 10;
}

.modal-container {
  background: var(--surface-base);
  color: var(--text-body);
  padding: var(--space-5);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  width: 400px;
  max-width: 90%;
}

.modal-header,
.modal-body,
.modal-footer {
  margin-bottom: var(--space-2);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
}

button {
  margin-left: var(--space-2);
}
</style>
