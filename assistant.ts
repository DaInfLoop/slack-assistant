import { Assistant, type AssistantConfig } from "@slack/bolt";

const config: AssistantConfig = {
    async threadStarted(ctx) {
        
    },

    async userMessage(ctx) {
        
    }
}

export default new Assistant(config);