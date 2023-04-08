import { parse } from "yaml";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { LSContext } from "./context";

// Explore recursively all files in the workspace folder
// and concat all yaml files into one string for parsing
// Explore recursively all files in the workspace folder
// and concat all yaml files into one string for parsing
export function getRawPublicodesRules(
  ctx: LSContext,
  path: string,
  rules: object = {}
): object {
  const files = readdirSync(path);
  // ctx.connection.console.log(`Files: ${files.join(",")}`);
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
