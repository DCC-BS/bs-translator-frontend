import type { H3Event } from "h3";
import { Agent } from "undici";

/**
 * Upper bound for one proxied backend call. Docling conversions may take up to
 * 600 s and LLM requests can queue behind others before the first byte arrives.
 */
const BACKEND_TIMEOUT_MS = 15 * 60 * 1000;

/**
 * Undici dispatcher for Nitro → backend requests. Replaces undici's 300 s default
 * `headersTimeout`/`bodyTimeout`, which would abort long conversions.
 */
export const backendDispatcher = new Agent({
    headersTimeout: BACKEND_TIMEOUT_MS,
    bodyTimeout: BACKEND_TIMEOUT_MS,
});

/**
 * Global `fetch` routed through {@link backendDispatcher}. Use it for every
 * proxied backend call so long-running requests are not cut off.
 */
export function backendFetch(
    input: string | URL,
    init: RequestInit = {},
): Promise<Response> {
    return fetch(input, {
        ...init,
        dispatcher: backendDispatcher,
    } as RequestInit);
}

/**
 * Mirrors a failed backend response to the client: copies the status and returns
 * the backend's JSON error body (`{ errorId, debugMessage }`) so `isApiError()`
 * on the client sees the real error. Non-JSON bodies are returned as text.
 */
export async function forwardBackendError(
    event: H3Event,
    response: Response,
): Promise<unknown> {
    setResponseStatus(event, response.status);
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
        return await response.json();
    }
    return await response.text();
}
