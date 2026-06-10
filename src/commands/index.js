// Config commands
import { config } from './config/config.js';

// Moderation commands
import { ban } from './moderation/ban.js';
import { countingBlacklist } from './moderation/countingBlacklist.js';
import { countingUnblacklist } from './moderation/countingUnblacklist.js';
import { infraction } from './moderation/infraction.js';
import { kick } from './moderation/kick.js';
import { massban } from './moderation/massban.js';
import { mute } from './moderation/mute.js';
import { tempban } from './moderation/tempban.js';
import { tempmute } from './moderation/tempmute.js';
import { unban } from './moderation/unban.js';
import { unmute } from './moderation/unmute.js';
import { warn } from './moderation/warn.js';

// Utils commands
import { ping } from './utils/ping.js';
import { random } from './utils/random.js';

const commands = [
  config,
  random,
  ping,
  countingBlacklist,
  countingUnblacklist,
  warn,
  ban,
  tempban,
  unban,
  kick,
  massban,
  infraction,
  mute,
  tempmute,
  unmute,
];

export const commandRegistry = new Map();

for (const cmd of commands) {
  commandRegistry.set(cmd.name.toLowerCase(), cmd);
  // Register aliases (e.g. strike -> warn)
  if (cmd.aliases) {
    for (const alias of cmd.aliases) {
      commandRegistry.set(alias.toLowerCase(), cmd);
    }
  }
}
