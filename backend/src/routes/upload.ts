import { Hono } from 'hono'
import { v2 as cloudinary } from 'cloudinary'
import { UTApi } from 'uploadthing/server'
import { authMiddleware } from '../middleware/auth.js'
import { AppEnv } from '../types/index.js'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

export const uploadRouter = new Hono<AppEnv>()

// Check UploadThing configuration
const hasUploadThing = Boolean(process.env.UPLOADTHING_TOKEN)
const utapi = hasUploadThing ? new UTApi({ token: process.env.UPLOADTHING_TOKEN }) : null

// Configure Cloudinary if credentials are provided in env
const hasCloudinary = Boolean(
  process.env.CLOUDINARY_URL ||
  (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
)

if (hasCloudinary) {
  if (process.env.CLOUDINARY_URL) {
    cloudinary.config()
  } else {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    })
  }
}

// Ensure local uploads directory exists for fallback
const UPLOADS_DIR = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(UPLOADS_DIR)) {
  try {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true })
  } catch (_) {}
}

// POST /api/upload — Upload photo to UploadThing / Cloudinary (with local fallback)
uploadRouter.post('/', authMiddleware, async (c) => {
  try {
    let base64Data: string | null = null

    // Check if JSON payload with base64/data URI
    const contentType = c.req.header('content-type') || ''

    if (contentType.includes('application/json')) {
      const body = await c.req.json()
      base64Data = body.image || body.photo || body.file || null
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await c.req.parseBody()
      const file = formData.file || formData.image || formData.photo
      if (file && typeof file === 'object' && 'arrayBuffer' in file) {
        const buffer = Buffer.from(await (file as any).arrayBuffer())
        const mime = (file as any).type || 'image/jpeg'
        base64Data = `data:${mime};base64,${buffer.toString('base64')}`
      } else if (typeof file === 'string') {
        base64Data = file
      }
    }

    if (!base64Data) {
      return c.json({ error: 'No image data provided. Send base64 or multipart file.' }, 400)
    }

    // Extract buffer and mime type
    let matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
    let mimeType = 'image/jpeg'
    let ext = 'jpg'
    let rawBuffer: Buffer

    if (matches && matches.length === 3) {
      mimeType = matches[1]
      ext = mimeType.split('/')[1] || 'jpg'
      rawBuffer = Buffer.from(matches[2], 'base64')
    } else {
      rawBuffer = Buffer.from(base64Data, 'base64')
    }

    const filename = `photo_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`

    // 1. Upload to UploadThing (Primary Cloud Storage)
    if (utapi) {
      try {
        const utFile = new File([rawBuffer], filename, { type: mimeType })
        const utRes = await utapi.uploadFiles(utFile)
        if (utRes.data) {
          const publicUrl = utRes.data.ufsUrl || utRes.data.url
          console.log('✅ Uploaded to UploadThing CDN:', publicUrl)
          return c.json({
            success: true,
            provider: 'uploadthing',
            url: publicUrl,
            key: utRes.data.key,
            name: utRes.data.name,
            size: utRes.data.size,
          })
        }
      } catch (utErr) {
        console.warn('UploadThing upload error, trying fallback:', utErr)
      }
    }

    // 2. Upload to Cloudinary if configured
    if (hasCloudinary) {
      try {
        const uploadResult = await cloudinary.uploader.upload(base64Data, {
          folder: 'vow_profiles',
          transformation: [
            { width: 800, height: 1000, crop: 'limit', quality: 'auto', fetch_format: 'auto' }
          ],
        })

        return c.json({
          success: true,
          provider: 'cloudinary',
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          width: uploadResult.width,
          height: uploadResult.height,
        })
      } catch (cldErr) {
        console.warn('Cloudinary upload error, using local fallback:', cldErr)
      }
    }

    // 3. Fallback: Save to local uploads directory
    const filepath = path.join(UPLOADS_DIR, filename)
    fs.writeFileSync(filepath, rawBuffer)

    const host = c.req.header('host') || 'localhost:3001'
    const protocol = c.req.header('x-forwarded-proto') || 'http'
    const publicUrl = `${protocol}://${host}/uploads/${filename}`

    return c.json({
      success: true,
      provider: 'local',
      url: publicUrl,
      filename,
    })
  } catch (err: any) {
    console.error('Image upload error:', err)
    return c.json({ error: err.message || 'Image upload failed' }, 500)
  }
})
