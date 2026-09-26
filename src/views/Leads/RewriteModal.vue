<template>
  <div class="rw" role="dialog" :aria-label="$t('leads.rewrite.title')" data-testid="rewrite-modal">
    <div class="rw__sheet">
      <p class="rw__title">{{ $t("leads.rewrite.title") }}</p>
      <label class="rw__label" for="rewrite-notes">{{ $t("leads.rewrite.label") }}</label>
      <textarea
        id="rewrite-notes"
        v-model="notes"
        class="rw__notes"
        aria-describedby="rewrite-hint"
        rows="4"
        :placeholder="$t('leads.rewrite.placeholder')"
        data-testid="rewrite-notes"
      ></textarea>
      <p id="rewrite-hint" class="rw__hint" data-testid="rewrite-hint">{{ $t("leads.rewrite.hint") }}</p>
      <div class="rw__actions">
        <button class="rw__btn" data-testid="rewrite-cancel" @click="$emit('close')">
          {{ $t("leads.review.cancel") }}
        </button>
        <button
          class="rw__btn rw__btn--primary"
          :disabled="!notes.trim()"
          data-testid="rewrite-submit"
          @click="$emit('submit', notes.trim())"
        >
          {{ $t("leads.rewrite.submit") }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";

defineEmits(["submit", "close"]);
const notes = ref("");
</script>

<style scoped>
.rw__label {
  font-weight: 600;
}
.rw__hint {
  margin: 0;
  font-size: var(--fs-100);
  color: var(--text-secondary);
}
.rw {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(0, 0, 0, 0.35);
  z-index: 100;
}
.rw__sheet {
  width: min(32rem, 100%);
  padding: var(--space-300);
  background: var(--surface-base);
  border-radius: 12px 12px 0 0;
}
.rw__title {
  margin: 0 0 var(--space-200);
  font-weight: 600;
}
.rw__notes {
  width: 100%;
  box-sizing: border-box;
  padding: var(--space-200);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  font: inherit;
}
.rw__actions {
  display: flex;
  gap: var(--space-200);
  margin-top: var(--space-200);
}
.rw__btn {
  flex: 1;
  min-height: 48px;
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  background: var(--surface-base);
  color: var(--text-body);
  font-weight: 600;
  cursor: pointer;
}
.rw__btn--primary {
  border-color: var(--accent);
  background: var(--accent-fill);
  color: var(--text-on-accent-fill);
}
.rw__btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
