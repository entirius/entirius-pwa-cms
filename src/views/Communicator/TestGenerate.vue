<template>
  <div class="ld-field" data-testid="test-generate">
    <input
      v-model="search"
      class="ld-input"
      type="search"
      :placeholder="$t('communicator.test.search')"
      data-testid="test-generate-search"
      @input="find"
    />
    <button
      v-for="company in companies"
      :key="company.id"
      class="ld-btn"
      data-testid="test-generate-company"
      @click="generate(company)"
    >
      {{ company.domain }}
    </button>
    <p v-if="busy" class="ld-muted">{{ $t("communicator.test.generating") }}</p>
    <p v-if="error" class="ld-error" data-testid="test-generate-error">{{ error }}</p>
    <article v-if="preview" data-testid="test-generate-preview">
      <p class="ld-muted">{{ $t("communicator.test.not_saved") }}</p>
      <h4 data-testid="test-generate-subject">{{ preview.subject }}</h4>
      <p v-for="(paragraph, i) in paragraphs" :key="i">{{ paragraph }}</p>
    </article>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { t } from "@/i18n";
import { GET_Companies, GET_Company } from "@/api/leads/api";
import { POST_TestGenerate } from "@/api/communicator/api";
import { extractApiMessage } from "@/composables/useFormErrors";

// Draft preview for one company: nothing is saved, closing the drawer discards it.
const props = defineProps({ templateId: { type: [String, Number], required: true } });
const search = ref("");
const companies = ref([]);
const preview = ref(null);
const busy = ref(false);
const error = ref("");

const paragraphs = computed(() => (preview.value?.body_text || "").split(/\n\s*\n/));

async function find() {
  if (search.value.trim().length < 2) return;
  companies.value = (await GET_Companies({ search: search.value.trim(), page_size: 10 })).data.results;
}

function renderContext(company) {
  const contact = company.contacts.find((c) => c.is_primary) || company.contacts[0] || {};
  const { name, domain, platform, industry, hooks } = company;
  return { company_name: name, domain, platform, industry, hooks, first_name: contact.first_name || "" };
}

async function generate(company) {
  error.value = "";
  busy.value = true;
  try {
    const detail = (await GET_Company(company.id)).data;
    preview.value = (await POST_TestGenerate(props.templateId, renderContext(detail))).data;
  } catch (err) {
    error.value = extractApiMessage(err, t("leads.review.error"));
  } finally {
    busy.value = false;
  }
}
</script>

<style lang="scss" src="@/views/Leads/desktop.scss"></style>
