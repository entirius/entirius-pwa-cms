import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { defineComponent, h, nextTick } from "vue";

// Access plan 22: the token dialogs' payloads and refusals, the row actions' calls, legacy rows (source, last use,
// "No expiry" without a warning) and the publishable revoke warning. A fake value shorter than a real token.
const api = vi.hoisted(() => ({
  GET_AccessApplication: vi.fn(),
  GET_AccessAllApplications: vi.fn(),
  GET_AccessCatalogue: vi.fn(),
  GET_AccessAllTokens: vi.fn(),
  POST_AccessApplication: vi.fn(),
  PATCH_AccessApplication: vi.fn(),
  POST_AccessToken: vi.fn(),
  POST_AccessTokenRotate: vi.fn(),
  POST_AccessTokenRevoke: vi.fn(),
  POST_AccessTokenExpiry: vi.fn(),
}));
const notify = vi.hoisted(() => ({ spawnNotification: vi.fn() }));
const revealShow = vi.hoisted(() => vi.fn());
vi.mock("@/api/access/api", () => api);
vi.mock("@/stores/notify", () => ({ useNotifyStore: () => notify }));
vi.mock("@/stores/loader", () => ({ useLoaderStore: () => ({ loaderStart: vi.fn(), loaderFinish: vi.fn() }) }));
vi.mock("@/stores/checkoutChannel", () => ({
  useCheckoutChannelStore: () => ({ channels: [{ idx: "emporium", label: "Emporium" }], fetchChannels: vi.fn() }),
}));

import { t } from "@/i18n";
import ApplicationDetail from "@/views/Access/ApplicationDetail.vue";
import ApplicationList from "@/views/Access/ApplicationList.vue";
import TokenCreateDialog from "@/views/Access/TokenCreateDialog.vue";
import TokenRotateDialog from "@/views/Access/TokenRotateDialog.vue";
import TokenExpiryDialog from "@/views/Access/TokenExpiryDialog.vue";
import { dateString, expiryInstant, expiryIssue, maxExpiryDate, minExpiryDate, refusedExpiryIssue, tokenKey } from "@/views/Access/tokens";

const FAKE = "ent_api_EXAMPLE-not-a-token";
const SCOPES = [
  { key: "checkout.storefront", label: "Storefront carts and orders", publishable: true },
  { key: "contact_forms.submit", label: "Contact form submissions", publishable: true },
  { key: "vault.api", label: "Vault", publishable: false },
];
const TOKEN = {
  id: 7, name: "Shop", prefix: "ent_api_Ab3d", last_four: "x9Q2", scopes: ["checkout.storefront"], channel_idx: null,
  expires_at: null, last_used_at: "2026-10-01T10:00:00Z", revoked_at: null, legacy: false, legacy_source: "", state: "active",
};
const LEGACY = {
  ...TOKEN, id: 9, name: "", prefix: "legacy", last_four: "", legacy: true,
  legacy_source: "django_checkout.ChannelApiKey#1", last_used_at: null,
};
const SECRET_TOKEN = { ...TOKEN, id: 8, name: "Vault sync", scopes: ["vault.api"], expires_at: "2027-06-01T00:00:00Z" };
const refusal = (issue) => ({
  response: { status: 400, data: { error: "VALIDATION_ERROR", message: "Invalid", details: [{ field: "expires_at", issue, description: "x" }] } },
});

// Renders every slot, so the dialog bodies and the header actions are in the tree.
const slots = (name) =>
  defineComponent({ name, inheritAttrs: false, setup: (_, ctx) => () => h("div", Object.values(ctx.slots).map((s) => s())) });
