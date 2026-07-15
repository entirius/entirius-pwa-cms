<template>
  <div>
    <p class="fs-sm txt-gray-400">
      {{ members.length ? $t("routes.linked_paths") : $t("routes.no_paths") }}
    </p>
    <hr />
    <template v-if="members.length">
      <DropDown
        :value="
          members.map((m) => {
            return {
              label: `${m.name} - ${m.language}`,
              v: m.draft,
            };
          })
        "
        :placeholder="`${$t('routes.linked_paths')} (${members.length})`"
        :functionals="{ delete: true }"
        @onDelete="
          ($event) => {
            members = members.filter((m) => m.draft !== $event);
          }
        "
      />
      <hr />
    </template>
    <p class="fs-sm txt-gray-400">{{ $t("routes.paths_for_doc") }}</p>
    <hr />
    <div class="flex">
      <DropDown
        :placeholder="
          !DOCS.length
            ? $t('routes.choose_lang')
            : `${$t('routes.paths_for_doc')} - ${language}`
        "
        class="mr-sm w-full"
        :errorValue="errorV"
        :value="DOCS"
        @onSelect="addToSet"
        :key="`${language}`"
      />
      <DropDown
        v-if="languages"
        :value="
          languages.map((val) => {
            return {
              label: val.iso2,
              v: val.iso2,
            };
          })
        "
        :selected="language"
        @onSelect="getContent({ language: $event })"
        :placeholder="$t('routes.choose_lang')"
      />
    </div>
    <hr />
    <ButtonBasic
      :text="$t('attrs.save_changes')"
      :size="'sm'"
      class="md w-full"
      :isDisabled="members.length < 2"
      @click="save"
    />
  </div>
</template>

<script>
import {
  GET_ContentSets,
  GET_Languages,
  GET_Content,
  PUT_ContentSet,
  POST_ContentSet,
} from "@/api/contentDB/api";
import { useHandyStore } from "@/stores/handy";
export default {
  setup() {
    const handy = useHandyStore();
    return { handy };
  },
  data() {
    return {
      members: [],
      DOCS: [],
      languages: null,
      language: "PL",
      errorV: false,
      content_set: null,
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
  async created() {
    if (this.defaults) {
      const { content_set = null } = this.defaults;
      await this.getContentSets({ uid: content_set });
      this.content_set = content_set;
    }
    await this.getLanguages();
    await this.getContent({ language: this.language });
  },
  methods: {
    open_Handykit(params) {
      this.handy.open_Handykit(params);
    },
    pass_Asset(asset) {
      this.handy.pass_Asset(asset);
    },
    async getContentSets({ uid = null }) {
      try {
        const { data: response } = await GET_ContentSets({ uid });
        const { data } = response;
        const { members = [] } = data;

        this.members = members;
      } catch (err) {
        console.log(err);
      }
    },
    async getLanguages() {
      try {
        const { data: response } = await GET_Languages({});
        const { data = null, pagination = null } = response;
        this.languages = data;
      } catch ({ response }) {
        console.log(response);
      }
    },
    async getContent({ type = "static-page", language = null }) {
      if (![language].every(Boolean)) return;
      try {
        this.language = language;
        const { data: resposne } = await GET_Content({ type, language });
        const { data } = resposne;
        this.DOCS = data.reduce((arr, curr) => {
          return [
            ...arr,
            {
              label: `${curr.name} ${curr.content_set ? "(in use)" : ""}`,
              v: {
                draft: curr.uid,
                language,
                name: curr.name,
                in_use: curr.content_set ? true : false,
              },
            },
          ];
        }, []);
      } catch (err) {
        console.log(err);
      }
    },
    addToSet({ language = null, draft = null, name = null, in_use = null }) {
      if (![language, draft, name].every(Boolean)) {
        alert("No props to set");
        this.errorV = true;
        return;
      }

      if (in_use || this.members.some((item) => item.draft === draft)) {
        alert("Draft is already in use");
        this.errorV = true;
        return;
      }

      if (this.members.some((item) => item.language === language)) {
        alert("Language is already set");
        this.errorV = true;
        return;
      }

      this.members.push({ language, draft, name });
      this.errorV = false;
    },
    async putContentSet() {
      const { data } = await PUT_ContentSet({
        uid: this.content_set,
        members: this.members,
      });
    },
    async postContentSet() {
      try {
        const { data: response } = await POST_ContentSet({
          type: "static-page",
          members: this.members,
        });
        const { data } = response;
        const { uid, members } = data;
        this.content_set = uid;
        this.members = members;
      } catch (err) {
        console.log(err);
      }
    },
    async save() {
      this.content_set
        ? await this.putContentSet()
        : await this.postContentSet();
      //this.pass_Asset(this.members);
      this.open_Handykit({});
    },
  },
};
</script>
