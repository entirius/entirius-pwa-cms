<script setup>
import { computed } from "vue";

const props = defineProps({
  node: { type: Object, required: true },
  depth: { type: Number, default: 0 },
  expandedNodes: { type: Object, required: true },
  isRoot: { type: Boolean, default: false },
  dragState: { type: Object, default: null },
});

const emit = defineEmits([
  "toggle",
  "select",
  "dragstart",
  "dragover",
  "drop",
  "dragend",
]);

const isExpanded = computed(() => props.expandedNodes.has(props.node.idx));
const hasChildren = computed(
  () => props.node.children && props.node.children.length > 0
);
const isDraggable = computed(() => !props.isRoot);
const displayName = computed(
  () =>
    props.node.name ||
    (props.node.name_t9n &&
      (props.node.name_t9n.en ||
        props.node.name_t9n.EN ||
        props.node.name_t9n.pl ||
        props.node.name_t9n.PL)) ||
    props.node.idx
);

const dropIndicator = computed(() => {
  if (!props.dragState || props.dragState.targetIdx !== props.node.idx)
    return null;
  return props.dragState.position;
});

function onRowClick() {
  if (hasChildren.value) {
    emit("toggle", props.node.idx);
  }
}

function onDragStart(e) {
  if (props.isRoot) return;
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", props.node.idx);
  emit("dragstart", props.node);
}

function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  const rect = e.currentTarget.getBoundingClientRect();
  const y = e.clientY - rect.top;
  const third = rect.height / 3;

  let position;
  if (y < third) {
    position = "before";
  } else if (y > third * 2) {
    position = "after";
  } else {
    position = "inside";
  }

  // Root nodes only accept 'inside' drops — prevent creating new root categories
  if (props.isRoot && position !== "inside") {
    position = "inside";
  }

  emit("dragover", { idx: props.node.idx, position });
}

function onDrop(e) {
  e.preventDefault();
  emit("drop", { targetIdx: props.node.idx });
}

function onDragEnd() {
  emit("dragend");
}
</script>

<template>
  <div class="tree-node">
    <div
      class="tree-node__row"
      :class="{
        'tree-node__row--drop-before': dropIndicator === 'before',
        'tree-node__row--drop-inside': dropIndicator === 'inside',
        'tree-node__row--drop-after': dropIndicator === 'after',
        'tree-node__row--dragging':
          dragState && dragState.draggedIdx === node.idx,
      }"
      :style="{ paddingLeft: `${depth * 24 + 12}px` }"
      :draggable="isDraggable"
      @click="onRowClick"
      @dragstart="onDragStart"
      @dragover="onDragOver"
      @drop="onDrop"
      @dragend="onDragEnd"
    >
      <span
        v-if="isDraggable"
        class="tree-node__drag-handle t-basic-400 cursor-grab"
        >&#x2630;</span
      >
      <span class="tree-node__toggle">
        <template v-if="hasChildren">{{ isExpanded ? "▼" : "▶" }}</template>
      </span>
      <span class="tree-node__icon t-basic-500"
        ><font-awesome-icon icon="folder"
      /></span>
      <span class="tree-node__name">{{ displayName }}</span>
      <span
        v-if="isRoot"
        class="chip chip--sm bg-support-200 t-support-400 tree-node__root-badge"
        >Root</span
      >
      <span class="chip chip--pill bg-basic-200 t-basic-600">{{
        node.product_count || 0
      }}</span>
      <span
        class="tree-node__status"
        :class="
          node.is_active
            ? 'tree-node__status--active'
            : 'tree-node__status--inactive'
        "
      />
      <span
        v-if="!node.is_in_menu"
        class="tree-node__hidden t-basic-500"
        :title="$t('pim.hidden_from_menu')"
      >
        <font-awesome-icon icon="eye-slash" />
      </span>
      <button class="tree-node__edit" @click.stop="emit('select', node)">
        <i class="icon-edit" />
        {{ $t("common.edit") }}
      </button>
    </div>
    <template v-if="isExpanded">
      <CategoryTreeNode
        v-for="child in node.children"
        :key="child.idx"
        :node="child"
        :depth="depth + 1"
        :expanded-nodes="expandedNodes"
        :drag-state="dragState"
        @toggle="(idx) => emit('toggle', idx)"
        @select="(cat) => emit('select', cat)"
        @dragstart="(node) => emit('dragstart', node)"
        @dragover="(data) => emit('dragover', data)"
        @drop="(data) => emit('drop', data)"
        @dragend="emit('dragend')"
      />
    </template>
  </div>
</template>

<style lang="scss" scoped>
.tree-node__row {
  display: flex;
  align-items: center;
  gap: var(--space-100);
  padding-top: var(--space-100);
  padding-right: 12px;
  padding-bottom: var(--space-100);
  cursor: pointer;
  border-bottom: 1px solid var(--c-basic-200);
  transition: background 0.15s;
  position: relative;

  &:hover {
    background: var(--c-basic-100);
  }
}

.tree-node__row--dragging {
  opacity: 0.4;
}

.tree-node__row--drop-before {
  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--c-support-400);
  }
}

.tree-node__row--drop-after {
  &::after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--c-support-400);
  }
}

.tree-node__row--drop-inside {
  background: var(--c-support-100);
}

.tree-node__drag-handle {
  flex-shrink: 0;
  font-size: var(--fs-300);
}

.tree-node__toggle {
  width: 20px;
  text-align: center;
  flex-shrink: 0;
  cursor: pointer;
  font-size: var(--fs-100);
  color: var(--c-basic-500);
}

.tree-node__icon {
  flex-shrink: 0;
  font-size: var(--fs-300);
}

.tree-node__name {
  flex: 1;
  font-weight: 500;
}

.tree-node__edit {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  font-size: 12px;
  color: var(--c-basic-600);
  background: none;
  border: 1px solid transparent;
  border-radius: 5px;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 0.15s ease;

  &:hover {
    background-color: var(--c-basic-300);
    border-color: var(--c-basic-400);
  }
}

.tree-node__hidden {
  flex-shrink: 0;
  font-size: var(--fs-200);
  opacity: 0.7;
}

.tree-node__root-badge {
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tree-node__status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.tree-node__status--active {
  background: var(--c-positive-200);
}

.tree-node__status--inactive {
  background: var(--c-negative-200);
}
</style>
