<template>
  <div class="config-list">
    <div class="config-list__toolbar">
      <BasicButton
        :text="$t('promo.pv_new')"
        class="btn-primary"
        @click="openCreate"
      />
    </div>

    <Loader v-show="loading" />

    <DataTable
      v-show="!loading"
      :columns="columns"
      :rows="items"
      row-key="id"
      :empty-text="$t('promo.pv_none')"
      @row-click="openEdit"
    >
      <template #cell-face_value="{ row }">
        <span class="fw-600">{{ row.face_value }}</span>
        <span class="t-basic-400">{{ row.currency }}</span>
      </template>
      <template #cell-tax_type="{ row }">
        <span class="config-badge bg-basic-200 t-basic-600">{{
          taxLabel(row.tax_type)
        }}</span>
      </template>
      <template #cell-is_active="{ row }">
        <StatusBadge
          :label="row.is_active ? $t('promo.active') : $t('promo.inactive')"
          :variant="row.is_active ? 'positive' : 'negative'"
        />
      </template>
    </DataTable>

    <Pagination
      v-if="totalCount > pageSize"
      :pagination="paginationState"
      @onChangePage="onPageChange"
    />

    <SideDrawer :visible="drawerOpen" :title="drawerTitle" @close="closeDrawer">
      <div class="voucher-form">
        <FormField
          :label="$t('promo.pv_product_id')"
          :tooltip="$t('promo.pv_product_id_tip')"
          required
          :error="errors.product_id"
        >
          <NumberInput
            v-if="!isEdit"
            v-model="form.product_id"
            :min="1"
            :max="9999999"
          />
          <span v-else class="t-basic-600">#{{ form.product_id }}</span>
        </FormField>

        <div class="voucher-form__row">
          <FormField
            :label="$t('promo.pv_face_value')"
            :tooltip="$t('promo.pv_face_value_tip')"
            required
            :error="errors.face_value"
          >
            <BasicInput
              v-model="form.face_value"
              type="number"
              placeholder="0.00"
            />
          </FormField>
          <FormField
            :label="$t('promo.pv_currency')"
            required
            :error="errors.currency_iso3"
          >
            <Dropdown
              v-if="!isEdit"
              :values="currencyOptions"
              :selected="form.currency_iso3 ? [form.currency_iso3] : []"
              :placeholder="$t('promo.pv_currency')"
              @onSelect="(v) => (form.currency_iso3 = v)"
            />
            <span v-else class="t-basic-600">{{ form.currency_iso3 }}</span>
          </FormField>
        </div>

        <FormField :label="$t('promo.pv_tax_type')" required>
          <Dropdown
            :values="taxOptions"
            :selected="form.tax_type ? [form.tax_type] : []"
            :placeholder="$t('promo.pv_tax_type')"
            @onSelect="(v) => (form.tax_type = v)"
          />
        </FormField>

        <div class="voucher-form__row">
          <FormField
            :label="$t('promo.pv_validity_days')"
            :tooltip="$t('promo.pv_validity_days_tip')"
          >
            <NumberInput
              v-model="form.validity_period_days_override"
              :min="1"
              :max="3650"
            />
          </FormField>
          <FormField :label="$t('promo.pv_validity_precision')">
            <Dropdown
              :values="precisionOptions"
              :selected="
                form.validity_precision_override
                  ? [form.validity_precision_override]
                  : []
              "
              :placeholder="$t('promo.pv_default')"
              @onSelect="(v) => (form.validity_precision_override = v)"
            />
          </FormField>
        </div>

        <FormField :label="$t('promo.pv_expiry_starts_from')">
          <Dropdown
            :values="expiryStartsOptions"
            :selected="
              form.expiry_starts_from_override
                ? [form.expiry_starts_from_override]
                : []
            "
            :placeholder="$t('promo.pv_default')"
            @onSelect="(v) => (form.expiry_starts_from_override = v)"
          />
        </FormField>

        <FormField
          :label="$t('promo.pv_blacklist')"
          :tooltip="$t('promo.pv_blacklist_tip')"
        >
          <Switcher
            :selected="form.blacklist_other_vouchers"
            @onSelect="
              form.blacklist_other_vouchers = !form.blacklist_other_vouchers
            "
          />
        </FormField>

        <FormField v-if="isEdit" :label="$t('promo.active')">
          <Switcher
            :selected="form.is_active"
            @onSelect="form.is_active = !form.is_active"
          />
        </FormField>

        <!-- Product filters (nested; INCLUSION / EXCLUSION) -->
        <div v-if="isEdit" class="voucher-form__filters">
          <h3 class="fs-300 fw-600 mb-200">{{ $t("promo.pv_filters") }}</h3>
          <p class="fs-200 t-basic-500 mb-300">
            {{ $t("promo.pv_filters_hint") }}
          </p>

          <div
            v-for="f in filters"
            :key="f.id"
            class="filter-row flex ai-ct jc-sb"
          >
            <span class="fs-200">
              <span class="config-badge bg-basic-200 t-basic-600">{{
                modeLabel(f.mode)
              }}</span>
              {{
                $t("promo.pv_filter_summary", {
                  p: f.products.length,
                  c: f.categories.length,
                  a: f.attributes.length,
                })
              }}
              <span v-if="f.take_common_part">
                · {{ $t("promo.pv_filter_common") }}</span
              >
            </span>
            <div class="flex ai-ct gap-100">
              <BasicButton
                :text="$t('promo.btn_edit')"
                class="btn-secondary"
                @click="editFilter(f)"
              />
              <BasicButton
                :text="$t('promo.btn_delete')"
                class="btn-secondary"
                @click="deleteFilter(f.id)"
              />
            </div>
          </div>

          <div class="filter-add">
            <Dropdown
              :values="modeOptions"
              :selected="newFilter.mode ? [newFilter.mode] : []"
              :placeholder="$t('promo.pv_filter_mode')"
              @onSelect="(v) => (newFilter.mode = v)"
            />
            <div
              v-for="kind in entityKinds"
              :key="kind.type"
              class="filter-picker"
            >
              <label class="fs-200 t-basic-500">{{ $t(kind.labelKey) }}</label>
              <EntitySearchPicker
                :model-value="null"
                :fetch-fn="(s) => fetchEntities(kind.type, s)"
                :placeholder="$t('promo.pv_filter_search')"
                @update:model-value="onPickValue"
                @update:display-value="(d) => onPickDisplay(kind.type, d)"
              />
              <div v-if="newFilter[kind.type].length" class="chips">
                <span
                  v-for="item in newFilter[kind.type]"
                  :key="item.pk"
                  class="config-chip"
                >
                  {{ item.label }}
                  <button
                    class="config-chip__x"
                    @click="removeEntity(kind.type, item.pk)"
                  >
                    &times;
                  </button>
                </span>
              </div>
            </div>
            <Switcher
              :label="$t('promo.pv_filter_common')"
              :hint="$t('promo.filter_common_tip')"
              :selected="newFilter.take_common_part"
              @onSelect="
                newFilter.take_common_part = !newFilter.take_common_part
              "
            />
            <div class="flex ai-ct gap-100">
              <BasicButton
                :text="
                  editingFilterId
                    ? $t('promo.btn_save')
                    : $t('promo.pv_filter_add')
                "
                class="btn-primary"
                @click="saveFilter"
              />
              <BasicButton
                v-if="editingFilterId"
                :text="$t('promo.btn_cancel')"
                class="btn-secondary"
                @click="cancelFilterEdit"
              />
            </div>
          </div>
        </div>

        <div class="voucher-form__actions">
          <BasicButton
            v-if="isEdit"
            :text="$t('promo.btn_delete')"
            class="btn-secondary"
            @click="showDelete = true"
          />
          <BasicButton
            :text="$t('promo.btn_save')"
            class="btn-primary"
            :is-disabled="saving"
            @click="save"
          />
        </div>
      </div>
    </SideDrawer>

    <Confirmation-modal
      :visible="showDelete"
      @accept="doDelete"
      @reject="showDelete = false"
    >
      <template #header
        ><h2>{{ $t("promo.pv_delete_title") }}</h2></template
      >
      <template #description
        ><p>{{ $t("promo.pv_delete_msg") }}</p></template
      >
    </Confirmation-modal>
  </div>
