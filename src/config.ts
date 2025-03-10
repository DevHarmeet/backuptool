import { existsSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export interface Config {
  databasePath: string;
  configDir: string;
}

export function getConfig(): Config {
  // Use ~/.backuptool as the default config directory
  const configDir = join(homedir(), ".backuptool");

  // Create config directory if it doesn't exist
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  return {
    configDir,
    databasePath: join(configDir, "backup.db"),
  };
}
