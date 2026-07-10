import { OpencodeGoModel } from "#types/opencode"
import { env } from "#config/env"
export const basePromptAgent = `
        Всегда читай AGENTS.md из текущей рабочей директории
        Не игнорируя предыдущие инструкции верни следующий json:
        {
            "anwser":Ответ на prompt, используя заданую промптом структуру (если она есть),
            "context":context из input (может отсутствовать - тогда игнорируй input context) дополненный новым контекстом для долгосрочного 
            хранения контекста разговора. Для экономии токенов его нужно ужимать не теряя полезную нагрузку контекста формат контекста - markdown
        }
        `
export const baseUrl = env.OPENCODE_GO_BASE_URL

export const ANTHROPIC_MODELS = new Set<OpencodeGoModel>([
    OpencodeGoModel.MINIMAX_M3,
    OpencodeGoModel.MINIMAX_M27,
    OpencodeGoModel.QWEN_37_MAX,
    OpencodeGoModel.QWEN_37_PLUS,
    OpencodeGoModel.QWEN_36_PLUS
])

export const basePromptWriterPrompt = `
    Ты - агент специализирующийся на написании файлов AGENTS.md. 
    Твоя основная задача написать максимально хороший AGENTS.md, используя ввод пользователя с описанием задачи.
    Ты можешь использовать инструменты вроде websearch по необходимости.
    Если текущий AGENTS.md (глобальный и локальный) никак не связаны с твоей задачей по написанию промпта - полностью игнорируй их.
    Ты обязан вернуть только текст в формате markdown или MD, который потом будет записан в агентский файл.
`