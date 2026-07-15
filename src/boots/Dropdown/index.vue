<template>
  <div
    class="dropdown-wrapper pl-100 relative"
    :class="{
      dropped: open,
      'dropdown-disabled': isDisabled,
      'dropdown-invalid': validate && validate.status === 'error',
      pointer: !isDisabled,
    }"
    v-out="'open'"
  >
    <div class="ai-ct element-wrap flex ai-ct jc-sb" @click="openDropdown">
      <span
        class="selected-value-container lc-1"
        :class="{ 'txt-basic-600': !selected }"
        >{{
          find_label({
            _in: values,
            _for: selected,
            _placeholder: resolvedPlaceholder,
            _is_value_complex: complex_values,
          })
        }}</span
      >

      <div
        class="arrow-wrapper relative"
        :class="[open ? 'down' : 'up']"
        @click="
          () => {
            can_remove_selected ? $emit('onRemoveSelected') : null;
          }
        "
      >
        <i :class="`icon-${icon} absolute absolute-ct`"></i>
      </div>
    </div>
    <!-- v-if="open" -->
    <div class="dropdown-list absolute" :class="{ 'drop-up': dropUp }" v-if="open">
      <template v-if="!custom_droplist">
        <div
          v-for="(el, i) in values"
          class="pointer flex jc-sb ai-ct pl-50 dropdown-list-el"
          :key="`unique-key-${i}`"
          @click.stop="onSelect(el)"
        >
          <span class="dropdown-list-el__main">
            <span class="ml-100 dropdown-list-el__label" :class="{ 't-basic-500': el.disabled }">{{
              el.label
            }}</span>
            <span v-if="el.description" class="ml-100 dropdown-list-el__desc">{{
              el.description
            }}</span>
          </span>
          <span
            class="flex gap-200 ai-ct mr-100"
            v-if="el.label_ext || el.label_ext_2"
          >
            <span
              :class="[el.label_ext_2_class]"
              v-if="el.label_ext_2"
              @click.stop="
                $emit('onExtension2', el.value);
                open = false;
              "
              >{{ el.label_ext_2 }}</span
            >
            <span
              :class="[{ 't-basic-400': el.disabled }, el.label_ext_class]"
              v-if="el.label_ext"
              @click.stop="$emit('onExtension', el.value)"
              >{{ el.label_ext }}</span
            >
          </span>
        </div>
      </template>
      <slot name="custom" v-if="custom_droplist"></slot>
    </div>
    <p
      class="validation-msg t-negative-200 fs-100 absolute"
      v-if="validate && validate.status === 'error' && validate.msg"
    >
      {{ validate.msg }}
    </p>
  </div>
</template>

<script>
import { isEqual } from "lodash";
export default {
  props: {
    placeholder: {
      type: String,
      require: false,
      default: null,
    },
    icon: {
      type: String,
      default: "arrow-right-2",
    },
    custom_droplist: {
      type: Boolean,
      default: false,
    },
    values: {
      type: Array,
      require: false,
      default: () => {
        return [
          {
            label: "option 1",
            value: "value 1",
            disabled: false,
            allowDisabled: true,
            label_ext: false,
          },
          { label: "option 2", value: "value", disabled: true },
          { label: "option 3", value: "value 1" },
          { label: "option 4", value: "value" },
        ];
      },
    },
    selected: {
      type: [Array, String],
      require: false,
      default: () => [],
    },
    can_remove_selected: {
      type: Boolean,
      require: false,
    },
    isDisabled: {
      type: Boolean,
      require: false,
    },
    complex_values: {
      type: Boolean,
      default: false,
    },
    // Field-error shape { status: 'error'|'success', msg } — same as BasicInput.
    validate: {
      type: Object,
      default: null,
    },
  },
  data() {
    return {
      open: false,
      dropUp: false,
    };
  },
  computed: {
    resolvedPlaceholder() {
      return this.placeholder !== null
        ? this.placeholder
        : this.$t("common.select");
    },
  },
  methods: {
    onSelect(el) {
      if (el.disabled) return;
      this.$emit("onSelect", el.value);
      this.open = false;
    },
    openDropdown() {
      if (!this.isDisabled) {
        if (!this.open) this.updateDropDirection();
        this.open = !this.open;
      }
      this.$emit("onUse");
    },
    // Flip the list upward when there isn't enough room below the trigger
    // (e.g. last fields inside a scrollable detail panel). Defaults to down.
    updateDropDirection() {
      const rect = this.$el?.getBoundingClientRect();
      if (!rect) return;
      const MENU_MAX_PX = 224; // matches .dropdown-list max-height (14rem)
      const spaceBelow = window.innerHeight - rect.bottom;
      this.dropUp = spaceBelow < MENU_MAX_PX && rect.top > spaceBelow;
    },
    find_label({ ...r }) {
      return find_label({ ...r });
    },
  },
};

