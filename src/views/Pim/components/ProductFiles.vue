<script setup>
import { ref, computed, onMounted } from "vue";
import { t } from "@/i18n";
import { useNotifyStore } from "@/stores/notify";
import { usePimChannelStore } from "@/stores/pimChannel";
import {
  GET_ProductFiles,
  POST_UploadFile,
  POST_ProductFile,
  DELETE_ProductFile,
  GET_FilesCategories,
  PATCH_File,
  POST_FilesCategory,
} from "@/api/pim/api";
import { extractApiMessage } from "@/composables/useFormErrors";

const props = defineProps({
  channelIdx: { type: String, required: true },
  sku: { type: String, required: true },
  readonly: { type: Boolean, default: false },
});

const notify = useNotifyStore();
const pimChannel = usePimChannelStore();

const files = ref([]);
const loading = ref(false);
const uploadingFile = ref(false);
const deletingFilePk = ref(null);
const isDragging = ref(false);
const categories = ref([]);
const editingStates = ref({});
const expandedFiles = ref({});
const savingFilePk = ref(null);

// Pending file (held until user confirms via popup)
const pendingFile = ref(null);
const uploadCategory = ref(null);
const uploadLabelT9n = ref({});

// Category quick-add
const showCategoryCreate = ref(false);
const newCategoryCode = ref("");
const newCategoryNameT9n = ref({});
const creatingCategory = ref(false);

const MAX_FILE_SIZE = 50 * 1024 * 1024;

const FILE_TYPE_BADGES = {
  1: { label: "Image", variant: "informative" },
  2: { label: "PDF", variant: "warning" },
  3: { label: "Document", variant: "neutral" },
  4: { label: "Video", variant: "positive" },
};

const formLanguages = computed(() => {
  return pimChannel.activeChannelLanguages?.length > 0
    ? pimChannel.activeChannelLanguages
    : ["en"];
});

const categoryDropdownValues = computed(() => {
  const items = categories.value.map((c) => ({
    label: c.name || c.code,
    value: c.code,
  }));
  items.push({ label: `+ ${t("pim.create_category")}`, value: "__create__" });
  return items;
});

function fileTypeBadge(pf) {
  const ft = pf.file?.file_type;
  return FILE_TYPE_BADGES[ft] || null;
}

async function fetchFiles() {
  loading.value = true;
  try {
    const { data } = await GET_ProductFiles(props.channelIdx, props.sku);
    files.value = data.results || data || [];
    const states = {};
    for (const pf of files.value) {
      const f = pf.file || {};
      states[f.pk] = {
        file_label_t9n: { ...(f.file_label_t9n || {}) },
        category_code: f.category_code || null,
      };
    }
    editingStates.value = states;
  } catch (err) {
    notify.spawnNotification({
      type: "negative",
      msg: extractApiMessage(err, t("notifications.error")),
    });
  } finally {
    loading.value = false;
  }
}

async function fetchCategories() {
  try {
    const { data } = await GET_FilesCategories();
    categories.value = data.results || data || [];
  } catch {
    categories.value = [];
  }
}

// --- Drop / select: stage the file, show popup ---

function onFileInputChange(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  stageFile(file);
  event.target.value = "";
}

function onDragOver(event) {
  event.preventDefault();
  isDragging.value = true;
}

function onDragLeave() {
  isDragging.value = false;
}

function onDrop(event) {
  event.preventDefault();
  isDragging.value = false;
  if (props.readonly) return;
  const file = event.dataTransfer.files?.[0];
  if (file) stageFile(file);
}

function stageFile(file) {
  if (file.size > MAX_FILE_SIZE) {
    notify.spawnNotification({
      type: "negative",
      msg: t("pim.file_too_large"),
    });
    return;
  }
  pendingFile.value = file;
  uploadCategory.value = null;
  uploadLabelT9n.value = {};
  showCategoryCreate.value = false;
}

function cancelUpload() {
  pendingFile.value = null;
  uploadCategory.value = null;
  uploadLabelT9n.value = {};
  showCategoryCreate.value = false;
}

