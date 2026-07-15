import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

const mockGetGaps = vi.fn();

vi.mock("@/api/pim/api", () => ({
  GET_BulkProductGaps: (...args) => mockGetGaps(...args),
}));

import QualityTab from "@/views/Pim/components/QualityTab.vue";

const findingsFor = (pk) => ({
  data: {
    results: {
      [String(pk)]: [
        {
          definition_key: "pl-description",
          label_t9n: { en: "Missing description", pl: "Brak opisu" },
          severity: "critical",
          language: "pl",
          inherited: true,
          source_channel: "default-europe",
        },
      ],
    },
  },
});

describe("QualityTab", () => {
  beforeEach(() => mockGetGaps.mockReset());

  it("fetches findings for the product PK and renders them", async () => {
    mockGetGaps.mockResolvedValueOnce(findingsFor(5));

    const wrapper = mount(QualityTab, {
      props: { productPk: 5, channelIdx: "default-europe", evaluatedAt: "2026-06-07T10:00:00+00:00" },
    });
    await flushPromises();

    expect(mockGetGaps).toHaveBeenCalledWith("default-europe", [5]);
    expect(wrapper.findAll('[data-test="quality-finding"]').length).toBe(1);
  });

  it("shows no findings (empty state) when evaluated with zero gaps", async () => {
    mockGetGaps.mockResolvedValueOnce({ data: { results: {} } });

    const wrapper = mount(QualityTab, {
      props: { productPk: 7, channelIdx: "ch", evaluatedAt: "2026-06-07T10:00:00+00:00" },
    });
    await flushPromises();

    expect(wrapper.findAll('[data-test="quality-finding"]').length).toBe(0);
  });

  it("renders the unevaluated empty state without listing findings (evaluatedAt null)", async () => {
    mockGetGaps.mockResolvedValueOnce({ data: { results: {} } });

    const wrapper = mount(QualityTab, {
      props: { productPk: 1, channelIdx: "ch", evaluatedAt: null },
    });
    await flushPromises();

    expect(wrapper.findAll('[data-test="quality-finding"]').length).toBe(0);
    expect(wrapper.find('[data-test="quality-tab"]').exists()).toBe(true);
  });

  it("soft-compat: a 404 from the findings endpoint falls back to empty, no throw", async () => {
    mockGetGaps.mockRejectedValueOnce({ response: { status: 404 } });

    const wrapper = mount(QualityTab, {
      props: { productPk: 9, channelIdx: "ch", evaluatedAt: "2026-06-07T10:00:00+00:00" },
    });
    await flushPromises();

    expect(wrapper.vm.findings).toEqual([]);
    expect(wrapper.findAll('[data-test="quality-finding"]').length).toBe(0);
  });
});
