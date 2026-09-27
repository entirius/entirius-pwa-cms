<template>
  <div
    class="page-card auth-card fs-300 t-body shadow-down"
  >
    <!-- Success state -->
    <template v-if="success">
      <p class="fs-700 fw-600 txt-center mb-1">
        {{ $t("reset.success_title") }}
      </p>
      <div class="auth-card__banner auth-card__banner--success mb-10">
        <p class="fs-300 fw-500">{{ $t("reset.success_message") }}</p>
      </div>
      <BasicButton
        @click="goToLogin"
        variant="primary"
        class="jc-ct w-100 rounded"
      >
        {{ $t('reset.back_to_login') }}
      </BasicButton>
    </template>

    <!-- Error state (invalid/expired key) -->
    <template v-else-if="error">
      <p class="fs-700 fw-600 txt-center mb-1">
        {{ $t("reset.error_title") }}
      </p>
      <div class="auth-card__banner auth-card__banner--error mb-10">
        <p class="fs-300 fw-500">{{ errorMessage }}</p>
      </div>
      <BasicButton
        @click="goToLogin"
        variant="primary"
        class="jc-ct w-100 rounded"
      >
        {{ $t('reset.back_to_login') }}
      </BasicButton>
    </template>

    <!-- Reset form -->
    <template v-else>
      <p class="fs-700 fw-600 txt-center mb-1">{{ $t("reset.title") }}</p>
      <p class="fs-300 t-secondary txt-center mb-12">
        {{ $t("reset.subtitle") }}
      </p>
      <div class="auth-card__pw-field mb-10">
        <FormField :label="$t('reset.new_password')">
          <BasicInput
            v-model="newPassword"
            class="bg-raised lh-base-elem"
            :type="pwVisible ? 'text' : 'password'"
          />
        </FormField>
        <button
          class="auth-card__pw-toggle"
          type="button"
          @click="pwVisible = !pwVisible"
        >
          <FontAwesomeIcon :icon="pwVisible ? $icons.hide : $icons.preview" />
        </button>
      </div>
      <div class="auth-card__pw-field mb-8">
        <FormField :label="$t('reset.confirm_password')">
          <BasicInput
            v-model="confirmPassword"
            class="bg-raised lh-base-elem"
            :type="pwVisible ? 'text' : 'password'"
          />
        </FormField>
        <button
          class="auth-card__pw-toggle"
          type="button"
          @click="pwVisible = !pwVisible"
        >
          <FontAwesomeIcon :icon="pwVisible ? $icons.hide : $icons.preview" />
        </button>
      </div>
      <BasicButton
        @click="handleReset"
        variant="primary"
        class="jc-ct w-100 rounded"
      >
        {{ $t('reset.submit') }}
      </BasicButton>
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
