<template>
  <PageLayout data-testid="leads-reply-classification">
    <template #header>
      <PageHeader :title="$t('leads.classify.title')" :back="{ name: 'LeadsSettings' }">
        <template v-if="!loading" #actions>
          <StatusBadge v-if="isDirty" tone="warning" :dot="false" :label="$t('unsaved.changes')" />
          <ActionBar :actions="actions" />
        </template>
      </PageHeader>
    </template>

    <Loader v-if="loading" block />
    <p v-else-if="error" class="t-negative m-0" role="alert" data-testid="classify-error">{{ error }}</p>
    <div v-else class="flex-column gap-8">
      <!-- PageHeader `description` is plain text: the line with its link opens the body -->
      <router-link :to="{ name: 'LeadsAutomaticMoves' }" class="t-accent" data-testid="classify-moves-link">{{ $t("leads.classify.description") }}</router-link>
      <template v-if="!configHealth.aiUsable">
        <AiToolboxHint />
        <p class="m-0" data-testid="classify-toolbox-off">{{ $t("leads.classify.toolbox_off") }}</p>
      </template>
      <p v-if="!form.is_active" class="m-0" data-testid="classify-inactive">{{ $t("leads.classify.inactive") }}</p>
      <BasicCard :title="$t('leads.classify.model_card')">
        <div class="form-grid">
          <BasicSwitch v-model="form.is_active" class="form-grid__wide" :label="$t('leads.classify.active')" data-testid="classify-active" />
          <FormField :label="$t('leads.classify.model')" required :error="fieldError('model')">
            <BasicSelect v-model="form.model" :options="modelOptions" data-testid="classify-model" />
          </FormField>
          <FormField :label="$t('leads.classify.min_confidence')" :hint="$t('leads.classify.min_confidence_hint')" hint-level="important" :error="fieldError('min_confidence')">
            <BasicInput v-model="form.min_confidence" format="percent" data-testid="classify-min-confidence" />
          </FormField>
          <FormField :label="$t('leads.classify.max_chars')" :error="fieldError('max_chars')">
            <NumberInput v-model="form.max_chars" :min="1" data-testid="classify-max-chars" />
          </FormField>
        </div>
      </BasicCard>
      <BasicCard :title="$t('leads.classify.prompt_card')">
        <FormField :label="$t('leads.classify.prompt')" required :error="fieldError('prompt_text')">
          <BasicTextarea v-model="form.prompt_text" :rows="14" data-testid="classify-prompt" />
        </FormField>
      </BasicCard>
    </div>
  </PageLayout>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { t } from "@/i18n";
import { GET_Models, GET_ReplyClassProfile, PUT_ReplyClassProfile } from "@/api/communicator/api";
import { extractApiMessage, useFormErrors } from "@/composables/useFormErrors";
import { useUnsavedChanges } from "@/composables/useUnsavedChanges";
import { useConfigHealthStore } from "@/stores/configHealth";
import { withStoredOption } from "@/utils/options";
import AiToolboxHint from "@/components/ConfigHealth/AiToolboxHint.vue";
import { saveAction } from "./saveAction";

// The AI sorting of replies into types: prompt, model, how sure it must be. No profile yet = an empty form, Active
// off; Save creates it. The confidence shows in percent and is stored as a fraction.
const configHealth = useConfigHealthStore();
const formErrors = useFormErrors();
const { snapshot, track, isDirty } = useUnsavedChanges();
const loading = ref(true);
const error = ref("");
const saving = ref(false);
const models = ref([]);
const form = reactive({ prompt_text: "", model: "", min_confidence: "70", max_chars: 3000, is_active: false });

const modelOptions = computed(() =>
  withStoredOption(
    models.value.map((model) => ({ value: model.model_id, label: `${model.model_id} (${model.provider})` })),
    form.model
  )
);
const actions = computed(() => [
  saveAction({ dirty: isDirty.value, saving: saving.value, testid: "classify-save", onClick: save }),
]);
const fieldError = (field) => formErrors.getFieldError(field)?.msg || "";
const isNotFound = (err) => (err?.httpStatus ?? err?.response?.status) === 404;

function fill(profile) {
  Object.assign(form, profile, { min_confidence: String(Math.round(profile.min_confidence * 100)) });
  snapshot(form);
  track(form);
}

async function loadProfile() {
  try {
    fill((await GET_ReplyClassProfile()).data);
  } catch (err) {
    if (!isNotFound(err)) throw err;
    snapshot(form);
    track(form);
  }
}

async function load() {
  try {
    const modelsRequest = configHealth.aiUsable ? GET_Models().catch(() => ({ data: { results: [] } })) : null;
    await loadProfile();
    models.value = modelsRequest ? (await modelsRequest).data.results || [] : [];
  } catch (err) {
    error.value = extractApiMessage(err, t("leads.classify.load_error"));
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
  formErrors.clearErrors();
  try {
    const body = { ...form, min_confidence: Number(form.min_confidence) / 100, max_chars: Number(form.max_chars) };
    fill((await PUT_ReplyClassProfile(body)).data);
  } catch (err) {
    formErrors.handleApiError(err);
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>
