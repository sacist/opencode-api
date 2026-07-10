import { createOpencode, OpencodeClient } from "@opencode-ai/sdk/v2"
import type { Config } from "@opencode-ai/sdk/v2"
import { logger } from "#config/logger"
import { loadOpencodeConfig } from "./opencode-config.js"

type server = {
    url: string;
    close(): void;
}

export let opencodeServer: server | null = null
let opencodeClient: OpencodeClient | null = null

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

const startOpencode = async () => {
    const config = loadOpencodeConfig() as unknown as Config
    const { server, client } = await createOpencode({ port: 8090, config })
    opencodeServer = server
    opencodeClient = client
}

export const initOpencode = async () => {
    try {
        await startOpencode()
        logger.info('opencode.started')
    } catch (e) {
        logger.error({ err: e }, 'opencode.initFailed')
        throw e
    }
}

export const restartOpencode = async (): Promise<boolean> => {
    if (opencodeServer) {
        try {
            opencodeServer.close()
        } catch (e) {
            logger.warn({ err: e }, 'opencode.closeError')
        }
    }
    opencodeServer = null
    opencodeClient = null

    await sleep(1000)

    try {
        await startOpencode()
        logger.info('opencode.restarted')
        return true
    } catch (e) {
        logger.warn({ err: e }, 'opencode.restartRetry')
        await sleep(2000)
        await startOpencode()
        logger.info('opencode.restarted')
        return true
    }
}

export const registerOpencodeHealthCheck = () => {
    setInterval(async () => {
        if (!opencodeServer) {
            return
        }
        try {
            await fetch(`${opencodeServer.url}/global/health`)
        } catch (e) {
            logger.warn({ err: e }, 'opencode.healthCheckFailed')
            try {
                await restartOpencode()
            } catch (restartErr) {
                logger.error({ err: restartErr }, 'opencode.restartFailed')
            }
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
