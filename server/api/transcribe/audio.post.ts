/**
 * POST handler for audio transcription.
 * Accepts audio file via form data and returns transcription stream.
 */
export default backendHandlerBuilder()
    .withMethod("POST")
    .withBodyProvider(readFormData)
    .withFetcher(async ({ url, method, body, headers, event }) => {
        if (!body) {
            throw new Error("No body provided");
        }

        const form = new FormData();
        form.append("audio_file", body.get("audio_file") as Blob);
        form.append("language", body.get("language") as string);

        const logger = getEventLogger(event);

        logger.debug(
            `Forwarding transcription request to backend with language: ${form.get("language")}`,
        );

        const clientId = getHeader(event, "x-client-id");
        const forwardHeaders = new Headers(headers);
        forwardHeaders.delete("Content-Type");
        if (clientId) {
            forwardHeaders.set("X-Client-Id", clientId);
        }

        let signal: AbortSignal | undefined;

        try {
            signal = getAbortSignal(event);

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
            if (signal?.aborted) {
                return new Response(null, { status: 499 });
            }
            throw error;
        }
    })
    .withDummyFetcher(dummyAudioFetcher)
    .build("/transcription/audio");

function dummyAudioFetcher(): Response {
    const dummyText =
        "This is a dummy audio transcription response that returns one word at a time to demonstrate the functionality of server-sent events in this Nuxt application.";

    const words = dummyText.split(" ");

    const stream = new ReadableStream({
        async start(controller) {
            try {
                for (let i = 0; i < words.length; i++) {
                    const word = words[i];
                    const isLastWord = i === words.length - 1;

                    controller.enqueue(new TextEncoder().encode(word));

                    if (!isLastWord) {
                        controller.enqueue(new TextEncoder().encode(" "));
                    }

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
