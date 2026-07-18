import { fileTypeFromBuffer } from 'file-type'
import { ValidationError } from '#errors/Validation.error'
import { MAX_IMAGE_BYTES } from '#types/opencode.schemas'
import type { ImageBlock, Messages } from '#types/opencode'

export const MAX_IMAGES = 5

export const collectAllImages = (msgs: Messages): ImageBlock[] =>
    msgs.flatMap(m => Array.isArray(m.content)
        ? m.content.filter((b): b is ImageBlock => b.type === 'image')
        : [])

export const validateImages = async (images: ImageBlock[]): Promise<void> => {
    if (images.length > MAX_IMAGES) {
        throw new ValidationError({ reason: `Максимум ${MAX_IMAGES} изображений, передано ${images.length}` })
    }
    for (const img of images) {
        const buf = Buffer.from(img.source.data, 'base64')
        if (buf.byteLength > MAX_IMAGE_BYTES) {
            throw new ValidationError({ reason: `Изображение больше ${MAX_IMAGE_BYTES / 1024 / 1024} МБ` })
        }
        const ft = await fileTypeFromBuffer(buf)
        if (!ft || !ft.mime.startsWith('image/')) {
            throw new ValidationError({ reason: 'Файл не является изображением' })
        }
    }
}
