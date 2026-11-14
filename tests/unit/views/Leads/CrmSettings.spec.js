import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushPromises } from "@vue/test-utils";

const leads = vi.hoisted(() => ({
  GET_Attributes: vi.fn(),
  POST_Attribute: vi.fn(() => Promise.resolve({ data: {} })),
  PATCH_Attribute: vi.fn(() => Promise.resolve({ data: {} })),
  DELETE_Attribute: vi.fn(() => Promise.resolve({ data: {} })),
  GET_Fields: vi.fn(),
  GET_ScoringProfiles: vi.fn(),
  POST_ScoringProfile: vi.fn(),
  PATCH_ScoringProfile: vi.fn(),
  GET_Rules: vi.fn(),
  POST_Rule: vi.fn(() => Promise.resolve({ data: {} })),
  PATCH_Rule: vi.fn(() => Promise.resolve({ data: {} })),
  DELETE_Rule: vi.fn(),
  GET_RuleRuns: vi.fn(() =>
    Promise.resolve({
      data: {
        results: [
          { id: 1, company_id: 5, fired_at: null, outcome: "skipped", detail: "skipped: condition segment" },
          { id: 2, company_id: 200, fired_at: null, outcome: "fired", detail: "message 60 review_required" },
        ],
      },
    })
  ),
  GET_Company: vi.fn((id) => (id === 5 ? Promise.resolve({ data: { id: 5, name: "Acme" } }) : Promise.reject(new Error("gone")))),
  GET_Stages: vi.fn(() => Promise.resolve({ data: { results: [{ id: 1, key: "new", label: "New" }] } })),
  GET_Funnel: vi.fn(),
}));
vi.mock("@/api/leads/api", () => leads);
vi.mock("@/api/communicator/api", () => ({ GET_Templates: () => Promise.resolve({ data: { results: [{ key: "intro", language: "en", is_active: true }] } }) }));
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => ({ spawnNotification: vi.fn() }) }));
vi.mock("@/stores/munin", () => ({ useMuninStore: () => ({ isModuleEnabled: () => true }) }));
const route = vi.hoisted(() => ({ query: {} }));
vi.mock("vue-router", async (original) => ({ ...(await original()), useRoute: () => route, useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }));

import { t } from "@/i18n";
import CustomFieldsSettings from "@/views/Leads/CustomFieldsSettings.vue";
import Reports from "@/views/Leads/Reports.vue";
import Rules from "@/views/Leads/Rules.vue";
import Scoring from "@/views/Leads/Scoring.vue";
import { durationLabel, reachedLabel } from "@/views/Leads/reports";
import { setControl } from "./leadsFrame";
import { byTestid, mountOutbound } from "./outboundFrame";
import { crmStubs } from "./crmFrame";

const mounted = async (component, options = {}) => {
  const wrapper = mountOutbound(component, { area: "leads.settings", stubs: crmStubs, ...options });
  await flushPromises();
  return wrapper;
};
const facts = { data: { results: [{ name: "segment", kind: "select", label: "Segment", options: [{ value: "S1", label: "S1" }] }, { name: "hooks_count", kind: "number", label: "Hooks", options: [] }] } };
const definition = (extra = {}) => ({ id: 1, entity: "company", key: "platform", label: "Platform", kind: "select", options: [{ value: "m2", label: "Magento" }], required: false, order: 0, show_in_list: true, is_active: true, ...extra });

