<template>
  <div class="page-pad fs-300 t-body h-100 ov-h">
    <div
      class="page-card h-100 ovy-auto"
    >
      <div class="page-title-row flex ai-ct gap-5 mb-10">
        <IconButton
          icon="back"
          :label="$t('common.back')"
          @click="goBack"
        />
        <h1 class="page-title">{{ $t("emails.edit_template") }}</h1>
        <span class="fs-200 t-muted ml-2">({{ typeLabel }})</span>
        <span
          v-if="template.language_code"
          class="fs-200 t-accent ml-2 fw-600"
          >{{ template.language_code }}</span
        >
      </div>

      <Loader block v-show="loading" />

      <div v-show="!loading">
        <div class="emails-form-grid mb-10">
          <FormField :label="$t('emails.subject')">
            <BasicInput v-model="template.subject" />
          </FormField>
        </div>

        <div v-for="field in contentFields" :key="field.key" class="mb-8">
          <FormField :label="$t(field.label)" :description="field.description ? $t(field.description) : ''">
            <BasicWysiwyg v-if="field.wysiwyg" v-model="template[field.key]" />
            <BasicInput v-else v-model="template[field.key]" />
          </FormField>
        </div>

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
import { GET_EmailTemplate, PATCH_EmailTemplate } from "@/api/emails/api";
import { extractApiMessage } from "@/composables/useFormErrors";
import { emailTypeLabel } from "./emailTypes";


