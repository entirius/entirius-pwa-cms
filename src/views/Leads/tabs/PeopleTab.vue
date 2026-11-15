<template>
  <section class="flex-column gap-5" data-testid="company-people">
    <p class="t-secondary m-0">{{ $t("leads.prospecting.company_help") }}</p>
    <CandidateList :subject-ref="subjectRef" @count="$emit('count', $event)" @changed="$emit('changed')" />
  </section>
</template>

<script setup>
import { computed } from "vue";
import { companySubjectRef } from "@/utils/subjectRef";
import CandidateList from "../prospecting/CandidateList.vue";

// U3: the company card's People tab — the candidates found for this company, accepted or rejected right here.
const props = defineProps({ company: { type: Object, required: true } });
defineEmits(["count", "changed"]);
const subjectRef = computed(() => companySubjectRef(props.company.id));
</script>
