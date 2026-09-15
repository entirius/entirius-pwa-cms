import { describe, it, expect, vi, beforeEach } from "vitest";

const get = vi.hoisted(() => vi.fn());
vi.mock("@/api/communicator/client", () => ({ communicatorApi: { get } }));
vi.mock("@/stores/leadsChannel", () => ({ useLeadsChannelStore: () => ({ activeChannelIdx: "b2b" }) }));

import { GET_ReviewMessage } from "@/api/communicator/api";

const page = (ids, next) => ({ data: { results: ids.map((id) => ({ id })), next } });

describe("GET_ReviewMessage", () => {
  beforeEach(() => get.mockReset());

  it("opens a draft beyond the first review page", async () => {
    get.mockResolvedValueOnce(page([1, 2], "?page=2")).mockResolvedValueOnce(page([150], null));
    expect(await GET_ReviewMessage("150")).toEqual({ id: 150 });
    expect(get).toHaveBeenLastCalledWith("/api/communicator/v2/admin/b2b/review/", {
      params: { status: "review_required", page_size: 100, page: 2 },
    });
  });

  it("returns null once the last page has no such draft", async () => {
    get.mockResolvedValueOnce(page([1], null));
    expect(await GET_ReviewMessage(9)).toBeNull();
    expect(get).toHaveBeenCalledTimes(1);
  });
});
