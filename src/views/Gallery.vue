<template>
  <div
    class="fs-200 p-500 flex-column jc-sb gap-400 image-gallery"
    style="height: 100%"
  >
    <!-- Changed to 100vh -->
    <div
      class="fg-1 flex-column gap-400"
      style="min-height: 0; overflow: hidden"
    >
      <FloatingActions
        :actions="fabActions"
        :back-handler="
          mode !== 'read'
            ? () => {
                mode = 'read';
              }
            : null
        "
      />
      <div
        class="t-basic-600 fg-1 ovy-auto flex-column gap-300"
        v-if="mode === 'tag'"
      >
        <div>
          <p class="fs-200 t-basic-600 mb-100">{{ $t("gallery.tag_list") }}</p>
          <div class="flex wrap ai-ct gap-100 mb-200">
            <p
              v-for="tag in tags"
              :key="`manage-tag-${tag.slug}`"
              class="tag-chip pointer"
              :class="[isTagSelected(tag) ? 'tag-chip--active' : '']"
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
            <button
              v-if="selected_tags.length"
              class="tag-chip tag-chip--danger pointer flex ai-ct gap-50"
              @click="deleteSelectedTags()"
            >
              <FontAwesomeIcon icon="trash-can" />
              {{ $t("gallery.remove_tag") }}
            </button>
          </div>
        </div>
        <div class="flex ai-ct gap-100" style="max-width: 400px">
          <BasicInput
            class="bg-basic-100 lh-base-elem fg-1 tag-input"
            :label="$t('gallery.add_new_tag')"
            v-model="new_tag_input"
          />
          <button
            class="tag-add-btn bg-support-400 t-basic-100 br-50 pointer"
            @click="addNewTag()"
          >
            <FontAwesomeIcon icon="plus" />
          </button>
        </div>
      </div>
      <div v-if="mode === 'edit_tag'" class="flex-column gap-300">
        <div>
          <p class="fs-200 t-basic-600 mb-100">
            {{ $t("gallery.select_tags") }}
          </p>
          <div v-if="tags.length" class="flex wrap ai-ct gap-100 mb-200">
            <p
              v-for="tag in tags"
              :key="`edit-tag-${tag.slug}`"
              class="tag-chip pointer"
              :class="[isTagSelected(tag) ? 'tag-chip--active' : '']"
              @click="
                () => {
                  const sIndex = selected_tags.indexOf(tag.label);
                  if (sIndex === -1) {
                    selected_tags.push(tag.label);
                  } else {
                    selected_tags.splice(sIndex, 1);
                  }
                  const eIndex = edited_image_tags.findIndex(
                    (el) => el.label === tag.label
                  );
                  if (eIndex === -1) {
                    edited_image_tags.push(tag);
                  } else {
                    edited_image_tags.splice(eIndex, 1);
                  }
                }
              "
            >
              {{ tag.label }}
            </p>
          </div>
          <div v-else class="flex ai-ct gap-100 p-200 br-50 b-basic-400 bg-basic-200 t-basic-500 fs-200">
            <FontAwesomeIcon icon="circle-info" />
            <span>{{ $t("gallery.no_tags_yet") }}</span>
            <button
              class="t-support-400 pointer"
              style="background: none; border: none; text-decoration: underline; font-size: inherit"
              @click="mode = 'tag'"
            >{{ $t("gallery.go_to_manage_tags") }}</button>
          </div>
        </div>
        <div class="flex ai-ct gap-100">
          <BasicInput
            class="bg-basic-100 lh-base-elem fg-1 tag-input"
            :label="$t('gallery.quick_add_tag')"
            v-model="new_tag_input"
            @keydown.enter.native="quickAddTag"
          />
          <button
            class="tag-add-btn bg-support-400 t-basic-100 br-50 pointer"
            @click="quickAddTag"
          >
            <FontAwesomeIcon icon="plus" />
          </button>
        </div>
        <div class="flex gap-100">
          <button
            class="gallery-action-btn bg-support-400 b-support-400 t-basic-100"
            @click="
              addTagToImg();
              mode = 'read';
            "
          >
            <FontAwesomeIcon icon="floppy-disk" />
            {{ $t("common.save") }}
          </button>
          <button
            class="gallery-action-btn bg-basic-100 b-basic-400 t-basic-700"
            @click="mode = 'read'"
          >
            {{ $t("common.cancel") }}
          </button>
        </div>
      </div>
      <div
        class="br-50 t-basic-600 fg-1 ovy-auto flex-column"
        v-if="mode === 'add_new'"
      >
        <div class="mb-400">
          <div
            class="gallery-dropzone"
            :class="{ 'gallery-dropzone--dragover': isDraggingOver }"
            role="button"
            tabindex="0"
            :aria-label="$t('gallery.drop_files_here')"
            @click="$refs.file.click()"
            @keydown.enter="$refs.file.click()"
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
            name="file"
            id="file"
            class="sr-only"
            ref="file"
            accept="image/*"
            @change="set_File"
          />
        </div>
        <div
          class="fg-1 ovy-auto grid grid-col-2 gap-500 bg-basic-100 p-500 br-50 b-basic-300"
          v-if="filePreview"
        >
          <div>
            <img :src="filePreview" alt="" class="" />
          </div>
          <div class="flex-column">
            <div>
              <p class="fs-100 t-informative-200">Optionals</p>
              <BasicInput
                class="bg-basic-100 br-50 t-basic-600 mt-300 lh-base-elem"
                :label="'Picture alt.'"
                v-model="meta.alt"
              />
              <p class="fs-200 t-basic-600 mt-200 mb-100">
                {{ $t("gallery.select_tags") }}
              </p>
              <div class="flex wrap ai-ct gap-100">
                <p
                  v-for="tag in tags"
                  :key="`upload-tag-${tag.slug}`"
                  class="tag-chip pointer"
                  :class="[isTagSelected(tag) ? 'tag-chip--active' : '']"
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
                v-if="filePreview"
                :text="$t('gallery.upload')"
                @click="upload_File({})"
                class="br-50 jc-ct mt-200"
                :class="[
                  filePreview === null
                    ? 't-basic-500 b-basic-400 bg-basic-200'
                    : 't-basic-100 b-support-400 bg-support-400',
                ]"
              />
              <div class="mt-200"></div>
            </div>
          </div>
        </div>
      </div>

      <div
        class="fg-1 ovy-auto"
        style="min-height: 0"
        v-if="gallery && mode === 'read'"
      >
        <div class="flex ai-ct jc-sb gap-200 mb-200">
          <MobileFilterPanel
            :active-count="mode === 'read' ? selected_tags.length : 0"
            :trigger-label="$t('gallery.filter_by_tag')"
          >
            <p class="fs-200 t-basic-600">{{ $t("gallery.filter_by_tag") }}</p>
            <p
              v-for="(t, idx) in tags"
              :key="`t-${idx}`"
              class="tag-chip pointer"
              :class="[isTagSelected(t) ? 'tag-chip--active' : '']"
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
              class="tag-chip pointer flex ai-ct jc-ct"
              :aria-label="$t('gallery.reset_filters')"
              @click="
                () => {
                  selected_tags = [];
                  filterByTags();
                }
              "
            >
              <FontAwesomeIcon icon="xmark" />
            </button>
          </MobileFilterPanel>
          <div class="flex gap-100 fs-0">
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
                  gallery = null;
                  gallery_pagination = null;
                  current_view_page = 1;
                  sort_by = $event;
                  this.set_page({ page: 1, limit, sort: sort_by });
                }
              "
            />
            <Dropdown
              class="bg-basic-100 br-50 b-basic-400 t-basic-700 js-e shadow-down"
              :values="[
                { label: 18, value: 18 },
                { label: 36, value: 36 },
                { label: 54, value: 54 },
              ]"
              :selected="[limit]"
              @onSelect="
                ($event) => {
                  gallery = null;
                  gallery_pagination = null;
                  current_view_page = 1;
                  limit = $event;
                  this.set_page({ page: 1, limit, sort: sort_by });
                }
              "
            />
          </div>
        </div>
        <div
          class="gallery-grid bg-basic-100 b-basic-300 br-50 p-200"
          v-out="
            () => {
              selected = null;
            }
          "
          @click.self="selected = null"
        >
          <div
            v-for="(image, index) in gallery[current_view_page]"
            :class="[
              'gallery-card relative bg-basic-300 br-50 b-basic-400 b-basic-500-hover pointer',
              { 'gallery-card--selected': selected === image.uid },
            ]"
            @click="selected = selected === image.uid ? null : image.uid"
          >
            <div class="ov-h h-100 w-100 br-50">
              <HoverMe
                :text="
                  image.meta && image.meta.fileName
                    ? image.meta.fileName
                    : 'No title'
                "
                class="absolute absolute-ct w-100 h-100"
              >
                <BasicImage
                  class="absolute absolute-ct w-100"
                  :set="image.set"
                  :higher_rez="false"
                  :ommit_media_query="true"
                  :key="image.uid"
                />
              </HoverMe>
              <div v-if="image.tags && image.tags.length" class="gallery-tags">
                <span
                  v-for="tag in image.tags"
                  :key="`img-tag-${image.uid}-${tag.slug}`"
                  class="gallery-tags__pill"
                  >{{ tag.label }}</span
                >
              </div>
              <div
                class="gallery-actions"
                v-if="selected === image.uid"
                @click.stop
              >
                <button
                  class="gallery-actions__btn t-negative-200 pointer"
                  @click="
                    DELETE_Image({
                      url: `/images/${image.uid}`,
                      method: 'delete',
                    })
                  "
                >
                  <FontAwesomeIcon icon="trash-can" />
                </button>
                <button
                  class="gallery-actions__btn t-basic-600 pointer"
                  @click="
                    mode = 'edit_tag';
                    tag_img_uid = image.uid;
                    get_image_tags();
                  "
                >
                  <FontAwesomeIcon icon="tag" />
                </button>
              </div>
            </div>
          </div>
          <div
            v-if="
              gallery[current_view_page] && !gallery[current_view_page].length
            "
          >
            {{ $t("gallery.no_photos") }}
          </div>
        </div>
      </div>
    </div>

    <div v-if="gallery && mode === 'read'">
      <Pagination
        v-if="gallery_pagination"
        :nav_size="32"
        :pagination="{ ...gallery_pagination, page: current_view_page }"
        @onChangePage="set_page({ page: $event, limit, sort: sort_by })"
      />
    </div>
  </div>
