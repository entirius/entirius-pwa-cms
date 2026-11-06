<template>
  <PageLayout data-testid="communicator-mailbox">
    <template #header>
      <PageHeader :title="$t('communicator.mailbox.title')" :back="{ name: 'LeadsSettings' }" />
    </template>
    <BasicCard :title="$t('communicator.mailbox.title')" class="mailbox">
      <form class="flex-column gap-4" @submit.prevent="save">
        <p class="t-muted m-0">{{ $t("communicator.mailbox.help") }}</p>
        <p v-if="!configured" class="t-muted m-0" data-testid="mailbox-empty">{{ $t("communicator.mailbox.empty") }}</p>
        <FormField :label="$t('communicator.mailbox.host')" required :error="errors.imap_host || ''">
          <BasicInput v-model="form.imap_host" :maxlength="255" data-testid="mailbox-host" />
        </FormField>
        <FormField :label="$t('communicator.mailbox.port')" required :error="errors.imap_port || ''">
          <BasicInput v-model="form.imap_port" type="number" data-testid="mailbox-port" />
        </FormField>
        <BasicSwitch v-model="form.imap_use_ssl" :label="$t('communicator.mailbox.ssl')" data-testid="mailbox-ssl" />
        <FormField :label="$t('communicator.mailbox.user')" required :error="errors.imap_user || ''">
          <BasicInput v-model="form.imap_user" :maxlength="255" data-testid="mailbox-user" />
        </FormField>
        <FormField :label="$t('communicator.mailbox.password')" :hint="passwordHint">
          <BasicInput v-model="password" type="password" :maxlength="1024" data-testid="mailbox-password" />
        </FormField>
        <FormField :label="$t('communicator.mailbox.folder')" required :error="errors.folder || ''">
          <BasicInput v-model="form.folder" :maxlength="64" data-testid="mailbox-folder" />
        </FormField>
        <BasicSwitch v-model="form.is_active" :label="$t('communicator.mailbox.active')" data-testid="mailbox-active" />
        <p v-if="configured" class="t-muted m-0" data-testid="mailbox-polled">
          {{ lastPolledAt ? $t("communicator.mailbox.last_polled", { at: lastPolledAt }) : $t("communicator.mailbox.never_polled") }}
        </p>
        <p v-if="errors.form" class="t-negative m-0" role="alert" data-testid="mailbox-error">{{ errors.form }}</p>
        <div class="flex jc-fe">
          <BasicButton variant="primary" type="submit" data-testid="mailbox-save">{{ $t("communicator.template.save") }}</BasicButton>
        </div>
      </form>
    </BasicCard>
  </PageLayout>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { t } from "@/i18n";
import { GET_Mailbox, PUT_Mailbox } from "@/api/communicator/api";
import { extractApiMessage } from "@/composables/useFormErrors";
import { useNotifyStore } from "@/stores/notify";

// Leads → Settings → IMAP mailbox (S5): the one mailbox the beat polls for replies. The API answers 404 until it is
// configured, so the form starts empty with the defaults; the password is write-only — empty keeps the stored one.
const notify = useNotifyStore();
const blank = () => ({ imap_host: "", imap_port: 993, imap_use_ssl: true, imap_user: "", folder: "INBOX", is_active: true });
const form = reactive(blank());
const password = ref("");
const hasPassword = ref(false);
const configured = ref(false);
const lastPolledAt = ref("");
const errors = reactive({});
const passwordHint = computed(() => (hasPassword.value ? t("communicator.mailbox.password_kept") : ""));

function apply(data) {
  Object.assign(form, {
    imap_host: data.imap_host,
    imap_port: data.imap_port,
    imap_use_ssl: data.imap_use_ssl,
    imap_user: data.imap_user,
    folder: data.folder,
    is_active: data.is_active,
  });
  hasPassword.value = data.has_password;
  lastPolledAt.value = data.last_polled_at || "";
  configured.value = true;
  password.value = "";
}

async function save() {
  for (const key of Object.keys(errors)) delete errors[key];
  const port = Number(form.imap_port);
  if (!form.imap_host.trim()) errors.imap_host = t("communicator.mailbox.required");
  if (!form.imap_user.trim()) errors.imap_user = t("communicator.mailbox.required");
  if (!form.folder.trim()) errors.folder = t("communicator.mailbox.required");
  if (!Number.isInteger(port) || port < 1 || port > 65535) errors.imap_port = t("communicator.mailbox.port_invalid");
  if (Object.keys(errors).length) return;
  const body = { ...form, imap_host: form.imap_host.trim(), imap_user: form.imap_user.trim(), folder: form.folder.trim(), imap_port: port };
  if (password.value) body.imap_password = password.value; // omitted keeps the stored one
  try {
    apply((await PUT_Mailbox(body)).data);
    notify.spawnNotification({ msg: t("communicator.template.saved") });
  } catch (err) {
    errors.form = extractApiMessage(err, t("leads.review.error"));
  }
}

onMounted(async () => {
  try {
    apply((await GET_Mailbox()).data);
  } catch (err) {
    if ((err?.httpStatus ?? err?.response?.status) !== 404) errors.form = extractApiMessage(err, t("leads.review.error"));
  }
});
</script>

<style scoped>
.mailbox {
  max-width: 720px;
}
</style>
