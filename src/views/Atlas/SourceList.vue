<template>
  <div class="p-500 fs-300 t-basic-800 h-100 ov-h">
    <div
      class="bg-basic-100 b-basic-300 br-50 h-100 ovy-auto pl-500 pt-500 pb-500 pr-500"
    >
      <div class="flex ai-ct jc-sb mb-400 gap-300">
        <h1 class="fs-700 fw-600">{{ $t("atlas.list_title") }}</h1>
        <button
          class="suppliers-primary-btn"
          data-testid="suppliers-create-btn"
          @click="openCreate"
        >
          <FontAwesomeIcon icon="plus" />
          {{ $t("atlas.create_button") }}
        </button>
      </div>

      <!-- Filter panel -->
      <div class="flex ai-ct mb-400">
        <MobileFilterPanel
          :active-count="activeFilterCount"
          :trigger-label="$t('builder.filters')"
        >
          <p class="fs-200 t-basic-600">{{ $t("atlas.filter.kind") }}</p>
          <div class="flex ai-ct flex-wrap gap-100">
            <FilterChip
              v-for="opt in kindOptions"
              :key="opt.value"
              :label="opt.label"
              :active="kindFilter === opt.value"
              :data-testid="`suppliers-filter-kind-${opt.value}`"
              @click="setKindFilter(opt.value)"
            />
          </div>
          <p class="fs-200 t-basic-600">
            {{ $t("atlas.filter.status") }}
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
        :empty-text="$t('atlas.empty_state_title')"
        @sort="onSort"
        @row-click="onRowClick"
      >
        <template #cell-idx="{ value }">
          <span class="cell-truncate" :title="value">{{ value }}</span>
        </template>
        <template #cell-name="{ value }">
          <span class="cell-truncate" :title="value">{{ value }}</span>
        </template>
        <template #cell-kind="{ value }">
          <StatusBadge :label="$t(`atlas.kind.${value}`)" :variant="kindVariant(value)" />
        </template>
        <template #cell-source_type="{ value }">
          <StatusBadge
            :label="$t(`atlas.type.${value || 'feed'}`)"
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
      :title="$t('atlas.create_button')"
      width="420px"
      @close="closeCreate"
    >
      <form class="flex flex-column gap-200" @submit.prevent="submitCreate">
        <FormField :label="$t('atlas.form.idx_label')" required>
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
        <FormField :label="$t('atlas.form.name_label')" required>
          <BasicInput
            v-model="createForm.name"
            data-testid="suppliers-create-name"
          />
          <p v-if="errors.name" class="form-error t-negative-300 fs-200">
            {{ errors.name.msg }}
          </p>
        </FormField>
        <FormField :label="$t('atlas.form.kind_label')">
          <Dropdown
            :values="kindDropdownOptions"
            :selected="[createForm.kind]"
            data-testid="suppliers-create-kind"
            @onSelect="(val) => (createForm.kind = val)"
          />
        </FormField>
        <FormField :label="$t('atlas.form.type_label')">
          <Dropdown
            :values="typeDropdownOptions"
            :selected="[createForm.source_type]"
            data-testid="suppliers-create-type"
            @onSelect="(val) => (createForm.source_type = val)"
          />
        </FormField>
        <FormField :label="$t('atlas.form.default_language_label')">
          <Dropdown
            :values="regionalStore.languageOptions"
            :selected="
              createForm.default_language_id
                ? [createForm.default_language_id]
                : []
            "
            :placeholder="$t('atlas.form.select_language')"
            data-testid="suppliers-create-language"
            @onSelect="(val) => (createForm.default_language_id = val)"
          />
        </FormField>
        <FormField :label="$t('atlas.form.default_currency_label')">
          <Dropdown
            :values="regionalStore.currencyOptions"
            :selected="
              createForm.default_currency_id
                ? [createForm.default_currency_id]
                : []
            "
            :placeholder="$t('atlas.form.select_currency')"
            data-testid="suppliers-create-currency"
            @onSelect="(val) => (createForm.default_currency_id = val)"
          />
        </FormField>
        <FormField :label="$t('atlas.form.sku_prefix_label')">
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
        <h2>{{ $t("atlas.delete.modal_title") }}</h2>
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
              $t("atlas.delete.mode_soft_label")
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
              $t("atlas.delete.mode_hard_label")
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
              $t("atlas.delete.impact_links", {
                count: deleteImpact.affected_links_count,
              })
            }}
          </p>
          <p class="fs-200">
            {{
              $t("atlas.delete.impact_pushed_skus", {
                count: deleteImpact.affected_pushed_skus_count,
              })
            }}
          </p>
        </div>
        <p v-if="!deleteForce" class="fs-200 t-basic-500 mt-200">
          {{ $t("atlas.delete.default_warning") }}
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
              ? $t("atlas.delete.confirm_button_hard")
              : $t("atlas.delete.confirm_button_soft")
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
  GET_Sources,
  POST_Source,
  DELETE_Source,
  GET_SupplierDeleteImpact,
} from "@/api/atlas/api";

