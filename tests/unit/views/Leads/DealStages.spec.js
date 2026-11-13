import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushPromises } from "@vue/test-utils";

const leads = vi.hoisted(() => ({
  GET_DealStages: vi.fn(),
  POST_DealStage: vi.fn(),
  PATCH_DealStage: vi.fn(),
  DELETE_DealStage: vi.fn(),
  GET_Deal: vi.fn(),
  POST_Deal: vi.fn(),
  GET_Company: vi.fn(),
  GET_Companies: vi.fn(),
  GET_LeadsChannel: vi.fn(),
}));
const regional = vi.hoisted(() => ({ GET_RegionalCurrencies: vi.fn() }));
const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("@/api/leads/api", () => leads);
vi.mock("@/api/regional/api", () => regional);
const notify = vi.hoisted(() => ({ spawnNotification: vi.fn() }));
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => notify }));
vi.mock("vue-router", async (original) => ({ ...(await original()), useRouter: () => router }));

import DealStages from "@/views/Leads/DealStages.vue";
import DealDialog from "@/views/Leads/DealDialog.vue";
import { control, setControl } from "./leadsFrame";
import { byTestid, mountOutbound } from "./outboundFrame";
import { crmStubs } from "./crmFrame";

const STAGES = [
  { id: 1, key: "qualified", label: "Qualified", kind: "open", order: 0 },
  { id: 2, key: "won", label: "Won", kind: "won", order: 10 },
];
const conflict = Object.defineProperty({ response: { data: { detail: "holds deals" } } }, "httpStatus", { value: 409 });

// Plan 16: Settings → Deal stages (the 409 inline, the missing lost stage) and the Open a deal dialog.
describe("Leads → Settings → Deal stages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    leads.GET_DealStages.mockResolvedValue({ data: { results: STAGES.map((stage) => ({ ...stage })) } });
  });
  const mounted = async (options = {}) => {
    const wrapper = mountOutbound(DealStages, { area: "leads.settings", stubs: crmStubs, ...options });
    await flushPromises();
    return wrapper;
  };

  it("says deals cannot be closed without a lost stage; a stage holding deals is not deleted", async () => {
    leads.DELETE_DealStage.mockRejectedValue(conflict);
    const wrapper = await mounted();
    expect(byTestid(wrapper, "deal-stages-cannot-close").exists()).toBe(true);
    await wrapper.findAll('[data-testid="deal-stage-delete"]')[0].trigger("click");
    await byTestid(wrapper, "deal-stage-delete-confirm").trigger("click");
    await flushPromises();
    expect(byTestid(wrapper, "deal-stage-error").text()).toBe("This stage holds deals — move them first");
  });

  // Acceptance CM13: one page Save with the unsaved state and a toast when it landed; the kind shows once.
  it("the page Save sends the changed rows and says so; Add appends with the kind", async () => {
    leads.PATCH_DealStage.mockResolvedValue({});
    leads.POST_DealStage.mockResolvedValue({});
    const wrapper = await mounted();
    expect(byTestid(wrapper, "deal-stages-unsaved").exists()).toBe(false);
    expect(byTestid(wrapper, "deal-stages-save").attributes("disabled")).toBeDefined();
    expect(wrapper.findAll('[data-testid="deal-stage-row"]')[0].findAllComponents({ name: "StatusBadge" })).toHaveLength(0);
    setControl(wrapper, "deal-stage-kind", "lost");
    await flushPromises();
    expect(byTestid(wrapper, "deal-stages-unsaved").exists()).toBe(true);
    await byTestid(wrapper, "deal-stages-save").trigger("click");
    await flushPromises();
    expect(leads.PATCH_DealStage).toHaveBeenCalledTimes(1);
    expect(leads.PATCH_DealStage).toHaveBeenCalledWith(1, { label: "Qualified", kind: "lost" });
    expect(notify.spawnNotification).toHaveBeenCalledWith({ msg: "Deal stages saved", type: "positive" });
    expect(byTestid(wrapper, "deal-stages-unsaved").exists()).toBe(false);
    control(wrapper, "deal-stage-new-key").vm.$emit("update:modelValue", "lost");
    control(wrapper, "deal-stage-new-label").vm.$emit("update:modelValue", "Lost");
    setControl(wrapper, "deal-stage-new-kind", "lost");
    await wrapper.find("form").trigger("submit");
    expect(leads.POST_DealStage).toHaveBeenCalledWith({ key: "lost", label: "Lost", kind: "lost", order: 20 });
  });

  it("a move keeps the edits not saved yet; a saved label with spaces leaves the page clean", async () => {
    leads.PATCH_DealStage.mockResolvedValue({});
    const wrapper = await mounted();
    setControl(wrapper, "deal-stage-label", "Qualified lead ");
    await flushPromises();
    await wrapper.findAll('[data-testid="deal-stage-down"]')[0].trigger("click");
    await flushPromises();
    expect(control(wrapper, "deal-stage-label").props("modelValue")).toBe("Qualified lead ");
    expect(byTestid(wrapper, "deal-stages-unsaved").exists()).toBe(true);
    await byTestid(wrapper, "deal-stages-save").trigger("click");
    await flushPromises();
    expect(leads.PATCH_DealStage).toHaveBeenLastCalledWith(1, { label: "Qualified lead", kind: "open" });
    expect(byTestid(wrapper, "deal-stages-unsaved").exists()).toBe(false);
  });

  it("read-only: no Add card, no Save, no row action", async () => {
    const wrapper = await mounted({ write: false });
    expect(byTestid(wrapper, "readonly-notice").exists()).toBe(true);
    ["deal-stage-add", "deal-stages-save", "deal-stage-up", "deal-stage-delete"].forEach((id) => expect(byTestid(wrapper, id).exists()).toBe(false));
  });
});

