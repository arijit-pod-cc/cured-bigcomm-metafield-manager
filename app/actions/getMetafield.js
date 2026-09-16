"use server";

import { decodePayload } from "@/lib/auth";
import db from "@/lib/db";

export async function getMetafield(id, category, context) {
  try {
    if (!context) {
      throw new Error("Missing context");
    }

    if (!id) {
      throw new Error("Missing metafield ID");
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

    const rows = await db.query(
      `
        SELECT
          id,
          storeHash,
          category,
          namespace,
          \`key\`,
          name,
          description,
          type,
          isList,
          referenceMetaobjectDefinitionId,
          validationsJson,
          defaultValueJson,
          isRequired,
          visibility,
          sortOrder,
          createdAt,
          updatedAt
        FROM metafield_definitions
        WHERE id = ?
          AND storeHash = ?
          AND category = ?
        LIMIT 1
      `,
      [id, storeHash, category]
    );

    if (!rows.length) {
      throw new Error("Metafield not found");
    }

    return {
      metafield: rows[0],
    };
  } catch (error) {
    console.error("Error fetching metafield:", error);

    throw new Error(error.message || "Failed to fetch metafield");
  }
}