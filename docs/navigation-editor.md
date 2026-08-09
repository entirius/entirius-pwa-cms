# Navigation Editor

## What It Is

Layout extenders are header and footer navigation documents stored as ContentDB `layout-extender` content type. Each document can be a header or footer subtype, and belongs to a channel (storefront) or is global (visible to all channels).

The Navigation Editor is the Builder view filtered to layout-extender content type. Same config system, same sections and tiles — just a different content type with navigation-specific tile types.

## Channel Assignment

Each layout extender document can be assigned to one or more channels via the channel dropdown in the editor toolbar. The storefront loads the header/footer matching its active channel.

In list view, documents show channel badges. A "Channels" filter dropdown narrows the list.

## Building a Mega Menu

Navigation items are tiles within sections. Each tile has:

- **Label** — display text
- **Link type** — category (PIM), page (ContentDB), or external URL
- **Display mode** — simple link or mega menu column

Mega menu tiles support up to 4 columns. Each column holds links and an optional banner (image from gallery, caption, button, media URL).

## Entity Picker Channel Gating

PIM catalog is channel-scoped — the category and product pickers need to know which catalog to search.

The rule:

| Channels assigned | Picker state | Reason |
|---|---|---|
| 0 (global) | Disabled — "Assign a channel to browse products" | No catalog context |
| 1 | Active — searches that channel's PIM catalog | Unambiguous |
| 2+ | Disabled — "Narrow to one channel to browse products" | Ambiguous catalog |

Manual input (plain text SKU or category idx) is always available as fallback, regardless of picker state.

## SKU Picker in Builder Tiles

The same channel gating rule applies to `product_sku` and `sku` fields in tile configs (e.g., tile-hero, product spotlight tiles).

When active, the picker searches PIM products by name or SKU. Selected SKU is stored in the tile content JSON — the same value you would type manually.

When disabled (0 or 2+ channels), an info message explains why, and the manual SKU input remains functional.

## Publishing

- **Save Draft** — persists the document without making it live
- **Save and Publish** — makes the document visible on the storefront immediately
- Draft documents are not served by the public ContentDB API
