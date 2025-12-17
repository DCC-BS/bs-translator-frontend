/**
 * Liveness Probe - /health/liveness
 * Lightweight check to prove the event loop is alive without external deps.
 */
export default defineEventHandler(() => {
    return {
        status: "up",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    };
});
