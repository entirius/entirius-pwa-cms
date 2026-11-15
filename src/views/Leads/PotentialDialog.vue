<template>
  <!-- U2: the salesperson's colour — three colours, a required reason, an optional come-back day; "Back to automatic" -->
  <BasicModal
    :open="Boolean(company)"
    :title="
      $t('leads.potential.dialog_title', {
        name: company?.name || company?.domain || '',
      })
    "
    size="sm"
    :actions="actions"
    data-testid="potential-dialog"
    @update:open="$emit('close')"
  >
    <div class="flex-column gap-4">
      <p class="m-0 t-secondary" data-testid="potential-dialog-now">
        {{ now }}
      </p>
      <FormField :label="$t('leads.potential.colour_label')" required>
        <BasicRadioGroup
          v-model="colour"
          :options="colourOptions"
          layout="list"
          data-testid="potential-colour"
        />
      </FormField>
      <FormField
        :label="$t('leads.potential.reason_label')"
        required
        :error="error"
      >
        <BasicInput
          v-model="comment"
          :maxlength="255"
          :placeholder="$t('leads.potential.reason_placeholder')"
          data-testid="potential-comment"
        />
      </FormField>
      <FormField :label="$t('leads.potential.return_label')">
        <BasicDatePicker v-model="returnOn" data-testid="potential-return-on" />
      </FormField>
    </div>
  </BasicModal>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { t } from "@/i18n";
import {
  DELETE_CompanyPotential,
  POST_CompanyPotential,
} from "@/api/leads/api";
import { extractApiMessage } from "@/composables/useFormErrors";
import {
  POTENTIAL_COLOURS,
  potentialLabel,
  potentialReason,
} from "./potential";

// `company` while open; Save and "Back to automatic" emit `saved` with the company the API answers.
const props = defineProps({ company: { type: Object, default: null } });
const emit = defineEmits(["saved", "close"]);
const colour = ref("green");
const comment = ref("");
const returnOn = ref("");
const error = ref("");
const saving = ref(false);

const colourOptions = computed(() =>
  POTENTIAL_COLOURS.map((value) => ({
    value,
    label: potentialLabel(value),
    testid: `potential-colour-${value}`,
  }))
);
const now = computed(() =>
  props.company
    ? `${potentialLabel(props.company.potential)} — ${potentialReason(
        props.company
      )}`
    : ""
);
const actions = computed(() =>
  [
    {
      key: "cancel",
      label: t("common.cancel"),
      role: "secondary",
      testid: "potential-cancel",
      onClick: () => emit("close"),
    },
    props.company?.potential_manual && {
      key: "auto",
      label: t("leads.potential.back_to_auto"),
      role: "secondary",
      mutates: true,
      testid: "potential-auto",
      onClick: reset,
    },
    {
      key: "save",
      label: t("common.save"),
      role: "primary",
      mutates: true,
      disabled: !comment.value.trim(),
      loading: saving.value,
      testid: "potential-save",
      onClick: save,
    },
  ].filter(Boolean)
);

watch(
  () => props.company,
  (company) => {
    if (!company) return;
    colour.value = company.potential || "green";
    comment.value = company.potential_manual ? company.potential_comment : "";
    returnOn.value = company.potential_manual
      ? company.potential_return_on || ""
      : "";
    error.value = "";
  },
  { immediate: true }
);

async function send(request) {
  saving.value = true;
  try {
    emit("saved", (await request()).data);
  } catch (err) {
    error.value = extractApiMessage(err, t("leads.potential.save_error"));
  } finally {
    saving.value = false;
  }
}

function save() {
  const text = comment.value.trim();
  error.value = text ? "" : t("leads.potential.reason_required");
  if (!text) return;
  const body = {
    colour: colour.value,
    comment: text,
    ...(returnOn.value ? { return_on: returnOn.value } : {}),
  };
  return send(() => POST_CompanyPotential(props.company.id, body));
}

const reset = () => send(() => DELETE_CompanyPotential(props.company.id));
</script>
