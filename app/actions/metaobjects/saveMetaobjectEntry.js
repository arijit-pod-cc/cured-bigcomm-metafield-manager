"use server";

import { decodePayload } from "@/lib/auth";
import db from "@/lib/db";

export async function saveMetaobjectEntry(context, definitionTypeOrId, data) {
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

    const fields = await db.query(
      `SELECT id, \`key\`, name, type, isList, isRequired FROM metaobject_field_definitions WHERE metaobjectDefinitionId = ?`,
      [definition.id]
    );

    const entryId = data?.id ? Number(data.id) : null;
    const values = data?.values || {};

    // Validate required fields
    for (const field of fields) {
      if (field.isRequired) {
        const val = values[field.id];
        const isEmpty = val === null || val === undefined || val === "" || (Array.isArray(val) && val.length === 0);
        if (isEmpty) {
          throw new Error(`${field.name} is required`);
        }
      }
    }

    // Determine displayName from displayFieldKey or first field or handle
    let displayName = data?.displayName ? String(data.displayName).trim() : "";
    if (!displayName) {
      const displayField = fields.find((f) => f.key === definition.displayFieldKey) || fields[0];
      if (displayField && values[displayField.id] !== undefined) {
        const raw = values[displayField.id];
        displayName = Array.isArray(raw) ? raw.join(", ") : String(raw);
      }
    }
    if (!displayName) {
      displayName = `Entry ${Date.now()}`;
    }

    // Handle slug
    let handle = String(data?.handle || displayName)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (!handle) {
      handle = `entry-${Date.now()}`;
    }

    let savedEntryId = entryId;

    if (entryId) {
      // Update entry
      await db.query(
        `
          UPDATE metaobject_entries
          SET displayName = ?, handle = ?, status = ?, updatedAt = NOW()
          WHERE id = ? AND metaobjectDefinitionId = ?
        `,
        [displayName, handle, data?.status || "active", entryId, definition.id]
      );
    } else {
      // Insert entry
      const insertResult = await db.query(
        `
          INSERT INTO metaobject_entries (
            storeHash,
            metaobjectDefinitionId,
            handle,
            displayName,
            status
          ) VALUES (?, ?, ?, ?, ?)
        `,
        [storeHash, definition.id, handle, displayName, data?.status || "active"]
      );
      savedEntryId = insertResult.insertId;
    }

    // Save field values
    for (const field of fields) {
      const rawVal = values[field.id] !== undefined ? values[field.id] : null;
      const jsonVal = JSON.stringify(rawVal);

      // Check existing field value
      const existingVal = await db.query(
        `SELECT id FROM metaobject_field_values WHERE entryId = ? AND fieldDefinitionId = ? LIMIT 1`,
        [savedEntryId, field.id]
      );

      if (existingVal && existingVal.length > 0) {
        await db.query(
          `UPDATE metaobject_field_values SET valueJson = ?, updatedAt = NOW() WHERE id = ?`,
          [jsonVal, existingVal[0].id]
        );
      } else {
        await db.query(
          `
            INSERT INTO metaobject_field_values (
              storeHash,
              entryId,
              fieldDefinitionId,
              valueJson
            ) VALUES (?, ?, ?, ?)
          `,
          [storeHash, savedEntryId, field.id, jsonVal]
        );
      }
    }

    return {
      success: true,
      entryId: savedEntryId,
      handle,
      displayName,
    };
  } catch (error) {
    console.error("Error saving metaobject entry:", error);
    throw new Error(error?.message || "Failed to save metaobject entry");
  }
}