// Plan 15: Settings → Custom fields, Scoring, Rules; Reports.
describe("Leads → Settings → Custom fields", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    route.query = {};
    leads.GET_Attributes.mockResolvedValue({ data: { results: [definition(), definition({ id: 2, key: "size", label: "Size", kind: "number", options: [], order: 1, show_in_list: false })] } });
  });

  it("lists the company definitions in order with up / down", async () => {
    const wrapper = await mounted(CustomFieldsSettings);
    expect(leads.GET_Attributes).toHaveBeenCalledWith("company");
    expect(wrapper.findAll('[data-testid="field-row"]').map((row) => row.attributes("data-key"))).toEqual(["platform", "size"]);
    await wrapper.findAll('[data-testid="field-down"]')[0].trigger("click");
    await flushPromises();
    expect(leads.PATCH_Attribute).toHaveBeenCalledWith(1, { order: 1 });
    expect(leads.PATCH_Attribute).toHaveBeenCalledWith(2, { order: 0 });
  });

  it("adds a choice field with its options on the tab's entity", async () => {
    route.query = { entity: "contact" };
    const wrapper = await mounted(CustomFieldsSettings);
    await byTestid(wrapper, "fields-add").trigger("click");
    setControl(wrapper, "field-label", "Role");
    setControl(wrapper, "field-key", "role");
    setControl(wrapper, "field-kind", "select");
    await flushPromises();
    await byTestid(wrapper, "field-option-add").trigger("click");
    setControl(wrapper, "field-option-value", "cto");
    setControl(wrapper, "field-option-label", "CTO");
    await byTestid(wrapper, "field-save").trigger("click");
    await flushPromises();
    expect(leads.POST_Attribute).toHaveBeenCalledWith({ entity: "contact", key: "role", kind: "select", label: "Role", options: [{ value: "cto", label: "CTO" }], required: false, show_in_list: false, order: 2 });
  });

  it("a 409 on the kind locks it with its note", async () => {
    leads.PATCH_Attribute.mockRejectedValueOnce(Object.defineProperty({ error: "conflict" }, "httpStatus", { value: 409 }));
    const wrapper = await mounted(CustomFieldsSettings);
    await byTestid(wrapper, "field-edit").trigger("click");
    setControl(wrapper, "field-kind", "text");
    await byTestid(wrapper, "field-save").trigger("click");
    await flushPromises();
    expect(byTestid(wrapper, "field-kind-locked").exists()).toBe(true);
  });

  // Acceptance CM15: the delete question says what happens to the values stored on companies.
  it("delete asks and says what becomes of the stored values", async () => {
    const wrapper = await mounted(CustomFieldsSettings);
    await wrapper.findAll('[data-testid="field-delete"]')[0].trigger("click");
    expect(wrapper.findComponent({ name: "ConfirmDialog" }).props("message")).toContain("leads.fields.delete_confirm");
    expect(t("leads.fields.delete_confirm", { label: "Platform" })).toMatch(/holds no value yet.*switch Active off.*values stay stored/);
    expect(leads.DELETE_Attribute).not.toHaveBeenCalled();
  });

  it("read-only: no Add, edit or delete", async () => {
    const wrapper = await mounted(CustomFieldsSettings, { write: false });
    ["fields-add", "field-edit", "field-delete", "field-up"].forEach((id) => expect(byTestid(wrapper, id).exists()).toBe(false));
  });
});

