<template>
  <div
    class="input-basic-wrapper"
    :class="[
      { positive: validate !== null && validate.status },
      { negative: validateError },
    ]"
  >
    <div class="input-basic h-100 relative flex br-inherit">
      <input
        ref="inputEl"
        v-bind="attrs"
        :type="type"
        class="input-field w-100 bg-inherit"
        :class="{ 'has-placeholder': placeholder, 'input-field--icon': leadingIcon }"
        :placeholder="label ? label : placeholder"
        :name="attrs.id"
        :value="modelValue ?? ''"
        :readonly="readonly"
        @input="emit('update:modelValue', $event.target.value)"
        @focusout="emit('onFocusout', $event.target.value)"
        @keydown.enter="emit('onKeyDown', $event.target.value)"
      />
      <div
        v-if="leadingIcon"
        class="icon-wrapper absolute flex jc-ct ai-ct"
        aria-hidden="true"
      >
        <FontAwesomeIcon :icon="ICONS[leadingIcon]" />
      </div>

      <label
        v-if="label"
        :for="attrs.id"
        :title="label"
        class="input-label field-label field-label--fit block absolute"
        >{{ label }}</label
      >

      <p
        class="validation-msg t-negative fs-200 absolute"
        v-if="validateError && validate.msg"
      >
        {{ validate.msg }}
      </p>
    </div>
  </div>
</template>

<script setup>
// Single-line text (docs/ui-components.md § P3 inputs): `v-model`, `type`, `placeholder`, `icon` (a leading meaning
// of icons.js), `readonly` (the value behind a lock, the former LockedField), `disabled`. Inside a FormField it takes
// id, aria-describedby, aria-invalid, required and disabled from the contract.
// Transition until plan 19: the floating `label`, `validate` ({ status, msg }, its own error text), `isDisabled`,
// `focusOnCreate` and the `onFocusout` / `onKeyDown` events keep un-swept screens as they were.
import { computed, onMounted, ref } from "vue";
import { ICONS } from "@/boots/Icons/icons";
import { useControlAttrs } from "@/boots/FormField/useControlAttrs";

const props = defineProps({
  label: { type: [Boolean, String], default: false },
  // A String: a boolean default would render as the literal "false" placeholder.
  placeholder: { type: String, default: "" },
  modelValue: { type: [String, Number, Boolean], default: "" },
  type: { type: String, default: "text" },
  validate: { type: [Object, Boolean], default: null },
  id: { type: String, default: "" },
  focusOnCreate: { type: Boolean, default: false },
  // A meaning of the icon registry (src/boots/Icons/icons.js), e.g. "search".
  icon: { type: String, default: null },
  readonly: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  isDisabled: { type: Boolean, default: false },
});
const emit = defineEmits(["update:modelValue", "onFocusout", "onKeyDown"]);

const inputEl = ref(null);
const validateError = computed(() => props.validate?.status === "error");
const leadingIcon = computed(() => (props.readonly ? "lock" : props.icon));
const { attrs } = useControlAttrs({
  id: () => props.id,
  disabled: () => props.disabled || props.isDisabled,
  invalid: () => validateError.value,
});

onMounted(() => props.focusOnCreate && inputEl.value.focus());
</script>

<style lang="scss">
.input-basic-wrapper {
  background-color: transparent;
  color: var(--text-body);
  &.positive input,
  &.positive input:focus {
    border-color: var(--positive);
  }
  &.negative input,
  &.negative input:focus {
    border-color: var(--negative) !important;
  }
  .input-field {
    overflow: hidden;
    border-radius: inherit;
    padding: var(--space-1) var(--space-2);
    height: var(--elem-height);
    font-size: inherit;
    font-family: inherit;
    border: 1px solid;
    border-color: var(--border-control);
    border-radius: var(--radius-base);
    transition: border-color 0.2s;
    outline: 0;
    color: inherit;
    background-color: var(--surface-sunken);

    &::placeholder {
      color: transparent;
    }
    &.has-placeholder::placeholder {
      color: var(--text-muted);
    }

    &--icon {
      padding-left: var(--elem-height);
    }

    &[aria-invalid="true"] {
      border-color: var(--negative);
    }

    // The former LockedField: the value stays readable and selectable behind the lock icon.
    &:read-only:not(:disabled) {
      background-color: var(--surface-raised);
      border-color: var(--border-subtle);
      color: var(--text-muted);
    }

    // Same disabled look as Dropdown: a locked value is readable but plainly not editable.
    &:disabled {
      background-color: var(--surface-disabled);
      border-color: var(--border-subtle);
      color: var(--text-muted);
      cursor: not-allowed;
    }

    &:placeholder-shown ~ .input-label {
      // cursor: text;
      // top: 50%;
      // transform: translate(0, -50%);
      // left: var(--space-1);
      // background-color: transparent;
      // color: inherit;
    }
  }

  .input-label {
    top: calc(-1 * var(--label-gap));
    transform: translate(0, -100%);
    // left: var(--space-1);
    // transition: 0.1s;
    //font-size: var(--fs-100);
    // background-color: var(--surface-hover);
    // color: var(--text-body);
    // padding: 0 var(--space-1);
    // border-radius: var(--radius-base);
  }

  // .input-field:focus {
  //   border-color: var(--border-strong);
  //   ~ .input-label {
  //     position: absolute;
  //     top: 0;
  //     left: var(--space-1);
  //     transform: translate(0%, -40%);
  //     display: block;
  //     transition: 0.1s;
  //     background-color: var(--accent-subtle);
  //     color: var(--text-strong);
  //     //font-size: var(--fs-200);
  //   }
  // }

  .validation-msg {
    bottom: 0;
    transform: translateY(140%);
  }

  // Leading and decorative (no caller acts on it): a click goes through to the input.
  .icon-wrapper {
    pointer-events: none;
    width: var(--elem-height);
    height: var(--elem-height);
    left: 0;
    top: 50%;
    transform: translate(0, -50%);
  }
}
</style>
