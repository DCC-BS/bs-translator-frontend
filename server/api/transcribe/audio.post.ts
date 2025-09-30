import type { H3Event } from "h3";

export default defineEventHandler(async (event) => {
    if (import.meta.env.STUB_API !== "true") {
        return await sendToBackend(event, "/transcription/audio", {
            method: "POST",
            bodyProvider: async (event) => {
                const body = await readFormData(event);
                return body;
            },
            fetcher: async (url, method, body, headers, event) => {
                if (!body) {
                    throw new Error("No body provided");
                }

                const form = new FormData();
                form.append("audio_file", body.get("audio_file") as Blob);
                form.append("language", body.get("language") as string);

                delete headers["Content-Type"]; // Let the browser set the correct Content-Type with boundary

                const abortController = new AbortController();
                event.node.res.on("close", () => {
                    console.log("Response closed, aborting fetch");
                    abortController.abort();
                });

                const response = await fetch(url, {
                    method,
                    body: form,
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

    const form = await readFormData(event);

    if (!form.get("file")) {
        throw new Error("No file provided");
    }

    sendDummyStream(event);
});

async function sendDummyStream(event: H3Event) {
    setResponseHeader(event, "Content-Type", "text/event-stream");
    setResponseHeader(event, "Cache-Control", "no-cache");

    const chunks = ["This ", "is ", "a ", "dummy ", "streaming ", "response"];
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
