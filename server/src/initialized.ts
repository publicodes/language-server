import { DidChangeConfigurationNotification } from "vscode-languageserver/node.js";
import { LSContext } from "./context";
import { fileURLToPath } from "node:url";
import { parseDir } from "./parseRules";
import validate from "./validate";
import { existsSync, statSync } from "fs";
import { readdirSync } from "node:fs";

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
          if (!ctx.rootFolderPath) {
            ctx.rootFolderPath = fileURLToPath(folders[0].uri);
            // NOTE(@EmileRolley): little hack to manage monorepos
            ctx.nodeModulesPaths = [];
            readdirSync(ctx.rootFolderPath).forEach((file) => {
              const path = `${ctx.rootFolderPath}/${file}`;
              if (!file.startsWith(".") && statSync(path)?.isDirectory()) {
                // TODO: maybe not needed anymore as rellying on the @publicodes/tools lib
                const nodeModulesPath = `${path}/node_modules`;
                if (existsSync(nodeModulesPath)) {
                  ctx.nodeModulesPaths?.push(nodeModulesPath);
                }
              }
            });
          }
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
      ctx.connection.workspace.onDidChangeWorkspaceFolders((_event) => {
        ctx.connection.console.log("Workspace folder change event received.");
      });
    }
  };
}
