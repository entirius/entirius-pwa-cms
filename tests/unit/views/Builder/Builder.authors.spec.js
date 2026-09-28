import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET_Authors } from "@/api/contentDB/api";
import Builder from "@/views/Builder/Builder.vue";

vi.mock("@/api/contentDB/api", async (importOriginal) => ({ ...(await importOriginal()), GET_Authors: vi.fn() }));

// The author fields moved from the view-local AuthorPicker to EntitySearchPicker (plan 35): the same `authors` /
// `co_authors` uid arrays the save payload sends.
const state = (overrides = {}) => ({ authors: [], co_authors: [], authorNames: {}, ...overrides });
const call = (name, vm, ...args) => Builder.methods[name].call(Object.assign(vm, Builder.methods), ...args);

describe("Builder — author fields", () => {
  beforeEach(() => GET_Authors.mockReset());

  it("a picked author is appended to its list, once", () => {
    const vm = state({ authors: ["a1"] });
    call("addAuthor", vm, "authors", "a2");
    call("addAuthor", vm, "authors", "a2");
    call("addAuthor", vm, "co_authors", "a3");
    expect(vm).toMatchObject({ authors: ["a1", "a2"], co_authors: ["a3"] });
  });

  it("the picker's clear (null) adds nothing; a Tag removes its author", () => {
    const vm = state({ authors: ["a1", "a2"] });
    call("addAuthor", vm, "authors", null);
    call("removeAuthor", vm, "authors", "a1");
    expect(vm.authors).toEqual(["a2"]);
  });

  it("searches active authors, skips the picked ones and remembers the names for the Tags", async () => {
    GET_Authors.mockResolvedValue({
      data: {
        results: [
          { uid: "a1", name: "Ann", role_t9n: { en: "Editor" } },
          { uid: "a2", name: "Bob", role_t9n: null },
          { uid: "a3", name: "Cid", role_t9n: {} },
        ],
      },
    });
    const vm = state({ authors: ["a1"], co_authors: ["a3"] });
    const options = await call("searchAuthors", vm, "b");

    expect(GET_Authors).toHaveBeenCalledWith({ is_active: true, page_size: 20, search: "b" });
    expect(options).toEqual([{ label: "Bob", value: "a2", secondary: "" }]);
    expect(vm.authorNames).toEqual({ a2: "Bob" });
  });

  it("an empty search sends no search param", async () => {
    GET_Authors.mockResolvedValue({ data: { results: [{ uid: "a1", name: "Ann", role_t9n: { en: "Editor" } }] } });
    const options = await call("searchAuthors", state(), "");
    expect(GET_Authors).toHaveBeenCalledWith({ is_active: true, page_size: 20 });
    expect(options).toEqual([{ label: "Ann", value: "a1", secondary: "Editor" }]);
  });
});
