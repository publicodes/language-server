import { DidChangeConfigurationNotification } from "vscode-languageserver/node";
import { LSContext } from "./context";
import { fileURLToPath } from "node:url";
import { parseRawPublicodesRules } from "./publicodesRules";
import validate from "./validate";
import { existsSync, statSync } from "fs";
import { readdirSync } from "node:fs";

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
            // NOTE(@EmileRolley): little hack to manage monorepos
            ctx.nodeModulesPaths = [];
            readdirSync(ctx.rootFolderPath).forEach((file) => {
              const path = `${ctx.rootFolderPath}/${file}`;
              if (!file.startsWith(".") && statSync(path)?.isDirectory()) {
                const nodeModulesPath = `${path}/node_modules`;
                if (existsSync(nodeModulesPath)) {
                  ctx.nodeModulesPaths?.push(nodeModulesPath);
                }
              }
            });
          }
          folders.forEach((folder) => {
            ctx = parseRawPublicodesRules(ctx, folder.uri);
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
