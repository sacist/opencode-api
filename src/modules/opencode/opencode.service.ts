import path from "path";
import { workspacesPath } from "#helpers/workspace.helper";
import { MDCreationType, messages, type parts } from "#types/opencode";
import { OpencodeGoModel } from "#types/opencode";
import fs from 'fs'
import z from "zod"
import getOpencodeClient from "#helpers/init-opencode.helper";
import { baseUrl, ANTHROPIC_MODELS, basePromptAgent, basePromptWriterPrompt } from "./consts.js";
import { createOpencodeSession } from "#helpers/create-opencode-session.helper";
import { TextPart } from "@opencode-ai/sdk/v2";
import { ValidationError } from "#errors/ValidationError";

class OpencodeService {
    public agent = async (username: string, model: OpencodeGoModel, prompt: string): Promise<string> => {
        const client = getOpencodeClient()

        const session = await createOpencodeSession(username, model, client)
        const contextMD = path.join(workspacesPath, `/${username}`, 'context.md')
        const initialContext = await fs.promises.readFile(contextMD, 'utf-8')


        const ResponseSchema = z.object({
            answer: z.string(),
            context: z.string(),
        })

        const parts: parts = []
        if (initialContext.length > 10) {
            parts.push({ type: "text", text: `# CONTEXT\n${initialContext}` })
        }
        parts.push({ type: "text", text: prompt })

        try {
            const { data, error } = await client.session.prompt({
                sessionID: session.data.id,
                system: basePromptAgent,
                format: {
                    type: 'json_schema', schema: z.toJSONSchema(ResponseSchema),
                    retryCount: 2
                },
                agent: 'agent',
                tools: {
                    websearch: true,
                    read: true,
                    write: false,
                },
                parts,
            })

            if (error) {
                throw error
            }

            const { answer, context } = z.parse(ResponseSchema, data.info.structured)

            fs.writeFile(contextMD, context, () => { })

            return answer
        } catch (e) {
            throw e
        } finally {
            client.session.delete({ sessionID: session.data.id })
        }
    }
    public api = async (
        model: OpencodeGoModel,
        messages: messages,
        api_key: string,
        system?: string,
        temperature?: number,
        maxTokens?: number
    ): Promise<string> => {
        const isAnthropic = ANTHROPIC_MODELS.has(model)
        const path = isAnthropic ? "/v1/messages" : "/v1/chat/completions"
        const url = `${baseUrl}${path}`

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
            ? data.content.find((val: { type: string }) => val.type === "text")?.text as string
            : data.choices?.[0]?.message?.content as string

        if (!aiText) {
            throw new Error('Cannot parse ai response')
        }
        return aiText
    }
    public agentMD = async (type: MDCreationType, prompt: string, username: string, saveContext: boolean): Promise<string> => {
        const agentsMD = path.join(workspacesPath, `/${username}`, '/AGENTS.md')
        const contextMD = path.join(workspacesPath, `/${username}`, '/context.md')
        switch (type) {
            case MDCreationType.MANUAL:
                fs.writeFile(agentsMD, prompt, () => { })
                if (!saveContext) {
                    fs.writeFile(contextMD, '', () => { })
                }
                return `AGENTS.md успешно записан. ${saveContext ? '' : 'Контекст сброшен'}`
            case MDCreationType.AI:
                const client = getOpencodeClient()
                const session = await createOpencodeSession(username, OpencodeGoModel.DEEPSEEK_V4_PRO, client)
                try {
                    const { data, error } = await client.session.prompt({
                        sessionID: session.data.id,
                        system: basePromptWriterPrompt,
                        agent: 'agent',
                        tools: {
                            websearch: true,
                            write: false,
                            read: false
                        },
                        parts: [{ type: 'text', text: prompt }]
                    })
                    if (error) {
                        throw error
                    }
                    const anwser = data.parts
                        .filter((part): part is TextPart => part.type === 'text')
                        .at(-1)?.text

                    if (!anwser) {
                        throw new ValidationError({ reason: 'Модель не вернула текст' })
                    }
                    fs.writeFile(agentsMD, anwser, () => { })
                    if (!saveContext) {
                        fs.writeFile(contextMD, '', () => { })
                    }
                    return anwser
                } catch (e) {
                    throw e
                } finally {
                    client.session.delete({ sessionID: session.data.id })
                }
        }

    }
}

export const opencodeService = new OpencodeService()