<template>
  <div
    class="loader-element relative"
    :class="{ 'loader-element--block': block }"
    role="status"
    :aria-label="$t('common.loading')"
    :style="`height: ${h}px; width: ${w}px`"
  >
    <div class="loader-element__circle absolute" />
    <div class="loader-element__circle loader-element__inner-circle absolute" />
  </div>
</template>

<script>
export default {
  props: {
    h: {
      type: Number,
      default: 64,
    },
    w: {
      type: Number,
      default: 64,
    },
    // A content-area loader centres itself where the data will appear; inline (default) keeps its place in a
    // modal, side panel or button.
    block: {
      type: Boolean,
      default: false,
    },
  },
};
</script>

<style lang="scss">
// On a static track, so a loading screen never reads as blank.
.loader-element {
  display: inline-block;
  border: 2px solid var(--border-subtle);
  border-radius: var(--radius-full);

  &--block {
    display: block;
    margin: var(--space-8) auto;
  }

  &__circle {
    border: 2px solid var(--accent);
    height: 100%;
    width: 100%;
    opacity: 1;
    border-radius: var(--radius-full);
    transform-origin: 50% 50%;
    animation: ripple 1s cubic-bezier(0, 0.2, 0.8, 1) infinite;
  }

  &__inner-circle {
    border: 3px solid var(--accent);
    animation-delay: -0.5s;
  }

  @keyframes ripple {
    0% {
      transform: scale(0);
      opacity: 1;
    }
    100% {
      transform: scale(1);
      opacity: 0;
    }
  }
}
</style>
