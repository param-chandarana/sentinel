// Config commands
import { config } from './config/config.js';

// Counting commands
import { blacklist } from './counting/blacklist.js';
import { unblacklist } from './counting/unblacklist.js';

// Utils commands
import { random } from './utils/random.js';

const commands = [config, random, blacklist, unblacklist];

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
