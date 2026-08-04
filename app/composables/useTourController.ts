type SetExampleTextHandler = (text: string) => void;

const TOUR_SET_EXAMPLE_TEXT_HANDLER_KEY = "tour-set-example-text-handler";

/**
 * Lets the tour fill the source text field with example text, wherever that
 * field happens to be mounted. Mounting and restarting the tour itself is
 * owned by common-ui (`<FirstRunOrchestrator>`, `<OnboardingRestartButton>`).
 */
export function useTourController(): {
    registerSetExampleTextHandler: (handler: SetExampleTextHandler) => void;
    unregisterSetExampleTextHandler: () => void;
    setExampleText: (text: string) => void;
} {
    const setExampleTextHandler = useState<SetExampleTextHandler | undefined>(
        TOUR_SET_EXAMPLE_TEXT_HANDLER_KEY,
        () => undefined,
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
        registerSetExampleTextHandler,
        unregisterSetExampleTextHandler,
        setExampleText,
    };
}
