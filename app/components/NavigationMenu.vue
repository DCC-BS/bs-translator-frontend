<script lang="ts" setup>
// Add translation hook
const { t } = useI18n();
const { restartTour, canRestartTour } = useTourController();
const logger = useLogger();
const isRestarting = ref(false);

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
  <NavigationBar>
    <template #right>
      <UTooltip :text="t('tour.restart')" placement="bottom">
        <UButton data-tour="start-tour" data-testid="tourRestartButton" :aria-label="t('tour.restart')" variant="ghost"
          color="neutral" icon="i-lucide-help-circle" :disabled="!canRestartTour || isRestarting"
          @click="handleRestartTour">
        </UButton>
      </UTooltip>
    </template>
  </NavigationBar>
</template>