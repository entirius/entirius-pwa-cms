<template>
  <section
    class="text-section input"
    :class="{ 'focus-mode-placeholder': editor_size }"
  >
    <Teleport to="body" :disabled="!editor_size">
      <div
        v-if="editor_size"
        class="focus-mode-backdrop"
        @click="editor_size = null"
      />
      <div
        v-if="editor"
        class="input-wysiwyg-wrapper flex flex-column jc-sb relative"
        :class="editor_size ? 'focus-mode-editor' : 'h-100'"
      >
        <div
          class="relative fg-1 ovy-auto"
          :class="{
            'editor-content-container': !editor_size,
            'editor-content-container--lite':
              !editor_size && variant === 'lite',
          }"
        >
          <editor-content
            :editor="editor"
            :key="'editor-stable'"
            class="h-100 pb-900 pr-100"
          />
          <button
            class="focus-mode-trigger"
            :class="{ 'is-active': editor_size }"
            type="button"
            tabindex="0"
            :aria-label="editor_size ? 'Exit focus mode' : 'Focus mode'"
            @click="editor_size = editor_size ? null : 'full'"
          >
            <font-awesome-icon
              :icon="
                editor_size ? 'fa-solid fa-compress' : 'fa-solid fa-expand'
              "
            />
          </button>
        </div>
        <div
          v-if="editor"
          class="wysiwyg-options bt-basic-300 pt-100 bg-basic-100 flex ai-ct gap-100"
        >
          <div v-if="mode == 'text'" class="wysiwyg-btn-row flex gap-100 fg-1">
            <BasicButton
              class="b-basic-300 lh-init p-50"
              :class="{ 'bg-basic-300 t-basic-700': editor.isActive('bold') }"
              :custom="true"
              @click="editor.chain().focus().toggleBold().run()"
            >
              <template v-slot:custom>
                <span class="wi-bold fs-400 inline-block" />
              </template>
            </BasicButton>
            <BasicButton
              class="b-basic-300 lh-init p-50"
              :class="{ 'bg-basic-300 t-basic-700': editor.isActive('italic') }"
              :custom="true"
              @click="editor.chain().focus().toggleItalic().run()"
            >
              <template v-slot:custom>
                <span class="wi-italic fs-400 inline-block" />
              </template>
            </BasicButton>
            <BasicButton
              class="b-basic-300 lh-init p-50"
              :class="{
                'bg-basic-300 t-basic-700': editor.isActive('underline'),
              }"
              :custom="true"
              @click="editor.chain().focus().toggleUnderline().run()"
            >
              <template v-slot:custom>
                <span class="wi-underline fs-400 inline-block" />
              </template>
            </BasicButton>

            <BasicButton
              class="b-basic-300 lh-init p-50"
              :class="{
                'bg-basic-300 t-basic-700': editor.isActive('heading', {
                  level: 1,
                }),
              }"
              :custom="true"
              @click="editor.chain().focus().toggleHeading({ level: 1 }).run()"
            >
              <template v-slot:custom>
                <span class="wi-h1 fs-400 inline-block" />
              </template>
            </BasicButton>
            <BasicButton
              class="b-basic-300 lh-init p-50"
              :class="{
                'bg-basic-300 t-basic-700': editor.isActive('heading', {
                  level: 2,
                }),
              }"
              :custom="true"
              @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
            >
              <template v-slot:custom>
                <span class="wi-h2 fs-400 inline-block" />
              </template>
            </BasicButton>
            <BasicButton
              class="b-basic-300 lh-init p-50"
              :class="{
                'bg-basic-300 t-basic-700': editor.isActive('heading', {
                  level: 3,
                }),
              }"
              :custom="true"
              @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
            >
              <template v-slot:custom>
                <span class="wi-h3 fs-400 inline-block" />
              </template>
            </BasicButton>

            <BasicButton
              class="b-basic-300 lh-init p-50"
              :class="{
                'bg-basic-300 t-basic-700': editor.isActive('link'),
              }"
              :custom="true"
              @click="setLink"
            >
              <template v-slot:custom>
                <span class="wi-link fs-400 inline-block" />
              </template>
            </BasicButton>

            <!-- FAQ Tooltip button + search dropdown -->
            <div v-if="faqEnabled" class="relative faq-tooltip-btn">
              <BasicButton
                class="b-basic-300 lh-init p-50"
                :class="{
                  'bg-basic-300 t-basic-700': editor.isActive('faqTooltip'),
                }"
                :custom="true"
                :title="
                  editor.isActive('faqTooltip')
                    ? $t('wysiwyg.faq_remove')
                    : $t('wysiwyg.faq_add')
                "
                @click="
                  editor.isActive('faqTooltip')
                    ? removeFaqTooltip()
                    : openFaqSearch()
                "
              >
                <template v-slot:custom>
                  <font-awesome-icon
                    class="fs-400"
                    icon="fa-solid fa-circle-question"
                  />
                </template>
              </BasicButton>

              <div
                v-if="showFaqSearch"
                class="faq-tooltip-dropdown bg-basic-100 b-basic-300 br-50"
              >
                <div class="p-100">
                  <input
                    v-model="faqQuery"
                    class="faq-tooltip-search"
                    :placeholder="$t('wysiwyg.faq_search_placeholder')"
                    autofocus
                    @input="searchFaq"
                    @keydown.escape="closeFaqSearch"
                  />
                </div>
                <div
                  v-if="faqLoading"
                  class="p-100 t-basic-600 fs-200 tc"
                >
                  {{ $t('wysiwyg.faq_searching') }}
                </div>
                <div
                  v-else-if="faqResults.length === 0 && faqQuery.trim()"
                  class="p-100 t-basic-600 fs-200 tc"
                >
                  {{ $t('wysiwyg.faq_no_results') }}
                </div>
                <ul v-else class="faq-tooltip-results">
                  <li
                    v-for="item in faqResults"
                    :key="item.url_key"
                    class="faq-tooltip-result p-100 bb-basic-300 t-basic-800 fs-200"
                    @click="applyFaqTooltip(item.url_key)"
                  >
                    <div class="fw-600">{{ item.question || item.url_key }}</div>
                    <div class="t-basic-600 faq-tooltip-urlkey">
                      {{ item.url_key }}
                    </div>
                  </li>
                </ul>
                <div class="p-100 bt-basic-300">
                  <button class="faq-tooltip-cancel" @click="closeFaqSearch">
                    {{ $t('wysiwyg.faq_cancel') }}
                  </button>
                </div>
              </div>
            </div>

            <BasicButton
              class="b-basic-300 lh-init p-50"
              :class="{
                'bg-basic-300 t-basic-700': editor.isActive('bulletList'),
              }"
              :custom="true"
              @click="editor.chain().focus().toggleBulletList().run()"
            >
              <template v-slot:custom>
                <span class="wi-bulletList fs-400 inline-block" />
              </template>
            </BasicButton>

            <BasicButton
              class="b-basic-300 lh-init p-50"
              :class="{
                'bg-basic-300 t-basic-700': editor.isActive('orderedList'),
              }"
              :custom="true"
              @click="editor.chain().focus().toggleOrderedList().run()"
            >
              <template v-slot:custom>
                <span class="wi-orderedList fs-400 inline-block" />
              </template>
            </BasicButton>

            <BasicButton
              class="b-basic-300 lh-init p-50"
              :class="{
                'bg-basic-300 t-basic-700': editor.isActive('highlight'),
              }"
              :custom="true"
              @click="
                editor.commands.toggleHighlight({ color: highlightColor })
              "
            >
              <template v-slot:custom>
                <span class="wi-highlight fs-400 inline-block" />
              </template>
            </BasicButton>

            <BasicButton
              class="b-basic-300 lh-init p-50"
              :class="{
                'bg-basic-300 t-basic-700': editor.isActive('textStyle', {
                  color: EDITOR_LINK_COLOR,
                }),
              }"
              :custom="true"
              @click="
                editor.isActive('textStyle', { color: EDITOR_LINK_COLOR })
                  ? editor.chain().focus().unsetColor().run()
                  : editor.chain().focus().setColor(EDITOR_LINK_COLOR).run()
              "
            >
              <template v-slot:custom>
                <span class="wi-highlight fs-400 inline-block" />
              </template>
            </BasicButton>

            <BasicButton
              class="b-basic-300 lh-init p-50"
              :class="{
                'bg-basic-300 t-basic-700': editor.isActive({
                  textAlign: 'left',
                }),
              }"
              :custom="true"
              @click="editor.chain().focus().setTextAlign('left').run()"
            >
              <template v-slot:custom>
                <span class="wi-align-left fs-400 inline-block" />
              </template>
            </BasicButton>
            <BasicButton
              class="b-basic-300 lh-init p-50"
              :class="{
                'bg-basic-300 t-basic-700': editor.isActive({
                  textAlign: 'center',
                }),
              }"
              :custom="true"
              @click="editor.chain().focus().setTextAlign('center').run()"
            >
              <template v-slot:custom>
                <span class="wi-align-center fs-400 inline-block" />
              </template>
            </BasicButton>
            <BasicButton
              class="b-basic-300 lh-init p-50"
              :class="{
                'bg-basic-300 t-basic-700': editor.isActive({
                  textAlign: 'right',
                }),
              }"
              :custom="true"
              @click="editor.chain().focus().setTextAlign('right').run()"
            >
              <template v-slot:custom>
                <span class="wi-align-right fs-400 inline-block" />
              </template>
            </BasicButton>
          </div>
          <div v-if="mode == 'table'" class="flex wrap gap-50 t-basic-600 fg-1">
            <BasicButton
              @click="
                editor
                  .chain()
                  .focus()
                  .insertTable({ rows: 2, cols: 3, withHeaderRow: true })
                  .run()
              "
              class="b-basic-300 lh-init p-100"
              :custom="true"
            >
              <template v-slot:custom>
                <font-awesome-icon
                  class="fs-300"
                  :icon="` fa-solid fa-table`"
                />
              </template>
            </BasicButton>
            <BasicButton
              class="b-basic-300 lh-init p-100"
              :custom="true"
              @click="editor.chain().focus().deleteTable().run()"
            >
              <template v-slot:custom>
                <font-awesome-icon
                  class="fs-300"
                  :icon="`fa-solid fa-trash-can`"
                />
              </template>
            </BasicButton>
            <BasicButton
              class="b-basic-300 lh-init p-100"
              :custom="true"
              @click="editor.chain().focus().addColumnBefore().run()"
            >
              <template v-slot:custom>
                <div class="inline-flex ai-ct gap-50">
                  <span>col. before</span>
                  <font-awesome-icon
                    class="fs-300"
                    :icon="`fa-solid fa-plus`"
                  />
                </div>
              </template>
            </BasicButton>
            <BasicButton
              class="b-basic-300 lh-init p-100"
              :custom="true"
              @click="editor.chain().focus().addColumnAfter().run()"
            >
              <template v-slot:custom>
                <div class="inline-flex ai-ct gap-50">
                  <span>col. after</span>
                  <font-awesome-icon
                    class="fs-300"
                    :icon="`fa-solid fa-plus`"
                  />
                </div>
              </template>
            </BasicButton>

            <BasicButton
              class="b-basic-300 lh-init p-100"
              :custom="true"
              @click="editor.chain().focus().deleteColumn().run()"
            >
              <template v-slot:custom>
                <div class="inline-flex ai-ct gap-50">
                  <span>col. delete</span>
                  <font-awesome-icon
                    class="fs-300"
                    :icon="`fa-solid fa-trash-can`"
                  />
                </div>
              </template>
            </BasicButton>
            <BasicButton
              class="b-basic-300 lh-init p-100"
              :custom="true"
              @click="editor.chain().focus().addRowBefore().run()"
            >
              <template v-slot:custom>
                <div class="inline-flex ai-ct gap-50">
                  <span>row. before</span>
                  <font-awesome-icon
                    class="fs-300"
                    :icon="`fa-solid fa-plus`"
                  />
                </div>
              </template>
            </BasicButton>
            <BasicButton
              class="b-basic-300 lh-init p-100"
              :custom="true"
              @click="editor.chain().focus().addRowAfter().run()"
            >
              <template v-slot:custom>
                <div class="inline-flex ai-ct gap-50">
                  <span>row. after</span>
                  <font-awesome-icon
                    class="fs-300"
                    :icon="`fa-solid fa-plus`"
                  />
                </div>
              </template>
            </BasicButton>

            <BasicButton
              class="b-basic-300 lh-init p-100"
              :custom="true"
              @click="editor.chain().focus().deleteRow().run()"
            >
              <template v-slot:custom>
                <div class="inline-flex ai-ct gap-50">
                  <span>row. delete</span>
                  <font-awesome-icon
                    class="fs-300"
                    :icon="`fa-solid fa-trash-can`"
                  />
                </div>
              </template>
            </BasicButton>
            <BasicButton
              class="b-basic-300 lh-init p-100"
              :custom="true"
              @click="editor.chain().focus().mergeCells().run()"
            >
              <template v-slot:custom>
                <div class="inline-flex ai-ct gap-50">
                  <span>Merge</span>
                  <font-awesome-icon
                    class="fs-300"
                    :icon="`fa-solid fa-object-group`"
                  />
                </div>
              </template>
            </BasicButton>
            <BasicButton
              class="b-basic-300 lh-init p-100"
              :custom="true"
              @click="editor.chain().focus().splitCell().run()"
            >
              <template v-slot:custom>
                <div class="inline-flex ai-ct gap-50">
                  <span>Split</span>
                  <font-awesome-icon
                    class="fs-300"
                    :icon="`fa-solid fa-object-ungroup`"
                  />
                </div>
              </template>
            </BasicButton>
            <BasicButton
              class="b-basic-300 lh-init p-100"
              :custom="true"
              @click="editor.chain().focus().toggleHeaderColumn().run()"
            >
              <template v-slot:custom>
                <div class="inline-flex ai-ct gap-50">
                  <span>Toggle (col.)</span>
                  <font-awesome-icon
                    class="fs-300"
                    :icon="`fa-solid fa-circle-dot`"
                  />
                </div>
              </template>
            </BasicButton>
            <BasicButton
              class="b-basic-300 lh-init p-100"
              :custom="true"
              @click="editor.chain().focus().toggleHeaderRow().run()"
            >
              <template v-slot:custom>
                <div class="inline-flex ai-ct gap-50">
                  <span>Toggle (row.)</span>
                  <font-awesome-icon
                    class="fs-300"
                    :icon="`fa-solid fa-circle-dot`"
                  />
                </div>
              </template>
            </BasicButton>

            <BasicButton
              class="b-basic-300 lh-init p-100"
              :custom="true"
              @click="editor.chain().focus().toggleHeaderCell().run()"
            >
              <template v-slot:custom>
                <div class="inline-flex ai-ct gap-50">
                  <span>Toggle (cell.)</span>
                  <font-awesome-icon
                    class="fs-300"
                    :icon="`fa-solid fa-circle-dot`"
                  />
                </div>
              </template>
            </BasicButton>
          </div>
          <Dropdown
            v-if="variant !== 'lite'"
            class="wysiwyg-mode-switcher br-50 b-basic-900 t-basic-200 bg-basic-800"
            :selected="[mode]"
            :values="[
              { label: 'text mode', value: 'text' },
              { label: 'table mode', value: 'table' },
            ]"
            @onSelect="($event) => (mode = $event)"
          />
        </div>
      </div>
    </Teleport>
  </section>
