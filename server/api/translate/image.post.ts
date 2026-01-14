import { getHeader, type MultiPartData } from "h3";

/**
 * POST handler for image translation.
 * Accepts image via multipart form data and returns translation stream.
 */
export default backendHandlerBuilder<never, MultiPartData[] | undefined>()
    .withMethod("POST")
    .withBodyProvider(async (event) => await readMultipartFormData(event))
    .withFetcher(async ({ url, method, body, headers, event }) => {
        if (!body) {
            throw new Error("No body provided");
        }

        const form = new FormData();
        for (const part of body) {
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

        // Extract X-Client-Id from incoming request and forward to backend
        const clientId = getHeader(event, "x-client-id") ?? "";
        const forwardHeaders = new Headers(headers);
        if (clientId) {
            forwardHeaders.set("X-Client-Id", clientId);
        }

        const signal = getAbortSignal(event);

        try {
            const response = await fetch(url, {
                method: method,
                body: form,
                headers: forwardHeaders,
                signal,
            });

            setResponseStatus(event, response.status);

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
