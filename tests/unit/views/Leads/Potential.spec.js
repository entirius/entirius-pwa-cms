import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";

const leads = vi.hoisted(() => ({
  POST_CompanyPotential: vi.fn(),
  DELETE_CompanyPotential: vi.fn(),
  GET_LeadsChannel: vi.fn(),
  PATCH_LeadsChannel: vi.fn(),
}));
vi.mock("@/api/leads/api", () => leads);
const notify = vi.hoisted(() => ({ spawnNotification: vi.fn() }));
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => notify }));

import PotentialDialog from "@/views/Leads/PotentialDialog.vue";
import PotentialDot from "@/views/Leads/PotentialDot.vue";
import PotentialSettings from "@/views/Leads/PotentialSettings.vue";
import { POTENTIAL_TASK_SOURCE, potentialOn, potentialReason, taskTitle } from "@/views/Leads/potential";
import { setControl } from "./leadsFrame";
import { byTestid, mountOutbound } from "./outboundFrame";
import { crmStubs } from "./crmFrame";

const company = (extra = {}) => ({
  id: 5, name: "Acme", domain: "acme.test", potential: "orange", potential_reason: "reply:not_now", potential_return_on: "2027-02-15",
  potential_manual: false, potential_comment: "", ...extra,
});
const THRESHOLDS = {
  silence_days: 120, skip_return_days: 30, red_return_days: 90,
  reply_colours: { interested: "green", not_now: "orange", out_of_office: "orange", unclear: "orange", wrong_person: "orange", not_interested: "red" },
};

