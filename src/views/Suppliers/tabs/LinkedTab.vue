<template>
  <div class="linked-tab p-300 ovy-auto h-100">
    <div class="flex ai-ct jc-sb mb-300 flex-wrap gap-200">
      <h2 class="fs-400 fw-600">{{ $t("suppliers.tabs.linked") }}</h2>
      <button
        class="suppliers-primary-btn"
        data-testid="linked-create-btn"
        @click="openCreate"
      >
        <FontAwesomeIcon icon="plus" />
        {{ $t("suppliers.linked.create_button") }}
      </button>
    </div>

    <div
      v-if="!loading && shouldShowNoPreferredBanner"
      class="bg-warning-100 t-warning-300 p-200 br-sm mb-300"
      data-testid="linked-no-preferred-banner"
    >
      <p class="fs-200">{{ $t("suppliers.linked.no_preferred_warning") }}</p>
    </div>

    <Loader v-show="loading" />

    <DataTable
      v-show="!loading"
      :columns="columns"
      :rows="links"
      row-key="id"
      :empty-text="$t('suppliers.linked.empty')"
    >
      <template #cell-is_preferred="{ value }">
        <StatusBadge
          :label="
            value
              ? $t('suppliers.linked.preferred')
              : $t('suppliers.linked.not_preferred')
          "
          :variant="value ? 'positive' : 'neutral'"
        />
      </template>
      <template #cell-is_active="{ value }">
        <StatusBadge
          :label="value ? $t('common.active') : $t('common.inactive')"
          :variant="value ? 'positive' : 'negative'"
        />
      </template>
      <template #cell-actions="{ row }">
        <div class="flex ai-ct gap-100" @click.stop>
          <button
            v-if="!isMonitoringSupplier && !row.is_preferred"
            class="row-action-btn bg-positive-100 t-positive-300"
            :title="$t('suppliers.linked.set_preferred_button')"
            :data-testid="`linked-set-preferred-${row.id}`"
            @click="setPreferred(row)"
          >
            <FontAwesomeIcon icon="star" />
          </button>
          <button
            v-else-if="!isMonitoringSupplier"
            class="row-action-btn bg-warning-100 t-warning-300"
            :title="$t('suppliers.linked.unset_preferred_button')"
            :data-testid="`linked-unset-preferred-${row.id}`"
            @click="unsetPreferred(row)"
          >
            <FontAwesomeIcon icon="star" />
          </button>
          <button
            class="row-action-btn bg-basic-200 t-basic-700"
            :title="$t('common.edit')"
            :data-testid="`linked-edit-${row.id}`"
            @click="openEdit(row)"
          >
            <FontAwesomeIcon icon="pen" />
          </button>
          <button
            class="row-action-btn bg-negative-100 t-negative-300"
            :title="$t('common.delete')"
            :data-testid="`linked-delete-${row.id}`"
            @click="confirmDelete(row)"
          >
            <FontAwesomeIcon icon="trash-can" />
          </button>
        </div>
      </template>
    </DataTable>

    <SideDrawer
      :visible="formVisible"
      :title="
        editing ? $t('common.edit') : $t('suppliers.linked.create_button')
      "
      width="420px"
      @close="closeForm"
    >
      <form class="flex flex-column gap-200" @submit.prevent="submitForm">
        <FormField
          :label="$t('suppliers.linked.real_product_sku_label')"
          required
        >
          <div class="flex ai-ct gap-200">
            <EntitySearchPicker
              v-model="formData.real_product_sku"
              :display-value="skuLabel"
              :fetch-fn="skuFetchFn"
              :disabled="!!editing"
              :placeholder="$t('suppliers.linked.sku_search_placeholder')"
              class="flex-1"
              data-testid="linked-form-sku"
              @update:display-value="skuLabel = $event"
              @clear="skuLabel = ''"
            />
            <button
              v-if="formData.real_product_sku"
              type="button"
              class="row-action-btn bg-basic-200 t-basic-700"
              :title="$t('suppliers.linked.sku_preview')"
              data-testid="linked-sku-preview-btn"
              @click="openPreview"
            >
              <FontAwesomeIcon icon="magnifying-glass" />
            </button>
          </div>
          <p
            v-if="errors.real_product_sku"
            class="form-error t-negative-300 fs-200"
          >
            {{ errors.real_product_sku.msg }}
          </p>
        </FormField>
        <FormField :label="$t('suppliers.linked.priority_label')">
          <NumberInput
            v-model="formData.priority"
            :min="0"
            :max="9999"
            data-testid="linked-form-priority"
          />
        </FormField>
        <FormField :label="$t('suppliers.linked.external_id_label')">
          <BasicInput
            v-model="formData.external_id"
            data-testid="linked-form-external-id"
          />
        </FormField>
        <FormField
          v-if="!isMonitoringSupplier"
          :label="$t('suppliers.linked.is_preferred_label')"
        >
          <Switcher
            :selected="formData.is_preferred"
            data-testid="linked-form-is-preferred"
            @onSelect="formData.is_preferred = !formData.is_preferred"
          />
        </FormField>
        <FormField :label="$t('suppliers.form.is_active_label')">
          <Switcher
            :selected="formData.is_active"
            data-testid="linked-form-is-active"
            @onSelect="formData.is_active = !formData.is_active"
          />
        </FormField>
        <FormField :label="$t('suppliers.linked.notes_label')">
          <BasicInput
            v-model="formData.notes"
            data-testid="linked-form-notes"
          />
        </FormField>
        <div class="flex ai-ct jc-end gap-200 mt-300">
          <button
            type="button"
            class="suppliers-secondary-btn"
            data-testid="linked-form-cancel"
            @click="closeForm"
          >
            {{ $t("common.cancel") }}
          </button>
          <button
            type="submit"
            class="suppliers-primary-btn"
            :disabled="formBusy"
            data-testid="linked-form-submit"
          >
            <FontAwesomeIcon icon="floppy-disk" />
            {{ $t("common.save") }}
          </button>
        </div>
      </form>
    </SideDrawer>

    <Confirmation-modal
      :visible="deleteVisible"
      @accept="executeDelete"
      @reject="deleteVisible = false"
    >
      <template #header>
        <h2>{{ $t("suppliers.linked.delete_title") }}</h2>
      </template>
      <template #description>
        <p>{{ $t("suppliers.linked.delete_body") }}</p>
      </template>
    </Confirmation-modal>

    <SideDrawer
      :visible="previewVisible"
      :title="$t('suppliers.linked.sku_preview')"
      mode="focused"
      width="420px"
      @close="previewVisible = false"
    >
      <Loader v-show="previewLoading" />
      <div
        v-if="!previewLoading && previewProduct"
        class="sku-preview"
        data-testid="linked-sku-preview"
      >
        <div class="sku-preview__image">
          <img
            v-if="previewImage"
            :src="previewImage"
            :alt="previewProduct.name"
          />
          <FontAwesomeIcon
            v-else
            icon="image"
            class="sku-preview__placeholder"
          />
        </div>
        <h3 class="fs-400 fw-600 mt-200">{{ previewProduct.name }}</h3>
        <dl class="sku-preview__meta fs-200 mt-200">
          <dt>{{ $t("suppliers.linked.col.sku") }}</dt>
          <dd>{{ previewProduct.sku }}</dd>
          <dt>EAN</dt>
          <dd>{{ previewProduct.ean || "—" }}</dd>
          <dt>{{ $t("suppliers.linked.preview_categories") }}</dt>
          <dd>{{ previewCategories || "—" }}</dd>
        </dl>
      </div>
    </SideDrawer>
  </div>
