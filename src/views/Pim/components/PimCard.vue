<template>
  <div class="pim-card">
    <div class="pim-card__header">
      <p class="fs-500 fw-600 pim-card__title">{{ title }}</p>
      <p v-if="subtitle" class="fs-200 t-muted pim-card__subtitle">
        {{ subtitle }}
      </p>
    </div>
    <div class="pim-card__body">
      <slot />
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    required: true,
  },
  subtitle: {
    type: String,
    default: "",
  },
});
</script>

<style lang="scss" scoped>
.pim-card {
  background: var(--surface-base);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
}

.pim-card__title {
  margin: 0;
}

.pim-card__subtitle {
  margin: var(--space-1) 0 0;
}

.pim-card__body {
  margin-top: var(--space-8);
}
</style>
