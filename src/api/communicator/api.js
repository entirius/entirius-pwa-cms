import { communicatorApi } from "./client";
import { useLeadsChannelStore } from "@/stores/leadsChannel";

// django-communicator admin API v2 — review queue, threads, replies (plan 13).
const base = () =>
  `/api/communicator/v2/admin/${useLeadsChannelStore().activeChannelIdx}`;

export const GET_ReviewNext = () => communicatorApi.get(`${base()}/review/next/`);

// params: { status, page, page_size }
export const GET_ReviewList = (params) =>
  communicatorApi.get(`${base()}/review/`, { params });

export const GET_ReviewMessage = async (id) => {
  const { data } = await GET_ReviewList({ status: "review_required", page_size: 100 });
  return data.results.find((m) => m.id === Number(id)) || null;
};

export const POST_ReviewAccept = (id) =>
  communicatorApi.post(`${base()}/review/${id}/accept/`, {});

export const POST_ReviewRewrite = (id, { notes }) =>
  communicatorApi.post(`${base()}/review/${id}/rewrite/`, { notes });

export const POST_ReviewEdit = (id, { subject, body_text }) =>
  communicatorApi.post(`${base()}/review/${id}/edit/`, { subject, body_text });

export const POST_ReviewSkip = (id, { reject_reason = "" } = {}) =>
  communicatorApi.post(`${base()}/review/${id}/skip/`, { reason: reject_reason });

export const POST_ReviewSkipCompany = (id) =>
  communicatorApi.post(`${base()}/review/${id}/skip-company/`, {});

export const GET_Threads = ({ subject_ref }) =>
  communicatorApi.get(`${base()}/threads/`, { params: { subject_ref } });

export const GET_Thread = (id) => communicatorApi.get(`${base()}/threads/${id}/`);

export const GET_Replies = (params) =>
  communicatorApi.get(`${base()}/replies/`, { params });

export const POST_ConfirmOptout = (replyId) =>
  communicatorApi.post(`${base()}/replies/${replyId}/confirm-optout/`, {});
