<template>
  <div class="ld-page" data-testid="communicator-sequences">
    <h2 class="ld-title">{{ $t("communicator.sequences.title") }}</h2>
    <section v-for="sequence in sequences" :key="sequence.id" class="ld-field" data-testid="sequence">
      <h3>{{ sequence.key }} <span v-if="!sequence.is_active" class="ld-badge">{{ $t("communicator.sequences.inactive") }}</span></h3>
      <table class="ld-table">
        <thead>
          <tr><th>#</th><th>{{ $t("communicator.sequences.days") }}</th><th>{{ $t("communicator.template.key") }}</th></tr>
        </thead>
        <tbody>
          <tr v-for="step in sequence.steps" :key="step.id">
            <td>{{ step.number }}</td><td>{{ step.days_after_previous }}</td><td>{{ step.template_key }}</td>
          </tr>
        </tbody>
      </table>
      <h4>{{ $t("communicator.sequences.texts") }}</h4>
      <p class="ld-muted" data-testid="pool-random-hint">{{ $t("communicator.sequences.texts_random") }}</p>
      <TextPool :sequence-id="sequence.id" :texts="texts[sequence.id] || []" @changed="load" />
      <form class="ld-row" @submit.prevent="addText(sequence.id)">
        <input v-model="newText[sequence.id]" class="ld-input" required maxlength="4000" :placeholder="$t('communicator.sequences.new_text')" />
        <button class="ld-btn" type="submit">{{ $t("communicator.sequences.add_text") }}</button>
      </form>
    </section>
    <form class="ld-field" data-testid="sequence-add" @submit.prevent="addSequence">
      <h3>{{ $t("communicator.sequences.add") }}</h3>
      <input v-model="draft.key" class="ld-input" required pattern="[-a-zA-Z0-9_]+" :placeholder="$t('communicator.template.key')" />
      <div v-for="(step, i) in draft.steps" :key="i" class="ld-row">
        <span>#{{ i + 1 }}</span>
        <input v-model.number="step.days_after_previous" class="ld-input" type="number" min="0" max="365" required />
        <input v-model="step.template_key" class="ld-input" required :placeholder="$t('communicator.template.key')" />
      </div>
      <div class="ld-row">
        <button class="ld-btn" type="button" @click="draft.steps.push(emptyStep())">{{ $t("communicator.sequences.add_step") }}</button>
        <button class="ld-btn ld-btn--primary" type="submit">{{ $t("communicator.sequences.save") }}</button>
      </div>
    </form>
    <p v-if="error" class="ld-error">{{ error }}</p>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import { t } from "@/i18n";
import { GET_SequenceTexts, GET_Sequences, POST_Sequence, POST_SequenceText } from "@/api/communicator/api";
import { extractApiMessage } from "@/composables/useFormErrors";
import TextPool from "./TextPool.vue";

// Sequences: steps (create only — the API has no step edit) and the follow-up text pool (add, edit, remove).
const sequences = ref([]);
const texts = reactive({});
const newText = reactive({});
const error = ref("");
const emptyStep = () => ({ days_after_previous: 3, template_key: "" });
const draft = reactive({ key: "", steps: [emptyStep()] });

async function load() {
  sequences.value = (await GET_Sequences()).data.results;
  const pools = await Promise.all(sequences.value.map((s) => GET_SequenceTexts(s.id)));
  sequences.value.forEach((s, i) => (texts[s.id] = pools[i].data.results));
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

async function addText(id) {
  if (await attempt(() => POST_SequenceText(id, { body: newText[id] }))) newText[id] = "";
}

async function addSequence() {
  const steps = draft.steps.map((step, i) => ({ ...step, number: i + 1 }));
  if (await attempt(() => POST_Sequence({ key: draft.key, steps }))) Object.assign(draft, { key: "", steps: [emptyStep()] });
}

onMounted(load);
</script>
