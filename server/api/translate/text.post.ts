import type { H3Event } from "h3";
import { sendToBackend } from "~~/server/utils/api";

export default defineEventHandler(async (event) => {
    if (import.meta.env.STUB_API !== "true") {
        return await sendToBackend(event, "/translation/text", {
            method: "POST",
            fetcher: async (url, method, body, headers, event) => {
                const abortController = new AbortController();
                event.node.res.on("close", () => {
                    console.log("Response closed, aborting fetch");
                    abortController.abort();
                });

                const response = await fetch(url, {
                    method,
                    body: JSON.stringify(body),
                    headers: headers,
                    signal: abortController.signal,
                });

                setResponseStatus(event, response.status);

                if (!response.ok) {
                    return await response.json();
                }

                return response;
            },
        });
    }

    await sendDummyStream(event);
});

async function sendDummyStream(event: H3Event) {
    setResponseHeader(event, "Content-Type", "text/event-stream");
    setResponseHeader(event, "Cache-Control", "no-cache");

    const body = await readBody<{
        text: string;
    }>(event);

    const chunks = body.text.split(" ").map((word) => `${word} `);
    if (chunks.length > 0) {
        chunks[chunks.length - 1] = chunks[chunks.length - 1]?.trim() ?? "";
    }
    let index = 0;

    function pushChunk() {
        if (index < chunks.length) {
            event.node.res.write(chunks[index]);
            index++;
            setTimeout(pushChunk, 100); // Simulate delay between chunks
        } else {
            event.node.res.end();
        }
    }

    pushChunk();
}
