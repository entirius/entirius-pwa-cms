import { GET_Categories, GET_Products } from "@/api/pim/api";
import { GET_Navigation } from "@/api/contentDB/api";

/**
 * Factory: category search via PIM admin API.
 * Result display: "Furniture" + "idx: furniture-living"
 */
export function useCategoryFetch(channelIdx) {
  return async (query) => {
    if (!channelIdx) return [];
    const { data } = await GET_Categories(channelIdx, {
      search: query,
      page_size: 20,
    });
    return (data.results || []).map((c) => ({
      value: c.url_key || c.idx,
      label: c.name || c.idx,
      secondary: `url: ${c.url_key || c.idx}`,
    }));
  };
}

/**
 * Factory: product search via PIM admin API.
 * Result display: "Ergonomic Office Chair" + "SKU: CHAIR-001"
 */
export function useProductFetch(channelIdx) {
  return async (query) => {
    if (!channelIdx) return [];
    const { data } = await GET_Products(channelIdx, {
      search: query,
      page_size: 20,
    });
    return (data.results || []).map((p) => ({
      value: p.sku,
      label: p.name || p.sku,
      secondary: `SKU: ${p.sku}`,
    }));
  };
}

/**
 * Factory: page routes from ContentDB (client-filtered, no server search).
 * Result display: "About Us" + "/about-us"
 */
export function usePageFetch() {
  return async () => {
    const { data } = await GET_Navigation({});
    const routes = data.data || data || [];
    return (Array.isArray(routes) ? routes : []).map((r) => ({
      value: r.url,
      label: r.label || r.url,
      secondary: r.url,
    }));
  };
}
