<template>
  <div class="mapping-row b-basic-300 br-sm p-200 mb-100">
    <div class="mapping-row__grid">
      <FormField
        :label="$t('suppliers.mappings.attribute.source_field')"
        :tooltip="$t('suppliers.mappings.attribute.source_field_help')"
      >
        <EntitySearchPicker
          v-if="isNew"
          v-model="local.source_field"
          :display-value="local.source_field"
          :fetch-fn="sourceFieldFetchFn"
          :placeholder="
            $t('suppliers.mappings.attribute.source_field_placeholder')
          "
          :client-filter="true"
          :data-testid="`attr-mapping-source-${rowKey}`"
        />
        <BasicInput
          v-else
          v-model="local.source_field"
          :is-disabled="true"
          :data-testid="`attr-mapping-source-${rowKey}`"
        />
      </FormField>
      <FormField :label="$t('suppliers.mappings.attribute.target_type')">
        <Dropdown
          :values="targetTypeOptions"
          :selected="[local.target_type]"
          :data-testid="`attr-mapping-target-type-${rowKey}`"
          @onSelect="(val) => (local.target_type = val)"
        />
      </FormField>
      <FormField :label="$t('suppliers.mappings.attribute.modifier')">
        <Dropdown
          :values="modifierOptions"
          :selected="[local.modifier || 'none']"
          :data-testid="`attr-mapping-modifier-${rowKey}`"
          @onSelect="(val) => (local.modifier = val)"
        />
        <span
          v-if="modifierPreview"
          class="modifier-preview t-basic-500 fs-200 mt-100"
          :data-testid="`attr-mapping-modifier-preview-${rowKey}`"
        >
          {{ modifierPreview }}
        </span>
      </FormField>
      <FormField :label="$t('suppliers.mappings.attribute.target_identifier')">
        <EntitySearchPicker
          v-if="local.target_type === 'feature'"
          v-model="local.target_identifier"
          :display-value="local.target_identifier"
          :fetch-fn="featureFetchFn"
          :placeholder="
            $t(
              'suppliers.mappings.attribute.target_identifier_feature_placeholder'
            )
          "
          :client-filter="true"
          :data-testid="`attr-mapping-target-id-${rowKey}`"
        />
        <Dropdown
          v-else-if="local.target_type === 'real_product'"
          :values="realProductOptions"
          :selected="[local.target_identifier]"
          :placeholder="
            $t(
              'suppliers.mappings.attribute.target_identifier_real_product_placeholder'
            )
          "
          :data-testid="`attr-mapping-target-id-${rowKey}`"
          @onSelect="(val) => (local.target_identifier = val)"
        />
        <BasicInput
          v-else
          v-model="local.target_identifier"
          :is-disabled="true"
          :placeholder="
            $t(
              'suppliers.mappings.attribute.target_identifier_skip_placeholder'
            )
          "
          :data-testid="`attr-mapping-target-id-${rowKey}`"
        />
      </FormField>
      <FormField :label="$t('suppliers.mappings.attribute.is_required')">
        <Switcher
          :selected="local.is_required"
          :data-testid="`attr-mapping-required-${rowKey}`"
          @onSelect="local.is_required = !local.is_required"
        />
      </FormField>
    </div>
    <div class="flex ai-ct gap-100 mt-200 jc-end">
      <span
        v-if="rowWarnings.length"
        class="row-warning t-warning-300"
        :title="warningTitle"
        :data-testid="`attr-mapping-warning-${rowKey}`"
      >
        <FontAwesomeIcon icon="triangle-exclamation" />
        <span class="fs-200 fw-600">{{ rowWarnings.length }}</span>
      </span>
      <button
        v-if="!isNew"
        class="row-action-btn bg-negative-100 t-negative-300"
        :title="$t('common.delete')"
        :data-testid="`attr-mapping-delete-${rowKey}`"
        @click="$emit('delete', mapping)"
      >
        <FontAwesomeIcon icon="trash-can" />
      </button>
      <button
        class="suppliers-primary-btn"
        :disabled="busy"
        :data-testid="`attr-mapping-save-${rowKey}`"
        @click="emitSave"
      >
        <FontAwesomeIcon icon="floppy-disk" />
        {{ $t("common.save") }}
      </button>
    </div>
  </div>
</template>

<script>
const EMPTY = () => ({
  source_field: "",
  target_type: "feature",
  target_identifier: "",
  is_required: false,
  modifier: "none",
});

// Hardcoded whitelist of RealProduct fields editable via supplier mapping (etap-01 §5.3).
// Source: workbook §4 dziura #6. These are the only RealProduct columns operator may map.
const REAL_PRODUCT_FIELDS = [
  "weight",
  "ean",
  "width",
  "height",
  "deep",
  "kind_of_product",
];

// Mirrors backend enums.MappingValueModifier (etap-09). Order matters for the
// dropdown — keep "none" first, group numeric → currency → string.
const MODIFIER_KEYS = [
  "none",
  "grams_to_kg",
  "kg_to_grams",
  "mm_to_cm",
  "cm_to_mm",
  "mm_to_m",
  "currency_minor_to_major",
  "currency_major_to_minor",
  "string_trim",
  "string_lowercase",
  "string_uppercase",
];

