export default defineBackendHandler({
    url: "/translation/text",
    method: "POST",
    fetcher: async (url, method, body, headers, event) => {
        const logger = getEventLogger(event);

        try {
            return await fetch(url, {
                method,
                body: JSON.stringify(body),
                headers: headers,
            });
        } catch (error) {
            logger.error("Failed to fetch translation:", error);
        }
    },
});
