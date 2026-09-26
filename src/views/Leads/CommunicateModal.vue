<template>
  <div class="cm" role="dialog" :aria-label="$t('leads.company.communicate')" data-testid="communicate-modal">
    <div class="cm__sheet ld-field">
      <p class="ld-title">{{ $t("leads.company.communicate") }}</p>
      <label class="ld-field">
        {{ $t("leads.communicate.template") }}
        <select v-model="templateKey" class="ld-input" data-testid="communicate-template">
          <option v-for="tpl in templates" :key="tpl.id" :value="tpl.key">{{ tpl.key }} ({{ tpl.language }})</option>
        </select>
      </label>
      <fieldset class="ld-field">
        <legend>{{ $t("leads.communicate.contact") }}</legend>
        <label v-for="contact in contacts" :key="contact.id">
          <input v-model="contactId" type="radio" :value="contact.id" data-testid="communicate-contact" />
          {{ contact.first_name }} {{ contact.last_name }} &lt;{{ contact.email }}&gt;
        </label>
        <p v-if="!contacts.length" class="ld-muted">{{ $t("leads.communicate.no_contacts") }}</p>
      </fieldset>
      <p v-if="error" class="ld-error" data-testid="communicate-error">{{ error }}</p>
      <div class="ld-row">
        <button class="ld-btn" @click="$emit('close')">{{ $t("leads.review.cancel") }}</button>
        <button
          class="ld-btn ld-btn--primary"
          :disabled="!templateKey || !contactId"
          data-testid="communicate-submit"
          @click="submit"
        >
          {{ $t("leads.communicate.submit") }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { t } from "@/i18n";
import { POST_Communicate } from "@/api/leads/api";
import { GET_Templates } from "@/api/communicator/api";
import { extractApiMessage } from "@/composables/useFormErrors";
import { useNotifyStore } from "@/stores/notify";

// Manual outreach: an active template + a contact with an email → a draft in the review queue.
const props = defineProps({ company: { type: Object, required: true } });
const emit = defineEmits(["close"]);
const notify = useNotifyStore();
const templates = ref([]);
const templateKey = ref("");
const contactId = ref(null);
const error = ref("");

const contacts = computed(() => props.company.contacts.filter((c) => c.email && !c.opt_out_at && !c.anonymised_at));

async function submit() {
  error.value = "";
  try {
    await POST_Communicate(props.company.id, { template_key: templateKey.value, contact_id: contactId.value });
    notify.spawnNotification({ msg: t("leads.communicate.done") });
    emit("close");
  } catch (err) {
    error.value = extractApiMessage(err, t("leads.review.error"));
  }
}

onMounted(async () => {
  const { data } = await GET_Templates();
  templates.value = data.results.filter((tpl) => tpl.is_active);
  contactId.value = contacts.value.find((c) => c.is_primary)?.id ?? null;
});
</script>

<style scoped>
.cm {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(0 0 0 / 35%);
}
.cm__sheet {
  width: min(520px, 100%);
  padding: var(--space-8);
  border-radius: var(--radius-lg);
  background: var(--surface-base);
}
</style>
