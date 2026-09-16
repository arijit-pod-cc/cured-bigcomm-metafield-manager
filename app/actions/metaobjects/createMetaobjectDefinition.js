"use server";

import { decodePayload } from "@/lib/auth";
import db from "@/lib/db";

export async function createMetaobjectDefinition(context, data) {
  try {
    if (!context) throw new Error("Missing context");

    const payload = decodePayload(context);
    if (!payload) throw new Error("Invalid context");

    const storeHash = payload.context;
    if (!storeHash) throw new Error("Missing store hash");

    const userId = String(payload.user?.id || "");
    const hasUser = await db.hasStoreUser(storeHash, userId);
    if (!hasUser) throw new Error("User not authorized");

    const name = String(data?.name || "").trim();
    const type = String(data?.type || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "");
    const description = String(data?.description || "").trim();
    const displayFieldKey = String(data?.displayFieldKey || "").trim();
    const fields = Array.isArray(data?.fields) ? data.fields : [];

    if (!name) throw new Error("Name is required");
    if (!type) throw new Error("Type identifier is required");
    if (fields.length === 0) throw new Error("At least one field is required");

    // Check duplicate type
    const existing = await db.query(
      "SELECT id FROM metaobject_definitions WHERE storeHash = ? AND type = ? LIMIT 1",
      [storeHash, type]
    );
    if (existing.length > 0) {
      throw new Error(`Metaobject type "${type}" already exists`);
    }

    // Insert definition
    const defResult = await db.query(
      `
        INSERT INTO metaobject_definitions (
          storeHash,
          type,
          name,
          description,
          displayFieldKey,
          status
        ) VALUES (?, ?, ?, ?, ?, 'active')
      `,
      [storeHash, type, name, description || null, displayFieldKey || fields[0]?.key || "name"]
    );

    const definitionId = defResult.insertId;

    // Insert fields
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      const fieldKey = String(field.key || field.name || `field_${i}`)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, "_");

      const validationsJson = field.validations
        ? JSON.stringify(field.validations)
        : (typeof field.validationsJson === "string" ? field.validationsJson : null);

      await db.query(
        `
          INSERT INTO metaobject_field_definitions (
            storeHash,
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
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          storeHash,
          definitionId,
          fieldKey,
          field.name || fieldKey,
          field.description || null,
          field.type || "single_line_text",
          field.isList ? 1 : 0,
          field.referenceMetaobjectDefinitionId ? Number(field.referenceMetaobjectDefinitionId) : null,
          validationsJson,
          field.isRequired ? 1 : 0,
          i,
        ]
      );
    }

    return {
      success: true,
      id: definitionId,
      type,
    };
  } catch (error) {
    console.error("Error creating metaobject definition:", error);
    throw new Error(error?.message || "Failed to create metaobject definition");
  }
}
