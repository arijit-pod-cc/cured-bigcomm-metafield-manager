import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { decodePayload } from "@/lib/auth";

function buildFallbackImage() {
  const filePath = join(process.cwd(), "public", "default_image.webp");
  return readFileSync(filePath);
}

export async function GET(request, { params }) {
  try {
    const { productId } = await params;
    const { searchParams } = new URL(request.url);
    const context = searchParams.get("context");

    if (!context || !productId) {
      return NextResponse.json({ message: "Missing context or product id" }, { status: 400 });
    }

    const session = decodePayload(context);
    const storeHash = session?.context;
    const user = session?.user;

    if (!storeHash || !user?.id) {
      return NextResponse.json({ message: "Invalid session context" }, { status: 401 });
    }

    const db = (await import("@/lib/db")).default;
    const hasUser = await db.hasStoreUser(storeHash, String(user.id));

    if (!hasUser) {
      return NextResponse.json({ message: "User does not have access to this store." }, { status: 403 });
    }

    const accessToken = await db.getStoreToken(storeHash);

    if (!accessToken) {
      return NextResponse.json({ message: "BigCommerce access token not found." }, { status: 401 });
    }

    const { bigcommerceClient } = await import("@/lib/auth");
    const client = bigcommerceClient(accessToken, storeHash);
    const response = await client.get(`/catalog/products/${productId}/images`);
    const image = (response?.data || [])[0];

    if (!image?.url_tiny) {
      const fallback = buildFallbackImage();
      return new NextResponse(fallback, {
        headers: {
          "Content-Type": "image/webp",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    const imageResponse = await fetch(image.url_tiny, { cache: "no-store" });

    if (!imageResponse.ok) {
      const fallback = buildFallbackImage();
      return new NextResponse(fallback, {
        headers: {
          "Content-Type": "image/webp",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": imageResponse.headers.get("content-type") || "image/webp",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    const fallback = buildFallbackImage();
    return new NextResponse(fallback, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=86400",
      },
    });
  }
}
