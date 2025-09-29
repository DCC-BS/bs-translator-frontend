import type { EventHandler, EventHandlerRequest } from "h3";
import { defineEventHandler } from "h3";
import type { BackendHandler, BodyProvider, Fetcher } from "./api";
import { sendToBackend } from "./api";

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
        return await sendToBackend<
            TRequest,
            TBody,
            TBackendResponse,
            TResponse
        >(event, options.url, options);
    });
