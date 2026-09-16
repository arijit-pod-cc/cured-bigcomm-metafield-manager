"use server";

import { bigcommerceClient, decodePayload } from "@/lib/auth";
import db from "@/lib/db";

async function getClient(context) {
  if (!context) return null;
  const payload = decodePayload(context);
  const storeHash = payload?.context;
  const user = payload?.user;
  if (!storeHash || !user?.id) return null;

  const hasUser = await db.hasStoreUser(storeHash, String(user.id));
  if (!hasUser) return null;

  const accessToken = await db.getStoreToken(storeHash);
  if (!accessToken) return null;

  return { client: bigcommerceClient(accessToken, storeHash), storeHash };
}

export async function fetchProductVariantsForPicker(context, search = "") {
  try {
    const session = await getClient(context);
    if (!session) {
      throw new Error("Unable to authenticate with BigCommerce");
    }

    const { client, storeHash } = session;

    const params = new URLSearchParams({
      page: "1",
      limit: "50",
      include: "variants,images",
    });

    if (search && search.trim()) {
      params.set("keyword", search.trim());
    }

    const res = await client.get(`/catalog/products?${params.toString()}`);
    const products = res?.data || (Array.isArray(res) ? res : []);

    const variantList = [];

    for (const p of products) {
      const productImage =
        p.images && p.images.length > 0
          ? p.images[0].url_thumbnail || p.images[0].url_standard
          : null;

      const variants = Array.isArray(p.variants) && p.variants.length > 0
        ? p.variants
        : [
            // If product has no explicit option variants, BigCommerce still has base variant
            {
              id: p.id, // fallback base ID
              sku: p.sku,
              price: p.price,
              option_values: [],
            },
          ];

      for (const v of variants) {
        const optionNames = Array.isArray(v.option_values)
          ? v.option_values.map((ov) => ov.label).filter(Boolean).join(" / ")
          : "";

        const variantTitle = optionNames
          ? `${p.name} — ${optionNames}`
          : p.name;

        variantList.push({
          id: String(v.id),
          variantId: String(v.id),
          productId: String(p.id),
          productName: p.name,
          variantTitle,
          options: optionNames || "Default Variant",
          sku: v.sku || p.sku || "",
          price: v.price !== undefined ? v.price : p.price,
          image: v.image_url || productImage,
        });
      }
    }

    return {
      success: true,
      variants: variantList,
    };
  } catch (error) {
    console.error("Error fetching product variants for picker:", error);
    return {
      success: false,
      variants: [],
      error: error?.message,
    };
  }
}
