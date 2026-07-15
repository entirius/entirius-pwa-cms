<template>
  <div class="channel-select">
    <button
      type="button"
      class="channel-select__trigger pointer flex ai-ct gap-100"
      :class="{ 'channel-select__trigger--active': modelValue.length }"
      :title="triggerLabel"
      @click="open = !open"
    >
      <FontAwesomeIcon icon="globe" />
      <span class="channel-select__label fs-200">{{ triggerLabel }}</span>
    </button>
    <div v-if="open" class="channel-select__backdrop" @click="open = false" />
    <div v-if="open" class="channel-select__drop">
      <div class="channel-select__header">
        {{ label }}
      </div>
      <div
        v-for="ch in channels"
        :key="ch.idx"
        class="channel-select__item"
        :class="{ 'channel-select__item--selected': modelValue.includes(ch.idx) }"
        @click="toggle(ch.idx)"
      >
        <span>{{ ch.name || ch.idx }}</span>
        <FontAwesomeIcon
          v-if="modelValue.includes(ch.idx)"
          icon="check"
          class="t-support-400"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue"

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => [],
  },
  channels: {
    type: Array,
    default: () => [],
  },
  label: {
    type: String,
    default: "Channels",
  },
  allLabel: {
    type: String,
    default: "All",
  },
})

const emit = defineEmits(["update:modelValue"])

const open = ref(false)

const triggerLabel = computed(() => {
  if (!props.modelValue.length) return `${props.label}: ${props.allLabel}`
  return `${props.label} (${props.modelValue.length})`
})

function toggle(idx) {
  const current = [...props.modelValue]
  const index = current.indexOf(idx)
  if (index > -1) {
    current.splice(index, 1)
  } else {
    current.push(idx)
  }
  emit("update:modelValue", current)
}
</script>

<style lang="scss" scoped>
.channel-select {
  position: relative;
}

.channel-select__trigger {
  height: var(--elem-height);
  padding: 0 10px;
  border-radius: 5px;
  border: 1px solid var(--c-basic-400);
  background-color: var(--c-basic-100);
  color: var(--c-basic-600);
  font-size: 13px;
  transition: all 0.15s ease;
  white-space: nowrap;
  &:hover {
    background-color: var(--c-basic-300);
    color: var(--c-basic-800);
  }
  &--active {
    border-color: var(--c-support-400);
    color: var(--c-support-400);
  }
}

.channel-select__label {
  @media only screen and (max-width: 768px) {
    display: none;
  }
}

.channel-select__backdrop {
  position: fixed;
  inset: 0;
  z-index: 9;
}

.channel-select__drop {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  min-width: 200px;
  z-index: 10;
  background: var(--c-basic-100);
  border: 1px solid var(--c-basic-300);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}

.channel-select__header {
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 600;
  color: var(--c-basic-500);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--c-basic-300);
}

.channel-select__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  font-size: 13px;
  color: var(--c-basic-700);
  cursor: pointer;
  transition: background-color 0.1s ease;
  &:hover {
    background-color: var(--c-basic-200);
  }
  &--selected {
    background-color: var(--c-support-100);
  }
  & + & {
    border-top: 1px solid var(--c-basic-200);
  }
}
</style>
