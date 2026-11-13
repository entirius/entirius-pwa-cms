<template>
  <PageLayout class="fs-300 t-body">
    <template v-if="!loading" #header>
      <PageHeader :title="$t('emails.edit_template')" :back="goBack">
        <template #meta>
          <span class="fs-200 t-muted">({{ typeLabel }})</span>
          <span v-if="template.language_code" class="fs-200 t-accent fw-600">{{ template.language_code }}</span>
        </template>
        <template v-if="!loadFailed" #actions>
          <ActionBar :actions="headerActions" />
        </template>
      </PageHeader>
    </template>

    <Loader block v-if="loading" />

    <div v-else-if="!loadFailed" :class="{ 'template-edit--preview': hasPreview }">
      <BasicCard :title="$t('emails.template_content')" gap>
        <div class="form-grid">
          <FormField
            :label="$t('emails.subject')"
            :hint="subjectHint ? $t(subjectHint) : ''"
            :hint-level="subjectHint ? 'important' : 'subtle'"
            class="form-grid__wide"
          >
            <BasicInput v-model="template.subject" />
          </FormField>
          <FormField
            v-for="field in contentFields"
            :key="field.key"
            :label="$t(field.label)"
            :hint="field.hint ? $t(field.hint) : ''"
            :hint-level="field.hintLevel"
            :class="{ 'form-grid__wide': field.wysiwyg || field.multiline }"
          >
            <BasicWysiwyg v-if="field.wysiwyg" v-model="template[field.key]" />
            <BasicTextarea v-else-if="field.multiline" v-model="template[field.key]" :rows="3" />
            <BasicInput v-else v-model="template[field.key]" />
          </FormField>
        </div>
      </BasicCard>
      <EmailPreview
        v-if="hasPreview"
        :email-type="emailType"
        :language="(template.language_code || '').toLowerCase()"
        :version="savedVersion"
        :dirty="dirty"
      />
    </div>
  </PageLayout>
</template>

<script>
import { useLoaderStore } from "@/stores/loader";
import { useNotifyStore } from "@/stores/notify";
import { GET_EmailTemplate, PATCH_EmailTemplate } from "@/api/emails/api";
import { extractApiMessage } from "@/composables/useFormErrors";
import { emailTypeLabel, PREVIEW_VARIANTS } from "./emailTypes";
import EmailPreview from "./components/EmailPreview.vue";

// A hint naming a placeholder the text can carry changes what the user types: an important hint (plan 60).
const PLACEHOLDER_HINTS = [
  "emails.field_hints.user_name",
  "emails.field_hints.order_id",
  "emails.field_hints.return_id",
  "emails.field_hints.greeting",
  "emails.field_hints.order_number",
];

// The subject's hint of the types whose subject carries a placeholder.
const SUBJECT_HINTS = {
  "checkout-order-confirmation": "emails.field_hints.order_number",
  "checkout-order-canceled": "emails.field_hints.order_number",
};

// The payload as a comparable string: an empty field reads the same whether the API sent null or the user cleared it.
const snapshot = (payload) => JSON.stringify(payload, (_, value) => value ?? "");

