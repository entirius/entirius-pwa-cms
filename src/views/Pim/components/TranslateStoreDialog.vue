<script>
import { usePimChannelStore } from "@/stores/pimChannel";
import { useNotifyStore } from "@/stores/notify";
import {
  POST_TranslateEstimate,
  POST_TranslateExecute,
  GET_SystemLanguages,
  POST_AddLanguageToChannel,
} from "@/api/pim/translator";
import { extractApiMessage } from "@/composables/useFormErrors";

const ENTITY_TYPES = [
  { key: "product", labelKey: "pim.products" },
  { key: "category", labelKey: "pim.categories" },
  { key: "feature", labelKey: "pim.features" },
  { key: "attribute", labelKey: "pim.attributes_label" },
];

export default {
  name: "TranslateStoreDialog",
  props: {
    visible: { type: Boolean, default: false },
    channelIdx: { type: String, required: true },
  },
  emits: ["close", "translated"],
  setup() {
    const pimChannel = usePimChannelStore();
    const notify = useNotifyStore();
    return { pimChannel, notify };
  },
  data() {
    return {
      sourceLanguage: "",
      selectedLanguages: [],
      enabledTypes: { product: true, category: true, feature: true, attribute: true },
      step: "config",
      estimates: [],
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
    activeTypes() {
      return ENTITY_TYPES.filter((t) => this.enabledTypes[t.key]);
    },
    canEstimate() {
      return this.selectedLanguages.length > 0 && this.activeTypes.length > 0 && this.sourceLanguage;
    },
    totalCost() {
      return this.estimates.reduce(
        (sum, e) => sum + Number(e.estimated_cost_usd || 0),
        0
      );
    },
    totalItems() {
      return this.estimates.reduce(
        (sum, e) => sum + (e.estimated_items || 0),
        0
      );
    },
    totalChars() {
      return this.estimates.reduce(
        (sum, e) => sum + (e.total_chars || 0),
        0
      );
    },
    entityTypes() {
      return ENTITY_TYPES;
    },
    addableLanguageOptions() {
      const assigned = new Set(this.pimChannel.activeChannelLanguages);
      return this.systemLanguages
        .filter((l) => !assigned.has(l.iso2))
        .map((l) => ({ label: `${l.iso2.toUpperCase()} — ${l.name_en}`, value: l.iso2 }));
    },
  },
  watch: {
    visible(val) {
      if (val) {
        this.step = "config";
        this.estimates = [];
        this.selectedLanguages = [];
        this.showAddLanguage = false;
        this.newLanguageIso2 = "";
        this.force = false;
        this.sourceLanguage =
          this.pimChannel.activeChannel?.default_language || "";
        this.enabledTypes = { product: true, category: true, feature: true, attribute: true };
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
    async fetchEstimates() {
      this.estimating = true;
      this.estimates = [];
      try {
        const payload = {
          target_languages: this.selectedLanguages,
          source_language: this.sourceLanguage,
          force: this.force,
        };
        const results = await Promise.all(
          this.activeTypes.map(async (t) => {
            const { data } = await POST_TranslateEstimate(
              this.channelIdx,
              t.key,
              payload
            );
            return { ...data, _labelKey: t.labelKey };
          })
        );
        this.estimates = results;
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
      let totalJobs = 0;
      try {
        const payload = {
          target_languages: this.selectedLanguages,
          source_language: this.sourceLanguage,
          force: this.force,
        };
        for (const est of this.estimates) {
          if (!est.estimated_items) continue;
          const { data } = await POST_TranslateExecute(
            this.channelIdx,
            est.entity_type,
            payload
          );
          totalJobs += data.job_ids?.length || 0;
        }
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("pim.translate_jobs_created", { count: totalJobs }),
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
    langLabel(iso2) {
      const found = this.systemLanguages.find((l) => l.iso2 === iso2);
      return found ? `${iso2.toUpperCase()} - ${found.name_en}` : iso2.toUpperCase();
    },
    async loadSystemLanguages() {
      try {
        const { data } = await GET_SystemLanguages({ page_size: 200 });
        this.systemLanguages = data.results || [];
      } catch {
        // non-critical
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
      <h3 class="td-dialog__title">{{ $t("pim.translate_store") }}</h3>
      <p class="t-muted fs-200 mb-8">
        {{ $t("pim.translate_store_desc") }}
      </p>

      <!-- Step 1: Config -->
      <div v-if="step === 'config'">
        <div class="td-dialog__field mb-8">
          <label class="field-label mb-2">{{
            $t("pim.translate_source_language")
          }}</label>
          <Dropdown
            :values="sourceLanguageOptions"
            :selected="sourceLanguage ? [sourceLanguage] : []"
            :placeholder="$t('pim.translate_select_language')"
            @onSelect="(val) => (sourceLanguage = val)"
          />
        </div>

        <div class="td-dialog__field mb-8">
          <div class="td-lang-header mb-2">
            <label class="field-label">{{
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
          <div v-if="showAddLanguage" class="td-add-lang-box mb-5">
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
          <div v-if="selectedLanguages.length" class="td-chips mt-2">
            <span
              v-for="lang in selectedLanguages"
              :key="lang"
              class="td-chip bg-accent-subtle t-strong fs-200"
              @click="removeLanguage(lang)"
            >
              {{ lang.toUpperCase() }}
              <i class="icon icon-close fs-100"></i>
            </span>
          </div>
        </div>

        <div class="td-dialog__field mb-8">
          <label class="field-label mb-2">{{
            $t("pim.translate_content_types")
          }}</label>
          <div class="td-checkboxes">
            <label
              v-for="t in entityTypes"
              :key="t.key"
              class="td-checkbox fs-300 t-body"
            >
              <input type="checkbox" v-model="enabledTypes[t.key]" />
              {{ $t(t.labelKey) }}
            </label>
          </div>
        </div>

        <div class="td-dialog__field mb-8">
          <label class="td-checkbox fs-300 t-body">
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
            @click="fetchEstimates"
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
      <div v-if="step === 'confirm'">
        <table class="td-table mb-8">
          <thead>
            <tr>
              <th class="fs-200 t-muted">
                {{ $t("pim.translate_entity_type") }}
              </th>
              <th class="fs-200 t-muted">
                {{ $t("pim.translate_items") }}
              </th>
              <th class="fs-200 t-muted">
                {{ $t("pim.translate_chars") }}
              </th>
              <th class="fs-200 t-muted">
                {{ $t("pim.translate_cost") }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="est in estimates" :key="est.entity_type">
              <td class="fs-300 fw-600">{{ $t(est._labelKey) }}</td>
              <td class="fs-300">{{ est.estimated_items }}</td>
              <td class="fs-300">{{ est.total_chars?.toLocaleString() }}</td>
              <td class="fs-300">{{ formatCost(est.estimated_cost_usd) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td class="fs-300 fw-600">
                {{ $t("pim.translate_total_cost") }}
              </td>
              <td class="fs-300 fw-600">{{ totalItems }}</td>
              <td class="fs-300 fw-600">{{ totalChars.toLocaleString() }}</td>
              <td class="fs-300 fw-600">{{ formatCost(totalCost) }}</td>
            </tr>
          </tfoot>
        </table>

        <div class="td-dialog__actions">
          <button
            class="td-btn td-btn--secondary"
            @click="
              step = 'config';
              estimates = [];
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
  background: var(--surface-base);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  min-width: min(520px, 95vw);
  max-width: 620px;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border-subtle);
}

.td-dialog__title {
  margin: 0 0 var(--space-1);
  font-size: var(--fs-500);
  font-weight: 600;
  color: var(--text-body);
}

.td-dialog__field {
  display: flex;
  flex-direction: column;
}

.td-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  margin-top: var(--space-4);
}

.td-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.td-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 2px var(--space-2);
  border-radius: var(--radius-base);
  cursor: pointer;
  font-weight: 600;
  transition: opacity 0.15s;

  &:hover {
    opacity: 0.7;
  }
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
  border-radius: var(--radius-full);
  border: 1px solid var(--accent);
  background: transparent;
  color: var(--text-accent);
  cursor: pointer;
  padding: 0;
  transition: background 0.15s;

  &:hover {
    background: var(--accent-subtle);
  }
}

.td-add-lang-box {
  background: var(--surface-raised);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-base);
  padding: var(--space-2) var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.td-add-lang-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-1);
}

.td-btn--sm {
  padding: var(--space-1) var(--space-2);
  font-size: var(--fs-200);
}

.td-checkboxes {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.td-checkbox {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  cursor: pointer;
}

.td-table {
  width: 100%;
  border-collapse: collapse;

  th,
  td {
    text-align: left;
    padding: var(--space-2) var(--space-3);
    border-bottom: 1px solid var(--border-subtle);
  }

  thead th {
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  tfoot td {
    border-top: 2px solid var(--border-default);
    border-bottom: none;
  }
}

.td-btn {
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-base);
  border: 1px solid var(--border-subtle);
  cursor: pointer;
  font-size: var(--fs-300);
  font-weight: 500;
  transition: background 0.15s, border-color 0.15s;

  &--primary {
    background: var(--accent-fill);
    color: var(--text-on-accent-fill);
    border-color: var(--accent);

    &:hover:not(:disabled) {
      background: var(--accent-fill);
      border-color: var(--accent);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &--secondary {
    background: var(--surface-base);
    color: var(--text-body);

    &:hover {
      background: var(--surface-raised);
    }
  }
}
</style>
