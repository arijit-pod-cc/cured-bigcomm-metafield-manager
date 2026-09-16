"use server";

import { decodePayload } from "@/lib/auth";
import db from "@/lib/db";

export async function fetchProductMetafields(
  category,
  categoryDataId,
  context
) {
  try {
    if (!context) {
      throw new Error("Missing context");
    }

    if (!category) {
      throw new Error("Missing category");
    }

    if (!categoryDataId) {
      throw new Error("Missing category data ID");
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

    /*
     * Get all metafield definitions for this category.
     */
    const definitions = await db.query(
      `
        SELECT
          id,
          name,
          description,
          type,
          isList,
          namespace,
          \`key\`,
          validationsJson,
          defaultValueJson,
          isRequired,
          referenceMetaobjectDefinitionId
        FROM metafield_definitions
        WHERE storeHash = ?
          AND category = ?
        ORDER BY sortOrder ASC, name ASC
      `,
      [storeHash, category]
    );

    /*
     * Get the bundle that contains all metafield values
     * for this specific product/category item.
     *
     * Single row per product with all values as JSON bundle.
     */
    const bundleResults = await db.query(
      `
        SELECT
          id,
          category,
          category_data_id,
          valueJson,
          createdAt,
          updatedAt
        FROM metafield_values
        WHERE storeHash = ?
          AND category = ?
          AND category_data_id = ?
        LIMIT 1
      `,
      [storeHash, category, String(categoryDataId)]
    );

    /*
     * Parse the bundle JSON and convert from
     * namespace-keyed to definitionId-keyed format.
     */
    let bundleData = {};

    if (bundleResults && bundleResults.length > 0) {
      const bundle = bundleResults[0];

      if (bundle.valueJson) {
        try {
          bundleData = JSON.parse(bundle.valueJson);
        } catch {
          bundleData = {};
        }
      }
    }

    const namespaceToValue = bundleData || {};

    /*
     * Build valueMap by matching definitions to
     * bundle values using key, namespace, or combined.
     */
    const valueMap = {};

    for (const definition of definitions || []) {
      const k = definition.key || definition.namespace;
      const ns = definition.namespace;
      
      let val = null;
      if (ns && k && namespaceToValue[`${ns}.${k}`] !== undefined) {
        val = namespaceToValue[`${ns}.${k}`];
      } else if (k && namespaceToValue[k] !== undefined) {
        val = namespaceToValue[k];
      } else if (ns && namespaceToValue[ns] !== undefined) {
        val = namespaceToValue[ns];
      }

      valueMap[String(definition.id)] = {
        id: bundleResults && bundleResults.length > 0 
          ? bundleResults[0].id 
          : null,
        value: val,
      };
    }

    /*
     * Combine definitions + their existing values.
     */
    const metafields = (definitions || []).map((definition) => {
      const existingValue = valueMap[String(definition.id)];

      let parsedValidations = null;
      if (definition.validationsJson) {
        try {
          parsedValidations = JSON.parse(definition.validationsJson);
        } catch {
          parsedValidations = null;
        }
      }

      return {
        id: definition.id,
        name: definition.name,
        description: definition.description || "",
        type: definition.type,
        isList: Boolean(definition.isList),
        namespace: definition.namespace,
        key: definition.key || definition.namespace,
        validations: parsedValidations,
        defaultValue: definition.defaultValueJson || null,
        isRequired: Boolean(definition.isRequired),
        referenceMetaobjectDefinitionId:
          definition.referenceMetaobjectDefinitionId || null,

        valueId: existingValue?.id || null,
        value: existingValue?.value ?? (definition.isList ? [] : null),
      };
    });

    return {
      metafields,
      productId: String(categoryDataId),
    };
  } catch (error) {
    console.error("Error fetching product metafields:", error);

    throw new Error(error.message || "Failed to fetch product metafields");
  }
}