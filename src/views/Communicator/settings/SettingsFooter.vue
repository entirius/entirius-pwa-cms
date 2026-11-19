<template>
  <BasicCard :title="$t('communicator.footer.title')" data-testid="settings-footer">
    <div class="flex-column gap-4">
      <p class="t-muted m-0">{{ $t("communicator.footer.help") }}</p>
      <p v-if="loadError" class="t-muted m-0" role="status" data-testid="footer-load-error">{{ $t("communicator.footer.load_error") }}</p>
      <!-- a save or remove in flight is bound to its brand and language: the switches wait for it -->
      <ReadonlyOff>
        <div class="flex ai-ct flex-wrap gap-4">
          <BasicSelect
            v-if="brands.length"
            :model-value="brand"
            :options="brandOptions"
            :disabled="busy"
            :floating-label="$t('communicator.footer.brand')"
            data-testid="footer-brand"
            @update:model-value="pick({ brand: $event ?? '' })"
          />
          <SegmentedControl
            v-if="languages.length > 1"
            :model-value="language"
            :options="languageOptions"
            :disabled="busy"
            :aria-label="$t('communicator.template.language')"
            @update:model-value="pick({ language: $event })"
          />
        </div>
      </ReadonlyOff>
      <FormField :label="$t('communicator.footer.html', { language: language.toUpperCase() })">
        <BasicTextarea v-model="html" :maxlength="20000" :rows="8" :placeholder="$t('communicator.footer.placeholder')" data-testid="footer-html" />
      </FormField>
      <FormField :label="$t('communicator.footer.unsubscribe_label')" :hint="$t('communicator.footer.unsubscribe_hint')">
        <BasicInput v-model="label" :maxlength="120" :placeholder="defaultLabel" data-testid="footer-unsubscribe-label" />
      </FormField>
      <p v-if="error" class="t-negative m-0" role="alert" data-testid="footer-error">{{ error }}</p>
      <p v-else-if="html && !hasPlaceholder" class="t-muted m-0" data-testid="footer-hint">{{ $t("communicator.footer.needs_legal") }}</p>
      <div v-if="saved" class="flex jc-fe flex-wrap gap-3">
        <BasicButton mutates variant="danger" :disabled="busy" data-testid="footer-remove" @click="removing = true">
          {{ $t("communicator.footer.remove") }}
        </BasicButton>
      </div>
      <MailPreview :title="$t('communicator.footer.preview')" :html="previewHtml" testid="footer-preview" />
    </div>
    <ConfirmDialog
      :open="Boolean(switchTo)"
      :title="$t('leads.review.discard_title')"
      :message="$t('communicator.footer.discard_confirm')"
      :confirm-label="$t('leads.review.discard_yes')"
      :cancel-label="$t('common.cancel')"
      tone="danger"
      @confirm="show(switchTo)"
      @cancel="switchTo = null"
    />
    <ConfirmDialog
      :open="removing"
      :title="$t('communicator.footer.remove_title', { language: language.toUpperCase() })"
      :message="$t(brand ? 'communicator.footer.remove_message_brand' : 'communicator.footer.remove_message')"
      :confirm-label="$t('communicator.footer.remove')"
      :cancel-label="$t('common.cancel')"
      tone="danger"
      @confirm="remove"
      @cancel="removing = false"
    />
  </BasicCard>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { t } from "@/i18n";
import { DELETE_Footer, GET_Footers, GET_Templates, PUT_Footer } from "@/api/communicator/api";
import { extractApiMessage, useFormErrors } from "@/composables/useFormErrors";
import { useNotifyStore } from "@/stores/notify";
import { ReadonlyOff } from "@/composables/useReadonly";
import { loadBrands } from "@/utils/mailBrands";
import MailPreview from "./MailPreview.vue";

// One mail footer per brand and language (UX-007, U23): the HTML block — logo, company data — around the legal text
// of the contact's legal basis, which agreements supply at send time as `{{ legal }}`. Blank brand = every brand
// without its own footer. `{{ unsubscribe }}` (U25, optional) places the unsubscribe link; without it the link goes
// under the footer in small print. The server sanitises on save and answers with the cleaned HTML, which goes back
// into the field. No footer = the legal text alone.
const LEGAL = /\{\{\s*legal\s*\}\}/;
const UNSUBSCRIBE = /\{\{\s*unsubscribe\s*\}\}/;
// The server's default link text when the field is blank: it follows the mail's language, not the CMS's.
const DEFAULT_LABELS = { pl: "Nie chcę otrzymywać kolejnych wiadomości", en: "I don't want to receive further messages" };
const LINK_STYLE = "color:#555555";
const SMALL_PRINT = "font-family:Arial,sans-serif;font-size:11px;color:#555555";
const notify = useNotifyStore();
const { handleApiError, getFieldError } = useFormErrors();

const footers = ref({}); // "brand|language" → { html, unsubscribe_label } as saved
const languages = ref([]);
const brands = ref([]);
const brand = ref("");
const language = ref("pl");
const html = ref("");
const label = ref("");
const error = ref("");
const busy = ref(false);
const loadError = ref(false);
const switchTo = ref(null); // a brand / language picked over unsaved edits, waiting for the discard confirmation
const removing = ref(false);

