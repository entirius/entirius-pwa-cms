<template>
  <PageLayout data-testid="leads-custom-fields">
    <template #header>
      <PageHeader :title="$t('leads.fields.title')" :back="{ name: 'LeadsSettings' }">
        <template #actions>
          <ActionBar :actions="pageActions" />
        </template>
      </PageHeader>
    </template>
    <BasicTabs class="fields__tabs" id-prefix="custom-fields" :options="tabOptions" :model-value="entity" @update:model-value="openTab" />
    <Loader v-if="loading" block />
    <p v-else-if="error" class="t-negative m-0" role="alert" data-testid="field-error">{{ error }}</p>
    <EmptyState
      v-else-if="!rows.length"
      icon="empty"
      size="md"
      :title="$t('leads.fields.empty', { entity: $t(`leads.fields.tab.${entity}`) })"
      data-testid="fields-empty"
    >
      <ActionBar :actions="pageActions.map((action) => ({ ...action, role: 'secondary', testid: 'fields-empty-add' }))" />
    </EmptyState>
    <DataTable v-else :columns="columns" :rows="rows" row-key="id" :row-attrs="rowAttrs" data-testid="fields-table">
      <template #cell-label="{ row }">
        <span :class="{ 't-muted': !row.is_active }" :title="row.is_active ? '' : $t('leads.fields.active') + ': ' + $t('leads.fields.no')">{{ row.label }}</span>
      </template>
      <template #cell-active="{ row }">
        <BasicSwitch :model-value="row.is_active" :disabled="readonly" :label="activeLabel(row.is_active)" data-testid="field-active" @update:model-value="patch(row, { is_active: $event })" />
      </template>
      <template #cell-actions="{ row, index }">
        <span class="flex gap-1">
          <IconButton mutates icon="moveUp" size="sm" :disabled="index === 0" :label="$t('leads.fields.move_up')" data-testid="field-up" @click="move(index, -1)" />
          <IconButton mutates icon="moveDown" size="sm" :disabled="index === rows.length - 1" :label="$t('leads.fields.move_down')" data-testid="field-down" @click="move(index, 1)" />
          <IconButton mutates icon="edit" size="sm" :label="$t('leads.fields.edit')" data-testid="field-edit" @click="openDialog(row)" />
          <IconButton mutates icon="delete" variant="danger" size="sm" :label="$t('leads.common.delete')" data-testid="field-delete" @click="removing = row" />
        </span>
      </template>
    </DataTable>

    <BasicModal v-model:open="dialogOpen" :title="$t(draft.id ? 'leads.fields.edit' : 'leads.fields.add')" size="md" :persistent="saving" :actions="dialogActions" data-testid="field-dialog">
      <div class="flex-column gap-4">
        <p v-if="dialogError" class="t-negative m-0" role="alert" data-testid="field-error">{{ dialogError }}</p>
        <FormField :label="$t('leads.fields.label')" required :error="errorOf('label')">
          <BasicInput v-model="draft.label" :maxlength="128" data-testid="field-label" />
        </FormField>
        <FormField :label="$t('leads.fields.key')" required :hint="$t('leads.fields.key_hint')" hint-level="important" :error="errorOf('key')">
          <BasicInput v-model="draft.key" format="key" :maxlength="48" :readonly="Boolean(draft.id)" data-testid="field-key" />
        </FormField>
        <FormField :label="$t('leads.fields.kind')" required :error="errorOf('kind')">
          <BasicSelect v-model="draft.kind" :options="kindOptions" :disabled="kindLocked" data-testid="field-kind" />
          <p v-if="kindLocked" class="t-muted m-0 fs-200" data-testid="field-kind-locked">{{ $t("leads.fields.kind_locked") }}</p>
        </FormField>
        <FormField v-if="hasOptions" :label="$t('leads.fields.options')" required :error="errorOf('options')">
          <div class="flex-column gap-3">
            <div v-for="(option, index) in draft.options" :key="index" class="flex ai-ct gap-3">
              <BasicInput v-model="option.value" :placeholder="$t('leads.fields.option_value')" :aria-label="$t('leads.fields.option_value')" :maxlength="64" data-testid="field-option-value" />
              <BasicInput v-model="option.label" :placeholder="$t('leads.fields.option_label')" :aria-label="$t('leads.fields.option_label')" :maxlength="128" data-testid="field-option-label" />
              <IconButton icon="delete" variant="danger" size="sm" :label="$t('leads.fields.remove_option')" data-testid="field-option-remove" @click="draft.options.splice(index, 1)" />
            </div>
            <BasicButton size="sm" data-testid="field-option-add" @click="draft.options.push({ value: '', label: '' })">{{ $t("leads.fields.add_option") }}</BasicButton>
          </div>
        </FormField>
        <BasicCheckbox v-model="draft.required" data-testid="field-required">{{ $t("leads.fields.required") }}</BasicCheckbox>
        <BasicCheckbox v-if="entity === 'company'" v-model="draft.show_in_list" data-testid="field-show-in-list">{{ $t("leads.fields.show_in_list") }}</BasicCheckbox>
      </div>
    </BasicModal>

    <ConfirmDialog
      :open="Boolean(removing)"
      tone="danger"
      :title="$t('leads.common.delete')"
      :message="$t('leads.fields.delete_confirm', { label: removing?.label })"
      :confirm-label="$t('leads.common.delete')"
      :cancel-label="$t('leads.common.keep')"
      confirm-testid="field-delete-confirm"
      @confirm="remove"
      @cancel="removing = null"
    />
  </PageLayout>
