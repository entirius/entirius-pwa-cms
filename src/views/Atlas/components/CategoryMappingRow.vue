<template>
  <div class="mapping-row b-basic-300 br-sm p-200 mb-100">
    <div class="mapping-row__grid">
      <FormField
        :label="$t('atlas.mappings.category.source_field')"
        :tooltip="$t('atlas.mappings.category.source_field_help')"
      >
        <EntitySearchPicker
          v-if="isNew"
          v-model="local.source_field"
          :display-value="local.source_field"
          :fetch-fn="sourceFieldFetchFn"
          :placeholder="
            $t('atlas.mappings.category.source_field_placeholder')
          "
          :client-filter="true"
          :data-testid="`cat-mapping-source-${rowKey}`"
        />
        <BasicInput
          v-else
          v-model="local.source_field"
          :is-disabled="true"
          :data-testid="`cat-mapping-source-${rowKey}`"
        />
      </FormField>
      <FormField :label="$t('atlas.mappings.category.source_value')">
        <SourceValuePicker
          v-if="isNew"
          v-model="local.source_value"
          :supplier-idx="supplierIdx"
          :source-field="local.source_field"
          :placeholder="
            $t('atlas.mappings.category.source_value_placeholder')
          "
          :test-id="`cat-mapping-value-${rowKey}`"
        />
        <BasicInput
          v-else
          v-model="local.source_value"
          :is-disabled="true"
          :data-testid="`cat-mapping-value-${rowKey}`"
        />
      </FormField>
      <FormField :label="$t('atlas.mappings.category.target_category_idx')">
        <EntitySearchPicker
          v-if="channelIdx"
          v-model="local.target_category_idx"
          :display-value="categoryDisplayValue"
          :fetch-fn="categoryFetchFn"
          :placeholder="
            $t('atlas.mappings.category.target_category_placeholder')
          "
          :data-testid="`cat-mapping-target-${rowKey}`"
        />
        <BasicInput
          v-else
          v-model="local.target_category_idx"
          :placeholder="
            $t('atlas.mappings.category.target_category_no_channel_hint')
          "
          :data-testid="`cat-mapping-target-${rowKey}`"
        />
      </FormField>
    </div>
    <div class="flex ai-ct gap-100 mt-200 jc-end">
      <span
        v-if="rowWarnings.length"
        class="row-warning t-warning-300"
        :title="warningTitle"
        :data-testid="`cat-mapping-warning-${rowKey}`"
      >
        <FontAwesomeIcon icon="triangle-exclamation" />
        <span class="fs-200 fw-600">{{ rowWarnings.length }}</span>
      </span>
      <button
        v-if="!isNew"
        class="row-action-btn bg-negative-100 t-negative-300"
        :title="$t('common.delete')"
        :data-testid="`cat-mapping-delete-${rowKey}`"
        @click="$emit('delete', mapping)"
      >
        <FontAwesomeIcon icon="trash-can" />
      </button>
      <button
        class="suppliers-primary-btn"
        :disabled="busy"
        :data-testid="`cat-mapping-save-${rowKey}`"
        @click="emitSave"
      >
        <FontAwesomeIcon icon="floppy-disk" />
        {{ $t("common.save") }}
      </button>
    </div>
  </div>
</template>

<script>
import { GET_Categories } from "@/api/pim/api";
import SourceValuePicker from "./SourceValuePicker.vue";

const EMPTY = () => ({
  source_field: "",
  source_value: "",
  target_category_idx: "",
});

export default {
  name: "CategoryMappingRow",
  components: { SourceValuePicker },
  props: {
    mapping: { type: Object, default: null },
    busy: { type: Boolean, default: false },
    supplierIdx: { type: String, default: "" },
    channelIdx: { type: String, default: null },
    dataKeys: {
      type: Object,
      default: () => ({ tokens: [], data_keys: [], sample_size: 0 }),
    },
    warnings: { type: Array, default: () => [] },
  },
  emits: ["save", "delete"],
  data() {
    return {
      local: this.mapping ? { ...this.mapping } : EMPTY(),
      _categoryCache: [],
    };
  },
  computed: {
    isNew() {
      return !this.mapping?.id;
    },
    rowKey() {
      return this.mapping?.id ?? "new";
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
    categoryDisplayValue() {
      const cached = this._categoryCache.find(
        (c) => c.idx === this.local.target_category_idx
      );
      if (cached) return cached.name || cached.idx;
      return this.local.target_category_idx || "";
    },
    rowWarnings() {
      if (!this.mapping?.id) return [];
      return (this.warnings || []).filter(
        (w) => w.mapping_kind === "category" && w.mapping_id === this.mapping.id
      );
    },
    warningTitle() {
      return this.rowWarnings
        .map((w) => {
          const suggestion = w.details?.suggestion;
          return suggestion ? `${w.message} — ${suggestion}?` : w.message;
        })
        .join("\n");
    },
  },
  watch: {
    mapping(val) {
      this.local = val ? { ...val } : EMPTY();
    },
  },
  methods: {
    emitSave() {
      this.$emit("save", { ...this.local, id: this.mapping?.id });
    },
    sourceFieldFetchFn() {
      return Promise.resolve(this.sourceFieldOptions);
    },
    async categoryFetchFn(query) {
      if (!this.channelIdx) return [];
      try {
        const params = { page_size: 200 };
        if (query) params.search = query;
        const { data } = await GET_Categories(this.channelIdx, params);
        const items = data?.results || data || [];
        this._categoryCache = items;
        return items.map((c) => ({
          value: c.idx,
          label: c.name || c.idx,
          secondary: c.idx,
        }));
      } catch {
        return [];
      }
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
</style>
