<template>
  <div class="p-500 fs-300 t-basic-800 h-100 ov-h">
    <div
      class="bg-basic-100 b-basic-300 br-50 h-100 ovy-auto pl-500 pt-500 pb-500 pr-500"
    >
      <div class="flex ai-ct jc-sb mb-400 gap-300">
        <h1 class="fs-700 fw-600">{{ $t("suppliers.list_title") }}</h1>
        <button
          class="suppliers-primary-btn"
          data-testid="suppliers-create-btn"
          @click="openCreate"
        >
          <FontAwesomeIcon icon="plus" />
          {{ $t("suppliers.create_button") }}
        </button>
      </div>

      <!-- Filter panel -->
      <div class="flex ai-ct mb-400">
        <MobileFilterPanel
          :active-count="activeFilterCount"
          :trigger-label="$t('builder.filters')"
        >
          <p class="fs-200 t-basic-600">{{ $t("suppliers.filter.role") }}</p>
          <div class="flex ai-ct flex-wrap gap-100">
            <FilterChip
              v-for="opt in roleOptions"
              :key="opt.value"
              :label="opt.label"
              :active="roleFilter === opt.value"
              :data-testid="`suppliers-filter-role-${opt.value}`"
              @click="setRoleFilter(opt.value)"
            />
          </div>
          <p class="fs-200 t-basic-600">
            {{ $t("suppliers.filter.status") }}
          </p>
          <div class="flex ai-ct flex-wrap gap-100">
            <FilterChip
              v-for="opt in statusOptions"
              :key="opt.value"
              :label="opt.label"
              :active="statusFilter === opt.value"
              :data-testid="`suppliers-filter-status-${opt.value}`"
              @click="setStatusFilter(opt.value)"
            />
          </div>
        </MobileFilterPanel>
      </div>

      <div class="supplier-list__toolbar">
        <BasicInput
          v-model="search"
          :placeholder="$t('common.start_typing')"
          icon="search"
          class="supplier-list__search"
          data-testid="suppliers-search-input"
          @input="debouncedFetch(searchAndFetch)"
        />
      </div>

      <Loader v-show="loading" />

      <DataTable
        v-show="!loading"
        :columns="columns"
        :rows="suppliers"
        :sortable="true"
        row-key="idx"
        :empty-text="$t('suppliers.empty_state_title')"
        @sort="onSort"
        @row-click="onRowClick"
      >
        <template #cell-idx="{ value }">
          <span class="cell-truncate" :title="value">{{ value }}</span>
        </template>
        <template #cell-name="{ value }">
          <span class="cell-truncate" :title="value">{{ value }}</span>
        </template>
        <template #cell-role="{ value }">
          <StatusBadge
            :label="$t(`suppliers.role.${value || 'trade'}`)"
            :variant="roleVariant(value)"
          />
        </template>
        <template #cell-supplier_type="{ value }">
          <StatusBadge
            :label="$t(`suppliers.type.${value || 'feed'}`)"
            variant="neutral"
          />
        </template>
        <template #cell-is_active="{ value }">
          <StatusBadge
            :label="value ? $t('common.active') : $t('common.inactive')"
            :variant="value ? 'positive' : 'negative'"
          />
        </template>
        <template #cell-default_currency_id="{ value }">
          {{ regionalStore.currencyById(value)?.iso3 || "—" }}
        </template>
        <template #cell-actions="{ row }">
          <div class="flex ai-ct gap-100" @click.stop>
            <button
              class="row-action-btn bg-support-100 t-support-400"
              :title="$t('common.edit')"
              :data-testid="`suppliers-edit-${row.idx}`"
              @click="onEdit(row)"
            >
              <FontAwesomeIcon icon="pen" />
            </button>
            <button
              class="row-action-btn bg-negative-100 t-negative-300"
              :title="$t('common.delete')"
              :data-testid="`suppliers-delete-${row.idx}`"
              @click="openDelete(row)"
            >
              <FontAwesomeIcon icon="trash-can" />
            </button>
          </div>
        </template>
      </DataTable>

      <Pagination
        v-if="totalCount > pageSize"
        :pagination="paginationState"
        @onChangePage="onPageChange"
      />
    </div>

    <!-- Create supplier drawer -->
    <SideDrawer
      :visible="createVisible"
      :title="$t('suppliers.create_button')"
      width="420px"
      @close="closeCreate"
    >
      <form class="flex flex-column gap-200" @submit.prevent="submitCreate">
        <FormField :label="$t('suppliers.form.idx_label')" required>
          <BasicInput
            v-model="createForm.idx"
            placeholder="example-supplier"
            data-testid="suppliers-create-idx"
          />
          <p
            v-if="errors.idx"
            class="form-error t-negative-300 fs-200"
            data-testid="suppliers-create-error-idx"
          >
            {{ errors.idx.msg }}
          </p>
        </FormField>
        <FormField :label="$t('suppliers.form.name_label')" required>
          <BasicInput
            v-model="createForm.name"
            data-testid="suppliers-create-name"
          />
          <p v-if="errors.name" class="form-error t-negative-300 fs-200">
            {{ errors.name.msg }}
          </p>
        </FormField>
        <FormField :label="$t('suppliers.form.role_label')">
          <Dropdown
            :values="roleDropdownOptions"
            :selected="[createForm.supplier_role]"
            data-testid="suppliers-create-role"
            @onSelect="(val) => (createForm.supplier_role = val)"
          />
        </FormField>
        <FormField :label="$t('suppliers.form.type_label')">
          <Dropdown
            :values="typeDropdownOptions"
            :selected="[createForm.supplier_type]"
            data-testid="suppliers-create-type"
            @onSelect="(val) => (createForm.supplier_type = val)"
          />
        </FormField>
        <FormField :label="$t('suppliers.form.default_language_label')">
          <Dropdown
            :values="regionalStore.languageOptions"
            :selected="
              createForm.default_language_id
                ? [createForm.default_language_id]
                : []
            "
            :placeholder="$t('suppliers.form.select_language')"
            data-testid="suppliers-create-language"
            @onSelect="(val) => (createForm.default_language_id = val)"
          />
        </FormField>
        <FormField :label="$t('suppliers.form.default_currency_label')">
          <Dropdown
            :values="regionalStore.currencyOptions"
            :selected="
              createForm.default_currency_id
                ? [createForm.default_currency_id]
                : []
            "
            :placeholder="$t('suppliers.form.select_currency')"
            data-testid="suppliers-create-currency"
            @onSelect="(val) => (createForm.default_currency_id = val)"
          />
        </FormField>
        <FormField :label="$t('suppliers.form.sku_prefix_label')">
          <BasicInput
            v-model="createForm.sku_prefix"
            placeholder="SUP"
            data-testid="suppliers-create-sku-prefix"
          />
        </FormField>
        <div class="flex ai-ct jc-end gap-200 mt-300">
          <button
            type="button"
            class="suppliers-secondary-btn"
            data-testid="suppliers-create-cancel"
            @click="closeCreate"
          >
            {{ $t("common.cancel") }}
          </button>
          <button
            type="submit"
            class="suppliers-primary-btn"
            :disabled="creating"
            data-testid="suppliers-create-submit"
          >
            <FontAwesomeIcon icon="floppy-disk" />
            {{ $t("common.save") }}
          </button>
        </div>
      </form>
    </SideDrawer>

    <!-- Delete confirmation modal -->
    <Confirmation-modal
      :visible="deleteVisible"
      @accept="submitDelete"
      @reject="closeDelete"
    >
      <template #header>
        <h2>{{ $t("suppliers.delete.modal_title") }}</h2>
      </template>
      <template #description>
        <p class="mb-200">
          <strong>{{ deleteTarget?.name }}</strong> ({{ deleteTarget?.idx }})
        </p>
        <div class="flex flex-column gap-100 mb-200">
          <label class="flex ai-ct gap-100 pointer">
            <input
              type="radio"
              :value="false"
              v-model="deleteForce"
              data-testid="suppliers-delete-soft-radio"
            />
            <span class="fs-300">{{
              $t("suppliers.delete.mode_soft_label")
            }}</span>
          </label>
          <label class="flex ai-ct gap-100 pointer">
            <input
              type="radio"
              :value="true"
              v-model="deleteForce"
              data-testid="suppliers-delete-hard-radio"
            />
            <span class="fs-300 t-negative-300 fw-600">{{
              $t("suppliers.delete.mode_hard_label")
            }}</span>
          </label>
        </div>
        <div
          v-if="deleteForce && deleteImpact"
          class="suppliers-delete-impact"
          data-testid="suppliers-delete-impact-banner"
        >
          <p class="fs-200 mb-100">
            {{
              $t("suppliers.delete.impact_links", {
                count: deleteImpact.affected_links_count,
              })
            }}
          </p>
          <p class="fs-200">
            {{
              $t("suppliers.delete.impact_pushed_skus", {
                count: deleteImpact.affected_pushed_skus_count,
              })
            }}
          </p>
        </div>
        <p v-if="!deleteForce" class="fs-200 t-basic-500 mt-200">
          {{ $t("suppliers.delete.default_warning") }}
        </p>
      </template>
      <template #footer>
        <button
          class="modal-btn modal-btn--secondary"
          data-testid="suppliers-delete-cancel"
          @click="closeDelete"
        >
          {{ $t("common.cancel") }}
        </button>
        <button
          class="modal-btn modal-btn--delete"
          :class="{ 'modal-btn--danger': deleteForce }"
          :disabled="deleting"
          data-testid="suppliers-delete-confirm"
          @click="submitDelete"
        >
          <FontAwesomeIcon icon="trash-can" />
          {{
            deleteForce
              ? $t("suppliers.delete.confirm_button_hard")
              : $t("suppliers.delete.confirm_button_soft")
          }}
        </button>
      </template>
    </Confirmation-modal>
  </div>
