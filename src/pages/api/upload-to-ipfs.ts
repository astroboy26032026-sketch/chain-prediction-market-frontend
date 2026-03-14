// moved from chainsafe to uploadthing

import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import fs from "fs";
import { UTApi, UTFile } from "uploadthing/server";
import crypto from "crypto";
import path from "path";
import sharp from "sharp";

export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * File Deduplication Cache System
 * ------------------------------
 * Prevent uploading the same file multiple times by hashing content.
 *
 * Notes:
 * - On Vercel/serverless, the filesystem is read-only except /tmp
 * - So we store cache file in /tmp for compatibility.
 */

// Use /tmp on serverless (Vercel) to avoid read-only filesystem issues.
// Local/dev also works.
const CACHE_FILE_PATH = path.join(
  process.env.VERCEL ? "/tmp" : process.cwd(),
  "file-hash-cache.json"
);

let fileHashCache: Record<string, string> = {};

function loadCache() {
  try {
    if (fs.existsSync(CACHE_FILE_PATH)) {
      const cacheData = fs.readFileSync(CACHE_FILE_PATH, "utf8");
      fileHashCache = JSON.parse(cacheData || "{}");
      console.log(`Loaded ${Object.keys(fileHashCache).length} cached file hashes`);
    } else {
      console.log("No existing file hash cache found, creating a new one");
      fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify({}), "utf8");
      fileHashCache = {};
    }
  } catch (error) {
    console.error("Error loading file hash cache:", error);
    fileHashCache = {};
  }
}

// Initialize cache once on module load
loadCache();

function saveCache() {
  try {
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(fileHashCache, null, 2), "utf8");
  } catch (error) {
    console.error("Error saving file hash cache:", error);
  }
}