const TYPE_FIELDS = {
  "accounts-new-account": [
    {
      key: "welcome",
      label: "emails.fields.welcome",
      hint: "emails.field_hints.user_name",
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
      hint: "emails.field_hints.user_name",
      wysiwyg: true,
    },
    {
      key: "order",
      label: "emails.fields.order",
      hint: "emails.field_hints.order_id",
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
      hint: "emails.field_hints.user_name",
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
      hint: "emails.field_hints.user_name",
      wysiwyg: true,
    },
    {
      key: "return_copy",
      label: "emails.fields.return_copy",
      hint: "emails.field_hints.return_id",
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
      hint: "emails.field_hints.user_name",
      wysiwyg: true,
    },
    {
      key: "order",
      label: "emails.fields.order",
      hint: "emails.field_hints.order_id",
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
      hint: "emails.field_hints.user_name",
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
      hint: "emails.field_hints.header_booking",
      wysiwyg: false,
    },
    {
      key: "greeting_template",
      label: "emails.fields.greeting_template",
      hint: "emails.field_hints.greeting",
      wysiwyg: false,
    },
    {
      key: "intro_copy",
      label: "emails.fields.intro_copy",
      hint: "emails.field_hints.intro_booking",
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
      hint: "emails.field_hints.closing_booking",
      wysiwyg: true,
    },
  ],
  "contact-forms-booking-admin-notification": [
    {
      key: "header_title",
      label: "emails.fields.header_title",
      hint: "emails.field_hints.header_admin_booking",
      wysiwyg: false,
    },
    {
      key: "intro_copy",
      label: "emails.fields.intro_copy",
      hint: "emails.field_hints.intro_booking",
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
  "checkout-order-confirmation": [
    { key: "preheader", label: "emails.fields.preheader", hint: "emails.field_hints.preheader" },
    { key: "heading", label: "emails.fields.heading", hint: "emails.field_hints.heading" },
    { key: "intro", label: "emails.fields.intro", hint: "emails.field_hints.intro", multiline: true },
    { key: "split_note", label: "emails.fields.split_note", hint: "emails.field_hints.split_note", multiline: true },
    { key: "transfer_heading", label: "emails.fields.transfer_heading", hint: "emails.field_hints.transfer_heading" },
    { key: "transfer_note", label: "emails.fields.transfer_note", hint: "emails.field_hints.transfer_note", multiline: true },
    { key: "cod_note", label: "emails.fields.cod_note", hint: "emails.field_hints.cod_note", multiline: true },
    { key: "paid_note", label: "emails.fields.paid_note", hint: "emails.field_hints.paid_note", multiline: true },
    { key: "help", label: "emails.fields.help", hint: "emails.field_hints.help_order", multiline: true },
  ],
  "checkout-order-canceled": [
    { key: "preheader", label: "emails.fields.preheader", hint: "emails.field_hints.preheader" },
    { key: "heading", label: "emails.fields.heading", hint: "emails.field_hints.heading" },
    { key: "intro", label: "emails.fields.intro", hint: "emails.field_hints.intro", multiline: true },
    { key: "refund_note", label: "emails.fields.refund_note", hint: "emails.field_hints.refund_note", multiline: true },
    { key: "help", label: "emails.fields.help", hint: "emails.field_hints.help_order", multiline: true },
  ],
  "contact-forms-submission": [
    {
      key: "header_title",
      label: "emails.fields.header_title",
      hint: "emails.field_hints.header_submission",
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
  components: { EmailPreview },
  setup() {
    const loader = useLoaderStore();
    const notify = useNotifyStore();
    return { loader, notify };
  },
  data() {
    return {
      template: {},
      loading: true,
      loadFailed: false,
      // the payload as last loaded or saved, and a counter the preview reloads on
      savedPayload: "",
      savedVersion: 0,
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
      return (TYPE_FIELDS[this.emailType] || []).map((field) => ({
        ...field,
        hintLevel: PLACEHOLDER_HINTS.includes(field.hint) ? "important" : "subtle",
      }));
    },
    subjectHint() {
      return SUBJECT_HINTS[this.emailType] || "";
    },
    hasPreview() {
      return Boolean(PREVIEW_VARIANTS[this.emailType]);
    },
    payload() {
      const payload = { subject: this.template.subject };
      for (const field of this.contentFields) {
        payload[field.key] = this.template[field.key];
      }
      return payload;
    },
    dirty() {
      return snapshot(this.payload) !== this.savedPayload;
    },
    headerActions() {
      return [
        {
          key: "save",
          role: "primary",
          label: this.$t("common.save"),
          onClick: this.save,
          testid: "emails-save",
        },
      ];
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
        this.savedPayload = snapshot(this.payload);
      } catch (err) {
        this.loadFailed = true;
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
        const { data } = await PATCH_EmailTemplate(
          this.emailType,
          this.$route.params.pk,
          this.payload
        );
        this.template = data;
        this.savedPayload = snapshot(this.payload);
        this.savedVersion += 1;
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
// The preview sits right of the form on a wide screen and under it below that.
.template-edit--preview {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-8);
}

@media only screen and (min-width: 1280px) {
  .template-edit--preview {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    align-items: start;
  }
}
</style>
