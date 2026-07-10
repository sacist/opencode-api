import { createOpencode, OpencodeClient } from "@opencode-ai/sdk/v2"
import { logger } from "#config/logger"

type server = {
    url: string;
    close(): void;
}

export let opencodeServer: server | null = null
let opencodeClient: OpencodeClient | null = null

export const initOpencode = async () => {
    const { server, client } = await createOpencode({ port: 8090 })
    opencodeServer = server
    opencodeClient = client
    logger.info('opencode started')
}

export const registerOpencodeHealthCheck = () => {
    setInterval(async () => {
        if (!opencodeServer) {
            return
        }
        try {
            await fetch(`${opencodeServer.url}/global/health`)
        } catch (e) {
            opencodeServer.close()
            initOpencode()
        }
    }, 5000);
}

const getOpencodeClient = (): OpencodeClient => {
    if (!opencodeClient) {
        throw new Error('opencode is not started yet')
    }
    return opencodeClient
}

export default getOpencodeClient