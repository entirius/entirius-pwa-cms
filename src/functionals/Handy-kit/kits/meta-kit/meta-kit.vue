<template>
  <div class="flex-column gap-300 jc-sb h-100 fs-200 t-basic-700">
    <nav
      class="grid grid-col-2 grid-col-2-m ai-ct bg-basic-200 pl-400 pr-400 pt-200 pb-200 t-basic-600 br-tl-50 br-tr-50"
    >
      <p class="fw-600 fs-400 uppercase">
        {{ handyType.label ? handyType.label : $t("common.click") }}
      </p>
      <p
        class="js-fe t-basic-600"
        @click="handy.open_Handykit({ typeId: false })"
      >
        <i class="icon-close-mini pointer" />
      </p>
    </nav>
    <div class="fg-1 pl-400 pr-400 ovy-auto pb-400">
      <div class="grid gap-100 mt-200">
        <div>
          <Switcher
            class="rtl-direction"
            :label="index === 'Index' ? 'Index' : 'No-index'"
            :selected="index === 'Index'"
            @onSelect="
              index === 'Index' ? (index = 'No-index') : (index = 'Index')
            "
          />
        </div>
        <div>
          <Switcher
            class="rtl-direction"
            :label="follow === 'Follow' ? 'Follow' : 'No-follow'"
            :selected="follow === 'Follow'"
            @onSelect="
              follow === 'Follow' ? (follow = 'No-follow') : (follow = 'Follow')
            "
          />
        </div>
        <div class="mt-400">
          <BasicInput
            class="bg-basic-100 lh-base-elem"
            :label="`${$t('meta.meta_title')} - ${title.length}/60`"
            v-model="title"
          />
        </div>
        <div class="mt-200">
          <span class="block fs-200 mb-50">{{
            `${$t("meta.meta_description")} - ${description.length}/160`
          }}</span>
          <TextAreaBasic class="size-sm bg-basic-100" v-model="description" />
        </div>
        <div class="mt-300">
          <BasicInput
            class="bg-basic-100 lh-base-elem"
            :label="`${$t('meta.og_title')} - ${og_title.length}/60`"
            v-model="og_title"
          />
        </div>
        <div class="mt-200">
          <span class="block fs-200 mb-50">{{
            `${$t("meta.og_description")} - ${og_description.length}/160`
          }}</span>
          <TextAreaBasic
            class="size-sm bg-basic-100"
            v-model="og_description"
          />
        </div>
      </div>
      <div class="mt-200">
        <span class="block fs-200 mb-50">{{ $t("meta.og_image") }}</span>
        <div class="grid grid-col-6 gap-100" v-if="pictures">
          <div
            class="pointer ov-h relative b-support-300 br-50 grid-square shadow-down"
            :class="{ 'b-negative-200': !og_image.length }"
          >
            <div v-if="!og_image.length" class="flex jc-ct ai-ct h-100">
              <span class="fs-100">empty</span>
            </div>
            <div v-else class="relative w-100 h-100">
              <div
                class="absolute bg-basic-100 br-100 ov-h t-negative-200"
                style="top: 3px; right: 3px; z-index: 2"
              >
                <BasicButton
                  @click="og_image = ''"
                  :icon="'close-mini'"
                  class="p-0 p-50 ov-h fs-100"
                />
              </div>
              <img class="absolute absolute-ct" :src="og_image" alt="" />
            </div>
          </div>
          <div
            class="pointer relative b-basic-300 p-100 br-50 grid-square"
            v-for="(p, i) in pictures[c_page]"
            @click="
              () => {
                og_image = p.image;
              }
            "
          >
            <HoverMe
              :text="p.meta && p.meta.fileName ? p.meta.fileName : 'No title'"
              class="absolute absolute-ct w-100 h-100"
            >
              <!-- <p>{{ image.set }}</p> -->
              <BasicImage
                class="absolute absolute-ct w-100"
                :set="p.set"
                :higher_rez="false"
                :ommit_media_query="true"
                :key="p.uid"
              />
            </HoverMe>
          </div>
        </div>
        <div class="flex jc-sb mt-200">
          <Dropdown
            :placeholder="$t('common.sort_by')"
            class="bg-basic-100 br-50 b-basic-400 t-basic-700 js-e"
            :values="[
              { label: $t('common.oldest_first'), value: 'created_at' },
              { label: $t('common.newest_first'), value: '-created_at' },
            ]"
            :selected="[sort_by]"
            @onSelect="
              ($event) => {
                pictures = null;
                m_pages = 1;
                c_page = 1;
                sort_by = $event;
                GET_GALLERY({
                  method: 'get',
                  url: '/images/',
                  params: { page: c_page, limit: limit, sort: $event },
                });
              }
            "
          />
          <Pagination
            v-if="pagination"
            :nav_size="32"
            :pagination="{ ...pagination, page: c_page }"
            @onChangePage="
              GET_GALLERY({
                method: 'get',
                url: '/images/',
                params: { page: $event, limit: limit },
              })
            "
          />
        </div>
      </div>
    </div>
    <div
      class="grid grid-col-3 rtl-direction bg-basic-200 pl-400 pr-400 pt-100 pb-100"
    >
      <BasicButton
        class="bg-basic-700 br-50 bg-support-400 fs-200 b-support-400 t-basic-100 w-100 jc-ct"
        :text="$t('common.save')"
        @click="
          pass_asset({
            index,
            follow,
            title,
            og_image,
            og_title,
            description,
            og_description,
          })
        "
      />
    </div>
  </div>
