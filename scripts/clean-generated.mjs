import { execFileSync } from "node:child_process";
import { readdir, rm } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const cwd = process.cwd();
const args = new Set(process.argv.slice(2));
const force = args.has("--force");
const nextOnly = args.has("--next-only");

const fixedTargets = nextOnly ? [".next"] : [".next", "tsconfig.tsbuildinfo"];

function getActiveFrontendNextProcesses() {
  if (process.platform !== "win32") {
    return [];
  }

  const escapedCwd = cwd.replace(/'/g, "''");
  const script = `
$cwd = [System.IO.Path]::GetFullPath('${escapedCwd}')
$processes = @(Get-CimInstance Win32_Process | Where-Object {
  $_.Name -match '^(node|npm)(\\.exe)?$' -and
  $_.CommandLine -and
  $_.CommandLine -like "*$cwd*" -and
  (
    $_.CommandLine -like '*next\\dist\\bin\\next*' -or
    $_.CommandLine -like '*start-server.js*' -or
    $_.CommandLine -like '*npm-cli.js* run dev*' -or
    $_.CommandLine -like '*npm-cli.js* run start*'
  )
})
$processes | Select-Object ProcessId,Name,CommandLine | ConvertTo-Json -Compress
`.trim();

  const raw = execFileSync(
    "powershell.exe",
    ["-NoProfile", "-Command", script],
    {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  ).trim();

  if (raw.length === 0 || raw === "null") {
    return [];
  }

  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [parsed];
}

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
  const activeFrontendNextProcesses = getActiveFrontendNextProcesses();
  if (activeFrontendNextProcesses.length > 0 && !force) {
    console.error("Stop the running frontend dev server before cleaning generated artifacts.");
    console.error("Do not clean .next while Next dev is running.");
    console.error(
      `Active frontend Next processes: ${activeFrontendNextProcesses.map((processInfo) => processInfo.ProcessId).join(", ")}`,
    );
    process.exitCode = 1;
    return;
  }

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
