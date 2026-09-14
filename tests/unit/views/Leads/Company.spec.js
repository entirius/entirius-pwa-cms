import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

const leads = vi.hoisted(() => ({ PATCH_Company: vi.fn(), POST_CreateCustomer: vi.fn(), POST_RequestAudit: vi.fn() }));
const siteintel = vi.hoisted(() => ({ GET_LatestAudit: vi.fn(), POST_AuditRerun: vi.fn() }));
const munin = vi.hoisted(() => ({ isModuleInstalled: vi.fn() }));
const notify = vi.hoisted(() => ({ spawnNotification: vi.fn() }));
vi.mock("@/api/leads/api", () => leads);
vi.mock("@/api/siteintel/api", () => siteintel);
vi.mock("@/stores/munin", () => ({ useMuninStore: () => munin }));
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => notify }));

import CompanyActions from "@/views/Leads/CompanyActions.vue";

const company = (kind = "open") => ({ id: 7, domain: "shop.test", do_not_contact: false, customer_uid: null, stage: { key: kind, kind }, contacts: [] });
const mountActions = (props) => mount(CompanyActions, { props, global: { stubs: { CommunicateModal: true } } });
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

  it("do not contact asks first and patches only after the confirm", async () => {
    leads.PATCH_Company.mockResolvedValue({ data: {} });
    const wrapper = mountActions({ company: company() });
    await wrapper.find('[data-testid="company-dnc"]').trigger("click");
    expect(leads.PATCH_Company).not.toHaveBeenCalled();
    await wrapper.find('[data-testid="company-dnc-yes"]').trigger("click");
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
});
