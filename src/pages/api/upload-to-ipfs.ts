//moved from chainsafe to uploadthing

import type { NextApiRequest, NextApiResponse } from 'next'
import formidable from 'formidable'
import fs from 'fs'
import { UTApi, UTFile } from 'uploadthing/server'
import crypto from 'crypto'
import path from 'path'

export const config = {
  api: {
    bodyParser: false,
  },
}

/**
 * File Deduplication Cache System
 * ------------------------------
 * A simple file deduplication system that prevents uploading the same file multiple times.
 * 
 * Why we need this:
 * 1. Avoid unnecessary uploads of the same file, reducing bandwidth usage
 * 2. Prevent duplicate files on UploadThing (since they have refuse to implement this them selves), plus saving storage space
 * 3. Return cached URLs immediately for previously uploaded files
 * 
 * How it works:
 * - It calculate a SHA-256 hash of each file's content before uploading
 * - It store the hash and corresponding URL in a JSON file on disk
 * - Before uploading, it check if the file hash already exists in our cache
 * - If found, it return the cached URL without uploading again
 * - If not found, it upload the file normally and add its hash to our cache
 * 
 * The cache persists across server restarts since it's stored on disk.
 * This is a basic implementation - in a high-traffic production app, i will suggest using a database instead of a JSON file.
 */

// File path for storing the hash cache
const CACHE_FILE_PATH = path.join(process.cwd(), 'file-hash-cache.json');

// Load the file hash cache from disk or create a new one
let fileHashCache: Record<string, string> = {};

// Initialize the cache from the JSON file if it exists
try {
  if (fs.existsSync(CACHE_FILE_PATH)) {
    const cacheData = fs.readFileSync(CACHE_FILE_PATH, 'utf8');
    fileHashCache = JSON.parse(cacheData);
    console.log(`Loaded ${Object.keys(fileHashCache).length} cached file hashes`);
  } else {
    console.log('No existing file hash cache found, creating a new one');
    // Create an empty cache file
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify({}), 'utf8');
  }
} catch (error) {
  console.error('Error loading file hash cache:', error);
  // If there's an error, start with an empty cache
  fileHashCache = {};
}

// Function to save the cache to disk
function saveCache() {
  try {
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(fileHashCache, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving file hash cache:', error);
  }
}

// Function to calculate file hash
function calculateFileHash(buffer: Buffer): string {
  // Convert buffer to string to avoid type issues
  const content = buffer.toString('binary');
  const hash = crypto.createHash('sha256');
  hash.update(content);
  return hash.digest('hex');
}

// Function to get file extension
function getFileExtension(filename: string): string {
  return path.extname(filename).toLowerCase();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const form = formidable();

  try {
    const [fields, files] = await form.parse(req);
    
    const file = files.file?.[0];
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const fileContent = await fs.promises.readFile(file.filepath);
    
    // Calculate file hash for deduplication
    const fileHash = calculateFileHash(fileContent);
    const fileExt = getFileExtension(file.originalFilename || '');
    const dedupeKey = `${fileHash}${fileExt}`;
    
    // Check if this file has been uploaded before
    if (fileHashCache[dedupeKey]) {
      console.log('File already exists, returning cached URL:', fileHashCache[dedupeKey]);
      return res.status(200).json({ url: fileHashCache[dedupeKey] });
    }
    
    // Initialize UploadThing API client
    const uploadThingToken = process.env.UPLOADTHING_TOKEN;
    
    if (!uploadThingToken) {
      console.error('Missing UploadThing token');
      return res.status(500).json({ error: 'Server configuration error' });
    }
    
    const utapi = new UTApi({ token: uploadThingToken });
    
    // Create a UTFile object from the file content
    const fileName = file.originalFilename || 'unnamed_file';
    const fileBlob = new Blob([fileContent], { type: file.mimetype || 'application/octet-stream' });
    const utFile = new UTFile(
      [fileBlob], 
      fileName,
      { type: file.mimetype || 'application/octet-stream' }
    );
    
    // Upload file to UploadThing
    const uploadResponse = await utapi.uploadFiles([utFile]);
    
    if (uploadResponse && uploadResponse.length > 0) {
      const fileData = uploadResponse[0];
      
      if (fileData.data && fileData.data.ufsUrl) {
        // Cache the file hash and URL for future requests
        fileHashCache[dedupeKey] = fileData.data.ufsUrl;
        saveCache(); // Save the updated cache to the JSON file
        
        // Only use ufsUrl to avoid deprecation warnings
        res.status(200).json({ url: fileData.data.ufsUrl })
      } else if (fileData.error) {
        console.error('UploadThing error:', fileData.error);
        res.status(500).json({ error: fileData.error.message || 'Failed to upload file' })
      } else {
        res.status(500).json({ error: 'No URL found in the response' })
      }
    } else {
      res.status(500).json({ error: 'No response from UploadThing' })
    }

  } catch (error) {
    console.error('Error uploading file:', error)
    res.status(500).json({ error: 'Failed to upload file' })
  }
}