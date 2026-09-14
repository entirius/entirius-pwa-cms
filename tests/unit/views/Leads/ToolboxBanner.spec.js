import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { setActivePinia, createPinia } from "pinia";

const GET_Modules = vi.hoisted(() => vi.fn());
vi.mock("@/api/munin/api", () => ({ GET_Modules }));

import { useMuninStore } from "@/stores/munin";
import ToolboxBanner from "@/views/Leads/ToolboxBanner.vue";

const modulesWith = (toolbox_status) => ({
  data: { platform: { version: "2.0.0", toolbox_status }, modules: { leads: { enabled_in_cms: true } } },
});

describe("toolbox teaser", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("reads platform.toolbox_status from the munin registry", async () => {
    GET_Modules.mockResolvedValue(modulesWith("unconfigured"));
    const munin = useMuninStore();
    await munin.fetchModules();
    expect(munin.toolboxStatus).toBe("unconfigured");
  });

  it.each([
    ["unconfigured", "Entirius AI Toolbox"],
    ["unreachable", "not responding"],
  ])("%s renders the banner", async (status, copy) => {
    useMuninStore().toolboxStatus = status;
    expect(mount(ToolboxBanner).get('[data-testid="toolbox-banner"]').text()).toContain(copy);
  });

  it.each(["configured", ""])("%j renders nothing", (status) => {
    useMuninStore().toolboxStatus = status;
    expect(mount(ToolboxBanner).find('[data-testid="toolbox-banner"]').exists()).toBe(false);
  });
});
