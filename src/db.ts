import { Pool, PoolClient } from "pg";
import { readFileSync } from "fs";
import { join } from "path";

let db: Pool | null = null;

const config = {
  host: "localhost",
  port: 5433,
  database: "backuptool",
  user: "backup_user",
  password: "backup_password",
};

export async function initializeDatabase(): Promise<void> {
  if (db) {
    return; // Already initialized
  }

  try {
    console.log("Attempting to connect with config:", {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
    });

    db = new Pool({
      ...config,
      max: 20,
      idleTimeoutMillis: 30000,
    });

    const client = await db.connect();
    try {
      const initSql = readFileSync(join(__dirname, "../init.sql"), "utf8");
      await client.query("BEGIN");
      await client.query(initSql);
      await client.query("COMMIT");
      console.log("Database connection established and schema initialized");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    if (db) {
      await db.end();
      db = null;
    }
    throw error;
  }
}

export function getDatabase(): Pool {
  if (!db) {
    throw new Error("Database not initialized");
  }
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    const temp = db;
    db = null;
    await temp.end();
  }
}

// Updated transaction helper
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getDatabase().connect();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// Helper function to clean database between tests
export async function cleanDatabase(): Promise<void> {
  const client = await getDatabase().connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM snapshot_files");
    await client.query("DELETE FROM snapshots");
    await client.query("DELETE FROM files");
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
