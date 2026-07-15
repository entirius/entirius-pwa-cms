<template>
  <div class="p-500 fs-300 t-basic-800 h-100 ov-h">
    <div
      class="bg-basic-100 b-basic-300 br-50 h-100 ovy-auto pl-500 pt-500 pb-500 pr-500"
    >
      <div class="flex ai-ct mb-400">
        <h1 class="fs-700 fw-600">{{ $t("emails.dashboard") }}</h1>
      </div>

      <Loader v-show="loading" />

      <div v-show="!loading">
        <!-- Channels -->
        <div class="mb-500">
          <h2 class="fs-500 fw-600 mb-300">{{ $t("emails.channels") }}</h2>
          <div v-if="channels.length === 0" class="fs-300 t-basic-500">
            {{ $t("emails.no_channels") }}
          </div>
          <div class="emails-grid">
            <div
              v-for="channel in channels"
              :key="channel.pk"
              class="emails-card bg-basic-100 b-basic-300 br-50 p-400 pointer"
              @click="editChannel(channel.pk)"
            >
              <div class="flex ai-ct gap-200 mb-200">
                <div
                  class="emails-card__color-dot"
                  :style="{
                    backgroundColor:
                      channel.main_background_color || 'var(--c-basic-300)',
                  }"
                ></div>
                <span class="fs-400 fw-600 t-basic-800">{{
                  channel.label
                }}</span>
              </div>
              <div class="fs-200 t-basic-500">{{ channel.idx }}</div>
              <div v-if="channel.from_email" class="fs-200 t-basic-500 mt-100">
                {{ channel.from_email }}
              </div>
            </div>
          </div>
        </div>

        <!-- Email Types -->
        <div>
          <h2 class="fs-500 fw-600 mb-300">
            {{ $t("emails.template_types") }}
          </h2>
          <div class="emails-grid">
            <div
              v-for="emailType in emailTypes"
              :key="emailType.slug"
              class="emails-card bg-basic-100 b-basic-300 br-50 p-400 pointer"
              @click="editTemplates(emailType.slug)"
            >
              <div class="fs-400 fw-600 t-basic-800 mb-100">
                {{ emailType.label }}
              </div>
              <div class="fs-200 t-basic-500">{{ emailType.description }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { useLoaderStore } from "@/stores/loader";
import { useNotifyStore } from "@/stores/notify";
import { GET_EmailChannels, GET_EmailTemplates } from "@/api/emails/api";
import { extractApiMessage } from "@/composables/useFormErrors";

export default {
  name: "EmailsDashboard",
  setup() {
    const loader = useLoaderStore();
    const notify = useNotifyStore();
    return { loader, notify };
  },
  data() {
    return {
      channels: [],
      loading: false,
      allEmailTypes: [
        {
          slug: "accounts-new-account",
          label: "New Account",
          description: "Signup confirmation email",
        },
        {
          slug: "accounts-reset-password",
          label: "Reset Password",
          description: "Password reset email",
        },
        {
          slug: "checkout-virtual-product",
          label: "Virtual Product",
          description: "Digital product delivery email",
        },
        {
          slug: "loyalty-coupon-confirmation",
          label: "Coupon Confirmation",
          description: "Loyalty coupon email",
        },
        {
          slug: "returns-return-confirmation",
          label: "Return Confirmation",
          description: "Return accepted email",
        },
        {
          slug: "allegro-virtual-product",
          label: "Allegro Virtual Product",
          description: "Allegro digital delivery email",
        },
        {
          slug: "agreements-newsletter-signup",
          label: "Newsletter Signup",
          description: "Newsletter confirmation email",
        },
        {
          slug: "contact-forms-booking-confirmation",
          label: "Booking Confirmation",
          description: "Booker confirmation email",
        },
        {
          slug: "contact-forms-booking-admin-notification",
          label: "Booking Admin Notification",
          description: "Admin notification of new booking",
        },
        {
          slug: "contact-forms-submission",
          label: "Contact Form Submission",
          description: "Generic contact form admin notification",
        },
      ],
      emailTypes: [],
    };
  },
  mounted() {
    this.fetchData();
  },
  methods: {
    async fetchData() {
      this.loading = true;
      try {
        const [channelsRes, ...typeCounts] = await Promise.all([
          GET_EmailChannels(),
          ...this.allEmailTypes.map((t) =>
            GET_EmailTemplates(t.slug, { page_size: 1 })
              .then((r) => r.data.count)
              .catch(() => 0)
          ),
        ]);
        this.channels = channelsRes.data.results || [];
        this.emailTypes = this.allEmailTypes.filter(
          (_, i) => typeCounts[i] > 0
        );
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("emails.error_load_channels")),
        });
      } finally {
        this.loading = false;
      }
    },
    editChannel(pk) {
      this.$router.push(`/emails/channels/${pk}`);
    },
    editTemplates(slug) {
      this.$router.push(`/emails/templates/${slug}`);
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

.emails-card__color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid var(--c-basic-300);
  flex-shrink: 0;
}
</style>
