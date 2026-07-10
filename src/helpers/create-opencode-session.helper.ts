import { OpencodeGoModel } from "#types/opencode"
import path from "path"
import { parseModel } from "./parse-model.helper.js"
import { workspacesPath } from "./workspace.helper.js"
import { OpencodeClient } from "@opencode-ai/sdk/v2"

export const createOpencodeSession = async (username: string, model: OpencodeGoModel, client: OpencodeClient) => {
    const directory = path.join(workspacesPath, `/${username}`)
    const sessModel = parseModel(model)
    const session = await client.session.create({
        directory,
        model: sessModel,
        title: username
    })

    if (session.error || !session.data) {
        throw new Error('Error creating session - check model availability')
    }
    return session
}