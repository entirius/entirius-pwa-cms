import { pimApi } from "@/api/pim/client";
import { api as contentDBApi } from "@/api/contentDB/client";

const PIM_TRANSLATOR = "/api/pim-translator/v2/admin";
const CONTENTDB_TRANSLATOR = "/api/contentdb-translator/v2/admin";

export const GET_PimTranslationJobs = (channelIdx, params) =>
  pimApi.get(`${PIM_TRANSLATOR}/${channelIdx}/bulk/jobs/`, { params });

export const GET_PimTranslationJobDetail = (channelIdx, jobId) =>
  pimApi.get(`${PIM_TRANSLATOR}/${channelIdx}/bulk/jobs/${jobId}/`);

export const GET_ContentTranslationJobs = (channelIdx, params) =>
  contentDBApi.get(`${CONTENTDB_TRANSLATOR}/${channelIdx}/bulk/jobs/`, { params });

export const GET_ContentTranslationJobDetail = (channelIdx, jobId) =>
  contentDBApi.get(`${CONTENTDB_TRANSLATOR}/${channelIdx}/bulk/jobs/${jobId}/`);
