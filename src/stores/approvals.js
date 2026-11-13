import { defineStore } from "pinia";
import { ref } from "vue";
import { GET_Approvals } from "@/api/communicator/api";

// How many drafts wait for approval across every channel: the number on the "Approvals" nav entry. The Leads panel
// starts it while communicator >= 0.5.0 is on and the user reads the review area; the Approvals page refreshes it
// after a bulk action, so the badge never lags behind the list.
const POLL_MS = 30000;

export const useApprovalsStore = defineStore("approvals", () => {
  const total = ref(0);
  let timer = null;
  let session = 0; // bumped by stop(): an answer that lands after it is dropped

  async function refresh() {
    const mine = session;
    try {
      const { data } = await GET_Approvals({ page_size: 1 });
      if (mine === session) total.value = data.counts?.total ?? data.count ?? 0;
    } catch (err) {
      console.warn("Approvals count unavailable:", err?.message || err);
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
