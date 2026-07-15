<template>
  <div>
    <h4 class="mb-md">{{ $t("images.add_new_category") }}</h4>
    <hr class="mv-lg" />
    <BasicInput
      class="size-sm"
      :label="$t('images.category_name')"
      v-model="newTag"
    />
    <ButtonBasic
      :text="$t('common.save')"
      :styles="'full'"
      @click="addNewTag"
      class="bg-primary-100 txt-gray-700 w-full sticky-btn mt-md"
    />
    <hr class="mv-lg" />
    <p class="mt-lg">{{ $t("images.photos") }}</p>
    <div class="images-categories">
      <ButtonBasic
        class="outline txt-gray-700 w-full sticky-btn mt-md"
        v-for="(t, i) in tags"
        :key="`${i}-tag-${t}`"
        :text="t.label"
        :isDisabled="true"
      />
    </div>
  </div>
</template>

<script>
import { POST_Image, GET_ImageTags, POST_ImageTags } from "@/api/contentDB/api";
import { useLoaderStore } from "@/stores/loader";
import { useNotifyStore } from "@/stores/notify";

export default {
  setup() {
    const loader = useLoaderStore();
    const notify = useNotifyStore();
    return { loader, notify };
  },
  data() {
    return {
      file: null,
      filePreview: null,
      tags: null,
      newTag: "",
      newFileTags: [],
      meta: {
        alt: null,
        fileName: null,
      },
    };
  },
  methods: {
    async addNewTag() {
      if (this.newTag.length) {
        try {
          this.loader.handyLoaderStart();
          await POST_ImageTags({ label: this.newTag });
          this.notify.spawnNotification({
            msg: this.$t("notifications.success"),
            type: "positive",
          });
          this.getTags();
        } catch ({ response }) {
          this.notify.spawnNotification({
            msg: this.$t("notifications.error"),
            type: "negative",
          });
        } finally {
          this.loader.handyLoaderFinish();
        }
      } else {
        this.notify.spawnNotification({
          msg: this.$t("notifications.error"),
          type: "negative",
        });
      }
    },
    async getTags() {
      try {
        this.loader.handyLoaderStart();
        const {
          data: {
            data = [],
            meta: { status },
          },
        } = await GET_ImageTags({});
        this.tags = data;
      } catch (error) {
        console.log(error);
      } finally {
        this.loader.handyLoaderFinish();
      }
    },
  },
  async created() {
    this.getTags();
  },
};
</script>

<style lang="scss"></style>
