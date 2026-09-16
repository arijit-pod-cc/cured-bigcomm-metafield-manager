"use server";

import { decodePayload } from "@/lib/auth";
import db from "@/lib/db";

export async function fetchMetaobjectDefinitions(context) {
  try {
    if (!context) throw new Error("Missing context");

    const payload = decodePayload(context);
    if (!payload) throw new Error("Invalid context");

    const storeHash = payload.context;
    if (!storeHash) throw new Error("Missing store hash");

    const userId = String(payload.user?.id || "");
    const hasUser = await db.hasStoreUser(storeHash, userId);
    if (!hasUser) throw new Error("User not authorized");

    const definitions = await db.query(
      `
        SELECT
          d.id,
          d.storeHash,
          d.type,
          d.name,
          d.description,
          d.displayFieldKey,
          d.status,
          d.createdAt,
          d.updatedAt,
          (SELECT COUNT(*) FROM metaobject_entries e WHERE e.metaobjectDefinitionId = d.id) as entryCount,
          (SELECT COUNT(*) FROM metaobject_field_definitions f WHERE f.metaobjectDefinitionId = d.id) as fieldCount
        FROM metaobject_definitions d
        WHERE d.storeHash = ?
        ORDER BY d.name ASC
      `,
      [storeHash]
    );

    return {
      success: true,
      definitions: definitions || [],
    };
  } catch (error) {
    console.error("Error fetching metaobject definitions:", error);
    throw new Error(error?.message || "Failed to fetch metaobject definitions");
  }
}
