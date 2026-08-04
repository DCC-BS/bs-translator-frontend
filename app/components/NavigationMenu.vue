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
const onlineFetchFunction = config.public.useDummyData
    ? async () => true
    : undefined;
</script>

<template>
    <NavigationBar data-tour="main-content">
        <template #rightPostItems>
            <OnlineStatus :isOnlineCheckFunction="onlineFetchFunction" />
            <ULink v-if="props.inConversation" to="/">
                <UButton variant="ghost" color="neutral" icon="i-lucide-home">
                    <div class="hidden md:inline">Home</div>
                </UButton>
            </ULink>
            <ULink v-else to="/conversation">
                <UButton data-tour="conversation-mode" variant="subtle" color="primary"
                    icon="i-lucide-message-circle-more">
                    <div class="hidden md:inline">{{ t("navigation.conversation-mode") }}</div>
                </UButton>
            </ULink>
        </template>
    </NavigationBar>
</template>
