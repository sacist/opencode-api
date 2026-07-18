import type { ImageBlock, PartInput } from '#types/opencode'

export const anthropicImageToFilePart = (img: ImageBlock): PartInput => ({
    type: 'file',
    mime: img.source.media_type,
    url: `data:${img.source.media_type};base64,${img.source.data}`,
})