</template>

<script>
import { EditorContent, useEditor } from "@tiptap/vue-3";
import { ref, computed, watch, onBeforeUnmount } from "vue";
import { Mark } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Link from "@tiptap/extension-link";
import { useMuninStore } from "@/stores/munin";
import { GET_FaqItems } from "@/api/faq/api";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";

// Defined at module level — created once, not on every component mount
const FaqTooltip = Mark.create({
  name: "faqTooltip",
  addAttributes() {
    return {
      urlKey: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-faq-tooltip"),
        renderHTML: (attrs) => ({ "data-faq-tooltip": attrs.urlKey }),
      },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-faq-tooltip]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", HTMLAttributes, 0];
  },
  addCommands() {
    return {
      setFaqTooltip:
        (urlKey) =>
        ({ commands }) =>
          commands.setMark(this.name, { urlKey }),
      unsetFaqTooltip:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
});

export default {
  props: {
    modelValue: {
      type: String,
      default: "",
    },
    // Keep body for backwards compatibility
    body: {
      type: String,
      default: "",
    },
    placeholder: {
      type: String,
      default: "",
    },
    variant: {
      type: String,
      default: "full",
      validator: (v) => ["full", "lite"].includes(v),
    },
  },
  emits: ["update:modelValue", "input", "onFocusout"],
  components: {
    EditorContent,
  },
  setup(props, { emit }) {
    // Munin — FAQ module check
    const muninStore = useMuninStore();
    const faqEnabled = computed(() => muninStore.isPanelEnabled("faq"));

    // FAQ search state
    const showFaqSearch = ref(false);
    const faqQuery = ref("");
    const faqResults = ref([]);
    const faqLoading = ref(false);
    const faqSearchTimeout = ref(null);

    const EDITOR_LINK_COLOR = "#0089B7";
    const EDITOR_HIGHLIGHT_COLOR = "#8ce99a";

    // UI state
    const mode = ref("text");
    const editor_size = ref(null);
    const highlightColor = ref(EDITOR_HIGHLIGHT_COLOR);

    // Focus mode: escape key + body scroll lock
    const handleEscKey = (e) => {
      if (e.key === "Escape") editor_size.value = null;
    };

    watch(editor_size, (val) => {
      if (val) {
        document.addEventListener("keydown", handleEscKey);
        document.body.style.overflow = "hidden";
      } else {
        document.removeEventListener("keydown", handleEscKey);
        document.body.style.overflow = "";
      }
    });
    const emitTimeout = ref(null);
    const isInternalUpdate = ref(false);

    // Event handlers
    const handleEditorUpdate = ({ editor }) => {
      const html = editor.getHTML();

      if (emitTimeout.value) {
        clearTimeout(emitTimeout.value);
      }

      // Prevent watcher from responding to our own emit
      isInternalUpdate.value = true;

      emitTimeout.value = setTimeout(() => {
        const isBodyMode = props.body && !props.modelValue;

        if (!isBodyMode) {
          emit("update:modelValue", html);
        }
        emit("input", html);

        // Reset flag AFTER emit completes
        setTimeout(() => {
          isInternalUpdate.value = false;
        }, 0);

        emitTimeout.value = null;
      }, 50);
    };

    const handleEditorBlur = ({ editor }) => {
      emit("onFocusout", editor.getHTML());
      // Allow external updates after blur
      isInternalUpdate.value = false;
    };

    // Build extensions list based on variant
    const baseExtensions = [
      StarterKit.configure({
        // Disable extensions we're adding separately to avoid duplicates
        link: false,
        underline: false,
      }),
      Underline,
      Color,
      TextStyle,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
        alignments: ["left", "center", "right"],
        defaultAlignment: "left",
      }),
      Link.configure({ openOnClick: false }),
      FaqTooltip,
    ];

    const tableExtensions =
      props.variant === "full"
        ? [
            Table.configure({ handleWidth: 100 }),
            TableRow,
            TableHeader,
            TableCell,
          ]
        : [];

    // Initialize editor with TipTap's official useEditor hook
    const editor = useEditor({
      content: props.modelValue || props.body || props.placeholder,
      autofocus: false,
      editable: true,
      editorProps: {
        transformPastedHTML(html) {
          const div = document.createElement("div");
          div.innerHTML = html;
          div.querySelectorAll("[style]").forEach((el) => {
            el.style.color = "";
            el.style.fontFamily = "";
            el.style.fontSize = "";
            el.style.fontWeight = "";
            el.style.backgroundColor = "";
            el.style.lineHeight = "";
            el.style.letterSpacing = "";
            if (!el.getAttribute("style")?.trim()) el.removeAttribute("style");
          });
          return div.innerHTML;
        },
      },
      extensions: [...baseExtensions, ...tableExtensions],
      onUpdate: handleEditorUpdate,
      onBlur: handleEditorBlur,
    });

    // FAQ Tooltip methods
    const openFaqSearch = () => {
      if (!editor.value?.state.selection.empty) {
        showFaqSearch.value = true;
        faqQuery.value = "";
        faqResults.value = [];
      }
    };

    const searchFaq = () => {
      clearTimeout(faqSearchTimeout.value);
      if (!faqQuery.value.trim()) {
        faqResults.value = [];
        return;
      }
      faqLoading.value = true;
      faqSearchTimeout.value = setTimeout(async () => {
        try {
          const channel = process.env.VUE_APP_CHANNEL;
          const res = await GET_FaqItems(channel, {
            search: faqQuery.value,
            page_size: 10,
          });
          faqResults.value = res.data.results || [];
        } catch {
          faqResults.value = [];
        } finally {
          faqLoading.value = false;
        }
      }, 300);
    };

    const applyFaqTooltip = (urlKey) => {
      editor.value?.chain().focus().setFaqTooltip(urlKey).run();
      showFaqSearch.value = false;
    };

    const removeFaqTooltip = () => {
      editor.value?.chain().focus().extendMarkRange("faqTooltip").unsetFaqTooltip().run();
    };

    const closeFaqSearch = () => {
      showFaqSearch.value = false;
    };

    const handleFaqOutsideClick = (e) => {
      if (
        showFaqSearch.value &&
        !e.target.closest(".faq-tooltip-dropdown") &&
        !e.target.closest(".faq-tooltip-btn")
      ) {
        showFaqSearch.value = false;
      }
    };

    watch(showFaqSearch, (val) => {
      if (val) {
        document.addEventListener("mousedown", handleFaqOutsideClick);
      } else {
        document.removeEventListener("mousedown", handleFaqOutsideClick);
      }
    });

    // Methods
    const setLink = () => {
      if (!editor.value) return;

      const previousUrl = editor.value.getAttributes("link").href;
      const url = window.prompt(
        "Enter full URL (leave empty to remove)",
        previousUrl
      );

      if (url === null) return;

      if (url === "") {
        editor.value.chain().focus().extendMarkRange("link").unsetLink().run();
        return;
      }

      editor.value
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url })
        .run();
    };

    // Watch modelValue prop for external changes
    watch(
      () => props.modelValue,
      (newValue) => {
        if (!editor.value) return;

        // Skip if change came from editor itself
        if (isInternalUpdate.value) return;

        // Don't update if editor is focused (user is actively editing)
        if (editor.value.isFocused) return;

        const currentContent = editor.value.getHTML();
        const normalizedNew = (newValue || "").trim();
        const normalizedCurrent = (currentContent || "").trim();

        if (normalizedNew !== normalizedCurrent) {
          editor.value.commands.setContent(newValue || "", false);
        }
      }
    );

    // Watch body prop for backward compatibility
    watch(
      () => props.body,
      (newValue) => {
        if (!editor.value || props.modelValue) return;

        if (isInternalUpdate.value) return;

        // Don't update if editor is focused (user is actively editing)
        if (editor.value.isFocused) return;

        const currentContent = editor.value.getHTML();
        const normalizedNew = (newValue || "").trim();
        const normalizedCurrent = (currentContent || "").trim();

        if (normalizedNew !== normalizedCurrent) {
          editor.value.commands.setContent(newValue || "", false);
        }
      }
    );

    // Cleanup on unmount (editor cleanup handled by useEditor)
    onBeforeUnmount(() => {
      if (emitTimeout.value) {
        clearTimeout(emitTimeout.value);
        emitTimeout.value = null;
      }
      clearTimeout(faqSearchTimeout.value);
      document.removeEventListener("mousedown", handleFaqOutsideClick);
      document.removeEventListener("keydown", handleEscKey);
      document.body.style.overflow = "";
    });

    return {
      mode,
      editor_size,
      highlightColor,
      editor,
      setLink,
      EDITOR_LINK_COLOR,
      faqEnabled,
      showFaqSearch,
      faqQuery,
      faqResults,
      faqLoading,
      openFaqSearch,
      searchFaq,
      applyFaqTooltip,
      removeFaqTooltip,
      closeFaqSearch,
    };
  },
};
</script>

