<template>
  <div class="flex-column gap-8" data-testid="import-mapping">
    <BasicCard :title="$t('leads.import.mapping.title')" gap>
      <p class="m-0 t-secondary">{{ $t("leads.import.mapping.hint") }}</p>
      <p v-if="summary" class="m-0 t-secondary" data-testid="mapping-file">
        {{ summary }}
      </p>
      <DataTable :columns="tableColumns" :rows="columns" row-key="name" :row-attrs="(row) => ({ 'data-testid': `mapping-row-${row.index}` })">
        <template #cell-name="{ row }">
          <span class="t-strong" data-testid="mapping-column">{{ row.name }}</span>
        </template>
        <template #cell-samples="{ row }">
          <span class="t-secondary" data-testid="mapping-samples">{{ (row.samples || []).slice(0, 3).join(", ") || "—" }}</span>
        </template>
        <template #cell-field="{ row }">
          <BasicSelect
            :model-value="modelValue[row.name] || IGNORE"
            :options="options"
            :disabled="readonly"
            :aria-label="$t('leads.import.mapping.field_for', { column: row.name })"
            searchable
            :data-testid="`mapping-field-${row.index}`"
            @update:model-value="(field) => emit('update:modelValue', withField(modelValue, row.name, field))"
          />
        </template>
        <template #cell-confidence="{ row }">
          <div class="flex-column gap-1">
            <StatusBadge
              :tone="CONFIDENCE_TONES[level(row)]"
              :label="$t(`leads.import.mapping.confidence.${level(row)}`)"
              :data-testid="`mapping-confidence-${row.index}`"
            />
            <span v-if="clash(row)" class="t-negative" :data-testid="`mapping-conflict-${row.index}`">
              {{
                $t("leads.import.mapping.conflict", {
                  columns: clash(row).join(", "),
                })
              }}
            </span>
            <span v-else-if="note(row)" class="t-secondary" :data-testid="`mapping-note-${row.index}`">{{ note(row) }}</span>
          </div>
        </template>
      </DataTable>
      <p v-if="conflictCount" class="t-negative m-0" data-testid="mapping-conflicts">
        {{ $t("leads.import.mapping.conflicts", { count: conflictCount }) }}
      </p>
      <p v-if="!identity" class="t-negative m-0" data-testid="mapping-no-identity">
        {{ $t("leads.import.mapping.no_identity") }}
      </p>
      <p v-else-if="!named" class="t-secondary m-0" data-testid="mapping-no-name">
        {{ $t("leads.import.mapping.no_name") }}
      </p>
    </BasicCard>
    <BasicCard :title="$t('leads.import.mapping.preview_title')" gap data-testid="mapping-preview">
      <DataTable v-if="previewColumns.length" :columns="previewColumns" :rows="previewTable" row-key="row" />
      <p v-else class="m-0 t-secondary">
        {{ $t("leads.import.mapping.preview_empty") }}
      </p>
    </BasicCard>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { t } from "@/i18n";
import { useReadonly } from "@/composables/useReadonly";
import { importReasonLabel } from "@/utils/leadsLabels";
import {
  CONFIDENCE_TONES,
  IGNORE,
  confidenceLevel,
  conflicts,
  fieldLabel,
  fieldOptions,
  hasIdentity,
  previewFields,
  proposalNote,
  withField,
} from "./columnMapping";

// U17: "column of the file → field in Sales CRM" with the proposal's confidence in words, sample values, the user's
// correction and the first rows as the CRM would store them (the server's `rows`, refreshed by the parent after a
// change). The parent owns the mapping (v-model) and the Import button.
const props = defineProps({
  preview: { type: Object, required: true }, // the `imports/preview/` response
  fields: { type: Array, required: true }, // [{key, label, entity, custom, kind}]
  modelValue: { type: Object, required: true }, // {column name: field | "ignore"}
});
const emit = defineEmits(["update:modelValue"]);
const readonly = useReadonly();

const columns = computed(() => props.preview.columns || []);
const options = computed(() => fieldOptions(props.fields));
const tableColumns = computed(() => [
  {
    key: "name",
    label: t("leads.import.mapping.col_column"),
    width: "minmax(8rem, 1fr)",
  },
  {
    key: "samples",
    label: t("leads.import.mapping.col_samples"),
    width: "minmax(10rem, 1.5fr)",
  },
  {
    key: "field",
    label: t("leads.import.mapping.col_field"),
    width: "minmax(14rem, 1.5fr)",
    truncate: false,
  },
  {
    key: "confidence",
    label: t("leads.import.mapping.col_confidence"),
    width: "minmax(12rem, 1fr)",
    truncate: false,
  },
]);
const summary = computed(() =>
  props.preview.row_count === undefined
    ? ""
    : t("leads.import.mapping.file_summary", {
        name: props.preview.filename || "",
        rows: props.preview.row_count,
        columns: columns.value.length,
      })
);
const clashes = computed(() => conflicts(props.modelValue));
const conflictCount = computed(() => Object.keys(clashes.value).length);
const identity = computed(() => hasIdentity(props.modelValue));
const named = computed(() => Object.values(props.modelValue).includes("company_name"));
const current = (row) => props.modelValue[row.name] || IGNORE;
const level = (row) => confidenceLevel(row, current(row));
const clash = (row) => {
  const others = clashes.value[current(row)];
  return others ? others.filter((column) => column !== row.name) : null;
};
// The proposal's note while the user keeps the proposal; a field the user changed needs none.
const note = (row) => (current(row) === (row.field || IGNORE) ? proposalNote(row) : "");

const shownFields = computed(() => previewFields(props.fields, props.preview.rows || []));
const previewColumns = computed(() => [
  {
    key: "row",
    label: t("leads.import.mapping.col_row"),
    width: "max-content",
    numeric: true,
  },
  ...shownFields.value.map((field) => ({
    key: field.key,
    label: fieldLabel(field),
    width: "minmax(8rem, 1fr)",
  })),
  {
    key: "skip",
    label: t("leads.import.mapping.col_skip"),
    width: "minmax(10rem, 1fr)",
  },
]);
const previewTable = computed(() =>
  (props.preview.rows || []).map((row) => ({
    ...row.values,
    row: row.row,
    skip: row.skip_reason ? importReasonLabel(row.skip_reason) : "",
  }))
);
</script>