async function confirmUpload() {
  if (!pendingFile.value) return;
  const file = pendingFile.value;

  uploadingFile.value = true;
  try {
    const formData = new FormData();
    formData.append("file", file);

    const hasT9n = Object.values(uploadLabelT9n.value).some((v) => !!v);
    if (hasT9n) {
      formData.append("file_label_t9n", JSON.stringify(uploadLabelT9n.value));
    }

    const uploadRes = await POST_UploadFile(formData);
    const filePk = uploadRes.data.pk;

    if (uploadCategory.value) {
      try {
        await PATCH_File(filePk, { file_category_code: uploadCategory.value });
      } catch {
        // Non-critical
      }
    }

    notify.spawnNotification({ type: "positive", msg: t("pim.file_uploaded") });

    try {
      await POST_ProductFile(props.channelIdx, props.sku, { file_pk: filePk });
      notify.spawnNotification({ type: "positive", msg: t("pim.file_linked") });
    } catch (linkErr) {
      if (
        linkErr?.response?.status === 400 ||
        linkErr?.error === "VALIDATION_ERROR"
      ) {
        notify.spawnNotification({
          type: "warning",
          msg: t("pim.file_already_linked"),
        });
      } else {
        notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(linkErr, t("notifications.error")),
        });
      }
    }

    cancelUpload();
    await fetchFiles();
  } catch (err) {
    notify.spawnNotification({
      type: "negative",
      msg: extractApiMessage(err, t("notifications.error")),
    });
  } finally {
    uploadingFile.value = false;
  }
}

// --- Inline editing on existing files ---

async function patchFile(filePk, payload) {
  savingFilePk.value = filePk;
  try {
    await PATCH_File(filePk, payload);
    notify.spawnNotification({ type: "positive", msg: t("pim.file_updated") });
    await fetchFiles();
  } catch (err) {
    notify.spawnNotification({
      type: "negative",
      msg: extractApiMessage(err, t("notifications.error")),
    });
  } finally {
    savingFilePk.value = null;
  }
}

function toggleEditRow(filePk) {
  expandedFiles.value[filePk] = !expandedFiles.value[filePk];
}

function closeEditRow(filePk) {
  expandedFiles.value[filePk] = false;
}

function saveFileMetadata(filePk) {
  const state = editingStates.value[filePk];
  if (!state) return;
  const payload = {};
  payload.file_label_t9n = state.file_label_t9n;
  payload.file_category_code = state.category_code || null;
  patchFile(filePk, payload);
}

function onCategorySelect(filePk, val) {
  if (val === "__create__") {
    showCategoryCreate.value = true;
    return;
  }
  const state = editingStates.value[filePk];
  if (state) state.category_code = val;
}

function onUploadCategorySelect(val) {
  if (val === "__create__") {
    showCategoryCreate.value = true;
    return;
  }
  uploadCategory.value = val;
}

// --- Category quick-add ---

async function createCategory() {
  if (!newCategoryCode.value) return;
  creatingCategory.value = true;
  try {
    const { data } = await POST_FilesCategory({
      code: newCategoryCode.value,
      name_t9n: newCategoryNameT9n.value,
    });
    categories.value.push(data);
    notify.spawnNotification({
      type: "positive",
      msg: t("pim.category_created"),
    });
    showCategoryCreate.value = false;
    newCategoryCode.value = "";
    newCategoryNameT9n.value = {};
  } catch (err) {
    notify.spawnNotification({
      type: "negative",
      msg: extractApiMessage(err, t("notifications.error")),
    });
  } finally {
    creatingCategory.value = false;
  }
}

function cancelCategoryCreate() {
  showCategoryCreate.value = false;
  newCategoryCode.value = "";
  newCategoryNameT9n.value = {};
}

// --- File list helpers ---

