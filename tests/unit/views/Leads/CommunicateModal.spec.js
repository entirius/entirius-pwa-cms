import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

const leads = vi.hoisted(() => ({ POST_Communicate: vi.fn() }));
const communicator = vi.hoisted(() => ({ GET_Templates: vi.fn() }));
vi.mock("@/api/leads/api", () => leads);
vi.mock("@/api/communicator/api", () => communicator);
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => ({ spawnNotification: vi.fn() }) }));

import CommunicateModal from "@/views/Leads/CommunicateModal.vue";
import { control, leadsFrame, setControl } from "./leadsFrame";

// Plan 54: the dialog is a BasicModal; the stub renders its body and hands its actions out as props.
const BasicModal = { name: "BasicModal", props: ["open", "title", "actions"], template: "<div><slot /></div>" };
const BasicRadioGroup = { name: "BasicRadioGroup", props: ["modelValue", "options"], template: "<div />" };
const company = {
  id: 7,
  contacts: [
    { id: 1, first_name: "Anna", last_name: "Nowak", email: "anna@shop.test", is_primary: false },
    { id: 2, first_name: "Jan", last_name: "Kowal", email: "jan@shop.test", is_primary: true },
    { id: 3, first_name: "Opt", last_name: "Out", email: "out@shop.test", opt_out_at: "2026-09-01" },
  ],
};
const mountModal = async () => {
  const wrapper = mount(CommunicateModal, {
    props: { company },
    global: { stubs: { ...leadsFrame.stubs, BasicModal, BasicRadioGroup } },
  });
  await flushPromises();
  return wrapper;
};
const submit = (wrapper) => wrapper.findComponent({ name: "BasicModal" }).props("actions").find((a) => a.key === "submit");

describe("Leads Communicate dialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    communicator.GET_Templates.mockResolvedValue({
      data: { results: [{ id: 1, key: "cold", language: "pl", is_active: true }, { id: 2, key: "old", language: "en", is_active: false }] },
    });
  });

  it("offers the active templates and the contacts that can get mail, the primary one picked", async () => {
    const wrapper = await mountModal();
    expect(control(wrapper, "communicate-template").props("options")).toEqual([{ value: "cold", label: "cold (pl)" }]);
    const radios = wrapper.findComponent({ name: "BasicRadioGroup" });
    expect(radios.props("options").map((o) => o.value)).toEqual([1, 2]);
    expect(radios.props("modelValue")).toBe(2);
  });

  it("Request draft waits for a template, then posts the pick", async () => {
    leads.POST_Communicate.mockResolvedValue({ data: {} });
    const wrapper = await mountModal();
    expect(submit(wrapper).disabled).toBe(true);
    await setControl(wrapper, "communicate-template", "cold");
    expect(submit(wrapper).disabled).toBe(false);
    await submit(wrapper).onClick();
    expect(leads.POST_Communicate).toHaveBeenCalledWith(7, { template_key: "cold", contact_id: 2 });
    expect(wrapper.emitted("close")).toHaveLength(1);
  });
});
