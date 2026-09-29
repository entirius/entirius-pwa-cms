import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

const leads = vi.hoisted(() => ({
  PATCH_Company: vi.fn(),
  POST_CreateCustomer: vi.fn(),
  POST_RequestAudit: vi.fn(),
  POST_Communicate: vi.fn(),
  GET_Company: vi.fn(),
  GET_Stages: vi.fn(),
  GET_LeadTypes: vi.fn(),
  POST_Transition: vi.fn(),
}));
const route = vi.hoisted(() => ({ name: "LeadsThread", params: { id: "7" }, query: {} }));
vi.mock("vue-router", () => ({ useRoute: () => route, useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("@/composables/useIsDesktop", async () => {
  const { ref } = await import("vue");
  return { useIsDesktop: () => ref(true) };
});
const communicator = vi.hoisted(() => ({ GET_Templates: vi.fn() }));
vi.mock("@/api/communicator/api", () => communicator);
const siteintel = vi.hoisted(() => ({ GET_LatestAudit: vi.fn(), POST_AuditRerun: vi.fn() }));
const munin = vi.hoisted(() => ({ isModuleInstalled: vi.fn() }));
const notify = vi.hoisted(() => ({ spawnNotification: vi.fn() }));
vi.mock("@/api/leads/api", () => leads);
vi.mock("@/api/siteintel/api", () => siteintel);
vi.mock("@/stores/munin", () => ({ useMuninStore: () => munin }));
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => notify }));

import { createPinia, setActivePinia } from "pinia";
import Company from "@/views/Leads/Company.vue";
import CompanyActions from "@/views/Leads/CompanyActions.vue";
import { control, leadsFrame, setControl } from "./leadsFrame";

const company = (kind = "open") => ({ id: 7, domain: "shop.test", do_not_contact: false, customer_uid: null, stage: { key: kind, kind }, contacts: [] });
const mountActions = (props) =>
  mount(CompanyActions, {
    props,
    global: {
      components: leadsFrame.components,
      stubs: { ...leadsFrame.stubs, RouterLink: { props: ["to"], template: "<a :data-to='to.name'><slot /></a>" } },
    },
  });
const has = (wrapper, id) => wrapper.find(`[data-testid="${id}"]`).exists();

