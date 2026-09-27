<template>
  <div class="p-12 fs-300 t-body h-100 ov-h">
    <Teleport to="#layout-extender-toolbar-left" defer>
      <span class="fs-300 fw-600 t-body">{{ $t("layout_extender.list_title") }}</span>
      <Dropdown
        v-if="channelOptions.length"
        :values="channelOptions"
        :selected="selectedChannel ? [selectedChannel] : []"
        :placeholder="$t('layout_extender.all_channels')"
        class="le-list__channel-dropdown"
        @onSelect="onChannelFilter"
      />
    </Teleport>

    <div class="page-card h-100 ovy-auto">
      <Loader v-show="loading" />

      <DataTable
        v-show="!loading"
        :columns="columns"
        :rows="filteredItems"
        row-key="uid"
        :empty-text="$t('layout_extender.no_items')"
        @row-click="onRowClick"
      >
        <template #cell-name="{ row }">{{ row.name || row.uid }}</template>

        <template #cell-type="{ row }">
          <span class="bg-hover t-body fs-200 ph-2 rounded">
            {{ row.type === "header" ? "Header" : "Footer" }}
          </span>
        </template>

        <template #cell-language="{ row }">
          <span class="t-secondary">{{ (row.language || "").toUpperCase() }}</span>
        </template>

        <template #cell-channels="{ row }">
          <div v-if="(row.channels || []).length" class="flex gap-1 flex-wrap">
            <span
              v-for="ch in row.channels"
              :key="ch"
              class="bg-hover t-body fs-200 ph-2 rounded"
            >{{ ch }}</span>
          </div>
          <span v-else class="t-muted">—</span>
        </template>

        <template #cell-status="{ row }">
          <StatusBadge
            :label="row.is_published ? $t('layout_extender.published') : $t('layout_extender.draft')"
            :variant="row.is_published ? 'positive' : 'informative'"
          />
        </template>

        <template #cell-updated_at="{ row }">
          <div>
            <span class="t-secondary fs-300">
              {{ row.updated_at ? new Date(row.updated_at).toLocaleDateString("en-GB") : "—" }}
            </span>
            <p v-if="row.updated_by" class="t-muted fs-200">by {{ row.updated_by }}</p>
          </div>
        </template>

        <template #cell-actions="{ row }">
          <div class="le-list__actions">
            <BasicButton custom size="sm" :label="$t('common.edit')" class="btn-ghost" @click="onEdit(row)">
              <template #custom><FontAwesomeIcon icon="pen" /></template>
            </BasicButton>
            <BasicButton custom size="sm" :label="$t('common.preview')" class="btn-ghost" @click="onPreview(row)">
              <template #custom><FontAwesomeIcon icon="eye" /></template>
            </BasicButton>
            <BasicButton custom size="sm" :label="$t('common.copy')" class="btn-ghost" @click="onCopy(row)">
              <template #custom><FontAwesomeIcon icon="copy" /></template>
            </BasicButton>
            <BasicButton
              v-if="!row.is_system"
              custom
              size="sm"
              :label="$t('common.delete')"
              class="btn-danger"
              @click="onDeleteClick(row)"
            >
              <template #custom><FontAwesomeIcon icon="trash-can" /></template>
            </BasicButton>
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
          class="btn-secondary"
          @click="closeCopy"
        />
        <BasicButton
          :text="$t('layout_extender.copy_action')"
          class="btn-primary"
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
        {
          key: "name",
          label: this.$t("layout_extender.name"),
          width: "1fr",
          truncate: true,
          title: (row) => row.name || row.uid,
        },
        { key: "type", label: this.$t("layout_extender.type"), width: "120px", priority: 2 },
        { key: "language", label: this.$t("layout_extender.language"), width: "100px", priority: 2 },
        { key: "channels", label: this.$t("layout_extender.channels"), width: "160px", priority: 2 },
        { key: "status", label: this.$t("layout_extender.status"), width: "120px", truncate: true },
        { key: "updated_at", label: this.$t("layout_extender.updated"), width: "160px", priority: 2 },
        { key: "actions", label: this.$t("layout_extender.actions"), align: "right", actions: true },
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

.le-copy {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.le-copy__label {
  font-size: var(--fs-200);
  font-weight: 600;
  color: var(--text-secondary);

  &:not(:first-child) {
    margin-top: var(--space-5);
  }
}

.le-list__actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  justify-content: flex-end;
}

@media only screen and (max-width: 768px) {
  .p-12 {
    padding: var(--space-4) !important;
  }
}
</style>
