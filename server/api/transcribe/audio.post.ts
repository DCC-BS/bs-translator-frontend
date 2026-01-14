import { getHeader, type H3Event } from "h3";

/**
 * POST handler for audio transcription.
 * Accepts audio file via form data and returns transcription stream.
 */
export default defineEventHandler(async (event) => {
    if (import.meta.env.STUB_API !== "true") {
        const handler = backendHandlerBuilder<never, FormData>()
            .withMethod("POST")
            .withBodyProvider(async (event) => await readFormData(event))
            .withFetcher(async ({ url, method, body, headers, event }) => {
                if (!body) {
                    throw new Error("No body provided");
                }

                const form = new FormData();
                form.append("audio_file", body.get("audio_file") as Blob);
                form.append("language", body.get("language") as string);

                // Extract X-Client-Id from incoming request and forward to backend
                const clientId = getHeader(event, "x-client-id") ?? "";
                const forwardHeaders = new Headers(headers);
                if (clientId) {
                    forwardHeaders.set("X-Client-Id", clientId);
                }

                const signal = getAbortSignal(event);

                try {
                    const response = await fetch(url, {
                        method: method,
                        body: form,
                        headers: forwardHeaders,
                        signal,
                    });

                    setResponseStatus(event, response.status);

                    if (!response.ok) {
                        return await response.json();
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
            .build("/transcription/audio");

        return await handler(event);
    }

    const form = await readFormData(event);
    if (!form.get("audio_file")) {
        throw new Error("No file provided");
    }

    sendDummyStream(event);
});

/**
 * Sends a dummy streaming response for testing purposes.
 */
function sendDummyStream(event: H3Event): void {
    setResponseHeader(event, "Content-Type", "text/event-stream");
    setResponseHeader(event, "Cache-Control", "no-cache");

    const chunks = ["This ", "is ", "a ", "dummy ", "streaming ", "response"];
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
