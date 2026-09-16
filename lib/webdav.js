/**
 * BigCommerce WebDAV Client for Metafield and Metaobject File Uploads
 */

const WEBDAV_URL = process.env.BIGCOMMERCE_WEBDAV_URL || "https://store-2dcwnfok6l.mybigcommerce.com/dav";
const WEBDAV_USER = process.env.BIGCOMMERCE_WEBDAV_USERNAME || "";
const WEBDAV_PASS = process.env.BIGCOMMERCE_WEBDAV_PASSWORD || "";
const CDN_URL = process.env.BIGCOMMERCE_CDN_URL || "https://store-2dcwnfok6l.mybigcommerce.com";

/**
 * Get Basic Auth Header for WebDAV
 */
function getAuthHeader() {
  const auth = Buffer.from(`${WEBDAV_USER}:${WEBDAV_PASS}`).toString("base64");
  return `Basic ${auth}`;
}

/**
 * Ensures a directory path exists on WebDAV by issuing MKCOL requests
 */
async function ensureDirectoryExists(dirPath) {
  const parts = dirPath.split("/").filter(Boolean);
  let current = "";

  for (const part of parts) {
    current += `/${part}`;
    try {
      await fetch(`${WEBDAV_URL}${current}`, {
        method: "MKCOL",
        headers: {
          Authorization: getAuthHeader(),
        },
      });
    } catch {
      // MKCOL returns 405 Method Not Allowed if collection already exists, which is safe to ignore
    }
  }
}

/**
 * Uploads a file buffer or stream to BigCommerce WebDAV
 *
 * @param {Buffer|Uint8Array} fileBuffer - The file content
 * @param {string} fileName - Destination filename
 * @param {string} subFolder - Subfolder path inside content/metafields (e.g. "products/117")
 * @param {string} contentType - MIME type of the file
 * @returns {Promise<{ url: string, fileName: string, size: number }>}
 */
export async function uploadToWebDAV(fileBuffer, fileName, subFolder = "general", contentType = "application/octet-stream") {
  // Sanitize filename
  const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const uniquePrefix = Date.now();
  const finalFileName = `${uniquePrefix}_${cleanFileName}`;

  const directory = `content/metafields/${subFolder.replace(/^\/+|\/+$/g, "")}`;
  await ensureDirectoryExists(directory);

  const targetPath = `/${directory}/${finalFileName}`;
  const webdavEndpoint = `${WEBDAV_URL.replace(/\/+$/, "")}${targetPath}`;

  const response = await fetch(webdavEndpoint, {
    method: "PUT",
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": contentType,
    },
    body: fileBuffer,
  });

  if (!response.ok && response.status !== 201 && response.status !== 204) {
    const errorText = await response.text();
    console.warn(`WebDAV PUT returned status ${response.status}: ${errorText}`);
  }

  // BigCommerce files saved under /content/... on WebDAV are publicly accessible at ${CDN_URL}/content/...
  const publicUrl = `${CDN_URL.replace(/\/+$/, "")}${targetPath}`;

  return {
    url: publicUrl,
    fileName: finalFileName,
    size: fileBuffer.length,
    contentType,
  };
}
