async function activate(context: import("vscode").ExtensionContext): Promise<void> {
  const vscode: typeof import("vscode") = require("vscode");
  const { publicError, AppError } = await import("../../core/src/security.js");
  const command = vscode.commands.registerCommand("capstone.resumeJob", async () => {
    let store: import("../../adapters/src/sqlite.js").SqliteStore | undefined;
    try {
      if (Number(process.versions.node.split(".")[0]) !== 24) {
        await vscode.window.showErrorMessage("This test prototype requires an extension host running Node 24.");
        return;
      }
      const { mkdir } = await import("node:fs/promises");
      const { join } = await import("node:path");
      const { SqliteStore } = await import("../../adapters/src/sqlite.js");
      const { JobService } = await import("../../core/src/jobs.js");
      const { resumeWithPrompt } = await import("./client.js");
      await mkdir(context.globalStorageUri.fsPath, { recursive: true, mode: 0o700 });
      store = new SqliteStore(join(context.globalStorageUri.fsPath, "prototype.db"));
      const service = new JobService({
        store,
        identity: { async authenticate() { throw new AppError("INTEGRATION_UNAVAILABLE"); } },
      });
      const id = await vscode.window.showInputBox({ prompt: "Synthetic job ID", ignoreFocusOut: true });
      if (id === undefined) return;
      await resumeWithPrompt(service, id, {
        async password() {
          return vscode.window.showInputBox({ prompt: "PDF password (one attempt only)", password: true, ignoreFocusOut: true });
        },
        show(code) { void vscode.window.showInformationMessage(`Capstone: ${code}`); },
      });
    } catch (error) {
      const safe = publicError(error);
      await vscode.window.showErrorMessage(`${safe.code}: ${safe.message} (${safe.correlationId})`);
    } finally {
      store?.close();
    }
  });
  context.subscriptions.push(command);
}
exports.activate = activate;
