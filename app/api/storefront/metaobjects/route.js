import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeHash = searchParams.get("storeHash") || "";
    const type = searchParams.get("type") || "";
    const handle = searchParams.get("handle") || "";
    const id = searchParams.get("id") || "";

    let queryStoreHash = storeHash;
    if (!queryStoreHash) {
      const stores = await db.query("SELECT storeHash FROM stores LIMIT 1");
      if (stores && stores.length > 0) {
        queryStoreHash = stores[0].storeHash;
      }
    }

    if (!type && !id) {
      return NextResponse.json(
        { error: "type or id parameter is required" },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    // Find metaobject definition
    let defQuery = "SELECT id, type, name, displayFieldKey FROM metaobject_definitions WHERE storeHash = ?";
    const defParams = [queryStoreHash];

    if (type) {
      defQuery += " AND type = ?";
      defParams.push(type);
    }

    const defs = await db.query(defQuery, defParams);
    if (!defs || defs.length === 0) {
      return NextResponse.json(
        { error: "Metaobject definition not found" },
        { status: 404, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    const definition = defs[0];

    // Fetch fields
    const fields = await db.query(
      "SELECT id, `key`, name, type, isList FROM metaobject_field_definitions WHERE metaobjectDefinitionId = ? ORDER BY sortOrder ASC",
      [definition.id]
    );

    // Fetch entries
    let entrySql = "SELECT id, handle, displayName, status, createdAt, updatedAt FROM metaobject_entries WHERE metaobjectDefinitionId = ?";
    const entryParams = [definition.id];

    if (handle) {
      entrySql += " AND handle = ?";
      entryParams.push(handle);
    } else if (id) {
      entrySql += " AND id = ?";
      entryParams.push(Number(id));
    }

    const entries = await db.query(entrySql, entryParams);

    // Fetch field values for each entry
    const populatedEntries = [];
    for (const entry of entries) {
      const valRows = await db.query(
        "SELECT fieldDefinitionId, valueJson FROM metaobject_field_values WHERE entryId = ?",
        [entry.id]
      );

      const fieldValues = {};
      for (const row of valRows) {
        const field = fields.find((f) => f.id === row.fieldDefinitionId);
        if (field) {
          try {
            fieldValues[field.key] = JSON.parse(row.valueJson);
          } catch {
            fieldValues[field.key] = row.valueJson;
          }
        }
      }

      populatedEntries.push({
        id: entry.id,
        handle: entry.handle,
        displayName: entry.displayName,
        status: entry.status,
        fields: fieldValues,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      });
    }

    return NextResponse.json(
      {
        success: true,
        definition: {
          id: definition.id,
          type: definition.type,
          name: definition.name,
          displayFieldKey: definition.displayFieldKey,
        },
        entries: populatedEntries,
      },
      {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("Storefront metaobjects API error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