</template>

<script>
import {
  _METHOD_content,
  DELETE_ImageTags,
  PUT_ImageTags,
} from "@/api/contentDB/api";
import { useNotifyStore } from "@/stores/notify";
import { slugBuilder } from "@/utils/normalizers/assets-normalizers";
export default {
  setup() {
    const notify = useNotifyStore();
    return { notify };
  },
  data() {
    return {
      current_view_page: 1,
      limit: 18,
      gallery: null,
      gallery_pagination: null,
      selected: null,
      sort_by: "-created_at",
      // uploader
      file: null,
      filePreview: null,
      // tags ---
      force_update: 1,
      tags: [],
      edit_tag: null,
      new_tag: null,
      new_tag_input: "",
      newFileTags: [],
      selected_tags: [],
      // ----
      meta: {
        alt: null,
        fileName: null,
      },
      //
      mode: "read",
      isDraggingOver: false,
      tag_img_uid: "",
      edited_image_tags: null,
      picToEdit: null,
    };
  },
  computed: {
    fabActions() {
      return [
        {
          icon: "upload",
          label: this.$t("images.add_photo"),
          handler: () => this.toggleAddNewMode(),
        },
        {
          icon: "tag",
          label: this.$t("gallery.add_tag"),
          handler: () => this.toggleTagMode(),
          variant: "secondary",
        },
      ];
    },
  },
  methods: {
    toggleTagMode() {
      this.mode = this.mode === "tag" ? "read" : "tag";
    },
    toggleAddNewMode() {
      this.mode = this.mode === "add_new" ? "read" : "add_new";
    },
    isTagSelected(currentTag) {
      return (
        this.selected_tags.includes(currentTag.label) ||
        this.selected_tags.includes(currentTag.slug)
      );
    },
    init() {
      this.set_page({ page: this.current_view_page, limit: this.limit });
      this.GET_Tags({ url: `/image-tags/`, method: "get" });
    },
    async GET_gallery({
      url = null,
      method = null,
      page = 1,
      limit = 12,
      sort = "created_at",
      tags = null,
    }) {
      try {
        const { data: response } = await _METHOD_content({
          url,
          method,
          params: { page, limit, sort, tags },
        });
        console.log(response);

        return response;
      } catch (error) {}
    },
    async set_page({
      page = 1,
      limit = 12,
      sort = "created_at",
      reset = false,
    }) {
      const _content = this.gallery && !reset ? { ...this.gallery } : {};
      let _content_pagination =
        this.gallery_pagination && !reset ? { ...this.gallery_pagination } : {};

      if (reset || !_content[page]) {
        try {
          const { data: response, pagination = null } = await this.GET_gallery({
            url: "/images/",
            method: "get",
            page,
            sort: this.sort_by,
            limit,
            tags: this.selected_tags,
          });

          _content[page] = response.map((img) => ({
            ...img,
            set: img.set?.length
              ? img.set
              : [{ source: img.image, width: img.width, height: img.height }],
          }));
          _content_pagination = pagination;
        } catch (error) {
          console.log("EREOR", error);
          this.notify.spawnNotification({
            msg: this.$t("notifications.error"),
            type: "negative",
          });
        }
      }
      this.current_view_page = page;
      this.gallery = _content;
      this.gallery_pagination = _content_pagination;
    },
    async DELETE_Image({ url = null, method = null }) {
      try {
        const { data: response } = await _METHOD_content({
          method,
          url,
        });

        this.gallery = null;
        this.gallery_pagination = null;
        this.current_view_page = 1;
        this.set_page({ page: 1, limit: this.limit, reset: true });

        this.notify.spawnNotification({
          msg: this.$t("notifications.photo_deleted"),
          type: "positive",
        });
      } catch (error) {
        this.notify.spawnNotification({
          msg: this.$t("notifications.error"),
          type: "negative",
        });
      }
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

        console.log({
          method,
          url,
          type: "images",
          meta: this.meta,
          image: this.file,
          tags: this.tags,
        });

        const { data: response } = await _METHOD_content({
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
          msg: this.$t("notifications.photo_uploaded"),
          type: "positive",
        });
        this.gallery = null;
        this.gallery_pagination = null;
        this.current_view_page = 1;
        this.set_page({ page: 1, limit: this.limit });
        this.mode = "read";
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
          msg: this.$t("notifications.unexpected_error"),
          type: "negative",
        });
      } finally {
      }
    },
    async filterByTags() {
      this.set_page({ page: 1, limit: this.limit, reset: true });
    },
    async quickAddTag() {
      if (!this.new_tag_input) return;
      const label = this.new_tag_input;
      const slug = this.slugBuilder(label);
      try {
        const { data: response } = await _METHOD_content({
          url: "/image-tags/",
          method: "post",
          payload: { slug, label },
        });
        const { data } = response;
        this.tags = [data, ...this.tags];
        this.selected_tags.push(data.label);
        if (!this.edited_image_tags) this.edited_image_tags = [];
        this.edited_image_tags.push(data);
        this.new_tag_input = "";
        this.notify.spawnNotification({
          msg: this.$t("notifications.tag_added"),
          type: "positive",
        });
      } catch {
        this.notify.spawnNotification({
          msg: this.$t("notifications.error"),
          type: "negative",
        });
      }
    },
    addNewTag() {
      if (!this.new_tag_input) {
        return;
      }
      this.new_tag = {
        slug: this.new_tag_input,
        label: this.new_tag_input,
      };
      this.POST_Tag({
        url: "/image-tags/",
        method: "post",
        payload: this.new_tag,
      });
    },
    async get_image_tags() {
      let found_img = this.gallery[this.current_view_page].find((el) => {
        return el.uid === this.tag_img_uid;
      });

      this.edited_image_tags = found_img.tags;
      this.selected_tags = found_img.tags.map((tag) => {
        return tag.label;
      });
      this.picToEdit = found_img;
    },
    async addTagToImg() {
      try {
        const tags_to_send = this.edited_image_tags.map(({ slug, label }) => ({
          slug,
          label,
        }));
        await PUT_ImageTags({ uid: this.tag_img_uid, tags: tags_to_send });
        this.notify.spawnNotification({
          msg: this.$t("notifications.success"),
          type: "positive",
        });
        this.set_page({
          page: this.current_view_page,
          limit: this.limit,
          reset: true,
        });
      } catch (err) {
        console.error("[addTagToImg]", err);
        this.notify.spawnNotification({
          msg: this.$t("notifications.error"),
          type: "negative",
        });
      }
    },
    async deleteSelectedTags() {
      try {
        const response = this.selected_tags.map((it) =>
          DELETE_ImageTags({ slug: it })
        );

        const data = await Promise.allSettled(response);
        const errors = data.filter((res) => res.status === "rejected");
        if (errors.length) {
          const err = new Error();
          err.notify = {
            msg: this.$t("notifications.error"),
            count: errors.length,
          };
          throw err;
        }
        this.notify.spawnNotification({
          msg: this.$t("notifications.tag_deleted"),
          type: "positive",
        });
        this.GET_Tags({ url: `/image-tags/`, method: "get" });
        this.selected_tags = [];
      } catch ({ notify }) {
        if (notify) {
          this.notify.spawnNotification({
            msg: this.$t("notifications.error"),
            type: "negative",
          });
        }
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
    async POST_Tag({ url = null, method = null, payload = null }) {
      try {
        const { data: response } = await _METHOD_content({
          url,
          method,
          payload,
        });

        const { data, meta } = response;
        this.notify.spawnNotification({
          msg: this.$t("notifications.tag_added"),
          type: "positive",
        });
        this.tags = [data, ...this.tags];
        this.edit_tag = null;
        this.new_tag = null;
      } catch (error) {
        console.log(error);
        this.notify.spawnNotification({
          msg: this.$t("notifications.error"),
          type: "negative",
        });
      }
    },
    async DELETE_Tage({ url = null, method = null }, _slug) {
      try {
        const { data: response } = await _METHOD_content({
          url,
          method,
        });

        this.notify.spawnNotification({
          msg: this.$t("notifications.tag_deleted"),
          type: "positive",
        });
        // this.tags = [data, ...this.tags];
        // this.edit_tag = null;
        // this.new_tag = null;
        // this.tags = this.tags.filter(({ slug }) => {
        //   return slug !== _slug;
        // });
      } catch (error) {
        console.log(error);
        this.notify.spawnNotification({
          msg: this.$t("notifications.error"),
          type: "negative",
        });
      }
    },
    slugBuilder(label) {
      return slugBuilder(label);
    },
  },

  created() {
    console.log("🔍 Gallery created, initial mode:", this.mode);
    this.init();
  },
  mounted() {},
  components: {},
};
</script>
<style lang="scss" scoped>
$btn-height: 36px;
$radius: 5px;

