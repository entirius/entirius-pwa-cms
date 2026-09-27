<template>
  <!-- A wrapper leaves cursor and focus to the control it wraps; the standalone hint icon is reachable by keyboard. -->
  <span
    class="tool-tip relative"
    :class="{ pointer: !is_wrapper }"
    :tabindex="is_wrapper ? undefined : 0"
    :role="is_wrapper ? undefined : 'note'"
    :aria-label="is_wrapper ? undefined : tip"
    :aria-describedby="is_wrapper ? undefined : tipId"
  >
    <i class="icon-cookie" v-if="!is_wrapper" />
    <span :id="tipId" class="tip p-1 fs-200">{{ tip }}</span>
    <slot v-if="is_wrapper"> </slot>
  </span>
</template>

<script>
let nextId = 0;

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
  data() {
    nextId += 1;
    return { tipId: `tool-tip-${nextId}` };
  },
};
</script>

<style lang="scss">
.tool-tip {
  .tip {
    display: none;
    position: absolute;
    background-color: var(--accent-subtle);
    color: var(--text-strong);
    top: 0;
    left: 50%;
    transform: translate(-50%, -100%);
    white-space: nowrap;
    z-index: 2;
    border-radius: var(--radius-base);

    &::after {
      content: "";
      position: absolute;
      left: 50%;
      top: 100%;
      transform: translate(-50%, 0);
      border-bottom: 5px solid transparent;
      border-right: 5px solid transparent;
      border-top: 5px solid var(--accent);
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
  // Hover, or keyboard focus on the hint itself or on the control a wrapper holds.
  &:hover .tip,
  &:focus-visible .tip,
  &:has(:focus-visible) .tip {
    display: block;
  }
}
</style>
