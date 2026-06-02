import "dotenv/config";

import { App } from '@slack/bolt';
import { setupTables } from "./postgres";
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

app.event("app_home_opened", async (ctx) => {
    if (ctx.payload.tab !== "home") return;

    // TODO: render different App Home depending on link
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