// Representative sample per modifier used by the live preview ("7800 → 7.8").
// Keep values typical so the operator immediately recognises the transform.
const MODIFIER_SAMPLES = {
  grams_to_kg: { input: 7800, output: "7.8" },
  kg_to_grams: { input: 7.8, output: "7800" },
  mm_to_cm: { input: 100, output: "10" },
  cm_to_mm: { input: 10, output: "100" },
  mm_to_m: { input: 1500, output: "1.5" },
  currency_minor_to_major: { input: 2999, output: "29.99" },
  currency_major_to_minor: { input: 29.99, output: "2999" },
  string_trim: { input: '"  Hello  "', output: '"Hello"' },
  string_lowercase: { input: '"BLUE"', output: '"blue"' },
  string_uppercase: { input: '"blue"', output: '"BLUE"' },
};

export default {
  name: "AttributeMappingRow",
  props: {
    mapping: { type: Object, default: null },
    busy: { type: Boolean, default: false },
    supplierIdx: { type: String, default: "" },
    channelIdx: { type: String, default: null },
    features: { type: Array, default: () => [] },
    dataKeys: {
      type: Object,
      default: () => ({ tokens: [], data_keys: [], sample_size: 0 }),
    },
    warnings: { type: Array, default: () => [] },
  },
  emits: ["save", "delete"],
  data() {
    const seed = this.mapping ? { ...this.mapping } : EMPTY();
    if (!seed.modifier) seed.modifier = "none";
    return {
      local: seed,
    };
  },
  computed: {
    isNew() {
      return !this.mapping?.id;
    },
    rowKey() {
      return this.mapping?.id ?? "new";
    },
    targetTypeOptions() {
      return [
        {
          value: "feature",
          label: this.$t("suppliers.mappings.target_type.feature"),
        },
        {
          value: "real_product",
          label: this.$t("suppliers.mappings.target_type.real_product"),
        },
        {
          value: "skip",
          label: this.$t("suppliers.mappings.target_type.skip"),
        },
      ];
    },
    realProductOptions() {
      return REAL_PRODUCT_FIELDS.map((f) => ({ value: f, label: f }));
    },
    modifierOptions() {
      return MODIFIER_KEYS.map((key) => ({
        value: key,
        label: this.$t(`suppliers.mappings.modifier.${key}`),
      }));
    },
    modifierPreview() {
      const mod = this.local.modifier;
      if (!mod || mod === "none") return null;
      const sample = MODIFIER_SAMPLES[mod];
      if (!sample) return null;
      return `${sample.input} → ${sample.output}`;
    },
    sourceFieldOptions() {
      const tokens = (this.dataKeys?.tokens || []).map((t) => ({
        value: t.key,
        label: t.key,
        secondary: t.description,
      }));
      const dataKeys = (this.dataKeys?.data_keys || []).map((k) => ({
        value: k.key,
        label: k.key,
        secondary: `${k.presence_pct}% • ${k.type}${
          k.sample_value ? ` • "${k.sample_value}"` : ""
        }`,
      }));
      return [...tokens, ...dataKeys];
    },
    featureOptions() {
      return (this.features || []).map((f) => {
        const label = f.name_t9n?.en || f.name_t9n?.pl || f.idx;
        return {
          value: f.idx,
          label,
          secondary: f.idx === label ? undefined : f.idx,
        };
      });
    },
    rowWarnings() {
      if (!this.mapping?.id) return [];
      return (this.warnings || []).filter(
        (w) =>
          w.mapping_kind === "attribute" && w.mapping_id === this.mapping.id
      );
    },
    warningTitle() {
      return this.rowWarnings.map((w) => w.message).join("\n");
    },
  },
  watch: {
    mapping(val) {
      const seed = val ? { ...val } : EMPTY();
      if (!seed.modifier) seed.modifier = "none";
      this.local = seed;
    },
    "local.target_type"() {
      // etap-12 #18: target_identifier is bound to the picked target_type's whitelist
      // (Features for FEATURE, RealProduct fields for REAL_PRODUCT, etc.). Stale
      // identifiers survive in existing rows when the type flips — the operator then
      // saves a mapping pointing at the wrong namespace. Clear unconditionally.
      // source_field stays intact (it's the supplier-side column, orthogonal to target).
      this.local.target_identifier = "";
    },
  },
  methods: {
    emitSave() {
      this.$emit("save", { ...this.local, id: this.mapping?.id });
    },
    sourceFieldFetchFn() {
      // Synchronous: full list returned to EntitySearchPicker, clientFilter does the rest.
      return Promise.resolve(this.sourceFieldOptions);
    },
    featureFetchFn() {
      return Promise.resolve(this.featureOptions);
    },
  },
};
</script>

<style lang="scss" scoped>
.mapping-row {
  background: var(--c-basic-100);
}
.mapping-row__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--space-200);
}
.row-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
}
.suppliers-primary-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  font-size: var(--fs-200);
  font-weight: 600;
  border-radius: var(--radius-sm);
  border: 1px solid var(--c-support-400);
  background: var(--c-support-400);
  color: var(--c-basic-100);
  cursor: pointer;
}
.suppliers-primary-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.row-warning {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 var(--space-50);
}
.modifier-preview {
  display: inline-block;
  font-family: var(--ff-mono, monospace);
}
</style>
