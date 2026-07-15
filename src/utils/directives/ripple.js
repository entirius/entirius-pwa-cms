export const ripple_effect = {
  mounted: (el, binding, vNode) => {
    const handler = function (e) {
      const { width, height, left, top } = el.getBoundingClientRect();
      const circle = document.createElement("span");
      const diameter = Math.max(width, height);
      const radius = diameter / 2;
      circle.style.width = circle.style.height = `${diameter}px`;
      circle.style.left = `${e.clientX - left - radius}px`;
      circle.style.top = `${e.clientY - top - radius}px`;
      circle.classList.add("ripple-effect-class");

      circle.classList.add("ripple-effect-class");
      const ripple = el.getElementsByClassName("ripple-effect-class")[0];
      if (ripple) {
        ripple.remove();
      }
      el.appendChild(circle);
    };

    el.ripple_effect = handler;
    el.addEventListener("click", handler);
  },
  unmounted: (el, binding, vNode) => {
    el.removeEventListener("click", el.ripple_effect);
    el.ripple_effect = null;
  },
};
