import { communicatorApi } from "./client";
import { useLeadsChannelStore } from "@/stores/leadsChannel";

// django-communicator admin API v2 — review queue, threads, replies (plan 13).
const base = () =>
  `/api/communicator/v2/admin/${useLeadsChannelStore().activeChannelIdx}`;

export const GET_ReviewNext = () => communicatorApi.get(`${base()}/review/next/`);

// params: { status, page, page_size }
export const GET_ReviewList = (params) =>
  communicatorApi.get(`${base()}/review/`, { params });

// A draft of the review queue by id, in whatever status it is now (one request); null when it is not on this channel (404).
export const GET_ReviewMessage = async (id) => {
  try {
    const { data } = await communicatorApi.get(`${base()}/review/${id}/`);
    return data;
  } catch (err) {
    if ((err?.httpStatus ?? err?.response?.status) === 404) return null;
    throw err;
  }
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

// params: { subject_ref, page, page_size } — newest first
export const GET_Threads = (params) => communicatorApi.get(`${base()}/threads/`, { params });

// The Inbox: one row per conversation (subject_ref) = its newest thread, state from any of its threads.
// params: { state, page, page_size } — latest activity first; `counts` per state come with every page
export const GET_Conversations = (params) => communicatorApi.get(`${base()}/conversations/`, { params });

export const GET_Thread = (id) => communicatorApi.get(`${base()}/threads/${id}/`);

// One thread with its timeline and its suspected opt-out replies (confirmed or not).
export const GET_ThreadWithOptouts = async (id) => {
  const [detail, replies] = await Promise.all([GET_Thread(id), GET_Replies({ thread: id, kind: "suspected_optout" })]);
  return { ...detail.data, optouts: replies.data.results || [] };
};

// Approved and scheduled messages — the mails waiting for the send beat. The outbox endpoint is the one source
// of the slot: it adds `next_slot`, the earliest moment the send policy allows, so no two screens disagree.
export const GET_WaitingMessages = async () => {
  const lists = await Promise.all(["approved", "scheduled"].map((status) => GET_Messages({ status, page_size: 100 })));
  return lists.flatMap(({ data }) => data.results || []);
};

export const GET_Replies = (params) =>
  communicatorApi.get(`${base()}/replies/`, { params });

export const POST_ConfirmOptout = (replyId) =>
  communicatorApi.post(`${base()}/replies/${replyId}/confirm-optout/`, {});

// Plan 14 — templates, sequences, send settings.
export const GET_Templates = () => communicatorApi.get(`${base()}/templates/`);

export const GET_Template = (id) => communicatorApi.get(`${base()}/templates/${id}/`);

export const PUT_Template = (id, body) => communicatorApi.put(`${base()}/templates/${id}/`, body);

export const GET_TemplateVersions = (id) => communicatorApi.get(`${base()}/templates/${id}/versions/`);

export const POST_TestGenerate = (id, context) =>
  communicatorApi.post(`${base()}/templates/${id}/test-generate/`, { context });

export const GET_Models = () => communicatorApi.get(`${base()}/models/`);

export const GET_Sequences = () => communicatorApi.get(`${base()}/sequences/`);

export const POST_Sequence = (body) => communicatorApi.post(`${base()}/sequences/`, body);

export const GET_SequenceTexts = (id) => communicatorApi.get(`${base()}/sequences/${id}/texts/`);

export const POST_SequenceText = (id, body) => communicatorApi.post(`${base()}/sequences/${id}/texts/`, body);

// UX-005: a text edits in place (future follow-ups only); DELETE of a used text deactivates it (200) instead of 204.
export const PATCH_SequenceText = (id, textId, body) =>
  communicatorApi.patch(`${base()}/sequences/${id}/texts/${textId}/`, body);

export const DELETE_SequenceText = (id, textId) => communicatorApi.delete(`${base()}/sequences/${id}/texts/${textId}/`);

export const GET_Policy = () => communicatorApi.get(`${base()}/policy/`);

export const PUT_Policy = (body) => communicatorApi.put(`${base()}/policy/`, body);

export const GET_Channel = () => communicatorApi.get(`${base()}/channel/`);

// Never sends live_enabled: that flag is Grappelli-only.
export const PATCH_Channel = ({ mode, sandbox_mailbox }) =>
  communicatorApi.patch(`${base()}/channel/`, { mode, sandbox_mailbox });

// params (communicator >= 0.5.0): { scope, source, search, page }
export const GET_Suppressions = (params) => communicatorApi.get(`${base()}/suppressions/`, { params });

export const POST_Suppression = (body) => communicatorApi.post(`${base()}/suppressions/`, body);

export const DELETE_Suppression = (id) => communicatorApi.delete(`${base()}/suppressions/${id}/`);

// params: { status, page }
export const GET_Messages = (params) => communicatorApi.get(`${base()}/messages/`, { params });

// C-31: moves scheduled_at to the channel clock only; the next beat run sends.
export const POST_SendNow = (id) => communicatorApi.post(`${base()}/messages/${id}/send-now/`, {});

// UX-007 — the mail footer per language: HTML around `{{ legal }}` (the agreements text), sanitised on save.
export const GET_Footers = () => communicatorApi.get(`${base()}/footers/`);

export const PUT_Footer = (language, html) => communicatorApi.put(`${base()}/footers/${language}/`, { html });

export const DELETE_Footer = (language) => communicatorApi.delete(`${base()}/footers/${language}/`);

// Leads CRM plan 14 (communicator >= 0.5.0) — the approval inbox crosses channels: no channel in its path.
const APPROVALS = "/api/communicator/v2/admin/approvals";

// params: { channel, template_key, mailbox, search, min_age_hours, page, page_size } — oldest first, with `counts`
export const GET_Approvals = (params) => communicatorApi.get(`${APPROVALS}/`, { params });

// At most 100 ids per call; answers { done, failed: { id: why } }.
export const POST_ApprovalsBulk = ({ action, ids, reason = "" }) =>
  communicatorApi.post(`${APPROVALS}/bulk/`, { action, ids, reason });

export const GET_ApprovalsLog = (params) => communicatorApi.get(`${APPROVALS}/log/`, { params });

// Mailboxes: passwords are write-only (`*_password_set` comes back, never the value).
export const GET_Mailboxes = () => communicatorApi.get(`${base()}/mailboxes/`);

export const GET_Mailbox = (id) => communicatorApi.get(`${base()}/mailboxes/${id}/`);

export const POST_Mailbox = (body) => communicatorApi.post(`${base()}/mailboxes/`, body);

export const PATCH_Mailbox = (id, body) => communicatorApi.patch(`${base()}/mailboxes/${id}/`, body);

export const DELETE_Mailbox = (id) => communicatorApi.delete(`${base()}/mailboxes/${id}/`);

// Logs in to SMTP and IMAP: { smtp, imap } codes.
export const POST_MailboxTest = (id) => communicatorApi.post(`${base()}/mailboxes/${id}/test/`, {});

export const POST_MailboxPause = (id, reason) => communicatorApi.post(`${base()}/mailboxes/${id}/pause/`, { reason });

export const POST_MailboxResume = (id, reason) => communicatorApi.post(`${base()}/mailboxes/${id}/resume/`, { reason });

// Sending health: the channel and every mailbox over 24 h and 7 d, the automatic-pause policy, the pause log.
export const GET_Health = () => communicatorApi.get(`${base()}/health/`);

export const GET_HealthPolicy = () => communicatorApi.get(`${base()}/health/policy/`);

export const PUT_HealthPolicy = (body) => communicatorApi.put(`${base()}/health/policy/`, body);

export const GET_HealthLog = (params) => communicatorApi.get(`${base()}/health/log/`, { params });

// Reply classes: the AI profile of the channel and the plan per class (sequence, alert, needs review).
export const GET_ReplyClassProfile = () => communicatorApi.get(`${base()}/reply-classes/profile/`);

export const PUT_ReplyClassProfile = (body) => communicatorApi.put(`${base()}/reply-classes/profile/`, body);

export const GET_ReplyClassPlans = () => communicatorApi.get(`${base()}/reply-classes/plans/`);

export const PUT_ReplyClassPlan = (intent, body) =>
  communicatorApi.put(`${base()}/reply-classes/plans/${intent}/`, body);

export const DELETE_ReplyClassPlan = (intent) => communicatorApi.delete(`${base()}/reply-classes/plans/${intent}/`);

// Why an address gets no mail: the matching do-not-contact rows and the address status.
export const GET_AddressStatus = (email) => communicatorApi.get(`${base()}/addresses/status/`, { params: { email } });

// { is_active } or { autostart }; 409 on a second autostart sequence.
export const PATCH_Sequence = (id, body) => communicatorApi.patch(`${base()}/sequences/${id}/`, body);
