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
    fetcher: async (url, method, body, headers) => {
        const formData = new FormData();
        formData.append("file", body.file);
        formData.append("source_language", body.sourceLanguage);

        // remove Content-Type
        delete headers["Content-Type"];

        const response = await fetch(url, {
            method,
            body: formData,
            headers,
        });

        if (!response.ok) {
            console.error("File conversion failed:", await response.text());
            throw new Error("Failed to upload file");
        }

        return await response.json();
    },
});
