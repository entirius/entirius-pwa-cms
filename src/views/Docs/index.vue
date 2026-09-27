<template>
  <div class="doc-view fs-200 t-body">
    <div>
      <BasicTabs v-model="selected_view" :options="nav" class="mb-5" />
      <div v-if="selected_view === 'doc'">
        <div class="mb-5">
          <BasicSelect
            style="max-width: 10rem"
            :options="docs_nav"
            v-model="doc_prev"
          />
        </div>

        <div class="markdown-renderer-wrapper">
          <div v-html="renderedMarkdown"></div>
        </div>
      </div>
      <div v-if="selected_view === 'eg'">
        <p class="fs-200 t-muted mb-1">Wybierz przyklad</p>
        <div class="flex mb-5">
          <BasicSelect
            style="min-width: 10rem"
            :options="sub_nav"
            v-model="eg_prev"
          />
        </div>
        <div class="grid grid-col-3 gap-5">
          <pre
            class="page-card fs-200 as-s"
            v-for="(k, i) in ex_preview"
          >
            
            <p class="t-accent">"{{ k }}":</p>
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
      margin-bottom: var(--space-5);
    }
    h1,
    h2,
    h3,
    strong {
      color: var(--text-accent) !important;
    }
    h4 {
      color: var(--negative) !important;
    }
    a {
      color: var(--positive);
    }

    table {
      border: 1px solid var(--border-default);
      border-radius: var(--radius-base);

      th,
      td {
        padding: var(--space-1) var(--space-2);
      }

      th:nth-of-type(2n),
      td:nth-of-type(2n) {
        background: var(--surface-base);
      }
    }
    code,
    li,
    blockquote {
      color: var(--text-secondary);
      font-size: var(--fs-200);
    }

    blockquote {
      padding: var(--space-1);
      background: var(--surface-base);
      border-radius: var(--radius-base);
    }
    code {
      border: 1px solid var(--border-default);
      border-radius: var(--radius-base);
      padding: var(--space-1);
      background: var(--surface-hover);
    }
    hr {
      border-bottom: 1px solid var(--border-default);
    }
  }
}
</style>
