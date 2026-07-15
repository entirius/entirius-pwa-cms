<template>
  <button
    :disabled="isDisabled"
    class="button-basic pointer normal inline-flex jc-sb ai-ct gap-100"
    :class="{ 'jc-ct': !text && icon }"
    @click.stop="$emit('click')"
  >
    <span v-if="icon" class="inline-flex jc-ct ai-ct btn-icon">
      <i :class="`icon-${icon}`"></i
    ></span>
    <span class="btn-text" v-if="text && !custom">{{ text }}</span>
    <slot name="custom" v-if="!text && custom"></slot>
  </button>
</template>

<script>
export default {
  emits: ["click"],
  props: {
    text: {
      type: [String, Boolean],
      require: false,
      default: false,
    },
    custom: {
      type: Boolean,
      require: false,
      default: false,
    },
    isDisabled: {
      type: Boolean,
      default: false,
    },
    icon: {
      type: [String, Boolean],
      require: false,
    },
  },
};
</script>
<style lang="scss">
button.button-basic {
  overflow: hidden;
  position: relative;
  border: none;
  border-radius: var(--space-50);
  color: inherit;
  padding: 0 1rem;
  background-color: transparent;
  line-height: var(--elem-height);

  &.reverse-order {
    .btn-icon {
      order: 2;
    }
    .btn-text {
      order: 1;
    }
  }

  &.lh-0 {
    line-height: 0;
  }
  &.lh-init {
    line-height: initial;
  }

  span {
    color: inherit;

    i {
      color: inherit;
    }
  }
  .btn-text {
    //   margin: 0 1rem;
    color: inherit;
  }
  // -------------------------------------------------------------
  // -------------------------------------------------------------
  // -------------------------------------------------------------

  &.btn-primary {
    color: inherit;
    background-color: var(--c-primary-100);

    &:hover:not([disabled]) {
      background-color: var(--c-primary-200);
    }

    &[disabled] {
      //opacity: 0.3;
      background-color: var(--c-primary-200);
    }
    .btn-text {
      color: var(--c-basic-100);
    }
  }
  // -------------------------------------------------------------
  // -------------------------------------------------------------
  // -------------------------------------------------------------
  &.btn-outline {
    color: inherit;
    //background-color: var(--c-basic-100);
    border: 1px solid var(--c-basic-300);

    &:hover {
      border: 1px solid var(--c-basic-500);
    }
    &[disabled] {
      border: 1px solid var(--c-basic-400);
      .btn-text {
        color: var(--c-basic-500);
      }
    }

    .btn-text {
      color: var(--c-basic-600);
    }
    &.selected {
      border-bottom: 2px solid var(--c-basic-800);
    }
  }

  // -------------------------------------------------------------
  // -------------------------------------------------------------
  // -------------------------------------------------------------
  &.btn-secondary {
    color: inherit;
    background-color: var(--c-basic-200);

    &:hover {
      background-color: var(--c-basic-300);
    }

    &[disabled] {
      color: var(--c-basic-800);
      background-color: var(--c-basic-200);
      .btn-text {
        color: var(--c-basic-400);
      }
    }
    .btn-text {
      position: relative;
      z-index: 1;
      color: var(--c-basic-600);
    }
  }
  //
  //
  //
  &.filter-primary {
    color: var(--c-basic-100);
    background: var(--c-basic-900);
    line-height: 1rem;
    padding: 0.5rem 1rem;
    min-width: 3rem;
    i {
      font-size: 0.975rem;
    }
    .btn-icon {
      color: var(--c-basic-100);
    }
    .btn-text {
      font-size: 0.875rem;
      color: var(--c-basic-100);
    }
  }
  // -------------------------------------------------------------
  // -------------------------------------------------------------
  // -------------------------------------------------------------
}
</style>
