import {
  Action,
  ActionPanel,
  Clipboard,
  getPreferenceValues,
  Icon,
  open,
  showInFinder,
  showToast,
  Toast,
} from "@raycast/api";
import { exec } from "child_process";
import { wslUncPath } from "./providers/wsl";
import type { SessionInfo } from "./types";

export function resolveTerminal(pref: string): string {
  if (pref === "default") return "wt";
  return pref;
}

const IDE_APPS: Record<string, { name: string; cmd: string }> = {
  vscode: { name: "Visual Studio Code", cmd: "code" },
  cursor: { name: "Cursor", cmd: "cursor" },
  zed: { name: "Zed", cmd: "zed" },
};

function toastOnError(label: string) {
  return (error: Error | null) => {
    if (error) {
      showToast({ style: Toast.Style.Failure, title: `Failed to open ${label}`, message: error.message });
    }
  };
}

export function escapeShellArg(s: string): string {
  return `"${s.replace(/"/g, '\\"')}"`;
}

export function bashCommand(dir: string, resumeCmd: string): string {
  const escapedDir = dir.replace(/'/g, "'\\''");
  return `export PATH="$HOME/.local/bin:$PATH" && cd '${escapedDir}' && ${resumeCmd}`;
}

function sessionUncPath(session: SessionInfo): string {
  return wslUncPath(session.wslDistro!, session.projectPath);
}

async function openInTerminal(session: SessionInfo, resumeCmd: string) {
  const prefs = getPreferenceValues<Preferences>();
  const terminal = resolveTerminal(prefs.terminal ?? "default");
  const dir = session.projectPath;

  // For WSL sessions resumeCmd already contains the full `wsl -d ...` command,
  // so no working-directory flag is needed. For native sessions, set the working directory.
  const winDir = session.wslDistro ? null : dir.replace(/\//g, "\\");
  switch (terminal) {
    case "wt":
      exec(
        winDir ? `wt.exe -d ${escapeShellArg(winDir)} cmd /k "${resumeCmd}"` : `wt.exe cmd /k "${resumeCmd}"`,
        toastOnError("Windows Terminal"),
      );
      return;
    case "powershell":
      exec(
        winDir
          ? `start powershell -NoExit -Command "Set-Location ${escapeShellArg(winDir)}; ${resumeCmd}"`
          : `start powershell -NoExit -Command "${resumeCmd}"`,
        toastOnError("PowerShell"),
      );
      return;
    case "cmd":
      exec(
        winDir ? `start cmd /k "cd /d ${winDir} && ${resumeCmd}"` : `start cmd /k "${resumeCmd}"`,
        toastOnError("Command Prompt"),
      );
      return;
    case "warp": {
      await Clipboard.copy(resumeCmd);
      await showToast({
        style: Toast.Style.Success,
        title: "Resume command copied",
        message: "Paste in Warp to resume",
      });
      const warpUrl = winDir
        ? `warp://action/new_window?path=${encodeURIComponent(winDir)}`
        : "warp://action/new_window";
      await open(warpUrl);
      return;
    }
  }
}

function openInIDE(session: SessionInfo) {
  const prefs = getPreferenceValues<Preferences>();
  const ide = IDE_APPS[prefs.ide] ?? IDE_APPS.vscode;

  if (session.wslDistro) {
    exec(`${ide.cmd} --remote wsl+${session.wslDistro} ${escapeShellArg(session.projectPath)}`, toastOnError(ide.name));
  } else {
    exec(`${ide.cmd} ${escapeShellArg(session.projectPath.replace(/\//g, "\\"))}`, toastOnError(ide.name));
  }
}

export function SessionActions({ session, resumeCommand }: { session: SessionInfo; resumeCommand: string }) {
  return (
    <ActionPanel>
      <Action title="Open in Terminal" icon={Icon.Terminal} onAction={() => openInTerminal(session, resumeCommand)} />
      <Action
        title="Copy Session ID"
        icon={Icon.Clipboard}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        onAction={() => {
          Clipboard.copy(session.sessionId);
          showToast({ style: Toast.Style.Success, title: "Session ID copied" });
        }}
      />
      <Action
        title="Open in File Explorer"
        icon={Icon.Finder}
        shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
        onAction={() => showInFinder(session.wslDistro ? sessionUncPath(session) : session.projectPath)}
      />
      <Action
        title="Open in IDE"
        icon={Icon.Code}
        shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
        onAction={() => openInIDE(session)}
      />
    </ActionPanel>
  );
}
