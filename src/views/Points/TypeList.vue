<template>
  <div class="p-500 fs-300 t-basic-800 h-100 ov-h">
    <div
      class="bg-basic-100 b-basic-300 br-50 h-100 ovy-auto pl-500 pt-500 pb-500 pr-500"
    >
      <div class="flex ai-ct mb-400">
        <h1 class="fs-700 fw-600">{{ $t("dp.types") }}</h1>
      </div>

      <!-- Inline create row -->
      <div class="create-row mb-400">
        <div class="create-row__fields">
          <BasicInput
            v-model="newType.code"
            :placeholder="$t('dp.code')"
            class="create-row__input"
          />
          <BasicInput
            v-model="newType.name"
            :placeholder="$t('dp.name')"
            class="create-row__input"
          />
          <div class="flex ai-ct gap-200">
            <Switcher
              :label="$t('dp.is_carrier')"
              :selected="newType.is_carrier"
              @onSelect="newType.is_carrier = !newType.is_carrier"
            />
          </div>
        </div>
        <BasicButton
          :text="$t('common.add')"
          icon="plus"
          class="bg-support-400 t-basic-100"
          @click="createType"
        />
      </div>

      <Loader v-show="loading" />

      <DataTable
        v-show="!loading"
        :columns="columns"
        :rows="types"
        row-key="id"
        :empty-text="$t('dp.no_types')"
        @row-click="onRowClick"
      >
        <template #cell-lock="{ row }">
          <font-awesome-icon
            v-if="row.is_carrier"
            icon="lock"
            class="t-basic-400"
          />
        </template>
        <template #cell-is_carrier="{ value }">
          <StatusBadge
            v-if="value"
            :label="$t('dp.carrier')"
            variant="informative"
          />
          <StatusBadge v-else :label="$t('dp.custom')" variant="neutral" />
        </template>
        <template #cell-is_active="{ value }">
          <StatusBadge
            :label="value ? $t('dp.active') : $t('dp.inactive')"
            :variant="value ? 'positive' : 'negative'"
          />
        </template>
      </DataTable>
    </div>

    <!-- Edit modal -->
    <div
      v-if="editingType"
      class="type-modal-backdrop"
      @click.self="cancelEdit"
    >
      <div class="type-modal">
        <h2 class="fs-500 fw-600 mb-400">
          {{ editingType.name || editingType.code }}
        </h2>
        <div class="detail-grid mb-400">
          <div class="detail-field">
            <label class="detail-label">{{ $t("dp.code") }}</label>
            <BasicInput v-model="editForm.code" />
          </div>
          <div class="detail-field">
            <label class="detail-label">{{ $t("dp.name") }}</label>
            <BasicInput v-model="editForm.name" />
          </div>
          <div class="detail-field">
            <label class="detail-label">{{ $t("dp.sort_order") }}</label>
            <BasicInput v-model="editForm.sort_order" />
          </div>
        </div>
        <div class="flex ai-ct gap-200 mb-400">
          <Switcher
            :label="$t('dp.is_carrier')"
            :selected="editForm.is_carrier"
            @onSelect="editForm.is_carrier = !editForm.is_carrier"
          />
          <Switcher
            :label="$t('dp.is_active')"
            :selected="editForm.is_active"
            @onSelect="editForm.is_active = !editForm.is_active"
          />
        </div>
        <div class="flex ai-ct jc-sb gap-200">
          <BasicButton
            text=""
            icon="trash-can"
            class="bg-negative-100 t-negative-300"
            @click="showDeleteConfirm = true"
          />
          <div class="flex ai-ct gap-200">
            <BasicButton
              :text="$t('common.cancel')"
              class="bg-basic-200 t-basic-600"
              @click="cancelEdit"
            />
            <BasicButton
              :text="$t('common.save')"
              class="bg-support-400 t-basic-100"
              @click="saveType"
            />
          </div>
        </div>
      </div>
    </div>

    <Confirmation-modal
      :visible="showDeleteConfirm"
      @accept="deleteType"
      @reject="showDeleteConfirm = false"
    >
      <template #header
        ><h2>{{ $t("dp.confirm_delete_title") }}</h2></template
      >
      <template #description
        ><p>{{ $t("dp.confirm_delete_type") }}</p></template
      >
    </Confirmation-modal>
  </div>
</template>

<script>
import { useLoaderStore } from "@/stores/loader";
import { useNotifyStore } from "@/stores/notify";
import {
  GET_Types,
  POST_Type,
  PATCH_Type,
  DELETE_Type,
} from "@/api/deliverypoints/api";
import ConfirmationModal from "@/functionals/Confirmation-modal/index.vue";
import { extractApiMessage } from "@/composables/useFormErrors";

