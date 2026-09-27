<template>
  <ConfirmationModal :visible="visible" @reject="$emit('close')">
    <template #header>
      <h2 class="t-warning">
        <FontAwesomeIcon :icon="$icons.warning" class="mr-2" />
        {{ $t("pim.supplier.force_preferred_modal.title") }}
      </h2>
    </template>
    <template #description>
      <div class="force-preferred__body">
        <p class="t-body">
          {{ introText }}
        </p>
        <FormField :label="forceLabel">
          <TextAreaBasic
            v-model="reason"
            :placeholder="$t('pim.supplier.force_preferred_modal.reason_placeholder')"
            rows="3"
            :disabled="loading"
            data-test="force-preferred-reason"
          />
        </FormField>
        <p
          v-if="reasonTooShort"
          class="force-preferred__hint t-muted fs-200"
        >
          {{ $t("pim.supplier.force_preferred_modal.reason_min_hint") }}
        </p>
        <p class="force-preferred__warning t-negative fs-200">
          <FontAwesomeIcon :icon="$icons.warning" class="mr-2" />
          {{ $t("pim.supplier.force_preferred_modal.warning") }}
        </p>
      </div>
    </template>
    <template #footer>
      <div class="force-preferred__actions">
        <BasicButton
          :text="$t('pim.supplier.force_preferred_modal.cancel')"
          class="btn-outline"
          :disabled="loading"
          data-test="force-preferred-cancel"
          @click="$emit('close')"
        />
        <BasicButton
          :text="loading ? $t('pim.supplier.force_preferred_modal.confirming') : confirmText"
          class="btn-primary"
          :disabled="!canConfirm"
          data-test="force-preferred-confirm"
          @click="onConfirm"
        />
      </div>
    </template>
  </ConfirmationModal>
</template>

<script>
import ConfirmationModal from "@/functionals/Confirmation-modal/index.vue";

export default {
  name: "ForcePreferredModal",
  components: { ConfirmationModal },
  props: {
    visible: { type: Boolean, default: false },
    autoPreferredName: { type: String, default: "" },
    autoPreferredReason: { type: String, default: "" },
    targetSupplierName: { type: String, default: "" },
    targetSupplierIdx: { type: String, default: "" },
    loading: { type: Boolean, default: false },
  },
  emits: ["close", "confirmed"],
  data() {
    return { reason: "" };
  },
  computed: {
    introText() {
      return this.$t("pim.supplier.force_preferred_modal.intro", {
        supplier: this.autoPreferredName || "—",
        reason: this.autoPreferredReason || "—",
      });
    },
    forceLabel() {
      return this.$t("pim.supplier.force_preferred_modal.force_label", {
        supplier: this.targetSupplierName || "—",
      });
    },
    confirmText() {
      return this.$t("pim.supplier.force_preferred_modal.confirm", {
        supplier: this.targetSupplierName || "—",
      });
    },
    trimmedReason() {
      return (this.reason || "").trim();
    },
    reasonTooShort() {
      // Show hint only after the operator started typing — empty field stays clean
      return this.trimmedReason.length > 0 && this.trimmedReason.length < 3;
    },
    canConfirm() {
      return (
        !this.loading &&
        this.trimmedReason.length >= 3 &&
        !!this.targetSupplierIdx
      );
    },
  },
  watch: {
    visible(open) {
      if (open) this.reason = "";
    },
  },
  methods: {
    onConfirm() {
      if (!this.canConfirm) return;
      this.$emit("confirmed", {
        supplierIdx: this.targetSupplierIdx,
        reason: this.trimmedReason,
      });
    },
  },
};
</script>

<style lang="scss" scoped>
.force-preferred__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}
.force-preferred__warning {
  padding: var(--space-5);
  border-radius: var(--radius-base);
  background: var(--negative-subtle);
  border-left: 3px solid var(--negative);
}
.force-preferred__hint {
  margin-top: calc(-1 * var(--space-2));
}
.force-preferred__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-5);
  margin-top: var(--space-5);
}
</style>
