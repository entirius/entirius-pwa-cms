import { describe, it, expect, vi, beforeEach } from "vitest";

const mockIsPanelEnabled = vi.fn();
const mockIsModuleEnabled = vi.fn();
const mockIsModuleAtLeast = vi.fn();

// django-access is not under test here: allow-all, as without the module.
vi.mock("@/stores/access", () => ({
  useAccessStore: () => ({ can: () => true, canAny: () => true, ensureLoaded: () => Promise.resolve(), available: false, isStaff: true }),
}));
vi.mock("@/stores/munin", () => ({
  useMuninStore: () => ({
    loaded: true,
    isPanelEnabled: mockIsPanelEnabled,
    isModuleEnabled: mockIsModuleEnabled,
    isModuleAtLeast: mockIsModuleAtLeast,
    ensureLoaded: vi.fn(),
  }),
}));
vi.mock("@/stores/user", () => ({ useUserStore: () => ({ isAuth: true }) }));

import router from "@/router";
import { panels } from "@/configs/access";

// UX-002d: the Communicator panel became sections of Leads → Settings; the backends stay separate modules.
describe("Leads → Settings routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPanelEnabled.mockReturnValue(true);
    mockIsModuleEnabled.mockReturnValue(true);
    mockIsModuleAtLeast.mockReturnValue(true);
  });

  it("registers no Communicator panel", () => {
    expect(panels.find((p) => p.idx === "communicator")).toBeUndefined();
    expect(panels.find((p) => p.idx === "leads")).toMatchObject({ root: "/leads/inbox" });
  });

  it("the settings hub and its sections resolve under /leads/settings", async () => {
    for (const [path, name] of [
      ["/leads/settings", "LeadsSettings"],
      ["/leads/settings/stages", "LeadsStages"],
      ["/leads/settings/templates/3", "CommunicatorTemplateEdit"],
      ["/leads/settings/sending", "CommunicatorSettings"],
      ["/leads/board", "LeadsBoard"],
    ]) {
      await router.push(path);
      expect(router.currentRoute.value.name).toBe(name);
    }
  });

  it("old deep links land on the same screens", async () => {
    for (const [path, target] of [
      ["/communicator", "/leads/settings"],
      ["/communicator/templates", "/leads/settings/templates"],
      ["/communicator/templates/7", "/leads/settings/templates/7"],
      ["/communicator/sequences", "/leads/settings/sequences"],
      ["/communicator/settings", "/leads/settings/sending"],
      ["/leads/stages", "/leads/settings/stages"],
    ]) {
      await router.push(path);
      expect(router.currentRoute.value.path).toBe(target);
    }
  });

  it("a section whose module is off is not reachable", async () => {
    await router.push("/leads/board");
    mockIsModuleEnabled.mockImplementation((m) => m !== "communicator");
    await router.push("/leads/settings/sending");
    expect(router.currentRoute.value.name).not.toBe("CommunicatorSettings");
  });

  // Plan 14: the outbound screens need communicator / leads 0.5.0; an older backend never reaches them.
  it("the outbound screens resolve on 0.5.0 and stay dormant on an older backend", async () => {
    const screens = [
      ["/leads/approvals", "LeadsApprovals"],
      ["/leads/settings/mailboxes", "LeadsMailboxes"],
      ["/leads/settings/mailboxes/new", "LeadsMailboxEdit"],
      ["/leads/settings/sending-health", "LeadsSendingHealth"],
      ["/leads/settings/do-not-contact", "LeadsDoNotContact"],
      ["/leads/settings/reply-classification", "LeadsReplyClassification"],
      ["/leads/settings/automatic-moves", "LeadsAutomaticMoves"],
    ];
    for (const [path, name] of screens) {
      await router.push(path);
      expect(router.currentRoute.value.name).toBe(name);
    }
    mockIsModuleAtLeast.mockReturnValue(false);
    for (const [path, name] of screens) {
      await router.push(path);
      expect(router.currentRoute.value.name).not.toBe(name);
    }
    expect(mockIsModuleAtLeast).toHaveBeenCalledWith("communicator", "0.5.0");
  });
});
