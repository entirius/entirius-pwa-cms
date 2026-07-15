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
          @click="$router.push('/emails')"
        />
        <h1 class="fs-700 fw-600">{{ typeLabel }}</h1>
      </div>

      <Loader v-show="loading" />

      <div v-show="!loading">
        <div v-if="templates.length === 0" class="fs-300 t-basic-500">
          {{ $t("emails.no_templates") }}
        </div>
        <div class="emails-grid">
          <div
            v-for="tpl in templates"
            :key="tpl.pk"
            class="emails-card bg-basic-100 b-basic-300 br-50 p-400 pointer"
            @click="editTemplate(tpl.pk)"
          >
            <div class="fs-400 fw-600 t-basic-800 mb-100">
              {{ tpl.subject || $t("emails.default_subject") }}
            </div>
            <div class="fs-200 t-basic-500">
              {{ $t("emails.language") }}:
              {{ tpl.language_code || $t("emails.default_lang") }}
            </div>
            <StatusBadge
              :variant="tpl.subject ? 'positive' : 'neutral'"
              :label="
                tpl.subject ? $t('emails.customized') : $t('emails.default')
              "
              class="mt-200"
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
import { GET_EmailTemplates } from "@/api/emails/api";
import { extractApiMessage } from "@/composables/useFormErrors";

const TYPE_LABELS = {
  "accounts-new-account": "New Account Email",
  "accounts-reset-password": "Reset Password Email",
  "checkout-virtual-product": "Virtual Product Email",
  "loyalty-coupon-confirmation": "Coupon Confirmation Email",
  "returns-return-confirmation": "Return Confirmation Email",
  "allegro-virtual-product": "Allegro Virtual Product Email",
  "agreements-newsletter-signup": "Newsletter Signup Email",
  "contact-forms-booking-confirmation": "Booking Confirmation Email",
  "contact-forms-booking-admin-notification": "Booking Admin Notification Email",
  "contact-forms-submission": "Contact Form Submission Email",
};

export default {
  name: "EmailTemplateList",
  setup() {
    const loader = useLoaderStore();
    const notify = useNotifyStore();
    return { loader, notify };
  },
  data() {
    return {
      templates: [],
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
  },
  mounted() {
    this.fetchTemplates();
  },
  methods: {
    async fetchTemplates() {
      this.loading = true;
      try {
        const { data } = await GET_EmailTemplates(this.emailType);
        this.templates = data.results || [];
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("emails.error_load_templates")),
        });
      } finally {
        this.loading = false;
      }
    },
    editTemplate(pk) {
      this.$router.push(`/emails/templates/${this.emailType}/${pk}`);
    },
  },
};
</script>

<style lang="scss" scoped>
.emails-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.emails-card {
  transition: border-color 0.15s;

  &:hover {
    border-color: var(--c-support-300);
  }
}
</style>
