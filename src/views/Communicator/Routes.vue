<template>
  <PageLayout data-testid="communicator-routes">
    <template #header>
      <PageHeader :title="$t('communicator.routes.title')" :back="{ name: 'LeadsSettings' }" />
    </template>
    <div class="routes flex-column gap-8">
      <p class="t-muted m-0">{{ $t("communicator.routes.help") }}</p>
      <p v-if="loadError" class="t-negative m-0" role="alert" data-testid="routes-load-error">{{ loadError }}</p>
      <p class="m-0" data-testid="routes-default-line">
        <template v-if="defaultKey">{{ $t("communicator.routes.default_is", { key: defaultKey }) }}</template>
        <template v-else>{{ $t("communicator.routes.default_none") }}</template>
        <BasicButton v-if="defaultKey" mutates variant="ghost" size="sm" data-testid="route-clear-default" @click="setDefault('')">
          {{ $t("communicator.routes.clear_default") }}
        </BasicButton>
      </p>
      <p v-if="notice" class="t-muted m-0" role="status" data-testid="routes-notice">{{ notice }}</p>

      <div class="flex-column gap-3">
        <p v-if="loaded && !routes.length" class="t-muted m-0" data-testid="routes-empty">{{ $t("communicator.routes.empty") }}</p>
        <div v-for="route in routes" :key="route.key" class="route" data-testid="route-row" :data-route="route.key">
          <div class="route__summary">
            <strong>{{ route.name || route.key }}</strong>
            <span class="t-muted fs-200">{{ route.key }}</span>
            <StatusBadge v-if="route.is_default" tone="accent" :dot="false" :label="$t('communicator.routes.default')" data-testid="route-default-badge" />
            <StatusBadge v-if="route.warmup_start_cap != null" tone="info" :dot="false" :label="$t('communicator.routes.warmup_on')" data-testid="route-warmup-badge" />
            <span class="route__mail fs-200">{{ route.from_email }}<template v-if="route.cc_email"> · {{ $t("communicator.routes.dw") }} {{ route.cc_email }}</template></span>
            <span class="fs-200" data-testid="route-cap">{{ $t("communicator.routes.today") }}: {{ capText(route) }}</span>
          </div>
          <BasicSwitch :model-value="route.is_active" :label="$t('communicator.routes.active')" data-testid="route-active" @update:model-value="toggle(route, $event)" />
          <div class="route__controls">
            <BasicButton v-if="!route.is_default" mutates variant="secondary" size="sm" data-testid="route-make-default" @click="setDefault(route.key)">
              {{ $t("communicator.routes.make_default") }}
            </BasicButton>
            <BasicButton mutates variant="secondary" size="sm" data-testid="route-edit" @click="edit(route)">{{ $t("communicator.routes.edit") }}</BasicButton>
            <IconButton mutates icon="delete" variant="danger" :label="$t('communicator.routes.delete')" data-testid="route-delete" @click="confirming = route" />
          </div>
          <p v-if="errors[route.key]" class="route__error t-negative m-0" data-testid="route-error">{{ errors[route.key] }}</p>
        </div>
      </div>

      <form class="route-form flex-column gap-4" data-testid="route-form" novalidate @submit.prevent="submit">
        <h2 class="m-0">{{ editingKey ? $t("communicator.routes.edit_title", { key: editingKey }) : $t("communicator.routes.add_title") }}</h2>
        <FormField v-if="!editingKey" :label="$t('communicator.routes.key')" required :hint="$t('communicator.routes.key_help')">
          <BasicInput v-model="form.key" :maxlength="64" data-testid="route-key" />
        </FormField>
        <FormField :label="$t('communicator.routes.name')">
          <BasicInput v-model="form.name" :maxlength="128" data-testid="route-name" />
        </FormField>
        <FormField :label="$t('communicator.routes.from')" required :hint="$t('communicator.routes.from_help')">
          <BasicInput v-model="form.from_email" type="email" data-testid="route-from" />
        </FormField>
        <FormField :label="$t('communicator.routes.cc')" :hint="$t('communicator.routes.cc_help')">
          <BasicInput v-model="form.cc_email" type="email" data-testid="route-cc" />
        </FormField>
        <FormField :label="$t('communicator.routes.daily_cap')" :hint="$t('communicator.routes.daily_cap_help')">
          <BasicInput v-model="form.daily_cap" type="number" min="0" data-testid="route-daily-cap" />
        </FormField>
        <fieldset class="route-form__warmup flex-column gap-4">
          <legend class="fw-600">{{ $t("communicator.routes.warmup") }}</legend>
          <p class="t-muted fs-200 m-0">{{ $t("communicator.routes.warmup_help") }}</p>
          <FormField :label="$t('communicator.routes.warmup_start')">
            <BasicInput v-model="form.warmup_start_cap" type="number" min="0" data-testid="route-warmup-start" />
          </FormField>
          <FormField :label="$t('communicator.routes.warmup_step')">
            <BasicInput v-model="form.warmup_step" type="number" min="0" data-testid="route-warmup-step" />
          </FormField>
          <FormField :label="$t('communicator.routes.warmup_date')" :hint="$t('communicator.routes.warmup_date_help')">
            <BasicInput v-model="form.warmup_started_on" type="date" data-testid="route-warmup-date" />
          </FormField>
        </fieldset>
        <BasicSwitch v-model="form.is_active" :label="$t('communicator.routes.active')" data-testid="route-form-active" />
        <p v-if="errors.form" class="t-negative m-0" role="alert" data-testid="route-form-error">{{ errors.form }}</p>
        <div class="flex jc-fe gap-3">
          <BasicButton v-if="editingKey" variant="secondary" type="button" data-testid="route-cancel" @click="reset">{{ $t("common.cancel") }}</BasicButton>
          <BasicButton mutates variant="primary" type="submit" data-testid="route-save">{{ editingKey ? $t("common.save") : $t("communicator.routes.add") }}</BasicButton>
        </div>
      </form>
    </div>

    <ConfirmDialog
      :open="Boolean(confirming)"
      :title="confirming ? $t('communicator.routes.delete_title', { key: confirming.key }) : ''"
      :message="$t('communicator.routes.delete_message')"
      :confirm-label="$t('communicator.routes.delete')"
      :cancel-label="$t('common.cancel')"
      tone="danger"
      @confirm="remove(confirming)"
      @cancel="confirming = null"
    />
  </PageLayout>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { t } from "@/i18n";
