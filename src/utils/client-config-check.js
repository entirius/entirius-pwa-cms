/**
 * Runtime check for skeleton client configs.
 * Logs a console warning if __client/ uses default templates.
 * Import once in App.vue to trigger.
 */

const CLIENT_DIR = process.env.VUE_APP_CLIENT || '__client';

let isDefault = false;

try {
  const configOptions = require(`@/../${CLIENT_DIR}/configs/__config_options.json`);
  const coreConfig = require(`@/../${CLIENT_DIR}/configs/__core_config.json`);

  const hasEmptyOptions = Object.keys(configOptions).length === 0;
  const hasOnlyDefaults =
    Array.isArray(coreConfig) &&
    coreConfig.length > 0 &&
    coreConfig[0]?._for?.section_configs?.length === 1 &&
    coreConfig[0]._for.section_configs[0]?.value === 'section-default';

  isDefault = hasEmptyOptions && hasOnlyDefaults;

  if (isDefault) {
    console.groupCollapsed(
      '%c[client-config] Using skeleton default configs',
      'color: #e6a700; font-weight: bold'
    );
    console.log(
      'The __client/ directory contains default template configs.\n' +
      'Customize the JSON files in __client/ for your deployment.\n' +
      'See __client_default/ for the template structure.'
    );
    console.groupEnd();
  }
} catch (_) {
  // Config files not loadable -- build-time checks handle this
}

export const clientConfigStatus = { isDefault };
