import { DidChangeConfigurationNotification } from "vscode-languageserver/node";
import { LSContext } from "./context";
import Engine from "publicodes";
import { parse } from "yaml";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "node:url";

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
            ctx.rawPublicodesRules = getRawPublicodesRules(ctx, path, {});
            ctx.parsedRules = new Engine(
              ctx.rawPublicodesRules
            ).getParsedRules();
            ctx.connection.console.log(
              `Parsed ${Object.keys(ctx.parsedRules).length} rules`
            );
          });
        }
      });
      ctx.connection.workspace.onDidChangeWorkspaceFolders((_event) => {
        ctx.connection.console.log("Workspace folder change event received.");
      });
    }
  };
}

// Explore recursively all files in the workspace folder
// and concat all yaml files into one string for parsing
function getRawPublicodesRules(
  ctx: LSContext,
  path: string,
  rules: object
): object {
  const files = readdirSync(path);
  ctx.connection.console.log(`Files: ${files.join(",")}`);
  files?.forEach((file) => {
    const filePath = join(path, file);
    // TODO: should be .publi.yaml instead of ignoring i18n/
    if (filePath.endsWith(".yaml")) {
      rules = {
        ...rules,
        ...parse(readFileSync(filePath).toString()),
      };
    } else if (
      statSync(filePath)?.isDirectory() &&
      !ctx.dirsToIgnore.includes(file)
    ) {
      rules = getRawPublicodesRules(ctx, filePath, rules);
    }
  });
  return rules;
}
