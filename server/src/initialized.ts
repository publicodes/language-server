import { DidChangeConfigurationNotification } from "vscode-languageserver/node.js";
import { LSContext } from "./context";
import { parseDir } from "./parseRules";
import validate from "./validate";
import { pathToFileURL } from "node:url";

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
          if (ctx.diagnostics.size > 0) {
            ctx.diagnostics.forEach((diagnostics, path) => {
              const uri = pathToFileURL(path).href;
              ctx.diagnosticsURI.add(uri);
              ctx.connection.sendDiagnostics({ uri, diagnostics });
            });
          } else {
            validate(ctx);
          }
        }
      });
    }
  };
}
