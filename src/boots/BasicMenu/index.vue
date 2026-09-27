<template>
  <span ref="root" class="basic-menu" :class="{ 'basic-menu--inline': inline }">
    <span ref="trigger" class="basic-menu__trigger" @click.capture="onTriggerClick" @keydown="onTriggerKeydown">
      <slot name="trigger" :open="isOpen" />
    </span>
    <div
      v-show="isOpen"
      :id="menuId"
      ref="popover"
      class="basic-menu__popover flex-column"
      :class="{ 'basic-menu__popover--panel': isPanel }"
      :role="isPanel ? 'dialog' : 'menu'"
      :aria-label="label || undefined"
      tabindex="-1"
      :style="inline ? undefined : style"
      @keydown="onPopoverKeydown"
    >
      <slot v-if="isPanel" name="panel" :close="close" />
      <template v-for="item in items" v-else :key="item.key">
        <div v-if="item.separator" role="separator" class="basic-menu__separator" />
        <component
          :is="isLink(item) ? 'router-link' : 'button'"
          v-else
          :to="isLink(item) ? item.to : undefined"
          :type="isLink(item) ? undefined : 'button'"
          role="menuitem"
          tabindex="-1"
          class="basic-menu__item flex ai-ct gap-2 pointer"
          :class="{ 'basic-menu__item--danger': item.danger }"
          :disabled="isLink(item) ? undefined : item.disabled"
          :aria-disabled="item.disabled ? 'true' : undefined"
          :data-testid="item.testid"
          @click="choose(item, $event)"
        >
          <FontAwesomeIcon v-if="item.icon" :icon="ICONS[item.icon]" class="basic-menu__icon" aria-hidden="true" />
          <span>{{ item.label }}</span>
        </component>
      </template>
    </div>
  </span>
</template>

<script>
let nextId = 0;
</script>

<script setup>
// Anchored popover (docs/ui-rules.md C4): an action list or a free panel next to a trigger. The `trigger` slot holds
// the control (a BasicButton or IconButton); the menu sets its `aria-haspopup`, `aria-expanded` and `aria-controls`
// and toggles on its click. `items` = [{ key, label, icon?, danger?, separator?, disabled?, to?, testid? }] →
// `role="menu"`: arrows, Home / End move between items, Enter / Space choose (emits `select` with the item), Esc and
// Tab close; Esc returns focus to the trigger; a click outside closes. The `panel` slot (scope: `close`) replaces the
// list with free content, `role="dialog"` named by `label`. `placement` is a floating-ui placement. `inline` renders
// it open in the page flow (catalogue).
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useSlots, watch } from "vue";
import { ICONS } from "@/boots/Icons/icons";
import { FOCUSABLE, focusableIn } from "@/composables/useFocusTrap";
import { useFloatingPosition } from "@/composables/useFloatingPosition";

const props = defineProps({
  items: { type: Array, default: () => [] },
  label: { type: String, default: "" },
  placement: { type: String, default: "bottom-start" },
  inline: { type: Boolean, default: false },
});
const emit = defineEmits(["select", "open", "close"]);

nextId += 1;
const menuId = `basic-menu-${nextId}`;
const slots = useSlots();
const root = ref(null);
const trigger = ref(null);
const popover = ref(null);
const expanded = ref(false);

const isOpen = computed(() => props.inline || expanded.value);
const isPanel = computed(() => Boolean(slots.panel));
const triggerControl = () => trigger.value?.querySelector(FOCUSABLE) ?? trigger.value;
const anchor = computed(() => (expanded.value ? triggerControl() : null));
const { style } = useFloatingPosition(anchor, popover, {
  placement: () => props.placement,
  active: computed(() => expanded.value && !props.inline),
});

// A disabled `to` item renders as a button: a disabled router-link would still navigate.
const isLink = (item) => Boolean(item.to) && !item.disabled;
const enabledItems = () => [...(popover.value?.querySelectorAll('[role="menuitem"]:not([aria-disabled="true"])') ?? [])];

function focusFirst() {
  const target = isPanel.value ? focusableIn(popover.value)[0] ?? popover.value : enabledItems()[0];
  target?.focus();
}

async function openMenu() {
  expanded.value = true;
  emit("open");
  await nextTick();
  focusFirst();
}

