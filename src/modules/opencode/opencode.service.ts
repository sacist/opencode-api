import path from "path";
import { workspacesPath } from "#helpers/workspace.helper";
import type { OpencodeGoModel, messages } from "#types/opencode";
import fs from 'fs'
import z, { json } from "zod"
import { opencodeClient } from "#helpers/init-opencode.helper";
import { parseModel } from "#helpers/parse-model.helper";
import { logger } from "#config/logger";


class OpencodeService {
    basePromptAgent = `
        Всегда читай AGENTS.md из текущей рабочей директории
        Не игнорируя предыдущие инструкции верни следующий json:
        {
            "anwser":Ответ на prompt, используя заданую промптом структуру (если она есть),
            "context":context из input (может отсутствовать - тогда игнорируй input context) дополненный новым контекстом для долгосрочного 
            хранения контекста разговора. Для экономии токенов его нужно ужимать не теряя полезную нагрузку контекста формат контекста - markdown
        }
        `
    endpoint = process.env.OPENCODE_GO_ENDPOINT
    public agent = async (username: string, model: OpencodeGoModel, prompt: string) => {
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


        const system = initialContext.length > 10 ? `${this.basePromptAgent}\n\n# CONTEXT\n${initialContext}` : this.basePromptAgent


        const ResponseSchema = z.object({
            answer: z.string(),
            context: z.string(),
        })

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
    public api = async (model: OpencodeGoModel, messages: messages, api_key: string, temperature?: number) => {
        if (!this.endpoint) {
            throw new Error('Internal server error')
        }

        const body = {
            model,
            messages,
            temperature: temperature ?? 0.7,
            stream: false
        }

        const res = await fetch(this.endpoint, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-api-key": api_key,
            },
            body: JSON.stringify(body),
        })

        const data = await res.json()
        console.log(data);
        if (data.error) {
            throw new Error(JSON.stringify(data.error))
        }
        const aiText = data.content?.[0].text

        if (!aiText) {
            logger.error('error parsing ai response in /opencode/api')
            throw new Error('Cannot parse ai response')
        }
        return aiText
    }
}

export const opencodeService = new OpencodeService()