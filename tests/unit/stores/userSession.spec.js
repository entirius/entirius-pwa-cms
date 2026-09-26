import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import axios from "axios";
import { setActivePinia, createPinia } from "pinia";
import { useUserStore } from "@/stores/user";
import { jwtExpiringIn } from "../helpers/jwt";

// r04 §9 defect 1: the service issues 300 s access tokens, the client assumed 15 min and refreshed far too late.
// The proactive refresh is scheduled from the lifetime the token carries: 60 s before expiry, never sooner than 10 s.
const login = (seconds) =>
  useUserStore().setAuth({
    token: jwtExpiringIn(seconds),
    refresh: "r-token",
    customer_id: "cust-1",
    expiryDate: new Date(Date.now() + seconds * 1000),
  });

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
});
