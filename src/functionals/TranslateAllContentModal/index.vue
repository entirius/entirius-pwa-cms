<script>
import { useContentDBChannelStore } from "@/stores/contentDBChannel";
import { useLoaderStore } from "@/stores/loader";
import { useNotifyStore } from "@/stores/notify";
import { extractApiMessage } from "@/composables/useFormErrors";
import {
  POST_ContentTranslateEstimate,
  POST_ContentTranslateExecute,
} from "@/api/contentDB/translator";

export default {
  name: "TranslateAllContentModal",
  props: {
    visible: { type: Boolean, default: false },
    channelIdx: { type: String, required: true },
    title: { type: String, default: "" },
  },
  emits: ["close", "translated"],
  setup() {
    const contentDBChannel = useContentDBChannelStore();
    const loader = useLoaderStore();
    const notify = useNotifyStore();
    return { contentDBChannel, loader, notify };
  },
  data() {
    return {
      sourceLanguage: "",
      selectedLanguages: [],
      step: "config",
      estimate: null,
      estimating: false,
      executing: false,
      force: false,
      publish: false,
      translateRoutes: true,
    };
  },
  computed: {
    sourceLanguageOptions() {
      return this.contentDBChannel.availableLanguages.map((lang) => ({
        label: lang.toUpperCase(),
        value: lang,
      }));
    },
    targetLanguageOptions() {
      return this.contentDBChannel.availableLanguages
        .filter((lang) => lang !== this.sourceLanguage)
        .map((lang) => ({ label: lang.toUpperCase(), value: lang }));
    },
    canEstimate() {
      return this.selectedLanguages.length > 0 && this.sourceLanguage;
    },
    dialogTitle() {
      return this.title || this.$t("builder.translate_all");
    },
  },
  watch: {
    visible(val) {
      if (val) {
        this.step = "config";
        this.estimate = null;
        this.selectedLanguages = [];
        this.force = false;
        this.publish = false;
        this.sourceLanguage =
          this.contentDBChannel.defaultLanguage || "";
      }
    },
    sourceLanguage() {
      this.selectedLanguages = this.selectedLanguages.filter(
        (l) => l !== this.sourceLanguage
      );
    },
  },
  methods: {
    onLanguageSelect(val) {
      const idx = this.selectedLanguages.indexOf(val);
      if (idx >= 0) {
        this.selectedLanguages.splice(idx, 1);
      } else {
        this.selectedLanguages.push(val);
      }
    },
    removeLanguage(lang) {
      this.selectedLanguages = this.selectedLanguages.filter((l) => l !== lang);
    },
    async fetchEstimate() {
      this.estimating = true;
      try {
        const payload = {
          entity_type: "page",
          target_languages: this.selectedLanguages,
          source_language: this.sourceLanguage,
          force: this.force,
          publish: this.publish,
        };
        const { data } = await POST_ContentTranslateEstimate(
          this.channelIdx,
          payload
        );
        this.estimate = data;
        this.step = "confirm";
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("builder.translate_estimate_failed")),
        });
      } finally {
        this.estimating = false;
      }
    },
    async confirmTranslate() {
      this.executing = true;
      try {
        const payload = {
          entity_type: "page",
          target_languages: this.selectedLanguages,
          source_language: this.sourceLanguage,
          force: this.force,
          publish: this.publish,
        };
        const { data } = await POST_ContentTranslateExecute(
          this.channelIdx,
          payload
        );
        const jobCount = data.job_ids?.length || 0;
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("builder.translate_jobs_created", { count: jobCount }),
        });
        this.$emit("translated");
        this.$emit("close");
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("builder.translate_execute_failed")),
        });
      } finally {
        this.executing = false;
      }
    },
    formatCost(val) {
      if (val == null) return "-";
      return `$${Number(val).toFixed(4)}`;
    },
  },
};
</script>