const keyOf = (b, l) => `${b}|${l}`;
const stored = computed(() => footers.value[keyOf(brand.value, language.value)]);
const saved = computed(() => Boolean(stored.value));
const dirty = computed(() => html.value !== (stored.value?.html || "") || label.value !== (stored.value?.unsubscribe_label || ""));

const languageOptions = computed(() => languages.value.map((code) => ({ value: code, label: code.toUpperCase(), testid: `footer-lang-${code}` })));
const brandOptions = computed(() => [
  { value: "", label: t("communicator.footer.all_brands") },
  ...brands.value.map((value) => ({ value, label: value })),
]);
const hasPlaceholder = computed(() => LEGAL.test(html.value));
const defaultLabel = computed(() => DEFAULT_LABELS[language.value] || DEFAULT_LABELS.en);

const escape = (text) => text.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
// The sample legal text as the mail renders it: escaped paragraphs in place of the placeholder.
const sampleLegal = computed(() => t("communicator.footer.sample_legal").split("\n\n").map((line) => `<p>${line}</p>`).join(""));
// The unsubscribe link where `{{ unsubscribe }}` stands, else in small print under the footer (as the server builds it).
// An empty field previews the mail without a footer: the legal text alone (C-29), and the link under it.
const previewHtml = computed(() => {
  const link = `<a href="#" style="${LINK_STYLE}">${escape(label.value.trim() || defaultLabel.value)}</a>`;
  const footer = (html.value.trim() ? html.value : "{{ legal }}").replace(LEGAL, sampleLegal.value);
  return UNSUBSCRIBE.test(footer) ? footer.replace(UNSUBSCRIBE, link) : `${footer}<p style="${SMALL_PRINT}">${link}</p>`;
});

function show(target) {
  switchTo.value = null;
  brand.value = target.brand;
  language.value = target.language;
  const row = footers.value[keyOf(target.brand, target.language)];
  html.value = row?.html || "";
  label.value = row?.unsubscribe_label || "";
  error.value = "";
}

function pick(change) {
  const target = { brand: brand.value, language: language.value, ...change };
  if (target.brand === brand.value && target.language === language.value) return;
  if (dirty.value) switchTo.value = target;
  else show(target);
}

// The answer lands under the brand and language the request was sent for, whatever is on screen by then.
async function save() {
  const [b, code] = [brand.value, language.value];
  busy.value = true;
  error.value = "";
  try {
    const text = label.value.trim();
    // Only a label to set or clear: communicator before 0.5.0 refuses the field, and a CMS tag reaches every installation.
    const body = text || stored.value?.unsubscribe_label ? { html: html.value, unsubscribe_label: text } : { html: html.value };
    const { data } = await PUT_Footer(code, body, b);
    const row = { html: data.html, unsubscribe_label: data.unsubscribe_label ?? text };
    footers.value = { ...footers.value, [keyOf(b, code)]: row };
    if (brand.value === b && language.value === code) {
      html.value = row.html;
      label.value = row.unsubscribe_label;
    }
    return true;
  } catch (err) {
    handleApiError(err);
    error.value = getFieldError("html")?.msg || getFieldError("unsubscribe_label")?.msg || extractApiMessage(err, t("leads.review.error"));
    return false;
  } finally {
    busy.value = false;
  }
}

// The page's one Save (N27): an emptied field is no save (Remove footer clears one), so it does not count as a change.
const changed = computed(() => dirty.value && Boolean(html.value.trim()));
defineExpose({ dirty: changed, save });

// No brand footer = the channel-wide one; no footer at all = the default language's, else the legal text alone.
async function remove() {
  const [b, code] = [brand.value, language.value];
  removing.value = false;
  busy.value = true;
  error.value = "";
  try {
    await DELETE_Footer(code, b);
    const rest = { ...footers.value };
    delete rest[keyOf(b, code)];
    footers.value = rest;
    if (brand.value === b && language.value === code) {
      html.value = "";
      label.value = "";
    }
    notify.spawnNotification({ msg: t("communicator.footer.removed") });
  } catch (err) {
    error.value = extractApiMessage(err, t("leads.review.error"));
  } finally {
    busy.value = false;
  }
}

// Languages = those with a footer plus those templates are written in; the channel's default (first) is selected.
// Brands = those of the mailboxes plus those with a footer; the channel-wide footer opens first.
onMounted(async () => {
  const empty = { data: { results: [] } };
  const footersFailed = () => {
    loadError.value = true;
    return empty;
  };
  const [footerRes, templateRes, mailboxBrands] = await Promise.all([
    GET_Footers().catch(footersFailed),
    GET_Templates().catch(() => empty),
    loadBrands(),
  ]);
  const rows = footerRes.data.results || [];
  footers.value = Object.fromEntries(
    rows.map((row) => [keyOf(row.brand || "", row.language), { html: row.html, unsubscribe_label: row.unsubscribe_label || "" }])
  );
  const codes = [...rows.map((row) => row.language), ...(templateRes.data.results || []).map((tpl) => tpl.language)];
  languages.value = [...new Set(codes.filter(Boolean))].sort();
  brands.value = [...new Set([...mailboxBrands, ...rows.map((row) => row.brand).filter(Boolean)])].sort();
  show({ brand: "", language: languages.value[0] || "pl" });
});
</script>
