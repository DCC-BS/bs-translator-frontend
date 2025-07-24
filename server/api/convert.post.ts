export default defineBackendHandler<never, { file: File }, string, string>({
    url: "/convert/doc",
    method: "POST",
    bodyProvider: async (event) => {
        const inputFormData = await readFormData(event);
        const file = inputFormData.get("file") as File;

        return { file };
    },
    fetcher: async (url, method, body, _) => {
        const formData = new FormData();
        formData.append("file", body.file);

        const response = await fetch(url, {
            method,
            body: formData,
        });

        if (!response.ok) {
            console.log(await response.json());

            throw new Error("Failed to upload file");
        }

        return await response.json();
    },
});
