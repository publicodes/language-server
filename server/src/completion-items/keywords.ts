import { CompletionItem } from "vscode-languageserver/node";

export const keywords: CompletionItem[] = [
  {
    label: "titre",
    documentation: "Titre de la règle",
  },
  {
    label: "description",
    documentation: "Description de la règle (peut contenir du markdown)",
  },
  {
    label: "formule",
    documentation: `
Permet de définir la formule de la règle.

La formule peut être une valeur, une référence à une autre règle, un mécanisme, etc.

Liste des mécanismes disponibles : https://publi.codes/docs/api/mécanismes
`,
  },
  {
    label: "références",
    documentation: `
Liste des références de la règle.

### Exemple

\`\`\`yaml
références:
]  références:
    - https://avenirclimatique.org/action/
    - https://www.statistiques.developpement-durable.gouv.fr/estimation-de-lempreinte-carbone-de-1995-2019?rubrique=27&dossier=1286
\`\`\`

`,
  },
];
