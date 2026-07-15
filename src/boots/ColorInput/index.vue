<template>
  <div class="color-input-wrapper">
    <div class="color-input flex ai-ct">
      <div
        class="color-input__swatch"
        :style="{ backgroundColor: modelValue || 'transparent' }"
        @click="openPicker"
      >
        <input
          ref="picker"
          type="color"
          class="color-input__native"
          :value="modelValue || '#000000'"
          @input="onPickerInput"
        />
      </div>
      <input
        type="text"
        class="color-input__text w-100 bg-inherit"
        :value="modelValue"
        :placeholder="placeholder || '#000000'"
        @input="onTextInput"
        @focusout="$emit('onFocusout', modelValue)"
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";

defineProps({
  modelValue: {
    type: String,
    default: "",
  },
  placeholder: {
    type: String,
    default: "#000000",
  },
});

const emit = defineEmits(["update:modelValue"]);
const picker = ref(null);

function openPicker() {
  picker.value?.click();
}

function onPickerInput(e) {
  emit("update:modelValue", e.target.value.toUpperCase());
}

function onTextInput(e) {
  emit("update:modelValue", e.target.value);
}
</script>

<style lang="scss">
.color-input-wrapper {
  background-color: transparent;
  color: var(--c-basic-700);
}

.color-input {
  border: 1px solid var(--c-basic-400);
  border-radius: var(--space-50);
  height: var(--elem-height);
  padding: 0;
  transition: border-color 0.2s;
  overflow: hidden;

  &:focus-within {
    border-color: var(--c-basic-600);
  }
}

.color-input__swatch {
  width: 32px;
  min-width: 32px;
  height: 100%;
  border: none;
  border-right: 1px solid var(--c-basic-400);
  border-radius: 0;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.color-input__native {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  border: none;
  padding: 0;
}

.color-input__text {
  border: none;
  outline: none;
  font-size: inherit;
  font-family: inherit;
  color: inherit;
  background: transparent;
  height: 100%;
  padding: 0 var(--space-100);
}
</style>
