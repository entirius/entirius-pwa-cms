<template>
  <div class="page-pad fs-300 t-body h-100 ov-h">
    <!-- Left toolbar -->
    <Teleport to="#layout-extender-toolbar-left" defer>
      <BackBar
        @back="$router.push('/pages/layout-extender')"
      />
      <div v-if="!loading" class="nav-editor__toolbar-name">
        <span class="fw-600 t-body">{{ docName || $route.params.uid || "—" }}</span>
      </div>
      <ChannelMultiSelect
        v-if="!loading"
        v-model="selectedChannels"
        :channels="contentDBChannelStore.channels"
        :label="$t('layout_extender.channels')"
        :all-label="$t('layout_extender.all')"
        class="nav-editor__channel-dropdown"
      />
    </Teleport>

    <!-- Right toolbar -->
    <Teleport to="#layout-extender-toolbar-right" defer>
      <template v-if="!loading">
        <span
          v-if="isDirty"
          class="chip bg-warning-subtle t-warning"
          data-testid="nav-editor-unsaved-badge"
        >
          {{ $t("layout_extender.unsaved") }}
        </span>
        <BasicButton
          :text="$t('layout_extender.save_draft')"
          class="btn-outline"
          @click="saveDraft"
        />
        <BasicButton
          :text="$t('layout_extender.publish')"
          class="btn-primary"
          data-testid="nav-editor-publish"
          :disabled="!uid"
          @click="publish"
        />
      </template>
    </Teleport>

    <!-- Content -->
    <div class="page-card h-100 ovy-auto">
      <Loader block v-show="loading" />

      <template v-if="!loading">
        <draggable
          v-model="navigationItems"
          item-key="id"
          handle=".handle"
          ghost-class="bg-accent-subtle"
          :force-fallback="true"
          fallback-class="nav-drag-ghost"
          @change="markDirty"
        >
          <template #item="{ element, index }">
            <div class="nav-item">
              <!-- Item header row -->
              <div class="nav-item__row">
                <span class="handle t-muted pointer">
                  <FontAwesomeIcon icon="grip-vertical" />
                </span>
                <span class="nav-item__label fg-1 fw-500 t-body fs-300">{{ element.label || "—" }}</span>
                <span
                  class="nav-item__type fs-200 ph-2 rounded"
                  :class="element.display_as === 'megamenu' ? 'bg-accent-subtle t-strong' : 'bg-hover t-body'"
                  :data-testid="element.display_as === 'megamenu' ? 'nav-item-type-megamenu' : 'nav-item-type-link'"
                >
                  {{ element.display_as === "megamenu" ? $t("layout_extender.mega_menu") : $t("layout_extender.simple_link") }}
                </span>
                <SubscriberSetter
                  v-if="element.display_as === 'megamenu' && element.columns.length > 1"
                  :handyType="{ id: 'order-kit', label: $t('layout_extender.reorder_columns') }"
                  :defaults="{
                    order: element.columns.map(c => c.id),
                    inserts: element.columns.reduce((o, c) => ({
                      ...o,
                      [c.id]: { core_type: c.type, title: c.type === 'links' ? c.heading : ($t('layout_extender.banner') + (c.caption ? ': ' + c.caption : '')) }
                    }), {})
                  }"
                  @on_AssetPass="reorderColumns(index, $event)"
                >
                  <BasicButton
                    custom
                    :stop="false"
                    :label="$t('layout_extender.reorder_columns')"
                    class="btn-ghost"
                  >
                    <template #custom><FontAwesomeIcon icon="grip" /></template>
                  </BasicButton>
                </SubscriberSetter>
                <BasicButton
                  v-if="element.display_as === 'megamenu'"
                  custom
                  :label="$t('layout_extender.columns')"
                  class="btn-ghost nav-action"
                  :class="{ 'nav-action--rotated': expandedItems.includes(element.id) }"
                  :aria-expanded="expandedItems.includes(element.id)"
                  @click="toggleExpand(element.id)"
                >
                  <template #custom><FontAwesomeIcon icon="chevron-down" /></template>
                </BasicButton>
                <BasicButton
                  custom
                  :label="$t('common.edit')"
                  class="btn-ghost nav-action"
                  @click="openEditItem(element, index)"
                >
                  <template #custom><FontAwesomeIcon icon="pen" /></template>
                </BasicButton>
                <BasicButton
                  custom
                  :label="$t('common.delete')"
                  class="btn-danger nav-action nav-action--danger"
                  @click="removeItem(index)"
                >
                  <template #custom><FontAwesomeIcon icon="trash-can" /></template>
                </BasicButton>
              </div>

              <!-- Expanded megamenu columns -->
              <div
                v-if="element.display_as === 'megamenu' && expandedItems.includes(element.id)"
                class="nav-item__expanded"
              >
                <p class="section-label mb-5">{{ $t("layout_extender.columns") }}</p>

                <div class="nav-columns">
                  <div
                    v-for="(col, colIdx) in element.columns"
                    :key="col.id"
                    class="nav-column"
                  >
                    <!-- Links column -->
                    <template v-if="col.type === 'links'">
                      <div class="nav-column__header">
                        <div class="nav-column__heading-group">
                          <template v-if="editingHeading?.itemIndex === index && editingHeading?.colIndex === colIdx">
                            <BasicInput
                              :modelValue="col.heading"
                              @update:modelValue="col.heading = $event"
                              @blur="finishEditHeading"
                              @keydown.enter="finishEditHeading"
                              class="nav-column__heading-input"
                            />
                          </template>
                          <template v-else>
                            <span
                              class="fw-600 fs-300 t-body pointer"
                              @dblclick="startEditHeading(index, colIdx)"
                            >{{ col.heading || $t("layout_extender.heading") }}</span>
                            <BasicButton
                              v-if="channelLanguages.length > 1"
                              custom
                              size="sm"
                              :label="$t('layout_extender.translations')"
                              class="btn-ghost"
                              @click="openColumnTranslation(index, colIdx)"
                            >
                              <template #custom><FontAwesomeIcon icon="language" /></template>
                            </BasicButton>
                          </template>
                        </div>
                        <BasicButton
                          custom
                          size="sm"
                          :label="$t('common.delete')"
                          class="btn-danger"
                          @click="removeColumn(index, colIdx)"
                        >
                          <template #custom><FontAwesomeIcon icon="trash-can" /></template>
                        </BasicButton>
                      </div>
                      <draggable
                        v-model="col.links"
                        item-key="id"
                        handle=".link-handle"
                        ghost-class="bg-accent-subtle"
                        @change="markDirty"
                      >
                        <template #item="{ element: link, index: linkIdx }">
                          <div class="nav-link-row" @click="openEditLink(element, index, col, colIdx, link, linkIdx)">
                            <span class="link-handle t-muted">
                              <FontAwesomeIcon icon="grip-vertical" style="font-size: var(--fs-200)" />
                            </span>
                            <span class="nav-link-row__text">
                              <span class="t-muted">·</span> {{ link.label }}
                            </span>
                            <span
                              class="nav-link-row__delete"
                              @click.stop="removeLink(index, colIdx, linkIdx)"
                            >
                              <FontAwesomeIcon icon="xmark" />
                            </span>
                          </div>
                        </template>
                      </draggable>
                      <a class="nav-add-link" @click="openAddLink(element, index, col, colIdx)">
                        + {{ $t("layout_extender.add_link") }}
                      </a>
                    </template>

                    <!-- Banner column -->
                    <template v-else-if="col.type === 'banner'">
                      <div class="nav-column__header">
                        <span class="fw-600 fs-300 t-body">{{ $t("layout_extender.banner") }}</span>
                        <BasicButton
                          custom
                          size="sm"
                          :label="$t('common.delete')"
                          class="btn-danger"
                          @click="removeColumn(index, colIdx)"
                        >
                          <template #custom><FontAwesomeIcon icon="trash-can" /></template>
                        </BasicButton>
                      </div>
                      <div v-if="col.media_url" class="mb-2">
                        <img
                          v-if="!brokenImages.has(col.media_url)"
                          :src="resolveMediaUrl(col.media_url)"
                          :alt="col.alt_text || ''"
                          class="nav-banner-image"
                          @error="onImageError(col.media_url)"
                        />
                        <div v-else class="nav-banner-placeholder">
                          <FontAwesomeIcon icon="image" class="t-muted" style="font-size: var(--fs-500)" />
                        </div>
                      </div>
                      <p v-if="col.caption" class="fs-200 t-secondary mb-2">{{ col.caption }}</p>
                      <button class="nav-btn-outline" @click="openEditColumn(element, index, col, colIdx)">
                        {{ $t("layout_extender.edit_banner") }}
                      </button>
                    </template>
                  </div>
                </div>

                <!-- Add column buttons -->
                <div class="flex gap-5 mt-8">
                  <button
                    class="nav-btn-outline"
                    :disabled="element.columns.length >= 4"
                    @click="addLinksColumn(index)"
                  >
                    + {{ $t("layout_extender.add_column") }}
                  </button>
                  <button
                    class="nav-btn-outline"
                    :disabled="element.columns.length >= 4"
                    @click="addBannerColumn(index)"
                  >
                    + {{ $t("layout_extender.add_banner") }}
                  </button>
                </div>
              </div>
            </div>
          </template>
        </draggable>

        <div v-if="!navigationItems.length" class="nav-empty">
          {{ $t("layout_extender.no_items") }}
        </div>

        <BasicButton
          :text="$t('layout_extender.add_item')"
          icon="plus"
          class="bg-accent-fill t-on-accent-fill mt-8"
          data-testid="nav-editor-add-item"
          @click="openAddItem"
        />
      </template>
    </div>

    <!-- Edit item modal -->
    <EditMenuItemModal
      :visible="editItemVisible"
      :item="editingItem"
      :languages="channelLanguages"
      :default-language="defaultLang"
      :channel-idx="pickerChannelIdx"
      @save="onItemSave"
      @close="editItemVisible = false"
    />

    <!-- Edit link modal -->
    <EditLinkModal
      :visible="editLinkVisible"
      :link="editingLink"
      :languages="channelLanguages"
      :default-language="defaultLang"
      :channel-idx="pickerChannelIdx"
      @save="onLinkSave"
      @close="editLinkVisible = false"
    />

    <!-- Edit banner modal -->
    <EditBannerModal
      :visible="editBannerVisible"
      :banner="editingBanner"
      :languages="channelLanguages"
      :default-language="defaultLang"
      :channel-idx="pickerChannelIdx"
      @save="onBannerSave"
      @close="editBannerVisible = false"
    />

    <!-- Column heading translations drawer -->
    <TranslationsDrawer
      :visible="!!translatingColumnCtx"
      :title="$t('layout_extender.heading')"
      :languages="channelLanguages"
      :default-language="defaultLang"
      :values="translatingColumnValues"
      @cancel="translatingColumnCtx = null"
      @save="onColumnHeadingSave"
    />
  </div>