const TYPE_FIELDS = {
  "accounts-new-account": [
    {
      key: "welcome",
      label: "emails.fields.welcome",
      description: "emails.field_hints.user_name",
      wysiwyg: true,
    },
    { key: "announce", label: "emails.fields.announce", wysiwyg: true },
    { key: "confirm_button", label: "emails.fields.confirm_button", wysiwyg: false },
    { key: "thank_you", label: "emails.fields.thank_you", wysiwyg: true },
    { key: "help", label: "emails.fields.help", wysiwyg: true },
  ],
  "accounts-reset-password": [
    { key: "welcome", label: "emails.fields.welcome", wysiwyg: true },
    { key: "reset_button", label: "emails.fields.reset_button", wysiwyg: false },
    { key: "help", label: "emails.fields.help", wysiwyg: true },
  ],
  "checkout-virtual-product": [
    {
      key: "welcome",
      label: "emails.fields.welcome",
      description: "emails.field_hints.user_name",
      wysiwyg: true,
    },
    {
      key: "order",
      label: "emails.fields.order",
      description: "emails.field_hints.order_id",
      wysiwyg: true,
    },
    { key: "products", label: "emails.fields.products", wysiwyg: false },
    { key: "key_name", label: "emails.fields.key_name", wysiwyg: false },
    {
      key: "additional_key_name",
      label: "emails.fields.additional_key_name",
      wysiwyg: false,
    },
    { key: "instructions", label: "emails.fields.instructions", wysiwyg: false },
    { key: "help", label: "emails.fields.help", wysiwyg: true },
  ],
  "loyalty-coupon-confirmation": [
    {
      key: "welcome",
      label: "emails.fields.welcome",
      description: "emails.field_hints.user_name",
      wysiwyg: true,
    },
    { key: "thank_you", label: "emails.fields.thank_you", wysiwyg: true },
    { key: "coupon_copy", label: "emails.fields.coupon_copy", wysiwyg: true },
    { key: "coupon_button", label: "emails.fields.coupon_button", wysiwyg: false },
    { key: "help", label: "emails.fields.help", wysiwyg: true },
  ],
  "returns-return-confirmation": [
    {
      key: "welcome",
      label: "emails.fields.welcome",
      description: "emails.field_hints.user_name",
      wysiwyg: true,
    },
    {
      key: "return_copy",
      label: "emails.fields.return_copy",
      description: "emails.field_hints.return_id",
      wysiwyg: true,
    },
    { key: "comment_copy", label: "emails.fields.comment_copy", wysiwyg: true },
    { key: "print_copy", label: "emails.fields.print_copy", wysiwyg: true },
    { key: "help", label: "emails.fields.help", wysiwyg: true },
  ],
  "allegro-virtual-product": [
    {
      key: "welcome",
      label: "emails.fields.welcome",
      description: "emails.field_hints.user_name",
      wysiwyg: true,
    },
    {
      key: "order",
      label: "emails.fields.order",
      description: "emails.field_hints.order_id",
      wysiwyg: true,
    },
    { key: "products", label: "emails.fields.products", wysiwyg: false },
    { key: "key_name", label: "emails.fields.key_name", wysiwyg: false },
    {
      key: "additional_key_name",
      label: "emails.fields.additional_key_name",
      wysiwyg: false,
    },
    { key: "instructions", label: "emails.fields.instructions", wysiwyg: false },
    { key: "help", label: "emails.fields.help", wysiwyg: true },
  ],
  "agreements-newsletter-signup": [
    {
      key: "welcome",
      label: "emails.fields.welcome",
      description: "emails.field_hints.user_name",
      wysiwyg: true,
    },
    { key: "confirm_copy", label: "emails.fields.confirm_copy", wysiwyg: true },
    { key: "confirm_button", label: "emails.fields.confirm_button", wysiwyg: false },
    { key: "help", label: "emails.fields.help", wysiwyg: true },
  ],
  "contact-forms-booking-confirmation": [
    {
      key: "header_title",
      label: "emails.fields.header_title",
      description: "emails.field_hints.header_booking",
      wysiwyg: false,
    },
    {
      key: "greeting_template",
      label: "emails.fields.greeting_template",
      description: "emails.field_hints.greeting",
      wysiwyg: false,
    },
    {
      key: "intro_copy",
      label: "emails.fields.intro_copy",
      description: "emails.field_hints.intro_booking",
      wysiwyg: true,
    },
    { key: "label_datetime", label: "emails.fields.label_datetime", wysiwyg: false },
    { key: "label_email", label: "emails.fields.label_email", wysiwyg: false },
    { key: "label_phone", label: "emails.fields.label_phone", wysiwyg: false },
    { key: "label_company", label: "emails.fields.label_company", wysiwyg: false },
    { key: "label_message", label: "emails.fields.label_message", wysiwyg: false },
    { key: "label_video", label: "emails.fields.label_video", wysiwyg: false },
    {
      key: "closing_copy",
      label: "emails.fields.closing_copy",
      description: "emails.field_hints.closing_booking",
      wysiwyg: true,
    },
  ],
  "contact-forms-booking-admin-notification": [
    {
      key: "header_title",
      label: "emails.fields.header_title",
      description: "emails.field_hints.header_admin_booking",
      wysiwyg: false,
    },
    {
      key: "intro_copy",
      label: "emails.fields.intro_copy",
      description: "emails.field_hints.intro_booking",
      wysiwyg: true,
    },
    { key: "label_datetime", label: "emails.fields.label_datetime", wysiwyg: false },
    { key: "label_name", label: "emails.fields.label_name", wysiwyg: false },
    { key: "label_email", label: "emails.fields.label_email", wysiwyg: false },
    { key: "label_phone", label: "emails.fields.label_phone", wysiwyg: false },
    { key: "label_company", label: "emails.fields.label_company", wysiwyg: false },
    { key: "label_message", label: "emails.fields.label_message", wysiwyg: false },
    { key: "label_video", label: "emails.fields.label_video", wysiwyg: false },
    { key: "closing_copy", label: "emails.fields.closing_copy", wysiwyg: true },
  ],
  "contact-forms-submission": [
    {
      key: "header_title",
      label: "emails.fields.header_title",
      description: "emails.field_hints.header_submission",
      wysiwyg: false,
    },
    { key: "intro_copy", label: "emails.fields.intro_copy", wysiwyg: true },
    { key: "label_email", label: "emails.fields.label_email", wysiwyg: false },
    { key: "label_type", label: "emails.fields.label_type", wysiwyg: false },
    { key: "label_form", label: "emails.fields.label_form", wysiwyg: false },
    { key: "label_code", label: "emails.fields.label_code", wysiwyg: false },
    { key: "label_body", label: "emails.fields.label_body", wysiwyg: false },
    { key: "closing_copy", label: "emails.fields.closing_copy", wysiwyg: true },
  ],
};

export default {
  name: "EmailTemplateEdit",
  setup() {
    const loader = useLoaderStore();
    const notify = useNotifyStore();
    return { loader, notify };
  },
  data() {
    return {
      template: {},
      loading: false,
    };
  },
  computed: {
    emailType() {
      return this.$route.params.emailType;
    },
    typeLabel() {
      return emailTypeLabel(this.$t, this.emailType);
    },
    contentFields() {
      return TYPE_FIELDS[this.emailType] || [];
    },
  },
  mounted() {
    this.fetchTemplate();
  },
  methods: {
    async fetchTemplate() {
      this.loading = true;
      try {
        const { data } = await GET_EmailTemplate(
          this.emailType,
          this.$route.params.pk
        );
        this.template = data;
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("emails.error_load_template")),
        });
      } finally {
        this.loading = false;
      }
    },
    async save() {
      this.loader.loaderStart();
      try {
        const payload = { subject: this.template.subject };
        for (const field of this.contentFields) {
          payload[field.key] = this.template[field.key];
        }
        const { data } = await PATCH_EmailTemplate(
          this.emailType,
          this.$route.params.pk,
          payload
        );
        this.template = data;
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
      this.$router.push(`/emails/templates/${this.emailType}`);
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
