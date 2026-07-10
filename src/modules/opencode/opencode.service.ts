import path from "path";
import { workspacesPath } from "#helpers/workspace.helper";
import { MDCreationType, messages } from "#types/opencode";
import { OpencodeGoModel } from "#types/opencode";
import fs from 'fs'
import z from "zod"
import getOpencodeClient from "#helpers/init-opencode.helper";
import { baseUrl, ANTHROPIC_MODELS, basePromptAgent, basePromptWriterPrompt } from "./consts.js";
import { createOpencodeSession } from "#helpers/create-opencode-session";
import { TextPart } from "@opencode-ai/sdk/v2";
import { ValidationError } from "#errors/ValidationError";

class OpencodeService {
    public agent = async (username: string, model: OpencodeGoModel, prompt: string): Promise<string> => {
        const client = getOpencodeClient()

        const session = await createOpencodeSession(username, model, client)

        const contextPath = path.join(workspacesPath, `/${username}`, 'context.md')
        const initialContext = fs.readFileSync(contextPath, { encoding: 'utf-8' })


        const system = initialContext.length > 10 ? `${basePromptAgent}\n\n# CONTEXT\n${initialContext}` : basePromptAgent


        const ResponseSchema = z.object({
            answer: z.string(),
            context: z.string(),
        })

        const { data, error } = await client.session.prompt({
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
        await client.session.delete({ sessionID: session.data.id })

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
    public agentMD = async (type: MDCreationType, prompt: string, username: string): Promise<void | string> => {
        const agentsMD = path.join(workspacesPath, `/${username}`, '/AGENTS.md')
        switch (type) {
            case MDCreationType.MANUAL:
                fs.writeFile(agentsMD, prompt, () => { })
                return
            case MDCreationType.AI:
                const client = getOpencodeClient()
                const session = await createOpencodeSession(username, OpencodeGoModel.DEEPSEEK_V4_PRO, client)

                const { data, error } = await client.session.prompt({
                    sessionID: session.data.id,
                    system: basePromptWriterPrompt,
                    agent: 'plan',
                    tools: {
                        websearch: true,
                        read: false,
                        write: false
                    },
                    parts: [{ type: 'text', text: prompt }]
                })
                if (error) {
                    throw error
                }
                await client.session.delete({ sessionID: session.data.id })
                const anwser = data.parts
                    .filter((part): part is TextPart => part.type === 'text')
                    .at(-1)?.text

                if (!anwser) {
                    throw new ValidationError({ text: 'Модель не вернула текст' })
                }
                fs.writeFile(agentsMD, anwser, () => { })
                return anwser
        }
    }
}

export const opencodeService = new OpencodeService()