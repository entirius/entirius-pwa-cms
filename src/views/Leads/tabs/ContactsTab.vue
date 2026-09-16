<template>
  <table class="ld-table" data-testid="company-contacts">
    <thead>
      <tr>
        <th>{{ $t("leads.contacts.primary") }}</th>
        <th>{{ $t("leads.contacts.name") }}</th>
        <th>{{ $t("leads.contacts.email") }}</th>
        <th>{{ $t("leads.contacts.legal_basis") }}</th>
        <th>{{ $t("leads.contacts.suppressed") }}</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="contact in company.contacts" :key="contact.id" data-testid="contact-row">
        <td><FontAwesomeIcon v-if="contact.is_primary" icon="star" :title="$t('leads.contacts.primary')" /></td>
        <td>{{ contact.first_name }} {{ contact.last_name }}</td>
        <td>{{ contact.email }}</td>
        <td>
          <span v-if="contact.legal_basis" class="ld-badge">{{ legalBasisLabel(contact.legal_basis) }}</span>
        </td>
        <td>{{ isSuppressed(contact) ? $t("leads.contacts.yes") : "" }}</td>
      </tr>
    </tbody>
  </table>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { GET_Suppressions } from "@/api/communicator/api";
import { legalBasisLabel } from "@/utils/leadsLabels";

// Read-only in v1. Suppressed = opted out, anonymised, or the email/domain on the communicator suppression list.
const props = defineProps({ company: { type: Object, required: true } });
const suppressed = ref(new Set());

function isSuppressed(contact) {
  if (contact.opt_out_at || contact.anonymised_at) return true;
  return suppressed.value.has(contact.email.toLowerCase()) || suppressed.value.has(props.company.domain);
}

onMounted(async () => {
  const { data } = await GET_Suppressions();
  suppressed.value = new Set(data.results.map((row) => row.value));
});
</script>
