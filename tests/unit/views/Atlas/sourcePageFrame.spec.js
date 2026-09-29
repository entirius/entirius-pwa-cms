import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

// P5 Atlas sources (plan 47): the bindings that moved — OverviewTab's Save into SourceDetail's PageHeader, the
// product drawer's footer into an ActionBar, the category mapping's source value onto EntitySearchPicker.

const mockGetSource = vi.fn();
const mockGetDataValues = vi.fn();
const mockGetSupplierProducts = vi.fn();

vi.mock("@/api/atlas/api", async (importOriginal) => ({
  ...(await importOriginal()),
  GET_Source: (...args) => mockGetSource(...args),
  GET_DataValues: (...args) => mockGetDataValues(...args),
  GET_SupplierProducts: (...args) => mockGetSupplierProducts(...args),
}));
vi.mock("@/api/pim/api", () => ({ GET_Categories: vi.fn() }));
vi.mock("@/stores/notify", () => ({
  useNotifyStore: () => ({ spawnNotification: vi.fn() }),
}));
vi.mock("@/stores/munin", () => ({
  useMuninStore: () => ({ isPanelEnabled: () => true }),
}));
vi.mock("@/stores/regional", () => ({
  useRegionalStore: () => ({
    fetchAll: vi.fn(),
    languageOptions: [],
    currencyOptions: [],
    countryOptions: [],
  }),
}));

import SourceDetail from "@/views/Atlas/SourceDetail.vue";
import OverviewTab from "@/views/Atlas/tabs/OverviewTab.vue";
import ProductsTab from "@/views/Atlas/tabs/ProductsTab.vue";
import CategoryMappingRow from "@/views/Atlas/components/CategoryMappingRow.vue";

const supplier = { idx: "acme", name: "Acme Corp", kind: "procurement" };
const $t = (key) => key;

function mountDetail(query = {}) {
  return mount(SourceDetail, {
    global: {
      mocks: {
        $t,
        $route: { params: { idx: "acme" }, query, path: "/atlas/acme" },
        $router: { replace: vi.fn() },
      },
      stubs: {
        PageLayout: { template: "<div><slot name='header'/><slot name='toolbar'/><slot/></div>" },
        PageHeader: { props: ["title", "back"], template: "<header><slot name='actions'/></header>" },
        ActionBar: { props: ["actions"], template: "<div class='stub-actions'/>" },
        BasicTabs: { props: ["options", "modelValue", "idPrefix"], template: "<div class='stub-tabs'/>" },
        Loader: true,
        EmptyState: true,
        OverviewTab: {
          name: "OverviewTab",
          emits: ["header-actions"],
          template: "<div class='stub-overview'/>",
        },
        FeedsTab: { name: "FeedsTab", template: "<div class='stub-feeds'/>" },
        MappingsTab: true,
        ProductsTab: true,
        LinkedTab: true,
        LogsTab: true,
      },
    },
  });
}

describe("SourceDetail — page frame", () => {
  beforeEach(() => {
    mockGetSource.mockReset();
  });

  it("puts the actions the open tab emits into the PageHeader ActionBar", async () => {
    mockGetSource.mockResolvedValue({ data: supplier });
    const wrapper = mountDetail();
    await flushPromises();
    expect(wrapper.find(".stub-actions").exists()).toBe(false);

    const save = [{ key: "save", label: "Save", role: "primary", onClick: vi.fn() }];
    wrapper.findComponent({ name: "OverviewTab" }).vm.$emit("header-actions", save);
    await flushPromises();
    expect(wrapper.findComponent(".stub-actions").props("actions")).toEqual(save);
  });

  it("names the tab panel after the visible tab, falling back to overview for a hidden one", async () => {
    mockGetSource.mockResolvedValue({ data: { ...supplier, kind: "monitoring" } });
    const wrapper = mountDetail({ tab: "mappings" });
    await flushPromises();
    const panel = wrapper.find("[role='tabpanel']");
    expect(panel.attributes("id")).toBe("atlas-source-panel-overview");
    expect(panel.attributes("aria-labelledby")).toBe("atlas-source-tab-overview");
    const tabs = wrapper.findComponent(".stub-tabs");
    expect(tabs.props("modelValue")).toBe("overview");
    expect(tabs.props("options").map((o) => o.testid)).not.toContain("suppliers-tab-mappings");
  });

  it("shows the empty state when the source does not load", async () => {
    mockGetSource.mockRejectedValue(new Error("404"));
    const wrapper = mountDetail();
    await flushPromises();
    expect(wrapper.find("empty-state-stub").exists()).toBe(true);
    expect(wrapper.find("[role='tabpanel']").exists()).toBe(false);
  });
});

