<template>
  <BasicCard :title="$t('leads.tasks.open_title')" :data-testid="`${prefix}-tasks`">
    <template #actions>
      <ActionBar :actions="actions" :labelled="false" />
    </template>
    <Loader v-if="loading" block />
    <DataTable
      v-else
      :columns="columns"
      :rows="rows"
      row-key="id"
      :row-attrs="rowAttrs"
      :empty-text="$t('leads.tasks.empty')"
      @row-click="openDialog('edit', $event)"
    >
      <template #cell-due="{ row }">
        <StatusBadge :tone="row.due.tone" :label="row.due.label" data-testid="task-due" />
      </template>
      <template #cell-title="{ row }">
        <span class="flex-column gap-1">
          <a class="t-accent pointer" role="button" tabindex="0" :title="row.title" data-testid="task-title-link" @click.stop="openDialog('edit', row)" @keydown.enter.stop="openDialog('edit', row)">{{ row.title }}</a>
          <!-- under the title on a phone, whole: it never shares the line with the title (N13) -->
          <StatusBadge class="show-mobile as-s" :tone="row.due.tone" :label="row.due.label" data-testid="task-due-inline" />
        </span>
      </template>
      <template #cell-actions="{ row }">
        <IconButton mutates icon="edit" size="sm" :label="$t('leads.task.edit')" data-testid="task-edit" @click="openDialog('edit', row)" />
        <BasicButton class="hide-mobile" mutates size="sm" data-testid="task-done" @click.stop="openDialog('done', row)">{{ $t("leads.task.mark_done") }}</BasicButton>
        <IconButton class="show-mobile" mutates icon="check" size="sm" :label="$t('leads.task.mark_done')" data-testid="task-done-icon" @click.stop="openDialog('done', row)" />
      </template>
    </DataTable>
    <TaskDialog v-model:open="dialogOpen" :mode="dialogMode" :task="dialogTask" :company="company" :subject="subject" @saved="onSaved" />
  </BasicCard>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { t } from "@/i18n";
import { GET_Tasks } from "@/api/todo/api";
import { extractApiMessage } from "@/composables/useFormErrors";
import { useNotifyStore } from "@/stores/notify";
import { companySubjectRef } from "@/utils/subjectRef";
import TaskDialog from "../TaskDialog.vue";
import { taskDue } from "../tasks";

// On a phone the due badge rides under the title and Mark done is an icon: the table fits 390 px (acceptance M3).
// Company card → Tasks (django-todo, `subject_ref = leads.Company:<id>`): the open tasks, Add task, Log call, Mark
// done; a row opens the task to edit or cancel it. The card wraps this tab in `ReadonlyArea` `todo.tasks`. With a
// `deal` it is the deal card's Tasks card (`subject_ref = leads.Deal:<id>`): Add task only.
const props = defineProps({
  company: { type: Object, required: true },
  deal: { type: Object, default: null },
});
const emit = defineEmits(["count", "changed"]);
const notify = useNotifyStore();
const tasks = ref([]);
const loading = ref(true);
const dialogOpen = ref(false);
const dialogMode = ref("add");
const dialogTask = ref(null);

const prefix = computed(() => (props.deal ? "deal" : "company"));
const subject = computed(() =>
  props.deal ? { ref: props.deal.subject_ref, label: props.deal.subject_label } : { ref: companySubjectRef(props.company.id), label: props.company.name || "" }
);
const actions = computed(() =>
  [
    !props.deal && { key: "call", label: t("leads.task.log_call"), role: "secondary", mutates: true, testid: "company-log-call", onClick: () => openDialog("call", null) },
    { key: "add", label: t("leads.task.add"), role: "secondary", mutates: true, testid: `${prefix.value}-add-task`, onClick: () => openDialog("add", null) },
  ].filter(Boolean)
);
const columns = computed(() => [
  { key: "due", label: t("leads.today.col_due"), width: "max-content", priority: 2 },
  { key: "title", label: t("leads.today.col_task"), width: "1fr" },
  { key: "kind", label: t("leads.today.col_kind"), width: "max-content", priority: 3 },
  { key: "actions", label: "", actions: true },
]);
const rows = computed(() => tasks.value.map((task) => ({ ...task, due: taskDue(task), kind: t(`leads.task_kind.${task.kind}`) })));
const rowAttrs = (row) => ({ "data-testid": "task-row", "data-task": row.id });

function openDialog(mode, task) {
  dialogMode.value = mode;
  dialogTask.value = task && tasks.value.find((row) => row.id === task.id);
  dialogOpen.value = true;
}

// A task added, logged or closed is a History line: the card reads itself again (acceptance M13).
function onSaved() {
  load();
  emit("changed");
}

async function load() {
  try {
    const { data } = await GET_Tasks({ subject_ref: subject.value.ref, status: "open", page_size: 100 });
    tasks.value = data.results;
    emit("count", data.count);
  } catch (err) {
    notify.spawnNotification({ msg: extractApiMessage(err, t("leads.task.error")), type: "negative" });
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>
