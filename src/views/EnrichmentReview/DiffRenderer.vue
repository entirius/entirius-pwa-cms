<template>
  <ImageDiff
    v-if="isImage"
    :before-url="imageBeforeUrl"
    :proposal-id="proposalId"
    :alt="subjectLabel"
  />
  <component :is="diffComponent" v-else :before="before" :after="after" />
</template>

<script>
// Universal before/after renderer. Dispatches to the existing supplier diff
// components keyed by the proposal's `target_kind`. Reuses the diff widgets from
// the suppliers feature — zero new diff UI (etap-06).
//
// `proposed` = ContentProposal.proposed_value, `current` = current_snapshot.
// Both are dicts. The PIM adapter convention wraps the value as {text: "..."},
// but the renderer stays module-agnostic: it unwraps the scalar for
// text/number/array kinds and falls back to a JSON diff for anything else.
import StringDiff from "@/views/Pim/components/supplier/diffs/StringDiff.vue";
import NumericDiff from "@/views/Pim/components/supplier/diffs/NumericDiff.vue";
import ArrayDiff from "@/views/Pim/components/supplier/diffs/ArrayDiff.vue";
import JsonDiff from "@/views/Pim/components/supplier/diffs/JsonDiff.vue";
import ImageDiff from "./ImageDiff.vue";

const KIND_TO_COMPONENT = {
  text: "StringDiff",
  string: "StringDiff",
  number: "NumericDiff",
  numeric: "NumericDiff",
  array: "ArrayDiff",
  list: "ArrayDiff",
  json: "JsonDiff",
  object: "JsonDiff",
  image: "ImageDiff",
  picture: "ImageDiff",
};

// Media kinds render the before/after picture pane instead of a scalar diff.
const IMAGE_KINDS = new Set(["image", "picture"]);

export default {
  name: "DiffRenderer",
  components: { StringDiff, NumericDiff, ArrayDiff, JsonDiff, ImageDiff },
  props: {
    targetKind: { type: String, default: "text" },
    proposed: { type: [Object, Array, String, Number], default: null },
    current: { type: [Object, Array, String, Number], default: null },
    proposalId: { type: [Number, String], default: null },
    subjectLabel: { type: String, default: "" },
  },
  computed: {
    isImage() {
      return IMAGE_KINDS.has(this.targetKind);
    },
    // The "before" picture URL lives in current_snapshot.url (a relative /media path from PIM).
    // Prefix the backend base so the <img> resolves; absolute URLs pass through untouched.
    imageBeforeUrl() {
      const url =
        this.current && typeof this.current === "object"
          ? this.current.url
          : null;
      if (!url) return "";
      if (/^https?:\/\//.test(url)) return url;
      return `${process.env.VUE_APP_API_URL || ""}${url}`;
    },
    diffComponent() {
      return KIND_TO_COMPONENT[this.targetKind] || "JsonDiff";
    },
    before() {
      return this.unwrap(this.current);
    },
    after() {
      return this.unwrap(this.proposed);
    },
  },
  methods: {
    // For scalar kinds, pull the single value out of the {key: value} envelope
    // so StringDiff/NumericDiff/ArrayDiff receive a primitive, not a dict.
    // JSON kind keeps the whole object.
    unwrap(value) {
      if (this.diffComponent === "JsonDiff") return value;
      if (value == null) return null;
      if (typeof value !== "object" || Array.isArray(value)) return value;
      const keys = Object.keys(value);
      if (keys.length === 1) return value[keys[0]];
      // Common PIM key wins when present, else hand the whole dict over.
      return value.text ?? value.value ?? value;
    },
  },
};
</script>
