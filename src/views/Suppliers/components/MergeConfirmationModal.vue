<template>
  <ConfirmationModal :visible="true" @reject="onCancel">
    <template #header>
      <h2 class="t-warning-300">
        <FontAwesomeIcon icon="triangle-exclamation" class="mr-100" />
        {{ $t("suppliers.duplicates.merge_modal.title") }}
      </h2>
    </template>
    <template #description>
      <div class="merge-confirm__body">
        <p class="t-basic-700">
          {{ descriptionText }}
        </p>
        <FormField :label="$t('suppliers.duplicates.merge_modal.reason_label')">
          <TextAreaBasic
            v-model="reason"
            :placeholder="$t('suppliers.duplicates.merge_modal.reason_placeholder')"
            rows="3"
            :disabled="loading"
            data-test="merge-confirm-reason"
          />
        </FormField>
        <p
          v-if="reasonTooShort"
          class="merge-confirm__hint t-basic-500 fs-200"
        >
          {{ $t("suppliers.duplicates.merge_modal.reason_label") }}
        </p>
        <div v-if="errorText" class="merge-confirm__error t-negative-300 fs-200">
          <FontAwesomeIcon icon="triangle-exclamation" class="mr-100" />
          {{ errorText }}
        </div>
        <div class="merge-confirm__actions">
          <BasicButton
            :text="$t('suppliers.duplicates.merge_modal.cancel')"
            class="btn-outline"
            :disabled="loading"
            data-test="merge-confirm-cancel"
            @click="onCancel"
          />
          <BasicButton
            :text="$t('suppliers.duplicates.merge_modal.confirm')"
            class="btn-primary"
            :disabled="!canConfirm"
            data-test="merge-confirm-submit"
            @click="onConfirm"
          />
        </div>
      </div>
    </template>
  </ConfirmationModal>
</template>

<script>
import ConfirmationModal from "@/functionals/Confirmation-modal/index.vue";
import { POST_MergeByEan } from "@/api/suppliers/api";
import { extractApiMessage } from "@/composables/useFormErrors";

export default {
  name: "MergeConfirmationModal",
  components: { ConfirmationModal },
  props: {
    winnerSku: { type: String, required: true },
    loserSku: { type: String, required: true },
  },
  emits: ["confirmed", "cancelled"],
  data() {
    return {
      reason: "",
      loading: false,
      errorText: "",
    };
  },
  computed: {
    descriptionText() {
      return this.$t("suppliers.duplicates.merge_modal.description", {
        winner: this.winnerSku,
        loser: this.loserSku,
      });
    },
    trimmedReason() {
      return (this.reason || "").trim();
    },
    reasonTooShort() {
      return this.trimmedReason.length > 0 && this.trimmedReason.length < 3;
    },
    canConfirm() {
      return !this.loading && this.trimmedReason.length >= 3;
    },
  },
  methods: {
    onCancel() {
      if (this.loading) return;
      this.$emit("cancelled");
    },
    async onConfirm() {
      if (!this.canConfirm) return;
      this.loading = true;
      this.errorText = "";
      try {
        const { data } = await POST_MergeByEan({
          winner_sku: this.winnerSku,
          loser_sku: this.loserSku,
          reason: this.trimmedReason,
        });
        this.$emit("confirmed", data);
      } catch (err) {
        const detail = extractApiMessage(err, err?.message || "unknown error");
        this.errorText = this.$t("suppliers.duplicates.merge_modal.failed", {
          error: detail,
        });
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.merge-confirm__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-200);
}
.merge-confirm__error {
  padding: var(--space-200);
  border-radius: var(--radius-sm);
  background: var(--c-negative-100);
  border-left: 3px solid var(--c-negative-300);
}
.merge-confirm__hint {
  margin-top: calc(-1 * var(--space-100));
}
.merge-confirm__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-200);
  margin-top: var(--space-200);
}
</style>