import { DELETE_Route, GET_Routes, PATCH_DefaultRoute, POST_Route, PUT_Route } from "@/api/communicator/api";
import { PATCH_LeadsSettings } from "@/api/leads/api";
import { extractApiMessage } from "@/composables/useFormErrors";
import { useMuninStore } from "@/stores/munin";
import { blankRoute, buildRouteBody, capText, errorCode, routeToForm } from "@/utils/leadsOutbound";

// Communicator → Settings → Sender routes (Q11): the mailboxes a thread can leave from. A route is a From address, an
// optional DW (CC) mailbox, a daily limit and an optional warm-up (start limit + step per day up to the daily limit).
// The thread carries only the route key; an unknown or inactive key never falls back to another mailbox (the draft
// shows a blocker in the approvals inbox). The default route is the channel's: leads follows it (same key written to
// the leads channel settings, so the two never disagree).
const munin = useMuninStore();
const routes = ref([]);
const loaded = ref(false);
const loadError = ref("");
const notice = ref("");
const errors = reactive({});
const editingKey = ref("");
const confirming = ref(null);
const form = reactive(blankRoute());

const defaultKey = computed(() => routes.value.find((route) => route.is_default)?.key || "");

const KNOWN = {
  ROUTE_EXISTS: "communicator.routes.err_exists",
  ROUTE_CONFIG_INVALID: "communicator.routes.err_config",
  ROUTE_IS_DEFAULT: "communicator.routes.err_is_default",
  SENDER_ROUTE_UNKNOWN: "communicator.routes.err_unknown",
};
const messageOf = (err) => (KNOWN[errorCode(err)] ? t(KNOWN[errorCode(err)]) : extractApiMessage(err, t("leads.review.error")));

async function load() {
  try {
    routes.value = (await GET_Routes()).data.results || [];
    loadError.value = "";
  } catch (err) {
    loadError.value = messageOf(err);
  }
  loaded.value = true;
}

async function attempt(key, call) {
  delete errors[key];
  notice.value = "";
  try {
    await call();
    return true;
  } catch (err) {
    errors[key] = messageOf(err);
    return false;
  }
}

function edit(route) {
  editingKey.value = route.key;
  Object.assign(form, blankRoute(), routeToForm(route));
  delete errors.form;
}

function reset() {
  editingKey.value = "";
  Object.assign(form, blankRoute());
  delete errors.form;
}

// PUT replaces every field, so the switch sends the whole route with the one change.
async function toggle(route, is_active) {
  const body = buildRouteBody({ ...routeToForm(route), is_active });
  if (body.error) return (errors[route.key] = t(body.error));
  if (await attempt(route.key, () => PUT_Route(route.key, body))) await load();
}

async function setDefault(key) {
  if (!(await attempt(key || "form", () => PATCH_DefaultRoute(key)))) return;
  if (munin.isModuleEnabled("leads")) {
    try {
      await PATCH_LeadsSettings({ default_sender_route: key });
    } catch {
      notice.value = t("communicator.routes.leads_default_failed");
    }
  }
  await load();
}

async function remove(route) {
  confirming.value = null;
  if (await attempt(route.key, () => DELETE_Route(route.key))) {
    if (editingKey.value === route.key) reset();
    await load();
  }
}

async function submit() {
  delete errors.form;
  const creating = !editingKey.value;
  const body = buildRouteBody(form, { create: creating });
  if (body.error) return (errors.form = t(body.error));
  const call = creating ? () => POST_Route(body) : () => PUT_Route(editingKey.value, body);
  if (await attempt("form", call)) {
    reset();
    await load();
  }
}

onMounted(load);
</script>

<style lang="scss" scoped>
@import "@/assets/scss/utils/media-query";

.routes {
  max-width: 900px;
}
.route {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: var(--space-5);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--border-subtle);
}
.route__summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2) var(--space-4);
  min-width: 0;
}
.route__mail {
  overflow-wrap: anywhere;
}
.route__controls {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.route__error {
  grid-column: 1 / -1;
}
.route-form {
  max-width: 560px;
}
.route-form__warmup {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-base);
  padding: var(--space-4);
  margin: 0;
  min-width: 0;
}
@include max-tablet {
  .route {
    grid-template-columns: 1fr auto;
  }
  .route__summary {
    grid-column: 1 / -1;
  }
}
</style>
