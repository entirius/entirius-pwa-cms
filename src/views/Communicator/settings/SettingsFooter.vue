<template>
  <form class="ld-field" data-testid="settings-footer" @submit.prevent="save">
    <h3>{{ $t("communicator.footer.title") }}</h3>
    <p class="ld-muted">{{ $t("communicator.footer.help") }}</p>
    <p v-if="loadError" class="ld-muted" role="status" data-testid="footer-load-error">{{ $t("communicator.footer.load_error") }}</p>
    <!-- a save or remove in flight is bound to its language: the switch waits for it -->
    <SegmentedControl
      v-if="languages.length > 1"
      :model-value="language"
      :options="languageOptions"
      :disabled="busy"
      @update:model-value="pickLanguage"
    />
    <label class="ld-field">{{ $t("communicator.footer.html", { language: language.toUpperCase() }) }}
      <textarea
        v-model="html"
        class="ld-input footer__html"
        rows="8"
        :placeholder="$t('communicator.footer.placeholder')"
        data-testid="footer-html"
      ></textarea>
    </label>
    <p v-if="error" class="ld-error" data-testid="footer-error">{{ error }}</p>
    <p v-else-if="html && !hasPlaceholder" class="ld-muted" data-testid="footer-hint">{{ $t("communicator.footer.needs_legal") }}</p>
    <div class="ld-row">
      <button class="ld-btn ld-btn--primary" type="submit" :disabled="busy || !html.trim()" data-testid="footer-save">
        {{ $t("communicator.template.save") }}
      </button>
      <button v-if="saved" class="ld-btn ld-btn--danger" type="button" :disabled="busy" data-testid="footer-remove" @click="removing = true">
        {{ $t("communicator.footer.remove") }}
      </button>
    </div>
    <p class="footer__preview-title">{{ $t("communicator.footer.preview") }}</p>
    <!-- unsaved HTML is not sanitised yet: the preview runs in an empty sandbox (no scripts, no same origin) -->
    <iframe class="footer__preview" sandbox="" :srcdoc="previewDoc" :title="$t('communicator.footer.preview')" data-testid="footer-preview"></iframe>
    <ConfirmSheet
      v-if="switchTo"
      :title="$t('leads.review.discard_title')"
      :message="$t('communicator.footer.discard_confirm')"
      :confirm-label="$t('leads.review.discard_yes')"
      :cancel-label="$t('common.cancel')"
      @confirm="showLanguage(switchTo)"
      @cancel="switchTo = null"
    />
    <ConfirmSheet
      v-if="removing"
      :title="$t('communicator.footer.remove_title', { language: language.toUpperCase() })"
      :message="$t('communicator.footer.remove_message')"
      :confirm-label="$t('communicator.footer.remove')"
      :cancel-label="$t('common.cancel')"
      @confirm="remove"
      @cancel="removing = false"
    />
  </form>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { t } from "@/i18n";
import { DELETE_Footer, GET_Footers, GET_Templates, PUT_Footer } from "@/api/communicator/api";
import { extractApiMessage, useFormErrors } from "@/composables/useFormErrors";
import { useNotifyStore } from "@/stores/notify";
import ConfirmSheet from "@/views/Leads/ConfirmSheet.vue";

// One mail footer per language (UX-007): the channel's HTML block — signature, logo, company data — around the legal
// text of the contact's legal basis, which agreements supply at send time as `{{ legal }}`. The server sanitises on
// save and answers with the cleaned HTML, which goes back into the field. No footer = the legal text alone.
const PLACEHOLDER = /\{\{\s*legal\s*\}\}/;
const notify = useNotifyStore();
const { handleApiError, getFieldError } = useFormErrors();

const footers = ref({}); // language → saved html
const languages = ref([]);
const language = ref("pl");
const html = ref("");
const error = ref("");
const busy = ref(false);
const loadError = ref(false);
const switchTo = ref(null); // a language picked over unsaved edits, waiting for the discard confirmation
const removing = ref(false);

const saved = computed(() => Boolean(footers.value[language.value]));
const dirty = computed(() => html.value !== (footers.value[language.value] || ""));

const languageOptions = computed(() => languages.value.map((code) => ({ value: code, label: code.toUpperCase(), testid: `footer-lang-${code}` })));
const hasPlaceholder = computed(() => PLACEHOLDER.test(html.value));

// The sample legal text as the mail renders it: escaped paragraphs in place of the placeholder.
const sampleLegal = computed(() => t("communicator.footer.sample_legal").split("\n\n").map((line) => `<p>${line}</p>`).join(""));
// The mail is read on a white canvas whatever the CMS theme, so the white belongs to the previewed document.
const previewDoc = computed(
  () => `<!doctype html><html><body style="font-family:sans-serif;margin:8px;background:#fff">${html.value.replace(PLACEHOLDER, sampleLegal.value)}</body></html>`
);

function showLanguage(code) {
  switchTo.value = null;
  language.value = code;
  html.value = footers.value[code] || "";
  error.value = "";
}

function pickLanguage(code) {
  if (code === language.value) return;
  if (dirty.value) switchTo.value = code;
  else showLanguage(code);
}

// The answer lands under the language the request was sent for, whatever is on screen by then.
async function save() {
  const code = language.value;
  busy.value = true;
  error.value = "";
  try {
    const { data } = await PUT_Footer(code, html.value);
    footers.value = { ...footers.value, [code]: data.html };
    if (language.value === code) html.value = data.html;
    notify.spawnNotification({ msg: t("communicator.footer.saved") });
  } catch (err) {
    handleApiError(err);
    error.value = getFieldError("html")?.msg || extractApiMessage(err, t("leads.review.error"));
  } finally {
    busy.value = false;
  }
}

// No footer = the default language's footer, else the legal text alone (the server's fallback).
async function remove() {
  const code = language.value;
  removing.value = false;
  busy.value = true;
  error.value = "";
  try {
    await DELETE_Footer(code);
    const rest = { ...footers.value };
    delete rest[code];
    footers.value = rest;
    if (language.value === code) html.value = "";
    notify.spawnNotification({ msg: t("communicator.footer.removed") });
  } catch (err) {
    error.value = extractApiMessage(err, t("leads.review.error"));
  } finally {
    busy.value = false;
  }
}

// Languages = those with a footer plus those templates are written in; the channel's default (first) is selected.
onMounted(async () => {
  const empty = { data: { results: [] } };
  const footersFailed = () => {
    loadError.value = true;
    return empty;
  };
  const [footerRes, templateRes] = await Promise.all([GET_Footers().catch(footersFailed), GET_Templates().catch(() => empty)]);
  footers.value = Object.fromEntries((footerRes.data.results || []).map((row) => [row.language, row.html]));
  const codes = [...Object.keys(footers.value), ...(templateRes.data.results || []).map((tpl) => tpl.language)];
  languages.value = [...new Set(codes.filter(Boolean))].sort();
  language.value = languages.value[0] || "pl";
  html.value = footers.value[language.value] || "";
});
</script>

<style scoped>
.footer__html {
  width: 100%;
  box-sizing: border-box;
}
.footer__preview-title {
  margin: 0;
  font-weight: 600;
}
.footer__preview {
  width: 100%;
  min-height: 220px;
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  background: var(--surface-base);
}
</style>
