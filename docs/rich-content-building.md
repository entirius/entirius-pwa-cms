# Rich Content Building

## Overview

Rich content is the structured JSON that powers CMS pages. The system has three layers:

1. **Config JSON** (`__client_default/` or `__client/`) — defines available section/tile types, props, and config options
2. **CMS Builder UI** (Vue 3) — editor reads configs, presents section/tile pickers, writes content JSON to Django
3. **Storefront Components** (Nuxt 3) — reads Published content JSON, renders `Section-{core_type}` and `Tile-{core_type}` components

The config system is **elastic** — clients can define any number of section and tile types. The default set ships 17 sections and 13 tiles, but this is just a starting point. See [CMS Configuration](https://docs.entirius.com/volkanos/modules/contentdb/cms-config/) for how to add or modify types.

## Content JSON Structure

Every page's `content` JSONField has four keys:

```json
{
  "document_configs": {},
  "sections": {
    "section-uuid-1": {
      "core_type": "section-hero-slider",
      "width": "full_width",
      "title": "Section heading"
    }
  },
  "tiles": {
    "tile-uuid-1": {
      "core_type": "tile-hero",
      "title": "Welcome",
      "description": "<p>Hero body text</p>",
      "dye": 3,
      "tile_align": "left",
      "images_set": {
        "desktop": { "uid": "...", "image": "url", "width": 1920, "height": 800 },
        "mobile": { "uid": "...", "image": "url", "width": 750, "height": 1000 }
      },
      "custom_buttons": [
        { "label": "Shop now", "url": "/c/furniture", "type": "internal" }
      ]
    }
  },
  "tiles_order": {
    "section-uuid-1": ["tile-uuid-1"]
  },
  "sections_order": ["section-uuid-1"]
}
```

`document_configs` stores page-level settings. `sections` and `tiles` use UUID keys. `sections_order` and `tiles_order` control rendering sequence.

## Default Section Types

The default `__core_config.json` ships 17 section types. All available for `static-page`, `blog-post`, `product-rich-content`, and `category-rich-content` document types. Clients can add, remove, or modify these via `__client/` overrides.

### Hero and Banner

| Type | Label | Configs | Notes |
|------|-------|---------|-------|
| `section-hero-slider` | Hero slider | width | Full-screen hero carousel. Tiles: `tile-hero` |
| `section-mini-banner` | Mini banner | width, margin | Compact banner with image. No tiles (images_set on section) |
| `section-banner` | Banner | width, tile_align, margin, dye, banner_type | Large banner with optional video. No tiles (max_tiles: 0) |

### Content

| Type | Label | Max tiles | Configs | Notes |
|------|-------|-----------|---------|-------|
| `section-content-slider` | Content slider | 24 | dye, grid_mobile (1-3), grid_desktop (2-6) | Carousel/grid of content cards. Tiles: `tile-img-btn` |
| `section-image-text` | Image & text | 2 | width, margin | Side-by-side image + text. Tiles: `tile-image`, `tile-video`, `tile-txt-btn` |
| `section-image-grid` | Image grid | 6 | dye, grid_mobile (1-2), grid_desktop (2-6) | Image tile grid. Tiles: `tile-img-btn` |
| `section-text` | Text | 3 | dye, grid_mobile (1-2), grid_desktop (1-3) | Text content blocks. Tiles: `tile-txt-btn` |

### Products

| Type | Label | Configs | Notes |
|------|-------|---------|-------|
| `section-product-slider-category` | Product slider (category) | grid (grid/slider) | Displays products from a category. Uses `custom_field` for category url-key. No manual tiles (max_tiles: 0) |
| `section-product-slider-via-sku` | Product slider (via sku) | grid (grid/slider) | Displays specific products by SKU. Tiles: `tile-product` |

### Interactive

| Type | Label | Max tiles | Configs | Notes |
|------|-------|-----------|---------|-------|
| `section-accordion` | Accordion | 1 | dye | Expandable FAQ. Tiles: `tile-accordion` (with group-fields) |
| `section-table` | Table | 1 | — | Data table layout. Tiles: `tile-text` |
| `section-form` | Form | — | — | Contact/product/advices form. Tiles: `tile-form` |
| `section-video` | Video | 2 | — | Embedded video. Tiles: `tile-img-btn` |

### Special

| Type | Label | Max tiles | Configs | Notes |
|------|-------|-----------|---------|-------|
| `section-icon-grid` | Icon grid | 6 | dye | Icons with title + description. Tiles: `tile-title-desc-img` |
| `section-testimonial` | Testimonial | — | — | Customer testimonials. Tiles: `tile-testimonial` |
| `section-chart` | Chart | — | — | Percentage charts. Tiles: `tile-chart` |
| `section-blog` | Blog | — | — | Blog post cards. Uses `blog_section` group-field for post routes |

## Default Tile Types

The default config ships 13 tile types. Each tile is variant-locked to specific section types.

| Type | Label | Parent Sections | Key Props |
|------|-------|-----------------|-----------|
| `tile-hero` | Hero tile | hero-slider | title, description, images_set, dye, tile_align, custom_buttons, custom_field, video_url, product_sku |
| `tile-img-btn` | Image + button | content-slider, image-grid, video | images_set, custom_buttons |
| `tile-txt-btn` | Text + button | image-text, text | title, description, dye (image-text only), custom_buttons |
| `tile-image` | Image | image-text | images_set |
| `tile-video` | Video | image-text | video_field |
| `tile-text` | Text | table | description |
| `tile-accordion` | Tile accordion | accordion | accordion_tile (group-fields: label + wysiwyg, max 15) |
| `tile-title-desc-img` | Title + desc + img | icon-grid | title, description, images_set |
| `tile-product` | Product (sku) | product-slider-via-sku | sku |
| `tile-testimonial` | Testimonial tile | testimonial | title, description, author, images_set |
| `tile-chart` | Chart tile | chart | title, description, chart_tile (group-fields: label + percent, max 15) |
| `tile-blog-extension` | Tile blog | Any (blog-post doc_type) | title, description, images_set, custom_buttons, rating (1-5), number_of_reviews |
| `tile-form` | Tile form | form | title, form_type, button_text, header_area, footer_area, form_tile (group-fields), consents (group-fields) |

**Note:** `tile-video` is defined in CMS config but has no storefront component yet. The storefront registers 12 tile components.

## Dye System

Dye controls two separate things depending on context:

**Section dyes** — background color via `--cms-dye-{N}` tokens. These auto-adapt between light and dark themes.

**Image overlay dyes** — text color on tiles with background images (tile-hero, banner, hero-slider). These are hardcoded and theme-stable — text on photographs must stay readable regardless of theme.

| Dye | Section background (tokenized) | Image overlay text (hardcoded) |
|-----|-------------------------------|-------------------------------|
| 1 | `--cms-dye-1` (white / dark surface) | `#fff` — white text for dark images |
| 2 | `--cms-dye-2` (blue tint / dark blue) | `#374151` — grey text |
| 3 | `--cms-dye-3` (off-white / dark surface) | `#121317` — dark text for light images |
| 4 | `--cms-dye-4` (warm accent) | N/A (not used on image overlays) |
| 5 | `--cms-dye-5` (cool grey) | N/A (not used on image overlays) |

### Section dye support

Dye 1-5: content-slider, image-grid, text, accordion, icon-grid

Dye 1-3 only: banner (no dye 4-5)

### Tile dye support

Dye 1-3: tile-hero, tile-txt-btn (in image-text section only)

Dye 4-5: tile-txt-btn (in image-text section only, no tile-hero)

### Dark mode

Section dyes auto-adapt via `--cms-dye-*` tokens (see table below). Image overlay text colors do NOT change with theme — they are hardcoded to stay readable on photographs in both modes.

### Common mistake

Hero/banner without dye renders white text (dye-1 default). On a light-colored photo this is invisible. Set `dye: 3` for light images or `dye: 1` for dark images.

## CMS Tokens

CMS sections use dedicated tokens for section backgrounds, button states, and link hovers. Defined in `main.scss`, auto-adapt between themes.

| Token | Light | Dark | Role |
|-------|-------|------|------|
| `--cms-dye-1` | `#ffffff` | `var(--c-basic-200)` | Section bg: white / dark surface |
| `--cms-dye-2` | `#d8e2ff` | `#161d2e` | Section bg: blue tint |
| `--cms-dye-3` | `#f7f9fc` | `var(--c-basic-200)` | Section bg: off-white / dark surface |
| `--cms-dye-4` | `#d9bcb1` | `#2a2019` | Section bg: warm accent |
| `--cms-dye-5` | `#edeef3` | `#1a1c28` | Section bg: cool grey |
| `--cms-outline-color` | `var(--c-primary-200)` | `var(--c-basic-600)` | Outline button color + border |
| `--cms-outline-hover` | `#354080` | `var(--c-basic-700)` | Outline button hover |
| `--cms-btn-hover` | `#474953` | `var(--c-basic-700)` | Text button hover |
| `--cms-link-hover` | `#747578` | `var(--c-basic-800)` | Wysiwyg link hover |

CMS heading and paragraph text uses `var(--c-basic-900)` which self-inverts between themes — no dedicated CMS text token needed.

Override dye backgrounds per client in `__brand/theme.scss`:

```scss
[data-theme="default"] {
  --cms-dye-2: #f0e6ff;  /* lavender instead of blue tint */
}
[data-theme="dark"] {
  --cms-dye-2: #1a1230;  /* dark lavender */
}
```


## Config Options Reference

### width
`container` or `full_width`. Available on: hero-slider, banner, mini-banner, image-text.

### variant
Section visual style (1-4). Available on all sections. No variant matching conditions — always shown.

### tile_align
`left` or `right`. Positions CTA content. Available on: banner (section), tile-hero (tile).

### margin
`"true"` or `"false"` (string values). Controls section spacing. Available on: banner, mini-banner, image-text.

### banner_type
`video` or `banner`. Available on: banner section only.

### grid / grid_mobile / grid_desktop
Layout controls for grid/slider sections:
- `grid`: `grid` or `slider` — product-slider-category, product-slider-via-sku
- `grid_mobile`: `1`, `2`, or `3` — content-slider, image-grid, text (text: 1-2 only)
- `grid_desktop`: `1`-`6` — content-slider (2-6), image-grid (2-4,6), text (1-3)

### form_type
`contact`, `advices`, or `product`. Available on: tile-form only.

### rating
`1`-`5` stars. Available on: tile-blog-extension only.

## Custom Buttons

Array of button objects. Type `group-fields` with `simple_button` options.

```json
"custom_buttons": [
  { "label": "Shop now", "url": "/c/furniture", "type": "internal" },
  { "label": "Learn more", "url": "https://example.com", "type": "external" }
]
```

Max 1 button per group entry. Storefront renders `internal` -> `router.push`, `external` -> `window.location`.

**Section support:** content-slider, product-slider-via-sku, product-slider-category, banner, mini-banner, image-grid, accordion, table, blog

**Tile support:** tile-hero, tile-img-btn, tile-txt-btn, tile-blog-extension

## Images

`images_set` stores desktop and mobile image references:

```json
"images_set": {
  "desktop": { "uid": "uuid", "image": "https://...", "width": 1920, "height": 800 },
  "mobile": { "uid": "uuid", "image": "https://...", "width": 750, "height": 1000 }
}
```

Upload via admin API: `POST /api-admin/contentdb/v1/images/`. The storefront normalizes images with `builderImgNormalizer`.

**Section support:** banner, mini-banner

**Tile support:** tile-hero, tile-img-btn, tile-image, tile-title-desc-img, tile-testimonial, tile-blog-extension

Without images, hero tiles render an empty aspect-ratio box.

## Group Fields

Complex props using `group-fields` type with repeatable field groups.

| Group | Fields | Max | Used by |
|-------|--------|-----|---------|
| `accordion_tile` | label (text), wysiwyg (wysiwyg) | 15 | tile-accordion |
| `chart_tile` | label (text), percent (text) | 15 | tile-chart |
| `form_tile` | type (dropdown, 11 field types), own_name (text) | 15 | tile-form |
| `consents` | consent (wysiwyg) | 15 | tile-form |
| `blog_section` | label (text — blog post route) | 3 | section-blog |
| `simple_button` | label (text), url (text), type (internal/external) | 1 | See Custom Buttons |

### Form field types

title, email, name, number, category-shop, category-blog, model, message-content, datapicker, advice-content, attachment

## Common Patterns

### Homepage with hero + text

```json
{
  "document_configs": {},
  "sections": {
    "s1": { "core_type": "section-hero-slider", "width": "full_width" },
    "s2": { "core_type": "section-text", "dye": 3, "grid_desktop": "2", "grid_mobile": "1" }
  },
  "tiles": {
    "t1": { "core_type": "tile-hero", "title": "Welcome", "description": "<p>Hero text</p>", "dye": 3 },
    "t2": { "core_type": "tile-txt-btn", "title": "About Us", "description": "<p>Content</p>" },
    "t3": { "core_type": "tile-txt-btn", "title": "Services", "description": "<p>Content</p>" }
  },
  "tiles_order": { "s1": ["t1"], "s2": ["t2", "t3"] },
  "sections_order": ["s1", "s2"]
}
```

### FAQ page with accordion

```json
{
  "sections": { "s1": { "core_type": "section-accordion", "dye": 3 } },
  "tiles": {
    "t1": {
      "core_type": "tile-accordion",
      "accordion_tile": [
        { "label": "How do I order?", "wysiwyg": "<p>Place items in cart...</p>" },
        { "label": "What is the return policy?", "wysiwyg": "<p>30-day returns...</p>" }
      ]
    }
  },
  "tiles_order": { "s1": ["t1"] },
  "sections_order": ["s1"]
}
```

### Contact page with form

```json
{
  "sections": { "s1": { "core_type": "section-form" } },
  "tiles": {
    "t1": {
      "core_type": "tile-form",
      "title": "Contact Us",
      "form_type": "contact",
      "button_text": "Send",
      "form_tile": [
        { "type": "name", "own_name": "" },
        { "type": "email", "own_name": "" },
        { "type": "message-content", "own_name": "" }
      ],
      "consents": [
        { "consent": "<p>I agree to the privacy policy</p>" }
      ]
    }
  },
  "tiles_order": { "s1": ["t1"] },
  "sections_order": ["s1"]
}
```

## CMS Config to Storefront Rendering Pipeline

### 1. Config initialization

`__client_default/` contains committed skeleton configs. On `npm run serve` or `npm run build`, `scripts/init-client.js` copies **only missing** files to `__client/`. Existing `__client/` files are preserved.

### 2. CMS Builder loads configs

Builder.vue loads configs via dynamic `import()`. The variant matching system (`useVariantMatching`) filters available options:

- `checkCoresDependency` — filters section/tile types by document type
- `checkPropsDependency` — filters props by current section/tile core_type

Variant format: `["prop:value"]` arrays. Arrays within the outer array are OR conditions. Strings within an inner array are AND conditions.

### 3. Content saved to Django

CMS saves the content JSON to a Content record, linked via Draft. Publishing creates a Published snapshot (separate Content copy).

### 4. Storefront fetches and renders

```
builder.js store -> fetch_content({slug, lang, type})
  -> $bma.GET._PublishedDocs({routes, type, language})
    -> /api/contentdb/v1/published/{type}/?routes={slug}&language={lang}
      -> Content JSON
        -> Builder-View iterates sections_order
          -> Section-{core_type} component (kebab-to-PascalCase)
            -> Tile-{core_type} component per tiles_order entry
```

No slug defaults to `home`.

### Component registry

The storefront maps `core_type` values to Vue components via kebab-to-PascalCase:
- `section-hero-slider` -> `SectionHeroSlider`
- `tile-hero` -> `TileHero`

Components registered in `Sections/index.js` and `Tiles/index.js`. To add a new type, create the component and register it there.

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| Hero text invisible | No dye set (white text on white) | Set `dye: 3` (dark text) or `dye: 1` (white text on dark bg) |
| CMS shows no section types | Stale `__client/` config | Delete `__client/` and restart dev server |
| Config change not reflected | Dynamic `import()` cached | Restart dev server |
| Storefront blank page | Language mismatch | Ensure API `language` matches storefront `i18n.defaultLocale` |
| `document_configs` missing | Old content format | Add `"document_configs": {}` to content JSON |
| Variant matching fails silently | Typo in `"prop:value"` string | Check exact format — must match config values exactly |
| Section shows wrong tiles | Missing variant condition | Verify tile's `variants` includes the parent section core_type |
