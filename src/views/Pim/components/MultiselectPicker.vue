<template>
  <!-- Small set: inline checkboxes -->
  <div v-if="optionCount <= 20" class="multiselect-wrapper">
    <label v-for="opt in options" :key="opt.value" class="multiselect-option">
      <input
        type="checkbox"
        class="multiselect-option__input"
        :checked="selected.includes(opt.value)"
        @change="toggleOption(opt.value, $event.target.checked)"
      />
      <span class="multiselect-option__label">{{ opt.label }}</span>
    </label>
  </div>

  <!-- Large set: chips + search picker -->
  <div v-else class="ms-picker">
    <div class="ms-picker__chips">
      <span v-for="idx in selected" :key="idx" class="ms-picker__chip">
        {{ resolveLabel(idx) }}
        <button class="ms-picker__chip-remove" @click="removeOption(idx)">
          &times;
        </button>
      </span>
      <span v-if="!selected.length" class="ms-picker__empty t-basic-400 fs-200">
        {{ $t("pim.no_values_selected") }}
      </span>
    </div>

    <div
      ref="searchArea"
      class="ms-picker__search-area"
      v-out="
        () => {
          pickerOpen = false;
        }
      "
    >
      <input
        ref="searchInput"
        v-model="query"
        class="ms-picker__input"
        :placeholder="$t('pim.search_to_add')"
        @focus="openPicker"
        @input="onSearch"
      />

      <div
        v-if="pickerOpen"
        class="ms-picker__panel"
        :class="{ 'ms-picker__panel--flip': flipUp }"
      >
        <div class="ms-picker__list" ref="listEl">
          <div
            v-for="opt in filteredResults"
            :key="opt.value"
            class="ms-picker__item"
            @click="addOption(opt.value)"
          >
            {{ opt.label }}
          </div>
          <div
            v-if="!filteredResults.length && !loadingMore"
            class="ms-picker__empty-results t-basic-400 fs-200"
          >
            {{ $t("pim.no_results") }}
          </div>
          <div v-if="loadingMore" class="ms-picker__loading t-basic-400 fs-200">
            Loading...
          </div>
          <div ref="sentinel" class="sentinel"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onBeforeUnmount } from "vue";
import { GET_FeatureAttributes, GET_Attributes } from "@/api/pim/api";

const props = defineProps({
  options: { type: Array, default: () => [] },
  selected: { type: Array, default: () => [] },
  featureIdx: { type: String, required: true },
  channelIdx: { type: String, required: true },
  optionCount: { type: Number, default: 0 },
});

const emit = defineEmits(["update:selected"]);

const pickerOpen = ref(false);
const flipUp = ref(false);
const query = ref("");
const page = ref(1);
const results = ref([]);
const hasNextPage = ref(false);
const loadingMore = ref(false);
const searchInput = ref(null);
const sentinel = ref(null);
const listEl = ref(null);
const searchArea = ref(null);
let searchTimeout = null;
let observer = null;

const filteredResults = computed(() =>
  results.value.filter((opt) => !props.selected.includes(opt.value))
);

function resolveLabel(idx) {
  const found = props.options.find((o) => o.value === idx);
  if (found) return found.label;
  const inResults = results.value.find((o) => o.value === idx);
  return inResults ? inResults.label : idx;
}

function toggleOption(value, checked) {
  const current = [...props.selected];
  if (checked) {
    emit("update:selected", [...current, value]);
  } else {
    emit(
      "update:selected",
      current.filter((v) => v !== value)
    );
  }
}

function addOption(value) {
  if (props.selected.includes(value)) return;
  emit("update:selected", [...props.selected, value]);
}

function removeOption(value) {
  emit(
    "update:selected",
    props.selected.filter((v) => v !== value)
  );
}

async function openPicker() {
  if (pickerOpen.value) return;
  // Detect if panel should flip upward
  if (searchArea.value) {
    const rect = searchArea.value.getBoundingClientRect();
    flipUp.value = window.innerHeight - rect.bottom < 250;
  }
  pickerOpen.value = true;
  query.value = "";
  page.value = 1;
  results.value = [];
  await loadPage(1);
  await nextTick();
  setupObserver();
}

