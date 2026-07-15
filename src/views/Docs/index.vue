<template>
  <div class="doc-view fs-200 t-basic-700">
    <div>
      <nav class="flex bb-basic-300 mb-200">
        <BasicButton
          v-for="({ label, value }, i) in nav"
          :key="`nav-key-${i}`"
          :text="label"
          class="br-tl-50 br-tr-50"
          :class="[
            selected_view === value
              ? 'bg-support-300 t-basic-100 b-support-300'
              : 'bg-basic-300 b-basic-400 t-basic-600',
          ]"
          @click="selected_view = value"
        />
      </nav>
      <div v-if="selected_view === 'doc'">
        <div class="mb-200">
          <Dropdown
            style="max-width: 10rem"
            :values="docs_nav"
            :selected="[doc_prev]"
            class="bg-basic-300 b-basic-400 br-50 fs-100"
            @onSelect="doc_prev = $event"
          />
        </div>

        <div class="markdown-renderer-wrapper">
          <div v-html="renderedMarkdown"></div>
        </div>
      </div>
      <div v-if="selected_view === 'eg'">
        <p class="fs-100 t-basic-500 mb-50">Wybierz przyklad</p>
        <div class="flex mb-200">
          <Dropdown
            style="min-width: 10rem"
            :values="sub_nav"
            :selected="[eg_prev]"
            class="bg-basic-300 b-basic-400 br-50 fs-100"
            @onSelect="eg_prev = $event"
          />
        </div>
        <div class="grid grid-col-3 gap-200">
          <pre
            class="fs-100 b-basic-300 br-50 p-200 bg-basic-100 as-s"
            v-for="(k, i) in ex_preview"
          >
            
            <p class="t-support-400">"{{ k }}":</p>
            <p>
              {{ v }}
            </p>
          </pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { marked } from "marked";
import config_docs from "!!raw-loader!./config_docs.md";
import props_docs from "!!raw-loader!./props_docs.md";

import hidden_config from "@/../__client/configs/__hidden_config";
import core_config from "@/../__client/configs/__core_config";
import optional_config from "@/../__client/configs/__optional_config";
import core_properties from "@/../__client/props/__props";
import props_handlers from "@/../__client/props/__props_handlers";

const docs_nav = [
  { label: "__[type]_config", value: "config_docs" },
  { label: "__props", value: "props_docs" },
];

const sub_nav = [
  //{ label: "__hidden_config", value: "hidden_config" },
  { label: "__core_config", value: "core_config" },
  { label: "__optional_config", value: "optional_config" },
  { label: "__props", value: "core_properties" },
];
export default {
  data() {
    return {
      fileContent: null,
      config_docs,
      props_docs,
      nav: [
        {
          label: "Doc",
          value: "doc",
        },
        {
          label: "examples",
          value: "eg",
        },
      ],
      selected_view: "doc",
      sub_nav,
      eg_prev: "core_config",
      hidden_config,
      core_config,
      optional_config,
      core_properties,
      props_handlers,
      docs_nav,
      doc_prev: "config_docs",
    };
  },
  computed: {
    ex_preview() {
      return this[this.eg_prev];
    },
    doc_preview() {
      return this[this.doc_prev];
    },
    renderedMarkdown() {
      marked.setOptions({
        gfm: true,
        breaks: true,
      });
      return marked(this.doc_preview || "");
    },
  },
};
</script>

<style lang="scss">
.doc-view {
  .markdown-renderer-wrapper {
    div > * {
      margin-bottom: var(--space-200);
    }
    h1,
    h2,
    h3,
    strong {
      color: var(--c-support-400) !important;
    }
    h4 {
      color: var(--c-negative-200) !important;
    }
    a {
      color: var(--c-positive-200);
    }

    table {
      border: 1px solid var(--c-basic-400);
      border-radius: var(--space-50);

      th,
      td {
        padding: var(--space-50) var(--space-100);
      }

      th:nth-of-type(2n),
      td:nth-of-type(2n) {
        background: var(--c-basic-100);
      }
    }
    code,
    li,
    blockquote {
      color: var(--c-basic-600);
      font-size: var(--fs-100);
    }

    blockquote {
      padding: var(--space-50);
      background: var(--c-basic-100);
      border-radius: var(--space-50);
    }
    code {
      border: 1px solid var(--c-basic-400);
      border-radius: var(--space-50);
      padding: var(--space-50);
      background: var(--c-basic-300);
    }
    hr {
      border-bottom: 1px solid var(--c-basic-400);
    }
  }
}
</style>
