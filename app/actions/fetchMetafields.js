"use server";

import { decodePayload } from "@/lib/auth";
import db from "@/lib/db";

export async function fetchMetafields(category, context, options = {}) {
  try {
    const { search = "" } = options;

    if (!context) {
      throw new Error("Missing context");
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

    let metafields = await db.query(
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
        WHERE storeHash = ?
          AND category = ?
        ORDER BY sortOrder ASC, name ASC
      `,
      [storeHash, category]
    );

    if (search && search.trim()) {
      const searchLower = search.trim().toLowerCase();

      metafields = metafields.filter((mf) => {
        return (
          mf.name?.toLowerCase().includes(searchLower) ||
          mf.namespace?.toLowerCase().includes(searchLower) ||
          mf.key?.toLowerCase().includes(searchLower)
        );
      });
    }

    return {
      metafields: metafields || [],
    };
  } catch (error) {
    console.error("Error fetching metafields:", error);
    throw error;
  }
}