import type { MaybeRefOrGetter } from "vue";

/**
 * Warns the user before they lose work in progress (a recording, a running
 * translation, an OCR job).
 *
 * - Reload / close tab / external navigation: the browser's own
 *   "Leave site?" dialog via `beforeunload` (browsers ignore custom text there).
 * - In-app navigation: a `confirm()` with a translated message.
 *
 * The guard is only armed while `isActive` is true, so idle pages never prompt.
 *
 * @param isActive - Whether work is currently in progress
 * @param messageKey - i18n key of the confirmation shown for in-app navigation
 */
export function useLeavePageGuard(
    isActive: MaybeRefOrGetter<boolean>,
    messageKey = "leaveGuard.message",
) {
    const { t } = useI18n();

    function onBeforeUnload(event: BeforeUnloadEvent): void {
        if (!toValue(isActive)) {
            return;
        }
        event.preventDefault();
        // Required by older Chromium/Safari to show the dialog.
        event.returnValue = "";
    }

    onMounted(() => {
        window.addEventListener("beforeunload", onBeforeUnload);
    });

    onBeforeUnmount(() => {
        window.removeEventListener("beforeunload", onBeforeUnload);
    });

    onBeforeRouteLeave(() => {
        if (!toValue(isActive)) {
            return true;
        }
        return window.confirm(t(messageKey));
    });
}
