<template>
  <div class="loader-element relative" :style="`height: ${h}px; width: ${w}px`">
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
  },
};
</script>

<style lang="scss">
.loader-element {
  display: inline-block;

  // top: 50%;
  // left: 50%;
  // transform: translate(-50%, -50%);

  &__circle {
    border: 1px solid var(--c-primary-200);
    height: 100%;
    width: 100%;
    opacity: 1;
    border-radius: 50%;
    transform-origin: 50% 50%;
    animation: ripple 1s cubic-bezier(0, 0.2, 0.8, 1) infinite;
  }

  &__inner-circle {
    border: 2px solid var(--c-primary-200);
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
