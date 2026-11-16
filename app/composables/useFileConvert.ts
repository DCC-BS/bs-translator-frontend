import { isApiError } from "@dcc-bs/communication.bs.js";
import { useDropZone } from "@vueuse/core";
import type { MaybeRefOrGetter } from "vue";
import { apiErrorMessage } from "~/utils/apiErrorMessage";
import { MAX_UPLOAD_FILE_SIZE_BYTES } from "~/utils/constants";
import type { ConversionResult } from "~~/shared/models/conversionResult";

/**
 * Composable for handling file conversion and drop zone functionality
 * @param sourceLanguage Source language passed to the conversion (OCR)
 * @param onComplete Callback function that receives the converted text
 * @param options.disabled Rejects new files while true (e.g. while a
 *   translation is running), in addition to while a conversion is running
 * @returns Object containing drop zone refs and state
 */
export function useFileConvert(
    sourceLanguage: Ref<string>,
    onComplete: (text: string) => void,
    options: { disabled?: MaybeRefOrGetter<boolean> } = {},
) {
    const toast = useToast();
    const { t, te } = useI18n();
    const { apiFetch } = useApi();

    const dropZoneRef = ref<HTMLDivElement>();
    const isConverting = ref<boolean>(false);
    const abortController = ref(new AbortController());

    /** True while no new file may be dropped or picked. */
    const isUploadDisabled = computed(
        () => isConverting.value || toValue(options.disabled ?? false),
    );

    onUnmounted(() => {
        abortController.value.abort();
    });

    function showConversionError(message: string): void {
        toast.add({
            title: t("ui.error"),
            description: message,
            color: "error",
            icon: "i-lucide-alert-circle",
            duration: 5000,
        });
    }

    /**
     * Replaces the `imageN.png` references in the markdown by object URLs of
     * the extracted images.
     */
    function embedImages(result: ConversionResult): string {
        let markdown = result.markdown;

        for (const [index, base64] of Object.entries(result.images)) {
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

            markdown = markdown.replace(`(image${index}.png)`, `(${link})`);
        }

        return markdown;
    }

    /**
     * Processes and converts a file to text
     * @param file File to be converted
     */
    async function processFile(file: File): Promise<void> {
        if (isUploadDisabled.value) {
            return;
        }

        if (file.size > MAX_UPLOAD_FILE_SIZE_BYTES) {
            showConversionError(
                apiErrorMessage({ t, te }, "conversion", "file_too_large"),
            );
            return;
        }

        abortController.value.abort(); // Abort any ongoing conversion
        const controller = new AbortController();
        abortController.value = controller;

        isConverting.value = true;

        try {
            const formData = new FormData();
            formData.append("file", file, file.name);
            // Ensure sourceLanguage is never undefined, default to "auto"
            formData.append("source_language", sourceLanguage.value || "auto");

            const result = await apiFetch<ConversionResult>("/api/convert", {
                method: "POST",
                body: formData,
                signal: controller.signal,
            });

            // Superseded by a newer file or the view was left: not an error.
            if (controller.signal.aborted) {
                return;
            }

            if (isApiError(result)) {
                showConversionError(
                    apiErrorMessage({ t, te }, "conversion", result.errorId),
                );
                return;
            }

            // The backend returns the markdown as parsed JSON, so it needs no
            // unescaping: backslashes and quotes in it are real content.
            onComplete(embedImages(result));

            toast.add({
                title: t("ui.fileConvertedSuccess"),
                description: file.name,
                color: "success",
                icon: "i-lucide-check-circle",
                duration: 3000,
            });
        } catch (_err) {
            if (!controller.signal.aborted) {
                showConversionError(t("api_error.unexpected_error"));
            }
        } finally {
            // An aborted run must not reset the state of the run replacing it.
            if (abortController.value === controller) {
                isConverting.value = false;
            }
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

    const { isOverDropZone: isOverDropZoneRaw } = useDropZone(dropZoneRef, {
        onDrop,
        multiple: false,
        // Must not depend on the busy state: useDropZone re-checks validity on
        // every drag event and skips its dragleave/drop cleanup when invalid,
        // so a flip mid-drag would leave the overlay stuck. processFile rejects
        // files while busy instead. Always preventDefault so a rejected file is
        // not opened by the browser instead (which would leave the page).
        checkValidity: (items) => items.length <= 1,
        preventDefaultForUnhandled: true,
        onOver: (_, event) => {
            if (isUploadDisabled.value && event.dataTransfer) {
                event.dataTransfer.dropEffect = "none";
            }
        },
    });

    const isOverDropZone = computed(
        () => isOverDropZoneRaw.value && !isUploadDisabled.value,
    );

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

    return {
        dropZoneRef,
        isOverDropZone,
        isConverting,
        isUploadDisabled,
        processFile,
        handleFileSelect,
    };
}