// ✅ Hash binary safely (no string conversion)
function calculateFileHash(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function getFileExtension(filename: string): string {
  return path.extname(filename).toLowerCase();
}

/**
 * Compress images larger than 500KB to ~300KB or less (best-effort).
 */
async function compressImageIfNeeded(buffer: Buffer, mimetype: string): Promise<Buffer> {
  if (!mimetype.startsWith("image/")) return buffer;
  if (buffer.length <= 500 * 1024) return buffer;

  console.log(
    `Compressing image of size ${(buffer.length / 1024).toFixed(2)}KB (type: ${mimetype})`
  );

  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    const width = metadata.width || 1200;
    const height = metadata.height || 1200;

    console.log(`Image dimensions: ${width}x${height}, format: ${metadata.format}`);

    let targetWidth = width;
    let targetHeight = height;

    if (width > 1500 || height > 1500) {
      const aspectRatio = width / height;
      if (width > height) {
        targetWidth = Math.min(width, 1500);
        targetHeight = Math.round(targetWidth / aspectRatio);
      } else {
        targetHeight = Math.min(height, 1500);
        targetWidth = Math.round(targetHeight * aspectRatio);
      }
    }

    let compressedBuffer: Buffer;

    switch (mimetype) {
      case "image/png": {
        compressedBuffer = await image
          .resize(targetWidth, targetHeight, { fit: "inside", withoutEnlargement: true })
          .png({ compressionLevel: 9, adaptiveFiltering: true, palette: true })
          .toBuffer();

        if (compressedBuffer.length > 400 * 1024) {
          compressedBuffer = await image
            .resize(targetWidth, targetHeight, { fit: "inside", withoutEnlargement: true })
            .webp({ quality: 80, lossless: false })
            .toBuffer();
        }
        break;
      }

      case "image/webp": {
        compressedBuffer = await image
          .resize(targetWidth, targetHeight, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 80, nearLossless: true })
          .toBuffer();

        if (compressedBuffer.length > 300 * 1024) {
          compressedBuffer = await image
            .resize(targetWidth, targetHeight, { fit: "inside", withoutEnlargement: true })
            .webp({ quality: 70, nearLossless: false })
            .toBuffer();
        }
        break;
      }

      case "image/gif": {
        compressedBuffer = await image
          .resize(targetWidth, targetHeight, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();
        break;
      }

      case "image/jpeg":
      case "image/jpg":
      default: {
        let quality = 85;
        compressedBuffer = await image
          .resize(targetWidth, targetHeight, { fit: "inside", withoutEnlargement: true })
          .jpeg({ quality, mozjpeg: true })
          .toBuffer();

        if (compressedBuffer.length > 300 * 1024) {
          quality = 75;
          compressedBuffer = await image
            .resize(targetWidth, targetHeight, { fit: "inside", withoutEnlargement: true })
            .jpeg({ quality, mozjpeg: true })
            .toBuffer();
        }

        if (compressedBuffer.length > 300 * 1024) {
          quality = 65;
          compressedBuffer = await image
            .resize(targetWidth, targetHeight, { fit: "inside", withoutEnlargement: true })
            .jpeg({ quality, mozjpeg: true })
            .toBuffer();
        }
        break;
      }
    }

    if (compressedBuffer.length > 400 * 1024) {
      compressedBuffer = await image
        .resize(Math.min(targetWidth, 1200), Math.min(targetHeight, 1200), { fit: "inside" })
        .webp({ quality: 70, alphaQuality: 70 })
        .toBuffer();
    }

    console.log(
      `Compressed image from ${(buffer.length / 1024).toFixed(2)}KB to ${(compressedBuffer.length / 1024).toFixed(2)}KB`
    );

    if (compressedBuffer.length >= buffer.length) {
      console.log("Compression resulted in larger file, using original");
      return buffer;
    }

    return compressedBuffer;
  } catch (error) {
    console.error("Error compressing image:", error);
    return buffer;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  // Security: rate limit uploads (10 per minute per IP)
  const { checkRateLimit, isAllowedImageType, sanitizeFilename } = await import('@/utils/apiSecurity');
  if (!checkRateLimit(req, res, { max: 10, keyPrefix: 'upload' })) return;

  const form = formidable({
    maxFileSize: 10 * 1024 * 1024, // 10MB max
    maxFiles: 1,
  });

  try {
    const [, files] = await form.parse(req);

    const file = files.file?.[0];
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const mime = file.mimetype || "application/octet-stream";

    // Security: validate file type
    if (!isAllowedImageType(mime)) {
      return res.status(400).json({ error: "Only image files are allowed (JPEG, PNG, GIF, WebP, SVG)" });
    }

    // Security: sanitize filename
    const fileName = sanitizeFilename(file.originalFilename || "unnamed_file");

    const fileContent = await fs.promises.readFile(file.filepath);

    // Compress image if needed (for files > 500KB)
    const processedFileContent = await compressImageIfNeeded(fileContent, mime);

    // Calculate file hash for deduplication (using processed content)
    const fileHash = calculateFileHash(processedFileContent);
    const fileExt = getFileExtension(fileName);
    const dedupeKey = `${fileHash}${fileExt}`;

    // Check cache
    const cachedUrl = fileHashCache[dedupeKey];
    if (cachedUrl) {
      console.log("File already exists, returning cached URL:", cachedUrl);
      return res.status(200).json({ url: cachedUrl });
    }

    const uploadThingToken = process.env.UPLOADTHING_TOKEN;
    if (!uploadThingToken) {
      console.error("Missing UploadThing token");
      return res.status(500).json({ error: "Server configuration error" });
    }

    const utapi = new UTApi({ token: uploadThingToken });

    /**
     * ✅ IMPORTANT:
     * Avoid Blob DOM typing issues by converting Buffer -> Uint8Array (copy)
     * This removes SharedArrayBuffer typing conflicts in TS (Node 20).
     */
    const bytes = Uint8Array.from(processedFileContent);
    const utFile = new UTFile([bytes], fileName, { type: mime });

    const uploadResponse = await utapi.uploadFiles([utFile]);

    if (!uploadResponse || uploadResponse.length === 0) {
      return res.status(500).json({ error: "No response from UploadThing" });
    }

    const fileData = uploadResponse[0];

    if (fileData.data?.ufsUrl) {
      const url = fileData.data.ufsUrl;
      fileHashCache[dedupeKey] = url;
      saveCache();
      return res.status(200).json({ url });
    }

    if (fileData.error) {
      console.error("UploadThing error:", fileData.error);
      return res.status(500).json({ error: fileData.error.message || "Failed to upload file" });
    }

    return res.status(500).json({ error: "No URL found in the response" });
  } catch (error) {
    console.error("Error uploading file:", error);
    return res.status(500).json({ error: "Failed to upload file" });
  }
}
