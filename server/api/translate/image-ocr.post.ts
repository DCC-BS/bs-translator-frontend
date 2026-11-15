import { getHeader } from "h3";

type OcrRequestBody = { image: File; sourceLanguage: string };

/**
 * POST handler for photo OCR.
 * Forwards the photo (multipart) to the backend, which runs GLM-OCR via docling-serve,
 * and returns the recognised text blocks with normalized boxes.
 */
export default backendHandlerBuilder<never, OcrRequestBody>()
    .withMethod("POST")
    .withBodyProvider(async (event) => {
        const form = await readFormData(event);
        const image = form.get("image_file");
        const sourceLanguage = form.get("source_language");

        if (!(image instanceof File)) {
            throw createError({
                statusCode: 400,
                statusMessage:
                    "Bad Request: 'image_file' is missing or not a file.",
            });
        }

        return {
            image,
            sourceLanguage:
                typeof sourceLanguage === "string" && sourceLanguage
                    ? sourceLanguage
                    : "auto",
        };
    })
    .withFetcher(async ({ url, method, body, headers, event }) => {
        const form = new FormData();
        form.append("image_file", body.image, body.image.name);
        form.append("source_language", body.sourceLanguage);

        // The multipart boundary must come from fetch, not the builder's JSON default.
        const forwardHeaders = new Headers(headers);
        forwardHeaders.delete("Content-Type");
        const clientId = getHeader(event, "x-client-id");
        if (clientId) {
            forwardHeaders.set("X-Client-Id", clientId);
        }

        const signal = getAbortSignal(event);

        try {
            const response = await backendFetch(url, {
                method,
                body: form,
                headers: forwardHeaders,
                signal,
            });

            if (!response.ok) {
                return await forwardBackendError(event, response);
            }

            return await response.json();
        } catch (error) {
            if (signal.aborted) {
                return new Response(null, { status: 499 });
            }
            throw error;
        }
    })
    .withDummyFetcher(dummyOcrFetcher)
    .build("/translation/image/ocr");

/** Two fake blocks so the photo page can be exercised without a backend. */
async function dummyOcrFetcher() {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {
        blocks: [
            {
                id: "t0",
                text: "Dummy-Überschrift",
                kind: "title",
                bbox: { left: 0.1, top: 0.1, right: 0.9, bottom: 0.2 },
            },
            {
                id: "t1",
                text: "Dies ist ein Beispieltext aus dem Dummy-Modus.",
                kind: "text",
                bbox: { left: 0.1, top: 0.3, right: 0.9, bottom: 0.5 },
            },
        ],
    };
}
