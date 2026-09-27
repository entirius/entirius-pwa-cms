<template>
  <button
    class="back-bar pointer flex ai-ct gap-2"
    :class="{ 'jc-ct': !label }"
    :aria-label="label || $t('common.back')"
    :title="label ? undefined : $t('common.back')"
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

<style lang="scss" scoped>
@import "@/assets/scss/utils/media-query";

.back-bar {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: var(--fs-200);
  padding: var(--space-1) 0;
  transition: color 0.15s ease;
}
// A phone gets a 40 px target; the desktop box stays the arrow (and label) itself.
@include max-tablet {
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
