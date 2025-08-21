export type FetchOptions = RequestInit;

export type ApiFailure = {
    message: string;
    status: number;
};

export type ApiResponse<T> = T | ApiFailure;

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
        };
    } catch (_) {
        return {
            message: response.statusText,
            status: response.status,
        };
    }
}