<style lang="scss">
.text-section.input {
  border: 1px solid var(--c-basic-400);
  border-radius: var(--space-50);
  padding: var(--space-100);
  background-color: var(--c-basic-100);
}

.focus-mode-backdrop {
  position: fixed;
  inset: 0;
  background: var(--overlay-backdrop);
  z-index: 200;
}
.focus-mode-editor {
  position: fixed;
  top: 5vh;
  left: 50%;
  transform: translateX(-50%);
  width: min(56rem, 92vw);
  height: 90vh;
  z-index: 201;
  background-color: var(--c-basic-100);
  border-radius: 8px;
  border: 1px solid var(--c-basic-300);
  box-shadow: var(--shadow-lg);
  padding: var(--space-300);
  display: flex;
  flex-direction: column;
}
.focus-mode-placeholder {
  min-height: 4rem;
}
.focus-mode-trigger {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--c-basic-300);
  border-radius: 4px;
  background: var(--c-basic-100);
  color: var(--c-basic-500);
  font-size: var(--fs-200);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s;
  z-index: 1;

  &:hover {
    color: var(--c-support-400);
    border-color: var(--c-support-400);
  }

  &.is-active {
    opacity: 1;
  }
}
.editor-content-container {
  min-height: 15rem;
  max-height: 30rem;

  &--lite {
    min-height: 8rem;
    max-height: 20rem;
  }

  &:hover .focus-mode-trigger {
    opacity: 1;
  }
}
.input-wysiwyg-wrapper {
  .ProseMirror {
    background-color: var(--c-basic-100);
    color: var(--c-basic-700);
    cursor: text;
    line-height: 1.7;
    margin-top: 0.25em;
    margin-bottom: 0.75em;

    h1,
    h2,
    h3 {
      line-height: 1.3;
    }
    table td,
    table th {
      line-height: 1.4;
    }

    u {
      text-decoration: underline;
    }
    ul {
      padding-left: var(--space-100);
    }
    &:focus-visible {
      outline: none;
    }

    [data-faq-tooltip] {
      border-bottom: 2px dotted var(--c-support-400);
      color: var(--c-support-400);
      cursor: help;
    }
    > * + * {
      margin-top: 0;
    }
    table {
      table-layout: fixed;
      // border-radius: var(--space-50);
      border: 1px solid var(--c-basic-500);
      // overflow: hidden;
      font-size: var(--fs-100);
      font-weight: normal;

      border: none;
      border-collapse: collapse;
      min-width: 100%;
      // max-width: 100%;
      // white-space: nowrap;
      background-color: var(--c-basic-100);

      td,
      th {
        //text-align: center;
        padding: 8px;
      }

      td {
        border-bottom: 1px solid var(--c-basic-300);
        width: 1%;
      }

      th {
        color: var(--editor-table-header-text);
        background: var(--editor-table-header-bg);
      }
      th:nth-child(odd) {
        color: var(--editor-table-header-text);
        background: var(--editor-table-header-bg-alt);
      }
      tr {
        vertical-align: top;
      }
      tr:nth-child(even) {
        background: var(--editor-table-even-row);
      }
    }
  }

  // .wysiwyg-options {
  //   position: absolute;
  //   bottom: 0;
  //   left: 0;
  //   right: 0;
  // }
}

