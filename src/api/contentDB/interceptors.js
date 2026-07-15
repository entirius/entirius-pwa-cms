import Cookies from "universal-cookie";
const cookies = new Cookies();
import { POST_refreshToken } from "./api";

/**
 * ContentDB-specific response error interceptor.
 * Handles 401 token refresh, 403 redirect, and other error responses.
 */
export const tokenRefreshInterceptor = (api) => {
  api.interceptors.response.use(
    (res) => {
      return res;
    },
    async (err) => {
      const originalConfig = err.config;
      if (err.response) {
        // Access Token was expired status should be 401
        if (err.response.status === 401 && !originalConfig._retry) {
          originalConfig._retry = true;
          try {
            const refreshCookie = cookies.get("refresh");
            if (!refreshCookie) {
              const err = new Error();
              err.meta = {
                status: 404,
                message: "Missed cookie - refresh",
              };
              throw err;
            }
            const { data } = await POST_refreshToken({
              refresh: refreshCookie,
            });
            const { data: refreshData = {}, meta: refreshMeta = {} } = data;

            const { access, refresh } = refreshData;
            const milliseconds = 15 * 60 * 1000;
            const expiryDate = new Date(new Date().getTime() + milliseconds);

            cookies.set("token", access);
            cookies.set("refresh", refresh);
            cookies.set("expiryDate", expiryDate);

            api.defaults.headers.common["Authorization"] = `Bearer ${access}`;
            return api(originalConfig);
          } catch (_error) {
            console.log("refresh error - handle this here!!!!!");
            console.log(_error);
            const { meta = {} } = _error;
            if (meta.status === 404) {
              console.log(meta.message);
              console.log("clear cookies and go root cpt.");
              const allCookies = cookies.getAll();
              Object.keys(allCookies).forEach((cookieName) => {
                cookies.remove(cookieName, { path: '/' });
              });
              document.location.href = "/";
              return;
            }
            if (_error.response && _error.response.data) {
              console.log("refresh error - handle me!!!!!");
              return Promise.reject(_error.response.data);
            }
            return Promise.reject(_error);
          }
        }

        if (err.response.status === 403) {
          // clean all cookies and do redirect to root
          const allCookies = cookies.getAll();
          Object.keys(allCookies).forEach((cookieName) => {
            cookies.remove(cookieName, { path: '/' });
          });
          document.location.href = "/";
          return Promise.reject(err.response.data);
        }
        // Other exeptions - should be but pączek needs to fix it first 401
        if (err.response.status !== 401 && err.response.data) {
          return Promise.reject(err.response.data);
        }
      }
      return Promise.reject(err);
    }
  );
};
