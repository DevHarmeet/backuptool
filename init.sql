CREATE TABLE IF NOT EXISTS snapshots (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    name TEXT,
    description TEXT
);

CREATE TABLE IF NOT EXISTS files (
    id SERIAL PRIMARY KEY,
    hash TEXT UNIQUE,
    content BYTEA
);

CREATE TABLE IF NOT EXISTS snapshot_files (
    snapshot_id INTEGER REFERENCES snapshots(id) ON DELETE CASCADE,
    filename TEXT,
    hash TEXT REFERENCES files(hash),
    permissions INTEGER
);

CREATE INDEX IF NOT EXISTS idx_files_hash ON files(hash);
CREATE INDEX IF NOT EXISTS idx_snapshot_files_snapshot_id ON snapshot_files(snapshot_id);

-- Add index for filename lookups
CREATE INDEX IF NOT EXISTS idx_snapshot_files_filename ON snapshot_files(filename);

-- Add index for timestamp queries
CREATE INDEX IF NOT EXISTS idx_snapshots_timestamp ON snapshots(timestamp);
