import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { defineComponent, h } from "vue";

// Access plan 21: a staff account's grants are added and revoked by id, the lockout 409 reads as a notice line in the
// card, and the audit filters reach the query string. The real English messages, so the sentences are what a user reads.
const api = vi.hoisted(() => ({
  GET_AccessStaffUser: vi.fn(),
  GET_AccessAllStaff: vi.fn(),
  GET_AccessAllRoles: vi.fn(),
  GET_AccessAudit: vi.fn(),
  POST_AccessGrant: vi.fn(),
  DELETE_AccessGrant: vi.fn(),
}));
const notify = vi.hoisted(() => ({ spawnNotification: vi.fn() }));
vi.mock("@/api/access/api", () => api);
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => notify }));
vi.mock("@/stores/loader", () => ({ useLoaderStore: () => ({ loaderStart: vi.fn(), loaderFinish: vi.fn() }) }));

import { t } from "@/i18n";
import StaffDetail from "@/views/Access/StaffDetail.vue";
import AuditList from "@/views/Access/AuditList.vue";

const USER = {
  id: 5,
  username: "viewer",
  email: "viewer@example.test",
  name: "",
  is_superuser: false,
  roles: [{ key: "viewer", name: "Viewer", via_group: null }],
  groups: [{ id: 3, name: "Shop" }],
  grants: [
    { id: 11, role: { id: 4, key: "viewer", name: "Viewer" }, user: { id: 5, username: "viewer" }, group: null, created_at: "2026-10-01T10:00:00Z" },
    { id: 12, role: { id: 3, key: "editor", name: "Editor" }, user: null, group: { id: 3, name: "Shop" }, created_at: "2026-10-01T10:00:00Z" },
  ],
};
const ROLES = [
  { id: 1, key: "administrator", name: "Administrator" },
  { id: 4, key: "viewer", name: "Viewer" },
];

const slots = (name) =>
  defineComponent({ name, inheritAttrs: false, setup: (_, ctx) => () => h("div", Object.values(ctx.slots).map((s) => s())) });
const stubs = {
  PageLayout: slots("PageLayout"), PageHeader: slots("PageHeader"), BasicCard: slots("BasicCard"), FormField: slots("FormField"),
  MobileFilterPanel: slots("MobileFilterPanel"), DataTable: true, BasicSelect: true, BasicButton: true, BasicDatePicker: true,
  ConfirmDialog: true, EmptyState: true, Tag: true, Loader: true, FilterChip: true, Pagination: true, IconButton: true,
};

async function mountView(component, route = {}) {
  const wrapper = mount(component, { global: { mocks: { $t: t, $route: { params: {}, query: {}, ...route }, $router: { push: vi.fn() } }, stubs } });
  await flushPromises();
  return wrapper;
}
const lastToast = () => notify.spawnNotification.mock.calls.at(-1)[0];

