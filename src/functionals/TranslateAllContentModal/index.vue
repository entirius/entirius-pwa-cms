<script>
import { useContentDBChannelStore } from "@/stores/contentDBChannel";
import { useLoaderStore } from "@/stores/loader";
import { useNotifyStore } from "@/stores/notify";
import { extractApiMessage } from "@/composables/useFormErrors";
import BasicModal from "@/boots/BasicModal/index.vue";
import {
  POST_ContentTranslateEstimate,
  POST_ContentTranslateExecute,
} from "@/api/contentDB/translator";

export default {
  name: "TranslateAllContentModal",
  components: { BasicModal },
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
    // Step 1: Cancel · Estimate; step 2: Back · Confirm (R5, primary rightmost).
    footerActions() {
      if (this.step === "confirm") {
        return [
          { key: "back", label: this.$t("common.back"), role: "secondary", onClick: this.backToConfig },
          {
            key: "confirm",
            label: this.$t("builder.translate_confirm"),
            role: "primary",
            loading: this.executing,
            onClick: this.confirmTranslate,
          },
        ];
      }
      return [
        { key: "cancel", label: this.$t("common.cancel"), role: "secondary", onClick: () => this.$emit("close") },
        {
          key: "estimate",
          label: this.$t("builder.translate_estimate"),
          role: "primary",
          disabled: !this.canEstimate,
          loading: this.estimating,
          onClick: this.fetchEstimate,
        },
      ];
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
    backToConfig() {
      this.step = "config";
      this.estimate = null;
    },
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
  <BasicModal
    :open="visible"
    :title="dialogTitle"
    size="md"
    :actions="footerActions"
    :persistent="executing"
    @update:open="(open) => !open && !executing && $emit('close')"
  >
    <!-- Step 1: Config -->
    <div v-if="step === 'config'">
      <p class="t-muted fs-200 mb-8">
        {{ $t("builder.translate_all_description") }}
      </p>

      <div class="td-dialog__field mb-8">
        <label class="field-label mb-2">{{
          $t("builder.translate_source_language")
        }}</label>
        <BasicSelect
          :options="sourceLanguageOptions"
          v-model="sourceLanguage"
          :placeholder="$t('builder.translate_select_language')"
        />
      </div>

      <div class="td-dialog__field mb-8">
        <label class="field-label mb-2">{{
          $t("builder.translate_target_languages")
        }}</label>
        <Dropdown
          :values="targetLanguageOptions"
          :placeholder="$t('builder.translate_select_language')"
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
            <FontAwesomeIcon :icon="$icons.close" class="fs-100" />
          </span>
        </div>
        <p
          v-if="!targetLanguageOptions.length"
          class="t-warning fs-200 mt-2"
        >
          {{ $t("builder.translate_no_languages") }}
        </p>
      </div>

      <div class="td-dialog__field mb-5">
        <label class="td-checkbox fs-300 t-body">
          <input type="checkbox" v-model="force" />
          {{ $t("builder.translate_force_all") }}
        </label>
      </div>

      <div class="td-dialog__field mb-8">
        <label class="td-checkbox fs-300 t-body">
          <input type="checkbox" v-model="publish" />
          {{ $t("builder.translate_publish") }}
        </label>
      </div>

    </div>

    <!-- Step 2: Estimate + Confirm -->
    <div v-if="step === 'confirm' && estimate">
      <!-- Per-language breakdown -->
      <table class="td-table mb-8">
        <thead>
          <tr>
            <th class="fs-200 t-muted">
              {{ $t("builder.translate_target_languages") }}
            </th>
            <th class="fs-200 t-muted">
              {{ $t("builder.translate_items") }}
            </th>
            <th class="fs-200 t-muted">
              {{ $t("builder.translate_chars") }}
            </th>
            <th class="fs-200 t-muted">
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
        <h4 class="fs-200 fw-600 t-muted mb-2" style="text-transform: uppercase; letter-spacing: 0.03em;">
          {{ $t("builder.translate_pages_to_translate") }}
        </h4>
        <table class="td-table mb-8">
          <thead>
            <tr>
              <th class="fs-200 t-muted">
                {{ $t("builder.translate_draft_name") }}
              </th>
              <th class="fs-200 t-muted">
                {{ $t("builder.translate_draft_items") }}
              </th>
              <th class="fs-200 t-muted">
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

    </div>
  </BasicModal>
</template>

<style lang="scss" scoped>

.td-dialog__field {
  display: flex;
  flex-direction: column;
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

.td-checkbox {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;

  input[type="checkbox"] {
    cursor: pointer;
  }
}
</style>
