import { describe, it, expect, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

const mockResetConfirm = vi.fn();
vi.mock("@/api/contentDB/api", () => ({ POST_PasswordResetConfirm: (...a) => mockResetConfirm(...a) }));
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => ({ spawnNotification: vi.fn() }) }));

import PasswordReset from "@/views/PasswordReset/PasswordReset.vue";

describe("PasswordReset", () => {
  // Plan 32: the fields sit in a <form>, so Enter in a field submits it.
  it("submitting the form confirms the reset with the link's key", async () => {
    mockResetConfirm.mockResolvedValue({});
    const wrapper = mount(PasswordReset, {
      global: { mocks: { $route: { params: {}, query: { key: "k-1" } } } },
    });
    await wrapper.setData({ newPassword: "new", confirmPassword: "new" });

    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(mockResetConfirm).toHaveBeenCalledWith({
      key: "k-1",
      new_password: "new",
      new_password_check: "new",
    });
    expect(wrapper.vm.success).toBe(true);
  });
});
