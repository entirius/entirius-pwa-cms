import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useHandyStore = defineStore('handy', () => {
  const handyType = ref(false)
  const options = ref(null)
  const listener = ref(null)
  const triggerListener = ref(null)
  const defaults = ref(null)
  const payload = ref(null)
  const setsOpen = ref(false)
  const handyFold = ref(null)
  const preventOtherTabs = ref(false)
  const isDirty = ref(false)

  function open_Handykit({
    handyType: ht = null,
    listener: l = '',
    defaults: d = null,
    handyFold: hf = null,
    preventOtherTabs: pot = false,
    options: o = null,
  } = {}) {
    handyType.value = ht
    options.value = o
    listener.value = l
    defaults.value = d
    handyFold.value = hf
    preventOtherTabs.value = pot
    isDirty.value = false
  }

  function pass_Asset(asset) {
    triggerListener.value = listener.value?.uuid ?? null
    payload.value = {
      ...listener.value,
      payload: asset,
    }
  }

  function changeState({ key = null, value = null }) {
    const stateMap = { setsOpen, handyFold, preventOtherTabs, defaults, options }
    if (stateMap[key]) stateMap[key].value = value
  }

  return {
    handyType, options, listener, triggerListener, defaults, payload,
    setsOpen, handyFold, preventOtherTabs, isDirty,
    open_Handykit, pass_Asset, changeState
  }
})
