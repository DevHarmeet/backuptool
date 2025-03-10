import type { Config } from "@jest/types";

const config: Config.InitialOptions = {
  preset: "ts-jest",
  testEnvironment: "node",
  testTimeout: 10000,
  maxWorkers: 1,
  verbose: true,
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
};

export default config;