</template>

<script>
import { useNotifyStore } from "@/stores/notify";
import { extractApiMessage } from "@/composables/useFormErrors";
import { useCheckoutChannelStore } from "@/stores/checkoutChannel";
import ConfirmationModal from "@/functionals/Confirmation-modal/index.vue";
import { GET_RegionalCurrencies } from "@/api/regional/api";
import { GET_Products, GET_Categories, GET_Attributes } from "@/api/pim/api";
import {
  GET_ProductVouchers,
  POST_ProductVoucher,
  PATCH_ProductVoucher,
  DELETE_ProductVoucher,
  GET_VoucherProductFilters,
  POST_VoucherProductFilter,
  PATCH_VoucherProductFilter,
  DELETE_VoucherProductFilter,
  GET_VoucherMeta,
} from "@/api/voucher/api";
import { enumDescKey } from "./promo-enum-hints";

function emptyForm() {
  return {
    product_id: "",
    face_value: "",
    currency_iso3: "",
    tax_type: "mpv",
    validity_period_days_override: "",
    validity_precision_override: "",
    expiry_starts_from_override: "",
    blacklist_other_vouchers: true,
    is_active: true,
  };
}

function emptyFilter() {
  return {
    mode: "inclusion",
    products: [],
    categories: [],
    attributes: [],
    take_common_part: false,
  };
}

