import { Storage } from "@plasmohq/storage"

const storage = new Storage()

export const getBackendUrl = async (path: string): Promise<string> => {
    let baseHost = await storage.get("baseHost") as string
    if (!baseHost) {
        baseHost = "http://localhost:3000"
    }
    const cleanHost = baseHost.replace(/\/$/, "")
    const cleanPath = path.startsWith("/") ? path : `/${path}`
    return `${cleanHost}${cleanPath}`
}