</template>

<script>
import { useNotifyStore } from "@/stores/notify";
import { useHandyStore } from "@/stores/handy";
//import { GET_Images } from "@/api/contentDB/api";
import { _METHOD_content } from "@/api/contentDB/api";

// import Pagination from "@/components/Chunks/Pagination.vue";
export default {
  setup() {
    const notify = useNotifyStore();
    const handy = useHandyStore();
    return { notify, handy };
  },
  data() {
    return {
      index: "Index",
      follow: "Follow",
      title: "",
      og_image: "",
      og_title: "",
      description: "",
      og_description: "",
      //
      show_gallery: false,
      pictures: null,
      pagination: null,
      c_page: 1,
      m_pages: 1,
      limit: 5,
      sort_by: "created_at",
    };
  },
  computed: {
    handyType() {
      return this.handy.handyType;
    },
    defaults() {
      return this.handy.defaults;
    },
  },
  created() {
    this.init();
  },
  methods: {
    open_Handykit(params) {
      this.handy.open_Handykit(params);
    },
    pass_Asset(asset) {
      this.handy.pass_Asset(asset);
    },
    init() {
      const { meta } = this.defaults ?? {};
      if (meta) {
        Object.entries(meta).forEach(([key, value]) => {
          this[key] = value;
        });
      }

      // temp
      this.GET_GALLERY({
        method: "get",
        url: "/images/",
        params: { page: this.c_page, limit: this.limit, sort: this.sort_by },
      });
    },
    pass_asset({
      index = null,
      follow = null,
      title = null,
      og_image = null,
      og_title = null,
      description = null,
      og_description = null,
    }) {
      const _config = {
        index,
        follow,
        title,
        og_image,
        og_title,
        description,
        og_description,
      };
      // ----
      this.pass_Asset(_config);
      this.notify.spawnNotification({
        title: this.$t("notifications.success"),
        msg: this.$t("notifications.success_fun"),
        type: "informative",
      });
      this.open_Handykit({});
    },
    async GET_GALLERY({ method = "get", url = null, params = {}, ...options }) {
      const { page = 1 } = params;
      if (this.pictures && this.pictures[page]) {
        this.c_page = page;
        return;
      }

      try {
        const { data: resposne } = await _METHOD_content({
          method,
          url,
          params,
          ...options,
        });
        const { data = [], pagination = {} } = resposne;

        const { page = null, pages = null } = pagination;
        this.c_page = page;
        if (!this.pictures) this.pictures = {};
        this.pictures[page] = data;
        this.pagination = pagination;
      } catch (error) {
        console.log("error");
        console.log(error);
      }
    },
  },
};
</script>
