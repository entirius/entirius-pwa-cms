<template>
  <div class="cs" role="dialog" :aria-label="title" data-testid="confirm-sheet">
    <div class="cs__sheet">
      <p class="cs__title">{{ title }}</p>
      <p class="cs__text">{{ message }}</p>
      <div class="cs__actions">
        <button class="cs__btn" type="button" data-testid="confirm-cancel" @click="$emit('cancel')">{{ cancelLabel }}</button>
        <button class="cs__btn cs__btn--danger" type="button" data-testid="confirm-ok" @click="$emit('confirm')">
          {{ confirmLabel }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
// The one confirmation of the leads screens — the same bottom sheet as Rewrite, never `window.confirm`.
defineProps({
  title: { type: String, required: true },
  message: { type: String, default: "" },
  confirmLabel: { type: String, required: true },
  cancelLabel: { type: String, required: true },
});
defineEmits(["confirm", "cancel"]);
</script>

<style scoped>
.cs {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(0, 0, 0, 0.35);
  z-index: 100;
}
.cs__sheet {
  width: min(32rem, 100%);
  padding: var(--space-300);
  background: var(--c-basic-100);
  border-radius: 12px 12px 0 0;
}
.cs__title {
  margin: 0 0 var(--space-100);
  font-weight: 600;
}
.cs__text {
  margin: 0;
  color: var(--c-basic-600);
}
.cs__actions {
  display: flex;
  gap: var(--space-200);
  margin-top: var(--space-300);
}
.cs__btn {
  flex: 1;
  min-height: 48px;
  border: 1px solid var(--c-basic-300);
  border-radius: 8px;
  background: var(--c-basic-100);
  color: var(--c-basic-800);
  font-weight: 600;
  cursor: pointer;
}
.cs__btn--danger {
  border-color: var(--c-negative-300);
  background: var(--c-negative-300);
  color: var(--c-basic-100);
}
</style>