describe("Company card actions", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    [true, "won", true],
    [false, "won", false],
    [true, "open", false],
  ])("create customer with accounts=%s in stage %s → %s (L-15)", (installed, kind, visible) => {
    munin.isModuleInstalled.mockReturnValue(installed);
    expect(has(mountActions({ company: company(kind) }), "company-create-customer")).toBe(visible);
    expect(munin.isModuleInstalled).toHaveBeenCalledWith("accounts");
  });

  it.each([
    [true, "CustomerDetail"],
    [false, undefined],
  ])("a linked shop customer is badged, linked when accounts=%s (L-15)", (installed, target) => {
    munin.isModuleInstalled.mockReturnValue(installed);
    const badge = mountActions({ company: { ...company("won"), customer_uid: "u-1" } }).get('[data-testid="company-known-customer"]');
    expect(badge.attributes("data-to")).toBe(target);
    expect(has(mountActions({ company: company("won") }), "company-known-customer")).toBe(false);
  });

  it("do not contact asks first and patches only after the confirm", async () => {
    leads.PATCH_Company.mockResolvedValue({ data: {} });
    const wrapper = mountActions({ company: company() });
    const dialog = wrapper.findComponent({ name: "ConfirmDialog" });
    expect(dialog.props("open")).toBe(false);
    await wrapper.find('[data-testid="company-dnc"]').trigger("click");
    expect(dialog.props("open")).toBe(true);
    expect(leads.PATCH_Company).not.toHaveBeenCalled();
    dialog.vm.$emit("confirm");
    await flushPromises();
    expect(leads.PATCH_Company).toHaveBeenCalledWith(7, { do_not_contact: true });
    expect(wrapper.emitted("changed")).toHaveLength(1);
  });

  it("re-audit reruns the latest audit and says no draft comes from it (S-09)", async () => {
    siteintel.GET_LatestAudit.mockResolvedValue({ id: "a-1" });
    siteintel.POST_AuditRerun.mockResolvedValue({});
    const wrapper = mountActions({ company: company() });
    await wrapper.find('[data-testid="company-reaudit"]').trigger("click");
    await flushPromises();
    expect(siteintel.POST_AuditRerun).toHaveBeenCalledWith("a-1");
    expect(leads.POST_RequestAudit).not.toHaveBeenCalled();
    expect(notify.spawnNotification.mock.calls[0][0].msg).toMatch(/intel_ready/);
  });

  it("re-audit without an audit requests one through leads", async () => {
    siteintel.GET_LatestAudit.mockResolvedValue(null);
    const wrapper = mountActions({ company: company() });
    await wrapper.find('[data-testid="company-reaudit"]').trigger("click");
    await flushPromises();
    expect(leads.POST_RequestAudit).toHaveBeenCalledWith(7);
  });

  // FIX-17 item 14: the link target is at least 24 px and the card names the customer, never the bare uid.
  // FIX-17b item 4: it looks like a link, and the customer page's back arrow returns to this card.
  // Plan 53 (C-16, R5): the actions sit in one ActionBar — secondary, danger, then the one primary „Napisz” rightmost.
  it("orders the actions secondary · danger · primary", () => {
    munin.isModuleInstalled.mockReturnValue(true);
    const ids = mountActions({ company: company("won") })
      .findAll(".action-bar [data-testid]")
      .map((button) => button.attributes("data-testid"));
    expect(ids).toEqual(["company-create-customer", "company-reaudit", "company-dnc", "company-communicate"]);
  });

  it("the known-customer link is a 32 px link that carries the customer name and the way back", () => {
    munin.isModuleInstalled.mockReturnValue(true);
    const linked = { ...company(), customer_uid: "91010000-0000", customer_name: "Jan Kowalski" };
    const link = mount(CompanyActions, {
      props: { company: linked },
      global: {
        mocks: { $route: { fullPath: "/leads/companies/7" } },
        components: leadsFrame.components,
        stubs: { ...leadsFrame.stubs, RouterLink: { props: ["to"], template: "<a :data-back='to.query.back'><slot /></a>" } },
      },
    }).get('[data-testid="company-known-customer"]');
    expect(link.classes()).toContain("t-accent");
    expect(link.attributes("data-back")).toBe("/leads/companies/7");
    expect(link.text()).toContain("Jan Kowalski");
    expect(link.text()).not.toContain("91010000");
  });
});

// Plan 53: the card header's stage and lead-type selects are BasicSelects with a floating label (operator request).
describe("Company card header", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    leads.GET_Company.mockResolvedValue({ data: { ...company(), name: "Shop", lead_type: "RETAILER", stage: { key: "new" } } });
    leads.GET_Stages.mockResolvedValue({ data: { results: [{ key: "new", label: "New" }, { key: "won", label: "Won" }] } });
    leads.GET_LeadTypes.mockResolvedValue({ data: { results: [{ code: "RETAILER", label: "Retailer", is_active: true }] } });
  });

  const mountCard = async () => {
    const stubs = { ...leadsFrame.stubs, CompanyActions: true, Thread: true, OverviewTab: true, IntelTab: true, ContactsTab: true };
    const wrapper = mount(Company, { global: { components: leadsFrame.components, stubs } });
    await flushPromises();
    return wrapper;
  };

  it("names both selects with their floating label and offers the stages and Unknown + the active types", async () => {
    const wrapper = await mountCard();
    const stage = control(wrapper, "company-stage");
    expect(stage.props("floatingLabel")).toBe("leads.company.stage");
    expect(stage.props("modelValue")).toBe("new");
    expect(stage.props("options").map((option) => option.value)).toEqual(["new", "won"]);
    const type = control(wrapper, "company-lead-type");
    expect(type.props("floatingLabel")).toBe("leads.company.type");
    expect(type.props("options").map((option) => option.value)).toEqual(["UNKNOWN", "RETAILER"]);
    expect(wrapper.get('[data-testid="thread-company"]').text()).toBe("Shop");
  });

  it("a stage pick transitions, a type pick patches the company", async () => {
    leads.POST_Transition.mockResolvedValue({ data: { ...company(), stage: { key: "won" } } });
    leads.PATCH_Company.mockResolvedValue({ data: { ...company(), lead_type: "UNKNOWN" } });
    const wrapper = await mountCard();
    await setControl(wrapper, "company-stage", "won");
    await flushPromises();
    expect(leads.POST_Transition).toHaveBeenCalledWith(7, "won");
    await setControl(wrapper, "company-lead-type", "UNKNOWN");
    await flushPromises();
    expect(leads.PATCH_Company).toHaveBeenCalledWith(7, { lead_type: "UNKNOWN" });
  });

  it("picking the current stage or type again sends nothing", async () => {
    const wrapper = await mountCard();
    await setControl(wrapper, "company-stage", "new");
    await setControl(wrapper, "company-lead-type", "RETAILER");
    await flushPromises();
    expect(leads.POST_Transition).not.toHaveBeenCalled();
    expect(leads.PATCH_Company).not.toHaveBeenCalled();
  });
});

