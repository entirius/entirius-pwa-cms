<script setup>
import { ref, reactive, computed, watch, nextTick } from "vue";
import { t } from "@/i18n";
import { useNotifyStore } from "@/stores/notify";
import { usePimChannelStore } from "@/stores/pimChannel";
import draggable from "vuedraggable";
import ConfirmationModal from "@/functionals/Confirmation-modal/index.vue";
import {
  POST_UploadPicture,
  GET_ProductPictures,
  POST_ProductPicture,
  PATCH_ProductPicture,
  DELETE_ProductPicture,
  GET_ProductVideos,
  POST_ProductVideo,
  PATCH_ProductVideo,
  DELETE_ProductVideo,
} from "@/api/pim/api";
import { extractApiMessage } from "@/composables/useFormErrors";

const props = defineProps({
  channelIdx: { type: String, required: true },
  sku: { type: String, required: true },
  readonly: { type: Boolean, default: false },
});

const emit = defineEmits(["media-changed"]);

const notify = useNotifyStore();
const pimChannel = usePimChannelStore();
const API_BASE = process.env.VUE_APP_API_URL || "";

const defaultLang = computed(
  () =>
    pimChannel.activeChannel?.default_language ||
    pimChannel.activeChannelLanguages[0] ||
    "en"
);

// Display string for the gallery/lightbox: default language first, any filled language as fallback.
function altForDisplay(altT9n) {
  if (!altT9n) return "";
  return (
    altT9n[defaultLang.value] || Object.values(altT9n).find((v) => v) || ""
  );
}

function mediaUrl(path) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return API_BASE + path;
}

// --- State ---
const pictures = ref([]);
const videos = ref([]);
const loading = ref(false);
const selectedIndex = ref(0);
const editingItem = ref(null);

const isDraggingOver = ref(false);
const uploadingPicture = ref(false);

const newVideoUrl = ref("");
const addingVideo = ref(false);

const deletingKey = ref(null);
const confirmingDeleteItem = ref(null);

const vimeoThumbnails = reactive({});
const brokenImages = reactive(new Set());

function onImgError(url) {
  brokenImages.add(url);
}

// --- Computed ---
const mediaItems = computed(() => {
  const pics = pictures.value.map((p) => ({
    type: "picture",
    pk: p.pk,
    position: p.position ?? 0,
    imageUrl: mediaUrl(p.picture?.image_url || p.url || p.image),
    role: p.picture_role || "GENERAL",
    altTextT9n: p.alt_text_t9n || {},
    altText: altForDisplay(p.alt_text_t9n),
    raw: p,
  }));
  const vids = videos.value.map((v) => {
    const url = v.video?.video_url || v.url || "";
    return {
      type: "video",
      pk: v.pk,
      position: v.position ?? 0,
      videoUrl: url,
      title: v.video?.title || v.title || "",
      source: v.video?.source || detectVideoSource(url),
      thumbnailUrl: getVideoThumbnail(url),
      raw: v,
    };
  });
  return [...pics, ...vids].sort((a, b) => a.position - b.position);
});

const orderedItems = computed({
  get: () => mediaItems.value,
  set: () => {},
});

const selectedItem = computed(() => {
  if (!mediaItems.value.length) return null;
  return mediaItems.value[selectedIndex.value] || mediaItems.value[0];
});

const totalAssets = computed(() => mediaItems.value.length);

const roleOptions = computed(() => [
  { label: t("pim.role_main"), value: "MAIN" },
  { label: t("pim.role_general"), value: "GENERAL" },
  { label: t("pim.role_variant"), value: "VARIANT" },
  { label: t("pim.role_angle"), value: "ANGLE" },
]);

const videoRoleOptions = computed(() => [
  { label: t("pim.role_main"), value: "MAIN" },
  { label: t("pim.role_variant"), value: "VARIANT" },
  { label: t("pim.role_general"), value: "GENERAL" },
]);

// --- Helpers ---
function detectVideoSource(url) {
  if (!url) return "unknown";
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  if (url.includes("vimeo.com")) return "vimeo";
  return "unknown";
}

