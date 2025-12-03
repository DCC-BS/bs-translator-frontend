/**
 * Startup Probe - /health/startup
 * Informs Kubernetes that the Nuxt server finished bootstrapping.
 * Once this returns 200, startup probing stops for the pod lifecycle.
 */
export default defineEventHandler(() => {
    return {
        status: "started",
        timestamp: new Date().toISOString(),
    };
});
