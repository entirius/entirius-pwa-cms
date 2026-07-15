import { api } from "@/api/contentDB/client";

const TRANSLATOR = "/api/contentdb-translator/v2/admin";

export const POST_ContentTranslateEstimate = (channelIdx, data) =>
  api.post(`${TRANSLATOR}/${channelIdx}/bulk/translate/`, {
    ...data,
    dry_run: true,
  });

export const POST_ContentTranslateExecute = (channelIdx, data) =>
  api.post(`${TRANSLATOR}/${channelIdx}/bulk/translate/`, {
    ...data,
    dry_run: false,
  });

export const GET_ContentTranslationJobs = (channelIdx, params) =>
  api.get(`${TRANSLATOR}/${channelIdx}/bulk/jobs/`, { params });