function getVideoThumbnail(url) {
  if (!url) return "";
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
  if (ytMatch) return `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg`;
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch && vimeoThumbnails[vimeoMatch[1]])
    return vimeoThumbnails[vimeoMatch[1]];
  return "";
}

function fetchVimeoThumbnails() {
  for (const v of videos.value) {
    const url = v.video?.video_url || v.url || "";
    const match = url.match(/vimeo\.com\/(\d+)/);
    if (!match || vimeoThumbnails[match[1]]) continue;
    const vimeoId = match[1];
    fetch(
      `https://vimeo.com/api/oembed.json?url=https://vimeo.com/${vimeoId}&width=320`
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.thumbnail_url) vimeoThumbnails[vimeoId] = data.thumbnail_url;
      })
      .catch(() => {});
  }
}

function getVideoEmbedUrl(url) {
  if (!url) return "";
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return "";
}

function itemKey(item) {
  return `${item.type}-${item.pk}`;
}

function roleBadgeVariant(role) {
  if (role === "MAIN") return "informative";
  if (role === "VARIANT") return "warning";
  return "neutral";
}

// --- Data loading ---
async function fetchAll() {
  loading.value = true;
  try {
    const [picRes, vidRes] = await Promise.all([
      GET_ProductPictures(props.channelIdx, props.sku),
      GET_ProductVideos(props.channelIdx, props.sku),
    ]);
    pictures.value = picRes.data.results || picRes.data || [];
    videos.value = vidRes.data.results || vidRes.data || [];
  } catch (err) {
    notify.spawnNotification({
      type: "negative",
      msg: extractApiMessage(err, t("notifications.error")),
    });
  } finally {
    loading.value = false;
  }
}

async function refetchPictures() {
  try {
    const { data } = await GET_ProductPictures(props.channelIdx, props.sku);
    pictures.value = data.results || data || [];
  } catch (err) {
    notify.spawnNotification({
      type: "negative",
      msg: extractApiMessage(err, t("notifications.error")),
    });
  }
}

async function refetchVideos() {
  try {
    const { data } = await GET_ProductVideos(props.channelIdx, props.sku);
    videos.value = data.results || data || [];
  } catch (err) {
    notify.spawnNotification({
      type: "negative",
      msg: extractApiMessage(err, t("notifications.error")),
    });
  }
}

// --- Drag & reorder ---
async function onDragEnd(evt) {
  const newList = [...mediaItems.value];
  const [moved] = newList.splice(evt.oldIndex, 1);
  newList.splice(evt.newIndex, 0, moved);

  for (let i = 0; i < newList.length; i++) {
    const item = newList[i];
    if (item.position !== i) {
      try {
        if (item.type === "picture") {
          await PATCH_ProductPicture(props.channelIdx, props.sku, item.pk, {
            position: i,
          });
        } else {
          await PATCH_ProductVideo(props.channelIdx, props.sku, item.pk, {
            position: i,
          });
        }
      } catch (err) {
        notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, t("notifications.error")),
        });
      }
    }
  }

  await Promise.all([refetchPictures(), refetchVideos()]);

  // Keep selection on the moved item
  const movedKey = itemKey(moved);
  const newIdx = mediaItems.value.findIndex((m) => itemKey(m) === movedKey);
  if (newIdx >= 0) selectedIndex.value = newIdx;

  notify.spawnNotification({ type: "positive", msg: t("pim.media_reordered") });
  emit("media-changed");
}

// --- Thumbnail selection ---
function selectItem(index) {
  selectedIndex.value = index;
}

// --- Upload pictures ---
function onDropZoneClick() {
  if (props.readonly) return;
  document.getElementById("picture-file-input").click();
}

function onFileInputChange(event) {
  const files = event.target.files;
  if (!files?.length) return;
  for (const file of files) {
    uploadPicture(file);
  }
  event.target.value = "";
}

function onDragOver(event) {
  event.preventDefault();
  isDraggingOver.value = true;
}

function onDragLeave() {
  isDraggingOver.value = false;
}

