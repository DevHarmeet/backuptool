import { createHash } from "crypto";
import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";
import { getDatabase, withTransaction } from "./db";
import { PoolClient } from "pg";

interface ProgressCallback {
  (current: number, total: number, filename: string): void;
}

export async function createSnapshot(
  targetDirectory: string,
  name?: string,
  description?: string,
  progress?: ProgressCallback
): Promise<number> {
  return withTransaction(async (client: PoolClient) => {
    // Create new snapshot
    const snapshotResult = await client.query(
      "INSERT INTO snapshots (name, description) VALUES ($1, $2) RETURNING id",
      [name || null, description || null]
    );
    const snapshotId = snapshotResult.rows[0].id;

    // Process all files in the directory
    await processDirectory(
      client,
      targetDirectory,
      snapshotId,
      targetDirectory
    );

    return snapshotId;
  });
}

function countFiles(directory: string): number {
  let count = 0;
  const items = readdirSync(directory);

  for (const item of items) {
    const fullPath = join(directory, item);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      count += countFiles(fullPath);
    } else {
      count++;
    }
  }

  return count;
}

async function processDirectory(
  client: PoolClient,
  currentPath: string,
  snapshotId: number,
  baseDir: string
): Promise<void> {
  const files = readdirSync(currentPath);

  for (const file of files) {
    const fullPath = join(currentPath, file);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      await processDirectory(client, fullPath, snapshotId, baseDir);
      continue;
    }

    const relativePath = relative(baseDir, fullPath);
    const fileContent = readFileSync(fullPath);
    const hash = createHash("sha256").update(fileContent).digest("hex");

    // Store file content if it doesn't exist
    await client.query(
      "INSERT INTO files (hash, content) VALUES ($1, $2) ON CONFLICT (hash) DO NOTHING",
      [hash, fileContent]
    );

    // Store snapshot file mapping
    await client.query(
      "INSERT INTO snapshot_files (snapshot_id, filename, hash, permissions) VALUES ($1, $2, $3, $4)",
      [snapshotId, relativePath, hash, stat.mode]
    );
  }
}