const stubs = {
  BasicModal: slots("BasicModal"), FormField: slots("FormField"), PageHeader: slots("PageHeader"), BasicCard: slots("BasicCard"),
  ConfirmDialog: slots("ConfirmDialog"), BasicCheckbox: true, BasicSelect: true, BasicInput: true, BasicTextarea: true,
  BasicRadioGroup: true, BasicDatePicker: true, NumberInput: true, BasicSwitch: true, DataTable: true, ActionBar: true,
  SecretReveal: defineComponent({ name: "SecretReveal", setup: (_, { expose }) => (expose({ show: revealShow }), () => null) }),
  Tag: true, EmptyState: true, Loader: true, FloatingActions: true,
};
const mountWith = (component, props = {}, route = {}) =>
  mount(component, {
    props,
    global: { mocks: { $t: t, $route: { params: {}, query: {}, ...route }, $router: { push: vi.fn() } }, stubs },
  });

describe("token rules", () => {
  const now = new Date(2026, 9, 3, 15, 0);

  it("blocks no date for a secret token, past days, and a secret date beyond 365 days", () => {
    expect(expiryIssue({ date: "", required: true, capped: true }, now)).toBe("EXPIRY_REQUIRED");
    expect(expiryIssue({ date: "", required: false, capped: false }, now)).toBeNull();
    expect(expiryIssue({ date: "2026-10-03", required: false, capped: false }, now)).toBe("EXPIRY_IN_PAST");
    expect(expiryIssue({ date: "2027-10-04", required: true, capped: true }, now)).toBe("EXPIRY_TOO_LONG");
    expect(expiryIssue({ date: "2027-10-04", required: false, capped: false }, now)).toBeNull();
    expect(minExpiryDate(now)).toBe("2026-10-04");
    expect(maxExpiryDate(now)).toBe("2027-10-03");
  });

  it("the 365-day cap is the local day of the instant 365 days ahead, so its midnight never passes the server's limit", () => {
    const cap = maxExpiryDate(now);
    expect(new Date(expiryInstant(cap)).getTime()).toBeLessThanOrEqual(now.getTime() + 365 * 86400000);
  });

  it("a date is the start of that local day; a token is known by prefix and last four", () => {
    expect(expiryInstant("2027-10-03")).toBe(new Date(2027, 9, 3).toISOString());
    expect(expiryInstant("")).toBeNull();
    expect(dateString(new Date(2027, 0, 5))).toBe("2027-01-05");
    expect(tokenKey(TOKEN)).toBe("ent_api_Ab3d…x9Q2");
    expect(tokenKey(LEGACY)).toBe("legacy");
    expect(refusedExpiryIssue(refusal("EXPIRY_TOO_LONG"))).toBe("EXPIRY_TOO_LONG");
    expect(refusedExpiryIssue(refusal("INVALID"))).toBeNull();
  });
});

