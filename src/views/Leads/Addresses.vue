<template>
  <PageLayout data-testid="leads-addresses">
    <template #header>
      <PageHeader :title="$t('leads.addresses.title')" :back="{ name: 'LeadsSettings' }" />
    </template>
    <div class="addresses flex-column gap-8">
      <BasicCard :title="$t('leads.addresses.report')" data-testid="addresses-report">
        <p v-if="reportError" class="t-negative m-0" role="alert" data-testid="addresses-report-error">{{ reportError }}</p>
        <div v-else-if="report" class="flex-column gap-4">
          <p class="m-0 flex ai-ct gap-3 flex-wrap">
            <StatusBadge :tone="report.enabled ? 'positive' : 'warning'" :label="report.enabled ? $t('leads.addresses.loop_on') : $t('leads.addresses.loop_off')" data-testid="addresses-enabled" />
            <span class="t-muted fs-200">{{ $t("leads.addresses.help", { days: report.max_age_days }) }}</span>
          </p>
          <dl class="tiles m-0">
            <div v-for="status in STATUSES" :key="status" class="tile" :data-testid="`addresses-count-${status}`">
              <dt class="t-muted fs-200">{{ emailStatusLabel(status) }}</dt>
              <dd class="fs-500 fw-600 m-0">{{ report.counts[status] ?? 0 }}</dd>
            </div>
            <div class="tile" data-testid="addresses-stale">
              <dt class="t-muted fs-200">{{ $t("leads.addresses.stale") }}</dt>
              <dd class="fs-500 fw-600 m-0">{{ report.stale }}</dd>
            </div>
          </dl>
        </div>
        <Loader v-else block />
      </BasicCard>

      <section class="flex-column gap-4" data-testid="addresses-list-box">
        <h2 class="fs-500 fw-600 m-0">{{ $t("leads.addresses.bad_list") }}</h2>
        <div class="filter-chip-row" role="group" :aria-label="$t('leads.addresses.filter')">
          <FilterChip v-for="status in LIST_STATUSES" :key="status" :label="emailStatusLabel(status)" :count="report?.counts?.[status] ?? null" :active="filter === status" :data-testid="`addresses-filter-${status}`" @click="setFilter(status)" />
        </div>
        <p v-if="listError" class="t-negative m-0" role="alert" data-testid="addresses-error">{{ listError }}</p>
        <p v-if="notice" class="m-0" role="status" data-testid="addresses-notice">{{ notice }}</p>
        <p v-if="loaded && !contacts.length && !listError" class="t-muted m-0" data-testid="addresses-empty">{{ $t("leads.addresses.empty") }}</p>
        <ul class="addresses__list m-0">
          <li v-for="contact in contacts" :key="contact.id" class="address" data-testid="address-row" :data-contact="contact.id">
            <div class="address__main">
              <strong class="address__email" data-testid="address-email">{{ contact.email }}</strong>
              <AddressStatus :status="contact.email_status" :reason="contact.email_status_reason" />
              <span class="t-muted fs-200">
                <router-link class="t-accent" :to="{ name: 'LeadsThread', params: { id: contact.company_id } }" data-testid="address-company">{{ companyNames[contact.company_id] || $t("leads.addresses.company", { id: contact.company_id }) }}</router-link>
                · {{ contact.email_verified_at ? $t("leads.addresses.checked", { date: formatDayTime(contact.email_verified_at) }) : $t("leads.addresses.never_checked") }}
              </span>
              <p v-if="errors[contact.id]" class="t-negative fs-200 m-0" data-testid="address-error">{{ errors[contact.id] }}</p>
            </div>
            <div class="address__tools">
              <BasicButton mutates variant="secondary" size="sm" :loading="checking === contact.id" :disabled="isFinal(contact)" data-testid="address-check" @click="check(contact)">{{ $t("leads.addresses.check_now") }}</BasicButton>
              <BasicButton variant="ghost" size="sm" data-testid="address-why" @click="why = contact">{{ $t("leads.sendcheck.open") }}</BasicButton>
              <BasicButton mutates variant="ghost" size="sm" data-testid="address-dnc" @click="dnc = contact">{{ $t("leads.dnc.open") }}</BasicButton>
            </div>
          </li>
        </ul>
        <BasicButton v-if="next" variant="secondary" class="addresses__more" :loading="loading" data-testid="addresses-more" @click="load(page + 1)">{{ $t("leads.board.more") }}</BasicButton>
      </section>
    </div>
    <SendCheckDialog :open="Boolean(why)" :contact="why" @close="why = null" />
    <DoNotContactDialog :open="Boolean(dnc)" :contact="dnc" @close="dnc = null" @done="onDnc" />
  </PageLayout>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import { t } from "@/i18n";