function find_label({
  _in = [],
  _for = null,
  _placeholder = "Select",
  _is_value_complex = false,
}) {
  const lastSelected = _for[_for.length - 1];

  const _v = _in.find(({ value = null }) => {
    let _type = !_is_value_complex && !Array.isArray(value) ? "str" : "arr";

    // STR raz ARR
    return _type === "str"
      ? value === lastSelected
      : isEqual(value, lastSelected);
  });

  const label = _v && _v.label ? _v.label : _placeholder;
  return label;
}
</script>

<style lang="scss">
.dropdown-wrapper {
  height: var(--elem-height);
  line-height: var(--elem-height);
  min-width: 180px;
  border: 1px solid var(--c-basic-400);
  border-radius: var(--space-50);
  background-color: var(--c-basic-100);
  transition: border-color 0.2s;

  &:hover:not(.dropdown-disabled) {
    border-color: var(--c-basic-500);
  }

  &.dropped {
    border-color: var(--c-support-400);
  }

  &.dropdown-invalid {
    border-color: var(--c-negative-200) !important;
  }

  .validation-msg {
    bottom: 0;
    left: 0;
    transform: translateY(140%);
    line-height: 1.3;
  }

  &.dropdown-disabled {
    background-color: var(--c-basic-200);
    border-color: var(--c-basic-300);
    opacity: 0.7;
    cursor: not-allowed;

    .selected-value-container {
      color: var(--c-basic-500);
    }
  }

  &.dd-100 {
    height: calc(var(--elem-height) / 2.1);
    line-height: calc(var(--elem-height) / 2.1);

    .element-wrap .arrow-wrapper {
      height: calc(var(--elem-height) / 2.1);
      width: calc(var(--elem-height) / 2.1);
    }

    .dropdown-list .dropdown-list-el {
      min-height: calc(var(--elem-height) / 1.3);
    }
  }

  .arrow-wrapper {
    height: var(--elem-height);
    width: var(--elem-height);
    flex-shrink: 0;
    transform: rotate(90deg);
    transition: transform 0.2s;
    &.down {
      transform: rotate(270deg);
    }
  }

  .arrow-container {
    position: absolute;
    top: 50%;
    left: 50%;
    transition: 0.3s ease-in-out all;
  }

  .dropdown-list {
    font-size: inherit;
    position: absolute;
    top: calc(100% + 4px);
    left: -1px;
    width: calc(100% + 2px);

    z-index: 20;
    background-color: var(--c-basic-100);
    max-height: 14rem;
    overflow-y: auto;
    border: 1px solid var(--c-basic-400);
    border-radius: var(--space-50);
    box-shadow: var(--shadow-md);

    &.drop-up {
      top: auto;
      bottom: calc(100% + 4px);
    }

    .dropdown-list-el {
      min-height: var(--elem-height);
      padding: 0 var(--space-100);
      transition: background-color 0.15s;

      &:hover {
        background-color: var(--c-basic-200);
      }

      &:first-child {
        border-radius: var(--space-50) var(--space-50) 0 0;
      }

      &:last-child {
        border-radius: 0 0 var(--space-50) var(--space-50);
      }
    }

    .dropdown-list-el:not(:last-child) {
      border-bottom: 1px solid var(--c-basic-300);
    }

    // Options wrap to full text instead of truncating — long modifier/target
    // descriptions must stay readable in the open list.
    .dropdown-list-el__main {
      display: flex;
      flex-direction: column;
      min-width: 0;
      padding: var(--space-50) 0;
    }

    .dropdown-list-el__label {
      white-space: normal;
      overflow-wrap: anywhere;
      line-height: 1.3;
    }

    // Optional per-option description (`el.description`) — muted secondary line.
    .dropdown-list-el__desc {
      margin-top: 2px;
      font-size: var(--fs-200);
      line-height: 1.3;
      color: var(--c-basic-500);
      white-space: normal;
      overflow-wrap: anywhere;
    }
  }
}
</style>