// Plan 54: the dialog is a BasicModal; the stub renders its body and hands its actions out as props.
describe("Leads Communicate dialog", () => {
  const BasicModal = { name: "BasicModal", props: ["open", "title", "actions"], template: "<div><slot /></div>" };
  const BasicRadioGroup = { name: "BasicRadioGroup", props: ["modelValue", "options"], template: "<div />" };
  const contacts = [
    { id: 1, first_name: "Anna", last_name: "Nowak", email: "anna@shop.test", is_primary: false },
    { id: 2, first_name: "Jan", last_name: "Kowal", email: "jan@shop.test", is_primary: true },
    { id: 3, first_name: "Opt", last_name: "Out", email: "out@shop.test", opt_out_at: "2026-09-01" },
  ];
  const openDialog = async () => {
    const wrapper = mount(CompanyActions, {
      props: { company: { ...company(), contacts } },
      global: { components: leadsFrame.components, stubs: { ...leadsFrame.stubs, BasicModal, BasicRadioGroup } },
    });
    await wrapper.get('[data-testid="company-communicate"]').trigger("click");
    await flushPromises();
    return wrapper;
  };
  const submit = (wrapper) => wrapper.findComponent({ name: "BasicModal" }).props("actions").find((a) => a.key === "submit");

  beforeEach(() => {
    vi.clearAllMocks();
    communicator.GET_Templates.mockResolvedValue({
      data: { results: [{ id: 1, key: "cold", language: "pl", is_active: true }, { id: 2, key: "old", language: "en", is_active: false }] },
    });
  });

  it("offers the active templates and the contacts that can get mail, the primary one picked", async () => {
    const wrapper = await openDialog();
    expect(control(wrapper, "communicate-template").props("options")).toEqual([{ value: "cold", label: "cold (pl)" }]);
    const radios = wrapper.findComponent({ name: "BasicRadioGroup" });
    expect(radios.props("options").map((o) => o.value)).toEqual([1, 2]);
    expect(radios.props("modelValue")).toBe(2);
  });

  it("Request draft waits for a template, then posts the pick and closes", async () => {
    leads.POST_Communicate.mockResolvedValue({ data: {} });
    const wrapper = await openDialog();
    expect(submit(wrapper).disabled).toBe(true);
    await setControl(wrapper, "communicate-template", "cold");
    expect(submit(wrapper).disabled).toBe(false);
    await submit(wrapper).onClick();
    await flushPromises();
    expect(leads.POST_Communicate).toHaveBeenCalledWith(7, { template_key: "cold", contact_id: 2 });
    expect(has(wrapper, "communicate-modal")).toBe(false);
  });
});