describe("Leads → Open a deal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    regional.GET_RegionalCurrencies.mockResolvedValue({ data: { results: [{ iso3: "EUR" }, { iso3: "PLN" }] } });
    leads.GET_LeadsChannel.mockResolvedValue({ data: { default_currency: "PLN" } });
    leads.POST_Deal.mockResolvedValue({ data: { id: 11 } });
  });
  const company = { id: 3, name: "Acme", contacts: [{ id: 5, first_name: "Jan", last_name: "Nowak", is_primary: true }] };
  async function opened(props) {
    const wrapper = mountOutbound(DealDialog, { area: "leads.companies", props: { open: false, ...props }, stubs: crmStubs });
    await wrapper.setProps({ open: true });
    await flushPromises();
    return wrapper;
  }

  it("from a company card: company, title, primary contact and the channel's currency pre-filled; success opens the deal", async () => {
    const wrapper = await opened({ company });
    expect(byTestid(wrapper, "deal-dialog-company").exists()).toBe(false);
    expect(control(wrapper, "deal-currency").props("modelValue")).toBe("PLN");
    control(wrapper, "deal-value-one-off").vm.$emit("update:modelValue", "12400.00");
    await byTestid(wrapper, "deal-dialog-submit").trigger("click");
    await flushPromises();
    expect(leads.POST_Deal).toHaveBeenCalledWith(expect.objectContaining({ company_id: 3, title: "Acme", contact_id: 5, value_one_off: "12400.00", currency: "PLN" }));
    expect(router.push).toHaveBeenCalledWith({ name: "LeadsDeal", params: { id: 11 } });
  });

  it("from the deal list a company must be picked first", async () => {
    const wrapper = await opened({});
    expect(byTestid(wrapper, "deal-dialog-company").exists()).toBe(true);
    await byTestid(wrapper, "deal-dialog-submit").trigger("click");
    expect(leads.POST_Deal).not.toHaveBeenCalled();
  });
});
