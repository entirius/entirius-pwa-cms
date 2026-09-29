<template>
  <AuthLayout :title="$t(errorMessage ? 'login.sso_failed' : 'login.sso_in_progress')">
    <template v-if="errorMessage" #status>
      <span data-testid="sso-error">{{ errorMessage }}</span>
    </template>
    <BasicButton v-if="errorMessage" variant="primary" size="lg" class="jc-ct w-100" @click="goToLogin">
      {{ $t("login.back_to_login") }}
    </BasicButton>
    <Loader v-else />
  </AuthLayout>
</template>

<script>
import {
  POST_SsoCallback,
  SSO_STATE_KEY,
  isSsoEnabled,
  ssoRedirectUri,
} from "@/api/sso/api";
import { useUserStore } from "@/stores/user";
import { useLoginSession, consumeReturnRoute } from "@/composables/useLoginSession";
import { extractApiMessage } from "@/composables/useFormErrors";
import AuthLayout from "@/boots/AuthLayout/index.vue";

export default {
  components: { AuthLayout },
  setup() {
    const userStore = useUserStore();
    const { completeLogin } = useLoginSession();
    return { userStore, completeLogin };
  },
  data() {
    return { errorMessage: "" };
  },
  async mounted() {
    // Single use: a reload or a second tab must never reuse the state.
    const expectedState = sessionStorage.getItem(SSO_STATE_KEY);
    sessionStorage.removeItem(SSO_STATE_KEY);

    if (!isSsoEnabled() || this.userStore.isAuth) {
      this.$router.replace("/");
      return;
    }
    this.errorMessage = this.validate(expectedState);
    if (!this.errorMessage) {
      await this.finishLogin();
    }
  },
  methods: {
    validate(expectedState) {
      const { code, state, error } = this.$route.query;
      if (error) {
        return this.$t("login.sso_provider_error", { error });
      }
      if (!code || !state || state !== expectedState) {
        return this.$t("login.sso_state_mismatch");
      }
      return "";
    },
    async finishLogin() {
      const { code, state } = this.$route.query;
      try {
        const { data } = await POST_SsoCallback({
          code,
          state,
          redirectUri: ssoRedirectUri(),
        });
        await this.completeLogin(data);
        this.$router.replace(consumeReturnRoute() || "/");
      } catch (error) {
        this.errorMessage = extractApiMessage(error, this.$t("login.sso_failed"));
      }
    },
    goToLogin() {
      this.$router.replace("/");
    },
  },
};
</script>
