<template>
  <div
    class="switcher inline-flex gap-100 ai-ct"
    :class="{ active: selected, disabled: prevent }"
    @click="onSwitch"
  >
    <p v-if="label">
      {{ label }}
      <HelpTooltip v-if="hint" :text="hint" @click.stop />
    </p>
    <p class="block relative toggler" />
  </div>
</template>

<script>
export default {
  props: {
    label: {
      type: String,
      require: false,
    },
    hint: {
      // Optional help text — renders a "?" HelpTooltip next to the label.
      type: String,
      required: false,
      default: "",
    },
    selected: {
      type: Boolean,
      require: false,
      default: false,
    },
    prevent: {
      type: Boolean,
      require: false,
      default: false,
    },
  },
  methods: {
    onSwitch() {
      if (this.prevent) return;

      this.$emit("onSelect");
    },
  },
};
</script>

<style lang="scss">
.switcher {
  $transition: 0.25s ease-in-out;
  $baseSize: 1.25rem;

  .toggler {
    width: 2.5rem;
    height: $baseSize;
    background: var(--c-basic-100);
    border-radius: 6.25rem;
    border: 1px solid var(--c-basic-400);
    transition: background $transition;
    &::after {
      content: "";
      position: absolute;
      top: 50%;
      left: 0;
      transform: translate(0, -50%);
      width: $baseSize;
      height: $baseSize;
      background: var(--c-basic-100);
      border: 1px solid var(--c-basic-400);
      border-radius: 5.625rem;
      transition: $transition;
      box-shadow: var(--shadow-sm);
    }
  }
}
.switcher:not(.disabled) {
  cursor: pointer;
  .toggler {
    cursor: pointer;
  }
}
.active {
  .toggler {
    background: var(--c-support-400);
    border-color: var(--c-support-400);
    &::after {
      transform: translate(100%, -50%);
      border-color: var(--c-support-400);
    }
  }
}
.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  .toggler {
    cursor: not-allowed;
  }
}
</style>
