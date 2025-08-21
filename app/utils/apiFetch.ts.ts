export type FetchOptions = RequestInit;

export type ErrorId = "unknown_error" | string;

export type ApiError = {
    erroId: ErrorId;
    debugMessage?: string;
    status: number;
};

export type ApiResponse<T> = T | ApiError;

export async function apifetch<T>(
    url: string,
    options: FetchOptions,
): Promise<ApiResponse<T>> {
    const { getClientId } = useClientId();

    const response = await fetch(url, {
        ...options,
        headers: {
            "X-Ephemeral-UUID": getClientId(),
            ...options.headers,
        },
    });

    if (response.ok) {
        const data = await response.json();
        return data as T;
    }

    try {
        const data = await response.json();
        return {
            ...data,
            status: response.status,
        };
    } catch (_) {
        return {
            erroId: "unknown_error",
            status: response.status,
        };
    }
}
