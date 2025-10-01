import type { EventHandlerRequest, H3Event } from "h3";
import { readBody } from "h3";
import { useRuntimeConfig } from "#imports";

/**
 * Function type for extracting the request body from an H3 event
 * @template TIn - The event handler request type
 * @template TBody - The expected body type
 */
export type BodyProvider<TIn extends EventHandlerRequest, TBody> = (
    event: H3Event<TIn>,
) => Promise<TBody>;

/**
 * Function type for processing backend responses before returning to the client
 * @template T - The backend response type
 * @template D - The final response type to return to the client
 */
export type BackendHandler<T, D> = (response: T) => Promise<D>;

/**
 * Function type for making HTTP requests to the backend
 * @template T - The response type from the backend
 */
export type Fetcher<TBody, TResponse, TRequest extends EventHandlerRequest> = (
    url: string,
    method: "GET" | "POST" | "PUT" | "DELETE",
    body: TBody,
    headers: Record<string, string>,
    event: H3Event<TRequest>,
) => Promise<TResponse>;

/**
 * Default body provider that extracts and parses the request body using H3's readBody
 * @template TRequest - The event handler request type
 * @template TBody - The expected body type
 * @param event - The H3 event object
 * @returns Promise resolving to the parsed request body
 */
async function extractEventBody<TRequest extends EventHandlerRequest, TBody>(
    event: H3Event<TRequest>,
): Promise<TBody> {
    return readBody<TBody>(event);
}

export async function noBody<TRequest extends EventHandlerRequest>(
    _: H3Event<TRequest>,
): Promise<undefined> {
    return undefined;
}

/**
 * Default response handler that simply passes through the backend response
 * @template TBackendResponse - The type of response from the backend
 * @template TResponse - The final response type (defaults to backend response type)
 * @param response - The response from the backend API
 * @returns Promise resolving to the response cast to the expected type
 */
export async function defaultHandler<TBackendResponse, TResponse>(
    response: TBackendResponse,
): Promise<TResponse> {
    return response as unknown as TResponse;
}

/**
 * Default fetcher that uses Nuxt's $fetch utility
 * @template T - The response type from the backend
 * @param url - The full URL to fetch from
 * @param method - HTTP method to use
 * @param body - Request body (will be JSON stringified)
 * @param headers - HTTP headers to include
 * @returns Promise resolving to the backend response
 */
export async function defaultFetcher<T>(
    url: string,
    method: "GET" | "POST" | "PUT" | "DELETE",
    body: unknown,
    headers: Record<string, string>,
): Promise<T> {
    return (await $fetch<T>(url, {
        method,
        body: JSON.stringify(body),
        headers,
    })) as Promise<T>;
}

export type Options<
    TRequest extends EventHandlerRequest = object,
    TBody = undefined,
    TBackendResponse = unknown,
    TResponse = TBackendResponse,
> = {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    bodyProvider?: BodyProvider<TRequest, TBody>;
    handler?: BackendHandler<TBackendResponse, TResponse>;
    fetcher?: Fetcher<TBody, TBackendResponse, TRequest>;
};

/**
 * Default configuration options for backend handler
 */
const defaultOptions = {
    method: "GET" as const,
    handler: defaultHandler,
    fetcher: defaultFetcher,
};

function getDefaultBodyProvider<TRequest extends EventHandlerRequest, TBody>(
    method?: "GET" | "POST" | "PUT" | "DELETE",
): BodyProvider<TRequest, TBody> {
    switch (method) {
        case undefined:
            return noBody as BodyProvider<TRequest, TBody>;
        case "GET":
        case "DELETE":
            return noBody as BodyProvider<TRequest, TBody>;
        default:
            return extractEventBody;
    }
}

export async function sendToBackend<
    TRequest extends EventHandlerRequest = object,
    TBody = undefined,
    TBackendResponse = unknown,
    TResponse = TBackendResponse,
>(
    event: H3Event<TRequest>,
    url: string,
    options: Options<TRequest, TBody, TBackendResponse, TResponse> = {},
) {
    const { method, bodyProvider, handler, fetcher } = {
        ...defaultOptions,
        bodyProvider: getDefaultBodyProvider<TRequest, TBody>(options.method),
        ...options,
    } as Required<Options<TRequest, TBody, TBackendResponse, TResponse>>;

    // Get runtime configuration for API base URL
    const config = useRuntimeConfig();

    // Get headers from the event
    const headers = getHeaders(event);

    // Extract request body using the configured body provider
    const body = await bodyProvider(event);

    // Make authenticated request to backend API using the configured fetcher
    const backendResponse = await fetcher(
        `${config.apiUrl}${url}`,
        method,
        body,
        {
            "X-Client-Id": headers["x-ephemeral-uuid"] ?? "",
            "Content-Type": "application/json",
        },
        event,
    );

    // Transform the backend response using the configured handler
    return await handler(backendResponse as TBackendResponse);
}
