<template>
  <div class="data-table" role="grid">
    <div class="data-table__grid" :style="gridStyle">
      <div class="data-table__header" role="row">
        <div
          v-if="expandable"
          class="data-table__header-cell data-table__header-cell--expand"
          role="columnheader"
        ></div>
        <div
          v-if="selectable"
          class="data-table__header-cell data-table__header-cell--checkbox"
          role="columnheader"
        >
          <input
            v-if="multiSelect"
            type="checkbox"
            :checked="isAllSelected"
            aria-label="Select all"
            @change="toggleSelectAll"
          />
        </div>
        <div
          v-for="col in columns"
          :key="'h-' + col.key"
          class="data-table__header-cell"
          :class="{
            'data-table__header-cell--sortable': sortable && col.sortable,
          }"
          :style="alignStyle(col)"
          :data-column="col.key"
          role="columnheader"
          :aria-sort="getAriaSortValue(col)"
          :tabindex="sortable && col.sortable ? 0 : undefined"
          @click="sortable && col.sortable && cycleSort(col)"
          @keydown.enter="sortable && col.sortable && cycleSort(col)"
        >
          <slot :name="'header-' + col.key" :column="col">
            {{ col.label }}
          </slot>
          <span
            v-if="sortable && col.sortable"
            class="data-table__sort-indicator"
            :class="{
              'data-table__sort-indicator--asc':
                sortState.key === col.key && sortState.direction === 'asc',
              'data-table__sort-indicator--desc':
                sortState.key === col.key && sortState.direction === 'desc',
            }"
          />
        </div>
      </div>

      <template v-if="rows && rows.length">
        <template v-for="(row, index) in rows" :key="row[rowKey] ?? index">
          <div
            class="data-table__row"
            :class="{
              'data-table__row--selected': selectable && isSelected(row),
            }"
            role="row"
            @click="handleRowClick(row, index, $event)"
          >
            <div
              v-if="expandable"
              class="data-table__cell data-table__cell--expand"
              role="gridcell"
            >
              <button
                type="button"
                class="data-table__expand-toggle"
                :aria-expanded="isExpanded(row)"
                aria-label="Toggle row details"
                @click.stop="toggleExpand(row)"
              >
                <FontAwesomeIcon
                  :icon="isExpanded(row) ? 'chevron-down' : 'chevron-right'"
                />
              </button>
            </div>
            <div
              v-if="selectable"
              class="data-table__cell data-table__cell--checkbox"
              role="gridcell"
            >
              <input
                type="checkbox"
                :checked="isSelected(row)"
                aria-label="Select row"
                @click.stop="toggleSelect(row, index, $event)"
              />
            </div>
            <div
              v-for="col in columns"
              :key="col.key"
              class="data-table__cell"
              :style="alignStyle(col)"
              :data-column="col.key"
              role="gridcell"
            >
              <slot
                :name="'cell-' + col.key"
                :row="row"
                :value="row[col.key]"
                :index="index"
              >
                {{ row[col.key] }}
              </slot>
            </div>
          </div>
          <div
            v-if="expandable && isExpanded(row)"
            class="data-table__expand-row"
            role="row"
          >
            <div class="data-table__expand-cell" role="gridcell">
              <slot name="expand" :row="row" :index="index" />
            </div>
          </div>
        </template>
      </template>

      <div v-else class="data-table__empty" role="row">
        <div role="gridcell">
          <slot name="empty">{{ emptyText || "No data" }}</slot>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";

const props = defineProps({
  columns: {
    type: Array,
    required: true,
  },
  rows: {
    type: Array,
    default: () => [],
  },
  emptyText: {
    type: String,
    default: "",
  },
  sortable: {
    type: Boolean,
    default: false,
  },
  selectable: {
    type: Boolean,
    default: false,
  },
  multiSelect: {
    type: Boolean,
    default: false,
  },
  rowKey: {
    type: String,
    default: "uid",
  },
  // Opt-in inline expand row. Renders the #expand slot in a full-width row below the
  // clicked row. Default off — existing panels (PIM, PriceManager) keep prior behavior.
  expandable: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["sort", "select", "row-click", "expand-toggle"]);

const ALIGN_MAP = { left: "flex-start", center: "center", right: "flex-end" };

function alignStyle(col) {
  return { justifyContent: ALIGN_MAP[col.align] || "flex-start" };
}

// --- Grid layout ---

const gridStyle = computed(() => {
  const widths = [];
  if (props.expandable) widths.push("32px");
  if (props.selectable) widths.push("40px");
  widths.push(...props.columns.map((col) => col.width || "auto"));
  return { gridTemplateColumns: widths.join(" ") };
});

// --- Expand ---

const expandedKeys = ref(new Set());

function isExpanded(row) {
  return expandedKeys.value.has(row[props.rowKey]);
}

function toggleExpand(row) {
  const key = row[props.rowKey];
  const next = new Set(expandedKeys.value);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  expandedKeys.value = next;
  emit("expand-toggle", { row, expanded: next.has(key) });
}

// --- Sort ---

const sortState = ref({ key: null, direction: null });

function cycleSort(col) {
  if (sortState.value.key !== col.key) {
    sortState.value = { key: col.key, direction: "asc" };
  } else if (sortState.value.direction === "asc") {
    sortState.value = { key: col.key, direction: "desc" };
  } else {
    sortState.value = { key: null, direction: null };
  }
  emit("sort", { ...sortState.value });
}

function getAriaSortValue(col) {
  if (!props.sortable || !col.sortable) return undefined;
  if (sortState.value.key !== col.key) return "none";
  return sortState.value.direction === "asc" ? "ascending" : "descending";
}

// --- Selection ---

const selectedKeys = ref(new Set());
let lastSelectedIndex = null;

function isSelected(row) {
  return selectedKeys.value.has(row[props.rowKey]);
}

const isAllSelected = computed(() => {
  if (!props.rows || !props.rows.length) return false;
  return props.rows.every((row) => selectedKeys.value.has(row[props.rowKey]));
});

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedKeys.value = new Set();
  } else {
    selectedKeys.value = new Set(props.rows.map((row) => row[props.rowKey]));
  }
  emitSelect();
}

