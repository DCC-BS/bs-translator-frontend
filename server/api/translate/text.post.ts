import { getHeader } from "h3";

/**
 * POST handler for text translation.
 * Supports streaming responses from the backend.
 */
export default backendHandlerBuilder()
    .withMethod("POST")
    .withBodyProvider(async (event) => await readBody(event))
    .withFetcher(async ({ url, method, body, headers, event }) => {
        const signal = getAbortSignal(event);

        // Extract X-Client-Id from incoming request and forward to backend
        const clientId = getHeader(event, "x-client-id") ?? "";
        const forwardHeaders = new Headers(headers);
        if (clientId) {
            forwardHeaders.set("X-Client-Id", clientId);
        }

        try {
            const response = await backendFetch(url, {
                method: method,
                body: JSON.stringify(body),
                headers: forwardHeaders,
                signal,
            });

            // Return the backend error (status + JSON body, e.g. 422 invalid_request)
            // as-is so consumers can check it with isApiError()
            if (!response.ok) {
                return await forwardBackendError(event, response);
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
    .withDummyFetcher(dummyFetcher)
    .build("/translation/text");

/**
 * Dummy fetcher used when the backend is not available (e.g., during development or testing).
 * Simulates a streaming response by sending words one at a time with delays.
 */
function dummyFetcher(options: { body: unknown }): Response {
    const body = options.body;

    // Dummy text to stream word by word
    let dummyText = "";
    if (
        body &&
        typeof body === "object" &&
        "text" in body &&
        typeof body.text === "string"
    ) {
        // Echo back a translated version of the input text
        dummyText = `This is a dummy translation response for: "${body.text}"`;
    } else {
        dummyText =
            "This is a dummy streaming response that returns one word at a time to demonstrate the functionality of server-sent events in this Nuxt application.";
    }

    const words = dummyText.split(" ");

    // Create a readable stream that sends words one at a time
    const stream = new ReadableStream({
        async start(controller) {
            try {
                for (let i = 0; i < words.length; i++) {
                    const word = words[i];
                    const isLastWord = i === words.length - 1;

                    // Send the word
                    controller.enqueue(new TextEncoder().encode(word));

                    // Add space unless it's the last word
                    if (!isLastWord) {
                        controller.enqueue(new TextEncoder().encode(" "));
                    }

                    // Small delay to simulate streaming
                    await new Promise((resolve) => setTimeout(resolve, 100));
                }

                controller.close();
            } catch (error) {
                controller.error(error);
            }
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Transfer-Encoding": "chunked",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
        },
    });
}
