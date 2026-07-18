import Ajv, { ValidateFunction } from "ajv";
import { ValidationError } from "#errors/Validation.error";

const ajv = new Ajv.default({
    allErrors: true
})


export type AnyJSONSchema = Record<string, unknown>

export function getValidatorJSONSchema(schema: AnyJSONSchema): ValidateFunction {
    try {
        const validate = ajv.compile(schema)
        return validate
    } catch (error) {
        if (error instanceof Error) {
            throw new ValidationError({
                reason: error.message
            })
        }
        throw error
    }
}