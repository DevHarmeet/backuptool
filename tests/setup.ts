import { getConfig } from "../src/config";
import { join } from "path";
import { mkdirSync } from "fs";
import { initializeDatabase, closeDatabase, cleanDatabase } from "../src/db";
import { beforeAll, afterAll, beforeEach, jest } from "@jest/globals";

jest.mock("../src/config", () => ({
  getConfig: () => ({
    configDir: join(__dirname, "../.test-data"),
    databasePath: join(__dirname, "../.test-data/test.db"),
  }),
}));

const config = getConfig();
mkdirSync(config.configDir, { recursive: true });

let initialized = false;

beforeAll(async () => {
  if (!initialized) {
    await initializeDatabase();
    initialized = true;
  }
}, 30000);

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  if (initialized) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    await closeDatabase();
    initialized = false;
  }
}, 30000);
