import { createRouter, createWebHistory } from "vue-router";

import { useUserStore } from "@/stores/user";
import { useMuninStore } from "@/stores/munin";
import { useAccessStore } from "@/stores/access";
import { panels } from "@/configs/access";
import { buildNavRoutes } from "@/components/Navigation/nav-routes";

import Home from "../views/Home/index.vue";
import rv_builds from "../views/Builder/index.vue";
import Builds from "../views/Builder/Builds.vue";
import Builder from "../views/Builder/Builder.vue";

const routes = [
  {
    path: "/",
    name: "Home",
    component: Home,
    meta: {
      requiresAuth: true,
      titleKey: "nav.home",
    },
  },
  {
    // Component catalogue (plan 10): any logged-in operator, no panel, in no nav, in every build.
    path: "/ui",
    name: "UiCatalogue",
    component: () =>
      import(/* webpackChunkName: "ui-catalogue" */ "../views/UiCatalogue/index.vue"),
    meta: {
      requiresAuth: true,
      titleKey: "nav.ui_catalogue",
    },
  },
  {
    path: "/pages/gallery",
    name: "Gallery",
    component: () =>
      import(/* webpackChunkName: "about" */ "../views/Gallery.vue"),
    meta: {
      requiresAuth: true,
      titleKey: "nav.gallery",
      panel: "pages",
      area: "content.media",
    },
  },
  {
    path: "/pages/content-sets",
    name: "ContentSets",
    component: () =>
      import(/* webpackChunkName: "about" */ "../views/ContentSets/index.vue"),
    meta: {
      requiresAuth: true,
      titleKey: "nav.content_sets",
      panel: "pages",
      area: "content.schema",
    },
  },
  {
    path: "/pages/doc",
    name: "Doc",
    component: () =>
      import(/* webpackChunkName: "about" */ "../views/Docs/index.vue"),
    meta: {
      requiresAuth: true,
      titleKey: "nav.docs",
      panel: "pages",
    },
  },
  // Authors (must be before /pages/:content_type wildcard)
  {
    path: "/pages/authors",
    component: () => import("../views/Authors/index.vue"),
    meta: { requiresAuth: true, panel: "pages" },
    children: [
      {
        path: "",
        name: "AuthorList",
        component: () => import("../views/Authors/AuthorList.vue"),
        meta: { requiresAuth: true, titleKey: "authors.title", panel: "pages", area: "content.pages" },
      },
      {
        path: "create",
        name: "AuthorCreate",
        component: () => import("../views/Authors/AuthorEdit.vue"),
        meta: { requiresAuth: true, titleKey: "authors.create", panel: "pages", area: "content.pages" },
      },
      {
        path: ":uid",
        name: "AuthorDetail",
        component: () => import("../views/Authors/AuthorEdit.vue"),
        meta: { requiresAuth: true, titleKey: "authors.edit", panel: "pages", area: "content.pages" },
      },
    ],
  },

  // Layout Extenders (must be before /pages/:content_type wildcard)
  {
    path: "/pages/layout-extender",
    component: () => import("../views/LayoutExtenders/index.vue"),
    meta: { requiresAuth: true, panel: "pages" },
    children: [
      {
        path: "",
        name: "LayoutExtenders",
        component: () => import("../views/LayoutExtenders/LayoutExtenderList.vue"),
        meta: { requiresAuth: true, titleKey: "layout_extender.list_title", panel: "pages", area: "content.pages" },
      },
      {
        path: ":type/:uid?",
        name: "NavigationEditor",
        component: () => import("../views/LayoutExtenders/NavigationEditor.vue"),
        meta: { requiresAuth: true, titleKey: "layout_extender.title", panel: "pages", area: "content.pages" },
      },
    ],
  },

  {
    path: "/pages/:content_type",
    component: rv_builds,
    meta: {
      panel: "pages",
    },
    children: [
      {
        path: "",
        name: "Builds",
        component: Builds,
        params: true,
        meta: {
          requiresAuth: true,
          titleKey: "nav.content_list",
          panel: "pages",
          area: "content.pages",
        },
      },
      {
        path: ":type/:uid?",
        name: "Builder",
        component: Builder,
        params: true,
        meta: {
          requiresAuth: true,
          titleKey: "nav.content_list",
          panel: "pages",
          area: "content.pages",
        },
      },
    ],
  },

  // PIM panel
  {
    path: "/pim",
    component: () =>
      import(/* webpackChunkName: "pim" */ "../views/Pim/index.vue"),
    meta: {
      requiresAuth: true,
      panel: "pim",
    },
    children: [
      {
        path: "",
        redirect: "/pim/products",
      },
      {
        path: "products",
        name: "PimProducts",
        component: () =>
          import(/* webpackChunkName: "pim" */ "../views/Pim/ProductList.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "pim.products",
          panel: "pim",
          area: "pim.products",
        },
      },
      {
        path: "products/create",
        name: "PimProductCreate",
        component: () =>
          import(/* webpackChunkName: "pim" */ "../views/Pim/ProductCreate.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "pim.create_product",
          panel: "pim",
          area: "pim.products",
        },
      },
      {
        path: "products/:sku(.*)",
        name: "PimProductDetail",
        component: () =>
          import(/* webpackChunkName: "pim" */ "../views/Pim/ProductDetail.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "pim.product_detail",
          panel: "pim",
          area: "pim.products",
        },
      },
      {
        path: "categories",
        name: "PimCategories",
        component: () =>
          import(/* webpackChunkName: "pim" */ "../views/Pim/CategoryList.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "pim.categories",
          panel: "pim",
          area: "pim.categories",
        },
      },
      {
        path: "categories/create",
        name: "PimCategoryCreate",
        component: () =>
          import(/* webpackChunkName: "pim" */ "../views/Pim/CategoryCreate.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "pim.create_category",
          panel: "pim",
          area: "pim.categories",
        },
      },
      {
        path: "categories/:idx",
        name: "PimCategoryDetail",
        component: () =>
          import(/* webpackChunkName: "pim" */ "../views/Pim/CategoryDetail.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "pim.category_detail",
          panel: "pim",
          area: "pim.categories",
        },
      },
      {
        path: "feature-sets",
        name: "PimFeatureSets",
        component: () =>
          import(/* webpackChunkName: "pim" */ "../views/Pim/FeatureSetList.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "pim.feature_sets",
          panel: "pim",
          area: "pim.schema",
        },
      },
      {
        path: "feature-sets/:idx",
        name: "PimFeatureSetDetail",
        component: () =>
          import(/* webpackChunkName: "pim" */ "../views/Pim/FeatureSetEdit.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "pim.feature_set_detail",
          panel: "pim",
          area: "pim.schema",
        },
      },
      {
        path: "features",
        name: "PimFeatures",
        component: () =>
          import(/* webpackChunkName: "pim" */ "../views/Pim/FeatureList.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "pim.features",
          panel: "pim",
          area: "pim.schema",
        },
      },
      // Quality rules (etap-06) — soft-compat: the views self-guard when the backend
      // lacks the gaps API (404 → redirect to products).
      {
        path: "gap-definitions",
        name: "PimGapDefinitions",
        component: () =>
          import(/* webpackChunkName: "pim" */ "../views/Pim/GapDefinitionList.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "pim.gap_definitions",
          panel: "pim",
          area: "pim.quality",
        },
      },
      {
        path: "gap-definitions/create",
        name: "PimGapDefinitionCreate",
        component: () =>
          import(/* webpackChunkName: "pim" */ "../views/Pim/GapDefinitionEdit.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "pim.create_gap_definition",
          panel: "pim",
          area: "pim.quality",
        },
      },
      {
        path: "gap-definitions/:key",
        name: "PimGapDefinitionDetail",
        component: () =>
          import(/* webpackChunkName: "pim" */ "../views/Pim/GapDefinitionEdit.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "pim.gap_definition_detail",
          panel: "pim",
          area: "pim.quality",
        },
      },
      {
        path: "features/:idx",
        name: "PimFeatureDetail",
        component: () =>
          import(/* webpackChunkName: "pim" */ "../views/Pim/FeatureEdit.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "pim.feature_detail",
          panel: "pim",
          area: "pim.schema",
        },
      },
    ],
  },

  // Points panel
  {
    path: "/points",
    component: () =>
      import(/* webpackChunkName: "points" */ "../views/Points/index.vue"),
    meta: {
      requiresAuth: true,
      panel: "points",
    },
    children: [
      {
        path: "",
        redirect: "/points/list",
      },
      {
        path: "list",
        name: "PointsList",
        component: () =>
          import(/* webpackChunkName: "points" */ "../views/Points/PointList.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "dp.points",
          panel: "points",
          area: "deliverypoints.points",
        },
      },
      {
        path: "create",
        name: "PointCreate",
        component: () =>
          import(/* webpackChunkName: "points" */ "../views/Points/PointEdit.vue"),
        meta: {
          navParent: "/points/list",
          requiresAuth: true,
          titleKey: "dp.create_point",
          panel: "points",
          area: "deliverypoints.points",
        },
      },
      {
        path: "types",
        name: "PointTypes",
        component: () =>
          import(/* webpackChunkName: "points" */ "../views/Points/TypeList.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "dp.types",
          panel: "points",
          area: "deliverypoints.points",
        },
      },
      // Import disabled — use manage.py import_deliverypoints instead
      // {
      //   path: "import",
      //   name: "PointImport",
      //   component: () =>
      //     import(/* webpackChunkName: "points" */ "../views/Points/ImportDialog.vue"),
      //   meta: {
      //     requiresAuth: true,
      //     titleKey: "dp.import",
      //     panel: "points",
      //   },
      // },
      {
        path: ":id",
        name: "PointDetail",
        component: () =>
          import(/* webpackChunkName: "points" */ "../views/Points/PointEdit.vue"),
        meta: {
          navParent: "/points/list",
          requiresAuth: true,
          titleKey: "dp.point_detail",
          panel: "points",
          area: "deliverypoints.points",
        },
      },
    ],
  },

  // Contact Forms panel
  {
    path: "/forms",
    component: () =>
      import(/* webpackChunkName: "forms" */ "../views/ContactForms/index.vue"),
    meta: {
      requiresAuth: true,
      panel: "forms",
    },
    children: [
      {
        path: "",
        redirect: "/forms/list",
      },
      {
        path: "list",
        name: "ContactFormList",
        component: () =>
          import(/* webpackChunkName: "forms" */ "../views/ContactForms/ContactFormList.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "cf.submissions",
          panel: "forms",
          area: "contact_forms.submissions",
        },
      },
      {
        path: "bookings",
        name: "BookingList",
        component: () =>
          import(/* webpackChunkName: "forms" */ "../views/ContactForms/BookingList.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "cf.bookings",
          panel: "forms",
          area: "contact_forms.submissions",
        },
      },
      {
        path: "bookings/:id",
        name: "BookingDetail",
        component: () =>
          import(/* webpackChunkName: "forms" */ "../views/ContactForms/BookingDetail.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "cf.booking_detail",
          panel: "forms",
          area: "contact_forms.submissions",
        },
      },
      {
        path: "leads",
        name: "LeadList",
        component: () =>
          import(/* webpackChunkName: "forms" */ "../views/ContactForms/LeadList.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "cf.leads",
          panel: "forms",
          area: "contact_forms.leads",
        },
      },
      {
        path: "leads/:id",
        name: "LeadDetail",
        component: () =>
          import(/* webpackChunkName: "forms" */ "../views/ContactForms/LeadDetail.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "cf.lead_detail",
          panel: "forms",
          area: "contact_forms.leads",
        },
      },
      {
        path: ":id",
        name: "ContactFormDetail",
        component: () =>
          import(/* webpackChunkName: "forms" */ "../views/ContactForms/ContactFormDetail.vue"),
        meta: {
          navParent: "/forms/list",
          requiresAuth: true,
          titleKey: "cf.submission_detail",
          panel: "forms",
          area: "contact_forms.submissions",
        },
      },
    ],
  },

  // Agreements panel
  {
    path: "/agreements",
    component: () =>
      import(/* webpackChunkName: "agreements" */ "../views/Agreements/index.vue"),
    meta: {
      requiresAuth: true,
      panel: "agreements",
    },
    children: [
      {
        path: "",
        redirect: "/agreements/list",
      },
      {
        path: "list",
        name: "AgreementList",
        component: () =>
          import(/* webpackChunkName: "agreements" */ "../views/Agreements/AgreementList.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "agm.definitions",
          panel: "agreements",
          area: "agreements.definitions",
        },
      },
      {
        path: "create",
        name: "AgreementCreate",
        component: () =>
          import(/* webpackChunkName: "agreements" */ "../views/Agreements/AgreementEdit.vue"),
        meta: {
          navParent: "/agreements/list",
          requiresAuth: true,
          titleKey: "agm.create_definition",
          panel: "agreements",
          area: "agreements.definitions",
        },
      },
      {
        path: "consents",
        name: "ConsentPeople",
        component: () =>
          import(/* webpackChunkName: "agreements" */ "../views/Agreements/ConsentPeople.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "agm.people_list",
          panel: "agreements",
          area: "agreements.consents",
        },
      },
      {
        path: "consents/:email",
        name: "ConsentPersonDetail",
        component: () =>
          import(/* webpackChunkName: "agreements" */ "../views/Agreements/ConsentPersonDetail.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "agm.person_detail",
          panel: "agreements",
          area: "agreements.consents",
        },
      },
      {
        path: ":slug",
        name: "AgreementDetail",
        component: () =>
          import(/* webpackChunkName: "agreements" */ "../views/Agreements/AgreementEdit.vue"),
        meta: {
          navParent: "/agreements/list",
          requiresAuth: true,
          titleKey: "agm.definition_detail",
          panel: "agreements",
          area: "agreements.definitions",
        },
      },
    ],
  },

  // Accounts panel
  {
    path: "/accounts",
    component: () =>
      import(/* webpackChunkName: "accounts" */ "../views/Accounts/index.vue"),
    meta: {
      requiresAuth: true,
      panel: "accounts",
    },
    children: [
      {
        path: "",
        redirect: "/accounts/customers",
      },
      {
        path: "customers",
        name: "CustomerList",
        component: () =>
          import(/* webpackChunkName: "accounts" */ "../views/Accounts/CustomerList.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "accounts.customers",
          panel: "accounts",
          area: "accounts.customers",
        },
      },
      {
        path: "customers/:uid",
        name: "CustomerDetail",
        component: () =>
          import(/* webpackChunkName: "accounts" */ "../views/Accounts/CustomerDetail.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "accounts.customer_detail",
          panel: "accounts",
          area: "accounts.customers",
        },
      },
    ],
  },

  // Checkout Orders panel
  {
    path: "/checkout-orders",
    component: () =>
      import(/* webpackChunkName: "checkout-orders" */ "../views/CheckoutOrders/index.vue"),
    meta: {
      requiresAuth: true,
      panel: "checkout",
    },
    children: [
      {
        path: "",
        redirect: "/checkout-orders/orders",
      },
      {
        path: "orders",
        name: "OrderList",
        component: () =>
          import(/* webpackChunkName: "checkout-orders" */ "../views/CheckoutOrders/OrderList.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "checkout_orders.orders",
          panel: "checkout",
          area: "checkout.orders",
        },
      },
      {
        path: "orders/:uid",
        name: "OrderDetail",
        component: () =>
          import(/* webpackChunkName: "checkout-orders" */ "../views/CheckoutOrders/OrderDetail.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "checkout_orders.order_detail",
          panel: "checkout",
          area: "checkout.orders",
        },
      },
    ],
  },

  // Emails panel
  {
    path: "/emails",
    component: () =>
      import(/* webpackChunkName: "emails" */ "../views/Emails/index.vue"),
    meta: {
      requiresAuth: true,
      panel: "emails",
    },
    children: [
      {
        path: "",
        name: "EmailsDashboard",
        component: () =>
          import(/* webpackChunkName: "emails" */ "../views/Emails/EmailsDashboard.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "emails.dashboard",
          panel: "emails",
          area: "email.templates",
        },
      },
      {
        path: "channels/:channelPk",
        name: "EmailChannelEdit",
        component: () =>
          import(/* webpackChunkName: "emails" */ "../views/Emails/EmailChannelEdit.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "emails.channel",
          panel: "emails",
          area: "email.templates",
        },
      },
      {
        path: "lang-configs/:pk",
        name: "EmailLangConfigEdit",
        component: () =>
          import(/* webpackChunkName: "emails" */ "../views/Emails/EmailLangConfigEdit.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "emails.lang_config",
          panel: "emails",
          area: "email.templates",
        },
      },
      {
        path: "templates/:emailType",
        name: "EmailTemplateList",
        component: () =>
          import(/* webpackChunkName: "emails" */ "../views/Emails/EmailTemplateList.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "emails.template_types",
          panel: "emails",
          area: "email.templates",
        },
      },
      {
        path: "templates/:emailType/:pk",
        name: "EmailTemplateEdit",
        component: () =>
          import(/* webpackChunkName: "emails" */ "../views/Emails/EmailTemplateEdit.vue"),
        meta: {
          crumbParent: "EmailTemplateList",
          requiresAuth: true,
          titleKey: "emails.edit_template",
          panel: "emails",
          area: "email.templates",
        },
      },
    ],
  },

  // FAQ panel
  {
    path: "/faq",
    component: () =>
      import(/* webpackChunkName: "faq" */ "../views/Faq/index.vue"),
    meta: {
      requiresAuth: true,
      panel: "faq",
    },
    children: [
      {
        path: "",
        redirect: "/faq/groups",
      },
      {
        path: "groups",
        name: "FaqGroups",
        component: () =>
          import(/* webpackChunkName: "faq" */ "../views/Faq/GroupList.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "faq.groups",
          panel: "faq",
          area: "faq.faq",
        },
      },
      {
        path: "groups/create",
        name: "FaqGroupCreate",
        component: () =>
          import(/* webpackChunkName: "faq" */ "../views/Faq/GroupEdit.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "faq.create_group",
          panel: "faq",
          area: "faq.faq",
        },
      },
      {
        path: "groups/:id",
        name: "FaqGroupDetail",
        component: () =>
          import(/* webpackChunkName: "faq" */ "../views/Faq/GroupEdit.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "faq.group_detail",
          panel: "faq",
          area: "faq.faq",
        },
      },
      {
        path: "items",
        name: "FaqItems",
        component: () =>
          import(/* webpackChunkName: "faq" */ "../views/Faq/ItemList.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "faq.items",
          panel: "faq",
          area: "faq.faq",
        },
      },
      {
        path: "items/create",
        name: "FaqItemCreate",
        component: () =>
          import(/* webpackChunkName: "faq" */ "../views/Faq/ItemEdit.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "faq.create_item",
          panel: "faq",
          area: "faq.faq",
        },
      },
      {
        path: "items/:id",
        name: "FaqItemDetail",
        component: () =>
          import(/* webpackChunkName: "faq" */ "../views/Faq/ItemEdit.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "faq.item_detail",
          panel: "faq",
          area: "faq.faq",
        },
      },
    ],
  },

  // Pricing panel
  {
    path: "/pricing",
    component: () => import(/* webpackChunkName: "pricing" */ "../views/PriceManager/index.vue"),
    meta: { requiresAuth: true, panel: "pricing" },
    children: [
      { path: "", redirect: "/pricing/prices" },
      {
        path: "prices",
        name: "PmPriceList",
        component: () => import(/* webpackChunkName: "pricing" */ "../views/PriceManager/PriceList.vue"),
        meta: { requiresAuth: true, titleKey: "pm.prices", panel: "pricing", area: "pricemanager.prices" },
      },
      {
        path: "prices/:sku",
        name: "PmPriceDetail",
        component: () => import(/* webpackChunkName: "pricing" */ "../views/PriceManager/PriceDetail.vue"),
        meta: { requiresAuth: true, titleKey: "pm.price_detail", panel: "pricing", area: "pricemanager.prices" },
      },
      {
        path: "tax-classes",
        name: "PmTaxClassList",
        component: () => import(/* webpackChunkName: "pricing" */ "../views/PriceManager/TaxClassList.vue"),
        meta: { requiresAuth: true, titleKey: "pm.tax_classes", panel: "pricing", area: "pricemanager.settings" },
      },
      {
        path: "tax-classes/create",
        name: "PmTaxClassCreate",
        component: () => import(/* webpackChunkName: "pricing" */ "../views/PriceManager/TaxClassDetail.vue"),
        meta: { requiresAuth: true, titleKey: "pm.create_tax_class", panel: "pricing", area: "pricemanager.settings" },
      },
      {
        path: "tax-classes/:idx",
        name: "PmTaxClassDetail",
        component: () => import(/* webpackChunkName: "pricing" */ "../views/PriceManager/TaxClassDetail.vue"),
        meta: { requiresAuth: true, titleKey: "pm.tax_class_detail", panel: "pricing", area: "pricemanager.settings" },
      },
      {
        path: "channels",
        name: "PmChannelList",
        component: () => import(/* webpackChunkName: "pricing" */ "../views/PriceManager/ChannelList.vue"),
        meta: { requiresAuth: true, titleKey: "pm.channels", panel: "pricing", area: "pricemanager.settings" },
      },
      {
        path: "channels/create",
        name: "PmChannelCreate",
        component: () => import(/* webpackChunkName: "pricing" */ "../views/PriceManager/ChannelDetail.vue"),
        meta: { requiresAuth: true, titleKey: "pm.create_channel", panel: "pricing", area: "pricemanager.settings" },
      },
      {
        path: "channels/:idx",
        name: "PmChannelDetail",
        component: () => import(/* webpackChunkName: "pricing" */ "../views/PriceManager/ChannelDetail.vue"),
        meta: { requiresAuth: true, titleKey: "pm.channel_detail", panel: "pricing", area: "pricemanager.settings" },
      },
    ],
  },

  // PriceFighter panel
  {
    path: "/pricefighter",
    component: () => import(/* webpackChunkName: "pricefighter" */ "../views/PriceFighter/index.vue"),
    meta: { requiresAuth: true, panel: "pricefighter" },
    children: [
      { path: "", redirect: "/pricefighter/gap" },
      {
        path: "gap",
        name: "PfGapTable",
        component: () => import(/* webpackChunkName: "pricefighter" */ "../views/PriceFighter/GapTable.vue"),
        meta: { requiresAuth: true, titleKey: "pricefighter.gap_table", panel: "pricefighter", area: "pricefighter.decisions" },
      },
      {
        path: "strategies",
        name: "PfStrategies",
        component: () => import(/* webpackChunkName: "pricefighter" */ "../views/PriceFighter/Strategies.vue"),
        meta: { requiresAuth: true, titleKey: "pricefighter.strategies", panel: "pricefighter", area: "pricefighter.rules" },
      },
      {
        path: "history",
        name: "PfDecisionHistory",
        component: () => import(/* webpackChunkName: "pricefighter" */ "../views/PriceFighter/DecisionHistory.vue"),
        meta: { requiresAuth: true, titleKey: "pricefighter.history", panel: "pricefighter", area: "pricefighter.decisions" },
      },
    ],
  },

  // Atlas panel (formerly Suppliers — django-atlas replaces django-suppliers)
  {
    path: "/atlas",
    component: () =>
      import(/* webpackChunkName: "atlas" */ "../views/Atlas/index.vue"),
    meta: {
      requiresAuth: true,
      panel: "atlas",
    },
    children: [
      {
        path: "",
        redirect: "/atlas/list",
      },
      {
        path: "list",
        name: "SourceList",
        component: () =>
          import(/* webpackChunkName: "atlas" */ "../views/Atlas/SourceList.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "atlas.list_title",
          panel: "atlas",
          area: "atlas.sources",
        },
      },
      {
        // Cross-source dashboard (RealProducts with auto-EAN link history)
        path: "auto-matched",
        name: "SuppliersAutoMatched",
        component: () =>
          import(/* webpackChunkName: "atlas" */ "../views/Atlas/AutoMatched.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "atlas.auto_matched.title",
          panel: "atlas",
          area: "atlas.products",
        },
      },
      {
        // Operator triage UI for find_duplicates_by_ean groups
        path: "duplicates",
        name: "SuppliersDuplicates",
        component: () =>
          import(/* webpackChunkName: "atlas" */ "../views/Atlas/Duplicates.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "atlas.duplicates.title",
          panel: "atlas",
          area: "atlas.products",
        },
      },
      {
        // Cross-source review queue — folded in from the former standalone Supplier Review panel
        path: "review",
        name: "SupplierReview",
        component: () =>
          import(/* webpackChunkName: "atlas" */ "../views/Atlas/Review/SupplierReview.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "atlas.review.title",
          panel: "atlas",
          area: "atlas.products",
        },
      },
      {
        // Single-box text/image search across PIM + atlas fingerprints
        path: "find",
        name: "AtlasFind",
        component: () =>
          import(/* webpackChunkName: "atlas" */ "../views/Atlas/Find.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "lookup.find.title",
          panel: "atlas",
          area: "lookup.search",
          // Optional django-lookup backend module — the view calls its
          // search/check API and must stay dormant without it.
          module: "lookup",
        },
      },
      {
        path: ":idx",
        name: "SourceDetail",
        component: () =>
          import(/* webpackChunkName: "atlas" */ "../views/Atlas/SourceDetail.vue"),
        meta: {
          navParent: "/atlas/list",
          requiresAuth: true,
          titleKey: "atlas.detail_title",
          panel: "atlas",
          area: "atlas.sources",
        },
      },
    ],
  },

  // Legacy redirect: Supplier Review was folded into the Suppliers/Atlas panel.
  // Function form preserves query params (e.g. ?mode=, ?sp_id=) across the redirect.
  {
    path: "/supplier-review",
    redirect: (to) => ({ path: "/atlas/review", query: to.query }),
  },

  // Legacy redirect: Suppliers panel was renamed to Atlas (django-suppliers -> django-atlas).
  // Function form preserves the sub-path and query params (e.g. /suppliers/list -> /atlas/list).
  {
    path: "/suppliers/:pathMatch(.*)*",
    redirect: (to) => ({
      path: `/atlas/${to.params.pathMatch.join("/")}`,
      query: to.query,
    }),
  },

  // Leads panel (plan 13): Inbox as the left column, Review/Thread on the right at >= 1024 px
  {
    path: "/leads",
    component: () =>
      import(/* webpackChunkName: "leads" */ "../views/Leads/index.vue"),
    meta: { requiresAuth: true, panel: "leads" },
    children: [
      { path: "", redirect: "/leads/inbox" },
      {
        path: "inbox",
        name: "LeadsInbox",
        component: () =>
          import(/* webpackChunkName: "leads" */ "../views/Leads/Inbox.vue"),
        meta: { requiresAuth: true, titleKey: "leads.inbox.title", panel: "leads", area: "communicator.conversations", module: "communicator" },
      },
      {
        path: "inbox/:id",
        name: "LeadsReview",
        component: () =>
          import(/* webpackChunkName: "leads" */ "../views/Leads/Review.vue"),
        meta: { requiresAuth: true, titleKey: "leads.review.title", panel: "leads", area: "communicator.review", module: "communicator", noBottomBar: true },
      },
      // A thread by id — the screen of a conversation that belongs to no company, reached from the Inbox and the bell
      { path: "conversations", redirect: "/leads/inbox" },
      {
        path: "conversations/:id",
        name: "LeadsConversation",
        component: () => import(/* webpackChunkName: "leads" */ "../views/Leads/Conversation.vue"),
        meta: { requiresAuth: true, titleKey: "leads.inbox.title", panel: "leads", area: "communicator.conversations", module: "communicator" },
      },
      // Leads-only entry (the panel fallback): a company list that works on a phone
      {
        path: "companies",
        name: "LeadsCompanies",
        component: () => import(/* webpackChunkName: "leads" */ "../views/Leads/Companies.vue"),
        meta: { requiresAuth: true, titleKey: "leads.companies.title", panel: "leads", area: "leads.companies", module: "leads" },
      },
      // UX-006: one lead by hand — company + its contact, phone-usable
      {
        path: "companies/new",
        name: "LeadsCompanyNew",
        component: () => import(/* webpackChunkName: "leads" */ "../views/Leads/CompanyNew.vue"),
        meta: { requiresAuth: true, titleKey: "leads.add.title", panel: "leads", area: "leads.companies", module: "leads" },
      },
      {
        path: "companies/:id",
        name: "LeadsThread",
        component: () =>
          import(/* webpackChunkName: "leads" */ "../views/Leads/Company.vue"),
        meta: { requiresAuth: true, titleKey: "leads.company.title", panel: "leads", area: "leads.companies", module: "leads" },
      },
      // Plan 14 desktop screens: full width, "Open on a desktop" below 1024 px
      {
        path: "board",
        name: "LeadsBoard",
        component: () => import(/* webpackChunkName: "leads" */ "../views/Leads/Board.vue"),
        meta: { requiresAuth: true, titleKey: "leads.board.title", panel: "leads", area: "leads.companies", module: "leads", desktop: true },
      },
      {
        path: "import",
        name: "LeadsImport",
        component: () => import(/* webpackChunkName: "leads" */ "../views/Leads/Import.vue"),
        meta: { requiresAuth: true, titleKey: "leads.import.title", panel: "leads", area: "leads.companies", module: "leads", desktop: true },
      },
      // Settings (UX-002d): one hub for the configuration of leads and communicator — each section its own route,
      // shown only when its backend module is on; full width, reachable on a phone (`page`, no DesktopOnly wall)
      { path: "stages", redirect: "/leads/settings/stages" },
      {
        path: "settings",
        name: "LeadsSettings",
        component: () => import(/* webpackChunkName: "leads" */ "../views/Leads/Settings.vue"),
        meta: { requiresAuth: true, titleKey: "nav.leads_settings", panel: "leads", page: true },
      },
      {
        path: "settings/stages",
        name: "LeadsStages",
        component: () => import(/* webpackChunkName: "leads" */ "../views/Leads/Stages.vue"),
        meta: { requiresAuth: true, titleKey: "leads.stages.title", panel: "leads", area: "leads.settings", module: "leads", page: true },
      },
      {
        path: "settings/lead-types",
        name: "LeadsLeadTypes",
        component: () => import(/* webpackChunkName: "leads" */ "../views/Leads/LeadTypes.vue"),
        meta: { requiresAuth: true, titleKey: "leads.lead_types.title", panel: "leads", area: "leads.settings", module: "leads", page: true },
      },
      {
        path: "settings/templates",
        name: "CommunicatorTemplates",
        component: () => import(/* webpackChunkName: "communicator" */ "../views/Communicator/TemplateList.vue"),
        meta: { requiresAuth: true, titleKey: "communicator.templates.title", panel: "leads", area: "communicator.content", module: "communicator", page: true },
      },
      {
        path: "settings/templates/:id",
        name: "CommunicatorTemplateEdit",
        component: () => import(/* webpackChunkName: "communicator" */ "../views/Communicator/TemplateEdit.vue"),
        meta: { requiresAuth: true, titleKey: "communicator.template.title", panel: "leads", area: "communicator.content", module: "communicator", page: true, crumbParent: "CommunicatorTemplates" },
      },
      {
        path: "settings/sequences",
        name: "CommunicatorSequences",
        component: () => import(/* webpackChunkName: "communicator" */ "../views/Communicator/SequenceList.vue"),
        meta: { requiresAuth: true, titleKey: "communicator.sequences.title", panel: "leads", area: "communicator.content", module: "communicator", page: true },
      },
      {
        path: "settings/sending",
        name: "CommunicatorSettings",
        component: () => import(/* webpackChunkName: "communicator" */ "../views/Communicator/Settings.vue"),
        meta: { requiresAuth: true, titleKey: "communicator.settings.title", panel: "leads", area: "communicator.settings", module: "communicator", page: true },
      },
    ],
  },

  // The Communicator panel became Leads → Settings (UX-002d): old deep links land on the same screens
  { path: "/communicator", redirect: "/leads/settings" },
  { path: "/communicator/templates", redirect: "/leads/settings/templates" },
  { path: "/communicator/templates/:id", redirect: (to) => `/leads/settings/templates/${to.params.id}` },
  { path: "/communicator/sequences", redirect: "/leads/settings/sequences" },
  { path: "/communicator/settings", redirect: "/leads/settings/sending" },

  // Enrichment review panel (etap-06 / etap-06b)
  {
    path: "/enrichment",
    name: "EnrichmentReview",
    component: () =>
      import(/* webpackChunkName: "enrichment" */ "../views/EnrichmentReview/index.vue"),
    meta: {
      requiresAuth: true,
      titleKey: "enrichment.review.title",
      panel: "enricher",
      area: "enrichment.proposals",
    },
  },

  // Enrichment spawn rules (etap-13)
  {
    path: "/enrichment/spawn-rules",
    name: "EnrichmentSpawnRules",
    component: () =>
      import(/* webpackChunkName: "enrichment" */ "../views/EnrichmentSpawnRules/SpawnRuleList.vue"),
    meta: {
      requiresAuth: true,
      titleKey: "enrichment.spawn_rules.title",
      panel: "enricher",
      area: "enrichment.rules",
    },
  },
  {
    path: "/enrichment/spawn-rules/new",
    name: "EnrichmentSpawnRuleCreate",
    component: () =>
      import(/* webpackChunkName: "enrichment" */ "../views/EnrichmentSpawnRules/SpawnRuleEdit.vue"),
    meta: {
      requiresAuth: true,
      titleKey: "enrichment.spawn_rules.create",
      panel: "enricher",
      area: "enrichment.rules",
    },
  },
  {
    path: "/enrichment/spawn-rules/:key",
    name: "EnrichmentSpawnRuleEdit",
    component: () =>
      import(/* webpackChunkName: "enrichment" */ "../views/EnrichmentSpawnRules/SpawnRuleEdit.vue"),
    meta: {
      requiresAuth: true,
      titleKey: "enrichment.spawn_rules.title",
      panel: "enricher",
      area: "enrichment.rules",
    },
  },

  // Enrichment tasks (read-only queue view)
  {
    path: "/enrichment/tasks",
    name: "EnrichmentTasks",
    component: () =>
      import(/* webpackChunkName: "enrichment" */ "../views/EnrichmentTasks/TaskList.vue"),
    meta: {
      requiresAuth: true,
      titleKey: "enrichment.tasks.title",
      panel: "enricher",
      area: "enrichment.proposals",
    },
  },

  // Translation Jobs
  {
    path: "/translation-jobs",
    component: () =>
      import(/* webpackChunkName: "translation" */ "../views/TranslationDashboard/index.vue"),
    meta: {
      requiresAuth: true,
      panel: "translation",
    },
    children: [
      {
        path: "",
        name: "TranslationDashboard",
        component: () =>
          import(/* webpackChunkName: "translation" */ "../views/TranslationDashboard/Dashboard.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "translation.jobs",
          panel: "translation",
        },
      },
    ],
  },

  // Promo panel
  {
    path: "/promo",
    component: () =>
      import(/* webpackChunkName: "promo" */ "../views/Promo/index.vue"),
    meta: {
      requiresAuth: true,
      panel: "promo",
    },
    children: [
      {
        path: "",
        redirect: "/promo/list",
      },
      {
        path: "list",
        name: "PromoList",
        component: () =>
          import(/* webpackChunkName: "promo" */ "../views/Promo/PromoList.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "nav.promo_list",
          panel: "promo",
          area: "checkout.discounts",
        },
      },
      {
        path: "create",
        name: "PromoCreate",
        component: () =>
          import(/* webpackChunkName: "promo" */ "../views/Promo/PromoEdit.vue"),
        meta: {
          navParent: "/promo/list",
          requiresAuth: true,
          titleKey: "promo.create_rule",
          panel: "promo",
          area: "checkout.discounts",
        },
      },
      {
        path: "voucher/:pk",
        name: "VoucherDetail",
        component: () =>
          import(/* webpackChunkName: "promo" */ "../views/Promo/VoucherDetail.vue"),
        meta: {
          navParent: "/promo/list",
          requiresAuth: true,
          titleKey: "promo.voucher_title",
          panel: "promo",
          area: "checkout.discounts",
          // The view fetches /api/checkout-voucher/* on mount — without the
          // module the route must not resolve even when the panel is enabled.
          module: "checkout_voucher",
        },
      },
      {
        path: ":id",
        name: "PromoDetail",
        component: () =>
          import(/* webpackChunkName: "promo" */ "../views/Promo/PromoEdit.vue"),
        meta: {
          navParent: "/promo/list",
          requiresAuth: true,
          titleKey: "promo.edit_rule",
          panel: "promo",
          area: "checkout.discounts",
        },
      },
    ],
  },

  // Stock Management
  {
    path: "/stock",
    component: () => import(/* webpackChunkName: "stock" */ "../views/Stock/index.vue"),
    meta: { requiresAuth: true, panel: "stock" },
    children: [
      { path: "", redirect: "/stock/manage" },
      {
        path: "manage",
        name: "StockManage",
        component: () => import(/* webpackChunkName: "stock" */ "../views/Stock/WarehouseStockTable.vue"),
        meta: { requiresAuth: true, titleKey: "stock.manage", panel: "stock", area: "qms.stock" },
      },
    ],
  },

  // Access panel (django-access): roles; staff, applications and audit join in plans 21–22
  {
    path: "/access",
    component: () => import(/* webpackChunkName: "access" */ "../views/Access/index.vue"),
    meta: { requiresAuth: true, panel: "access" },
    children: [
      { path: "", redirect: "/access/roles" },
      {
        path: "roles",
        name: "AccessRoles",
        component: () => import(/* webpackChunkName: "access" */ "../views/Access/RoleList.vue"),
        meta: { requiresAuth: true, titleKey: "access.roles.title", panel: "access", area: "access.manage" },
      },
      {
        path: "roles/new",
        name: "AccessRoleCreate",
        component: () => import(/* webpackChunkName: "access" */ "../views/Access/RoleDetail.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "access.roles.create",
          panel: "access",
          area: "access.manage",
          navParent: "/access/roles",
        },
      },
      {
        path: "roles/:key",
        name: "AccessRoleDetail",
        component: () => import(/* webpackChunkName: "access" */ "../views/Access/RoleDetail.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "access.roles.detail",
          panel: "access",
          area: "access.manage",
          navParent: "/access/roles",
        },
      },
    ],
  },

  // Change password (authenticated)
  {
    path: "/change-password",
    name: "ChangePassword",
    component: () =>
      import(/* webpackChunkName: "auth" */ "../views/ChangePassword/ChangePassword.vue"),
    meta: {
      requiresAuth: true,
      fullscreen: true,
    },
  },

  // Password reset (from email link — no auth required)
  {
    path: "/sso/callback",
    name: "SsoCallback",
    component: () =>
      import(/* webpackChunkName: "auth" */ "../views/SsoCallback/SsoCallback.vue"),
    meta: {
      requiresAuth: false,
    },
  },
  {
    path: "/password-reset",
    name: "PasswordReset",
    component: () =>
      import(/* webpackChunkName: "auth" */ "../views/PasswordReset/PasswordReset.vue"),
    meta: {
      requiresAuth: false,
    },
  },

  // Redirects for old paths
  { path: "/gallery", redirect: "/pages/gallery" },
  { path: "/content-sets", redirect: "/pages/content-sets" },
  { path: "/doc", redirect: "/pages/doc" },
  { path: "/docs", redirect: "/pages/doc" },
  { path: "/content", redirect: "/pages/content" },
  { path: "/layout-extender", redirect: "/pages/layout-extender" },
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

// A route whose module is absent goes to its panel root; the root itself (Leads inbox) goes to the panel
// fallback (Leads company list), and the fallback home — never a loop.
function moduleFallback(panel, path) {
  if (path === panel?.root) return panel.fallback || "/";
  if (path === panel?.fallback) return "/";
  return panel?.root || "/";
}

router.beforeEach(async (to, from, next) => {
  // Allow unauthenticated routes (password reset)
  if (to.meta?.requiresAuth === false) {
    next();
    return;
  }

  const panel = to.meta?.panel;
  if (panel) {
    const munin = useMuninStore();
    const userStore = useUserStore();

    // Wait for Munin data if user is authenticated but modules not yet loaded
    if (userStore.isAuth && !munin.loaded) {
      await munin.ensureLoaded();
    }

    if (!munin.isPanelEnabled(panel)) {
      next('/');
      return;
    }
    // Routes tied to an optional backend module (meta.module) stay dormant
    // when the module is absent, even if their panel is enabled.
    const module = to.meta?.module;
    if (module && !munin.isModuleEnabled(module)) {
      next(moduleFallback(panels.find((p) => p.idx === panel), to.path));
      return;
    }
    if (userStore.isAuth && !(await canReadRoute(to, panel))) {
      next(accessFallback(to, panel));
      return;
    }
  }
  next();
});

// A refused panel root (the Home card, the sidebar leaf) opens the panel's first readable page; anything else goes
// Home, which names the panel — unless the permissions failed to load (Home says that instead).
function accessFallback(to, panel) {
  const access = useAccessStore();
  const root = panels.find((p) => p.idx === panel);
  const landing =
    [root?.root, root?.fallback].includes(to.path) &&
    buildNavRoutes().find((entry) => {
      const area = entry.app.includes(panel) && router.resolve(entry.route).meta?.area;
      return area && access.can(area);
    });
  if (landing) return { path: landing.route, query: landing.query };
  if (access.status !== "error") access.deniedPanel = panel;
  return "/";
}

// django-access: read on the route's area, or on any area of its panel when the route carries none.
async function canReadRoute(to, panel) {
  const access = useAccessStore();
  await access.ensureLoaded();
  const area = to.meta?.area;
  return area ? access.can(area) : access.canAny(panels.find((p) => p.idx === panel)?.areas);
}

export default router;
