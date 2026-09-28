// The Pim side of the shared TranslateDialog: the translator calls per scope. Product translates the picked
// products, store every entity type the dialog left on (one estimate and one job batch per type).
import { POST_TranslateEstimate, POST_TranslateExecute } from "@/api/pim/translator";

const jobCount = ({ data }) => data.job_ids?.length || 0;

export function productTranslateFns(channelIdx, entityIds) {
  const payload = (request) => ({ ...request, entity_ids: entityIds });
  return {
    estimateFn: async (request) => (await POST_TranslateEstimate(channelIdx, "product", payload(request))).data,
    submitFn: async (request) => jobCount(await POST_TranslateExecute(channelIdx, "product", payload(request))),
  };
}

async function estimateStore(channelIdx, { entity_types: types, ...payload }) {
  const answers = await Promise.all(types.map((type) => POST_TranslateEstimate(channelIdx, type, payload)));
  return answers.map(({ data }) => data);
}

// Types without items to translate get no jobs; the batches go one after another, like the estimate order.
async function submitStore(channelIdx, { entity_types: _types, ...payload }, estimates) {
  let total = 0;
  for (const estimate of estimates.filter((entry) => entry.estimated_items)) {
    total += jobCount(await POST_TranslateExecute(channelIdx, estimate.entity_type, payload));
  }
  return total;
}

export function storeTranslateFns(channelIdx) {
  return {
    estimateFn: (request) => estimateStore(channelIdx, request),
    submitFn: (request, estimates) => submitStore(channelIdx, request, estimates),
  };
}
