import { POST_ForceRepushProduct, POST_AcknowledgeSku } from "@/api/atlas/api";

function uniqueSkus(rows) {
  return Array.from(new Set(rows.map((r) => r.real_product_sku).filter(Boolean)));
}

// Atlas-side counterpart of useSupplierBulkActions — same shape, points at the
// new @/api/atlas/api client. Kept separate so the (still-live) old Suppliers
// panel and its composable are untouched during the migration.
export function useAtlasBulkActions() {
  async function forceRepushSps(rows) {
    const succeeded = [];
    const failed = [];
    // etap-08: surface per-call warning events (e.g. language_fallback) to caller.
    const events = [];
    await Promise.all(
      rows.map(async (row) => {
        try {
          const resp = await POST_ForceRepushProduct(row.id);
          succeeded.push(row);
          const respEvents = resp?.data?.events;
          if (Array.isArray(respEvents)) events.push(...respEvents);
        } catch (err) {
          failed.push({ row, error: err });
        }
      })
    );
    return { succeeded, failed, events };
  }

  async function acknowledgeSps(rows) {
    const skus = uniqueSkus(rows);
    const succeeded = [];
    const failed = [];
    await Promise.all(
      skus.map(async (sku) => {
        try {
          await POST_AcknowledgeSku(sku, { all_unseen: true });
          succeeded.push(sku);
        } catch (err) {
          failed.push({ sku, error: err });
        }
      })
    );
    return { succeeded, failed };
  }

  return { forceRepushSps, acknowledgeSps };
}
