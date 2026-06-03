<script setup lang="ts">
import { motion } from "motion-v";
</script>

<template>
    <motion.div class="h-full" :initial="{ opacity: 0, y: 20 }"
        :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, ease: 'easeInOut' }">
        <TranslateView />
    </motion.div>
</template>