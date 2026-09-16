"use server";

import { decodePayload } from "@/lib/auth";
import db from "@/lib/db";

export async function getMetaobjectEntry(context, definitionTypeOrId, entryId) {
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

    // Fetch fields
    const fields = await db.query(
      `
        SELECT
          id,
          metaobjectDefinitionId,
          \`key\`,
          name,
          description,
          type,
          isList,
          referenceMetaobjectDefinitionId,
          validationsJson,
          isRequired,
          sortOrder
        FROM metaobject_field_definitions
        WHERE metaobjectDefinitionId = ?
        ORDER BY sortOrder ASC
      `,
      [definition.id]
    );

    let entry = null;
    const values = {};

    if (entryId && entryId !== "new") {
      const entries = await db.query(
        `SELECT id, metaobjectDefinitionId, handle, displayName, status FROM metaobject_entries WHERE id = ? AND metaobjectDefinitionId = ? LIMIT 1`,
        [Number(entryId), definition.id]
      );

      if (entries && entries.length > 0) {
        entry = entries[0];

        const fieldValues = await db.query(
          `SELECT fieldDefinitionId, valueJson FROM metaobject_field_values WHERE entryId = ?`,
          [entry.id]
        );

        for (const row of fieldValues) {
          try {
            values[row.fieldDefinitionId] = JSON.parse(row.valueJson);
          } catch {
            values[row.fieldDefinitionId] = row.valueJson;
          }
        }
      }
    }

    return {
      success: true,
      definition,
      entry,
      fields: (fields || []).map((f) => ({
        ...f,
        isList: Boolean(f.isList),
        isRequired: Boolean(f.isRequired),
        validations: f.validationsJson ? JSON.parse(f.validationsJson) : null,
      })),
      values,
    };
  } catch (error) {
    console.error("Error fetching metaobject entry:", error);
    throw new Error(error?.message || "Failed to fetch metaobject entry");
  }
}
