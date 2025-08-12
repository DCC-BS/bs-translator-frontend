export default defineBackendHandler<never, { file: File }, string, string>({
    url: "/convert/doc",
    method: "POST",
    bodyProvider: async (event) => {
        const inputFormData = await readFormData(event);
        const file = inputFormData.get("file") as File;

        return { file };
    },
    fetcher: async (url, method, body, headers) => {
        const formData = new FormData();
        formData.append("file", body.file);

        // remove Content-Type
        delete headers["Content-Type"];

        const response = await fetch(url, {
            method,
            body: formData,
            headers,
        });

        if (!response.ok) {
            console.log(await response.json());
            throw new Error("Failed to upload file");
        }

        return await response.json();
    },
});
