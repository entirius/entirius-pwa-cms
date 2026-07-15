import { defineAsyncComponent } from "vue";

export default function registerConfigComponents(app) {
  app.component("ButtonsController", defineAsyncComponent(() => import("./ButtonsController/index.vue")));
  app.component("ImagesController", defineAsyncComponent(() => import("./ImagesController/index.vue")));
  app.component("GroupFieldsController", defineAsyncComponent(() => import("./GroupFieldsController/index.vue")));
}
