<template>
  <nav class="pim-breadcrumb" aria-label="breadcrumb">
    <template v-for="(item, index) in items" :key="index">
      <span v-if="index > 0" class="pim-breadcrumb__sep" aria-hidden="true">
        /
      </span>
      <router-link
        v-if="item.route && index < items.length - 1"
        :to="item.route"
        class="pim-breadcrumb__link"
      >
        {{ item.label }}
      </router-link>
      <span
        v-else
        class="pim-breadcrumb__current"
        :aria-current="index === items.length - 1 ? 'page' : undefined"
      >
        {{ item.label }}
      </span>
    </template>
  </nav>
</template>

<script setup>
defineProps({
  items: {
    type: Array,
    required: true,
  },
});
</script>

<style lang="scss" scoped>
.pim-breadcrumb {
  font-size: var(--fs-200);
  color: var(--c-basic-500);
  margin-bottom: var(--space-200);
}

.pim-breadcrumb__link {
  color: var(--c-support-400);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

.pim-breadcrumb__current {
  color: var(--c-basic-500);
}
</style>
