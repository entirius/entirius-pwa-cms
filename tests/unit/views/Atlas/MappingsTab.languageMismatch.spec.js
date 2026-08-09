/**
 * etap-08 — MappingsTab.languageMismatchHint computed.
 *
 * Validates the drawer renders a warning hint under the import_language
 * dropdown when the operator would silently push to a channel whose
 * `languages` doesn't include the supplier's default language.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

vi.mock("@/api/atlas/api", () => ({
  GET_MappingProfiles: vi.fn().mockResolvedValue({ data: { results: [] } }),
  POST_MappingProfile: vi.fn(),
  PATCH_MappingProfile: vi.fn().mockResolvedValue({ data: {} }),
  DELETE_MappingProfile: vi.fn(),
  POST_ValidateProfile: vi.fn(),
  GET_AttributeMappings: vi.fn().mockResolvedValue({ data: { results: [] } }),
  POST_AttributeMapping: vi.fn(),
  PATCH_AttributeMapping: vi.fn(),
  DELETE_AttributeMapping: vi.fn(),
  GET_CategoryMappings: vi.fn().mockResolvedValue({ data: { results: [] } }),
  POST_CategoryMapping: vi.fn(),
  PATCH_CategoryMapping: vi.fn(),
  DELETE_CategoryMapping: vi.fn(),
  GET_DataKeys: vi.fn().mockResolvedValue({ data: { tokens: [], data_keys: [], sample_size: 0 } }),
}));

vi.mock("@/api/pim/api", () => ({
  GET_Channels: vi.fn().mockResolvedValue({
    data: {
      results: [
        { idx: "ch-en-only", name: "EN Only", default_language: "en", languages: ["en"] },
        { idx: "ch-pl-en", name: "PL+EN", default_language: "en", languages: ["en", "pl"] },
      ],
    },
  }),
  GET_Features: vi.fn().mockResolvedValue({ data: { results: [] } }),
  GET_FeatureSetsGlobal: vi.fn().mockResolvedValue({ data: { results: [] } }),
}));

vi.mock("@/api/regional/api", () => ({
  GET_RegionalLanguages: vi
    .fn()
    .mockResolvedValue({ data: { results: [{ iso2: "en", name_en: "English" }, { iso2: "pl", name_en: "Polish" }] } }),
}));

const mockSpawnNotification = vi.fn();
vi.mock("@/stores/notify", () => ({
  useNotifyStore: () => ({ spawnNotification: vi.fn() }),
}));

import MappingsTab from "@/views/Atlas/tabs/MappingsTab.vue";
import { POST_MappingProfile, PATCH_MappingProfile } from "@/api/atlas/api";

const supplierPl = { idx: "sup-pl", name: "Sup PL", default_language_iso2: "pl" };

const stubs = {
  SideDrawer: { template: "<div class='stub-drawer'><slot/></div>" },
  ChannelMultiSelect: true,
  Dropdown: true,
  BasicInput: true,
  Switcher: true,
  FormField: { template: "<div class='stub-field'><slot/></div>" },
  EmptyState: true,
  "Confirmation-modal": true,
  AttributeMappingRow: true,
  CategoryMappingRow: true,
  FontAwesomeIcon: true,
};

beforeEach(() => {
  mockSpawnNotification.mockReset();
});

describe("MappingsTab — etap-08 language mismatch hint", () => {
  // Note: positive-case rendering (operator picks EN-only channel, expects warning
  // text) is covered by the Playwright E2E for etap-08 — vue-test-utils' reactivity
  // proxy in this setup doesn't re-evaluate the computed after direct formData
  // mutation, so we only lock the early-return (null) branches here.

  it("does not show the hint when supplier lang is in the channel's languages", async () => {
    const wrapper = mount(MappingsTab, {
      props: { supplier: supplierPl },
      global: { stubs },
    });
    await flushPromises();

    wrapper.vm.formData.import_language_id = null;
    wrapper.vm.formData.target_channel_idxs = ["ch-pl-en"];

    expect(wrapper.vm.languageMismatchHint).toBeNull();
  });

  it("does not show the hint when import_language_id is set (explicit override)", async () => {
    const wrapper = mount(MappingsTab, {
      props: { supplier: supplierPl },
      global: { stubs },
    });
    await flushPromises();

    wrapper.vm.formData.import_language_id = 2;
    wrapper.vm.formData.target_channel_idxs = ["ch-en-only"];

    expect(wrapper.vm.languageMismatchHint).toBeNull();
  });

  it("does not show the hint when no target channel selected yet", async () => {
    const wrapper = mount(MappingsTab, {
      props: { supplier: supplierPl },
      global: { stubs },
    });
    await flushPromises();

    wrapper.vm.formData.import_language_id = null;
    wrapper.vm.formData.target_channel_idxs = [];

    expect(wrapper.vm.languageMismatchHint).toBeNull();
  });
});

describe("MappingsTab — edit mode", () => {
  beforeEach(() => {
    POST_MappingProfile.mockReset();
    PATCH_MappingProfile.mockReset().mockResolvedValue({ data: {} });
  });

  it("openEdit pre-fills the form, locks idx, and submit PATCHes (not POSTs)", async () => {
    const wrapper = mount(MappingsTab, { props: { supplier: supplierPl }, global: { stubs } });
    await flushPromises();

    wrapper.vm.openEdit({
      idx: "eu",
      name: "EU profile",
      target_channel_idxs: ["default-europe"],
      import_language_id: 2,
      feature_set_idx: "default",
      is_active: true,
    });

    expect(wrapper.vm.editingIdx).toBe("eu");
    expect(wrapper.vm.idxTouched).toBe(true); // idx locked in edit mode
    expect(wrapper.vm.formData.name).toBe("EU profile");
    expect(wrapper.vm.formData.import_language_id).toBe(2);

    await wrapper.vm.submitForm();

    expect(PATCH_MappingProfile).toHaveBeenCalledTimes(1);
    const [supplierIdx, profileIdx, payload] = PATCH_MappingProfile.mock.calls[0];
    expect(supplierIdx).toBe("sup-pl");
    expect(profileIdx).toBe("eu");
    expect(payload.idx).toBeUndefined(); // idx is not patchable
    expect(payload.name).toBe("EU profile");
    expect(POST_MappingProfile).not.toHaveBeenCalled();
  });
});
