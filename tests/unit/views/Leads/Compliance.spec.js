import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { t } from "@/i18n";
import BasicButton from "@/boots/BasicButton/index.vue";
import BasicInput from "@/boots/BasicInput/index.vue";
import StatusBadge from "@/boots/StatusBadge/index.vue";
import FilterChip from "@/boots/FilterChip/index.vue";

const api = vi.hoisted(() => ({
  GET_SendCheck: vi.fn(),
  GET_DoNotContact: vi.fn(),
  POST_DoNotContact: vi.fn(),
  GET_Contacts: vi.fn(),
  GET_VerificationReport: vi.fn(),
  POST_VerifyContact: vi.fn(),
  GET_Company: vi.fn(() => Promise.resolve({ data: { name: "Shop One" } })),
}));
vi.mock("@/api/leads/api", () => api);

import SendCheckDialog from "@/views/Leads/SendCheckDialog.vue";
import DoNotContactDialog from "@/views/Leads/DoNotContactDialog.vue";
import DoNotContact from "@/views/Leads/DoNotContact.vue";
import Addresses from "@/views/Leads/Addresses.vue";
import { leadsFrame } from "./leadsFrame";

const modal = { props: ["open", "title"], template: '<div v-if="open"><h2>{{ title }}</h2><slot /><slot name="footer" /></div>' };
const confirmWithSlot = {
  props: ["open", "title", "confirmTestid"],
  emits: ["confirm", "cancel"],
  template: `<div v-if="open" data-testid="dnc-dialog">{{ title }}<slot />
    <button data-testid="confirm-dialog-cancel" @click="$emit('cancel')" />
    <button :data-testid="confirmTestid" @click="$emit('confirm')" /></div>`,
};
const RouterLink = { props: ["to"], template: "<a :data-to='JSON.stringify(to)'><slot /></a>" };
const global = {
  components: leadsFrame.components,
  stubs: { ...leadsFrame.stubs, BasicButton, BasicInput, StatusBadge, FilterChip, BasicModal: modal, ConfirmDialog: confirmWithSlot, RouterLink, Loader: true, BasicRadioGroup: { name: "BasicRadioGroup", props: ["modelValue", "options"], template: "<div />" } },
};

const check = (fields = {}) => ({
  contact_id: 5, company_id: 7, eligible: false, reasons: ["email_invalid", "opted_out_elsewhere"],
  legal_basis: { value: "legitimate_interest", consent_ref: "", source: "import", set_at: "2026-10-01T10:00:00Z" },
  email: { status: "invalid", reason: "domain_not_found", verified_at: "2026-11-06T10:00:00Z" },
  opt_out_at: null, company_do_not_contact: false,
  retention: { days: 180, exempt_won: false, anonymised_at: null, due_at: "2027-05-01T10:00:00Z" }, sender_route: "ecomhouse", ...fields,
});

beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
});

// Q7: "why will this contact not get our mail?"
describe("Send-check dialog", () => {
  it("reads the report when it opens and lists every reason with its facts", async () => {
    api.GET_SendCheck.mockResolvedValue({ data: check() });
    const wrapper = mount(SendCheckDialog, { props: { open: true, contact: { id: 5, email: "a@shop.pl" } }, global });
    await flushPromises();
    expect(api.GET_SendCheck).toHaveBeenCalledWith(5);
    expect(wrapper.get('[data-testid="sendcheck-verdict"]').text()).toContain("leads.sendcheck.blocked");
    expect(wrapper.findAll('[data-testid="sendcheck-reason"]').map((li) => li.attributes("data-reason"))).toEqual(["email_invalid", "opted_out_elsewhere"]);
    expect(wrapper.get('[data-testid="sendcheck-reasons"]').text()).toContain(t("leads.block_reason.opted_out_elsewhere"));
    expect(wrapper.get('[data-testid="sendcheck-facts"]').text()).toContain("ecomhouse");
    expect(wrapper.get('[data-testid="sendcheck-facts"]').text()).toContain(t("leads.addresses.reason.domain_not_found"));
  });

  it("an eligible contact has no reasons; nothing is read while closed; a failure is a sentence", async () => {
    api.GET_SendCheck.mockResolvedValue({ data: check({ eligible: true, reasons: [] }) });
    const wrapper = mount(SendCheckDialog, { props: { open: false, contact: { id: 5, email: "a@shop.pl" } }, global });
    await flushPromises();
    expect(api.GET_SendCheck).not.toHaveBeenCalled();
    await wrapper.setProps({ open: true });
    await flushPromises();
    expect(wrapper.find('[data-testid="sendcheck-reasons"]').exists()).toBe(false);
    api.GET_SendCheck.mockRejectedValue({ response: { data: { detail: "nope" } } });
    await wrapper.setProps({ open: false });
    await wrapper.setProps({ open: true });
    await flushPromises();
    expect(wrapper.get('[data-testid="sendcheck-error"]').text()).toBe("nope");
  });
});

