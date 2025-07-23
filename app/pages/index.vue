<script lang="ts" setup>
/**
 * Index page component with fancy animated title
 * Uses Tailwind CSS for styling and transitions
 */
const { t } = useI18n();
</script>

<template>
  <div class="mb-4">
    <div class="title-container py-6 mb-6 text-center">
      <h1 class="text-4xl font-bold bg-gradient-to-r from-blue-600 to-teal-400 bg-clip-text text-transparent">
        {{ t('pages.title') }}
      </h1>
    </div>

    <TranslateView />

    <DataBsBanner />
  </div>
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
</style>