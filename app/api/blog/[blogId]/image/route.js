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
    const { blogId } = await params;
    const { searchParams } = new URL(request.url);
    const context = searchParams.get("context");

    if (!context || !blogId) {
      const fallback = buildFallbackImage();
      return new NextResponse(fallback, {
        headers: {
          "Content-Type": "image/webp",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    const session = decodePayload(context);
    const storeHash = session?.context;
    const user = session?.user;

    if (!storeHash || !user?.id) {
      const fallback = buildFallbackImage();
      return new NextResponse(fallback, {
        headers: {
          "Content-Type": "image/webp",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    const db = (await import("@/lib/db")).default;
    const hasUser = await db.hasStoreUser(storeHash, String(user.id));

    if (!hasUser) {
      const fallback = buildFallbackImage();
      return new NextResponse(fallback, {
        headers: {
          "Content-Type": "image/webp",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    const accessToken = await db.getStoreToken(storeHash);

    if (!accessToken) {
      const fallback = buildFallbackImage();
      return new NextResponse(fallback, {
        headers: {
          "Content-Type": "image/webp",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    // Fetch blog post from BigCommerce v2 API
    const postRes = await fetch(
      `https://api.bigcommerce.com/stores/${storeHash}/v2/blog/posts/${blogId}`,
      {
        headers: {
          "X-Auth-Token": accessToken,
          Accept: "application/json",
        },
      }
    );

    if (!postRes.ok) {
      const fallback = buildFallbackImage();
      return new NextResponse(fallback, {
        headers: {
          "Content-Type": "image/webp",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    const post = await postRes.json();

    if (!post?.thumbnail_path) {
      const fallback = buildFallbackImage();
      return new NextResponse(fallback, {
        headers: {
          "Content-Type": "image/webp",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    const cdnUrl = process.env.BIGCOMMERCE_CDN_URL || `https://store-${storeHash}.mybigcommerce.com`;
    const fullImageUrl = post.thumbnail_path.startsWith("http")
      ? post.thumbnail_path
      : `${cdnUrl.replace(/\/+$/, "")}${post.thumbnail_path.startsWith("/") ? "" : "/"}${post.thumbnail_path}`;

    const imgRes = await fetch(fullImageUrl, { cache: "no-store" });

    if (!imgRes.ok) {
      const fallback = buildFallbackImage();
      return new NextResponse(fallback, {
        headers: {
          "Content-Type": "image/webp",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    const imgBuffer = Buffer.from(await imgRes.arrayBuffer());

    return new NextResponse(imgBuffer, {
      headers: {
        "Content-Type": imgRes.headers.get("content-type") || "image/jpeg",
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
