import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

// The order confirmation and cancellation templates (order e-mail plan 03): their fields, and a preview of the
// saved wording next to the form that reloads only after a save.
const mockGetTemplate = vi.fn();
const mockPatchTemplate = vi.fn();
const mockGetPreview = vi.fn();
vi.mock("@/api/emails/api", () => ({
  GET_EmailTemplate: (...a) => mockGetTemplate(...a),
  PATCH_EmailTemplate: (...a) => mockPatchTemplate(...a),
  GET_EmailTemplatePreview: (...a) => mockGetPreview(...a),
}));
vi.mock("@/stores/loader", () => ({ useLoaderStore: () => ({ loaderStart() {}, loaderFinish() {} }) }));
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => ({ spawnNotification: vi.fn() }) }));

import EmailTemplateEdit from "@/views/Emails/EmailTemplateEdit.vue";
import EmailPreview from "@/views/Emails/components/EmailPreview.vue";

const PREVIEW = { subject: "Order 0100 — confirmation", html: "<p>Hi</p>", text: "Hi" };
const PreviewStub = { name: "EmailPreview", props: ["emailType", "language", "version", "dirty"], template: "<aside />" };

function mountEdit(emailType) {
  return mount(EmailTemplateEdit, {
    global: {
      mocks: { $route: { params: { emailType, pk: "3" }, query: {}, path: "/" } },
      stubs: { PageHeader: true, BasicCard: { template: "<section><slot /></section>" }, BasicTextarea: true, BasicWysiwyg: true, EmailPreview: PreviewStub },
    },
  });
}

describe("EmailTemplateEdit — order templates", () => {
  beforeEach(() => {
    mockGetTemplate.mockReset().mockResolvedValue({ data: { pk: 3, language_code: "PL", subject: "S", heading: "H", split_note: null } });
    mockPatchTemplate.mockReset().mockImplementation((_, __, payload) => Promise.resolve({ data: { pk: 3, language_code: "pl", ...payload } }));
  });

  it.each([
    ["checkout-order-confirmation", 10],
    ["checkout-order-canceled", 6],
  ])("%s renders its %i fields, the subject naming <order_number>", async (type, count) => {
    const wrapper = mountEdit(type);
    await flushPromises();
    const fields = wrapper.findAllComponents({ name: "FormField" });
    expect(fields).toHaveLength(count);
    expect(fields[0].attributes("hint")).toBe("emails.field_hints.order_number");
    expect(fields.every((field) => field.attributes("hint"))).toBe(true);
  });

  it("shows the preview of the template's type and language", async () => {
    const wrapper = mountEdit("checkout-order-canceled");
    await flushPromises();
    const preview = wrapper.findComponent(PreviewStub);
    expect(preview.props()).toMatchObject({ emailType: "checkout-order-canceled", language: "pl", version: 0, dirty: false });
    expect(mockGetTemplate).toHaveBeenCalledWith("checkout-order-canceled", "3");
  });

  it("an edit marks the preview dirty; a save reloads it and clears the mark", async () => {
    const wrapper = mountEdit("checkout-order-confirmation");
    await flushPromises();
    wrapper.vm.template.heading = "New heading";
    await flushPromises();
    expect(wrapper.findComponent(PreviewStub).props("dirty")).toBe(true);

    await wrapper.vm.save();
    await flushPromises();
    expect(wrapper.findComponent(PreviewStub).props()).toMatchObject({ dirty: false, version: 1 });
  });

  it("a field the API sent empty and the user cleared again is not an unsaved change", async () => {
    const wrapper = mountEdit("checkout-order-confirmation");
    await flushPromises();
    wrapper.vm.template.split_note = "";
    await flushPromises();
    expect(wrapper.findComponent(PreviewStub).props("dirty")).toBe(false);
  });

  it("a type without a preview endpoint has no preview column", async () => {
    const wrapper = mountEdit("accounts-new-account");
    await flushPromises();
    expect(wrapper.findComponent(PreviewStub).exists()).toBe(false);
  });
});

const SegmentedStub = { name: "SegmentedControl", props: ["options", "modelValue"], emits: ["update:modelValue"], template: "<div />" };

