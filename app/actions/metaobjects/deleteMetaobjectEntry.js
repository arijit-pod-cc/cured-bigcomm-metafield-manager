"use server";

import { decodePayload } from "@/lib/auth";
import db from "@/lib/db";

export async function deleteMetaobjectEntry(context, entryId) {
  try {
    if (!context) throw new Error("Missing context");

    const payload = decodePayload(context);
    if (!payload) throw new Error("Invalid context");

    const storeHash = payload.context;
    if (!storeHash) throw new Error("Missing store hash");

    const userId = String(payload.user?.id || "");
    const hasUser = await db.hasStoreUser(storeHash, userId);
    if (!hasUser) throw new Error("User not authorized");

    // Delete field values
    await db.query("DELETE FROM metaobject_field_values WHERE entryId = ?", [Number(entryId)]);

    // Delete entry
    await db.query("DELETE FROM metaobject_entries WHERE id = ? AND storeHash = ?", [Number(entryId), storeHash]);

    return { success: true };
  } catch (error) {
    console.error("Error deleting metaobject entry:", error);
    throw new Error(error?.message || "Failed to delete metaobject entry");
  }
}
