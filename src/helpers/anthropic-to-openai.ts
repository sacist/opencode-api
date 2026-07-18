import type { ContentBlock } from '#types/opencode'

export type OpenAITextPart = { type: 'text'; text: string }
export type OpenAIImagePart = { type: 'image_url'; image_url: { url: string } }
export type OpenAIPart = OpenAITextPart | OpenAIImagePart

export const anthropicBlocksToOpenAIParts = (blocks: ContentBlock[]): OpenAIPart[] =>
    blocks.map(b => b.type === 'text'
        ? { type: 'text', text: b.text }
        : { type: 'image_url', image_url: { url: `data:${b.source.media_type};base64,${b.source.data}` } })
