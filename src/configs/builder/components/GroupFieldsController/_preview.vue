<template>
  <div class="group-fields-preview">
    <Dropdown
      class="bg-base b-subtle rounded fs-200 t-secondary"
      :placeholder="`groups (${value.length})`"
      :values="
        value.map((obj, index) => {
          const entries = Object.entries(obj);
          return {
            label: entries.reduce((str, [_key, _value]) => {
              return `${str}${_key}: ${
                _value && _value.length > 10 ? _value.substring(0, 10) : _value
              } | `;
            }, ''),
            value: index,
          };
        })
      "
    />
  </div>
</template>

<script>
export default {
  props: {
    value: {
      type: [Array],
      required: true,
    },
  },
};
</script>
