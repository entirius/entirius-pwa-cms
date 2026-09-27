<template>
  <BasicMenu class="channel-select" :label="label" :inline="inline" placement="bottom-end" @open="onOpen">
    <template #trigger>
      <button
        type="button"
        class="channel-select__trigger flex ai-ct gap-2 pointer"
        :class="{ 'channel-select__trigger--active': modelValue.length }"
        :title="triggerLabel"
        :aria-label="triggerLabel"
      >
        <FontAwesomeIcon :icon="ICONS.channels" aria-hidden="true" />
        <span v-if="!compact" class="channel-select__full">{{ triggerLabel }}</span>
        <span class="channel-select__short" :class="{ 'channel-select__short--always': compact }">{{ label }}</span>
      </button>
    </template>
    <template #panel>
      <OptionList
        :id="listId"
        class="channel-select__list"
        :options="options"
        :is-selected="(option) => modelValue.includes(option.value)"
        multiple
        :active="listbox.active.value"
        tabindex="0"
        :aria-label="label"
        :aria-activedescendant="listbox.active.value >= 0 ? `${listId}-${listbox.active.value}` : undefined"
        @keydown="listbox.onKeydown($event)"
        @hover="listbox.active.value = $event"
        @choose="toggle($event.value)"
      />
    </template>
  </BasicMenu>
</template>

<script setup>
// Channel scope chip (docs/ui-rules.md C4, Figma S6): „Kanały: Wszystkie” with no channel picked, „Kanały: 2” with
// two; `compact` shows „Kanały” only (phone header), as does every chip below the tablet breakpoint. `v-model` =
// picked channel idxs, `channels` = [{ idx, name? }]. The list opens in BasicMenu's panel as a multi-select listbox
// with checkboxes (useListbox keyboard); `inline`: open in the page flow (catalogue).
import { computed, useId } from "vue";
import BasicMenu from "@/boots/BasicMenu/index.vue";
import OptionList from "@/boots/BasicSelect/OptionList.vue";
import { useListbox } from "@/boots/BasicSelect/useListbox";
import { ICONS } from "@/boots/Icons/icons";

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  channels: { type: Array, default: () => [] },
  label: { type: String, default: "Channels" },
  allLabel: { type: String, default: "All" },
  compact: { type: Boolean, default: false },
  inline: { type: Boolean, default: false },
});
const emit = defineEmits(["update:modelValue"]);

const listId = `${useId()}-listbox`;
const options = computed(() => props.channels.map((ch) => ({ label: ch.name || ch.idx, value: ch.idx })));
const listbox = useListbox(options, (option) => toggle(option.value));

const triggerLabel = computed(() => `${props.label}: ${props.modelValue.length || props.allLabel}`);

function onOpen() {
  listbox.reset(options.value.findIndex((option) => props.modelValue.includes(option.value)));
}

function toggle(idx) {
  const picked = props.modelValue.includes(idx);
  emit("update:modelValue", picked ? props.modelValue.filter((value) => value !== idx) : [...props.modelValue, idx]);
}
</script>

<style lang="scss" scoped>
.channel-select__trigger {
  box-sizing: border-box;
  height: var(--elem-height);
  padding: 0 var(--space-3);
  border: 1px solid var(--border-control);
  border-radius: var(--radius-base);
  background: var(--surface-sunken);
  color: var(--text-secondary);
  font-family: inherit;
  font-size: var(--fs-300);
  font-weight: 500;
  white-space: nowrap;
  transition: border-color 0.15s;

  &:hover {
    border-color: var(--border-default);
    color: var(--text-body);
  }

  &[aria-expanded="true"] {
    border-color: var(--accent);
  }
}

.channel-select__trigger--active {
  border-color: var(--accent);
  color: var(--text-accent);
}

.channel-select__short {
  display: none;
}

.channel-select__short--always {
  display: inline;
}

@media only screen and (max-width: 768px) {
  .channel-select__full {
    display: none;
  }

  .channel-select__short {
    display: inline;
  }
}

.channel-select__list {
  min-width: 12rem;
}
</style>
