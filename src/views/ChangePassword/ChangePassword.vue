<template>
  <div
    class="auth-card fs-300 p-400 t-basic-700 br-50 bg-basic-100 b-basic-300 shadow-down"
  >
    <!-- Success state -->
    <template v-if="success">
      <p class="fs-700 fw-600 txt-center mb-50">
        {{ $t("user.change_password") }}
      </p>
      <div class="auth-card__banner auth-card__banner--success mb-400">
        <p class="fs-300 fw-500">{{ $t("user.password_changed_message") }}</p>
      </div>
      <BasicButton
        :text="$t('user.back_to_home')"
        @click="goHome"
        class="bg-support-400 b-support-400 jc-ct t-basic-100 w-100 br-50"
      />
    </template>

    <!-- Form -->
    <template v-else>
      <p class="fs-700 fw-600 txt-center mb-50">
        {{ $t("user.change_password_title") }}
      </p>
      <p class="fs-300 t-basic-600 txt-center mb-500">
        {{ $t("user.change_password_subtitle") }}
      </p>
      <div class="auth-card__pw-field mb-400">
        <BasicInput
          v-model="oldPassword"
          class="bg-basic-200 lh-base-elem"
          :label="$t('user.old_password')"
          :type="oldPwVisible ? 'text' : 'password'"
        />
        <button
          class="auth-card__pw-toggle"
          type="button"
          @click="oldPwVisible = !oldPwVisible"
        >
          <FontAwesomeIcon :icon="oldPwVisible ? 'eye-slash' : 'eye'" />
        </button>
      </div>
      <div class="auth-card__pw-field mb-400">
        <BasicInput
          v-model="newPassword"
          class="bg-basic-200 lh-base-elem"
          :label="$t('user.new_password')"
          :type="newPwVisible ? 'text' : 'password'"
        />
        <button
          class="auth-card__pw-toggle"
          type="button"
          @click="newPwVisible = !newPwVisible"
        >
          <FontAwesomeIcon :icon="newPwVisible ? 'eye-slash' : 'eye'" />
        </button>
      </div>
      <div class="auth-card__pw-field mb-300">
        <BasicInput
          v-model="confirmPassword"
          class="bg-basic-200 lh-base-elem"
          :label="$t('user.confirm_password')"
          :type="newPwVisible ? 'text' : 'password'"
        />
        <button
          class="auth-card__pw-toggle"
          type="button"
          @click="newPwVisible = !newPwVisible"
        >
          <FontAwesomeIcon :icon="newPwVisible ? 'eye-slash' : 'eye'" />
        </button>
      </div>
      <BasicButton
        :text="$t('user.change_password_submit')"
        @click="handleSubmit"
        class="bg-support-400 b-support-400 jc-ct t-basic-100 w-100 br-50"
      />
    </template>
  </div>
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
