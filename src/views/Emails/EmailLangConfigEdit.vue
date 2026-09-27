<template>
  <div class="p-12 fs-300 t-body h-100 ov-h">
    <div
      class="page-card h-100 ovy-auto"
    >
      <div class="page-title-row flex ai-ct gap-5 mb-10">
        <BackBar
          @back="goBack"
        />
        <h1>
          {{ $t("emails.lang_config") }}:
          {{ config.language || $t("emails.default_lang") }}
        </h1>
      </div>

      <Loader block v-show="loading" />

      <div v-show="!loading">
        <div class="emails-form-grid mb-10">
          <FormField :label="$t('emails.shop_name')">
            <BasicInput v-model="config.shop_name" />
          </FormField>
          <FormField :label="$t('emails.logo_url')">
            <BasicInput v-model="config.logo_url" />
          </FormField>
          <FormField :label="$t('emails.header_email')">
            <BasicInput v-model="config.header_mail" />
          </FormField>
          <FormField :label="$t('emails.footer_brand_name')">
            <BasicInput v-model="config.footer_name_brand" />
          </FormField>
          <FormField :label="$t('emails.footer_brand_link')">
            <BasicInput v-model="config.footer_link_brand" />
          </FormField>
        </div>

        <h3 class="fs-400 fw-600 mt-10 mb-8">
          {{ $t("emails.footer_copy") }}
        </h3>
        <BasicWysiwyg v-model="config.footer_copy" />

        <h3 class="fs-400 fw-600 mt-10 mb-8">
          {{ $t("emails.social_links") }}
        </h3>
        <div class="emails-form-grid">
          <FormField label="Facebook">
            <BasicInput v-model="config.footer_link_facebook" />
          </FormField>
          <FormField label="Instagram">
            <BasicInput v-model="config.footer_link_instagram" />
          </FormField>
          <FormField label="YouTube">
            <BasicInput v-model="config.footer_link_youtube" />
          </FormField>
          <FormField label="X (Twitter)">
            <BasicInput v-model="config.footer_link_x" />
          </FormField>
          <FormField label="TikTok">
            <BasicInput v-model="config.footer_link_tiktok" />
          </FormField>
        </div>

        <h3 class="fs-400 fw-600 mt-10 mb-8">
          {{ $t("emails.footer_overrides") }}
        </h3>
        <p class="fs-200 t-secondary mb-8">
          {{ $t("emails.footer_overrides_hint") }}
        </p>
        <div class="emails-form-grid">
          <FormField
            :label="$t('emails.footer_signature_copy_1')"
            :description="$t('emails.footer_signature_copy_1_hint')"
          >
            <BasicInput v-model="config.footer_signature_copy_1" />
          </FormField>
          <FormField
            :label="$t('emails.footer_signature_copy_2')"
            :description="$t('emails.footer_signature_copy_2_hint')"
          >
            <BasicInput v-model="config.footer_signature_copy_2" />
          </FormField>
          <FormField
            :label="$t('emails.footer_socials_copy')"
            :description="$t('emails.footer_socials_copy_hint')"
          >
            <BasicInput v-model="config.footer_socials_copy" />
          </FormField>
          <FormField
            :label="$t('emails.footer_unsubscribe_label')"
            :description="$t('emails.footer_unsubscribe_label_hint')"
          >
            <BasicInput v-model="config.footer_unsubscribe_label" />
          </FormField>
        </div>
        <FormField
          :label="$t('emails.footer_automatic_copy')"
          :description="$t('emails.footer_automatic_copy_hint')"
          class="mt-8"
        >
          <BasicWysiwyg v-model="config.footer_automatic_copy" />
        </FormField>

        <div class="flex jc-fe mt-10">
          <BasicButton
            :text="$t('common.save')"
            class="btn-primary"
            @click="save"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { useLoaderStore } from "@/stores/loader";
import { useNotifyStore } from "@/stores/notify";
import { GET_EmailLangConfig, PATCH_EmailLangConfig } from "@/api/emails/api";
import { extractApiMessage } from "@/composables/useFormErrors";
export default {
  name: "EmailLangConfigEdit",
  setup() {
    const loader = useLoaderStore();
    const notify = useNotifyStore();
    return { loader, notify };
  },
  data() {
    return {
      config: {},
      loading: false,
    };
  },
  mounted() {
    this.fetchData();
  },
  methods: {
    async fetchData() {
      this.loading = true;
      try {
        const { data } = await GET_EmailLangConfig(this.$route.params.pk);
        this.config = data;
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("emails.error_load_config")),
        });
      } finally {
        this.loading = false;
      }
    },
    async save() {
      this.loader.loaderStart();
      try {
        const { data } = await PATCH_EmailLangConfig(
          this.$route.params.pk,
          this.config
        );
        this.config = data;
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("emails.saved"),
        });
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("emails.error_save")),
        });
      } finally {
        this.loader.loaderFinish();
      }
    },
    goBack() {
      if (this.config.channel_id) {
        this.$router.push(`/emails/channels/${this.config.channel_id}`);
      } else {
        this.$router.push("/emails");
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.emails-form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-4);
}
</style>
