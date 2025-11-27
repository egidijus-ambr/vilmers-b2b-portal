import { NextRequest, NextResponse } from "next/server"
import { getProductInteriorPhotos } from "@lib/data/product-photos"
import archiver from "archiver"
import fs from "fs"
import path from "path"
import { createHash } from "crypto"

// Cache configuration
const CACHE_DIR = path.join(process.cwd(), "tmp", "photo-zips")
const CACHE_DURATION_HOURS = 24
const MAX_CACHE_SIZE_MB = 500

interface CacheEntry {
  filePath: string
  timestamp: number
  productName: string
  photoCount: number
  size: number
}

// Ensure cache directory exists
function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true })
  }
}

// Generate cache key from photos
function generateCacheKey(productName: string, photoUrls: string[]): string {
  const content = productName + photoUrls.sort().join("")
  return createHash("md5").update(content).digest("hex")
}

// Get cache file path
function getCacheFilePath(cacheKey: string, productName: string): string {
  const sanitizedName = productName.replace(/[^a-zA-Z0-9-_]/g, "_")
  return path.join(CACHE_DIR, `${sanitizedName}_${cacheKey}.zip`)
}

// Check if cache is valid
function isCacheValid(filePath: string): boolean {
  if (!fs.existsSync(filePath)) return false

  const stats = fs.statSync(filePath)
  const ageHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60)

  return ageHours < CACHE_DURATION_HOURS
}

// Clean old cache files
async function cleanupCache() {
  try {
    ensureCacheDir()
    const files = fs.readdirSync(CACHE_DIR)
    let totalSize = 0
    const fileInfos: Array<{ path: string; mtime: number; size: number }> = []

    for (const file of files) {
      const filePath = path.join(CACHE_DIR, file)
      const stats = fs.statSync(filePath)

      // Remove files older than cache duration
      const ageHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60)
      if (ageHours > CACHE_DURATION_HOURS) {
        fs.unlinkSync(filePath)
        continue
      }

      totalSize += stats.size
      fileInfos.push({
        path: filePath,
        mtime: stats.mtime.getTime(),
        size: stats.size,
      })
    }

    // If cache size exceeds limit, remove oldest files
    const maxSizeBytes = MAX_CACHE_SIZE_MB * 1024 * 1024
    if (totalSize > maxSizeBytes) {
      fileInfos.sort((a, b) => a.mtime - b.mtime) // Sort by age, oldest first

      while (totalSize > maxSizeBytes && fileInfos.length > 0) {
        const oldest = fileInfos.shift()!
        fs.unlinkSync(oldest.path)
        totalSize -= oldest.size
      }
    }
  } catch (error) {
    console.error("Cache cleanup failed:", error)
  }
}

// Download image from URL
async function downloadImage(url: string): Promise<Buffer> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`)
    }
    return Buffer.from(await response.arrayBuffer())
  } catch (error) {
    console.error(`Error downloading image from ${url}:`, error)
    throw error
  }
}

// Create ZIP file with photos
async function createZipFile(
  productName: string,
  photos: Array<{ url: string; name: string }>,
  filePath: string
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const output = fs.createWriteStream(filePath)
      const archive = archiver("zip", { zlib: { level: 6 } })

      // Wait for the output stream to close completely
      output.on("close", () => {
        console.log(`ZIP file created: ${archive.pointer()} total bytes`)
        resolve()
      })

      output.on("error", reject)
      archive.on("error", reject)

      archive.pipe(output)

      // Download and add each photo to the ZIP
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i]
        try {
          const imageBuffer = await downloadImage(photo.url)
          const extension = path.extname(photo.url) || ".jpg"
          const fileName = `${productName}_Interior_${String(i + 1).padStart(
            2,
            "0"
          )}${extension}`

          archive.append(imageBuffer, { name: fileName })
        } catch (error) {
          console.error(`Failed to download photo ${photo.url}:`, error)
          // Continue with other photos even if one fails
        }
      }

      // Finalize the archive (this triggers the 'close' event on output stream)
      await archive.finalize()
    } catch (error) {
      reject(error)
    }
  })
}

// Import session validation utilities
import { validateSession } from "@lib/util/session-validation"

export async function GET(
  request: NextRequest,
  { params }: { params: { productName: string } }
) {
  try {
    // Validate customer session
    const sessionValidation = await validateSession()
    if (!sessionValidation.isValid) {
      console.error("Session validation failed:", sessionValidation.error)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const productName = decodeURIComponent(params.productName)

    if (!productName) {
      return NextResponse.json(
        { error: "Product name is required" },
        { status: 400 }
      )
    }

    // Get product photos
    const photos = await getProductInteriorPhotos(productName)

    if (!photos.length) {
      return NextResponse.json(
        { error: "No photos found for this product" },
        { status: 404 }
      )
    }

    // Generate cache key
    const photoUrls = photos.map((p) => p.url)
    const cacheKey = generateCacheKey(productName, photoUrls)
    const cacheFilePath = getCacheFilePath(cacheKey, productName)

    // Check if valid cache exists
    if (isCacheValid(cacheFilePath)) {
      console.log(`Serving cached ZIP for ${productName}`)

      // Read file and serve as binary
      const fileBuffer = fs.readFileSync(cacheFilePath)
      const fileName = `${productName.replace(
        /[^a-zA-Z0-9-_]/g,
        "_"
      )}_photos.zip`

      return new Response(new Uint8Array(fileBuffer), {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "Content-Length": fileBuffer.length.toString(),
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
      })
    }

    // No valid cache, create new ZIP
    console.log(
      `Creating new ZIP for ${productName} with ${photos.length} photos`
    )

    // Ensure cache directory exists
    ensureCacheDir()

    // Create ZIP file
    await createZipFile(productName, photos, cacheFilePath)

    // Clean up old cache files in background
    cleanupCache().catch(console.error)

    // Serve the newly created file
    const fileBuffer = fs.readFileSync(cacheFilePath)
    const fileName = `${productName.replace(/[^a-zA-Z0-9-_]/g, "_")}_photos.zip`

    return new Response(new Uint8Array(fileBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": fileBuffer.length.toString(),
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    })
  } catch (error) {
    console.error("Error creating ZIP download:", error)
    return NextResponse.json(
      { error: "Failed to create photo ZIP" },
      { status: 500 }
    )
  }
}
