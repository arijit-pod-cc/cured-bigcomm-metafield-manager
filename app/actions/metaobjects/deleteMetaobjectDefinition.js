"use server";

import { decodePayload } from "@/lib/auth";
import db from "@/lib/db";

export async function deleteMetaobjectDefinition(context, id) {
  try {
    if (!context) throw new Error("Missing context");

    const payload = decodePayload(context);
    if (!payload) throw new Error("Invalid context");

    const storeHash = payload.context;
    if (!storeHash) throw new Error("Missing store hash");

    const userId = String(payload.user?.id || "");
    const hasUser = await db.hasStoreUser(storeHash, userId);
    if (!hasUser) throw new Error("User not authorized");

    const defs = await db.query(
      "SELECT id FROM metaobject_definitions WHERE storeHash = ? AND id = ? LIMIT 1",
      [storeHash, id]
    );

    if (!defs || defs.length === 0) {
      throw new Error("Definition not found");
    }

    // Delete field values for entries
    await db.query(
      `
        DELETE fv FROM metaobject_field_values fv
        JOIN metaobject_entries e ON fv.entryId = e.id
        WHERE e.metaobjectDefinitionId = ?
      `,
      [id]
    );

    // Delete entries
    await db.query("DELETE FROM metaobject_entries WHERE metaobjectDefinitionId = ?", [id]);

    // Delete field definitions
    await db.query("DELETE FROM metaobject_field_definitions WHERE metaobjectDefinitionId = ?", [id]);

    // Delete definition
    await db.query("DELETE FROM metaobject_definitions WHERE id = ? AND storeHash = ?", [id, storeHash]);

    return { success: true };
  } catch (error) {
    console.error("Error deleting metaobject definition:", error);
    throw new Error(error?.message || "Failed to delete metaobject definition");
  }
}
