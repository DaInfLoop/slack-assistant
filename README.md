<a href="https://slackassistant.dino.icu/slack/install"><img alt="Add to Slack" height="40" width="139" src="https://platform.slack-edge.com/img/add_to_slack.png" srcSet="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x" /></a>

# Slack Assistant
Interact with your Home Assistant instance via Slack!

## Usage
### Using the official instance
If you're coming to this repo from the Hack Club Slack, Slack Assistant is already installed onto the workspace.

If you wish to use Slack Assistant from your own workspace, click the "Add to Slack" button above, make sure you're logged into the correct workspace and authorize the app.

Once the app is installed, either visit Slack Assistant's App Home, or open a new Assistant thread with the bot to get started using it.
> [!NOTE]
> 
> There is currently no support for workspace-wide configuration. Each individual user must setup their account by themselves.
### Self-hosting
1. Clone the repo or download it from GitHub.
2. Install dependencies. I use `pnpm` but you can use whatever package manager you want.
3. Create a Slack app with the manifest found in `manifest.yml`. Change the URLs to ones that you control.
> [!IMPORTANT]
> 
> If you're self-hosting on the Hack Club Slack, please change the `/ha-ask` command to have a different name. You'll have to edit the command name in `index.ts` too.
4. Setup your `.env` file:
```ini
NODE_ENV=development / production
PORT=3000

CLIENT_ID=...
CLIENT_SECRET=...
STATE_SECRET=[anything can go here]
SIGNING_SECRET=...

PG_HOST=...
PG_USER=...
PG_DATABASE=...
PG_PASSWORD=... # to use passwordless authentication, remove this line entirely
```
5. Start the bot with `pnpm exec tsx .`! Postgres tables will be created on boot.

## License
This repository was (accidentally) unlicensed during development. It is now under the MIT License (as of `2026-06-06T00:18:00.000Z`)