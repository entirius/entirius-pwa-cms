<template>
  <div class="source-value-picker" v-out="() => closeDropdown()">
    <div class="source-value-picker__wrapper">
      <BasicInput
        v-model="local"
        :is-disabled="disabled"
        :placeholder="placeholder"
        :data-testid="`${testId}-input`"
        @focusin="onFocus"
      />
      <FontAwesomeIcon
        icon="chevron-down"
        class="source-value-picker__chevron"
        :class="{ 'source-value-picker__chevron--open': open }"
        @click="toggleDropdown"
      />
    </div>
    <div
      v-if="open"
      class="source-value-picker__panel bg-basic-100 b-basic-300"
      :data-testid="`${testId}-popover`"
    >
      <div v-if="loading && !filteredValues.length" class="source-value-picker__state t-basic-500 p-100 fs-200">
        {{ $t("layout_extender.searching") }}
      </div>
      <div
        v-else-if="!sourceField"
        class="source-value-picker__state t-basic-500 p-100 fs-200"
      >
        {{ $t("atlas.mappings.category.source_value_picker_no_source_field") }}
      </div>
      <div
        v-else-if="error"
        class="source-value-picker__state t-negative-300 p-100 fs-200"
      >
        {{ error }}
      </div>
      <div
        v-else-if="!filteredValues.length"
        class="source-value-picker__state t-basic-500 p-100 fs-200"
      >
        {{
          values.length
            ? $t("layout_extender.no_results")
            : $t("atlas.mappings.category.source_value_picker_empty")
        }}
      </div>
      <ul v-else class="source-value-picker__list">
        <li
          v-for="item in filteredValues"
          :key="item.value"
          class="source-value-picker__item flex ai-ct jc-sb p-100"
          :data-testid="`${testId}-option`"
          @click="selectValue(item.value)"
        >
          <span class="source-value-picker__value">{{ item.value }}</span>
          <span class="source-value-picker__count t-basic-500 fs-200">
            {{ item.count }}
            {{ $t("atlas.mappings.category.source_value_picker_count_suffix") }}
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import { GET_DataValues } from "@/api/atlas/api";
import { extractApiMessage } from "@/composables/useFormErrors";

export default {
  name: "SourceValuePicker",
  props: {
    modelValue: { type: String, default: "" },
    supplierIdx: { type: String, required: true },
    sourceField: { type: String, default: "" },
    disabled: { type: Boolean, default: false },
    placeholder: { type: String, default: "" },
    testId: { type: String, default: "source-value-picker" },
  },
  emits: ["update:modelValue"],
  data() {
    return {
      open: false,
      loading: false,
      error: null,
      values: [],
      lastFetchedField: null,
    };
  },
  computed: {
    local: {
      get() {
        return this.modelValue;
      },
      set(val) {
        this.$emit("update:modelValue", val);
        // Reopen dropdown when typing so list is visible while operator types.
        if (val && !this.disabled && this.sourceField) {
          if (!this.open) this.openDropdown();
        }
      },
    },
    filteredValues() {
      const q = (this.modelValue || "").trim().toLowerCase();
      if (!q) return this.values;
      return this.values.filter((v) =>
        (v.value || "").toLowerCase().includes(q)
      );
    },
  },
  watch: {
    sourceField(newField, oldField) {
      if (newField !== oldField) {
        this.values = [];
        this.lastFetchedField = null;
        if (this.open && newField) this.fetchValues();
      }
    },
  },
  methods: {
    toggleDropdown() {
      if (this.disabled) return;
      if (this.open) this.closeDropdown();
      else this.openDropdown();
    },
    onFocus() {
      if (this.disabled) return;
      if (!this.open) this.openDropdown();
    },
    openDropdown() {
      this.open = true;
      if (this.sourceField && this.sourceField !== this.lastFetchedField) {
        this.fetchValues();
      }
    },
    closeDropdown() {
      this.open = false;
    },
    async fetchValues() {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await GET_DataValues(this.supplierIdx, {
          source_field: this.sourceField,
        });
        this.values = data?.values || [];
        this.lastFetchedField = this.sourceField;
      } catch (err) {
        this.error = extractApiMessage(err, this.$t("common.error_generic"));
      } finally {
        this.loading = false;
      }
    },
    selectValue(value) {
      this.$emit("update:modelValue", value);
      this.closeDropdown();
    },
  },
};
</script>

<style lang="scss" scoped>
.source-value-picker {
  position: relative;
}
.source-value-picker__wrapper {
  position: relative;
  display: flex;
  align-items: center;
}
.source-value-picker__chevron {
  position: absolute;
  right: var(--space-100);
  top: 50%;
  transform: translateY(-50%);
  font-size: 11px;
  color: var(--c-basic-500);
  transition: transform 0.15s;
  cursor: pointer;
  pointer-events: auto;
}
.source-value-picker__chevron--open {
  transform: translateY(-50%) rotate(180deg);
}
.source-value-picker__panel {
  position: absolute;
  top: calc(var(--elem-height) + 4px);
  left: 0;
  right: 0;
  z-index: 50;
  max-height: 280px;
  overflow-y: auto;
  border: 1px solid var(--c-basic-300);
  border-radius: var(--radius-md);
  background: var(--c-basic-100);
  box-shadow: var(--shadow-md);
}
.source-value-picker__state {
  text-align: center;
}
.source-value-picker__list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.source-value-picker__item {
  cursor: pointer;
  transition: background 0.1s;
}
.source-value-picker__item:hover {
  background: var(--c-support-100);
}
.source-value-picker__value {
  font-size: var(--fs-300);
  color: var(--c-basic-800);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: var(--space-100);
}
.source-value-picker__count {
  flex-shrink: 0;
}
</style>