import { GET_Contacts, GET_VerificationReport, POST_VerifyContact } from "@/api/leads/api";
import { extractApiMessage } from "@/composables/useFormErrors";
import { emailStatusLabel } from "@/utils/leadsLabels";
import { loadCompanyName } from "@/utils/leadsCompanyNames";
import { formatDayTime } from "@/utils/leadsTime";
import { EMAIL_STATUSES } from "@/utils/leadsOutbound";
import AddressStatus from "./AddressStatus.vue";
import SendCheckDialog from "./SendCheckDialog.vue";
import DoNotContactDialog from "./DoNotContactDialog.vue";

// Leads → Settings → Address checks (Q5): how many addresses are valid / risky / invalid / unknown, the list of the bad
// ones (invalid first), and "Check now" per address. A hard bounce is final: the API never re-checks it, so the button
// is off there. The daily check runs on its own when the loop is on (the report says whether it is).
const STATUSES = EMAIL_STATUSES;
const LIST_STATUSES = ["invalid", "risky", "unknown"];
const report = ref(null);
const reportError = ref("");
const filter = ref("invalid");
const contacts = ref([]);
const page = ref(1);
const next = ref(null);
const loaded = ref(false);
const loading = ref(false);
const listError = ref("");
const notice = ref("");
const errors = reactive({});
const companyNames = reactive({});
const checking = ref(null);
const why = ref(null);
const dnc = ref(null);

const isFinal = (contact) => contact.email_status === "invalid" && contact.email_status_reason === "hard_bounce";

async function loadReport() {
  try {
    report.value = (await GET_VerificationReport()).data;
    reportError.value = "";
  } catch (err) {
    reportError.value = extractApiMessage(err, t("leads.addresses.load_error"));
  }
}

let loads = 0;
async function load(nextPage = 1) {
  const mine = ++loads;
  loading.value = true;
  listError.value = "";
  try {
    const { data } = await GET_Contacts({ email_status: filter.value, page: nextPage, page_size: 50 });
    if (mine !== loads) return;
    contacts.value = nextPage > 1 ? [...contacts.value, ...data.results] : data.results;
    next.value = data.next;
    page.value = nextPage;
    for (const contact of data.results) {
      loadCompanyName(contact.company_id).then((name) => name && (companyNames[contact.company_id] = name));
    }
  } catch (err) {
    if (mine === loads) listError.value = extractApiMessage(err, t("leads.addresses.load_error"));
  } finally {
    if (mine === loads) {
      loading.value = false;
      loaded.value = true;
    }
  }
}

function setFilter(status) {
  filter.value = status;
  notice.value = "";
  load(1);
}

// The answer is the contact with its new status; if it left this filter the row goes, the numbers are read again.
async function check(contact) {
  checking.value = contact.id;
  delete errors[contact.id];
  notice.value = "";
  try {
    const { data } = await POST_VerifyContact(contact.id);
    notice.value = t("leads.addresses.checked_now", { email: data.email, status: emailStatusLabel(data.email_status) });
    if (data.email_status === filter.value) contacts.value = contacts.value.map((row) => (row.id === data.id ? data : row));
    else contacts.value = contacts.value.filter((row) => row.id !== data.id);
    await loadReport();
  } catch (err) {
    errors[contact.id] = extractApiMessage(err, t("leads.addresses.check_failed"));
  } finally {
    checking.value = null;
  }
}

async function onDnc(done) {
  dnc.value = null;
  notice.value = t("leads.dnc.done", { target: done.email || done.domain });
  await Promise.all([load(1), loadReport()]);
}

onMounted(() => {
  loadReport();
  load(1);
});
</script>

<style lang="scss" scoped>
@import "@/assets/scss/utils/media-query";

.addresses {
  max-width: 900px;
}
.tiles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(7.5rem, 1fr));
  gap: var(--space-4);
}
.tile {
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-base);
}
.addresses__list {
  list-style: none;
  padding: 0;
}
.address {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--space-4);
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--border-subtle);
}
.address__main {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}
.address__email {
  overflow-wrap: anywhere;
}
.address__tools {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: flex-end;
  gap: var(--space-2);
}
.addresses__more {
  align-self: flex-start;
}
@include max-tablet {
  .address {
    grid-template-columns: 1fr;
  }
  .address__tools {
    justify-content: flex-start;
  }
}
</style>
