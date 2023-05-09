import { DidChangeConfigurationNotification } from "vscode-languageserver/node";
import { LSContext } from "./context";
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
          if (!ctx.rootFolderPath) {
            ctx.rootFolderPath = fileURLToPath(folders[0].uri);
          }
          folders.forEach((folder) => {
            ctx.rawPublicodesRules = getRawPublicodesRules(ctx, folder.uri);
          });
          ctx.connection.console.log(
            `Validating ${Object.keys(ctx.rawPublicodesRules).length} rules`
          );
          validate(ctx);
        }
      });
      ctx.connection.workspace.onDidChangeWorkspaceFolders((_event) => {
        ctx.connection.console.log("Workspace folder change event received.");
      });
    }
  };
}