const KIND_VARIANTS = {
  procurement: "positive",
  monitoring: "informative",
  enrichment: "neutral",
};

const EMPTY_FORM = () => ({
  idx: "",
  name: "",
  kind: "procurement",
  source_type: "feed",
  default_language_id: null,
  default_currency_id: null,
  sku_prefix: "",
});

export default {
  name: "SourceList",
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
      kindFilter: "__all",
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
      if (this.kindFilter !== "__all") n += 1;
      if (this.statusFilter !== "__all") n += 1;
      return n;
    },
    kindOptions() {
      return [
        { value: "__all", label: this.$t("common.all") },
        { value: "procurement", label: this.$t("atlas.kind.procurement") },
        { value: "monitoring", label: this.$t("atlas.kind.monitoring") },
        { value: "enrichment", label: this.$t("atlas.kind.enrichment") },
      ];
    },
    statusOptions() {
      return [
        { value: "__all", label: this.$t("common.all") },
        { value: "active", label: this.$t("common.active") },
        { value: "inactive", label: this.$t("common.inactive") },
      ];
    },
    kindDropdownOptions() {
      return [
        { value: "procurement", label: this.$t("atlas.kind.procurement") },
        { value: "monitoring", label: this.$t("atlas.kind.monitoring") },
        { value: "enrichment", label: this.$t("atlas.kind.enrichment") },
      ];
    },
    typeDropdownOptions() {
      return [
        { value: "feed", label: this.$t("atlas.type.feed") },
        { value: "manual", label: this.$t("atlas.type.manual") },
        { value: "dropship", label: this.$t("atlas.type.dropship") },
      ];
    },
    columns() {
      return [
        {
          key: "idx",
          label: this.$t("atlas.col.idx"),
          sortable: true,
          width: "minmax(120px, 180px)",
        },
        {
          key: "name",
          label: this.$t("atlas.col.name"),
          sortable: true,
          width: "minmax(180px, 1fr)",
        },
        {
          key: "kind",
          label: this.$t("atlas.col.kind"),
          sortable: false,
          width: "120px",
        },
        {
          key: "source_type",
          label: this.$t("atlas.col.type"),
          sortable: false,
          width: "100px",
        },
        {
          key: "default_currency_id",
          label: this.$t("atlas.col.currency"),
          sortable: false,
          width: "80px",
        },
        {
          key: "target_warehouse_code",
          label: this.$t("atlas.col.warehouse"),
          sortable: false,
          width: "120px",
        },
        {
          key: "is_active",
          label: this.$t("atlas.col.status"),
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
    kindVariant(kind) {
      return KIND_VARIANTS[kind] || "neutral";
    },
    async fetchSuppliers() {
      this.loading = true;
      try {
        const params = { page: this.currentPage, page_size: this.pageSize };
        if (this.search) params.search = this.search;
        if (this.ordering) params.ordering = this.ordering;
        if (this.kindFilter !== "__all") params.kind = this.kindFilter;
        if (this.statusFilter === "active") params.is_active = true;
        if (this.statusFilter === "inactive") params.is_active = false;
        const { data } = await GET_Sources(params);
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
    setKindFilter(value) {
      this.kindFilter = value;
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
      this.$router.push(`/atlas/${row.idx}`);
    },
    onEdit(row) {
      this.$router.push(`/atlas/${row.idx}`);
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
        const { data } = await POST_Source(payload);
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("atlas.toast.created", {
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
        await DELETE_Source(this.deleteTarget.idx, {
          force: this.deleteForce,
        });
        this.notify.spawnNotification({
          type: this.deleteForce ? "warning" : "positive",
          msg: this.$t(
            this.deleteForce
              ? "atlas.toast.deleted_hard"
              : "atlas.toast.deleted_soft",
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
