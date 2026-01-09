<template>
    <Changelogs />
    <Onboarding />
    <Disclaimer app-name="BS Übersetzer" />
    <UApp>
        <NavigationMenu />
        <div class="h-[600px] md:h-[calc(100vh-100px)] flex flex-col">
            <div class="grow">
                <slot />
            </div>
            <!-- Footer section with branding and feedback -->
            <div class="flex items-center justify-between px-2 py-1">
                <DataBsFooter />
                <FeedbackControl inline />
            </div>
        </div>

    </UApp>
</template>
