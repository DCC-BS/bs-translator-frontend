<script lang="ts" setup>
interface InputProps {
    showTour?: boolean;
    inConversation?: boolean;
}

const props = withDefaults(defineProps<InputProps>(), {
    showTour: true,
    inConversation: false,
});

// Add translation hook
const { t } = useI18n();
const config = useRuntimeConfig();
const { restartTour, canRestartTour } = useTourController();
const logger = useLogger();
const isRestarting = ref(false);
const onlineFetchFunction = config.public.useDummyData
    ? async () => true
    : undefined;

/**
 * Restarts the onboarding tour via the shared tour controller.
 */
async function handleRestartTour(): Promise<void> {
    if (isRestarting.value || !canRestartTour.value) {
        return;
    }

    isRestarting.value = true;

    try {
        await restartTour();
    } catch (error) {
        logger.error(error, "Failed to restart onboarding tour");
    } finally {
        isRestarting.value = false;
    }
}
</script>

<template>
    <NavigationBar data-tour="main-content">
        <template #left>
            <ULink to="/" class="text-xl font-bold ml-4">
            BS Translator
            </ULink>
        </template>
        <template #rightPostItems>
            <OnlineStatus :isOnlineCheckFunction="onlineFetchFunction" />
            <UTooltip :text="t('tooltips.restart-tour')" placement="bottom">
                <UButton v-if="props.showTour" data-tour="start-tour" data-testid="tourRestartButton" :aria-label="t('tour.restart')" variant="ghost"
                  color="neutral" icon="i-lucide-help-circle" :disabled="!canRestartTour || isRestarting"
                  @click="handleRestartTour">
                </UButton>
            </UTooltip>
            <ULink v-if="props.inConversation" to="/">
                <UButton variant="ghost" color="neutral" icon="i-lucide-home">
                    <div class="hidden md:inline">Home</div>
                </UButton>
            </ULink>
            <ULink v-else to="/conversation">
                <UButton variant="subtle" color="primary" icon="i-lucide-message-circle-more">
                    <div class="hidden md:inline">Conversation Mode </div>
                </UButton>
            </ULink>
        </template>
    </NavigationBar>
</template>
