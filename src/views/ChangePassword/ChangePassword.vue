<template>
  <BasicCard
    class="auth-card fs-300 t-body shadow-down"
  >
    <!-- Success state -->
    <template v-if="success">
      <p class="auth-card__title fs-700 fw-600 txt-center mb-1">
        {{ $t("user.change_password") }}
      </p>
      <div class="auth-card__banner auth-card__banner--success mb-10">
        <p class="fs-300 fw-500">{{ $t("user.password_changed_message") }}</p>
      </div>
      <BasicButton
        @click="goHome"
        variant="primary"
        class="jc-ct w-100 rounded"
      >
        {{ $t('user.back_to_home') }}
      </BasicButton>
    </template>

    <!-- Form -->
    <template v-else>
      <p class="auth-card__title fs-700 fw-600 txt-center mb-1">
        {{ $t("user.change_password_title") }}
      </p>
      <p class="fs-300 t-secondary txt-center mb-12">
        {{ $t("user.change_password_subtitle") }}
      </p>
      <form @submit.prevent="handleSubmit">
        <FormField :label="$t('user.old_password')" class="mb-10">
          <div class="auth-card__pw-field">
            <BasicInput
              v-model="oldPassword"
              class="bg-raised lh-base-elem"
              :type="oldPwVisible ? 'text' : 'password'"
            />
            <span class="auth-card__pw-toggle">
              <IconButton
                :icon="oldPwVisible ? 'hide' : 'preview'"
                :label="$t('login.show_password')"
                :pressed="oldPwVisible"
                size="sm"
                @click="oldPwVisible = !oldPwVisible"
              />
            </span>
          </div>
        </FormField>
        <FormField :label="$t('user.new_password')" class="mb-10">
          <div class="auth-card__pw-field">
            <BasicInput
              v-model="newPassword"
              class="bg-raised lh-base-elem"
              :type="newPwVisible ? 'text' : 'password'"
            />
            <span class="auth-card__pw-toggle">
              <IconButton
                :icon="newPwVisible ? 'hide' : 'preview'"
                :label="$t('login.show_password')"
                :pressed="newPwVisible"
                size="sm"
                @click="newPwVisible = !newPwVisible"
              />
            </span>
          </div>
        </FormField>
        <FormField :label="$t('user.confirm_password')" class="mb-8">
          <div class="auth-card__pw-field">
            <BasicInput
              v-model="confirmPassword"
              class="bg-raised lh-base-elem"
              :type="newPwVisible ? 'text' : 'password'"
            />
            <span class="auth-card__pw-toggle">
              <IconButton
                :icon="newPwVisible ? 'hide' : 'preview'"
                :label="$t('login.show_password')"
                :pressed="newPwVisible"
                size="sm"
                @click="newPwVisible = !newPwVisible"
              />
            </span>
          </div>
        </FormField>
        <BasicButton
          type="submit"
          variant="primary"
          class="jc-ct w-100 rounded"
        >
          {{ $t('user.change_password_submit') }}
        </BasicButton>
      </form>
    </template>
  </BasicCard>
</template>

<script>
import { POST_PasswordChange } from "@/api/contentDB/api";
import { useNotifyStore } from "@/stores/notify";
import { parsePasswordError } from "@/utils/password-errors";

export default {
  setup() {
    const notify = useNotifyStore();
    return { notify };
  },
  data() {
    return {
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
      oldPwVisible: false,
      newPwVisible: false,
      success: false,
    };
  },
  methods: {
    async handleSubmit() {
      if (!this.oldPassword || !this.newPassword || !this.confirmPassword) {
        this.notify.spawnNotification({
          title: this.$t("user.fill_all_fields"),
          type: "negative",
          timeout: "2500",
        });
        return;
      }
      if (this.newPassword !== this.confirmPassword) {
        this.notify.spawnNotification({
          title: this.$t("user.passwords_dont_match"),
          type: "negative",
          timeout: "2500",
        });
        return;
      }
      try {
        await POST_PasswordChange({
          old_password: this.oldPassword,
          new_password: this.newPassword,
          new_password_check: this.confirmPassword,
        });
        this.success = true;
      } catch (error) {
        const { message } = parsePasswordError(error);
        this.notify.spawnNotification({
          title: message || this.$t("notifications.error"),
          type: "negative",
          timeout: "3000",
        });
      }
    },
    goHome() {
      this.$router.push("/");
    },
  },
};
</script>
