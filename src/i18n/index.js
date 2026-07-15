import { reactive } from "vue";
import en from "./locales/en.json";
import pl from "./locales/pl.json";

const messages = { EN: en, PL: pl };

const state = reactive({ lang: (process.env.VUE_APP_LANG || "EN").toUpperCase() });

export function setLang(l) {
  state.lang = l.toUpperCase();
}

export function getLang() {
  return state.lang;
}

function resolve(obj, key) {
  return key.split(".").reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
}

export function t(key, params) {
  const locale = messages[state.lang] || messages.EN;
  let val = resolve(locale, key);
  if (val === undefined && state.lang !== "EN") {
    val = resolve(messages.EN, key);
  }
  if (val === undefined) return key;
  if (params) {
    return val.replace(/\{(\w+)\}/g, (_, name) => params[name] !== undefined ? params[name] : `{${name}}`);
  }
  return val;
}

export default {
  install(app) {
    app.config.globalProperties.$t = t;
  },
};
