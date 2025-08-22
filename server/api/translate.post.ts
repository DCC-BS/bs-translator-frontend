export default defineBackendHandler({
    url: "/translation/text",
    method: "POST",
    fetcher: async (url, method, body, headers, event) => {
        const response = await fetch(url, {
            method,
            body: JSON.stringify(body),
            headers: headers,
        });

        setResponseStatus(event, response.status);

        if (!response.ok) {
            return await response.json();
        }

        return response;
    },
});
