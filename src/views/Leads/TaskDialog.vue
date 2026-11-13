<template>
  <BasicModal
    :open="open"
    :title="title"
    size="md"
    :persistent="saving"
    :actions="actions"
    data-testid="task-dialog"
    @update:open="close"
  >
    <div v-if="mode === 'done'" class="flex-column gap-4">
      <FormField :label="$t('leads.task.outcome')">
        <BasicTextarea v-model="form.outcome" :maxlength="2000" data-testid="task-outcome" />
      </FormField>
    </div>
    <div v-else class="form-grid">
      <FormField class="task-dialog__wide" :label="$t('leads.task.title_field')" required :error="errorOf('title')">
        <BasicInput v-model="form.title" :maxlength="255" data-testid="task-title" />
      </FormField>
      <FormField v-if="mode === 'call' || form.alreadyDone" class="task-dialog__wide" :label="$t('leads.task.outcome')">
        <BasicTextarea v-model="form.outcome" :maxlength="2000" data-testid="task-outcome" />
      </FormField>
      <FormField v-if="mode !== 'call'" class="task-dialog__wide" :label="$t('leads.task.kind')">
        <BasicRadioGroup v-model="form.kind" :options="kinds" name="task-kind" data-testid="task-kind" />
      </FormField>
      <FormField v-if="mode !== 'call'" :label="$t('leads.task.due')" :error="errorOf('due_at')">
        <BasicDatePicker v-model="form.due" :config="{ enableTime: true, time_24hr: true }" data-testid="task-due-at" />
      </FormField>
      <FormField :label="$t('leads.task.owner')" :error="errorOf('owner_id')">
        <BasicSelect v-model="form.ownerId" :options="owners" searchable clearable data-testid="task-owner" />
      </FormField>
      <FormField v-if="!company" :label="$t('leads.task.company')" required :error="errorOf('subject_ref')">
        <EntitySearchPicker
          v-model="form.companyId"
          v-model:display-value="form.companyName"
          :fetch-fn="findCompanies"
          :placeholder="$t('leads.task.company_search')"
          data-testid="task-company"
          @update:model-value="loadContacts"
        />
      </FormField>
      <FormField v-if="contacts.length" :label="$t('leads.task.contact')">
        <BasicSelect v-model="form.contactId" :options="contacts" clearable data-testid="task-contact" />
      </FormField>
      <FormField class="task-dialog__wide" :label="$t('leads.task.note')">
        <BasicTextarea v-model="form.note" :maxlength="5000" data-testid="task-note" />
      </FormField>
      <BasicCheckbox v-if="mode === 'add'" v-model="form.alreadyDone" class="task-dialog__wide" data-testid="task-already-done">
        {{ $t("leads.task.already_done") }}
      </BasicCheckbox>
    </div>
    <ConfirmDialog
      :open="cancelling"
      tone="danger"
      :title="$t('leads.task.cancel_task')"
      :message="$t('leads.task.cancel_confirm')"
      :confirm-label="$t('leads.task.cancel_task')"
      :cancel-label="$t('leads.task.keep')"
      confirm-testid="task-cancel-confirm"
      @confirm="cancelTask"
      @cancel="cancelling = false"
    >
      <div class="flex-column gap-4">
        <p class="m-0">{{ $t("leads.task.cancel_confirm") }}</p>
        <FormField :label="$t('leads.task.cancel_reason')">
          <BasicInput v-model="form.reason" :maxlength="255" data-testid="task-cancel-reason" />
        </FormField>
      </div>
    </ConfirmDialog>
  </BasicModal>
</template>

<script setup>
import { computed, reactive, ref, watch } from "vue";
import { t } from "@/i18n";
import { GET_AssignableUsers, GET_Companies, GET_Company } from "@/api/leads/api";
import { PATCH_Task, POST_Task, POST_TaskCancel, POST_TaskDone } from "@/api/todo/api";
import { extractApiMessage, useFormErrors } from "@/composables/useFormErrors";
import { useNotifyStore } from "@/stores/notify";
import { useAccessStore } from "@/stores/access";
import { companySubjectRef, contactIdFromRef, contactSubjectRef } from "@/utils/subjectRef";
import { defaultDue, isoToPicker, kindOptions, pickerToIso } from "./tasks";

// One dialog for every task action (ux/screens/task-dialog.md): add, edit, log a call, mark done. It never asks what
// the page knows: `company` ({ id, name, contacts }) is the page's; without it (Today) a company picker shows.
const props = defineProps({
  open: { type: Boolean, default: false },
  mode: { type: String, default: "add" }, // add | edit | call | done
  task: { type: Object, default: null },
  company: { type: Object, default: null },
});
const emit = defineEmits(["update:open", "saved"]);
const notify = useNotifyStore();
const access = useAccessStore();
const { handleApiError, getFieldError, clearErrors } = useFormErrors();
const kinds = kindOptions();
const saving = ref(false);
const cancelling = ref(false);
const owners = ref([]);
const picked = ref(null); // the company picked on Today, with its contacts
const form = reactive({});
const localErrors = reactive({});

