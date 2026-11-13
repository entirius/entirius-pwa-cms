<template>
  <BasicCard :title="$t('leads.tasks.open_title')" data-testid="company-tasks">
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
      <template #cell-actions="{ row }">
        <BasicButton mutates size="sm" data-testid="task-done" @click.stop="openDialog('done', row)">{{ $t("leads.task.mark_done") }}</BasicButton>
      </template>
    </DataTable>
    <TaskDialog v-model:open="dialogOpen" :mode="dialogMode" :task="dialogTask" :company="company" @saved="load" />
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

// Company card → Tasks (django-todo, `subject_ref = leads.Company:<id>`): the open tasks, Add task, Log call, Mark
// done; a row opens the task to edit or cancel it. The card wraps this tab in `ReadonlyArea` `todo.tasks`.
const props = defineProps({ company: { type: Object, required: true } });
const emit = defineEmits(["count"]);
const notify = useNotifyStore();
const tasks = ref([]);
const loading = ref(true);
const dialogOpen = ref(false);
const dialogMode = ref("add");
const dialogTask = ref(null);

const actions = computed(() => [
  { key: "call", label: t("leads.task.log_call"), role: "secondary", mutates: true, testid: "company-log-call", onClick: () => openDialog("call", null) },
  { key: "add", label: t("leads.task.add"), role: "secondary", mutates: true, testid: "company-add-task", onClick: () => openDialog("add", null) },
]);
const columns = computed(() => [
  { key: "due", label: t("leads.today.col_due"), width: "max-content" },
  { key: "title", label: t("leads.today.col_task"), width: "1fr" },
  { key: "kind", label: t("leads.today.col_kind"), priority: 3 },
  { key: "actions", label: "", actions: true },
]);
const rows = computed(() => tasks.value.map((task) => ({ ...task, due: taskDue(task), kind: t(`leads.task_kind.${task.kind}`) })));
const rowAttrs = (row) => ({ "data-testid": "task-row", "data-task": row.id });

function openDialog(mode, task) {
  dialogMode.value = mode;
  dialogTask.value = task && tasks.value.find((row) => row.id === task.id);
  dialogOpen.value = true;
}

async function load() {
  try {
    const { data } = await GET_Tasks({ subject_ref: companySubjectRef(props.company.id), status: "open", page_size: 100 });
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
