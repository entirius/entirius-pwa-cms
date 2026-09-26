<template>
  <div class="ld-page" data-testid="communicator-templates">
    <h2 class="ld-title">{{ $t("communicator.templates.title") }}</h2>
    <table class="ld-table">
      <thead>
        <tr>
          <th>{{ $t("communicator.template.key") }}</th>
          <th>{{ $t("communicator.template.kind") }}</th>
          <th>{{ $t("communicator.template.language") }}</th>
          <th>{{ $t("communicator.template.audience") }}</th>
          <th>{{ $t("communicator.template.version") }}</th>
          <th>{{ $t("communicator.template.is_active") }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="tpl in templates" :key="tpl.id" data-testid="template-row">
          <td>
            <router-link :to="{ name: 'CommunicatorTemplateEdit', params: { id: tpl.id } }">{{ tpl.key }}</router-link>
          </td>
          <td>{{ tpl.kind }}</td>
          <td>{{ tpl.language }}</td>
          <td data-testid="template-audience">{{ tpl.audience ? leadTypes.label(tpl.audience) : $t("communicator.template.audience_all") }}</td>
          <td>{{ tpl.current_version_id ?? "—" }}</td>
          <td>{{ tpl.is_active ? "✓" : "" }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { GET_Templates } from "@/api/communicator/api";
import { useLeadTypesStore } from "@/stores/leadTypes";
import { useMuninStore } from "@/stores/munin";

const templates = ref([]);
const leadTypes = useLeadTypesStore();
onMounted(async () => {
  if (useMuninStore().isModuleEnabled("leads")) leadTypes.load();
  templates.value = (await GET_Templates()).data.results;
});
</script>

<style src="@/views/Leads/desktop.css"></style>
