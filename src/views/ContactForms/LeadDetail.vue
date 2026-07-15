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
          @click="$router.push('/forms/leads')"
        />
        <span v-if="form.name" class="fw-600">{{ form.name }}</span>
      </Teleport>
      <Teleport v-if="toolbarReady" to="#forms-toolbar-right">
        <StatusBadge
          v-if="lead"
          :label="leadStatusLabel($t, lead.status)"
          :variant="leadStatusVariant(lead.status)"
        />
        <BasicButton
          v-if="canMarkAsWon"
          icon="check"
          :text="$t('cf.mark_as_won')"
          class="bg-positive-200 t-basic-100"
          @click="openMarkAsWon"
        />
        <Dropdown
          v-if="otherTransitions.length"
          :values="otherTransitions"
          :placeholder="$t('cf.change_status')"
          class="cf-detail__transitions"
          @onSelect="onTransition"
        />
        <span v-if="isDirty" class="chip bg-warning-100 t-warning-300">
          {{ $t("unsaved.changes") }}
        </span>
        <BasicButton
          :text="$t('cf.save')"
          class="bg-support-400 t-basic-100"
          :is-disabled="!isDirty || saving"
          @click="save"
        />
      </Teleport>

      <Loader v-if="loading" />

      <template v-else-if="lead">
        <div class="flex ai-ct mb-300">
          <h1 class="fs-700 fw-600">{{ $t("cf.lead_detail") }}</h1>
        </div>

        <div class="cf-lead-grid">
          <!-- Editable fields -->
          <div class="cf-card">
            <h2 class="cf-card__title">{{ $t("cf.actions") }}</h2>
            <FormField :label="$t('cf.name')">
              <BasicInput
                v-model="form.name"
                :validate="formErrors.getFieldError('name')"
              />
            </FormField>
            <FormField :label="$t('cf.phone')">
              <BasicInput
                v-model="form.phone"
                :validate="formErrors.getFieldError('phone')"
              />
            </FormField>
            <FormField :label="$t('cf.company')">
              <BasicInput
                v-model="form.company"
                :validate="formErrors.getFieldError('company')"
              />
            </FormField>
            <FormField :label="$t('cf.deal_value')">
              <BasicInput
                v-model="form.deal_value"
                type="number"
                min="0"
                step="0.01"
                :validate="formErrors.getFieldError('deal_value')"
              />
            </FormField>
            <FormField :label="$t('cf.notes')">
              <BasicInput
                v-model="form.notes"
                :validate="formErrors.getFieldError('notes')"
              />
            </FormField>
          </div>

          <!-- Read-only facts -->
          <div class="cf-card">
            <h2 class="cf-card__title">{{ $t("cf.submission_detail") }}</h2>
            <dl class="cf-field-list">
              <div class="cf-field-list__row">
                <dt>{{ $t("cf.email") }}</dt>
                <dd>{{ lead.email }}</dd>
              </div>
              <div class="cf-field-list__row">
                <dt>{{ $t("cf.channel") }}</dt>
                <dd>{{ lead.channel_idx }}</dd>
              </div>
              <div class="cf-field-list__row">
                <dt>{{ $t("cf.source_type") }}</dt>
                <dd>{{ sourceTypeLabel(lead.source_type) }}</dd>
              </div>
              <div class="cf-field-list__row">
                <dt>{{ $t("cf.contact_date") }}</dt>
                <dd>{{ formatDateTime(lead.contact_date) }}</dd>
              </div>
              <div class="cf-field-list__row">
                <dt>{{ $t("cf.status_changed_at") }}</dt>
                <dd>{{ formatDateTime(lead.status_changed_at) }}</dd>
              </div>
              <div class="cf-field-list__row">
                <dt>{{ $t("cf.attribution_method") }}</dt>
                <dd>{{ lead.attribution_method || "---" }}</dd>
              </div>
              <div class="cf-field-list__row">
                <dt>{{ $t("cf.gclid") }}</dt>
                <dd>
                  <code v-if="lead.gclid" class="cf-code">{{
                    lead.gclid
                  }}</code>
                  <span v-else class="t-basic-400">---</span>
                </dd>
              </div>
              <div class="cf-field-list__row">
                <dt>{{ $t("cf.campaign_name") }}</dt>
                <dd>{{ lead.campaign_name || "---" }}</dd>
              </div>
              <div class="cf-field-list__row">
                <dt>{{ $t("cf.landing_page") }}</dt>
                <dd>{{ lead.landing_page || "---" }}</dd>
              </div>
              <div class="cf-field-list__row">
                <dt>{{ $t("cf.ads_imported") }}</dt>
                <dd>
                  <span
                    v-if="lead.ads_conversion_imported"
                    class="cf-ads-imported"
                  >
                    <font-awesome-icon icon="check" />
                    {{ formatDateTime(lead.ads_imported_at) }}
                  </span>
                  <span v-else class="t-basic-400">---</span>
                </dd>
              </div>
            </dl>
          </div>

          <!-- Integrations card -->
          <div class="cf-card">
            <h2 class="cf-card__title">{{ $t("cf.integrations_title") }}</h2>
            <dl class="cf-field-list">
              <div class="cf-field-list__row">
                <dt>{{ $t("cf.google_ads_enabled_label") }}</dt>
                <dd>
                  <StatusBadge
                    :label="
                      integrations?.google_ads_enabled
                        ? $t('cf.enabled')
                        : $t('cf.disabled')
                    "
                    :variant="
                      integrations?.google_ads_enabled ? 'positive' : 'neutral'
                    "
                  />
                </dd>
              </div>
              <div class="cf-field-list__row">
                <dt>{{ $t("cf.bookings_enabled_label") }}</dt>
                <dd>
                  <StatusBadge
                    :label="
                      integrations?.bookings_enabled
                        ? $t('cf.enabled')
                        : $t('cf.disabled')
                    "
                    :variant="
                      integrations?.bookings_enabled ? 'positive' : 'neutral'
                    "
                  />
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </template>
    </div>

    <Confirmation-modal
      :visible="showMarkAsWon"
      @accept="confirmMarkAsWon"
      @reject="cancelMarkAsWon"
    >
      <template #header>
        <h2 class="fs-500 fw-600">{{ $t("cf.mark_as_won_title") }}</h2>
      </template>
      <template #description>
        <p class="mb-200">{{ $t("cf.mark_as_won_description") }}</p>
        <FormField :label="$t('cf.deal_value')">
          <BasicInput
            v-model="markAsWonDealValue"
            type="number"
            min="0"
            step="0.01"
          />
        </FormField>
        <p
          v-if="integrations && integrations.google_ads_enabled"
          class="fs-200 t-support-400 mt-200"
        >
          <font-awesome-icon icon="circle-info" />
          {{ $t("cf.google_ads_push_hint") }}
        </p>
        <p
          v-else-if="integrations"
          class="fs-200 t-basic-500 mt-200"
        >
          <font-awesome-icon icon="circle-info" />
          {{ $t("cf.google_ads_off_hint") }}
        </p>
      </template>
      <template #footer>
        <button class="modal-btn modal-btn--secondary" @click="cancelMarkAsWon">
          {{ $t("cf.cancel") }}
        </button>
        <button class="modal-btn modal-btn--confirm" @click="confirmMarkAsWon">
          {{ $t("cf.confirm") }}
        </button>
      </template>
    </Confirmation-modal>
  </div>
