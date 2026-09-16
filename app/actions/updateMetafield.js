"use server";

import { decodePayload } from "@/lib/auth";
import db from "@/lib/db";

function generateNamespace(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

export async function updateMetafield(
  id,
  category,
  context,
  data
) {
  try {
    if (!context) {
      throw new Error("Missing context");
    }

    if (!id) {
      throw new Error("Missing metafield ID");
    }

    if (!category) {
      throw new Error("Missing metafield category");
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

    const name = String(data?.name || "").trim();
    const description = String(data?.description || "").trim();
    const type = String(data?.type || "").trim();

    const isList = Boolean(data?.isList);
    const isRequired = Boolean(data?.isRequired);

    const referenceMetaobjectDefinitionId =
      data?.referenceMetaobjectDefinitionId
        ? Number(data.referenceMetaobjectDefinitionId)
        : null;

    if (!name) {
      throw new Error("Name is required");
    }

    if (!type) {
      throw new Error("Type is required");
    }

    const key = String(data?.key || generateNamespace(name))
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "");

    const namespace = String(data?.namespace || "custom")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "");

    if (!key) {
      throw new Error("Unable to generate valid key");
    }

    const validationsJson = data?.validationsJson
      ? (typeof data.validationsJson === "string" ? data.validationsJson : JSON.stringify(data.validationsJson))
      : null;

    const defaultValueJson = data?.defaultValueJson
      ? (typeof data.defaultValueJson === "string" ? data.defaultValueJson : JSON.stringify(data.defaultValueJson))
      : null;

    // Make sure the metafield exists for this store/category
    const existing = await db.query(
      `
        SELECT id
        FROM metafield_definitions
        WHERE id = ?
          AND storeHash = ?
          AND category = ?
        LIMIT 1
      `,
      [id, storeHash, category]
    );

    if (!existing.length) {
      throw new Error("Metafield not found");
    }

    // Check duplicate name excluding current record
    const duplicateName = await db.query(
      `
        SELECT id
        FROM metafield_definitions
        WHERE storeHash = ?
          AND category = ?
          AND name = ?
          AND id != ?
        LIMIT 1
      `,
      [storeHash, category, name, id]
    );

    if (duplicateName.length > 0) {
      throw new Error("A metafield with this name already exists");
    }

    // Check duplicate namespace and key excluding current record
    const duplicateKey = await db.query(
      `
        SELECT id
        FROM metafield_definitions
        WHERE storeHash = ?
          AND category = ?
          AND namespace = ?
          AND \`key\` = ?
          AND id != ?
        LIMIT 1
      `,
      [storeHash, category, namespace, key, id]
    );

    if (duplicateKey.length > 0) {
      throw new Error(`A metafield with key "${key}" in namespace "${namespace}" already exists`);
    }

    await db.query(
      `
        UPDATE metafield_definitions
        SET
          namespace = ?,
          \`key\` = ?,
          name = ?,
          description = ?,
          type = ?,
          isList = ?,
          referenceMetaobjectDefinitionId = ?,
          validationsJson = ?,
          defaultValueJson = ?,
          isRequired = ?
        WHERE id = ?
          AND storeHash = ?
          AND category = ?
      `,
      [
        namespace,
        key,
        name,
        description || null,
        type,
        isList ? 1 : 0,
        referenceMetaobjectDefinitionId,
        validationsJson,
        defaultValueJson,
        isRequired ? 1 : 0,
        id,
        storeHash,
        category,
      ]
    );

    return {
      success: true,
      metafield: {
        id,
        storeHash,
        category,
        namespace,
        key,
        name,
        description: description || null,
        type,
        isList: isList ? 1 : 0,
        referenceMetaobjectDefinitionId,
        validationsJson,
        defaultValueJson,
        isRequired: isRequired ? 1 : 0,
      },
    };
  } catch (error) {
    console.error("Error updating metafield:", error);

    throw new Error(error.message || "Failed to update metafield");
  }
}