describe("TokenCreateDialog", () => {
  beforeEach(() => vi.clearAllMocks());

  const openDialog = async (submit = vi.fn().mockResolvedValue()) => {
    const wrapper = mountWith(TokenCreateDialog, { open: true, scopes: SCOPES, channels: [], submit });
    await nextTick();
    return { wrapper, vm: wrapper.vm, submit };
  };

  it("sends name, scopes, channel and no expiry for a publishable token", async () => {
    const { wrapper, vm, submit } = await openDialog();
    Object.assign(vm.form, { name: "Shop", channel_idx: "emporium" });
    vm.toggleScope("checkout.storefront", true);
    vm.save();
    await flushPromises();
    expect(submit).toHaveBeenCalledWith({ name: "Shop", scopes: ["checkout.storefront"], channel_idx: "emporium", expires_at: null });
    expect(wrapper.emitted("update:open")).toEqual([[false]]);
  });

  it("never mixes the groups: a publishable pick disables the secret scopes, and the other way round", async () => {
    const { wrapper, vm } = await openDialog();
    vm.toggleScope("contact_forms.submit", true);
    await nextTick();
    const disabled = (key) => wrapper.find(`[data-testid="token-scope-${key}"]`).attributes("disabled");
    expect(disabled("vault.api")).toBe("true");
    expect(disabled("checkout.storefront")).toBe("false");
    vm.toggleScope("contact_forms.submit", false);
    vm.toggleScope("vault.api", true);
    await nextTick();
    expect(disabled("checkout.storefront")).toBe("true");
  });

  it("a secret token proposes 365 days, needs a date, and refuses one beyond 365 days with a field error", async () => {
    const { vm, submit } = await openDialog();
    vm.toggleScope("vault.api", true);
    await flushPromises();
    expect(vm.form.date).toBe(maxExpiryDate());
    vm.form.date = "";
    vm.save();
    expect(vm.expiryError()).toBe(t("access.tokens.expiry_errors.EXPIRY_REQUIRED"));
    vm.form.date = "2099-01-01";
    vm.save();
    expect(vm.expiryError()).toBe(t("access.tokens.expiry_errors.EXPIRY_TOO_LONG"));
    expect(submit).not.toHaveBeenCalled();
    vm.form.date = maxExpiryDate();
    vm.save();
    await flushPromises();
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ scopes: ["vault.api"], expires_at: expiryInstant(maxExpiryDate()) }));
  });

  it("no scope is a field error; the server's expiry code stays open as a field error, other refusals close with a toast", async () => {
    const submit = vi.fn().mockRejectedValueOnce(refusal("EXPIRY_TOO_LONG"));
    const { wrapper, vm } = await openDialog(submit);
    vm.save();
    expect(vm.formErrors.getFieldError("scopes").msg).toBe(t("access.tokens.scopes_required"));
    vm.toggleScope("vault.api", true);
    await flushPromises();
    vm.save();
    await flushPromises();
    expect(vm.expiryError()).toBe(t("access.tokens.expiry_errors.EXPIRY_TOO_LONG"));
    expect(wrapper.emitted("update:open")).toBeUndefined();

    submit.mockRejectedValueOnce({ response: { status: 400, data: { error: "VALIDATION_ERROR", message: "Mixed", details: [{ field: "non_field_errors", issue: "INVALID", description: "Mixed" }] } } });
    vm.save();
    await flushPromises();
    expect(notify.spawnNotification).toHaveBeenCalledWith({ type: "negative", msg: "Mixed" });
    expect(wrapper.emitted("update:open")).toEqual([[false]]);
  });
});

describe("TokenRotateDialog and TokenExpiryDialog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rotate sends the overlap (24 by default); a secret token's successor needs a date within 365 days", async () => {
    const submit = vi.fn().mockResolvedValue();
    const publishable = mountWith(TokenRotateDialog, { open: true, token: TOKEN, scopes: SCOPES, submit }).vm;
    publishable.save();
    await flushPromises();
    expect(submit).toHaveBeenLastCalledWith({ overlap_hours: 24 });

    const secret = mountWith(TokenRotateDialog, { open: true, token: SECRET_TOKEN, scopes: SCOPES, submit }).vm;
    secret.overlap = "200";
    secret.save();
    expect(secret.formErrors.getFieldError("overlap_hours").msg).toBe(t("access.tokens.overlap_invalid"));
    secret.overlap = "0";
    secret.save();
    await flushPromises();
    expect(submit).toHaveBeenLastCalledWith({ overlap_hours: 0, expires_at: expiryInstant(maxExpiryDate()) });
  });

  it("a legacy key takes a date or no expiry; an issued secret token cannot drop it", async () => {
    const submit = vi.fn().mockResolvedValue();
    const legacy = mountWith(TokenExpiryDialog, { open: true, token: LEGACY, scopes: SCOPES, submit }).vm;
    legacy.save();
    await flushPromises();
    expect(submit).toHaveBeenLastCalledWith({ expires_at: null });
    legacy.date = maxExpiryDate();
    legacy.save();
    await flushPromises();
    expect(submit).toHaveBeenLastCalledWith({ expires_at: expiryInstant(maxExpiryDate()) });

    const secret = mountWith(TokenExpiryDialog, { open: true, token: SECRET_TOKEN, scopes: SCOPES, submit }).vm;
    expect(secret.capped).toBe(true);
    secret.date = "";
    secret.save();
    expect(secret.expiryError()).toBe(t("access.tokens.expiry_errors.EXPIRY_REQUIRED"));
    expect(submit).toHaveBeenCalledTimes(2);
  });
});

