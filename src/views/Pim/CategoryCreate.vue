<template>
  <div class="p-500 fs-300 t-basic-800 h-100 ov-h">
    <Teleport to="#pim-toolbar-left" defer>
      <BasicButton
        text=""
        icon="arrow-left"
        class="bg-basic-200 t-basic-600"
        @click="$router.push('/pim/categories')"
      />
    </Teleport>
    <Teleport to="#pim-toolbar-right" defer>
      <BasicButton
        :text="$t('common.save')"
        class="bg-positive-200 t-basic-100"
        @click="createCategory"
      />
    </Teleport>
    <div class="bg-basic-100 b-basic-300 br-50 h-100 ovy-auto p-500">
      <div class="create-section mb-400">
        <h2 class="fs-500 fw-600 mb-200">{{ $t("pim.basic_info") }}</h2>
        <div class="create-grid">
          <div class="create-field">
            <label class="create-label">IDX *</label>
            <BasicInput v-model="form.idx" placeholder="e.g. furniture" />
          </div>
          <div class="create-field">
            <label class="create-label">{{ $t("pim.parent") }}</label>
            <Dropdown
              :values="parentOptions"
              :placeholder="$t('pim.select_parent')"
              @onSelect="(val) => (form.parent_category_idx = val)"
            />
          </div>
          <div class="create-field">
            <label class="create-label">{{ $t("pim.position") }}</label>
            <BasicInput v-model="form.position" type="number" />
          </div>
          <div class="create-field">
            <label class="create-label">{{ $t("pim.status") }}</label>
            <Switcher
              :label="$t('pim.active')"
              :selected="form.is_active"
              @onSelect="form.is_active = !form.is_active"
            />
          </div>
          <div class="create-field">
            <label class="create-label">{{ $t("pim.in_menu") }}</label>
            <Switcher
              :label="$t('pim.show_in_menu')"
              :selected="form.is_in_menu"
              @onSelect="form.is_in_menu = !form.is_in_menu"
            />
          </div>
        </div>
      </div>

      <div class="create-section mb-400">
        <h2 class="fs-500 fw-600 mb-200">{{ $t("pim.name") }} *</h2>
        <div class="grid grid-col-2 gap-300">
          <div v-for="lang in formLanguages" :key="`name-${lang}`">
            <span
              class="chip chip--sm bg-support-200 t-support-400"
              >{{ lang.toUpperCase() }}</span
            >
            <BasicInput
              :model-value="form.name_t9n[lang] || ''"
              class="mt-100"
              @update:model-value="
                (val) => (form.name_t9n = { ...form.name_t9n, [lang]: val })
              "
            />
          </div>
        </div>
      </div>

      <div class="create-section mb-400">
        <h2 class="fs-500 fw-600 mb-200">{{ $t("pim.description") }}</h2>
        <div class="grid grid-col-2 gap-300">
          <div v-for="lang in formLanguages" :key="`desc-${lang}`">
            <span
              class="chip chip--sm bg-support-200 t-support-400"
              >{{ lang.toUpperCase() }}</span
            >
            <TextAreaBasic
              :model-value="form.description_t9n[lang] || ''"
              class="mt-100"
              @update:model-value="
                (val) =>
                  (form.description_t9n = {
                    ...form.description_t9n,
                    [lang]: val,
                  })
              "
            />
          </div>
        </div>
      </div>

      <div class="create-section mb-400">
        <h2 class="fs-500 fw-600 mb-200">{{ $t("pim.seo") }}</h2>
        <div class="grid grid-col-2 gap-300 mb-300">
          <div v-for="lang in formLanguages" :key="`meta-title-${lang}`">
            <span
              class="chip chip--sm bg-support-200 t-support-400"
              >{{ lang.toUpperCase() }}</span
            >
            <BasicInput
              :model-value="form.meta_title_t9n[lang] || ''"
              :placeholder="$t('meta.meta_title')"
              class="mt-100"
              @update:model-value="
                (val) =>
                  (form.meta_title_t9n = {
                    ...form.meta_title_t9n,
                    [lang]: val,
                  })
              "
            />
          </div>
        </div>
        <h3 class="fs-300 fw-600 t-basic-500 mb-200">
          {{ $t("meta.meta_description") }}
        </h3>
        <div class="grid grid-col-2 gap-300">
          <div v-for="lang in formLanguages" :key="`meta-desc-${lang}`">
            <span
              class="chip chip--sm bg-support-200 t-support-400"
              >{{ lang.toUpperCase() }}</span
            >
            <TextAreaBasic
              :model-value="form.meta_description_t9n[lang] || ''"
              :placeholder="$t('meta.meta_description')"
              class="mt-100"
              @update:model-value="
                (val) =>
                  (form.meta_description_t9n = {
                    ...form.meta_description_t9n,
                    [lang]: val,
                  })
              "
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { useLoaderStore } from "@/stores/loader";

