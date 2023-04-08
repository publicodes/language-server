import { CompletionItem } from "vscode-languageserver/node";

// TODO: auto-generate this from https://raw.githubusercontent.com/betagouv/publicodes/master/website/docs/api/m%C3%A9canismes.mdx
export const mechanisms: CompletionItem[] = [
  {
    label: "applicable si",
    documentation: `
# applicable si

> **Mécanisme chainable** ([plus d’infos](/docs/principes-de-base#mécanismes-chaînés))

Renvoie \`non\` si la condition est égale à \`non\`. Renvoie la valeur sinon.

Permet de désactiver une règle ou une valeur.

### Exemple

\`\`\`publicodes
ancienneté: 4 mois
prime de vacances:
  applicable si: ancienneté >= 1 an
  valeur: 200€
\`\`\`

`,
  },
  {
    label: "non applicable si",
    documentation: `
## non applicable si

> **Mécanisme chainable** ([plus d’infos](/docs/principes-de-base#mécanismes-chaînés)) 

Renvoit \`non\` si la condition n’est pas égale à \`non\`

Permet de désactiver une règle ou une valeur.

### Exemple

\`\`\`
ancienneté: 4 mois
prime de vacances:
  non applicable si: ancienneté < 1 an
  valeur: 200€
\`\`\`

`,
  },
  {
    label: "est non défini",
    documentation: `
## est non défini

Renvoit \`oui\` si la valeur est non définie.

### Exemple

\`\`\`publicodes
age:
age inconnu:
  est non défini: age
\`\`\`

`,
  },
  {
    label: "est défini",
    documentation: `
## est défini

Renvoit \`oui\` si la valeur est définie.

### Exemple

\`\`\`publicodes
age: 15 ans
age connu:
  est défini: age
\`\`\`

`,
  },
  {
    label: "est non applicable",
    documentation: `
## est non applicable

Renvoit \`oui\` si la valeur est non applicable.

> La valeur booléenne \`non\` est applicable. Ce mécanisme est donc différent que la comparaison \`valeur = non\`.
> [En savoir plus sur l’applicabilité](/docs/principes-de-base#applicabilité)

### Exemple

\`\`\`publicodes
exonérations: oui
exonérations . lodeom: non

lodeom non applicable:
  est non applicable: exonérations . lodeom
\`\`\`

`,
  },
  {
    label: "est applicable",
    documentation: `
## est applicable

Renvoit \`oui\` si la valeur est applicable.

> La valeur booléenne \`non\` est applicable. Ce mécanisme est donc différent que la comparaison \`valeur != non\`.
> [En savoir plus sur l’applicabilité](/docs/principes-de-base#applicabilité)

### Exemple

\`\`\`publicodes
exonérations: oui
exonérations . lodeom: non

lodeom applicable:
  est applicable: exonérations . lodeom
\`\`\`

`,
  },
  {
    label: "une de ces conditions",
    documentation: `
## une de ces conditions

Renvoie \`oui\` si l’une des règles listées est _applicable_.

Équivaut à un \`ou\` logique.

### Exemple

\`\`\`publicodes
âge: 17 ans
mineur émancipé: oui
est majeur:
  une de ces conditions:
    - âge >= 18 ans
    - mineur émancipé
\`\`\`

`,
  },
  {
    label: "toutes ces conditions",
    documentation: `
## toutes ces conditions

Renvoie \`oui\` si toutes toutes les règles listées sont _applicables_.

Équivaut à un \`et\` logique.

### Exemple

\`\`\`publicodes
âge: 17 ans
citoyenneté française: oui
peut voter:
  toutes ces conditions:
    - citoyenneté française
    - âge >= 18 ans
\`\`\`

`,
  },
  {
    label: "produit",
    documentation: `
## produit

C’est une multiplication adaptée pour exprimer au mieux les cotisations.

Sa propriété \`assiette\` est multipliée par un pourcentage \`taux\`, ou par un
\`facteur\` quand ce nom est plus approprié.

La multiplication peut être plafonnée : ce plafond sépare l’assiette en
deux, et la partie au-dessus du plafond est tout simplement ignorée. Dans ce
cas, elle se comporte comme une barème en taux marginaux à deux tranches, la
deuxième au taux nul et allant de \`plafond\` à l’infini.

### Utilisation

\`\`\`json
produit:
  assiette: <valeur à multiplier>
  taux: <taux à appliquer>
  facteur: <facteur multiplicatif>
  plafond: <plafond au-dessus duquel le taux appliqué est nul>
\`\`\`

### Exemple

\`\`\`publicodes
cotisation:
  produit:
    assiette: 2000 €/mois
    taux: 5%
\`\`\`
`,
  },
  {
    label: "produit",
    documentation: `
## produit

C’est une multiplication adaptée pour exprimer au mieux les cotisations.

Sa propriété \`assiette\` est multipliée par un pourcentage \`taux\`, ou par un
\`facteur\` quand ce nom est plus approprié.

La multiplication peut être plafonnée : ce plafond sépare l’assiette en
deux, et la partie au-dessus du plafond est tout simplement ignorée. Dans ce
cas, elle se comporte comme une barème en taux marginaux à deux tranches, la
deuxième au taux nul et allant de \`plafond\` à l’infini.

### Utilisation

\`\`\`json
produit:
  assiette: <valeur à multiplier>
  taux: <taux à appliquer>
  facteur: <facteur multiplicatif>
  plafond: <plafond au-dessus duquel le taux appliqué est nul>
\`\`\`

### Exemple

\`\`\`publicodes
cotisation:
  produit:
    assiette: 2000 €/mois
    taux: 5%
\`\`\`

#### assiette plafonnée

\`\`\`publicodes
plafond sécurité sociale: 3000 €/mois
assiette cotisation: 15000 €/mois
chômage:
  produit:
    assiette: assiette cotisation
    plafond: 400% * plafond sécurité sociale
    taux: 4%
\`\`\`

`,
  },
  {
    label: "variations",
    documentation: `
## variations

Contient une liste de conditions (\`si\`) et leurs conséquences associées
(\`alors\`), ainsi qu’un cas par défaut (\`sinon\`).

Pour la première condition vraie dans la liste, on retient la valeur qui lui
est associée.

Si aucune condition n’est vraie, alors ce mécanisme renvoie implicitement
\`non\`.

Ce mécanisme peut aussi être utilisé au sein d’un autre mécanisme avec des attributs,
tel que \`produit\` ou \`barème\`.

### Utilisation

\`\`\`json
- si: <condition à vérifier>
  alors: <consequence évaluée si la condition est vrai>
- ...
- sinon: <consequence évaluée si aucune des conditions précédente n'était applicable>
\`\`\`

### Exemple

\`\`\`publicodes
taux réduit: oui

taux allocation familiales:
  variations:
    - si: taux réduit
      alors: 3.45%
    - sinon: 5.25%
\`\`\`

#### Dans un autre mécanisme

\`\`\`publicodes
assiette cotisation: 2300 €/mois
taux réduit: oui
allocation familiales:
  produit:
    assiette: assiette cotisation
    variations:
    - si: taux réduit
      alors:
        taux: 3.45%
    - sinon:
        taux: 5.25%
\`\`\`

`,
  },
  {
    label: "somme",
    documentation: `
## somme

Somme de chaque terme de la liste.

Si un des termes n’est pas applicable, il vaut zéro.

On peut retrancher des valeurs grâce à l’opérateur unaire \`-\`

### Exemple

\`\`\`publicodes
exemple:
  somme:
    - 15.89 €
    - 12% * 14 €
    - (-20 €)
\`\`\`

#### Terme non applicable

\`\`\`publicodes
a: 50 €
b:
  applicable si: non
  valeur: 20 €

somme:
  somme:
    - a
    - b
    - 40 €
\`\`\`

`,
  },
  {
    label: "moyenne",
    documentation: `
## moyenne

Moyenne de chaque terme de la liste.

Un terme non applicable n'est pas comptabilisé dans la moyenne.

### Exemple

\`\`\`publicodes
exemple:
  moyenne:
    - 15.89 €
    - 15% * 14 €
    - (-20 €)
\`\`\`

#### Terme non applicable

\`\`\`publicodes
a: 50 €
b:
  applicable si: non
  valeur: 20 €

moyenne:
  moyenne:
    - a
    - b
    - 40 €
\`\`\`

`,
  },
  {
    label: "le maximum de",
    documentation: `
## le maximum de

Renvoie la valeur numérique de la liste de propositions fournie qui est la
plus grande.

Pour ajouter un plancher à une valeur, préférer l’utilisation du
mécanisme \`encadrement\`.

### Exemple

\`\`\`publicodes
max:
  le maximum de:
    - 50
    - 100
\`\`\`

`,
  },
  {
    label: "le minimum de",
    documentation: `
## le minimum de

Renvoie la valeur numérique de la liste de propositions fournie qui est la
plus petite.

Pour plafonner une valeur, préférer l’utilisation du mécanisme \`encadrement\`.

### Exemple

\`\`\`publicodes
min:
  le minimum de:
    - 50
    - 100
\`\`\`

`,
  },
  {
    label: "le minimum de",
    documentation: `
## arrondi

> **Mécanisme chainable** ([plus d’infos](/docs/principes-de-base#mécanismes-chaînés))

Arrondit à l’entier le plus proche, ou à une précision donnée.

### Exemple

\`\`\`publicodes
arrondi:
  arrondi: oui
  valeur: 12.45
\`\`\`

#### Nombre de décimales

\`\`\`publicodes
arrondi:
  arrondi: 2 décimales
  valeur: 2 / 3
\`\`\`

`,
  },
  {
    label: "recalcul",
    documentation: `
## recalcul

Relance le calcul d’une règle dans une situation différente de la situation
courante. Permet par exemple de calculer le montant des cotisations au niveau du
SMIC, même si le salaire est plus élevé dans la situation actuelle.

> Les **recalculs imbriqués** ne sont pas encore fonctionnels. On parle de recalcul imbriqués lorsqu’une variable \`a\` recalcul une règle \`b\` qui elle même recalcul la règle \`a\`.

### Exemple

\`\`\`publicodes
brut: 2000€

cotisations:
  produit:
    assiette: brut
    taux: 20%

cotisations pour un SMIC:
  recalcul:
    règle: cotisations
    avec:
      brut: 1500 €
\`\`\`

`,
  },
  {
    label: "barème",
    documentation: `
## barème

par son utilisation dans le calcul de l’impôt sur le revenu.

L’assiette est décomposée en plusieurs tranches, qui sont multipliées par un
taux spécifique et enfin additionnées pour donner le résultat.

Les tranches sont souvent exprimées sous forme de facteurs d’une variable
que l’on appelle \`multiplicateur\`, par exemple une fois le plafond de la
sécurité sociale.

### Exemple

#### Sans multiplicateur

\`\`\`publicodes
revenu imposable: 54126 €
impôt sur le revenu:
  barème:
    assiette: revenu imposable
    tranches:
      - taux: 0%
        plafond: 9807 €
      - taux: 14%
        plafond: 27086 €
      - taux: 30%
        plafond: 72617 €
      - taux: 41%
        plafond: 153783 €
      - taux: 45%
\`\`\`

#### Avec multiplicateur

\`\`\`publicodes
assiette retraite: 54004 €
plafond sécurité sociale: 41136 €
cotisation retraite:
  barème:
    assiette: assiette retraite
    multiplicateur: plafond sécurité sociale
    tranches:
      - taux: 17.75%
        plafond: 1
      - taux: 0.6%
  arrondi: oui
\`\`\`

`,
  },
  {
    label: "grille",
    documentation: `
## grille

C’est un barème sous la forme d’une grille de correspondance simple. C’est
le mécanisme de calcul de l’impôt neutre, aussi appelé impôt non
personnalisé.

Il est composé de tranches qui se suivent. Il suffit de trouver la tranche qui correspond à l’assiette, et de selectionner le montant associé à cette tranche.

### Exemple

\`\`\`publicodes
SMIC horaire: 10 €/heures
revenu cotisé: 1900€/an
trimestres validés:
  unité: trimestres validés/an
  grille:
    assiette: revenu cotisé
    multiplicateur: SMIC horaire
    tranches:
      - montant: 0
        plafond: 150 heures/an
      - montant: 1
        plafond: 300 heures/an
      - montant: 2
        plafond: 450 heures/an
      - montant: 3
        plafond: 600 heures/an
      - montant: 4
\`\`\`

`,
  },
  {
    label: "taux progressif",
    documentation: `

## taux progressif

Ce mécanisme permet de calculer un taux progressif. On spécifie pour chaque
tranche le plafond et le taux associé. Le taux effectif renvoyé est calculé
en lissant la différence de taux entre la borne inférieure et supérieure de
l’assiette.

Par exemple, si nous nous avons les tranches suivantes :

- taux: 50% / plafond: 0
- taux: 100% / plafond: 1000

Pour une assiette de 500, le taux retourné sera 75%, car il correspond au
taux situé à la moitié de la tranche correspondante.

### Exemple

\`\`\`publicodes
chiffre d'affaires: 30000 €/an
plafond: 3000 €/mois
taux réduction de cotisation:
  taux progressif:
    assiette: chiffre d'affaires
    multiplicateur: plafond
    tranches:
      - taux: 100%
        plafond: 75%
      - taux: 0%
        plafond: 100%
\`\`\`

`,
  },
  {
    label: "composantes",
    documentation: `
## composantes

Beaucoup de cotisations sont composées de deux parties qui partagent la
méthode de calcul mais diffèrent selons certains paramètres. Pour ne pas
définir deux variables quasi-redondantes, on utilise ce mécanisme.

Cela permet d’avoir une écriture factorisée, plus facile à lire.

Dans les calculs, \`composantes\` se comporte **exactement comme une somme**.
La documentation, elle, sera adaptée pour montrer chaque composante.

Il est possible par exemple pour le mécanisme \`produit\` de garder en
commun l’assiette, et de déclarer des composantes pour le taux.

Chaque composante peut également contenir un champs \`attributs\` de type objet
contenant les mécanismes chainés à appliquer à la composante en question.

Lorsque l’on utilise l’attribut \`nom\`, cela aboutit à la définition de règles
imbriquées pour chacun des termes de la somme.

### Exemple

\`\`\`publicodes composante
assiette de base: 2000 €
composante:
  produit:
    assiette: assiette de base
    composantes:
      - taux: 2%
      - taux: 4%
        plafond: 500 €
\`\`\`

#### Calcul de cotisation avec part salariale et patronale

\`\`\`publicodes
assiette de base: 10000 €
cotisation 1:
  produit:
    assiette: assiette de base
    composantes:
    - attributs:
        nom: employeur
      taux: 5%
    - attributs:
        nom: salarié
      taux: 1%

cotisations salariales :
  somme:
    - cotisation 1 . salarié
    # ...
\`\`\`

#### Prix HT et TVA

\`\`\`publicodes prix TTC
prix TTC:
  produit:
    assiette: 150€
    composantes:
      - attributs:
          nom: HT
      - attributs:
          nom: TVA
        taux: 20%
\`\`\`

`,
  },
  {
    label: "abattement",
    documentation: `
## abattement

> **Mécanisme chainable** ([plus d’infos](/docs/principes-de-base#mécanismes-chaînés))

Permet de réduire le montant d’une valeur.

Le résultat vaudra toujours au moins zéro, y compris quand le montant de l’abattement est plus grand que le montant abattu.

Il est possible d’utiliser le mécanisme \`abattement\` de deux manières :

- soit en indiquant un montant de la même unité que la valeur, qui lui sera alors soustrait
- soit en indiquant un pourcentage qui sera utilisé pour calculer l’abattement de manière relative

### Exemple

#### Abattement simple

\`\`\`publicodes
revenu imposable:
  valeur: 10000€
  abattement: 2000€
\`\`\`

#### Abattement supérieur à la valeur

\`\`\`publicodes
revenu imposable:
  valeur: 1000€
  abattement: 2000€
\`\`\`

#### Abattement relatif

\`\`\`publicodes
revenu imposable:
  valeur: 2000€
  abattement: 10%
\`\`\`

`,
  },
  {
    label: "plancher",
    documentation: `
## plancher

> **Mécanisme chainable** ([plus d’infos](/docs/principes-de-base#mécanismes-chaînés))

### Exemple

\`\`\`publicodes
revenus: -500€
assiette des cotisations:
  valeur: revenus
  plancher: 0 €
\`\`\`

`,
  },
  {
    label: "plafond",
    documentation: `
## plafond

> **Mécanisme chainable** ([plus d’infos](/docs/principes-de-base#mécanismes-chaînés))

### Exemple

\`\`\`publicodes
déduction fiscale:
  valeur: 1300 €/mois
  plafond: 200 €/mois
\`\`\`

`,
  },
  {
    label: "durée",
    documentation: `

## durée

### Exemple

\`\`\`publicodes
date d'embauche: 14/04/2008
ancienneté en fin d'année:
  unité: an
  durée:
    depuis: date d'embauche
    jusqu'à: 31/12/2020
\`\`\`

`,
  },
  {
    label: "unité",
    documentation: `
## unité

> **Mécanisme chainable** ([plus d’infos](/docs/principes-de-base#mécanismes-chaînés))

Permet de convertir explicitement une unité.

Affiche un avertissement si la conversion n’est pas possible à cause d’unités incompatibles.

### Exemple

\`\`\`publicodes
salaire:
  valeur: 35 k€/an
  unité: €/mois
\`\`\`

`,
  },
  {
    label: "par défaut",
    documentation: `

## par défaut

> **Mécanisme chainable** ([plus d’infos](/docs/principes-de-base#mécanismes-chaînés))

Permet de donner une valeur par défaut pour le calcul, sans influer sur les variables manquantes retournées.

### Exemple

\`\`\`publicodes
prix HT: 50 €
prix TTC:
  assiette: prix HT * (100% + TVA)
TVA:
  par défaut: 20%
\`\`\`

`,
  },
  {
    label: "texte",
    documentation: `
## texte

Permet de mettre en forme un texte avec des expressions évaluée dynamiquement.
Ce principe est connu en informatique sous le nom d’interpolation de chaine de
caractères.

### Exemple

\`\`\`publicodes 
aide vélo:
  texte: >
    La région subventionne l’achat d’un vélo à hauteur de
    {{ prise en charge }} et jusqu’à un plafond de {{ plafond }}.
    Les éventuelles aides locales déjà perçues sont déduites de
    ce montant.

    Par exemple, pour un vélo de {{ 250 € }}, la région vous
    versera {{
      250 € * 50%
    }}.

aide vélo . prise en charge: 50%
aide vélo . plafond: 500 €
\`\`\`

`,
  },
];
