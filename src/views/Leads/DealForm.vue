<template>
  <!-- The fields of a deal, shared by the Open a deal dialog and the deal card's Details edit -->
  <div class="form-grid">
    <FormField class="form-grid__wide" :label="$t('leads.deal.title_field')" required :error="errors.title || ''">
      <BasicInput v-model="form.title" :maxlength="255" :data-testid="titleTestid" />
    </FormField>
    <FormField v-if="contacts.length" :label="$t('leads.deal.contact')" :error="errors.contact_id || ''">
      <BasicSelect v-model="form.contactId" :options="contacts" clearable data-testid="deal-contact" />
    </FormField>
    <FormField :label="$t('leads.deal.value_one_off')" :error="errors.value_one_off || ''">
      <BasicInput v-model="form.valueOneOff" format="money" :maxlength="15" data-testid="deal-value-one-off" />
    </FormField>
    <FormField :label="$t('leads.deal.currency')" :error="errors.currency || ''">
      <BasicSelect v-model="form.currency" :options="currencies" searchable clearable data-testid="deal-currency" />
    </FormField>
    <FormField :label="$t('leads.deal.value_recurring')" :error="errors.value_recurring || ''">
      <BasicInput v-model="form.valueRecurring" format="money" :maxlength="15" data-testid="deal-value-recurring" />
    </FormField>
    <FormField :label="$t('leads.deal.period')">
      <BasicRadioGroup v-model="form.period" :options="periods" name="deal-period" data-testid="deal-period" />
    </FormField>
    <FormField :label="$t('leads.deal.expected_close')" :error="errors.expected_close_date || ''">
      <BasicDatePicker v-model="form.expectedClose" data-testid="deal-expected-close" />
    </FormField>
    <slot />
  </div>
</template>

<script setup>
import { t } from "@/i18n";

// `form` (reactive, edited in place) = { title, contactId, expectedClose, valueOneOff, currency, valueRecurring, period };
// `errors` = { api field: message }.
defineProps({
  form: { type: Object, required: true },
  contacts: { type: Array, default: () => [] },
  currencies: { type: Array, default: () => [] },
  errors: { type: Object, default: () => ({}) },
  titleTestid: { type: String, default: "deal-title" },
});
const periods = [
  { value: "month", label: t("leads.deal.period_month") },
  { value: "year", label: t("leads.deal.period_year") },
];
</script>
