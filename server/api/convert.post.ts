import { getHeader } from "h3";
import type { ConversionResult } from "~~/shared/models/conversionResult";

/**
 * POST handler for document conversion.
 * Reads a file and source language from form data, sends to backend for conversion.
 * Returns ConversionResult on success, or an API error object on failure.
 */
export default backendHandlerBuilder<
    never,
    { file: File; sourceLanguage: string }
>()
    .withMethod("POST")
    .withBodyProvider(async (event) => {
        const inputFormData = await readFormData(event);
        const file = inputFormData.get("file");
        const sourceLanguage = inputFormData.get("source_language");

        if (!(file instanceof File)) {
            throw createError({
                statusCode: 400,
                statusMessage: "Bad Request: 'file' is missing or not a file.",
            });
        }

        if (typeof sourceLanguage !== "string" || !sourceLanguage) {
            throw createError({
                statusCode: 400,
                statusMessage:
                    "Bad Request: 'source_language' is missing or invalid.",
            });
        }

        return { file, sourceLanguage };
    })
    .withFetcher(async ({ url, method, body, headers, event }) => {
        const formData = new FormData();
        formData.append("file", body.file, body.file.name);
        formData.append("source_language", body.sourceLanguage);

        // Extract X-Client-Id from incoming request and forward to backend
        const clientId = getHeader(event, "x-client-id") ?? "";
        const forwardHeaders = new Headers(headers);
        forwardHeaders.delete("Content-Type");
        if (clientId) {
            forwardHeaders.set("X-Client-Id", clientId);
        }

        const signal = getAbortSignal(event);

        try {
            const response = await backendFetch(url, {
                method: method,
                body: formData,
                headers: forwardHeaders,
                signal,
            });

            // Return the backend error (status + JSON body, e.g. 413 file_too_large)
            // as-is so consumers can check it with isApiError()
            if (!response.ok) {
                return await forwardBackendError(event, response);
            }

            return (await response.json()) as ConversionResult;
        } catch (error) {
            // Silently handle abort errors - client cancelled the request
            if (signal.aborted) {
                return new Response(null, { status: 499 });
            }
            throw error;
        }
    })
    .withDummyFetcher({
        markdown:
            "# Dummy Document\n\nThis is a dummy conversion result.\n\n## Section 1\n\nLorem ipsum dolor sit amet.",
        images: {},
    })
    .build("/convert/doc");
