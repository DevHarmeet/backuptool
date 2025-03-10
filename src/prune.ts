import { getDatabase, withTransaction } from "./db";
import { PoolClient } from "pg";

export async function pruneSnapshot(snapshotId: number): Promise<void> {
  await withTransaction(async (client: PoolClient) => {
    // Verify snapshot exists
    const snapshot = await client.query(
      "SELECT id FROM snapshots WHERE id = $1",
      [snapshotId]
    );

    if (snapshot.rows.length === 0) {
      throw new Error(`Snapshot ${snapshotId} not found`);
    }

    // Delete snapshot files mapping
    await client.query("DELETE FROM snapshot_files WHERE snapshot_id = $1", [
      snapshotId,
    ]);

    // Delete the snapshot
    await client.query("DELETE FROM snapshots WHERE id = $1", [snapshotId]);

    // Clean up orphaned files
    await client.query(`
      DELETE FROM files 
      WHERE hash NOT IN (
        SELECT DISTINCT hash 
        FROM snapshot_files
      )
    `);
  });
}

export async function getSnapshotStats(
  snapshotId: number
): Promise<{ fileCount: number; totalSize: number }> {
  const db = getDatabase();

  const result = await db.query(
    `
    SELECT 
      COUNT(*)::integer as file_count,
      COALESCE(SUM(LENGTH(f.content)), 0)::bigint as total_size
    FROM snapshot_files sf
    JOIN files f ON sf.hash = f.hash
    WHERE sf.snapshot_id = $1
  `,
    [snapshotId]
  );

  return {
    fileCount: result.rows[0].file_count,
    totalSize: result.rows[0].total_size,
  };
}