</template>

<script>
import ConfirmationModal from "@/functionals/Confirmation-modal/index.vue";
import { useNotifyStore } from "@/stores/notify";
import { usePimChannelStore } from "@/stores/pimChannel";
import { useFormErrors, extractApiMessage } from "@/composables/useFormErrors";
import {
  GET_ProductLinks,
  POST_ProductLink,
  PATCH_ProductLink,
  DELETE_ProductLink,
  POST_SetPreferredLink,
  POST_UnsetPreferredLink,
} from "@/api/suppliers/api";
import { GET_Products, GET_Product } from "@/api/pim/api";

const EMPTY_LINK = (supplierIdx) => ({
  real_product_sku: "",
  supplier_idx: supplierIdx || "",
  external_id: "",
  priority: 0,
  is_preferred: false,
  is_active: true,
  notes: "",
});

export default {
  name: "LinkedTab",
  components: { ConfirmationModal },
  props: {
    supplier: { type: Object, default: null },
  },
  setup() {
    const notify = useNotifyStore();
    const pimChannel = usePimChannelStore();
    const { errors, handleApiError, clearErrors } = useFormErrors();
    return { notify, pimChannel, errors, handleApiError, clearErrors };
  },
  data() {
    return {
      links: [],
      loading: false,
      formVisible: false,
      formBusy: false,
      formData: EMPTY_LINK(this.supplier?.idx),
      skuLabel: "",
      editing: null,
      deleteVisible: false,
      deleteTarget: null,
      previewVisible: false,
      previewLoading: false,
      previewProduct: null,
    };
  },
  computed: {
    isMonitoringSupplier() {
      return this.supplier?.supplier_role === "monitoring";
    },
    columns() {
      const cols = [
        {
          key: "real_product_sku",
          label: this.$t("suppliers.linked.col.sku"),
          width: "1.5fr",
        },
        {
          key: "external_id",
          label: this.$t("suppliers.linked.col.external_id"),
          width: "1fr",
        },
        {
          key: "priority",
          label: this.$t("suppliers.linked.col.priority"),
          width: "80px",
        },
        {
          key: "is_preferred",
          label: this.$t("suppliers.linked.col.preferred"),
          width: "120px",
        },
        {
          key: "is_active",
          label: this.$t("suppliers.col.status"),
          width: "100px",
        },
        { key: "actions", label: "", width: "140px" },
      ];
      // Preferred-supplier has no meaning for monitoring (it drives sourcing/cost writes).
      return this.isMonitoringSupplier
        ? cols.filter((c) => c.key !== "is_preferred")
        : cols;
    },
    shouldShowNoPreferredBanner() {
      return (
        !this.isMonitoringSupplier &&
        this.links.length > 0 &&
        !this.links.some((l) => l.is_preferred)
      );
    },
    channelIdx() {
      // PIM search is channel-scoped; the default channel holds the full catalogue.
      return (
        this.pimChannel.activeChannelIdx ||
        this.pimChannel.defaultChannelIdx ||
        ""
      );
    },
    previewImage() {
      return (
        this.previewProduct?.thumbnail_url ||
        this.previewProduct?.og_image ||
        ""
      );
    },
    previewCategories() {
      const cats = this.previewProduct?.categories || [];
      return cats
        .map((c) => c.name || c.idx || c)
        .filter(Boolean)
        .join(", ");
    },
  },
  watch: {
    "supplier.idx"() {
      this.fetchLinks();
    },
  },
  mounted() {
    this.fetchLinks();
    // EntitySearchPicker needs a channel to scope the PIM search.
    if (!this.pimChannel.channels.length) this.pimChannel.fetchChannels();
  },
  methods: {
    async skuFetchFn(query) {
      if (!this.channelIdx) return [];
      try {
        const params = { page_size: 20 };
        if (query) params.search = query;
        const { data } = await GET_Products(this.channelIdx, params);
        const items = data?.results || data || [];
        return items.map((p) => ({
          value: p.sku,
          label: p.name || p.sku,
          secondary: p.sku,
        }));
      } catch {
        return [];
      }
    },
    async openPreview() {
      if (!this.formData.real_product_sku || !this.channelIdx) return;
      this.previewVisible = true;
      this.previewLoading = true;
      this.previewProduct = null;
      try {
        const { data } = await GET_Product(
          this.channelIdx,
          this.formData.real_product_sku
        );
        this.previewProduct = data;
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
        this.previewVisible = false;
      } finally {
        this.previewLoading = false;
      }
    },
    async fetchLinks() {
      if (!this.supplier?.idx) return;
      this.loading = true;
      try {
        const { data } = await GET_ProductLinks({
          supplier_idx: this.supplier.idx,
          page_size: 100,
        });
        this.links = data.results || [];
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.loading = false;
      }
    },
    openCreate() {
      this.editing = null;
      this.formData = EMPTY_LINK(this.supplier?.idx);
      this.skuLabel = "";
      this.clearErrors();
      this.formVisible = true;
    },
    openEdit(row) {
      this.editing = row;
      this.formData = { ...row };
      this.skuLabel = row.real_product_sku;
      this.clearErrors();
      this.formVisible = true;
    },
    closeForm() {
      this.formVisible = false;
      this.editing = null;
    },
    async submitForm() {
      this.formBusy = true;
      this.clearErrors();
      try {
        const payload = { ...this.formData };
        if (this.editing) {
          delete payload.real_product_sku;
          delete payload.supplier_idx;
          await PATCH_ProductLink(this.editing.id, payload);
          this.notify.spawnNotification({
            type: "positive",
            msg: this.$t("suppliers.linked.toast.updated"),
          });
        } else {
          payload.supplier_idx = this.supplier?.idx;
          await POST_ProductLink(payload);
          this.notify.spawnNotification({
            type: "positive",
            msg: this.$t("suppliers.linked.toast.created"),
          });
        }
        this.formVisible = false;
        this.fetchLinks();
      } catch (err) {
        this.handleApiError(err);
        if (Object.keys(this.errors).length === 0) {
          this.notify.spawnNotification({
            type: "negative",
            msg: extractApiMessage(err, this.$t("notifications.error")),
          });
        }
      } finally {
        this.formBusy = false;
      }
    },
    async setPreferred(row) {
      try {
        await POST_SetPreferredLink(row.id);
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("suppliers.linked.toast.set_preferred"),
        });
        this.fetchLinks();
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      }
    },
    async unsetPreferred(row) {
      try {
        await POST_UnsetPreferredLink(row.id);
        this.notify.spawnNotification({
          type: "warning",
          msg: this.$t("suppliers.linked.toast.unset_preferred"),
        });
        this.fetchLinks();
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      }
    },
    confirmDelete(row) {
      this.deleteTarget = row;
      this.deleteVisible = true;
    },
    async executeDelete() {
      if (!this.deleteTarget) return;
      try {
        await DELETE_ProductLink(this.deleteTarget.id);
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("suppliers.linked.toast.deleted"),
        });
        this.deleteVisible = false;
        this.deleteTarget = null;
        this.fetchLinks();
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.linked-tab {
  display: flex;
  flex-direction: column;
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
}
.suppliers-primary-btn {
  background: var(--c-support-400);
  border-color: var(--c-support-400);
  color: var(--c-basic-100);
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
.row-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
}
.form-error {
  margin: 0;
  margin-top: 2px;
}
.sku-preview {
  padding: var(--spacing-300, 12px);
}
.sku-preview__image {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 220px;
  background: var(--c-basic-100);
  border-radius: var(--radius-sm);
  overflow: hidden;
  img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
}
.sku-preview__placeholder {
  font-size: 48px;
  color: var(--c-basic-400);
}
.sku-preview__meta {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 12px;
  dt {
    color: var(--c-basic-600);
  }
  dd {
    margin: 0;
    word-break: break-word;
  }
}
</style>
