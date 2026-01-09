export default defineAppConfig({
    logger: {
        loglevel: "info" as LogLevel,
        meta: [] as unknown[],
        includeStackTrace: false,
        stackTraceLimit: 5,
        logAllRequests: false,
    },
});
