import { GET_ReplyClassPlans } from "@/api/communicator/api";
import { useLeadsChannelStore } from "@/stores/leadsChannel";

// The reply plans of the channel (what happens to the sequence per type), loaded once per channel. A refusal (no read
// on communicator.settings) or an older backend leaves "Next" out.
const plansByChannel = new Map();

export function loadReplyPlans() {
  const channel = useLeadsChannelStore().activeChannelIdx;
  if (!plansByChannel.has(channel)) {
    const plans = GET_ReplyClassPlans()
      .then(({ data }) => Object.fromEntries((data.results || []).map((plan) => [plan.intent, plan])))
      .catch(() => ({}));
    plansByChannel.set(channel, plans);
  }
  return plansByChannel.get(channel);
}

export const resetReplyPlans = () => plansByChannel.clear();