import { useNotifyStore } from "@/stores/notify";
import { usePimChannelStore } from "@/stores/pimChannel";
import { POST_Category, GET_Categories } from "@/api/pim/api";
import { extractApiMessage } from "@/composables/useFormErrors";

export default {
  name: "CategoryCreate",
  setup() {
    const loader = useLoaderStore();
    const notify = useNotifyStore();
    const pimChannel = usePimChannelStore();
    return { loader, notify, pimChannel };
  },
  data() {
    return {
      form: {
        idx: "",
        parent_category_idx: null,
        position: 0,
        is_active: true,
        is_in_menu: true,
        name_t9n: {},
        description_t9n: {},
        meta_title_t9n: {},
        meta_description_t9n: {},
      },
      parentOptions: [],
    };
  },
  computed: {
    channelIdx() {
      return this.pimChannel.activeChannelIdx;
    },
    formLanguages() {
      return this.pimChannel.activeChannelLanguages.length > 0
        ? this.pimChannel.activeChannelLanguages
        : ["en"];
    },
  },
  watch: {
    "pimChannel.activeChannelIdx"() {
      this.fetchParentCategories();
    },
  },
  mounted() {
    this.fetchParentCategories();
  },
  methods: {
    async fetchParentCategories() {
      try {
        const { data } = await GET_Categories(this.channelIdx, {
          page_size: 100,
        });
        this.parentOptions = [
          { label: this.$t("pim.root_category"), value: null },
          ...(data.results || []).map((cat) => ({
            label: `${cat.name} (${cat.idx})`,
            value: cat.idx,
          })),
        ];
      } catch {
        // Categories may not exist yet
      }
    },
    hasAnyValue(t9nObj) {
      return Object.values(t9nObj || {}).some((v) => !!v);
    },
    async createCategory() {
      const firstLang = this.formLanguages[0];
      if (!this.form.idx || !this.form.name_t9n[firstLang]) {
        this.notify.spawnNotification({
          type: "warning",
          msg: this.$t("pim.idx_and_name_required"),
        });
        return;
      }

      this.loader.loaderStart();
      try {
        const payload = {
          idx: this.form.idx,
          name_t9n: this.form.name_t9n,
          is_active: this.form.is_active,
          is_in_menu: this.form.is_in_menu,
        };
        if (this.form.parent_category_idx)
          payload.parent_category_idx = this.form.parent_category_idx;
        if (this.form.position)
          payload.position = parseInt(this.form.position, 10);
        if (this.hasAnyValue(this.form.description_t9n)) {
          payload.description_t9n = this.form.description_t9n;
        }
        if (this.hasAnyValue(this.form.meta_title_t9n)) {
          payload.meta_title_t9n = this.form.meta_title_t9n;
        }
        if (this.hasAnyValue(this.form.meta_description_t9n)) {
          payload.meta_description_t9n = this.form.meta_description_t9n;
        }

        const { data } = await POST_Category(this.channelIdx, payload);
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("pim.category_created"),
        });
        this.$router.push(`/pim/categories/${data.idx}`);
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.save_error")),
        });
      } finally {
        this.loader.loaderFinish();
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.create-section {
  border: 1px solid var(--c-basic-200);
  border-radius: 6px;
  padding: 20px;
}
.create-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
}
.create-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.create-label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--c-basic-500);
}
</style>
