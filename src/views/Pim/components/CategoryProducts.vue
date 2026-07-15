<template>
  <div class="category-products">
    <!-- Pinned products panel -->
    <div class="panel mb-400">
      <h3 class="panel-title fs-400 fw-600 mb-200 t-basic-700">
        {{ $t("pim.pinned_products") }}
        <span class="t-basic-500 fw-400">({{ positioned.length }})</span>
      </h3>
      <draggable
        v-model="positioned"
        :group="{ name: 'category-products' }"
        item-key="sku"
        :class="[
          'product-grid product-grid--pinned',
          { 'product-grid--empty': !positioned.length },
        ]"
        :data-empty-hint="$t('pim.drag_to_pin')"
        ghost-class="product-card--ghost"
        @end="onDragEnd"
      >
        <template #item="{ element, index }">
          <div class="product-card product-card--pinned">
            <div class="product-card__handle">
              <font-awesome-icon icon="grip-vertical" class="t-basic-400" />
            </div>
            <span class="product-card__position bg-support-200 t-support-400">
              #{{ index + 1 }}
            </span>
            <div
              v-if="element.thumbnail_url"
              class="product-card__thumb"
              :style="{ backgroundImage: `url(${element.thumbnail_url})` }"
            />
            <div v-else class="product-card__thumb product-card__thumb--empty">
              <font-awesome-icon icon="image" class="t-basic-300" />
            </div>
            <div class="product-card__info">
              <span class="product-card__sku fs-200 t-basic-500">{{
                element.sku
              }}</span>
              <span class="product-card__name fs-300 t-basic-800">{{
                element.name || "---"
              }}</span>
            </div>
          </div>
        </template>
      </draggable>
    </div>

    <!-- Unpositioned products panel -->
    <div class="panel">
      <h3 class="panel-title fs-400 fw-600 t-basic-700 mb-200">
        {{ $t("pim.all_products") }}
        <span class="t-basic-500 fw-400">({{ unpositionedCount }})</span>
      </h3>
      <BasicInput
        v-model="searchQuery"
        :placeholder="$t('common.start_typing')"
        class="search-input mb-200"
      />
      <draggable
        v-model="unpositioned"
        :group="{ name: 'category-products' }"
        item-key="sku"
        class="product-grid"
        ghost-class="product-card--ghost"
        @end="onDragEnd"
      >
        <template #item="{ element }">
          <div class="product-card">
            <div class="product-card__handle">
              <font-awesome-icon icon="grip-vertical" class="t-basic-400" />
            </div>
            <div
              v-if="element.thumbnail_url"
              class="product-card__thumb"
              :style="{ backgroundImage: `url(${element.thumbnail_url})` }"
            />
            <div v-else class="product-card__thumb product-card__thumb--empty">
              <font-awesome-icon icon="image" class="t-basic-300" />
            </div>
            <div class="product-card__info">
              <span class="product-card__sku fs-200 t-basic-500">{{
                element.sku
              }}</span>
              <span class="product-card__name fs-300 t-basic-800">{{
                element.name || "---"
              }}</span>
            </div>
          </div>
        </template>
      </draggable>
      <div
        v-if="!unpositioned.length && !loading"
        class="empty-state t-basic-400 fs-300"
      >
        {{ $t("common.no_data") }}
      </div>

      <!-- Pagination -->
      <div
        v-if="totalPages > 1"
        class="pagination flex ai-center jc-center gap-100 mt-300"
      >
        <button
          class="page-btn"
          :disabled="currentPage <= 1"
          @click="goToPage(currentPage - 1)"
        >
          <font-awesome-icon icon="chevron-left" />
        </button>
        <button
          v-for="p in visiblePages"
          :key="p"
          class="page-btn"
          :class="{ 'page-btn--active': p === currentPage }"
          @click="goToPage(p)"
        >
          {{ p }}
        </button>
        <button
          class="page-btn"
          :disabled="currentPage >= totalPages"
          @click="goToPage(currentPage + 1)"
        >
          <font-awesome-icon icon="chevron-right" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { t } from "@/i18n";
import draggable from "vuedraggable";
import { useLoaderStore } from "@/stores/loader";
import { useNotifyStore } from "@/stores/notify";
import {
  GET_CategoryProducts,
  PATCH_CategoryProductsReorder,
} from "@/api/pim/api";
import { extractApiMessage } from "@/composables/useFormErrors";

const props = defineProps({
  channelIdx: { type: String, required: true },
  categoryIdx: { type: String, required: true },
});

const loader = useLoaderStore();
const notify = useNotifyStore();

const positioned = ref([]);
const unpositioned = ref([]);
const unpositionedCount = ref(0);
const currentPage = ref(1);
const pageSize = 24;
const loading = ref(false);
const searchQuery = ref("");

let searchTimeout = null;

const totalPages = computed(() =>
  Math.max(1, Math.ceil(unpositionedCount.value / pageSize))
);

