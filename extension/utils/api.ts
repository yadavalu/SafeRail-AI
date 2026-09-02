import { Storage } from "@plasmohq/storage"

const storage = new Storage()

export const getBackendUrl = async (path: string): Promise<string> => {
    let baseHost = await storage.get("baseHost") as string
    if (!baseHost) {
        baseHost = "http://localhost:3000"
    }
    
    let cleanHost = baseHost.replace(/\/$/, "")
    
    // Maintain backwards compatibility for users who put http://localhost or http://127.0.0.1
    // without a port, by automatically routing them to the default port 3000.
    if ((cleanHost === "http://localhost" || cleanHost === "http://127.0.0.1" || cleanHost === "https://localhost" || cleanHost === "https://127.0.0.1")) {
        cleanHost = `${cleanHost}:3000`
    }

    const cleanPath = path.startsWith("/") ? path : `/${path}`
    return `${cleanHost}${cleanPath}`
}
