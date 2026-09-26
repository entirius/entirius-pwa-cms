<template>
  <button
    class="back-bar pointer flex ai-ct gap-2"
    aria-label="Back"
    @click="$emit('back')"
  >
    <FontAwesomeIcon icon="backward" class="back-bar__icon" />
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
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: var(--fs-200);
  padding: var(--space-1) 0;
  transition: color 0.15s ease;
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
