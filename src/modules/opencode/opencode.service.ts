import path from "path";
import { workspacesPath } from "#helpers/workspace";
import { Agents, ApiReturn, MDCreationType, Messages, Usage, type Parts } from "#types/opencode";
import { OpencodeGoModel } from "#types/opencode";
import fs from 'fs'
import z from "zod"
import { restartOpencode } from "#helpers/init-opencode";
import { loadOpencodeConfig, updateOpencodeGoApiKey } from "#helpers/opencode-config";
import { baseUrl, ANTHROPIC_MODELS, basePromptAgent, basePromptWriterPrompt } from "./consts.js";
import { opencodePrompt } from "#helpers/opencode-prompt";
import { ValidationError } from "#errors/Validation.error";
import { OpencodeError } from "#errors/Opencode.error";
import { loadavg } from "os";

class OpencodeService {
    public updateApiKey = async (api_key: string) => {
        updateOpencodeGoApiKey(api_key)
        const restarted = await restartOpencode()
        return {
            restarted
        }
    }
    public agent = async (username: string, model: OpencodeGoModel, prompt: string, updateContext: boolean = true): Promise<ApiReturn> => {
        const contextMD = path.join(workspacesPath, `/${username}`, 'context.md')
        const initialContext = await fs.promises.readFile(contextMD, 'utf-8')

        const ResponseSchema = z.object({
            answer: z.string(),
            context: z.string(),
        })
        const parts: Parts = []
        if (initialContext.length > 10) {
            parts.push({ type: "text", text: `# CONTEXT\n${initialContext}` })
        }
        parts.push({ type: "text", text: prompt })
        if (updateContext) {
            const data = await opencodePrompt(username, model, Agents.DEFAULT, parts, basePromptAgent, ResponseSchema)

            const { answer, context } = data.json

            fs.writeFile(contextMD, context, () => { })

            return { usage: data.usage, text: answer }
        } else {
            const anwser = await opencodePrompt(username, model, Agents.DEFAULT, parts, basePromptAgent)
            return anwser
        }
    }
    public api = async (
        model: OpencodeGoModel,
        messages: Messages,
        api_key?: string,
        system?: string,
        temperature?: number,
        maxTokens?: number
    ): Promise<ApiReturn> => {
        const resolvedApiKey = api_key ?? loadOpencodeConfig().provider['opencode-go'].options.apiKey
        if (!resolvedApiKey) {
            throw new ValidationError({ reason: 'api_key не был передан в body. В opencode.json ключ отсутствует' })
        }

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
                "x-api-key": resolvedApiKey,
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
                "authorization": `Bearer ${resolvedApiKey}`,
            }
        }

        const res = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
        })

        const data = await res.json()

        if (data.error) {
            throw new OpencodeError("API_ERROR", JSON.stringify(data.error))
        }
        const usage: Usage = isAnthropic
            ? {
                input_tokens: data.usage?.input_tokens,
                output_tokens: data.usage?.output_tokens,
                cost: data.cost
            }
            : {
                input_tokens: data.usage?.prompt_tokens,
                output_tokens: data.usage?.completion_tokens,
                cost: data.cost
            }
        const text = isAnthropic
            ? data.content.find((val: { type: string }) => val.type === "text")?.text as string
            : data.choices?.[0]?.message?.content as string

        if (!text) {
            throw new ValidationError({ reason: 'Модель не вернула текст' })
        }
        return { usage, text }
    }
    public agentMD = async (type: MDCreationType, prompt: string, username: string, resetContext: boolean): Promise<ApiReturn | string> => {
        const agentsMD = path.join(workspacesPath, `/${username}`, '/AGENTS.md')
        const contextMD = path.join(workspacesPath, `/${username}`, '/context.md')
        switch (type) {
            case MDCreationType.MANUAL:
                fs.writeFile(agentsMD, prompt, () => { })
                if (resetContext) {
                    fs.writeFile(contextMD, '', () => { })
                }
                return `AGENTS.md успешно записан. ${!resetContext ? '' : 'Контекст сброшен'}`
            case MDCreationType.AI:
                const parts: Parts = [{ type: 'text', text: prompt }]
                const { usage, text } = await opencodePrompt(
                    username,
                    OpencodeGoModel.DEEPSEEK_V4_PRO,
                    Agents.DEFAULT,
                    parts,
                    basePromptWriterPrompt
                )

                fs.writeFile(agentsMD, text, () => { })

                if (resetContext) {
                    fs.writeFile(contextMD, '', () => { })
                }

                return { usage, text }
        }
    }
}

export const opencodeService = new OpencodeService()
