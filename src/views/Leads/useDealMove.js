import { ref } from "vue";
import { t } from "@/i18n";
import { POST_DealTransition } from "@/api/leads/api";
import { extractApiMessage } from "@/composables/useFormErrors";
import { useNotifyStore } from "@/stores/notify";

// One way to move a deal for the list, the board and the deal card: a lost stage asks the reason first (the
// lost-reason dialog reads `lost`), any other stage moves at once. `moved(data, deal)` takes the answer;
// `refused(deal, stageKey)` puts back what the screen already moved (a drag), after a refusal or a cancelled reason.
export function useDealMove(stages, { moved, refused = () => {} }) {
  const notify = useNotifyStore();
  const lost = ref(null); // { deal, stageKey } while the reason dialog is open

  async function send(deal, stageKey, reason = "") {
    try {
      const { data } = await POST_DealTransition(deal.id, stageKey, reason);
      moved(data, deal);
      return true;
    } catch (err) {
      refused(deal, stageKey);
      notify.spawnNotification({ msg: extractApiMessage(err, t("leads.deals.move_failed")), type: "negative" });
      return false;
    }
  }

  function move(deal, stageKey) {
    if (stageKey === deal.stage.key) return Promise.resolve(false);
    const stage = stages.value.find((row) => row.key === stageKey);
    if (stage?.kind !== "lost") return send(deal, stageKey);
    lost.value = { deal, stageKey };
    return Promise.resolve(false);
  }

  function submitLost({ stageKey, reason }) {
    const { deal } = lost.value;
    lost.value = null;
    return send(deal, stageKey, reason);
  }

  function cancelLost() {
    const { deal, stageKey } = lost.value;
    lost.value = null;
    refused(deal, stageKey);
  }

  return { lost, move, submitLost, cancelLost };
}
