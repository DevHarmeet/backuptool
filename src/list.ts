import { getDatabase } from "./db";

export interface SnapshotInfo {
  id: number;
  timestamp: string;
  name: string | null;
  description: string | null;
  fileCount: number;
  totalSize: number;
}

export async function listSnapshots(): Promise<SnapshotInfo[]> {
  const db = getDatabase();

  const result = await db.query(`
    SELECT 
      s.id,
      s.timestamp,
      s.name,
      s.description,
      COUNT(sf.filename)::integer as file_count,
      COALESCE(SUM(LENGTH(f.content)), 0)::bigint as total_size
    FROM snapshots s
    LEFT JOIN snapshot_files sf ON s.id = sf.snapshot_id
    LEFT JOIN files f ON sf.hash = f.hash
    GROUP BY s.id, s.timestamp, s.name, s.description
    ORDER BY s.timestamp DESC
  `);

  return result.rows.map((row) => ({
    id: row.id,
    timestamp: row.timestamp,
    name: row.name,
    description: row.description,
    fileCount: row.file_count,
    totalSize: row.total_size,
  }));
}
