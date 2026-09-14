import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

const api = vi.hoisted(() => ({ GET_Template: vi.fn(), GET_Models: vi.fn(), PUT_Template: vi.fn(), POST_TestGenerate: vi.fn() }));
const leads = vi.hoisted(() => ({ GET_Companies: vi.fn(), GET_Company: vi.fn() }));
vi.mock("@/api/communicator/api", () => api);
vi.mock("@/api/leads/api", () => leads);
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => ({ spawnNotification: vi.fn() }) }));
vi.mock("vue-router", () => ({ useRoute: () => ({ params: { id: "3" } }) }));

import TemplateEdit from "@/views/Communicator/TemplateEdit.vue";
import TestGenerate from "@/views/Communicator/TestGenerate.vue";

const template = { key: "cold", kind: "ai_prompt", language: "pl", subject: "Hi", body: "b", model: "fake-chat", json_schema: null, requires_legal_footer: true, auto_approve: false, is_active: true };

describe("Communicator TemplateEdit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.GET_Template.mockResolvedValue({ data: template });
    api.GET_Models.mockResolvedValue({ data: { results: [{ provider: "fake", model_id: "fake-chat" }] } });
  });

  async function mountEdit() {
    const wrapper = mount(TemplateEdit, { global: { stubs: { RouterLink: true, SideDrawer: true } } });
    await flushPromises();
    return wrapper;
  }

  it("refuses invalid JSON schema and a non-object, saves a valid one parsed", async () => {
    api.PUT_Template.mockResolvedValue({ data: template });
    const wrapper = await mountEdit();
    const schema = wrapper.find('[data-testid="template-schema"]');
    await schema.setValue("{oops");
    expect(wrapper.find('[data-testid="template-schema-error"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="template-save"]').attributes("disabled")).toBeDefined();
    await schema.setValue("[1]");
    expect(wrapper.find('[data-testid="template-schema-error"]').exists()).toBe(true);
    await schema.setValue('{"type": "object"}');
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(api.PUT_Template).toHaveBeenCalledWith("3", expect.objectContaining({ json_schema: { type: "object" }, auto_approve: false }));
  });

  it("offers the models from GET models/", async () => {
    const wrapper = await mountEdit();
    expect(wrapper.find('[data-testid="template-model"]').text()).toContain("fake-chat (fake)");
  });

  it("test generate shows the preview and never saves the template", async () => {
    leads.GET_Companies.mockResolvedValue({ data: { results: [{ id: 9, domain: "shop.test" }] } });
    leads.GET_Company.mockResolvedValue({ data: { id: 9, name: "Shop", domain: "shop.test", hooks: [], contacts: [{ is_primary: true, first_name: "Anna" }] } });
    api.POST_TestGenerate.mockResolvedValue({ data: { subject: "Subj", body_text: "One\n\nTwo" } });
    const wrapper = mount(TestGenerate, { props: { templateId: "3" } });
    await wrapper.find('[data-testid="test-generate-search"]').setValue("shop");
    await flushPromises();
    await wrapper.find('[data-testid="test-generate-company"]').trigger("click");
    await flushPromises();
    expect(api.POST_TestGenerate).toHaveBeenCalledWith("3", expect.objectContaining({ company_name: "Shop", first_name: "Anna" }));
    expect(wrapper.find('[data-testid="test-generate-subject"]').text()).toBe("Subj");
    expect(wrapper.findAll("article p")).toHaveLength(3);
    expect(api.PUT_Template).not.toHaveBeenCalled();
  });
});
