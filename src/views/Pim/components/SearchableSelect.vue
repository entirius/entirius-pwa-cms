<template>
  <Dropdown
    v-if="optionCount <= 50"
    :values="[
      { label: $t('pim.clear_attribute_value'), value: null },
      ...options,
    ]"
    :selected="selected ? [selected] : []"
    :placeholder="placeholder"
    @onSelect="(val) => emit('update:selected', val)"
  />

  <div
    v-else
    ref="selectRoot"
    class="searchable-select"
    v-out="
      () => {
        open = false;
      }
    "
  >
    <div class="searchable-select__trigger" @click="toggle">
      <span v-if="selectedLabel" class="t-basic-800">{{ selectedLabel }}</span>
      <span v-else class="t-basic-400">{{ placeholder }}</span>
      <span class="searchable-select__chevron" :class="{ 'is-open': open }"
        >&#x25BC;</span
      >
    </div>

    <div
      v-if="open"
      class="searchable-select__panel"
      :class="{ 'searchable-select__panel--flip': flipUp }"
    >
      <input
        ref="searchInput"
        v-model="query"
        class="searchable-select__search"
        :placeholder="$t('pim.search_to_add')"
        @input="onSearch"
      />

      <div class="searchable-select__list" ref="listEl">
        <div
          class="searchable-select__item searchable-select__item--clear"
          @click="selectOption(null)"
        >
          {{ $t("pim.clear_attribute_value") }}
        </div>
        <div
          v-for="opt in results"
          :key="opt.value"
          class="searchable-select__item"
          :class="{ 'is-selected': opt.value === selected }"
          @click="selectOption(opt.value)"
        >
          {{ opt.label }}
        </div>
        <div
          v-if="loadingMore"
          class="searchable-select__loading t-basic-400 fs-200"
        >
          Loading...
        </div>
        <div ref="sentinel" class="sentinel"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onBeforeUnmount } from "vue";
import { GET_FeatureAttributes, GET_Attributes } from "@/api/pim/api";

const props = defineProps({
  options: { type: Array, default: () => [] },
  selected: { type: String, default: null },
  featureIdx: { type: String, required: true },
  channelIdx: { type: String, required: true },
  optionCount: { type: Number, default: 0 },
  placeholder: { type: String, default: "" },
});

const emit = defineEmits(["update:selected"]);

const open = ref(false);
const flipUp = ref(false);
const query = ref("");
const page = ref(1);
const results = ref([]);
const hasNextPage = ref(false);
const loadingMore = ref(false);
const searchInput = ref(null);
const sentinel = ref(null);
const listEl = ref(null);
const selectRoot = ref(null);
let searchTimeout = null;
let observer = null;

const selectedLabel = computed(() => {
  if (!props.selected) return null;
  const found = props.options.find((o) => o.value === props.selected);
  if (found) return found.label;
  const inResults = results.value.find((o) => o.value === props.selected);
  return inResults ? inResults.label : props.selected;
});

async function toggle() {
  open.value = !open.value;
  if (open.value) {
    if (selectRoot.value) {
      const rect = selectRoot.value.getBoundingClientRect();
      flipUp.value = window.innerHeight - rect.bottom < 300;
    }
    query.value = "";
    page.value = 1;
    results.value = [];
    await loadPage(1);
    await nextTick();
    searchInput.value?.focus();
    setupObserver();
  } else {
    cleanupObserver();
  }
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

function selectOption(val) {
  emit("update:selected", val);
  open.value = false;
  cleanupObserver();
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
.searchable-select {
  position: relative;

  &__trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: var(--elem-height);
    padding: 0 12px;
    border: 1px solid var(--c-basic-300);
    border-radius: var(--radius-md);
    background: var(--c-basic-100);
    cursor: pointer;
    font-size: var(--fs-300);
  }

  &__chevron {
    font-size: 8px;
    transition: transform 0.2s;
    color: var(--c-basic-500);
    &.is-open {
      transform: rotate(180deg);
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

  &__search {
    display: block;
    width: 100%;
    padding: 8px 12px;
    border: none;
    border-bottom: 1px solid var(--c-basic-200);
    background: transparent;
    font-size: var(--fs-300);
    color: var(--c-basic-800);
    outline: none;
    box-sizing: border-box;
  }

  &__list {
    max-height: 16rem;
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
    &.is-selected {
      background: var(--c-support-100);
      font-weight: 600;
    }
    &--clear {
      color: var(--c-basic-500);
      font-style: italic;
    }
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