function onDrop(event) {
  event.preventDefault();
  isDraggingOver.value = false;
  if (props.readonly) return;
  const files = event.dataTransfer.files;
  if (files?.length) {
    for (const file of files) {
      uploadPicture(file);
    }
  }
}

async function uploadPicture(file) {
  uploadingPicture.value = true;
  try {
    const formData = new FormData();
    formData.append("image", file);
    const uploadRes = await POST_UploadPicture(formData);
    notify.spawnNotification({
      type: "positive",
      msg: t("pim.picture_uploaded"),
    });

    const role = pictures.value.length === 0 ? "MAIN" : "GENERAL";
    await POST_ProductPicture(props.channelIdx, props.sku, {
      picture_pk: uploadRes.data.pk,
      picture_role: role,
    });
    notify.spawnNotification({
      type: "positive",
      msg: t("pim.picture_linked"),
    });

    await refetchPictures();
    // Select the newly added picture
    await nextTick();
    selectedIndex.value = mediaItems.value.length - 1;
    emit("media-changed");
  } catch (err) {
    notify.spawnNotification({
      type: "negative",
      msg: extractApiMessage(err, t("notifications.error")),
    });
  } finally {
    uploadingPicture.value = false;
  }
}

// --- Add video ---
async function addVideo() {
  if (!newVideoUrl.value.trim()) return;
  addingVideo.value = true;
  try {
    await POST_ProductVideo(props.channelIdx, props.sku, {
      video_url: newVideoUrl.value.trim(),
    });
    notify.spawnNotification({ type: "positive", msg: t("pim.video_added") });
    newVideoUrl.value = "";
    await refetchVideos();
    fetchVimeoThumbnails();
    await nextTick();
    selectedIndex.value = mediaItems.value.length - 1;
    emit("media-changed");
  } catch (err) {
    notify.spawnNotification({
      type: "negative",
      msg: extractApiMessage(err, t("notifications.error")),
    });
  } finally {
    addingVideo.value = false;
  }
}

// --- Edit item ---
const translatingAlt = ref(false);

function openEdit(item) {
  if (props.readonly) return;
  editingItem.value = {
    ...item,
    editRole: item.role || "GENERAL",
    // Full t9n dict (cloned) — the PATCH sends it whole, so the drawer edit of one
    // language must never drop the siblings (API treats alt_text_t9n as full replace).
    editAltTextT9n: { ...(item.altTextT9n || {}) },
    editTitle: item.title || "",
  };
}

function onAltTranslationsSave({ values }) {
  if (editingItem.value) {
    editingItem.value.editAltTextT9n = { ...values };
  }
  translatingAlt.value = false;
}

const editAltPreview = computed(() =>
  editingItem.value ? altForDisplay(editingItem.value.editAltTextT9n) : ""
);

const editAltFilledCount = computed(() => {
  if (!editingItem.value) return 0;
  return Object.values(editingItem.value.editAltTextT9n || {}).filter((v) => v)
    .length;
});

function closeEdit() {
  editingItem.value = null;
  translatingAlt.value = false;
}

async function saveEdit() {
  if (!editingItem.value) return;
  const item = editingItem.value;
  try {
    if (item.type === "picture") {
      await PATCH_ProductPicture(props.channelIdx, props.sku, item.pk, {
        picture_role: item.editRole,
        alt_text_t9n: item.editAltTextT9n,
      });
      await refetchPictures();
    } else {
      await PATCH_ProductVideo(props.channelIdx, props.sku, item.pk, {
        title: item.editTitle,
      });
      await refetchVideos();
    }
    notify.spawnNotification({ type: "positive", msg: t("pim.media_saved") });
    emit("media-changed");
    closeEdit();
  } catch (err) {
    notify.spawnNotification({
      type: "negative",
      msg: extractApiMessage(err, t("notifications.error")),
    });
  }
}

