import { DidChangeConfigurationNotification } from "vscode-languageserver/node.js";
import { LSContext } from "./context";
import { parseDir } from "./parseRules";
import validate from "./validate";

export default function intializedHandler(ctx: LSContext) {
  return () => {
    if (ctx.config.hasConfigurationCapability) {
      // Register for all configuration changes.
      ctx.connection.client.register(
        DidChangeConfigurationNotification.type,
        undefined,
      );
    }

    if (ctx.config.hasWorkspaceFolderCapability) {
      ctx.connection.workspace.getWorkspaceFolders().then((folders) => {
        if (folders) {
          folders.forEach((folder) => {
            parseDir(ctx, folder.uri);
          });
          ctx.connection.console.log(`[initialized] Parsing done.`);
          ctx.connection.console.log(
            `[initialized] Found ${ctx.diagnostics.size} diagnostics when parsing.`,
          );
          validate(ctx);
        }
      });
    }
  };
}
