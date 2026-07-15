<template>
  <div class="p-500 fs-300 t-basic-800 h-100 ov-h relative">
    <Teleport to="#authors-toolbar-left" defer>
      <BasicButton
        text=""
        icon="arrow-left"
        class="bg-basic-200 t-basic-600"
        @click="$router.push('/pages/authors')"
      />
      <span v-if="!loading && form.name" class="fw-600">{{ form.name }}</span>
      <span v-if="!loading && !form.name" class="t-basic-500">{{
        $t("authors.create")
      }}</span>
    </Teleport>
    <Teleport to="#authors-toolbar-right" defer>
      <span v-if="isDirty" class="chip bg-warning-100 t-warning-300">
        {{ $t("unsaved.changes") }}
      </span>
      <button
        v-if="isEdit"
        class="author-photo-remove pointer"
        @click="showDeleteConfirm = true"
      >
        <FontAwesomeIcon icon="trash-can" />
      </button>
      <BasicButton
        :text="$t('common.save')"
        class="bg-support-400 t-basic-100"
        @click="save"
      />
    </Teleport>

    <div class="bg-basic-100 b-basic-300 br-50 h-100 ovy-auto p-500 relative">
      <Loader v-if="loading" />

      <template v-else>
        <!-- Basic info -->
        <div class="author-edit__section mb-400">
          <div class="section-label mb-300">{{ $t("pim.basic_info") }}</div>
          <div class="flex gap-300 mb-300" style="flex-wrap: wrap">
            <BasicInput
              v-model="form.name"
              :label="$t('authors.name')"
              :validate="formErrors.getFieldError('name')"
              class="flex-1"
              style="min-width: 200px"
            />
            <BasicInput
              v-model="form.slug"
              :label="$t('authors.slug')"
              class="flex-1"
              style="min-width: 200px"
            />
          </div>
          <Switcher
            :label="$t('authors.is_active')"
            :selected="form.is_active"
            @onSelect="form.is_active = !form.is_active"
          />

          <!-- Photo -->
          <div class="mt-300">
            <label class="fs-200 fw-600 t-basic-500 tt-upper mb-100 db">
              {{ $t("authors.photo") }}
            </label>
            <div class="flex ai-ct gap-300">
              <div class="author-photo-preview pointer" @click="$refs.photoController.init()">
                <img
                  v-if="form.photo_url"
                  :src="form.photo_url"
                  alt="Author photo"
                  class="author-photo-preview__img"
                />
                <div v-else class="author-photo-preview__placeholder">
                  <FontAwesomeIcon icon="user" class="t-basic-400" style="font-size: 24px" />
                </div>
              </div>
              <div class="flex ai-ct gap-100">
                <BasicButton
                  :text="form.photo_uid ? $t('common.edit') : $t('common.select')"
                  class="btn-outline"
                  @click="$refs.photoController.init()"
                />
                <button
                  v-if="form.photo_uid"
                  class="author-photo-remove pointer"
                  @click="clearPhoto"
                >
                  <FontAwesomeIcon icon="xmark" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Translated fields -->
        <div class="author-edit__section mb-400">
          <div class="section-label mb-300">{{ $t("pim.translations") }}</div>

          <div
            v-for="field in t9nFields"
            :key="field.key"
            class="translation-field mb-300"
          >
            <div class="translation-field__header">
              <label class="fs-200 fw-600 t-basic-500 tt-upper">
                {{ field.label }} ({{ defaultLang.toUpperCase() }})
              </label>
              <BasicButton
                v-if="availableLanguages.length > 1"
                :text="$t('pim.translations')"
                class="btn-outline translation-field__btn"
                @click="openTranslations(field.name)"
              />
            </div>
            <BasicInput
              v-model="form[field.key][defaultLang]"
            />
          </div>
        </div>

        <!-- Contact info -->
        <div class="author-edit__section mb-400">
          <div class="section-label mb-300">{{ $t("dp.contact") }}</div>
          <div class="flex gap-300 mb-300" style="flex-wrap: wrap">
            <BasicInput
              v-model="form.contact_email"
              :label="$t('authors.contact_email')"
              :validate="formErrors.getFieldError('contact_email')"
              class="flex-1"
              style="min-width: 200px"
            />
            <BasicInput
              v-model="form.contact_phone"
              :label="$t('authors.contact_phone')"
              :validate="formErrors.getFieldError('contact_phone')"
              class="flex-1"
              style="min-width: 200px"
            />
          </div>
          <BasicInput
            v-model="form.contact_url"
            :label="$t('authors.contact_url')"
            :validate="formErrors.getFieldError('contact_url')"
          />
        </div>

        <!-- Social profiles -->
        <div class="author-edit__section mb-400">
          <div class="section-label mb-300">
            {{ $t("authors.social_profiles") }}
          </div>
          <div class="flex gap-300" style="flex-wrap: wrap">
            <BasicInput
              v-for="platform in knownPlatforms"
              :key="platform"
              v-model="form.social_profiles[platform]"
              :label="platform"
              class="flex-1"
              style="min-width: 200px"
            />
          </div>
        </div>
      </template>
    </div>

    <!-- Photo gallery (outside scrollable card so modal overlays correctly) -->
    <div class="author-photo-controller-hidden">
      <ImagesController
        ref="photoController"
        :label="false"
        :value="photoControllerValue"
        @onChange="onPhotoControllerChange"
      />
    </div>

    <!-- Translations drawer -->
    <TranslationsDrawer
      :visible="!!translatingField"
      :title="translatingFieldLabel"
      :languages="availableLanguages"
      :default-language="defaultLang"
      :values="translatingField ? form[translatingFieldKey] : {}"
      @cancel="translatingField = null"
      @save="onTranslationsSave"
    />

    <!-- Delete confirmation -->
    <Confirmation-modal
      :visible="showDeleteConfirm"
      @accept="deleteAuthor"
      @reject="showDeleteConfirm = false"
    >
      <template #description>
        <p>{{ $t("authors.delete_confirm") }}</p>
        <p v-if="form.post_count" class="mt-200 t-basic-600 fs-200">
          {{ $t("authors.post_count") }}: <strong>{{ form.post_count }}</strong>
        </p>
        <div v-if="reassignOptions.length" class="mt-300">
          <p class="fs-200 fw-600 mb-100">{{ $t("authors.reassign_label") }}</p>
          <Dropdown
            :values="reassignOptions"
            :selected="reassignTo ? [reassignTo] : []"
            :placeholder="$t('authors.reassign_none')"
            @onSelect="reassignTo = $event"
          />
        </div>
      </template>
    </Confirmation-modal>
  </div>
