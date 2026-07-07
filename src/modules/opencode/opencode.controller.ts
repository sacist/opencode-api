import { z } from 'zod'
import { BaseController } from '#classes/BaseController'
import { opencodeService } from './opencode.service.js'
import { OpencodeGoModel } from '#types/opencode'

class OpencodeController extends BaseController {
    public prompt = this.run(
        {
            body: z.object({
                model: z.enum(OpencodeGoModel),
                prompt: z.string().min(1).max(32768),
            }),
        },
        async (req) => {
            const { model, prompt } = req.valid!.body as { model: OpencodeGoModel; prompt: string }
            const username = req.user!.username
            const anwser = await opencodeService.prompt(username, model, prompt)
            return anwser
        }
    )
}

export const opencodeController = new OpencodeController()