async function loadPage(pageNum) {
  loadingMore.value = true;
  try {
    let data;
    if (query.value) {
      const res = await GET_Attributes({
        feature_idx: props.featureIdx,
        search: query.value,
        page_size: 20,
        page: pageNum,
      });
      data = res.data;
    } else {
      const res = await GET_FeatureAttributes(
        props.featureIdx,
        props.channelIdx,
        { page_size: 20, page: pageNum }
      );
      data = res.data;
    }
    const items = (data.results || data || []).map((a) => ({
      label: a.name_t9n?.en || a.name || a.idx,
      value: a.idx,
    }));
    if (pageNum === 1) {
      results.value = items;
    } else {
      results.value = [...results.value, ...items];
    }
    hasNextPage.value = !!data.next;
    page.value = pageNum;
  } catch {
    hasNextPage.value = false;
  } finally {
    loadingMore.value = false;
  }
}

function loadNextPage() {
  if (loadingMore.value || !hasNextPage.value) return;
  loadPage(page.value + 1);
}

function onSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    page.value = 1;
    loadPage(1).then(() => {
      nextTick(() => setupObserver());
    });
  }, 300);
}

function setupObserver() {
  cleanupObserver();
  if (!sentinel.value) return;
  observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting && hasNextPage.value && !loadingMore.value) {
        loadNextPage();
      }
    },
    { root: listEl.value }
  );
  observer.observe(sentinel.value);
}

function cleanupObserver() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
}

onBeforeUnmount(() => {
  cleanupObserver();
  clearTimeout(searchTimeout);
});
</script>

<style lang="scss" scoped>
.multiselect-wrapper {
  display: flex;
  flex-direction: column;
  gap: var(--space-100);
}

.multiselect-option {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 0;

  &__input {
    appearance: none;
    width: 16px;
    height: 16px;
    border: 1px solid var(--c-basic-300);
    border-radius: var(--radius-sm);
    background: var(--c-basic-100);
    cursor: pointer;
    flex-shrink: 0;
    position: relative;

    &:checked {
      background: var(--c-support-400);
      border-color: var(--c-support-400);
    }

    &:checked::after {
      content: "";
      position: absolute;
      top: 2px;
      left: 5px;
      width: 4px;
      height: 8px;
      border: solid var(--c-basic-100);
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }
  }

  &__label {
    font-size: var(--fs-300);
    color: var(--c-basic-800);
    user-select: none;
  }
}

.ms-picker {
  display: flex;
  flex-direction: column;
  gap: var(--space-200);

  &__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    min-height: 28px;
    align-items: center;
  }

  &__chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    background: var(--c-support-100);
    color: var(--c-support-400);
    border-radius: var(--radius-sm);
    font-size: var(--fs-200);
    font-weight: 600;
  }

  &__chip-remove {
    background: none;
    border: none;
    color: var(--c-support-400);
    cursor: pointer;
    font-size: 14px;
    line-height: 1;
    padding: 0 2px;

    &:hover {
      color: var(--c-negative-300);
    }
  }

  &__empty {
    padding: 4px 0;
  }

  &__search-area {
    position: relative;
  }

  &__input {
    display: block;
    width: 100%;
    height: var(--elem-height);
    padding: 0 12px;
    border: 1px solid var(--c-basic-300);
    border-radius: var(--radius-md);
    background: var(--c-basic-100);
    font-size: var(--fs-300);
    color: var(--c-basic-800);
    outline: none;
    box-sizing: border-box;

    &:focus {
      border-color: var(--c-support-400);
    }
  }

  &__panel {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    border: 1px solid var(--c-basic-300);
    border-radius: var(--radius-md);
    background: var(--c-basic-100);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    z-index: 10;

    &--flip {
      top: auto;
      bottom: calc(100% + 4px);
    }
  }

  &__list {
    max-height: 14rem;
    overflow-y: auto;
  }

  &__item {
    padding: 8px 12px;
    cursor: pointer;
    font-size: var(--fs-300);
    color: var(--c-basic-800);

    &:hover {
      background: var(--c-basic-200);
    }
  }

  &__empty-results {
    padding: 8px 12px;
    text-align: center;
  }

  &__loading {
    padding: 8px 12px;
    text-align: center;
  }
}

.sentinel {
  height: 1px;
}
</style>
