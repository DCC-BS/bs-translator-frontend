import {
    createApiClient,
    createFetcherBuilder,
} from "@dcc-bs/communication.bs.js";
import { useClientId } from "~/composables/clientId.composable";

export default defineNuxtPlugin((_) => {
    const clientId = useClientId().getClientId();

    const fetcher = createFetcherBuilder()
        .addHeader("X-Client-Id", clientId)
        .build();

    const apiClient = createApiClient(fetcher);

    return {
        provide: {
            apiClient: apiClient,
        },
    };
});
