import { readdir, rm } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const cwd = process.cwd();
const args = new Set(process.argv.slice(2));
const nextOnly = args.has("--next-only");

const fixedTargets = nextOnly ? [".next"] : [".next", "tsconfig.tsbuildinfo"];

async function removeTarget(targetPath) {
  const absolutePath = path.join(cwd, targetPath);

  try {
    await rm(absolutePath, {
      force: true,
      recursive: true,
      maxRetries: 2,
    });
    console.log(`Removed ${targetPath}`);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return;
    }

    throw error;
  }
}

async function main() {
  for (const target of fixedTargets) {
    await removeTarget(target);
  }

  if (nextOnly) {
    return;
  }

  const entries = await readdir(cwd, { withFileTypes: true });
  const logFiles = entries
    .filter((entry) => entry.isFile() && entry.name.startsWith("tmp_") && entry.name.endsWith(".log"))
    .map((entry) => entry.name);

  for (const logFile of logFiles) {
    await removeTarget(logFile);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
