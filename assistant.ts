import { Assistant, type AssistantConfig } from "@slack/bolt";
import { getUserInfo } from "./postgres";

const config: AssistantConfig = {
    async threadStarted(ctx) {
        const { assistant_thread } = ctx.event;

        const userInfo = await getUserInfo(assistant_thread.user_id);

        if (userInfo === null) {
            ctx.say({
                text: ":warning: You haven't setup Slack Assistant yet. Visit the App Home to start using the bot!",
                blocks: [
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: ":warning: You haven't setup Slack Assistant yet. Visit the App Home to start using the bot!",
                        }
                    },
                    {
                        type: 'actions',
                        elements: [
                            {
                                type: 'button',
                                action_id: 'noop-apphome',
                                text: {
                                    type: 'plain_text',
                                    text: 'Visit App Home'
                                },
                                url: `https://slack.com/app_redirect?app=${ctx.body.api_app_id}&team=${ctx.body.team_id}`
                            }
                        ]
                    }
                ]
            })
            return;
        }

        const res = await fetch(new URL("/api/config", userInfo.instanceUri), {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': 'Bearer ' + userInfo.llac
            }
        });

        if (!res.ok) {
            ctx.say({
                text: ":warning: Your Home Assistant long-lived access token is invalid. Visit the App Home to add a new one.",
                blocks: [
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: ":warning: Your Home Assistant long-lived access token is invalid. Visit the App Home to add a new one.",
                        }
                    },
                    {
                        type: 'actions',
                        elements: [
                            {
                                type: 'button',
                                action_id: 'noop-apphome',
                                text: {
                                    type: 'plain_text',
                                    text: 'Visit App Home'
                                },
                                url: `https://slack.com/app_redirect?app=${ctx.body.api_app_id}`
                            }
                        ]
                    }
                ]
            })
            return;
        }

        await ctx.say("Hiya! Start messaging me to talk to Home Assistant!")
    },

    async userMessage(ctx) {
        
    }
}

export default new Assistant(config);