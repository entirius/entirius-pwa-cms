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
    background-color: var(--accent-fill);

    &:hover:not([disabled]) {
      background-color: var(--accent-fill-hover);
    }

    &[disabled] {
      //opacity: 0.3;
      background-color: var(--accent-fill-hover);
    }
    .btn-text {
      color: var(--text-on-accent-fill);
    }
  }
  // -------------------------------------------------------------
  // -------------------------------------------------------------
  // -------------------------------------------------------------
  &.btn-outline {
    color: inherit;
    //background-color: var(--surface-base);
    border: 1px solid var(--border-subtle);

    &:hover {
      border: 1px solid var(--border-default);
    }
    &[disabled] {
      border: 1px solid var(--border-default);
      .btn-text {
        color: var(--text-muted);
      }
    }

    .btn-text {
      color: var(--text-secondary);
    }
    &.selected {
      border-bottom: 2px solid var(--border-strong);
    }
  }

  // -------------------------------------------------------------
  // -------------------------------------------------------------
  // -------------------------------------------------------------
  &.btn-secondary {
    color: inherit;
    background-color: var(--surface-raised);

    &:hover {
      background-color: var(--surface-hover);
    }

    &[disabled] {
      color: var(--text-body);
      background-color: var(--surface-raised);
      .btn-text {
        color: var(--text-muted);
      }
    }
    .btn-text {
      position: relative;
      z-index: 1;
      color: var(--text-secondary);
    }
  }
  //
  //
  //
  &.filter-primary {
    color: var(--text-inverse);
    background: var(--surface-inverse);
    line-height: 1rem;
    padding: 0.5rem 1rem;
    min-width: 3rem;
    i {
      font-size: 0.975rem;
    }
    .btn-icon {
      color: var(--text-inverse);
    }
    .btn-text {
      font-size: 0.875rem;
      color: var(--text-inverse);
    }
  }
  // -------------------------------------------------------------
  // -------------------------------------------------------------
  // -------------------------------------------------------------
}
</style>