.tag-chip {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 0.75rem;
  font-size: 12px;
  border-radius: 50px;
  border: 1px solid var(--c-basic-400);
  background-color: var(--c-basic-100);
  color: var(--c-basic-700);
  white-space: nowrap;
  transition: all 0.15s ease;
  &:hover {
    border-color: var(--c-basic-500);
    background-color: var(--c-basic-200);
  }
  &--active {
    background-color: var(--c-support-400);
    border-color: var(--c-support-400);
    color: var(--c-basic-100);
    &:hover {
      filter: brightness(1.1);
      background-color: var(--c-support-400);
      border-color: var(--c-support-400);
    }
  }
  &--danger {
    color: var(--c-negative-200);
    gap: 0.25rem;
    &:hover {
      background-color: var(--c-negative-200);
      border-color: var(--c-negative-200);
      color: var(--c-basic-100);
    }
  }
}
.tag-input :deep(input) {
  height: $btn-height;
  box-sizing: border-box;
}
.tag-add-btn {
  width: $btn-height;
  height: $btn-height;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: $radius;
  &:hover {
    filter: brightness(1.1);
  }
}
.gallery-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  height: $btn-height;
  padding: 0 1rem;
  font-size: var(--fs-200);
  border-radius: $radius;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}
.gallery-dropzone {
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
  &:hover,
  &:focus-visible {
    border-color: var(--c-support-400);
    background: var(--c-basic-200);
    outline: none;
  }
  &--dragover {
    border-color: var(--c-support-400);
    background: var(--c-support-100);
  }
}
.gallery-card {
  aspect-ratio: 1 / 1;
}
.gallery-tags {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 6px;
  background: linear-gradient(transparent, var(--overlay-heavy));
  border-radius: 0 0 $radius $radius;
  opacity: 0;
  transform: translateY(4px);
  transition: opacity 0.2s ease, transform 0.2s ease;
  pointer-events: none;
}
.gallery-card:hover .gallery-tags {
  opacity: 1;
  transform: translateY(0);
}
.gallery-tags__pill {
  font-size: 11px;
  line-height: 1;
  padding: 3px 8px;
  border-radius: 50px;
  background-color: var(--c-basic-100);
  color: var(--c-basic-800);
  white-space: nowrap;
}
.gallery-card--selected {
  outline: 2px solid var(--c-primary-200);
  outline-offset: -2px;
}
.gallery-actions {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 4px;
  padding: 4px;
  background: var(--c-basic-200);
  border-top: 1px solid var(--c-basic-400);
  border-radius: 0 0 $radius $radius;
}
.gallery-actions__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  font-size: 12px;
  border: none;
  border-radius: $radius;
  background: none;
  transition: background-color 0.15s ease;
  &:hover {
    background-color: var(--c-basic-300);
  }
}
.gallery-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(6, 1fr);
  @media only screen and (max-width: 1279px) {
    grid-template-columns: repeat(4, 1fr);
  }
  @media only screen and (max-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
}
@media only screen and (max-width: 768px) {
  .image-gallery {
    padding: 16px !important;
  }
}
</style>
