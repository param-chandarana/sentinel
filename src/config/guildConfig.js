import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const CONFIG_PATH = './data/guildConfigs.json';

// Ensure data directory exists
const ensureDataDir = () => {
  const dir = dirname(CONFIG_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
};

const defaults = {
  blacklistRoleId: null,
  countingChannelId: null,
  windowMs: 10 * 60 * 1000,
  prefix: 's!',
};

const loadConfigs = () => {
  if (!existsSync(CONFIG_PATH)) return {};
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  } catch {
    console.error('Failed to read guild configs, starting fresh.');
    return {};
  }
};

const saveConfigs = (configs) => {
  try {
    ensureDataDir();
    writeFileSync(CONFIG_PATH, JSON.stringify(configs, null, 2));
  } catch (err) {
    console.error('Failed to save guild configs:', err);
  }
};

export const getGuildConfig = (guildId) => {
  const configs = loadConfigs();
  return { ...defaults, ...configs[guildId] };
};

export const setGuildConfig = (guildId, updates) => {
  const configs = loadConfigs();
  configs[guildId] = { ...defaults, ...configs[guildId], ...updates };
  saveConfigs(configs);
  return configs[guildId];
};
