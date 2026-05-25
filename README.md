# PedChicken

A Discord and RaceTime.gg bot for rolling [ALTTPR](https://alttpr.com) seeds via [avianart.games](https://avianart.games). Supports user-created presets, race seed generation, bingo room creation, and ladder verification.

---

## Overview

PedChicken connects to Discord and RaceTime.gg simultaneously. In Discord it exposes slash commands for seed generation and preset management. In RaceTime race rooms it listens for chat commands and posts seed links directly into the room info.

---

## Setup

### Prerequisites

- [Bun](https://bun.sh) runtime
- A Discord bot token with the following intents: `Guilds`, `DirectMessages`, `GuildMessages`, `MessageContent`, `GuildWebhooks`, `GuildMembers`
- An avianart.games API key
- A RaceTime.gg OAuth2 client ID and secret

### Configuration

Create a `config.json` in the project root (this file is not committed to the repository):

```json
{
  "discord": {
    "token": "YOUR_DISCORD_BOT_TOKEN",
    "debug": {
      "guild": "GUILD_ID_FOR_LOG_CHANNEL",
      "channel": "CHANNEL_ID_FOR_LOGS",
      "roles": ["ROLE_ID_TO_PING_ON_ERRORS"],
      "enabled": true
    }
  },
  "avianart": {
    "api": {
      "url": "https://avianart.games/api",
      "key": "YOUR_AVIANART_API_KEY"
    },
    "newapi": {
      "url": "https://avianart.games/newapi",
      "key": "YOUR_AVIANART_NEWAPI_KEY"
    }
  },
  "racetime": {
    "clientId": "YOUR_RACETIME_CLIENT_ID",
    "clientSecret": "YOUR_RACETIME_CLIENT_SECRET",
    "clientCategory": "alttpr"
  },
  "spambots": {
    "guilds": [
      {
        "id": "GUILD_ID",
        "roles": ["SUSPICIOUS_ROLE_ID"],
        "logChannel": "LOG_CHANNEL_ID"
      }
    ]
  }
}
```

### Running

```bash
# Install dependencies
bun install

# Build and start
bun run start

# Development mode with auto-reload
bun run debug
```

The uptime monitor HTTP server starts on port **8008**.

---

## Discord Commands

### `/generate`

Generates an ALTTPR seed using a named preset.

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `preset` | string | Yes | The preset to use. Use `preset` for the avianart namespace or `namespace/preset` for user presets. |
| `race` | boolean | No | Whether to generate a race seed (default: `true`). Race seeds hide the spoiler log. |

**Examples:**
```
/generate preset:crosshunt
/generate preset:avianart/trinity race:true
/generate preset:myusername/mypreset race:false
```

The bot replies with a rich embed showing the seed's permalink, generation settings, goal, gameplay flags, difficulty, and file select hash.

---

### `/create`

Creates a new preset in your personal namespace from a YAML file. Your namespace is your Discord username (lowercased). After creation the preset can be rolled with `/generate preset:yourusername/presetname`.

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `yaml` | attachment | Yes | A DR or OWR compatible YAML file. |
| `name` | string | Yes | The slug name for the preset. Do **not** include your namespace here. |
| `notes` | string | No | A short description of the preset (defaults to `A preset by <username>`). |
| `branch` | string | No | The randomizer branch to use (defaults to `DRUnstable`). |

**Branch choices:**

| Value | Branch |
|-------|--------|
| `DRUnstable` | [Door Randomizer Unstable](https://github.com/aerinon/ALttPDoorRandomizer/tree/DoorDevUnstable) (default) |
| `OWR` | Overworld Randomizer |
| `Troll` | Karafruit OWR |

The reply is ephemeral (only visible to you). On success it confirms the preset name and the `/generate` command to use it.

---

### `/list`

Lists all presets in your namespace. The response is ephemeral (only visible to you).

Each preset is shown as `slug: name`.

---

### `/bingo`

Creates a new [BingoSync](https://bingosync.com) room using the ALTTPR bingo goal list.

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `name` | string | Yes | The display name for the bingo room. |
| `category` | string | No | Category label for the room (currently unused in room logic). |

The bot generates a randomized bingo board from the configured goal groups and posts the room URL, passphrase, and category in an embed.

---

### `/ladder_verify`

Checks a player's participation count on the [ALTTPR Ladder](https://alttprladder.com) over the past 365 days. Queries both the live ladder and the archive.

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `user` | string | Yes | The Discord username of the player to look up. |

---

## RaceTime Commands

PedChicken automatically joins open and invitational races in the configured category and listens for the following chat commands.

### `!avianart`

Displays an interactive seed-rolling panel with dropdown menus for preset and logic selection.

**Available presets in the panel:**

| Key | Name |
|-----|------|
| `tph2023` | True Pot Hunt |
| `invc2023` | Invertacrismiser |
| `mmmmavid23` | MMMM (NotSlow) |
| `pab` | Pots and Bones |
| `trinity` | Trinity |
| `crosshunt` | Crosshunt (Main Tournament) |

**Logic options:**

| Value | Description |
|-------|-------------|
| *(empty)* | No Major Glitches |
| `hmg` | Hybrid Major Glitches |
| `owg` | Overworld Glitches |
| `nl` | No Logic |

---

### `!avianroll <preset>`

Rolls a seed immediately using the specified preset and posts the permalink to chat. Also sets the race room info field to the preset name and file select hash.

```
!avianroll crosshunt
!avianroll myusername/mypreset
```

Use `namespace/preset` format to roll a user preset.

---

### `!turnier`

Rolls a tournament seed using the `avianart/lightspeed` preset and posts the result.

---

## Creating Presets

Presets are YAML files compatible with the Door Randomizer or Overworld Randomizer. To create one:

1. Author a YAML file using the DR/OWR YAML format.
2. In Discord, run `/create yaml:<attach your file> name:<preset-slug>`.
3. Optionally provide `notes` (description) and `branch` (randomizer branch).
4. Once created, roll it with `/generate preset:yourusername/preset-slug`.

**Rules:**
- The `name` field must not contain a `/`. The namespace is always your Discord username.
- Preset names are stored lowercased.
- Names may optionally be encoded in the YAML itself via the `seed_name` field; notes via `user_notes`.

---

## Uptime Monitor

A lightweight HTTP server runs on port **8008** and exposes the following endpoints for uptime monitoring services:

| Endpoint | Description |
|----------|-------------|
| `GET /ping` | Always returns `200 {"reply":"pong"}` if the process is running. |
| `GET /racetime` | Returns `200` if the RaceTime.gg API is reachable, `502` otherwise. |
| `GET /discord` | Returns `200` if the Discord connection is healthy, `502` otherwise. |

All other paths return `403`.

---

## Spambot Detection

PedChicken monitors guild member updates. If a new member (joined within the last minute) acquires all of a configured set of flagged roles, they are automatically banned and a log message is posted to the configured channel.

Spambot rules are configured per-guild in `config.json` under `spambots.guilds`.

---

## License

MIT
