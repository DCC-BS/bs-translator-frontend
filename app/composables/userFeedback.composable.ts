export function useUserFeedback() {
    const toast = useToast();

    function showError(title: string, description: string) {
        toast.add({
            title,
            description,
            icon: "i-lucide-circle-alert",
            color: "error",
        });
    }

    return {
        showError,
    };
}