// --- Delete item ---
async function deleteItem(item) {
  if (props.readonly) return;
  const key = itemKey(item);
  deletingKey.value = key;
  try {
    if (item.type === "picture") {
      await DELETE_ProductPicture(props.channelIdx, props.sku, item.pk);
      notify.spawnNotification({
        type: "positive",
        msg: t("pim.picture_deleted"),
      });
      await refetchPictures();
    } else {
      await DELETE_ProductVideo(props.channelIdx, props.sku, item.pk);
      notify.spawnNotification({
        type: "positive",
        msg: t("pim.video_deleted"),
      });
      await refetchVideos();
    }

    await nextTick();
    if (selectedIndex.value >= mediaItems.value.length) {
      selectedIndex.value = Math.max(0, mediaItems.value.length - 1);
    }
    if (editingItem.value && itemKey(editingItem.value) === key) {
      closeEdit();
    }
    emit("media-changed");
  } catch (err) {
    notify.spawnNotification({
      type: "negative",
      msg: extractApiMessage(err, t("notifications.error")),
    });
  } finally {
    deletingKey.value = null;
  }
}

// --- Lifecycle ---
// Fetch only once a real SKU is available. The parent mounts MediaGallery
// before the product GET resolves, so `sku` is briefly undefined — without
// this guard we'd hit /products/undefined/pictures/ (404 + error toast) and
// never retry. `immediate` covers the already-loaded case; the watch covers
// the product-loads-later case.
watch(
  () => props.sku,
  async (sku) => {
    if (!sku) return;
    await fetchAll();
    fetchVimeoThumbnails();
  },
  { immediate: true }
);
</script>

