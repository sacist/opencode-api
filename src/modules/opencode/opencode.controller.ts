import { z } from 'zod'
import { BaseController } from '#classes/BaseController'
import { opencodeService } from './opencode.service.js'
import { MDCreationType, OpencodeGoModel } from '#types/opencode'
import { imageBlockSchema, messageSchema } from '#types/opencode.schemas'
import { MAX_IMAGES } from '#helpers/validate-images'

class OpencodeController extends BaseController {
    public agent = this.run(
        {
            body: z.object({
                model: z.enum(OpencodeGoModel),
                prompt: z.string().min(1).max(32768),
                updateContext: z.boolean().default(true),
                attachments: z.array(imageBlockSchema).max(MAX_IMAGES).optional(),
                schema: z.any().optional(),
                schema_retries: z.number().default(3)
            }),
        },
        async (req) => {
            const { model, prompt, updateContext, attachments, schema, schema_retries } = req.valid.body
            const username = req.user!.username
            return opencodeService.agent(username, model, prompt, updateContext, schema_retries, attachments, schema)
        }
    )
    public api = this.run(
        {
            body: z.object({
                model: z.enum(OpencodeGoModel),
                messages: z.array(messageSchema).min(1),
                system: z.string().max(32768).optional(),
                temperature: z.number().min(0).max(1).optional(),
                max_tokens: z.number().min(1).max(32768).optional(),
                api_key: z.string().min(1).optional()
            })
        },
        async (req) => {
            const { model, messages, system, temperature, max_tokens, api_key } = req.valid.body
            return opencodeService.api(model, messages, api_key, system, temperature, max_tokens)
        }
    )
    public agentMD = this.run(
        {
            body: z.object({
                type: z.enum(MDCreationType),
                prompt: z.string().max(10000),
                resetContext: z.boolean().default(false)
            })
        },
        async (req) => {
            const { type, prompt, resetContext } = req.valid.body
            const username = req.user!.username
            return opencodeService.agentMD(type, prompt, username, resetContext)
        }
    )
    public updateApiKey = this.run(
        {
            body: z.object({
                api_key: z.string().min(1).max(512),
            }),
        },
        async (req) => {
            const { api_key } = req.valid.body
            return opencodeService.updateApiKey(api_key)
        }
    )
}

export const opencodeController = new OpencodeController()
