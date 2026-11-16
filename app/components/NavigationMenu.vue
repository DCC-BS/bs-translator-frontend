<script lang="ts" setup>
interface InputProps {
    inConversation?: boolean;
}

const props = withDefaults(defineProps<InputProps>(), {
    inConversation: false,
});

// Add translation hook
const { t } = useI18n();
const config = useRuntimeConfig();

const apps = useAppList("BS-Übersetzer");
</script>

<template>
    <NavigationBar :other-apps="apps" data-tour="main-content" class="relative items-center">
        <template #center>
            <div class="flex justify-center lg:absolute lg:left-1/2 lg:-translate-x-1/2">
                <UButton v-if="props.inConversation" to="/" variant="ghost" color="neutral" icon="i-lucide-home"
                    :aria-label="t('navigation.backToTranslator')" class="max-md:p-1.5">
                    <div class="hidden md:inline">{{ t("navigation.backToTranslator") }}</div>
                </UButton>
                <UFieldGroup v-else>
                    <UButton to="/conversation" data-tour="conversation-mode" variant="subtle" color="primary"
                        icon="i-lucide-message-circle-more" :aria-label="t('navigation.conversation-mode')"
                        class="max-md:p-1.5">
                        <div class="hidden md:inline">{{ t("navigation.conversation-mode") }}</div>
                    </UButton>
                    <UButton to="/photo" data-tour="photo-mode" variant="subtle" color="primary"
                        icon="i-lucide-camera" :aria-label="t('navigation.photo-mode')"
                        class="max-md:p-1.5">
                        <div class="hidden md:inline">{{ t("navigation.photo-mode") }}</div>
                    </UButton>
                </UFieldGroup>
            </div>
        </template>
    </NavigationBar>
</template>
