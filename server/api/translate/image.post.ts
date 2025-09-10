export default defineBackendHandler({
    url: "/translation/image",
    method: "POST",
    bodyProvider: async (event) => {
        const body = await readMultipartFormData(event);
        return body;
    },
    fetcher: async (url, method, body, headers, event) => {
        if (!body) {
            throw new Error("No body provided");
        }

        const form = new FormData();
        for (const part of body) {
            if (part.filename) {
                // it's a file
                form.append(
                    part.name as string,
                    new Blob([part.data as BlobPart], { type: part.type }),
                    part.filename,
                );
            } else {
                form.append(
                    part.name as string,
                    part.data as unknown as string,
                );
            }
        }

        delete headers["Content-Type"]; // Let the browser set the correct Content-Type with boundary

        const abortController = new AbortController();
        event.node.res.on("close", () => {
            console.log("Response closed, aborting fetch");
            abortController.abort();
        });

        const response = await fetch(url, {
            method,
            body: form,
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