</template>

<script setup>
import { activeLabel } from "@/utils/leadsLabels";
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { t } from "@/i18n";
import { DELETE_Attribute, GET_Attributes, PATCH_Attribute, POST_Attribute } from "@/api/leads/api";
import { extractApiMessage, useFormErrors } from "@/composables/useFormErrors";
import { usePageReadonly } from "@/composables/useReadonly";
import { useNotifyStore } from "@/stores/notify";
import { FIELD_KINDS, plainCopy } from "./customFields";

// Settings → Custom fields (ux/screens/settings-custom-fields.md): the definitions of one entity (`?entity=`), in
// order. The key is fixed after create; the kind is fixed once a value is stored (the API refuses with 409). Reorder
// = one PATCH `order` per moved row, as Stages.
const ENTITIES = ["company", "contact", "deal"];
const route = useRoute();
const router = useRouter();
const notify = useNotifyStore();
const readonly = usePageReadonly();
const { handleApiError, getFieldError, clearErrors } = useFormErrors();
const list = ref([]);
const loading = ref(true);
const error = ref("");
const dialogOpen = ref(false);
const dialogError = ref("");
const saving = ref(false);
const kindLocked = ref(false);
const removing = ref(null);
const draft = reactive({});

const entity = computed(() => (ENTITIES.includes(route.query.entity) ? route.query.entity : "company"));
const tabOptions = ENTITIES.map((value) => ({ value, label: t(`leads.fields.tab.${value}`), testid: `fields-tab-${value}` }));
const kindOptions = FIELD_KINDS.map((value) => ({ value, label: t(`leads.field_kind.${value}`) }));
const hasOptions = computed(() => draft.kind === "select" || draft.kind === "multiselect");
const pageActions = computed(() => [
  { key: "add", label: t("leads.fields.add"), role: "primary", testid: "fields-add", onClick: () => openDialog(null) },
]);
const columns = computed(() =>
  [
    { key: "label", label: t("leads.fields.label"), width: "1fr" },
    { key: "key", label: t("leads.fields.key"), width: "max-content", priority: 3 },
    { key: "kindLabel", label: t("leads.fields.kind"), width: "max-content", priority: 2 },
    { key: "requiredLabel", label: t("leads.fields.required"), width: "max-content", priority: 3 },
    entity.value === "company" && { key: "inList", label: t("leads.fields.col_in_list"), width: "max-content", priority: 3 },
    { key: "active", label: t("leads.fields.active"), width: "max-content" },
    { key: "actions", label: "", actions: true },
  ].filter(Boolean)
);
const mark = (on) => (on ? "✓" : "—");
const rows = computed(() =>
  [...list.value]
    .sort((a, b) => a.order - b.order)
    .map((row) => ({ ...row, kindLabel: t(`leads.field_kind.${row.kind}`), requiredLabel: mark(row.required), inList: mark(row.show_in_list) }))
);
const rowAttrs = (row) => ({ "data-testid": "field-row", "data-key": row.key });
const errorOf = (name) => getFieldError(name)?.msg || "";
const dialogActions = computed(() => [
  { key: "close", label: t("leads.task.close"), role: "secondary", disabled: saving.value, onClick: () => (dialogOpen.value = false) },
  { key: "save", label: t("leads.fields.save"), role: "primary", loading: saving.value, testid: "field-save", onClick: save },
]);

