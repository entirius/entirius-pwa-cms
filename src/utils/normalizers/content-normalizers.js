export const setDBoptions = ({ customize = [], defaults = {} }) => {
  return customize.map((option) => {
    return { ...option, selected: defaults[option.key] };
  });
};

const sectionCMSprops = ["customization", "tile_types", "tile_types_others"];

// ---------------------------------------------------------
// LSS: normalize or just trim obj for PWA from unnecessary props
// use for whole content arr
export const PWATrimmerNormalizer = (content) => {
  if (!Array.isArray(content)) return content;
  const model = content.map((item) => {
    sectionCMSprops.forEach((trimmer) => {
      delete item[trimmer];
    });
    return item;
  });

  return model;
};
