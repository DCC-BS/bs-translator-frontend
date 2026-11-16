/**
 * POST handler for language detection.
 * Uses the backendHandlerBuilder from the backend_communication layer.
 *
 * The custom fetcher forwards backend errors with their status and JSON body;
 * the layer's default fetcher would turn every backend error into a 500.
 */
export default apiHandler
    .withMethod("POST")
    .withFetcher(async ({ url, method, body, headers, event }) => {
        const response = await backendFetch(url, {
            method,
            body: JSON.stringify(body),
            headers,
            signal: getAbortSignal(event),
        });

        if (!response.ok) {
            return await forwardBackendError(event, response);
        }

        return await response.json();
    })
    .withDummyFetcher({ language: "de", confidence: 0.95 })
    .build("/translation/detect-language");
