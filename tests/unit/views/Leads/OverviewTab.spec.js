import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import OverviewTab from "@/views/Leads/tabs/OverviewTab.vue";

const company = {
  name: "Example Shop 2",
  domain: "example-shop-2.test",
  company_type: "UNKNOWN",
  stage: { label: "New" },
  last_activity_at: null,
  customer_uid: "91010000-0000-0000-0000-000000000000",
  customer_name: "Jan Kowalski",
  activities: [{ id: 1, created_at: null, message: "draft review_required" }],
};

// FIX-17 item 14: no raw uid, no raw status and no raw enum value on the Overview tab.
describe("Company overview tab", () => {
  it("names the customer, the lead type and the activity status", () => {
    const text = mount(OverviewTab, { props: { company } }).text();
    expect(text).toContain("Jan Kowalski");
    expect(text).not.toContain("91010000");
    expect(text).toContain("Lead type unknown");
    expect(text).toContain("Draft — to review");
    expect(text).not.toContain("review_required");
  });

  it("falls back to the uid while the name is unknown", () => {
    const text = mount(OverviewTab, { props: { company: { ...company, customer_name: "" } } }).text();
    expect(text).toContain("91010000-0000-0000-0000-000000000000");
  });
});
