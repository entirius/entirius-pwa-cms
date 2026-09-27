<template>
  <button
    :disabled="isDisabled"
    class="button-basic pointer normal inline-flex jc-sb ai-ct gap-2"
    :class="[`button-basic--${size}`, { 'jc-ct button-basic--icon': isIconOnly }]"
    :aria-label="label || undefined"
    :title="label || undefined"
    @click="onClick"
  >
    <span v-if="icon" class="inline-flex jc-ct ai-ct btn-icon">
      <i :class="`icon-${icon}`"></i
    ></span>
    <span class="btn-text" v-if="text && !custom">{{ text }}</span>
    <slot name="custom" v-if="!text && custom"></slot>
  </button>
</template>

<script>
// Sizes: md = --elem-height (inputs share it), sm = row actions. Roles are classes: btn-primary, btn-secondary
// (btn-outline is the same look), btn-ghost, btn-danger (every delete/remove/reject), btn-danger-fill (the
// destructive confirm in a dialog). Icon-only (no text) is a square of the size and needs `label`, the accessible
// name; its icon is a <FontAwesomeIcon> in the `custom` slot (docs/ui-rules.md C5).
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
    size: {
      type: String,
      default: "md",
      validator: (value) => ["md", "sm"].includes(value),
    },
    label: {
      type: String,
      default: "",
    },
    // The click stops at the button by default; `:stop="false"` lets it reach a wrapper that acts on it
    // (SubscriberSetter opens its kit on the click of what it wraps).
    stop: {
      type: Boolean,
      default: true,
    },
  },
  computed: {
    isIconOnly() {
      return !this.text;
    },
  },
  methods: {
    onClick(event) {
      if (this.stop) event.stopPropagation();
      this.$emit("click");
    },
  },
  mounted() {
    if (process.env.NODE_ENV !== "production" && this.isIconOnly && !this.label) {
      console.warn("BasicButton: an icon-only button needs `label`, its accessible name (docs/ui-rules.md C6).");
    }
  },
};
</script>
<style lang="scss">
@import "@/assets/scss/utils/media-query";

button.button-basic {
  --btn-height: var(--elem-height);
  --btn-icon-size: var(--fs-400);

  overflow: hidden;
  position: relative;
  box-sizing: border-box;
  flex-shrink: 0;
  min-height: var(--btn-height);
  border: 1px solid transparent;
  border-radius: var(--radius-base);
  color: inherit;
  padding: 0 var(--space-4);
  background-color: transparent;
  font-size: var(--fs-200);
  font-weight: 500;
  line-height: 1.2;
  white-space: nowrap;

  &.button-basic--sm {
    --btn-height: var(--space-6);
    --btn-icon-size: var(--fs-300);

    padding: 0 var(--space-3);
  }

  &.button-basic--icon {
    width: var(--btn-height);
    padding: 0;
    font-size: var(--btn-icon-size);
  }

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
    color: inherit;
  }
  // -------------------------------------------------------------
  // Roles
  // -------------------------------------------------------------

  &.btn-primary {
    color: var(--text-on-accent-fill);
    background-color: var(--accent-fill);

    &:hover:not([disabled]) {
      background-color: var(--accent-fill-hover);
    }

    &[disabled] {
      background-color: var(--accent-fill-hover);
    }
  }

  &.btn-secondary,
  &.btn-outline {
    color: var(--text-body);
    border-color: var(--border-default);

    &:hover:not([disabled]) {
      border-color: var(--border-strong);
    }
    &[disabled] {
      color: var(--text-muted);
    }
    &.selected {
      border-bottom: 2px solid var(--border-strong);
    }
  }

  &.btn-ghost {
    color: var(--text-secondary);

    &:hover:not([disabled]) {
      color: var(--text-body);
      background-color: var(--surface-hover);
    }
    &[disabled] {
      color: var(--text-muted);
    }
  }

  &.btn-danger {
    color: var(--negative);

    &:hover:not([disabled]) {
      border-color: var(--negative);
    }
    &[disabled] {
      color: var(--text-muted);
    }
  }

  &.btn-danger-fill {
    color: var(--text-on-status-fill);
    background-color: var(--negative-fill);

    &:hover:not([disabled]) {
      filter: brightness(0.9);
    }
    &[disabled] {
      color: var(--text-muted);
      background-color: var(--negative-subtle);
    }
  }
  //
  //
  //
  &.filter-primary {
    color: var(--text-inverse);
    background: var(--surface-inverse);
    line-height: 1rem;
    padding: var(--space-2) var(--space-4);
    min-width: 3rem;
    i {
      font-size: var(--fs-400);
    }
    .btn-icon {
      color: var(--text-inverse);
    }
    .btn-text {
      font-size: var(--fs-300);
      color: var(--text-inverse);
    }
  }
}

// Toolbar icon-only actions get a thumb-sized box on mobile; everything else keeps its size.
@include max-tablet {
  [id$="-toolbar-left"],
  [id$="-toolbar-right"] {
    button.button-basic.button-basic--icon {
      --btn-height: var(--space-10);
    }
  }
}
</style>
