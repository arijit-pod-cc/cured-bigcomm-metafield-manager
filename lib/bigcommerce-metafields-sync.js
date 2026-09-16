import db from "@/lib/db";
import { bigcommerceClient } from "@/lib/auth";

/**
 * Synchronizes metafield values to BigCommerce native catalog metafields API
 * so that Stencil storefront themes and storefront GraphQL can read them natively.
 *
 * @param {Object} options
 * @param {string} options.storeHash - BigCommerce store hash
 * @param {string} options.productId - BigCommerce product ID
 * @param {Object} options.bundleValues - Object containing key/namespace -> value mappings
 * @param {Array} options.definitions - List of metafield definitions
 */
export async function syncProductMetafieldsToBigCommerce({
  storeHash,
  productId,
  bundleValues,
  definitions = [],
}) {
  try {
    if (!storeHash || !productId) {
      return { success: false, reason: "Missing storeHash or productId" };
    }

    const accessToken = await db.getStoreToken(storeHash);
    if (!accessToken) {
      console.warn(`[BC Sync] No accessToken found for store ${storeHash}`);
      return { success: false, reason: "Store not authenticated" };
    }

    const bc = bigcommerceClient(accessToken, storeHash, "v3");

    // 1. Fetch existing native metafields for this product
    let existingMetafields = [];
    try {
      const res = await bc.get(`/catalog/products/${productId}/metafields?limit=250`);
      existingMetafields = res?.data || (Array.isArray(res) ? res : []);
    } catch (err) {
      console.warn(`[BC Sync] Failed to fetch existing metafields for product ${productId}:`, err?.message);
    }

    // Index existing metafields by "namespace:key"
    const existingMap = new Map();
    for (const mf of existingMetafields) {
      if (mf.namespace && mf.key) {
        existingMap.set(`${mf.namespace}:${mf.key}`, mf.id);
      }
    }

    // 2. Sync each defined metafield
    for (const def of definitions) {
      const key = def.key || def.namespace;
      const namespace = def.namespace || "custom";

      if (!key) continue;

      let rawVal =
        bundleValues[`${namespace}.${key}`] ??
        bundleValues[key] ??
        bundleValues[def.namespace] ??
        bundleValues[String(def.id)];
      if (rawVal === undefined || rawVal === null) {
        continue;
      }

      const stringValue = typeof rawVal === "object" ? JSON.stringify(rawVal) : String(rawVal);
      const lookupKey = `${namespace}:${key}`;
      const existingId = existingMap.get(lookupKey);

      const payload = {
        permission_set: "read_and_sf_access",
        namespace,
        key,
        value: stringValue,
        description: def.name || "",
      };

      try {
        if (existingId) {
          await bc.put(`/catalog/products/${productId}/metafields/${existingId}`, payload);
        } else {
          await bc.post(`/catalog/products/${productId}/metafields`, payload);
        }
      } catch (err) {
        console.warn(`[BC Sync] Failed to sync metafield ${lookupKey} for product ${productId}:`, err?.message);
      }
    }

    // 3. Sync master bundle metafield (metafields_app:bundle)
    try {
      const bundleLookupKey = "metafields_app:bundle";
      const existingBundleId = existingMap.get(bundleLookupKey);
      const bundlePayload = {
        permission_set: "read_and_sf_access",
        namespace: "metafields_app",
        key: "bundle",
        value: JSON.stringify(bundleValues),
        description: "Metafields App JSON Bundle",
      };

      if (existingBundleId) {
        await bc.put(`/catalog/products/${productId}/metafields/${existingBundleId}`, bundlePayload);
      } else {
        await bc.post(`/catalog/products/${productId}/metafields`, bundlePayload);
      }
    } catch (err) {
      console.warn(`[BC Sync] Failed to sync master bundle for product ${productId}:`, err?.message);
    }

    return { success: true };
  } catch (error) {
    console.error(`[BC Sync] Unhandled error syncing product ${productId}:`, error);
    return { success: false, error: error?.message };
  }
}

/**
 * Deletes a metafield from BigCommerce native catalog API and cleans the master bundle
 * so that Stencil storefront themes stop rendering it immediately.
 */
export async function removeMetafieldFromBigCommerceAndStorefront({
  storeHash,
  productId,
  namespace,
  key,
  updatedBundle,
}) {
  try {
    if (!storeHash || !productId || !key) return;

    const accessToken = await db.getStoreToken(storeHash);
    if (!accessToken) return;

    const bc = bigcommerceClient(accessToken, storeHash, "v3");

    // Fetch existing native metafields
    let existingMetafields = [];
    try {
      const res = await bc.get(`/catalog/products/${productId}/metafields?limit=250`);
      existingMetafields = res?.data || (Array.isArray(res) ? res : []);
    } catch (err) {
      console.warn(`[BC Delete] Error fetching metafields for product ${productId}:`, err?.message);
    }

    // Find and delete the individual native metafield
    for (const mf of existingMetafields) {
      const isTarget =
        (mf.namespace === namespace || mf.namespace === "custom") &&
        mf.key === key;

      if (isTarget) {
        try {
          await bc.delete(`/catalog/products/${productId}/metafields/${mf.id}`);
        } catch (delErr) {
          console.warn(`[BC Delete] Failed to delete metafield ${mf.id} from product ${productId}:`, delErr?.message);
        }
      }
    }

    // Update the master bundle if updatedBundle is provided
    if (updatedBundle) {
      const bundleMetafield = existingMetafields.find(
        (mf) => mf.namespace === "metafields_app" && mf.key === "bundle"
      );

      if (bundleMetafield) {
        try {
          await bc.put(`/catalog/products/${productId}/metafields/${bundleMetafield.id}`, {
            permission_set: "read_and_sf_access",
            namespace: "metafields_app",
            key: "bundle",
            value: JSON.stringify(updatedBundle),
            description: "Metafields App JSON Bundle",
          });
        } catch (bundleErr) {
          console.warn(`[BC Delete] Failed to update master bundle for product ${productId}:`, bundleErr?.message);
        }
      }
    }
  } catch (error) {
    console.error(`[BC Delete] Error removing metafield from product ${productId}:`, error);
  }
}

