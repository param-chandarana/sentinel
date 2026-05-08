// Config commands
import { config } from './config/config.js';

// Moderation commands
import { countingBlacklist } from './moderation/countingBlacklist.js';
import { countingUnblacklist } from './moderation/countingUnblacklist.js';

// Utils commands
import { ping } from './utils/ping.js';
import { random } from './utils/random.js';

const commands = [config, random, ping, countingBlacklist, countingUnblacklist];

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
