<template>
  <div class="p-12 fs-300 t-body h-100 ov-h">
    <div
      class="page-card h-100 ovy-auto"
    >
      <div class="flex ai-ct mb-10">
        <h1 class="page-title">{{ $t("emails.dashboard") }}</h1>
      </div>

      <Loader v-show="loading" />

      <div v-show="!loading">
        <!-- Channels -->
        <div class="mb-12">
          <h2 class="fs-500 fw-600 mb-8">{{ $t("emails.channels") }}</h2>
          <div v-if="channels.length === 0" class="fs-300 t-muted">
            {{ $t("emails.no_channels") }}
          </div>
          <div class="emails-grid">
            <div
              v-for="channel in channels"
              :key="channel.pk"
              class="page-card emails-card pointer"
              @click="editChannel(channel.pk)"
            >
              <div class="flex ai-ct gap-5 mb-5">
                <div
                  class="emails-card__color-dot"
                  :style="{
                    backgroundColor:
                      channel.main_background_color || 'var(--surface-hover)',
                  }"
                ></div>
                <span class="fs-400 fw-600 t-body">{{
                  channel.label
                }}</span>
              </div>
              <div class="fs-200 t-muted">{{ channel.idx }}</div>
              <div v-if="channel.from_email" class="fs-200 t-muted mt-2">
                {{ channel.from_email }}
              </div>
            </div>
          </div>
        </div>

        <!-- Email Types -->
        <div>
          <h2 class="fs-500 fw-600 mb-8">
            {{ $t("emails.template_types") }}
          </h2>
          <div class="emails-grid">
            <div
              v-for="emailType in emailTypes"
              :key="emailType.slug"
              class="page-card emails-card pointer"
              @click="editTemplates(emailType.slug)"
            >
              <div class="fs-400 fw-600 t-body mb-2">
                {{ $t(`emails.types.${emailType.slug}`) }}
              </div>
              <div class="fs-200 t-muted">{{ $t(`emails.type_desc.${emailType.slug}`) }}</div>
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
          slug: "accounts-new-account"
        },
        {
          slug: "accounts-reset-password"
        },
        {
          slug: "checkout-virtual-product"
        },
        {
          slug: "loyalty-coupon-confirmation"
        },
        {
          slug: "returns-return-confirmation"
        },
        {
          slug: "allegro-virtual-product"
        },
        {
          slug: "agreements-newsletter-signup"
        },
        {
          slug: "contact-forms-booking-confirmation"
        },
        {
          slug: "contact-forms-booking-admin-notification"
        },
        {
          slug: "contact-forms-submission"
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
  gap: var(--space-4);
}

.emails-card {
  transition: border-color 0.15s;

  &:hover {
    border-color: var(--accent);
  }
}

.emails-card__color-dot {
  width: 12px;
  height: 12px;
  border-radius: var(--radius-full);
  border: 1px solid var(--border-subtle);
  flex-shrink: 0;
}
</style>
