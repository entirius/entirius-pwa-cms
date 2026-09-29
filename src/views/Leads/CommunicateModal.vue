<template>
  <BasicModal
    :open="true"
    :title="$t('leads.company.communicate')"
    :actions="actions"
    data-testid="communicate-modal"
    @close="$emit('close')"
  >
    <div class="flex-column gap-4">
      <FormField :label="$t('leads.communicate.template')">
        <BasicSelect v-model="templateKey" :options="templateOptions" data-testid="communicate-template" />
      </FormField>
      <FormField :label="$t('leads.communicate.contact')">
        <BasicRadioGroup v-if="contacts.length" v-model="contactId" :options="contactOptions" name="communicate-contact" />
        <p v-else class="t-muted m-0">{{ $t("leads.communicate.no_contacts") }}</p>
      </FormField>
      <p v-if="error" class="t-negative m-0" role="alert" data-testid="communicate-error">{{ error }}</p>
    </div>
  </BasicModal>
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
const templateOptions = computed(() =>
  templates.value.map((tpl) => ({ value: tpl.key, label: `${tpl.key} (${tpl.language})` }))
);
const contactOptions = computed(() =>
  contacts.value.map((c) => ({
    value: c.id,
    label: `${c.first_name} ${c.last_name} <${c.email}>`,
    testid: "communicate-contact",
  }))
);
const actions = computed(() => [
  { key: "cancel", label: t("leads.review.cancel"), role: "secondary", onClick: () => emit("close") },
  {
    key: "submit",
    label: t("leads.communicate.submit"),
    role: "primary",
    disabled: !templateKey.value || !contactId.value,
    testid: "communicate-submit",
    onClick: submit,
  },
]);

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