function close({ returnFocus = false } = {}) {
  if (!expanded.value) return;
  expanded.value = false;
  emit("close");
  if (returnFocus) triggerControl()?.focus();
}

function onTriggerClick() {
  if (props.inline) return;
  if (expanded.value) close();
  else openMenu();
}

function onTriggerKeydown(event) {
  if (expanded.value && event.key === "Escape") {
    event.stopPropagation();
    close({ returnFocus: true });
    return;
  }
  if (props.inline || expanded.value || !["ArrowDown", "ArrowUp"].includes(event.key)) return;
  event.preventDefault();
  openMenu();
}

function choose(item, event) {
  if (item.disabled) {
    event.preventDefault();
    return;
  }
  emit("select", item);
  close({ returnFocus: !item.to });
}

// Arrows wrap around, Home / End jump; the list keeps one item focused at a time (tabindex -1 on every item).
function moveFocus(key) {
  const items = enabledItems();
  const at = items.indexOf(document.activeElement);
  const next = { ArrowDown: at + 1, ArrowUp: at - 1, Home: 0, End: items.length - 1 }[key];
  items.at(next % items.length)?.focus();
}

function onPopoverKeydown(event) {
  if (event.key === "Escape") {
    event.stopPropagation();
    close({ returnFocus: true });
  } else if (event.key === "Tab") {
    close();
  } else if (!isPanel.value && ["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
    event.preventDefault();
    moveFocus(event.key);
  } else if (!isPanel.value && event.key === " " && event.target.matches("a")) {
    event.preventDefault();
    event.target.click();
  }
}

function onDocumentPointer(event) {
  if (expanded.value && !root.value?.contains(event.target)) close();
}

// The trigger control is slot content: its ARIA state is set on the element itself.
function syncTriggerAria() {
  const control = triggerControl();
  if (!control || control === trigger.value) return;
  control.setAttribute("aria-haspopup", isPanel.value ? "dialog" : "menu");
  control.setAttribute("aria-expanded", String(isOpen.value));
  control.setAttribute("aria-controls", menuId);
}

// An async trigger (the global boots load lazily) renders after the menu mounts: sync again when it appears.
let triggerObserver = null;
watch(isOpen, syncTriggerAria, { flush: "post" });
onMounted(() => {
  syncTriggerAria();
  triggerObserver = new MutationObserver(syncTriggerAria);
  triggerObserver.observe(trigger.value, { childList: true, subtree: true });
  document.addEventListener("pointerdown", onDocumentPointer);
});
onBeforeUnmount(() => {
  triggerObserver?.disconnect();
  document.removeEventListener("pointerdown", onDocumentPointer);
});

defineExpose({ open: openMenu, close });
</script>

<style lang="scss" scoped>
.basic-menu {
  position: relative;
  display: inline-flex;
}

.basic-menu--inline {
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-1);
}

.basic-menu__trigger {
  display: inline-flex;
}

.basic-menu__popover {
  z-index: 200;
  min-width: 12rem;
  max-width: min(22rem, calc(100vw - var(--space-4)));
  padding: var(--space-1);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  background: var(--surface-raised);
  box-shadow: var(--shadow-lg);
  outline: none;
}

.basic-menu__popover--panel {
  padding: var(--space-4);
}

.basic-menu__item {
  width: 100%;
  min-height: var(--elem-height);
  padding: 0 var(--space-3);
  border: none;
  border-radius: var(--radius-base);
  color: var(--text-body);
  background: none;
  font-size: var(--fs-300);
  text-align: left;
  text-decoration: none;
  white-space: nowrap;

  &:hover:not([aria-disabled="true"]),
  &:focus-visible {
    background: var(--surface-hover);
  }

  &[aria-disabled="true"] {
    color: var(--text-muted);
    cursor: not-allowed;
  }
}

.basic-menu__item--danger {
  color: var(--negative);
}

.basic-menu__icon {
  width: var(--space-4);
  color: var(--text-secondary);
}

.basic-menu__item--danger .basic-menu__icon {
  color: inherit;
}

.basic-menu__separator {
  height: 1px;
  margin: var(--space-1) 0;
  background: var(--border-subtle);
}
</style>
