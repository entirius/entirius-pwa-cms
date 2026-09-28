import { describe, it, expect, vi } from "vitest";
import { mount, RouterLinkStub } from "@vue/test-utils";

import EmailCard from "@/views/Emails/EmailCard.vue";
import EmailChannelEdit from "@/views/Emails/EmailChannelEdit.vue";
import EmailTemplateEdit from "@/views/Emails/EmailTemplateEdit.vue";
import EmailLangConfigEdit from "@/views/Emails/EmailLangConfigEdit.vue";

// Save moved from the bottom of each form into the PageHeader ActionBar (plan 34): the same handler, primary.
const actionsOf = (component, state) => component.computed.headerActions.call({ ...state, $t: (key) => key });

describe("Emails header actions", () => {
  it.each([
    ["channel", EmailChannelEdit, "saveChannel"],
    ["template", EmailTemplateEdit, "save"],
    ["language config", EmailLangConfigEdit, "save"],
  ])("%s: one primary Save calling the view's save", (_, component, handler) => {
    const state = { [handler]: vi.fn() };
    const [save, ...rest] = actionsOf(component, state);
    expect(rest).toEqual([]);
    expect(save).toMatchObject({ key: "save", role: "primary", label: "common.save", testid: "emails-save" });
    expect(save.onClick).toBe(state[handler]);
  });
});

describe("EmailCard", () => {
  const mountCard = () =>
    mount(EmailCard, {
      props: { to: "/emails/channels/7", title: "Default Europe", testid: "emails-channel-card" },
      slots: { default: "<p>default-europe</p>" },
      global: { stubs: { RouterLink: RouterLinkStub, BasicCard: { template: "<section><slot /></section>" } } },
    });

  it("the title is the one link to the record, carrying the test id", () => {
    const link = mountCard().findComponent(RouterLinkStub);
    expect(link.props("to")).toBe("/emails/channels/7");
    expect(link.text()).toBe("Default Europe");
    expect(link.attributes("data-testid")).toBe("emails-channel-card");
  });

  it("renders the lines under the title", () => {
    expect(mountCard().text()).toContain("default-europe");
  });
});
