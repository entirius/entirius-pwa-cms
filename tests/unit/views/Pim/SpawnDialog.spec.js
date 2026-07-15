import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";

vi.mock("@/api/enrichment/api", () => ({
  POST_SpawnTask: vi.fn(() => Promise.resolve({ data: {} })),
}));
vi.mock("@/api/pim/api", () => ({
  GET_Features: vi.fn(() => Promise.resolve({ data: { results: [] } })),
}));
vi.mock("@/stores/pimChannel", () => ({
  usePimChannelStore: () => ({
    channels: [{ idx: "c1" }, { idx: "c2" }],
    activeChannelIdx: "c1",
    activeChannelLanguages: ["en", "pl"],
    allLanguages: ["en", "pl"],
  }),
}));
vi.mock("@/stores/notify", () => ({
  useNotifyStore: () => ({ spawnNotification: vi.fn() }),
}));

import SpawnDialog from "@/views/Pim/components/enrichment/SpawnDialog.vue";
import { POST_SpawnTask } from "@/api/enrichment/api";

const stubs = {
  Teleport: true,
  FormField: true,
  Dropdown: true,
  ChannelMultiSelect: true,
  FontAwesomeIcon: true,
};

function build(props = {}) {
  return mount(SpawnDialog, {
    props: { visible: false, skus: ["A", "B"], filterParams: {}, ...props },
    global: { stubs },
  });
}

describe("SpawnDialog payload", () => {
  beforeEach(() => POST_SpawnTask.mockClear());

  it("creates one task per selected channel (M channels -> M tasks)", async () => {
    const w = build();
    w.vm.feature = "description";
    w.vm.languages = ["en", "pl"];
    w.vm.channels = ["c1", "c2"];
    w.vm.scope = "list";
    await w.vm.spawn();

    expect(POST_SpawnTask).toHaveBeenCalledTimes(2);
    const [first] = POST_SpawnTask.mock.calls[0];
    expect(first.type).toBe("fix");
    expect(first.scope_spec).toEqual({ mode: "list", module: "pim", channel: "c1", refs: ["A", "B"] });
    expect(first.params).toEqual({ feature: "description", languages: ["en", "pl"], op: "fix" });
    expect(POST_SpawnTask.mock.calls[1][0].scope_spec.channel).toBe("c2");
  });

  it("uses mode:filter scope and strips pagination keys", async () => {
    const w = build({ skus: [], filterParams: { search: "abc", page: 2, page_size: 20, ordering: "sku", category: "x" } });
    w.vm.feature = "name";
    w.vm.languages = ["en"];
    w.vm.channels = ["c1"];
    w.vm.scope = "filter";
    await w.vm.spawn();

    const [body] = POST_SpawnTask.mock.calls[0];
    expect(body.scope_spec.mode).toBe("filter");
    expect(body.scope_spec.filters).toEqual({ search: "abc", category: "x" });
  });

  it("blocks spawn without a channel (>=1 required)", () => {
    const w = build();
    w.vm.feature = "description";
    w.vm.languages = ["en"];
    w.vm.channels = [];
    w.vm.scope = "list";
    expect(w.vm.canSpawn).toBe(false);
  });

  it("blocks spawn without a feature or language", () => {
    const w = build();
    w.vm.channels = ["c1"];
    w.vm.feature = "";
    w.vm.languages = ["en"];
    expect(w.vm.canSpawn).toBe(false);
    w.vm.feature = "description";
    w.vm.languages = [];
    expect(w.vm.canSpawn).toBe(false);
  });
});