const visiblePages = computed(() => {
  const pages = [];
  const start = Math.max(1, currentPage.value - 2);
  const end = Math.min(totalPages.value, currentPage.value + 2);
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  return pages;
});

async function fetchProducts() {
  loading.value = true;
  try {
    const params = {
      page: currentPage.value,
      page_size: pageSize,
    };
    if (searchQuery.value) {
      params.search = searchQuery.value;
    }
    const { data } = await GET_CategoryProducts(
      props.channelIdx,
      props.categoryIdx,
      params
    );
    positioned.value = data.positioned;
    unpositioned.value = data.unpositioned;
    unpositionedCount.value = data.unpositioned_count;
  } catch (err) {
    notify.spawnNotification({
      type: "negative",
      msg: extractApiMessage(err, t("notifications.error")),
    });
  } finally {
    loading.value = false;
  }
}

async function savePositions() {
  loader.loaderStart();
  try {
    const items = positioned.value.map((p, idx) => ({
      sku: p.sku,
      position: idx + 1,
    }));
    // Also include items that were moved to unpositioned (position=0)
    for (const p of unpositioned.value) {
      if (p.position > 0) {
        items.push({ sku: p.sku, position: 0 });
      }
    }

    if (items.length > 0) {
      await PATCH_CategoryProductsReorder(props.channelIdx, props.categoryIdx, {
        items,
      });
      notify.spawnNotification({
        type: "positive",
        msg: t("pim.product_positions_saved"),
      });
    }
    await fetchProducts();
  } catch (err) {
    notify.spawnNotification({
      type: "negative",
      msg: extractApiMessage(err, t("notifications.save_error")),
    });
  } finally {
    loader.loaderFinish();
  }
}

function onDragEnd() {
  savePositions();
}

function goToPage(page) {
  if (page < 1 || page > totalPages.value) return;
  currentPage.value = page;
  fetchProducts();
}

watch(searchQuery, () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    currentPage.value = 1;
    fetchProducts();
  }, 300);
});

watch(
  () => [props.channelIdx, props.categoryIdx],
  () => fetchProducts()
);

onMounted(() => fetchProducts());
</script>

<style lang="scss" scoped>
.category-products {
  padding: 4px 0;
}

.panel {
  border: 1px solid var(--c-basic-200);
  border-radius: 6px;
  padding: 20px;
}

.panel-header {
  flex-wrap: wrap;
  gap: var(--space-100);
}

.search-input {
  width: 250px;
  max-width: 100%;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--space-200);
  min-height: 48px;

  &--pinned {
    min-height: 60px;
  }

  &--empty {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 80px;
    border: 2px dashed var(--c-basic-300);
    border-radius: var(--radius-md);
    transition: border-color 0.2s, background 0.2s;

    &::after {
      content: attr(data-empty-hint);
      color: var(--c-basic-400);
      font-size: var(--fs-300);
    }
  }
}

.product-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--c-basic-200);
  border-radius: var(--radius-md);
  background: var(--c-basic-100);
  cursor: grab;
  user-select: none;
  transition: border-color 0.15s, box-shadow 0.15s;

  &:hover {
    border-color: var(--c-basic-300);
  }

  &--pinned {
    border-left: 3px solid var(--c-support-400);
  }

  &__handle {
    flex-shrink: 0;
    cursor: grab;
  }

  &__position {
    flex-shrink: 0;
    font-size: var(--fs-200);
    font-weight: 600;
    padding: 2px 6px;
    border-radius: var(--radius-sm);
  }

  &__thumb {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    border-radius: var(--radius-sm);
    background-size: cover;
    background-position: center;
    background-color: var(--c-basic-200);

    &--empty {
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }

  &__info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1;
  }

  &__sku {
    font-family: monospace;
  }

  &__name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.empty-state {
  padding: 24px;
  text-align: center;
  border: 2px dashed var(--c-basic-200);
  border-radius: var(--radius-md);
}

.pagination {
  padding-top: var(--space-200);
}

.page-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  padding: 0 8px;
  border: 1px solid var(--c-basic-200);
  border-radius: var(--radius-sm);
  background: var(--c-basic-100);
  color: var(--c-basic-600);
  cursor: pointer;
  font-size: var(--fs-200);
  transition: all 0.15s;

  &:hover:not(:disabled) {
    border-color: var(--c-basic-300);
    background: var(--c-basic-200);
  }

  &--active {
    background: var(--c-support-400);
    color: var(--c-basic-100);
    border-color: var(--c-support-400);

    &:hover {
      background: var(--c-support-400);
      border-color: var(--c-support-400);
    }
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}
</style>

<!-- Unscoped: SortableJS ghost is appended to <body> -->
<style>
.product-card--ghost {
  opacity: 0.4;
  border: 2px dashed var(--c-support-400) !important;
  background: var(--c-support-100) !important;
}
</style>
