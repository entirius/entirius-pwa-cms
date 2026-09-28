import { describe, it, expect, vi, beforeEach } from "vitest";
import { defineComponent, h, nextTick, reactive, ref } from "vue";
import { mount } from "@vue/test-utils";

const route = reactive({ path: "/points/5", meta: { panel: "points", titleKey: "dp.create_point", navParent: "/points/list" }, params: {}, query: {}, matched: [] });
const push = vi.fn();
vi.mock("vue-router", () => ({
  useRoute: () => route,
  useRouter: () => ({ push, back: vi.fn(), resolve: (to) => ({ path: typeof to === "string" ? to : to.path }), getRoutes: () => [] }),
}));
vi.mock("@/stores/munin", () => ({ useMuninStore: () => ({ isPanelEnabled: () => true, isModuleEnabled: () => true }) }));
vi.mock("@/stores/quality", () => ({ useQualityStore: () => ({ available: true }) }));

import ShellPageHeader from "@/components/Shell/ShellPageHeader.vue";
import PageHeader from "@/boots/PageHeader/index.vue";
import { t } from "@/i18n";

const RouterLink = { props: ["to"], template: "<a><slot /></a>" };
const View = defineComponent({
  props: { show: Boolean },
  setup: (props) => () => (props.show ? h(PageHeader, { title: "Warehouse 5" }) : h("p", "content")),
});
const mountShell = (show) => {
  const shown = ref(show);
  const wrapper = mount({ render: () => h(ShellPageHeader, null, { default: () => h(View, { show: shown.value }) }) }, {
    global: { stubs: { RouterLink } },
  });
  return { wrapper, shown };
};

beforeEach(() => {
  route.matched = [{ meta: { titleKey: "dp.create_point" } }];
  push.mockClear();
});

describe("ShellPageHeader", () => {
  it("without a PageHeader renders the fallback: the crumbs and one H1 from titleKey", () => {
    const { wrapper } = mountShell(false);
    const h1s = wrapper.findAll("h1");
    expect(h1s).toHaveLength(1);
    expect(h1s[0].text()).toBe(t("dp.create_point"));
    expect(h1s[0].attributes("data-fid")).toBe("page-title");
    expect(wrapper.findAll(".breadcrumbs__label").map((label) => label.text())).toEqual([t("panels.points"), t("nav.dp_points"), t("dp.create_point")]);
  });

  it("a view's PageHeader claims the slot: one H1, the shell's crumbs end with its title, the back arrow is the shell's", async () => {
    const { wrapper, shown } = mountShell(true);
    await nextTick();
    expect(wrapper.findAll("h1").map((h1) => h1.text())).toEqual(["Warehouse 5"]);
    expect(wrapper.findAll(".breadcrumbs__label").at(-1).text()).toBe("Warehouse 5");
    await wrapper.get(".icon-button").trigger("click");
    expect(push).toHaveBeenCalledWith({ path: "/points/list", query: {} });
    shown.value = false;
    await nextTick();
    await nextTick();
    expect(wrapper.findAll("h1").map((h1) => h1.text())).toEqual([t("dp.create_point")]);
  });

  it("names the browser tab <page> · <panel> · Entirius CMS", async () => {
    mountShell(true);
    await nextTick();
    expect(document.title).toBe(`Warehouse 5 · ${t("panels.points")} · Entirius CMS`);
  });
});
