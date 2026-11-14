import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";

const route = vi.hoisted(() => ({ meta: {} }));
vi.mock("vue-router", () => ({
  useRoute: () => route,
  useRouter: () => ({ resolve: (path) => ({ meta: path === "/leads/today" ? { titleKey: "leads.today.title" } : {} }) }),
}));
import EmptyState from "@/boots/EmptyState/index.vue";
import NotFound from "@/views/NotFound/NotFound.vue";

const mountView = () =>
  mount(NotFound, { global: { components: { EmptyState }, stubs: { EmptyState: false, RouterLink: { props: ["to"], template: '<a :href="to"><slot /></a>' } } } });

// S5 (walk 3): an unknown address says so and leads to the start of its panel (Leads: Today), else Home.
describe("NotFound", () => {
  it("links to the start page of the address's panel", () => {
    route.meta = { panel: "leads" };
    const link = mountView().get('[data-testid="not-found-start"]');
    expect(link.attributes("href")).toBe("/leads/today");
    expect(link.text()).toBe("Go to Today");
  });

  it("outside every panel links Home", () => {
    route.meta = { panel: null };
    expect(mountView().get('[data-testid="not-found-start"]').attributes("href")).toBe("/");
  });
});
