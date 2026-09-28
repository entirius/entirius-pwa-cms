<template>
  <span
    ref="root"
    class="basic-tooltip"
    :class="{ 'basic-tooltip--help': variant === 'help', 'basic-tooltip--own-stop': ownTabStop }"
    :tabindex="ownTabStop ? 0 : undefined"
    :aria-describedby="ownTabStop ? tipId : undefined"
    @mouseenter="hovered = true"
    @mouseleave="onLeave"
    @focusin="onFocusIn"
    @focusout="onLeave"
    @keydown.esc="onEscape"
  >
    <button
      v-if="variant === 'help'"
      type="button"
      class="basic-tooltip__help inline-flex jc-ct ai-ct pointer"
      :aria-label="$t('common.help')"
      :aria-describedby="tipId"
    >
      <FontAwesomeIcon :icon="ICONS.help" aria-hidden="true" />
    </button>
    <slot v-else />
    <span v-show="shown" :id="tipId" ref="bubble" role="tooltip" class="basic-tooltip__bubble fs-200" :style="style">
      {{ text }}
    </span>
  </span>
</template>

<script>
let nextId = 0;
</script>

<script setup>
// The one tooltip (docs/ui-rules.md C4): a hint on hover and on keyboard focus, hidden again on Esc, blur and leave.
// The default slot is the trigger, and its first focusable element gets `aria-describedby`; a trigger that only holds
// a disabled control (the disabled-with-reason pattern) becomes the tab stop itself. `variant="help"` renders a `?`
// button named „Pomoc” instead of the slot. `placement` top · bottom · left · right (it flips when there is no
// room); `open` forces it shown (catalogue). Replaces ToolTip, HelpTooltip and HoverMe (plan 19 deletes them).
import { computed, onBeforeUnmount, onMounted, onUpdated, ref } from "vue";
import { ICONS } from "@/boots/Icons/icons";
import { FOCUSABLE } from "@/composables/useFocusTrap";
import { useFloatingPosition } from "@/composables/useFloatingPosition";

const props = defineProps({
  text: { type: String, required: true },
  placement: {
    type: String,
    default: "top",
    validator: (value) => ["top", "bottom", "left", "right"].includes(value),
  },
  variant: { type: String, default: "default", validator: (value) => ["default", "help"].includes(value) },
  open: { type: Boolean, default: false },
});

nextId += 1;
const tipId = `basic-tooltip-${nextId}`;
const root = ref(null);
const bubble = ref(null);
const hovered = ref(false);
const focused = ref(false);
const dismissed = ref(false);
const described = ref(null);
const ownTabStop = ref(false);

const shown = computed(() => props.open || ((hovered.value || focused.value) && !dismissed.value));
const anchor = computed(() => described.value ?? root.value);
const { style } = useFloatingPosition(anchor, bubble, { placement: () => props.placement, active: shown, gap: 6 });

// Mouse focus (a click) shows nothing: the pointer already hovers.
function isKeyboardFocus(target) {
  try {
    return target.matches(":focus-visible");
  } catch {
    return true;
  }
}

function onFocusIn(event) {
  focused.value = isKeyboardFocus(event.target);
}

// Esc hides a shown tip and stops there (a dialog around it stays open); with no tip it goes on to the dialog.
function onEscape(event) {
  if (!shown.value || props.open) return;
  event.stopPropagation();
  dismissed.value = true;
}

function onLeave(event) {
  if (event.type === "mouseleave") hovered.value = false;
  else if (!root.value?.contains(event.relatedTarget)) focused.value = false;
  if (!hovered.value && !focused.value) dismissed.value = false;
}

// Appended to the target's own descriptions; a tip that repeats the target's name (an IconButton's label) is not
// announced twice. Re-run on every update: a changed text or label adds or removes the id.
function setDescribed(target, on) {
  const ids = (target.getAttribute("aria-describedby") ?? "").split(/\s+/).filter((id) => id && id !== tipId);
  if (on) ids.push(tipId);
  if (ids.length) target.setAttribute("aria-describedby", ids.join(" "));
  else target.removeAttribute("aria-describedby");
}

// The slot's first focusable element carries the description; with a disabled control only, the wrapper does
// (unless a parent laid the wrapper out as `display: contents`, IconButton: a box-less element is no tab stop).
function describeTrigger() {
  if (props.variant === "help" || !root.value) return;
  const target = root.value.querySelector(FOCUSABLE);
  if (described.value && described.value !== target) setDescribed(described.value, false);
  if (target) setDescribed(target, target.getAttribute("aria-label") !== props.text);
  described.value = target;
  const onlyDisabled = !target && Boolean(root.value.querySelector(":disabled, [aria-disabled='true']"));
  ownTabStop.value = onlyDisabled && getComputedStyle(root.value).display !== "contents";
}

onMounted(describeTrigger);
onUpdated(describeTrigger);
onBeforeUnmount(() => described.value && setDescribed(described.value, false));
</script>

<style lang="scss" scoped>
@import "@/assets/scss/utils/touch-target";

.basic-tooltip {
  display: inline-flex;
}

// Disabled with a reason: the disabled control swallows the pointer, so the wrapper takes the hover instead.
.basic-tooltip--own-stop :deep(:disabled) {
  pointer-events: none;
}

.basic-tooltip__help {
  width: var(--space-4);
  height: var(--space-4);
  padding: 0;
  border: none;
  border-radius: var(--radius-full);
  color: var(--text-muted);
  background: none;
  font-size: var(--fs-300);

  &:hover {
    color: var(--text-body);
  }

  @include touch-target(var(--space-6), var(--space-8));
}

.basic-tooltip__bubble {
  z-index: 300;
  width: max-content;
  max-width: 16rem;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-base);
  color: var(--text-inverse);
  background: var(--surface-inverse);
  box-shadow: var(--shadow-md);
  font-weight: 400;
  line-height: 1.4;
  letter-spacing: normal;
  text-transform: none;
  white-space: normal;
  pointer-events: none;
}
</style>
