#!/usr/bin/env node
// P5 page-frame codemod (plan 25, docs/ui-rules.md R4): the page wrapper + bordered page card pair becomes PageLayout,
//   <div class="page-pad fs-300 t-body h-100 ov-h">        <PageLayout class="fs-300 t-body">
//     <div class="page-card h-100 ovy-auto">                 <template #header>
//       <PageHeader :title="…" class="mb-10" />                <PageHeader :title="…" />
//       <div class="flex ai-ct mb-10">…search…</div>   →      </template>
//       …                                                      <template #toolbar>…</template>
//     </div>                                                   …
//   </div>                                                   </PageLayout>
// A card without the wrapper (the template root) becomes the PageLayout itself. The PageHeader (Teleports before it
// skipped) and the search/filter row right after it move into their slots only as unconditional children of the card;
// PageLayout's gap replaces their `mb-*`. A card under v-if / v-else-if / v-else keeps the condition on a <template>.
// Markup inside the card keeps its bytes (and its indentation). Flagged for hand work: every other `.page-card`
// (nested cards, extra classes or attributes, a parent other than the page wrapper) and a PageLayout whose PageHeader
// sits outside `#header` (a v-if or a loader branch: the condition moves onto the slot).
// Home and Gallery belong to plans 26 and 29: skipped. CLI: see p3-lib.mjs.
import { pathToFileURL } from "node:url";
import {
  collector,
  contentChildren,
  findAttr,
  lineIndent,
  parseSfc,
  removeNode,
  runCodemod,
  sourceOf,
  staticClasses,
  walkTemplate,
} from "./p3-lib.mjs";

const WRAPPER_CLASSES = ["page-pad", "h-100", "ov-h"];
const CARD_HEIGHTS = ["h-100", "flex-1"];
const CONDITIONS = ["if", "else-if", "else"];
const TOOLBAR_CONTROLS = ["BasicInput", "FilterChip", "MobileFilterPanel"];
const SPACING = /^mb-\d+$/;

export const isExcluded = (file) => file.startsWith("src/views/Home/") || file === "src/views/Gallery.vue";

const isElement = (node, name) => node?.type === "VElement" && (!name || node.rawName === name);
const directiveOf = (attr) => (attr.directive ? attr.key.name.name : null);
const findDirective = (node, names) => node.startTag.attributes.find((attr) => names.includes(directiveOf(attr)));
const isStaticClass = (attr) => !attr.directive && attr.key.name === "class";
const hasClasses = (node, classes) => classes.every((name) => staticClasses(node).includes(name));
const isPageCard = (node) => isElement(node) && staticClasses(node).includes("page-card");

// `page-card ovy-auto` + one height class, nothing else but a static class and a condition.
function isFrameCard(card) {
  const classes = staticClasses(card);
  const heights = classes.filter((name) => CARD_HEIGHTS.includes(name));
  const attrsOk = card.startTag.attributes.every((attr) => isStaticClass(attr) || CONDITIONS.includes(directiveOf(attr)));
  return classes.length === 3 && heights.length === 1 && hasClasses(card, ["page-card", "ovy-auto"]) && attrsOk;
}

// The page wrapper around the card, `undefined` for a card that is the template root, `null` for any other parent.
function wrapperOf(card, root) {
  if (card.parent === root) return undefined;
  const wrapper = card.parent;
  const isWrapper = isElement(wrapper, "div") && wrapper.parent === root && hasClasses(wrapper, WRAPPER_CLASSES);
  return isWrapper && !findDirective(wrapper, [...CONDITIONS, "show", "for"]) ? wrapper : null;
}

// Start tag of the PageLayout: the frame's attributes in order, its class without the classes PageLayout owns.
function layoutTag(text, frame) {
  const owned = [...WRAPPER_CLASSES, "page-card", "ovy-auto", ...CARD_HEIGHTS];
  const attrs = frame.startTag.attributes.map((attr) => {
    if (!isStaticClass(attr)) return sourceOf(text, attr);
    const kept = staticClasses(frame).filter((name) => !owned.includes(name));
    return kept.length ? `class="${kept.join(" ")}"` : "";
  });
  return ["<PageLayout", ...attrs.filter(Boolean)].join(" ") + ">";
}

// Source of a node that moves into a slot, without its `mb-*` (PageLayout's gap spaces the slots); `shift` indents
// its continuation lines when the slot sits one level deeper than the node did.
function movedSource(text, node, shift) {
  return withoutSpacing(text, node).replace(/\n(?!\n)/g, `\n${shift}`);
}

function withoutSpacing(text, node) {
  const source = sourceOf(text, node);
  const attr = findAttr(node, "class", false);
  if (!attr) return source;
  const kept = staticClasses(node).filter((name) => !SPACING.test(name));
  let start = attr.range[0] - node.range[0];
  if (!kept.length) while (/\s/.test(source[start - 1])) start -= 1;
  const replacement = kept.length ? `class="${kept.join(" ")}"` : "";
  return source.slice(0, start) + replacement + source.slice(attr.range[1] - node.range[0]);
}

