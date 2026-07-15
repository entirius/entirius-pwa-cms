<template>
  <Teleport to="body">
    <Transition name="import-modal">
      <div
        v-if="visible"
        class="import-modal__overlay"
        @click.self="$emit('close')"
      >
        <div
          class="import-modal__box bg-basic-100"
          role="dialog"
          aria-modal="true"
          data-testid="enrichment-import-dialog"
        >
          <div class="import-modal__header b-basic-300 bb-100">
            <FontAwesomeIcon icon="file-csv" class="t-support-400" />
            <h2 class="fs-400 fw-600 m-0">
              {{ $t("enrichment.import.title") }}
            </h2>
          </div>

          <div class="import-modal__body">
            <FormField
              :label="$t('enrichment.import.file')"
              :description="$t('enrichment.import.format_hint')"
            >
              <label
                class="import-modal__drop b-basic-400 bb-100"
                :class="{ 'import-modal__drop--on': dragging }"
                data-testid="enrichment-import-drop"
                @dragover.prevent="dragging = true"
                @dragleave.prevent="dragging = false"
                @drop.prevent="onDrop"
              >
                <input
                  type="file"
                  accept=".csv,text/csv"
                  class="import-modal__file-input"
                  data-testid="enrichment-import-file"
                  @change="onPick"
                />
                <FontAwesomeIcon icon="file-csv" class="t-basic-500" />
                <span class="fs-200">{{ fileLabel }}</span>
              </label>
              <button
                type="button"
                class="import-modal__sample t-support-400 fs-200"
                data-testid="enrichment-import-sample"
                @click="downloadSample"
              >
                <FontAwesomeIcon icon="download" />
                {{ $t("enrichment.import.download_sample") }}
              </button>
            </FormField>

            <FormField :label="$t('enrichment.import.channel')">
              <Dropdown
                :values="channelOptions"
                :selected="channel ? [channel] : []"
                :placeholder="$t('enrichment.import.channel')"
                data-testid="enrichment-import-channel"
                @onSelect="(v) => (channel = v)"
              />
            </FormField>

            <FormField :label="$t('enrichment.import.language')">
              <Dropdown
                :values="languageOptions"
                :selected="language ? [language] : []"
                :placeholder="$t('enrichment.import.language')"
                data-testid="enrichment-import-language"
                @onSelect="(v) => (language = v)"
              />
            </FormField>

            <p
              v-if="error"
              class="import-modal__error fs-200 t-negative-300"
              data-testid="enrichment-import-error"
            >
              {{ error }}
            </p>
          </div>

          <div class="import-modal__footer b-basic-300 bt-100">
            <button
              class="import-modal__btn bg-basic-200 t-basic-600"
              :disabled="busy"
              @click="$emit('close')"
            >
              {{ $t("common.cancel") }}
            </button>
            <button
              class="import-modal__btn bg-support-400 t-basic-100"
              :disabled="busy || !canSubmit"
              data-testid="enrichment-import-submit"
              @click="submit"
            >
              {{ $t("enrichment.import.submit") }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script>
import { usePimChannelStore } from "@/stores/pimChannel";
import { useNotifyStore } from "@/stores/notify";
import { extractApiMessage } from "@/composables/useFormErrors";
import { POST_ImportCsv } from "@/api/enrichment/api";

// Authoritative sample handed to the operator. Matches the backend importer's locked schema
// EXACTLY — header `sku,field,type` (django_enrichment.services.csv_import.EXPECTED_HEADER), one
// row per (subject, field), `type` = work-type (rows grouped → one task each). Verified to import
// against the live endpoint (HTTP 201, 3 tasks). Keep the header byte-identical or the import 400s.
const SAMPLE_CSV = `sku,field,type
ENT-S001,description,describe
ENT-S001,meta_title,seo
ENT-S002,short_description,describe
ENT-S002,meta_description,seo
ENT-S003,picture,media-refresh
`;

export default {
  name: "EnrichmentImportCsvDialog",
  props: {
    visible: { type: Boolean, default: false },
  },
  emits: ["close", "imported"],
  setup() {
    return { pimChannel: usePimChannelStore(), notify: useNotifyStore() };
  },
  data() {
    return {
      file: null,
      channel: "",
      language: "",
      dragging: false,
      busy: false,
      error: "",
    };
  },
  computed: {
    channelOptions() {
      return this.pimChannel.channels.map((c) => ({
        value: c.idx,
        label: c.name || c.idx,
      }));
    },
    availableLanguages() {
      return this.pimChannel.activeChannelLanguages.length
        ? this.pimChannel.activeChannelLanguages
        : this.pimChannel.allLanguages;
    },
    languageOptions() {
      return this.availableLanguages.map((l) => ({
        value: l,
        label: l.toUpperCase(),
      }));
    },
    fileLabel() {
      return this.file ? this.file.name : this.$t("enrichment.import.file_hint");
    },
    canSubmit() {
      return !!this.file && !!this.channel && !!this.language;
    },
  },
  watch: {
    visible(open) {
      if (open) this.reset();
    },
  },
  methods: {
    reset() {
      this.file = null;
      this.error = "";
      this.dragging = false;
      this.channel = this.pimChannel.activeChannelIdx || "";
      const langs = this.availableLanguages;
      this.language = langs.length ? langs[0] : "";
    },
    // Hand the operator a ready-to-edit file in the exact shape the importer accepts — far fewer
    // "header must be exactly [...]" round-trips. UTF-8 Blob → anchor download, no backend call.
    downloadSample() {
      const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "enrichment-sample.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
    onPick(event) {
      this.setFile(event.target.files?.[0] || null);
    },
    onDrop(event) {
      this.dragging = false;
      this.setFile(event.dataTransfer?.files?.[0] || null);
    },
    setFile(file) {
      this.error = "";
      if (file && !/\.csv$/i.test(file.name)) {
        this.file = null;
        this.error = this.$t("enrichment.import.invalid_file");
        return;
      }
      this.file = file;
    },
    async submit() {
      if (this.busy || !this.canSubmit) return;
      this.busy = true;
      this.error = "";
      const form = new FormData();
      form.append("file", this.file);
      form.append("channel", this.channel);
      form.append("language", this.language);
      try {
        const { data } = await POST_ImportCsv(form);
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("enrichment.import.toast_success", {
            count: data.task_count,
          }),
        });
        this.$emit("imported", data.task_count);
        this.$emit("close");
      } catch (err) {
        // Surface backend validation (bad header, empty file, ...) inline so the user can fix + retry.
        // The enrichment client's interceptor rejects with the UNWRAPPED v2 envelope (not an axios
        // error), so read it directly; fall back to the axios shape, then the generic helper. The
        // actionable reason lives in details[].description (message is the generic "validation failed").
        const body = err?.response?.data || err || {};
        this.error =
          body?.details?.[0]?.description ||
          body?.message ||
          extractApiMessage(err, this.$t("notifications.error"));
      } finally {
        this.busy = false;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.import-modal__overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: var(--overlay-backdrop);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-300);
}
.import-modal__box {
  width: 100%;
  max-width: 480px;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}
.import-modal__header {
  display: flex;
  align-items: center;
  gap: var(--space-100);
  padding: var(--space-300);
}
.import-modal__body {
  padding: var(--space-300);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-300);
}
.import-modal__drop {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-100);
  min-height: 72px;
  border: 1px dashed var(--c-basic-400);
  border-radius: var(--radius-sm);
  cursor: pointer;
  text-align: center;
  &--on {
    border-color: var(--c-support-400);
    color: var(--c-support-400);
  }
}
.import-modal__file-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}
.import-modal__error {
  margin: 0;
}
.import-modal__sample {
  display: inline-flex;
  align-items: center;
  gap: var(--space-50);
  margin-top: var(--space-100);
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  &:hover {
    text-decoration: underline;
  }
}
.import-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-100);
  padding: var(--space-300);
}
.import-modal__btn {
  height: var(--elem-height);
  padding: 0 16px;
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--fs-200);
  cursor: pointer;
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
.import-modal-enter-active,
.import-modal-leave-active {
  transition: opacity 0.15s ease;
}
.import-modal-enter-from,
.import-modal-leave-to {
  opacity: 0;
}
</style>
