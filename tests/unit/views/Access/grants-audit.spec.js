import { describe, it, expect } from "vitest";
import { grantPayload, grantErrorMessage, roleLabel, roleOptions } from "@/views/Access/grants";
import { AUDIT_PAGE_SIZE, auditParams, groupBypass } from "@/views/Access/audit";

// Access plan 21: grant payloads, the "via <group>" marker, the lockout sentence and the audit query.
const t = (key, params) => (params ? `${key}::${JSON.stringify(params)}` : key);
const httpError = (status, data) => ({ response: { status, data } });

describe("grants", () => {
  it("a grant goes to one user or one group", () => {
    expect(grantPayload("viewer", { userId: 5 })).toEqual({ role: "viewer", user_id: 5 });
    expect(grantPayload("editor", { groupId: 3 })).toEqual({ role: "editor", group_id: 3 });
  });

  it("a group grant carries the via marker, a direct one is the role name", () => {
    expect(roleLabel({ key: "viewer", name: "Viewer", via_group: null }, t)).toBe("Viewer");
    expect(roleLabel({ key: "editor", name: "Editor", via_group: "Shop" }, t)).toBe(
      'Editor · access.staff.via::{"group":"Shop"}'
    );
  });

  it("roles already held directly are not offered again", () => {
    const roles = [{ key: "viewer", name: "Viewer" }, { key: "editor", name: "Editor" }];
    expect(roleOptions(roles, ["viewer"])).toEqual([{ label: "Editor", value: "editor" }]);
  });

  it("a revoke refused by the lockout guard reads as the sentence, never the code", () => {
    const lockout = httpError(409, { error: "CONFLICT", message: "Nobody active would be left to manage access" });
    expect(grantErrorMessage(lockout, t, { revoking: true })).toBe("access.grants.lockout");
  });

  it("a refused grant shows the server's message", () => {
    const notStaff = httpError(400, {
      error: "VALIDATION_ERROR",
      message: "Invalid input.",
      details: [{ field: "non_field_errors", description: "Grants go only to active staff users" }],
    });
    expect(grantErrorMessage(notStaff, t)).toBe("Grants go only to active staff users");
    expect(grantErrorMessage(httpError(409, { message: "Already granted" }), t)).toBe("Already granted");
  });
});

describe("audit", () => {
  it("filters become the query: action, actor id and the local day bounds", () => {
    const params = auditParams({ page: 2, action: "grant.migrate", actor: 7, from: "2026-10-01", to: "2026-10-02" });
    expect(params).toMatchObject({ page: 2, page_size: AUDIT_PAGE_SIZE, action: "grant.migrate", actor: 7 });
    expect(params.from).toBe(new Date(2026, 9, 1).toISOString());
    expect(params.to).toBe(new Date(new Date(2026, 9, 3).getTime() - 1).toISOString());
  });

  it("empty filters stay out of the query", () => {
    expect(auditParams({ action: null, actor: null, from: "", to: "" })).toEqual({ page: 1, page_size: AUDIT_PAGE_SIZE });
  });

  it("gate bypasses fold into one row per actor and day; a lone one stays", () => {
    const at = (day, hour) => new Date(2026, 9, day, hour).toISOString();
    const bypass = (id, actor, created_at) => ({ id, actor_id: actor, action: "gate.bypass", created_at, detail: { id } });
    const entries = [
      bypass(1, 1, at(2, 15)),
      { id: 2, actor_id: 1, action: "grant.create", created_at: at(2, 14), detail: {} },
      bypass(3, 1, at(2, 10)),
      bypass(4, 2, at(2, 9)),
      bypass(5, 1, at(1, 9)),
    ];
    const rows = groupBypass(entries);
    expect(rows.map((row) => row.grouped?.length ?? row.id)).toEqual([2, 2, 4, 5]);
    expect(rows[0].detail).toEqual({ requests: [{ id: 1 }, { id: 3 }] });
    expect(rows[0].created_at).toBe(at(2, 15));
  });
});
