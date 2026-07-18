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

type ReturnStructuredRaw = {
    usage: Usage,
    json: Record<string, unknown>
}

// update_context=true + userSchema (оборачивает в {answer, context})
export function opencodePrompt(
    username: string,
    model: OpencodeGoModel,
    agent: Agents,
    parts: Parts,
    schema_retries: number,
    system: string | undefined,
    update_context: true,
    userSchema: AnyJSONSchema,
): Promise<ReturnStructuredWithUserSchema>

// update_context=true без userSchema
export function opencodePrompt(
    username: string,
    model: OpencodeGoModel,
    agent: Agents,
    parts: Parts,
    schema_retries: number,
    system: string | undefined,
    update_context: true,
    userSchema?: undefined,
): Promise<ReturnStructuredNoUserSchema>

// update_context=false + userSchema (raw json по userSchema)
export function opencodePrompt(
    username: string,
    model: OpencodeGoModel,
    agent: Agents,
    parts: Parts,
    schema_retries: number,
    system: string | undefined,
    update_context: false,
    userSchema: AnyJSONSchema,
): Promise<ReturnStructuredRaw>

// update_context=false (или не задан) + userSchema не задан
export function opencodePrompt(
    username: string,
    model: OpencodeGoModel,
    agent: Agents,
    parts: Parts,
    schema_retries: number,
    system?: string,
    update_context?: false,
    userSchema?: undefined,
): Promise<ApiReturn>



export async function opencodePrompt(
    username: string,
    model: OpencodeGoModel,
    agent: Agents,
    parts: Parts,
    schema_retries: number = 3,
    system?: string,
    update_context?: boolean,
    userSchema?: AnyJSONSchema,
): Promise<unknown> {
    const client = getOpencodeClient()
    const session = await createOpencodeSession(username, model, client)

    try {
        let format: OutputFormat | undefined
        let validate
        let schema
        if (update_context === false && userSchema) {
            schema = userSchema
            validate = getValidatorJSONSchema(schema)
            format = {
                type: 'json_schema',
                schema,
                retryCount: schema_retries
            }
        }
        if (update_context) {
            schema = constructSchema(userSchema)
            validate = getValidatorJSONSchema(schema)
            format = {
                type: 'json_schema',
                schema,
                retryCount: schema_retries
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
        if (update_context) {
            const structured = data.info.structured
            const valid = validate!(structured)
            if (!valid) {
                throw new ValidationError({ reason: 'Модель не смогла вернуть валидный json. Попробуйте ещё раз, либо используйте другую модель' })
            }
            return { usage, json: structured }

        }

        if (userSchema) {
            const structured = data.info.structured
            const valid = validate!(structured)
            if (!valid) {
                throw new ValidationError({ reason: 'Модель не смогла вернуть валидный json. Попробуйте ещё раз, либо используйте другую модель' })
            }
            return { usage, json: structured as Record<string, unknown> }
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