<template>
  <div class="media-gallery">
    <!-- Header -->
    <div class="media-gallery__header">
      <h3 class="fs-400 fw-600 t-basic-800">{{ $t("pim.media_gallery") }}</h3>
      <span v-if="totalAssets" class="media-gallery__count t-basic-500 fs-200">
        {{ totalAssets }} {{ totalAssets === 1 ? "asset" : "assets" }}
      </span>
    </div>

    <Loader v-if="loading" />

    <template v-else>
      <!-- Large preview -->
      <div class="media-gallery__preview">
        <template v-if="selectedItem">
          <img
            v-if="
              selectedItem.type === 'picture' &&
              !brokenImages.has(selectedItem.imageUrl)
            "
            :src="selectedItem.imageUrl"
            :alt="selectedItem.altText"
            class="media-gallery__main-img"
            @error="onImgError(selectedItem.imageUrl)"
          />
          <div
            v-else-if="
              selectedItem.type === 'picture' &&
              brokenImages.has(selectedItem.imageUrl)
            "
            class="media-gallery__broken-placeholder"
          >
            <FontAwesomeIcon icon="video" style="font-size: 48px" />
            <a
              :href="selectedItem.imageUrl"
              target="_blank"
              class="t-support-400 fs-200 mt-100"
            >
              {{ selectedItem.altText || selectedItem.imageUrl }}
            </a>
          </div>
          <div v-else class="media-gallery__video-preview">
            <iframe
              v-if="getVideoEmbedUrl(selectedItem.videoUrl)"
              :src="getVideoEmbedUrl(selectedItem.videoUrl)"
              class="media-gallery__video-iframe"
              frameborder="0"
              allowfullscreen
            />
            <div v-else class="media-gallery__video-link">
              <FontAwesomeIcon
                icon="play-circle"
                class="t-basic-400"
                style="font-size: 48px"
              />
              <a
                :href="selectedItem.videoUrl"
                target="_blank"
                class="t-support-400 fs-200 mt-100"
              >
                {{ selectedItem.videoUrl }}
              </a>
            </div>
          </div>
        </template>
        <div v-else class="media-gallery__no-image">
          <FontAwesomeIcon
            icon="image"
            class="t-basic-400"
            style="font-size: 32px"
          />
          <span class="t-basic-500 fs-200 mt-100">{{
            $t("pim.no_media")
          }}</span>
        </div>

        <!-- Edit panel (overlays preview) -->
        <div v-if="editingItem" class="media-gallery__edit-panel">
          <div class="media-gallery__edit-header">
            <span class="fw-600 fs-300 t-basic-800">{{
              $t("pim.edit_media")
            }}</span>
            <button class="media-gallery__close-btn" @click="closeEdit">
              <FontAwesomeIcon icon="xmark" class="t-basic-500" />
            </button>
          </div>

          <div class="media-gallery__edit-body">
            <template v-if="editingItem.type === 'picture'">
              <div class="media-gallery__edit-field">
                <label class="media-gallery__field-label">{{
                  $t("pim.picture_role")
                }}</label>
                <Dropdown
                  :values="roleOptions"
                  :selected="[editingItem.editRole]"
                  @onSelect="(val) => (editingItem.editRole = val)"
                />
              </div>
              <div class="media-gallery__edit-field">
                <label class="media-gallery__field-label">
                  {{ $t("pim.alt_text") }}
                  <span v-if="editAltFilledCount" class="t-basic-500">
                    ({{ editAltFilledCount }}/{{
                      pimChannel.activeChannelLanguages.length
                    }})
                  </span>
                </label>
                <span v-if="editAltPreview" class="t-basic-600 fs-200 lc-1">
                  {{ editAltPreview }}
                </span>
                <BasicButton
                  :text="$t('pim.translations')"
                  class="btn-outline"
                  @click="translatingAlt = true"
                />
              </div>
            </template>

            <template v-else>
              <div class="media-gallery__edit-field">
                <label class="media-gallery__field-label">{{
                  $t("pim.video_title")
                }}</label>
                <BasicInput
                  v-model="editingItem.editTitle"
                  :placeholder="$t('pim.video_title')"
                />
              </div>
              <div class="media-gallery__edit-field">
                <label class="media-gallery__field-label">{{
                  $t("pim.video_url")
                }}</label>
                <span class="t-basic-600 fs-200 lc-1">{{
                  editingItem.videoUrl
                }}</span>
              </div>
            </template>
          </div>

          <div class="media-gallery__edit-actions">
            <BasicButton
              :text="$t('common.save')"
              class="btn-primary"
              @click="saveEdit"
            />
            <BasicButton
              :text="$t('common.cancel')"
              class="btn-outline"
              @click="closeEdit"
            />
          </div>
        </div>
      </div>

      <!-- Thumbnail grid -->
      <div class="media-gallery__thumb-strip">
        <draggable
          :model-value="orderedItems"
          ghost-class="media-gallery__ghost"
          :force-fallback="true"
          fallback-class="media-gallery__drag-clone"
          :item-key="itemKey"
          :disabled="readonly"
          class="media-gallery__drag-container"
          @end="onDragEnd"
        >
          <template #item="{ element, index }">
            <div
              class="media-gallery__thumb"
              :class="{
                'media-gallery__thumb--active': index === selectedIndex,
              }"
              @click="selectItem(index)"
            >
              <!-- Picture thumbnail -->
              <template v-if="element.type === 'picture'">
                <img
                  v-if="!brokenImages.has(element.imageUrl)"
                  :src="element.imageUrl"
                  :alt="element.altText"
                  class="media-gallery__thumb-img"
                  @error="onImgError(element.imageUrl)"
                />
                <div v-else class="media-gallery__thumb-broken">
                  <FontAwesomeIcon icon="video" />
                  <span class="media-gallery__play-badge">
                    <FontAwesomeIcon icon="play" />
                  </span>
                </div>
              </template>
              <!-- Video thumbnail -->
              <div v-else class="media-gallery__thumb-video">
                <img
                  v-if="
                    element.thumbnailUrl &&
                    !brokenImages.has(element.thumbnailUrl)
                  "
                  :src="element.thumbnailUrl"
                  alt=""
                  class="media-gallery__thumb-img"
                  @error="onImgError(element.thumbnailUrl)"
                />
                <div v-else class="media-gallery__thumb-video-fallback">
                  <FontAwesomeIcon icon="video" />
                </div>
                <span class="media-gallery__play-badge">
                  <FontAwesomeIcon icon="play" />
                </span>
              </div>

              <!-- Role badge -->
              <StatusBadge
                v-if="element.role === 'MAIN'"
                class="media-gallery__role-badge"
                :label="$t('pim.role_main')"
                variant="informative"
              />

              <!-- Hover overlay with edit/delete -->
              <div v-if="!readonly" class="media-gallery__thumb-actions">
                <button
                  class="media-gallery__action-btn"
                  :aria-label="$t('pim.edit_media')"
                  @click.stop="openEdit(element)"
                >
                  <FontAwesomeIcon icon="pen" />
                </button>
                <button
                  class="media-gallery__action-btn media-gallery__action-btn--delete"
                  :aria-label="$t('pim.confirm_delete_media')"
                  :disabled="deletingKey === itemKey(element)"
                  @click.stop="confirmingDeleteItem = element"
                >
                  <FontAwesomeIcon icon="trash-can" />
                </button>
              </div>
            </div>
          </template>
        </draggable>
      </div>

      <!-- Unified add-media zone -->
      <div v-if="!readonly" class="media-gallery__add-zone">
        <div
          class="media-gallery__upload-area"
          :class="{ 'media-gallery__upload-area--dragover': isDraggingOver }"
          role="button"
          :aria-label="$t('pim.drop_files_here')"
          tabindex="0"
          @click="onDropZoneClick"
          @keydown.enter="onDropZoneClick"
          @dragover="onDragOver"
          @dragleave="onDragLeave"
          @drop="onDrop"
        >
          <span v-if="uploadingPicture" class="t-basic-500 fs-200">...</span>
          <template v-else>
            <FontAwesomeIcon icon="upload" class="t-basic-400 fs-400" />
            <span class="t-basic-500 fs-200 mt-100">{{
              $t("pim.drop_files_here")
            }}</span>
          </template>
        </div>
        <div class="media-gallery__divider">
          <span class="media-gallery__divider-line" />
          <span class="media-gallery__divider-text t-basic-400 fs-100">or</span>
          <span class="media-gallery__divider-line" />
        </div>
        <div class="media-gallery__video-inline">
          <FontAwesomeIcon icon="link" class="t-basic-400" />
          <input
            v-model="newVideoUrl"
            type="text"
            class="media-gallery__video-input"
            :placeholder="$t('pim.video_url_placeholder')"
            @keydown.enter="addVideo"
          />
          <BasicButton
            :text="$t('pim.add_video')"
            class="btn-primary media-gallery__video-submit"
            :isDisabled="addingVideo || !newVideoUrl.trim()"
            @click="addVideo"
          />
        </div>
      </div>
      <input
        id="picture-file-input"
        type="file"
        accept="image/*"
        multiple
        class="sr-only"
        @change="onFileInputChange"
      />
    </template>

    <TranslationsDrawer
      :visible="translatingAlt"
      :title="$t('pim.alt_text')"
      :languages="pimChannel.activeChannelLanguages"
      :default-language="defaultLang"
      :values="editingItem ? editingItem.editAltTextT9n : {}"
      @cancel="translatingAlt = false"
      @save="onAltTranslationsSave"
    />

    <ConfirmationModal
      :visible="!!confirmingDeleteItem"
      @accept="
        deleteItem(confirmingDeleteItem);
        confirmingDeleteItem = null;
      "
      @reject="confirmingDeleteItem = null"
    >
      <template #description>
        <p>{{ $t("pim.confirm_delete_media") }}</p>
      </template>
    </ConfirmationModal>
  </div>
