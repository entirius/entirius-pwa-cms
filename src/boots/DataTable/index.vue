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
          v-for="col in visibleColumns"
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
          <span class="data-table__header-label">
            <slot :name="'header-' + col.key" :column="col">
              {{ col.label }}
            </slot>
          </span>
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
                :aria-label="$t('common.toggle_details')"
                :title="$t('common.toggle_details')"
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
              v-for="col in visibleColumns"
              :key="col.key"
              class="data-table__cell"
              :class="cellClass(col)"
              :style="alignStyle(col)"
              :data-column="col.key"
              role="gridcell"
            >
              <span
                v-if="isTruncated(col)"
                class="data-table__text"
                :title="titleOf(row, col)"
              >
                <slot
                  :name="'cell-' + col.key"
                  :row="row"
                  :value="row[col.key]"
                  :index="index"
                >
                  {{ displayOf(row[col.key]) }}
                </slot>
              </span>
              <slot
                v-else
                :name="'cell-' + col.key"
                :row="row"
                :value="row[col.key]"
                :index="index"
              >
                {{ displayOf(row[col.key]) }}
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
    </div>

    <!-- Outside the grid: on a phone the grid scrolls sideways, the empty state stays in view. -->
    <div v-if="!rows || !rows.length" class="data-table__empty" role="row">
      <div role="gridcell">
        <slot name="empty">
          <EmptyState icon="inbox" :title="emptyText || t('common.no_data')" />
        </slot>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, useSlots } from "vue";
import { t } from "@/i18n";
import { useMediaQuery } from "@/composables/useMediaQuery";

/**
 * Column options (`columns` prop):
 * - `key`, `label`, `sortable`, `align` ("left" | "center" | "right").
 * - `width`: a grid track. A px width never gets narrower than its header or an untruncated cell (a badge,
 *   buttons), so neighbours never overlap; below 768 px it shrinks to that content and the `fr` name takes the rest.
 * - `truncate`: one line with an ellipsis and a `title` with the full value (`title(row)` or the row value).
 *   On by default for cells without a slot; a slot opts in with `truncate: true`.
 * - `numeric`: right-aligned, tabular figures, no wrap.
 * - `actions`: right-aligned buttons that never shrink; the track is `max-content` unless `width` is given.
 * - `priority`: 1 (default) always shown; 2 hidden below 768 px; 3 hidden below 1024 px.
 * An empty value (null, undefined, "") renders "—".
 */
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
const EMPTY = "\u2014";
const FR_WIDTH = /^\d*\.?\d+fr$/;
const PX_WIDTH = /^\d*\.?\d+px$/;
// A truncated flexible column keeps room for a few words before it truncates.
const TRUNCATED_FR_MIN = "120px";

const slots = useSlots();
const belowTablet = useMediaQuery("(max-width: 767px)");
const belowDesktop = useMediaQuery("(max-width: 1023px)");

function alignStyle(col) {
  const align = col.numeric || col.actions ? "right" : col.align;
  return { justifyContent: ALIGN_MAP[align] || "flex-start" };
}

// --- Cells ---

function isTruncated(col) {
  return col.truncate ?? (!slots[`cell-${col.key}`] && !col.numeric && !col.actions);
}

function cellClass(col) {
  return {
    "data-table__cell--truncate": isTruncated(col),
    "data-table__cell--numeric": col.numeric,
    "data-table__cell--actions": col.actions,
  };
}

const isEmpty = (value) => value === null || value === undefined || value === "";

function displayOf(value) {
  return isEmpty(value) ? EMPTY : value;
}

function titleOf(row, col) {
  const value = col.title ? col.title(row) : row[col.key];
  return ["string", "number"].includes(typeof value) && !isEmpty(value) ? String(value) : undefined;
}

// --- Grid layout ---

function isVisible(col) {
  if (col.priority === 2) return !belowTablet.value;
  if (col.priority === 3) return !belowDesktop.value;
  return true;
}

const visibleColumns = computed(() => props.columns.filter(isVisible));

function trackOf(col) {
  const width = col.width || (col.actions ? "max-content" : "auto");
  if (col.actions && col.width) return `minmax(${width}, max-content)`;
  // A phone gives the free width to the name: a px column shrinks to its header or untruncated content.
  if (PX_WIDTH.test(width)) return belowTablet.value ? "min-content" : `minmax(min-content, ${width})`;
  if (FR_WIDTH.test(width) && isTruncated(col)) return `minmax(${TRUNCATED_FR_MIN}, ${width})`;
  return width;
}

const gridStyle = computed(() => {
  const widths = [];
  if (props.expandable) widths.push("32px");
  if (props.selectable) widths.push("40px");
  widths.push(...visibleColumns.value.map(trackOf));
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
@import "@/assets/scss/utils/media-query";

.data-table {
  background-color: var(--surface-base);
  @include max-tablet {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
  }
}

// Columns size from their tracks (see trackOf); a phone hides priority 2–3 columns instead of squeezing the name.
.data-table__grid {
  display: grid;
}

.data-table__header {
  display: grid;
  grid-template-columns: subgrid;
  grid-column: 1 / -1;
  border-bottom: 1px solid var(--border-subtle);
}

// Cell model: 12 px padding (two columns ≥ 24 px apart). A header never wraps and floors its column's width.
.data-table__header-cell {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-3);
  white-space: nowrap;
  font-size: var(--fs-200);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--text-body);
  user-select: none;

  &--sortable {
    cursor: pointer;
    &:hover {
      color: var(--text-body);
    }
  }

  &--checkbox {
    justify-content: center;
  }
}

.data-table__sort-indicator {
  flex-shrink: 0;
  display: inline-block;
  width: 0;
  height: 0;
  margin-left: var(--space-1);
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
  border-bottom: 1px solid var(--border-subtle);
  transition: background-color 0.1s ease;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background-color: var(--surface-raised);
  }

  &--selected {
    background-color: var(--accent-subtle);
  }
}

// An untruncated cell (badge, buttons) floors its column; a truncated one gives way and shows an ellipsis.
.data-table__cell {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-3);
  font-size: var(--fs-250);
  color: var(--text-body);

  &--checkbox {
    justify-content: center;
  }

  // Out of intrinsic sizing: the column width comes from its track and header, not from the full text.
  &--truncate {
    min-width: 0;
    contain: inline-size;
  }

  &--numeric {
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  &--actions {
    gap: var(--space-2);
    white-space: nowrap;
  }
}

// Clip, not hidden: the 4 px margin keeps the focus ring of a link inside the text visible.
.data-table__text {
  min-width: 0;
  overflow: clip;
  overflow-clip-margin: var(--space-1);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.data-table__empty {
  position: sticky;
  left: 0;
  text-align: center;
  color: var(--text-muted);
  font-size: var(--fs-250);
}

.data-table__header-cell--expand,
.data-table__cell--expand {
  justify-content: center;
  padding-left: 0;
  padding-right: 0;
}

.data-table__expand-toggle {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: var(--space-6);
  height: var(--space-6);
  border: none;
  border-radius: var(--radius-base);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: background-color 0.1s ease, color 0.1s ease;

  &:hover {
    background-color: var(--surface-hover);
    color: var(--text-body);
  }
}

.data-table__expand-row {
  grid-column: 1 / -1;
  border-bottom: 1px solid var(--border-subtle);
  background-color: var(--surface-raised);
}

.data-table__expand-cell {
  padding: var(--space-3) var(--space-4);
}
</style>