describe("Leads → Settings → Scoring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    leads.GET_Fields.mockResolvedValue(facts);
  });

  it("no profile: defaults, Save creates it; thresholds out of order are refused", async () => {
    leads.GET_ScoringProfiles.mockResolvedValue({ data: { results: [] } });
    leads.POST_ScoringProfile.mockResolvedValue({ data: { id: 3, key: "leads.scoring", thresholds: { S: 20, M: 40, L: 60 }, rules: [], disqualifiers: [], is_active: true } });
    const wrapper = await mounted(Scoring);
    expect(wrapper.findComponent('[data-testid="scoring-threshold-l"]').props("modelValue")).toBe(60);
    await byTestid(wrapper, "scoring-add-points").trigger("click");
    await flushPromises();
    wrapper.findComponent({ name: "ConditionRow" }).vm.$emit("update:modelValue", { field: "segment", op: "eq", value: "S1", points: 20, label: "Top" });
    await byTestid(wrapper, "scoring-save").trigger("click");
    await flushPromises();
    expect(leads.POST_ScoringProfile).toHaveBeenCalledWith({ thresholds: { S: 20, M: 40, L: 60 }, rules: [{ field: "segment", op: "eq", value: "S1", points: 20, label: "Top" }], disqualifiers: [], is_active: true });
    setControl(wrapper, "scoring-threshold-s", "50");
    await byTestid(wrapper, "scoring-save").trigger("click");
    expect(leads.PATCH_ScoringProfile).not.toHaveBeenCalled();
  });

  // Acceptance CM14: the Segments card says what a segment is and what it causes; read-only offers no write.
  it("says what a segment is; read-only has no Save and no Add", async () => {
    leads.GET_ScoringProfiles.mockResolvedValue({ data: { results: [] } });
    const wrapper = await mounted(Scoring);
    expect(byTestid(wrapper, "scoring-segments-help").text()).toBe("leads.scoring.segments_help");
    expect(t("leads.scoring.segments_help")).toMatch(/S1 fits best.*filters by segment.*a rule/);
    const readonly = await mounted(Scoring, { write: false });
    expect(byTestid(readonly, "readonly-notice").exists()).toBe(true);
    ["scoring-save", "scoring-add-points", "scoring-add-disqualifier"].forEach((id) => expect(byTestid(readonly, id).exists()).toBe(false));
  });

  it("a condition row offers the ops of its field's kind and hides the value for 'is empty'", async () => {
    leads.GET_ScoringProfiles.mockResolvedValue({ data: { results: [{ id: 3, key: "leads.scoring", thresholds: { S: 20, M: 40, L: 60 }, rules: [{ field: "hooks_count", op: "gte", value: 3, points: 10, label: "Hooks" }], disqualifiers: [{ field: "gone", op: "empty", value: null, label: "x" }], is_active: true }] } });
    const wrapper = await mounted(Scoring);
    const [rule, disqualifier] = wrapper.findAllComponents({ name: "ConditionRow" });
    expect(rule.findComponent('[data-testid="condition-op"]').props("options").map((o) => o.value)).toEqual(["eq", "ne", "gte", "lte", "empty"]);
    expect(disqualifier.find('[data-testid="condition-value"]').exists()).toBe(false);
    expect(disqualifier.text()).toContain("leads.condition.inactive_field");
  });
});

describe("Leads → Settings → Rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    leads.GET_Fields.mockResolvedValue(facts);
    leads.GET_ScoringProfiles.mockResolvedValue({ data: { results: [] } });
    leads.GET_Rules.mockResolvedValue({ data: { results: [{ id: 4, trigger: "stage_entered", stage_id: 1, action: "communicate", template_key: "intro", contact_strategy: "primary", require_hooks: true, require_email: true, conditions: [{ field: "segment", op: "in", value: ["S1"] }], is_active: true }] } });
  });

  // N24: read-only, a row opens its rule to view — "View rule", headed "Rule", never "Edit"
  it("read-only: the row action is View and the dialog is headed Rule", async () => {
    const wrapper = await mounted(Rules, { write: false });
    const action = byTestid(wrapper, "rule-edit");
    expect(action.attributes("aria-label")).toBe("leads.rules.view");
    await action.trigger("click");
    await flushPromises();
    expect(wrapper.find('[data-title="leads.rules.rule"]').exists()).toBe(true);
  });

  it("lists the rules with their summary and saves the conditions", async () => {
    const wrapper = await mounted(Rules);
    expect(byTestid(wrapper, "rule-row").text()).toContain("Draft from template \"intro\"");
    await byTestid(wrapper, "rule-edit").trigger("click");
    await flushPromises();
    // Acceptance C3: the company by name, the result in words, no id, no doubled word
    const runs = wrapper.findAll('[data-testid="rule-run"]').map((run) => run.text().replace(/\s+/g, " "));
    expect(runs[0]).toContain("Acme · Skipped — a condition did not hold: Segment");
    expect(runs[1]).toContain("leads.rules.run.company · Ran — draft written, waiting for review");
    expect(runs.join(" ")).not.toMatch(/#|\b(5|200|60)\b|review_required|skipped: skipped/);
    // a run of plan 23 names its company itself — no company call for it
    leads.GET_Company.mockClear();
    leads.GET_RuleRuns.mockResolvedValueOnce({ data: { results: [{ id: 9, company_id: 77, company_name: "Named Shop", outcome: "ran", detail: "audit requested", fired_at: "2026-09-26T08:00:00Z" }] } });
    await byTestid(wrapper, "rule-edit").trigger("click");
    await flushPromises();
    expect(wrapper.get('[data-testid="rule-run"]').text()).toContain("Named Shop");
    expect(leads.GET_Company).not.toHaveBeenCalled();
    await byTestid(wrapper, "rule-add-condition").trigger("click");
    await byTestid(wrapper, "rule-save").trigger("click");
    await flushPromises();
    expect(leads.PATCH_Rule).toHaveBeenCalledWith(4, expect.objectContaining({ conditions: [{ field: "segment", op: "in", value: ["S1"] }, { field: "", op: "eq", value: null }] }));
  });

  // m9 (walk 3): an empty Conditions box says what that means
  it("a rule without conditions says it runs for every company", async () => {
    const wrapper = await mounted(Rules);
    await byTestid(wrapper, "rules-add").trigger("click");
    await flushPromises();
    expect(byTestid(wrapper, "rule-no-conditions").exists()).toBe(true);
    await byTestid(wrapper, "rule-add-condition").trigger("click");
    expect(byTestid(wrapper, "rule-no-conditions").exists()).toBe(false);
  });

  it("the active switch saves on change; read-only hides Add and delete", async () => {
    const wrapper = await mounted(Rules);
    setControl(wrapper, "rule-active", false);
    await flushPromises();
    expect(leads.PATCH_Rule).toHaveBeenCalledWith(4, { is_active: false });
    const readonly = await mounted(Rules, { write: false });
    expect(byTestid(readonly, "rules-add").exists()).toBe(false);
    expect(byTestid(readonly, "rule-delete").exists()).toBe(false);
  });
});

