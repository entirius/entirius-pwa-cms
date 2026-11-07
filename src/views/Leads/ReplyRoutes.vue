<template>
  <PageLayout data-testid="leads-reply-routes">
    <template #header>
      <PageHeader :title="$t('leads.reply_routes.title')" :back="{ name: 'LeadsSettings' }" />
    </template>
    <div class="routes flex-column gap-6">
      <p class="t-muted m-0">{{ $t("leads.reply_routes.help") }}</p>
      <Loader v-if="loading" block />
      <BasicCard v-for="row in rows" :key="row.intent" :title="intentLabel(row.intent)" :data-testid="`route-${row.intent}`">
        <form class="route flex-column gap-4" @submit.prevent="save(row)">
          <StatusBadge v-if="row.is_default" size="sm" tone="neutral" :label="$t('leads.reply_routes.default')" data-testid="route-default" />
          <FormField :label="$t('leads.reply_routes.action_label')">
            <BasicSelect v-model="row.action" :options="actionOptions" data-testid="route-action" />
          </FormField>
          <FormField v-if="row.action === 'stage'" :label="$t('leads.reply_routes.stage')" required>
            <BasicSelect v-model="row.stage_id" :options="stageOptions" data-testid="route-stage" />
          </FormField>
          <BasicSwitch v-model="row.flag_contact" :label="$t('leads.reply_routes.flag_contact')" data-testid="route-flag" />
          <p v-if="messages[row.intent]" :class="messages[row.intent].tone" class="m-0" role="status" data-testid="route-message">
            {{ messages[row.intent].text }}
          </p>
          <div class="flex jc-fe gap-3">
            <BasicButton v-if="!row.is_default" mutates variant="secondary" type="button" data-testid="route-reset" @click="reset(row)">
              {{ $t("leads.reply_routes.reset") }}
            </BasicButton>
            <BasicButton mutates variant="primary" type="submit" data-testid="route-save">{{ $t("leads.reply_routes.save") }}</BasicButton>
          </div>
        </form>
      </BasicCard>
    </div>
  </PageLayout>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { t } from "@/i18n";
import { DELETE_ReplyRoute, GET_ReplyRoutes, GET_Stages, PUT_ReplyRoute } from "@/api/leads/api";
import { extractApiMessage } from "@/composables/useFormErrors";
import { intentLabel } from "@/utils/leadsLabels";

// Leads → Settings → Reply routes (T4): per reply class, what the reply does to the company's stage and whether the
// replying contact is flagged as the wrong person. A class without a stored route shows the code default (`is_default`).
// The sequence and the alerts of the same class live in communicator (Reply steps).
const ACTIONS = ["reply_stage", "stage", "none"];
const actionOptions = ACTIONS.map((value) => ({ value, label: t(`leads.reply_routes.action.${value}`) }));

const rows = ref([]);
const stages = ref([]);
const loading = ref(true);
const messages = reactive({});
const stageOptions = computed(() => stages.value.map((stage) => ({ value: stage.id, label: stage.label })));

const toRow = (route) => ({ intent: route.intent, action: route.action, stage_id: route.stage_id, flag_contact: route.flag_contact, is_default: route.is_default });

async function load() {
  const [routes, stageList] = await Promise.all([GET_ReplyRoutes(), GET_Stages()]);
  rows.value = (routes.data.results || []).map(toRow);
  stages.value = stageList.data.results || [];
  loading.value = false;
}

const say = (intent, text, tone = "t-muted") => (messages[intent] = { text, tone });

function replace(row, route) {
  rows.value = rows.value.map((item) => (item.intent === row.intent ? toRow(route) : item));
}

async function save(row) {
  delete messages[row.intent];
  if (row.action === "stage" && !row.stage_id) return say(row.intent, t("leads.reply_routes.stage_required"), "t-negative");
  const body = { action: row.action, flag_contact: row.flag_contact };
  if (row.action === "stage") body.stage_id = row.stage_id;
  try {
    replace(row, (await PUT_ReplyRoute(row.intent, body)).data);
    say(row.intent, t("leads.reply_routes.saved"));
  } catch (err) {
    say(row.intent, extractApiMessage(err, t("leads.reply_routes.error")), "t-negative");
  }
}

async function reset(row) {
  delete messages[row.intent];
  try {
    await DELETE_ReplyRoute(row.intent);
    await load();
    say(row.intent, t("leads.reply_routes.saved"));
  } catch (err) {
    say(row.intent, extractApiMessage(err, t("leads.reply_routes.error")), "t-negative");
  }
}

onMounted(load);
</script>

<style scoped>
.routes {
  max-width: 640px;
}
</style>
