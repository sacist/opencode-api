import { z } from 'zod'
import { BaseController } from '#classes/BaseController'
import { opencodeService } from './opencode.service.js'
import { MDCreationType, OpencodeGoModel } from '#types/opencode'

class OpencodeController extends BaseController {
    public agent = this.run(
        {
            body: z.object({
                model: z.enum(OpencodeGoModel),
                prompt: z.string().min(1).max(32768),
            }),
        },
        async (req) => {
            const { model, prompt } = req.valid.body
            const username = req.user!.username
            const anwser = await opencodeService.agent(username, model, prompt)
            return anwser
        }
    )
    public api = this.run(
        {
            body: z.object({
                model: z.enum(OpencodeGoModel),
                messages: z.array(z.object({
                    role: z.enum(["user", "assistant"]),
                    content: z.string().min(1).max(32768)
                })),
                system: z.string().max(32768).optional(),
                temperature: z.number().min(0).max(1).optional(),
                max_tokens: z.number().min(1).max(32768).optional(),
                api_key: z.string()
            })
        },
        async (req) => {
            const { model, messages, system, temperature, max_tokens, api_key } = req.valid.body
            const anwser = await opencodeService.api(model, messages, api_key, system, temperature, max_tokens)
            return anwser
        }
    )
    public agentMD = this.run(
        {
            body: z.object({
                type: z.enum(MDCreationType),
                prompt: z.string().max(10000),
                saveContext: z.boolean()
            })
        },
        async (req) => {
            const { type, prompt, saveContext } = req.valid.body
            const username = req.user!.username
            const anwser = await opencodeService.agentMD(type, prompt, username, saveContext)
            return anwser
        }
    )
}

export const opencodeController = new OpencodeController()
