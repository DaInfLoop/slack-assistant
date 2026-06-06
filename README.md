# Slack Assistant
Interact with your Home Assistant instance via Slack!

## Usage
### Self-hosting
1. Clone the repo or download it from GitHub.
2. Install dependencies. I use `pnpm` but you can use whatever package manager you want.
3. Create a Slack app with the manifest found in `manifest.yml`.
> [!IMPORTANT]
> 
> If you're self-hosting on the Hack Club slack, please change the `/ha-ask` command to have a different name. You'll have to edit that in `index.ts` too.
4. Setup your `.env` file:
```ini
NODE_ENV=development
PORT=3000

BOT_TOKEN=xoxb-...
APP_TOKEN=xapp-1-...
SIGNING_SECRET=...

PG_HOST=...
PG_USER=...
PG_DATABASE=...
PG_PASSWORD=...
```
5. Start the bot with `pnpm exec tsx .`! Postgres tables will be created on boot.

## License
This repository was (accidentally) unlicensed during development. It is now under the MIT License (as of `2026-06-06T00:18:00.000Z`)