async function deleteFile(pk) {
  if (props.readonly) return;
  deletingFilePk.value = pk;
  try {
    await DELETE_ProductFile(props.channelIdx, props.sku, pk);
    notify.spawnNotification({ type: "positive", msg: t("pim.file_deleted") });
    await fetchFiles();
  } catch (err) {
    notify.spawnNotification({
      type: "negative",
      msg: extractApiMessage(err, t("notifications.error")),
    });
  } finally {
    deletingFilePk.value = null;
  }
}

function fileData(pf) {
  return pf.file || {};
}

function fileName(pf) {
  const f = fileData(pf);
  return f.original_file_name || f.file_label || "";
}

function fileIcon(pf) {
  const name = fileName(pf).toLowerCase();
  if (name.endsWith(".pdf")) return "file-pdf";
  if (name.endsWith(".doc") || name.endsWith(".docx")) return "file-word";
  if (name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) return "file-image";
  if (name.match(/\.(mp4|avi|mov|webm)$/)) return "file-video";
  return "file";
}

function fileUrl(pf) {
  const url = pf.file?.file_url;
  if (!url) return null;
  if (url.startsWith("http")) return url;
  const base = (process.env.VUE_APP_API_URL || "").replace(/\/$/, "");
  return `${base}${url}`;
}

onMounted(() => {
  fetchFiles();
  fetchCategories();
});
</script>

