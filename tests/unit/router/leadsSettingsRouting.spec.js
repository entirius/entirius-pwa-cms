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
    expect(panels.find((p) => p.idx === "leads")).toMatchObject({ root: "/crm/today" });
  });

  it("the settings hub and its sections resolve under /crm/settings", async () => {
    for (const [path, name] of [
      ["/crm/settings", "LeadsSettings"],
      ["/crm/settings/stages", "LeadsStages"],
      ["/crm/settings/templates/3", "CommunicatorTemplateEdit"],
      ["/crm/settings/sending", "CommunicatorSettings"],
      ["/crm/board", "LeadsBoard"],
    ]) {
      await router.push(path);
      expect(router.currentRoute.value.name).toBe(name);
    }
  });

  it("old deep links land on the same screens", async () => {
    for (const [path, target] of [
      ["/communicator", "/crm/settings"],
      ["/communicator/templates", "/crm/settings/templates"],
      ["/communicator/templates/7", "/crm/settings/templates/7"],
      ["/communicator/sequences", "/crm/settings/sequences"],
      ["/communicator/settings", "/crm/settings/sending"],
      ["/crm/stages", "/crm/settings/stages"],
      ["/crm/settings/lead-types", "/crm/settings/company-types"],
    ]) {
      await router.push(path);
      expect(router.currentRoute.value.path).toBe(target);
    }
  });

  it("a section whose module is off is not reachable", async () => {
    await router.push("/crm/board");
    mockIsModuleEnabled.mockImplementation((m) => m !== "communicator");
    await router.push("/crm/settings/sending");
    expect(router.currentRoute.value.name).not.toBe("CommunicatorSettings");
  });

  // Plan 14: the outbound screens need communicator / leads 0.5.0; an older backend never reaches them.
  it("the outbound screens resolve on 0.5.0 and stay dormant on an older backend", async () => {
    const screens = [
      ["/crm/approvals", "LeadsApprovals"],
      ["/crm/settings/mailboxes", "LeadsMailboxes"],
      ["/crm/settings/mailboxes/new", "LeadsMailboxEdit"],
      ["/crm/settings/sending-health", "LeadsSendingHealth"],
      ["/crm/settings/do-not-contact", "LeadsDoNotContact"],
      ["/crm/settings/reply-classification", "LeadsReplyClassification"],
      ["/crm/settings/automatic-moves", "LeadsAutomaticMoves"],
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

  // S5 (walk 3): an unknown address is the not-found page inside the shell of the panel its first segment names.
  it("an unknown address resolves to the not-found page of its panel, outside a panel to none", async () => {
    await router.push("/crm/no-such-page/7");
    expect(router.currentRoute.value.name).toBe("NotFound");
    expect(router.currentRoute.value.meta.panel).toBe("leads");
    await router.push("/no-such-panel");
    expect(router.currentRoute.value.name).toBe("NotFound");
    expect(router.currentRoute.value.meta.panel).toBeNull();
  });
});
