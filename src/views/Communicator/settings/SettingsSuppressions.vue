<template>
  <section class="ld-field" data-testid="settings-suppressions">
    <h3>{{ $t("communicator.suppressions.title") }}</h3>
    <form class="ld-row" @submit.prevent="add">
      <select v-model="draft.kind" class="ld-input"><option value="email">email</option><option value="domain">domain</option></select>
      <input v-model="draft.value" class="ld-input" required maxlength="254" :placeholder="$t('communicator.suppressions.value')" />
      <input v-model="draft.reason" class="ld-input" maxlength="255" :placeholder="$t('communicator.suppressions.reason')" />
      <button class="ld-btn ld-btn--primary" type="submit">{{ $t("communicator.suppressions.add") }}</button>
    </form>
    <p v-if="error" class="ld-error">{{ error }}</p>
    <table class="table-basic ld-table">
      <tbody>
        <tr v-for="row in rows" :key="row.id" data-testid="suppression-row">
          <td>{{ row.kind }}</td>
          <td>{{ row.value }}</td>
          <td>{{ row.reason }}</td>
          <td>
            <button
              v-if="row.kind !== 'email_token'"
              class="ld-btn ld-btn--danger ld-btn--icon"
              :aria-label="$t('leads.stages.delete')"
              :title="$t('leads.stages.delete')"
              @click="remove(row.id)"
            >
              <FontAwesomeIcon :icon="$icons.delete" />
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import { t } from "@/i18n";
import { DELETE_Suppression, GET_Suppressions, POST_Suppression } from "@/api/communicator/api";
import { extractApiMessage } from "@/composables/useFormErrors";

// Suppression list; global email_token rows (erased addresses) are listed but never removable here.
const rows = ref([]);
const error = ref("");
const draft = reactive({ kind: "email", value: "", reason: "" });

async function load() {
  rows.value = (await GET_Suppressions()).data.results;
}

async function attempt(call) {
  error.value = "";
  try {
    await call();
    await load();
    return true;
  } catch (err) {
    error.value = extractApiMessage(err, t("leads.review.error"));
    return false;
  }
}

async function add() {
  if (await attempt(() => POST_Suppression({ ...draft }))) Object.assign(draft, { value: "", reason: "" });
}

const remove = (id) => attempt(() => DELETE_Suppression(id));

onMounted(load);
</script>

<style lang="scss" src="@/views/Leads/desktop.scss"></style>
