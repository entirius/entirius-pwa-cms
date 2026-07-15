<template>
  <div class="gap-def-edit fs-300 t-basic-800 h-100 ov-h">
    <Teleport to="#pim-toolbar-left" defer>
      <BasicButton
        text=""
        icon="arrow-left"
        class="bg-basic-200 t-basic-600"
        @click="$router.push('/pim/gap-definitions')"
      />
    </Teleport>
    <Teleport to="#pim-toolbar-right" defer>
      <BasicButton
        v-if="!isCreate"
        text=""
        icon="trash-can"
        class="bg-negative-100 t-negative-300"
        data-test="gap-delete-btn"
        @click="showDeleteConfirm = true"
      />
      <BasicButton
        :text="$t('common.save')"
        class="bg-support-400 t-basic-100"
        data-test="gap-save-btn"
        @click="save"
      />
    </Teleport>

    <div class="flex-1 ovy-auto p-500">
      <div class="bg-basic-100 b-basic-300 br-50 p-500">
        <div class="gap-def-identity mb-400">
          <span class="fs-200 t-support-400 fw-600 tt-upper">
            {{ isCreate ? $t("pim.create_gap_definition") : $t("pim.gap_definition_detail") }}
          </span>
        </div>

        <Loader v-if="loading" />

        <template v-else>
          <div class="gap-def-grid">
            <FormField
              :label="$t('pim.gap_key')"
              :tooltip="$t('pim.gap_key_hint')"
              :error="fieldErr('key')"
            >
              <BasicInput v-model="form.key" :isDisabled="!isCreate" />
            </FormField>

            <FormField :label="$t('pim.gap_check')" :error="fieldErr('check_key')">
              <Dropdown
                :values="checkOptions"
                :selected="[form.check_key]"
                :placeholder="$t('common.select')"
                @onSelect="onCheckSelect"
              />
            </FormField>

            <!-- check-specific params -->
            <FormField
              v-if="!rawParamsMode && needsFeature"
              :label="$t('pim.gap_param_feature')"
              :error="fieldErr('params')"
            >
              <Dropdown
                :values="featureOptions"
                :selected="[paramFeatureIdx]"
                :placeholder="$t('pim.gap_param_feature_ph')"
                @onSelect="(v) => (paramFeatureIdx = v)"
              />
            </FormField>

            <FormField
              v-if="!rawParamsMode && needsMinLength"
              :label="$t('pim.gap_param_min_length')"
            >
              <NumberInput v-model="paramMinLength" :min="1" :max="100000" />
            </FormField>

            <FormField
              v-if="!rawParamsMode && needsRole"
              :label="$t('pim.gap_param_role')"
              :tooltip="$t('pim.gap_param_role_hint')"
            >
              <Dropdown
                :values="roleOptions"
                :selected="[paramRole]"
                :placeholder="$t('pim.gap_param_role_any')"
                @onSelect="(v) => (paramRole = v)"
              />
            </FormField>

            <FormField :label="$t('pim.gap_severity')" :error="fieldErr('severity')">
              <Dropdown
                :values="severityOptions"
                :selected="[form.severity]"
                :placeholder="$t('common.select')"
                @onSelect="(v) => (form.severity = v)"
              />
            </FormField>

            <FormField :label="$t('pim.gap_order')">
              <NumberInput v-model="displayOrderStr" :min="0" :max="100000" />
            </FormField>

            <div class="flex ai-ct gap-100">
              <Switcher
                :label="$t('pim.gap_active')"
                :selected="form.active"
                @onSelect="form.active = !form.active"
              />
            </div>
          </div>

          <!-- raw JSON params fallback -->
          <div class="mt-300">
            <Switcher
              :label="$t('pim.gap_raw_params')"
              :selected="rawParamsMode"
              @onSelect="toggleRawParams"
            />
            <div v-if="rawParamsMode" class="mt-200">
              <FormField :label="$t('pim.gap_params_json')" :error="rawParamsError">
                <TextAreaBasic v-model="rawParamsText" :rows="4" />
              </FormField>
            </div>
          </div>

          <!-- label translations -->
          <div class="mt-400">
            <span class="fs-200 t-basic-500 fw-600 tt-upper">{{ $t("pim.gap_label") }}</span>
            <div class="gap-def-t9n mt-200">
              <div v-for="lang in labelLangs" :key="lang" class="gap-def-t9n__row">
                <span class="gap-def-t9n__lang">{{ lang }}</span>
                <BasicInput
                  :model-value="form.label_t9n[lang] || ''"
                  class="flex-1"
                  @update:model-value="(val) => setLabel(lang, val)"
                />
              </div>
            </div>
          </div>

          <!-- scope: languages + channels -->
          <div class="mt-400 flex gap-400" style="flex-wrap: wrap">
            <div>
              <span class="fs-200 t-basic-500 fw-600 tt-upper">
                {{ $t("pim.gap_languages") }}
                <HelpTooltip :text="$t('pim.gap_scope_all_hint')" />
              </span>
              <div class="mb-100"></div>
              <div class="flex gap-100" style="flex-wrap: wrap">
                <FilterChip
                  v-for="lang in availableLangs"
                  :key="lang"
                  :label="lang"
                  :active="form.languages.includes(lang)"
                  @click="toggleLanguage(lang)"
                />
              </div>
            </div>
            <div>
              <span class="fs-200 t-basic-500 fw-600 tt-upper">
                {{ $t("pim.gap_channels") }}
                <HelpTooltip :text="$t('pim.gap_scope_all_hint')" />
              </span>
              <div class="mb-100"></div>
              <ChannelMultiSelect
                v-model="form.channels"
                :channels="pimChannel.channels"
                :label="$t('pim.gap_channels')"
                :all-label="$t('pim.gap_scope_all')"
              />
            </div>
          </div>
        </template>

        <Confirmation-modal
          :visible="showDeleteConfirm"
          @accept="deleteRule"
          @reject="showDeleteConfirm = false"
        >
          <template #description>
            <p>{{ $t("pim.confirm_delete_gap_definition") }}</p>
          </template>
        </Confirmation-modal>
      </div>
    </div>
  </div>
