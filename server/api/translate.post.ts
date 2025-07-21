export default defineBackendHandler({
    url: "/translation/text",
    method: "POST",
    fetcher: async (url, method, body, headers) => {
        return await fetch(url, {
            method,
            body: JSON.stringify(body),
            headers: headers,
        });
    },
});