</template>

<script>
import { useNotifyStore } from "@/stores/notify";
import { useRegionalStore } from "@/stores/regional";
import { useSearchDebounce } from "@/composables/useSearchDebounce";
import { useFormErrors, extractApiMessage } from "@/composables/useFormErrors";
import ConfirmationModal from "@/functionals/Confirmation-modal/index.vue";
import {
  GET_Suppliers,
  POST_Supplier,
  DELETE_Supplier,
  GET_SupplierDeleteImpact,
} from "@/api/suppliers/api";

const ROLE_VARIANTS = {
  trade: "positive",
  data: "informative",
  monitoring: "neutral",
};

const EMPTY_FORM = () => ({
  idx: "",
  name: "",
  supplier_role: "trade",
  supplier_type: "feed",
  default_language_id: null,
  default_currency_id: null,
  sku_prefix: "",
});

export default {
  name: "SupplierList",
  components: { ConfirmationModal },
  setup() {
    const notify = useNotifyStore();
    const regionalStore = useRegionalStore();
    regionalStore.fetchAll();
    const { search, debouncedFetch } = useSearchDebounce();
    const { errors, handleApiError, clearErrors } = useFormErrors();
    return {
      notify,
      regionalStore,
      search,
      debouncedFetch,
      errors,
      handleApiError,
      clearErrors,
    };
  },
  data() {
    return {
      suppliers: [],
      totalCount: 0,
      currentPage: 1,
      pageSize: 20,
      ordering: null,
      loading: false,
      roleFilter: "__all",
      statusFilter: "__all",
      // Create
      createVisible: false,
      creating: false,
      createForm: EMPTY_FORM(),
      // Delete
      deleteVisible: false,
      deleteTarget: null,
      deleteForce: false,
      deleteImpact: null,
      deleting: false,
    };
  },
  computed: {
    activeFilterCount() {
      let n = 0;
      if (this.roleFilter !== "__all") n += 1;
      if (this.statusFilter !== "__all") n += 1;
      return n;
    },
    roleOptions() {
      return [
        { value: "__all", label: this.$t("common.all") },
        { value: "trade", label: this.$t("suppliers.role.trade") },
        { value: "data", label: this.$t("suppliers.role.data") },
        { value: "monitoring", label: this.$t("suppliers.role.monitoring") },
      ];
    },
    statusOptions() {
      return [
        { value: "__all", label: this.$t("common.all") },
        { value: "active", label: this.$t("common.active") },
        { value: "inactive", label: this.$t("common.inactive") },
      ];
    },
    roleDropdownOptions() {
      return [
        { value: "trade", label: this.$t("suppliers.role.trade") },
        { value: "data", label: this.$t("suppliers.role.data") },
        { value: "monitoring", label: this.$t("suppliers.role.monitoring") },
      ];
    },
    typeDropdownOptions() {
      return [
        { value: "feed", label: this.$t("suppliers.type.feed") },
        { value: "manual", label: this.$t("suppliers.type.manual") },
        { value: "dropship", label: this.$t("suppliers.type.dropship") },
      ];
    },
    columns() {
      return [
        {
          key: "idx",
          label: this.$t("suppliers.col.idx"),
          sortable: true,
          width: "minmax(120px, 180px)",
        },
        {
          key: "name",
          label: this.$t("suppliers.col.name"),
          sortable: true,
          width: "minmax(180px, 1fr)",
        },
        {
          key: "role",
          label: this.$t("suppliers.col.role"),
          sortable: false,
          width: "120px",
        },
        {
          key: "supplier_type",
          label: this.$t("suppliers.col.type"),
          sortable: false,
          width: "100px",
        },
        {
          key: "default_currency_id",
          label: this.$t("suppliers.col.currency"),
          sortable: false,
          width: "80px",
        },
        {
          key: "target_warehouse_code",
          label: this.$t("suppliers.col.warehouse"),
          sortable: false,
          width: "120px",
        },
        {
          key: "is_active",
          label: this.$t("suppliers.col.status"),
          sortable: true,
          width: "100px",
        },
        { key: "actions", label: "", sortable: false, width: "100px" },
      ];
    },
    paginationState() {
      return {
        page: this.currentPage,
        pages: Math.max(1, Math.ceil(this.totalCount / this.pageSize)),
      };
    },
  },
  watch: {
    "$route.query.page"(newPage) {
      this.currentPage = parseInt(newPage) || 1;
      this.fetchSuppliers();
    },
  },
  mounted() {
    this.currentPage = parseInt(this.$route.query.page) || 1;
    this.fetchSuppliers();
  },
  methods: {
    roleVariant(role) {
      return ROLE_VARIANTS[role] || "neutral";
    },
    async fetchSuppliers() {
      this.loading = true;
      try {
        const params = { page: this.currentPage, page_size: this.pageSize };
        if (this.search) params.search = this.search;
        if (this.ordering) params.ordering = this.ordering;
        if (this.roleFilter !== "__all") params.role = this.roleFilter;
        if (this.statusFilter === "active") params.is_active = true;
        if (this.statusFilter === "inactive") params.is_active = false;
        const { data } = await GET_Suppliers(params);
        this.suppliers = data.results || [];
        this.totalCount = data.count || 0;
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.loading = false;
      }
    },
    setRoleFilter(value) {
      this.roleFilter = value;
      this.currentPage = 1;
      this.fetchSuppliers();
    },
    setStatusFilter(value) {
      this.statusFilter = value;
      this.currentPage = 1;
      this.fetchSuppliers();
    },
    searchAndFetch() {
      this.currentPage = 1;
      this.fetchSuppliers();
    },
    onSort({ key, direction }) {
      this.ordering = key && direction === "desc" ? `-${key}` : key || null;
      this.fetchSuppliers();
    },
    onPageChange(page) {
      this.$router.push({
        path: this.$route.path,
        query: { ...this.$route.query, page: String(page) },
      });
    },
    onRowClick(row) {
      this.$router.push(`/suppliers/${row.idx}`);
    },
    onEdit(row) {
      this.$router.push(`/suppliers/${row.idx}`);
    },
    openCreate() {
      this.createForm = EMPTY_FORM();
      this.clearErrors();
      this.createVisible = true;
    },
    closeCreate() {
      this.createVisible = false;
    },
    async submitCreate() {
      this.creating = true;
      this.clearErrors();
      try {
        const payload = { ...this.createForm };
        Object.keys(payload).forEach((k) => {
          if (payload[k] === "") delete payload[k];
        });
        const { data } = await POST_Supplier(payload);
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("suppliers.toast.created", {
            name: data.name || data.idx,
          }),
        });
        this.createVisible = false;
        this.fetchSuppliers();
      } catch (err) {
        this.handleApiError(err);
        if (Object.keys(this.errors).length === 0) {
          this.notify.spawnNotification({
            type: "negative",
            msg: extractApiMessage(err, this.$t("notifications.error")),
          });
        }
      } finally {
        this.creating = false;
      }
    },
    async openDelete(row) {
      this.deleteTarget = row;
      this.deleteForce = false;
      this.deleteImpact = null;
      this.deleteVisible = true;
      try {
        const { data } = await GET_SupplierDeleteImpact(row.idx);
        this.deleteImpact = data;
      } catch (err) {
        // Non-fatal — impact endpoint may be unavailable; soft delete still works.
        this.deleteImpact = {
          affected_links_count: 0,
          affected_pushed_skus_count: 0,
        };
      }
    },
    closeDelete() {
      this.deleteVisible = false;
      this.deleteTarget = null;
    },
    async submitDelete() {
      if (!this.deleteTarget) return;
      this.deleting = true;
      try {
        await DELETE_Supplier(this.deleteTarget.idx, {
          force: this.deleteForce,
        });
        this.notify.spawnNotification({
          type: this.deleteForce ? "warning" : "positive",
          msg: this.$t(
            this.deleteForce
              ? "suppliers.toast.deleted_hard"
              : "suppliers.toast.deleted_soft",
            { name: this.deleteTarget.name || this.deleteTarget.idx }
          ),
        });
        this.deleteVisible = false;
        this.deleteTarget = null;
        this.fetchSuppliers();
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.deleting = false;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.cell-truncate {
  display: block;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.supplier-list__toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-200);
  margin-bottom: var(--space-400);
  flex-wrap: wrap;
}
.supplier-list__search {
  flex: 1;
  min-width: 150px;
  max-width: 400px;
}
.suppliers-primary-btn,
.suppliers-secondary-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 16px;
  font-size: 13px;
  font-weight: 500;
  border-radius: var(--radius-sm);
  border: 1px solid;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}
.suppliers-primary-btn {
  background: var(--c-support-400);
  border-color: var(--c-support-400);
  color: var(--c-basic-100);
}
.suppliers-primary-btn:hover:not(:disabled) {
  filter: brightness(1.05);
}
.suppliers-primary-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.suppliers-secondary-btn {
  background: var(--c-basic-100);
  border-color: var(--c-basic-400);
  color: var(--c-basic-700);
}
.suppliers-secondary-btn:hover {
  background: var(--c-basic-200);
  border-color: var(--c-basic-500);
}
.row-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: opacity 0.15s ease;
}
.row-action-btn:hover {
  opacity: 0.85;
}
.suppliers-delete-impact {
  background: var(--c-negative-100);
  color: var(--c-negative-300);
  padding: var(--space-200);
  border-radius: var(--radius-sm);
}
.modal-btn--danger {
  background: var(--c-negative-100);
  border-color: var(--c-negative-300);
  color: var(--c-negative-300);
}
.modal-btn--danger:hover {
  background: var(--c-negative-200);
  color: var(--c-basic-100);
}
.form-error {
  margin: 0;
  margin-top: 2px;
}
</style>
