<template>
  <div
    class="input-basic-wrapper"
    :class="[
      { positive: validate !== null && validate.status },
      { negative: validate !== null && validate.status === 'error' },
    ]"
  >
    <div class="input-basic h-100 relative flex br-inherit">
      <input
        :disabled="isDisabled"
        :type="type"
        class="input-field w-100 bg-inherit"
        :class="{ 'has-placeholder': placeholder }"
        :placeholder="label ? label : placeholder"
        :name="component_id"
        :id="component_id"
        :value="val"
        @input="updateValue"
        @focusout="$emit('onFocusout', val)"
        @keydown.enter="$emit('onKeyDown', val)"
        :ref="focusOnCreate ? 'focus_input' : component_id"
      />
      <div
        v-if="icon"
        class="icon-wrapper absolute flex jc-ct ai-ct pointer"
        @click="$emit('onIcon', val)"
      >
        <i :class="`icon-${icon}`"></i>
      </div>

      <label
        v-if="label"
        :for="component_id"
        class="input-label block absolute fs-200"
        >{{ label }}</label
      >

      <p
        class="validation-msg t-negative-200 fs-100 absolute"
        v-if="validate && validate.status === 'error' && validate.msg"
      >
        {{ validate.msg }}
      </p>
    </div>
  </div>
</template>

<script>
import { getCurrentInstance } from "vue";

export default {
  props: {
    label: {
      type: [Boolean, String],
      default: false,
    },
    placeholder: {
      // etap-02 fix (Dziura #10): prop must be String to avoid the boolean default
      // rendering as the literal "false" string in the HTML placeholder attribute.
      type: String,
      default: "",
    },
    modelValue: {
      type: [String, Number, Boolean],
      default: "",
    },
    type: {
      type: String,
      required: false,
      default: "text",
    },
    validate: {
      type: [Object, Boolean],
      default: null,
    },
    id: {
      type: String,
      required: false,
      default: "",
    },
    focusOnCreate: {
      type: Boolean,
      required: false,
      default: false,
    },
    icon: {
      type: String,
      require: false,
      default: null,
    },
    isDisabled: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      val: "",
      component_id: null,
    };
  },
  mounted() {
    this.onFocus();
  },
  created() {
    this.init();
  },
  watch: {
    modelValue(newVal) {
      this.val = newVal;
    },
  },
  methods: {
    init() {
      if (this.modelValue) this.val = this.modelValue;
      this.id
        ? (this.component_id = this.id)
        : (this.component_id = getCurrentInstance().uid);
    },
    onFocus() {
      if (this.focusOnCreate) this.$refs.focus_input.focus();
    },
    updateValue(e) {
      this.val = e.target.value;
      this.$emit("update:modelValue", this.val);
    },
  },
};
</script>

<style lang="scss">
.input-basic-wrapper {
  background-color: transparent;
  color: var(--c-basic-700);
  &.positive input,
  &.positive input:focus {
    border-color: var(--c-positive-200);
  }
  &.negative input,
  &.negative input:focus {
    border-color: var(--c-negative-200) !important;
  }
  .input-field {
    overflow: hidden;
    border-radius: inherit;
    padding: 4px var(--space-100);
    height: var(--elem-height);
    font-size: inherit;
    font-family: inherit;
    border: 1px solid;
    border-color: var(--c-basic-400);
    border-radius: var(--space-50);
    transition: border-color 0.2s;
    outline: 0;
    color: inherit;
    background-color: inherit;

    &::placeholder {
      color: transparent;
    }
    &.has-placeholder::placeholder {
      color: var(--c-basic-500);
    }

    &:placeholder-shown ~ .input-label {
      // cursor: text;
      // top: 50%;
      // transform: translate(0, -50%);
      // left: var(--space-50);
      // background-color: transparent;
      // color: inherit;
    }
  }

  .input-label {
    top: calc(-1 * var(--label-gap));
    transform: translate(0, -100%);
    // left: var(--space-50);
    // transition: 0.1s;
    //font-size: var(--fs-100);
    // background-color: var(--c-basic-300);
    // color: var(--c-basic-800);
    // padding: 0 var(--space-50);
    // border-radius: var(--space-50);
  }

  // .input-field:focus {
  //   border-color: var(--c-basic-600);
  //   ~ .input-label {
  //     position: absolute;
  //     top: 0;
  //     left: var(--space-50);
  //     transform: translate(0%, -40%);
  //     display: block;
  //     transition: 0.1s;
  //     background-color: var(--c-support-100);
  //     color: var(--c-basic-100);
  //     //font-size: var(--fs-200);
  //   }
  // }

  .validation-msg {
    bottom: 0;
    transform: translateY(140%);
  }

  .icon-wrapper {
    width: var(--elem-height);
    height: var(--elem-height);
    right: 0;
    top: 50%;
    transform: translate(0, -50%);
  }
}
</style>
