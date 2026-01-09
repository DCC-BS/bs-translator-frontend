import type { ConvertionResult } from "~~/shared/models/convertionResult";

/**
 * POST handler for document conversion.
 * Reads a file and source language from form data, sends to backend for conversion.
 */
export default backendHandlerBuilder<
    never,
    { file: File; sourceLanguage: string },
    ConvertionResult
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
    .withFetcher(async (options) => {
        const formData = new FormData();
        formData.append("file", options.body.file, options.body.file.name);
        formData.append("source_language", options.body.sourceLanguage);

        const response = await fetch(options.url, {
            method: options.method,
            body: formData,
            headers: {
                "X-Client-Id": getHeader(options.event, "x-client-id") ?? "",
            },
            signal: getAbortSignal(options.event),
        });

        if (!response.ok) {
            setResponseStatus(options.event, response.status);
        }

        return (await response.json()) as ConvertionResult;
    })
    .build("/convert/doc");
