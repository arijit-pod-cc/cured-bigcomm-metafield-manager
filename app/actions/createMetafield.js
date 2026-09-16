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

export async function createMetafield(category, context, data) {
  try {
    if (!context) {
      throw new Error("Missing context");
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

    // Check duplicate name
    const existingName = await db.query(
      `
        SELECT id
        FROM metafield_definitions
        WHERE storeHash = ?
          AND category = ?
          AND name = ?
        LIMIT 1
      `,
      [storeHash, category, name]
    );

    if (existingName.length > 0) {
      throw new Error("A metafield with this name already exists");
    }

    // Check duplicate namespace and key
    const existingKey = await db.query(
      `
        SELECT id
        FROM metafield_definitions
        WHERE storeHash = ?
          AND category = ?
          AND namespace = ?
          AND \`key\` = ?
        LIMIT 1
      `,
      [storeHash, category, namespace, key]
    );

    if (existingKey.length > 0) {
      throw new Error(`A metafield with key "${key}" in namespace "${namespace}" already exists`);
    }

    const result = await db.query(
      `
        INSERT INTO metafield_definitions (
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
          isRequired
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        storeHash,
        category,
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
      ]
    );

    return {
      success: true,
      id: result.insertId,
      metafield: {
        id: result.insertId,
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
    console.error("Error creating metafield:", error);

    throw new Error(error.message || "Failed to create metafield");
  }
}