import { defineStore } from "pinia";
import { ref } from "vue";

// Review queue change signal: Review bumps it after an action (or a conflict), the Inbox reloads on it.
export const useLeadsReviewStore = defineStore("leadsReview", () => {
  const changes = ref(0);

  function queueChanged() {
    changes.value += 1;
  }

  return { changes, queueChanged };
});