function mountPreview(props) {
  return mount(EmailPreview, {
    props: { emailType: "checkout-order-confirmation", language: "pl", ...props },
    global: {
      stubs: {
        BasicCard: { template: "<section><slot /></section>" },
        SegmentedControl: SegmentedStub,
        BasicSwitch: true,
        EmptyState: { name: "EmptyState", template: "<div><slot /></div>" },
        BasicButton: { template: "<button @click=\"$emit('click')\"><slot /></button>" },
      },
    },
  });
}

describe("EmailPreview", () => {
  beforeEach(() => mockGetPreview.mockReset().mockResolvedValue({ data: PREVIEW }));

  it.each([
    ["checkout-order-confirmation", ["transfer", "cod", "paid", "split"]],
    ["checkout-order-canceled", ["unpaid", "paid"]],
  ])("%s offers its variants", async (emailType, values) => {
    const wrapper = mountPreview({ emailType });
    await flushPromises();
    const [variants] = wrapper.findAllComponents(SegmentedStub);
    expect(variants.props("options").map((option) => option.value)).toEqual(values);
  });

  it("loads the first variant in the template's language into a sandboxed frame", async () => {
    const wrapper = mountPreview();
    await flushPromises();
    expect(mockGetPreview).toHaveBeenCalledWith("checkout-order-confirmation", { variant: "transfer", language: "pl" });
    const frame = wrapper.find('[data-testid="email-preview-frame"]');
    expect(frame.attributes("sandbox")).toBe("");
    expect(frame.attributes("srcdoc")).toBe(PREVIEW.html);
    expect(wrapper.find('[data-testid="email-preview-subject"]').text()).toBe(PREVIEW.subject);
  });

  it("requests the chosen variant", async () => {
    const wrapper = mountPreview();
    await flushPromises();
    wrapper.findAllComponents(SegmentedStub)[0].vm.$emit("update:modelValue", "split");
    await flushPromises();
    expect(mockGetPreview).toHaveBeenLastCalledWith("checkout-order-confirmation", { variant: "split", language: "pl" });
  });

  it("switches the frame width and shows the text part", async () => {
    const wrapper = mountPreview();
    await flushPromises();
    wrapper.findAllComponents(SegmentedStub)[1].vm.$emit("update:modelValue", "phone");
    await flushPromises();
    expect(wrapper.find('[data-testid="email-preview-frame"]').classes()).toContain("email-preview__frame--phone");

    wrapper.findComponent({ name: "BasicSwitch" }).vm.$emit("update:modelValue", true);
    await flushPromises();
    expect(wrapper.find('[data-testid="email-preview-text"]').text()).toBe(PREVIEW.text);
    expect(wrapper.find('[data-testid="email-preview-frame"]').exists()).toBe(false);
  });

  it("unsaved changes show the note and keep the old preview until the next save", async () => {
    const wrapper = mountPreview();
    await flushPromises();
    await wrapper.setProps({ dirty: true });
    await flushPromises();
    expect(wrapper.find('[data-testid="email-preview-dirty"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="email-preview-frame"]').exists()).toBe(true);
    expect(mockGetPreview).toHaveBeenCalledTimes(1);

    await wrapper.setProps({ dirty: false, version: 1 });
    await flushPromises();
    expect(mockGetPreview).toHaveBeenCalledTimes(2);
  });

  it("a slower answer to an earlier variant never replaces the later one", async () => {
    let answerFirst;
    mockGetPreview.mockReset()
      .mockReturnValueOnce(new Promise((resolve) => { answerFirst = resolve; }))
      .mockResolvedValue({ data: { ...PREVIEW, subject: "split" } });
    const wrapper = mountPreview();
    wrapper.findAllComponents(SegmentedStub)[0].vm.$emit("update:modelValue", "split");
    await flushPromises();
    answerFirst({ data: { ...PREVIEW, subject: "transfer" } });
    await flushPromises();
    expect(wrapper.find('[data-testid="email-preview-subject"]').text()).toBe("split");
  });

  it("a failed load shows the error state, and retry loads again", async () => {
    mockGetPreview.mockReset().mockRejectedValueOnce(new Error("offline")).mockResolvedValue({ data: PREVIEW });
    const wrapper = mountPreview();
    await flushPromises();
    expect(wrapper.find('[data-testid="email-preview-error"]').exists()).toBe(true);

    await wrapper.find('[data-testid="email-preview-error"] button').trigger("click");
    await flushPromises();
    expect(wrapper.find('[data-testid="email-preview-error"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="email-preview-frame"]').exists()).toBe(true);
  });
});