function toggleSelect(row, index, event) {
  const key = row[props.rowKey];
  const newSet = new Set(selectedKeys.value);

  if (props.multiSelect && event.shiftKey && lastSelectedIndex !== null) {
    const start = Math.min(lastSelectedIndex, index);
    const end = Math.max(lastSelectedIndex, index);
    for (let i = start; i <= end; i++) {
      newSet.add(props.rows[i][props.rowKey]);
    }
  } else if (props.multiSelect) {
    // multi-select: a plain click (e.g. checkbox) or ctrl/meta click toggles this
    // row WITHOUT clearing the rest. Shift (above) handles range selection.
    if (newSet.has(key)) newSet.delete(key);
    else newSet.add(key);
  } else {
    // single-select: replace the whole selection with just this row
    newSet.clear();
    newSet.add(key);
  }

  selectedKeys.value = newSet;
  lastSelectedIndex = index;
  emitSelect();
}

function emitSelect() {
  const selected = props.rows.filter((row) =>
    selectedKeys.value.has(row[props.rowKey])
  );
  emit("select", selected);
}

// Clear selection from the parent (e.g. a "Clear selection" bulk-bar button or
// after a bulk action completes). Resets internal checkbox state and re-emits.
function clearSelection() {
  selectedKeys.value = new Set();
  lastSelectedIndex = null;
  emitSelect();
}

defineExpose({ clearSelection });

// --- Row click ---

function handleRowClick(row, index, event) {
  if (props.selectable) {
    toggleSelect(row, index, event);
  }
  emit("row-click", row);
}
</script>

<style lang="scss" scoped>
.data-table {
  background-color: var(--c-basic-100);
  @media only screen and (max-width: 768px) {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    &::-webkit-scrollbar {
      display: none;
    }
  }
}

.data-table__grid {
  display: grid;
  @media only screen and (max-width: 768px) {
    min-width: 600px;
  }
}

.data-table__header {
  display: grid;
  grid-template-columns: subgrid;
  grid-column: 1 / -1;
  border-bottom: 1px solid var(--c-basic-300);
}

.data-table__header-cell {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--c-basic-700);
  user-select: none;

  &--sortable {
    cursor: pointer;
    &:hover {
      color: var(--c-basic-800);
    }
  }

  &--checkbox {
    justify-content: center;
  }
}

.data-table__sort-indicator {
  display: inline-block;
  width: 0;
  height: 0;
  margin-left: 4px;
  vertical-align: middle;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  opacity: 0.3;
  border-bottom: 4px solid currentColor;

  &--asc {
    opacity: 1;
    border-top: none;
    border-bottom: 4px solid currentColor;
  }

  &--desc {
    opacity: 1;
    border-bottom: none;
    border-top: 4px solid currentColor;
  }
}

.data-table__row {
  display: grid;
  grid-template-columns: subgrid;
  grid-column: 1 / -1;
  border-bottom: 1px solid var(--c-basic-200);
  transition: background-color 0.1s ease;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background-color: var(--c-basic-200);
  }

  &--selected {
    background-color: var(--c-support-200);
  }
}

.data-table__cell {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 10px 16px;
  font-size: 13px;
  color: var(--c-basic-700);
  min-width: 0;

  &--checkbox {
    justify-content: center;
  }
}

.data-table__empty {
  grid-column: 1 / -1;
  padding: 32px;
  text-align: center;
  color: var(--c-basic-500);
  font-size: 13px;
}

.data-table__header-cell--expand,
.data-table__cell--expand {
  justify-content: center;
}

.data-table__expand-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--c-basic-500);
  cursor: pointer;
  transition: background-color 0.1s ease, color 0.1s ease;

  &:hover {
    background-color: var(--c-basic-300);
    color: var(--c-basic-700);
  }
}

.data-table__expand-row {
  grid-column: 1 / -1;
  border-bottom: 1px solid var(--c-basic-200);
  background-color: var(--c-basic-200);
}

.data-table__expand-cell {
  padding: 12px 16px;
}
</style>
