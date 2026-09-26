<template>
  <div class="empty-state">
    <FontAwesomeIcon v-if="icon" :icon="icon" class="empty-state__icon" />
    <p v-if="title" class="empty-state__title">{{ title }}</p>
    <p v-if="message" class="empty-state__message">{{ message }}</p>
    <slot />
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    default: "",
  },
  message: {
    type: String,
    default: "",
  },
  icon: {
    type: String,
    default: "",
  },
})
</script>

<style lang="scss" scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-5);
  padding: var(--space-12);
  min-height: 14rem;
  text-align: center;
}

.empty-state__icon {
  font-size: var(--fs-700);
  color: var(--text-muted);
}

.empty-state__title {
  font-size: var(--fs-400);
  font-weight: 600;
  color: var(--text-secondary);
  margin: 0;
}

.empty-state__message {
  font-size: var(--fs-200);
  color: var(--text-muted);
  max-width: 30rem;
  margin: 0;
}
</style>
