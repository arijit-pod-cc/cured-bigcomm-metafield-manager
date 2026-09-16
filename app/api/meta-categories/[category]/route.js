import { NextResponse } from "next/server";
import {
  decodePayload,
  bigcommerceClient,
} from "@/lib/auth";

export async function GET(request, { params }) {
  try {
    const { category } = await params;

    const { searchParams } = new URL(request.url);

    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 20);
    const search = searchParams.get("search") || "";

    /*
     * Context comes from the embedded app URL.
     *
     * Example:
     * /meta-categories/products?context=xxxxx
     */
    const encodedContext = searchParams.get("context");

    if (!encodedContext) {
      return NextResponse.json(
        {
          message: "Missing context",
        },
        {
          status: 401,
        }
      );
    }

    const session = decodePayload(encodedContext);

    const storeHash = session.context;
    const user = session.user;

    /*
     * IMPORTANT:
     * Get the access token from your MySQL session storage.
     */
    const db = (await import("@/lib/db")).default;

    const hasUser = await db.hasStoreUser(
      storeHash,
      String(user?.id)
    );

    if (!hasUser) {
      return NextResponse.json(
        {
          message:
            "User does not have access to this store.",
        },
        {
          status: 403,
        }
      );
    }

    const accessToken =
      await db.getStoreToken(storeHash);

    if (!accessToken) {
      return NextResponse.json(
        {
          message:
            "BigCommerce access token not found.",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * For now we implement Products.
     *
     * Later:
     * orders
     * variants
     * categories
     * customers
     * etc.
     */
    if (category !== "products") {
      return NextResponse.json(
        {
          message: `Category "${category}" is not implemented yet.`,
        },
        {
          status: 400,
        }
      );
    }

    const client = bigcommerceClient(
      accessToken,
      storeHash
    );

    const query = {
      page,
      limit,
    };

    if (search.trim()) {
      query.name = search.trim();
    }

    const response = await client.get(
      "/catalog/products",
      query
    );

    const products = response?.data || [];

    const meta = response?.meta?.pagination || {};

    const items = products.map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      image:
        product.primary_image?.url_standard ||
        product.primary_image?.url_thumbnail ||
        null,
    }));

    return NextResponse.json({
      items,

      pagination: {
        total: meta.total || 0,
        totalPages: meta.total_pages || 1,
        currentPage: meta.current_page || page,
        perPage: meta.per_page || limit,
      },
    });
  } catch (error) {
    console.error(
      "Meta category API error:",
      error
    );

    return NextResponse.json(
      {
        message:
          error?.message ||
          "Unable to fetch BigCommerce products.",
      },
      {
        status:
          error?.response?.status || 500,
      }
    );
  }
}