// The engine codes a PriceFighter screen shows (decision reason, rule mode) read as words in both locales, and the
// apply preview prints our price with two decimals, like the Gap Table.
import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";

vi.mock("@/api/pricefighter/api", () => ({ POST_PfApply: vi.fn() }));
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => ({ spawnNotification() {} }) }));

import en from "@/i18n/locales/en.json";
import pl from "@/i18n/locales/pl.json";
import { t } from "@/i18n";
import DataTable from "@/boots/DataTable/index.vue";
import ApplyPreviewModal from "@/views/PriceFighter/components/ApplyPreviewModal.vue";
import { MODES, REASONS, pfLabel } from "@/views/PriceFighter/constants";

const keys = [...REASONS.map((code) => `reason_${code}`), ...MODES.map((code) => `mode_${code}`), "product", "applied_at"];

describe("PriceFighter labels", () => {
  it.each(keys)("pricefighter.%s exists in EN and PL", (key) => {
    expect(String(en.pricefighter[key] ?? "").trim()).not.toBe("");
    expect(String(pl.pricefighter[key] ?? "").trim()).not.toBe("");
  });

  it("the pricefighter namespace has the same keys in EN and PL", () => {
    expect(Object.keys(pl.pricefighter).sort()).toEqual(Object.keys(en.pricefighter).sort());
  });

  it("a known code reads as its label, an unknown one stays raw, none is a dash", () => {
    expect(pfLabel(t, "reason", "in_band")).toBe(t("pricefighter.reason_in_band"));
    expect(pfLabel(t, "reason", "in_band")).not.toBe("in_band");
    expect(pfLabel(t, "reason", "brand_new_reason")).toBe("brand_new_reason");
    expect(pfLabel(t, "mode", "")).toBe("—");
  });
});

describe("ApplyPreviewModal", () => {
  it("prints our price with two decimals", () => {
    const items = [{ sku: "SKU-1", country: "PL", currency: "PLN", channel_idx: "b2c", current_price: "34.9900",
      suggested_price: "31.99", _rowKey: 1 }];
    const wrapper = mount(ApplyPreviewModal, {
      props: { items },
      global: {
        components: { DataTable },
        stubs: { BasicModal: { template: "<div><slot /></div>" }, BasicButton: true, StatusBadge: true },
      },
    });
    expect(wrapper.text()).toContain("34.99");
    expect(wrapper.text()).not.toContain("34.9900");
  });
});
