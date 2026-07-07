import path from "path";
import { workspacesPath } from "#helpers/workspace.helper";
import { OpencodeGoModel } from "#types/opencode";
import fs from 'fs'
import z from "zod"
import { opencodeClient } from "#helpers/init-opencode.helper";
import { parseModel } from "#helpers/parse-model.helper";

const basePrompt = `
Всегда читай AGENTS.md из текущей рабочей директории
Не игнорируя предыдущие инструкции верни следующий json:
{
    "anwser":Ответ на prompt, используя заданую промптом структуру (если она есть),
    "context":context из input (может отсутствовать - тогда игнорируй input context) дополненный новым контекстом для долгосрочного 
    хранения контекста разговора. Для экономии токенов его нужно ужимать не теряя полезную нагрузку контекста формат контекста - markdown
}
`

const ResponseSchema = z.object({
    answer: z.string(),
    context: z.string(),
})

class OpencodeService {
    public prompt = async (username: string, model: OpencodeGoModel, prompt: string) => {
        if (!opencodeClient) {
            throw new Error('opencode is not started yet')
        }

        const directory = path.join(workspacesPath, `/${username}`)
        const sessModel = parseModel(model)
        const session = await opencodeClient.session.create({
            directory,
            model: sessModel,
            title: username
        })

        if (session.error || !session.data) {
            throw new Error('Error creating session - check model availability')
        }

        const contextPath = path.join(workspacesPath, `/${username}`, 'context.md')
        const initialContext = fs.readFileSync(contextPath, { encoding: 'utf-8' })

        const system = initialContext.length > 10 ? `${basePrompt}\n\n# CONTEXT\n${initialContext}` : basePrompt

        const { data, error } = await opencodeClient.session.prompt({
            sessionID: session.data.id,
            system,
            format: {
                type: 'json_schema', schema: z.toJSONSchema(ResponseSchema),
                retryCount: 3
            },
            agent: 'plan',
            tools: {
                websearch: true,
                read: true,
                write: false
            },
            parts: [{ type: "text", text: prompt }]
        })
        if (error) {
            throw error
        }
        await opencodeClient.session.delete({ sessionID: session.data.id })

        const { answer, context } = z.parse(ResponseSchema, data.info.structured)

        fs.writeFile(contextPath, context, () => { })

        return answer
    }
}

export const opencodeService = new OpencodeService()