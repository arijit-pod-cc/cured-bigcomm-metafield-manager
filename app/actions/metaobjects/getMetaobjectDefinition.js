"use server";

import { decodePayload } from "@/lib/auth";
import db from "@/lib/db";

export async function getMetaobjectDefinition(context, identifier) {
  try {
    if (!context) throw new Error("Missing context");

    const payload = decodePayload(context);
    if (!payload) throw new Error("Invalid context");

    const storeHash = payload.context;
    if (!storeHash) throw new Error("Missing store hash");

    const userId = String(payload.user?.id || "");
    const hasUser = await db.hasStoreUser(storeHash, userId);
    if (!hasUser) throw new Error("User not authorized");

    const isNumeric = /^\d+$/.test(String(identifier));
    const whereClause = isNumeric
      ? "d.storeHash = ? AND d.id = ?"
      : "d.storeHash = ? AND d.type = ?";

    const defs = await db.query(
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
          d.updatedAt
        FROM metaobject_definitions d
        WHERE ${whereClause}
        LIMIT 1
      `,
      [storeHash, identifier]
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

    return {
      success: true,
      definition: {
        ...definition,
        fields: (fields || []).map((f) => ({
          ...f,
          isList: Boolean(f.isList),
          isRequired: Boolean(f.isRequired),
          validations: f.validationsJson ? JSON.parse(f.validationsJson) : null,
        })),
      },
    };
  } catch (error) {
    console.error("Error fetching metaobject definition:", error);
    throw new Error(error?.message || "Failed to fetch metaobject definition");
  }
}
