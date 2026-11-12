# VoiceNotifier

An [Equicord](https://github.com/Equicord/Equicord) user plugin that notifies you when specific users join a voice channel in any server you share with them.

## Features

- Right click a user and pick **Add Voice Ping** to start tracking them (**Remove Voice Ping** to stop).
- When a tracked user joins a voice channel you get a notification with their avatar, the channel and the server, plus the Discord ping sound.
- Clicking the notification takes you to the channel without joining it.
- Manage the list from the plugin settings: every entry shows avatar, username and ID, and you can add users by pasting their ID.

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| Notify on move | On | Also notify when a tracked user switches from one voice channel to another. |
| Play sound | On | Play the ping sound together with the notification. |

Notifications use Equicord's notification system. By default they show in the bottom right of Discord while it's focused and as native system notifications otherwise. You can change this under **Equicord Settings → Notifications**.

## Installation

1. Set up an Equicord devbuild by following the [official instructions](https://github.com/Equicord/Equicord#installing-equicord-devbuild).
2. Clone this repo into the user plugins folder:
   ```sh
   cd Equicord/src/userplugins
   git clone <repo-url> voiceNotifier
   ```
3. Build and inject:
   ```sh
   pnpm build
   pnpm inject
   ```
4. Restart Discord and enable **VoiceNotifier** in the plugins list.

## License

GPL-3.0-or-later
