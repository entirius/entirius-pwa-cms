<template>
  <div class="p-500 fs-300 t-basic-800 h-100 ov-h">
    <div
      class="bg-basic-100 b-basic-300 br-50 h-100 ovy-auto pl-500 pt-500 pb-500 pr-500"
    >
      <div class="flex ai-ct gap-200 mb-400">
        <BasicButton
          text=""
          icon="arrow-left"
          class="bg-basic-200 t-basic-600"
          @click="goBack"
        />
        <h1 class="fs-700 fw-600">{{ $t("emails.edit_template") }}</h1>
        <span class="fs-200 t-basic-500 ml-100">({{ typeLabel }})</span>
        <span
          v-if="template.language_code"
          class="fs-200 t-support-400 ml-100 fw-600"
          >{{ template.language_code }}</span
        >
      </div>

      <Loader v-show="loading" />

      <div v-show="!loading">
        <div class="emails-form-grid mb-400">
          <FormField :label="$t('emails.subject')">
            <BasicInput v-model="template.subject" />
          </FormField>
        </div>

        <div v-for="field in contentFields" :key="field.key" class="mb-300">
          <FormField :label="field.label" :description="field.description || ''">
            <BasicWysiwyg v-if="field.wysiwyg" v-model="template[field.key]" />
            <BasicInput v-else v-model="template[field.key]" />
          </FormField>
        </div>

        <div class="flex jc-fe mt-400">
          <BasicButton
            :text="$t('common.save')"
            class="bg-support-400 t-basic-100"
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


const TYPE_LABELS = {
  "accounts-new-account": "New Account",
  "accounts-reset-password": "Reset Password",
  "checkout-virtual-product": "Virtual Product",
  "loyalty-coupon-confirmation": "Coupon Confirmation",
  "returns-return-confirmation": "Return Confirmation",
  "allegro-virtual-product": "Allegro Virtual Product",
  "agreements-newsletter-signup": "Newsletter Signup",
  "contact-forms-booking-confirmation": "Booking Confirmation",
  "contact-forms-booking-admin-notification": "Booking Admin Notification",
  "contact-forms-submission": "Contact Form Submission",
};

