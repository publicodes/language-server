import { CompletionItem } from "vscode-languageserver/node.js";

// Keywords extracted from: https://github.com/betagouv/publicodes/blob/82a31f7e70837a02628cb1b758b87128819e8bff/packages/core/source/rule.ts#L18-L42
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
  {
    label: "valeur",
    documentation: `
Permet de définir la valeur de la règle.

### Exemple

\`\`\`yaml
valeur: 200€
\`\`\`

`,
  },
  {
    label: "question",
    documentation: `
Permet de définir la question posée à l'utilisateur.

### Exemple

\`\`\`yaml
question: Quel est votre âge ?
\`\`\`

`,
  },
  {
    label: "résumé",
    documentation: `
Permet de définir le résumé de la règle.

### Exemple

\`\`\`yaml
résumé: Le montant de la prime de vacances est de 200€
\`\`\`

`,
  },
  {
    label: "icônes",
    documentation: `
Permet de définir les icônes de la règle.

### Exemple

\`\`\`yaml
icônes: 🏖️
\`\`\`

`,
  },
  {
    label: "suggestions",
    documentation: `
Permet de définir les suggestions de la règle.

### Exemple

\`\`\`yaml
suggestions:
  Paris🔁Athènes: 6000
  Brest🔁Nice: 3000
  Paris🔁Marseille: 1600
  Bordeaux🔁Lyon: 1100 
\`\`\`

`,
  },
];
