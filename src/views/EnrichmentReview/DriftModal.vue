<template>
  <Teleport to="body">
    <Transition name="drift-modal">
      <div
        v-if="visible"
        class="drift-modal__overlay"
        @click.self="$emit('close')"
      >
        <div
          class="drift-modal__box bg-basic-100"
          role="dialog"
          aria-modal="true"
          data-testid="enrichment-drift-modal"
        >
          <div class="drift-modal__header b-basic-300 bb-100">
            <FontAwesomeIcon
              icon="triangle-exclamation"
              class="t-warning-300"
            />
            <h2 class="fs-400 fw-600 m-0">
              {{ $t("enrichment.drift.title") }}
            </h2>
          </div>
          <div class="drift-modal__body">
            <p class="fs-200 t-basic-600 mt-0">
              {{ $t("enrichment.drift.intro") }}
            </p>
            <div v-if="active" class="drift-modal__diff">
              <DiffRenderer
                :target-kind="active.target_kind"
                :proposed="active.proposed_value"
                :current="active.current_snapshot"
                :proposal-id="active.id"
                :subject-label="active.subject_label || active.subject_ref"
              />
            </div>
            <label class="drift-modal__reason-label fs-200 t-basic-500">{{
              $t("enrichment.review.reject_reason")
            }}</label>
            <textarea
              v-model="reason"
              class="drift-modal__reason"
              rows="2"
              :placeholder="$t('enrichment.review.reject_reason_placeholder')"
              data-testid="enrichment-drift-reason"
            />
          </div>
          <div class="drift-modal__footer b-basic-300 bt-100">
            <button
              class="drift-modal__btn bg-basic-200 t-basic-600"
              :disabled="busy"
              @click="$emit('close')"
            >
              {{ $t("common.cancel") }}
            </button>
            <button
              class="drift-modal__btn bg-negative-100 t-negative-300"
              :disabled="busy"
              data-testid="enrichment-drift-reject"
              @click="$emit('reject', { proposal: active, reason })"
            >
              {{ $t("common.reject") }}
            </button>
            <button
              class="drift-modal__btn bg-positive-200 t-basic-100"
              :disabled="busy"
              data-testid="enrichment-drift-confirm"
              @click="$emit('confirm', active)"
            >
              {{ $t("enrichment.drift.confirm") }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script>
import DiffRenderer from "./DiffRenderer.vue";

export default {
  name: "EnrichmentDriftModal",
  components: { DiffRenderer },
  props: {
    visible: { type: Boolean, default: false },
    // The proposal handed in by the parent IS the accept response — when status
    // flipped to `drifted` the bus already refreshed `current_snapshot` to the
    // live value, so there is nothing fresher to fetch.
    proposal: { type: Object, default: null },
    busy: { type: Boolean, default: false },
  },
  emits: ["confirm", "reject", "close"],
  data() {
    return { reason: "" };
  },
  computed: {
    active() {
      return this.proposal;
    },
  },
  watch: {
    visible(open) {
      if (open) this.reason = "";
    },
  },
};
</script>

<style lang="scss" scoped>
.drift-modal__overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: var(--overlay-backdrop);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-300);
}
.drift-modal__box {
  width: 100%;
  max-width: 640px;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}
.drift-modal__header {
  display: flex;
  align-items: center;
  gap: var(--space-100);
  padding: var(--space-300);
}
.drift-modal__body {
  padding: var(--space-300);
  overflow-y: auto;
}
.drift-modal__diff {
  margin: var(--space-200) 0;
}
.drift-modal__reason-label {
  display: block;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: var(--space-100);
}
.drift-modal__reason {
  width: 100%;
  padding: var(--space-200);
  border: 1px solid var(--c-basic-400);
  border-radius: var(--radius-sm);
  background: var(--c-basic-100);
  color: var(--c-basic-800);
  font-size: var(--fs-200);
  resize: vertical;
}
.drift-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-100);
  padding: var(--space-300);
}
.drift-modal__btn {
  height: var(--elem-height);
  padding: 0 16px;
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--fs-200);
  cursor: pointer;
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
.drift-modal-enter-active,
.drift-modal-leave-active {
  transition: opacity 0.15s ease;
}
.drift-modal-enter-from,
.drift-modal-leave-to {
  opacity: 0;
}
</style>
