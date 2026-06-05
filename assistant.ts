import { Assistant, type AssistantConfig } from "@slack/bolt";
import { getUserInfo } from "./postgres";

const config: AssistantConfig = {
    async threadStarted(ctx) {
        const { assistant_thread } = ctx.event;

        const userInfo = await getUserInfo(assistant_thread.user_id);

        if (userInfo === null) {
            ctx.say({
                text: ":warning: You haven't setup Slack Assistant yet. Click the button below to get started:",
                blocks: [
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: ":warning: You haven't set up Slack Assistant yet. Click the button below to get started:"
                        }
                    },
                    {
                        type: 'actions',
                        elements: [
                            {
                                type: 'button',
                                action_id: 'settings',
                                style: 'primary',
                                text: {
                                    type: 'plain_text',
                                    text: 'Get started'
                                }
                            }
                        ]
                    }
                ]
            })
            return;
        }

        try {
            const res = await fetch(new URL("/api/config", userInfo.instanceUri), {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': 'Bearer ' + userInfo.llac
                }
            });

            if (!res.ok) {
                ctx.say({
                    text: ":warning: Your Home Assistant long-lived access token is invalid. Click the button below to add a new one:",
                    blocks: [
                        {
                            type: 'section',
                            text: {
                                type: 'mrkdwn',
                                text: ":warning: Your Home Assistant long-lived access token is invalid. Click the button below to add a new one:"
                            }
                        },
                        {
                            type: 'actions',
                            elements: [
                                {
                                    type: 'button',
                                    action_id: 'settings',
                                    text: {
                                        type: 'plain_text',
                                        text: 'Settings'
                                    }
                                }
                            ]
                        }
                    ]
                })
                return;
            }
        } catch (err) {
            ctx.say({
                text: ":warning: Something went wrong trying to contact your Home Assistant. Check your settings.",
                blocks: [
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: ":warning: Something went wrong trying to contact your Home Assistant. Check your settings."
                        }
                    },
                    {
                        type: 'actions',
                        elements: [
                            {
                                type: 'button',
                                action_id: 'settings',
                                text: {
                                    type: 'plain_text',
                                    text: 'Settings'
                                }
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