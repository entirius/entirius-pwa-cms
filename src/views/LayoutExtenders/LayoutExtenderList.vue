<template>
  <div class="p-500 fs-300 t-basic-800 h-100 ov-h">
    <Teleport to="#layout-extender-toolbar-left" defer>
      <span class="fs-300 fw-600 t-basic-700">{{ $t("layout_extender.list_title") }}</span>
      <Dropdown
        v-if="channelOptions.length"
        :values="channelOptions"
        :selected="selectedChannel ? [selectedChannel] : []"
        :placeholder="$t('layout_extender.all_channels')"
        class="le-list__channel-dropdown"
        @onSelect="onChannelFilter"
      />
    </Teleport>

    <div class="bg-basic-100 b-basic-300 br-50 h-100 ovy-auto p-500">
      <Loader v-show="loading" />

      <DataTable
        v-show="!loading"
        :columns="columns"
        :rows="filteredItems"
        row-key="uid"
        :empty-text="$t('layout_extender.no_items')"
        @row-click="onRowClick"
      >
        <template #cell-name="{ row }">
          <span class="le-list__name-cell">{{ row.name || row.uid }}</span>
        </template>

        <template #cell-type="{ row }">
          <span class="bg-basic-300 t-basic-700 fs-200 ph-100 br-50">
            {{ row.type === "header" ? "Header" : "Footer" }}
          </span>
        </template>

        <template #cell-language="{ row }">
          <span class="t-basic-600">{{ (row.language || "").toUpperCase() }}</span>
        </template>

        <template #cell-channels="{ row }">
          <div class="flex gap-50 flex-wrap">
            <span
              v-for="ch in (row.channels || [])"
              :key="ch"
              class="bg-basic-300 t-basic-700 fs-200 ph-100 br-50"
            >{{ ch }}</span>
          </div>
        </template>

        <template #cell-status="{ row }">
          <StatusBadge
            :label="row.is_published ? $t('layout_extender.published') : $t('layout_extender.draft')"
            :variant="row.is_published ? 'positive' : 'informative'"
          />
        </template>

        <template #cell-updated_at="{ row }">
          <div>
            <span class="t-basic-600 fs-300">
              {{ row.updated_at ? new Date(row.updated_at).toLocaleDateString("en-GB") : "—" }}
            </span>
            <p v-if="row.updated_by" class="t-basic-500 fs-200">by {{ row.updated_by }}</p>
          </div>
        </template>

        <template #cell-actions="{ row }">
          <div class="le-list__actions">
            <span class="le-list__action" @click.stop="onEdit(row)">
              <FontAwesomeIcon icon="pen-to-square" />
            </span>
            <span class="le-list__action" @click.stop="onPreview(row)">
              <FontAwesomeIcon icon="eye" />
            </span>
            <span class="le-list__action" @click.stop="onCopy(row)">
              <FontAwesomeIcon icon="copy" />
            </span>
            <span
              v-if="!row.is_system"
              class="le-list__action le-list__action--danger"
              @click.stop="onDeleteClick(row)"
            >
              <FontAwesomeIcon icon="trash-can" />
            </span>
          </div>
        </template>
      </DataTable>
    </div>

    <ConfirmationModal
      :visible="confirmVisible"
      @accept="onDeleteConfirm"
      @reject="confirmVisible = false"
    >
      <template #header>
        <h2>{{ $t("layout_extender.delete_confirm") }}</h2>
      </template>
    </ConfirmationModal>

    <ConfirmationModal
      :visible="copyVisible"
      @accept="onCopyConfirm"
      @reject="closeCopy"
    >
      <template #header>
        <h2>{{ $t("layout_extender.copy_title") }}</h2>
      </template>
      <template #description>
        <div class="le-copy">
          <label class="le-copy__label">{{ $t("layout_extender.copy_target_channel") }}</label>
          <Dropdown
            :values="copyChannelOptions"
            :selected="copyTargetChannel ? [copyTargetChannel] : []"
            :placeholder="$t('layout_extender.copy_select_channel')"
            @onSelect="onCopyTargetSelect"
          />
          <label class="le-copy__label">{{ $t("layout_extender.copy_name") }}</label>
          <BasicInput v-model="copyName" />
        </div>
      </template>
      <template #footer>
        <BasicButton
          :text="$t('common.cancel')"
          class="bg-basic-200 t-basic-600"
          @click="closeCopy"
        />
        <BasicButton
          :text="$t('layout_extender.copy_action')"
          icon="copy"
          class="bg-support-400 t-basic-100"
          :disabled="!copyTargetChannel || copying"
          @click="onCopyConfirm"
        />
      </template>
    </ConfirmationModal>
  </div>