</template>

<script>
import { useLoaderStore } from "@/stores/loader";
import { useNotifyStore } from "@/stores/notify";
import { useContentDBChannelStore } from "@/stores/contentDBChannel";
import { useFormErrors, extractApiMessage } from "@/composables/useFormErrors";
import ConfirmationModal from "@/functionals/Confirmation-modal/index.vue";
import ImagesController from "@/configs/builder/components/ImagesController/index.vue";
import {
  GET_Author,
  POST_Author,
  PATCH_Author,
  DELETE_Author,
  GET_Authors,
} from "@/api/contentDB/api";

const KNOWN_PLATFORMS = [
  "twitter",
  "linkedin",
  "github",
  "facebook",
  "instagram",
  "youtube",
];

export default {
  name: "AuthorEdit",
  components: { ConfirmationModal, ImagesController },
  setup() {
    const loader = useLoaderStore();
    const notify = useNotifyStore();
    const contentDBChannel = useContentDBChannelStore();
    const formErrors = useFormErrors();
    return { loader, notify, contentDBChannel, formErrors };
  },
  data() {
    return {
      loading: false,
      showDeleteConfirm: false,
      reassignTo: null,
      reassignOptions: [],
      isDirty: false,
      initialSnapshot: null,
      translatingField: null,
      form: {
        name: "",
        slug: "",
        is_active: true,
        photo_uid: null,
        photo_url: null,
        role_t9n: { en: "" },
        description_t9n: { en: "" },
        tag_t9n: { en: "" },
        contact_email: "",
        contact_phone: "",
        contact_url: "",
        social_profiles: {},
        post_count: 0,
      },
      knownPlatforms: KNOWN_PLATFORMS,
    };
  },
  computed: {
    isEdit() {
      return Boolean(this.$route.params.uid);
    },
    photoControllerValue() {
      if (!this.form.photo_uid) return null;
      const asset = {
        uid: this.form.photo_uid,
        image: this.form.photo_url,
        meta: { fileName: "author-photo" },
        width: 0,
        height: 0,
      };
      return { desktop: asset };
    },
    availableLanguages() {
      return this.contentDBChannel.availableLanguages.length
        ? this.contentDBChannel.availableLanguages
        : ["en"];
    },
    defaultLang() {
      return this.contentDBChannel.defaultLanguage || "en";
    },
    t9nFields() {
      return [
        { key: "role_t9n", name: "role", label: this.$t("authors.role") },
        {
          key: "description_t9n",
          name: "description",
          label: this.$t("authors.description"),
        },
        { key: "tag_t9n", name: "tag", label: this.$t("authors.tag") },
      ];
    },
    translatingFieldKey() {
      if (!this.translatingField) return null;
      return `${this.translatingField}_t9n`;
    },
    translatingFieldLabel() {
      const labels = {
        role: this.$t("authors.role"),
        description: this.$t("authors.description"),
        tag: this.$t("authors.tag"),
      };
      return labels[this.translatingField] || this.translatingField;
    },
  },
  watch: {
    form: {
      deep: true,
      handler() {
        if (this.initialSnapshot) {
          this.isDirty =
            JSON.stringify(this.form) !== this.initialSnapshot;
        }
        if (this.formErrors.hasErrors) this.formErrors.clearErrors();
      },
    },
  },
  mounted() {
    KNOWN_PLATFORMS.forEach((p) => {
      if (!this.form.social_profiles[p]) this.form.social_profiles[p] = "";
    });
    this.contentDBChannel.fetchChannelsAndLanguages();
    if (this.isEdit) {
      this.fetchAuthor();
      this.fetchReassignOptions();
    } else {
      this.snapshotForm();
    }
  },
  methods: {
    snapshotForm() {
      this.$nextTick(() => {
        this.initialSnapshot = JSON.stringify(this.form);
        this.isDirty = false;
      });
    },
    openTranslations(fieldName) {
      this.translatingField = fieldName;
    },
    onTranslationsSave({ values }) {
      this.form[this.translatingFieldKey] = values;
      this.translatingField = null;
    },
    ensureAllLangs(t9nObj) {
      const base = t9nObj || {};
      const result = {};
      this.availableLanguages.forEach((lang) => {
        result[lang] = base[lang] || "";
      });
      return result;
    },
    async fetchAuthor() {
      this.loading = true;
      try {
        const { data } = await GET_Author(this.$route.params.uid);
        const social = this.normalizeSocial(data.social_profiles || {});
        this.form = {
          name: data.name || "",
          slug: data.slug || "",
          is_active: data.is_active ?? true,
          photo_uid: data.photo_uid || null,
          photo_url: data.photo_url ? this.resolveMediaUrl(data.photo_url) : null,
          role_t9n: this.ensureAllLangs(data.role_t9n),
          description_t9n: this.ensureAllLangs(data.description_t9n),
          tag_t9n: this.ensureAllLangs(data.tag_t9n),
          contact_email: data.contact_email || "",
          contact_phone: data.contact_phone || "",
          contact_url: data.contact_url || "",
          social_profiles: social,
          post_count: data.published_post_count || 0,
        };
        this.snapshotForm();
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.loading = false;
      }
    },
    normalizeSocial(profiles) {
      const result = {};
      KNOWN_PLATFORMS.forEach((p) => {
        result[p] = profiles[p] || "";
      });
      Object.entries(profiles).forEach(([k, v]) => {
        if (!KNOWN_PLATFORMS.includes(k)) result[k] = v;
      });
      return result;
    },
    async fetchReassignOptions() {
      try {
        const { data } = await GET_Authors({ page_size: 100, is_active: true });
        this.reassignOptions = (data.results || [])
          .filter((a) => a.uid !== this.$route.params.uid)
          .map((a) => ({ label: a.name, value: a.uid }));
      } catch {
        // non-critical
      }
    },
    buildPayload() {
      const social = {};
      Object.entries(this.form.social_profiles).forEach(([k, v]) => {
        if (v) social[k] = v;
      });
      return {
        name: this.form.name,
        slug: this.form.slug,
        is_active: this.form.is_active,
        photo_uid: this.form.photo_uid || null,
        role_t9n: this.form.role_t9n,
        description_t9n: this.form.description_t9n,
        tag_t9n: this.form.tag_t9n,
        contact_email: this.form.contact_email || null,
        contact_phone: this.form.contact_phone || null,
        contact_url: this.form.contact_url || null,
        social_profiles: social,
      };
    },
    async save() {
      const valid = this.formErrors.validateRequired(this.form, {
        name: this.$t("authors.name"),
      });
      if (!valid) return;

      this.loader.loaderStart();
      try {
        if (this.isEdit) {
          await PATCH_Author(this.$route.params.uid, this.buildPayload());
          this.snapshotForm();
          this.notify.spawnNotification({
            type: "positive",
            msg: this.$t("authors.author_saved"),
          });
        } else {
          const { data } = await POST_Author(this.buildPayload());
          this.notify.spawnNotification({
            type: "positive",
            msg: this.$t("authors.author_created"),
          });
          this.$router.replace(`/pages/authors/${data.uid}`);
        }
      } catch (err) {
        this.formErrors.handleApiError(err);
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.save_error")),
        });
      } finally {
        this.loader.loaderFinish();
      }
    },
    resolveMediaUrl(url) {
      if (!url) return null;
      if (url.startsWith("http")) return url;
      const base = (process.env.VUE_APP_API_URL || "").replace(/\/+$/, "");
      return `${base}${url}`;
    },
    onPhotoControllerChange(value) {
      const asset = value?.desktop || value?.mobile;
      if (asset) {
        this.form.photo_uid = asset.uid;
        this.form.photo_url = asset.image;
      }
    },
    clearPhoto() {
      this.form.photo_uid = null;
      this.form.photo_url = null;
    },
    async deleteAuthor() {
      this.showDeleteConfirm = false;
      this.loader.loaderStart();
      try {
        await DELETE_Author(
          this.$route.params.uid,
          this.reassignTo ? { reassign_to: this.reassignTo } : {}
        );
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("authors.author_deleted"),
        });
        this.$router.push("/pages/authors");
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
.author-edit__section {
  border: 1px solid var(--c-basic-200);
  border-radius: 6px;
  padding: var(--space-300);
}

.translation-field {
  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
  }

  &__btn {
    line-height: 1;
    padding: 4px 10px;
    font-size: var(--fs-200);
  }
}

.tt-upper {
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.author-photo-preview {
  width: 80px;
  height: 80px;
  border-radius: var(--radius-md);
  border: 1px solid var(--c-basic-300);
  overflow: hidden;
  flex-shrink: 0;

  &__img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--c-basic-200);
  }
}

.author-photo-remove {
  width: var(--elem-height);
  height: var(--elem-height);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  border: none;
  background: var(--c-negative-100);
  color: var(--c-negative-300);
  font-size: 14px;
  transition: background-color 0.15s;

  &:hover {
    background: var(--c-negative-200);
    color: var(--c-basic-100);
  }
}

.author-photo-controller-hidden {
  /* Hide ImagesController's own "Set new" button & dropdown,
     but keep the gallery overlay functional (position: absolute on content card) */
  :deep(.images-controller > .flex:first-child) {
    height: 0;
    overflow: hidden;
    margin: 0;
    padding: 0;
  }
}

.db {
  display: block;
}

@media only screen and (max-width: 768px) {
  .p-500 {
    padding: 16px !important;
  }

}
</style>