describe("ApplicationDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.GET_AccessApplication.mockResolvedValue({ data: { id: 3, name: "Legacy keys: checkout", description: "", is_active: true } });
    api.GET_AccessCatalogue.mockResolvedValue({ data: { modules: [], roles: [], scopes: SCOPES } });
    api.GET_AccessAllTokens.mockResolvedValue([TOKEN, LEGACY, SECRET_TOKEN]);
  });
  const openDetail = async () => {
    const wrapper = mountWith(ApplicationDetail, {}, { params: { id: "3" } });
    await flushPromises();
    return wrapper;
  };

  it("legacy rows read their source, 'Never' for no use and 'No expiry' with no warning", async () => {
    const { vm } = await openDetail();
    expect(api.GET_AccessAllTokens).toHaveBeenCalledWith(3);
    expect(vm.expiryText(LEGACY)).toBe("No expiry");
    expect(vm.expiryText(SECRET_TOKEN)).toMatch(/^in \d+ days · /);
    expect(vm.rowName(LEGACY)).toBe("legacy");
    expect(vm.lastUsedText(LEGACY.last_used_at)).toBe(t("access.tokens.never_used"));
    expect(vm.lastUsedText(TOKEN.last_used_at)).not.toBe(t("access.tokens.never_used"));
    expect(vm.tokenMenu(LEGACY).map((item) => item.key)).toEqual(["rotate", "expiry", "revoke"]);
  });

  it("revoking a publishable key warns; a legacy key's dialog names its source; the call goes by id", async () => {
    api.POST_AccessTokenRevoke.mockResolvedValue({ data: {} });
    const wrapper = await openDetail();
    wrapper.vm.revoking = LEGACY;
    await nextTick();
    expect(wrapper.find('[data-testid="token-revoke-publishable"]').text()).toBe(t("access.tokens.revoke_publishable"));
    expect(wrapper.find('[data-testid="token-revoke-legacy"]').text()).toContain("django_checkout.ChannelApiKey#1");
    wrapper.vm.revoking = SECRET_TOKEN;
    await nextTick();
    expect(wrapper.find('[data-testid="token-revoke-publishable"]').exists()).toBe(false);
    await wrapper.vm.revokeToken();
    expect(api.POST_AccessTokenRevoke).toHaveBeenCalledWith(8);
    expect(notify.spawnNotification).toHaveBeenCalledWith({ type: "positive", msg: t("access.tokens.revoked") });
  });

  it("create and rotate hand the value to SecretReveal only; set expiry posts by id", async () => {
    api.POST_AccessToken.mockResolvedValue({ data: { ...TOKEN, raw: FAKE } });
    api.POST_AccessTokenRotate.mockResolvedValue({ data: { ...SECRET_TOKEN, id: 10, raw: FAKE } });
    api.POST_AccessTokenExpiry.mockResolvedValue({ data: LEGACY });
    const { vm } = await openDetail();
    await vm.createToken({ name: "Shop", scopes: ["checkout.storefront"], channel_idx: null, expires_at: null });
    expect(api.POST_AccessToken).toHaveBeenCalledWith(3, expect.objectContaining({ name: "Shop" }));
    expect(revealShow).toHaveBeenCalledWith(FAKE);
    expect(vm.reveal).toEqual({ open: true, title: t("access.tokens.created_title") });
    expect(JSON.stringify(vm.$data)).not.toContain(FAKE);
    expect(notify.spawnNotification).not.toHaveBeenCalled();

    vm.rotating = SECRET_TOKEN;
    await vm.rotateToken({ overlap_hours: 24, expires_at: null });
    expect(api.POST_AccessTokenRotate).toHaveBeenCalledWith(8, { overlap_hours: 24, expires_at: null });
    expect(vm.rotating).toBeNull();

    vm.expiring = LEGACY;
    await vm.setExpiry({ expires_at: null });
    expect(api.POST_AccessTokenExpiry).toHaveBeenCalledWith(9, { expires_at: null });
    expect(JSON.stringify(notify.spawnNotification.mock.calls)).not.toContain("ent_api_");
  });

  it("does not leave the page while a shown-once value is open", async () => {
    const wrapper = await openDetail();
    const next = vi.fn();
    wrapper.vm.reveal = { open: true, title: "" };
    ApplicationDetail.beforeRouteLeave.call(wrapper.vm, {}, {}, next);
    expect(next).toHaveBeenCalledWith(false);
    wrapper.vm.reveal = { open: false, title: "" };
    ApplicationDetail.beforeRouteLeave.call(wrapper.vm, {}, {}, next);
    expect(next).toHaveBeenLastCalledWith();
  });

  it("a new application posts name and description and opens its page", async () => {
    api.POST_AccessApplication.mockResolvedValue({ data: { id: 12, name: "Widget", description: "", is_active: true } });
    const wrapper = mountWith(ApplicationDetail, {}, {});
    await flushPromises();
    Object.assign(wrapper.vm.form, { name: "Widget", description: "" });
    expect(await wrapper.vm.save()).toBe(true);
    expect(api.POST_AccessApplication).toHaveBeenCalledWith({ name: "Widget", description: "" });
    expect(wrapper.vm.$router.push).toHaveBeenCalledWith("/access/applications/12");
  });
});