describe("OverviewTab — Save in the page header", () => {
  function mountOverview() {
    return mount(OverviewTab, {
      props: { supplier: { ...supplier, sku_prefix: "AC" } },
      global: {
        mocks: { $t },
        stubs: {
          FormField: { template: "<div><slot/></div>" },
          BasicInput: true,
          BasicSelect: true,
          BasicSwitch: true,
          NumberInput: true,
        },
      },
    });
  }
  const lastActions = (wrapper) => wrapper.emitted("header-actions").at(-1)[0];

  it("emits a disabled primary Save until the form is dirty", async () => {
    const wrapper = mountOverview();
    const [save] = lastActions(wrapper);
    expect(save).toMatchObject({ key: "save", role: "primary", disabled: true, testid: "suppliers-overview-save" });

    wrapper.vm.$data.form.name = "Acme Renamed";
    await flushPromises();
    expect(lastActions(wrapper)[0].disabled).toBe(false);
  });

  it("clears the header actions when it unmounts", () => {
    const wrapper = mountOverview();
    wrapper.unmount();
    expect(lastActions(wrapper)).toEqual([]);
  });
});

describe("ProductsTab — drawer ActionBar", () => {
  function mountProducts() {
    mockGetSupplierProducts.mockResolvedValue({ data: { results: [], count: 0 } });
    return mount(ProductsTab, {
      props: { supplier },
      global: { mocks: { $t }, stubs: { DataTable: true, SideDrawer: true, BulkActionBar: true, FilterChip: true } },
    });
  }
  const keysFor = async (wrapper, status) => {
    wrapper.vm.$data.detailProduct = { id: 1, status };
    await flushPromises();
    return wrapper.vm.detailActions.map((a) => `${a.key}:${a.role}`);
  };

  it("offers the actions of each status, with one primary at most", async () => {
    const wrapper = mountProducts();
    expect(await keysFor(wrapper, "new")).toEqual(["approve:primary", "skip:secondary", "reject:danger"]);
    expect(await keysFor(wrapper, "queued")).toEqual(["approve:primary", "reject:danger"]);
    expect(await keysFor(wrapper, "approved")).toEqual(["reject:danger", "push:primary"]);
    expect(await keysFor(wrapper, "pushed")).toEqual(["repush:primary"]);
  });

  it("disables the drawer actions while one is in flight", async () => {
    const wrapper = mountProducts();
    wrapper.vm.$data.detailProduct = { id: 1, status: "new" };
    wrapper.vm.$data.detailBusy = true;
    await flushPromises();
    expect(wrapper.vm.detailActions.every((a) => a.disabled)).toBe(true);
  });
});

describe("CategoryMappingRow — source value picker", () => {
  function mountRow(local = {}) {
    const wrapper = mount(CategoryMappingRow, {
      props: { supplierIdx: "acme" },
      global: { mocks: { $t }, stubs: { FormField: true, EntitySearchPicker: true, BasicInput: true } },
    });
    Object.assign(wrapper.vm.$data.local, local);
    return wrapper;
  }

  beforeEach(() => {
    mockGetDataValues.mockReset();
  });

  it("lists the feed's values of the chosen source field with their counts", async () => {
    mockGetDataValues.mockResolvedValue({ data: { values: [{ value: "Drills", count: 12 }] } });
    const wrapper = mountRow({ source_field: "category" });
    const options = await wrapper.vm.sourceValueFetchFn("");
    expect(mockGetDataValues).toHaveBeenCalledWith("acme", { source_field: "category" });
    expect(options).toEqual([
      { value: "Drills", label: "Drills", secondary: "12 atlas.mappings.category.source_value_picker_count_suffix" },
    ]);
  });

  it("offers the typed text first, filters the values, and asks once per source field", async () => {
    mockGetDataValues.mockResolvedValue({
      data: { values: [{ value: "Drills", count: 12 }, { value: "Saws", count: 3 }] },
    });
    const wrapper = mountRow({ source_field: "category" });
    const options = await wrapper.vm.sourceValueFetchFn("dri");
    expect(options.map((o) => o.value)).toEqual(["dri", "Drills"]);
    expect((await wrapper.vm.sourceValueFetchFn("Saws")).map((o) => o.value)).toEqual(["Saws"]);
    expect(mockGetDataValues).toHaveBeenCalledTimes(1);
  });

  it("keeps free text when the values fail to load, and asks nothing before a source field is chosen", async () => {
    mockGetDataValues.mockRejectedValueOnce(new Error("500"));
    mockGetDataValues.mockResolvedValueOnce({ data: { values: [{ value: "Hammers", count: 2 }] } });
    const wrapper = mountRow({ source_field: "category" });
    expect(await wrapper.vm.sourceValueFetchFn("Hammers")).toEqual([{ value: "Hammers", label: "Hammers" }]);
    // The failure is not cached: the next open asks again.
    expect((await wrapper.vm.sourceValueFetchFn("Hammers"))[0].secondary).toBeDefined();

    const empty = mountRow();
    mockGetDataValues.mockClear();
    expect(await empty.vm.sourceValueFetchFn("")).toEqual([]);
    expect(mockGetDataValues).not.toHaveBeenCalled();
  });
});
