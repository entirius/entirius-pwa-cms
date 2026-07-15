import { config } from "@vue/test-utils";

// Simple i18n stubs reused by every test
const $t = (key, params = {}) => {
  if (!params || !Object.keys(params).length) return key;
  return `${key}::${JSON.stringify(params)}`;
};
const $tc = (key, count, params = {}) => $t(key, { count, ...(params || {}) });

config.global.mocks = {
  $t,
  $tc,
  $route: { params: {}, query: {}, hash: "", path: "/" },
  $router: { push: () => {}, replace: () => {} },
};

config.global.stubs = {
  FontAwesomeIcon: true,
  Loader: true,
  EmptyState: true,
  StatusBadge: true,
  FilterChip: true,
  Dropdown: true,
  BasicButton: true,
  BasicInput: true,
  TextAreaBasic: true,
  FormField: true,
};
