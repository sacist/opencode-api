import getOpencodeClient from "./init-opencode.js";
import { createOpencodeSession } from "./create-opencode-session.js";
import { ApiReturn, OpencodeGoModel, Parts, type Agents, type Usage } from "#types/opencode";
import { OpencodeError } from "#errors/Opencode.error";
import { TextPart } from "@opencode-ai/sdk/v2";
import { ValidationError } from "#errors/Validation.error";
import { NotFoundError } from "#errors/NotFound.error";
import z, { json, ZodType } from "zod";


type StructuredResponse<T> = {
    usage: Usage
    json: T
}

// Если передана схема
export function opencodePrompt<TSchema extends ZodType>(
    username: string,
    model: OpencodeGoModel,
    agent: Agents,
    parts: Parts,
    system: string | undefined,
    schema: TSchema
): Promise<StructuredResponse<z.infer<TSchema>>>


// Если схемы нет
export function opencodePrompt(
    username: string,
    model: OpencodeGoModel,
    agent: Agents,
    parts: Parts,
    system?: string,
    schema?: undefined
): Promise<ApiReturn>



export async function opencodePrompt(
    username: string,
    model: OpencodeGoModel,
    agent: Agents,
    parts: Parts,
    system?: string,
    schema?: ZodType
): Promise<unknown> {
    const client = getOpencodeClient()
    const session = await createOpencodeSession(username, model, client)

    try {
        const { data, error } = await client.session.prompt({
            sessionID: session.data.id,
            format: schema ? {
                type: 'json_schema',
                schema: z.toJSONSchema(schema),
                retryCount: 3
            } : undefined,
            system,
            agent,
            parts
        })

        if (error) {
            if ("_tag" in error && error._tag === 'InvalidRequestError') {
                throw new ValidationError({ kind: error.kind, field: error.field })
            } else if ("_tag" in error && error._tag === 'BadRequest') {
                throw new OpencodeError(error._tag, 'Ошибка при отправке промпта')
            } else {
                throw new NotFoundError(error.name, error.data.message)
            }
        }
        const usage: Usage = {
            input_tokens: data.info.tokens.input,
            output_tokens: data.info.tokens.output,
            cost: JSON.stringify(data.info.cost)
        }
        if (schema) {
            try {
                const structured = data.info.structured
                return { usage, json: z.parse(schema, structured) }
            } catch (e) {
                throw new ValidationError({ reason: 'Модель не смогла вернуть валидный json. Попробуйте ещё раз, либо используйте другую модель' })
            }
        }

        const text = data.parts
            .filter((part): part is TextPart => part.type === 'text')
            .at(-1)?.text

        if (!text) {
            throw new ValidationError({ reason: 'Модель не вернула текст' })
        }
        return { usage, text }
    } finally {
        await client.session.delete({ sessionID: session.data.id })
    }
}