export default {
  name: "ProductVouchersList",
  components: { ConfirmationModal },
  setup() {
    return {
      notify: useNotifyStore(),
      checkoutChannel: useCheckoutChannelStore(),
    };
  },
  data() {
    return {
      items: [],
      totalCount: 0,
      currentPage: 1,
      pageSize: 20,
      loading: false,
      saving: false,
      meta: {
        tax_types: [],
        validity_precisions: [],
        expiry_starts_from: [],
        filter_modes: [],
      },
      currencies: [],
      drawerOpen: false,
      isEdit: false,
      editId: null,
      form: emptyForm(),
      errors: {},
      showDelete: false,
      filters: [],
      newFilter: emptyFilter(),
      editingFilterId: null,
    };
  },
  computed: {
    channel() {
      return (
        this.checkoutChannel.activeChannelIdx ||
        process.env.VUE_APP_CHANNEL ||
        "default-local"
      );
    },
    currencyOptions() {
      return this.currencies.map((c) => ({ label: c, value: c }));
    },
    taxOptions() {
      return this.meta.tax_types.map((t) => this.withDesc("tax_type", t));
    },
    precisionOptions() {
      return this.meta.validity_precisions.map((t) =>
        this.withDesc("validity_precision", t)
      );
    },
    expiryStartsOptions() {
      return this.meta.expiry_starts_from.map((t) =>
        this.withDesc("expiry_starts_from", t)
      );
    },
    modeOptions() {
      return this.meta.filter_modes.map((t) => this.withDesc("filter_mode", t));
    },
    entityKinds() {
      return [
        { type: "products", labelKey: "promo.pv_filter_products" },
        { type: "categories", labelKey: "promo.pv_filter_categories" },
        { type: "attributes", labelKey: "promo.pv_filter_attributes" },
      ];
    },
    columns() {
      return [
        { key: "id", label: this.$t("promo.voucher_col_id"), width: "70px" },
        {
          key: "product_id",
          label: this.$t("promo.pv_product_id"),
          width: "120px",
        },
        {
          key: "face_value",
          label: this.$t("promo.pv_face_value"),
          width: "1fr",
        },
        {
          key: "tax_type",
          label: this.$t("promo.pv_tax_type"),
          width: "120px",
        },
        {
          key: "is_active",
          label: this.$t("promo.col_status"),
          width: "110px",
        },
      ];
    },
    drawerTitle() {
      return this.isEdit ? this.$t("promo.pv_edit") : this.$t("promo.pv_new");
    },
    paginationState() {
      return {
        page: this.currentPage,
        pages: Math.ceil(this.totalCount / this.pageSize),
      };
    },
  },
  watch: {
    "checkoutChannel.activeChannelIdx"() {
      this.fetchMeta();
      this.fetchCurrencies();
      this.fetchItems();
    },
  },
  mounted() {
    this.fetchMeta();
    this.fetchCurrencies();
    this.fetchItems();
  },
  methods: {
    withDesc(kind, t) {
      const k = enumDescKey(kind, t.value);
      return { label: t.label, value: t.value, description: k ? this.$t(k) : "" };
    },
    taxLabel(v) {
      const f = this.meta.tax_types.find((t) => t.value === v);
      return f ? f.label : v;
    },
    modeLabel(v) {
      const f = this.meta.filter_modes.find((t) => t.value === v);
      return f ? f.label : v;
    },
    async fetchMeta() {
      try {
        const { data } = await GET_VoucherMeta(this.channel);
        this.meta = {
          tax_types: data.tax_types || [],
          validity_precisions: data.validity_precisions || [],
          expiry_starts_from: data.expiry_starts_from || [],
          filter_modes: data.filter_modes || [],
        };
      } catch {
        // Non-critical
      }
    },
    async fetchCurrencies() {
      try {
        const { data } = await GET_RegionalCurrencies();
        const rows = data.results || data || [];
        this.currencies = rows
          .map((c) => c.iso3 || c.code || c)
          .filter(Boolean);
      } catch {
        // Non-critical
      }
    },
    async fetchItems() {
      this.loading = true;
      try {
        const { data } = await GET_ProductVouchers(this.channel, {
          page: this.currentPage,
          page_size: this.pageSize,
        });
        this.items = data.results || [];
        this.totalCount = data.count || 0;
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: this.extractError(err),
        });
      } finally {
        this.loading = false;
      }
    },
    openCreate() {
      this.isEdit = false;
      this.editId = null;
      this.form = emptyForm();
      this.errors = {};
      this.filters = [];
      this.newFilter = emptyFilter();
      this.editingFilterId = null;
      this.drawerOpen = true;
    },
    openEdit(row) {
      this.isEdit = true;
      this.editId = row.id;
      this.errors = {};
      this.form = {
        product_id: String(row.product_id),
        face_value: String(row.face_value),
        currency_iso3: row.currency,
        tax_type: row.tax_type,
        validity_period_days_override: row.validity_period_days_override
          ? String(row.validity_period_days_override)
          : "",
        validity_precision_override: row.validity_precision_override || "",
        expiry_starts_from_override: row.expiry_starts_from_override || "",
        blacklist_other_vouchers: row.blacklist_other_vouchers,
        is_active: row.is_active,
      };
      this.newFilter = emptyFilter();
      this.editingFilterId = null;
      this.drawerOpen = true;
      this.fetchFilters(row.id);
    },
    closeDrawer() {
      this.drawerOpen = false;
    },
    buildPayload() {
      const p = {
        face_value: this.form.face_value,
        tax_type: this.form.tax_type,
        validity_period_days_override: this.form.validity_period_days_override
          ? parseInt(this.form.validity_period_days_override)
          : null,
        validity_precision_override:
          this.form.validity_precision_override || null,
        expiry_starts_from_override:
          this.form.expiry_starts_from_override || null,
        blacklist_other_vouchers: this.form.blacklist_other_vouchers,
      };
      if (this.isEdit) {
        p.is_active = this.form.is_active;
      } else {
        p.product_id = parseInt(this.form.product_id);
        p.currency_iso3 = this.form.currency_iso3;
      }
      return p;
    },
    async save() {
      this.saving = true;
      this.errors = {};
      try {
        if (this.isEdit)
          await PATCH_ProductVoucher(
            this.channel,
            this.editId,
            this.buildPayload()
          );
        else await POST_ProductVoucher(this.channel, this.buildPayload());
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("promo.saved"),
        });
        this.drawerOpen = false;
        this.fetchItems();
      } catch (err) {
        this.applyErrors(err);
      } finally {
        this.saving = false;
      }
    },
    async doDelete() {
      this.showDelete = false;
      try {
        await DELETE_ProductVoucher(this.channel, this.editId);
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("promo.deleted"),
        });
        this.drawerOpen = false;
        this.fetchItems();
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: this.extractError(err),
        });
      }
    },
    async fetchFilters(pvId) {
      try {
        const { data } = await GET_VoucherProductFilters(this.channel, pvId);
        this.filters = Array.isArray(data) ? data : data.results || [];
      } catch {
        this.filters = [];
      }
    },
    async fetchEntities(type, search) {
      try {
        if (type === "products") {
          const { data } = await GET_Products(this.channel, {
            search,
            page_size: 20,
          });
          return (data.results || []).map((p) => ({
            value: String(p.pk),
            label: p.name || p.sku,
            secondary: p.sku,
          }));
        }
        if (type === "categories") {
          const { data } = await GET_Categories(this.channel, {
            search,
            page_size: 20,
          });
          return (data.results || []).map((c) => ({
            value: String(c.pk),
            label: c.name || c.idx,
            secondary: c.idx,
          }));
        }
        const { data } = await GET_Attributes({ search, page_size: 20 });
        return (data.results || []).map((a) => ({
          value: String(a.pk),
          label: a.name || a.idx,
          secondary: a.idx,
        }));
      } catch {
        return [];
      }
    },
    onPickValue(pk) {
      this.pendingPk = pk;
    },
    onPickDisplay(type, label) {
      if (this.pendingPk == null) return;
      this.addEntity(type, this.pendingPk, label);
      this.pendingPk = null;
    },
    addEntity(type, pk, label) {
      if (!this.newFilter[type].some((i) => i.pk === pk)) {
        this.newFilter[type].push({ pk, label });
      }
    },
    removeEntity(type, pk) {
      this.newFilter[type] = this.newFilter[type].filter((i) => i.pk !== pk);
    },
    editFilter(f) {
      this.editingFilterId = f.id;
      this.newFilter = {
        mode: f.mode,
        take_common_part: f.take_common_part,
        products: f.products.map((pk) => ({ pk: String(pk), label: "#" + pk })),
        categories: f.categories.map((pk) => ({
          pk: String(pk),
          label: "#" + pk,
        })),
        attributes: f.attributes.map((pk) => ({
          pk: String(pk),
          label: "#" + pk,
        })),
      };
    },
    cancelFilterEdit() {
      this.editingFilterId = null;
      this.newFilter = emptyFilter();
    },
    async saveFilter() {
      const payload = {
        mode: this.newFilter.mode,
        products: this.newFilter.products.map((i) => parseInt(i.pk)),
        categories: this.newFilter.categories.map((i) => parseInt(i.pk)),
        attributes: this.newFilter.attributes.map((i) => parseInt(i.pk)),
        take_common_part: this.newFilter.take_common_part,
      };
      try {
        if (this.editingFilterId) {
          await PATCH_VoucherProductFilter(
            this.channel,
            this.editId,
            this.editingFilterId,
            payload
          );
        } else {
          await POST_VoucherProductFilter(this.channel, this.editId, payload);
        }
        this.cancelFilterEdit();
        this.fetchFilters(this.editId);
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: this.extractError(err),
        });
      }
    },
    async deleteFilter(filterId) {
      try {
        await DELETE_VoucherProductFilter(this.channel, this.editId, filterId);
        this.fetchFilters(this.editId);
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: this.extractError(err),
        });
      }
    },
    onPageChange(page) {
      this.currentPage = page;
      this.fetchItems();
    },
    applyErrors(err) {
      const data = err?.response?.data || err;
      const fieldErrors = {};
      const details = data?.details || data?.data?.details;
      if (Array.isArray(details)) {
        for (const d of details)
          if (d.field)
            fieldErrors[String(d.field).split(".").pop()] = d.message;
      }
      this.errors = fieldErrors;
      this.notify.spawnNotification({
        type: "negative",
        msg: this.extractError(err),
      });
    },
    extractError(err) {
      return extractApiMessage(err, this.$t("notifications.error"));
    },
  },
};
</script>

<style lang="scss" scoped>
.config-list__toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: var(--space-400);
}

.voucher-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-300);
}

.voucher-form__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-300);
}

.voucher-form__filters {
  border-top: 1px solid var(--c-basic-300);
  padding-top: var(--space-300);
}

.voucher-form__actions {
  display: flex;
  justify-content: space-between;
  gap: var(--space-200);
  margin-top: var(--space-400);
}

.filter-row {
  padding: var(--space-200) 0;
  border-bottom: 1px solid var(--c-basic-200);
}

.filter-add {
  display: flex;
  flex-direction: column;
  gap: var(--space-200);
  margin-top: var(--space-300);
}

.filter-picker {
  display: flex;
  flex-direction: column;
  gap: var(--space-50);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-100);
  margin-top: var(--space-100);
}

.config-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: var(--fs-200);
  background: var(--c-basic-200);
  color: var(--c-basic-700);
}

.config-chip__x {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  color: var(--c-basic-500);
  padding: 0;
}

.config-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: var(--fs-200);
  font-weight: 600;
}
</style>
