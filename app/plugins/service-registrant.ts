import { TranslationService } from "~/services/tanslationService";

export default defineNuxtPlugin((nuxtApp) => {
    const orchestrator = new ServiceOrchestrator();

    // the setup will be lazily called the first time a
    // service is resolved, ensuring services are created
    // in the Vue component lifecycle or setup context.
    orchestrator.setup((builder) => {
        const logger = useLogger();
        const { t } = useI18n(); // this needs to be created in the setup context

        builder.registerInstance("translate", t);
        builder.registerInstance("logger", logger);

        builder.register(TranslationService);
    });

    nuxtApp.provide("serviceOrchestrator", orchestrator);
});