</template>

<script>
import { useLoaderStore } from "@/stores/loader";
import { useNotifyStore } from "@/stores/notify";
import { useFormErrors, extractApiMessage } from "@/composables/useFormErrors";
import ConfirmationModal from "@/functionals/Confirmation-modal/index.vue";
import {
  GET_Lead,
  PATCH_Lead,
  POST_LeadTransition,
  GET_ChannelIntegrations,
} from "@/api/contactForms/api";
import {
  allowedTransitions,
  leadStatusLabel,
  leadStatusVariant,
} from "./helpers/leadStatus";

export default {
  name: "LeadDetail",
  components: { ConfirmationModal },
  setup() {
    const loader = useLoaderStore();
    const notify = useNotifyStore();
    const formErrors = useFormErrors();
    return { loader, notify, formErrors };
  },
  data() {
    return {
      lead: null,
      loading: false,
      saving: false,
      toolbarReady: false,
      integrations: null,
      showMarkAsWon: false,
      markAsWonDealValue: "",
      isDirty: false,
      initialSnapshot: null,
      form: {
        name: "",
        phone: "",
        company: "",
        deal_value: "",
        notes: "",
      },
    };
  },
  computed: {
    canMarkAsWon() {
      if (!this.lead) return false;
      return allowedTransitions(this.lead.status).includes("won");
    },
    otherTransitions() {
      if (!this.lead) return [];
      return allowedTransitions(this.lead.status)
        .filter((s) => s !== "won" || !this.canMarkAsWon)
        .map((s) => ({
          label: this.$t("cf.transition_to", {
            status: leadStatusLabel(this.$t, s),
          }),
          value: s,
        }));
    },
  },
  watch: {
    form: {
      deep: true,
      handler() {
        if (this.initialSnapshot) {
          this.isDirty = JSON.stringify(this.form) !== this.initialSnapshot;
        }
        if (this.formErrors.hasErrors) this.formErrors.clearErrors();
      },
    },
  },
  mounted() {
    this.toolbarReady = !!document.getElementById("forms-toolbar-left");
    this.fetchLead();
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
    sourceTypeLabel(value) {
      if (!value) return "---";
      const key = `cf.source_types.${value}`;
      const translated = this.$t(key);
      return translated !== key ? translated : value;
    },
    snapshotForm() {
      this.$nextTick(() => {
        this.initialSnapshot = JSON.stringify(this.form);
        this.isDirty = false;
      });
    },
    async fetchLead() {
      this.loading = true;
      try {
        const { data } = await GET_Lead(this.$route.params.id);
        this.lead = data;
        this.form = {
          name: data.name || "",
          phone: data.phone || "",
          company: data.company || "",
          deal_value: data.deal_value != null ? String(data.deal_value) : "",
          notes: data.notes || "",
        };
        this.snapshotForm();
        this.fetchIntegrations();
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
      } finally {
        this.loading = false;
      }
    },
    async fetchIntegrations() {
      if (!this.lead?.channel_idx) return;
      try {
        const { data } = await GET_ChannelIntegrations(this.lead.channel_idx);
        this.integrations = data;
      } catch {
        // Non-fatal — the Mark-as-Won hint simply won't show.
        this.integrations = null;
      }
    },
    buildPayload() {
      const payload = {
        name: this.form.name || null,
        phone: this.form.phone || null,
        company: this.form.company || null,
        notes: this.form.notes || null,
      };
      if (this.form.deal_value !== "" && this.form.deal_value != null) {
        payload.deal_value = this.form.deal_value;
      } else {
        payload.deal_value = null;
      }
      return payload;
    },
    async save() {
      if (!this.lead) return;
      this.saving = true;
      this.loader.loaderStart();
      try {
        const { data } = await PATCH_Lead(this.lead.id, this.buildPayload());
        this.lead = data;
        this.form = {
          name: data.name || "",
          phone: data.phone || "",
          company: data.company || "",
          deal_value: data.deal_value != null ? String(data.deal_value) : "",
          notes: data.notes || "",
        };
        this.snapshotForm();
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("cf.save_success"),
        });
      } catch (err) {
        this.formErrors.handleApiError(err);
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("cf.save_error")),
        });
      } finally {
        this.saving = false;
        this.loader.loaderFinish();
      }
    },
    async onTransition(newStatus) {
      if (!newStatus || !this.lead) return;
      if (newStatus === "won") {
        this.openMarkAsWon();
        return;
      }
      await this.runTransition({ new_status: newStatus });
    },
    openMarkAsWon() {
      this.markAsWonDealValue =
        this.form.deal_value ||
        (this.lead?.deal_value != null ? String(this.lead.deal_value) : "");
      this.showMarkAsWon = true;
    },
    cancelMarkAsWon() {
      this.showMarkAsWon = false;
    },
    async confirmMarkAsWon() {
      const dealValue = this.markAsWonDealValue;
      if (!dealValue) {
        this.notify.spawnNotification({
          type: "negative",
          msg: this.$t("cf.save_error"),
        });
        return;
      }
      const ok = await this.runTransition({
        new_status: "won",
        deal_value: dealValue,
      });
      if (ok) this.showMarkAsWon = false;
    },
    async runTransition(payload) {
      if (!this.lead) return false;
      this.loader.loaderStart();
      try {
        const { data } = await POST_LeadTransition(this.lead.id, payload);
        this.lead = data;
        this.form.deal_value =
          data.deal_value != null ? String(data.deal_value) : "";
        this.snapshotForm();
        this.notify.spawnNotification({
          type: "positive",
          msg: this.$t("cf.transition_success"),
        });
        return true;
      } catch (err) {
        const body = err?.response?.data || err || {};
        if (body.error === "INVALID_TRANSITION") {
          this.notify.spawnNotification({
            type: "negative",
            msg: this.$t("cf.invalid_transition", {
              from: leadStatusLabel(this.$t, body.from_status),
              to: leadStatusLabel(this.$t, body.to_status),
            }),
          });
        } else {
          this.formErrors.handleApiError(err);
          this.notify.spawnNotification({
            type: "negative",
            msg:
              body.message ||
              this.formErrors.summary ||
              this.$t("cf.transition_error"),
          });
        }
        return false;
      } finally {
        this.loader.loaderFinish();
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.cf-lead-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
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
  grid-template-columns: 140px 1fr;
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

.cf-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: var(--fs-200);
  padding: 2px 6px;
  background: var(--c-basic-200);
  border-radius: var(--radius-sm);
  color: var(--c-basic-700);
}

.cf-ads-imported {
  display: inline-flex;
  align-items: center;
  gap: var(--space-50);
  color: var(--c-positive-300);
}

.cf-detail__transitions {
  min-width: 180px;
}
</style>
