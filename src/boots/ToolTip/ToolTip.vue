<template>
  <span class="tool-tip relative pointer">
    <i class="icon-cookie" v-if="!is_wrapper" />
    <span class="tip p-50 fs-100">{{ tip }}</span>
    <slot v-if="is_wrapper"> </slot>
  </span>
</template>

<script>
export default {
  props: {
    tip: {
      type: String,
      require: true,
    },
    is_wrapper: {
      type: Boolean,
      default: false,
    },
  },
};
</script>

<style lang="scss">
.tool-tip {
  .tip {
    display: none;
    position: absolute;
    background-color: var(--c-support-100);
    color: var(--c-basic-900);
    top: 0;
    left: 50%;
    transform: translate(-50%, -100%);
    white-space: nowrap;
    z-index: 2;
    border-radius: var(--space-50);

    &::after {
      content: "";
      position: absolute;
      left: 50%;
      top: 100%;
      transform: translate(-50%, 0);
      border-bottom: 5px solid transparent;
      border-right: 5px solid transparent;
      border-top: 5px solid var(--c-support-100);
      border-left: 5px solid transparent;
    }
  }
  &.right .tip {
    left: unset;
    right: 0;
    transform: translate(0, -100%);

    &::after {
      left: unset;
      right: 0;
    }
  }
  &.left .tip {
    left: 0;

    transform: translate(0, -100%);
    &::after {
      left: 0;
      transform: translate(20%, 0);
    }
  }
  &:hover .tip {
    display: block;
  }
}
</style>
