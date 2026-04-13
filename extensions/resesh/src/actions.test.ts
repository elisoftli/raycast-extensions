import { bashCommand } from "./actions";

// ---------------------------------------------------------------------------
// bashCommand (pure — no platform dependency)
// ---------------------------------------------------------------------------

describe("bashCommand", () => {
  it("builds cd && resume command", () => {
    const cmd = bashCommand("/home/user/project", "claude --resume abc");
    expect(cmd).toBe(`export PATH="$HOME/.local/bin:$PATH" && cd '/home/user/project' && claude --resume abc`);
  });

  it("escapes single quotes in directory path", () => {
    const cmd = bashCommand("/home/user/it's a dir", "claude --resume abc");
    expect(cmd).toContain("it'\\''s a dir");
  });
});

// ---------------------------------------------------------------------------
// escapeShellArg — Windows double-quote wrapping
// ---------------------------------------------------------------------------

describe("escapeShellArg", () => {
  it("wraps argument in double quotes", async () => {
    const { escapeShellArg } = await import("./actions");
    expect(escapeShellArg("hello world")).toBe('"hello world"');
  });

  it("escapes internal double quotes", async () => {
    const { escapeShellArg } = await import("./actions");
    expect(escapeShellArg('say "hello"')).toBe('"say \\"hello\\""');
  });
});

// ---------------------------------------------------------------------------
// resolveTerminal
// ---------------------------------------------------------------------------

describe("resolveTerminal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves 'default' to Windows Terminal", async () => {
    const { resolveTerminal } = await import("./actions");
    expect(resolveTerminal("default")).toBe("wt");
  });

  it("returns valid terminal as-is", async () => {
    const { resolveTerminal } = await import("./actions");
    expect(resolveTerminal("powershell")).toBe("powershell");
  });
});
