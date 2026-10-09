import crypto from "crypto";

/**
 * BigCommerce WebDAV Client for Metafield and Metaobject File Uploads
*/

const WEBDAV_URL = process.env.BIGCOMMERCE_WEBDAV_URL || "https://store-2dcwnfok6l.mybigcommerce.com/dav";
const WEBDAV_USER = process.env.BIGCOMMERCE_WEBDAV_USERNAME || "";
const WEBDAV_PASS = process.env.BIGCOMMERCE_WEBDAV_PASSWORD || "";
const CDN_URL = process.env.BIGCOMMERCE_CDN_URL || "https://store-2dcwnfok6l.mybigcommerce.com";

let cachedChallenge = null;
let ncCounter = 0;

function md5(str) {
  return crypto.createHash("md5").update(str).digest("hex");
}

function parseDigestHeader(header) {
  const params = {};
  const regex = /(\w+)=(?:"([^"]+)"|([^\s,]+))/g;
  let match;
  while ((match = regex.exec(header)) !== null) {
    params[match[1]] = match[2] || match[3];
  }

  return params;
}

function generateDigestAuthHeader(method, uri, challenge, username, password) {
  const realm = challenge.realm;
  const nonce = challenge.nonce;
  const qop = challenge.qop || "auth";
  const opaque = challenge.opaque;

  ncCounter += 1;
  const nc = ncCounter.toString(16).padStart(8, "0");
  const cnonce = crypto.randomBytes(8).toString("hex");

  const ha1 = md5(`${username}:${realm}:${password}`);
  const ha2 = md5(`${method}:${uri}`);

  let response;
  if (qop === "auth" || qop.includes("auth")) {
    response = md5(`${ha1}:${nonce}:${nc}:${cnonce}:auth:${ha2}`);
  } else {
    response = md5(`${ha1}:${nonce}:${ha2}`);
  }

  let authHeader = `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${uri}", response="${response}"`;
  if (qop) {
    authHeader += `, qop="auth", nc=${nc}, cnonce="${cnonce}"`;
  }
  if (opaque) {
    authHeader += `, opaque="${opaque}"`;
  }

  return authHeader;
}

/**
 * Executes a fetch request with WebDAV HTTP Digest Authentication
 */
async function webdavFetch(url, options = {}) {
  const method = options.method || "GET";
  const urlObj = new URL(url);
  const uri = urlObj.pathname + urlObj.search;

  const headers = { ...(options.headers || {}) };

  // Attempt using cached challenge to avoid extra round-trip
  if (cachedChallenge && WEBDAV_USER && WEBDAV_PASS) {
    headers["Authorization"] = generateDigestAuthHeader(
      method,
      uri,
      cachedChallenge,
      WEBDAV_USER,
      WEBDAV_PASS
    );
  }

  let response = await fetch(url, { ...options, headers });

  // If 401 Unauthorized, challenge might be initial or expired; parse and retry
  if (response.status === 401) {
    const authHeader = response.headers.get("www-authenticate");
    if (authHeader && authHeader.startsWith("Digest")) {
      cachedChallenge = parseDigestHeader(authHeader);
      ncCounter = 0;

      headers["Authorization"] = generateDigestAuthHeader(
        method,
        uri,
        cachedChallenge,
        WEBDAV_USER,
        WEBDAV_PASS
      );

      response = await fetch(url, { ...options, headers });
    }
  }

  return response;
}

/**
 * Ensures a directory path exists on WebDAV by issuing MKCOL requests
 */
async function ensureDirectoryExists(dirPath) {
  const parts = dirPath.split("/").filter(Boolean);
  let current = "";

  for (const part of parts) {
    current += `/${part}`;

    // /content is BigCommerce's built-in root WebDAV collection; MKCOL on it returns 403 Forbidden
    if (current === "/content") {
      continue;
    }

    const endpoint = `${WEBDAV_URL.replace(/\/+$/, "")}${current}`;
    const res = await webdavFetch(endpoint, {
      method: "MKCOL",
    });

    // 201 Created is success; 405 Method Not Allowed means folder already exists
    if (!res.ok && res.status !== 201 && res.status !== 405) {
      const errText = await res.text();
      throw new Error(`Failed to create directory ${current} on WebDAV (status ${res.status}): ${errText}`);
    }
  }
}

/**
 * Uploads a file buffer to BigCommerce WebDAV
 *
 * @param {Buffer|Uint8Array} fileBuffer - The file content
 * @param {string} fileName - Destination filename
 * @param {string} subFolder - Subfolder path inside content/metafields (e.g. "products/117")
 * @param {string} contentType - MIME type of the file
 * @returns {Promise<{ url: string, fileName: string, size: number, contentType: string }>}
 */
export async function uploadToWebDAV(fileBuffer, fileName, subFolder = "general", contentType =
"application/octet-stream") {
  if (!WEBDAV_USER || !WEBDAV_PASS) {
    throw new Error("WebDAV credentials (BIGCOMMERCE_WEBDAV_USERNAME, BIGCOMMERCE_WEBDAV_PASSWORD) are missing.");
  }

  // Sanitize filename
  const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const uniquePrefix = Date.now();
  const finalFileName = `${uniquePrefix}_${cleanFileName}`;

  const directory = `content/metafields/${subFolder.replace(/^\/+|\/+$/g, "")}`;
  await ensureDirectoryExists(directory);

  const targetPath = `/${directory}/${finalFileName}`;
  const webdavEndpoint = `${WEBDAV_URL.replace(/\/+$/, "")}${targetPath}`;

  const response = await webdavFetch(webdavEndpoint, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
    },
    body: fileBuffer,
  });

  if (!response.ok && response.status !== 201 && response.status !== 204 && response.status !== 200) {
    const errorText = await response.text();
    throw new Error(`WebDAV PUT failed (status ${response.status}): ${errorText}`);
  }

  const publicUrl = `${CDN_URL.replace(/\/+$/, "")}${targetPath}`;

  return {
    url: publicUrl,
    fileName: finalFileName,
    size: fileBuffer.length,
    contentType,
  };
}