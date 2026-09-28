<template>
  <nav
    :id="navId"
    class="sidebar-nav flex-column"
    :class="{ 'sidebar-nav--collapsed': isCollapsed && !flat, 'sidebar-nav--flat': flat }"
    :aria-label="$t('shell.panels')"
    v-bind="flat ? {} : { 'data-testid': 'app-sidebar', 'data-fid': 'sidebar' }"
  >
    <div class="sidebar-nav__scroll flex-column gap-3 fg-1">
      <p v-if="!flat && !isCollapsed" class="sidebar-nav__title">{{ $t("shell.panels") }}</p>
      <ul class="sidebar-nav__list flex-column gap-3">
        <li>
          <SidebarNavItem
            :label="$t('nav.home')"
            :icon="ICONS.home"
            :to="HOME_ROUTE"
            :active="panelIdx === HOME"
            :collapsed="railed"
          />
        </li>
        <li v-for="panel in panels" :key="panel.idx">
          <SidebarNavGroup
            :panel="panel"
            :entries="tree[panel.idx]"
            :expanded="open.has(panel.idx)"
            :active="panel.idx === panelIdx"
            :active-entry="panel.idx === panelIdx ? entry?.route : ''"
            :flat="flat"
            :collapsed="railed"
            @toggle="toggleGroup(panel.idx)"
          />
        </li>
      </ul>
    </div>
    <div v-if="!flat" class="sidebar-nav__footer flex">
      <IconButton
        :icon="isCollapsed ? 'next' : 'prev'"
        :label="isCollapsed ? $t('app.expand_sidebar') : $t('app.collapse_sidebar')"
        :aria-expanded="String(!isCollapsed)"
        :aria-controls="navId"
        @click="userStore.toggleSidebar()"
      />
    </div>
  </nav>
</template>

<script>
let nextId = 0;
</script>

<script setup>
// The persistent left navigation (R1, r05 §4): "Panele", Home, then every panel of the registry in order, each a
// SidebarNavGroup. The active panel's group opens when the panel becomes active; the others open and close on
// click (session state of this nav, not persisted). 300 px, scrolls on its own; `collapsed` (default: the user
// store's `isSidebarCollapsed`, persisted as `cms_sidebar_collapsed`) is the 64 px icon rail, toggled from the
// footer button. `flat` is the MobileMenu list: no title, no footer, every panel one link to its root.
import { computed, reactive, watch } from "vue";
import { ICONS } from "@/boots/Icons/icons";
import IconButton from "@/boots/IconButton/index.vue";
import { useUserStore } from "@/stores/user";
import { HOME, HOME_ROUTE, useActiveNav, usePanels } from "@/composables/useNav";
import SidebarNavGroup from "./SidebarNavGroup.vue";
import SidebarNavItem from "./SidebarNavItem.vue";

const props = defineProps({
  flat: { type: Boolean, default: false },
  collapsed: { type: Boolean, default: undefined },
});

nextId += 1;
const navId = `sidebar-nav-${nextId}`;
const userStore = useUserStore();
const panels = usePanels();
const { panelIdx, entry, tree } = useActiveNav();
const open = reactive(new Set());

const isCollapsed = computed(() => props.collapsed ?? userStore.isSidebarCollapsed);
const railed = computed(() => isCollapsed.value && !props.flat);

function toggleGroup(idx) {
  if (open.has(idx)) open.delete(idx);
  else open.add(idx);
}

watch(panelIdx, (idx) => idx && open.add(idx), { immediate: true });
</script>

<style lang="scss" scoped>
.sidebar-nav {
  box-sizing: border-box;
  width: 300px;
  height: 100%;
  border-right: 1px solid var(--border-hairline);
  background: var(--surface-page);
}

.sidebar-nav__scroll {
  overflow-y: auto;
  min-height: 0;
  padding: var(--space-10) var(--space-5) var(--space-10) var(--space-10);
  scrollbar-width: thin;

  &::-webkit-scrollbar {
    width: 2px;
  }

  &::-webkit-scrollbar-thumb {
    background: linear-gradient(to bottom, var(--accent), var(--border-strong));
  }
}

.sidebar-nav__title {
  padding: var(--space-2);
  color: var(--text-strong);
  font-family: var(--font-brand);
  font-size: var(--fs-400);
  line-height: 1.5;
}

.sidebar-nav__list {
  list-style: none;
}

.sidebar-nav__footer {
  padding: var(--space-3) var(--space-5) var(--space-5) var(--space-10);
}

.sidebar-nav--collapsed {
  width: var(--space-16);

  .sidebar-nav__scroll {
    align-items: center;
    padding: var(--space-10) var(--space-3);
  }

  .sidebar-nav__footer {
    justify-content: center;
    padding: var(--space-3);
  }
}

.sidebar-nav--flat {
  width: 100%;
  height: auto;
  border-right: none;

  .sidebar-nav__scroll {
    padding: var(--space-5);
  }
}
</style>
