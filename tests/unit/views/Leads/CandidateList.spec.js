import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { t } from "@/i18n";

const api = vi.hoisted(() => ({ GET_Candidates: vi.fn(), POST_CandidateAccept: vi.fn(), POST_CandidateReject: vi.fn() }));
vi.mock("@/api/prospecting/api", () => api);
const notify = vi.hoisted(() => ({ spawnNotification: vi.fn() }));
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => notify }));

import CandidateList from "@/views/Leads/prospecting/CandidateList.vue";
import PeopleTab from "@/views/Leads/tabs/PeopleTab.vue";

const check = (kind, result, extra = {}) => ({ kind, result, value: "", source: "", checked_at: null, attempts: 3, ...extra });
const candidate = (overrides = {}) => ({
  id: 1,
  search_id: 4,
  subject_ref: "leads.Company:7",
  company_name: "Example Shop",
  first_name: "Ewa",
  last_name: "Zielińska",
  job_title: "Head of E-commerce",
  profile_url: "",
  source: "fixed test candidates: shop.test/team",
  found_at: "2026-11-15T10:00:00Z",
  email: "ewa.zielinska@shop.test",
  email_options: [{ email: "ewa.zielinska@shop.test", verdict: "valid", source: "pattern" }],
  status: "pending",
  decided_by: "",
  decided_at: null,
  reject_reason: "",
  contact_ref: "",
  checks: [
    check("role", "ok", { value: "Head of E-commerce", source: "shop.test/team", checked_at: "2026-11-15T10:00:00Z" }),
    check("email", "ok", { source: "pattern", checked_at: "2026-11-15T10:00:00Z" }),
    check("employed", "no_info"),
    check("mailbox", "ok", { source: "stub tester", checked_at: "2026-11-15T10:00:00Z" }),
  ],
  missing: ["employed"],
  ...overrides,
});

const stubs = {
  BasicCard: { props: ["title"], template: "<section><h3>{{ title }}</h3><slot /></section>" },
  BasicButton: { props: ["disabled", "loading"], emits: ["click"], template: "<button :disabled='disabled' @click=\"$emit('click')\"><slot /></button>" },
  StatusBadge: { props: ["label", "tone"], template: "<span class='badge' :data-tone='tone'>{{ label }}</span>" },
};

async function mountList(props = {}, rows = [candidate()]) {
  api.GET_Candidates.mockResolvedValue({ data: { results: rows } });
  const wrapper = mount(CandidateList, { props, global: { mocks: { $t: t }, stubs } });
  await flushPromises();
  return wrapper;
}
const byId = (wrapper, id) => wrapper.find(`[data-testid="${id}"]`);

describe("Prospecting candidate list (U3)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows the four checks with OK and No information, the missing confirmation and the sources", async () => {
    const wrapper = await mountList();
    const checks = wrapper.findAll('[data-testid="candidate-check"]');
    expect(checks.map((row) => [row.attributes("data-check"), row.attributes("data-result")])).toEqual([
      ["role", "ok"], ["email", "ok"], ["employed", "no_info"], ["mailbox", "ok"],
    ]);
    expect(checks[2].text()).toContain(t("leads.prospecting.result.no_info"));
    expect(checks[2].text()).toContain(t("leads.prospecting.tries", { n: 3 }));
    expect(checks[0].text()).toContain("shop.test/team");
    expect(byId(wrapper, "candidate-missing").text()).toContain(t("leads.prospecting.check.employed"));
    expect(byId(wrapper, "candidate-source").text()).toContain("fixed test candidates");
    expect(byId(wrapper, "candidate-company").text()).toBe("Example Shop");
    expect(wrapper.text()).not.toMatch(/leads\.prospecting\./);
  });

  it("accepts a candidate and shows it as accepted", async () => {
    const wrapper = await mountList();
    api.POST_CandidateAccept.mockResolvedValue({ data: candidate({ status: "accepted", contact_ref: "leads.Contact:9" }) });
    await byId(wrapper, "candidate-accept").trigger("click");
    await flushPromises();
    expect(api.POST_CandidateAccept).toHaveBeenCalledWith(1);
    expect(byId(wrapper, "candidate-status").text()).toBe(t("leads.prospecting.status.accepted"));
    expect(byId(wrapper, "candidate-accept").exists()).toBe(false);
    expect(notify.spawnNotification).toHaveBeenCalledWith(expect.objectContaining({ type: "positive" }));
    expect(wrapper.emitted("changed")).toHaveLength(1);
    expect(wrapper.emitted("count").at(-1)).toEqual([0]);
  });

  it("rejects a candidate", async () => {
    const wrapper = await mountList();
    api.POST_CandidateReject.mockResolvedValue({ data: candidate({ status: "rejected" }) });
    await byId(wrapper, "candidate-reject").trigger("click");
    await flushPromises();
    expect(api.POST_CandidateReject).toHaveBeenCalledWith(1);
    expect(byId(wrapper, "candidate-status").text()).toBe(t("leads.prospecting.status.rejected"));
  });

  it("a refused accept keeps the candidate waiting and says why", async () => {
    const wrapper = await mountList();
    api.POST_CandidateAccept.mockRejectedValue({ response: { status: 503, data: { detail: "Leads is not available" } } });
    await byId(wrapper, "candidate-accept").trigger("click");
    await flushPromises();
    expect(byId(wrapper, "candidate-accept").exists()).toBe(true);
    expect(notify.spawnNotification).toHaveBeenCalledWith(expect.objectContaining({ type: "negative" }));
  });

  it("a candidate without an address cannot be accepted", async () => {
    const wrapper = await mountList({}, [candidate({ email: "" })]);
    expect(byId(wrapper, "candidate-accept").attributes("disabled")).toBeDefined();
    expect(byId(wrapper, "candidate-email").text()).toBe(t("leads.prospecting.no_email"));
  });

  it("asks for one company and status, and says when there is nobody", async () => {
    const wrapper = await mountList({ subjectRef: "leads.Company:7", status: "pending" }, []);
    expect(api.GET_Candidates).toHaveBeenCalledWith({ subject_ref: "leads.Company:7", status: "pending" });
    expect(byId(wrapper, "candidates-empty").exists()).toBe(true);
  });

  it("the company card tab asks for its own company and hides the company name", async () => {
    api.GET_Candidates.mockResolvedValue({ data: { results: [candidate()] } });
    const wrapper = mount(PeopleTab, { props: { company: { id: 7 } }, global: { mocks: { $t: t }, stubs } });
    await flushPromises();
    expect(api.GET_Candidates).toHaveBeenCalledWith({ subject_ref: "leads.Company:7", status: undefined });
    expect(byId(wrapper, "candidate-company").exists()).toBe(false);
    expect(wrapper.emitted("count")).toEqual([[1]]);
  });
});
