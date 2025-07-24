<script lang="ts" setup>
/**
 * Index page component with fancy animated title
 * Uses Tailwind CSS for styling and transitions
 */
const { t } = useI18n();

// Loading state management
const isLoading = ref(false);

/**
 * Initialize loading delay to give the site time to load
 * Shows loading animation briefly for better UX
 */
onMounted(() => {
    isLoading.value = false;
    // setTimeout(() => {
    //     isLoading.value = false;
    // }, 200);
});
</script>

<template>
    <!-- Loading Animation -->
    <Transition name="loading" mode="out-in">
        <div v-if="isLoading" class="loading-container">
            <div class="loading-spinner">
                <div class="spinner-ring"></div>
                <div class="spinner-ring"></div>
                <div class="spinner-ring"></div>
            </div>
        </div>

        <!-- Main Content -->
        <div v-else class="mb-4">
            <div class="title-container py-6 mb-6 text-center">
                <h1 class="text-4xl font-bold bg-gradient-to-r from-blue-600 to-teal-400 bg-clip-text text-transparent">
                    {{ t('pages.title') }}
                </h1>
            </div>

            <TranslateView />

            <DataBsBanner />
        </div>
    </Transition>
</template>

<style scoped>
.title-container {
    position: relative;
    border-bottom: 2px solid #e5e7eb;
}

.title-container::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 50%;
    transform: translateX(-50%);
    width: 100px;
    height: 2px;
    background: linear-gradient(90deg, #3b82f6, #2dd4bf);
}

/* Loading Animation Styles */
.loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    text-align: center;
}

.loading-spinner {
    position: relative;
    width: 80px;
    height: 80px;
    margin-bottom: 2rem;
}

.spinner-ring {
    position: absolute;
    width: 100%;
    height: 100%;
    border: 4px solid transparent;
    border-radius: 50%;
    animation: spin 2s linear infinite;
}

.spinner-ring:nth-child(1) {
    border-top-color: #3b82f6;
    animation-delay: 0s;
}

.spinner-ring:nth-child(2) {
    border-right-color: #2dd4bf;
    animation-delay: -0.5s;
    width: 70%;
    height: 70%;
    top: 15%;
    left: 15%;
}

.spinner-ring:nth-child(3) {
    border-bottom-color: #8b5cf6;
    animation-delay: -1s;
    width: 40%;
    height: 40%;
    top: 30%;
    left: 30%;
}

.loading-text {
    font-size: 1.125rem;
    color: #6b7280;
    font-weight: 500;
    background: linear-gradient(90deg, #3b82f6, #2dd4bf, #8b5cf6);
    background-size: 200% 200%;
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: gradient-shift 3s ease-in-out infinite;
}

/* Animations */
@keyframes spin {
    0% {
        transform: rotate(0deg);
    }

    100% {
        transform: rotate(360deg);
    }
}

@keyframes gradient-shift {

    0%,
    100% {
        background-position: 0% 50%;
    }

    50% {
        background-position: 100% 50%;
    }
}

/* Transition Animations */
.loading-enter-active,
.loading-leave-active {
    transition: all 0.5s ease-in-out;
}

.loading-enter-from {
    opacity: 0;
    transform: scale(0.9);
}

.loading-leave-to {
    opacity: 0;
    transform: scale(1.1);
}

.loading-enter-to,
.loading-leave-from {
    opacity: 1;
    transform: scale(1);
}
</style>