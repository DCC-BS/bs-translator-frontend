import { type ComputedRef, computed } from "vue";

type RestartHandler = () => void | Promise<void>;
type SetExampleTextHandler = (text: string) => void;

const TOUR_RESTART_HANDLER_KEY = "tour-restart-handler";
const TOUR_SET_EXAMPLE_TEXT_HANDLER_KEY = "tour-set-example-text-handler";

/**
 * Global controller for the onboarding tour so that any component
 * can restart the guided flow (e.g., from the navigation menu).
 */
export function useTourController(): {
    registerRestartHandler: (handler: RestartHandler) => void;
    unregisterRestartHandler: () => void;
    restartTour: () => Promise<void>;
    canRestartTour: ComputedRef<boolean>;
    registerSetExampleTextHandler: (handler: SetExampleTextHandler) => void;
    unregisterSetExampleTextHandler: () => void;
    setExampleText: (text: string) => void;
} {
    const restartHandler = useState<RestartHandler | undefined>(
        TOUR_RESTART_HANDLER_KEY,
        () => undefined,
    );

    const setExampleTextHandler = useState<SetExampleTextHandler | undefined>(
        TOUR_SET_EXAMPLE_TEXT_HANDLER_KEY,
        () => undefined,
    );

    /**
     * Registers the function that actually restarts the tour.
     * Typically called by the onboarding component.
     */
    function registerRestartHandler(handler: RestartHandler): void {
        restartHandler.value = handler;
    }

    /**
     * Clears the currently registered restart handler.
     */
    function unregisterRestartHandler(): void {
        restartHandler.value = undefined;
    }

    /**
     * Invokes the registered restart handler if available.
     */
    async function restartTour(): Promise<void> {
        if (restartHandler.value) {
            await restartHandler.value();
        }
    }

    const canRestartTour: ComputedRef<boolean> = computed(
        () => restartHandler.value !== undefined,
    );

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
        registerRestartHandler,
        unregisterRestartHandler,
        restartTour,
        canRestartTour,
        registerSetExampleTextHandler,
        unregisterSetExampleTextHandler,
        setExampleText,
    };
}