describe("Leads → Reports", () => {
  beforeEach(() => vi.clearAllMocks());

  it("three tables from the funnel; the origin filter reloads it", async () => {
    leads.GET_Funnel.mockResolvedValue({
      data: {
        stages: [{ key: "new", label: "New", current: 120, entered: 80, left: 60, mean_seconds: 3 * 86400 }, { key: "contacted", label: "Contacted", current: 60, entered: 55, left: 40, mean_seconds: null }],
        transitions: [{ from_stage: "new", to_stage: "contacted", count: 55, mean_seconds: 7200 }],
        origins: [{ origin: "fair", companies: 40 }, { origin: "", companies: 210 }],
      },
    });
    const wrapper = await mounted(Reports, { area: "leads.companies" });
    expect(wrapper.findAll('[data-testid="reports-stage-row"]')).toHaveLength(2);
    // Acceptance CM16: the funnel says how many of the first stage's companies reached each stage
    expect(byTestid(wrapper, "reports-funnel").attributes("data-title")).toBe("leads.reports.funnel");
    expect(wrapper.findAll('[data-testid="reports-stage-row"]')[1].text()).toContain("69 %");
    expect(byTestid(wrapper, "reports-move-row").text()).toContain("New → Contacted");
    expect(byTestid(wrapper, "reports-origins").text()).toContain("(none)");
    setControl(wrapper, "reports-origin", "fair");
    await flushPromises();
    expect(leads.GET_Funnel.mock.lastCall[0].origin).toBe("fair");
  });

  it("durations: hours under a day, one decimal under ten days", () => {
    expect(durationLabel(7200)).toBe("2 h");
    expect(durationLabel(2.5 * 86400)).toBe("2.5 d");
    expect(durationLabel(12 * 86400)).toBe("12 d");
    expect(durationLabel(null)).toBe("—");
  });

  it("the funnel share: of the first stage, rounded; none in the first stage = —", () => {
    expect(reachedLabel(55, 80)).toBe("69 %");
    expect(reachedLabel(80, 80)).toBe("100 %");
    expect(reachedLabel(3, 0)).toBe("—");
  });
});
