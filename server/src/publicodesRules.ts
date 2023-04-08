import { parse } from "yaml";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { LSContext } from "./context";
import parseYAML from "./parseYAML";
import { fileURLToPath } from "node:url";

// Explore recursively all files in the workspace folder
// and concat all yaml files into one string for parsing
// Explore recursively all files in the workspace folder
// and concat all yaml files into one string for parsing
export function getRawPublicodesRules(
  ctx: LSContext,
  uri: string,
  rules: object = {}
): object {
  const path = fileURLToPath(uri);
  const files = readdirSync(path);
  // ctx.connection.console.log(`Files: ${files.join(",")}`);
  files?.forEach((file) => {
    const filePath = join(path, file);
    // TODO: should be .publi.yaml instead of ignoring i18n/
    if (filePath.endsWith(".yaml")) {
      const { rules: parsedRules } = parseYAML(
        ctx,
        ctx.documents.get(uri),
        readFileSync(filePath).toString()
      );
      rules = {
        ...rules,
        ...parsedRules,
      };
    } else if (
      statSync(filePath)?.isDirectory() &&
      !ctx.dirsToIgnore.includes(file)
    ) {
      rules = getRawPublicodesRules(ctx, `${uri}/${file}`, rules);
    }
  });
  return rules;
}
