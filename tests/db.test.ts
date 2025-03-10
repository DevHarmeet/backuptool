import { Pool } from "pg";
import { initializeDatabase, getDatabase, closeDatabase } from "../src/db";
import { getConfig } from "../src/config";
import { unlinkSync } from "fs";
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  test,
} from "@jest/globals";
describe("Database", () => {
  let db: Pool;

  beforeAll(async () => {
    await initializeDatabase();
    db = getDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("should connect to the database", async () => {
    const result = await db.query("SELECT 1 as number");
    expect(result.rows[0].number).toBe(1);
  });

  it("should create tables", async () => {
    const result = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

    const tableNames = result.rows.map((row) => row.table_name);
    expect(tableNames).toContain("snapshots");
    expect(tableNames).toContain("files");
    expect(tableNames).toContain("snapshot_files");
  });

  it("should handle invalid queries", async () => {
    await expect(db.query("INVALID SQL QUERY")).rejects.toThrow();
  });

  beforeEach(() => {
    // Clean up any existing test database
    try {
      unlinkSync(getConfig().databasePath);
    } catch (error) {
      // Ignore if file doesn't exist
    }
  });

  test("should maintain single database instance", () => {
    const db1 = getDatabase();
    const db2 = getDatabase();
    expect(db1).toBe(db2);
  });

  test("should properly close database", async () => {
    const db = getDatabase();
    await closeDatabase();
    await expect(db.query("SELECT 1")).rejects.toThrow();
  });
});
