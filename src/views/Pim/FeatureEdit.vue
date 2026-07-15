<template>
  <div class="p-500 fs-300 t-basic-800 h-100 ov-h">
    <Teleport to="#pim-toolbar-left" defer>
      <BasicButton
        text=""
        icon="arrow-left"
        class="bg-basic-200 t-basic-600"
        @click="$router.push('/pim/features')"
      />
    </Teleport>
    <Teleport to="#pim-toolbar-right" defer>
      <span v-if="isDirty" class="chip bg-warning-100 t-warning-300">
        {{ $t("unsaved.changes") }}
      </span>
      <BasicButton
        v-if="!isCreate && !isSystem"
        text=""
        icon="trash-can"
        class="bg-negative-100 t-negative-300"
        @click="showDeleteConfirm = true"
      />
      <BasicButton
        :text="$t('common.save')"
        class="bg-support-400 t-basic-100"
        @click="save"
      />
    </Teleport>
    <div class="bg-basic-100 b-basic-300 br-50 h-100 ovy-auto p-500">
      <!-- Breadcrumb -->
      <PimBreadcrumb :items="breadcrumbItems" />
      <Loader v-if="loading" />

      <template v-else>
        <!-- System feature notice -->
        <div
          v-if="isSystem && !isCreate"
          class="flex ai-ct gap-200 mb-300 p-300 bg-support-100 br-50 t-support-400 fs-200"
        >
          <i class="icon icon-lock" />
          <span>{{ $t("pim.system_feature_notice") }}</span>
        </div>

        <!-- Section 1: General Information -->
        <PimCard :title="$t('pim.general_info')" class="mb-400">
          <div class="grid grid-col-2 gap-300 mb-300">
            <FormField
              :label="$t('pim.feature_code')"
              :description="$t('pim.attribute_code_help')"
            >
              <BasicInput
                v-if="isCreate"
                v-model="form.idx"
                :placeholder="$t('pim.feature_code')"
              />
              <LockedField v-else :model-value="form.idx" />
            </FormField>
            <FormField
              :label="$t('pim.feature_type')"
              :description="$t('pim.feature_type_help')"
            >
              <Dropdown
                :values="typeOptions"
                :selected="[form.feature_type]"
                :placeholder="$t('pim.feature_type')"
                :isDisabled="isSystem"
                @onSelect="onTypeSelect"
              />
            </FormField>
          </div>
          <div class="grid grid-col-3 gap-300 mb-300">
            <FormField
              :label="$t('pim.scope')"
              :description="$t('pim.scope_help')"
            >
              <LockedField :model-value="selectedScopeLabel" />
            </FormField>
            <FormField :label="$t('pim.frontend_input_type')">
              <Dropdown
                :values="frontendInputOptions"
                :selected="[form.frontend_input_type]"
                :placeholder="$t('pim.frontend_input_type')"
                @onSelect="(val) => (form.frontend_input_type = val)"
              />
            </FormField>
            <FormField :label="$t('pim.filter_type')">
              <Dropdown
                :values="filterTypeOptions"
                :selected="[form.filter_type]"
                :placeholder="$t('pim.filter_type')"
                @onSelect="(val) => (form.filter_type = val)"
              />
            </FormField>
          </div>
          <div class="grid grid-col-3 gap-300">
            <FormField :label="$t('pim.display_order')">
              <BasicInput v-model="form.display_order" type="number" />
            </FormField>
          </div>
          <FormField
            v-if="hasDesc"
            :label="$t('pim.internal_desc_label')"
            :tooltip="$t('pim.internal_desc_tooltip')"
            class="mt-300"
          >
            <TextAreaBasic v-model="form.desc" />
          </FormField>
        </PimCard>

        <!-- Section 2: Labels (name_t9n) -->
        <PimCard
          :title="$t('pim.labels')"
          :subtitle="$t('pim.base_language')"
          class="mb-400"
        >
          <div class="grid grid-col-2 gap-300">
            <div v-for="(lang, index) in languages" :key="lang">
              <span
                class="chip chip--sm bg-support-200 t-support-400"
              >
                {{ lang.toUpperCase() }}
              </span>
              <BasicInput
                :model-value="form.name_t9n[lang] || ''"
                :placeholder="`${$t('pim.name')} (${lang})`"
                class="mt-100"
                @update:modelValue="(val) => (form.name_t9n[lang] = val)"
              />
            </div>
          </div>
        </PimCard>

        <!-- Section 3: Flags & Options -->
        <PimCard :title="$t('pim.flags_and_options')">
          <div class="grid grid-col-3 gap-300 mb-400">
            <Switcher
              :label="$t('pim.is_required')"
              :selected="form.is_required"
              :prevent="isSystem"
              @onSelect="form.is_required = !form.is_required"
            />
            <Switcher
              :label="$t('pim.is_visible')"
              :selected="form.is_visible"
              @onSelect="form.is_visible = !form.is_visible"
            />
            <Switcher
              :label="$t('pim.is_filterable')"
              :selected="form.is_filterable"
              @onSelect="form.is_filterable = !form.is_filterable"
            />
            <Switcher
              :label="$t('pim.is_searchable')"
              :selected="form.is_searchable"
              @onSelect="form.is_searchable = !form.is_searchable"
            />
            <Switcher
              :label="$t('pim.is_comparable')"
              :selected="form.is_comparable"
              @onSelect="form.is_comparable = !form.is_comparable"
            />
            <Switcher
              :label="$t('pim.is_for_customization')"
              :selected="form.is_for_customization"
              @onSelect="form.is_for_customization = !form.is_for_customization"
            />
            <Switcher
              :label="$t('pim.exclude_from_inheritance')"
              :selected="form.exclude_from_inheritance"
              @onSelect="
                form.exclude_from_inheritance = !form.exclude_from_inheritance
              "
            />
            <Switcher
              :label="$t('pim.has_visual_asset')"
              :selected="form.has_visual_asset"
              @onSelect="form.has_visual_asset = !form.has_visual_asset"
            />
            <Switcher
              :label="$t('pim.is_seo')"
              :selected="form.is_seo"
              @onSelect="form.is_seo = !form.is_seo"
            />
          </div>

          <!-- Options Manager (only for Select/Multi-select) -->
          <div v-if="isSelectType" class="mt-300">
            <OptionsManager :feature-idx="form.idx" :languages="languages" />
          </div>
        </PimCard>
      </template>

      <!-- Delete confirmation -->
      <Confirmation-modal
        :visible="showDeleteConfirm"
        @accept="deleteFeature"
        @reject="showDeleteConfirm = false"
      >
        <template #description>
          <p>{{ $t("pim.confirm_delete_feature") }}</p>
        </template>
      </Confirmation-modal>

      <!-- Unsaved changes modal -->
      <UnsavedChangesModal
        :visible="!!pendingNav"
        @save="saveAndLeave"
        @discard="confirmLeave"
        @stay="cancelLeave"
      />
    </div>
  </div>
