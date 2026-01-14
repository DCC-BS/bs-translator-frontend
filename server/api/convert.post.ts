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

        const signal = getAbortSignal(event);

        try {
            const response = await fetch(url, {
                method: method,
                body: formData,
                headers,
                signal,
            });

            // Set the response status to match the backend response
            setResponseStatus(event, response.status);

            // Return error response as-is to allow consumers to check with isApiError()
            // Guard against non-JSON error responses (e.g., HTML error pages, plain text)
            if (!response.ok) {
                const contentType = response.headers.get("content-type") ?? "";
                if (contentType.includes("application/json")) {
                    return await response.json();
                }
                return await response.text();
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
    .build("/convert/doc");
