"use server";

import { decodePayload } from "@/lib/auth";
import db from "@/lib/db";

export async function fetchMetaobjectEntries(context, definitionTypeOrId) {
  try {
    if (!context) throw new Error("Missing context");

    const payload = decodePayload(context);
    if (!payload) throw new Error("Invalid context");

    const storeHash = payload.context;
    if (!storeHash) throw new Error("Missing store hash");

    const userId = String(payload.user?.id || "");
    const hasUser = await db.hasStoreUser(storeHash, userId);
    if (!hasUser) throw new Error("User not authorized");

    const isNumeric = /^\d+$/.test(String(definitionTypeOrId));
    const whereClause = isNumeric
      ? "storeHash = ? AND id = ?"
      : "storeHash = ? AND type = ?";

    const defs = await db.query(
      `SELECT id, type, name, displayFieldKey FROM metaobject_definitions WHERE ${whereClause} LIMIT 1`,
      [storeHash, definitionTypeOrId]
    );

    if (!defs || defs.length === 0) {
      throw new Error("Metaobject definition not found");
    }

    const definition = defs[0];

    const entries = await db.query(
      `
        SELECT
          id,
          metaobjectDefinitionId,
          handle,
          displayName,
          status,
          createdAt,
          updatedAt
        FROM metaobject_entries
        WHERE metaobjectDefinitionId = ?
        ORDER BY updatedAt DESC
      `,
      [definition.id]
    );

    return {
      success: true,
      definition,
      entries: entries || [],
    };
  } catch (error) {
    console.error("Error fetching metaobject entries:", error);
    throw new Error(error?.message || "Failed to fetch metaobject entries");
  }
}