</template>

<style lang="scss" scoped>
.media-gallery {
  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  &__count {
    white-space: nowrap;
  }

  &__preview {
    width: 100%;
    aspect-ratio: 4 / 3;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    background: var(--c-basic-900);
    position: relative;
  }

  &__main-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  &__video-preview {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__video-iframe {
    width: 100%;
    height: 100%;
  }

  &__video-link {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  &__no-image {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  &__broken-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--c-basic-400);
    gap: 4px;
  }

  // --- Thumbnail strip ---
  &__thumb-strip {
    display: flex;
    gap: 6px;
    margin-top: 8px;
    overflow-x: auto;
    padding-bottom: 4px;
    align-items: stretch;
  }

  &__drag-container {
    display: flex;
    gap: 6px;
  }

  &__thumb {
    flex-shrink: 0;
    width: 64px;
    height: 64px;
    border: 2px solid transparent;
    border-radius: var(--radius-sm);
    overflow: hidden;
    cursor: pointer;
    position: relative;
    transition: border-color 0.15s;
    background: var(--c-basic-200);

    &:hover {
      border-color: var(--c-basic-400);
    }

    &--active {
      border-color: var(--c-support-400);
    }

    &:hover .media-gallery__thumb-actions {
      opacity: 1;
    }
  }

  &__thumb-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__thumb-video {
    width: 100%;
    height: 100%;
    position: relative;
  }

  &__thumb-broken {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    background: linear-gradient(
      135deg,
      var(--c-basic-300) 0%,
      var(--c-basic-200) 100%
    );
    color: var(--c-basic-500);
    font-size: 18px;
  }

  &__thumb-video-fallback {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(
      135deg,
      var(--c-basic-300) 0%,
      var(--c-basic-200) 100%
    );
    color: var(--c-basic-500);
    font-size: 18px;
  }

  &__play-badge {
    position: absolute;
    top: 2px;
    right: 2px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.55);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 8px;
    pointer-events: none;
  }

  &__role-badge {
    position: absolute;
    top: 2px;
    left: 2px;
    font-size: 9px;
    padding: 1px 4px;
    pointer-events: none;
  }

  &__thumb-actions {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    background: rgba(0, 0, 0, 0.45);
    opacity: 0;
    transition: opacity 0.15s;
  }

  &__action-btn {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: none;
    background: var(--c-basic-100);
    color: var(--c-basic-700);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 11px;
    transition: background 0.1s;

    &:hover {
      background: var(--c-basic-200);
    }

    &--delete {
      color: var(--c-negative-300);

      &:hover {
        background: var(--c-negative-100);
      }
    }
  }

  // --- Ghost / drag clone ---
  &__ghost {
    opacity: 0.4;
  }

  // --- Unified add-media zone ---
  &__add-zone {
    margin-top: 8px;
    border: 2px dashed var(--c-basic-400);
    border-radius: var(--radius-md);
    padding: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0;
  }

  &__upload-area {
    width: 100%;
    padding: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border-radius: var(--radius-sm);
    transition: background 0.15s;

    &:hover,
    &:focus-visible {
      background: var(--c-basic-150);
      outline: none;
    }

    &--dragover {
      background: var(--c-basic-200);
    }
  }

  &__divider {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 0;
  }

  &__divider-line {
    flex: 1;
    height: 1px;
    background: var(--c-basic-300);
  }

  &__divider-text {
    text-transform: lowercase;
    white-space: nowrap;
  }

  &__video-inline {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__video-input {
    flex: 1;
    border: 1px solid var(--c-basic-300);
    border-radius: var(--radius-sm);
    padding: 6px 8px;
    font-size: var(--fs-200);
    background: var(--c-basic-100);
    color: var(--c-basic-800);
    outline: none;
    height: var(--elem-height);

    &::placeholder {
      color: var(--c-basic-400);
    }

    &:focus {
      border-color: var(--c-support-400);
    }
  }

  &__video-submit {
    flex-shrink: 0;
    white-space: nowrap;
  }

  // --- Edit panel (overlays preview) ---
  &__edit-panel {
    position: absolute;
    inset: 0;
    border-radius: var(--radius-md);
    background: var(--c-basic-100);
    display: flex;
    flex-direction: column;
    z-index: 2;
  }

  &__edit-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-bottom: 1px solid var(--c-basic-200);
  }

  &__close-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    line-height: 1;

    &:hover {
      opacity: 0.7;
    }
  }

  &__edit-body {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    flex: 1;
  }

  &__edit-field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__field-label {
    font-size: var(--fs-100);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--c-basic-500);
  }

  &__edit-actions {
    display: flex;
    gap: 8px;
    padding: 10px 12px;
    border-top: 1px solid var(--c-basic-200);
    margin-top: auto;
  }
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.mt-100 {
  margin-top: var(--space-100);
}
.lc-1 {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

<style lang="scss">
/* Global (unscoped) — SortableJS drag clones are appended to <body> */
.media-gallery__drag-clone {
  opacity: 0.9;
  border: 2px solid var(--c-support-400);
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
</style>
