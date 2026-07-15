<template>
  <div class="p-500 fs-300 t-basic-800 h-100 ov-h">
    <div
      class="bg-basic-100 b-basic-300 br-50 h-100 ovy-auto pl-500 pt-500 pb-500 pr-500"
    >
      <Teleport v-if="toolbarReady" to="#forms-toolbar-left">
        <BasicButton
          icon="arrow-left"
          :text="$t('cf.back_to_list')"
          class="bg-basic-200 t-basic-600"
          @click="$router.push('/forms/bookings')"
        />
      </Teleport>

      <Loader v-if="loading" />

      <template v-else-if="booking">
        <div class="flex ai-ct mb-400">
          <h1 class="fs-700 fw-600">{{ $t("cf.booking_detail") }}</h1>
        </div>

        <div class="cf-booking-grid">
          <div class="cf-card">
            <h2 class="cf-card__title">{{ $t("cf.meeting_start") }}</h2>
            <dl class="cf-field-list">
              <div class="cf-field-list__row">
                <dt>{{ $t("cf.meeting_start") }}</dt>
                <dd>{{ formatDateTime(booking.meeting_start) }}</dd>
              </div>
              <div class="cf-field-list__row">
                <dt>{{ $t("cf.meeting_end") }}</dt>
                <dd>{{ formatDateTime(booking.meeting_end) }}</dd>
              </div>
              <div class="cf-field-list__row">
                <dt>{{ $t("cf.timezone") }}</dt>
                <dd>{{ booking.timezone }}</dd>
              </div>
              <div class="cf-field-list__row">
                <dt>{{ $t("cf.name") }}</dt>
                <dd>
                  <span v-if="booking.name">{{ booking.name }}</span>
                  <span v-else class="t-basic-400">---</span>
                </dd>
              </div>
              <div class="cf-field-list__row">
                <dt>{{ $t("cf.email") }}</dt>
                <dd>{{ booking.email }}</dd>
              </div>
              <div class="cf-field-list__row">
                <dt>{{ $t("cf.channel") }}</dt>
                <dd>{{ booking.channel_idx }}</dd>
              </div>
              <div class="cf-field-list__row">
                <dt>{{ $t("cf.provider") }}</dt>
                <dd>{{ booking.provider }}</dd>
              </div>
              <div class="cf-field-list__row">
                <dt>{{ $t("cf.calendar_event_id") }}</dt>
                <dd>
                  <code class="cf-code">{{ booking.calendar_event_id }}</code>
                </dd>
              </div>
              <div class="cf-field-list__row">
                <dt>{{ $t("cf.meet_link") }}</dt>
                <dd>
                  <a
                    v-if="booking.meet_link"
                    :href="booking.meet_link"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="cf-inline-link"
                  >
                    {{ $t("cf.open_meet") }}
                    <font-awesome-icon icon="video" />
                  </a>
                  <span v-else class="t-basic-400">---</span>
                </dd>
              </div>
              <div class="cf-field-list__row">
                <dt>{{ $t("cf.created_at") }}</dt>
                <dd>{{ formatDateTime(booking.created_at) }}</dd>
              </div>
            </dl>
          </div>

          <div class="cf-card">
            <h2 class="cf-card__title">{{ $t("cf.lead_status") }}</h2>
            <template v-if="booking.linked_lead">
              <div class="mb-200">
                <StatusBadge
                  :label="leadStatusLabel($t, booking.linked_lead.status)"
                  :variant="leadStatusVariant(booking.linked_lead.status)"
                />
              </div>
              <dl class="cf-field-list">
                <div class="cf-field-list__row">
                  <dt>{{ $t("cf.name") }}</dt>
                  <dd>
                    <span v-if="booking.linked_lead.name">{{
                      booking.linked_lead.name
                    }}</span>
                    <span v-else class="t-basic-400">---</span>
                  </dd>
                </div>
                <div class="cf-field-list__row">
                  <dt>{{ $t("cf.email") }}</dt>
                  <dd>{{ booking.linked_lead.email }}</dd>
                </div>
                <div class="cf-field-list__row">
                  <dt>{{ $t("cf.deal_value") }}</dt>
                  <dd>
                    <span v-if="booking.linked_lead.deal_value">{{
                      booking.linked_lead.deal_value
                    }}</span>
                    <span v-else class="t-basic-400">---</span>
                  </dd>
                </div>
              </dl>
              <div class="mt-300">
                <BasicButton
                  icon="bullseye"
                  :text="$t('cf.open_lead')"
                  class="bg-support-400 t-basic-100"
                  @click="
                    $router.push(`/forms/leads/${booking.linked_lead.id}`)
                  "
                />
              </div>
            </template>
            <EmptyState
              v-else
              icon="user"
              :title="$t('cf.no_linked_lead')"
              :message="''"
            />
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script>
import { useLoaderStore } from "@/stores/loader";
import { useNotifyStore } from "@/stores/notify";
import { GET_Booking } from "@/api/contactForms/api";
import { leadStatusLabel, leadStatusVariant } from "./helpers/leadStatus";
import { extractApiMessage } from "@/composables/useFormErrors";

export default {
  name: "BookingDetail",
  setup() {
    const loader = useLoaderStore();
    const notify = useNotifyStore();
    return { loader, notify };
  },
  data() {
    return {
      booking: null,
      loading: false,
      toolbarReady: false,
    };
  },
  mounted() {
    this.toolbarReady = !!document.getElementById("forms-toolbar-left");
    this.fetchBooking();
  },
  methods: {
    leadStatusLabel,
    leadStatusVariant,
    formatDateTime(iso) {
      if (!iso) return "---";
      const d = new Date(iso);
      return d.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    },
    async fetchBooking() {
      this.loading = true;
      try {
        const { data } = await GET_Booking(this.$route.params.id);
        this.booking = data;
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.cf-booking-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: var(--space-300);
}

.cf-card {
  padding: var(--space-300);
  background: var(--c-basic-100);
  border: 1px solid var(--c-basic-300);
  border-radius: var(--radius-md);
}

.cf-card__title {
  font-size: var(--fs-200);
  font-weight: 600;
  color: var(--c-basic-500);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: var(--space-200);
}

.cf-field-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-100);
  margin: 0;
}

.cf-field-list__row {
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: var(--space-200);
  align-items: baseline;
}

.cf-field-list__row > dt {
  font-size: var(--fs-200);
  font-weight: 600;
  color: var(--c-basic-500);
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.cf-field-list__row > dd {
  margin: 0;
  color: var(--c-basic-800);
  word-break: break-word;
}

.cf-inline-link {
  color: var(--c-support-400);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: var(--space-50);
}

.cf-inline-link:hover {
  text-decoration: underline;
}

.cf-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: var(--fs-200);
  padding: 2px 6px;
  background: var(--c-basic-200);
  border-radius: var(--radius-sm);
  color: var(--c-basic-700);
}
</style>
