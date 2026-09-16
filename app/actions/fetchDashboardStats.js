"use server";

import { decodePayload } from "@/lib/auth";
import db from "@/lib/db";

export async function fetchDashboardStats(context) {
  try {
    if (!context) return { metaCategoriesCount: 0, metaobjectsCount: 0 };

    const payload = decodePayload(context);
    if (!payload?.context) return { metaCategoriesCount: 0, metaobjectsCount: 0 };

    const storeHash = payload.context;

    // Count distinct categories configured in metafield_definitions
    const catRows = await db.query(
      "SELECT COUNT(DISTINCT category) as cnt FROM metafield_definitions WHERE storeHash = ?",
      [storeHash]
    );

    // Count metaobject definitions
    const moRows = await db.query(
      "SELECT COUNT(*) as cnt FROM metaobject_definitions WHERE storeHash = ?",
      [storeHash]
    );

    return {
      metaCategoriesCount: catRows?.[0]?.cnt || 0,
      metaobjectsCount: moRows?.[0]?.cnt || 0,
    };
  } catch (err) {
    console.error("Error fetching dashboard stats:", err);
    return { metaCategoriesCount: 0, metaobjectsCount: 0 };
  }
}
