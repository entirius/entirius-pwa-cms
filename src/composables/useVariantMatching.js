import { isEqual } from 'lodash';

/**
 * Utility functions for variant-based conditional rendering in config systems.
 *
 * Used by:
 * - Pages CMS config-kit (section/tile configuration)
 * - Future PIM attribute editor (product attribute configuration)
 * - Any config-driven UI that needs conditional field visibility
 *
 * These are pure functions that can be used in both Options API and Composition API components.
 */

/**
 * Build array of currently set config values in "prop:value" format.
 * Example: ["doc_type:static-page", "core_type:section-hero", "variant:1"]
 *
 * @param {Object} configs - Config arrays
 * @param {Array} configs.hidden_config - Hidden configs
 * @param {Array} configs.core_config - Core configs
 * @param {Array} configs.optional_config - Optional configs
 * @returns {Array<string>} Array of "prop:value" strings
 */
export function buildSettedConfigsValues(configs) {
  const allConfigs = [
    ...(configs.hidden_config || []),
    ...(configs.core_config || []),
    ...(configs.optional_config || []),
  ];

  return allConfigs.reduce((arr, { prop = null, __value = null }) => {
    if (__value !== null) {
      arr.push(`${prop}:${__value}`);
    }
    return arr;
  }, []);
}

/**
 * Check if a config option should be enabled based on its variants.
 *
 * Variant matching logic:
 * - Each variant is an array of required "prop:value" strings
 * - Option is enabled if ANY variant matches ALL its conditions
 * - Example: variants = [["doc_type:static-page", "core_type:section-hero"]]
 *   → Enabled only when BOTH conditions are met
 *
 * @param {Array<string>} settedValues - Current config values ("prop:value" format)
 * @param {string} check_type - "options" (returns option object) or other
 * @param {Object} option - Config option to check
 * @param {string} option.label - Display label
 * @param {string} option.value - Option value
 * @param {Array<Array<string>>} option.variants - Variant rules
 * @returns {Object} Option with disabled flag
 */
export function checkCoresDependency(
  settedValues,
  check_type = 'options',
  { label = null, value = null, variants = null }
) {
  let is_allowed = true;

  // No variants (null/undefined or empty array) = always enabled
  if (!variants || variants.length === 0) {
    return { label, value, disabled: !is_allowed };
  }

  // Check if any variant matches
  is_allowed = variants.find((variant) => {
    // Filter setted values that are in this variant
    const dependant = settedValues.filter((sc) => variant.includes(sc));
    // Variant matches if all its conditions are met
    return isEqual(variant, dependant);
  });

  is_allowed = is_allowed ? { ...is_allowed } : is_allowed;

  return { label, value, disabled: !is_allowed };
}

/**
 * Check if a prop should be visible based on its variants_group.
 *
 * Props use variants_group (array of variant arrays) instead of variants.
 * Each entry can also specify related_options for complex prop types.
 *
 * @param {Array<string>} settedValues - Current config values ("prop:value" format)
 * @param {string} check_type - "props" (returns boolean) or "options" (returns related_options)
 * @param {Array<Object>} dependencies - Array of dependency objects
 * @param {Array<Array<string>>} dependencies[].variants_group - Variant rules
 * @param {string} dependencies[].related_options - Key for props_options lookup
 * @returns {boolean|string} Boolean if check_type="props", related_options key if "options"
 */
export function checkPropsDependency(
  settedValues,
  check_type = 'props',
  dependencies = null
) {
  let is_allowed = true;

  // No dependencies = hidden
  if (!dependencies) {
    return check_type === 'props' ? false : null;
  }

  // Wildcard = always shown
  if (dependencies === '*') {
    return check_type === 'props' ? true : null;
  }

  // Find matching dependency
  is_allowed = dependencies.find(
    ({ related_options = null, variants_group = null }) => {
      // Check if any variant in the group matches
      return variants_group.some((variant) => {
        const dependant = settedValues.filter((sc) => variant.includes(sc));
        return isEqual(variant, dependant);
      });
    }
  );

  is_allowed = is_allowed ? { ...is_allowed } : is_allowed;

  // Return boolean for props visibility, related_options for config lookup
  return check_type === 'props'
    ? Boolean(is_allowed)
    : is_allowed?.related_options || null;
}

/**
 * Check if all options in a list are disabled.
 * Used to hide entire config sections when no options are available.
 *
 * @param {Array<Object>} options - Array of options with disabled flags
 * @returns {boolean} True if all options are disabled
 */
export function isAllOptionsDisabled(options) {
  return options.every(({ disabled = false }) => disabled === true);
}
