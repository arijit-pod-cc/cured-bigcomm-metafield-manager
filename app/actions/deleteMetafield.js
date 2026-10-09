"use server";

import { decodePayload } from "@/lib/auth";
import db from "@/lib/db";

export async function deleteMetafield(id, category, context) {
  try {
    if (!context) {
      throw new Error("Missing context");
    }

    if (!id) {
      throw new Error("Missing metafield ID");
    }

    if (!category) {
      throw new Error("Missing category");
    }

    const payload = decodePayload(context);
    if (!payload) {
      throw new Error("Invalid context");
    }

    const storeHash = payload.context;
    if (!storeHash) {
      throw new Error("Missing store hash");
    }

    const userId = String(payload.user?.id || "");
    const hasUser = await db.hasStoreUser(storeHash, userId);
    if (!hasUser) {
      throw new Error("User not authorized");
    }

    // Verify definition exists
    const existing = await db.query(
      `
        SELECT id, name, namespace, \`key\`
        FROM metafield_definitions
        WHERE id = ?
          AND storeHash = ?
          AND category = ?
        LIMIT 1
      `,
      [id, storeHash, category]
    );

    if (!existing || existing.length === 0) {
      throw new Error("Metafield definition not found");
    }

    const def = existing[0];
    const key = def.key || def.namespace;
    const namespace = def.namespace || "custom";

    // Clean up values from MySQL bundles
    try {
      const categoryValues = await db.query(
        `
          SELECT id, category_data_id, valueJson
          FROM metafield_values
          WHERE storeHash = ?
            AND category = ?
        `,
        [storeHash, category]
      );

      for (const row of categoryValues || []) {
          if (!row.valueJson) continue;
          let bundle = {};
          try {
            bundle = JSON.parse(row.valueJson);
          } catch {
            continue;
          }

          let modified = false;
          if (key && bundle[key] !== undefined) {
            delete bundle[key];
            modified = true;
          }
          if (namespace && key && bundle[`${namespace}.${key}`] !== undefined) {
            delete bundle[`${namespace}.${key}`];
            modified = true;
          }
          if (def.namespace && bundle[def.namespace] !== undefined) {
            delete bundle[def.namespace];
            modified = true;
          }

          if (modified) {
            // Update MySQL bundle
            await db.query(
              `UPDATE metafield_values SET valueJson = ?, updatedAt = NOW() WHERE id = ?`,
              [JSON.stringify(bundle), row.id]
            );
          }
        }
      } catch (cleanErr) {
        console.warn("Cleanup warning during metafield deletion:", cleanErr?.message);
      }

    // Delete definition
    await db.query(
      `
        DELETE FROM metafield_definitions
        WHERE id = ?
          AND storeHash = ?
          AND category = ?
      `,
      [id, storeHash, category]
    );

    return {
      success: true,
      id,
    };
  } catch (error) {
    console.error("Error deleting metafield:", error);
    throw new Error(error?.message || "Failed to delete metafield");
  }
}
