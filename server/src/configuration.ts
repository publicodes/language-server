import { DidChangeConfigurationParams } from "vscode-languageserver";
import { DocumentSettings, LSContext, defaultDocSettings } from "./context";
import validate from "./validate";

export function changeConfigurationHandler(ctx: LSContext) {
  return (change: DidChangeConfigurationParams) => {
    if (ctx.config.hasConfigurationCapability) {
      // Reset all cached document settings
      ctx.documentSettings.clear();
    } else {
      ctx.globalSettings = <DocumentSettings>(
        (change.settings.languageServerExample || defaultDocSettings)
      );
    }

    // Revalidate all open text documents
    ctx.documents.all().forEach((doc) => validate(ctx, doc));
  };
}
