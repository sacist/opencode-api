import { createOpencode, OpencodeClient } from "@opencode-ai/sdk/v2"
import { logger } from "#config/logger"

type server = {
    url: string;
    close(): void;
}

export let opencodeServer: server | null = null
let opencodeClient: OpencodeClient | null = null

export const initOpencode = async () => {
    const { server, client } = await createOpencode()
    opencodeServer = server
    opencodeClient = client
    logger.info('opencode started')
}

export default opencodeClient