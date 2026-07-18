import { z } from 'zod'
import { env } from '#config/env'

const MEDIA_TYPE_REGEX = /^image\/(png|jpe?g|gif|webp|avif)$/
export const MAX_IMAGE_BYTES = env.MAX_IMAGE_MEGABYTES * 1024 * 1024

const base64ByteLength = (s: string) => Buffer.from(s, 'base64').byteLength

export const imageBlockSchema = z.object({
    type: z.literal("image"),
    source: z.object({
        type: z.literal("base64"),
        media_type: z.string().regex(MEDIA_TYPE_REGEX),
        data: z.string().min(1).refine(
            n => base64ByteLength(n) <= MAX_IMAGE_BYTES,
            `Размер изображения не должен превышать ${env.MAX_IMAGE_MEGABYTES} МБ. Можно изменить в .env`
        )
    })
})

export const textBlockSchema = z.object({
    type: z.literal("text"),
    text: z.string().min(1).max(32768)
})

export const contentSchema = z.union([
    z.string().min(1).max(32768),
    z.array(z.union([textBlockSchema, imageBlockSchema]))
])

export const messageSchema = z.object({
    role: z.enum(["user", "assistant"]),
    content: contentSchema
})
