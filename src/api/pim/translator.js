import { pimApi } from "@/api/pim/client";

const TRANSLATOR = "/api/pim-translator/v2/admin";
const PIM = "/api/pim/v2/admin";

export const GET_SystemLanguages = (params) =>
  pimApi.get(`${PIM}/languages/`, { params });

export const POST_AddLanguageToChannel = (channelIdx, iso2) =>
  pimApi.post(`${PIM}/channels/${channelIdx}/languages/`, { iso2 });

export const POST_TranslateEstimate = (channelIdx, entityType, data) =>
  pimApi.post(`${TRANSLATOR}/${channelIdx}/bulk/translate/`, {
    ...data,
    entity_type: entityType,
    dry_run: true,
  });

export const POST_TranslateExecute = (channelIdx, entityType, data) =>
  pimApi.post(`${TRANSLATOR}/${channelIdx}/bulk/translate/`, {
    ...data,
    entity_type: entityType,
    dry_run: false,
  });

export const GET_TranslationJobs = (channelIdx, params) =>
  pimApi.get(`${TRANSLATOR}/${channelIdx}/bulk/jobs/`, { params });
