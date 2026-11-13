import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushPromises } from "@vue/test-utils";

const api = vi.hoisted(() => ({ GET_Suppressions: vi.fn(), POST_Suppression: vi.fn(), DELETE_Suppression: vi.fn(), GET_AddressStatus: vi.fn() }));
vi.mock("@/api/communicator/api", () => api);
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => ({ spawnNotification: vi.fn() }) }));

import DoNotContact from "@/views/Leads/DoNotContact.vue";
import { fieldError } from "./leadsFrame";
import { byTestid, mountOutbound } from "./outboundFrame";

const rows = [
  { id: 1, kind: "email", value: "jan@acme.test", scope: "channel", source: "unsubscribe_link", reason: "", created_at: "2026-11-12T10:00:00Z" },
  { id: 2, kind: "email_token", value: "abc", scope: "install", source: "erased", reason: "", created_at: "2026-10-01T10:00:00Z" },
];
const mounted = async (options) => {
  const wrapper = mountOutbound(DoNotContact, options);
  await flushPromises();
  return wrapper;
};

// Plan 14: Settings → Do not contact — the one list, with reach and source; add, remove, check an address.
describe("Leads → Settings → Do not contact", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.GET_Suppressions.mockResolvedValue({ data: { results: rows } });
  });

  it("lists every row; an erased address cannot be removed; the filters go to the API", async () => {
    const wrapper = await mounted();
    expect(wrapper.findAll('[data-testid="dnc-row"]')).toHaveLength(2);
    expect(wrapper.findAll('[data-testid="dnc-delete"]')).toHaveLength(1);
    wrapper.findComponent('[data-testid="dnc-why"]').vm.$emit("update:modelValue", "bounce");
    await flushPromises();
    expect(api.GET_Suppressions).toHaveBeenLastCalledWith({ search: undefined, scope: undefined, source: "bounce" });
  });

  it("remove asks first", async () => {
    api.DELETE_Suppression.mockResolvedValue({});
    const wrapper = await mounted();
    await byTestid(wrapper, "dnc-delete").trigger("click");
    expect(api.DELETE_Suppression).not.toHaveBeenCalled();
    await byTestid(wrapper, "dnc-delete-confirm").trigger("click");
    await flushPromises();
    expect(api.DELETE_Suppression).toHaveBeenCalledWith(1);
  });

  it("a duplicate keeps the add dialog open with the error on the value", async () => {
    api.POST_Suppression.mockRejectedValueOnce({ message: "already on the list" });
    const wrapper = await mounted();
    await byTestid(wrapper, "suppression-add").trigger("click");
    wrapper.findComponent('[data-testid="suppression-value"]').vm.$emit("update:modelValue", "jan@acme.test");
    await byTestid(wrapper, "dnc-add-submit").trigger("click");
    await flushPromises();
    expect(api.POST_Suppression).toHaveBeenCalledWith({ kind: "email", value: "jan@acme.test", reason: "" });
    expect(byTestid(wrapper, "dnc-add-submit").exists()).toBe(true);
    expect(fieldError(wrapper, "leads.dnc.value")).toBe("already on the list");
  });

  it("check explains a blocked address and a clear one", async () => {
    api.GET_AddressStatus.mockResolvedValueOnce({ data: { refusal: "suppressed", suppressions: [{ source: "bounce", scope: "channel" }], address_status: { status: "invalid", reason: "hard_bounce" } } });
    const wrapper = await mounted();
    await byTestid(wrapper, "dnc-check").trigger("click");
    wrapper.findComponent('[data-testid="dnc-check-email"]').vm.$emit("update:modelValue", "jan@acme.test");
    await byTestid(wrapper, "dnc-check-submit").trigger("click");
    await flushPromises();
    expect(byTestid(wrapper, "dnc-check-result").findAll("li")).toHaveLength(2);
    api.GET_AddressStatus.mockResolvedValueOnce({ data: { refusal: null, suppressions: [], address_status: null } });
    await byTestid(wrapper, "dnc-check-submit").trigger("click");
    await flushPromises();
    expect(byTestid(wrapper, "dnc-check-result").text()).toContain("Nothing blocks this address");
  });

  it("empty, failed and read-only (Check stays)", async () => {
    api.GET_Suppressions.mockResolvedValueOnce({ data: { results: [] } });
    expect(byTestid(await mounted(), "dnc-empty").exists()).toBe(true);
    api.GET_Suppressions.mockRejectedValueOnce({ message: "down" });
    expect(byTestid(await mounted(), "dnc-error").text()).toBe("down");
    api.GET_Suppressions.mockResolvedValueOnce({ data: { results: rows } });
    const readonly = await mounted({ write: false });
    expect(byTestid(readonly, "suppression-add").exists()).toBe(false);
    expect(byTestid(readonly, "dnc-delete").exists()).toBe(false);
    expect(byTestid(readonly, "dnc-check").exists()).toBe(true);
  });
});
