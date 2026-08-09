<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="visible"
        class="raw-modal-overlay"
        @click.self="$emit('close')"
        data-testid="raw-data-modal"
      >
        <div class="raw-modal-container bg-basic-100 b-basic-300 br-100 p-400">
          <div class="flex ai-ct jc-sb mb-200">
            <h2 class="fs-400 fw-600">{{ $t("atlas.review.raw_data_title") }}</h2>
            <button
              class="raw-modal__close"
              data-testid="raw-data-modal-close"
              @click="$emit('close')"
            >
              <FontAwesomeIcon icon="xmark" />
            </button>
          </div>
          <pre class="raw-modal__pre bg-basic-200 t-basic-800 p-200 br-sm">{{
            formatted
          }}</pre>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script>
export default {
  name: "RawDataModal",
  props: {
    visible: { type: Boolean, default: false },
    product: { type: Object, default: null },
  },
  emits: ["close"],
  computed: {
    formatted() {
      if (!this.product) return "";
      return JSON.stringify(this.product, null, 2);
    },
  },
};
</script>

<style lang="scss" scoped>
.raw-modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--overlay-backdrop);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: var(--space-300);
}
.raw-modal-container {
  width: min(720px, 100%);
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-lg);
}
.raw-modal__close {
  background: transparent;
  border: none;
  font-size: 18px;
  color: var(--c-basic-500);
  cursor: pointer;
}
.raw-modal__close:hover {
  color: var(--c-basic-700);
}
.raw-modal__pre {
  flex: 1;
  overflow: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: var(--fs-200);
  line-height: 1.4;
  white-space: pre;
}
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.15s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
