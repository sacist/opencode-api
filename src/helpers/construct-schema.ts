export const constructSchema = (schema?: any) => {
    return {
        type: "object",
        properties: {
            answer: schema ?? {
                type: "string"
            },
            context: {
                type: "string"
            }
        },
        required: [
            "answer",
            "context"
        ],
        additionalProperties: false
    }
}