// U2: the potential dot of a company — reason, ★, the manual dialog, Settings → Potential, the Today task.
describe("Leads → potential", () => {
  beforeEach(() => vi.clearAllMocks());

  it("says why: the reply class and the come-back day; a manual colour says its comment; no dot = not written to yet", () => {
    expect(potentialReason(company())).toMatch(/^Reply: Not now · back /);
    expect(potentialReason(company({ potential_manual: true, potential_comment: "Met at a fair", potential_return_on: null }))).toBe("Set by hand: Met at a fair");
    expect(potentialReason(company({ potential: "", potential_reason: "" }))).toBe("Not written to yet");
    expect(potentialReason(company({ potential: "red", potential_reason: "silence", potential_return_on: null }))).toBe("No reply to the last mail");
    expect(potentialOn(company())).toBe(true);
    expect(potentialOn({ id: 1 })).toBe(false);
  });

  it("the dot carries its colour and the reason; ★ only when set by hand; a click emits edit", async () => {
    const wrapper = mount(PotentialDot, { props: { company: company({ potential_manual: true, potential_comment: "x" }), editable: true } });
    const dot = byTestid(wrapper, "potential-dot");
    expect(dot.attributes("data-potential")).toBe("orange");
    expect(dot.attributes("title")).toContain("Set by hand: x");
    expect(byTestid(wrapper, "potential-star").exists()).toBe(true);
    await dot.trigger("click");
    expect(wrapper.emitted("edit")[0][0].id).toBe(5);
    const plain = mount(PotentialDot, { props: { company: company() } });
    expect(byTestid(plain, "potential-star").exists()).toBe(false);
    expect(plain.find("button").exists()).toBe(false);
  });

  it("Save stays greyed until a reason is written, then posts colour, reason and day", async () => {
    leads.POST_CompanyPotential.mockResolvedValue({ data: company({ potential: "green", potential_manual: true }) });
    const wrapper = mountOutbound(PotentialDialog, { area: "leads.companies", stubs: crmStubs, props: { company: company() } });
    await flushPromises();
    const modal = () => wrapper.findComponent({ name: "BasicModal" });
    expect(modal().props("actions").find((a) => a.key === "save").disabled).toBe(true);
    expect(modal().props("actions").find((a) => a.key === "auto")).toBeUndefined();
    setControl(wrapper, "potential-colour", "green");
    setControl(wrapper, "potential-comment", "Met at a fair");
    setControl(wrapper, "potential-return-on", "2027-03-01");
    await flushPromises();
    expect(modal().props("actions").find((a) => a.key === "save").disabled).toBe(false);
    await byTestid(wrapper, "potential-save").trigger("click");
    await flushPromises();
    expect(leads.POST_CompanyPotential).toHaveBeenCalledWith(5, { colour: "green", comment: "Met at a fair", return_on: "2027-03-01" });
    expect(wrapper.emitted("saved")[0][0].potential).toBe("green");
  });

  it("a manual colour offers Back to automatic", async () => {
    leads.DELETE_CompanyPotential.mockResolvedValue({ data: company() });
    const wrapper = mountOutbound(PotentialDialog, {
      area: "leads.companies", stubs: crmStubs, props: { company: company({ potential_manual: true, potential_comment: "Fair" }) },
    });
    await flushPromises();
    expect(wrapper.findComponent('[data-testid="potential-comment"]').props("modelValue")).toBe("Fair");
    await byTestid(wrapper, "potential-auto").trigger("click");
    await flushPromises();
    expect(leads.DELETE_CompanyPotential).toHaveBeenCalledWith(5);
    expect(wrapper.emitted("saved")).toHaveLength(1);
  });

  it("a refused colour (legal block) keeps the dialog open with the answer", async () => {
    leads.POST_CompanyPotential.mockRejectedValue({ message: "the company may never be mailed (do_not_contact): only red" });
    const wrapper = mountOutbound(PotentialDialog, { area: "leads.companies", stubs: crmStubs, props: { company: company({ potential: "red" }) } });
    await flushPromises();
    setControl(wrapper, "potential-colour", "green");
    setControl(wrapper, "potential-comment", "please");
    await flushPromises();
    await byTestid(wrapper, "potential-save").trigger("click");
    await flushPromises();
    expect(wrapper.emitted("saved")).toBeUndefined();
    expect(wrapper.findComponent({ name: "FormField", props: { label: "Reason" } }).exists()).toBe(true);
  });

  it("Settings → Potential reads the thresholds and saves them in one PATCH", async () => {
    leads.GET_LeadsChannel.mockResolvedValue({ data: { potential: THRESHOLDS } });
    leads.PATCH_LeadsChannel.mockImplementation((body) => Promise.resolve({ data: { potential: body.potential } }));
    const wrapper = mountOutbound(PotentialSettings, { area: "leads.settings", stubs: crmStubs });
    await flushPromises();
    expect(wrapper.findComponent('[data-testid="potential-silence_days"]').props("modelValue")).toBe(120);
    setControl(wrapper, "potential-silence_days", 60);
    setControl(wrapper, "potential-reply-not_now", "red");
    await flushPromises();
    await byTestid(wrapper, "potential-settings-save").trigger("click");
    await flushPromises();
    expect(leads.PATCH_LeadsChannel).toHaveBeenCalledWith({
      potential: { silence_days: 60, skip_return_days: 30, red_return_days: 90, reply_colours: { ...THRESHOLDS.reply_colours, not_now: "red" } },
    });
    expect(notify.spawnNotification).toHaveBeenCalledWith(expect.objectContaining({ type: "positive" }));
  });

  it("Settings → Potential refuses an empty day count before the request", async () => {
    leads.GET_LeadsChannel.mockResolvedValue({ data: { potential: THRESHOLDS } });
    const wrapper = mountOutbound(PotentialSettings, { area: "leads.settings", stubs: crmStubs });
    await flushPromises();
    setControl(wrapper, "potential-red_return_days", "");
    await flushPromises();
    await byTestid(wrapper, "potential-settings-save").trigger("click");
    await flushPromises();
    expect(leads.PATCH_LeadsChannel).not.toHaveBeenCalled();
  });

  it("Today: the come-back task reads Come back to <company>; other tasks keep their title", () => {
    expect(taskTitle({ source: POTENTIAL_TASK_SOURCE, title: "x", subject_label: "Acme" })).toBe("Come back to Acme");
    expect(taskTitle({ source: "leads.reply.not_now", title: "Come back: Jan" })).toBe("Come back: Jan");
  });
});
