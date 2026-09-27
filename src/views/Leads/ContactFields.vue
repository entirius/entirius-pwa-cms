<template>
  <div class="contact-fields">
    <label class="ld-field">
      <span>{{ $t("leads.contacts.email") }}</span>
      <input
        v-model.trim="form.email"
        class="ld-input"
        type="email"
        inputmode="email"
        autocomplete="off"
        :readonly="emailLocked"
        :data-testid="`${testid}-email`"
      />
      <span
        v-if="errorOf('email')"
        class="ld-error"
        :data-testid="`${testid}-email-error`"
        >{{ errorOf("email") }}</span
      >
    </label>
    <div class="contact-fields__pair">
      <label class="ld-field">
        <span>{{ $t("leads.add.first_name") }}</span>
        <input
          v-model.trim="form.first_name"
          class="ld-input"
          autocomplete="off"
          :data-testid="`${testid}-first-name`"
        />
      </label>
      <label class="ld-field">
        <span>{{ $t("leads.add.last_name") }}</span>
        <input
          v-model.trim="form.last_name"
          class="ld-input"
          autocomplete="off"
          :data-testid="`${testid}-last-name`"
        />
      </label>
    </div>
    <div v-if="full" class="contact-fields__pair">
      <label class="ld-field">
        <span>{{ $t("leads.contacts.job_title") }}</span>
        <input
          v-model.trim="form.job_title"
          class="ld-input"
          autocomplete="off"
          :data-testid="`${testid}-job-title`"
        />
      </label>
      <label class="ld-field">
        <span>{{ $t("leads.contacts.phone") }}</span>
        <input
          v-model.trim="form.phone"
          class="ld-input"
          type="tel"
          autocomplete="off"
          :data-testid="`${testid}-phone`"
        />
        <span v-if="errorOf('phone')" class="ld-error">{{
          errorOf("phone")
        }}</span>
      </label>
      <label class="ld-field">
        <span>{{ $t("leads.contacts.language") }}</span>
        <input
          v-model.trim="form.language"
          class="ld-input"
          maxlength="2"
          autocomplete="off"
          placeholder="pl"
          :data-testid="`${testid}-language`"
        />
        <span
          v-if="errorOf('language')"
          class="ld-error"
          :data-testid="`${testid}-language-error`"
          >{{ errorOf("language") }}</span
        >
      </label>
    </div>
    <label class="ld-field">
      <span>{{ $t("leads.contacts.legal_basis") }}</span>
      <select
        v-model="form.legal_basis"
        class="ld-input"
        :data-testid="`${testid}-basis`"
      >
        <option value="">{{ $t("leads.add.basis_none") }}</option>
        <option v-for="basis in BASES" :key="basis" :value="basis">
          {{ legalBasisLabel(basis) }}
        </option>
      </select>
      <span class="ld-muted">{{ $t("leads.add.basis_hint") }}</span>
    </label>
    <label
      v-if="form.legal_basis === 'consent' && !consentRecorded"
      class="ld-field"
    >
      <span class="required">{{ $t("leads.add.consent_ref") }}</span>
      <input
        v-model.trim="form.consent_ref"
        class="ld-input"
        :data-testid="`${testid}-consent-ref`"
      />
      <span v-if="errorOf('consent_ref')" class="ld-error">{{
        errorOf("consent_ref")
      }}</span>
    </label>
    <label v-if="full" class="contact-fields__check">
      <input
        v-model="form.is_primary"
        type="checkbox"
        :data-testid="`${testid}-primary`"
      />
      {{ $t("leads.contacts.primary") }}
    </label>
  </div>
</template>

<script setup>
import { legalBasisLabel } from "@/utils/leadsLabels";

// The contact part of every contact form (add lead, Contacts tab): one set of fields and one legal-basis rule.
// Legal basis stays optional as in the import — the outreach gate refuses a contact without one; `consent` asks
// where it was given, which the API requires. `form` is the parent's reactive object, edited in place.
defineProps({
  form: { type: Object, required: true },
  errorOf: { type: Function, required: true }, // field name → message ("" when none)
  testid: { type: String, required: true },
  full: { type: Boolean, default: false }, // + job title, phone, language, primary
  emailLocked: { type: Boolean, default: false }, // the email is set once, then immutable
  consentRecorded: { type: Boolean, default: false }, // the saved basis is already consent — no new reference asked
});
const BASES = ["legitimate_interest", "consent", "contract"];
</script>

<style scoped>
.contact-fields {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}
.contact-fields__pair {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: var(--space-5);
}
.contact-fields .ld-input {
  min-height: 44px;
  width: 100%;
  box-sizing: border-box;
}
.contact-fields .ld-input[readonly] {
  background: var(--surface-raised);
}
.contact-fields__check {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  min-height: 44px;
}
</style>
