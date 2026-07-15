<script>
import { usePimChannelStore } from "@/stores/pimChannel";
import { useLoaderStore } from "@/stores/loader";
import { useNotifyStore } from "@/stores/notify";
import {
  POST_TranslateEstimate,
  POST_TranslateExecute,
  GET_SystemLanguages,
  POST_AddLanguageToChannel,
} from "@/api/pim/translator";
import { extractApiMessage } from "@/composables/useFormErrors";

export default {
  name: "TranslateDialog",
  props: {
    visible: { type: Boolean, default: false },
    channelIdx: { type: String, required: true },
    entityType: { type: String, required: true },
    entityIds: { type: Array, default: null },
    title: { type: String, default: "" },
  },
  emits: ["close", "translated"],
  setup() {
    const pimChannel = usePimChannelStore();
    const loader = useLoaderStore();
    const notify = useNotifyStore();
    return { pimChannel, loader, notify };
  },
  data() {
    return {
      sourceLanguage: "",
      selectedLanguages: [],
      step: "config",
      estimate: null,
      estimating: false,
      executing: false,
      showAddLanguage: false,
      addingLanguage: false,
      newLanguageIso2: "",
      systemLanguages: [],
      force: false,
    };
  },
  computed: {
    sourceLanguageOptions() {
      return this.pimChannel.activeChannelLanguages.map((lang) => ({
        label: this.langLabel(lang),
        value: lang,
      }));
    },
    targetLanguageOptions() {
      return this.pimChannel.activeChannelLanguages
        .filter((lang) => lang !== this.sourceLanguage)
        .map((lang) => ({ label: this.langLabel(lang), value: lang }));
    },
    canEstimate() {
      return this.selectedLanguages.length > 0 && this.sourceLanguage;
    },
    addableLanguageOptions() {
      const assigned = new Set(this.pimChannel.activeChannelLanguages);
      return this.systemLanguages
        .filter((l) => !assigned.has(l.iso2))
        .map((l) => ({ label: `${l.iso2.toUpperCase()} — ${l.name_en}`, value: l.iso2 }));
    },
    dialogTitle() {
      return this.title || this.$t("pim.translate");
    },
    itemsLabel() {
      if (this.entityIds) {
        return `${this.entityIds.length} ${this.$t("pim.translate_selected_items")}`;
      }
      return this.$t("pim.translate_all_in_channel");
    },
  },
  watch: {
    visible(val) {
      if (val) {
        this.step = "config";
        this.estimate = null;
        this.selectedLanguages = [];
        this.showAddLanguage = false;
        this.newLanguageIso2 = "";
        this.force = false;
        this.sourceLanguage =
          this.pimChannel.activeChannel?.default_language || "";
        this.loadSystemLanguages();
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
          target_languages: this.selectedLanguages,
          source_language: this.sourceLanguage,
          force: this.force,
        };
        if (this.entityIds) {
          payload.entity_ids = this.entityIds;
        }
        const { data } = await POST_TranslateEstimate(
          this.channelIdx,
          this.entityType,
          payload
        );
        this.estimate = data;
        this.step = "confirm";
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("pim.translate_estimate_failed")),
        });
      } finally {
        this.estimating = false;
      }
    },
    async confirmTranslate() {
      this.executing = true;
      try {
        const payload = {
          target_languages: this.selectedLanguages,
          source_language: this.sourceLanguage,
          force: this.force,
        };
        if (this.entityIds) {
          payload.entity_ids = this.entityIds;
        }
        const { data } = await POST_TranslateExecute(
          this.channelIdx,
          this.entityType,
          payload
        );
        const jobCount = data.job_ids?.length || 0;
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("pim.translate_jobs_created", { count: jobCount }),
        });
        this.$emit("translated");
        this.$emit("close");
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("pim.translate_execute_failed")),
        });
      } finally {
        this.executing = false;
      }
    },
    async loadSystemLanguages() {
      try {
        const { data } = await GET_SystemLanguages({ page_size: 200 });
        this.systemLanguages = data.results || [];
      } catch {
        // non-critical — addableLanguageOptions will be empty
      }
    },
    async confirmAddLanguage() {
      if (!this.newLanguageIso2) return;
      this.addingLanguage = true;
      try {
        await POST_AddLanguageToChannel(this.channelIdx, this.newLanguageIso2);
        await this.pimChannel.fetchChannels();
        this.showAddLanguage = false;
        this.newLanguageIso2 = "";
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("pim.translate_language_added"),
        });
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("pim.translate_language_add_failed")),
        });
      } finally {
        this.addingLanguage = false;
      }
    },
    langLabel(iso2) {
      const found = this.systemLanguages.find((l) => l.iso2 === iso2);
      return found ? `${iso2.toUpperCase()} - ${found.name_en}` : iso2.toUpperCase();
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
        <p class="t-basic-500 fs-200 mb-300">{{ itemsLabel }}</p>

        <div class="td-dialog__field mb-300">
          <label class="fs-200 fw-600 t-basic-500 mb-100">{{
            $t("pim.translate_source_language")
          }}</label>
          <Dropdown
            :values="sourceLanguageOptions"
            :selected="sourceLanguage ? [sourceLanguage] : []"
            :placeholder="$t('pim.translate_select_language')"
            @onSelect="(val) => (sourceLanguage = val)"
          />
        </div>

        <div class="td-dialog__field mb-300">
          <div class="td-lang-header mb-100">
            <label class="fs-200 fw-600 t-basic-500">{{
              $t("pim.translate_target_languages")
            }}</label>
            <button
              class="td-add-lang-btn"
              :title="$t('pim.translate_add_language_to_channel')"
              @click="showAddLanguage = !showAddLanguage"
            >
              <i class="icon icon-plus fs-200"></i>
            </button>
          </div>

          <!-- inline add language form -->
          <div v-if="showAddLanguage" class="td-add-lang-box mb-200">
            <Dropdown
              :values="addableLanguageOptions"
              :selected="newLanguageIso2 ? [newLanguageIso2] : []"
              :placeholder="$t('pim.translate_select_new_language')"
              @onSelect="(v) => (newLanguageIso2 = v)"
            />
            <div class="td-add-lang-actions">
              <button class="td-btn td-btn--secondary td-btn--sm" @click="showAddLanguage = false; newLanguageIso2 = ''">
                {{ $t("common.cancel") }}
              </button>
              <button
                class="td-btn td-btn--primary td-btn--sm"
                :disabled="!newLanguageIso2 || addingLanguage"
                @click="confirmAddLanguage"
              >
                {{ addingLanguage ? "..." : $t("pim.translate_add_language") }}
              </button>
            </div>
          </div>

          <Dropdown
            :values="targetLanguageOptions"
            :placeholder="$t('pim.translate_select_language')"
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
            {{ $t("pim.translate_no_languages") }}
          </p>
        </div>

        <div class="td-dialog__field mb-300">
          <label class="td-checkbox fs-300 t-basic-700">
            <input type="checkbox" v-model="force" />
            {{ $t("pim.translate_force_all") }}
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
                ? $t("pim.translate_estimating")
                : $t("pim.translate_estimate")
            }}
          </button>
        </div>
      </div>

      <!-- Step 2: Estimate + Confirm -->
      <div v-if="step === 'confirm' && estimate">
        <table class="td-table mb-300">
          <thead>
            <tr>
              <th class="fs-200 t-basic-500">
                {{ $t("pim.translate_target_languages") }}
              </th>
              <th class="fs-200 t-basic-500">
                {{ $t("pim.translate_items") }}
              </th>
              <th class="fs-200 t-basic-500">
                {{ $t("pim.translate_chars") }}
              </th>
              <th class="fs-200 t-basic-500">
                {{ $t("pim.translate_cost") }}
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
                {{ $t("pim.translate_total_cost") }}
              </td>
              <td class="fs-300 fw-600">
                {{ formatCost(estimate.estimated_cost_usd) }}
              </td>
            </tr>
          </tfoot>
        </table>

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
                ? $t("pim.translate_creating_jobs")
                : $t("pim.translate_confirm")
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

.td-lang-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.td-add-lang-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid var(--c-support-400);
  background: transparent;
  color: var(--c-support-400);
  cursor: pointer;
  padding: 0;
  transition: background 0.15s;

  &:hover {
    background: var(--c-support-100);
  }
}

.td-add-lang-box {
  background: var(--c-basic-200);
  border: 1px solid var(--c-basic-300);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.td-add-lang-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}

.td-btn--sm {
  padding: 4px 10px;
  font-size: var(--fs-200);
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
</style>
