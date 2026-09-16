import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(request, { params }) {
  try {
    const { category, id } = await params;

    /*
     * Query metafield values for this resource.
     */
    const sql = `
      SELECT valueJson
      FROM metafield_values
      WHERE category = ?
        AND category_data_id = ?
    `;

    const values = [category, String(id)];
    const results = await query(sql, values);

    /*
     * Merge all valueJson into a single object, strictly using namespace.key format.
     */
    const rawData = {};

    results.forEach((row) => {
      if (row.valueJson) {
        try {
          const parsed = JSON.parse(row.valueJson);
          Object.assign(rawData, parsed);
        } catch {}
      }
    });

    const metafieldData = {};
    Object.entries(rawData).forEach(([k, v]) => {
      if (k.includes(".")) {
        metafieldData[k] = v;
      } else if (rawData[`custom.${k}`] === undefined) {
        metafieldData[`custom.${k}`] = v;
      }
    });

    return NextResponse.json(
      {
        success: true,
        category,
        id: Number(id),
        metafield: metafieldData,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error fetching metafield values:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch metafield values",
        error: error.message,
      },
      {
        status: 500,
      }
    );
  }
}
