<div align="center">
  <h3 align="center">
	<big>Publicodes VSCode - LS</big>
  </h3>
  <p align="center">
   <a href="https://github.com/publicodes/language-server/issues">Report Bug</a>
   •
   <a href="https://publi.codes">Publicodes</a>
   •
   <a href="https://marketplace.visualstudio.com/items?itemName=EmileRolley.publicodes-language-server">The VSCode extension</a>
  </p>

A VSCode extension providing language server capabilities for
[Publicodes](https://publi.codes/).

</div>

## Features

- 🎨 Semantic highlighting (based on the Publicodes [tree-sitter
  grammar](https://github.com/publicodes/tree-sitter-publicodes))
- 🧪 Diagnostics (on save)
- 📚 Code completion (keywords and rule names)
- 💡 Go to definition
- 🔍 Hover information (resolved name, current node value and description)

> Recognized extension files are: `.publicodes`

## Syntax Highlighting Configuration

Your colorscheme needs to support semantic highlighting to have the best
experience with this extension.

Here is the recommended configuration for the default `Dark+` and `Dark Modern`
themes. Simply add this to your `settings.json` (accessible via the command
palette (`Ctrl+Shift+P`) and typing `Preferences: Open Settings (JSON)`):

```json
{
  ...
  "editor.semanticTokenColorCustomizations": {
    "rules": {
      "*.readonly:publicodes": {
        "italic": true,
      },
      "*.definition:publicodes": {
        "bold": true,
      },
      "namespace:publicodes": {
        "foreground": "#4ec99a"
      },
      "type:publicodes": {
        "foreground": "#4EC9B0",
        "italic": true,
      },
      "operator:publicodes": "#c7c7c7ad",
      "string:publicodes": {
        "foreground": "#CE9178",
      },
      "string.readonly:publicodes": "#569cd6",
      "number:publicodes": "#e67f7f",
      "property:publicodes": "#569CD6",
      "property.static:publicodes": "#9CDCFE",
      "method:publicodes": "#569CD6",
      "macro:publicodes": {
        "foreground": "#9CDCFE",
        "italic": true
      }
    }
  },
}
```

## To run in local

1. In your terminal, install the dependencies with `yarn install`.
2. In VSCode:

- select `Launch Client` from the drop down (if it is not already).
- press ▷ to run the launch config (F5).
