import { useDropZone } from "@vueuse/core";
import type { ConverstionResult } from "~/models/convertionResult";

/**
 * Composable for handling file conversion and drop zone functionality
 * @param onComplete Callback function that receives the converted text
 * @returns Object containing drop zone refs and state
 */
export const useFileConvert = (onComplete: (text: string) => void) => {
    const dropZoneRef = ref<HTMLDivElement>();
    const isConverting = ref<boolean>(false);
    const error = ref<string | undefined>(undefined);
    const fileName = ref<string | undefined>(undefined);

    /**
     * Processes and converts a file to text
     * @param file File to be converted
     */
    async function processFile(file: File): Promise<void> {
        try {
            fileName.value = file.name;
            error.value = undefined;
            isConverting.value = true;

            const formData = new FormData();
            formData.append("file", file);

            const result = await $fetch<ConverstionResult>("/api/convert", {
                method: "POST",
                body: formData,
            });

            // remove " at start and end of the string
            if (
                result.markdown.startsWith('"') &&
                result.markdown.endsWith('"')
            ) {
                result.markdown = result.markdown.slice(1, -1);
            }

            result.markdown = result.markdown.replace(/\\n/g, "\n"); // Replace escaped newlines with actual newlines
            result.markdown = result.markdown.replace(/\\t/g, "\t"); // Replace escaped tabs with actual tabs
            result.markdown = result.markdown.replace(/\\r/g, "\r"); // Replace escaped carriage returns with actual carriage returns

            // Convert images to data URLs
            for (const [index, base64] of Object.entries(result.images)) {
                // const dataUrl = `data:image/png;base64,${base64}`;

                const base64WithoutPrefix = base64.replace(
                    /^data:image\/png;base64,/,
                    "",
                );

                const blob = new Blob(
                    [
                        Uint8Array.from(atob(base64WithoutPrefix), (c) =>
                            c.charCodeAt(0),
                        ),
                    ],
                    { type: "image/png" },
                );

                const link = URL.createObjectURL(blob);

                result.markdown = result.markdown.replace(
                    `(img${index}.png)`,
                    `(${link})`,
                );
            }

            onComplete(result.markdown);
        } catch (err) {
            error.value =
                err instanceof Error ? err.message : "Failed to convert file";
            console.error("File conversion error:", err);
        } finally {
            isConverting.value = false;
        }
    }

    /**
     * Handles file drop events
     * @param files Array of dropped files
     */
    async function onDrop(files: File[] | null): Promise<void> {
        if (files && files.length > 0 && files[0]) {
            await processFile(files[0]);
        }
    }

    const { isOverDropZone } = useDropZone(dropZoneRef, {
        onDrop,
        multiple: false,
    });

    /**
     * Handles file selection from file input
     * @param event File input change event
     */
    function handleFileSelect(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0 && input.files[0]) {
            processFile(input.files[0]);
        }
    }

    /**
     * Resets error state
     */
    function clearError(): void {
        error.value = undefined;
    }

    return {
        dropZoneRef,
        isOverDropZone,
        isConverting,
        error,
        fileName,
        handleFileSelect,
        clearError,
    };
};
