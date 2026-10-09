"use server";

import { decodePayload } from "@/lib/auth";
import db from "@/lib/db";

/**
 * Save all product metafield values as a single JSON bundle.
 *
 * This replaces individual saveProductMetafield calls.
 * All metafield values for a product are stored in one row
 * with a JSON structure keyed by namespace.
 *
 * Example JSON structure:
 * {
 *   "namespace1": "value1",
 *   "namespace2": ["item1", "item2"],
 *   "namespace3": null
 * }
 *
 * @param {string} category - e.g., "products"
 * @param {string} categoryDataId - e.g., product ID
 * @param {Object} metafieldValues - Object with definitionId -> value pairs
 * @param {Array} definitions - Array of metafield definition objects
 * @param {string} context - JWT context token
 */
export async function saveProductMetafieldsBundle(
  category,
  categoryDataId,
  metafieldValues,
  definitions,
  context
) {
  try {
    /*
     * ---------------------------------------------------------
     * VALIDATION
     * ---------------------------------------------------------
     */

    if (!context) {
      throw new Error("Missing context");
    }

    if (!categoryDataId) {
      throw new Error("Missing category data ID");
    }

    if (!category) {
      throw new Error("Missing category");
    }

    if (!definitions || definitions.length === 0) {
      throw new Error("Missing metafield definitions");
    }

    if (!metafieldValues || typeof metafieldValues !== "object") {
      throw new Error("Invalid metafield values");
    }

    /*
     * ---------------------------------------------------------
     * DECODE CONTEXT
     * ---------------------------------------------------------
     */

    const payload = decodePayload(context);

    if (!payload) {
      throw new Error("Invalid context");
    }

    const storeHash = payload.context;

    if (!storeHash) {
      throw new Error("Missing store hash");
    }

    const userId = String(payload.user?.id || "");

    if (!userId) {
      throw new Error("Missing user ID");
    }

    /*
     * ---------------------------------------------------------
     * VERIFY STORE USER
     * ---------------------------------------------------------
     */

    const hasUser = await db.hasStoreUser(
      storeHash,
      userId
    );

    if (!hasUser) {
      throw new Error("User not authorized");
    }

    /*
     * ---------------------------------------------------------
     * BUILD NAMESPACE-KEYED JSON
     *
     * Create an object where keys are the namespace
     * and values are the cleaned/normalized values.
     * ---------------------------------------------------------
     */

    const bundleJson = {};

    for (const definition of definitions) {
      const definitionId = String(definition.id);
      const namespace = definition.namespace || "custom";
      const key = definition.key || definition.namespace;
      let value = metafieldValues[definitionId] ?? null;

      /*
       * Normalize value based on definition type.
       */
      if (Number(definition.isList) === 1) {
        if (!Array.isArray(value)) {
          value =
            value === null ||
            value === undefined ||
            value === ""
              ? []
              : [value];
        }

        /*
         * Remove empty inputs from list.
         */
        value = value.filter(
          (item) =>
            item !== null &&
            item !== undefined &&
            String(item).trim() !== ""
        );
      }

      /*
       * ---------------------------------------------------------
       * REQUIRED VALIDATION
       * ---------------------------------------------------------
       */

      if (Number(definition.isRequired) === 1) {
        const emptyList =
          Number(definition.isList) === 1 &&
          Array.isArray(value) &&
          value.length === 0;

        const emptyValue =
          value === null ||
          value === undefined ||
          value === "";

        if (emptyValue || emptyList) {
          throw new Error(
            `${definition.name} is required`
          );
        }
      }

      /*
       * Add to bundle using strict Shopify namespace.key convention.
       */
      const fullKey = namespace ? `${namespace}.${key}` : key;
      bundleJson[fullKey] = value;
    }

    /*
     * ---------------------------------------------------------
     * JSON VALUE
     * ---------------------------------------------------------
     */

    const valueJson = JSON.stringify(bundleJson);

    /*
     * ---------------------------------------------------------
     * CHECK EXISTING PRODUCT VALUE
     *
     * A bundle is uniquely identified by:
     * storeHash + category + category_data_id
     * ---------------------------------------------------------
     */

    const existing = await db.query(
      `
        SELECT id
        FROM metafield_values
        WHERE storeHash = ?
          AND category = ?
          AND category_data_id = ?
        LIMIT 1
      `,
      [storeHash, category, String(categoryDataId)]
    );

    /*
     * ---------------------------------------------------------
     * UPDATE
     * ---------------------------------------------------------
     */

    let savedId = null;
    let action = "created";

    if (existing && existing.length > 0) {
      savedId = existing[0].id;
      action = "updated";

      await db.query(
        `
          UPDATE metafield_values
          SET valueJson = ?, updatedAt = NOW()
          WHERE id = ?
            AND storeHash = ?
        `,
        [valueJson, savedId, storeHash]
      );
    } else {
      const result = await db.query(
        `
          INSERT INTO metafield_values
          (
            storeHash,
            definitionId,
            category,
            category_data_id,
            valueJson
          )
          VALUES (?, ?, ?, ?, ?)
        `,
        [storeHash, 0, category, String(categoryDataId), valueJson]
      );
      savedId = result.insertId;
    }

    return {
      success: true,
      action,
      id: savedId,
      category,
      category_data_id: String(categoryDataId),
      bundleJson,
    };
  } catch (error) {
    console.error(
      "Error saving product metafields bundle:",
      error
    );

    throw new Error(
      error?.message || "Failed to save metafields"
    );
  }
}
