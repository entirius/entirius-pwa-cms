import { ref } from "vue";

// Horizontal swipe on pointer events: past `threshold` px → onRight / onLeft. A mostly vertical
// move is a scroll and cancels the gesture. Every swipe has a visible button in the caller.
export const SWIPE_THRESHOLD = 80;
const SCROLL_SLOP = 10;

export function useSwipe({ onLeft, onRight, threshold = SWIPE_THRESHOLD }) {
  const offset = ref(0);
  let start = null;

  function onPointerDown(event) {
    start = { x: event.clientX, y: event.clientY };
  }

  function onPointerMove(event) {
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dy) > SCROLL_SLOP && Math.abs(dy) > Math.abs(dx)) return cancel();
    offset.value = dx;
  }

  function onPointerUp() {
    if (!start) return;
    const dx = offset.value;
    cancel();
    if (dx >= threshold) onRight();
    else if (dx <= -threshold) onLeft();
  }

  function cancel() {
    start = null;
    offset.value = 0;
  }

  const handlers = { pointerdown: onPointerDown, pointermove: onPointerMove, pointerup: onPointerUp, pointercancel: cancel };
  return { offset, handlers };
}
