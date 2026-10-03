// @vitest-environment node
// Plan 19: the read-only audit flags a template click that reaches a write API outside the read-only-aware boots.
import { describe, it, expect } from "vitest";
import { auditSource, mutatingNames, routedViews } from "../../../scripts/audit/readonly.mjs";

const sfc = (template) => `<template>
  <div>
${template}
  </div>
</template>

<script>
import { GET_Items, DELETE_Item as removeItem } from "@/api/faq/api";
export default {
  methods: {
    async remove(id) {
      await removeItem(id);
    },
    confirmRemove(id) {
      this.remove(id);
    },
    open(id) {
      GET_Items(id);
    },
  },
};
</script>
`;

describe("readonly audit", () => {
  it("follows the file's own functions to a write API, never to a read", () => {
    const names = mutatingNames(sfc("").split("<script>")[1]);
    expect([...names].sort()).toEqual(["confirmRemove", "remove", "removeItem"]);
  });

  it("flags a mutating click with its line, and nothing else", () => {
    const findings = auditSource(sfc(`    <BasicButton @click="confirmRemove(1)">x</BasicButton>
    <button @click="open(1)">y</button>`));
    expect(findings).toEqual([{ line: 3, tag: "BasicButton", handler: "confirmRemove(1)" }]);
  });

  it("accepts `mutates` on a BasicButton or IconButton, not on a raw element", () => {
    expect(auditSource(sfc(`    <IconButton mutates icon="delete" label="x" @click="remove(1)" />`))).toEqual([]);
    expect(auditSource(sfc(`    <button mutates @click="remove(1)">x</button>`))).toHaveLength(1);
  });

  it("maps routed views to their panel, the webpack chunk comment included", () => {
    const router = `
      { path: "a", component: () => import(/* webpackChunkName: "faq" */ "../views/Faq/GroupList.vue"),
        meta: { panel: "faq" } },
      { path: "b", component: Builds, meta: { panel: "pages" } },`;
    const source = `import Builds from "../views/Builder/Builds.vue";\nconst routes = [${router}];`;
    expect(routedViews(source)).toEqual([
      { panel: "faq", file: "src/views/Faq/GroupList.vue" },
      { panel: "pages", file: "src/views/Builder/Builds.vue" },
    ]);
  });
});
