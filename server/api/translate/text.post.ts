import type { H3Event } from "h3";

/**
 * POST handler for text translation.
 * Supports streaming responses from the backend.
 */
export default defineEventHandler(async (event) => {
    if (import.meta.env.STUB_API !== "true") {
        const handler = backendHandlerBuilder()
            .withMethod("POST")
            .withBodyProvider(async (event) => await readBody(event))
            .withFetcher(async ({ url, method, body, headers, event }) => {
                const signal = getAbortSignal(event);

                try {
                    const response = await fetch(url, {
                        method: method,
                        body: JSON.stringify(body),
                        headers,
                        signal,
                    });

                    setResponseStatus(event, response.status);

                    // Guard against non-JSON error responses (e.g., HTML error pages, plain text)
                    if (!response.ok) {
                        const contentType =
                            response.headers.get("content-type") ?? "";
                        if (contentType.includes("application/json")) {
                            return await response.json();
                        }
                        return await response.text();
                    }

                    return response;
                } catch (error) {
                    // Silently handle abort errors - client cancelled the request
                    if (signal.aborted) {
                        return new Response(null, { status: 499 });
                    }
                    throw error;
                }
            })
            .build("/translation/text");

        return await handler(event);
    }

    await sendDummyStream(event);
});

/**
 * Sends a dummy streaming response for testing purposes.
 */
async function sendDummyStream(event: H3Event): Promise<void> {
    setResponseHeader(event, "Content-Type", "text/event-stream");
    setResponseHeader(event, "Cache-Control", "no-cache");

    const body = await readBody<{ text: string }>(event);
    const chunks = body.text.split(" ").map((word) => `${word} `);

    if (chunks.length > 0) {
        chunks[chunks.length - 1] = chunks[chunks.length - 1]?.trim() ?? "";
    }

    let index = 0;

    function pushChunk(): void {
        if (index < chunks.length) {
            event.node.res.write(chunks[index]);
            index++;
            setTimeout(pushChunk, 100);
        } else {
            event.node.res.end();
        }
    }

    pushChunk();
}