function hasDescendant(node, names) {
  return (node.children ?? []).some((child) => isElement(child) && (names.includes(child.rawName) || hasDescendant(child, names)));
}

const isUnconditional = (node) => !findDirective(node, [...CONDITIONS, "show", "for"]);

function isToolbar(node) {
  if (!isElement(node, "div") || !isUnconditional(node)) return false;
  return staticClasses(node).some((name) => name.endsWith("__toolbar")) || hasDescendant(node, TOOLBAR_CONTROLS);
}

// The card's PageHeader (Teleports before it skipped) and the toolbar row right after it, when unconditional.
function slotNodes(card) {
  const children = contentChildren(card).filter((child) => !isElement(child, "Teleport"));
  const [first, second] = children;
  const header = isElement(first, "PageHeader") && isUnconditional(first) ? first : null;
  const toolbar = header && isToolbar(second) ? second : null;
  return { header, toolbar };
}

// `<template #header>…</template>` and `<template #toolbar>…</template>` at `indent`; the nodes leave the card.
function slotTemplates(text, card, indent, result, shift = "") {
  const { header, toolbar } = findDirective(card, CONDITIONS) ? {} : slotNodes(card);
  const slot = (name, node) => `<template #${name}>\n${indent}  ${movedSource(text, node, shift)}\n${indent}</template>`;
  const slots = [header && slot("header", header), toolbar && slot("toolbar", toolbar)].filter(Boolean);
  [header, toolbar].filter(Boolean).forEach((node) => removeNode(text, node, result));
  return slots.join(`\n${indent}`);
}

// Wrapper + card: the wrapper becomes the PageLayout, the card leaves (a conditional one turns into a <template>).
function rewriteWrapped(text, card, wrapper, result) {
  const condition = findDirective(card, CONDITIONS);
  const slots = slotTemplates(text, card, lineIndent(text, card.range[0]), result);
  result.edit(wrapper.startTag.range[0], wrapper.startTag.range[1], layoutTag(text, wrapper));
  result.edit(wrapper.endTag.range[0], wrapper.endTag.range[1], "</PageLayout>");
  if (condition) {
    result.edit(card.startTag.range[0], card.startTag.range[1], `<template ${sourceOf(text, condition)}>`);
    result.edit(card.endTag.range[0], card.endTag.range[1], "</template>");
  } else {
    if (slots) result.edit(card.startTag.range[0], card.startTag.range[1], slots);
    else removeNode(text, card.startTag, result);
    removeNode(text, card.endTag, result);
  }
}

// Card as the template root: the card itself becomes the PageLayout.
function rewriteRoot(text, card, result) {
  const indent = `${lineIndent(text, card.range[0])}  `;
  const slots = slotTemplates(text, card, indent, result, "  ");
  result.edit(card.startTag.range[0], card.startTag.range[1], layoutTag(text, card) + (slots && `\n${indent}${slots}`));
  result.edit(card.endTag.range[0], card.endTag.range[1], "</PageLayout>");
}

const insideCard = (node) => isElement(node) && (isPageCard(node) || insideCard(node.parent));

function cardFlag(card, wrapper) {
  if (insideCard(card.parent) || !staticClasses(card).includes("ovy-auto")) {
    return "nested or standalone card: BasicCard (or no card) by hand";
  }
  if (wrapper === null) return "page card outside the page wrapper: frame by hand";
  return "page card with extra classes or attributes: frame by hand";
}

function visitCard(text, card, root, result) {
  const wrapper = wrapperOf(card, root);
  const flag = !isFrameCard(card) || wrapper === null || insideCard(card.parent);
  if (flag) result.flag(card, cardFlag(card, wrapper));
  else if (wrapper) rewriteWrapped(text, card, wrapper, result);
  else rewriteRoot(text, card, result);
}

const isHeaderSlot = (node) =>
  isElement(node, "template") &&
  node.startTag.attributes.some((attr) => directiveOf(attr) === "slot" && attr.key.argument?.name === "header");

// A PageHeader inside a PageLayout but outside its `#header` slot.
function strayHeader(node) {
  for (let parent = node.parent; isElement(parent); parent = parent.parent) {
    if (isHeaderSlot(parent)) return false;
    if (isElement(parent, "PageLayout")) return true;
  }
  return false;
}

export function transform(text, file) {
  if (isExcluded(file)) return { edits: [], flags: [] };
  const result = collector();
  const ast = parseSfc(text);
  walkTemplate(ast, (node) => {
    if (isPageCard(node)) visitCard(text, node, ast.templateBody, result);
    if (isElement(node, "PageHeader") && strayHeader(node)) {
      result.flag(node, "PageHeader outside #header: move it by hand, the condition onto the slot");
    }
  });
  return { edits: result.edits, flags: result.flags };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) runCodemod("p5-page-frame", transform);
