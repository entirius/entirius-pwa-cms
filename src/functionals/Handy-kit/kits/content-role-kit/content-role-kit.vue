<template>
  <div class="fs-200 t-basic-600 flex-column gap-300 jc-sb">
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
    <div class="fg-1">
      <Loader v-if="loading" />
      <template v-if="!loading && !setted_contents.length">
        <p class="t-support-300">No setted other docs - can proceed.</p>
      </template>
      <div
        class="p-50 b-basic-300 bg-basic-300 br-50 pointer flex jc-sb ai-ct mb-200"
        @click="selected_contents = [doc_uid]"
      >
        <p>{{ doc_uid }}</p>
        <div class="flex gap-50">
          <span class="ph-50 bg-support-400 t-basic-100 br-50 fs-100"
            >current doc.</span
          >
          <span
            v-if="selected_contents.includes(doc_uid)"
            class="ph-50 bg-support-100 t-basic-100 br-50 mr-50 fs-100"
            >selected</span
          >
        </div>
      </div>
      <template v-if="!loading && setted_contents.length">
        <!-- <p class="t-support-300 mt-100">List of setted contents.</p> -->
        <p class="mb-50">
          Seems like at least one document is already in preview mode.
        </p>
        <p class="fs-100 t-negative-200 mb-100">
          Warning: any other than selected documents will become unpublished.
        </p>
        <div
          v-for="({ uid }, index) in setted_contents"
          class="p-50 b-basic-300 br-50 pointer flex jc-sb ai-ct mb-50"
          :class="{ 'b-basic-500': selected_contents.includes(uid) }"
          @click="selected_contents = [uid]"
        >
          <p>{{ uid }}</p>
          <div class="flex gap-50">
            <span
              v-if="doc_uid === uid"
              class="ph-50 bg-support-400 t-basic-100 br-50 fs-100"
              >Current</span
            >
            <span class="ph-50 bg-support-300 t-basic-100 br-50 fs-100"
              >setted</span
            >
            <span
              v-if="selected_contents.includes(uid)"
              class="ph-50 bg-support-100 t-basic-100 br-50 mr-50 fs-100"
              >selected</span
            >
          </div>
        </div>
      </template>
    </div>
    <div class="grid grid-col-3 gap-100 rtl-direction">
      <BasicButton
        class="br-50 fs-200 w-100 jc-ct"
        :class="[
          !selected_contents && !selected_contents.length
            ? 'bg-basic-300 t-basic-500 b-basic-300'
            : 'bg-basic-700 bg-support-400-hover b-support-400-hover b-basic-800 t-basic-100',
        ]"
        :text="$t('common.save')"
        :isDisabled="!selected_contents && !selected_contents.length"
        @click="on_Save"
      />
      <BasicButton
        class="bg-negative-200 br-50 fs-200 b-negative-200 t-basic-100 w-100 jc-ct"
        :text="$t('common.cancel')"
        @click="() => {}"
      />
    </div>
  </div>
</template>
<script>
import { useNotifyStore } from "@/stores/notify";
import { useHandyStore } from "@/stores/handy";
import { _METHOD_content } from "@/api/contentDB/api";
export default {
  setup() {
    const notify = useNotifyStore();
    const handy = useHandyStore();
    return { notify, handy };
  },
  data() {
    return {
      setted_contents: [],
      loading: true,
      role: null,
      doc_uid: null,
      init_doc: null,
      content_type: null,
      type: null,
      language: null,
      //
      selected_contents: [],
    };
  },
  computed: {
    handyType() {
      return this.handy.handyType;
    },
    defaults() {
      return this.handy.defaults;
    },
    options() {
      return this.handy.options;
    },
  },
  methods: {
    open_Handykit(params) {
      this.handy.open_Handykit(params);
    },
    pass_Asset(asset) {
      this.handy.pass_Asset(asset);
    },
    async init() {
      const {
        doc_uid = null,
        doc = null,
        content_type = null,
        type = null,
        language = null,
      } = this.defaults;
      const { role = null } = this.options;

      if (!doc_uid) {
        this.notify.spawnNotification({
          title: this.$t("notifications.error"),
          msg: this.$t("notifications.unexpected_error"),
          type: "negative",
        });
        this.open_Handykit({});
        return;
      }

      if (role === "set_preview") this.role = "preview";
      if (role === "set_home") this.role = "home";
      this.content_type = content_type;
      this.type = type;
      this.doc_uid = doc_uid;
      this.init_doc = doc;
      this.language = language.toLowerCase();
      this.selected_contents.push(doc_uid);
      // fire my laser!
      try {
        const { data: response } = await _METHOD_content({
          method: "get",
          url: `/${content_type}/${type}/`,
          params: { routes: [`${this.role}-${this.language}`] },
        });
        const { data } = response;
        this.setted_contents = data;
      } catch (error) {
        console.log("Ooopsie...");
        console.log(error);
      }

      this.loading = false;
    },
    async on_Save() {
      const _selected = [...this.selected_contents];
      const _setted_contents = [...this.setted_contents].reduce(
        (o, { uid, ...rest }) => {
          o[uid] = {
            uid,
            ...rest,
          };
          return o;
        },
        {}
      );

      const _to_remove = Object.keys(_setted_contents).filter(
        (uid) => !_selected.includes(uid)
      );

      if (_to_remove.length) {
        try {
          const draft_promises = _to_remove.map((uid) => {
            const doc = _setted_contents[uid];
            doc.routes = doc.routes.filter(
              (route) => route !== `${this.role}-${this.language}`
            );

            return _METHOD_content({
              method: "put",
              url: `/${this.content_type}/${this.type}/${uid}/`,
              payload: doc,
            });
          });
          const _p_to_remove = _to_remove.map((uid) => {
            const { is_published = false } = _setted_contents[uid];
            if (is_published) return uid;
          });

          const published_promises = _p_to_remove.map((uid) => {
            const doc = _setted_contents[uid];
            doc.routes = doc.routes.filter(
              (route) => route !== `${this.role}-${this.language}`
            );

            return _METHOD_content({
              method: "delete",
              url: `/${this.content_type}/${this.type}/${uid}/published/?all=true`,
            });
          });

          const d_response = await Promise.allSettled(draft_promises);
          const p_response = await Promise.allSettled(published_promises);
          this.notify.spawnNotification({
            title: this.$t("notifications.success"),
            msg: this.$t("notifications.success_fun"),
            type: "informative",
          });
        } catch (error) {
          console.log("error");
          this.notify.spawnNotification({
            title: this.$t("notifications.error"),
            msg: this.$t("notifications.save_error"),
            type: "negative",
          });
          console.log(error);
          return;
        }
      }

      const draf_promises = _selected.map((uid, index) => {
        const { routes, ...rest } = _setted_contents[uid] || this.init_doc;

        return _METHOD_content({
          method: "put",
          url: `/${this.content_type}/${this.type}/${uid}/`,
          payload: {
            ...rest,
            routes: [`${this.role}-${this.language}`],
          },
        });
      });
      const publish_promises = _selected.map((uid, index) => {
        const { routes, ...rest } = _setted_contents[uid] || this.init_doc;

        return _METHOD_content({
          method: "post",
          url: `/${this.content_type}/${this.type}/${uid}/published/`,
          payload: {
            ...rest,
            routes: [`${this.role}-${this.language}`],
          },
        });
      });
      this.pass_Asset([`${this.role}-${this.language}`]);
      this.open_Handykit({});
    },
  },
  created() {
    this.init();
  },
};
</script>
