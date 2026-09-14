<template>
  <div class="ld-page" data-testid="communicator-template-edit">
    <div class="ld-row">
      <router-link :to="{ name: 'CommunicatorTemplates' }">{{ $t("communicator.templates.back") }}</router-link>
      <h2 class="ld-title">{{ form.key }}</h2>
      <button class="ld-btn" data-testid="template-versions" @click="drawer = 'versions'">
        {{ $t("communicator.template.versions") }}
      </button>
      <button class="ld-btn" data-testid="template-test-generate" @click="drawer = 'test'">
        {{ $t("communicator.template.test_generate") }}
      </button>
    </div>
    <form v-if="loaded" class="ld-field form" @submit.prevent="save">
      <label class="ld-field">{{ $t("communicator.template.kind") }}
        <select v-model="form.kind" class="ld-input"><option value="static">static</option><option value="ai_prompt">ai_prompt</option></select>
      </label>
      <label class="ld-field">{{ $t("communicator.template.language") }}
        <input v-model="form.language" class="ld-input" maxlength="2" required />
      </label>
      <label class="ld-field">{{ $t("communicator.template.subject") }}
        <input v-model="form.subject" class="ld-input" data-testid="template-subject" />
      </label>
      <label class="ld-field">{{ $t("communicator.template.body") }}
        <textarea v-model="form.body" class="ld-input" rows="10" required data-testid="template-body"></textarea>
      </label>
      <label class="ld-field">{{ $t("communicator.template.model") }}
        <select v-model="form.model" class="ld-input" data-testid="template-model">
          <option value="">—</option>
          <option v-for="m in models" :key="m.model_id" :value="m.model_id">{{ m.model_id }} ({{ m.provider }})</option>
        </select>
      </label>
      <label class="ld-field">{{ $t("communicator.template.json_schema") }}
        <textarea v-model="schemaText" class="ld-input" rows="6" data-testid="template-schema"></textarea>
      </label>
      <p v-if="schemaError" class="ld-error" data-testid="template-schema-error">{{ schemaError }}</p>
      <label><input v-model="form.requires_legal_footer" type="checkbox" /> {{ $t("communicator.template.requires_legal_footer") }}</label>
      <label><input v-model="form.is_active" type="checkbox" /> {{ $t("communicator.template.is_active") }}</label>
      <p class="ld-muted" data-testid="template-auto-approve">
        {{ $t("communicator.template.auto_approve") }}: {{ form.auto_approve ? "✓" : "✗" }} — {{ $t("communicator.template.grappelli") }}
      </p>
      <p v-if="error" class="ld-error">{{ error }}</p>
      <button class="ld-btn ld-btn--primary" type="submit" :disabled="Boolean(schemaError)" data-testid="template-save">
        {{ $t("communicator.template.save") }}
      </button>
    </form>
    <SideDrawer :visible="drawer === 'versions'" :title="$t('communicator.template.versions')" @close="drawer = ''">
      <TemplateVersions v-if="drawer === 'versions'" :template-id="templateId" />
    </SideDrawer>
    <SideDrawer :visible="drawer === 'test'" :title="$t('communicator.template.test_generate')" @close="drawer = ''">
      <TestGenerate v-if="drawer === 'test'" :template-id="templateId" />
    </SideDrawer>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute } from "vue-router";
import { t } from "@/i18n";
import { GET_Models, GET_Template, PUT_Template } from "@/api/communicator/api";
import { extractApiMessage } from "@/composables/useFormErrors";
import { useNotifyStore } from "@/stores/notify";
import TemplateVersions from "./TemplateVersions.vue";
import TestGenerate from "./TestGenerate.vue";

// auto_approve is read-only here (set in Grappelli); it is sent back unchanged.
const FIELDS = ["key", "kind", "language", "subject", "body", "model", "requires_legal_footer", "auto_approve", "is_active"];
const route = useRoute();
const notify = useNotifyStore();
const templateId = computed(() => route.params.id);
const form = reactive({});
const schemaText = ref("");
const models = ref([]);
const loaded = ref(false);
const drawer = ref("");
const error = ref("");

// Empty = no schema; otherwise the textarea must hold a JSON object.
function parseSchema(text) {
  if (!text.trim()) return { value: null };
  try {
    const value = JSON.parse(text);
    return value && typeof value === "object" && !Array.isArray(value) ? { value } : { error: t("communicator.template.schema_object") };
  } catch (err) {
    return { error: `${t("communicator.template.schema_invalid")}: ${err.message}` };
  }
}
const schemaError = computed(() => parseSchema(schemaText.value).error || "");

async function save() {
  error.value = "";
  try {
    const { data } = await PUT_Template(templateId.value, { ...form, json_schema: parseSchema(schemaText.value).value });
    Object.assign(form, data);
    notify.spawnNotification({ msg: t("communicator.template.saved") });
  } catch (err) {
    error.value = extractApiMessage(err, t("leads.review.error"));
  }
}

onMounted(async () => {
  const [tpl, modelRes] = await Promise.all([GET_Template(templateId.value), GET_Models().catch(() => ({ data: { results: [] } }))]);
  FIELDS.forEach((field) => (form[field] = tpl.data[field]));
  schemaText.value = tpl.data.json_schema ? JSON.stringify(tpl.data.json_schema, null, 2) : "";
  models.value = modelRes.data.results;
  loaded.value = true;
});
</script>

<style scoped>
.form {
  max-width: 760px;
}
</style>
