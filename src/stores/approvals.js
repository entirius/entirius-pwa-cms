import { defineStore } from "pinia";
import { ref } from "vue";
import { GET_Approvals } from "@/api/communicator/api";

// How many drafts wait for approval across every channel (Q11): the number on the "Approvals" nav entry. App.vue
// starts it while the communicator module is on and the user can read the review area; the approvals page refreshes it
// after a bulk action so the badge never lags behind the list.
const POLL_MS = 30000;

export const useApprovalsStore = defineStore("approvals", () => {
  const total = ref(0);
  let timer = null;
  // Bumped by stop(): an answer that lands after logout is dropped.
  let session = 0;

  async function refresh() {
    const mine = session;
    try {
      const { data } = await GET_Approvals({ page_size: 1 });
      if (mine === session) total.value = data.counts?.total ?? data.count ?? 0;
    } catch (err) {
      console.warn("Approvals count unavailable:", err.message || err);
    }
  }

  function start() {
    if (timer) return;
    refresh();
    timer = setInterval(refresh, POLL_MS);
  }

  function stop() {
    session += 1;
    clearInterval(timer);
    timer = null;
    total.value = 0;
  }

  return { total, refresh, start, stop };
});