const TITLES = { add: "leads.task.add", edit: "leads.task.edit", call: "leads.task.log_call" };
const title = computed(() =>
  props.mode === "done" ? t("leads.task.mark_done_title", { title: props.task?.title }) : t(TITLES[props.mode])
);
const SUBMIT = { add: "leads.task.add", edit: "leads.task.save", call: "leads.task.log_call", done: "leads.task.mark_done" };
const actions = computed(() =>
  [
    props.mode === "edit" && { key: "cancel-task", label: t("leads.task.cancel_task"), role: "danger", testid: "task-cancel-task", onClick: () => (cancelling.value = true) },
    { key: "close", label: t("leads.task.close"), role: "secondary", disabled: saving.value, testid: "task-close", onClick: () => close(false) },
    { key: "submit", label: t(SUBMIT[props.mode]), role: "primary", loading: saving.value, testid: "task-submit", onClick: submit },
  ].filter(Boolean)
);
const subject = computed(() => props.company || picked.value);
const contacts = computed(() =>
  (subject.value?.contacts || [])
    .filter((contact) => !contact.anonymised_at)
    .map((contact) => ({ value: contact.id, label: `${contact.first_name} ${contact.last_name}`.trim() || contact.email }))
);
const errorOf = (name) => localErrors[name] || getFieldError(name)?.msg || "";
const ownerLabel = (owner) => owner.name || owner.username;

function reset() {
  const task = props.task || {};
  Object.assign(form, {
    title: task.title || "",
    kind: props.mode === "call" ? "phone" : task.kind || "todo",
    due: props.mode === "call" ? "" : task.id ? isoToPicker(task.due_at) : defaultDue(),
    ownerId: task.id ? task.owner?.id ?? null : access.me?.user?.id ?? null,
    contactId: contactIdFromRef(task.contact_ref),
    companyId: null,
    companyName: "",
    note: task.note || "",
    outcome: "",
    reason: "",
    alreadyDone: props.mode === "call",
  });
  picked.value = null;
  Object.keys(localErrors).forEach((key) => delete localErrors[key]);
  clearErrors();
}

async function loadOwners() {
  try {
    owners.value = (await GET_AssignableUsers()).map((owner) => ({ value: owner.id, label: ownerLabel(owner) }));
  } catch {
    owners.value = [];
  }
}

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    reset();
    if (props.mode !== "done") loadOwners();
  }
);

const findCompanies = async (search) =>
  (await GET_Companies({ search, page: 1 })).data.results.map((row) => ({ value: String(row.id), label: row.name || row.domain, secondary: row.domain }));

async function loadContacts(id) {
  picked.value = id ? { id: Number(id), name: form.companyName, contacts: [] } : null;
  if (id) picked.value = { ...picked.value, contacts: (await GET_Company(id)).data.contacts || [] };
}

function close(value = false) {
  if (!value && !saving.value) emit("update:open", false);
}

function validate() {
  Object.keys(localErrors).forEach((key) => delete localErrors[key]);
  if (props.mode === "done") return true;
  if (!form.title.trim()) localErrors.title = t("leads.task.required");
  if (!subject.value) localErrors.subject_ref = t("leads.task.required");
  return !Object.keys(localErrors).length;
}

const body = () => ({
  title: form.title.trim(),
  kind: form.kind,
  note: form.note,
  due_at: pickerToIso(form.due),
  owner_id: form.ownerId,
});

async function create() {
  const { data } = await POST_Task({
    ...body(),
    subject_ref: companySubjectRef(subject.value.id),
    subject_label: subject.value.name || "",
    contact_ref: contactSubjectRef(form.contactId),
  });
  if (form.alreadyDone) await POST_TaskDone(data.id, form.outcome);
  return props.mode === "call" ? "leads.task.call_logged_toast" : form.alreadyDone ? "leads.task.done_toast" : "leads.task.added_toast";
}

async function run() {
  if (props.mode === "done") return POST_TaskDone(props.task.id, form.outcome).then(() => "leads.task.done_toast");
  if (props.mode === "edit") return PATCH_Task(props.task.id, body()).then(() => "leads.task.saved_toast");
  return create();
}

async function submit() {
  if (!validate()) return;
  saving.value = true;
  clearErrors();
  try {
    notify.spawnNotification({ msg: t(await run()), type: "positive" });
    finish();
  } catch (err) {
    fail(err);
  } finally {
    saving.value = false;
  }
}

function finish() {
  emit("saved");
  emit("update:open", false);
}

// A 400 on a field keeps the dialog open with the error under the field; any other failure closes it with a toast.
function fail(err) {
  handleApiError(err);
  const onField = ["title", "due_at", "owner_id", "subject_ref"].some((name) => getFieldError(name));
  if (onField) return;
  notify.spawnNotification({ msg: extractApiMessage(err, t("leads.task.error")), type: "negative" });
  emit("update:open", false);
}

async function cancelTask() {
  cancelling.value = false;
  saving.value = true;
  try {
    await POST_TaskCancel(props.task.id, form.reason);
    notify.spawnNotification({ msg: t("leads.task.cancelled_toast"), type: "positive" });
    finish();
  } catch (err) {
    fail(err);
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.task-dialog__wide {
  grid-column: 1 / -1;
}
</style>
