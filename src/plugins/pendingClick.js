// v-pending-click: disables the element while an async click handler runs
// Usage: <button v-pending-click="onSubmit">Save</button>
export default {
  beforeMount(el, binding) {
    el.__pending = false;
    const minLockMs = Number(el.getAttribute('data-min-lock')) || 1000;
    el.__pendingClickHandler = async (evt) => {
      if (el.__pending) return;
      const fn = binding.value;
      if (typeof fn !== 'function') return;
      el.__pending = true;
      const wasDisabled = !!el.disabled;
      // visually and functionally disable
      el.disabled = true;
      el.classList.add('opacity-70', 'cursor-not-allowed');
      try {
        const start = Date.now();
        const result = fn(evt);
        if (result && typeof result.then === 'function') await result;
        const elapsed = Date.now() - start;
        if (elapsed < minLockMs) await new Promise(r => setTimeout(r, minLockMs - elapsed));
      } finally {
        el.__pending = false;
        // restore only if we changed it
        if (!wasDisabled) el.disabled = false;
        el.classList.remove('opacity-70', 'cursor-not-allowed');
      }
    };
    el.addEventListener('click', el.__pendingClickHandler);
  },
  updated(el, binding) {
    // support dynamic handler replacement
    el.__pendingClickBinding = binding.value;
  },
  beforeUnmount(el) {
    el.removeEventListener('click', el.__pendingClickHandler);
    delete el.__pendingClickHandler;
    delete el.__pending;
  },
};