describe("Do-not-contact dialog", () => {
  const open = (props) => mount(DoNotContactDialog, { props: { open: true, ...props }, global });

  it("warns that there is no way back, needs a reason, then blocks the address", async () => {
    api.POST_DoNotContact.mockResolvedValue({ data: { contacts: 1, companies: 0 } });
    const wrapper = open({ contact: { id: 5, email: "Anna@Shop.pl" } });
    expect(wrapper.get('[data-testid="dnc-warning"]').text()).toBe("leads.dnc.warning");
    await wrapper.get('[data-testid="dnc-confirm"]').trigger("click");
    expect(api.POST_DoNotContact).not.toHaveBeenCalled();
    expect(wrapper.get('[data-testid="dnc-error"]').text()).toBe(t("leads.dnc.reason_required"));
    await wrapper.get('[data-testid="dnc-reason"] input').setValue("asked by phone");
    await wrapper.get('[data-testid="dnc-confirm"]').trigger("click");
    await flushPromises();
    expect(api.POST_DoNotContact).toHaveBeenCalledWith({ email: "Anna@Shop.pl", reason: "asked by phone" });
    expect(wrapper.emitted("done")[0][0]).toMatchObject({ contacts: 1, email: "Anna@Shop.pl" });
  });

  it("the whole domain can be chosen instead of the address", async () => {
    api.POST_DoNotContact.mockResolvedValue({ data: { contacts: 0, companies: 2 } });
    const wrapper = open({ contact: { id: 5, email: "Anna@Shop.pl" } });
    wrapper.getComponent({ name: "BasicRadioGroup" }).vm.$emit("update:modelValue", "domain");
    await wrapper.get('[data-testid="dnc-reason"] input').setValue("bad fit");
    await wrapper.get('[data-testid="dnc-confirm"]').trigger("click");
    await flushPromises();
    expect(api.POST_DoNotContact).toHaveBeenCalledWith({ domain: "shop.pl", reason: "bad fit" });
  });

  it("without a contact it asks for the address or domain itself; an API refusal stays in the dialog", async () => {
    const wrapper = open({ contact: null });
    await wrapper.get('[data-testid="dnc-reason"] input').setValue("legal request");
    await wrapper.get('[data-testid="dnc-confirm"]').trigger("click");
    expect(wrapper.get('[data-testid="dnc-error"]').text()).toBe(t("leads.dnc.target_required"));
    api.POST_DoNotContact.mockRejectedValue({ response: { data: { detail: "invalid domain" } } });
    await wrapper.get('[data-testid="dnc-domain"] input').setValue("Not A Domain");
    await wrapper.get('[data-testid="dnc-confirm"]').trigger("click");
    await flushPromises();
    expect(api.POST_DoNotContact).toHaveBeenCalledWith({ domain: "not a domain", reason: "legal request" });
    expect(wrapper.get('[data-testid="dnc-error"]').text()).toBe("invalid domain");
    expect(wrapper.emitted("done")).toBeUndefined();
  });
});

describe("Do-not-contact list", () => {
  it("shows addresses, domains and suppressions; there is no remove button", async () => {
    api.GET_DoNotContact.mockResolvedValue({
      data: {
        contacts: [{ email: "a@shop.pl", channel: "default-europe", opt_out_at: "2026-11-01T10:00:00Z" }],
        companies: [{ domain: "bad.pl", channel: "default-europe" }],
        suppressions: [{ kind: "domain", value: "spam.pl", channel: null, reason: "manual" }],
      },
    });
    const wrapper = mount(DoNotContact, { global });
    await flushPromises();
    expect(wrapper.get('[data-testid="dnc-contacts"]').text()).toContain("a@shop.pl");
    expect(wrapper.get('[data-testid="dnc-companies"]').text()).toContain("bad.pl");
    expect(wrapper.get('[data-testid="dnc-suppressions"]').text()).toContain("spam.pl");
    expect(wrapper.findAll("button").map((b) => b.attributes("data-testid"))).toEqual(["dnc-add"]);
  });

  it("adding re-reads the list and says what changed", async () => {
    api.GET_DoNotContact.mockResolvedValue({ data: { contacts: [], companies: [], suppressions: [] } });
    api.POST_DoNotContact.mockResolvedValue({ data: { contacts: 0, companies: 1 } });
    const wrapper = mount(DoNotContact, { global });
    await flushPromises();
    await wrapper.get('[data-testid="dnc-add"]').trigger("click");
    await wrapper.get('[data-testid="dnc-domain"] input').setValue("bad.pl");
    await wrapper.get('[data-testid="dnc-reason"] input').setValue("lawyer");
    await wrapper.get('[data-testid="dnc-confirm"]').trigger("click");
    await flushPromises();
    expect(api.POST_DoNotContact).toHaveBeenCalledWith({ domain: "bad.pl", reason: "lawyer" });
    expect(api.GET_DoNotContact).toHaveBeenCalledTimes(2);
    expect(wrapper.get('[data-testid="dnc-notice"]').text()).toContain("bad.pl");
  });
});

