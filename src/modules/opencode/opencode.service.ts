import path from "path";
import { workspacesPath } from "#helpers/workspace.helper";
import { OpencodeGoModel } from "#types/opencode";
import fs from 'fs'
import z from "zod"
import opencodeClient from "#helpers/init-opencode.helper";
import { parseModel } from "#helpers/parse-model.helper";

const basePrompt = `
Не игнорируя предыдущие инструкции верни следующий json:
{
    "anwser":Ответ на prompt, используя заданую промптом структуру (если она есть),
    "context":context из input дополненный новым контекстом для долгосрочного хранения контекста разговора. Для экономии токенов его нужно ужимать не теряя полезную нагрузку контекста
    формат контекста - markdown
}
`

const ResponseSchema = z.object({
    answer: z.string(),
    context: z.string(),
})

class OpencodeService {
    public query = async (username: string, model: OpencodeGoModel, prompt: string) => {
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
        console.log(session);
        if (!session) {
            throw new Error('Error creating session - check model availability')
        }
        const contextPath = path.join(workspacesPath, `/${username}`, 'context.md')
        const context = fs.readFileSync(contextPath, { encoding: 'utf-8' })

        const system = `${basePrompt}\n\n# CONTEXT\n${context}`

        const { data, error } = await opencodeClient.session.prompt({
            sessionID: session.data!.id,
            system,
            format: {
                type: 'json_schema', schema: z.toJSONSchema(ResponseSchema)
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
        console.log(data);
        await opencodeClient.session.delete({ sessionID: session.data!.id })
    }
}

export const opencodeService = new OpencodeService()