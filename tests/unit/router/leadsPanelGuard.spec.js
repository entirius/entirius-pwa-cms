import { describe, it, expect, vi, beforeEach } from "vitest";

const mockIsPanelEnabled = vi.fn();
const mockIsModuleEnabled = vi.fn();

vi.mock("@/stores/munin", () => ({
  useMuninStore: () => ({
    loaded: true,
    isPanelEnabled: mockIsPanelEnabled,
    isModuleEnabled: mockIsModuleEnabled,
    ensureLoaded: vi.fn(),
  }),
}));

vi.mock("@/stores/user", () => ({
  useUserStore: () => ({ isAuth: true, activeApp: null }),
}));

import router from "@/router";
import { panels } from "@/configs/access";

describe("Leads panel routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPanelEnabled.mockImplementation((p) => p === "leads");
    mockIsModuleEnabled.mockReturnValue(true);
  });

  it("registers the Leads panel with the inbox as root", () => {
    expect(panels.find((p) => p.idx === "leads")).toMatchObject({ root: "/leads/inbox", icon: "inbox" });
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

  it("leads-only: the review route stays dormant and the panel opens the company board, not home", async () => {
    mockIsModuleEnabled.mockImplementation((m) => m !== "communicator");
    await router.push("/leads/companies/43");
    await router.push("/leads/inbox/9");
    expect(mockIsModuleEnabled).toHaveBeenCalledWith("communicator");
    expect(router.currentRoute.value.name).toBe("LeadsBoard");
    await router.push("/leads/companies/44");
    await router.push("/leads");
    expect(router.currentRoute.value.name).toBe("LeadsBoard");
  });

  it("without leads and communicator the panel root goes home instead of looping", async () => {
    await router.push("/leads/companies/45");
    mockIsModuleEnabled.mockReturnValue(false);
    await router.push("/leads/inbox");
    expect(router.currentRoute.value.path).toBe("/");
  });
});
