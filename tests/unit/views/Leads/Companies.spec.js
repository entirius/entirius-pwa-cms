import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { t } from "@/i18n";
import BasicButton from "@/boots/BasicButton/index.vue";
import BasicInput from "@/boots/BasicInput/index.vue";

const leads = vi.hoisted(() => ({ GET_Companies: vi.fn(), POST_BulkSenderRoute: vi.fn() }));
const comm = vi.hoisted(() => ({ GET_Routes: vi.fn() }));
const munin = vi.hoisted(() => ({ communicator: true }));
vi.mock("@/api/leads/api", () => leads);
vi.mock("@/api/communicator/api", () => comm);
vi.mock("@/stores/munin", () => ({ useMuninStore: () => ({ isModuleEnabled: (key) => key !== "communicator" || munin.communicator }) }));
vi.mock("vue-router", () => ({ useRoute: () => ({ name: "LeadsCompanies", params: {} }), useRouter: () => ({ push: vi.fn() }) }));

import Companies from "@/views/Leads/Companies.vue";
import { leadsFrame, setControl } from "./leadsFrame";

const RouterLink = { props: ["to"], template: "<a :data-to='JSON.stringify(to)'><slot /></a>" };
const global = { components: leadsFrame.components, stubs: { ...leadsFrame.stubs, BasicButton, BasicInput, RouterLink, EmptyState: true } };
const company = (id, fields = {}) => ({ id, name: `Shop ${id}`, domain: `shop${id}.pl`, stage: { label: "New" }, last_activity_at: null, sender_route: "", ...fields });
const mountList = async () => {
  const wrapper = mount(Companies, { props: { embedded: true }, global });
  await flushPromises();
  return wrapper;
};

// Q11: sender route on the company list: filter, pick, move.
describe("Companies → sender routes", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    munin.communicator = true;
    leads.GET_Companies.mockResolvedValue({ data: { results: [company(1, { sender_route: "ecomhouse" }), company(2), company(3)], next: null } });
    comm.GET_Routes.mockResolvedValue({ data: { results: [{ key: "ecomhouse", name: "Ecom", is_active: true }, { key: "old", name: "Old", is_active: false }] } });
    leads.POST_BulkSenderRoute.mockResolvedValue({ data: { updated: 2 } });
  });

  it("without communicator there are no route tools and the list is as before", async () => {
    munin.communicator = false;
    const wrapper = await mountList();
    expect(comm.GET_Routes).not.toHaveBeenCalled();
    expect(wrapper.find('[data-testid="companies-route-tools"]').exists()).toBe(false);
    expect(wrapper.findAll('[data-testid="companies-item"]')).toHaveLength(3);
  });

  it("shows the route on a row that has one and filters by route on the server", async () => {
    const wrapper = await mountList();
    expect(wrapper.findAll('[data-testid="companies-item"]')[0].text()).toContain("ecomhouse");
    await setControl(wrapper, "companies-route-filter", "ecomhouse");
    await flushPromises();
    expect(leads.GET_Companies).toHaveBeenLastCalledWith(expect.objectContaining({ sender_route: "ecomhouse" }));
  });

  it("select mode: pick companies, choose a route (only active ones, default first), move them", async () => {
    const wrapper = await mountList();
    await wrapper.get('[data-testid="companies-select-mode"]').trigger("click");
    expect(wrapper.findAll('[data-testid="companies-item"]')).toHaveLength(0);
    const boxes = wrapper.findAllComponents('[data-testid="companies-pick"]');
    boxes[0].vm.$emit("update:modelValue", true);
    boxes[2].vm.$emit("update:modelValue", true);
    await flushPromises();
    expect(wrapper.get('[data-testid="companies-selected"]').text()).toContain("2");
    const options = wrapper.getComponent('[data-testid="companies-bulk-route"]').props("options");
    expect(options.map((option) => option.value)).toEqual(["", "ecomhouse"]);
    await setControl(wrapper, "companies-bulk-route", "ecomhouse");
    await wrapper.get('[data-testid="companies-bulk-apply"]').trigger("click");
    await flushPromises();
    expect(leads.POST_BulkSenderRoute).toHaveBeenCalledWith([1, 3], "ecomhouse");
    expect(wrapper.get('[data-testid="companies-bulk-message"]').text()).toBe(t("leads.companies.moved", { count: 2 }));
    expect(wrapper.get('[data-testid="companies-selected"]').text()).toContain("0");
  });

  it("the default route is a move to an empty key; Apply is off without a selection", async () => {
    const wrapper = await mountList();
    await wrapper.get('[data-testid="companies-select-mode"]').trigger("click");
    expect(wrapper.get('[data-testid="companies-bulk-apply"]').attributes("disabled")).toBeDefined();
    await wrapper.get('[data-testid="companies-select-all"]').trigger("click");
    await wrapper.get('[data-testid="companies-bulk-apply"]').trigger("click");
    await flushPromises();
    expect(leads.POST_BulkSenderRoute).toHaveBeenCalledWith([1, 2, 3], "");
  });

  it("a refused move is shown and the selection is kept", async () => {
    leads.POST_BulkSenderRoute.mockRejectedValue({ response: { data: { detail: "invalid route" } } });
    const wrapper = await mountList();
    await wrapper.get('[data-testid="companies-select-mode"]').trigger("click");
    await wrapper.get('[data-testid="companies-select-all"]').trigger("click");
    await wrapper.get('[data-testid="companies-bulk-apply"]').trigger("click");
    await flushPromises();
    expect(wrapper.get('[data-testid="companies-bulk-message"]').text()).toBe("invalid route");
    expect(wrapper.get('[data-testid="companies-selected"]').text()).toContain("3");
  });
});
