<template>
  <button
    class="back-bar pointer flex ai-ct gap-100"
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
  color: var(--c-basic-600);
  font-size: var(--fs-200);
  padding: 0.25rem 0;
  transition: color 0.15s ease;
}
.back-bar:hover {
  color: var(--c-basic-800);
}
.back-bar__icon {
  font-size: 0.75rem;
}
.back-bar__label {
  font-size: var(--fs-200);
}
</style>
