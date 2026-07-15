<template>
  <div class="images-controller t-basic-700 bg-basic-100">
    <p class="mb-100" v-if="label">{{ label }}</p>
    <div class="flex gap-100">
      <BasicButton
        :text="$t('routes.set_new')"
        class="t-support-400 b-basic-400 bg-basic-100 bg-basic-300-hover br-50"
        @click="
          () => {
            init();
          }
        "
      />
      <Dropdown
        :placeholder="`${$t('controllers.setted')} (${
          Object.keys(value ?? {}).length
        })`"
        class="b-basic-400 br-50 bg-basic-100 fg-1"
        :class="[!Boolean(value) ? 'bg-basic-200 t-basic-400' : '']"
        :isDisabled="!Boolean(value)"
        :values="
          Object.entries(value ?? {}).map((entry) => {
            const [key, v] = entry;
            return {
              label: `${v.meta.fileName} (${key}) | ${v.width}px/${v.height}px`,
              value: entry,
              label_ext: $t('common.delete'),
              label_ext_class: 't-negative-200',
            };
          })
        "
        @onExtension="remove_picture({ key: 'source', value: $event })"
      />
    </div>

    <div
      v-if="mode === 'gallery'"
      class="gallery-modal t-basic-100 flex flex-column ov-h br-50 ov-h"
    >
      <nav
        class="grid grid-col-2 grid-col-2-m bg-basic-200 t-basic-600 fs-300 pl-400 pr-400 pt-200 pb-200"
      >
        <p class="fs-400 fw-600 uppercase">{{ $t("images.library") }}</p>
        <p class="js-fe" @click="mode = null">
          <i class="icon-close-mini pointer" />
        </p>
      </nav>
      <div class="pl-400 pr-400 pt-300 pb-300 fg-1 relative bg-basic-100 flex flex-column ov-h">
        <div class="flex ai-ct jc-sb pb-100 shadow-down">
          <Pagination
            v-if="pagination"
            :nav_size="32"
            :pagination="pagination"
            @onChangePage="
              ($event) => {
                selected_asset = null;
                GET_Images({ limit, page: $event });
              }
            "
          />
          <div class="flex gap-50">
            <Dropdown
              :placeholder="$t('common.sort_by')"
              class="bg-basic-100 br-50 b-basic-400 t-basic-700 js-e shadow-down"
              :values="[
                { label: $t('common.oldest_first'), value: 'created_at' },
                { label: $t('common.newest_first'), value: '-created_at' },
              ]"
              :selected="[sort_by]"
              @onSelect="
                ($event) => {
                  sort_by = $event;
                  GET_Images({ limit, page });
                }
              "
            />
            <Dropdown
              class="bg-basic-100 br-50 b-basic-400 t-basic-700 js-e shadow-down"
              :values="[
                { label: 10, value: 10 },
                { label: 20, value: 20 },
                { label: 30, value: 30 },
              ]"
              :selected="[limit]"
              @onSelect="
                ($event) => {
                  gallery = null;
                  selected_asset = null;
                  limit = $event;
                  GET_Images({ limit: $event });
                }
              "
            />
          </div>
        </div>
        <div class="flex wrap ai-ct gap-50 pv-100">
          <p class="fs-100 t-basic-500">{{ $t("gallery.filter_by_tag") }}</p>
          <p
            v-for="(t, idx) in tags"
            :key="`t-${idx}`"
            class="ic-tag-chip pointer"
            :class="[isTagSelected(t) ? 'ic-tag-chip--active' : '']"
            @click="
              () => {
                const index = selected_tags.indexOf(t.slug);
                if (index === -1) {
                  selected_tags.push(t.slug);
                } else {
                  selected_tags.splice(index, 1);
                }
                filterByTags();
              }
            "
          >
            {{ t.label }}
          </p>
          <button
            v-if="selected_tags.length"
            class="ic-tag-chip pointer flex ai-ct jc-ct"
            @click="
              () => {
                selected_tags = [];
                filterByTags();
              }
            "
          >
            <FontAwesomeIcon icon="xmark" />
          </button>
        </div>
        <div class="grid grid-col-5 gap-100 relative pv-100 fg-1 ovy-auto" style="min-height: 0">
          <div
            v-for="(g, i) in gallery"
            @click="selected_asset = i"
            class="ic-gallery-card bg-basic-100 relative grid-square pointer br-50"
            :class="{ 'ic-gallery-card--selected': selected_asset === i }"
          >
            <HoverMe
              :text="g.meta && g.meta.fileName ? g.meta.fileName : 'No title'"
              class="absolute absolute-ct w-100 h-100"
            >
              <div class="absolute absolute-ct w-100 h-100 ov-h">
                <img
                  v-if="g._thumbSrc && !g._thumbFailed"
                  :src="g._thumbSrc"
                  :alt="g.meta && g.meta.fileName ? g.meta.fileName : ''"
                  class="absolute absolute-ct w-100"
                  style="object-fit: cover; height: 100%"
                  @error="g._thumbFailed = true"
                />
                <div
                  v-if="!g._thumbSrc || g._thumbFailed"
                  class="ic-gallery-fallback"
                >
                  <FontAwesomeIcon icon="image" class="ic-gallery-fallback__icon" />
                  <span class="ic-gallery-fallback__name">{{
                    g.meta && g.meta.fileName
                      ? g.meta.fileName
                      : "No preview"
                  }}</span>
                </div>
              </div>
            </HoverMe>
            <div v-if="selected_asset === i" class="ic-gallery-check">
              <FontAwesomeIcon icon="circle-check" />
            </div>
          </div>
        </div>
        <div class="flex jc-sb ai-ct">
          <BasicButton
            :text="$t('images.add_photo')"
            :icon="'plus'"
            class="br-50 t-support-400 fs-200 jc-ct b-basic-400 bg-basic-300-hover"
            @click="mode = 'new-picture'"
          />
          <div class="flex ai-ct gap-100">
            <div class="flex gap-50">
              <button
                class="ic-device-chip pointer"
                :class="{ 'ic-device-chip--active': set_mobile }"
                @click="set_mobile = !set_mobile"
              >
                <FontAwesomeIcon
                  v-if="set_mobile"
                  icon="circle-check"
                  class="ic-device-chip__icon"
                />
                {{ $t("images.mobile") }}
              </button>
              <button
                class="ic-device-chip pointer"
                :class="{ 'ic-device-chip--active': set_desktop }"
                @click="set_desktop = !set_desktop"
              >
                <FontAwesomeIcon
                  v-if="set_desktop"
                  icon="circle-check"
                  class="ic-device-chip__icon"
                />
                {{ $t("images.desktop") }}
              </button>
            </div>
            <BasicButton
              :text="$t('common.accept')"
              class="br-50 fs-100 shadow-down jc-ct"
              :class="[
                !canAccept
                  ? 't-basic-500 b-basic-400 bg-basic-200'
                  : 't-basic-100 b-support-400 bg-support-400',
              ]"
              :isDisabled="!canAccept"
              @click="handleAccept"
            />
          </div>
        </div>
      </div>
    </div>
    <div
      v-if="mode === 'new-picture'"
      class="gallery-modal t-basic-100 flex flex-column ov-h br-50"
    >
      <nav
        class="flex bg-basic-200 t-basic-600 fs-300 pl-400 pr-400 pt-200 pb-200"
      >
        <p class="mr-100 pointer" @click="mode = 'gallery'">
          <i class="icon-arrow-left" />
        </p>
        <p class="fw-600 uppercase">{{ $t("images.new_photo") }}</p>
      </nav>
      <div class="pl-400 pr-400 bg-basic-100 fg-1 ovy-auto pt-400 pb-400">
        <div
          class="ic-dropzone"
          :class="{ 'ic-dropzone--dragover': isDraggingOver }"
          @click="$refs.file.click()"
          @dragover.prevent="isDraggingOver = true"
          @dragleave="isDraggingOver = false"
          @drop.prevent="onDrop"
        >
          <FontAwesomeIcon icon="upload" class="t-basic-400 fs-500" />
          <span class="t-basic-500 fs-200">{{ $t('gallery.drop_files_here') }}</span>
          <span class="t-basic-400 fs-100">{{ $t('gallery.or_click_to_browse') }}</span>
        </div>
        <input
          type="file"
          ref="file"
          class="sr-only"
          accept="image/*"
          @change="set_File"
        />

        <div v-if="filePreview" class="mt-300">
          <div class="grid grid-col-2 gap-400 bg-basic-100 p-300 br-50 b-basic-300">
            <img :src="filePreview" alt="" style="max-width: 100%; border-radius: 4px" />
            <div class="flex-column gap-200 ai-fs">
              <BasicInput
                class="bg-basic-100 br-50 t-basic-600 lh-base-elem"
                :label="'alt'"
                v-model="meta.alt"
              />
              <p class="fs-200 t-basic-600 mt-100">
                {{ $t("images.choose_tags") }}
              </p>
              <div class="flex wrap gap-50">
                <p
                  v-for="tag in tags"
                  :key="tag.slug"
                  class="ic-tag-chip pointer"
                  :class="[isTagSelected(tag) ? 'ic-tag-chip--active' : '']"
                  @click="
                    () => {
                      const index = selected_tags.indexOf(tag.label);
                      if (index === -1) {
                        selected_tags.push(tag.label);
                      } else {
                        selected_tags.splice(index, 1);
                      }
                    }
                  "
                >
                  {{ tag.label }}
                </p>
              </div>
              <BasicButton
                :text="$t('gallery.upload')"
                @click="upload_File({})"
                class="br-50 jc-ct t-basic-100 b-support-400 bg-support-400"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { _METHOD_content } from "@/api/contentDB/api";
import { useNotifyStore } from "@/stores/notify";
export default {
  setup() {
    const notify = useNotifyStore();
    return { notify };
  },
  props: {
    label: {
      type: [Boolean, String],
      default: null,
    },
    value: {
      type: [Boolean, Object],
      default: null,
    },
  },
  data() {
    return {
      loading: false,
      mode: null,

      //
      gallery: null,
      pagination: null,
      page: 1,
      limit: 20,
      sort_by: "-created_at",
      //
      selected_asset: null,
      set_mobile: true,
      set_desktop: true,

      // new picture
      file: null,
      filePreview: null,
      isDraggingOver: false,
      tags: [],
      newTag: "",
      newFileTags: [],
      selected_tags: [],
      meta: {
        alt: null,
        fileName: null,
      },
    };
  },
  computed: {
    canAccept() {
      return (
        this.selected_asset !== null && (this.set_mobile || this.set_desktop)
      );
    },
  },
  methods: {
    async init() {
      //if (!this.value) {
      this.mode = "gallery";
      await this.GET_Images({});
      this.GET_Tags({ url: `/image-tags/`, method: "get" });

      //}
    },
    isTagSelected(currentTag) {
      return this.selected_tags.includes(currentTag.label);
    },
    async GET_Images({
      method = "get",
      url = "/images/",
      page = 1,
      limit = 10,
      tags = null,
    }) {
      try {
        this.loading = true;
        const { data: response } = await _METHOD_content({
          method,
          url,
          params: {
            page,
            limit: this.limit,
            sort: this.sort_by,
            tags,
          },
        });

        const { data = [], pagination = {} } = response;

        this.gallery = data.map((img) => {
          const set = img.set?.length
            ? img.set
            : [{ source: img.image, width: img.width, height: img.height }];
          return {
            ...img,
            set,
            _thumbSrc: set[0]?.source || img.image || null,
            _thumbFailed: false,
          };
        });

        this.pagination = pagination;
      } catch (error) {
        console.log("error", error);
      } finally {
        this.loading = false;
      }
    },
    handleAccept() {
      if (!this.canAccept) return;
      const asset = this.gallery.at(this.selected_asset);
      const _value = this.value ? { ...this.value } : {};
      if (this.set_mobile) _value["mobile"] = asset;
      if (this.set_desktop) _value["desktop"] = asset;
      this.$emit("onChange", _value);
      this.selected_asset = null;
      this.set_mobile = true;
      this.set_desktop = true;
      this.mode = null;
    },
    set_image({ type = null, asset = null }) {
      if (![type, asset].every(Boolean)) return;
      const _value = this.value ? { ...this.value } : {};
      _value[type] = asset;
      this.$emit("onChange", _value);
      this.selected_asset = null;
      this.set_mobile = true;
      this.set_desktop = true;
      this.mode = null;
    },
    remove_picture({ value = null }) {
      const _setted_value = this.value ? { ...this.value } : {};

      const [key, _values] = value;
      delete _setted_value[key];

      this.$emit(
        "onChange",
        Object.keys(_setted_value).length ? _setted_value : null
      );
    },
    onDrop(event) {
      this.isDraggingOver = false;
      const file = event.dataTransfer.files[0];
      if (!file || !file.type.startsWith("image/")) return;
      this.loadFile(file);
    },
    async set_File() {
      const file = this.$refs.file.files[0];
      if (!file) return;
      this.loadFile(file);
    },
    async loadFile(file) {
      this.filePreview = URL.createObjectURL(file);
      this.file = await this.create_Base64Image(file);
      this.meta.fileName = file.name;
    },
    create_Base64Image(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
      });
    },
    async upload_File({ method = "post", url = "/images/" }) {
      try {
        if (this.file === null) throw new Error(`Photo missing`);
        const {
          data: { data, meta },
        } = await _METHOD_content({
          method,
          url,
          type: "images",
          meta: this.meta,
          image: this.file,
          tags: this.selected_tags.map((tag) => {
            return { label: tag, slug: tag };
          }),
        });
        this.notify.spawnNotification({
          msg: this.$t("notifications.success"),
          type: "positive",
        });
        this.init();
      } catch (err) {
        if (err.message === "Photo missing") {
          this.notify.spawnNotification({
            msg: this.$t("notifications.error"),
            type: "negative",
          });
          return;
        }
        this.notify.spawnNotification({
          title: this.$t("notifications.error"),
          msg: this.$t("notifications.save_error"),
          type: "negative",
        });
      } finally {
      }
    },
    async GET_Tags({ url = null, method = null, limit = 999 }) {
      try {
        const { data: response } = await _METHOD_content({
          url,
          method,
          params: { limit },
        });
        const { data } = response;
        this.tags = data;
      } catch (error) {}
    },
    async filterByTags() {
      this.GET_Images({
        page: 1,
        limit: this.limit,
        reset: true,
        tags: this.selected_tags,
      });
    },
  },
  // created() {
  //   this.init();
  // },
};
</script>

<style lang="scss" scoped>
.gallery-modal {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 2;
}

.ic-gallery-card {
  border: 2px solid var(--c-basic-400);
  transition: border-color 0.15s ease;

  &:hover {
    border-color: var(--c-basic-600);
  }

  &--selected {
    border-color: var(--c-support-400);
    box-shadow: 0 0 0 1px var(--c-support-400);
  }
}

.ic-gallery-check {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: var(--c-support-400);
  background: var(--c-basic-100);
  border-radius: 50%;
  z-index: 1;
  pointer-events: none;
}

.ic-device-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 30px;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 50px;
  border: 1px solid var(--c-basic-400);
  background: transparent;
  color: var(--c-basic-500);
  transition: all 0.15s ease;
  text-decoration: line-through;

  &--active {
    border-color: var(--c-support-400);
    color: var(--c-basic-700);
    text-decoration: none;
  }

  &__icon {
    font-size: 14px;
    color: var(--c-support-400);
  }
}

.ic-dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 32px 16px;
  border: 2px dashed var(--c-basic-400);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease;

  &:hover {
    border-color: var(--c-support-400);
    background: var(--c-basic-200);
  }

  &--dragover {
    border-color: var(--c-support-400);
    background: var(--c-support-100);
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
  border: 0;
}

.ic-gallery-fallback {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: var(--c-basic-200);

  &__icon {
    font-size: 20px;
    color: var(--c-basic-400);
  }

  &__name {
    font-size: 10px;
    color: var(--c-basic-500);
    text-align: center;
    padding: 0 6px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }
}

.ic-tag-chip {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 10px;
  font-size: 12px;
  border-radius: 50px;
  border: 1px solid var(--c-basic-400);
  background: var(--c-basic-100);
  color: var(--c-basic-700);
  transition: background-color 0.15s ease, border-color 0.15s ease;
  user-select: none;

  &:hover {
    background: var(--c-basic-200);
  }

  &--active {
    background: var(--c-support-400);
    border-color: var(--c-support-400);
    color: var(--c-basic-900);

    &:hover {
      background: var(--c-support-400);
    }
  }
}
</style>
