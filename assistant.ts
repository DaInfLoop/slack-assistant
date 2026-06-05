import { Assistant, type AssistantConfig, type KnownEventFromType } from "@slack/bolt";
import { getThreadMapping, getUserInfo, setThreadMapping } from "./postgres";

export async function askHomeAssistant(
    userInfo: NonNullable<Awaited<ReturnType<typeof getUserInfo>>>,
    text: string,
    conversationId?: string
): Promise<{
    conversation_id: string,
    response: {
        response_type: 'action_done' | 'query_answer' | 'done',
        data: any, // not necessarily needed
        language: string,
        speech: {
            plain: {
                speech: string
            },
            ssml: undefined
        } | {
            plain: undefined
            ssml: {
                speech: string
            }
        }
    }
} | "http_error"> {
    try {
        const res = await fetch(new URL("/api/conversation/process", userInfo.instanceUri), {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + userInfo.llac
            },
            body: JSON.stringify({
                text,
                conversation_id: conversationId
            })
        });

        if (res.ok) {
            return await res.json();
        } else {
            return "http_error"
        }
    } catch (err) {
        return "http_error"
    }
}

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
        // Let's just assume there's no special message subtype
        const message = ctx.message as KnownEventFromType<"message"> & { subtype: undefined };

        const userInfo = await getUserInfo(message.user);

        if (!userInfo) return;

        const text = message.text?.trim();

        if (!text) {
            ctx.say("Hmm, I can't process that since there's no text in your message.")
            return;
        }

        const conversationId = await getThreadMapping(message.thread_ts!) ?? undefined;

        await ctx.setStatus({
            status: 'thinking...'
        })

        const res = await askHomeAssistant(userInfo, text, conversationId);

        if (res === "http_error") {
            await ctx.say("Something went wrong.")
        } else {
            const response = res.response.speech.plain || res.response.speech.ssml;

            await ctx.say(response.speech);
            
            if (!conversationId) await setThreadMapping(message.thread_ts!, res.conversation_id);
        }
    }
}

export default new Assistant(config);