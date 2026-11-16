import { getHeader } from "h3";

type BlocksRequestBody = {
    blocks: { id: string; text: string }[];
    config: Record<string, unknown>;
};

/**
 * POST handler for translating the OCR blocks of a photo.
 * Streams the backend's NDJSON events (`translation`, then `done` or `error`) through.
 */
export default backendHandlerBuilder<never, BlocksRequestBody>()
    .withMethod("POST")
    .withBodyProvider(async (event) => await readBody(event))
    .withFetcher(async ({ url, method, body, headers, event }) => {
        const forwardHeaders = new Headers(headers);
        const clientId = getHeader(event, "x-client-id");
        if (clientId) {
            forwardHeaders.set("X-Client-Id", clientId);
        }

        const signal = getAbortSignal(event);

        try {
            const response = await backendFetch(url, {
                method,
                body: JSON.stringify(body),
                headers: forwardHeaders,
                signal,
            });

            if (!response.ok) {
                return await forwardBackendError(event, response);
            }

            return response;
        } catch (error) {
            if (signal.aborted) {
                return new Response(null, { status: 499 });
            }
            throw error;
        }
    })
    .withDummyFetcher(dummyBlocksFetcher)
    .build("/translation/image/blocks");

/** Streams a fake translation per block, one line every 300 ms. */
function dummyBlocksFetcher(options: { body: BlocksRequestBody }): Response {
    const blocks = options.body?.blocks ?? [];
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            for (const block of blocks) {
                await new Promise((resolve) => setTimeout(resolve, 300));
                controller.enqueue(
                    encoder.encode(
                        `${JSON.stringify({
                            type: "translation",
                            id: block.id,
                            translated: `[dummy] ${block.text}`,
                        })}\n`,
                    ),
                );
            }
            controller.enqueue(
                encoder.encode(`${JSON.stringify({ type: "done" })}\n`),
            );
            controller.close();
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "application/x-ndjson",
            "Cache-Control": "no-cache",
        },
    });
}
