import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import axios from "axios";
import Cookies from "universal-cookie";
import { setActivePinia, createPinia } from "pinia";
import { useUserStore } from "@/stores/user";
import { createApiClient } from "@/api/createClient";
import { tokenExpiry } from "@/utils/jwt";
import { jwtExpiringIn } from "../helpers/jwt";

const cookies = new Cookies();
const SESSION_COOKIES = ["token", "refresh", "customer_id", "expiryDate"];

// r04 §9 defect 1: the service issues 300 s access tokens, the client assumed 15 min and refreshed far too late.
// The proactive refresh is scheduled from the lifetime the token carries: 60 s before expiry, never sooner than 10 s.
const login = (seconds, skewSeconds = 0) => {
  const token = jwtExpiringIn(seconds, skewSeconds);
  useUserStore().setAuth({ token, refresh: "r-token", customer_id: "cust-1", expiryDate: tokenExpiry(token) });
};

// An API client whose first call to each URL answers 401 — its retry goes through the shared refresh.
const clientWith401 = (build = createApiClient) => {
  const client = build("http://service.test", { tokenRefresh: true });
  const seen = new Set();
  client.defaults.adapter = async (config) => {
    if (seen.has(config.url)) return { data: {}, status: 200, statusText: "OK", headers: {}, config };
    seen.add(config.url);
    throw Object.assign(new Error("401"), { config, response: { status: 401, config, data: {} } });
  };
  return client;
};

