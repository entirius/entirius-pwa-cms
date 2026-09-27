<template>
  <div class="page-layout h-100 ovy-auto">
    <slot name="header" />
    <div v-if="$slots.toolbar" class="page-layout__toolbar"><slot name="toolbar" /></div>
    <div class="page-layout__body"><slot /></div>
  </div>
</template>

<script setup>
// The content region of a page (R4: no border, no card; Figma draws content on the page background): padding 40 top /
// 80 sides on desktop, 20 on a phone, and one scroll body. Slots: `header` (a PageHeader), `toolbar` (the filters
// row), `default` (the content). A sticky PageHeader pins inside this scroll body.
</script>

<style lang="scss" scoped>
@import "@/assets/scss/utils/media-query";

.page-layout {
  display: flex;
  flex-direction: column;
  // Shared with PageHeader: its sticky head reaches the edge through this padding.
  --page-layout-pad-y: var(--space-10);
  --page-layout-pad-x: calc(2 * var(--space-10));

  gap: var(--space-8);
  padding: var(--page-layout-pad-y) var(--page-layout-pad-x);

  @include max-tablet {
    --page-layout-pad-y: var(--space-5);
    --page-layout-pad-x: var(--space-5);

    gap: var(--space-5);
  }
}

.page-layout__body {
  min-width: 0;
}
</style>
