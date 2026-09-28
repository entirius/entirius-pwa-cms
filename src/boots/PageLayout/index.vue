<template>
  <div class="page-layout h-100 ovy-auto" :class="{ 'page-layout--roomy': roomy }">
    <slot name="header" />
    <div v-if="$slots.toolbar" class="page-layout__toolbar"><slot name="toolbar" /></div>
    <div class="page-layout__body"><slot /></div>
    <div v-if="$slots.footer" class="page-layout__footer"><slot name="footer" /></div>
  </div>
</template>

<script setup>
// The content region of a page (R4: no border, no card; Figma draws content on the page background): padding 40 top /
// 80 sides on desktop, 20 on a phone, and one scroll body. Slots: `header` (a PageHeader), `toolbar` (the filters
// row), `default` (the content), `footer` (a list's Pagination, pinned to the bottom edge while the body scrolls).
// A sticky PageHeader pins inside this scroll body. `roomy` keeps the desktop rhythm on a phone (40 top, 32 below
// the header, the 30 px title): the Figma P5 frames (Home, content list, gallery).
defineProps({
  roomy: { type: Boolean, default: false },
});
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

@include max-tablet {
  .page-layout--roomy {
    --page-layout-pad-y: var(--space-10);
    // Read by PageHeader's phone title.
    --page-header-title-size: var(--fs-700);

    gap: var(--space-8);
  }
}

.page-layout__body {
  min-width: 0;
}

// Pinned to the scroll body's bottom edge through its padding (the sticky head does the same at the top).
.page-layout__footer {
  position: sticky;
  bottom: calc(-1 * var(--page-layout-pad-y));
  z-index: 1;
  padding-block: var(--space-3);
  background-color: var(--surface-page);
}
</style>
