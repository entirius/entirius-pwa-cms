import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import axios from "axios";
import { setActivePinia, createPinia } from "pinia";
import { useUserStore } from "@/stores/user";
import { createApiClient } from "@/api/createClient";
import { tokenExpiry } from "@/utils/jwt";
import { jwtExpiringIn } from "../helpers/jwt";

// r04 §9 defect 1: the service issues 300 s access tokens, the client assumed 15 min and refreshed far too late.
// The proactive refresh is scheduled from the lifetime the token carries: 60 s before expiry, never sooner than 10 s.
const login = (seconds, skewSeconds = 0) => {
  const token = jwtExpiringIn(seconds, skewSeconds);
  useUserStore().setAuth({ token, refresh: "r-token", customer_id: "cust-1", expiryDate: tokenExpiry(token) });
};

// An API client whose first call to each URL answers 401 — its retry goes through the shared refresh.
const clientWith401 = () => {
  const client = createApiClient("http://service.test", { tokenRefresh: true });
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
});