describe("ApplicationList", () => {
  it("counts each application's tokens and marks the ones holding legacy keys", async () => {
    vi.clearAllMocks();
    api.GET_AccessAllApplications.mockResolvedValue([
      { id: 3, name: "Legacy keys: checkout", is_active: true },
      { id: 4, name: "Shop", is_active: false },
    ]);
    api.GET_AccessAllTokens.mockImplementation((id) => (id === 3 ? Promise.resolve([LEGACY]) : Promise.reject(new Error("down"))));
    const wrapper = mountWith(ApplicationList);
    await flushPromises();
    expect(wrapper.vm.applications.map(({ id, token_count, legacy }) => ({ id, token_count, legacy }))).toEqual([
      { id: 3, token_count: 1, legacy: true },
      { id: 4, token_count: null, legacy: false },
    ]);
  });

  it("shows the list before the summaries and reads at most four applications' tokens at a time", async () => {
    vi.clearAllMocks();
    api.GET_AccessAllApplications.mockResolvedValue(Array.from({ length: 10 }, (_, i) => ({ id: i + 1, name: `App ${i}`, is_active: true })));
    const pending = [];
    api.GET_AccessAllTokens.mockImplementation(() => new Promise((resolve) => pending.push(resolve)));
    const wrapper = mountWith(ApplicationList);
    await flushPromises();
    expect(wrapper.vm.loading).toBe(false);
    expect(wrapper.vm.applications).toHaveLength(10);
    expect(api.GET_AccessAllTokens).toHaveBeenCalledTimes(4);
    pending.shift()([TOKEN, LEGACY]);
    await flushPromises();
    expect(api.GET_AccessAllTokens).toHaveBeenCalledTimes(5);
    expect(wrapper.vm.applications[0]).toMatchObject({ token_count: 2, legacy: true });
    while (pending.length) {
      pending.shift()([]);
      await flushPromises();
    }
    expect(api.GET_AccessAllTokens).toHaveBeenCalledTimes(10);
  });

  it("stops reading token lists once the page is left", async () => {
    vi.clearAllMocks();
    api.GET_AccessAllApplications.mockResolvedValue(Array.from({ length: 10 }, (_, i) => ({ id: i + 1, name: `App ${i}`, is_active: true })));
    const pending = [];
    api.GET_AccessAllTokens.mockImplementation(() => new Promise((resolve) => pending.push(resolve)));
    const wrapper = mountWith(ApplicationList);
    await flushPromises();
    wrapper.unmount();
    pending.splice(0).forEach((resolve) => resolve([]));
    await flushPromises();
    expect(api.GET_AccessAllTokens).toHaveBeenCalledTimes(4);
  });
});
