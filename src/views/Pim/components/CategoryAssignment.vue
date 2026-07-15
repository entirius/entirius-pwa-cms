<script setup>
import { ref, watch } from "vue";
import { GET_Categories } from "@/api/pim/api";

const props = defineProps({
  categories: { type: Array, default: () => [] },
  channelIdx: { type: String, required: true },
});

const emit = defineEmits(["update:categoryIdxs"]);

const localCategories = ref([...props.categories]);
const searchQuery = ref("");
const searchResults = ref([]);
const showDropdown = ref(false);
const debounceTimer = ref(null);

watch(
  () => props.categories,
  (val) => {
    localCategories.value = [...val];
  },
  { deep: true }
);

function removeCategory(idx) {
  localCategories.value = localCategories.value.filter((c) => c.idx !== idx);
  emitUpdate();
}

function addCategory(cat) {
  if (localCategories.value.find((c) => c.idx === cat.idx)) {
    closeDropdown();
    return;
  }
  localCategories.value.push({ idx: cat.idx, name: cat.name });
  searchQuery.value = "";
  searchResults.value = [];
  showDropdown.value = false;
  emitUpdate();
}

function emitUpdate() {
  emit(
    "update:categoryIdxs",
    localCategories.value.map((c) => c.idx)
  );
}

function onSearchInput() {
  clearTimeout(debounceTimer.value);
  if (!searchQuery.value.trim()) {
    searchResults.value = [];
    showDropdown.value = false;
    return;
  }
  debounceTimer.value = setTimeout(fetchCategories, 300);
}

async function fetchCategories() {
  try {
    const { data } = await GET_Categories(props.channelIdx, {
      search: searchQuery.value,
      page_size: 10,
    });
    searchResults.value = data.results || [];
    showDropdown.value = searchResults.value.length > 0;
  } catch {
    searchResults.value = [];
    showDropdown.value = false;
  }
}

function closeDropdown() {
  showDropdown.value = false;
}
</script>

<template>
  <div class="category-assignment">
    <!-- Current category chips -->
    <div class="category-assignment__chips">
      <span v-if="!localCategories.length" class="fs-200 t-basic-500">
        {{ $t("pim.no_categories") }}
      </span>
      <span v-for="cat in localCategories" :key="cat.idx" class="category-chip">
        <router-link
          :to="`/pim/categories/${cat.idx}`"
          class="category-chip__link"
          >{{ cat.name || cat.idx }}</router-link
        >
        <button
          class="category-chip__remove"
          :aria-label="$t('common.delete')"
          @click="removeCategory(cat.idx)"
        >
          &times;
        </button>
      </span>
    </div>

    <!-- Search input with dropdown -->
    <div class="category-assignment__search" v-out="() => closeDropdown()">
      <BasicInput
        v-model="searchQuery"
        :placeholder="$t('pim.category_find')"
        icon="search"
        @update:modelValue="onSearchInput"
      />
      <div
        v-if="showDropdown"
        class="category-assignment__dropdown"
        role="listbox"
      >
        <button
          v-for="result in searchResults"
          :key="result.idx"
          class="category-assignment__dropdown-item"
          role="option"
          @click="addCategory(result)"
        >
          {{ result.name || result.idx }}
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.category-assignment {
  display: flex;
  flex-direction: column;
  gap: var(--space-300);
}

.category-assignment__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-100);
  min-height: 28px;
}

.category-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: var(--fs-200);
  background: var(--c-basic-200);
  color: var(--c-basic-700);
}

.category-chip__link {
  color: inherit;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

.category-chip__remove {
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

  &:focus-visible {
    outline: 2px solid var(--c-support-400);
    border-radius: 2px;
  }
}

.category-assignment__search {
  position: relative;
}

.category-assignment__dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 10;
  background: var(--c-basic-100);
  border: 1px solid var(--c-basic-300);
  border-radius: 4px;
  max-height: 240px;
  overflow-y: auto;
  box-shadow: var(--shadow-200);
}

.category-assignment__dropdown-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 8px var(--space-200);
  font-size: var(--fs-200);
  color: var(--c-basic-700);
  background: none;
  border: none;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: var(--c-basic-200);
  }

  &:focus-visible {
    outline: 2px solid var(--c-support-400);
    outline-offset: -2px;
  }
}
</style>
