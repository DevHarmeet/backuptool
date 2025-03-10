import { Pool } from "pg";
import { createSnapshot } from "../src/snapshot";
import { restoreSnapshot } from "../src/restore";
import { getDatabase } from "../src/db";
import { mkdirSync, writeFileSync, readFileSync, rmSync } from "fs";
import { join } from "path";
import { describe, it, expect, beforeEach, afterAll } from "@jest/globals";

describe("Restore", () => {
  let db: Pool;
  const testDir = join(__dirname, "test-files");
  const restoreDir = join(__dirname, "restored-files");
  let snapshotId: number;

  beforeEach(async () => {
    db = getDatabase();
    // Create test directory and files
    mkdirSync(testDir, { recursive: true });
    mkdirSync(restoreDir, { recursive: true });
    writeFileSync(join(testDir, "file1.txt"), "test content 1");
    writeFileSync(join(testDir, "file2.txt"), "test content 2");

    snapshotId = await createSnapshot(testDir);
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
    rmSync(restoreDir, { recursive: true, force: true });
  });

  it("should restore all files with correct content", async () => {
    await restoreSnapshot(snapshotId, restoreDir);

    expect(readFileSync(join(restoreDir, "file1.txt"), "utf8")).toBe(
      "test content 1"
    );
    expect(readFileSync(join(restoreDir, "file2.txt"), "utf8")).toBe(
      "test content 2"
    );
  });

  it("should throw error for non-existent snapshot", async () => {
    await expect(restoreSnapshot(999, restoreDir)).rejects.toThrow(
      "Snapshot 999 not found"
    );
  });

  it("should restore files with correct directory structure", async () => {
    const nestedDir = join(testDir, "nested");
    mkdirSync(nestedDir, { recursive: true });
    writeFileSync(join(nestedDir, "nested.txt"), "nested content");

    snapshotId = await createSnapshot(testDir);
    await restoreSnapshot(snapshotId, restoreDir);

    expect(readFileSync(join(restoreDir, "nested/nested.txt"), "utf8")).toBe(
      "nested content"
    );
  });

  it("should handle empty directories", async () => {
    const emptyDir = join(testDir, "empty");
    mkdirSync(emptyDir, { recursive: true });

    snapshotId = await createSnapshot(testDir);
    await restoreSnapshot(snapshotId, restoreDir);

    expect(readFileSync(join(restoreDir, "file1.txt"), "utf8")).toBe(
      "test content 1"
    );
  });
});