</template>

<script>
import { useLoaderStore } from "@/stores/loader";
import { useNotifyStore } from "@/stores/notify";
import { usePimChannelStore } from "@/stores/pimChannel";
import { useQualityStore } from "@/stores/quality";
import { useFormErrors, extractApiMessage } from "@/composables/useFormErrors";
import {
  GET_GapDefinition,
  POST_GapDefinition,
  PATCH_GapDefinition,
  DELETE_GapDefinition,
  GET_Features,
} from "@/api/pim/api";
import ConfirmationModal from "@/functionals/Confirmation-modal/index.vue";

const FEATURE_CHECKS = ["feature_present", "feature_min_length"];
const PICTURE_ROLES = ["MAIN", "GENERAL", "VARIANT", "ANGLE"];

function normalizedParams(obj) {
  // stable stringify of a flat params object for change detection
  return JSON.stringify(
    Object.keys(obj || {})
      .sort()
      .reduce((acc, k) => ((acc[k] = obj[k]), acc), {})
  );
}

export default {
  name: "GapDefinitionEdit",
  components: { ConfirmationModal },
  setup() {
    const loader = useLoaderStore();
    const notify = useNotifyStore();
    const pimChannel = usePimChannelStore();
    const quality = useQualityStore();
    const formErrors = useFormErrors();
    return { loader, notify, pimChannel, quality, ...formErrors };
  },
  data() {
    return {
      form: {
        key: "",
        check_key: "feature_present",
        severity: "critical",
        label_t9n: {},
        languages: [],
        channels: [],
        active: true,
        display_order: 0,
      },
      paramFeatureIdx: "",
      paramMinLength: "1",
      paramRole: "",
      displayOrderStr: "0",
      rawParamsMode: false,
      rawParamsText: "{}",
      rawParamsError: "",
      featureOptions: [],
      original: null,
      loading: false,
      showDeleteConfirm: false,
    };
  },
  computed: {
    isCreate() {
      return !this.$route.params.key;
    },
    needsFeature() {
      return FEATURE_CHECKS.includes(this.form.check_key);
    },
    needsMinLength() {
      return this.form.check_key === "feature_min_length";
    },
    needsRole() {
      return this.form.check_key === "picture_present";
    },
    checkOptions() {
      return ["feature_present", "feature_min_length", "picture_present"].map((c) => ({
        label: this.checkLabel(c),
        value: c,
      }));
    },
    severityOptions() {
      return [
        { label: this.$t("pim.gap_critical"), value: "critical" },
        { label: this.$t("pim.gap_warning"), value: "warning" },
      ];
    },
    roleOptions() {
      return [
        { label: this.$t("pim.gap_param_role_any"), value: "" },
        ...PICTURE_ROLES.map((r) => ({ label: r, value: r })),
      ];
    },
    availableLangs() {
      const langs = this.pimChannel.allLanguages || [];
      return langs.length ? langs : ["en", "pl"];
    },
    labelLangs() {
      const set = new Set(this.availableLangs);
      Object.keys(this.form.label_t9n || {}).forEach((l) => set.add(l));
      return Array.from(set);
    },
  },
  async mounted() {
    // Soft-compat self-guard: no gaps API → leave quietly (no screen).
    if (this.quality.available === null) await this.quality.probe();
    if (this.quality.available === false) {
      this.$router.replace("/pim/products");
      return;
    }
    this.fetchFeatures();
    if (!this.isCreate) this.fetchRule();
  },
  methods: {
    fieldErr(name) {
      return this.getFieldError(name)?.msg || "";
    },
    checkLabel(checkKey) {
      const key = `pim.gap_check_${checkKey}`;
      const label = this.$t(key);
      return label === key ? checkKey : label;
    },
    onCheckSelect(val) {
      this.form.check_key = val;
    },
    setLabel(lang, val) {
      this.form.label_t9n = { ...this.form.label_t9n, [lang]: val };
    },
    toggleLanguage(lang) {
      const i = this.form.languages.indexOf(lang);
      if (i > -1) this.form.languages.splice(i, 1);
      else this.form.languages.push(lang);
    },
    async fetchFeatures() {
      try {
        const { data } = await GET_Features({ page_size: 500 });
        const results = data.results || data || [];
        this.featureOptions = results.map((f) => ({
          label: f.name || f.idx,
          value: f.idx,
        }));
      } catch {
        this.featureOptions = [];
      }
    },
    async fetchRule() {
      this.loading = true;
      try {
        const { data } = await GET_GapDefinition(this.$route.params.key);
        this.original = data;
        this.form = {
          key: data.key,
          check_key: data.check_key,
          severity: data.severity,
          label_t9n: { ...(data.label_t9n || {}) },
          languages: [...(data.languages || [])],
          channels: [...(data.channels || [])],
          active: data.active,
          display_order: data.display_order,
        };
        this.displayOrderStr = String(data.display_order ?? 0);
        const p = data.params || {};
        this.paramFeatureIdx = p.feature_idx || "";
        this.paramMinLength = p.min_length != null ? String(p.min_length) : "1";
        this.paramRole = p.role || "";
        this.rawParamsText = JSON.stringify(p, null, 2);
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.loading = false;
      }
    },
    toggleRawParams() {
      if (!this.rawParamsMode) {
        // entering raw mode — seed from the structured params
        this.rawParamsText = JSON.stringify(this.buildStructuredParams(), null, 2);
        this.rawParamsMode = true;
      } else {
        // leaving raw mode — try to hydrate the structured fields back
        try {
          const parsed = JSON.parse(this.rawParamsText || "{}");
          this.paramFeatureIdx = parsed.feature_idx || "";
          this.paramMinLength = parsed.min_length != null ? String(parsed.min_length) : "1";
          this.paramRole = parsed.role || "";
          this.rawParamsError = "";
        } catch {
          // keep raw mode if it doesn't parse
          this.rawParamsError = this.$t("pim.gap_params_json_invalid");
          return;
        }
        this.rawParamsMode = false;
      }
    },
    buildStructuredParams() {
      if (this.form.check_key === "feature_present") {
        return { feature_idx: this.paramFeatureIdx };
      }
      if (this.form.check_key === "feature_min_length") {
        return {
          feature_idx: this.paramFeatureIdx,
          min_length: parseInt(this.paramMinLength, 10) || 0,
        };
      }
      if (this.form.check_key === "picture_present") {
        return this.paramRole ? { role: this.paramRole } : {};
      }
      return {};
    },
    buildParams() {
      if (this.rawParamsMode) {
        return JSON.parse(this.rawParamsText || "{}"); // may throw → caught in save
      }
      return this.buildStructuredParams();
    },
    validateLocal(params) {
      this.clearErrors();
      let ok = true;
      if (this.isCreate && !this.form.key.trim()) {
        this.errors.key = { status: "error", msg: this.$t("pim.gap_key_required") };
        ok = false;
      }
      if (this.needsFeature && !params.feature_idx) {
        this.errors.params = { status: "error", msg: this.$t("pim.gap_param_feature_required") };
        ok = false;
      }
      if (this.needsMinLength && !(params.min_length >= 1)) {
        this.errors.params = { status: "error", msg: this.$t("pim.gap_param_min_length_required") };
        ok = false;
      }
      return ok;
    },
    async save() {
      let params;
      try {
        params = this.buildParams();
      } catch {
        this.rawParamsError = this.$t("pim.gap_params_json_invalid");
        return;
      }
      this.rawParamsError = "";
      if (!this.validateLocal(params)) return;

      const payload = {
        check_key: this.form.check_key,
        params,
        severity: this.form.severity,
        label_t9n: this.form.label_t9n,
        languages: this.form.languages.length ? this.form.languages : null,
        channels: this.form.channels.length ? this.form.channels : null,
        active: this.form.active,
        display_order: parseInt(this.displayOrderStr, 10) || 0,
      };

      this.loader.loaderStart();
      try {
        if (this.isCreate) {
          await POST_GapDefinition({ key: this.form.key.trim(), ...payload });
          this.notify.spawnNotification({
            type: "positive",
            msg: this.$t("pim.gap_definition_created"),
          });
        } else {
          await PATCH_GapDefinition(this.form.key, payload);
          this.notifyEditOutcome(payload);
        }
        this.$router.push("/pim/gap-definitions");
      } catch (err) {
        this.handleApiError(err);
        this.notify.spawnNotification({
          type: "negative",
          msg: this.summary || this.$t("notifications.error"),
        });
      } finally {
        this.loader.loaderFinish();
      }
    },
    // Severity-only edits apply on the spot (backend fast-path, no catalogue restale);
    // any condition change marks the catalogue stale → the list banner asks for a recompute.
    notifyEditOutcome(payload) {
      const o = this.original || {};
      const conditionUnchanged =
        o.check_key === payload.check_key &&
        normalizedParams(o.params) === normalizedParams(payload.params) &&
        JSON.stringify(o.languages ?? null) === JSON.stringify(payload.languages) &&
        JSON.stringify(o.channels ?? null) === JSON.stringify(payload.channels) &&
        o.active === payload.active;
      const severityChanged = o.severity !== payload.severity;
      const msg =
        conditionUnchanged && severityChanged
          ? this.$t("pim.gaps_applied_immediately")
          : this.$t("pim.gap_definition_saved");
      this.notify.spawnNotification({ type: "positive", msg });
    },
    async deleteRule() {
      this.showDeleteConfirm = false;
      this.loader.loaderStart();
      try {
        await DELETE_GapDefinition(this.form.key);
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("pim.gap_definition_deleted"),
        });
        this.$router.push("/pim/gap-definitions");
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.loader.loaderFinish();
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.gap-def-identity {
  border-left: 3px solid var(--c-support-400);
  padding-left: var(--space-300);
  padding-top: var(--space-200);
  padding-bottom: var(--space-200);
}
.gap-def-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-300);
  align-items: end;
}
.gap-def-t9n {
  display: flex;
  flex-direction: column;
  gap: var(--space-200);
  max-width: 520px;
}
.gap-def-t9n__row {
  display: flex;
  align-items: center;
  gap: var(--space-200);
}
.gap-def-t9n__lang {
  width: 40px;
  text-transform: uppercase;
  font-weight: 600;
  color: var(--c-support-400);
  font-size: var(--fs-200);
}
.tt-upper {
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
</style>
