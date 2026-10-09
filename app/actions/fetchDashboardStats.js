"use server";

import { decodePayload } from "@/lib/auth";
import db from "@/lib/db";

import { categories } from "@/data/meta-categories";

export async function fetchDashboardStats(context) {
  try {
    if (!context) return { metaCategoriesCount: categories.length, metaobjectsCount: 0 };

    const payload = decodePayload(context);
    if (!payload?.context) return { metaCategoriesCount: categories.length, metaobjectsCount: 0 };

    const storeHash = payload.context;

    // Count metaobject definitions
    const moRows = await db.query(
      "SELECT COUNT(*) as cnt FROM metaobject_definitions WHERE storeHash = ?",
      [storeHash]
    );

    return {
      metaCategoriesCount: categories.length,
      metaobjectsCount: moRows?.[0]?.cnt || 0,
    };
  } catch (err) {
    console.error("Error fetching dashboard stats:", err);
    return { metaCategoriesCount: 0, metaobjectsCount: 0 };
  }
}