export default {
  name: "TypeList",
  components: { ConfirmationModal },
  setup() {
    const loader = useLoaderStore();
    const notify = useNotifyStore();
    return { loader, notify };
  },
  data() {
    return {
      types: [],
      loading: false,
      editingType: null,
      showDeleteConfirm: false,
      newType: {
        code: "",
        name: "",
        is_carrier: false,
      },
      editForm: {
        code: "",
        name: "",
        is_carrier: false,
        is_active: true,
        sort_order: 0,
      },
    };
  },
  computed: {
    columns() {
      return [
        { key: "lock", label: "", sortable: false, width: "36px" },
        {
          key: "code",
          label: this.$t("dp.code"),
          sortable: false,
          width: "1fr",
        },
        {
          key: "name",
          label: this.$t("dp.name"),
          sortable: false,
          width: "2fr",
        },
        {
          key: "is_carrier",
          label: this.$t("dp.is_carrier"),
          sortable: false,
          width: "120px",
        },
        {
          key: "is_active",
          label: this.$t("dp.status"),
          sortable: false,
          width: "100px",
        },
        {
          key: "sort_order",
          label: this.$t("dp.sort_order"),
          sortable: false,
          width: "80px",
        },
      ];
    },
  },
  mounted() {
    this.fetchTypes();
  },
  methods: {
    async fetchTypes() {
      this.loading = true;
      try {
        const { data } = await GET_Types({ page_size: 100 });
        this.types = data.results || [];
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.loading = false;
      }
    },
    onRowClick(row) {
      if (row.is_carrier) {
        this.notify.spawnNotification({
          type: "informative",
          msg: this.$t("dp.carrier_read_only"),
        });
        return;
      }
      this.editingType = row;
      this.editForm = {
        code: row.code || "",
        name: row.name || "",
        is_carrier: row.is_carrier ?? false,
        is_active: row.is_active ?? true,
        sort_order: row.sort_order ?? 0,
      };
    },
    cancelEdit() {
      this.editingType = null;
    },
    async createType() {
      if (!this.newType.code || !this.newType.name) {
        this.notify.spawnNotification({
          type: "negative",
          msg: this.$t("categories.empty_fields"),
        });
        return;
      }
      this.loader.loaderStart();
      try {
        await POST_Type({
          code: this.newType.code,
          name: this.newType.name,
          is_carrier: this.newType.is_carrier,
        });
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("dp.type_created"),
        });
        this.notify.spawnNotification({
          type: "informative",
          msg: this.$t("dp.type_created_order_warning"),
          timeout: 12000,
        });
        this.newType = { code: "", name: "", is_carrier: false };
        await this.fetchTypes();
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.save_error")),
        });
      } finally {
        this.loader.loaderFinish();
      }
    },
    async saveType() {
      this.loader.loaderStart();
      try {
        await PATCH_Type(this.editingType.id, {
          code: this.editForm.code,
          name: this.editForm.name,
          is_carrier: this.editForm.is_carrier,
          is_active: this.editForm.is_active,
          sort_order: this.editForm.sort_order,
        });
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("dp.type_saved"),
        });
        this.editingType = null;
        await this.fetchTypes();
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.save_error")),
        });
      } finally {
        this.loader.loaderFinish();
      }
    },
    async deleteType() {
      this.showDeleteConfirm = false;
      this.loader.loaderStart();
      try {
        await DELETE_Type(this.editingType.id);
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("dp.type_deleted"),
        });
        this.editingType = null;
        await this.fetchTypes();
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
.create-row {
  display: flex;
  align-items: center;
  gap: var(--space-200);
  padding: 16px;
  border: 1px solid var(--c-basic-300);
  border-radius: var(--radius-md);
  background: var(--c-basic-200);
  flex-wrap: wrap;
}

.create-row__fields {
  display: flex;
  align-items: center;
  gap: var(--space-200);
  flex: 1;
  flex-wrap: wrap;
}

.create-row__input {
  flex: 1;
  min-width: 140px;
  max-width: 220px;
}

.type-modal-backdrop {
  position: fixed;
  inset: 0;
  background: var(--overlay-heavy);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
}

.type-modal {
  background: var(--c-basic-100);
  border: 1px solid var(--c-basic-300);
  border-radius: var(--radius-lg);
  padding: 28px;
  min-width: min(400px, 95vw);
  max-width: 560px;
  width: 100%;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: var(--space-200);
}

.detail-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-label {
  font-size: var(--fs-200);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--c-basic-500);
}
</style>
