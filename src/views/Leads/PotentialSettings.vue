<template>
  <!-- U2: Settings → Potential — the thresholds the dot of every company follows; a change recomputes the channel -->
  <PageLayout data-testid="leads-potential-settings">
    <template #header>
      <PageHeader
        :title="$t('leads.potential.settings_title')"
        :back="{ name: 'LeadsSettings' }"
      >
        <template v-if="!loading && !error" #actions>
          <StatusBadge
            v-if="isDirty"
            tone="warning"
            :dot="false"
            :label="$t('unsaved.changes')"
          />
          <ActionBar :actions="actions" />
        </template>
      </PageHeader>
    </template>

    <Loader v-if="loading" block />
    <p
      v-else-if="error"
      class="t-negative m-0"
      role="alert"
      data-testid="potential-settings-error"
    >
      {{ error }}
    </p>
    <div v-else class="flex-column gap-8">
      <p class="m-0 t-secondary" data-testid="potential-settings-about">
        {{ $t("leads.potential.settings_about") }}
      </p>
      <BasicCard :title="$t('leads.potential.days_card')" gap>
        <div class="form-grid">
          <FormField
            v-for="key in DAY_KEYS"
            :key="key"
            :label="$t(`leads.potential.${key}`)"
            :hint="$t(`leads.potential.${key}_hint`)"
            required
            :error="fieldError(key)"
          >
            <NumberInput
              v-model="form[key]"
              :min="1"
              :disabled="readonly"
              :data-testid="`potential-${key}`"
            />
          </FormField>
        </div>
      </BasicCard>
      <BasicCard :title="$t('leads.potential.replies_card')" gap>
        <div class="form-grid">
          <FormField
            v-for="key in REPLY_CLASSES"
            :key="key"
            :label="$t(`leads.reply_type.${key}`)"
          >
            <BasicSelect
              v-model="form.reply_colours[key]"
              :options="colourOptions"
              :disabled="readonly"
              :data-testid="`potential-reply-${key}`"
            />
          </FormField>
        </div>
      </BasicCard>
      <p class="m-0 t-secondary" data-testid="potential-settings-manual">
        {{ $t("leads.potential.settings_manual") }}
        <router-link class="t-accent" :to="{ name: 'LeadsCompanies' }">{{
          $t("leads.companies.title")
        }}</router-link>
      </p>
    </div>
  </PageLayout>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { t } from "@/i18n";
import { GET_LeadsChannel, PATCH_LeadsChannel } from "@/api/leads/api";
import { extractApiMessage, useFormErrors } from "@/composables/useFormErrors";
import { usePageReadonly } from "@/composables/useReadonly";
import { useUnsavedChanges } from "@/composables/useUnsavedChanges";
import { useNotifyStore } from "@/stores/notify";
import { POTENTIAL_COLOURS, potentialLabel } from "./potential";
import { saveAction } from "./saveAction";

const DAY_KEYS = ["silence_days", "skip_return_days", "red_return_days"];
const REPLY_CLASSES = [
  "interested",
  "not_now",
  "out_of_office",
  "unclear",
  "wrong_person",
  "not_interested",
];

const notify = useNotifyStore();
const readonly = usePageReadonly();
const formErrors = useFormErrors();
const { snapshot, track, isDirty } = useUnsavedChanges();
const loading = ref(true);
const saving = ref(false);
const error = ref("");
const missing = ref({});
const form = reactive({
  silence_days: 120,
  skip_return_days: 30,
  red_return_days: 90,
  reply_colours: {},
});

const colourOptions = computed(() =>
  POTENTIAL_COLOURS.map((value) => ({ value, label: potentialLabel(value) }))
);
const actions = computed(() =>
  readonly.value
    ? []
    : [
        saveAction({
          dirty: isDirty.value,
          saving: saving.value,
          testid: "potential-settings-save",
          onClick: save,
        }),
      ]
);
const fieldError = (key) =>
  missing.value[key] || formErrors.getFieldError(key)?.msg || "";

function fill(potential) {
  Object.assign(form, {
    ...potential,
    reply_colours: { ...potential.reply_colours },
  });
  snapshot(form);
  track(form);
}

async function load() {
  try {
    const { data } = await GET_LeadsChannel();
    if (!data.potential)
      throw new Error(t("leads.potential.settings_unsupported"));
    fill(data.potential);
  } catch (err) {
    error.value = extractApiMessage(
      err,
      t("leads.potential.settings_load_error")
    );
  } finally {
    loading.value = false;
  }
}

async function save() {
  formErrors.clearErrors();
  missing.value = Object.fromEntries(
    DAY_KEYS.filter((key) => !(Number(form[key]) >= 1)).map((key) => [
      key,
      t("leads.potential.days_required"),
    ])
  );
  if (Object.keys(missing.value).length) return;
  saving.value = true;
  try {
    const potential = {
      ...Object.fromEntries(DAY_KEYS.map((key) => [key, Number(form[key])])),
      reply_colours: { ...form.reply_colours },
    };
    fill((await PATCH_LeadsChannel({ potential })).data.potential);
    notify.spawnNotification({
      msg: t("leads.potential.settings_saved"),
      type: "positive",
    });
  } catch (err) {
    formErrors.handleApiError(err);
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>
