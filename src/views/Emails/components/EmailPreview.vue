<template>
  <BasicCard :title="$t('emails.preview.title')" data-testid="email-preview" gap>
    <!-- switching what the preview shows only reads: it stays on a read-only page -->
    <ReadonlyOff>
      <div class="email-preview__controls">
        <SegmentedControl
          v-if="variantOptions.length > 1"
          :model-value="variant"
          :options="variantOptions"
          :aria-label="$t('emails.preview.variant')"
          @update:model-value="pickVariant"
        />
        <SegmentedControl v-model="width" :options="widthOptions" :aria-label="$t('emails.preview.width')" />
        <BasicSwitch v-model="showText" :label="$t('emails.preview.text_version')" data-testid="email-preview-text-toggle" />
      </div>
    </ReadonlyOff>
    <p v-if="dirty" class="fs-200 t-muted m-0" role="status" data-testid="email-preview-dirty">
      {{ $t("emails.preview.save_to_refresh") }}
    </p>
    <EmptyState v-if="failed" icon="warning" size="sm" :title="$t('emails.preview.unavailable')" data-testid="email-preview-error">
      <BasicButton :mutates="false" size="sm" data-testid="email-preview-retry" @click="load">
        {{ $t("emails.retry") }}
      </BasicButton>
    </EmptyState>
    <Loader v-else-if="!preview" />
    <template v-else>
      <p class="fw-600 m-0" data-testid="email-preview-subject">{{ preview.subject }}</p>
      <pre v-if="showText" class="email-preview__text" data-testid="email-preview-text">{{ preview.text }}</pre>
      <div v-else class="email-preview__stage">
        <!-- rendered by our backend, still framed: an empty sandbox runs no script and gets no origin; never v-html -->
        <iframe
          class="email-preview__frame"
          :class="`email-preview__frame--${width}`"
          sandbox=""
          :srcdoc="preview.html"
          :title="$t('emails.preview.title')"
          data-testid="email-preview-frame"
        ></iframe>
      </div>
    </template>
  </BasicCard>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { t } from "@/i18n";
import { GET_EmailTemplatePreview } from "@/api/emails/api";
import { ReadonlyOff } from "@/composables/useReadonly";
import { PREVIEW_VARIANTS } from "../emailTypes";

// The saved wording of a template type rendered on sample data. `version` changes after each save: the preview
// reloads then and only then — while the form is `dirty` it keeps showing the saved copy, with a note.
const props = defineProps({
  emailType: { type: String, required: true },
  language: { type: String, default: "" },
  version: { type: Number, default: 0 },
  dirty: { type: Boolean, default: false },
});

const variants = computed(() => PREVIEW_VARIANTS[props.emailType] || []);
const variant = ref(variants.value[0]?.value);
const width = ref("desktop");
const showText = ref(false);
const preview = ref(null);
const failed = ref(false);
let latest = 0; // only the answer to the last request lands: a slower earlier one is dropped

const variantOptions = computed(() =>
  variants.value.map(({ value, label }) => ({ value, label: t(label), testid: `email-preview-variant-${value}` }))
);
const widthOptions = computed(() => [
  { value: "desktop", label: t("emails.preview.desktop"), testid: "email-preview-width-desktop" },
  { value: "phone", label: t("emails.preview.phone"), testid: "email-preview-width-phone" },
]);

// The loader replaces the frame while a variant or a saved version loads: the old e-mail never shows under a new choice.
async function load() {
  const request = ++latest;
  failed.value = false;
  preview.value = null;
  const params = { variant: variant.value, ...(props.language ? { language: props.language } : {}) };
  try {
    const { data } = await GET_EmailTemplatePreview(props.emailType, params);
    if (request === latest) preview.value = data;
  } catch {
    if (request === latest) failed.value = true;
  }
}

function pickVariant(value) {
  variant.value = value;
  load();
}

watch(() => props.version, load);
onMounted(load);
</script>

<style lang="scss" scoped>
.email-preview__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-4);
}

.email-preview__stage {
  overflow-x: auto;
}

// The mail is read on a white canvas whatever the CMS theme: the document in the frame brings its own colours.
.email-preview__frame {
  display: block;
  max-width: 100%;
  height: 40rem;
  margin: 0 auto;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
}

.email-preview__frame--desktop {
  width: 600px;
}

.email-preview__frame--phone {
  width: 360px;
}

.email-preview__text {
  margin: 0;
  padding: var(--space-4);
  max-height: 40rem;
  overflow: auto;
  white-space: pre-wrap;
  font-size: var(--fs-200);
  background: var(--surface-raised);
  border-radius: var(--radius-lg);
}
</style>
