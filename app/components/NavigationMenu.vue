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
    <NavigationBar :other-apps="apps" data-tour="main-content">
        <template #center>
            <div class="flex justify-center">
                <UButton v-if="props.inConversation" to="/" variant="ghost" color="neutral" icon="i-lucide-home"
                    aria-label="Home" class="max-md:p-1.5">
                    <div class="hidden md:inline">Home</div>
                </UButton>
                <UButton v-else to="/conversation" data-tour="conversation-mode" variant="subtle" color="primary"
                    icon="i-lucide-message-circle-more" :aria-label="t('navigation.conversation-mode')"
                    class="max-md:p-1.5">
                    <div class="hidden md:inline">{{ t("navigation.conversation-mode") }}</div>
                </UButton>
            </div>
        </template>
    </NavigationBar>
</template>
