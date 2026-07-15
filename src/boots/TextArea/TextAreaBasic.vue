<template>
  <div class="input-basic-wrapper">
    <div
      class="input-basic input-text-area-wrapper relative"
      :class="[
        validate !== null && (validate.status === 'error' || focusOut)
          ? 'validation-active'
          : '',
        `size-${size}`,
      ]"
    >
      <textarea
        :type="getInputType"
        class="input-field border-radius input-text-area"
        :class="[
          {
            'input-field__error': validate && validate.status === 'error',
          },
          {
            'input-field__success':
              focusOut && validate && validate.status === 'success',
          },
        ]"
        :placeholder="label"
        :name="id"
        :id="id"
        :autocomplete="autocomplete"
        @input="updateValue"
        @focus="focusOut = false"
        @focusout="focusOut = true"
        @keydown="$emit('onKeydown')"
        @keydown.enter="onEnterPress"
        :value="val"
        :disabled="isDisabled"
        :maxlength="limit"
      />
      <label :for="id" class="input-label">{{ label }}</label>
    </div>
    <span
      v-if="
        validate &&
        validate.msg &&
        (validate.status === 'error' || focusOut)
      "
      class="input-validation fs-xsm"
      :class="[
        {
          'txt-negative-200': validate.status === 'error',
        },
        {
          'txt-positive-200': focusOut && validate.status === 'success',
        },
      ]"
      >{{ validate.msg }}</span
    >
  </div>
</template>

<script>
export default {
  emits: ["input", "update:modelValue", "onKeydown", "onEnter"],
  props: {
    modelValue: {
      type: [String, Number],
      default: undefined,
    },
    value: {
      type: [String, Number],
      required: false,
      default: "",
    },
    label: {
      type: String,
      require: false,
      default: "",
    },
    type: {
      type: String,
      required: false,
      default: "input",
    },
    autocomplete: {
      type: Boolean,
      required: false,
      default: false,
    },
    id: {
      type: String,
      required: false,
      default: function () {
        return `input-${Math.floor(Math.random() * 1000)}`;
      },
    },
    isDisabled: {
      type: Boolean,
      required: false,
    },
    validate: {
      type: Object,
      required: false,
      default: null,
    },
    size: {
      type: String,
      default: "nm",
    },
    limit: {
      type: Number,
      require: false,
    },
  },
  data() {
    return {
      val: this.modelValue !== undefined ? this.modelValue ?? "" : this.value,
      focusOut: false,
      isPasswordVisible: false,
    };
  },
  watch: {
    modelValue(newVal) {
      if (newVal !== undefined) this.val = newVal ?? "";
    },
    value(newVal) {
      if (this.modelValue === undefined) this.val = newVal;
    },
  },
  computed: {
    getInputType() {
      if (this.type === "password") {
        if (this.isPasswordVisible === true) {
          return "text";
        } else {
          return "password";
        }
      } else {
        return this.type;
      }
    },
  },
  methods: {
    onEnterPress() {
      this.$emit("onEnter", this.val);
      document.activeElement.blur(); // hide mobile keyboard
    },
    updateValue(e) {
      this.val = e.target.value;
      this.$emit("update:modelValue", this.val);
      this.$emit("input", this.val);
    },
  },
};
</script>

<style lang="scss">
.input-basic-wrapper {
  .input-text-area {
    display: block;
    max-width: 100%;
    min-width: 100%;
    resize: vertical;
    overflow: auto; // UA default computes to `visible` here -> no scrollbar; force internal scroll
    &:not([rows]) {
      max-height: 400px;
      min-height: 120px;
    }
  }
}
</style>
