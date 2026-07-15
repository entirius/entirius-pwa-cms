<template>
  <div
    class="auth-card fs-300 p-400 t-basic-700 br-50 bg-basic-100 b-basic-300 shadow-down"
  >
    <!-- Success state -->
    <template v-if="success">
      <p class="fs-700 fw-600 txt-center mb-50">
        {{ $t("reset.success_title") }}
      </p>
      <div class="auth-card__banner auth-card__banner--success mb-400">
        <p class="fs-300 fw-500">{{ $t("reset.success_message") }}</p>
      </div>
      <BasicButton
        :text="$t('reset.back_to_login')"
        @click="goToLogin"
        class="bg-support-400 b-support-400 jc-ct t-basic-100 w-100 br-50"
      />
    </template>

    <!-- Error state (invalid/expired key) -->
    <template v-else-if="error">
      <p class="fs-700 fw-600 txt-center mb-50">
        {{ $t("reset.error_title") }}
      </p>
      <div class="auth-card__banner auth-card__banner--error mb-400">
        <p class="fs-300 fw-500">{{ errorMessage }}</p>
      </div>
      <BasicButton
        :text="$t('reset.back_to_login')"
        @click="goToLogin"
        class="bg-support-400 b-support-400 jc-ct t-basic-100 w-100 br-50"
      />
    </template>

    <!-- Reset form -->
    <template v-else>
      <p class="fs-700 fw-600 txt-center mb-50">{{ $t("reset.title") }}</p>
      <p class="fs-300 t-basic-600 txt-center mb-500">
        {{ $t("reset.subtitle") }}
      </p>
      <div class="auth-card__pw-field mb-400">
        <BasicInput
          v-model="newPassword"
          class="bg-basic-200 lh-base-elem"
          :label="$t('reset.new_password')"
          :type="pwVisible ? 'text' : 'password'"
        />
        <button
          class="auth-card__pw-toggle"
          type="button"
          @click="pwVisible = !pwVisible"
        >
          <FontAwesomeIcon :icon="pwVisible ? 'eye-slash' : 'eye'" />
        </button>
      </div>
      <div class="auth-card__pw-field mb-300">
        <BasicInput
          v-model="confirmPassword"
          class="bg-basic-200 lh-base-elem"
          :label="$t('reset.confirm_password')"
          :type="pwVisible ? 'text' : 'password'"
        />
        <button
          class="auth-card__pw-toggle"
          type="button"
          @click="pwVisible = !pwVisible"
        >
          <FontAwesomeIcon :icon="pwVisible ? 'eye-slash' : 'eye'" />
        </button>
      </div>
      <BasicButton
        :text="$t('reset.submit')"
        @click="handleReset"
        class="bg-support-400 b-support-400 jc-ct t-basic-100 w-100 br-50"
      />
    </template>
  </div>
</template>

<script>
import { POST_PasswordResetConfirm } from "@/api/contentDB/api";
import { useNotifyStore } from "@/stores/notify";
import { parsePasswordError } from "@/utils/password-errors";

export default {
  setup() {
    const notify = useNotifyStore();
    return { notify };
  },
  data() {
    return {
      newPassword: "",
      confirmPassword: "",
      pwVisible: false,
      success: false,
      error: false,
      errorMessage: "",
    };
  },
  computed: {
    resetKey() {
      return this.$route.query.key || "";
    },
  },
  mounted() {
    if (!this.resetKey) {
      this.error = true;
      this.errorMessage = this.$t("reset.invalid_link");
    }
  },
  methods: {
    async handleReset() {
      if (!this.newPassword || !this.confirmPassword) {
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
        await POST_PasswordResetConfirm({
          key: this.resetKey,
          new_password: this.newPassword,
          new_password_check: this.confirmPassword,
        });
        this.success = true;
      } catch (err) {
        const { isTerminal, message } = parsePasswordError(err);
        if (isTerminal) {
          this.error = true;
          this.errorMessage = message || this.$t("reset.error_message");
        } else if (message) {
          this.notify.spawnNotification({
            title: message,
            type: "negative",
            timeout: "3000",
          });
        } else {
          this.error = true;
          this.errorMessage = this.$t("reset.error_message");
        }
      }
    },
    goToLogin() {
      this.$router.push("/");
    },
  },
};
</script>
