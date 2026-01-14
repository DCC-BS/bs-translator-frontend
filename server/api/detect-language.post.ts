/**
 * POST handler for language detection.
 * Uses the backendHandlerBuilder from the backend_communication layer.
 */
export default apiHandler
    .withMethod("POST")
    .build("/translation/detect-language");
