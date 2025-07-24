export default defineNuxtPlugin(async () => {
    try {
        // Import the entire buffer module
        const bufferModule = await import("buffer");
        // Access Buffer from the module
        globalThis.Buffer = bufferModule.Buffer;
    } catch (error) {
        console.error("Failed to load Buffer polyfill:", error);
    }
});