<template>
  <div v-if="visible" class="td-overlay" @click.self="$emit('close')">
    <div class="td-dialog">
      <h3 class="td-dialog__title">{{ dialogTitle }}</h3>

      <!-- Step 1: Config -->
      <div v-if="step === 'config'">
        <p class="t-basic-500 fs-200 mb-300">
          {{ $t("builder.translate_all_description") }}
        </p>

        <div class="td-dialog__field mb-300">
          <label class="fs-200 fw-600 t-basic-500 mb-100">{{
            $t("builder.translate_source_language")
          }}</label>
          <Dropdown
            :values="sourceLanguageOptions"
            :selected="sourceLanguage ? [sourceLanguage] : []"
            :placeholder="$t('builder.translate_select_language')"
            @onSelect="(val) => (sourceLanguage = val)"
          />
        </div>

        <div class="td-dialog__field mb-300">
          <label class="fs-200 fw-600 t-basic-500 mb-100">{{
            $t("builder.translate_target_languages")
          }}</label>
          <Dropdown
            :values="targetLanguageOptions"
            :placeholder="$t('builder.translate_select_language')"
            @onSelect="onLanguageSelect"
          />
          <div v-if="selectedLanguages.length" class="td-chips mt-100">
            <span
              v-for="lang in selectedLanguages"
              :key="lang"
              class="td-chip bg-support-100 t-support-400 fs-200"
              @click="removeLanguage(lang)"
            >
              {{ lang.toUpperCase() }}
              <i class="icon icon-close fs-100"></i>
            </span>
          </div>
          <p
            v-if="!targetLanguageOptions.length"
            class="t-warning-200 fs-200 mt-100"
          >
            {{ $t("builder.translate_no_languages") }}
          </p>
        </div>

        <div class="td-dialog__field mb-200">
          <label class="td-checkbox fs-300 t-basic-700">
            <input type="checkbox" v-model="force" />
            {{ $t("builder.translate_force_all") }}
          </label>
        </div>

        <div class="td-dialog__field mb-300">
          <label class="td-checkbox fs-300 t-basic-700">
            <input type="checkbox" v-model="publish" />
            {{ $t("builder.translate_publish") }}
          </label>
        </div>

        <div class="td-dialog__actions">
          <button class="td-btn td-btn--secondary" @click="$emit('close')">
            {{ $t("common.cancel") }}
          </button>
          <button
            class="td-btn td-btn--primary"
            :disabled="!canEstimate || estimating"
            @click="fetchEstimate"
          >
            {{
              estimating
                ? $t("builder.translate_estimating")
                : $t("builder.translate_estimate")
            }}
          </button>
        </div>
      </div>

      <!-- Step 2: Estimate + Confirm -->
      <div v-if="step === 'confirm' && estimate">
        <!-- Per-language breakdown -->
        <table class="td-table mb-300">
          <thead>
            <tr>
              <th class="fs-200 t-basic-500">
                {{ $t("builder.translate_target_languages") }}
              </th>
              <th class="fs-200 t-basic-500">
                {{ $t("builder.translate_items") }}
              </th>
              <th class="fs-200 t-basic-500">
                {{ $t("builder.translate_chars") }}
              </th>
              <th class="fs-200 t-basic-500">
                {{ $t("builder.translate_cost") }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="pl in estimate.per_language" :key="pl.language">
              <td class="fs-300 fw-600">{{ pl.language.toUpperCase() }}</td>
              <td class="fs-300">{{ pl.items }}</td>
              <td class="fs-300">{{ pl.chars?.toLocaleString() }}</td>
              <td class="fs-300">{{ formatCost(pl.cost_usd) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td class="fs-300 fw-600" colspan="3">
                {{ $t("builder.translate_total_cost") }}
              </td>
              <td class="fs-300 fw-600">
                {{ formatCost(estimate.estimated_cost_usd) }}
              </td>
            </tr>
          </tfoot>
        </table>

        <!-- Per-draft breakdown -->
        <div v-if="estimate.per_draft && estimate.per_draft.length">
          <h4 class="fs-200 fw-600 t-basic-500 mb-100" style="text-transform: uppercase; letter-spacing: 0.03em;">
            {{ $t("builder.translate_pages_to_translate") }}
          </h4>
          <table class="td-table mb-300">
            <thead>
              <tr>
                <th class="fs-200 t-basic-500">
                  {{ $t("builder.translate_draft_name") }}
                </th>
                <th class="fs-200 t-basic-500">
                  {{ $t("builder.translate_draft_items") }}
                </th>
                <th class="fs-200 t-basic-500">
                  {{ $t("builder.translate_draft_chars") }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="draft in estimate.per_draft" :key="draft.draft_name">
                <td class="fs-300">{{ draft.draft_name }}</td>
                <td class="fs-300">{{ draft.items }}</td>
                <td class="fs-300">{{ draft.chars?.toLocaleString() }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="td-dialog__actions">
          <button
            class="td-btn td-btn--secondary"
            @click="
              step = 'config';
              estimate = null;
            "
          >
            {{ $t("common.back") }}
          </button>
          <button
            class="td-btn td-btn--primary"
            :disabled="executing"
            @click="confirmTranslate"
          >
            {{
              executing
                ? $t("builder.translate_creating_jobs")
                : $t("builder.translate_confirm")
            }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.td-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--overlay-heavy);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.td-dialog {
  background: var(--c-basic-100);
  border-radius: var(--radius-lg);
  padding: 24px;
  min-width: min(480px, 95vw);
  max-width: 560px;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--c-basic-200);
}

.td-dialog__title {
  margin: 0 0 16px;
  font-size: var(--fs-500);
  font-weight: 600;
  color: var(--c-basic-800);
}

.td-dialog__field {
  display: flex;
  flex-direction: column;
}

.td-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}

.td-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.td-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-weight: 600;
  transition: opacity 0.15s;

  &:hover {
    opacity: 0.7;
  }
}

.td-table {
  width: 100%;
  border-collapse: collapse;

  th,
  td {
    text-align: left;
    padding: 8px 12px;
    border-bottom: 1px solid var(--c-basic-300);
  }

  thead th {
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  tfoot td {
    border-top: 2px solid var(--c-basic-400);
    border-bottom: none;
  }
}

.td-btn {
  padding: 8px 16px;
  border-radius: var(--radius-md);
  border: 1px solid var(--c-basic-200);
  cursor: pointer;
  font-size: var(--fs-300);
  font-weight: 500;
  transition: background 0.15s, border-color 0.15s;

  &--primary {
    background: var(--c-support-400);
    color: var(--c-basic-100);
    border-color: var(--c-support-400);

    &:hover:not(:disabled) {
      background: var(--c-support-300);
      border-color: var(--c-support-300);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &--secondary {
    background: var(--c-basic-100);
    color: var(--c-basic-700);

    &:hover {
      background: var(--c-basic-200);
    }
  }
}

.td-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;

  input[type="checkbox"] {
    cursor: pointer;
  }
}
</style>
