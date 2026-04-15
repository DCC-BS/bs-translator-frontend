/**
 * POST handler for language detection.
 * Uses the backendHandlerBuilder from the backend_communication layer.
 */
export default apiHandler
    .withMethod("POST")
    .withDummyFetcher({ language: "de", confidence: 0.95 })
    .build("/translation/detect-language");