describe("user store — proactive token refresh", () => {
  let post;

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    setActivePinia(createPinia());
    post = vi.spyOn(axios, "post").mockImplementation(async () => ({ data: { data: { access: jwtExpiringIn(300) } } }));
  });

  afterEach(() => {
    useUserStore().clearAuth();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("refreshes a 300 s token 60 s before its exp, not earlier", async () => {
    login(300);

    await vi.advanceTimersByTimeAsync(239_000);
    expect(post).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1_000);
    expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0][1]).toEqual({ refresh: "r-token" });
  });

  it("refreshes a token about to expire after the 10 s floor", async () => {
    login(30);

    await vi.advanceTimersByTimeAsync(9_000);
    expect(post).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1_000);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it("schedules the next refresh from the refreshed token", async () => {
    login(300);
    await vi.advanceTimersByTimeAsync(240_000);

    await vi.advanceTimersByTimeAsync(240_000);
    expect(post).toHaveBeenCalledTimes(2);
  });

  // Review finding: `exp` read against a client clock 5 min ahead looked expired on arrival → a refresh every 10 s.
  it("a client clock 5 min ahead of the server still refreshes once per token lifetime", async () => {
    post.mockImplementation(async () => ({ data: { data: { access: jwtExpiringIn(300, -300) } } }));
    login(300);
    await vi.advanceTimersByTimeAsync(240_000);

    await vi.advanceTimersByTimeAsync(239_000);
    expect(post).toHaveBeenCalledTimes(1);
  });

  // Plan 04 review finding 3: the lifetime comes from the claims, so a server clock an hour ahead changes nothing.
  it("takes the lifetime from the token's claims", async () => {
    login(120, 3600);

    await vi.advanceTimersByTimeAsync(59_000);
    expect(post).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1_000);
    expect(post).toHaveBeenCalledTimes(1);
  });

  // Plan 04 review finding 2: a refresh by an API client left the timer on the old token's schedule.
  it("an API client refresh re-arms the timer from the new token", async () => {
    login(300);
    await vi.advanceTimersByTimeAsync(100_000);
    const fresh = jwtExpiringIn(300);
    post.mockResolvedValueOnce({ data: { data: { access: fresh } } });

    await clientWith401().get("/me/");
    expect(post).toHaveBeenCalledTimes(1);
    expect(useUserStore().token).toBe(fresh);

    await vi.advanceTimersByTimeAsync(140_000);
    expect(post).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(100_000);
    expect(post).toHaveBeenCalledTimes(2);
  });

  it("the timer and an API client refreshing at once send one refresh request", async () => {
    let answer;
    post.mockImplementation(() => new Promise((resolve) => (answer = resolve)));
    login(30);

    await vi.advanceTimersByTimeAsync(10_000);
    const request = clientWith401().get("/me/");
    await vi.advanceTimersByTimeAsync(0);
    answer({ data: { data: { access: jwtExpiringIn(300) } } });
    await request;

    expect(post).toHaveBeenCalledTimes(1);
  });

  // FIX-04 review: the refresh check before a request is the third trigger — it joins the same in-flight call.
  it("the timer, the pre-request check and a 401 retry send one refresh request", async () => {
    let answer;
    post.mockImplementation(() => new Promise((resolve) => (answer = resolve)));
    const fresh = jwtExpiringIn(300);
    login(12);
    const sent = [];
    const expiring = createApiClient("http://service.test", {
      authHeaderFn: () => `Bearer ${cookies.get("token")}`,
      tokenRefresh: true,
    });
    expiring.defaults.adapter = async (config) => {
      sent.push(config.headers.Authorization);
      return { data: {}, status: 200, statusText: "OK", headers: {}, config };
    };

    await vi.advanceTimersByTimeAsync(10_000);
    const requests = [expiring.get("/a/"), clientWith401().get("/me/")];
    await vi.advanceTimersByTimeAsync(0);
    answer({ data: { data: { access: fresh } } });
    await Promise.all(requests);

    expect(post).toHaveBeenCalledTimes(1);
    expect(sent).toEqual([`Bearer ${fresh}`]);
    await vi.advanceTimersByTimeAsync(100_000);
    expect(post).toHaveBeenCalledTimes(1);
  });

  // FIX-04 review: a refresh answered after a logout wrote the session back and re-armed the timer.
  it("a logout during an in-flight refresh stays logged out and writes no cookie", async () => {
    let answer;
    post.mockImplementation(() => new Promise((resolve) => (answer = resolve)));
    login(30);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(post).toHaveBeenCalledTimes(1);

    useUserStore().clearAuth();
    const set = vi.spyOn(Cookies.prototype, "set");
    answer({ data: { data: { access: jwtExpiringIn(300), refresh: "rotated" } } });
    await vi.advanceTimersByTimeAsync(600_000);

    expect(set).not.toHaveBeenCalled();
    expect(SESSION_COOKIES.map((name) => cookies.get(name))).toEqual([undefined, undefined, undefined, undefined]);
    expect(useUserStore().token).toBeNull();
    expect(post).toHaveBeenCalledTimes(1);
    // the dropped answer is not a session expiry: no second logout, no return route to the page left behind
    expect(localStorage.getItem("cms_return_route")).toBeNull();
  });

  // Code review: a login right after the logout joined the still-pending old refresh and was wiped by its drop.
  it("a login after a logout never joins the dropped refresh", async () => {
    const answers = [];
    post.mockImplementation(() => new Promise((resolve) => answers.push(resolve)));
    const fresh = jwtExpiringIn(300);
    login(30);
    await vi.advanceTimersByTimeAsync(10_000);

    useUserStore().clearAuth();
    login(300);
    const request = clientWith401().get("/me/");
    await vi.advanceTimersByTimeAsync(0);
    expect(post).toHaveBeenCalledTimes(2);

    answers[0]({ data: { data: { access: jwtExpiringIn(300) } } });
    answers[1]({ data: { data: { access: fresh } } });
    await request;

    expect(useUserStore().token).toBe(fresh);
    expect(cookies.get("token")).toBe(fresh);
  });

  it("a refresh keeps the customer id and never writes an unknown one", async () => {
    login(300);
    cookies.remove("customer_id", { path: "/" });

    await clientWith401().get("/me/");
    expect(useUserStore().customer_id).toBe("cust-1");
    expect(cookies.get("customer_id")).toBe("cust-1");

    useUserStore().clearAuth();
    useUserStore().setAuth({ token: jwtExpiringIn(300), refresh: "r-token", expiryDate: null });
    expect(useUserStore().customer_id).toBeNull();
    expect(cookies.get("customer_id")).toBeUndefined();
  });
});

// Last in the file: it resets the module registry. FIX-04 review: a client built before the store module loaded
// got `storeAuth is not a function` after a successful refresh and signed the user out.
describe("token refresh — module load order", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    SESSION_COOKIES.forEach((name) => cookies.remove(name, { path: "/" }));
  });

  it("a client created before the user store is imported refreshes without error", async () => {
    vi.resetModules();
    setActivePinia(createPinia());
    const { createApiClient: buildBeforeStore } = await import("@/api/createClient");
    const fresh = jwtExpiringIn(300);
    vi.spyOn(axios, "post").mockResolvedValue({ data: { data: { access: fresh } } });
    cookies.set("refresh", "r-token", { path: "/" });

    await clientWith401(buildBeforeStore).get("/me/");

    const { useUserStore: loadedStore } = await import("@/stores/user");
    expect(loadedStore().token).toBe(fresh);
    expect(cookies.get("token")).toBe(fresh);
    loadedStore().clearAuth();
  });
});