[data-theme="dark"] .ProseMirror mark {
  color: #1a1d23 !important;
}

.wysiwyg-btn-row {
  flex-wrap: wrap;
  min-width: 0;
}

.wysiwyg-mode-switcher {
  flex-shrink: 0;
  min-width: 9rem;
  padding: 0 var(--space-50);

  .dropdown-list {
    color: var(--c-basic-800);
  }
}

.wysiwyg-options {
  overflow: visible;
}

.faq-tooltip-btn {
  flex-shrink: 0;
}

.faq-tooltip-dropdown {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 0;
  width: 280px;
  z-index: 200;
  box-shadow: var(--shadow-md);
}

.faq-tooltip-search {
  width: 100%;
  border: 1px solid var(--c-basic-400);
  border-radius: 4px;
  padding: 6px 8px;
  font-size: var(--fs-200);
  background: var(--c-basic-100);
  color: var(--c-basic-800);
  outline: none;

  &:focus {
    border-color: var(--c-support-400);
  }
}

.faq-tooltip-results {
  max-height: 200px;
  overflow-y: auto;
  list-style: none;
  margin: 0;
  padding: 0;
}

.faq-tooltip-result {
  cursor: pointer;
  line-height: 1.4;

  &:hover {
    background: var(--c-basic-200);
  }
}

.faq-tooltip-urlkey {
  font-size: 10px;
}

.faq-tooltip-cancel {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  color: var(--c-basic-600);
  font-size: var(--fs-200);

  &:hover {
    color: var(--c-basic-800);
  }
}
</style>
