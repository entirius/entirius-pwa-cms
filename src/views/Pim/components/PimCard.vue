<template>
  <div class="pim-card">
    <div class="pim-card__header">
      <p class="fs-500 fw-600 pim-card__title">{{ title }}</p>
      <p v-if="subtitle" class="fs-200 t-basic-500 pim-card__subtitle">
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
  background: var(--c-basic-100);
  border: 1px solid var(--c-basic-300);
  border-radius: var(--radius-lg);
  padding: var(--space-200);
}

.pim-card__title {
  margin: 0;
}

.pim-card__subtitle {
  margin: 4px 0 0;
}

.pim-card__body {
  margin-top: var(--space-300);
}
</style>
