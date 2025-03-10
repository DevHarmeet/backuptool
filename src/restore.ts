import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { getDatabase } from "./db";

export async function restoreSnapshot(
  snapshotId: number,
  outputDirectory: string
): Promise<void> {
  const db = getDatabase();

  // Verify snapshot exists
  const snapshotResult = await db.query(
    "SELECT id FROM snapshots WHERE id = $1",
    [snapshotId]
  );

  if (snapshotResult.rows.length === 0) {
    throw new Error(`Snapshot ${snapshotId} not found`);
  }

  // Get all files for this snapshot
  const filesResult = await db.query(
    `
    SELECT sf.filename, f.content, sf.permissions
    FROM snapshot_files sf
    JOIN files f ON sf.hash = f.hash
    WHERE sf.snapshot_id = $1
  `,
    [snapshotId]
  );

  // Restore each file
  for (const file of filesResult.rows) {
    const fullPath = join(outputDirectory, file.filename);
    const directory = dirname(fullPath);

    // Create directory if it doesn't exist
    mkdirSync(directory, { recursive: true });

    // Write file with original permissions
    writeFileSync(fullPath, file.content);
    if (file.permissions) {
      try {
        // Set original permissions if available
        await new Promise((resolve, reject) => {
          require("fs").chmod(fullPath, file.permissions, (err: Error) => {
            if (err) reject(err);
            else resolve(null);
          });
        });
      } catch (error) {
        console.warn(`Warning: Could not set permissions for ${fullPath}`);
      }
    }
  }
}
