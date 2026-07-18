import getOpencodeClient from "./init-opencode.js";
import { createOpencodeSession } from "./create-opencode-session.js";
import { ApiReturn, OpencodeGoModel, Parts, type Agents, type Usage } from "#types/opencode";
import { OpencodeError } from "#errors/Opencode.error";
import { OutputFormat, TextPart } from "@opencode-ai/sdk/v2";
import { ValidationError } from "#errors/Validation.error";
import { NotFoundError } from "#errors/NotFound.error";
import { constructSchema } from "./construct-schema.js";
import { getValidatorJSONSchema } from "./validate-json-schema.js";
import type { AnyJSONSchema } from "./validate-json-schema.js";

type ReturnStructuredNoUserSchema = {
    usage: Usage,
    json: {
        answer: string,
        context: string
    }
}

type ReturnStructuredWithUserSchema = {
    usage: Usage,
    json: {
        answer: any,
        context: string
    }
}

// Если передана схема но нет юзер схемы
export function opencodePrompt(
    username: string,
    model: OpencodeGoModel,
    agent: Agents,
    parts: Parts,
    system: string | undefined,
    structured_output: true,
    userSchema?: undefined,
): Promise<ReturnStructuredNoUserSchema>

export function opencodePrompt(
    username: string,
    model: OpencodeGoModel,
    agent: Agents,
    parts: Parts,
    system: string | undefined,
    structured_output: true,
    userSchema: AnyJSONSchema,
): Promise<ReturnStructuredWithUserSchema>

// Если схемы нет
export function opencodePrompt(
    username: string,
    model: OpencodeGoModel,
    agent: Agents,
    parts: Parts,
    system?: string,
    structured_output?: undefined,
    userSchema?: undefined,
): Promise<ApiReturn>



export async function opencodePrompt(
    username: string,
    model: OpencodeGoModel,
    agent: Agents,
    parts: Parts,
    system?: string,
    structured_output?: true,
    userSchema?: AnyJSONSchema,
): Promise<unknown> {
    const client = getOpencodeClient()
    const session = await createOpencodeSession(username, model, client)

    try {
        let format: OutputFormat | undefined
        let validate
        if (structured_output) {
            const schema = constructSchema(userSchema)
            validate = getValidatorJSONSchema(schema)
            format = {
                type: 'json_schema',
                schema,
                retryCount: 3
            }
        }


        const { data, error } = await client.session.prompt({
            sessionID: session.data.id,
            format,
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
        if (structured_output) {
            const structured = data.info.structured
            const valid = validate!(structured)
            if (!valid) {
                throw new ValidationError({ reason: 'Модель не смогла вернуть валидный json. Попробуйте ещё раз, либо используйте другую модель' })
            }
            return { usage, json: structured }

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