<template>
  <div class="product-files">
    <div class="product-files__header flex ai-ct jc-sb mb-300">
      <h3 class="fs-500 fw-600">{{ $t("pim.files") }}</h3>
      <span v-if="files.length" class="fs-200 t-basic-500">
        {{ files.length }} {{ files.length === 1 ? "file" : "files" }}
      </span>
    </div>

    <Loader v-if="loading" />

    <template v-else>
      <!-- Upload drop zone -->
      <label
        v-if="!readonly && !pendingFile"
        for="product-file-upload-input"
        class="product-files__dropzone"
        :class="{ 'product-files__dropzone--dragover': isDragging }"
        :aria-label="$t('pim.drop_files_here')"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @drop="onDrop"
      >
        <FontAwesomeIcon icon="upload" class="t-basic-400 fs-500" />
        <span class="t-basic-600 fs-200 mt-100">{{
          $t("pim.drop_files_here")
        }}</span>
        <span class="t-basic-400 fs-200 mt-100">{{
          $t("pim.files_supported_hint")
        }}</span>
      </label>
      <input
        id="product-file-upload-input"
        type="file"
        class="sr-only"
        @change="onFileInputChange"
      />

      <!-- Upload popup (shown after file is staged) -->
      <div v-if="pendingFile" class="product-files__popup">
        <div class="product-files__popup-header flex ai-ct gap-200 mb-200">
          <FontAwesomeIcon icon="file" class="t-support-400 fs-400" />
          <span class="fs-300 fw-600 t-basic-800">{{ pendingFile.name }}</span>
        </div>

        <div class="product-files__popup-fields">
          <div class="product-files__field">
            <label class="product-files__label">{{
              $t("pim.file_category")
            }}</label>
            <Dropdown
              :values="categoryDropdownValues"
              :selected="uploadCategory ? [uploadCategory] : []"
              :placeholder="$t('pim.select_category')"
              @onSelect="onUploadCategorySelect"
            />
          </div>
          <div
            v-for="lang in formLanguages"
            :key="`upload-label-${lang}`"
            class="product-files__field"
          >
            <label class="product-files__label">
              {{ $t("pim.file_label") }}
              <span
                class="chip chip--sm bg-support-200 t-support-400"
                >{{ lang.toUpperCase() }}</span
              >
            </label>
            <BasicInput
              :model-value="uploadLabelT9n[lang] || ''"
              @update:modelValue="(val) => (uploadLabelT9n[lang] = val)"
            />
          </div>
        </div>

        <!-- Category quick-add (inside popup) -->
        <div v-if="showCategoryCreate" class="product-files__cat-create mt-200">
          <div class="product-files__cat-create-fields">
            <div class="product-files__field">
              <label class="product-files__label">Code *</label>
              <BasicInput v-model="newCategoryCode" placeholder="e.g. manual" />
            </div>
            <div
              v-for="lang in formLanguages"
              :key="`cat-name-${lang}`"
              class="product-files__field"
            >
              <label class="product-files__label">
                {{ $t("pim.name") }}
                <span
                  class="chip chip--sm bg-support-200 t-support-400"
                  >{{ lang.toUpperCase() }}</span
                >
              </label>
              <BasicInput
                :model-value="newCategoryNameT9n[lang] || ''"
                @update:modelValue="(val) => (newCategoryNameT9n[lang] = val)"
              />
            </div>
          </div>
          <div class="product-files__cat-create-actions mt-100">
            <BasicButton
              class="btn-primary"
              :text="$t('pim.create_category')"
              :isDisabled="creatingCategory || !newCategoryCode"
              @click="createCategory"
            />
            <BasicButton
              class="btn-outline"
              :text="$t('common.cancel')"
              @click="cancelCategoryCreate"
            />
          </div>
        </div>

        <div class="product-files__popup-actions mt-200">
          <BasicButton
            class="btn-primary"
            :text="$t('pim.upload_file')"
            :isDisabled="uploadingFile"
            @click="confirmUpload"
          />
          <BasicButton
            class="btn-outline"
            :text="$t('common.cancel')"
            :isDisabled="uploadingFile"
            @click="cancelUpload"
          />
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="!files.length && !pendingFile" class="product-files__empty">
        <FontAwesomeIcon icon="file" class="t-basic-400 fs-600" />
        <span class="t-basic-500 fs-200 mt-200">{{ $t("pim.no_files") }}</span>
      </div>

      <!-- File list -->
      <div v-if="files.length" class="product-files__list mt-300">
        <div v-for="pf in files" :key="pf.pk" class="product-files__row">
          <!-- Row 1: icon + filename + type badge + delete -->
          <div class="product-files__row-top">
            <FontAwesomeIcon
              :icon="fileIcon(pf)"
              class="product-files__icon t-basic-500"
            />
            <div class="product-files__meta">
              <a
                v-if="fileUrl(pf)"
                :href="fileUrl(pf)"
                target="_blank"
                rel="noopener"
                class="product-files__name product-files__name--link t-basic-800 fs-300 fw-500"
              >
                {{ fileName(pf) || "—" }}
              </a>
              <span
                v-else
                class="product-files__name t-basic-800 fs-300 fw-500"
              >
                {{ fileName(pf) || "—" }}
              </span>
              <div
                class="product-files__details flex ai-ct gap-200 fs-200 t-basic-500"
              >
                <StatusBadge
                  v-if="fileTypeBadge(pf)"
                  :variant="fileTypeBadge(pf).variant"
                  :label="fileTypeBadge(pf).label"
                />
                <span v-if="pf.file && pf.file.category_name">{{
                  pf.file.category_name
                }}</span>
              </div>
            </div>
            <button
              v-if="!readonly"
              class="product-files__edit-btn"
              :aria-label="$t('pim.settings')"
              @click="toggleEditRow(fileData(pf).pk)"
            >
              <FontAwesomeIcon icon="pen" />
            </button>
            <button
              v-if="!readonly"
              class="product-files__delete-btn"
              :aria-label="$t('pim.confirm_delete_media')"
              :disabled="deletingFilePk === pf.pk"
              @click="deleteFile(pf.pk)"
            >
              <FontAwesomeIcon icon="trash-can" />
            </button>
          </div>

          <!-- Row 2: inline editing (category + labels) — toggled -->
          <div
            v-if="
              !readonly &&
              expandedFiles[fileData(pf).pk] &&
              editingStates[fileData(pf).pk]
            "
            class="product-files__row-edit"
          >
            <div class="product-files__row-edit-fields">
              <div class="product-files__field product-files__field--compact">
                <label class="product-files__label">{{
                  $t("pim.file_category")
                }}</label>
                <Dropdown
                  :values="categoryDropdownValues"
                  :selected="
                    editingStates[fileData(pf).pk].category_code
                      ? [editingStates[fileData(pf).pk].category_code]
                      : []
                  "
                  :placeholder="$t('pim.select_category')"
                  @onSelect="(sel) => onCategorySelect(fileData(pf).pk, sel)"
                />
              </div>
              <div
                v-for="lang in formLanguages"
                :key="`label-${fileData(pf).pk}-${lang}`"
                class="product-files__field product-files__field--compact"
              >
                <label class="product-files__label">
                  {{ $t("pim.file_label") }}
                  <span
                    class="chip chip--sm bg-support-200 t-support-400"
                    >{{ lang.toUpperCase() }}</span
                  >
                </label>
                <BasicInput
                  :model-value="
                    editingStates[fileData(pf).pk].file_label_t9n[lang] || ''
                  "
                  @update:modelValue="
                    (val) =>
                      (editingStates[fileData(pf).pk].file_label_t9n[lang] =
                        val)
                  "
                />
              </div>
            </div>
            <div class="product-files__row-edit-actions mt-100">
              <BasicButton
                class="btn-primary"
                :text="$t('common.save')"
                :isDisabled="savingFilePk === fileData(pf).pk"
                @click="saveFileMetadata(fileData(pf).pk)"
              />
              <BasicButton
                class="btn-outline"
                :text="$t('common.close')"
                @click="closeEditRow(fileData(pf).pk)"
              />
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.product-files {
  &__dropzone {
    border: 2px dashed var(--c-basic-400);
    border-radius: 6px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
    min-height: 80px;

    &:hover,
    &:focus-visible {
      border-color: var(--c-support-300);
      background: var(--c-basic-150);
      outline: none;
    }

    &--dragover {
      border-color: var(--c-support-400);
      background: var(--c-basic-200);
    }
  }

  &__popup {
    padding: 16px;
    border: 1px solid var(--c-support-300);
    border-radius: 6px;
    background: var(--c-basic-100);
    box-shadow: var(--shadow-md);
  }

  &__popup-fields {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    align-items: flex-end;
  }

  &__popup-actions {
    display: flex;
    gap: 8px;
  }

  &__cat-create {
    padding: 12px;
    border: 1px solid var(--c-support-200);
    border-radius: 6px;
    background: var(--c-basic-150);
  }

  &__cat-create-fields {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__cat-create-actions {
    display: flex;
    gap: 8px;
  }

  &__field {
    flex: 1;
    min-width: 140px;

    &--compact {
      min-width: 120px;
    }
  }

  &__label {
    display: block;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--c-basic-500);
    margin-bottom: 4px;
  }

  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40px 20px;
    gap: 8px;
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__row {
    border: 1px solid var(--c-basic-200);
    border-radius: 6px;
    background: var(--c-basic-100);
  }

  &__row-top {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
  }

  &__row-edit {
    padding: 12px;
    border-top: 1px solid var(--c-basic-200);
  }

  &__row-edit-fields {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    align-items: flex-end;
  }

  &__row-edit-actions {
    display: flex;
    gap: 8px;
  }

  &__icon {
    font-size: 20px;
    flex-shrink: 0;
    width: 24px;
    text-align: center;
  }

  &__meta {
    flex: 1;
    min-width: 0;
  }

  &__name {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    &--link {
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }
  }

  &__details {
    margin-top: 2px;
  }

  &__edit-btn {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: var(--radius-sm);
    background-color: var(--c-basic-200);
    color: var(--c-basic-600);
    cursor: pointer;
    transition: background-color 0.15s;

    &:hover {
      background-color: var(--c-support-200);
      color: var(--c-support-400);
    }
  }

  &__delete-btn {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: var(--radius-sm);
    background-color: var(--c-negative-100);
    color: var(--c-negative-300);
    cursor: pointer;
    transition: background-color 0.15s;

    &:hover:not(:disabled) {
      background-color: var(--c-negative-200);
      color: var(--c-basic-100);
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
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
.mt-200 {
  margin-top: var(--space-200);
}
.mt-300 {
  margin-top: var(--space-300);
}
</style>
