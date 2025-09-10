export default defineBackendHandler({
    url: "/translation/text",
    method: "POST",
    fetcher: async (url, method, body, headers, event) => {
        const abortController = new AbortController();
        event.node.res.on("close", () => {
            console.log("Response closed, aborting fetch");
            abortController.abort();
        });

        const response = await fetch(url, {
            method,
            body: JSON.stringify(body),
            headers: headers,
            signal: abortController.signal,
        });

        setResponseStatus(event, response.status);

        if (!response.ok) {
            return await response.json();
        }

        return response;
    },
});
