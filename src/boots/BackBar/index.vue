<template>
  <button
    class="back-bar pointer flex ai-ct gap-2"
    :class="{ 'jc-ct': !label }"
    :aria-label="label || $t('common.back')"
    @click="$emit('back')"
  >
    <FontAwesomeIcon icon="arrow-left" class="back-bar__icon" />
    <span v-if="label" class="back-bar__label">{{ label }}</span>
  </button>
</template>

<script setup>
defineProps({
  label: {
    type: String,
    default: "",
  },
});

defineEmits(["back"]);
</script>

<style scoped>
.back-bar {
  min-width: var(--elem-height);
  min-height: var(--elem-height);
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: var(--fs-200);
  padding: var(--space-1) 0;
  transition: color 0.15s ease;
}
@media (max-width: 1023px) {
  .back-bar {
    min-width: var(--space-10);
    min-height: var(--space-10);
  }
}
.back-bar:hover {
  color: var(--text-body);
}
.back-bar__icon {
  font-size: var(--fs-200);
}
.back-bar__label {
  font-size: var(--fs-200);
}
</style>