</template>

<script>
import { inject, onMounted, onBeforeUnmount, nextTick } from "vue";
import { useLoaderStore } from "@/stores/loader";
import { useNotifyStore } from "@/stores/notify";
import { useUnsavedChanges } from "@/composables/useUnsavedChanges";
import { usePimChannelStore } from "@/stores/pimChannel";
import {
  GET_Feature,
  POST_Feature,
  PATCH_Feature,
  DELETE_Feature,
} from "@/api/pim/api";
import {
  FEATURE_TYPES,
  FEATURE_SCOPES,
  FRONTEND_INPUT_TYPES,
  FILTER_TYPES,
  isSelectType as checkSelectType,
} from "./helpers/pimEnums";
import OptionsManager from "./components/OptionsManager.vue";
import PimBreadcrumb from "./components/PimBreadcrumb.vue";
import PimCard from "./components/PimCard.vue";
import ConfirmationModal from "@/functionals/Confirmation-modal/index.vue";
import UnsavedChangesModal from "@/functionals/Unsaved-changes-modal/index.vue";
import { extractApiMessage } from "@/composables/useFormErrors";

export default {
  name: "FeatureEdit",
  components: {
    OptionsManager,
    PimBreadcrumb,
    PimCard,
    ConfirmationModal,
    UnsavedChangesModal,
  },
  setup() {
    const loader = useLoaderStore();
    const notify = useNotifyStore();
    const unsaved = useUnsavedChanges();
    const pimChannel = usePimChannelStore();
    const isGlobalScope = inject("isGlobalScope", null);
    onMounted(() => {
      nextTick(() => {
        if (isGlobalScope) isGlobalScope.value = true;
      });
    });
    onBeforeUnmount(() => {
      if (isGlobalScope) isGlobalScope.value = false;
    });
    return { loader, notify, pimChannel, ...unsaved };
  },
  data() {
    return {
      form: {
        idx: "",
        feature_type: 3,
        scope: 3,
        frontend_input_type: 0,
        filter_type: 0,
        display_order: 0,
        name_t9n: {},
        is_required: false,
        is_visible: true,
        is_filterable: false,
        is_searchable: false,
        is_comparable: false,
        is_for_customization: false,
        exclude_from_inheritance: false,
        has_visual_asset: false,
        is_seo: false,
        desc: "",
      },
      originalData: null,
      loading: false,
      showDeleteConfirm: false,
      // Soft-compat: old backend omits `desc` → field hidden. Create mode: shown
      // (old backend ignores the extra POST field — schemas don't forbid extras).
      hasDesc: true,
    };
  },
  computed: {
    languages() {
      return this.pimChannel.allLanguages.length > 0
        ? this.pimChannel.allLanguages
        : ["en"];
    },
    isCreate() {
      return this.$route.params.idx === "create";
    },
    isSystem() {
      return this.form.scope === 1;
    },
    featureName() {
      return this.form.name_t9n?.en || this.form.name_t9n?.pl || this.form.idx;
    },
    isSelectType() {
      return checkSelectType(this.form.feature_type);
    },
    typeOptions() {
      return FEATURE_TYPES.map((ft) => ({
        label: this.$t(ft.labelKey),
        value: ft.value,
      }));
    },
    frontendInputOptions() {
      return FRONTEND_INPUT_TYPES.map((ft) => ({
        label: ft.label,
        value: ft.value,
      }));
    },
    filterTypeOptions() {
      return FILTER_TYPES.map((ft) => ({ label: ft.label, value: ft.value }));
    },
    selectedTypeLabel() {
      const ft = FEATURE_TYPES.find((t) => t.value === this.form.feature_type);
      return ft ? this.$t(ft.labelKey) : "";
    },
    selectedScopeLabel() {
      const s = FEATURE_SCOPES.find((sc) => sc.value === this.form.scope);
      return s ? this.$t(s.labelKey) : "";
    },
    selectedFrontendInputLabel() {
      const ft = FRONTEND_INPUT_TYPES.find(
        (t) => t.value === this.form.frontend_input_type
      );
      return ft ? ft.label : "";
    },
    selectedFilterTypeLabel() {
      const ft = FILTER_TYPES.find((t) => t.value === this.form.filter_type);
      return ft ? ft.label : "";
    },
    breadcrumbItems() {
      const items = [
        { label: this.$t("pim.settings"), route: "/pim/feature-sets" },
        { label: this.$t("pim.features"), route: "/pim/features" },
      ];
      if (this.isCreate) {
        items.push({ label: this.$t("pim.create_feature") });
      } else {
        items.push({
          label: this.$t("pim.edit_attribute", { name: this.featureName }),
        });
      }
      return items;
    },
  },
  beforeRouteLeave(to, from, next) {
    this.guardNavigation(to, from, next);
  },
  mounted() {
    if (!this.isCreate) {
      this.fetchFeature();
    } else {
      this.snapshot(this.form);
      this.track(this.form);
    }
  },
  methods: {
    async saveAndLeave() {
      await this.save();
      this.confirmLeave();
    },
    onTypeSelect(val) {
      this.form.feature_type = val;
    },
    populateForm(data) {
      return {
        idx: data.idx || "",
        feature_type: data.feature_type ?? 3,
        scope: data.scope ?? 3,
        frontend_input_type: data.frontend_input_type ?? 0,
        filter_type: data.filter_type ?? 0,
        display_order: data.display_order ?? 0,
        name_t9n: data.name_t9n || {},
        is_required: data.is_required || false,
        is_visible: data.is_visible ?? true,
        is_filterable: data.is_filterable || false,
        is_searchable: data.is_searchable || false,
        is_comparable: data.is_comparable || false,
        is_for_customization: data.is_for_customization || false,
        exclude_from_inheritance: data.exclude_from_inheritance || false,
        has_visual_asset: data.has_visual_asset || false,
        is_seo: data.is_seo || false,
        desc: data.desc || "",
      };
    },
    async fetchFeature() {
      this.loading = true;
      try {
        const { data } = await GET_Feature(this.$route.params.idx);
        this.hasDesc = "desc" in data;
        this.form = this.populateForm(data);
        this.originalData = this.populateForm(data);
        this.snapshot(this.form);
        this.track(this.form);
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.loading = false;
      }
    },
    extractErrorMessage(err) {
      const errData = err?.response?.data || err;
      let msg = this.$t("notifications.save_error");
      if (errData?.message) {
        msg = errData.message;
        if (errData.details?.length) {
          const fieldErrors = errData.details
            .map((d) =>
              d.field ? `${d.field}: ${d.description}` : d.description
            )
            .join(", ");
          msg += ` (${fieldErrors})`;
        }
      } else if (errData?.detail) {
        msg = errData.detail;
      }
      return msg;
    },
    buildSelectivePayload() {
      const payload = {};
      const orig = this.originalData;
      const changedFields = [];

      const scalarFields = [
        "feature_type",
        "frontend_input_type",
        "filter_type",
      ];
      for (const field of scalarFields) {
        if (this.form[field] !== orig[field]) {
          payload[field] = this.form[field];
          changedFields.push(field);
        }
      }

      const boolFields = [
        "is_required",
        "is_visible",
        "is_filterable",
        "is_searchable",
        "is_comparable",
        "is_for_customization",
        "exclude_from_inheritance",
        "has_visual_asset",
        "is_seo",
      ];
      for (const field of boolFields) {
        if (this.form[field] !== orig[field]) {
          payload[field] = this.form[field];
          changedFields.push(field);
        }
      }

      const order = Number(this.form.display_order) || 0;
      if (order !== (orig.display_order || 0)) {
        payload.display_order = order;
        changedFields.push("display_order");
      }

      if (this.hasDesc && (this.form.desc || "") !== (orig.desc || "")) {
        payload.desc = this.form.desc;
        changedFields.push("desc");
      }

      const origT9n = orig.name_t9n || {};
      const formT9n = this.form.name_t9n || {};
      const allLangs = new Set([
        ...Object.keys(formT9n),
        ...Object.keys(origT9n),
      ]);
      for (const lang of allLangs) {
        if ((formT9n[lang] || "") !== (origT9n[lang] || "")) {
          payload.name_t9n = formT9n;
          changedFields.push(this.$t("pim.labels"));
          break;
        }
      }

      return { payload, changedFields };
    },
    async save() {
      this.loader.loaderStart();
      try {
        if (this.isCreate) {
          if (!this.form.idx) {
            this.notify.spawnNotification({
              type: "negative",
              msg: this.$t("pim.idx_and_name_required"),
            });
            this.loader.loaderFinish();
            return;
          }
          await POST_Feature(this.form);
          this.snapshot(this.form);
          this.notify.spawnNotification({
            type: "positive",
            msg: this.$t("pim.feature_created"),
          });
          this.$router.replace(`/pim/features/${this.form.idx}`);
        } else {
          const { payload, changedFields } = this.buildSelectivePayload();
          if (Object.keys(payload).length === 0) {
            this.notify.spawnNotification({
              type: "informative",
              msg: this.$t("pim.no_changes_detected"),
            });
            this.loader.loaderFinish();
            return;
          }
          await PATCH_Feature(this.form.idx, payload);
          await this.fetchFeature();
          this.notify.spawnNotification({
            type: "positive",
            msg: `${this.$t("pim.feature_saved")}: ${changedFields.join(", ")}`,
          });
        }
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: this.extractErrorMessage(err),
        });
      } finally {
        this.loader.loaderFinish();
      }
    },
    async deleteFeature() {
      this.showDeleteConfirm = false;
      this.loader.loaderStart();
      try {
        await DELETE_Feature(this.form.idx);
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("pim.feature_deleted"),
        });
        this.$router.push("/pim/features");
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
