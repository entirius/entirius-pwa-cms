<template>
  <BasicCard :title="title" :data-testid="`profiles-${kind}`">
    <div class="profiles flex-column gap-4">
      <p v-if="!profiles.length" class="t-muted m-0" data-testid="profile-empty">{{ $t("leads.profiles.empty") }}</p>
      <div v-for="profile in profiles" :key="profile.id" class="profile" data-testid="profile-row" :data-key="profile.key">
        <span class="profile__summary">{{ profile.key }} · {{ profile.model }}</span>
        <BasicSwitch
          v-if="hasActive"
          :model-value="profile.is_active"
          :label="$t('leads.rules.active')"
          data-testid="profile-active"
          @update:model-value="toggle(profile, $event)"
        />
        <div class="profile__controls">
          <BasicButton mutates variant="outline" data-testid="profile-edit" @click="edit(profile)">{{ $t("leads.rules.edit") }}</BasicButton>
          <IconButton mutates icon="delete" variant="danger" :label="$t('leads.stages.delete')" data-testid="profile-delete" @click="remove(profile)" />
        </div>
        <p v-if="errors[profile.id]" class="profile__error t-negative m-0" data-testid="profile-error">{{ errors[profile.id] }}</p>
      </div>
      <form class="profile-form flex-column gap-4" data-testid="profile-form" @submit.prevent="submit">
        <h3 class="m-0">{{ editingId ? $t("leads.profiles.edit_title") : $t("leads.profiles.add_title") }}</h3>
        <FormField :label="$t('leads.profiles.key')" required>
          <BasicInput v-model="form.key" :maxlength="64" data-testid="profile-key" />
        </FormField>
        <FormField :label="$t('leads.profiles.model')" required>
          <BasicInput v-model="form.model" :maxlength="128" data-testid="profile-model" />
        </FormField>
        <FormField :label="$t('leads.profiles.prompt')" required :hint="$t('leads.profiles.prompt_help')">
          <BasicTextarea v-model="form.prompt_text" :rows="8" data-testid="profile-prompt" />
        </FormField>
        <FormField :label="$t('leads.profiles.schema')" :hint="$t('leads.profiles.schema_help')">
          <BasicTextarea v-model="schemaText" :rows="5" data-testid="profile-schema" />
        </FormField>
        <BasicSwitch v-if="hasActive" v-model="form.is_active" :label="$t('leads.rules.active')" data-testid="profile-form-active" />
        <p v-if="errors.form" class="t-negative m-0" role="alert" data-testid="profile-form-error">{{ errors.form }}</p>
        <div class="flex jc-fe gap-3">
          <BasicButton v-if="editingId" variant="outline" type="button" data-testid="profile-cancel" @click="reset">{{ $t("common.cancel") }}</BasicButton>
          <BasicButton variant="primary" type="submit" data-testid="profile-save">
            {{ editingId ? $t("communicator.template.save") : $t("leads.rules.add") }}
          </BasicButton>
        </div>
      </form>
    </div>
  </BasicCard>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import { t } from "@/i18n";
import { DELETE_Profile, GET_Profile, GET_Profiles, PATCH_Profile, POST_Profile } from "@/api/leads/api";
import { extractApiMessage } from "@/composables/useFormErrors";

// One list of prompt profiles (analysis or recipient pick, by `kind`): rows from the list (no prompt), the detail is
// fetched into the form on Edit. The recipient profile has no active flag.
const props = defineProps({
  kind: { type: String, required: true },
  hasActive: { type: Boolean, default: false },
  title: { type: String, required: true },
});
const profiles = ref([]);
const errors = reactive({});
const editingId = ref(null);
const schemaText = ref("{}");
const blank = () => ({ key: "", model: "", prompt_text: "", is_active: true });
const form = reactive(blank());

async function load() {
  profiles.value = (await GET_Profiles(props.kind)).data.results || [];
}

async function attempt(key, call) {
  delete errors[key];
  try {
    await call();
    return true;
  } catch (err) {
    errors[key] = extractApiMessage(err, t("leads.review.error"));
    return false;
  }
}

async function toggle(profile, is_active) {
  if (await attempt(profile.id, () => PATCH_Profile(props.kind, profile.id, { is_active }))) await load();
}

async function remove(profile) {
  if (await attempt(profile.id, () => DELETE_Profile(props.kind, profile.id))) {
    if (editingId.value === profile.id) reset();
    await load();
  }
}

async function edit(profile) {
  delete errors[profile.id];
  try {
    const { data } = await GET_Profile(props.kind, profile.id);
    editingId.value = data.id;
    Object.assign(form, blank(), { key: data.key, model: data.model, prompt_text: data.prompt_text, is_active: data.is_active ?? true });
    schemaText.value = JSON.stringify(data.json_schema || {}, null, 2);
  } catch (err) {
    errors[profile.id] = extractApiMessage(err, t("leads.review.error"));
  }
}

function reset() {
  editingId.value = null;
  Object.assign(form, blank());
  schemaText.value = "{}";
}

async function submit() {
  delete errors.form;
  if (!form.key.trim() || !form.model.trim() || !form.prompt_text.trim()) {
    errors.form = t("leads.profiles.required");
    return;
  }
  let schema;
  try {
    schema = JSON.parse(schemaText.value.trim() || "{}");
  } catch {
    schema = null;
  }
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    errors.form = t("leads.profiles.schema_invalid");
    return;
  }
  const body = { key: form.key.trim(), model: form.model.trim(), prompt_text: form.prompt_text, json_schema: schema };
  if (props.hasActive) body.is_active = form.is_active;
  const call = editingId.value ? () => PATCH_Profile(props.kind, editingId.value, body) : () => POST_Profile(props.kind, body);
  if (await attempt("form", call)) {
    reset();
    await load();
  }
}

onMounted(load);
</script>

<style lang="scss" scoped>
@import "@/assets/scss/utils/media-query";

.profiles {
  max-width: 720px;
}
.profile {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: var(--space-5);
}
.profile__controls {
  display: flex;
  gap: var(--space-2);
}
.profile__error {
  grid-column: 1 / -1;
}
/* Below tablet the summary takes a line of its own, the switch and the buttons wrap below it */
@include max-tablet {
  .profile {
    grid-template-columns: 1fr auto;
    padding-bottom: var(--space-4);
    border-bottom: 1px solid var(--border-subtle);
  }
  .profile__summary {
    grid-column: 1 / -1;
  }
}
</style>
