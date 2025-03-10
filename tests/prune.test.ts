import { Pool } from "pg";
import { createSnapshot } from "../src/snapshot";
import { pruneSnapshot, getSnapshotStats } from "../src/prune";
import { getDatabase } from "../src/db";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { describe, it, expect, beforeEach, afterAll } from "@jest/globals";

describe("Prune", () => {
  let db: Pool;
  const testDir = join(__dirname, "test-files");
  let snapshotId: number;

  beforeEach(async () => {
    db = getDatabase();
    // Create test directory and files
    mkdirSync(testDir, { recursive: true });
    writeFileSync(join(testDir, "file1.txt"), "test content 1");
    writeFileSync(join(testDir, "file2.txt"), "test content 2");

    snapshotId = await createSnapshot(testDir);
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("should remove snapshot and its file mappings", async () => {
    await pruneSnapshot(snapshotId);

    const snapshotResult = await db.query(
      "SELECT * FROM snapshots WHERE id = $1",
      [snapshotId]
    );
    const mappingsResult = await db.query(
      "SELECT * FROM snapshot_files WHERE snapshot_id = $1",
      [snapshotId]
    );

    expect(snapshotResult.rows.length).toBe(0);
    expect(mappingsResult.rows.length).toBe(0);
  });

  it("should throw error for non-existent snapshot", async () => {
    await expect(pruneSnapshot(999)).rejects.toThrow("Snapshot 999 not found");
  });

  it("should remove orphaned files", async () => {
    // Create another snapshot with a unique file
    writeFileSync(join(testDir, "file3.txt"), "test content 3");
    const secondSnapshotId = await createSnapshot(testDir);

    // Prune first snapshot
    await pruneSnapshot(snapshotId);

    // Check files after first prune
    const filesResult = await db.query("SELECT COUNT(*) as count FROM files");
    expect(parseInt(filesResult.rows[0].count)).toBe(3);

    // Prune second snapshot
    await pruneSnapshot(secondSnapshotId);

    // Check files after second prune
    const finalFilesResult = await db.query(
      "SELECT COUNT(*) as count FROM files"
    );
    expect(parseInt(finalFilesResult.rows[0].count)).toBe(0);
  });

  it("should keep shared files when pruning", async () => {
    // Create second snapshot with same files
    const secondSnapshotId = await createSnapshot(testDir);

    // Prune first snapshot
    await pruneSnapshot(snapshotId);

    // Check files are still present
    const filesResult = await db.query("SELECT COUNT(*) as count FROM files");
    expect(parseInt(filesResult.rows[0].count)).toBe(3);

    // Clean up second snapshot
    await pruneSnapshot(secondSnapshotId);

    // Verify all files are gone
    const finalFilesResult = await db.query(
      "SELECT COUNT(*) as count FROM files"
    );
    expect(parseInt(finalFilesResult.rows[0].count)).toBe(0);
  });

  it("should return correct snapshot stats", async () => {
    const stats = await getSnapshotStats(snapshotId);

    expect({
      fileCount: parseInt(stats.fileCount as any),
      totalSize: parseInt(stats.totalSize as any),
    }).toEqual({
      fileCount: 3,
      totalSize: 42,
    });
  });
});
