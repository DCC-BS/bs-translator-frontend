import type { EventHandler, EventHandlerRequest, H3Event } from "h3";
import { defineEventHandler, readBody } from "h3";
import { useRuntimeConfig } from "#imports";

/**
 * Function type for extracting the request body from an H3 event
 * @template TIn - The event handler request type
 * @template TBody - The expected body type
 */ useRuntimeConfig;
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

/**
 * Creates a Nuxt server event handler that proxies requests to a backend API with authentication
 *
 * This utility function handles:
 * - Authentication token extraction and validation
 * - Session management with refresh token error handling
 * - Request body processing
 * - Backend API communication with proper headers
 * - Response transformation
 * - Error handling
 *
 * @template TRequest - The type of the incoming request event
 * @template TBody - The type of the request body
 * @template TBackendResponse - The type of response expected from the backend API
 * @template TResponse - The final response type returned to the client (defaults to TBackendResponse)
 *
 * @param options - Configuration object for the handler
 * @param options.url - The backend API endpoint URL (relative to the configured API base URL)
 * @param options.method - HTTP method to use (defaults to "POST")
 * @param options.bodyProvider - Function to extract the request body (defaults to readBody)
 * @param options.handler - Function to transform the backend response (defaults to pass-through)
 * @param options.fetcher - Function to make HTTP requests (defaults to $fetch)
 *
 * @returns An H3 event handler that can be used in Nuxt server routes
 *
 * @throws {401} When user is not authenticated or token refresh fails
 *
 * @example
 * ```typescript
 * // Simple POST request handler
 * export default defineBackendHandler({
 *   url: "correct",
 * });
 *
 * // GET request with custom response transformation
 * export default defineBackendHandler<{}, unknown, BackendUser[], User[]>({
 *   url: "users",
 *   method: "GET",
 *   handler: async (backendUsers) => backendUsers.map(transformUser),
 * });
 * ```
 */
export const defineBackendHandler = <
    TRequest extends EventHandlerRequest = EventHandlerRequest,
    TBody = unknown,
    TBackendResponse = unknown,
    TResponse = TBackendResponse,
>(options: {
    url: string;
    method?: "POST" | "GET" | "PUT" | "DELETE";
    bodyProvider?: BodyProvider<TRequest, TBody>;
    handler?: BackendHandler<TBackendResponse, TResponse>;
    fetcher?: Fetcher<TBody, TBackendResponse, TRequest>;
}): EventHandler<TRequest, Promise<TResponse>> =>
    defineEventHandler<TRequest>(async (event) => {
        // Merge provided options with defaults
        const { url, method, bodyProvider, handler, fetcher } = {
            ...defaultOptions,
            ...{
                bodyProvider: getDefaultBodyProvider<TRequest, TBody>(
                    options.method,
                ),
            },
            ...options,
        };

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
    });
