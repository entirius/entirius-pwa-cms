import { describe, it, expect, vi } from "vitest";

vi.mock("@/api/leads/api", () => ({ GET_AssignableUsers: vi.fn(), PATCH_Deal: vi.fn() }));
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => ({ spawnNotification: vi.fn() }) }));

import DealDetails from "@/views/Leads/DealDetails.vue";
import { byTestid, mountOutbound } from "./outboundFrame";
import { crmStubs } from "./crmFrame";

const deal = (extra = {}) => ({ id: 7, title: "Shop rebuild", contact: null, owner: null, currency: "PLN", attributes: {}, ...extra });
const mounted = (extra) => mountOutbound(DealDetails, { area: "leads.companies", props: { deal: deal(extra) }, stubs: crmStubs });

// Plan 28: an archived deal's details are read-only until Restore.
describe("Leads → Deal card → Details", () => {
  it("Edit for a deal that is not archived, none for an archived one", () => {
    expect(byTestid(mounted({ archived_at: null }), "deal-details-edit").exists()).toBe(true);
    expect(byTestid(mounted({ archived_at: "2026-11-14T10:00:00Z" }), "deal-details-edit").exists()).toBe(false);
  });
});