</template>

<script>
import draggable from "vuedraggable";
import { GET_Content, PUT_Content, PUBLISH_Content } from "@/api/contentDB/api";
import { useLoaderStore } from "@/stores/loader";
import { useNotifyStore } from "@/stores/notify";
import { useContentDBChannelStore } from "@/stores/contentDBChannel";
import { usePimChannelStore } from "@/stores/pimChannel";
import EditMenuItemModal from "@/functionals/EditMenuItemModal.vue";
import EditLinkModal from "@/functionals/EditLinkModal.vue";
import EditBannerModal from "@/functionals/EditBannerModal.vue";
import { extractApiMessage } from "@/composables/useFormErrors";

function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default {
  name: "NavigationEditor",
  components: { draggable, EditMenuItemModal, EditLinkModal, EditBannerModal },
  setup() {
    const loader = useLoaderStore();
    const notify = useNotifyStore();
    const contentDBChannelStore = useContentDBChannelStore();
    const pimChannelStore = usePimChannelStore();
    return { loader, notify, contentDBChannelStore, pimChannelStore };
  },
  data() {
    return {
      loading: false,
      docName: "",
      uid: null,
      docType: null,
      language: null,
      isSystem: false,
      selectedChannels: [],
      navigationItems: [],
      originalJson: "",
      originalChannelsJson: "",
      expandedItems: [],
      brokenImages: new Set(),
      // edit item modal
      editItemVisible: false,
      editingItem: null,
      editingItemIndex: -1,
      // edit link modal
      editLinkVisible: false,
      editingLink: null,
      editingLinkContext: null,
      // edit banner modal
      editBannerVisible: false,
      editingBanner: null,
      editingBannerContext: null,
      // column heading inline edit & translation
      editingHeading: null,
      translatingColumnCtx: null,
    };
  },
  computed: {
    isDirty() {
      return JSON.stringify(this.navigationItems) !== this.originalJson
        || JSON.stringify(this.selectedChannels) !== this.originalChannelsJson;
    },
    channelLanguages() {
      return this.contentDBChannelStore.availableLanguages;
    },
    pickerChannelIdx() {
      return this.selectedChannels[0] || this.pimChannelStore.activeChannelIdx || process.env.VUE_APP_CHANNEL || "";
    },
    defaultLang() {
      if (this.selectedChannels.length === 1) {
        const ch = this.contentDBChannelStore.channels.find(
          (c) => c.idx === this.selectedChannels[0]
        );
        if (ch?.default_language) return ch.default_language.toLowerCase();
      }
      return this.contentDBChannelStore.defaultLanguage;
    },
    translatingColumnValues() {
      if (!this.translatingColumnCtx) return {};
      const { itemIndex, colIndex } = this.translatingColumnCtx;
      return this.navigationItems[itemIndex]?.columns[colIndex]?.heading_t9n || {};
    },
  },
  async mounted() {
    await this.init();
  },
  methods: {
    async init() {
      const { type, uid } = this.$route.params;
      this.docType = type || null;
      this.uid = uid || null;

      await Promise.all([
        this.contentDBChannelStore.fetchChannelsAndLanguages(),
        uid ? this.fetchDoc() : Promise.resolve(),
      ]);
    },
    async fetchDoc() {
      this.loading = true;
      try {
        const { data } = await GET_Content({
          CDB_TYPE: "layout-extender",
          type: this.docType,
          uid: this.uid,
        });
        const doc = data.data || data;
        this.docName = doc.name || "";
        this.language = doc.language || null;
        this.isSystem = doc.is_system || false;
        this.selectedChannels = (doc.channels || []).map((c) => (typeof c === "string" ? c : c.idx));

        const content = doc.content || {};
        this.navigationItems = Array.isArray(content.items) ? content.items : [];
        this.originalJson = JSON.stringify(this.navigationItems);
        this.originalChannelsJson = JSON.stringify(this.selectedChannels);
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.loading = false;
      }
    },
    markDirty() {
      // vuedraggable already mutates navigationItems — computed isDirty picks it up
    },
    resolveMediaUrl(path) {
      if (!path) return "";
      if (path.startsWith("http")) return path;
      return (process.env.VUE_APP_API_URL || "") + path;
    },
    onImageError(url) {
      this.brokenImages = new Set([...this.brokenImages, url]);
    },
    toggleExpand(id) {
      if (this.expandedItems.includes(id)) {
        this.expandedItems = this.expandedItems.filter((i) => i !== id);
      } else {
        this.expandedItems.push(id);
      }
    },
    // --- item CRUD ---
    openAddItem() {
      this.editingItem = null;
      this.editingItemIndex = -1;
      this.editItemVisible = true;
    },
    openEditItem(item, index) {
      this.editingItem = { ...item };
      this.editingItemIndex = index;
      this.editItemVisible = true;
    },
    onItemSave(itemData) {
      if (this.editingItemIndex === -1) {
        this.navigationItems.push({ id: uuid(), columns: [], sort_order: this.navigationItems.length, ...itemData });
      } else {
        const existing = this.navigationItems[this.editingItemIndex];
        this.navigationItems[this.editingItemIndex] = { ...existing, ...itemData };
      }
      this.editItemVisible = false;
    },
    removeItem(index) {
      this.navigationItems.splice(index, 1);
    },
    // --- column CRUD ---
    addLinksColumn(itemIndex) {
      const item = this.navigationItems[itemIndex];
      if (item.columns.length >= 4) {
        this.notify.spawnNotification({ type: "informative", msg: this.$t("layout_extender.max_columns_reached") });
        return;
      }
      item.columns.push({ id: uuid(), type: "links", heading: "", sort_order: item.columns.length, links: [] });
    },
    addBannerColumn(itemIndex) {
      const item = this.navigationItems[itemIndex];
      if (item.columns.length >= 4) {
        this.notify.spawnNotification({ type: "informative", msg: this.$t("layout_extender.max_columns_reached") });
        return;
      }
      this.editingBannerContext = { itemIndex, colIndex: -1 };
      this.editingBanner = null;
      this.editBannerVisible = true;
    },
    openEditColumn(item, itemIndex, col, colIdx) {
      if (col.type === "banner") {
        this.editingBannerContext = { itemIndex, colIndex: colIdx };
        this.editingBanner = { ...col };
        this.editBannerVisible = true;
      }
    },
    removeColumn(itemIndex, colIdx) {
      this.navigationItems[itemIndex].columns.splice(colIdx, 1);
    },
    reorderColumns(itemIndex, newOrder) {
      const item = this.navigationItems[itemIndex];
      const columnMap = Object.fromEntries(item.columns.map((c) => [c.id, c]));
      item.columns = newOrder.map((id) => columnMap[id]).filter(Boolean);
      item.columns.forEach((col, i) => { col.sort_order = i; });
      this.markDirty();
    },
    // --- link CRUD ---
    openAddLink(item, itemIndex, col, colIdx) {
      this.editingLinkContext = { itemIndex, colIndex: colIdx, linkIndex: -1 };
      this.editingLink = null;
      this.editLinkVisible = true;
    },
    openEditLink(item, itemIndex, col, colIdx, link, linkIdx) {
      this.editingLinkContext = { itemIndex, colIndex: colIdx, linkIndex: linkIdx };
      this.editingLink = { ...link };
      this.editLinkVisible = true;
    },
    onLinkSave(linkData) {
      const { itemIndex, colIndex, linkIndex } = this.editingLinkContext;
      const col = this.navigationItems[itemIndex].columns[colIndex];
      if (linkIndex === -1) {
        col.links.push({ id: uuid(), sort_order: col.links.length, ...linkData });
      } else {
        col.links[linkIndex] = { ...col.links[linkIndex], ...linkData };
      }
      this.editLinkVisible = false;
    },
    removeLink(itemIndex, colIdx, linkIdx) {
      this.navigationItems[itemIndex].columns[colIdx].links.splice(linkIdx, 1);
    },
    // --- banner save ---
    onBannerSave(bannerData) {
      const { itemIndex, colIndex } = this.editingBannerContext;
      if (colIndex === -1) {
        const item = this.navigationItems[itemIndex];
        item.columns.push({ id: uuid(), type: "banner", sort_order: item.columns.length, links: [], ...bannerData });
      } else {
        const existing = this.navigationItems[itemIndex].columns[colIndex];
        this.navigationItems[itemIndex].columns[colIndex] = { ...existing, ...bannerData };
      }
      this.editBannerVisible = false;
    },
    // --- column heading ---
    startEditHeading(itemIndex, colIndex) {
      this.editingHeading = { itemIndex, colIndex };
      this.$nextTick(() => {
        const input = this.$el.querySelector(".nav-column__heading-input input");
        if (input) input.focus();
      });
    },
    finishEditHeading() {
      this.editingHeading = null;
      this.markDirty();
    },
    openColumnTranslation(itemIndex, colIndex) {
      this.translatingColumnCtx = { itemIndex, colIndex };
    },
    onColumnHeadingSave({ values }) {
      const { itemIndex, colIndex } = this.translatingColumnCtx;
      this.navigationItems[itemIndex].columns[colIndex].heading_t9n = { ...values };
      this.translatingColumnCtx = null;
      this.markDirty();
    },
    // --- API ---
    // Renumber sort_order from current array order at every level (items,
    // columns, links). Drag-and-drop reorders the arrays but only columns
    // recompute sort_order on reorder; doing it here covers items and links
    // too, so the storefront (which sorts by sort_order) matches the CMS order.
    normalizeSortOrder() {
      return this.navigationItems.map((item, itemIdx) => ({
        ...item,
        sort_order: itemIdx,
        columns: (item.columns ?? []).map((col, colIdx) => ({
          ...col,
          sort_order: colIdx,
          links: (col.links ?? []).map((link, linkIdx) => ({
            ...link,
            sort_order: linkIdx,
          })),
        })),
      }));
    },
    buildPayload() {
      return {
        CDB_TYPE: "layout-extender",
        type: this.docType,
        uid: this.uid,
        name: this.docName,
        language: this.language,
        channels: this.selectedChannels,
        content: { items: this.normalizeSortOrder() },
        attributes: {},
        routes: [],
        meta: {},
      };
    },
    async saveDraft() {
      if (!this.uid) return;
      this.loader.loaderStart();
      try {
        await PUT_Content(this.buildPayload());
        this.originalJson = JSON.stringify(this.navigationItems);
        this.originalChannelsJson = JSON.stringify(this.selectedChannels);
        this.notify.spawnNotification({ type: "positive", msg: this.$t("layout_extender.saved") });
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.loader.loaderFinish();
      }
    },
    async publish() {
      if (!this.uid) return;
      this.loader.loaderStart();
      try {
        await PUT_Content(this.buildPayload());
        await PUBLISH_Content(this.buildPayload());
        this.originalJson = JSON.stringify(this.navigationItems);
        this.originalChannelsJson = JSON.stringify(this.selectedChannels);
        this.notify.spawnNotification({ type: "positive", msg: this.$t("layout_extender.published_success") });
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
@import "@/assets/scss/utils/media-query";

.nav-editor__toolbar-name {
  display: flex;
  align-items: center;
}

.nav-item {
  margin-bottom: var(--space-3);
}

.nav-item__row {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  padding: var(--space-3) var(--space-5);
  background: var(--surface-base);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-base);
  transition: background 0.1s;

  &:hover {
    background: var(--surface-raised);
  }

  // A phone keeps the name on the first line; the type badge and the actions share the second.
  @include max-tablet {
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-3);
    padding: var(--space-3);
  }
}

.nav-item__label {
  @include max-tablet {
    flex-basis: 80%;
  }
}

.nav-item__type {
  white-space: nowrap;

  @include max-tablet {
    margin-right: auto;
  }
}

// `.nav-action` / `--danger` on the row buttons are the e2e hooks (tests/e2e/08-navigation-editor.spec.js), not styles.
.nav-action--rotated {
  transform: rotate(180deg);
}

.nav-item__expanded {
  margin-top: var(--space-2);
  margin-left: var(--space-10);
  padding-left: var(--space-5);
  border-left: 2px solid var(--border-subtle);
}

.nav-columns {
  display: flex;
  gap: var(--space-5);
  flex-wrap: wrap;
}

.nav-column {
  min-width: 160px;
  flex: 1;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-base);
  padding: var(--space-3) var(--space-5);
}

.nav-editor__channel-dropdown {
  min-width: 160px;
  max-width: 220px;
}

.nav-column__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-2);
}

