export enum OpencodeGoModel {
    MINIMAX_M3 = "minimax-m3",
    MINIMAX_M27 = "minimax-m2.7",
    QWEN_37_MAX = "qwen3.7-max",
    QWEN_37_PLUS = "qwen3.7-plus",
    QWEN_36_PLUS = "qwen3.6-plus",
    GLM_52 = "glm-5.2",
    GLM_51 = "glm-5.1",
    KIMI_K27 = "kimi-k2.7-code",
    KIMI_K26 = "kimi-k2.6",
    DEEPSEEK_V4_PRO = "deepseek-v4-pro",
    DEEPSEEK_V4_FLASH = "deepseek-v4-flash",
    MIMO_V25 = "mimo-v2.5",
    MIMO_V25_PRO = "mimo-v2.5-pro",
}

export type Messages = Array<{ role: "user" | "assistant"; content: string }>
export type Usage = {
    input_tokens: number,
    output_tokens: number,
    cost: string
}
export type ApiReturn = {
    usage: Usage,
    text: string
}
export type Parts = { type: "text"; text: string }[]
export const OPENCODE_GO_PROVIDER_ID = "opencode-go" as const



export enum MDCreationType {
    MANUAL = "manual",
    AI = "ai"
}

export const enum Agents { // Можно добавить своего после добавления его в .opencode/agent
    DEFAULT = 'agent'
}