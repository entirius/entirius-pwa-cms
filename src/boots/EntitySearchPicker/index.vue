<script setup>
import { ref, watch, nextTick } from "vue";

const props = defineProps({
  modelValue: { type: String, default: null },
  displayValue: { type: String, default: "" },
  fetchFn: { type: Function, required: true },
  placeholder: { type: String, default: "" },
  disabled: { type: Boolean, default: false },
  clientFilter: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue", "update:displayValue", "clear"]);

const open = ref(false);
const query = ref("");
const results = ref([]);
const allResults = ref([]);
const loading = ref(false);
const debounceTimer = ref(null);
const searchInput = ref(null);
const justOpened = ref(false);

watch(
  () => props.modelValue,
  (val) => {
    if (!val) query.value = "";
  }
);

function openPicker() {
  if (props.disabled) return;
  justOpened.value = true;
  open.value = true;
  query.value = "";
  nextTick(() => {
    const el = searchInput.value?.$el || searchInput.value;
    const input = el?.querySelector?.("input") || el;
    input?.focus?.();
  });
  setTimeout(() => { justOpened.value = false; }, 0);
  fetchResults("");
}

function closePicker() {
  if (justOpened.value) return;
  open.value = false;
}

function select(item) {
  emit("update:modelValue", item.value);
  emit("update:displayValue", item.label);
  open.value = false;
}

function clear() {
  emit("update:modelValue", null);
  emit("update:displayValue", "");
  emit("clear");
}

function onSearchInput() {
  if (props.clientFilter) {
    filterLocal();
    return;
  }
  clearTimeout(debounceTimer.value);
  debounceTimer.value = setTimeout(() => fetchResults(query.value), 300);
}

function filterLocal() {
  const q = query.value.toLowerCase().trim();
  if (!q) {
    results.value = allResults.value;
    return;
  }
  results.value = allResults.value.filter(
    (r) =>
      (r.label || "").toLowerCase().includes(q) ||
      (r.secondary || "").toLowerCase().includes(q) ||
      (r.value || "").toLowerCase().includes(q)
  );
}

async function fetchResults(search) {
  loading.value = true;
  try {
    const data = await props.fetchFn(search);
    if (props.clientFilter) {
      allResults.value = data || [];
      filterLocal();
    } else {
      results.value = data || [];
    }
  } catch {
    results.value = [];
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="entity-picker" v-out="() => closePicker()">
    <!-- Disabled: plain BasicInput fallback -->
    <BasicInput
      v-if="disabled"
      :modelValue="modelValue"
      :placeholder="placeholder"
      @update:modelValue="$emit('update:modelValue', $event)"
    />

    <!-- Enabled: trigger is always rendered to hold layout height -->
    <template v-else>
      <div
        class="entity-picker__trigger"
        :class="{ 'entity-picker__trigger--empty': !modelValue, 'entity-picker__trigger--open': open }"
        @click="!open && openPicker()"
      >
        <!-- Selected chip -->
        <template v-if="modelValue && !open">
          <span class="entity-picker__chip">
            <span class="entity-picker__chip-label">{{ displayValue || modelValue }}</span>
            <button
              class="entity-picker__chip-clear"
              :aria-label="$t('common.delete')"
              @click.stop="clear"
            >&times;</button>
          </span>
        </template>

        <!-- Empty placeholder -->
        <template v-else-if="!open">
          <FontAwesomeIcon icon="magnifying-glass" class="entity-picker__search-icon" />
          <span class="entity-picker__placeholder">{{ placeholder }}</span>
        </template>

        <!-- Open: inline search input (replaces placeholder, same height) -->
        <BasicInput
          v-if="open"
          ref="searchInput"
          v-model="query"
          :placeholder="placeholder"
          icon="search"
          class="entity-picker__inline-input"
          @update:modelValue="onSearchInput"
        />

        <!-- Chevron: visual affordance that this is a dropdown, not a textbox -->
        <FontAwesomeIcon
          icon="chevron-down"
          class="entity-picker__chevron"
          :class="{ 'entity-picker__chevron--open': open }"
        />
      </div>

      <!-- Results dropdown (absolutely positioned, doesn't push content) -->
      <div v-if="open" class="entity-picker__results-panel">
        <!-- Loading shown inline at top so list still renders below if cached -->
        <div v-if="loading && !results.length" class="entity-picker__status">
          <span class="fs-200 t-basic-500">{{ $t("layout_extender.searching") }}</span>
        </div>
        <div v-else-if="!results.length" class="entity-picker__status">
          <span class="fs-200 t-basic-500">
            {{ query ? $t("layout_extender.no_results") : $t("layout_extender.searching") }}
          </span>
        </div>
        <button
          v-for="item in results"
          :key="item.value"
          class="entity-picker__result"
          @click="select(item)"
        >
          <span class="entity-picker__result-label">{{ item.label }}</span>
          <span v-if="item.secondary" class="entity-picker__result-secondary">{{ item.secondary }}</span>
        </button>
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.entity-picker {
  position: relative;
}

.entity-picker__trigger {
  display: flex;
  align-items: center;
  height: var(--elem-height);
  padding: 0 var(--space-100);
  border: 1px solid var(--c-basic-400);
  border-radius: var(--space-50);
  background: var(--c-basic-100);
  cursor: pointer;
  transition: border-color 0.15s;

  &:hover {
    border-color: var(--c-basic-500);
  }

  &--empty {
    gap: 8px;
    color: var(--c-basic-500);
  }

  &--open {
    border-color: var(--c-support-400);
    cursor: default;
    padding: 0;
  }
}

.entity-picker__search-icon {
  font-size: 12px;
  color: var(--c-basic-400);
}

.entity-picker__chevron {
  margin-left: auto;
  font-size: 11px;
  color: var(--c-basic-500);
  transition: transform 0.15s;
  flex-shrink: 0;
}

.entity-picker__chevron--open {
  transform: rotate(180deg);
}

.entity-picker__trigger--open .entity-picker__chevron {
  margin-right: var(--space-100);
}

.entity-picker__placeholder {
  font-size: var(--fs-200);
  color: var(--c-basic-500);
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.entity-picker__inline-input {
  flex: 1;
}

.entity-picker__chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: var(--fs-200);
  background: var(--c-basic-200);
  color: var(--c-basic-700);
}

.entity-picker__chip-label {
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.entity-picker__chip-clear {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  color: var(--c-basic-500);
  transition: color 0.15s;

  &:hover {
    color: var(--c-negative-300);
  }
}

.entity-picker__results-panel {
  position: absolute;
  top: calc(var(--elem-height) + 4px);
  left: 0;
  right: 0;
  z-index: 110;
  background: var(--c-basic-100);
  border: 1px solid var(--c-support-400);
  border-radius: var(--space-50);
  box-shadow: var(--shadow-md);
  max-height: 240px;
  overflow-y: auto;
}

.entity-picker__status {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.entity-picker__result {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  text-align: left;
  padding: 8px var(--space-200);
  font-size: var(--fs-200);
  color: var(--c-basic-700);
  background: none;
  border: none;
  border-bottom: 1px solid var(--c-basic-200);
  cursor: pointer;
  transition: background 0.15s;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: var(--c-basic-200);
  }

  &:focus-visible {
    outline: 2px solid var(--c-support-400);
    outline-offset: -2px;
  }
}

.entity-picker__result-label {
  font-weight: 600;
  color: var(--c-basic-700);
}

.entity-picker__result-secondary {
  font-size: var(--fs-100);
  color: var(--c-basic-500);
}
</style>
