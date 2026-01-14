import type { MultiPartData } from "h3";

/**
 * POST handler for image translation.
 * Accepts image via multipart form data and returns translation stream.
 */
export default backendHandlerBuilder<never, MultiPartData[] | undefined>()
    .withMethod("POST")
    .withBodyProvider(async (event) => await readMultipartFormData(event))
    .withFetcher(async (options) => {
        if (!options.body) {
            throw new Error("No body provided");
        }

        const form = new FormData();
        for (const part of options.body) {
            if (part.filename) {
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

        const signal = getAbortSignal(options.event);

        try {
            const response = await fetch(options.url, {
                method: options.method,
                body: form,
                headers: {
                    "X-Client-Id":
                        getHeader(options.event, "x-client-id") ?? "",
                },
                signal,
            });

            setResponseStatus(options.event, response.status);

            if (!response.ok) {
                return await response.json();
            }

            return response;
        } catch (error) {
            // Silently handle abort errors - client cancelled the request
            if (signal.aborted) {
                return new Response(null, { status: 499 });
            }
            throw error;
        }
    })
    .build("/translation/image");
