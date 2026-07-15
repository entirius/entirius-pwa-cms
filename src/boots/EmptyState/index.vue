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
  gap: var(--space-200);
  padding: var(--space-500);
  min-height: 14rem;
  text-align: center;
}

.empty-state__icon {
  font-size: 2rem;
  color: var(--c-basic-400);
}

.empty-state__title {
  font-size: var(--fs-400);
  font-weight: 600;
  color: var(--c-basic-600);
  margin: 0;
}

.empty-state__message {
  font-size: var(--fs-200);
  color: var(--c-basic-500);
  max-width: 30rem;
  margin: 0;
}
</style>
