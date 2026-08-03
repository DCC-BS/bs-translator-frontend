import { FIRST_RUN_COOKIE_MAX_AGE } from "@dcc-bs/common-ui.bs.js/types";

type SetExampleTextHandler = (text: string) => void;

const TOUR_SET_EXAMPLE_TEXT_HANDLER_KEY = "tour-set-example-text-handler";

/**
 * Global controller for the onboarding tour so that any component
 * can restart the guided flow (e.g., from the navigation menu).
 *
 * Mounting the tour itself is owned by `<FirstRunOrchestrator>`; restarting
 * means clearing the completion cookie the orchestrator reads.
 */
export function useTourController(): {
    restartTour: () => void;
    registerSetExampleTextHandler: (handler: SetExampleTextHandler) => void;
    unregisterSetExampleTextHandler: () => void;
    setExampleText: (text: string) => void;
} {
    const tourCompleted = useCookie("tour-completed", {
        default: () => false,
        maxAge: FIRST_RUN_COOKIE_MAX_AGE,
    });

    const setExampleTextHandler = useState<SetExampleTextHandler | undefined>(
        TOUR_SET_EXAMPLE_TEXT_HANDLER_KEY,
        () => undefined,
    );

    /**
     * Re-arms the onboarding flow so the orchestrator mounts the tour again.
     */
    function restartTour(): void {
        tourCompleted.value = false;
    }

    /**
     * Registers the function that sets example text in the source text field.
     * Typically called by the TranslateView component.
     */
    function registerSetExampleTextHandler(
        handler: SetExampleTextHandler,
    ): void {
        setExampleTextHandler.value = handler;
    }

    /**
     * Clears the currently registered set example text handler.
     */
    function unregisterSetExampleTextHandler(): void {
        setExampleTextHandler.value = undefined;
    }

    /**
     * Sets example text in the source text field if handler is registered.
     */
    function setExampleText(text: string): void {
        if (setExampleTextHandler.value) {
            setExampleTextHandler.value(text);
        }
    }

    return {
        restartTour,
        registerSetExampleTextHandler,
        unregisterSetExampleTextHandler,
        setExampleText,
    };
}
