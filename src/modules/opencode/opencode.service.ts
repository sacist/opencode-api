import path from "path";
import { workspacesPath } from "#helpers/workspace.helper";
import type { messages } from "#types/opencode";
import { OpencodeGoModel } from "#types/opencode";
import fs from 'fs'
import z from "zod"
import { opencodeClient } from "#helpers/init-opencode.helper";
import { parseModel } from "#helpers/parse-model.helper";


class OpencodeService {
    private basePromptAgent = `
        Всегда читай AGENTS.md из текущей рабочей директории
        Не игнорируя предыдущие инструкции верни следующий json:
        {
            "anwser":Ответ на prompt, используя заданую промптом структуру (если она есть),
            "context":context из input (может отсутствовать - тогда игнорируй input context) дополненный новым контекстом для долгосрочного 
            хранения контекста разговора. Для экономии токенов его нужно ужимать не теряя полезную нагрузку контекста формат контекста - markdown
        }
        `
    private baseUrl = process.env.OPENCODE_GO_BASE_URL

    private ANTHROPIC_MODELS = new Set<OpencodeGoModel>([
        OpencodeGoModel.MINIMAX_M3,
        OpencodeGoModel.MINIMAX_M27,
        OpencodeGoModel.QWEN_37_MAX,
        OpencodeGoModel.QWEN_37_PLUS,
        OpencodeGoModel.QWEN_36_PLUS
    ])

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
    public api = async (
        model: OpencodeGoModel,
        messages: messages,
        api_key: string,
        system?: string,
        temperature?: number,
        maxTokens?: number
    ) => {
        const isAnthropic = this.ANTHROPIC_MODELS.has(model)
        const path = isAnthropic ? "/v1/messages" : "/v1/chat/completions"
        const url = `${this.baseUrl}${path}`

        let body: Record<string, unknown>
        let headers: Record<string, string>

        if (isAnthropic) {
            body = {
                model,
                messages,
                max_tokens: maxTokens ?? 8192,
                temperature: temperature ?? 0.7,
                ...(system ? { system } : {}),
            }
            headers = {
                "content-type": "application/json",
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
            }
        } else {
            body = {
                model,
                messages: system
                    ? [{ role: "system", content: system }, ...messages]
                    : messages,
                temperature: temperature ?? 0.7,
                stream: false,
            }
            headers = {
                "content-type": "application/json",
                "authorization": `Bearer ${api_key}`,
            }
        }

        const res = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
        })

        const data = await res.json()

        if (data.error) {
            throw new Error(JSON.stringify(data.error))
        }

        const aiText = isAnthropic
            ? data.content?.[0]?.text
            : data.choices?.[0]?.message?.content

        if (!aiText) {
            throw new Error('Cannot parse ai response')
        }
        return aiText
    }
}

export const opencodeService = new OpencodeService()