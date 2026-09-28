<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="visible"
        class="raw-modal-overlay"
        @click.self="$emit('close')"
        data-testid="raw-data-modal"
      >
        <BasicCard class="raw-modal-container">
          <div class="flex ai-ct jc-sb mb-5">
            <h2 class="fs-400 fw-600">{{ $t("atlas.review.raw_data_title") }}</h2>
            <button
              class="raw-modal__close"
              data-testid="raw-data-modal-close"
              @click="$emit('close')"
            >
              <FontAwesomeIcon :icon="$icons.close" />
            </button>
          </div>
          <pre class="raw-modal__pre bg-raised t-body p-5 rounded">{{
            formatted
          }}</pre>
        </BasicCard>
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
  padding: var(--space-8);
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
  font-size: var(--fs-500);
  color: var(--text-muted);
  cursor: pointer;
}
.raw-modal__close:hover {
  color: var(--text-body);
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
