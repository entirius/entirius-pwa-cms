import { describe, it, expect, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

const mockPasswordChange = vi.fn();
vi.mock("@/api/contentDB/api", () => ({ POST_PasswordChange: (...a) => mockPasswordChange(...a) }));
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => ({ spawnNotification: vi.fn() }) }));

import ChangePassword from "@/views/ChangePassword/ChangePassword.vue";

describe("ChangePassword", () => {
  // Plan 32: the fields sit in a <form>, so Enter in a field submits it.
  it("submitting the form changes the password", async () => {
    mockPasswordChange.mockResolvedValue({});
    const wrapper = mount(ChangePassword);
    await wrapper.setData({ oldPassword: "old", newPassword: "new", confirmPassword: "new" });

    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(mockPasswordChange).toHaveBeenCalledWith({
      old_password: "old",
      new_password: "new",
      new_password_check: "new",
    });
    expect(wrapper.vm.success).toBe(true);
  });
});
