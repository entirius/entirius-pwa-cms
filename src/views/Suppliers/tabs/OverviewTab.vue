<template>
  <div class="overview-tab p-300 ovy-auto h-100">
    <Teleport to="#suppliers-toolbar-right" defer>
      <button
        class="suppliers-toolbar-btn suppliers-toolbar-btn--primary"
        :disabled="saving || !isDirty"
        data-testid="suppliers-overview-save"
        @click="save"
      >
        <FontAwesomeIcon icon="floppy-disk" />
        <span class="ml-100">{{ $t("common.save") }}</span>
      </button>
    </Teleport>

    <div class="overview-grid">
      <FormField
        :label="$t('suppliers.form.idx_label')"
        :tooltip="$t('suppliers.form.idx_tooltip')"
      >
        <BasicInput
          :model-value="form.idx"
          disabled
          data-testid="overview-idx"
        />
      </FormField>
      <FormField
        :label="$t('suppliers.form.name_label')"
        :tooltip="$t('suppliers.form.name_tooltip')"
        required
      >
        <BasicInput v-model="form.name" data-testid="overview-name" />
        <p v-if="errors.name" class="form-error t-negative-300 fs-200">
          {{ errors.name.msg }}
        </p>
      </FormField>
      <FormField
        :label="$t('suppliers.form.role_label')"
        :tooltip="$t('suppliers.form.role_tooltip')"
      >
        <Dropdown
          :values="roleOptions"
          :selected="[form.supplier_role]"
          data-testid="overview-role"
          @onSelect="(val) => (form.supplier_role = val)"
        />
      </FormField>
      <FormField
        :label="$t('suppliers.form.type_label')"
        :tooltip="$t('suppliers.form.type_tooltip')"
      >
        <Dropdown
          :values="typeOptions"
          :selected="[form.supplier_type]"
          data-testid="overview-type"
          @onSelect="(val) => (form.supplier_type = val)"
        />
      </FormField>
      <FormField
        :label="$t('suppliers.form.review_mode_label')"
        :tooltip="$t('suppliers.form.review_mode_tooltip')"
      >
        <Dropdown
          :values="reviewModeOptions"
          :selected="[form.review_mode]"
          data-testid="overview-review-mode"
          @onSelect="(val) => (form.review_mode = val)"
        />
      </FormField>
      <FormField
        :label="$t('suppliers.form.is_active_label')"
        :tooltip="$t('suppliers.form.is_active_tooltip')"
      >
        <Switcher
          :selected="form.is_active"
          data-testid="overview-is-active"
          @onSelect="form.is_active = !form.is_active"
        />
      </FormField>
      <FormField
        :label="$t('suppliers.form.default_language_label')"
        :tooltip="$t('suppliers.form.default_language_tooltip')"
      >
        <Dropdown
          :values="regionalStore.languageOptions"
          :selected="form.default_language_id ? [form.default_language_id] : []"
          :placeholder="$t('suppliers.form.select_language')"
          data-testid="overview-language"
          @onSelect="(val) => (form.default_language_id = val)"
        />
      </FormField>
      <FormField
        :label="$t('suppliers.form.default_currency_label')"
        :tooltip="$t('suppliers.form.default_currency_tooltip')"
      >
        <Dropdown
          :values="regionalStore.currencyOptions"
          :selected="form.default_currency_id ? [form.default_currency_id] : []"
          :placeholder="$t('suppliers.form.select_currency')"
          data-testid="overview-currency"
          @onSelect="(val) => (form.default_currency_id = val)"
        />
      </FormField>
      <FormField
        :label="$t('suppliers.form.country_label')"
        :tooltip="$t('suppliers.form.country_tooltip')"
      >
        <Dropdown
          :values="regionalStore.countryOptions"
          :selected="form.country_id ? [form.country_id] : []"
          :placeholder="$t('suppliers.form.select_country')"
          data-testid="overview-country"
          @onSelect="(val) => (form.country_id = val)"
        />
      </FormField>
      <FormField
        v-if="!isMonitoringSupplier"
        :label="$t('suppliers.form.sku_prefix_label')"
        :tooltip="$t('suppliers.form.sku_prefix_tooltip')"
      >
        <BasicInput
          v-model="form.sku_prefix"
          data-testid="overview-sku-prefix"
        />
      </FormField>
      <FormField
        v-if="!isMonitoringSupplier"
        :label="$t('suppliers.form.warehouse_label')"
        :tooltip="$t('suppliers.form.warehouse_tooltip')"
      >
        <BasicInput
          v-model="form.target_warehouse_code"
          placeholder="WH-MAIN"
          data-testid="overview-warehouse"
        />
      </FormField>
      <FormField
        v-if="!isMonitoringSupplier"
        :label="$t('suppliers.form.feature_set_label')"
        :tooltip="$t('suppliers.form.feature_set_tooltip')"
      >
        <BasicInput
          v-model="form.default_feature_set_idx"
          data-testid="overview-feature-set"
        />
      </FormField>
      <FormField
        v-if="!isMonitoringSupplier"
        :label="$t('suppliers.form.qty_subtract_label')"
        :tooltip="$t('suppliers.form.qty_subtract_tooltip')"
      >
        <NumberInput
          v-model="form.qty_subtract"
          :min="0"
          :max="9999"
          data-testid="overview-qty-subtract"
        />
      </FormField>
      <FormField
        v-if="!isMonitoringSupplier"
        :label="$t('suppliers.form.qty_minimum_label')"
        :tooltip="$t('suppliers.form.qty_minimum_tooltip')"
      >
        <NumberInput
          v-model="form.qty_minimum"
          :min="0"
          :max="9999"
          data-testid="overview-qty-minimum"
        />
      </FormField>
      <FormField
        v-if="!isMonitoringSupplier"
        :label="$t('suppliers.form.lead_time_label')"
        :tooltip="$t('suppliers.form.lead_time_tooltip')"
      >
        <NumberInput
          v-model="form.lead_time_days"
          :min="0"
          :max="365"
          data-testid="overview-lead-time"
        />
      </FormField>
      <FormField
        :label="$t('suppliers.form.contact_email_label')"
        :tooltip="$t('suppliers.form.contact_email_tooltip')"
      >
        <BasicInput
          v-model="form.contact_email"
          placeholder="ops@example.com"
          data-testid="overview-contact-email"
        />
      </FormField>
      <FormField
        :label="$t('suppliers.form.contact_phone_label')"
        :tooltip="$t('suppliers.form.contact_phone_tooltip')"
      >
        <BasicInput
          v-model="form.contact_phone"
          data-testid="overview-contact-phone"
        />
      </FormField>
      <FormField
        :label="$t('suppliers.form.contact_person_label')"
        :tooltip="$t('suppliers.form.contact_person_tooltip')"
      >
        <BasicInput
          v-model="form.contact_person"
          data-testid="overview-contact-person"
        />
      </FormField>
      <FormField
        :label="$t('suppliers.form.company_name_label')"
        :tooltip="$t('suppliers.form.company_name_tooltip')"
        class="overview-grid__wide"
      >
        <BasicInput
          v-model="form.company_name"
          data-testid="overview-company"
        />
      </FormField>
      <FormField
        :label="$t('suppliers.form.notes_label')"
        :tooltip="$t('suppliers.form.notes_tooltip')"
        class="overview-grid__wide"
      >
        <BasicInput v-model="form.notes" data-testid="overview-notes" />
      </FormField>
      <!-- etap-10 (Dziura #31) — preferred-only physical writes opt-in escape hatch. -->
      <FormField
        v-if="!isMonitoringSupplier"
        :label="
          $t('suppliers.form.allow_physical_writes_from_non_preferred_label')
        "
        :tooltip="
          $t('suppliers.form.allow_physical_writes_from_non_preferred_tooltip')
        "
        class="overview-grid__wide"
      >
        <Switcher
          :selected="form.allow_physical_writes_from_non_preferred"
          data-testid="overview-allow-physical-writes-non-preferred"
          @onSelect="
            form.allow_physical_writes_from_non_preferred =
              !form.allow_physical_writes_from_non_preferred
          "
        />
      </FormField>
      <!-- etap-13b — auto-preferred selection per-supplier knobs. Grouped at the end
           so they sit visually under "advanced" supplier config and don't interrupt
           the everyday metadata flow. -->
      <FormField
        v-if="!isMonitoringSupplier"
        :label="$t('suppliers.form.preferred_strategy_label')"
        :tooltip="$t('suppliers.form.preferred_strategy_tooltip')"
      >
        <Dropdown
          v-model="form.preferred_strategy"
          :options="preferredStrategyOptions"
          data-testid="overview-preferred-strategy"
        />
      </FormField>
      <FormField
        v-if="!isMonitoringSupplier"
        :label="$t('suppliers.form.preferred_switch_cooldown_hours_label')"
        :tooltip="$t('suppliers.form.preferred_switch_cooldown_hours_tooltip')"
      >
        <NumberInput
          v-model="form.preferred_switch_cooldown_hours"
          :min="0"
          :max="720"
          data-testid="overview-cooldown-hours"
        />
      </FormField>
      <FormField
        v-if="!isMonitoringSupplier"
        :label="$t('suppliers.form.preferred_switch_hysteresis_pct_label')"
        :tooltip="$t('suppliers.form.preferred_switch_hysteresis_pct_tooltip')"
      >
        <NumberInput
          v-model="form.preferred_switch_hysteresis_pct"
          :min="0"
          :max="100"
          data-testid="overview-hysteresis-pct"
        />
      </FormField>
      <FormField
        v-if="!isMonitoringSupplier"
        :label="$t('suppliers.form.eval_frequency_label')"
        :tooltip="$t('suppliers.form.eval_frequency_tooltip')"
      >
        <Dropdown
          v-model="form.eval_frequency"
          :options="evalFrequencyOptions"
          data-testid="overview-eval-frequency"
        />
      </FormField>
    </div>
  </div>
</template>

<script>
import { useNotifyStore } from "@/stores/notify";
import { useRegionalStore } from "@/stores/regional";
import { useFormErrors, extractApiMessage } from "@/composables/useFormErrors";
import { PATCH_Supplier } from "@/api/suppliers/api";

const FIELDS = [
  "name",
  "supplier_role",
  "supplier_type",
  "review_mode",
  "is_active",
  "default_language_id",
  "default_currency_id",
  "country_id",
  "sku_prefix",
  "target_warehouse_code",
  "default_feature_set_idx",
  "qty_subtract",
  "qty_minimum",
  "lead_time_days",
  "contact_email",
  "contact_phone",
  "contact_person",
  "company_name",
  "notes",
  // etap-10 (Dziura #31) — preferred-only physical writes opt-in.
  "allow_physical_writes_from_non_preferred",
  // etap-13b auto-preferred config
  "preferred_strategy",
  "preferred_switch_cooldown_hours",
  "preferred_switch_hysteresis_pct",
  "eval_frequency",
];

export default {
  name: "OverviewTab",
  props: {
    supplier: { type: Object, default: null },
  },
  emits: ["updated"],
  setup() {
    const { errors, handleApiError, clearErrors } = useFormErrors();
    const regionalStore = useRegionalStore();
    regionalStore.fetchAll();
    return {
      notify: useNotifyStore(),
      regionalStore,
      errors,
      handleApiError,
      clearErrors,
    };
  },
  data() {
    return {
      form: this.buildForm(this.supplier),
      original: this.buildForm(this.supplier),
      saving: false,
    };
  },
  computed: {
    isMonitoringSupplier() {
      return this.supplier?.supplier_role === "monitoring";
    },
    isDirty() {
      return FIELDS.some((k) => this.form[k] !== this.original[k]);
    },
    roleOptions() {
      return [
        { value: "trade", label: this.$t("suppliers.role.trade") },
        { value: "data", label: this.$t("suppliers.role.data") },
        { value: "monitoring", label: this.$t("suppliers.role.monitoring") },
      ];
    },
    typeOptions() {
      return [
        { value: "feed", label: this.$t("suppliers.type.feed") },
        { value: "manual", label: this.$t("suppliers.type.manual") },
        { value: "dropship", label: this.$t("suppliers.type.dropship") },
      ];
    },
    reviewModeOptions() {
      return [
        { value: "manual", label: this.$t("suppliers.review_mode.manual") },
        { value: "auto", label: this.$t("suppliers.review_mode.auto") },
      ];
    },
    preferredStrategyOptions() {
      return [
        {
          value: "lowest_cost_with_stock",
          label: this.$t("suppliers.preferred_strategy.lowest_cost_with_stock"),
        },
        {
          value: "highest_stock",
          label: this.$t("suppliers.preferred_strategy.highest_stock"),
        },
        {
          value: "manual_only",
          label: this.$t("suppliers.preferred_strategy.manual_only"),
        },
      ];
    },
    evalFrequencyOptions() {
      return [
        { value: "daily", label: this.$t("suppliers.eval_frequency.daily") },
        { value: "hourly", label: this.$t("suppliers.eval_frequency.hourly") },
        { value: "manual", label: this.$t("suppliers.eval_frequency.manual") },
      ];
    },
  },
  watch: {
    supplier: {
      handler(newVal) {
        this.form = this.buildForm(newVal);
        this.original = this.buildForm(newVal);
      },
      deep: false,
    },
  },
  methods: {
    buildForm(supplier) {
      const out = { idx: supplier?.idx || "" };
      for (const k of FIELDS) {
        out[k] = supplier?.[k] ?? this.fieldDefault(k);
      }
      return out;
    },
    fieldDefault(field) {
      if (["qty_subtract", "qty_minimum", "lead_time_days"].includes(field))
        return 0;
      if (field === "is_active") return true;
      if (field === "supplier_role") return "trade";
      if (field === "supplier_type") return "feed";
      if (field === "review_mode") return "manual";
      if (field === "preferred_strategy") return "lowest_cost_with_stock";
      if (field === "preferred_switch_cooldown_hours") return 24;
      if (field === "preferred_switch_hysteresis_pct") return 2;
      if (field === "eval_frequency") return "daily";
      if (field === "allow_physical_writes_from_non_preferred") return false;
      if (
        ["default_language_id", "default_currency_id", "country_id"].includes(
          field
        )
      )
        return null;
      return "";
    },
    async save() {
      if (!this.supplier) return;
      this.saving = true;
      this.clearErrors();
      try {
        const payload = {};
        for (const k of FIELDS) {
          if (this.form[k] !== this.original[k]) payload[k] = this.form[k];
        }
        if (Object.keys(payload).length === 0) {
          this.saving = false;
          return;
        }
        const { data } = await PATCH_Supplier(this.supplier.idx, payload);
        this.original = this.buildForm(data);
        this.form = this.buildForm(data);
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("suppliers.toast.updated", {
            name: data.name || data.idx,
          }),
        });
        this.$emit("updated", data);
      } catch (err) {
        this.handleApiError(err);
        if (Object.keys(this.errors).length === 0) {
          this.notify.spawnNotification({
            type: "negative",
            msg: extractApiMessage(err, this.$t("notifications.error")),
          });
        }
      } finally {
        this.saving = false;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.overview-tab {
  display: flex;
  flex-direction: column;
}
.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--space-300);
}
.overview-grid__wide {
  grid-column: 1 / -1;
}
.form-error {
  margin: 0;
  margin-top: 2px;
}
.suppliers-toolbar-btn {
  display: inline-flex;
  align-items: center;
  background: transparent;
  border: 1px solid var(--c-basic-300);
  color: var(--c-basic-700);
  border-radius: var(--radius-sm);
  padding: 4px 10px;
  cursor: pointer;
  transition: background 0.15s ease;
}
.suppliers-toolbar-btn:hover:not(:disabled) {
  background: var(--c-basic-200);
}
.suppliers-toolbar-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.suppliers-toolbar-btn--primary {
  background: var(--c-support-400);
  border-color: var(--c-support-400);
  color: var(--c-basic-100);
}
.suppliers-toolbar-btn--primary:hover:not(:disabled) {
  filter: brightness(1.05);
  background: var(--c-support-400);
}
</style>