const TYPE_FIELDS = {
  "accounts-new-account": [
    {
      key: "welcome",
      label: "Welcome",
      description: "Supports |user_name| placeholder",
      wysiwyg: true,
    },
    { key: "announce", label: "Announcement", wysiwyg: true },
    { key: "confirm_button", label: "Confirm Button Label", wysiwyg: false },
    { key: "thank_you", label: "Thank You", wysiwyg: true },
    { key: "help", label: "Help Text", wysiwyg: true },
  ],
  "accounts-reset-password": [
    { key: "welcome", label: "Welcome", wysiwyg: true },
    { key: "reset_button", label: "Reset Button Label", wysiwyg: false },
    { key: "help", label: "Help Text", wysiwyg: true },
  ],
  "checkout-virtual-product": [
    {
      key: "welcome",
      label: "Welcome",
      description: "Supports |user_name| placeholder",
      wysiwyg: true,
    },
    {
      key: "order",
      label: "Order Info",
      description: "Supports |order_id| placeholder",
      wysiwyg: true,
    },
    { key: "products", label: "Products Header", wysiwyg: false },
    { key: "key_name", label: "Key Name Label", wysiwyg: false },
    {
      key: "additional_key_name",
      label: "Additional Key Name",
      wysiwyg: false,
    },
    { key: "instructions", label: "Instructions Header", wysiwyg: false },
    { key: "help", label: "Help Text", wysiwyg: true },
  ],
  "loyalty-coupon-confirmation": [
    {
      key: "welcome",
      label: "Welcome",
      description: "Supports |user_name| placeholder",
      wysiwyg: true,
    },
    { key: "thank_you", label: "Thank You", wysiwyg: true },
    { key: "coupon_copy", label: "Coupon Description", wysiwyg: true },
    { key: "coupon_button", label: "Coupon Button Label", wysiwyg: false },
    { key: "help", label: "Help Text", wysiwyg: true },
  ],
  "returns-return-confirmation": [
    {
      key: "welcome",
      label: "Welcome",
      description: "Supports |user_name| placeholder",
      wysiwyg: true,
    },
    {
      key: "return_copy",
      label: "Return Info",
      description: "Supports |order_id|, |return_id| placeholders",
      wysiwyg: true,
    },
    { key: "comment_copy", label: "Comment Section", wysiwyg: true },
    { key: "print_copy", label: "Print Instructions", wysiwyg: true },
    { key: "help", label: "Help Text", wysiwyg: true },
  ],
  "allegro-virtual-product": [
    {
      key: "welcome",
      label: "Welcome",
      description: "Supports |user_name| placeholder",
      wysiwyg: true,
    },
    {
      key: "order",
      label: "Order Info",
      description: "Supports |order_id| placeholder",
      wysiwyg: true,
    },
    { key: "products", label: "Products Header", wysiwyg: false },
    { key: "key_name", label: "Key Name Label", wysiwyg: false },
    {
      key: "additional_key_name",
      label: "Additional Key Name",
      wysiwyg: false,
    },
    { key: "instructions", label: "Instructions Header", wysiwyg: false },
    { key: "help", label: "Help Text", wysiwyg: true },
  ],
  "agreements-newsletter-signup": [
    {
      key: "welcome",
      label: "Welcome",
      description: "Supports |user_name| placeholder",
      wysiwyg: true,
    },
    { key: "confirm_copy", label: "Confirmation Text", wysiwyg: true },
    { key: "confirm_button", label: "Confirm Button Label", wysiwyg: false },
    { key: "help", label: "Help Text", wysiwyg: true },
  ],
  "contact-forms-booking-confirmation": [
    {
      key: "header_title",
      label: "Header Title",
      description: "H2 heading. Empty = use translated default 'Your booking is confirmed'.",
      wysiwyg: false,
    },
    {
      key: "greeting_template",
      label: "Greeting",
      description: "Use |booker_name| placeholder for booker's name (e.g., 'Cześć |booker_name|,').",
      wysiwyg: false,
    },
    {
      key: "intro_copy",
      label: "Intro Paragraph",
      description: "Rendered above the booking facts. Empty = use translated default.",
      wysiwyg: true,
    },
    { key: "label_datetime", label: "Date & time label", wysiwyg: false },
    { key: "label_email", label: "Email label", wysiwyg: false },
    { key: "label_phone", label: "Phone label", wysiwyg: false },
    { key: "label_company", label: "Company label", wysiwyg: false },
    { key: "label_message", label: "Message label", wysiwyg: false },
    { key: "label_video", label: "Video call label", wysiwyg: false },
    {
      key: "closing_copy",
      label: "Closing Paragraph",
      description: "Rendered after the meet link. Empty = use translated default.",
      wysiwyg: true,
    },
  ],
  "contact-forms-booking-admin-notification": [
    {
      key: "header_title",
      label: "Header Title",
      description: "H2 heading. Empty = use translated default 'New booking'.",
      wysiwyg: false,
    },
    {
      key: "intro_copy",
      label: "Intro Paragraph",
      description: "Rendered above the booking facts. Empty = use translated default.",
      wysiwyg: true,
    },
    { key: "label_datetime", label: "Date & time label", wysiwyg: false },
    { key: "label_name", label: "Name label", wysiwyg: false },
    { key: "label_email", label: "Email label", wysiwyg: false },
    { key: "label_phone", label: "Phone label", wysiwyg: false },
    { key: "label_company", label: "Company label", wysiwyg: false },
    { key: "label_message", label: "Message label", wysiwyg: false },
    { key: "label_video", label: "Video call label", wysiwyg: false },
    { key: "closing_copy", label: "Closing Paragraph", wysiwyg: true },
  ],
  "contact-forms-submission": [
    {
      key: "header_title",
      label: "Header Title",
      description: "H2 heading. Empty = use translated default 'New contact form submission'.",
      wysiwyg: false,
    },
    { key: "intro_copy", label: "Intro Paragraph", wysiwyg: true },
    { key: "label_email", label: "Email label", wysiwyg: false },
    { key: "label_type", label: "Type label", wysiwyg: false },
    { key: "label_form", label: "Form label", wysiwyg: false },
    { key: "label_code", label: "Code label", wysiwyg: false },
    { key: "label_body", label: "Body label", wysiwyg: false },
    { key: "closing_copy", label: "Closing Paragraph", wysiwyg: true },
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
      return TYPE_LABELS[this.emailType] || this.emailType;
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
  gap: 16px;
}
</style>
