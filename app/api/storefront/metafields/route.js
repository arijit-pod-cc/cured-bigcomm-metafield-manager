import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeHash = searchParams.get("storeHash") || "";
    const category = searchParams.get("category") || "products";
    const itemId =
      searchParams.get("itemId") ||
      searchParams.get("pageId") ||
      searchParams.get("productId") ||
      searchParams.get("id") ||
      "";

    if (!itemId) {
      return NextResponse.json(
        { error: "itemId, pageId, or productId parameter is required" },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    let queryStoreHash = storeHash;
    if (!queryStoreHash) {
      // Find default storeHash from stores table if only 1 store exists
      const stores = await db.query("SELECT storeHash FROM stores LIMIT 1");
      if (stores && stores.length > 0) {
        queryStoreHash = stores[0].storeHash;
      }
    }

    const rows = await db.query(
      `
        SELECT valueJson
        FROM metafield_values
        WHERE storeHash = ?
          AND category = ?
          AND category_data_id = ?
        LIMIT 1
      `,
      [queryStoreHash, category, String(itemId)]
    );

    let bundle = {};
    if (rows && rows.length > 0 && rows[0].valueJson) {
      try {
        const raw = JSON.parse(rows[0].valueJson);
        Object.entries(raw).forEach(([k, v]) => {
          if (k.includes(".")) {
            bundle[k] = v;
          } else if (raw[`custom.${k}`] === undefined) {
            bundle[`custom.${k}`] = v;
          }
        });
      } catch {
        bundle = {};
      }
    }

    return NextResponse.json(
      {
        success: true,
        id: itemId,
        itemId,
        productId: category === "products" ? itemId : undefined,
        pageId: category === "pages" ? itemId : undefined,
        category,
        metafields: bundle,
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
    console.error("Storefront metafields API error:", error);
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
