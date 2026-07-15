export const out = {
  mounted(el, binding) {
    const handler = (e) => {
      if (!el.contains(e.target) && el !== e.target) {
        if (typeof binding.value === "function") {
          binding.value();
        } else if (typeof binding.value === "string" && binding.instance) {
          binding.instance[binding.value] = false;
        }
      }
    };
    el._outHandler = handler;
    document.addEventListener("click", handler);
  },

  unmounted(el) {
    document.removeEventListener("click", el._outHandler);
    el._outHandler = null;
  },
};
