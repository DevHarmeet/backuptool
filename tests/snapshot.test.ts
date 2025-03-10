import { Pool } from "pg";
import { getDatabase } from "../src/db";
import { createSnapshot } from "../src/snapshot";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { describe, it, expect, beforeEach, afterAll } from "@jest/globals";

describe("Snapshot", () => {
  let db: Pool;
  const testDir = join(__dirname, "test-files");
  const file1 = join(testDir, "file1.txt");
  const file2 = join(testDir, "file2.txt");

  beforeEach(async () => {
    db = getDatabase();
    // Create test directory and files
    mkdirSync(testDir, { recursive: true });
    writeFileSync(file1, "test content 1");
    writeFileSync(file2, "test content 2");

    // Clean up any existing test data
    await db.query("DELETE FROM snapshot_files");
    await db.query("DELETE FROM snapshots");
    await db.query("DELETE FROM files");
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("should create snapshot with files", async () => {
    const snapshotId = await createSnapshot(testDir);

    // Check snapshot was created
    const snapshotResult = await db.query(
      "SELECT * FROM snapshots WHERE id = $1",
      [snapshotId]
    );
    expect(snapshotResult.rows.length).toBe(1);

    // Check files were stored
    const filesResult = await db.query("SELECT COUNT(*) as count FROM files");
    expect(parseInt(filesResult.rows[0].count)).toBe(2);

    // Check snapshot_files entries
    const snapshotFilesResult = await db.query(
      "SELECT * FROM snapshot_files WHERE snapshot_id = $1",
      [snapshotId]
    );
    expect(snapshotFilesResult.rows.length).toBe(2);
  });

  it("should reuse existing file hashes", async () => {
    // Create first snapshot
    await createSnapshot(testDir);

    // Create second snapshot of same files
    await createSnapshot(testDir);

    // Should only have 2 files stored (no duplicates)
    const result = await db.query("SELECT COUNT(*) as count FROM files");
    expect(parseInt(result.rows[0].count)).toBe(2);
  });

  it("should handle empty directories", async () => {
    mkdirSync(join(testDir, "empty-dir"), { recursive: true });

    const snapshotId = await createSnapshot(testDir);

    const result = await db.query(
      "SELECT * FROM snapshot_files WHERE snapshot_id = $1",
      [snapshotId]
    );
    expect(result.rows.length).toBe(2); // Only the text files
  });
});
