import { describe, it, expect, vi } from "vitest";
import { useSwipe } from "@/composables/useSwipe";

function drag(handlers, dx, dy = 0) {
  handlers.pointerdown({ clientX: 100, clientY: 100 });
  handlers.pointermove({ clientX: 100 + dx, clientY: 100 + dy });
  handlers.pointerup({});
}

describe("useSwipe", () => {
  const setup = () => {
    const onLeft = vi.fn();
    const onRight = vi.fn();
    return { onLeft, onRight, ...useSwipe({ onLeft, onRight }) };
  };

  it("fires right past 80 px and left past -80 px", () => {
    const s = setup();
    drag(s.handlers, 81);
    drag(s.handlers, -90);
    expect(s.onRight).toHaveBeenCalledOnce();
    expect(s.onLeft).toHaveBeenCalledOnce();
  });

  it("ignores a short drag", () => {
    const s = setup();
    drag(s.handlers, 79);
    expect(s.onRight).not.toHaveBeenCalled();
    expect(s.offset.value).toBe(0);
  });

  it("a vertical scroll cancels the gesture", () => {
    const s = setup();
    s.handlers.pointerdown({ clientX: 0, clientY: 0 });
    s.handlers.pointermove({ clientX: 30, clientY: 120 });
    s.handlers.pointermove({ clientX: 120, clientY: 120 });
    s.handlers.pointerup({});
    expect(s.onRight).not.toHaveBeenCalled();
  });
});
