import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

const mockIsPanelEnabled = vi.fn();
const mockIsModuleEnabled = vi.fn();

// django-access is not under test here: allow-all, as without the module.
vi.mock("@/stores/access", () => ({
  useAccessStore: () => ({ can: () => true, canAny: () => true, ensureLoaded: () => Promise.resolve(), available: false, isStaff: true }),
}));
vi.mock("@/stores/munin", () => ({
  useMuninStore: () => ({
    loaded: true,
    isPanelEnabled: mockIsPanelEnabled,
    isModuleEnabled: mockIsModuleEnabled,
    isModuleAtLeast: () => false,
    isModuleInstalled: () => false,
    ensureLoaded: vi.fn(),
  }),
}));

vi.mock("@/stores/user", () => ({
  useUserStore: () => ({ isAuth: true }),
}));

const GET_Companies = vi.hoisted(() => vi.fn());
const empty = () => Promise.resolve({ data: { results: [] } });
vi.mock("@/api/leads/api", () => ({ GET_Companies, GET_Stages: empty, GET_LeadTypes: empty }));

import router from "@/router";
import { panels } from "@/configs/access";

describe("Leads panel routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    mockIsPanelEnabled.mockImplementation((p) => p === "leads");
    mockIsModuleEnabled.mockReturnValue(true);
  });

  it("registers the Leads panel with Today as root", () => {
    expect(panels.find((p) => p.idx === "leads")).toMatchObject({ root: "/leads/today", icon: "inbox" });
  });

  it("resolves the inbox, review and thread routes when modules are enabled", async () => {
    await router.push("/leads/inbox/7");
    expect(router.currentRoute.value.name).toBe("LeadsReview");
    await router.push("/leads/companies/42");
    expect(router.currentRoute.value.name).toBe("LeadsThread");
    expect(mockIsModuleEnabled).toHaveBeenCalledWith("leads");
  });

  it("sends a disabled panel home", async () => {
    mockIsPanelEnabled.mockReturnValue(false);
    await router.push("/leads/inbox/8");
    expect(router.currentRoute.value.path).toBe("/");
  });

  it("leads-only: the review route stays dormant and the panel opens Today, not home", async () => {
    mockIsModuleEnabled.mockImplementation((m) => m !== "communicator");
    await router.push("/leads/companies/43");
    await router.push("/leads/inbox/9");
    expect(mockIsModuleEnabled).toHaveBeenCalledWith("communicator");
    expect(router.currentRoute.value.name).toBe("LeadsToday");
    await router.push("/leads/companies/44");
    await router.push("/leads");
    expect(router.currentRoute.value.name).toBe("LeadsToday");
  });

  it("leads-only at 390 px: the panel renders the company list, never 'Open on a desktop'", async () => {
    vi.stubGlobal("matchMedia", (query) => ({ matches: query === "(max-width: 390px)", addEventListener() {}, removeEventListener() {} }));
    mockIsModuleEnabled.mockImplementation((m) => m !== "communicator");
    GET_Companies.mockResolvedValue({ data: { count: 1, results: [{ id: 46, name: "Shop", domain: "shop.test", stage: { label: "New" } }], next: null } });
    await router.push("/leads/companies/46");
    await router.push("/leads/companies");
    const wrapper = mount({ template: "<router-view />" }, { global: { plugins: [router] } });
    await flushPromises();
    expect(router.currentRoute.value.meta.desktop).toBeFalsy();
    expect(wrapper.find('[data-testid="desktop-only"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="leads-companies"]').exists()).toBe(true);
    expect(GET_Companies).toHaveBeenCalled();
    wrapper.unmount();
    vi.unstubAllGlobals();
  });

  it("without leads and communicator a module route lands on Today (it gates its own blocks), never a loop", async () => {
    await router.push("/leads/companies/45");
    mockIsModuleEnabled.mockReturnValue(false);
    await router.push("/leads/inbox");
    expect(router.currentRoute.value.path).toBe("/leads/today");
  });
});
