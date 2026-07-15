import { watch } from 'vue'
import { useHandyStore } from '@/stores/handy'

export function useHandyKitSubscriber({ subscriberId = undefined, type = 'instance', customObjName = undefined } = {}) {
  const handy = useHandyStore()

  function setupSubscriber(componentInstance, suuid) {
    const stop = watch(
      () => handy.triggerListener,
      (newVal) => {
        if (
          newVal !== null &&
          newVal === suuid
        ) {
          const {
            bindTo = undefined,
            objName = undefined,
            payload = undefined,
            method = null,
          } = handy.payload

          if (bindTo) {
            if (type === 'instance') {
              componentInstance.instance[bindTo] = payload
            } else if (type === 'flat') {
              componentInstance[bindTo] = payload
            } else if (type === 'custom' && customObjName) {
              componentInstance[customObjName][bindTo] = payload
            } else if (type === 'mixed') {
              if (objName) {
                method === 'push'
                  ? componentInstance[objName][bindTo].push(payload)
                  : (componentInstance[objName][bindTo] = payload)
              } else {
                method === 'push'
                  ? componentInstance[bindTo].push(payload)
                  : (componentInstance[bindTo] = payload)
              }
            }
            handy.triggerListener = null
          }
        }
      }
    )

    return stop
  }

  return { setupSubscriber, open_Handykit: handy.open_Handykit }
}
