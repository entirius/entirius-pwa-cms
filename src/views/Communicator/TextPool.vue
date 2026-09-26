<template>
  <div class="pool" data-testid="text-pool">
    <ul class="pool__list">
      <li
        v-for="text in texts"
        :key="text.id"
        class="pool__item"
        :class="{ 'pool__item--inactive': !text.is_active }"
        :data-text="text.id"
        data-testid="pool-text"
      >
        <form v-if="editing === text.id" class="pool__edit" @submit.prevent="saveEdit(text)">
          <textarea v-model="draft" class="ld-input" rows="3" required maxlength="4000" data-testid="pool-text-input"></textarea>
          <div class="ld-row">
            <button class="ld-btn ld-btn--primary" type="submit" :disabled="!draft.trim()" data-testid="pool-text-save">
              {{ $t("communicator.pool.save") }}
            </button>
            <button class="ld-btn" type="button" data-testid="pool-text-cancel" @click="editing = null">{{ $t("common.cancel") }}</button>
          </div>
        </form>
        <template v-else>
          <!-- the text itself is the edit control: one tap, no hover -->
          <button class="pool__body" type="button" :disabled="!text.is_active" data-testid="pool-text-body" @click="startEdit(text)">
            {{ text.body }}
          </button>
          <span v-if="!text.is_active" class="ld-badge">{{ $t("communicator.pool.inactive") }}</span>
          <button v-if="text.is_active" class="ld-btn ld-btn--danger" data-testid="pool-text-remove" @click="confirming = text">
            {{ $t("communicator.pool.remove") }}
          </button>
          <button v-else class="ld-btn" data-testid="pool-text-restore" @click="restore(text)">{{ $t("communicator.pool.restore") }}</button>
        </template>
      </li>
    </ul>
    <p v-if="status" class="ld-muted" role="status" data-testid="pool-status">{{ status }}</p>
    <p v-if="error" class="ld-error" data-testid="pool-error">{{ error }}</p>
    <ConfirmSheet
      v-if="confirming"
      :title="$t('communicator.pool.remove_title')"
      :message="confirming.body"
      :confirm-label="$t('communicator.pool.remove')"
      :cancel-label="$t('common.cancel')"
      @confirm="remove(confirming)"
      @cancel="confirming = null"
    />
  </div>
</template>

<script setup>
import { ref } from "vue";
import { t } from "@/i18n";
import { DELETE_SequenceText, PATCH_SequenceText } from "@/api/communicator/api";
import { extractApiMessage } from "@/composables/useFormErrors";
import ConfirmSheet from "@/views/Leads/ConfirmSheet.vue";

// The follow-up text pool of one sequence (UX-005): tap a text to edit it (future follow-ups only — sent mail keeps
// its body), remove with a confirmation. A text a thread already got is deactivated, not deleted (its usage history
// keeps a thread from getting it twice): it stays listed, dimmed, with Restore.
const props = defineProps({
  sequenceId: { type: Number, required: true },
  texts: { type: Array, required: true },
});
const emit = defineEmits(["changed"]);

const editing = ref(null);
const draft = ref("");
const confirming = ref(null);
const status = ref("");
const error = ref("");

function startEdit(text) {
  editing.value = text.id;
  draft.value = text.body;
}

async function run(call, done) {
  error.value = "";
  status.value = "";
  try {
    const response = await call();
    status.value = done(response);
    emit("changed");
  } catch (err) {
    error.value = extractApiMessage(err, t("leads.review.error"));
  }
}

const saveEdit = (text) =>
  run(
    () => PATCH_SequenceText(props.sequenceId, text.id, { body: draft.value }),
    () => {
      editing.value = null;
      return t("communicator.pool.saved");
    }
  );

const restore = (text) =>
  run(() => PATCH_SequenceText(props.sequenceId, text.id, { is_active: true }), () => t("communicator.pool.restored"));

// 204 = the text was never used and is gone; 200 = it was used, so the API deactivated it instead.
function remove(text) {
  confirming.value = null;
  return run(
    () => DELETE_SequenceText(props.sequenceId, text.id),
    (response) => t(response?.status === 204 ? "communicator.pool.removed" : "communicator.pool.deactivated")
  );
}
</script>

<style src="@/views/Leads/desktop.css"></style>
<style scoped>
.pool__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-200);
  margin: 0;
  padding: 0;
  list-style: none;
}
.pool__item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-200);
}
.pool__item--inactive .pool__body {
  opacity: 0.5;
}
.pool__body {
  flex: 1 1 16rem;
  min-height: 44px;
  padding: var(--space-100) var(--space-200);
  border: 1px solid transparent;
  border-radius: 6px;
  background: none;
  color: var(--text-body);
  font: inherit;
  text-align: left;
  cursor: text;
}
.pool__body:not(:disabled):focus-visible,
.pool__body:not(:disabled):active {
  border-color: var(--border-subtle);
}
.pool__edit {
  display: flex;
  flex: 1 1 100%;
  flex-direction: column;
  gap: var(--space-200);
}
.pool__item .ld-btn {
  min-height: 44px;
}
</style>
