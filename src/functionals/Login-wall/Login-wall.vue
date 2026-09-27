<template>
  <div
    class="page-card auth-card fs-300 t-body shadow-down"
  >
    <!-- Forgot password mode -->
    <template v-if="showForgotPassword">
      <p class="fs-700 fw-600 txt-center mb-1">
        {{ $t("login.forgot_title") }}
      </p>
      <p class="fs-300 t-secondary txt-center mb-12">
        {{ $t("login.forgot_subtitle") }}
      </p>

      <template v-if="resetEmailSent">
        <div class="auth-card__banner auth-card__banner--success mb-10">
          <p class="fs-300 fw-500">{{ $t("login.reset_email_sent") }}</p>
        </div>
      </template>
      <template v-else>
        <BasicInput
          v-model="resetEmail"
          class="bg-raised mb-8 lh-base-elem"
          :label="$t('login.email')"
        />
        <BasicButton
          :text="$t('login.send_reset_link')"
          @click="sendResetLink"
          class="bg-accent-fill b-accent jc-ct t-on-accent-fill w-100 rounded"
        />
      </template>

      <button
        class="auth-card__link mt-8"
        @click="
          showForgotPassword = false;
          resetEmailSent = false;
        "
      >
        {{ $t("login.back_to_login") }}
      </button>
    </template>

    <!-- Login mode -->
    <template v-else>
      <div
        v-if="sessionExpired"
        class="auth-card__banner auth-card__banner--warning mb-10"
      >
        <p class="fs-300 fw-500">{{ $t("login.session_expired") }}</p>
      </div>
      <p class="fs-700 fw-600 txt-center mb-1">{{ $t("login.welcome") }}</p>
      <p class="fs-300 t-secondary txt-center mb-12">
        {{ $t("login.subtitle") }}
      </p>
      <BasicInput
        v-model="username"
        class="bg-raised mb-10 lh-base-elem"
        :label="$t('login.username')"
      />
      <div class="auth-card__pw-field mb-8">
        <BasicInput
          v-model="password"
          class="bg-raised lh-base-elem"
          :label="$t('login.password')"
          :type="pwVisible ? 'text' : 'password'"
        />
        <button
          class="auth-card__pw-toggle"
          type="button"
          @click="pwVisible = !pwVisible"
        >
          <FontAwesomeIcon :icon="pwVisible ? $icons.hide : $icons.preview" />
        </button>
      </div>

      <BasicButton
        :text="$t('login.submit')"
        @click="login"
        class="bg-accent-fill b-accent jc-ct t-on-accent-fill w-100 rounded"
      />

      <template v-if="ssoEnabled">
        <p class="auth-card__divider fs-200 t-muted mt-8 mb-8">
          {{ $t("login.sso_or") }}
        </p>
        <BasicButton
          data-testid="sso-login"
          :text="$t('login.sso_submit')"
          @click="startSsoLogin"
          class="bg-base b-accent jc-ct t-accent w-100 rounded"
        />
      </template>

      <button class="auth-card__link mt-8" @click="showForgotPassword = true">
        {{ $t("login.forgot_password") }}
      </button>
    </template>
  </div>
</template>

<script>
const debugMode = process.env.VUE_APP_DEBUG == "true" ? true : false;
const environment = process.env.NODE_ENV === "development";
const username = process.env.VUE_APP_USERNAME;
const password = process.env.VUE_APP_PASSWORD;

import { POST_Login, POST_PasswordReset } from "../../api/contentDB/api";
import {
  POST_SsoLoginUrl,
  SSO_STATE_KEY,
  isSsoEnabled,
  ssoRedirectUri,
} from "@/api/sso/api";
import { useNotifyStore } from "@/stores/notify";
import { useLoginSession, consumeReturnRoute } from "@/composables/useLoginSession";
import { extractApiMessage } from "@/composables/useFormErrors";
export default {
  setup() {
    const notify = useNotifyStore();
    const { completeLogin } = useLoginSession();
    return { notify, completeLogin };
  },
  data() {
    return {
      username: environment || debugMode ? username : "",
      password: environment || debugMode ? password : "",
      pwVisible: false,
      sessionExpired: false,
      showForgotPassword: false,
      resetEmail: "",
      resetEmailSent: false,
    };
  },
  computed: {
    ssoEnabled() {
      return isSsoEnabled();
    },
  },
  mounted() {
    if (localStorage.getItem("session_expired") === "1") {
      this.sessionExpired = true;
      localStorage.removeItem("session_expired");
    }
  },
  methods: {
    async login() {
      this.sessionExpired = false;
      try {
        // err handler
        if (![this.username, this.password].every(Boolean)) {
          const err = new Error();
          err.status = 403;
          err.response = this.$t("login.empty_credentials");
          throw err;
        }

        const { data } = await POST_Login({
          username: this.username,
          password: this.password,
        });
        await this.completeLogin(data.data || {});

        const returnRoute = consumeReturnRoute();
        if (returnRoute) {
          this.$router.push(returnRoute);
        }
      } catch (error) {
        const title = extractApiMessage(
          error,
          "Unknown error. Contact administrator."
        );
        this.notify.spawnNotification({
          title,
          type: "negative",
          timeout: "2500",
        });
      }
    },
    async startSsoLogin() {
      try {
        const { data } = await POST_SsoLoginUrl({ redirectUri: ssoRedirectUri() });
        sessionStorage.setItem(SSO_STATE_KEY, data.state);
        window.location.assign(data.authorization_url);
      } catch (error) {
        this.notify.spawnNotification({
          title: extractApiMessage(error, this.$t("login.sso_failed")),
          type: "negative",
          timeout: "2500",
        });
      }
    },
    async sendResetLink() {
      if (!this.resetEmail) {
        this.notify.spawnNotification({
          title: this.$t("login.enter_email"),
          type: "negative",
          timeout: "2500",
        });
        return;
      }
      try {
        await POST_PasswordReset({ email: this.resetEmail });
      } catch {
        // Show success regardless to prevent email enumeration
      }
      this.resetEmailSent = true;
    },
  },
};
</script>
