<template>
  <ul class="ld-field" data-testid="template-versions-list">
    <li v-for="version in versions" :key="version.id" data-testid="template-version">
      <strong>v{{ version.number }}</strong>
      <span class="ld-muted"> {{ new Date(version.created_at).toLocaleString() }} · {{ version.model || "—" }}</span>
      <p>{{ version.subject }}</p>
    </li>
  </ul>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { GET_TemplateVersions } from "@/api/communicator/api";

const props = defineProps({ templateId: { type: [String, Number], required: true } });
const versions = ref([]);
onMounted(async () => {
  versions.value = (await GET_TemplateVersions(props.templateId)).data.results;
});
</script>

<style lang="scss" src="@/views/Leads/desktop.scss"></style>
