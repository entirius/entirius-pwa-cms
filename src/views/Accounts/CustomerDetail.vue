<template>
  <div class="acc-detail__wrapper p-500 fs-300 t-basic-800 h-100 ov-h">
    <Teleport to="#accounts-toolbar-left" defer>
      <BasicButton text="" icon="arrow-left" class="bg-basic-200 t-basic-600" @click="goBack" />
      <span class="fw-600">{{ toolbarTitle }}</span>
    </Teleport>

    <Loader v-if="loading" />

    <div v-else-if="customer" class="bg-basic-100 b-basic-300 br-50 h-100 ovy-auto pl-500 pt-500 pb-500 pr-500">
      <!-- Profile Card -->
      <div class="mb-400">
        <div class="section-label mb-200">{{ $t("accounts.customer_detail") }}</div>
        <div class="acc-detail__grid">
          <FormField label="Email">
            <p class="t-basic-700">{{ customer.email }}</p>
          </FormField>
          <FormField label="Name">
            <p class="t-basic-700">{{ customer.firstname }} {{ customer.lastname }}</p>
          </FormField>
          <FormField :label="$t('accounts.phone')">
            <p class="t-basic-700">{{ customer.dialling_code }} {{ customer.phone || '---' }}</p>
          </FormField>
          <FormField :label="$t('accounts.sex')">
            <p class="t-basic-700">{{ customer.sex || '---' }}</p>
          </FormField>
          <FormField :label="$t('accounts.language')">
            <p class="t-basic-700">{{ customer.language || '---' }}</p>
          </FormField>
          <FormField :label="$t('accounts.group')">
            <span v-if="customer.group" class="bg-support-100 t-support-400 fs-200 ph-100 br-50">
              {{ customer.group.name }}
            </span>
            <span v-else class="t-basic-400">---</span>
          </FormField>
          <FormField :label="$t('accounts.channel')">
            <p class="t-basic-700">{{ customer.source_channel ? customer.source_channel.label : '---' }}</p>
          </FormField>
          <FormField :label="$t('accounts.external_id')">
            <p class="t-basic-700">{{ customer.external_id || '---' }}</p>
          </FormField>
        </div>
      </div>

      <!-- Status Row -->
      <div class="flex ai-ct gap-200 mb-400">
        <StatusBadge
          :label="customer.is_active ? $t('accounts.active') : $t('accounts.inactive')"
          :variant="customer.is_active ? 'positive' : 'negative'"
        />
        <StatusBadge
          :label="customer.is_verified ? $t('accounts.verified') : $t('accounts.not_verified')"
          :variant="customer.is_verified ? 'informative' : 'neutral'"
        />
        <template v-if="customer.blacklist_channels.length">
          <span
            v-for="ch in customer.blacklist_channels"
            :key="ch.idx"
            class="bg-negative-100 t-negative-300 fs-200 ph-100 br-50"
          >
            {{ $t("accounts.blacklisted") }}: {{ ch.label }}
          </span>
        </template>
      </div>

      <!-- Session Info -->
      <div v-if="customer.last_session_ip || customer.last_session_country" class="mb-400">
        <div class="section-label mb-200">{{ $t("accounts.session_info") }}</div>
        <div class="acc-detail__grid">
          <FormField :label="$t('accounts.last_ip')">
            <p class="t-basic-700">{{ customer.last_session_ip || '---' }}</p>
          </FormField>
          <FormField :label="$t('accounts.last_country')">
            <p class="t-basic-700">{{ customer.last_session_country || '---' }}</p>
          </FormField>
        </div>
      </div>

      <!-- Extra Data -->
      <div v-if="customer.extra && Object.keys(customer.extra).length" class="mb-400">
        <div class="section-label mb-200">{{ $t("accounts.extra_data") }}</div>
        <pre class="bg-basic-200 p-200 br-50 fs-200 t-basic-600 ov-auto">{{ JSON.stringify(customer.extra, null, 2) }}</pre>
      </div>

      <!-- Addresses Table -->
      <div class="mb-400">
        <div class="section-label mb-200">{{ $t("accounts.addresses") }} ({{ customer.addresses_count }})</div>
        <DataTable
          :columns="addressColumns"
          :rows="customer.addresses"
          row-key="address_id"
          :empty-text="$t('accounts.no_addresses')"
        >
          <template #cell-name="{ row }">
            {{ row.firstname }} {{ row.lastname }}
            <span v-if="row.company" class="t-basic-500 fs-200"> ({{ row.company }})</span>
          </template>
          <template #cell-defaults="{ row }">
            <div class="flex gap-100">
              <span v-if="row.is_default_billing" class="bg-positive-100 t-positive-300 fs-100 ph-100 br-50">
                {{ $t("accounts.default_billing") }}
              </span>
              <span v-if="row.is_default_shipping" class="bg-support-100 t-support-400 fs-100 ph-100 br-50">
                {{ $t("accounts.default_shipping") }}
              </span>
            </div>
          </template>
        </DataTable>
      </div>

      <!-- Stats -->
      <div class="flex gap-400 t-basic-500 fs-200">
        <span>{{ $t("accounts.wishlist_items") }}: {{ customer.wishlist_items_count }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import { useNotifyStore } from "@/stores/notify";
import { GET_Customer } from "@/api/accounts/api";
import { extractApiMessage } from "@/composables/useFormErrors";

export default {
  name: "CustomerDetail",
  setup() {
    const notify = useNotifyStore();
    return { notify };
  },
  data() {
    return {
      customer: null,
      loading: false,
    };
  },
  computed: {
    toolbarTitle() {
      if (!this.customer) return "";
      const name = (this.customer.firstname + " " + this.customer.lastname).trim();
      return name || this.customer.email;
    },
    addressColumns() {
      return [
        { key: "name", label: "Name", width: "1fr" },
        { key: "street", label: "Street", width: "1fr" },
        { key: "city", label: "City", width: "120px" },
        { key: "postcode", label: "Postcode", width: "100px" },
        { key: "country_code", label: "Country", width: "80px" },
        { key: "defaults", label: "", width: "200px" },
      ];
    },
  },
  mounted() {
    this.fetchCustomer();
  },
  methods: {
    async fetchCustomer() {
      this.loading = true;
      try {
        const { data } = await GET_Customer(this.$route.params.uid);
        this.customer = data;
      } catch (err) {
        this.notify.spawnNotification({
          type: "negative",
          msg: extractApiMessage(err, this.$t("notifications.error")),
        });
        this.$router.push("/accounts/customers");
      } finally {
        this.loading = false;
      }
    },
    goBack() {
      this.$router.push("/accounts/customers");
    },
  },
};
</script>

<style lang="scss" scoped>
.acc-detail__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--space-200);
}

.section-label {
  text-transform: uppercase;
  font-size: var(--fs-200);
  font-weight: 600;
  color: var(--c-basic-500);
  letter-spacing: 0.05em;
}

@media only screen and (max-width: 768px) {
  .acc-detail__wrapper {
    padding: 16px !important;
  }
  .acc-detail__grid {
    grid-template-columns: 1fr;
  }
}
</style>