describe("StaffDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.GET_AccessStaffUser.mockResolvedValue({ data: USER });
    api.GET_AccessAllRoles.mockResolvedValue(ROLES);
  });

  it("splits direct grants from group roles and offers only roles not held directly", async () => {
    const wrapper = await mountView(StaffDetail, { params: { id: "5" } });
    expect(api.GET_AccessStaffUser).toHaveBeenCalledWith("5");
    expect(wrapper.vm.directGrants.map((g) => g.id)).toEqual([11]);
    expect(wrapper.vm.groupRows).toEqual([{ id: 3, name: "Shop", grants: [USER.grants[1]] }]);
    expect(wrapper.vm.addOptions).toEqual([{ label: "Administrator", value: "administrator" }]);
  });

  it("adds a role to the user and revokes a grant by its id", async () => {
    api.POST_AccessGrant.mockResolvedValue({ data: {} });
    api.DELETE_AccessGrant.mockResolvedValue({});
    const wrapper = await mountView(StaffDetail, { params: { id: "5" } });
    wrapper.vm.newRole = "administrator";
    await wrapper.vm.addGrant();
    expect(api.POST_AccessGrant).toHaveBeenCalledWith({ role: "administrator", user_id: 5 });
    wrapper.vm.pendingRevoke = USER.grants[0];
    await wrapper.vm.revokeGrant();
    expect(api.DELETE_AccessGrant).toHaveBeenCalledWith(11);
    expect(lastToast()).toEqual({ type: "positive", msg: "Role revoked" });
  });

  it("the lockout 409 on a revoke stays as the sentence in the card, not a toast, until the next change", async () => {
    api.DELETE_AccessGrant.mockRejectedValue({ response: { status: 409, data: { error: "CONFLICT", message: "Nobody active" } } });
    api.POST_AccessGrant.mockResolvedValue({ data: {} });
    const wrapper = await mountView(StaffDetail, { params: { id: "5" } });
    wrapper.vm.pendingRevoke = USER.grants[0];
    await wrapper.vm.revokeGrant();
    await flushPromises();
    expect(notify.spawnNotification).not.toHaveBeenCalled();
    expect(wrapper.find('[data-testid="grant-lockout"]').text()).toBe(
      "At least one person must keep access management — grant it to someone else first"
    );
    wrapper.vm.newRole = "administrator";
    await wrapper.vm.addGrant();
    await flushPromises();
    expect(wrapper.find('[data-testid="grant-lockout"]').exists()).toBe(false);
  });

  it("another refused revoke is a toast with the server's description", async () => {
    api.DELETE_AccessGrant.mockRejectedValue({ response: { status: 400, data: { message: "Not staff" } } });
    const wrapper = await mountView(StaffDetail, { params: { id: "5" } });
    wrapper.vm.pendingRevoke = USER.grants[0];
    await wrapper.vm.revokeGrant();
    expect(lastToast()).toEqual({ type: "negative", msg: "Not staff" });
    expect(wrapper.find('[data-testid="grant-lockout"]').exists()).toBe(false);
  });

  it("a failed role list leaves the account readable, with nothing to add", async () => {
    api.GET_AccessAllRoles.mockRejectedValue(new Error("down"));
    const wrapper = await mountView(StaffDetail, { params: { id: "5" } });
    expect(wrapper.vm.loadFailed).toBe(false);
    expect(wrapper.vm.directGrants).toHaveLength(1);
    expect(wrapper.vm.addOptions).toEqual([]);
  });

  it("an unknown account is not found, not an editable page", async () => {
    api.GET_AccessStaffUser.mockRejectedValue({ response: { status: 404, data: {} } });
    const wrapper = await mountView(StaffDetail, { params: { id: "99" } });
    expect(wrapper.vm.notFound).toBe(true);
    expect(notify.spawnNotification).not.toHaveBeenCalled();
  });
});

describe("AuditList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.GET_AccessAudit.mockResolvedValue({ data: { count: 0, results: [] } });
    api.GET_AccessAllStaff.mockResolvedValue([{ id: 7, username: "admin", name: "" }]);
  });

  it("filters reach the query and go back to the first page", async () => {
    const wrapper = await mountView(AuditList);
    expect(api.GET_AccessAudit).toHaveBeenLastCalledWith({ page: 1, page_size: 50 });
    wrapper.vm.changePage(3);
    wrapper.vm.setFilter("action", "grant.migrate");
    wrapper.vm.setFilter("actor", 7);
    expect(api.GET_AccessAudit).toHaveBeenLastCalledWith({ page: 1, page_size: 50, action: "grant.migrate", actor: 7 });
    expect(wrapper.vm.actorOptions).toEqual([{ label: "admin", value: 7 }]);
  });

  it("actions read as human labels; an unknown action shows as it is", async () => {
    const wrapper = await mountView(AuditList);
    expect(wrapper.vm.actionLabel("grant.migrate")).toBe("Role granted at install");
    expect(wrapper.vm.actionLabel("gate.bypass")).toBe("Superuser access");
    expect(wrapper.vm.actionLabel("custom.thing")).toBe("custom.thing");
  });

  it("gate bypass rows fold by default and stay single when that action is the filter", async () => {
    const day = new Date(2026, 9, 2, 12).toISOString();
    const entries = [1, 2].map((id) => ({ id, actor_id: 7, action: "gate.bypass", created_at: day, detail: {} }));
    api.GET_AccessAudit.mockResolvedValue({ data: { count: 2, results: entries } });
    const wrapper = await mountView(AuditList);
    expect(wrapper.vm.rows).toHaveLength(1);
    wrapper.vm.setFilter("action", "gate.bypass");
    await flushPromises();
    expect(wrapper.vm.rows).toHaveLength(2);
  });
});
