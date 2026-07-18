import { OpencodeGoModel } from "#types/opencode"
import { VISION_MODELS } from "./consts.js"
import { ValidationError } from "#errors/Validation.error"

export const assertSupportsVision = (model: OpencodeGoModel): void => {
    if (VISION_MODELS.has(model)) return
    const list = Array.from(VISION_MODELS).join(", ")
    throw new ValidationError({
        issues: [{
            code: "custom",
            path: ["model"],
            message: `Модель не поддерживает изображения. Доступные vision-модели: ${list}`
        }]
    })
}