.nav-column__heading-group {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  flex: 1;
  min-width: 0;
}

.nav-column__heading-input {
  flex: 1;
}

.nav-link-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-1) 0;
  cursor: pointer;
  font-size: var(--fs-250);
  color: var(--text-body);

  &:hover {
    color: var(--text-accent);
  }

  &:hover .nav-link-row__delete {
    opacity: 1;
  }
}

.nav-link-row__text {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  flex: 1;
  min-width: 0;
}

.link-handle {
  cursor: grab;
  opacity: 0;
  transition: opacity 0.1s;
  font-size: var(--fs-200);
  flex-shrink: 0;
}

.nav-link-row:hover .link-handle {
  opacity: 1;
}

.nav-link-row__delete {
  opacity: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: var(--radius-base);
  color: var(--text-muted);
  cursor: pointer;
  transition: opacity 0.1s, color 0.1s;

  &:hover {
    color: var(--negative);
  }
}

.nav-add-link {
  display: inline-block;
  margin-top: var(--space-1);
  font-size: var(--fs-200);
  color: var(--text-accent);
  cursor: pointer;
  font-weight: 500;

  &:hover {
    text-decoration: underline;
  }
}

.nav-banner-image {
  width: 100%;
  max-height: 100px;
  object-fit: cover;
  border-radius: var(--radius-base);
}

.nav-banner-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 60px;
  background: var(--surface-raised);
  border-radius: var(--radius-base);
  border: 1px dashed var(--border-default);
}

.nav-btn-outline {
  display: inline-flex;
  align-items: center;
  height: var(--elem-height);
  padding: 0 var(--space-3);
  font-size: var(--fs-250);
  font-weight: 500;
  font-family: inherit;
  color: var(--text-body);
  background: var(--surface-base);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-base);
  cursor: pointer;
  transition: background 0.1s;

  &:hover {
    background: var(--surface-raised);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.nav-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-10);
  border-radius: var(--radius-base);
  border: 1px solid var(--border-subtle);
  color: var(--text-muted);
  min-height: 8rem;
}
</style>

<style lang="scss">
.nav-drag-ghost {
  max-width: 480px;
  opacity: 0.9;
  background: var(--surface-base);
  border: 1px solid var(--accent);
  border-radius: var(--radius-base);
  box-shadow: var(--shadow-md);
  padding: var(--space-3) var(--space-5);
}
</style>
