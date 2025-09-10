export default defineBackendHandler<
    never,
    { file: File; sourceLanguage: string },
    string,
    string
>({
    url: "/convert/doc",
    method: "POST",
    bodyProvider: async (event) => {
        const inputFormData = await readFormData(event);
        const file = inputFormData.get("file") as File;
        const sourceLanguage = inputFormData.get("source_language") as string;

        return { file, sourceLanguage };
    },
    fetcher: async (url, method, body, headers, event) => {
        const formData = new FormData();

        formData.append("file", body.file, body.file.name);
        formData.append("source_language", body.sourceLanguage);

        // remove Content-Type
        delete headers["Content-Type"];

        const abortController = new AbortController();
        event.node.res.on("close", () => {
            console.log("Response closed, aborting fetch");
            abortController.abort();
        });

        const response = await fetch(url, {
            method,
            body: formData,
            headers,
            signal: abortController.signal,
        });

        if (!response.ok) {
            setResponseStatus(event, response.status);
        }

        return await response.json();
    },
});
