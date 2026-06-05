import "dotenv/config";

import { App, type ButtonAction, type BlockAction } from '@slack/bolt';
import { setupTables, getUserInfo, setUserInfo } from "./postgres";
import assistant from './assistant';

const USE_SOCKET_MODE = !!process.env.APP_TOKEN && (process.env.NODE_ENV || 'development').toLowerCase() == 'development'

const app = new App({
    signingSecret: process.env.SIGNING_SECRET,
    token: process.env.BOT_TOKEN,

    socketMode: USE_SOCKET_MODE,
    appToken: USE_SOCKET_MODE 
        ? process.env.APP_TOKEN
        : undefined
});

app.assistant(assistant);

async function renderAppHome(userId: string) {
    const userInfo = await getUserInfo(userId);

    if (userInfo === null) {
        await app.client.views.publish({
            user_id: userId,
            view: {
                type: 'home',
                blocks: [
                    {
                        type: 'header',
                        text: {
                            type: 'plain_text',
                            text: ':slack-assistant: Slack Assistant',
                            emoji: true
                        }
                    },
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: ":warning: *You haven't set up Slack Assistant yet.* Click the button below to get started:"
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
            }
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
        await app.client.views.publish({
            user_id: userId,
            view: {
                type: 'home',
                blocks: [
                    {
                        type: 'header',
                        text: {
                            type: 'plain_text',
                            text: ':slack-assistant: Slack Assistant',
                            emoji: true
                        }
                    },
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
            }
        })
        return;
    }

    await app.client.views.publish({
        user_id: userId,
        view: {
            type: 'home',
            blocks: [
                {
                    type: 'header',
                    text: {
                        type: 'plain_text',
                        text: ':slack-assistant: Slack Assistant',
                        emoji: true
                    }
                },
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: ":white_check_mark: Your Home Assistant configuration is okay! Start messaging or use `/ha-ask` to talk to your Home Assistant!"
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
        }
    })
}

app.event("app_home_opened", async (ctx) => {
    if (ctx.payload.tab !== "home") return;

    await renderAppHome(ctx.payload.user)
})

app.action<BlockAction<ButtonAction>>('settings', async (ctx) => {
    const userInfo = await (async () => {
        const ui = await getUserInfo(ctx.body.user.id);

        if (ui) return ui;

        else return {
            llac: "",
            instanceUri: ""
        }
    })();

    await ctx.ack();

    await ctx.client.views.open({
        trigger_id: ctx.body.trigger_id,
        view: {
            type: 'modal',
            callback_id: 'settings',
            title: {
                type: 'plain_text',
                text: 'Settings'
            },
            submit: {
                type: 'plain_text',
                text: 'Update'
            },
            close: {
                type: 'plain_text',
                text: 'Cancel'
            },
            blocks: [
                {
                    type: 'alert',
                    level: 'info',
                    text: {
                        type: 'mrkdwn',
                        text: 'You need to have your Home Assistant avaliable at a public URL. You can do this with something like <https://tailscale.com/docs/features/tailscale-funnel|Tailscale Funnels>.'
                    }
                },
                {
                    type: 'input',
                    block_id: 'instanceUri',
                    element: {
                        type: 'url_text_input',
                        action_id: 'instanceUri',
                        placeholder: {
                            type: 'plain_text',
                            text: 'https://home.example.com/'
                        },
                        initial_value: userInfo.instanceUri || undefined
                    },
                    label: {
                        type: 'plain_text',
                        text: 'Public URL'
                    }
                },
                {
                    type: 'alert',
                    level: 'info',
                    text: {
                        type: 'mrkdwn',
                        text: 'You can generate a long-lived access token in your <https://my.home-assistant.io/redirect/profile_security|profile security> settings.'
                    }
                },
                {
                    type: 'input',
                    block_id: 'llac',
                    element: {
                        type: 'plain_text_input',
                        action_id: 'llac',
                        placeholder: {
                            type: 'plain_text',
                            text: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                        },
                        initial_value: userInfo.llac || undefined
                    },
                    label: {
                        type: 'plain_text',
                        text: 'Long-lived access token'
                    }
                }                
            ]
        }
    })
})

app.view('settings', async (ctx) => {
    const inputs = {
        instanceUri: ctx.body.view.state.values['instanceUri']!['instanceUri']!.value!,
        llac: ctx.body.view.state.values['llac']!['llac']!.value!
    };

    try {
        const res = await fetch(new URL('/api/config', inputs.instanceUri), {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                Authorization: `Bearer ${inputs.llac}`
            }
        });
    
        if (!res.ok) {
            return await ctx.ack({
                response_action: 'errors',
                errors: {
                    llac: 'Your long-lived access token isn\'t correct.'
                }
            });
        }
    } catch (err) {
        return await ctx.ack({
            response_action: 'errors',
            errors: {
                instanceUri: 'Could not connect to this URL. Is Home Assistant exposed to the web correctly?'
            }
        });
    }

    await ctx.ack({
        response_action: 'clear'
    });

    await setUserInfo(ctx.body.user.id, inputs);
    await renderAppHome(ctx.body.user.id);
})

app.event("app_mention", async (ctx) => {
    const res = await ctx.client.conversations.info({ channel: ctx.payload.channel });

    if (!res.ok) return;

    const channel = res.channel!;

    if (!channel.is_im) {
        await ctx.client.chat.postEphemeral({
            channel: ctx.payload.channel,
            user: ctx.payload.user!,
            text: `:wave: Just so you know <@${ctx.payload.user}>, I don't work outside of your DMs or your Assistant sidebar.`,
            thread_ts: ctx.payload.thread_ts ?? undefined
        })
    }
})

app.start(process.env.PORT ?? 3000).then(() => {
    console.log(`⚡ Bolt app is running in ${process.env.NODE_ENV} mode!`);
    setupTables()
})
