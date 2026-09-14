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
vi.mock("@/stores/user", () => ({ useUserStore: () => ({ isAuth: true, activeApp: null }) }));

import router from "@/router";
import { panels } from "@/configs/access";

describe("Communicator panel and leads desktop routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPanelEnabled.mockReturnValue(true);
    mockIsModuleEnabled.mockReturnValue(true);
  });

  it("registers the Communicator panel with templates as root", () => {
    expect(panels.find((p) => p.idx === "communicator")).toMatchObject({ root: "/communicator/templates", icon: "paper-plane" });
  });

  it("resolves the communicator and leads desktop routes", async () => {
    for (const [path, name] of [
      ["/communicator/templates/3", "CommunicatorTemplateEdit"],
      ["/communicator/settings", "CommunicatorSettings"],
      ["/leads/board", "LeadsBoard"],
      ["/leads/stages", "LeadsStages"],
    ]) {
      await router.push(path);
      expect(router.currentRoute.value.name).toBe(name);
    }
  });

  it("sends a disabled communicator panel home", async () => {
    mockIsPanelEnabled.mockImplementation((p) => p !== "communicator");
    await router.push("/communicator/sequences");
    expect(router.currentRoute.value.path).toBe("/");
  });

  it("keeps the settings dormant without the communicator module", async () => {
    await router.push("/leads/import");
    mockIsModuleEnabled.mockImplementation((m) => m !== "communicator");
    await router.push("/communicator/settings");
    expect(router.currentRoute.value.path).toBe("/");
  });
});
