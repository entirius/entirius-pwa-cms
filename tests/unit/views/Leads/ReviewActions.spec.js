import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import ReviewActions from "@/views/Leads/ReviewActions.vue";
import BasicButton from "@/boots/BasicButton/index.vue";
import { leadsFrame } from "./leadsFrame";

const mountActions = (props) =>
  mount(ReviewActions, {
    props,
    global: {
      components: leadsFrame.components,
      stubs: { ...leadsFrame.stubs, BasicButton, BasicMenu: { template: "<div><slot name='trigger' /></div>" }, BasicTooltip: { props: ["text"], template: "<span :title='text'><slot /></span>" } },
    },
  });

// Acceptance CM10 (plan 22): a Send that cannot go out is disabled and says so next to it, not only in its tooltip.
describe("Review actions", () => {
  it("a blocked draft: Send disabled, the reason beside it", () => {
    const wrapper = mountActions({ blocked: "The mailbox cannot send (Paused)" });
    expect(wrapper.get('[data-testid="review-send"]').attributes("disabled")).toBeDefined();
    expect(wrapper.get('[data-testid="review-send-blocked"]').text()).toBe("leads.review.send_blocked");
  });

  it("a draft that can go out: Send live, no reason", () => {
    const wrapper = mountActions({});
    expect(wrapper.get('[data-testid="review-send"]').attributes("disabled")).toBeUndefined();
    expect(wrapper.find('[data-testid="review-send-blocked"]').exists()).toBe(false);
  });
});
