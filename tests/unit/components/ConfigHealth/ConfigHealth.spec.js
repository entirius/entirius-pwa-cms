import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { setActivePinia, createPinia } from "pinia";

const api = vi.hoisted(() => ({
  GET_ConfigHealth: vi.fn(),
  POST_ConfigHealthCheck: vi.fn(),
  GET_Modules: vi.fn(),
}));
vi.mock("@/api/munin/api", () => api);

import { useConfigHealthStore } from "@/stores/configHealth";
import ConfigHealthButton from "@/components/ConfigHealth/ConfigHealthButton.vue";
import ConfigBanner from "@/components/ConfigHealth/ConfigBanner.vue";

const SMTP = {
  code: "communicator.smtp",
  module: "communicator",
  state: "unconfigured",
  severity: "high",
  title: "SMTP not configured for channel default-europe",
  detail: "Add a complete entry.",
  fix_url: "https://docs.test/smtp",
  scope: "default-europe",
};
const GREEN = [
  { code: "communicator.smtp", state: "configured" },
  { code: "toolbox.status", state: "configured" },
];
const health = (checks) =>
  Promise.resolve({ data: { checked_at: new Date().toISOString(), checks } });
const RouterLink = { props: ["to"], template: '<a :data-to="to"><slot /></a>' };
const mountButton = () =>
  mount(ConfigHealthButton, {
    global: { stubs: { teleport: true, RouterLink } },
  });

describe("configuration health", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it("all green: no header icon", async () => {
    api.GET_ConfigHealth.mockReturnValue(health(GREEN));
    await useConfigHealthStore().poll();
    expect(
      mountButton().find('[data-testid="config-health-button"]').exists()
    ).toBe(false);
  });

  it("a failing check shows the triangle with its count; the panel lists it with its fix link, green codes below", async () => {
    api.GET_ConfigHealth.mockReturnValue(
      health([SMTP, { code: "toolbox.status", state: "configured" }])
    );
    await useConfigHealthStore().poll();
    const wrapper = mountButton();
    await flushPromises();
    expect(wrapper.get('[data-testid="config-health-count"]').text()).toBe("1");
    await wrapper.get('[data-testid="config-health-button"]').trigger("click");
    const row = wrapper.get('[data-testid="config-health-row"]');
    expect(row.text()).toContain(
      "Outgoing mail is not configured for channel default-europe"
    );
    expect(
      row.get('[data-testid="config-health-fix"]').attributes()
    ).toMatchObject({ href: SMTP.fix_url, target: "_blank" });
    expect(
      wrapper.get('[data-testid="config-health-passing"]').text()
    ).toContain("AI toolbox");
  });

  it("a CMS-path fix link is a router link", async () => {
    api.GET_ConfigHealth.mockReturnValue(
      health([{ ...SMTP, fix_url: "/communicator/settings" }])
    );
    await useConfigHealthStore().poll();
    const wrapper = mountButton();
    await flushPromises();
    await wrapper.get('[data-testid="config-health-button"]').trigger("click");
    expect(
      wrapper.get('[data-testid="config-health-fix"]').attributes("data-to")
    ).toBe("/communicator/settings");
  });

  it("an unknown code falls back to the backend title", async () => {
    api.GET_ConfigHealth.mockReturnValue(
      health([
        { ...SMTP, code: "siteintel.keys", title: "urlscan key missing" },
      ])
    );
    await useConfigHealthStore().poll();
    const wrapper = mountButton();
    await flushPromises();
    await wrapper.get('[data-testid="config-health-button"]').trigger("click");
    expect(wrapper.get('[data-testid="config-health-row"]').text()).toContain(
      "urlscan key missing"
    );
  });

  it("bad → good: the icon turns into a green 'fixed' for 10 s, then hides — no click needed", async () => {
    const store = useConfigHealthStore();
    api.GET_ConfigHealth.mockReturnValueOnce(
      health([SMTP])
    ).mockReturnValueOnce(health(GREEN));
    await store.poll();
    const wrapper = mountButton();
    await store.poll();
    await flushPromises();
    expect(
      wrapper
        .get('[data-testid="config-health-button"]')
        .attributes("aria-label")
    ).toBe("Configuration fixed");
    expect(wrapper.find('[data-testid="config-health-count"]').exists()).toBe(
      false
    );
    vi.advanceTimersByTime(10000);
    await flushPromises();
    expect(wrapper.find('[data-testid="config-health-button"]').exists()).toBe(
      false
    );
  });

  it("Check again posts the probes", async () => {
    api.POST_ConfigHealthCheck.mockReturnValue(
      health([{ ...SMTP, code: "email.smtp", state: "auth_failed" }])
    );
    const store = useConfigHealthStore();
    await store.recheck();
    expect(api.POST_ConfigHealthCheck).toHaveBeenCalledOnce();
    expect(store.stateOf("email.smtp")).toBe("auth_failed");
    expect(store.stateOf("toolbox.status")).toBe("");
  });

  it("a probe failure survives the next plain poll — no false 'fixed' — and clears on the next Check again", async () => {
    const store = useConfigHealthStore();
    const probed = {
      ...SMTP,
      code: "email.smtp",
      state: "auth_failed",
      probe: true,
    };
    api.POST_ConfigHealthCheck.mockReturnValueOnce(health([probed, GREEN[0]]));
    api.GET_ConfigHealth.mockReturnValue(
      health([{ code: "email.smtp", state: "configured" }, GREEN[0]])
    );
    await store.recheck();
    await store.poll();
    expect(store.stateOf("email.smtp")).toBe("auth_failed");
    expect(store.failing).toHaveLength(1);
    expect(store.passing.map((row) => row.code)).toEqual(["communicator.smtp"]);
    expect(store.justFixed).toBe(false);
    api.POST_ConfigHealthCheck.mockReturnValueOnce(
      health([{ code: "email.smtp", state: "configured" }, GREEN[0]])
    );
    await store.recheck();
    expect(store.stateOf("email.smtp")).toBe("configured");
    expect(store.justFixed).toBe(true);
  });

  it("stop() drops a response still in flight and the 'fixed' flash of the old session", async () => {
    const store = useConfigHealthStore();
    let answer;
    api.GET_ConfigHealth.mockReturnValueOnce(
      health([SMTP])
    ).mockReturnValueOnce(new Promise((r) => (answer = r)));
    await store.poll();
    const late = store.poll();
    store.stop();
    answer({ data: { checked_at: "x", checks: [SMTP] } });
    await late;
    expect(store.checks).toEqual([]);
    expect(store.justFixed).toBe(false);
  });

  it("the panel is reachable when everything is green", async () => {
    api.GET_ConfigHealth.mockReturnValue(health(GREEN));
    const store = useConfigHealthStore();
    await store.poll();
    store.panelOpen = true;
    const wrapper = mountButton();
    await flushPromises();
    expect(wrapper.get('[data-testid="config-health-ok"]').exists()).toBe(true);
    expect(wrapper.findAll(".cfg-grid__item")).toHaveLength(2);
  });

  it("the banner shows only its own code", async () => {
    api.GET_ConfigHealth.mockReturnValue(
      health([
        SMTP,
        { ...SMTP, code: "toolbox.status", state: "unreachable", scope: "" },
      ])
    );
    await useConfigHealthStore().poll();
    const wrapper = mount(ConfigBanner, {
      props: { code: "toolbox.status" },
      global: { stubs: { RouterLink } },
    });
    const banners = wrapper.findAll('[data-testid="config-banner"]');
    expect(banners).toHaveLength(1);
    expect(banners[0].text()).toContain("AI Toolbox is not responding");
  });
});
