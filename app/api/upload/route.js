import { NextResponse } from "next/server";
import { uploadToWebDAV } from "@/lib/webdav";
import { decodePayload } from "@/lib/auth";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const category = formData.get("category") || "general";
    const itemId = formData.get("itemId") || "default";
    const context = formData.get("context") || "";

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (context) {
      try {
        decodePayload(context);
      } catch (err) {
        return NextResponse.json(
          { error: "Invalid context token" },
          { status: 401 }
        );
      }
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = file.name || "upload";
    const mimeType = file.type || "application/octet-stream";

    const subFolder = `${category}/${itemId}`;
    const result = await uploadToWebDAV(buffer, fileName, subFolder, mimeType);

    return NextResponse.json({
      success: true,
      url: result.url,
      fileName: result.fileName,
      size: result.size,
      contentType: result.contentType,
    });
  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to upload file" },
      { status: 500 }
    );
  }
}