</template>

<script>
import { GET_Content, GET_ContentTypes, DELETE_Content, POST_Content } from "@/api/contentDB/api";
import { useLoaderStore } from "@/stores/loader";
import { useNotifyStore } from "@/stores/notify";
import { useContentDBChannelStore } from "@/stores/contentDBChannel";
import ConfirmationModal from "@/functionals/Confirmation-modal/index.vue";
import { extractApiMessage } from "@/composables/useFormErrors";

export default {
  name: "LayoutExtenderList",
  components: { ConfirmationModal },
  setup() {
    const loader = useLoaderStore();
    const notify = useNotifyStore();
    const contentDBChannelStore = useContentDBChannelStore();
    return { loader, notify, contentDBChannelStore };
  },
  data() {
    return {
      items: [],
      loading: false,
      confirmVisible: false,
      toDelete: null,
      selectedChannel: null,
      copyVisible: false,
      copyRow: null,
      copyTargetChannel: null,
      copyName: "",
      copying: false,
    };
  },
  computed: {
    columns() {
      return [
        { key: "name", label: this.$t("layout_extender.name"), width: "1fr" },
        { key: "type", label: this.$t("layout_extender.type"), width: "120px" },
        { key: "language", label: this.$t("layout_extender.language"), width: "100px" },
        { key: "channels", label: this.$t("layout_extender.channels"), width: "160px" },
        { key: "status", label: this.$t("layout_extender.status"), width: "120px" },
        { key: "updated_at", label: this.$t("layout_extender.updated"), width: "160px" },
        { key: "actions", label: this.$t("layout_extender.actions"), width: "160px", align: "right" },
      ];
    },
    channelOptions() {
      return this.contentDBChannelStore.channels.map((ch) => ({
        label: ch.name || ch.idx,
        value: ch.idx,
      }));
    },
    filteredItems() {
      if (!this.selectedChannel) return this.items;
      return this.items.filter((row) => (row.channels || []).includes(this.selectedChannel));
    },
    copyChannelOptions() {
      return this.contentDBChannelStore.channels.map((ch) => ({
        label: ch.name || ch.idx,
        value: ch.idx,
      }));
    },
  },
  mounted() {
    this.fetchItems();
    this.contentDBChannelStore.fetchChannelsAndLanguages();
  },
  methods: {
    onChannelFilter(val) {
      this.selectedChannel = this.selectedChannel === val ? null : val;
    },
    async fetchItems() {
      this.loading = true;
      try {
        const typesRes = await GET_ContentTypes({ CDB_TYPE: "layout-extender" });
        const types = typesRes.data?.data || [];
        const allItems = [];
        for (const ct of types) {
          try {
            const { data } = await GET_Content({
              CDB_TYPE: "layout-extender",
              type: ct.slug,
              limit: 100,
            });
            const docs = data.data || [];
            docs.forEach((doc) => {
              allItems.push({
                uid: doc.uid,
                name: doc.name || doc.uid,
                type: ct.slug,
                language: doc.language || "",
                channels: (doc.channels || []).map((c) => (typeof c === "string" ? c : c.idx)),
                is_published: !!doc.is_published,
                is_system: !!doc.is_system,
                updated_at: doc.updated_at,
                updated_by: doc.updated_by || "",
              });
            });
          } catch {
            // skip types with no documents
          }
        }
        this.items = allItems;
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
      this.$router.push(`/pages/layout-extender/${row.type}/${row.uid}`);
    },
    onEdit(row) {
      this.$router.push(`/pages/layout-extender/${row.type}/${row.uid}`);
    },
    onPreview(row) {
      // Preview — open in new tab or show preview modal (future feature)
      this.notify.spawnNotification({ type: "informative", msg: this.$t("layout_extender.preview") });
    },
    onCopy(row) {
      this.copyRow = row;
      this.copyTargetChannel = null;
      this.copyName = this.suggestCopyName(row.name || row.uid, null);
      this.copyVisible = true;
    },
    closeCopy() {
      this.copyVisible = false;
      this.copyRow = null;
      this.copyTargetChannel = null;
      this.copyName = "";
    },
    suggestCopyName(baseName, channelIdx) {
      const base = (baseName || "").replace(/\s*\([^)]*\)\s*$/, "").trim();
      return channelIdx ? `${base} (${channelIdx})` : base;
    },
    onCopyTargetSelect(val) {
      this.copyTargetChannel = this.copyTargetChannel === val ? null : val;
      this.copyName = this.suggestCopyName(this.copyRow?.name, this.copyTargetChannel);
    },
    async onCopyConfirm() {
      if (!this.copyRow || !this.copyTargetChannel || this.copying) {
        if (!this.copyTargetChannel) {
          this.notify.spawnNotification({
            type: "informative",
            msg: this.$t("layout_extender.copy_no_channel"),
          });
        }
        return;
      }
      this.copying = true;
      this.loader.loaderStart();
      try {
        // The list rows carry only summary data — fetch the full source doc to clone its content.
        const { data } = await GET_Content({
          CDB_TYPE: "layout-extender",
          type: this.copyRow.type,
          uid: this.copyRow.uid,
        });
        const doc = data.data || data;
        await POST_Content({
          CDB_TYPE: "layout-extender",
          type: this.copyRow.type,
          name: this.copyName || this.suggestCopyName(doc.name, this.copyTargetChannel),
          language: doc.language || null,
          channels: [this.copyTargetChannel],
          content: doc.content || { items: [] },
          attributes: {},
          routes: [],
          meta: doc.meta || {},
        });
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("layout_extender.copied"),
        });
        this.closeCopy();
        await this.fetchItems();
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.copying = false;
        this.loader.loaderFinish();
      }
    },
    onDeleteClick(row) {
      this.toDelete = row;
      this.confirmVisible = true;
    },
    async onDeleteConfirm() {
      if (!this.toDelete) return;
      this.confirmVisible = false;
      this.loader.loaderStart();
      try {
        await DELETE_Content({
          CDB_TYPE: "layout-extender",
          type: this.toDelete.type,
          uid: this.toDelete.uid,
        });
        this.items = this.items.filter((i) => i.uid !== this.toDelete.uid);
        this.notify.spawnNotification({
          type: "informative",
          msg: this.$t("notifications.doc_deleted"),
        });
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.loader.loaderFinish();
        this.toDelete = null;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.le-list__channel-dropdown {
  min-width: 160px;
  max-width: 240px;
}

.le-list__name-cell {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.le-copy {
  display: flex;
  flex-direction: column;
  gap: var(--space-100);
}

.le-copy__label {
  font-size: 12px;
  font-weight: 600;
  color: var(--c-basic-600);

  &:not(:first-child) {
    margin-top: var(--space-200);
  }
}

.le-list__actions {
  display: flex;
  align-items: center;
  gap: 4px;
  justify-content: flex-end;
}

.le-list__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--c-basic-500);
  transition: background 0.1s, color 0.1s;

  &:hover {
    background: var(--c-basic-200);
    color: var(--c-basic-700);
  }

  &--danger:hover {
    background: var(--c-negative-100);
    color: var(--c-negative-200);
  }
}

@media only screen and (max-width: 768px) {
  .p-500 {
    padding: 16px !important;
  }
}
</style>
