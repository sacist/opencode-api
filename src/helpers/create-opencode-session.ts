import { OpencodeGoModel } from "#types/opencode"
import path from "path"
import { parseModel } from "./parse-model.js"
import { workspacesPath } from "./workspace.js"
import { OpencodeClient } from "@opencode-ai/sdk/v2"
import { OpencodeError } from "#errors/Opencode.error"

export const createOpencodeSession = async (username: string, model: OpencodeGoModel, client: OpencodeClient) => {
    const directory = path.join(workspacesPath, `/${username}`)
    const sessModel = parseModel(model)
    const session = await client.session.create({
        directory,
        model: sessModel,
        title: username
    })

    if (session.error || !session.data) {
        throw new OpencodeError('OPENCODE_SESSION_CREATION_ERROR', 'Ошибка создания сессии, возможно выбрана недоступная модель')
    }
    return session
}