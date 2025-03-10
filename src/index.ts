import { Command } from "commander";
import { initializeDatabase, closeDatabase } from "./db";
import { createSnapshot } from "./snapshot";
import { listSnapshots, SnapshotInfo } from "./list";
import { restoreSnapshot } from "./restore";
import { pruneSnapshot, getSnapshotStats } from "./prune";

const program = new Command();

program
  .name("backuptool")
  .description("A command line file backup tool")
  .version("1.0.0");

program
  .command("snapshot")
  .description("Take a snapshot of a directory")
  .requiredOption("-t, --target-directory <path>", "Directory to snapshot")
  .option("-n, --name <name>", "Name of the snapshot")
  .option("-d, --description <description>", "Description of the snapshot")
  .action(async (options) => {
    try {
      await initializeDatabase();
      const snapshotId = await createSnapshot(
        options.targetDirectory,
        options.name,
        options.description,
        (current, total, filename) => {
          process.stdout.write(
            `\rProcessing files: ${current}/${total} (${filename})`
          );
        }
      );
      console.log(`\nSuccessfully created snapshot #${snapshotId}`);
    } catch (error) {
      console.error("Failed to create snapshot:", error);
      process.exit(1);
    }
  });

program
  .command("list")
  .description("List all snapshots")
  .action(async () => {
    try {
      await initializeDatabase();
      const snapshots = await listSnapshots();

      if (snapshots.length === 0) {
        console.log("No snapshots found.");
        return;
      }

      console.log("\nAvailable snapshots:");
      console.log("ID\tTimestamp\t\t\tFiles\tSize");
      console.log("-".repeat(60));

      snapshots.forEach((snapshot: SnapshotInfo) => {
        console.log(
          `${snapshot.id}\t${snapshot.timestamp}\t${snapshot.fileCount}\t${snapshot.totalSize}`
        );
      });
    } catch (error) {
      console.error("Failed to list snapshots:", error);
      process.exit(1);
    }
  });

program
  .command("restore")
  .description("Restore a snapshot")
  .requiredOption("-s, --snapshot <id>", "Snapshot ID to restore")
  .requiredOption(
    "-o, --output <directory>",
    "Output directory for restoration"
  )
  .action(async (options) => {
    try {
      await initializeDatabase();
      await restoreSnapshot(parseInt(options.snapshot), options.output);
      console.log(
        `Successfully restored snapshot #${options.snapshot} to ${options.output}`
      );
    } catch (error) {
      console.error("Failed to restore snapshot:", error);
      process.exit(1);
    }
  });

program
  .command("prune")
  .description("Remove a snapshot and clean up unused files")
  .requiredOption("-s, --snapshot <id>", "Snapshot ID to remove")
  .option("-f, --force", "Skip confirmation prompt")
  .action(async (options) => {
    try {
      await initializeDatabase();
      const snapshotId = parseInt(options.snapshot);

      // Get snapshot statistics before deletion
      const stats = await getSnapshotStats(snapshotId);
      if (!stats) {
        throw new Error(`Snapshot ${snapshotId} not found`);
      }

      // Show warning and ask for confirmation
      console.log(`Warning: About to delete snapshot #${snapshotId}`);
      console.log(
        `This will remove ${stats.fileCount} files (${formatSize(
          stats.totalSize
        )})`
      );

      if (!options.force) {
        const readline = require("readline").createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        const answer = await new Promise<string>((resolve) => {
          readline.question(
            "Are you sure you want to continue? (y/N) ",
            resolve
          );
        });
        readline.close();

        if (answer.toLowerCase() !== "y") {
          console.log("Operation cancelled");
          return;
        }
      }

      // Proceed with pruning
      await pruneSnapshot(snapshotId);
      console.log(`Successfully removed snapshot #${snapshotId}`);
    } catch (error) {
      console.error("Failed to prune snapshot:", error);
      process.exit(1);
    }
  });

// Initialize database and start the program
initializeDatabase()
  .then(() => {
    program.parse(process.argv);
  })
  .catch((error) => {
    console.error("Failed to initialize database:", error);
    process.exit(1);
  });

// Ensure database is closed when the program exits
process.on("exit", () => {
  closeDatabase();
});

process.on("SIGINT", () => {
  closeDatabase();
  process.exit(0);
});

// Helper function to format file sizes
function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
