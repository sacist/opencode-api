import path from "path";
import { workspacesPath } from "#helpers/workspace";
import { Agents, ApiReturn, MDCreationType, Messages, OpencodeGoModel, type ImageBlock, type Usage, type Parts, ApiReturnStructured } from "#types/opencode";
import fs from 'fs'
import { restartOpencode } from "#helpers/init-opencode";
import { loadOpencodeConfig, updateOpencodeGoApiKey } from "#helpers/opencode-config";
import { baseUrl, ANTHROPIC_MODELS, basePromptAgent, basePromptWriterPrompt } from "./consts.js";
import { opencodePrompt } from "#helpers/opencode-prompt";
import { ValidationError } from "#errors/Validation.error";
import { OpencodeError } from "#errors/Opencode.error";
import { anthropicImageToFilePart } from "#helpers/anthropic-image-to-file-part";
import { anthropicBlocksToOpenAIParts } from "#helpers/anthropic-to-openai";
import { collectAllImages, validateImages } from "#helpers/validate-images";
import { assertSupportsVision } from "#helpers/assert-supports-vision";
import { AnyJSONSchema } from "#helpers/validate-json-schema";

class OpencodeService {
    public updateApiKey = async (api_key: string) => {
        updateOpencodeGoApiKey(api_key)
        const restarted = await restartOpencode()
        return {
            restarted
        }
    }
    public agent = async (
        username: string,
        model: OpencodeGoModel,
        prompt: string,
        updateContext: boolean = true,
        attachments?: ImageBlock[],
        schema?: AnyJSONSchema): Promise<ApiReturn | ApiReturnStructured> => {

        const contextMD = path.join(workspacesPath, `/${username}`, 'context.md')
        const initialContext = await fs.promises.readFile(contextMD, 'utf-8')

        const parts: Parts = []
        if (initialContext.length > 10) {
            parts.push({ type: "text", text: `# CONTEXT\n${initialContext}` })
        }
        parts.push({ type: "text", text: prompt })
        if (attachments && attachments.length > 0) {
            assertSupportsVision(model)
            await validateImages(attachments)
            parts.push(...attachments.map(anthropicImageToFilePart))
        }
        if (updateContext) {
            if (schema) {
                const data = await opencodePrompt(username, model, Agents.DEFAULT, parts, basePromptAgent, true, schema)
                const { answer, context } = data.json

                fs.writeFile(contextMD, context, () => { })

                return { usage: data.usage, structured: answer }
            } else {
                const data = await opencodePrompt(username, model, Agents.DEFAULT, parts, basePromptAgent, true)

                const { answer, context } = data.json

                fs.writeFile(contextMD, context, () => { })

                return { usage: data.usage, text: answer }
            }
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
        const images = collectAllImages(messages)
        if (images.length > 0) {
            assertSupportsVision(model)
            await validateImages(images)
        }

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
            const openaiMessages = messages.map(m => Array.isArray(m.content)
                ? { role: m.role, content: anthropicBlocksToOpenAIParts(m.content) }
                : { role: m.role, content: m.content }
            )
            body = {
                model,
                messages: system
                    ? [{ role: "system", content: system }, ...openaiMessages]
                    : openaiMessages,
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
