import { createSnapshot } from "../src/snapshot";
import { listSnapshots, SnapshotInfo } from "../src/list";
import { initializeDatabase, closeDatabase, getDatabase } from "../src/db";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { Pool } from "pg";
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from "@jest/globals";
describe("List Snapshots", () => {
  const testDir = join(__dirname, "test-files");
  let db: Pool;

  beforeAll(() => {
    mkdirSync(testDir, { recursive: true });
    writeFileSync(join(testDir, "file1.txt"), "test content 1");
    db = getDatabase();
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
    closeDatabase();
  });

  it("should list snapshots in order", async () => {
    // Create test snapshots
    const {
      rows: [snapshot1],
    } = await db.query(
      "INSERT INTO snapshots (name) VALUES ($1) RETURNING id",
      ["test1"]
    );

    const {
      rows: [snapshot2],
    } = await db.query(
      "INSERT INTO snapshots (name) VALUES ($1) RETURNING id",
      ["test2"]
    );

    const snapshots = await listSnapshots();

    expect(snapshots.length).toBe(2);
    expect(snapshots[0]).toMatchObject({
      id: snapshot2.id,
      name: "test2",
    });
    expect(snapshots[1]).toMatchObject({
      id: snapshot1.id,
      name: "test1",
    });
  });

  afterEach(async () => {
    // Clean up test data
    await db.query("DELETE FROM snapshots");
  });
});
