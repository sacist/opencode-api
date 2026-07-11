import path from "path"
import fs from 'fs'

export const workspacesPath = path.join(process.cwd(), '/workspaces')

export const initWorkspacesDir = () => {
    if (!fs.existsSync(workspacesPath)) {
        fs.mkdirSync(workspacesPath)
    }
}

export const createUserWorkspace = (username: string) => {
    const workspacePath = path.join(workspacesPath, `/${username}`)
    if (fs.existsSync(workspacePath)) {
        return
    }
    fs.mkdirSync(workspacePath)

    const agentsPath = path.join(workspacePath, 'AGENTS.md')
    fs.writeFileSync(agentsPath, '')

    const contextPath = path.join(workspacePath, 'context.md')
    fs.writeFileSync(contextPath, '')

    const toolsPath = path.join(workspacePath, '/tools')
    fs.mkdirSync(toolsPath)
}