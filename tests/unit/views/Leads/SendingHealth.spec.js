import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushPromises } from "@vue/test-utils";

const api = vi.hoisted(() => ({
  GET_Health: vi.fn(),
  GET_HealthPolicy: vi.fn(),
  PUT_HealthPolicy: vi.fn(),
  GET_HealthLog: vi.fn(),
  POST_MailboxPause: vi.fn(),
  POST_MailboxResume: vi.fn(),
}));
vi.mock("@/api/communicator/api", () => api);

import SendingHealth from "@/views/Leads/SendingHealth.vue";
import { byTestid, mountOutbound } from "./outboundFrame";

const metrics = (sent, bounces) => ({ sent, hard_bounces_pct: bounces, optouts_pct: 0.5, complaints_pct: 0 });
const windows = (sent, bounces) => ({ "24h": metrics(sent, bounces), "7d": metrics(sent, bounces) });
const report = {
  channel: { windows: windows(412, 0.7) },
  mailboxes: [
    { id: 2, address: "anna@firma.test", state: "paused", paused_at: "2026-11-12T08:00:00Z", pause_reason: "bounces", sent_today: 0, cap_today: 40, windows: windows(120, 3.1) },
    { id: 3, address: "new@firma.test", state: "active", paused_at: null, pause_reason: "", sent_today: 1, cap_today: 20, windows: windows(10, 10) },
  ],
};
const policy = { enabled: true, window_hours: 168, min_sample: 50, max_bounce_pct: 2, max_optout_pct: 3, max_complaint_pct: 0.1 };
const mounted = async (options) => {
  const wrapper = mountOutbound(SendingHealth, options);
  await flushPromises();
  return wrapper;
};

// Plan 14: Settings → Sending health — rates per mailbox, the automatic-pause policy, the pause log.
describe("Leads → Settings → Sending health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.GET_Health.mockResolvedValue({ data: report });
    api.GET_HealthPolicy.mockResolvedValue({ data: policy });
    api.GET_HealthLog.mockResolvedValue({ data: { next: "p2", results: [{ id: 1, mailbox_id: 2, action: "pause", trigger: "bounce", reason: "3.1 %", user_id: null, created_at: "2026-11-12T08:00:00Z" }] } });
  });

  // Acceptance CM8: a rate over its limit is flagged, also below the minimum sample (muted, with the sample note).
  it("a rate over its limit says so, also below the minimum sample; the channel too", async () => {
    const wrapper = await mounted();
    expect(byTestid(wrapper, "loader").exists()).toBe(false);
    expect(wrapper.findAll('[data-testid="health-row"]')).toHaveLength(2);
    expect(wrapper.findAll('[data-testid="health-over"]')).toHaveLength(2);
    // N22: the figure is the badge, the words are its tooltip — one item per cell
    const badge = wrapper.findComponent('[data-testid="health-over"]');
    expect(badge.props("label")).toMatch(/ %$/);
    expect(badge.attributes("title")).toBe("leads.health.over");
    expect(byTestid(wrapper, "health-channel-over").exists()).toBe(false);
    expect(byTestid(wrapper, "health-resume").exists()).toBe(true);
    wrapper.findComponent('[data-testid="health-max-bounce"]').vm.$emit("update:modelValue", "");
    await flushPromises();
    expect(wrapper.findAll('[data-testid="health-over"]')).toHaveLength(2);
    api.GET_Health.mockResolvedValueOnce({ data: { ...report, channel: { windows: windows(4, 25) } } });
    expect((await mounted()).findAll('[data-testid="health-channel-over"]')).toHaveLength(1);
  });

  // Acceptance C2: the log names the person, "Automatic" for an automatic pause, "—" from a backend without names.
  it("the pause log says who, never an id", async () => {
    const entry = { mailbox_id: 2, action: "pause", trigger: "manual", reason: "list", created_at: "2026-11-12T08:00:00Z" };
    api.GET_HealthLog.mockResolvedValue({
      data: { next: null, results: [{ ...entry, id: 1, user_id: 9103, user_name: "Anna Kowalska" }, { ...entry, id: 2, user_id: null, user_name: "" }, { ...entry, id: 3, user_id: 9103 }] },
    });
    const rows = (await mounted()).findAll('[data-testid="health-log-row"]').map((row) => row.text());
    expect(rows[0]).toContain("Anna Kowalska");
    expect(rows[1]).toContain("Automatic");
    expect(rows[2]).toContain("—");
    expect(rows.join(" ")).not.toContain("9103");
  });

  it("saves the policy and loads more of the log", async () => {
    api.PUT_HealthPolicy.mockResolvedValue({ data: { ...policy, min_sample: 80 } });
    const wrapper = await mounted();
    wrapper.findComponent('[data-testid="health-min-sample"]').vm.$emit("update:modelValue", 80);
    await flushPromises();
    await byTestid(wrapper, "health-save").trigger("click");
    await flushPromises();
    expect(api.PUT_HealthPolicy).toHaveBeenCalledWith({ enabled: true, window_hours: 168, min_sample: 80, max_bounce_pct: 2, max_optout_pct: 3, max_complaint_pct: 0.1 });
    await byTestid(wrapper, "health-log-more").trigger("click");
    await flushPromises();
    expect(api.GET_HealthLog).toHaveBeenLastCalledWith({ page: 2 });
    expect(wrapper.findAll('[data-testid="health-log-row"]')).toHaveLength(2);
  });

  it("an empty channel, a failed load and read-only", async () => {
    api.GET_Health.mockResolvedValueOnce({ data: { channel: { windows: windows(0, null) }, mailboxes: [] } });
    expect((await mounted()).text()).toContain("leads.health.no_mailbox");
    api.GET_Health.mockRejectedValueOnce({ message: "down" });
    expect(byTestid(await mounted(), "health-error").text()).toBe("down");
    const readonly = await mounted({ write: false });
    expect(byTestid(readonly, "health-save").exists()).toBe(false);
    expect(byTestid(readonly, "health-resume").exists()).toBe(false);
  });

  // n3: the automatic pause's line from its trigger and metrics, the stored reason for a manual one
  it("the log composes an automatic pause's reason from its metrics", async () => {
    api.GET_HealthLog.mockResolvedValueOnce({
      data: {
        next: null,
        results: [
          { id: 1, mailbox_id: 1, action: "pause", trigger: "bounce", reason: "hard bounces 20.0% of 5 sent in 2160 h, limit 0.00%", metrics: { sent: 5, hard_bounces_pct: 20.0 }, user_id: null, created_at: "2026-11-14T08:00:00Z" },
          { id: 2, mailbox_id: 1, action: "resume", trigger: "manual", reason: "fixed the DNS", metrics: {}, user_id: 3, user_name: "Anna", created_at: "2026-11-14T09:00:00Z" },
        ],
      },
    });
    const rows = (await mounted()).findAll('[data-testid="health-log-row"]').map((row) => row.text());
    expect(rows[0]).toContain("20 % of 5 sent");
    expect(rows[0]).not.toContain("2160");
    expect(rows[1]).toContain("fixed the DNS");
  });
});