const openTab = (value) => router.replace({ query: { ...route.query, entity: value } });

async function load() {
  error.value = "";
  loading.value = true;
  try {
    list.value = (await GET_Attributes(entity.value)).data.results;
  } catch (err) {
    error.value = extractApiMessage(err, t("leads.fields.load_error"));
  } finally {
    loading.value = false;
  }
}

function openDialog(row) {
  const base = { id: null, label: "", key: "", kind: "text", options: [], required: false, show_in_list: false };
  Object.assign(draft, base, row ? plainCopy({ ...row }) : {});
  kindLocked.value = false;
  dialogError.value = "";
  clearErrors();
  dialogOpen.value = true;
}

function body() {
  const options = hasOptions.value ? draft.options.filter((option) => option.value) : [];
  const common = { label: draft.label.trim(), options, required: draft.required, show_in_list: entity.value === "company" && draft.show_in_list };
  if (draft.id) return kindLocked.value ? common : { ...common, kind: draft.kind };
  return { ...common, entity: entity.value, key: draft.key.trim(), kind: draft.kind, order: list.value.length };
}

async function save() {
  saving.value = true;
  dialogError.value = "";
  clearErrors();
  try {
    await (draft.id ? PATCH_Attribute(draft.id, body()) : POST_Attribute(body()));
    dialogOpen.value = false;
    await load();
  } catch (err) {
    refused(err);
  } finally {
    saving.value = false;
  }
}

// 409 on kind: values are stored — the kind locks with its note; a field error stays under its field.
function refused(err) {
  if (err?.httpStatus === 409 && draft.id) {
    kindLocked.value = true;
    draft.kind = list.value.find((row) => row.id === draft.id)?.kind;
    return;
  }
  handleApiError(err);
  if (!["label", "key", "kind", "options"].some(errorOf)) dialogError.value = extractApiMessage(err, t("leads.common.error"));
}

async function patch(row, changes) {
  try {
    await PATCH_Attribute(row.id, changes);
    await load();
  } catch (err) {
    notify.spawnNotification({ msg: extractApiMessage(err, t("leads.common.error")), type: "negative" });
  }
}

// Swap with the neighbour: both get their new position as `order`.
async function move(index, step) {
  const ordered = rows.value;
  const [a, b] = [ordered[index], ordered[index + step]];
  try {
    await Promise.all([PATCH_Attribute(a.id, { order: index + step }), PATCH_Attribute(b.id, { order: index })]);
  } catch (err) {
    notify.spawnNotification({ msg: extractApiMessage(err, t("leads.common.error")), type: "negative" });
  }
  await load();
}

async function remove() {
  const row = removing.value;
  removing.value = null;
  try {
    await DELETE_Attribute(row.id);
    await load();
  } catch (err) {
    notify.spawnNotification({ msg: extractApiMessage(err, t("leads.common.error")), type: "negative" });
  }
}

watch(entity, load);
onMounted(load);
</script>

<style scoped>
.fields__tabs {
  margin-bottom: var(--space-6);
}
</style>
