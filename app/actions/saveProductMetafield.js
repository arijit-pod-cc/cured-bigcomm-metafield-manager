"use server";

import { decodePayload } from "@/lib/auth";
import db from "@/lib/db";

/**
 * Save a product metafield value.
 *
 * This action intentionally supports both:
 *
 * saveProductMetafield(
 *   category,
 *   productId,
 *   definitionId,
 *   value,
 *   context
 * )
 *
 * and:
 *
 * saveProductMetafield({
 *   category,
 *   categoryDataId,
 *   definitionId,
 *   value,
 *   context
 * })
 */
export async function saveProductMetafield(...args) {
  try {
    let category = "products";
    let categoryDataId;
    let definitionId;
    let value;
    let context;

    /*
     * ---------------------------------------------------------
     * OBJECT ARGUMENT
     * ---------------------------------------------------------
     */
    if (
      args.length === 1 &&
      args[0] &&
      typeof args[0] === "object" &&
      !Array.isArray(args[0])
    ) {
      const data = args[0];

      category = data.category || "products";

      categoryDataId =
        data.categoryDataId ??
        data.productId ??
        data.id;

      definitionId =
        data.definitionId ??
        data.metafieldId;

      value = data.value;

      context = data.context;
    }

    /*
     * ---------------------------------------------------------
     * POSITIONAL ARGUMENTS
     *
     * Existing ProductMetaEdit implementations commonly use:
     *
     * category,
     * productId,
     * definitionId,
     * value,
     * context
     *
     * ---------------------------------------------------------
     */
    else {
      category = args[0] || "products";

      categoryDataId = args[1];
      definitionId = args[2];
      value = args[3];
      context = args[4];

      /*
       * Also support the alternate order:
       *
       * category,
       * context,
       * productId,
       * definitionId,
       * value
       *
       * Detect the JWT automatically.
       */
      if (
        typeof args[1] === "string" &&
        args[1].split(".").length === 3
      ) {
        context = args[1];
        categoryDataId = args[2];
        definitionId = args[3];
        value = args[4];
      }
    }

    /*
     * ---------------------------------------------------------
     * VALIDATION
     * ---------------------------------------------------------
     */

    if (!context) {
      throw new Error("Missing context");
    }

    if (!categoryDataId) {
      throw new Error("Missing category data ID");
    }

    if (!definitionId) {
      throw new Error("Missing metafield definition ID");
    }

    /*
     * ---------------------------------------------------------
     * DECODE CONTEXT
     *
     * IMPORTANT:
     * Only context is passed here.
     *
     * Never pass productId / definitionId here.
     * ---------------------------------------------------------
     */

    const payload = decodePayload(context);

    if (!payload) {
      throw new Error("Invalid context");
    }

    const storeHash = payload.context;

    if (!storeHash) {
      throw new Error("Missing store hash");
    }

    const userId = String(
      payload.user?.id || ""
    );

    if (!userId) {
      throw new Error("Missing user ID");
    }

    /*
     * ---------------------------------------------------------
     * VERIFY STORE USER
     * ---------------------------------------------------------
     */

    const hasUser = await db.hasStoreUser(
      storeHash,
      userId
    );

    if (!hasUser) {
      throw new Error("User not authorized");
    }

    /*
     * ---------------------------------------------------------
     * GET METAFIELD DEFINITION
     * ---------------------------------------------------------
     */

    const definitions = await db.query(
      `
        SELECT
          id,
          storeHash,
          category,
          namespace,
          name,
          description,
          type,
          isList,
          isRequired
        FROM metafield_definitions
        WHERE id = ?
          AND storeHash = ?
          AND category = ?
        LIMIT 1
      `,
      [
        definitionId,
        storeHash,
        category,
      ]
    );

    if (
      !definitions ||
      definitions.length === 0
    ) {
      throw new Error(
        "Metafield definition not found"
      );
    }

    const definition = definitions[0];

    /*
     * ---------------------------------------------------------
     * NORMALIZE VALUE
     * ---------------------------------------------------------
     */

    let normalizedValue = value;

    /*
     * List metafield
     */
    if (Number(definition.isList) === 1) {
      if (!Array.isArray(normalizedValue)) {
        normalizedValue =
          normalizedValue === null ||
          normalizedValue === undefined ||
          normalizedValue === ""
            ? []
            : [normalizedValue];
      }

      /*
       * Remove empty inputs.
       */
      normalizedValue =
        normalizedValue.filter(
          (item) =>
            item !== null &&
            item !== undefined &&
            String(item).trim() !== ""
        );
    }

    /*
     * ---------------------------------------------------------
     * REQUIRED VALIDATION
     * ---------------------------------------------------------
     */

    if (Number(definition.isRequired) === 1) {
      const emptyList =
        Number(definition.isList) === 1 &&
        Array.isArray(normalizedValue) &&
        normalizedValue.length === 0;

      const emptyValue =
        normalizedValue === null ||
        normalizedValue === undefined ||
        normalizedValue === "";

      if (emptyValue || emptyList) {
        throw new Error(
          `${definition.name} is required`
        );
      }
    }

    /*
     * ---------------------------------------------------------
     * JSON VALUE
     * ---------------------------------------------------------
     */

    const valueJson =
      JSON.stringify(normalizedValue);

    /*
     * ---------------------------------------------------------
     * CHECK EXISTING PRODUCT VALUE
     *
     * A value is uniquely identified by:
     *
     * storeHash
     * definitionId
     * category
     * category_data_id
     * ---------------------------------------------------------
     */

    const existing = await db.query(
      `
        SELECT id
        FROM metafield_values
        WHERE storeHash = ?
          AND definitionId = ?
          AND category = ?
          AND category_data_id = ?
        LIMIT 1
      `,
      [
        storeHash,
        definitionId,
        category,
        String(categoryDataId),
      ]
    );

    /*
     * ---------------------------------------------------------
     * UPDATE
     * ---------------------------------------------------------
     */

    if (
      existing &&
      existing.length > 0
    ) {
      const valueId = existing[0].id;

      await db.query(
        `
          UPDATE metafield_values
          SET valueJson = ?
          WHERE id = ?
            AND storeHash = ?
        `,
        [
          valueJson,
          valueId,
          storeHash,
        ]
      );

      return {
        success: true,
        action: "updated",
        id: valueId,
        category,
        category_data_id:
          String(categoryDataId),
        definitionId:
          Number(definitionId),
      };
    }

    /*
     * ---------------------------------------------------------
     * INSERT
     * ---------------------------------------------------------
     */

    const result = await db.query(
      `
        INSERT INTO metafield_values
        (
          storeHash,
          definitionId,
          category,
          category_data_id,
          valueJson
        )
        VALUES (?, ?, ?, ?, ?)
      `,
      [
        storeHash,
        definitionId,
        category,
        String(categoryDataId),
        valueJson,
      ]
    );

    return {
      success: true,
      action: "created",
      id: result.insertId,
      category,
      category_data_id:
        String(categoryDataId),
      definitionId:
        Number(definitionId),
    };
  } catch (error) {
    console.error(
      "Error saving product metafield:",
      error
    );

    throw new Error(
      error?.message ||
        "Failed to save metafield"
    );
  }
}