describe("Address checks", () => {
  const contact = (id, status, reason = "", fields = {}) => ({ id, company_id: 7, email: `p${id}@shop.pl`, email_status: status, email_status_reason: reason, email_verified_at: "2026-11-06T10:00:00Z", ...fields });
  beforeEach(() => {
    api.GET_VerificationReport.mockResolvedValue({ data: { enabled: true, max_age_days: 30, counts: { valid: 40, risky: 3, invalid: 2, unknown: 5 }, stale: 4 } });
    api.GET_Contacts.mockResolvedValue({ data: { results: [contact(1, "invalid", "domain_not_found"), contact(2, "invalid", "hard_bounce")], next: null } });
  });

  it("shows the report counts and the bad list, invalid first, with the company name", async () => {
    const wrapper = mount(Addresses, { global });
    await flushPromises();
    expect(api.GET_Contacts).toHaveBeenCalledWith({ email_status: "invalid", page: 1, page_size: 50 });
    expect(wrapper.get('[data-testid="addresses-count-risky"]').text()).toContain("3");
    expect(wrapper.get('[data-testid="addresses-stale"]').text()).toContain("4");
    expect(wrapper.findAll('[data-testid="address-row"]')).toHaveLength(2);
    expect(wrapper.get('[data-testid="address-company"]').text()).toBe("Shop One");
  });

  it("switching to risky reads that list", async () => {
    const wrapper = mount(Addresses, { global });
    await flushPromises();
    api.GET_Contacts.mockResolvedValue({ data: { results: [], next: null } });
    await wrapper.get('[data-testid="addresses-filter-risky"]').trigger("click");
    await flushPromises();
    expect(api.GET_Contacts).toHaveBeenLastCalledWith({ email_status: "risky", page: 1, page_size: 50 });
    expect(wrapper.find('[data-testid="addresses-empty"]').exists()).toBe(true);
  });

  it("Check now verifies one address; a row that left the filter goes, the report is read again; a hard bounce cannot be re-checked", async () => {
    api.POST_VerifyContact.mockResolvedValue({ data: contact(1, "valid", "mx_ok") });
    const wrapper = mount(Addresses, { global });
    await flushPromises();
    const rows = wrapper.findAll('[data-testid="address-row"]');
    expect(rows[1].get('[data-testid="address-check"]').attributes("disabled")).toBeDefined();
    await rows[0].get('[data-testid="address-check"]').trigger("click");
    await flushPromises();
    expect(api.POST_VerifyContact).toHaveBeenCalledWith(1);
    expect(wrapper.findAll('[data-testid="address-row"]')).toHaveLength(1);
    expect(api.GET_VerificationReport).toHaveBeenCalledTimes(2);
  });

  it("a failed check is shown on its row", async () => {
    api.POST_VerifyContact.mockRejectedValue({ response: { data: { detail: "dns down" } } });
    const wrapper = mount(Addresses, { global });
    await flushPromises();
    await wrapper.findAll('[data-testid="address-check"]')[0].trigger("click");
    await flushPromises();
    expect(wrapper.get('[data-testid="address-error"]').text()).toBe("dns down");
  });

  it("Why not? opens the send-check of that contact", async () => {
    api.GET_SendCheck.mockResolvedValue({ data: check() });
    const wrapper = mount(Addresses, { global });
    await flushPromises();
    await wrapper.findAll('[data-testid="address-why"]')[0].trigger("click");
    await flushPromises();
    expect(api.GET_SendCheck).toHaveBeenCalledWith(1);
  });
});
