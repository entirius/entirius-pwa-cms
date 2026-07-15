<template>
  <div class="input-field-controller grid grid-col-3 gap-100">
    <BasicInput class="lh-base-elem" :placeholder="'label'" />
    <Dropdown
      class="b-basic-400 br-50"
      :values="[
        { label: 'text', value: 'text' },
        { label: 'email', value: 'email' },
        { label: 'tel', value: 'tel' },
        { label: 'textarea', value: 'textarea' },
        { label: 'checkbox', value: 'checkbox' },
      ]"
    />
    <Dropdown
      class="b-basic-400 br-50"
      :values="[
        { label: $t('common.required'), value: true },
        { label: $t('common.not_required'), value: false },
      ]"
    />
  </div>
</template>
