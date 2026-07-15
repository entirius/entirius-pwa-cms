<template>
  <div class="number-input-wrapper">
    <div class="number-input flex ai-ct">
      <button
        type="button"
        class="number-input__btn"
        :disabled="isAtMin"
        @click="decrement"
      >
        <span class="number-input__icon">&minus;</span>
      </button>
      <input
        ref="inputEl"
        type="text"
        inputmode="numeric"
        class="number-input__value"
        :value="displayValue"
        :placeholder="placeholder"
        @input="onTextInput"
        @keydown.up.prevent="increment"
        @keydown.down.prevent="decrement"
        @focusout="onFocusout"
      />
      <button
        type="button"
        class="number-input__btn"
        :disabled="isAtMax"
        @click="increment"
      >
        <span class="number-input__icon">+</span>
      </button>
      <span v-if="suffix" class="number-input__suffix">{{ suffix }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: "",
  },
  min: {
    type: Number,
    default: 0,
  },
  max: {
    type: Number,
    default: 9999,
  },
  step: {
    type: Number,
    default: 1,
  },
  suffix: {
    type: String,
    default: "",
  },
  placeholder: {
    type: String,
    default: "0",
  },
});

const emit = defineEmits(["update:modelValue"]);

const numericValue = computed(() => {
  const n = parseInt(props.modelValue, 10);
  return isNaN(n) ? null : n;
});

const displayValue = computed(() => {
  return numericValue.value !== null ? String(numericValue.value) : "";
});

const isAtMin = computed(
  () => numericValue.value !== null && numericValue.value <= props.min
);
const isAtMax = computed(
  () => numericValue.value !== null && numericValue.value >= props.max
);

function clamp(val) {
  return Math.min(props.max, Math.max(props.min, val));
}

function increment() {
  const base = numericValue.value !== null ? numericValue.value : props.min;
  emit("update:modelValue", String(clamp(base + props.step)));
}

function decrement() {
  const base = numericValue.value !== null ? numericValue.value : props.min;
  emit("update:modelValue", String(clamp(base - props.step)));
}

function onTextInput(e) {
  const raw = e.target.value.replace(/[^0-9-]/g, "");
  emit("update:modelValue", raw);
}

function onFocusout() {
  if (numericValue.value === null) return;
  emit("update:modelValue", String(clamp(numericValue.value)));
}
</script>

<style lang="scss">
.number-input-wrapper {
  background-color: transparent;
  color: var(--c-basic-700);
}

.number-input {
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

.number-input__btn {
  width: 32px;
  min-width: 32px;
  height: 100%;
  border: none;
  background: transparent;
  color: var(--c-basic-500);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.15s, color 0.15s;
  padding: 0;

  &:hover:not(:disabled) {
    background-color: var(--c-basic-200);
    color: var(--c-basic-700);
  }

  &:active:not(:disabled) {
    background-color: var(--c-basic-300);
  }

  &:disabled {
    opacity: 0.3;
    cursor: default;
  }

  &:first-child {
    border-right: 1px solid var(--c-basic-400);
  }

  &:last-of-type {
    border-left: 1px solid var(--c-basic-400);
  }
}

.number-input__icon {
  font-size: 14px;
  font-weight: 600;
  line-height: 1;
  user-select: none;
}

.number-input__value {
  flex: 1;
  border: none;
  outline: none;
  text-align: center;
  font-size: inherit;
  font-family: inherit;
  color: inherit;
  background: transparent;
  height: 100%;
  min-width: 0;
  padding: 0 var(--space-50);
}

.number-input__suffix {
  padding-right: var(--space-100);
  font-size: var(--fs-200);
  color: var(--c-basic-500);
  user-select: none;
  white-space: nowrap;
}
</style>
