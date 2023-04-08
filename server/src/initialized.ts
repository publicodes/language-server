import { DidChangeConfigurationNotification } from "vscode-languageserver/node";
import { LSContext } from "./context";
import Engine from "publicodes";
import { fileURLToPath } from "node:url";
import { getRawPublicodesRules } from "./publicodesRules";
import validate from "./validate";

export default function intializedHandler(ctx: LSContext) {
  return () => {
    if (ctx.config.hasConfigurationCapability) {
      // Register for all configuration changes.
      ctx.connection.client.register(
        DidChangeConfigurationNotification.type,
        undefined
      );
    }
    if (ctx.config.hasWorkspaceFolderCapability) {
      ctx.connection.workspace.getWorkspaceFolders().then((folders) => {
        if (folders) {
          folders.forEach((folder) => {
            const path = fileURLToPath(folder.uri);
            ctx.connection.console.log(`Workspace folder: ${path}`);
            ctx.rawPublicodesRules = getRawPublicodesRules(ctx, path);
          });
          validate(ctx);
        }
      });
      ctx.connection.workspace.onDidChangeWorkspaceFolders((_event) => {
        ctx.connection.console.log("Workspace folder change event received.");
      });
    }
  };
}
