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
            .withFetcher(async (options) => {
                const response = await fetch(options.url, {
                    method: options.method,
                    body: JSON.stringify(options.body),
                    headers: {
                        "Content-Type": "application/json",
                        "X-Client-Id":
                            getHeader(options.event, "x-client-id") ?? "",
                    },
                    signal: getAbortSignal(options.event),
                });

                setResponseStatus(options.event, response.status);

                if (!response.ok) {
                    return await response.json();
                }

                return response;
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
